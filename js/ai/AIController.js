// AIController.js — Умный ИИ

export class AIController {
    constructor(world, entities, gameState) {
        this.world = world;
        this.entities = entities;
        this.gameState = gameState;
        this.tickCounter = 0;
        this.TICK_INTERVAL = 5; // Раз в 5 дней (реже, чтобы не лагать)
        
        // Память ИИ для каждой страны
        this.memory = new Map(); // countryId -> { lastAttack, target, factoriesBuilt }
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
        
        // Обрабатываем по очереди, но не больше 2 стран за раз
        let processed = 0;
        for (const countryId of countries) {
            if (countryId === myId) continue;
            if (processed >= 2) break;
            
            // Пропускаем мёртвые страны
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
        
        // Получаем или создаём память для страны
        if (!this.memory.has(countryId)) {
            this.memory.set(countryId, {
                lastAttack: 0,
                target: null,
                factoriesBuilt: 0,
                unitProductionCounter: 0
            });
        }
        const mem = this.memory.get(countryId);
        
        // === 1. ВОЕННАЯ СТРАТЕГИЯ ===
        if (enemies.length > 0) {
            // Выбираем самого слабого врага
            const targetEnemy = this.getWeakestEnemy(countryId, enemies);
            mem.target = targetEnemy;
            
            const borderCells = this.world.getBorderWith(countryId, targetEnemy);
            const myPower = unitCount * 10 + factories * 5;
            const enemyPower = this.getEnemyPower(targetEnemy);
            
            // Атаковать если сила больше
            if (myPower > enemyPower * 1.2 && borderCells.length > 0) {
                this.attackEnemy(countryId, units, borderCells);
            } 
            // Обороняться если сила меньше
            else if (myPower < enemyPower * 0.8) {
                this.defendBorders(countryId, units, borderCells);
            }
            // Патрулировать границу
            else {
                this.patrolBorders(countryId, units, borderCells);
            }
        } 
        
        // === 2. ЭКОНОМИКА ===
        // Строим заводы если мало
        const targetFactories = Math.min(10, Math.max(1, Math.floor(cellCount / 25)));
        if (factories < targetFactories && mem.factoriesBuilt < targetFactories) {
            this.buildFactory(countryId, cells);
            mem.factoriesBuilt++;
        }
        
        // === 3. НАЙМ ЮНИТОВ ===
        const maxUnits = Math.min(30, Math.max(5, Math.floor(cellCount / 8)));
        if (unitCount < maxUnits && mem.unitProductionCounter < 20) {
            // Покупаем юнитов только если есть ресурсы
            const requiredEquipment = (maxUnits - unitCount) * 100;
            if (this.gameState.equipment > requiredEquipment) {
                this.recruitUnit(countryId, cells, unitCount, maxUnits);
                mem.unitProductionCounter++;
            }
        }
        
        // Сброс счётчика найма раз в 30 дней
        if (this.gameState.days % 30 === 0) {
            mem.unitProductionCounter = 0;
            mem.factoriesBuilt = 0;
        }
    }
    
    getWeakestEnemy(countryId, enemies) {
        let weakest = null;
        let weakestPower = Infinity;
        
        for (const enemyId of enemies) {
            const enemyCells = this.world.getCountryCells(enemyId).size;
            const enemyUnits = this.entities.getEntitiesByOwner(enemyId).length;
            const power = enemyCells + enemyUnits * 5;
            
            if (power < weakestPower) {
                weakestPower = power;
                weakest = enemyId;
            }
        }
        return weakest || enemies[0];
    }
    
    getEnemyPower(enemyId) {
        const cells = this.world.getCountryCells(enemyId).size;
        const units = this.entities.getEntitiesByOwner(enemyId).length;
        return cells + units * 5;
    }
    
    attackEnemy(countryId, units, borderCells) {
        // Выбираем цель для атаки
        const targetBorder = borderCells[Math.floor(Math.random() * borderCells.length)];
        const [tx, ty] = targetBorder.split(',').map(Number);
        
        // Ищем ближайший юнит к границе
        let closestUnit = null;
        let closestDist = Infinity;
        
        for (const unitId of units) {
            const ux = this.entities.x[unitId];
            const uy = this.entities.y[unitId];
            const dist = Math.abs(ux - tx) + Math.abs(uy - ty);
            if (dist < closestDist) {
                closestDist = dist;
                closestUnit = unitId;
            }
        }
        
        if (closestUnit !== null && closestDist > 1) {
            // Двигаем юнит к границе
            const dx = Math.sign(tx - this.entities.x[closestUnit]);
            const dy = Math.sign(ty - this.entities.y[closestUnit]);
            const newX = this.entities.x[closestUnit] + dx;
            const newY = this.entities.y[closestUnit] + dy;
            
            if (this.world.getCell(newX, newY) !== 0) {
                this.entities.moveTo(closestUnit, newX, newY);
            }
        }
    }
    
    defendBorders(countryId, units, borderCells) {
        // Ставим юниты на границу для обороны
        for (let i = 0; i < Math.min(units.length, borderCells.length); i++) {
            const unitId = units[i];
            const border = borderCells[i % borderCells.length];
            const [bx, by] = border.split(',').map(Number);
            
            if (Math.abs(this.entities.x[unitId] - bx) + Math.abs(this.entities.y[unitId] - by) > 2) {
                // Двигаем к границе
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
    
    patrolBorders(countryId, units, borderCells) {
        // Патрулируем границу (двигаемся вдоль)
        for (let i = 0; i < Math.min(units.length, borderCells.length); i++) {
            const unitId = units[i];
            const border = borderCells[i % borderCells.length];
            const [bx, by] = border.split(',').map(Number);
            
            if (Math.abs(this.entities.x[unitId] - bx) > 1 || Math.abs(this.entities.y[unitId] - by) > 1) {
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
    
    recruitUnit(countryId, cells, unitCount, maxUnits) {
        // Находим безопасную клетку для спавна (подальше от врага)
        const enemies = this.getEnemies(countryId);
        let bestCell = null;
        let bestScore = -Infinity;
        
        for (const cell of cells) {
            const [x, y] = cell.split(',').map(Number);
            let score = 0;
            
            // Чем дальше от врага, тем лучше
            for (const enemyId of enemies) {
                const enemyCells = this.world.getCountryCells(enemyId);
                let minDist = Infinity;
                for (const enemyCell of enemyCells) {
                    const [ex, ey] = enemyCell.split(',').map(Number);
                    const dist = Math.abs(x - ex) + Math.abs(y - ey);
                    minDist = Math.min(minDist, dist);
                }
                score += minDist;
            }
            
            // Чем больше заводов рядом, тем лучше
            if (this.world.hasBuilding(x, y, 'factory')) {
                score += 50;
            }
            
            // Случайное смещение для разнообразия
            score += Math.random() * 10;
            
            if (score > bestScore) {
                bestScore = score;
                bestCell = cell;
            }
        }
        
        if (bestCell) {
            const [x, y] = bestCell.split(',').map(Number);
            // Решаем какой тип юнита нанимать
            const hasTankTech = this.gameState.tech && this.gameState.tech.tank > 1;
            const hasFactory = this.world.hasBuilding(x, y, 'factory');
            const unitType = (hasTankTech && hasFactory && unitCount > 5) ? 1 : 0;
            
            const unitId = this.entities.createEntity(countryId, unitType, x, y);
            console.log(`🤖 ${countryId}: нанял ${unitType === 0 ? 'пехоту' : 'танк'} в (${x},${y}) [юнитов: ${unitCount + 1}/${maxUnits}]`);
        }
    }
    
    buildFactory(countryId, cells) {
        // Ищем лучшую клетку для завода (в центре страны, подальше от границы)
        const enemies = this.getEnemies(countryId);
        let bestCell = null;
        let bestScore = -Infinity;
        
        for (const cell of cells) {
            const [x, y] = cell.split(',').map(Number);
            if (this.world.hasBuilding(x, y, 'factory')) continue;
            
            let score = 0;
            
            // Чем дальше от врага, тем лучше
            for (const enemyId of enemies) {
                const enemyCells = this.world.getCountryCells(enemyId);
                let minDist = Infinity;
                for (const enemyCell of enemyCells) {
                    const [ex, ey] = enemyCell.split(',').map(Number);
                    const dist = Math.abs(x - ex) + Math.abs(y - ey);
                    minDist = Math.min(minDist, dist);
                }
                score += minDist;
            }
            
            // Чем больше соседних своих клеток, тем лучше
            let neighborScore = 0;
            const neighbors = [[0,1],[0,-1],[1,0],[-1,0]];
            for (const [dx, dy] of neighbors) {
                if (this.world.getCell(x + dx, y + dy) === countryId) {
                    neighborScore += 10;
                }
            }
            score += neighborScore;
            
            if (score > bestScore) {
                bestScore = score;
                bestCell = cell;
            }
        }
        
        if (bestCell) {
            const [x, y] = bestCell.split(',').map(Number);
            this.world.addBuilding(x, y, 'factory');
            console.log(`🤖 ${countryId}: построил завод в (${x},${y})`);
        }
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
