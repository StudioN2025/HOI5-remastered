// AIController.js — Управление ИИ (боты)

export class AIController {
    constructor(world, entities, gameState) {
        this.world = world;
        this.entities = entities;
        this.gameState = gameState;
        this.worker = null;
        this.tickCounter = 0;
        this.TICK_INTERVAL = 3; // Раз в 3 дня
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
        
        // Обрабатываем не больше 3 стран за тик для производительности
        let processed = 0;
        for (const countryId of countries) {
            if (countryId === myId) continue;
            if (processed >= 3) break;
            
            this.processCountry(countryId);
            processed++;
        }
    }
    
    processCountry(countryId) {
        const cells = this.world.getCountryCells(countryId);
        const cellCount = cells.size;
        if (cellCount === 0) return;
        
        const units = this.entities.getEntitiesByOwner(countryId);
        const unitCount = units.length;
        const factories = this.countFactories(countryId);
        const enemies = this.getEnemies(countryId);
        
        // 1. Нанять юнитов если мало
        const maxUnits = Math.max(3, Math.floor(cellCount * 0.05));
        if (unitCount < maxUnits) {
            this.recruitUnit(countryId);
        }
        
        // 2. Атаковать врага
        if (enemies.length > 0) {
            const targetEnemy = enemies[0];
            const borderCells = this.world.getBorderWith(countryId, targetEnemy);
            
            if (borderCells.length > 0 && units.length > 0) {
                // Находим ближайший к границе юнит
                let closestUnit = null;
                let closestDist = Infinity;
                
                for (const unitId of units) {
                    const ux = this.entities.x[unitId];
                    const uy = this.entities.y[unitId];
                    
                    for (const border of borderCells) {
                        const [bx, by] = border.split(',').map(Number);
                        const dist = Math.abs(ux - bx) + Math.abs(uy - by);
                        if (dist < closestDist) {
                            closestDist = dist;
                            closestUnit = unitId;
                        }
                    }
                }
                
                if (closestUnit !== null && closestDist <= 5) {
                    // Двигаем юнит к границе
                    const targetBorder = borderCells[0];
                    const [tx, ty] = targetBorder.split(',').map(Number);
                    this.moveUnit(closestUnit, tx, ty);
                }
            }
        }
        
        // 3. Строить заводы если мало
        const targetFactories = Math.max(1, Math.floor(cellCount / 30));
        if (factories < targetFactories) {
            this.buildFactory(countryId);
        }
    }
    
    recruitUnit(countryId) {
        const cells = Array.from(this.world.getCountryCells(countryId));
        if (cells.length === 0) return;
        
        // Выбираем случайную клетку для спавна
        const randomCell = cells[Math.floor(Math.random() * cells.length)];
        const [x, y] = randomCell.split(',').map(Number);
        
        // Тип юнита: танк если есть технология и заводы
        const hasFactory = this.world.hasBuilding(x, y, 'factory');
        const tankTech = this.gameState.tech && this.gameState.tech.tank > 1;
        const unitType = (hasFactory && tankTech && Math.random() > 0.7) ? 1 : 0;
        
        const unitId = this.entities.createEntity(countryId, unitType, x, y);
        console.log(`🤖 AI: ${countryId} нанял ${unitType === 0 ? 'пехоту' : 'танк'} в (${x},${y})`);
    }
    
    moveUnit(unitId, targetX, targetY) {
        if (this.entities.inCombat[unitId]) return;
        
        // Простое движение: идём к цели по прямой
        const ux = this.entities.x[unitId];
        const uy = this.entities.y[unitId];
        
        const dx = Math.sign(targetX - ux);
        const dy = Math.sign(targetY - uy);
        
        let newX = ux;
        let newY = uy;
        
        if (dx !== 0) newX += dx;
        else if (dy !== 0) newY += dy;
        
        // Проверяем, что клетка принадлежит стране или врагу
        const cellOwner = this.world.getCell(newX, newY);
        if (cellOwner === this.entities.owner[unitId] || 
            (cellOwner !== 0 && this.gameState.isAtWar && this.gameState.isAtWar(this.entities.owner[unitId], cellOwner))) {
            this.entities.moveTo(unitId, newX, newY);
        }
    }
    
    buildFactory(countryId) {
        const cells = Array.from(this.world.getCountryCells(countryId));
        if (cells.length === 0) return;
        
        // Ищем клетку без завода
        for (const cell of cells) {
            const [x, y] = cell.split(',').map(Number);
            if (!this.world.hasBuilding(x, y, 'factory')) {
                this.world.addBuilding(x, y, 'factory');
                console.log(`🤖 AI: ${countryId} построил завод в (${x},${y})`);
                break;
            }
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
