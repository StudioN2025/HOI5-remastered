// MovementSystem.js — Система движения юнитов

import { AStarFinder } from '../core/AStar.js';

export class MovementSystem {
    constructor(world, entities) {
        this.world = world;
        this.entities = entities;
        this.pathFinder = new AStarFinder(world);
        this.moveSpeed = 0.5; // клеток в день
    }
    
    giveOrder(unitId, targetX, targetY) {
        const unit = this.entities;
        if (!unit.active[unitId]) return false;
        if (unit.inCombat[unitId]) return false;
        
        const path = this.pathFinder.findPath(
            unit.x[unitId], unit.y[unitId],
            targetX, targetY,
            unit.owner[unitId]
        );
        
        if (path && path.length > 0) {
            unit.setPath(unitId, path);
            return true;
        }
        
        return false;
    }
    
    update() {
        // Обновляем позиции юнитов
        for (let i = 1; i < this.entities.nextId; i++) {
            if (!this.entities.active[i]) continue;
            if (this.entities.inCombat[i]) continue;
            if (this.entities.training[i] > 0) continue;
            
            const path = this.entities.getPath(i);
            if (path.length === 0) continue;
            
            // Уменьшаем кулдаун
            if (this.entities.moveCooldown[i] > 0) {
                this.entities.moveCooldown[i]--;
                continue;
            }
            
            // Берём следующий шаг
            const nextStep = path[0];
            const [nx, ny] = nextStep.split(',').map(Number);
            
            // Проверяем, не занята ли клетка
            const unitThere = this.entities.getUnitAt(nx, ny);
            if (unitThere !== null && unitThere !== i) {
                // Клетка занята, очищаем путь
                this.entities.setPath(i, []);
                continue;
            }
            
            // Двигаем юнит
            this.entities.moveTo(i, nx, ny);
            
            // Удаляем использованный шаг
            path.shift();
            this.entities.setPath(i, path);
            
            // Устанавливаем кулдаун
            this.entities.moveCooldown[i] = Math.floor(1 / this.moveSpeed);
        }
    }
    
    updatePositions() {
        // Для плавного движения (интерполяция)
        // В текущей реализации просто обновляем позиции
    }
}
