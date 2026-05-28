// AIController.js — НОРМАЛЬНЫЙ ИИ

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
        console.log('🤖 AI Controller инициализирован');
    }
    
    update() {
        this.tickCounter++;
        if (this.tickCounter < this.TICK_INTERVAL) return;
        this.tickCounter = 0;
        
        const countries = this.world.getAllCountries();
        const myId = this.gameState.myCountryId;
        
        // Обрабатываем ВСЕ страны, а не только 2
        for (const countryId of countries) {
            if (countryId === myId) continue;
            
            const cells = this.world.getCountryCells(countryId);
            if (cells.size === 0) continue;
            
            // Пропускаем совсем мелкие страны (люксембург и т.д.)
            if (cells.size < 5 && this.getEnemies(countryId).length === 0) continue;
            
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
                expansionPhase: false,
                defensePhase: false,
                unitTarget: 0
            });
        }
        const mem = this.memory.get(countryId);
        
        // === 1. ЕСЛИ ЕСТЬ ВРАГИ - ВОЕННАЯ СТРАТЕГИЯ ===
        if (enemies.length > 0) {
            mem.expansionPhase = true;
            this.militaryStrategy(countryId, cells, units, unitCount, factories, enemies, mem);
        } 
        // === 2. ЕСЛИ НЕТ ВРАГОВ - ЭКСПАНСИЯ ===
        else {
            this.expansionStrategy(countryId, cells, units, unitCount, factories, mem);
        }
        
        // === 3. ДИПЛОМАТИЯ (только для крупных стран) ===
        if (cellCount > 30 && Math.random() < 0.05) {
            this.diplomacyStrategy(countryId, enemies);
        }
    }
    
    militaryStrategy(countryId, cells, units, unitCount, factories, enemies, mem) {
        // Выбираем самого слабого врага
        let targetEnemy = mem.target;
        if (!targetEnemy || !enemies.includes(targetEnemy)) {
            targetEnemy = this.getWeakestEnemy(countryId, enemies);
            mem.target = targetEnemy;
        }
        
        const borderCells = this.world.getBorderWith(countryId, targetEnemy);
        const myPower = this.calculatePower(countryId);
        const enemyPower = this.calculatePower(targetEnemy);
        
        // === АТАКА (если мы сильнее) ===
        if (myPower > enemyPower * 1.3 && borderCells.length > 0) {
            if (units.length > 0) {
                this.executeAttack(countryId, units, borderCells, targetEnemy);
            }
            // Нанимаем больше юнитов для атаки
            const neededUnits = Math.min(20, Math.floor(cellCount / 10));
            if (unitCount < neededUnits) {
                this.recruitUnit(countryId, cells, 'attack');
            }
        } 
        // === ОБОРОНА (если мы слабее) ===
        else if (myPower < enemyPower * 0.7) {
            mem.defensePhase = true;
            // Срочно нанимаем защитников
            const neededUnits = Math.min(30, Math.floor(cellCount / 8));
            if (unitCount < neededUnits) {
                this.recruitUnit(countryId, cells, 'defense');
            }
            // Ставим юниты на границу
            if (units.length > 0 && borderCells.length > 0) {
                this.defendBorders(countryId, units, borderCells);
            }
        }
        // === ПАТРУЛИРОВАНИЕ ===
        else {
            mem.defensePhase = false;
            if (units.length > 0 && borderCells.length > 0) {
                this.patrolBorders(countryId, units, borderCells);
            }
            // Поддерживаем армию
            const desiredUnits = Math.max(10, Math.floor(cellCount / 12));
            if (unitCount < desiredUnits) {
                this.recruitUnit(countryId, cells, 'balanced');
            }
        }
        
        // Строим заводы на границе для снабжения
        if (borderCells.length > 0 && factories < 5) {
            this.buildFactoryNearBorder(countryId, borderCells);
        }
    }
    
    expansionStrategy(countryId, cells, units, unitCount, factories, mem) {
        // Ищем нейтральные клетки рядом
        const neighbors = this.getBorderNeighbors(countryId, cells);
        
        // Если есть соседние нейтральные клетки - расширяемся
        if (neighbors.length > 0 && units.length > 0) {
            this.expandTerritory(countryId, units, neighbors);
            
            // Нанимаем юнитов для экспансии
            const desiredUnits = Math.max(5, Math.floor(cells.size / 15));
            if (unitCount < desiredUnits) {
                this.recruitUnit(countryId, cells, 'expansion');
            }
        }
        
        // Строим заводы в центре
        if (factories < Math.min(8, Math.floor(cells.size / 20))) {
            this.buildFactoryInCenter(countryId, cells);
        }
        
        // Если страна большая, ищем слабых соседей для войны
        if (cells.size > 40 && Math.random() < 0.03) {
            const weakNeighbor = this.findWeakNeighbor(countryId);
            if (weakNeighbor) {
                this.gameState.addWar(countryId, weakNeighbor);
                console.log(`🤖 ${countryId} объявил войну ${weakNeighbor}`);
            }
        }
    }
    
    diplomacyStrategy(countryId, enemies) {
        // Ищем союзников среди стран, у которых те же враги
        const allCountries = this.world.getAllCountries();
        const myEnemies = enemies;
        
        if (myEnemies.length === 0) return;
        
        for (const otherId of allCountries) {
            if (otherId === countryId) continue;
            if (this.gameState.areAllies(countryId, otherId)) continue;
            if (this.gameState.isAtWar(countryId, otherId)) continue;
            
            const otherEnemies = this.getEnemies(otherId);
            const commonEnemies = myEnemies.filter(e => otherEnemies.includes(e));
            
            // Если есть общие враги - предлагаем союз
            if (commonEnemies.length > 0 && Math.random() < 0.3) {
                this.gameState.addAlliance(countryId, otherId);
                console.log(`🤝 ${countryId} заключил союз с ${otherId} против ${commonEnemies[0]}`);
            }
        }
    }
    
    executeAttack(countryId, units, borderCells, targetEnemy) {
        // Находим самую слабую клетку врага для атаки
        let bestTarget = null;
        let weakestDefense = Infinity;
        
        for (const border of borderCells) {
            const [bx, by] = border.split(',').map(Number);
            // Смотрим на вражескую клетку за границей
            for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
                const enemyX = bx + dx;
                const enemyY = by + dy;
                if (this.world.getCell(enemyX, enemyY) === targetEnemy) {
                    // Проверяем есть ли там вражеский юнит
                    const enemyUnit = this.entities.getUnitAt(enemyX, enemyY);
                    const defense = enemyUnit ? 50 : 10;
                    if (defense < weakestDefense) {
                        weakestDefense = defense;
                        bestTarget = { x: enemyX, y: enemyY };
                    }
                }
            }
        }
        
        if (bestTarget && units.length > 0) {
            // Атакуем ближайшим юнитом
            let closestUnit = null;
            let closestDist = Infinity;
            
            for (const unitId of units) {
                const dist = Math.abs(this.entities.x[unitId] - bestTarget.x) + 
                           Math.abs(this.entities.y[unitId] - bestTarget.y);
                if (dist < closestDist) {
                    closestDist = dist;
                    closestUnit = unitId;
                }
            }
            
            if (closestUnit !== null && closestDist <= 3) {
                // Двигаем к цели
                const dx = Math.sign(bestTarget.x - this.entities.x[closestUnit]);
                const dy = Math.sign(bestTarget.y - this.entities.y[closestUnit]);
                const newX = this.entities.x[closestUnit] + dx;
                const newY = this.entities.y[closestUnit] + dy;
                
                if (this.world.getCell(newX, newY) !== 0) {
                    this.entities.moveTo(closestUnit, newX, newY);
                }
            }
        }
    }
    
    defendBorders(countryId, units, borderCells) {
        for (let i = 0; i < units.length && i < borderCells.length; i++) {
            const unitId = units[i];
            const border = borderCells[i % borderCells.length];
            const [bx, by] = border.split(',').map(Number);
            
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
    
    patrolBorders(countryId, units, borderCells) {
        // Двигаем юниты вдоль границы
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
    
    expandTerritory(countryId, units, neighbors) {
        // Двигаем юнит на нейтральную клетку
        for (const unitId of units) {
            const target = neighbors[0];
            const [tx, ty] = target.split(',').map(Number);
            
            const dist = Math.abs(this.entities.x[unitId] - tx) + 
                        Math.abs(this.entities.y[unitId] - ty);
            
            if (dist <= 2) {
                const dx = Math.sign(tx - this.entities.x[unitId]);
                const dy = Math.sign(ty - this.entities.y[unitId]);
                const newX = this.entities.x[unitId] + dx;
                const newY = this.entities.y[unitId] + dy;
                
                // Захватываем нейтральную клетку
                if (this.world.getCell(newX, newY) === 0) {
                    this.world.setCell(newX, newY, countryId);
                    this.entities.moveTo(unitId, newX, newY);
                    console.log(`🌍 ${countryId} захватил клетку (${newX},${newY})`);
                    break;
                }
            }
        }
    }
    
    recruitUnit(countryId, cells, purpose) {
        // Находим лучшую клетку для спавна
        let bestCell = null;
        let bestScore = -Infinity;
        
        for (const cell of cells) {
            const [x, y] = cell.split(',').map(Number);
            let score = 0;
            
            // Заводы дают бонус
            if (this.world.hasBuilding(x, y, 'factory')) {
                score += 100;
            }
            
            // Подальше от границы (для защиты)
            if (purpose === 'defense') {
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
            
            // Поближе к границе (для атаки)
            if (purpose === 'attack') {
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
                score += (50 - minEnemyDist) * 2;
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
            
            // Танки только если есть завод и технология
            const unitType = (hasFactory && tankTech && purpose === 'attack') ? 1 : 0;
            
            this.entities.createEntity(countryId, unitType, x, y);
        }
    }
    
    buildFactoryNearBorder(countryId, borderCells) {
        if (borderCells.length === 0) return;
        
        // Строим завод на границе
        const target = borderCells[Math.floor(Math.random() * borderCells.length)];
        const [x, y] = target.split(',').map(Number);
        
        if (!this.world.hasBuilding(x, y, 'factory')) {
            this.world.addBuilding(x, y, 'factory');
            console.log(`🏭 ${countryId} построил завод на границе (${x},${y})`);
        }
    }
    
    buildFactoryInCenter(countryId, cells) {
        // Находим центр страны
        let sumX = 0, sumY = 0;
        for (const cell of cells) {
            const [x, y] = cell.split(',').map(Number);
            sumX += x;
            sumY += y;
        }
        const centerX = Math.round(sumX / cells.size);
        const centerY = Math.round(sumY / cells.size);
        
        // Ищем ближайшую клетку к центру
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
    
    getBorderNeighbors(countryId, cells) {
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
        
        for (const otherId of allCountries) {
            if (otherId === countryId) continue;
            if (this.gameState.isAtWar(countryId, otherId)) continue;
            
            const power = this.calculatePower(otherId);
            if (power < weakestPower && power < this.calculatePower(countryId) * 0.5) {
                weakestPower = power;
                weakest = otherId;
            }
        }
        
        return weakest;
    }
    
    getWeakestEnemy(countryId, enemies) {
        let weakest = null;
        let weakestPower = Infinity;
        
        for (const enemyId of enemies) {
            const power = this.calculatePower(enemyId);
            if (power < weakestPower) {
                weakestPower = power;
                weakest = enemyId;
            }
        }
        return weakest || enemies[0];
    }
    
    calculatePower(countryId) {
        const cells = this.world.getCountryCells(countryId).size;
        const units = this.entities.getEntitiesByOwner(countryId).length;
        const factories = this.countFactories(countryId);
        return cells + units * 8 + factories * 15;
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
