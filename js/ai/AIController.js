// AIController.js — Умный ИИ (без спама союзами)

export class AIController {
    constructor(world, entities, gameState) {
        this.world = world;
        this.entities = entities;
        this.gameState = gameState;
        this.tickCounter = 0;
        this.TICK_INTERVAL = 3;
        
        // Память ИИ для каждой страны
        this.memory = new Map();
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
        
        // Сортируем страны по силе
        const sortedCountries = Array.from(countries).sort((a, b) => {
            return this.calculatePower(b) - this.calculatePower(a);
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
        
        // Получаем или создаём память
        if (!this.memory.has(countryId)) {
            this.memory.set(countryId, {
                lastAttackDay: 0,
                target: null,
                strategy: 'balanced',
                warExhaustion: 0,
                expansionTargets: [],
                lastAllianceOffer: 0,  // Запоминаем когда предлагали союз
                alliedCount: 0
            });
        }
        const mem = this.memory.get(countryId);
        
        // Анализируем ситуацию и выбираем стратегию
        this.analyzeAndSetStrategy(countryId, cells, unitCount, factories, enemies, mem);
        
        // Выполняем стратегию
        switch(mem.strategy) {
            case 'aggressive':
                this.aggressiveStrategy(countryId, cells, units, unitCount, factories, enemies, mem);
                break;
            case 'defensive':
                this.defensiveStrategy(countryId, cells, units, unitCount, factories, enemies, mem);
                break;
            case 'expansion':
                this.expansionStrategy(countryId, cells, units, unitCount, factories, mem);
                break;
            default:
                this.balancedStrategy(countryId, cells, units, unitCount, factories, enemies, mem);
        }
        
        // Дипломатия (раз в 30 дней, а не каждый тик!)
        if (this.gameState.days % 30 === 0 && cellCount > 20 && mem.alliedCount < 3) {
            this.diplomacyStrategy(countryId, enemies, mem);
        }
        
        // Технологии (раз в 20 дней)
        if (this.gameState.days % 20 === 0 && this.gameState.tech) {
            this.researchStrategy(countryId, factories, unitCount);
        }
    }
    
    analyzeAndSetStrategy(countryId, cells, unitCount, factories, enemies, mem) {
        const cellCount = cells.size;
        const power = this.calculatePower(countryId);
        
        if (enemies.length > 0) {
            let strongestEnemy = null;
            let strongestPower = 0;
            let weakestEnemy = null;
            let weakestPower = Infinity;
            
            for (const enemyId of enemies) {
                const enemyPower = this.calculatePower(enemyId);
                if (enemyPower > strongestPower) {
                    strongestPower = enemyPower;
                    strongestEnemy = enemyId;
                }
                if (enemyPower < weakestPower) {
                    weakestPower = enemyPower;
                    weakestEnemy = enemyId;
                }
            }
            
            if (power > strongestPower * 2) {
                mem.strategy = 'aggressive';
                mem.target = strongestEnemy;
            }
            else if (power < strongestPower * 0.7) {
                mem.strategy = 'defensive';
                mem.target = strongestEnemy;
            }
            else {
                mem.strategy = 'aggressive';
                mem.target = weakestEnemy;
            }
        } 
        else {
            mem.strategy = 'expansion';
        }
        
        if (cellCount > 100) {
            mem.strategy = 'aggressive';
        } else if (cellCount < 15) {
            mem.strategy = 'expansion';
        }
    }
    
    aggressiveStrategy(countryId, cells, units, unitCount, factories, enemies, mem) {
        if (!mem.target || !enemies.includes(mem.target)) {
            if (enemies.length === 0) return;
            mem.target = enemies[0];
        }
        
        const borderCells = this.world.getBorderWith(countryId, mem.target);
        const myPower = this.calculatePower(countryId);
        const enemyPower = this.calculatePower(mem.target);
        
        const desiredUnits = Math.min(40, Math.max(10, Math.floor(cells.size / 6)));
        if (unitCount < desiredUnits) {
            const needed = desiredUnits - unitCount;
            const maxRecruit = Math.min(3, needed);
            for (let i = 0; i < maxRecruit; i++) {
                this.recruitUnit(countryId, cells, 'frontline', mem.target);
            }
        }
        
        if (borderCells.length > 0 && units.length > 0) {
            const weakSpot = this.findWeakSpot(countryId, mem.target, borderCells);
            if (weakSpot) {
                this.launchAttack(countryId, units, weakSpot, mem.target);
            }
        }
        
        if (borderCells.length > 0 && factories < 8) {
            this.buildFactoryOnBorder(countryId, borderCells);
        }
        
        if (myPower > enemyPower * 2 && borderCells.length >= 4) {
            this.tryEncirclement(countryId, units, borderCells, mem.target);
        }
    }
    
    defensiveStrategy(countryId, cells, units, unitCount, factories, enemies, mem) {
        if (!mem.target || !enemies.includes(mem.target)) {
            if (enemies.length === 0) return;
            mem.target = enemies[0];
        }
        
        const borderCells = this.world.getBorderWith(countryId, mem.target);
        const myPower = this.calculatePower(countryId);
        const enemyPower = this.calculatePower(mem.target);
        
        const desperateUnits = Math.min(50, Math.max(15, Math.floor(cells.size / 5)));
        if (unitCount < desperateUnits || myPower < enemyPower * 0.8) {
            const maxRecruit = Math.min(4, desperateUnits - unitCount);
            for (let i = 0; i < maxRecruit; i++) {
                this.recruitUnit(countryId, cells, 'defense', mem.target);
            }
        }
        
        if (borderCells.length > 0 && units.length > 0) {
            this.defendCriticalPoints(countryId, units, borderCells, mem.target);
        }
        
        if (factories < 5) {
            this.buildFactoryDeep(countryId, cells, borderCells);
        }
        
        if (myPower > enemyPower * 1.2 && this.gameState.days - mem.lastAttackDay > 15) {
            mem.strategy = 'aggressive';
            mem.lastAttackDay = this.gameState.days;
        }
    }
    
    expansionStrategy(countryId, cells, units, unitCount, factories, mem) {
        const neutralNeighbors = this.getNeutralNeighbors(countryId, cells);
        
        if (neutralNeighbors.length > 0) {
            if (units.length > 0) {
                this.expandToNeutral(countryId, units, neutralNeighbors);
            }
            
            const desiredUnits = Math.min(25, Math.max(5, Math.floor(cells.size / 10)));
            if (unitCount < desiredUnits) {
                this.recruitUnit(countryId, cells, 'expansion');
            }
        }
        
        const targetFactories = Math.min(6, Math.max(1, Math.floor(cells.size / 15)));
        if (factories < targetFactories) {
            this.buildFactoryInCenter(countryId, cells);
        }
        
        if (cells.size > 20 && Math.random() < 0.03) {  // Уменьшил шанс войны
            const weakNeighbor = this.findWeakNeighbor(countryId);
            if (weakNeighbor) {
                this.gameState.addWar(countryId, weakNeighbor);
                console.log(`⚔️ ${countryId} объявил войну ${weakNeighbor} для экспансии`);
                mem.strategy = 'aggressive';
                mem.target = weakNeighbor;
            }
        }
    }
    
    balancedStrategy(countryId, cells, units, unitCount, factories, enemies, mem) {
        const idealUnits = Math.min(30, Math.max(8, Math.floor(cells.size / 10)));
        if (unitCount < idealUnits) {
            this.recruitUnit(countryId, cells, 'balanced');
        }
        
        if (enemies.length > 0) {
            const borderCells = this.world.getBorderWith(countryId, enemies[0]);
            if (borderCells.length > 0 && units.length > 0) {
                this.patrolBorders(countryId, units, borderCells);
            }
        }
        
        const neutralNeighbors = this.getNeutralNeighbors(countryId, cells);
        if (neutralNeighbors.length > 0 && units.length > 3) {
            this.expandToNeutral(countryId, units, neutralNeighbors);
        }
        
        const targetFactories = Math.min(5, Math.max(1, Math.floor(cells.size / 20)));
        if (factories < targetFactories) {
            this.buildFactoryInCenter(countryId, cells);
        }
    }
    
    diplomacyStrategy(countryId, enemies, mem) {
        const allCountries = this.world.getAllCountries();
        const myPower = this.calculatePower(countryId);
        
        // Не предлагать союзы если уже есть 2 союзника
        if (mem.alliedCount >= 2) return;
        
        // Не предлагать союзы слишком часто (раз в 30 дней уже ограничено)
        for (const otherId of allCountries) {
            if (otherId === countryId) continue;
            if (this.gameState.areAllies(countryId, otherId)) continue;
            if (this.gameState.isAtWar(countryId, otherId)) continue;
            
            // Не предлагать союз игроку — пусть игрок сам решает!
            if (otherId === this.gameState.myCountryId) continue;
            
            const otherPower = this.calculatePower(otherId);
            const otherEnemies = this.getEnemies(otherId);
            
            // Только если есть реальная угроза
            const commonEnemies = enemies.filter(e => otherEnemies.includes(e));
            
            if (commonEnemies.length > 0 && myPower < this.calculatePower(commonEnemies[0]) * 1.2) {
                if (Math.random() < 0.3) {  // 30% шанс, не 100%
                    this.gameState.addAlliance(countryId, otherId);
                    mem.alliedCount++;
                    console.log(`🤝 ${countryId} заключил союз с ${otherId} против ${commonEnemies[0]}`);
                }
            }
        }
    }
    
    researchStrategy(countryId, factories, unitCount) {
        const currentTech = this.gameState.tech;
        const atWar = this.getEnemies(countryId).length > 0;
        
        if (atWar) {
            if (currentTech.tank < 3 && factories > 2) {
                this.startResearch('tank', currentTech.tank + 1);
            } 
            else if (currentTech.infantry < 4) {
                this.startResearch('infantry', currentTech.infantry + 1);
            }
        } 
        else {
            if (currentTech.industry < 4) {
                this.startResearch('industry', currentTech.industry + 1);
            }
            else if (currentTech.tank < 3) {
                this.startResearch('tank', currentTech.tank + 1);
            }
        }
    }
    
    startResearch(type, level) {
        if (this.gameState.activeResearch) return;
        this.gameState.activeResearch = {
            type: type,
            level: level,
            daysLeft: 100
        };
    }
    
    findWeakSpot(countryId, targetEnemy, borderCells) {
        let bestSpot = null;
        let lowestDefense = Infinity;
        
        for (const border of borderCells) {
            const [bx, by] = border.split(',').map(Number);
            
            for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
                const ex = bx + dx;
                const ey = by + dy;
                
                if (this.world.getCell(ex, ey) === targetEnemy) {
                    const enemyUnit = this.entities.getUnitAt(ex, ey);
                    const defense = enemyUnit ? 100 : 20;
                    const nearbyEnemies = this.countNearbyEnemies(ex, ey, targetEnemy);
                    
                    const totalDefense = defense + nearbyEnemies * 30;
                    
                    if (totalDefense < lowestDefense) {
                        lowestDefense = totalDefense;
                        bestSpot = { x: ex, y: ey, border: border };
                    }
                }
            }
        }
        
        return bestSpot;
    }
    
    launchAttack(countryId, units, weakSpot, targetEnemy) {
        let closestUnit = null;
        let closestDist = Infinity;
        
        for (const unitId of units) {
            const dist = Math.abs(this.entities.x[unitId] - weakSpot.x) + 
                        Math.abs(this.entities.y[unitId] - weakSpot.y);
            if (dist < closestDist) {
                closestDist = dist;
                closestUnit = unitId;
            }
        }
        
        if (closestUnit !== null) {
            if (closestDist <= 1) {
                if (this.entities.inCombat[closestUnit] === 0) {
                    this.entities.moveTo(closestUnit, weakSpot.x, weakSpot.y);
                }
            } else {
                const dx = Math.sign(weakSpot.x - this.entities.x[closestUnit]);
                const dy = Math.sign(weakSpot.y - this.entities.y[closestUnit]);
                const newX = this.entities.x[closestUnit] + dx;
                const newY = this.entities.y[closestUnit] + dy;
                
                if (this.world.getCell(newX, newY) !== 0) {
                    this.entities.moveTo(closestUnit, newX, newY);
                }
            }
        }
    }
    
    defendCriticalPoints(countryId, units, borderCells, targetEnemy) {
        const vulnerablePoints = [];
        
        for (const border of borderCells) {
            const [bx, by] = border.split(',').map(Number);
            const nearbyEnemies = this.countNearbyEnemies(bx, by, targetEnemy);
            if (nearbyEnemies > 0) {
                vulnerablePoints.push({ pos: border, threat: nearbyEnemies });
            }
        }
        
        vulnerablePoints.sort((a, b) => b.threat - a.threat);
        
        for (let i = 0; i < Math.min(units.length, vulnerablePoints.length); i++) {
            const unitId = units[i];
            const target = vulnerablePoints[i].pos;
            const [tx, ty] = target.split(',').map(Number);
            
            const dist = Math.abs(this.entities.x[unitId] - tx) + 
                        Math.abs(this.entities.y[unitId] - ty);
            
            if (dist > 1) {
                const dx = Math.sign(tx - this.entities.x[unitId]);
                const dy = Math.sign(ty - this.entities.y[unitId]);
                const newX = this.entities.x[unitId] + dx;
                const newY = this.entities.y[unitId] + dy;
                
                if (this.world.getCell(newX, newY) === countryId) {
                    this.entities.moveTo(unitId, newX, newY);
                }
            }
        }
    }
    
    tryEncirclement(countryId, units, borderCells, targetEnemy) {
        if (units.length < 6 || borderCells.length < 4) return;
        
        const leftFlank = borderCells[0];
        const rightFlank = borderCells[borderCells.length - 1];
        
        let leftUnit = null;
        let rightUnit = null;
        
        for (const unitId of units) {
            const [ux, uy] = [this.entities.x[unitId], this.entities.y[unitId]];
            const [lx, ly] = leftFlank.split(',').map(Number);
            const [rx, ry] = rightFlank.split(',').map(Number);
            
            if (Math.abs(ux - lx) + Math.abs(uy - ly) < 5 && !leftUnit) {
                leftUnit = unitId;
            }
            if (Math.abs(ux - rx) + Math.abs(uy - ry) < 5 && !rightUnit) {
                rightUnit = unitId;
            }
        }
        
        if (leftUnit && rightUnit) {
            const [lx, ly] = leftFlank.split(',').map(Number);
            const [rx, ry] = rightFlank.split(',').map(Number);
            
            const leftTarget = `${lx - 1},${ly}`;
            if (this.world.getCell(lx - 1, ly) === targetEnemy) {
                this.entities.moveTo(leftUnit, lx - 1, ly);
            }
            
            const rightTarget = `${rx + 1},${ry}`;
            if (this.world.getCell(rx + 1, ry) === targetEnemy) {
                this.entities.moveTo(rightUnit, rx + 1, ry);
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
    
    recruitUnit(countryId, cells, role, targetEnemy = null) {
        let bestCell = null;
        let bestScore = -Infinity;
        
        for (const cell of cells) {
            const [x, y] = cell.split(',').map(Number);
            let score = 0;
            
            if (this.world.hasBuilding(x, y, 'factory')) {
                score += 50;
            }
            
            if (role === 'frontline' && targetEnemy) {
                const enemyCells = this.world.getCountryCells(targetEnemy);
                let minDist = Infinity;
                for (const enemyCell of enemyCells) {
                    const [ex, ey] = enemyCell.split(',').map(Number);
                    const dist = Math.abs(x - ex) + Math.abs(y - ey);
                    minDist = Math.min(minDist, dist);
                }
                score += (50 - minDist) * 2;
            } 
            else if (role === 'defense') {
                if (targetEnemy) {
                    const enemyCells = this.world.getCountryCells(targetEnemy);
                    let minDist = Infinity;
                    for (const enemyCell of enemyCells) {
                        const [ex, ey] = enemyCell.split(',').map(Number);
                        const dist = Math.abs(x - ex) + Math.abs(y - ey);
                        minDist = Math.min(minDist, dist);
                    }
                    score += minDist * 3;
                }
            }
            else if (role === 'expansion') {
                const neighbors = [[0,1],[0,-1],[1,0],[-1,0]];
                for (const [dx, dy] of neighbors) {
                    if (this.world.getCell(x + dx, y + dy) === 0) {
                        score += 30;
                    }
                }
            }
            
            score += Math.random() * 10;
            
            if (score > bestScore) {
                bestScore = score;
                bestCell = cell;
            }
        }
        
        if (bestCell) {
            const [x, y] = bestCell.split(',').map(Number);
            const hasFactory = this.world.hasBuilding(x, y, 'factory');
            const tankTech = this.gameState.tech && this.gameState.tech.tank > 1;
            const atWar = this.getEnemies(countryId).length > 0;
            
            const useTank = (role === 'frontline' && hasFactory && tankTech && atWar);
            const unitType = useTank ? 1 : 0;
            
            this.entities.createEntity(countryId, unitType, x, y);
        }
    }
    
    buildFactoryOnBorder(countryId, borderCells) {
        if (borderCells.length === 0) return;
        
        for (const border of borderCells) {
            const [x, y] = border.split(',').map(Number);
            if (!this.world.hasBuilding(x, y, 'factory')) {
                this.world.addBuilding(x, y, 'factory');
                console.log(`🏭 ${countryId} построил завод на границе (${x},${y})`);
                break;
            }
        }
    }
    
    buildFactoryDeep(countryId, cells, borderCells) {
        let bestCell = null;
        let maxDist = -Infinity;
        
        const borderSet = new Set(borderCells);
        
        for (const cell of cells) {
            if (this.world.hasBuilding(cell.split(',')[0], cell.split(',')[1], 'factory')) continue;
            if (borderSet.has(cell)) continue;
            
            const [x, y] = cell.split(',').map(Number);
            let minBorderDist = Infinity;
            
            for (const border of borderCells) {
                const [bx, by] = border.split(',').map(Number);
                const dist = Math.abs(x - bx) + Math.abs(y - by);
                minBorderDist = Math.min(minBorderDist, dist);
            }
            
            if (minBorderDist > maxDist) {
                maxDist = minBorderDist;
                bestCell = cell;
            }
        }
        
        if (bestCell) {
            const [x, y] = bestCell.split(',').map(Number);
            this.world.addBuilding(x, y, 'factory');
            console.log(`🏭 ${countryId} построил завод в глубине (${x},${y})`);
        }
    }
    
    buildFactoryInCenter(countryId, cells) {
        let sumX = 0, sumY = 0;
        for (const cell of cells) {
            const [x, y] = cell.split(',').map(Number);
            sumX += x;
            sumY += y;
        }
        const centerX = Math.round(sumX / cells.size);
        const centerY = Math.round(sumY / cells.size);
        
        let bestCell = null;
        let bestDist = Infinity;
        
        for (const cell of cells) {
            const [x, y] = cell.split(',').map(Number);
            if (this.world.hasBuilding(x, y, 'factory')) continue;
            
            const dist = Math.abs(x - centerX) + Math.abs(y - centerY);
            if (dist < bestDist) {
                bestDist = dist;
                bestCell = cell;
            }
        }
        
        if (bestCell) {
            const [x, y] = bestCell.split(',').map(Number);
            this.world.addBuilding(x, y, 'factory');
            console.log(`🏭 ${countryId} построил завод в центре (${x},${y})`);
        }
    }
    
    patrolBorders(countryId, units, borderCells) {
        for (let i = 0; i < units.length; i++) {
            const unitId = units[i];
            const targetBorder = borderCells[i % borderCells.length];
            const [bx, by] = targetBorder.split(',').map(Number);
            
            const dist = Math.abs(this.entities.x[unitId] - bx) + 
                        Math.abs(this.entities.y[unitId] - by);
            
            if (dist > 2) {
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
        const myPower = this.calculatePower(countryId);
        
        for (const otherId of allCountries) {
            if (otherId === countryId) continue;
            if (this.gameState.isAtWar(countryId, otherId)) continue;
            
            const otherPower = this.calculatePower(otherId);
            const borderCells = this.world.getBorderWith(countryId, otherId);
            
            if (borderCells.length > 0 && otherPower < weakestPower && otherPower < myPower * 0.5) {
                weakestPower = otherPower;
                weakest = otherId;
            }
        }
        
        return weakest;
    }
    
    countNearbyEnemies(x, y, enemyId) {
        let count = 0;
        for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
            const nx = x + dx;
            const ny = y + dy;
            if (this.world.getCell(nx, ny) === enemyId) {
                count++;
            }
            const unit = this.entities.getUnitAt(nx, ny);
            if (unit && this.entities.owner[unit] === enemyId) {
                count += 2;
            }
        }
        return count;
    }
    
    calculatePower(countryId) {
        const cells = this.world.getCountryCells(countryId).size;
        const units = this.entities.getEntitiesByOwner(countryId).length;
        const factories = this.countFactories(countryId);
        const techBonus = (this.gameState.tech?.tank || 1) * 1.2;
        return cells + units * 10 * techBonus + factories * 20;
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
