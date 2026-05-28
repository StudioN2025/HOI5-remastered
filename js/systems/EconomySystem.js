// EconomySystem.js — Экономическая система

export class EconomySystem {
    constructor(world, entities, gameState) {
        this.world = world;
        this.entities = entities;
        this.gameState = gameState;
    }
    
    update() {
        const myId = this.gameState.myCountryId;
        if (!myId) return;
        
        // Считаем заводы
        let totalFactories = 0;
        const cells = this.world.getCountryCells(myId);
        
        for (const cell of cells) {
            const [x, y] = cell.split(',').map(Number);
            if (this.world.hasBuilding(x, y, 'factory')) {
                totalFactories++;
            }
        }
        
        this.gameState.factories = totalFactories;
        
        // Производство
        const techBonus = 1 + (this.gameState.tech.industry - 1) * 0.05;
        const production = totalFactories * 1.5 * techBonus;
        
        // Обслуживание
        let maintenance = 0;
        const myUnits = this.entities.getEntitiesByOwner(myId);
        
        for (const unitId of myUnits) {
            if (this.entities.training[unitId] === 0) {
                maintenance += this.entities.type[unitId] === 0 ? 0.2 : 1.5;
            }
        }
        
        // Обновляем ресурсы
        this.gameState.equipment = Math.max(0, this.gameState.equipment + production - maintenance);
    }
}
