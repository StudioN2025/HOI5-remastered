// EconomySystem.js — с очередями обучения и строительства

import { addNotification } from '../utils/helpers.js';

// Стоимость и время
export const UNIT_COSTS = {
    infantry: { equipment: 100, manpower: 1000, days: 30 },
    tank:     { equipment: 800, manpower: 500,  days: 60 },
};
export const BUILDING_COSTS = {
    factory: { equipment: 500, days: 90 },
    port:    { equipment: 300, days: 60 },
};

export class EconomySystem {
    constructor(world, entities, gameState) {
        this.world      = world;
        this.entities   = entities;
        this.gameState  = gameState;
    }

    update() {
        const myId = this.gameState.myCountryId;
        if (!myId) return;

        // Считаем готовые заводы (не в очереди)
        let totalFactories = 0;
        const cells = this.world.getCountryCells(myId);
        for (const cell of cells) {
            const [x, y] = cell.split(',').map(Number);
            if (this.world.hasBuilding(x, y, 'factory')) totalFactories++;
        }
        this.gameState.factories = totalFactories;

        // Производство снаряжения
        const techBonus  = 1 + (this.gameState.tech.industry - 1) * 0.05;
        const production = totalFactories * 1.5 * techBonus;

        // Обслуживание готовых юнитов
        let maintenance = 0;
        for (const uid of this.entities.getEntitiesByOwner(myId)) {
            if (this.entities.training[uid] === 0) {
                maintenance += this.entities.type[uid] === 0 ? 0.2 : 1.5;
            }
        }

        this.gameState.equipment = Math.max(0, this.gameState.equipment + production - maintenance);

        // ── Очередь обучения ──────────────────────────────────────────────
        const finishedTraining = [];
        for (const item of this.gameState.trainingQueue) {
            item.daysLeft--;
            if (item.daysLeft <= 0) finishedTraining.push(item);
        }
        this.gameState.trainingQueue = this.gameState.trainingQueue.filter(i => i.daysLeft > 0);

        for (const item of finishedTraining) {
            // Ищем свободную клетку рядом
            const spawnPos = this._findFreeCell(item.x, item.y, myId);
            if (!spawnPos) {
                addNotification('⚠️ Нет места для размещения юнита!', 'war');
                continue;
            }
            const typeNum = item.type === 'infantry' ? 0 : 1;
            this.entities.createEntity(myId, typeNum, spawnPos.x, spawnPos.y);
            addNotification(`✅ ${item.type === 'infantry' ? 'Пехота' : 'Танк'} готов в (${spawnPos.x}, ${spawnPos.y})!`, 'info');
        }

        // ── Очередь строительства ─────────────────────────────────────────
        const finishedBuildings = [];
        for (const item of this.gameState.constructionQueue) {
            item.daysLeft--;
            if (item.daysLeft <= 0) finishedBuildings.push(item);
        }
        this.gameState.constructionQueue = this.gameState.constructionQueue.filter(i => i.daysLeft > 0);

        for (const item of finishedBuildings) {
            this.world.addBuilding(item.x, item.y, item.buildingType);
            const name = item.buildingType === 'factory' ? 'Завод' : 'Порт';
            addNotification(`🏭 ${name} построен в (${item.x}, ${item.y})!`, 'info');
        }
    }

    // Добавить юнита в очередь обучения
    enqueueTraining(x, y, type) {
        const myId = this.gameState.myCountryId;
        const cost = UNIT_COSTS[type];
        if (!cost) return false;

        if (this.gameState.equipment < cost.equipment) {
            addNotification(`⚠️ Недостаточно снаряжения! Нужно ${cost.equipment}`, 'war');
            return false;
        }
        if (this.gameState.manpower < cost.manpower) {
            addNotification(`⚠️ Недостаточно манмощи! Нужно ${cost.manpower}`, 'war');
            return false;
        }
        if (this.world.getCell(x, y) !== myId) {
            addNotification('⚠️ Можно обучать только на своей территории!', 'war');
            return false;
        }

        this.gameState.equipment -= cost.equipment;
        this.gameState.manpower  -= cost.manpower;
        this.gameState.trainingQueue.push({ x, y, type, daysLeft: cost.days, totalDays: cost.days });

        const name = type === 'infantry' ? 'Пехота' : 'Танки';
        addNotification(`🪖 ${name} в обучении — ${cost.days} дней`, 'info');
        return true;
    }

    // Добавить здание в очередь строительства
    enqueueBuilding(x, y, buildingType) {
        const myId = this.gameState.myCountryId;
        const cost = BUILDING_COSTS[buildingType];
        if (!cost) return false;

        if (this.world.getCell(x, y) !== myId) {
            addNotification('⚠️ Можно строить только на своей территории!', 'war');
            return false;
        }
        if (this.world.hasBuilding(x, y, buildingType)) {
            addNotification('⚠️ Здесь уже есть такое здание!', 'war');
            return false;
        }
        // Проверим — нет ли уже в очереди на эту клетку
        const alreadyQueued = this.gameState.constructionQueue.some(
            q => q.x === x && q.y === y && q.buildingType === buildingType
        );
        if (alreadyQueued) {
            addNotification('⚠️ Строительство уже в очереди!', 'war');
            return false;
        }
        if (this.gameState.equipment < cost.equipment) {
            addNotification(`⚠️ Недостаточно снаряжения! Нужно ${cost.equipment}`, 'war');
            return false;
        }

        this.gameState.equipment -= cost.equipment;
        this.gameState.constructionQueue.push({ x, y, buildingType, daysLeft: cost.days, totalDays: cost.days });

        const name = buildingType === 'factory' ? 'Завод' : 'Порт';
        addNotification(`🏗️ ${name} строится — ${cost.days} дней`, 'info');
        return true;
    }

    _findFreeCell(cx, cy, ownerId) {
        // BFS от точки в поисках свободной клетки того же владельца
        const queue = [[cx, cy]];
        const visited = new Set([`${cx},${cy}`]);
        while (queue.length) {
            const [x, y] = queue.shift();
            if (this.world.getCell(x, y) === ownerId && !this.entities.getUnitAt(x, y)) {
                return { x, y };
            }
            for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
                const k = `${x+dx},${y+dy}`;
                if (!visited.has(k) && this.world.getCell(x+dx, y+dy) === ownerId) {
                    visited.add(k);
                    queue.push([x+dx, y+dy]);
                }
            }
            if (visited.size > 200) break;
        }
        return null;
    }
}
