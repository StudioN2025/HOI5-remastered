// AIController.js — ИИ КОТОРЫЙ РЕАЛЬНО ИГРАЕТ

export class AIController {
    constructor(world, entities, gameState) {
        this.world = world;
        this.entities = entities;
        this.gameState = gameState;
        this.tickCounter = 0;
        this.TICK_INTERVAL = 2;
        
        // Память для каждой страны
        this.memory = new Map();
        
        // Реальная сила стран (на основе территории и истории)
        this.countryPower = {
            germany: 95,
            ussr: 90,
            uk: 85,
            france: 80,
            italy: 65,
            spain: 55,
            poland: 50,
            turkey: 45,
            yugoslavia: 40,
            czechoslovakia: 40,
            greece: 35,
            romania: 35,
            hungary: 30,
            netherlands: 30,
            belgium: 28,
            portugal: 25,
            finland: 25,
            bulgaria: 22,
            austria: 20,
            switzerland: 18,
            denmark: 15,
            sweden: 15,
            norway: 15,
            lithuania: 12,
            latvia: 10,
            estonia: 10,
            luxembourg: 5
        };
        
        // Стратегии для разных типов стран
        this.strategies = {
            major: {  // Великие державы (power >= 70)
                armyTarget: 50,
                factoryTarget: 20,
                aggression: 0.9,
                expansionist: true,
                researchFocus: 'tank'
            },
            regional: {  // Региональные державы (power >= 40)
                armyTarget: 25,
                factoryTarget: 10,
                aggression: 0.6,
                expansionist: true,
                researchFocus: 'infantry'
            },
            minor: {  // Малые страны (power < 40)
                armyTarget: 12,
                factoryTarget: 5,
                aggression: 0.3,
                expansionist: false,
                researchFocus: 'industry'
            }
        };
    }
    
    async init() {
        console.log('🤖 AI Controller инициализирован');
    }
    
    update() {
        this.tickCounter++;
        if (this.tickCounter < this.TICK_INTERVAL) return;
        this.tickCounter = 0;
        
        const countries = this.world.getAllCountries();
        const myId = this.gameState.myCountryId;
        
        // Сортируем по силе (сильные сначала)
        const sorted = Array.from(countries).sort((a,b) => 
            (this.countryPower[b]||0) - (this.countryPower[a]||0)
        );
        
        for (const countryId of sorted) {
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
        const power = this.countryPower[countryId] || 20;
        
        // Определяем тип страны
        let strat = this.strategies.minor;
        if (power >= 70) strat = this.strategies.major;
        else if (power >= 40) strat = this.strategies.regional;
        
        // Получаем или создаём память
        if (!this.memory.has(countryId)) {
            this.memory.set(countryId, {
                target: null,
                attackTimer: 0,
                buildTimer: 0,
                recruitTimer: 0,
                warDeclarationTimer: 0,
                lastAction: 0
            });
        }
        const mem = this.memory.get(countryId);
        
        // ========== 1. ЭКОНОМИКА И АРМИЯ ==========
        
        // Нанять юнитов если нужно
        if (unitCount < strat.armyTarget && Date.now() - mem.recruitTimer > 5000) {
            const toRecruit = Math.min(3, strat.armyTarget - unitCount);
            for (let i = 0; i < toRecruit; i++) {
                this.recruitUnit(countryId, cells, power, enemies.length > 0);
            }
            mem.recruitTimer = Date.now();
        }
        
        // Построить завод если нужно
        if (factories < strat.factoryTarget && Date.now() - mem.buildTimer > 10000) {
            this.buildFactory(countryId, cells);
            mem.buildTimer = Date.now();
        }
        
        // ========== 2. ВОЕННЫЕ ДЕЙСТВИЯ ==========
        
        if (enemies.length > 0) {
            // Есть враги - военные действия
            this.handleWar(countryId, cells, units, enemies, mem, strat, power);
        } else {
            // Нет врагов - экспансия
            this.handlePeace(countryId, cells, units, mem, strat, power);
        }
        
        // ========== 3. ОБЪЯВЛЕНИЕ ВОЙН ==========
        
        if (strat.expansionist && Date.now() - mem.warDeclarationTimer > 30000) {
            const target = this.findTarget(countryId, power);
            if (target) {
                this.gameState.addWar(countryId, target);
                mem.target = target;
                mem.warDeclarationTimer = Date.now();
                console.log(`⚔️ ${countryId} объявил войну ${target}`);
            }
        }
    }
    
    handleWar(countryId, cells, units, enemies, mem, strat, power) {
        // Выбираем цель
        let target = mem.target;
        if (!target || !enemies.includes(target)) {
            target = this.getBestTarget(countryId, enemies, power);
            mem.target = target;
        }
        
        if (!target) return;
        
        const border = this.world.getBorderWith(countryId, target);
        if (border.length === 0) return;
        
        // Атакуем если есть юниты
        if (units.length > 0 && Date.now() - mem.attackTimer > 3000) {
            const success = this.executeAttack(countryId, units, border, target);
            if (success) mem.attackTimer = Date.now();
        }
    }
    
    handlePeace(countryId, cells, units, mem, strat, power) {
        // Захватываем нейтральные клетки
        const neutral = this.getNeutralCells(countryId, cells);
        if (neutral.length > 0 && units.length > 0) {
            this.expand(countryId, units, neutral);
        }
    }
    
    executeAttack(countryId, units, borderCells, targetId) {
        // Находим лучший юнит для атаки
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
        
        if (!bestUnit || !bestTarget) return false;
        
        // Двигаемся к врагу
        const dx = Math.sign(bestTarget.x - this.entities.x[bestUnit]);
        const dy = Math.sign(bestTarget.y - this.entities.y[bestUnit]);
        const newX = this.entities.x[bestUnit] + dx;
        const newY = this.entities.y[bestUnit] + dy;
        
        const targetOwner = this.world.getCell(newX, newY);
        
        // Если клетка принадлежит врагу - атакуем (moveTo вызовет бой)
        if (targetOwner === targetId || borderCells.includes(`${newX},${newY}`)) {
            this.entities.moveTo(bestUnit, newX, newY);
            return true;
        }
        
        return false;
    }
    
    expand(countryId, units, neutralCells) {
        for (const unitId of units) {
            const target = neutralCells[0];
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
    
    recruitUnit(countryId, cells, power, atWar) {
        // Находим лучшую клетку для спавна
        let bestCell = null;
        let bestScore = -Infinity;
        
        for (const cell of cells) {
            const [x, y] = cell.split(',').map(Number);
            let score = Math.random() * 100;
            
            // Заводы = лучше
            if (this.world.hasBuilding(x, y, 'factory')) score += 200;
            
            // Центр страны = лучше
            const center = this.getCenter(cells);
            const centerDist = Math.abs(x - center.x) + Math.abs(y - center.y);
            score += (50 - centerDist);
            
            if (score > bestScore) {
                bestScore = score;
                bestCell = cell;
            }
        }
        
        if (bestCell) {
            const [x, y] = bestCell.split(',').map(Number);
            const hasFactory = this.world.hasBuilding(x, y, 'factory');
            const tech = this.gameState.countryTech?.get(countryId) || { tank: 1 };
            
            // Сильные страны и те у кого есть заводы могут нанимать танки
            const canBuildTank = (power >= 60 && hasFactory && tech.tank >= 2);
            const type = (canBuildTank && atWar) ? 1 : 0;
            
            this.entities.createEntity(countryId, type, x, y);
        }
    }
    
    buildFactory(countryId, cells) {
        // Находим лучшую клетку для завода
        let bestCell = null;
        let bestScore = -Infinity;
        const center = this.getCenter(cells);
        
        for (const cell of cells) {
            const [x, y] = cell.split(',').map(Number);
            if (this.world.hasBuilding(x, y, 'factory')) continue;
            
            let score = Math.random() * 50;
            
            // Ближе к центру = лучше
            const centerDist = Math.abs(x - center.x) + Math.abs(y - center.y);
            score += (100 - centerDist);
            
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
    
    getBestTarget(countryId, enemies, myPower) {
        // Выбираем самого слабого врага
        let best = null;
        let bestScore = Infinity;
        
        for (const enemy of enemies) {
            const enemyPower = this.countryPower[enemy] || 20;
            // Атакуем слабых
            if (enemyPower < bestScore && enemyPower < myPower * 1.2) {
                bestScore = enemyPower;
                best = enemy;
            }
        }
        
        return best || enemies[0];
    }
    
    findTarget(countryId, myPower) {
        // Ищем слабого соседа для войны
        const allCountries = this.world.getAllCountries();
        let bestTarget = null;
        let bestScore = Infinity;
        
        for (const other of allCountries) {
            if (other === countryId) continue;
            if (this.gameState.isAtWar(countryId, other)) continue;
            
            const otherPower = this.countryPower[other] || 20;
            const border = this.world.getBorderWith(countryId, other);
            
            // Сосед и слабее нас
            if (border.length > 0 && otherPower < bestScore && otherPower < myPower * 0.7) {
                bestScore = otherPower;
                bestTarget = other;
            }
        }
        
        return bestTarget;
    }
    
    getCenter(cells) {
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
    
    getNeutralCells(countryId, cells) {
        const neutrals = new Set();
        
        for (const cell of cells) {
            const [x, y] = cell.split(',').map(Number);
            for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
                const nx = x + dx;
                const ny = y + dy;
                if (this.world.getCell(nx, ny) === 0) {
                    neutrals.add(`${nx},${ny}`);
                }
            }
        }
        
        return Array.from(neutrals);
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
