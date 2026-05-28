// AIController.js — Управление Web Worker для ИИ

export class AIController {
    constructor(world, entities, gameState) {
        this.world = world;
        this.entities = entities;
        this.gameState = gameState;
        this.worker = null;
        this.tickCounter = 0;
        this.TICK_INTERVAL = 2; // Раз в 2 дня
    }
    
    async init() {
        // Создаём воркер
        this.worker = new Worker('js/ai/AIWorker.js');
        
        this.worker.onmessage = (e) => {
            this.handleAIOrders(e.data);
        };
    }
    
    update() {
        this.tickCounter++;
        if (this.tickCounter < this.TICK_INTERVAL) return;
        this.tickCounter = 0;
        
        // Отправляем данные в воркер для обработки
        const countries = this.world.getAllCountries();
        const myId = this.gameState.myCountryId;
        
        for (const countryId of countries) {
            if (countryId === myId) continue;
            
            const data = this.prepareAIData(countryId);
            this.worker.postMessage(data);
        }
    }
    
    prepareAIData(countryId) {
        const cells = this.world.getCountryCells(countryId);
        const borders = this.world.getBorderWith(countryId, this.getWeakestEnemy(countryId));
        
        return {
            countryId,
            cellCount: cells.size,
            factories: this.countFactories(countryId),
            militaryPower: this.entities.getEntitiesByOwner(countryId).length,
            borders: Array.from(borders),
            enemies: this.getEnemies(countryId),
            tech: this.gameState.tech
        };
    }
    
    handleAIOrders(data) {
        const { countryId, orders } = data;
        
        for (const order of orders) {
            if (order.type === 'build_factory') {
                // Начать строительство завода
                this.startAIBuilding(countryId, 'factory', order.pos);
            } else if (order.type === 'recruit') {
                // Нанять юнита
                this.startAIRecruit(countryId, order.unitType, order.pos);
            } else if (order.type === 'move') {
                // Движение юнита
                const unitId = this.entities.getUnitAt(order.fromX, order.fromY);
                if (unitId && this.entities.owner[unitId] === countryId) {
                    import('../systems/MovementSystem.js').then(m => {
                        const movement = new m.MovementSystem(this.world, this.entities);
                        movement.giveOrder(unitId, order.toX, order.toY);
                    });
                }
            }
        }
    }
    
    startAIBuilding(countryId, type, pos) {
        // Логика начала стройки для ИИ
        const [x, y] = pos.split(',').map(Number);
        this.world.addBuilding(x, y, type);
    }
    
    startAIRecruit(countryId, unitType, pos) {
        const [x, y] = pos.split(',').map(Number);
        const typeNum = unitType === 'infantry' ? 0 : 1;
        this.entities.createEntity(countryId, typeNum, x, y);
    }
    
    countFactories(countryId) {
        let count = 0;
        const cells = this.world.getCountryCells(countryId);
        
        for (const cell of cells) {
            const [x, y] = cell.split(',').map(Number);
            if (this.world.hasBuilding(x, y, 'factory')) {
                count++;
            }
        }
        
        return count;
    }
    
    getEnemies(countryId) {
        const enemies = [];
        for (const war of this.gameState.wars) {
            if (war.a === countryId) enemies.push(war.b);
            if (war.b === countryId) enemies.push(war.a);
        }
        return enemies;
    }
    
    getWeakestEnemy(countryId) {
        const enemies = this.getEnemies(countryId);
        if (enemies.length === 0) return null;
        
        let weakest = null;
        let weakestPower = Infinity;
        
        for (const enemyId of enemies) {
            const power = this.world.getCountryCells(enemyId).size + 
                         this.entities.getEntitiesByOwner(enemyId).length * 5;
            if (power < weakestPower) {
                weakestPower = power;
                weakest = enemyId;
            }
        }
        
        return weakest;
    }
}
