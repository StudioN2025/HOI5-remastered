// MovementSystem.js — Движение с A*, очередями и ПЛАВНОЙ ИНТЕРПОЛЯЦИЕЙ

import { addNotification } from '../utils/helpers.js';

export class MovementSystem {
    constructor(world, entities) {
        this.world = world;
        this.entities = entities;
        
        // Пути и приказы
        this.orders = new Map(); // unitId → { path, targetX, targetY, totalSteps }
        
        // Плавное движение
        this.animations = new Map(); // unitId → { fromX, fromY, toX, toY, progress, duration }
        this.ANIMATION_DURATION = 300; // миллисекунд на одну клетку
        
        // Шагаем раз в N дней
        this.MOVE_EVERY = 1;
        this.STEPS_PER_DAY = 2;
        this.dayCounter = 0;
        
        // Последнее время для анимации
        this.lastTimestamp = 0;
    }
    
    // Выдать приказ на движение
    giveOrder(unitId, targetX, targetY) {
        const e = this.entities;
        if (!e.active[unitId]) return false;
        if (e.inCombat[unitId]) {
            addNotification('Юнит в бою!', 'war');
            return false;
        }
        
        // Если юнит уже в анимации, отменяем её
        if (this.animations.has(unitId)) {
            this.animations.delete(unitId);
        }
        
        const sx = e.x[unitId], sy = e.y[unitId];
        if (sx === targetX && sy === targetY) return false;
        
        const path = this._findPath(sx, sy, targetX, targetY, e.owner[unitId]);
        if (!path || path.length === 0) {
            addNotification('Путь не найден!', 'war');
            return false;
        }
        
        this.orders.set(unitId, { 
            path, 
            targetX, 
            targetY,
            totalSteps: path.length
        });
        
        addNotification(`Приказ выдан — ${path.length} шагов`, 'info');
        return true;
    }
    
    // Получить прогресс для рендера
    getOrderProgress(unitId) {
        return this.orders.has(unitId) ? this.orders.get(unitId) : null;
    }
    
    hasOrder(unitId) { 
        return this.orders.has(unitId) || this.animations.has(unitId);
    }
    
    cancelOrder(unitId) { 
        this.orders.delete(unitId);
        this.animations.delete(unitId);
    }
    
    // Обновление позиций (вызывается каждый кадр для плавности)
    updateAnimations(currentTime) {
        if (!this.lastTimestamp) {
            this.lastTimestamp = currentTime;
            return;
        }
        
        let delta = Math.min(50, currentTime - this.lastTimestamp);
        this.lastTimestamp = currentTime;
        
        const toRemove = [];
        
        for (const [unitId, anim] of this.animations) {
            if (!this.entities.active[unitId]) {
                toRemove.push(unitId);
                continue;
            }
            
            // Обновляем прогресс
            anim.progress += delta / anim.duration;
            
            if (anim.progress >= 1) {
                // Анимация завершена
                this.entities.x[unitId] = anim.toX;
                this.entities.y[unitId] = anim.toY;
                toRemove.push(unitId);
                
                // Проверяем, есть ли ещё шаги в пути
                const order = this.orders.get(unitId);
                if (order && order.path.length > 0) {
                    // Запускаем следующую анимацию
                    this._startNextAnimation(unitId, order);
                }
            }
        }
        
        // Удаляем завершённые анимации
        for (const unitId of toRemove) {
            this.animations.delete(unitId);
        }
    }
    
    // Запуск следующей анимации для юнита
    _startNextAnimation(unitId, order) {
        if (!order.path.length) {
            this.orders.delete(unitId);
            return;
        }
        
        const next = order.path[0];
        const [nx, ny] = next.split(',').map(Number);
        const currentX = this.entities.x[unitId];
        const currentY = this.entities.y[unitId];
        
        // Проверяем, не занята ли клетка
        const occupant = this.entities.getUnitAt(nx, ny);
        if (occupant && occupant !== unitId) {
            // Клетка занята, пробуем следующий шаг
            if (order.path.length > 1) {
                const [nx2, ny2] = order.path[1].split(',').map(Number);
                if (!this.entities.getUnitAt(nx2, ny2)) {
                    order.path.shift();
                    this._startNextAnimation(unitId, order);
                    return;
                }
            }
            // Путь заблокирован
            this.orders.delete(unitId);
            return;
        }
        
        // Проверяем, не вода ли
        if (this.world.getCell(nx, ny) === 0) {
            this.orders.delete(unitId);
            addNotification('Путь заблокирован водой!', 'war');
            return;
        }
        
        // Запускаем анимацию
        this.animations.set(unitId, {
            fromX: currentX,
            fromY: currentY,
            toX: nx,
            toY: ny,
            progress: 0,
            duration: this.ANIMATION_DURATION
        });
        
        // Удаляем использованный шаг из пути
        order.path.shift();
        
        // Обновляем позицию в индексном словаре (но не в самом юните, пока анимация не завершится)
        // Временно обновляем индекс, чтобы другие юниты знали, что клетка занята
        this.entities.positionIndex.delete(`${currentX},${currentY}`);
        this.entities.positionIndex.set(`${nx},${ny}`, unitId);
    }
    
    // Получить интерполированную позицию юнита для рендера
    getInterpolatedPosition(unitId) {
        const anim = this.animations.get(unitId);
        if (!anim) {
            return {
                x: this.entities.x[unitId],
                y: this.entities.y[unitId],
                isMoving: false
            };
        }
        
        const t = Math.min(1, anim.progress);
        // Используем плавную кривую easeOutCubic для более приятной анимации
        const easeOut = 1 - Math.pow(1 - t, 3);
        
        return {
            x: anim.fromX + (anim.toX - anim.fromX) * easeOut,
            y: anim.fromY + (anim.toY - anim.fromY) * easeOut,
            isMoving: true,
            progress: t
        };
    }
    
    // Обновление логики движения (вызывается раз в день)
    update() {
        this.dayCounter++;
        if (this.dayCounter < this.MOVE_EVERY) return;
        this.dayCounter = 0;
        this.updatePositions();
    }
    
    updatePositions() {
        for (const [unitId, order] of this.orders) {
            const e = this.entities;
            if (!e.active[unitId]) {
                this.orders.delete(unitId);
                continue;
            }
            if (e.inCombat[unitId]) continue;
            
            // Если юнит уже анимируется, не начинаем новое движение
            if (this.animations.has(unitId)) continue;
            
            if (!order.path.length) {
                this.orders.delete(unitId);
                continue;
            }
            
            // Запускаем анимацию для следующего шага
            this._startNextAnimation(unitId, order);
        }
    }
    
    // A* по суше
    _findPath(sx, sy, ex, ey, ownerId) {
        const MAX = 300;
        const h = (x, y) => Math.abs(x - ex) + Math.abs(y - ey);
        const open = [{ x: sx, y: sy, g: 0, f: h(sx, sy) }];
        const cameFrom = new Map();
        const best = new Map();
        best.set(`${sx},${sy}`, 0);
        let steps = 0;
        
        while (open.length && steps++ < MAX) {
            let mi = 0;
            for (let i = 1; i < open.length; i++) {
                if (open[i].f < open[mi].f) mi = i;
            }
            const cur = open.splice(mi, 1)[0];
            const ck = `${cur.x},${cur.y}`;
            
            if (cur.x === ex && cur.y === ey) {
                const path = [];
                let node = ck;
                while (cameFrom.has(node)) {
                    path.unshift(node);
                    node = cameFrom.get(node);
                }
                return path;
            }
            
            for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
                const nx = cur.x + dx, ny = cur.y + dy;
                const nk = `${nx},${ny}`;
                const cell = this.world.getCell(nx, ny);
                if (cell === 0) continue;
                const ng = cur.g + 1;
                if (!best.has(nk) || ng < best.get(nk)) {
                    best.set(nk, ng);
                    cameFrom.set(nk, ck);
                    open.push({ x: nx, y: ny, g: ng, f: ng + h(nx, ny) });
                }
            }
        }
        return null;
    }
}
