// CombatSystem.js — HOI4-вдохновлённая боевая система v2.0
//
// Механики:
//   - Org: боевой дух, при 0 — отступление
//   - HP: здоровье, при 0 — уничтожение
//   - Defense/Breakthrough: реально снижают урон
//   - Hardness: определяет какой attack эффективен (soft/hard)
//   - Рельеф: bonus к защите на клетке
//   - Подкрепления: юниты в радиусе 2 клеток присоединяются к бою
//   - Постепенная капитуляция: ослабление при потере территории

import { addNotification } from '../utils/helpers.js';

const FRONT_WIDTH = 4;

const UNIT_STATS = {
    0: { // пехота
        softAttack: 30, hardAttack: 5,
        defense: 25, breakthrough: 8,
        hardness: 0,
        maxOrg: 100, orgRecovery: 4,
        maxHp: 100,
    },
    1: { // танки
        softAttack: 80, hardAttack: 60,
        defense: 15, breakthrough: 40,
        hardness: 70,
        maxOrg: 60, orgRecovery: 2,
        maxHp: 50,
    },
};

export class CombatSystem {
    constructor(world, entities, gameState) {
        this.world    = world;
        this.entities = entities;
        this.gs       = gameState;

        // cellKey → Battle
        this.battles = new Map();
        // org[unitId]
        this.org = new Float32Array(entities.maxEntities || 50000);
    }

    initUnit(uid) {
        const s = UNIT_STATS[this.entities.type[uid]] || UNIT_STATS[0];
        this.org[uid] = s.maxOrg;
    }

    getOrg(uid) { return Math.round(this.org[uid] || 0); }

    update() {
        this._formBattles();
        this._resolveBattles();
        this._recoverOrg();
    }

    // ── 1. Формируем сражения ─────────────────────────────────────────────────

    _formBattles() {
        const e = this.entities;

        for (let i = 1; i < e.nextId; i++) {
            if (!e.active[i]) continue;
            const ownerI = e.owner[i];

            // Проверяем 4 соседних клетки + свою собственную
            for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1],[0,0]]) {
                const nx = e.x[i] + dx, ny = e.y[i] + dy;
                const j = e.getUnitAt(nx, ny);
                if (!j || !e.active[j] || i === j) continue;
                const ownerJ = e.owner[j];
                if (ownerI === ownerJ) continue;
                if (!this.gs.isAtWar(ownerI, ownerJ)) continue;

                const battleCell = `${e.x[j]},${e.y[j]}`;

                if (this.battles.has(battleCell)) {
                    const b = this.battles.get(battleCell);
                    // Атакующий присоединяется
                    if (e.owner[i] === b.attackerCountry && !b.attackers.includes(i)
                        && b.attackers.length < FRONT_WIDTH) {
                        b.attackers.push(i);
                        e.inCombat[i] = 1;
                    }
                    // Защитник присоединяется
                    if (e.owner[j] === b.defenderCountry && !b.defenders.includes(j)
                        && b.defenders.length < FRONT_WIDTH) {
                        b.defenders.push(j);
                        e.inCombat[j] = 1;
                    }
                } else {
                    if (this.org[i] === 0) this.initUnit(i);
                    if (this.org[j] === 0) this.initUnit(j);
                    e.inCombat[i] = 1;
                    e.inCombat[j] = 1;

                    const b = {
                        attackerCountry: e.owner[i],
                        defenderCountry: e.owner[j],
                        attackers: [i],
                        defenders: [j],
                        cell: battleCell,
                        day: 0,
                    };
                    this.battles.set(battleCell, b);

                    const my = this.gs.myCountryId;
                    if (e.owner[i] === my || e.owner[j] === my) {
                        addNotification(`⚔️ Бой: ${b.attackerCountry} атакует ${b.defenderCountry}!`, 'war');
                    }
                }
            }
        }

        this._sendReinforcements();
    }

    _sendReinforcements() {
        const e = this.entities;

        for (const [cellKey, b] of this.battles) {
            if (b.attackers.length >= FRONT_WIDTH && b.defenders.length >= FRONT_WIDTH) continue;

            const [cx, cy] = cellKey.split(',').map(Number);
            const nearby = e.getEntitiesInRadius(cx, cy, 2);

            for (const uid of nearby) {
                if (!e.active[uid] || e.inCombat[uid]) continue;
                if (b.attackers.length < FRONT_WIDTH && e.owner[uid] === b.attackerCountry && !b.attackers.includes(uid)) {
                    b.attackers.push(uid);
                    e.inCombat[uid] = 1;
                } else if (b.defenders.length < FRONT_WIDTH && e.owner[uid] === b.defenderCountry && !b.defenders.includes(uid)) {
                    b.defenders.push(uid);
                    e.inCombat[uid] = 1;
                }
            }
        }
    }

    // ── 2. Разрешаем сражения ─────────────────────────────────────────────────

    _resolveBattles() {
        const e = this.entities;
        const toDelete = [];

        for (const [cellKey, b] of this.battles) {
            // Чистим мёртвых
            b.attackers = b.attackers.filter(id => e.active[id]);
            b.defenders = b.defenders.filter(id => e.active[id]);

            if (!b.attackers.length || !b.defenders.length) {
                this._endBattle(b);
                toDelete.push(cellKey);
                continue;
            }

            b.day++;

            const [bx, by] = cellKey.split(',').map(Number);
            const terrainBonus = this.world.getTerrainBonus ? this.world.getTerrainBonus(bx, by) : 1.0;

            // Средний org
            const aOrgAvg = this._avgOrg(b.attackers);
            const dOrgAvg = this._avgOrg(b.defenders);

            // Бонус прорыва: если org атакующего >> org защищающегося
            const breakthroughBonus = aOrgAvg > dOrgAvg * 1.5 ? 1.3 : 1.0;

            // Множитель численного превосходства
            const numAdvA = Math.min(1.5, 1 + (b.attackers.length - b.defenders.length) * 0.15);
            const numAdvD = Math.min(1.5, 1 + (b.defenders.length - b.attackers.length) * 0.15);

            const rng = () => 0.8 + Math.random() * 0.4;

            // Штраф за капитуляцию
            const aPenalty = this._getCapitulationPenalty(b.attackerCountry);
            const dPenalty = this._getCapitulationPenalty(b.defenderCountry);

            // ── Урон защитникам (атака атакующих) ──
            const aRawAttack = this._totalAttack(b.attackers, b.defenders, b.cell);
            const aOrgDmg = (aRawAttack / b.defenders.length) * breakthroughBonus * numAdvA * aPenalty;

            // Средняя защита защищающихся (defense + terrain)
            const avgDefDefense = this._avgStat(b.defenders, 'defense');

            for (const uid of b.defenders) {
                // Урон снижается защитой и рельефом
                const reduction = avgDefDefense * terrainBonus * 0.15;
                const netOrgDmg = Math.max(1, aOrgDmg - reduction) * rng();
                this.org[uid] = Math.max(0, this.org[uid] - netOrgDmg);

                const hpDmg = Math.max(1, Math.ceil(netOrgDmg * 0.1 * rng()));
                const died = e.damage(uid, hpDmg);
                if (died && e.owner[uid] === this.gs.myCountryId) {
                    addNotification(`💀 Юнит уничтожен!`, 'war');
                }
            }

            // ── Урон атакующим (контратака защищающихся) ──
            const dRawAttack = this._totalAttack(b.defenders, b.attackers, b.cell);
            const dOrgDmg = (dRawAttack / b.attackers.length) * numAdvD * dPenalty;

            // Средний breakthrough атакующих снижают урон
            const avgAttackBreakthrough = this._avgStat(b.attackers, 'breakthrough');

            for (const uid of b.attackers) {
                // Breakthrough снижает входящий урон (как defense для атакующего)
                const reduction = avgAttackBreakthrough * 0.12;
                const netOrgDmg = Math.max(1, dOrgDmg - reduction) * rng();
                this.org[uid] = Math.max(0, this.org[uid] - netOrgDmg);

                const hpDmg = Math.max(1, Math.ceil(netOrgDmg * 0.08 * rng()));
                const died = e.damage(uid, hpDmg);
                if (died && e.owner[uid] === this.gs.myCountryId) {
                    addNotification(`💀 Юнит уничтожен!`, 'war');
                }
            }

            // Чистим мёртвых после урона
            b.attackers = b.attackers.filter(id => e.active[id]);
            b.defenders = b.defenders.filter(id => e.active[id]);

            if (!b.attackers.length || !b.defenders.length) {
                this._endBattle(b);
                toDelete.push(cellKey);
                continue;
            }

            // Проверяем org
            const newAOrgAvg = this._avgOrg(b.attackers);
            const newDOrgAvg = this._avgOrg(b.defenders);

            if (newDOrgAvg <= 0 && newAOrgAvg > 0) {
                this._defenderRouted(b, cellKey);
                toDelete.push(cellKey);
            } else if (newAOrgAvg <= 0 && newDOrgAvg > 0) {
                this._attackerRouted(b);
                toDelete.push(cellKey);
            } else if (newAOrgAvg <= 0 && newDOrgAvg <= 0) {
                for (const uid of [...b.attackers, ...b.defenders]) this._retreatUnit(uid);
                this._endBattle(b);
                toDelete.push(cellKey);
            }
        }

        for (const k of toDelete) this.battles.delete(k);
    }

    // ── 3. Восстановление org ─────────────────────────────────────────────────

    _recoverOrg() {
        const e = this.entities;
        for (let i = 1; i < e.nextId; i++) {
            if (!e.active[i] || e.inCombat[i]) continue;
            const s = UNIT_STATS[e.type[i]] || UNIT_STATS[0];
            // Восстановление org
            if (this.org[i] < s.maxOrg) {
                this.org[i] = Math.min(s.maxOrg, (this.org[i] || s.maxOrg) + s.orgRecovery);
            } else if (this.org[i] === 0) {
                this.org[i] = s.maxOrg;
            }
            // Восстановление HP: +1 в день
            if (e.hp[i] < s.maxHp) {
                e.hp[i] = Math.min(s.maxHp, e.hp[i] + 1);
            }
        }
    }

    // ── Расчёт атаки ─────────────────────────────────────────────────────────

    _totalAttack(attackers, defenders, battleCell) {
        const e = this.entities;

        // Средний hardness противника
        const avgHardness = defenders.reduce((s, d) => {
            const ds = UNIT_STATS[e.type[d]] || UNIT_STATS[0];
            return s + ds.hardness;
        }, 0) / (defenders.length || 1);

        let total = 0;
        for (const uid of attackers) {
            if (!e.active[uid]) continue;
            const aStats = UNIT_STATS[e.type[uid]] || UNIT_STATS[0];

            // Hardness сильно снижает урон пехоты по танкам
            const hardnessRatio = avgHardness / 100;
            const effectiveSoft = aStats.softAttack * (1 - hardnessRatio * 0.85);
            const effectiveHard = aStats.hardAttack * hardnessRatio;
            const effective = effectiveSoft + effectiveHard;

            const orgMult = Math.max(0.3, (this.org[uid] || 1) / aStats.maxOrg);

            total += effective * orgMult;
        }
        return total;
    }

    _avgOrg(units) {
        if (!units.length) return 0;
        return units.reduce((s, uid) => s + (this.org[uid] || 0), 0) / units.length;
    }

    _avgStat(units, stat) {
        if (!units.length) return 0;
        const e = this.entities;
        return units.reduce((s, uid) => {
            const st = UNIT_STATS[e.type[uid]] || UNIT_STATS[0];
            return s + (st[stat] || 0);
        }, 0) / units.length;
    }

    // ── Штраф за потерю территории ───────────────────────────────────────────

    _getCapitulationPenalty(countryId) {
        if (!countryId) return 1.0;
        const totalCells = this.world.getCountryCells(countryId).size;
        if (totalCells === 0) return 0.5;

        // Считаем начальное количество клеток (грубая оценка — максимальный размер страны)
        // Используем количество как есть — меньше клеток = больше штраф
        if (totalCells <= 5) return 0.3;   // почти капитулировала
        if (totalCells <= 15) return 0.6;  // сильно ослаблена
        if (totalCells <= 30) return 0.8;  // ослаблена
        return 1.0;
    }

    // ── Гибель защитника — клетка захвачена ──────────────────────────────────

    _defenderRouted(b, cellKey) {
        const e = this.entities;
        const [cx, cy] = cellKey.split(',').map(Number);

        // Все защитники погибают
        for (const uid of b.defenders) {
            if (e.active[uid]) {
                e.removeEntity(uid);
            }
        }

        // Захватываем клетку
        this.world.setCell(cx, cy, b.attackerCountry);

        // Лучший атакующий занимает клетку
        const leader = b.attackers.reduce((best, uid) =>
            (this.org[uid] || 0) > (this.org[best] || 0) ? uid : best, b.attackers[0]);
        if (e.active[leader] && !e.getUnitAt(cx, cy)) {
            e.moveTo(leader, cx, cy);
        }

        this._endBattle(b);

        const my = this.gs.myCountryId;
        if (b.attackerCountry === my || b.defenderCountry === my) {
            addNotification(`💀 ${b.defenderCountry} уничтожен! ${b.attackerCountry} захватывает клетку.`, 'war');
        }

        this._checkCapitulation(b.defenderCountry, b.attackerCountry);
    }

    // ── Гибель атакующего ───────────────────────────────────────────────────

    _attackerRouted(b) {
        const e = this.entities;
        for (const uid of b.attackers) {
            if (e.active[uid]) {
                e.removeEntity(uid);
            }
        }
        this._endBattle(b);

        const my = this.gs.myCountryId;
        if (b.attackerCountry === my || b.defenderCountry === my) {
            addNotification(`💀 Атака ${b.attackerCountry} провалилась!`, 'war');
        }
    }

    // ── Гибель юнита ────────────────────────────────────────────────────────

    _retreatUnit(uid) {
        const e = this.entities;
        if (!e.active[uid]) return;
        e.removeEntity(uid);
    }

    // ── Очистка боя ──────────────────────────────────────────────────────────

    _endBattle(b) {
        const e = this.entities;
        for (const uid of [...b.attackers, ...b.defenders]) {
            if (e.active[uid]) e.inCombat[uid] = 0;
        }
    }

    // ── Капитуляция (порог ≤5 клеток) ───────────────────────────────────────

    _checkCapitulation(loserCountry, winnerCountry) {
        const cells = this.world.getCountryCells(loserCountry);
        if (cells.size > 10) return;

        for (const c of [...cells]) {
            const [x, y] = c.split(',').map(Number);
            this.world.setCell(x, y, winnerCountry);
        }
        for (const uid of this.entities.getEntitiesByOwner(loserCountry)) {
            this.entities.removeEntity(uid);
        }
        this.gs.wars = this.gs.wars.filter(w => w.a !== loserCountry && w.b !== loserCountry);
        this.gs.alliances = (this.gs.alliances || [])
            .map(a => { const s = new Set(a); s.delete(loserCountry); return s; })
            .filter(a => a.size > 1);

        addNotification(`💀 ${loserCountry} капитулировал перед ${winnerCountry}!`, 'war');

        if (loserCountry === this.gs.myCountryId) {
            addNotification('💀 ВАША СТРАНА КАПИТУЛИРОВАЛА! Игра окончена.', 'war');
            this.gs.setGameSpeed(0);
            this.gs.isGameActive = false;
        }
    }
}
