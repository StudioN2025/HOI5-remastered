// AIController.js — РЕАЛЬНО УМНЫЙ ИИ С УЧЁТОМ СИЛЫ СТРАН

export class AIController {
    constructor(world, entities, gameState) {
        this.world = world;
        this.entities = entities;
        this.gameState = gameState;
        this.tickCounter = 0;
        this.TICK_INTERVAL = 2;
        
        this.memory = new Map();
        
        this.countryPower = {
            germany: 95,
            ussr: 90,
            uk: 80,
            france: 75,
            italy: 60,
            spain: 45,
            poland: 40,
            turkey: 35,
            yugoslavia: 30,
            greece: 25,
            romania: 25,
            hungary: 22,
            bulgaria: 18,
            finland: 18,
            czechoslovakia: 35,
            austria: 20,
            netherlands: 25,
            belgium: 22,
            portugal: 20,
            switzerland: 15,
            denmark: 12,
            lithuania: 10,
            latvia: 8,
            estonia: 8,
            luxembourg: 3
        };
    }
    
    async init() {
        console.log('🤖 Умный AI Controller инициализирован');
    }
    
    update() {
        this.tickCounter++;
        if (this.tickCounter < this.TICK_INTERVAL) return;
        this.tickCounter = 0;
        
        const countries = this.world.getAllCountries();
        const myId = this.gameState.myCountryId;
        
        const sortedCountries = Array.from(countries).sort((a, b) => {
            return (this.countryPower[b] || 0) - (this.countryPower[a] || 0);
        });
        
        for (const countryId of sortedCountries) {
            if (countryId === myId) continue;
            const cells = this.world.getCountryCells(countryId);
            if (cells.size === 0) continue;
            this.processCountry(countryId);
        }
    }
    
    processCountry(countryId) {
        const cells = this.world.getCountryCells(countryId);
        const cellCount = cells.size;
        const units = this.entities.getEntitiesByOwner(countryId);
        const unitCount = units.length;
        const factories = this.countFactories(countryId);
        const enemies = this.getEnemies(countryId);
        
        if (!this.memory.has(countryId)) {
            this.memory.set(countryId, {
                target: null,
                strategy: 'balanced',
                lastBuildDay: 0,
                lastRecruitDay: 0,
                lastAttackDay: 0,
                expansionPhase: false
            });
        }
        const mem = this.memory.get(countryId);
        
        const powerLevel = this.countryPower[countryId] || 20;
        
        let desiredUnits = 0;
        if (powerLevel >= 80) desiredUnits = Math.min(60, Math.max(30, Math.floor(cellCount / 4)));
        else if (powerLevel >= 50) desiredUnits = Math.min(35, Math.max(15, Math.floor(cellCount / 5)));
        else if (powerLevel >= 25) desiredUnits = Math.min(20, Math.max(8, Math.floor(cellCount / 6)));
        else desiredUnits = Math.min(12, Math.max(4, Math.floor(cellCount / 8)));
        
        let desiredFactories = 0;
        if (powerLevel >= 80) desiredFactories = Math.min(20, Math.max(8, Math.floor(cellCount / 15)));
        else if (powerLevel >= 50) desiredFactories = Math.min(12, Math.max(5, Math.floor(cellCount / 20)));
        else if (powerLevel >= 25) desiredFactories = Math.min(8, Math.max(3, Math.floor(cellCount / 25)));
        else desiredFactories = Math.min(4, Math.max(1, Math.floor(cellCount / 30)));
        
        if (unitCount < desiredUnits) {
            const need = desiredUnits - unitCount;
            const maxRecruit = Math.min(5, need);
            for (let i = 0; i < maxRecruit; i++) {
                this.recruitUnit(countryId, cells, powerLevel, enemies.length > 0);
            }
            mem.lastRecruitDay = this.gameState.days;
        }
        
        if (factories < desiredFactories && this.gameState.days - mem.lastBuildDay > 15) {
            this.buildFactory(countryId, cells, powerLevel);
            mem.lastBuildDay = this.gameState.days;
        }
        
        if (enemies.length > 0) {
            this.militaryStrategy(countryId, cells, units, unitCount, enemies, mem, powerLevel);
        } else {
            this.expansionStrategy(countryId, cells, units, mem, powerLevel);
        }
        
        if (this.gameState.days % 15 === 0) {
            this.researchStrategy(countryId, factories, powerLevel);
        }
        
        if (powerLevel >= 50 && this.gameState.days % 45 === 0 && enemies.length === 0) {
            this.diplomacyStrategy(countryId);
        }
    }
    
    militaryStrategy(countryId, cells, units, unitCount, enemies, mem, powerLevel) {
        let targetEnemy = mem.target;
        if (!targetEnemy || !enemies.includes(targetEnemy)) {
            targetEnemy = this.getWeakestEnemy(countryId, enemies);
            mem.target = targetEnemy;
        }
        
        const borderCells = this.world.getBorderWith(countryId, targetEnemy);
        const myPower = this.calculatePower(countryId, powerLevel);
        const enemyPower = this.calculatePower(targetEnemy, this.countryPower[targetEnemy] || 20);
        
        if (myPower >= enemyPower * 0.8 && borderCells.length > 0 && units.length > 0) {
            this.launchAttack(countryId, units, borderCells, targetEnemy);
            mem.lastAttackDay = this.gameState.days;
        }
        else if (myPower < enemyPower * 0.8 && borderCells.length > 0 && units.length > 0) {
            this.defendBorders(countryId, units, borderCells, targetEnemy);
        }
        
        if (enemies.length > 0 && borderCells.length > 0 && this.gameState.days % 10 === 0) {
            this.buildFactoryOnBorder(countryId, borderCells);
        }
    }
    
    expansionStrategy(countryId, cells, units, mem, powerLevel) {
        const neutralNeighbors = this.getNeutralNeighbors(countryId, cells);
        
        if (neutralNeighbors.length > 0 && units.length > 0) {
            this.expandToNeutral(countryId, units, neutralNeighbors);
            mem.expansionPhase = true;
        } else {
            mem.expansionPhase = false;
        }
        
        if (powerLevel >= 50 && this.gameState.days % 60 === 0 && !mem.expansionPhase) {
            const weakNeighbor = this.findWeakNeighbor(countryId);
            if (weakNeighbor) {
                this.gameState.addWar(countryId, weakNeighbor);
                console.log(`⚔️ ${countryId} объявил войну ${weakNeighbor}`);
                mem.target = weakNeighbor;
            }
        }
    }
    
    launchAttack(countryId, units, borderCells, targetEnemy) {
        let bestUnit = null;
        let bestDist = Infinity;
        let bestTarget = null;
        
        for (const unitId of units) {
            const ux = this.entities.x[unitId];
            const uy = this.entities.y[unitId];
            
            for (const border of borderCells) {
                const [bx, by] = border.split(',').map(Number);
                const dist = Math.abs(ux - bx) + Math.abs(uy - by);
                
                if (dist < bestDist) {
                    bestDist = dist;
                    bestUnit = unitId;
                    bestTarget = { x: bx, y: by };
                }
            }
        }
        
        if (bestUnit && bestTarget && bestDist <= 3) {
            const dx = Math.sign(bestTarget.x - this.entities.x[bestUnit]);
            const dy = Math.sign(bestTarget.y - this.entities.y[bestUnit]);
            const newX = this.entities.x[bestUnit] + dx;
            const newY = this.entities.y[bestUnit] + dy;
            
            const targetOwner = this.world.getCell(newX, newY);
            if (targetOwner === targetEnemy) {
                this.entities.moveTo(bestUnit, newX, newY);
            }
        } else if (bestUnit && bestTarget) {
            const dx = Math.sign(bestTarget.x - this.entities.x[bestUnit]);
            const dy = Math.sign(bestTarget.y - this.entities.y[bestUnit]);
            const newX = this.entities.x[bestUnit] + dx;
            const newY = this.entities.y[bestUnit] + dy;
            
            if (this.world.getCell(newX, newY) === countryId) {
                this.entities.moveTo(bestUnit, newX, newY);
            }
        }
    }
    
    defendBorders(countryId, units, borderCells, targetEnemy) {
        for (let i = 0; i < Math.min(units.length, borderCells.length); i++) {
            const unitId = units[i];
            const targetBorder = borderCells[i % borderCells.length];
            const [bx, by] = targetBorder.split(',').map(Number);
            
            const dist = Math.abs(this.entities.x[unitId] - bx) + 
                        Math.abs(this.entities.y[unitId] - by);
            
            if (dist > 1) {
                const dx = Math.sign(bx - this.entities.x[unitId]);
                const dy = Math.sign(by - this.entities.y[unitId]);
                const newX = this.entities.x[unitId] + dx;
                const newY = this.entities.y[unitId] + dy;
                
                if (this.world.getCell(newX, newY) === countryId) {
                    this.entities.moveTo(unitId, newX, newY);
                }
            }
        }
    }
    
    expandToNeutral(countryId, units, neutralNeighbors) {
        for (const unitId of units) {
            const target = neutralNeighbors[0];
            const [tx, ty] = target.split(',').map(Number);
            
            const dist = Math.abs(this.entities.x[unitId] - tx) + 
                        Math.abs(this.entities.y[unitId] - ty);
            
            if (dist <= 2) {
                const dx = Math.sign(tx - this.entities.x[unitId]);
                const dy = Math.sign(ty - this.entities.y[unitId]);
                const newX = this.entities.x[unitId] + dx;
                const newY = this.entities.y[unitId] + dy;
                
                if (this.world.getCell(newX, newY) === 0) {
                    this.world.setCell(newX, newY, countryId);
                    this.entities.moveTo(unitId, newX, newY);
                    break;
                }
            }
        }
    }
    
    recruitUnit(countryId, cells, powerLevel, atWar) {
        let bestCell = null;
        let bestScore = -Infinity;
        const center = this.getCountryCenter(countryId, cells);
        
        for (const cell of cells) {
            const [x, y] = cell.split(',').map(Number);
            let score = 0;
            
            if (this.world.hasBuilding(x, y, 'factory')) {
                score += 100;
            }
            
            if (!atWar) {
                const enemies = this.getEnemies(countryId);
                let minEnemyDist = Infinity;
                for (const enemyId of enemies) {
                    const enemyCells = this.world.getCountryCells(enemyId);
                    for (const enemyCell of enemyCells) {
                        const [ex, ey] = enemyCell.split(',').map(Number);
                        const dist = Math.abs(x - ex) + Math.abs(y - ey);
                        minEnemyDist = Math.min(minEnemyDist, dist);
                    }
                }
                score += minEnemyDist * 2;
            }
            
            const centerDist = Math.abs(x - center.x) + Math.abs(y - center.y);
            score += (50 - centerDist);
            score += Math.random() * 20;
            
            if (score > bestScore) {
                bestScore = score;
                bestCell = cell;
            }
        }
        
        if (bestCell) {
            const [x, y] = bestCell.split(',').map(Number);
            const hasFactory = this.world.hasBuilding(x, y, 'factory');
            const countryTech = this.gameState.countryTech?.get(countryId) || { tank: 1 };
            const hasTankTech = countryTech.tank > 1;
            
            const useTank = (powerLevel >= 60 && hasFactory && hasTankTech && atWar);
            const unitType = useTank ? 1 : 0;
            
            this.entities.createEntity(countryId, unitType, x, y);
        }
    }
    
    buildFactory(countryId, cells, powerLevel) {
        let bestCell = null;
        let bestScore = -Infinity;
        const center = this.getCountryCenter(countryId, cells);
        
        for (const cell of cells) {
            const [x, y] = cell.split(',').map(Number);
            if (this.world.hasBuilding(x, y, 'factory')) continue;
            
            let score = 0;
            const centerDist = Math.abs(x - center.x) + Math.abs(y - center.y);
            score += (100 - centerDist);
            
            const enemies = this.getEnemies(countryId);
            let minEnemyDist = Infinity;
            for (const enemyId of enemies) {
                const enemyCells = this.world.getCountryCells(enemyId);
                for (const enemyCell of enemyCells) {
                    const [ex, ey] = enemyCell.split(',').map(Number);
                    const dist = Math.abs(x - ex) + Math.abs(y - ey);
                    minEnemyDist = Math.min(minEnemyDist, dist);
                }
            }
            score += minEnemyDist * 2;
            
            if (score > bestScore) {
                bestScore = score;
                bestCell = cell;
            }
        }
        
        if (bestCell) {
            const [x, y] = bestCell.split(',').map(Number);
            this.world.addBuilding(x, y, 'factory');
            console.log(`🏭 ${countryId} построил завод в (${x},${y})`);
        }
    }
    
    buildFactoryOnBorder(countryId, borderCells) {
        for (const border of borderCells) {
            const [x, y] = border.split(',').map(Number);
            if (!this.world.hasBuilding(x, y, 'factory')) {
                this.world.addBuilding(x, y, 'factory');
                console.log(`🏭 ${countryId} построил завод на границе (${x},${y})`);
                break;
            }
        }
    }
    
    researchStrategy(countryId, factories, powerLevel) {
        let countryTech = this.gameState.countryTech?.get(countryId);
        if (!countryTech) {
            countryTech = { industry: 1, infantry: 1, tank: 1 };
        }
        
        const atWar = this.getEnemies(countryId).length > 0;
        
        if (powerLevel >= 70) {
            if (countryTech.tank < 4 && factories >= 3) {
                this.startResearch(countryId, 'tank', countryTech.tank + 1);
            } else if (countryTech.industry < 4) {
                this.startResearch(countryId, 'industry', countryTech.industry + 1);
            } else if (countryTech.infantry < 4) {
                this.startResearch(countryId, 'infantry', countryTech.infantry + 1);
            }
        } else if (atWar) {
            if (countryTech.infantry < 3) {
                this.startResearch(countryId, 'infantry', countryTech.infantry + 1);
            } else if (countryTech.tank < 2 && factories >= 2) {
                this.startResearch(countryId, 'tank', countryTech.tank + 1);
            } else if (countryTech.industry < 3) {
                this.startResearch(countryId, 'industry', countryTech.industry + 1);
            }
        } else {
            if (countryTech.industry < 4) {
                this.startResearch(countryId, 'industry', countryTech.industry + 1);
            } else if (countryTech.infantry < 3) {
                this.startResearch(countryId, 'infantry', countryTech.infantry + 1);
            }
        }
    }
    
    startResearch(countryId, type, level) {
        if (this.gameState.countryResearch?.get(countryId)) return;
        
        if (!this.gameState.countryResearch) {
            this.gameState.countryResearch = new Map();
        }
        
        this.gameState.countryResearch.set(countryId, {
            type: type,
            level: level,
            daysLeft: 100
        });
    }
    
    diplomacyStrategy(countryId) {
        const allCountries = this.world.getAllCountries();
        
        for (const otherId of allCountries) {
            if (otherId === countryId) continue;
            if (this.gameState.areAllies(countryId, otherId)) continue;
            if (this.gameState.isAtWar(countryId, otherId)) continue;
            
            const otherPower = this.countryPower[otherId] || 20;
            const myPower = this.countryPower[countryId] || 20;
            
            if (Math.abs(myPower - otherPower) < 15 && Math.random() < 0.1) {
                this.gameState.addAlliance(countryId, otherId);
                console.log(`🤝 ${countryId} заключил союз с ${otherId}`);
            }
        }
    }
    
    getWeakestEnemy(countryId, enemies) {
        let weakest = null;
        let weakestPower = Infinity;
        
        for (const enemyId of enemies) {
            const power = this.countryPower[enemyId] || 20;
            if (power < weakestPower) {
                weakestPower = power;
                weakest = enemyId;
            }
        }
        return weakest || enemies[0];
    }
    
    calculatePower(countryId, basePower) {
        const cells = this.world.getCountryCells(countryId).size;
        const units = this.entities.getEntitiesByOwner(countryId).length;
        const factories = this.countFactories(countryId);
        return basePower + cells * 0.5 + units * 3 + factories * 5;
    }
    
    getCountryCenter(countryId, cells) {
        let sumX = 0, sumY = 0;
        for (const cell of cells) {
            const [x, y] = cell.split(',').map(Number);
            sumX += x;
            sumY += y;
        }
        return {
            x: Math.round(sumX / cells.size),
            y: Math.round(sumY / cells.size)
        };
    }
    
    getNeutralNeighbors(countryId, cells) {
        const neighbors = new Set();
        
        for (const cell of cells) {
            const [x, y] = cell.split(',').map(Number);
            for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
                const nx = x + dx;
                const ny = y + dy;
                if (this.world.getCell(nx, ny) === 0) {
                    neighbors.add(`${nx},${ny}`);
                }
            }
        }
        
        return Array.from(neighbors);
    }
    
    findWeakNeighbor(countryId) {
        const allCountries = this.world.getAllCountries();
        let weakest = null;
        let weakestPower = Infinity;
        const myPower = this.countryPower[countryId] || 20;
        
        for (const otherId of allCountries) {
            if (otherId === countryId) continue;
            if (this.gameState.isAtWar(countryId, otherId)) continue;
            
            const otherPower = this.countryPower[otherId] || 20;
            const borderCells = this.world.getBorderWith(countryId, otherId);
            
            if (borderCells.length > 0 && otherPower < weakestPower && otherPower < myPower * 0.6) {
                weakestPower = otherPower;
                weakest = otherId;
            }
        }
        
        return weakest;
    }
    
    countFactories(countryId) {
        let count = 0;
        const cells = this.world.getCountryCells(countryId);
        for (const cell of cells) {
            const [x, y] = cell.split(',').map(Number);
            if (this.world.hasBuilding(x, y, 'factory')) count++;
        }
        return count;
    }
    
    getEnemies(countryId) {
        const enemies = [];
        if (!this.gameState.wars) return enemies;
        for (const war of this.gameState.wars) {
            if (war.a === countryId) enemies.push(war.b);
            if (war.b === countryId) enemies.push(war.a);
        }
        return enemies;
    }
}
