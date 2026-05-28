// AIController.js — РЕАЛЬНО УМНЫЙ ИИ

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
        
        // Сортируем страны по силе (сильные обрабатываем первыми)
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
                strategy: 'balanced', // balanced, aggressive, defensive, expansion
                warExhaustion: 0,
                expansionTargets: []
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
        
        // Дипломатия (раз в 10 дней)
        if (this.gameState.days % 10 === 0 && cellCount > 20) {
            this.diplomacyStrategy(countryId, enemies);
        }
        
        // Технологии (раз в 20 дней)
        if (this.gameState.days % 20 === 0 && this.gameState.tech) {
            this.researchStrategy(countryId, factories, unitCount);
        }
    }
    
    analyzeAndSetStrategy(countryId, cells, unitCount, factories, enemies, mem) {
        const cellCount = cells.size;
        const power = this.calculatePower(countryId);
        
        // Если есть враги
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
            
            // Если мы сильнее сильнейшего врага в 2+ раза — агрессия
            if (power > strongestPower * 2) {
                mem.strategy = 'aggressive';
                mem.target = strongestEnemy;
            }
            // Если мы слабее сильнейшего врага — оборона
            else if (power < strongestPower * 0.7) {
                mem.strategy = 'defensive';
                mem.target = strongestEnemy;
            }
            // Иначе атакуем самого слабого
            else {
                mem.strategy = 'aggressive';
                mem.target = weakestEnemy;
            }
        } 
        // Нет врагов — экспансия
        else {
            mem.strategy = 'expansion';
        }
        
        // Корректировка по размеру страны
        if (cellCount > 100) {
            mem.strategy = 'aggressive'; // Большие страны агрессивны
        } else if (cellCount < 15) {
            mem.strategy = 'expansion'; // Маленькие расширяются
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
        
        // 1. ВОЕННОЕ ПРОИЗВОДСТВО
        const desiredUnits = Math.min(40, Math.max(10, Math.floor(cells.size / 6)));
        if (unitCount < desiredUnits) {
            const needed = desiredUnits - unitCount;
            const maxRecruit = Math.min(3, needed);
            for (let i = 0; i < maxRecruit; i++) {
                this.recruitUnit(countryId, cells, 'frontline', mem.target);
            }
        }
        
        // 2. АТАКА
        if (borderCells.length > 0 && units.length > 0) {
            // Находим слабое место в обороне врага
            const weakSpot = this.findWeakSpot(countryId, mem.target, borderCells);
            if (weakSpot) {
                this.launchAttack(countryId, units, weakSpot, mem.target);
            }
        }
        
        // 3. СТРОИТЕЛЬСТВО ЗАВОДОВ (на границе)
        if (borderCells.length > 0 && factories < 8) {
            this.buildFactoryOnBorder(countryId, borderCells);
        }
        
        // 4. ОКРУЖЕНИЕ (если сил много)
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
        
        // 1. СРОЧНЫЙ НАЙМ
        const desperateUnits = Math.min(50, Math.max(15, Math.floor(cells.size / 5)));
        if (unitCount < desperateUnits || myPower < enemyPower * 0.8) {
            const maxRecruit = Math.min(4, desperateUnits - unitCount);
            for (let i = 0; i < maxRecruit; i++) {
                this.recruitUnit(countryId, cells, 'defense', mem.target);
            }
        }
        
        // 2. ОБОРОНА ГРАНИЦЫ
        if (borderCells.length > 0 && units.length > 0) {
            this.defendCriticalPoints(countryId, units, borderCells, mem.target);
        }
        
        // 3. СТРОИТЕЛЬСТВО ЗАВОДОВ (в глубине)
        if (factories < 5) {
            this.buildFactoryDeep(countryId, cells, borderCells);
        }
        
        // 4. КОНТРАТАКА (если появилась возможность)
        if (myPower > enemyPower * 1.2 && this.gameState.days - mem.lastAttackDay > 15) {
            mem.strategy = 'aggressive';
            mem.lastAttackDay = this.gameState.days;
        }
    }
    
    expansionStrategy(countryId, cells, units, unitCount, factories, mem) {
        // 1. НАХОДИМ НЕЙТРАЛЬНЫЕ КЛЕТКИ
        const neutralNeighbors = this.getNeutralNeighbors(countryId, cells);
        
        if (neutralNeighbors.length > 0) {
            // Расширяемся на нейтральные территории
            if (units.length > 0) {
                this.expandToNeutral(countryId, units, neutralNeighbors);
            }
            
            // Нанимаем больше юнитов для экспансии
            const desiredUnits = Math.min(25, Math.max(5, Math.floor(cells.size / 10)));
            if (unitCount < desiredUnits) {
                this.recruitUnit(countryId, cells, 'expansion');
            }
        }
        
        // 2. СТРОИТЕЛЬСТВО ЗАВОДОВ
        const targetFactories = Math.min(6, Math.max(1, Math.floor(cells.size / 15)));
        if (factories < targetFactories) {
            this.buildFactoryInCenter(countryId, cells);
        }
        
        // 3. ПОИСК СЛАБЫХ СОСЕДЕЙ ДЛЯ ВОЙНЫ
        if (cells.size > 20 && Math.random() < 0.05) {
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
        // Сбалансированная стратегия между обороной и экспансией
        
        // 1. ПОДДЕРЖАНИЕ АРМИИ
        const idealUnits = Math.min(30, Math.max(8, Math.floor(cells.size / 10)));
        if (unitCount < idealUnits) {
            this.recruitUnit(countryId, cells, 'balanced');
        }
        
        // 2. ЗАЩИТА ГРАНИЦЫ (если есть враги)
        if (enemies.length > 0) {
            const borderCells = this.world.getBorderWith(countryId, enemies[0]);
            if (borderCells.length > 0 && units.length > 0) {
                this.patrolBorders(countryId, units, borderCells);
            }
        }
        
        // 3. РАСШИРЕНИЕ (если есть свободные клетки)
        const neutralNeighbors = this.getNeutralNeighbors(countryId, cells);
        if (neutralNeighbors.length > 0 && units.length > 3) {
            this.expandToNeutral(countryId, units, neutralNeighbors);
        }
        
        // 4. СТРОИТЕЛЬСТВО
        const targetFactories = Math.min(5, Math.max(1, Math.floor(cells.size / 20)));
        if (factories < targetFactories) {
            this.buildFactoryInCenter(countryId, cells);
        }
    }
    
    findWeakSpot(countryId, targetEnemy, borderCells) {
        let bestSpot = null;
        let lowestDefense = Infinity;
        
        for (const border of borderCells) {
            const [bx, by] = border.split(',').map(Number);
            
            // Проверяем вражеские клетки за границей
            for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
                const ex = bx + dx;
                const ey = by + dy;
                
                if (this.world.getCell(ex, ey) === targetEnemy) {
                    // Есть ли вражеский юнит?
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
        // Находим ближайший юнит к месту атаки
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
                // Атакуем (просто стоим на месте, бой начнётся автоматически)
                if (this.entities.inCombat[closestUnit] === 0) {
                    // Двигаем на вражескую клетку
                    this.entities.moveTo(closestUnit, weakSpot.x, weakSpot.y);
                }
            } else {
                // Двигаемся к цели
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
        // Находим самые уязвимые точки границы
        const vulnerablePoints = [];
        
        for (const border of borderCells) {
            const [bx, by] = border.split(',').map(Number);
            const nearbyEnemies = this.countNearbyEnemies(bx, by, targetEnemy);
            if (nearbyEnemies > 0) {
                vulnerablePoints.push({ pos: border, threat: nearbyEnemies });
            }
        }
        
        vulnerablePoints.sort((a, b) => b.threat - a.threat);
        
        // Ставим юниты на самые опасные точки
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
        // Пытаемся окружить врага, если сил много
        if (units.length < 6 || borderCells.length < 4) return;
        
        // Выбираем два фланга
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
        
        // Двигаем фланги в обход
        if (leftUnit && rightUnit) {
            const [lx, ly] = leftFlank.split(',').map(Number);
            const [rx, ry] = rightFlank.split(',').map(Number);
            
            // Обход слева
            const leftTarget = `${lx - 1},${ly}`;
            if (this.world.getCell(lx - 1, ly) === targetEnemy) {
                this.entities.moveTo(leftUnit, lx - 1, ly);
            }
            
            // Обход справа
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
        // Находим лучшую клетку для спавна в зависимости от роли
        let bestCell = null;
        let bestScore = -Infinity;
        
        for (const cell of cells) {
            const [x, y] = cell.split(',').map(Number);
            let score = 0;
            
            // Заводы дают бонус
            if (this.world.hasBuilding(x, y, 'factory')) {
                score += 50;
            }
            
            if (role === 'frontline' && targetEnemy) {
                // Ближе к врагу
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
                // Подальше от врага
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
                // Ближе к нейтральным клеткам
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
            
            // Танки только в атаке и при наличии технологий
            const useTank = (role === 'frontline' && hasFactory && tankTech && atWar);
            const unitType = useTank ? 1 : 0;
            
            this.entities.createEntity(countryId, unitType, x, y);
        }
    }
    
    buildFactoryOnBorder(countryId, borderCells) {
        if (borderCells.length === 0) return;
        
        // Выбираем граничную клетку без завода
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
        // Строим в глубине страны, подальше от границы
        let bestCell = null;
        let maxDist = -Infinity;
        
        const borderSet = new Set(borderCells);
        
        for (const cell of cells) {
            if (this.world.hasBuilding(cell.split(',')[0], cell.split(',')[1], 'factory')) continue;
            if (borderSet.has(cell)) continue; // не на границе
            
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
        // Находим центр масс
        let sumX = 0, sumY = 0;
        for (const cell of cells) {
            const [x, y] = cell.split(',').map(Number);
            sumX += x;
            sumY += y;
        }
        const centerX = Math.round(sumX / cells.size);
        const centerY = Math.round(sumY / cells.size);
        
        // Ищем ближайшую к центру клетку без завода
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
    
    diplomacyStrategy(countryId, enemies) {
        const allCountries = this.world.getAllCountries();
        const myPower = this.calculatePower(countryId);
        
        // Ищем союзников
        for (const otherId of allCountries) {
            if (otherId === countryId) continue;
            if (this.gameState.areAllies(countryId, otherId)) continue;
            if (this.gameState.isAtWar(countryId, otherId)) continue;
            
            const otherPower = this.calculatePower(otherId);
            const otherEnemies = this.getEnemies(otherId);
            
            // Общие враги?
            const commonEnemies = enemies.filter(e => otherEnemies.includes(e));
            
            // Предлагаем союз если есть общие враги или мы оба слабы против сильного врага
            if (commonEnemies.length > 0) {
                if (Math.random() < 0.4) {
                    this.gameState.addAlliance(countryId, otherId);
                    console.log(`🤝 ${countryId} заключил союз с ${otherId} против ${commonEnemies[0]}`);
                }
            }
            else if (enemies.length > 0 && otherEnemies.length === 0 && otherPower > myPower * 0.7) {
                // Просим помощи у нейтральной сильной страны
                if (Math.random() < 0.3) {
                    this.gameState.addAlliance(countryId, otherId);
                    console.log(`🤝 ${countryId} заключил оборонительный союз с ${otherId}`);
                }
            }
        }
    }
    
    researchStrategy(countryId, factories, unitCount) {
        // Приоритеты технологий в зависимости от ситуации
        const currentTech = this.gameState.tech;
        const atWar = this.getEnemies(countryId).length > 0;
        
        if (atWar) {
            // Война — приоритет военным технологиям
            if (currentTech.tank < 3 && factories > 2) {
                this.startResearch('tank', currentTech.tank + 1);
            } 
            else if (currentTech.infantry < 4) {
                this.startResearch('infantry', currentTech.infantry + 1);
            }
        } 
        else {
            // Мир — приоритет экономике
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
            // Сосед ли?
            const borderCells = this.world.getBorderWith(countryId, otherId);
            
            if (borderCells.length > 0 && otherPower < weakestPower && otherPower < myPower * 0.6) {
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
