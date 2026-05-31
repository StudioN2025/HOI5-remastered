// MovementSystem.js — Движение с A* и очередями

import { addNotification } from '../utils/helpers.js';

export class MovementSystem {
    constructor(world, entities) {
        this.world    = world;
        this.entities = entities;
        // unitId → { path: ['x,y',...], targetX, targetY }
        this.orders   = new Map();
        // Шагаем раз в N дней (скорость движения)
        this.MOVE_EVERY = 1; // каждый день
        this.STEPS_PER_DAY = 2; // 2 клетки за раз
        this.dayCounter = 0;
    }

    // Выдать приказ на движение (вызывается из main.js по ЛКМ)
    giveOrder(unitId, targetX, targetY) {
        const e = this.entities;
        if (!e.active[unitId]) return false;
        if (e.inCombat[unitId]) {
            addNotification('Юнит в бою!', 'war');
            return false;
        }

        const sx = e.x[unitId], sy = e.y[unitId];
        if (sx === targetX && sy === targetY) return false;

        const path = this._findPath(sx, sy, targetX, targetY, e.owner[unitId]);
        if (!path || path.length === 0) {
            addNotification('Путь не найден!', 'war');
            return false;
        }

        this.orders.set(unitId, { path, targetX, targetY });
        addNotification(`Приказ выдан — ${path.length} шагов`, 'info');
        return true;
    }

    // Получить прогресс пути для рендера (% пройдено)
    getOrderProgress(unitId) {
        return this.orders.has(unitId) ? this.orders.get(unitId) : null;
    }

    hasOrder(unitId) { return this.orders.has(unitId); }

    cancelOrder(unitId) { this.orders.delete(unitId); }

    // Вызывается раз в игровой день из main.js
    update() {
        this.dayCounter++;
        if (this.dayCounter < this.MOVE_EVERY) return;
        this.dayCounter = 0;
        this.updatePositions();
    }

    updatePositions() {
        for (const [unitId, order] of this.orders) {
            const e = this.entities;
            if (!e.active[unitId]) { this.orders.delete(unitId); continue; }
            if (e.inCombat[unitId]) continue;
            if (!order.path.length) { this.orders.delete(unitId); continue; }

            for (let step = 0; step < this.STEPS_PER_DAY; step++) {
                if (!order.path.length) { this.orders.delete(unitId); break; }

                const next = order.path[0];
                const [nx, ny] = next.split(',').map(Number);

                const occupant = this.entities.getUnitAt(nx, ny);
                if (occupant && occupant !== unitId) {
                    if (order.path.length > 1) {
                        const [nx2, ny2] = order.path[1].split(',').map(Number);
                        if (!this.entities.getUnitAt(nx2, ny2) && this.world.getCell(nx2, ny2) !== 0) {
                            order.path.shift();
                            e.moveTo(unitId, nx2, ny2);
                            order.path.shift();
                        }
                    }
                    break;
                }

                if (this.world.getCell(nx, ny) === 0) {
                    this.orders.delete(unitId);
                    addNotification('Путь заблокирован водой!', 'war');
                    break;
                }

                e.moveTo(unitId, nx, ny);
                order.path.shift();
            }
        }
    }

    // A* по суше (обходит воду)
    _findPath(sx, sy, ex, ey, ownerId) {
        const MAX = 300;
        const h = (x, y) => Math.abs(x - ex) + Math.abs(y - ey);
        // Минимальная куча через массив
        const open = [{ x: sx, y: sy, g: 0, f: h(sx, sy) }];
        const cameFrom = new Map();
        const best = new Map();
        best.set(`${sx},${sy}`, 0);
        let steps = 0;

        while (open.length && steps++ < MAX) {
            // pop min-f
            let mi = 0;
            for (let i = 1; i < open.length; i++) if (open[i].f < open[mi].f) mi = i;
            const cur = open.splice(mi, 1)[0];
            const ck  = `${cur.x},${cur.y}`;

            if (cur.x === ex && cur.y === ey) {
                const path = [];
                let node = ck;
                while (cameFrom.has(node)) { path.unshift(node); node = cameFrom.get(node); }
                return path;
            }

            for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
                const nx = cur.x + dx, ny = cur.y + dy;
                const nk = `${nx},${ny}`;
                const cell = this.world.getCell(nx, ny);
                if (cell === 0) continue; // вода
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
