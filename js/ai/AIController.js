// AIController.js — ЛЁГКИЙ И УМНЫЙ ИИ

export class AIController {
    constructor(world, entities, gameState) {
        this.world = world;
        this.entities = entities;
        this.gameState = gameState;
        this.tickCounter = 0;
        this.TICK_INTERVAL = 5; // Раз в 5 дней (легче)
        
        this.memory = new Map();
        
        // Историческая сила (для приоритетов)
        this.power = {
            germany: 95, ussr: 90, uk: 85, france: 80, italy: 65,
            spain: 55, poland: 50, turkey: 45, yugoslavia: 40,
            czechoslovakia: 40, greece: 35, romania: 35, hungary: 30,
            netherlands: 30, belgium: 28, portugal: 25, finland: 25,
            bulgaria: 22, austria: 20, switzerland: 18, denmark: 15,
            lithuania: 12, latvia: 10, estonia: 10, luxembourg: 5
        };
    }
    
    async init() {
        console.log('🤖 AI инициализирован');
    }
    
    update() {
        this.tickCounter++;
        if (this.tickCounter < this.TICK_INTERVAL) return;
        this.tickCounter = 0;
        
        const countries = this.world.getAllCountries();
        const myId = this.gameState.myCountryId;
        
        // Обрабатываем не больше 5 стран за раз
        let processed = 0;
        for (const countryId of countries) {
            if (countryId === myId) continue;
            if (processed >= 5) break;
            
            const cells = this.world.getCountryCells(countryId);
            if (cells.size === 0) continue;
            
            this.processCountry(countryId);
            processed++;
        }
    }
    
    processCountry(countryId) {
        const cells = this.world.getCountryCells(countryId);
        const cellCount = cells.size;
        const units = this.entities.getEntitiesByOwner(countryId);
        const unitCount = units.length;
        const factories = this.countFactories(countryId);
        const enemies = this.getEnemies(countryId);
        const powerLvl = this.power[countryId] || 20;
        
        // Получаем память
        if (!this.memory.has(countryId)) {
            this.memory.set(countryId, {
                target: null,
                lastRecruit: 0,
                lastBuild: 0
            });
        }
        const mem = this.memory.get(countryId);
        
        // ===== ЦЕЛИ В ЗАВИСИМОСТИ ОТ СИЛЫ =====
        let targetUnits = 15;
        let targetFactories = 5;
        
        if (powerLvl >= 70) {
            targetUnits = Math.min(40, Math.floor(cellCount / 4));
            targetFactories = Math.min(15, Math.floor(cellCount / 15));
        } else if (powerLvl >= 40) {
            targetUnits = Math.min(25, Math.floor(cellCount / 5));
            targetFactories = Math.min(8, Math.floor(cellCount / 20));
        } else {
            targetUnits = Math.min(12, Math.floor(cellCount / 6));
            targetFactories = Math.min(4, Math.floor(cellCount / 25));
        }
        
        // ===== 1. НАЙМ ЮНИТОВ =====
        if (unitCount < targetUnits && Date.now() - mem.lastRecruit > 8000) {
            const toAdd = Math.min(2, targetUnits - unitCount);
            for (let i = 0; i < toAdd; i++) {
                this.recruitUnit(countryId, cells, powerLvl, enemies.length > 0);
            }
            mem.lastRecruit = Date.now();
        }
        
        // ===== 2. СТРОИТЕЛЬСТВО =====
        if (factories < targetFactories && Date.now() - mem.lastBuild > 15000) {
            this.buildFactory(countryId, cells);
            mem.lastBuild = Date.now();
        }
        
        // ===== 3. ВОЕННЫЕ ДЕЙСТВИЯ =====
        if (enemies.length > 0 && units.length > 0) {
            this.doMilitary(countryId, units, enemies, mem);
        } 
        // ===== 4. ЭКСПАНСИЯ =====
        else if (units.length > 0) {
            this.doExpand(countryId, cells, units);
        }
    }
    
    doMilitary(countryId, units, enemies, mem) {
        // Выбираем цель
        let target = mem.target;
        if (!target || !enemies.includes(target)) {
            target = this.getWeakest(enemies);
            mem.target = target;
        }
        
        if (!target) return;
        
        const border = this.world.getBorderWith(countryId, target);
        if (border.length === 0) return;
        
        // Двигаем ближайший юнит к границе
        let bestUnit = null;
        let bestDist = Infinity;
        let bestBorder = null;
        
        for (const unitId of units) {
            const ux = this.entities.x[unitId];
            const uy = this.entities.y[unitId];
            
            for (const b of border) {
                const [bx, by] = b.split(',').map(Number);
                const dist = Math.abs(ux - bx) + Math.abs(uy - by);
                if (dist < bestDist) {
                    bestDist = dist;
                    bestUnit = unitId;
                    bestBorder = { x: bx, y: by };
                }
            }
        }
        
        if (bestUnit && bestBorder && bestDist > 1) {
            // Двигаемся к границе
            const dx = Math.sign(bestBorder.x - this.entities.x[bestUnit]);
            const dy = Math.sign(bestBorder.y - this.entities.y[bestUnit]);
            const newX = this.entities.x[bestUnit] + dx;
            const newY = this.entities.y[bestUnit] + dy;
            
            if (this.world.getCell(newX, newY) !== 0) {
                this.entities.moveTo(bestUnit, newX, newY);
            }
        } else if (bestUnit && bestBorder && bestDist <= 1) {
            // Атакуем вражескую клетку
            const [bx, by] = border[0].split(',').map(Number);
            for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
                const enemyX = bx + dx;
                const enemyY = by + dy;
                if (this.world.getCell(enemyX, enemyY) === target) {
                    this.entities.moveTo(bestUnit, enemyX, enemyY);
                    break;
                }
            }
        }
    }
    
    doExpand(countryId, cells, units) {
        // Ищем нейтральную клетку рядом
        let targetNeutral = null;
        
        for (const cell of cells) {
            const [x, y] = cell.split(',').map(Number);
            for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
                const nx = x + dx;
                const ny = y + dy;
                if (this.world.getCell(nx, ny) === 0) {
                    targetNeutral = { x: nx, y: ny };
                    break;
                }
            }
            if (targetNeutral) break;
        }
        
        if (!targetNeutral) return;
        
        // Двигаем ближайший юнит к нейтральной клетке
        let bestUnit = null;
        let bestDist = Infinity;
        
        for (const unitId of units) {
            const dist = Math.abs(this.entities.x[unitId] - targetNeutral.x) + 
                        Math.abs(this.entities.y[unitId] - targetNeutral.y);
            if (dist < bestDist) {
                bestDist = dist;
                bestUnit = unitId;
            }
        }
        
        if (bestUnit && bestDist <= 2) {
            const dx = Math.sign(targetNeutral.x - this.entities.x[bestUnit]);
            const dy = Math.sign(targetNeutral.y - this.entities.y[bestUnit]);
            const newX = this.entities.x[bestUnit] + dx;
            const newY = this.entities.y[bestUnit] + dy;
            
            if (this.world.getCell(newX, newY) === 0) {
                this.world.setCell(newX, newY, countryId);
                this.entities.moveTo(bestUnit, newX, newY);
            }
        } else if (bestUnit) {
            const dx = Math.sign(targetNeutral.x - this.entities.x[bestUnit]);
            const dy = Math.sign(targetNeutral.y - this.entities.y[bestUnit]);
            const newX = this.entities.x[bestUnit] + dx;
            const newY = this.entities.y[bestUnit] + dy;
            if (this.world.getCell(newX, newY) !== 0) {
                this.entities.moveTo(bestUnit, newX, newY);
            }
        }
    }
    
    recruitUnit(countryId, cells, powerLvl, atWar) {
        // Находим безопасную клетку (с заводом или в центре)
        let bestCell = null;
        let bestScore = -1;
        
        for (const cell of cells) {
            const [x, y] = cell.split(',').map(Number);
            let score = 0;
            
            if (this.world.hasBuilding(x, y, 'factory')) score += 100;
            
            // Ближе к центру = лучше
            let sumX = 0, sumY = 0;
            for (const c of cells) {
                const [cx, cy] = c.split(',').map(Number);
                sumX += cx;
                sumY += cy;
            }
            const centerX = sumX / cells.size;
            const centerY = sumY / cells.size;
            const centerDist = Math.abs(x - centerX) + Math.abs(y - centerY);
            score += (50 - centerDist);
            
            if (score > bestScore) {
                bestScore = score;
                bestCell = cell;
            }
        }
        
        if (bestCell) {
            const [x, y] = bestCell.split(',').map(Number);
            // Танки только для сильных стран в военное время
            const useTank = (powerLvl >= 60 && atWar && this.world.hasBuilding(x, y, 'factory'));
            const type = useTank ? 1 : 0;
            this.entities.createEntity(countryId, type, x, y);
        }
    }
    
    buildFactory(countryId, cells) {
        // Строим в случайной клетке без завода
        const available = [];
        for (const cell of cells) {
            const [x, y] = cell.split(',').map(Number);
            if (!this.world.hasBuilding(x, y, 'factory')) {
                available.push(cell);
            }
        }
        
        if (available.length > 0) {
            const randomCell = available[Math.floor(Math.random() * available.length)];
            const [x, y] = randomCell.split(',').map(Number);
            this.world.addBuilding(x, y, 'factory');
        }
    }
    
    getWeakest(enemies) {
        let weakest = null;
        let weakestPower = Infinity;
        
        for (const enemy of enemies) {
            const power = this.power[enemy] || 20;
            if (power < weakestPower) {
                weakestPower = power;
                weakest = enemy;
            }
        }
        return weakest || enemies[0];
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
