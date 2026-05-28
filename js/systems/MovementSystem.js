// MovementSystem.js — Система движения юнитов

import { addNotification } from '../utils/helpers.js';

export class MovementSystem {
    constructor(world, entities) {
        this.world = world;
        this.entities = entities;
        this.moveSpeed = 0.5;
    }
    
    giveOrder(unitId, targetX, targetY) {
        const unit = this.entities;
        if (!unit.active[unitId]) return false;
        if (unit.inCombat[unitId]) {
            addNotification('Юнит в бою и не может двигаться!', 'war');
            return false;
        }
        
        // Простое движение к цели
        const dx = Math.sign(targetX - unit.x[unitId]);
        const dy = Math.sign(targetY - unit.y[unitId]);
        
        let newX = unit.x[unitId];
        let newY = unit.y[unitId];
        
        if (dx !== 0) newX += dx;
        else if (dy !== 0) newY += dy;
        
        // Проверяем, что клетка существует
        if (this.world.getCell(newX, newY) === 0) {
            addNotification('Нельзя ходить по воде!', 'war');
            return false;
        }
        
        unit.moveTo(unitId, newX, newY);
        return true;
    }
    
    update() {
        // Движение уже обрабатывается в updatePositions
    }
    
    updatePositions() {
        // Плавное движение (пока заглушка)
    }
}
