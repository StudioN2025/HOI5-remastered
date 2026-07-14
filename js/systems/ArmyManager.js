// ArmyManager.js — Система армий (как в HOI4)

import { addNotification } from '../utils/helpers.js';

const ARMY_COLORS = [
    '#ef4444', '#f97316', '#eab308', '#22c55e',
    '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4',
    '#f43f5e', '#14b8a6', '#a855f7', '#64748b',
];

export class ArmyManager {
    constructor(entities, gameState, world) {
        this.entities = entities;
        this.gs = gameState;
        this.world = world;
        this.armies = []; // { id, color, name, unitIds: Set }
        this.nextId = 1;
        this.nextColorIdx = 0;
    }

    // Создать армию из набора юнитов
    createArmy(unitIds) {
        if (!unitIds || unitIds.length < 2) {
            addNotification('Нужно минимум 2 юнита для армии!', 'war');
            return null;
        }

        const e = this.entities;
        // Проверяем что все юниты живы и принадлежат одной стране
        const valid = unitIds.filter(id => e.active[id]);
        if (valid.length < 2) {
            addNotification('Недостаточно юнитов!', 'war');
            return null;
        }

        const ownerId = e.owner[valid[0]];
        if (!valid.every(id => e.owner[id] === ownerId)) {
            addNotification('Все юниты должны быть одной страны!', 'war');
            return null;
        }

        // Убираем из старых армий
        for (const id of valid) {
            this.removeFromArmy(id);
        }

        const color = ARMY_COLORS[this.nextColorIdx % ARMY_COLORS.length];
        this.nextColorIdx++;

        const army = {
            id: this.nextId++,
            color,
            name: `Армия ${this.nextId - 1}`,
            unitIds: new Set(valid),
            ownerId,
            frontLine: null, // { cells: [{x,y}], enemyId }
        };
        this.armies.push(army);

        addNotification(`🎖️ ${army.name} создана (${valid.length} юнитов)`, 'info');
        return army;
    }

    // Удалить юнита из всех армий
    removeFromArmy(unitId) {
        for (const army of this.armies) {
            army.unitIds.delete(unitId);
        }
        // Удаляем пустые армии
        this.armies = this.armies.filter(a => a.unitIds.size > 0);
    }

    // Удалить армию
    disbandArmy(armyId) {
        const idx = this.armies.findIndex(a => a.id === armyId);
        if (idx === -1) return;
        addNotification(`🗑️ ${this.armies[idx].name} распущена`, 'info');
        this.armies.splice(idx, 1);
    }

    // Получить армию юнита
    getArmyForUnit(unitId) {
        return this.armies.find(a => a.unitIds.has(unitId)) || null;
    }

    // Получить все юниты армии
    getArmyUnits(armyId) {
        const army = this.armies.find(a => a.id === armyId);
        if (!army) return [];
        return [...army.unitIds].filter(id => this.entities.active[id]);
    }

    // Получить цвет армии для юнита
    getUnitArmyColor(unitId) {
        const army = this.getArmyForUnit(unitId);
        return army ? army.color : null;
    }

    // Отдать приказ всей армии — юниты встают линией рядом с целью
    giveArmyOrder(armyId, targetX, targetY, movementSystem) {
        const army = this.armies.find(a => a.id === armyId);
        if (!army) return false;
        const e = this.entities;

        const units = [...army.unitIds].filter(id => e.active[id] && !e.inCombat[id]);
        if (!units.length) return false;

        // Определяем направление от центра армии к цели
        let avgX = 0, avgY = 0;
        for (const uid of units) { avgX += e.x[uid]; avgY += e.y[uid]; }
        avgX /= units.length; avgY /= units.length;

        const dirX = targetX - avgX;
        const dirY = targetY - avgY;
        const len = Math.sqrt(dirX * dirX + dirY * dirY) || 1;
        // Перпендикуляр к направлению движения — для линии фронта
        const perpX = -dirY / len;
        const perpY = dirX / len;

        // Цель — вражеская? Тогда атакуем линией перед целью
        const targetOwner = this.world.getCell(targetX, targetY);
        const isAttack = targetOwner && targetOwner !== army.ownerId
            && this.gs.isAtWar(army.ownerId, targetOwner);

        let moved = 0;
        const count = units.length;
        for (let i = 0; i < count; i++) {
            const uid = units[i];
            const offset = (i - (count - 1) / 2); // -2, -1, 0, 1, 2 для 5 юнитов

            let tx, ty;
            if (isAttack) {
                // Атака: линия перед целью, перпендикулярно направлению
                tx = targetX + Math.round(perpX * offset);
                ty = targetY + Math.round(perpY * offset);
            } else {
                // Обычный приказ: линия у цели
                tx = targetX + Math.round(perpX * offset * 1.5);
                ty = targetY + Math.round(perpY * offset * 1.5);
            }

            // Не даём уйти за границу карты
            if (this.world.getCell(tx, ty) === 0) {
                tx = targetX + Math.round(perpX * offset * 0.5);
                ty = targetY + Math.round(perpY * offset * 0.5);
            }

            if (movementSystem.giveOrder(uid, tx, ty)) {
                moved++;
            }
        }

        if (moved > 0) {
            const verb = isAttack ? 'атакует' : 'перемещается';
            addNotification(`🎖️ ${army.name}: ${verb} (${moved} юнитов)`, 'info');
        }
        return moved > 0;
    }

    // Привязать армию к границе врага
    setFrontLine(armyId, enemyId, movementSystem) {
        const army = this.armies.find(a => a.id === armyId);
        if (!army) return false;

        // Находим все клетки на границе с врагом
        const borderCells = [];
        const myCells = this.world.getCountryCells(army.ownerId);
        for (const cellKey of myCells) {
            const [x, y] = cellKey.split(',').map(Number);
            for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
                if (this.world.getCell(x + dx, y + dy) === enemyId) {
                    borderCells.push({ x: x + dx, y: y + dy });
                    break;
                }
            }
        }

        if (borderCells.length === 0) {
            addNotification('Нет границы с ' + enemyId.toUpperCase(), 'war');
            return false;
        }

        army.frontLine = { cells: borderCells, enemyId };

        // Строим линию фронта — сортируем клетки по позиции
        borderCells.sort((a, b) => a.x + a.y - (b.x + b.y));

        // Размещаем юнитов вдоль границы
        const units = [...army.unitIds].filter(id => this.entities.active[id] && !this.entities.inCombat[id]);
        for (let i = 0; i < units.length; i++) {
            const cellIdx = i % borderCells.length;
            const target = borderCells[cellIdx];
            // Ставим юнита на свою клетку рядом с границей
            const sx = this.entities.x[units[i]];
            const sy = this.entities.y[units[i]];
            // Ищем свободную клетку рядом с целью
            let placed = false;
            for (const [dx, dy] of [[0,0],[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1]]) {
                const tx = target.x + dx, ty = target.y + dy;
                const cellOwner = this.world.getCell(tx, ty);
                if ((cellOwner === army.ownerId || this.gs.areAllies(army.ownerId, cellOwner))
                    && !this.entities.getUnitAt(tx, ty)) {
                    if (movementSystem) movementSystem.giveOrder(units[i], tx, ty);
                    placed = true;
                    break;
                }
            }
            if (!placed && movementSystem) {
                movementSystem.giveOrder(units[i], target.x, target.y);
            }
        }

        addNotification(`🎖️ ${army.name}: привязана к границе ${enemyId.toUpperCase()} (${borderCells.length} клеток)`, 'info');
        return true;
    }

    // Обновление позиций армии на границе (вызывается каждый день)
    updateFrontLines(movementSystem) {
        for (const army of this.armies) {
            if (!army.frontLine) continue;

            const units = [...army.unitIds].filter(id => this.entities.active[id] && !this.entities.inCombat[id]);
            if (units.length === 0) continue;

            const enemyId = army.frontLine.enemyId;
            const atWar = enemyId && this.gs.isAtWar && this.gs.isAtWar(army.ownerId, enemyId);

            if (atWar) {
                // Война — атакуем вражеские клетки
                const borderCells = army.frontLine.cells;
                let attackCount = 0;
                for (let i = 0; i < units.length; i++) {
                    const uid = units[i];
                    const ux = this.entities.x[uid], uy = this.entities.y[uid];
                    const target = borderCells[i % borderCells.length];
                    if (!target) continue;

                    // Ищем вражескую клетку рядом
                    let attacked = false;
                    for (const [dx, dy] of [[0,0],[1,0],[-1,0],[0,1],[0,-1]]) {
                        const tx = target.x + dx, ty = target.y + dy;
                        const cellOwner = this.world.getCell(tx, ty);
                        if (cellOwner === enemyId) {
                            if (movementSystem) movementSystem.giveOrder(uid, tx, ty);
                            attacked = true;
                            break;
                        }
                    }
                    // Если не нашли вражескую — идём к границе
                    if (!attacked) {
                        const dx = Math.sign(target.x - ux);
                        const dy = Math.sign(target.y - uy);
                        const nx = ux + dx, ny = uy + dy;
                        const no = this.world.getCell(nx, ny);
                        if (no && (no === army.ownerId || (this.gs.areAllies && this.gs.areAllies(army.ownerId, no)))
                            && !this.entities.getUnitAt(nx, ny)) {
                            if (movementSystem) movementSystem.giveOrder(uid, nx, ny);
                        }
                    } else {
                        attackCount++;
                    }
                }
                if (attackCount > 0 && Math.random() < 0.05) {
                    addNotification('🎖️ ' + army.name + ': атака на ' + enemyId.toUpperCase() + '! (' + attackCount + ' юнитов)', 'war');
                }
                }
            } else {
                // Мир — просто держим позицию у границы
                let needsReposition = false;
                for (const uid of units) {
                    const ux = this.entities.x[uid], uy = this.entities.y[uid];
                    let nearBorder = false;
                    for (const bc of army.frontLine.cells) {
                        if (Math.abs(ux - bc.x) <= 1 && Math.abs(uy - bc.y) <= 1) {
                            nearBorder = true;
                            break;
                        }
                    }
                    if (!nearBorder) { needsReposition = true; break; }
                }

                if (!needsReposition) continue;

                const cells = army.frontLine.cells;
                for (let i = 0; i < units.length; i++) {
                    const cellIdx = i % cells.length;
                    const target = cells[cellIdx];
                    for (const [dx, dy] of [[0,0],[1,0],[-1,0],[0,1],[0,-1]]) {
                        const tx = target.x + dx, ty = target.y + dy;
                        const cellOwner = this.world.getCell(tx, ty);
                        if ((cellOwner === army.ownerId || (this.gs.areAllies && this.gs.areAllies(army.ownerId, cellOwner)))
                            && !this.entities.getUnitAt(tx, ty)) {
                            if (movementSystem) movementSystem.giveOrder(units[i], tx, ty);
                            break;
                        }
                    }
                }
            }
        }
    }

    // Обновление — чистим мёртвых юнитов из армий
    update() {
        for (const army of this.armies) {
            for (const uid of army.unitIds) {
                if (!this.entities.active[uid]) {
                    army.unitIds.delete(uid);
                }
            }
        }
        this.armies = this.armies.filter(a => a.unitIds.size > 0);
    }

    // Получить все армии страны
    getArmiesForCountry(countryId) {
        return this.armies.filter(a => a.ownerId === countryId);
    }
}
