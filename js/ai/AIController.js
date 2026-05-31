// AIController.js — v3.1 (запрет воды + ровный фронт)

import { addNotification } from '../utils/helpers.js';

// ── Профили стран ────────────────────────────────────────────────────────────

const PROFILES = {
    germany:        { power: 95, ideology: 'fascist',    aggression: 0.9, role: 'aggressor' },
    italy:          { power: 65, ideology: 'fascist',    aggression: 0.7, role: 'aggressor' },
    ussr:           { power: 90, ideology: 'communist',  aggression: 0.6, role: 'opportunist' },
    uk:             { power: 85, ideology: 'democratic', aggression: 0.2, role: 'defender' },
    france:         { power: 80, ideology: 'democratic', aggression: 0.2, role: 'defender' },
    poland:         { power: 50, ideology: 'democratic', aggression: 0.3, role: 'defender' },
    turkey:         { power: 45, ideology: 'neutral',    aggression: 0.1, role: 'neutral' },
    yugoslavia:     { power: 40, ideology: 'democratic', aggression: 0.2, role: 'defender' },
    czechoslovakia: { power: 40, ideology: 'democratic', aggression: 0.1, role: 'defender' },
    greece:         { power: 35, ideology: 'democratic', aggression: 0.1, role: 'defender' },
    romania:        { power: 35, ideology: 'fascist',    aggression: 0.3, role: 'opportunist' },
    hungary:        { power: 30, ideology: 'fascist',    aggression: 0.4, role: 'opportunist' },
    netherlands:    { power: 30, ideology: 'democratic', aggression: 0.0, role: 'neutral' },
    belgium:        { power: 28, ideology: 'democratic', aggression: 0.0, role: 'neutral' },
    portugal:       { power: 25, ideology: 'fascist',    aggression: 0.1, role: 'neutral' },
    finland:        { power: 25, ideology: 'democratic', aggression: 0.1, role: 'defender' },
    bulgaria:       { power: 22, ideology: 'fascist',    aggression: 0.3, role: 'opportunist' },
    austria:        { power: 20, ideology: 'fascist',    aggression: 0.1, role: 'neutral' },
    switzerland:    { power: 18, ideology: 'neutral',    aggression: 0.0, role: 'neutral' },
    denmark:        { power: 15, ideology: 'democratic', aggression: 0.0, role: 'neutral' },
    spain:          { power: 55, ideology: 'fascist',    aggression: 0.4, role: 'neutral' },
    lithuania:      { power: 12, ideology: 'democratic', aggression: 0.0, role: 'neutral' },
    latvia:         { power: 10, ideology: 'democratic', aggression: 0.0, role: 'neutral' },
    estonia:        { power: 10, ideology: 'democratic', aggression: 0.0, role: 'neutral' },
    luxembourg:     { power:  5, ideology: 'democratic', aggression: 0.0, role: 'neutral' },
    slovakia:       { power: 15, ideology: 'fascist',    aggression: 0.2, role: 'opportunist' },
};

const INITIAL_ALLIANCES = [
    ['germany', 'italy'],
    ['uk', 'france'],
];

const HISTORICAL_WARS = [
    { day: 200,  a: 'germany',  b: 'austria',        chance: 0.8 },
    { day: 400,  a: 'germany',  b: 'czechoslovakia', chance: 0.85 },
    { day: 600,  a: 'ussr',     b: 'finland',        chance: 0.7 },
    { day: 700,  a: 'germany',  b: 'poland',         chance: 0.95 },
    { day: 740,  a: 'germany',  b: 'france',         chance: 0.9 },
    { day: 740,  a: 'germany',  b: 'belgium',        chance: 0.9 },
    { day: 740,  a: 'germany',  b: 'netherlands',    chance: 0.9 },
    { day: 740,  a: 'germany',  b: 'luxembourg',     chance: 0.9 },
    { day: 800,  a: 'germany',  b: 'denmark',        chance: 0.9 },
    { day: 900,  a: 'italy',    b: 'greece',         chance: 0.6 },
    { day: 950,  a: 'italy',    b: 'yugoslavia',     chance: 0.5 },
    { day: 1000, a: 'germany',  b: 'ussr',           chance: 0.95 },
    { day: 1000, a: 'romania',  b: 'ussr',           chance: 0.6 },
    { day: 1000, a: 'hungary',  b: 'ussr',           chance: 0.5 },
    { day: 1050, a: 'bulgaria', b: 'yugoslavia',     chance: 0.5 },
];

export class AIController {
    constructor(world, entities, gameState) {
        this.world    = world;
        this.entities = entities;
        this.gs       = gameState;

        this.mem = new Map();

        this.firedWars       = new Set();
        this.alliancesInited = false;
        this.rrIndex         = 0;
    }

    async init() { console.log('🤖 AI v3.1'); }

    update() {
        const day = this.gs.days;

        if (!this.alliancesInited && day >= 1) {
            this._initAlliances();
            this.alliancesInited = true;
        }

        this._checkHistoricalWars(day);

        const countries = this.world.getAllCountries().filter(c => c !== this.gs.myCountryId);
        if (!countries.length) return;
        
        for (let i = 0; i < 4; i++) {
            const c = countries[this.rrIndex++ % countries.length];
            this._processCountry(c, day);
        }
    }

    _initAlliances() {
        for (const pair of INITIAL_ALLIANCES) {
            const [a, b] = pair.filter(id => this.world.getCountryCells(id).size > 0);
            if (a && b && !this.gs.areAllies(a, b)) this.gs.addAlliance(a, b);
        }
    }

    _checkHistoricalWars(day) {
        for (let i = 0; i < HISTORICAL_WARS.length; i++) {
            if (this.firedWars.has(i)) continue;
            const t = HISTORICAL_WARS[i];
            if (day < t.day) continue;
            if (day > t.day + 40) { this.firedWars.add(i); continue; }
            if (Math.random() > t.chance) continue;

            const { a, b } = t;
            if (a === b || this.gs.isAtWar(a, b)) { this.firedWars.add(i); continue; }
            if (!this.world.getCountryCells(a).size || !this.world.getCountryCells(b).size) {
                this.firedWars.add(i); continue;
            }

            this.gs.addWar(a, b);
            this._pullAllies(a, b);

            const my = this.gs.myCountryId;
            if (a === my || b === my) addNotification(`⚔️ ${a} → ${b} — вы вовлечены!`, 'war');
            else                       addNotification(`⚔️ ${a} → ${b}`, 'war');

            this.firedWars.add(i);
        }
    }

    _pullAllies(attacker, defender) {
        for (const ally of this._allies(attacker)) {
            if (!this.gs.isAtWar(ally, defender)) this.gs.addWar(ally, defender);
        }
        for (const ally of this._allies(defender)) {
            if (!this.gs.isAtWar(ally, attacker)) this.gs.addWar(ally, attacker);
        }
    }

    _allies(id) {
        const res = [];
        for (const a of this.gs.alliances) if (a.has(id)) for (const m of a) if (m !== id) res.push(m);
        return res;
    }

    _processCountry(id, day) {
        const cells = this.world.getCountryCells(id);
        if (!cells.size) return;

        const profile = PROFILES[id] || { power: 20, aggression: 0.2, role: 'neutral' };
        const units   = this.entities.getEntitiesByOwner(id);
        const enemies = this._enemies(id);

        if (!this.mem.has(id)) {
            this.mem.set(id, { 
                warTarget: null, lastRecruit: 0, lastBuild: 0,
                lastDiplo: 0, unitOrders: new Map(),
                frontPositions: new Map() // для хранения позиций фронта
            });
        }
        const mem = this.mem.get(id);

        this._recruit(id, cells, units, profile, enemies.length > 0);
        this._build(id, cells, profile);
        this._diplomacy(id, profile, mem, day);

        if (enemies.length > 0 && units.length > 0) {
            this._military(id, units, enemies, mem, profile, day);
        } else if (units.length > 0 && profile.role !== 'neutral') {
            this._peacetime(id, cells, units, profile);
        }
    }

    _recruit(id, cells, units, profile, atWar) {
        const mem = this.mem.get(id);
        const now = Date.now();
        if (now - mem.lastRecruit < (atWar ? 4000 : 9000)) return;

        const target = Math.min(50, Math.max(5,
            Math.floor(cells.size / (profile.power >= 70 ? 4 : profile.power >= 40 ? 6 : 9))
            * (atWar ? 1.5 : 1)
        ));
        if (units.length >= target) return;

        const toSpawn = Math.min(atWar ? 3 : 1, target - units.length);
        for (let i = 0; i < toSpawn; i++) this._spawnUnit(id, cells, profile, atWar);
        mem.lastRecruit = now;
    }

    _spawnUnit(id, cells, profile, atWar) {
        let best = null, bestScore = -Infinity;
        let sumX = 0, sumY = 0, n = 0;
        for (const c of cells) {
            const [x, y] = c.split(',').map(Number);
            sumX += x; sumY += y; n++;
        }
        const cx = sumX / n, cy = sumY / n;

        for (const c of cells) {
            const [x, y] = c.split(',').map(Number);
            if (this.entities.getUnitAt(x, y)) continue;
            // ❌ НЕЛЬЗЯ СПАВНИТЬ НА ВОДЕ
            if (this.world.getCell(x, y) === 0) continue;
            let score = -(Math.abs(x - cx) + Math.abs(y - cy));
            if (this.world.hasBuilding(x, y, 'factory')) score += 40;
            if (score > bestScore) { bestScore = score; best = [x, y]; }
        }
        if (!best) return;

        const useTank = profile.power >= 60 && atWar && this.world.hasBuilding(best[0], best[1], 'factory');
        this.entities.createEntity(id, useTank ? 1 : 0, best[0], best[1]);
    }

    _build(id, cells, profile) {
        const mem = this.mem.get(id);
        if (Date.now() - mem.lastBuild < 18000) return;

        const targetFact = Math.min(
            profile.power >= 70 ? 15 : profile.power >= 40 ? 8 : 4,
            Math.floor(cells.size / 12)
        );
        let factCount = 0;
        const available = [];
        for (const c of cells) {
            const [x, y] = c.split(',').map(Number);
            if (this.world.hasBuilding(x, y, 'factory')) factCount++;
            else available.push([x, y]);
        }
        if (factCount >= targetFact || !available.length) return;

        const [x, y] = available[Math.floor(Math.random() * available.length)];
        this.world.addBuilding(x, y, 'factory');
        mem.lastBuild = Date.now();
    }

    _diplomacy(id, profile, mem, day) {
        if (Date.now() - mem.lastDiplo < 25000) return;
        mem.lastDiplo = Date.now();

        if (profile.role === 'aggressor' || profile.role === 'opportunist') {
            this._considerWar(id, profile);
        }
        if (profile.role === 'defender' && this._enemies(id).length > 0) {
            this._seekAlly(id, profile);
        }
    }

    _considerWar(id, profile) {
        if (this._enemies(id).length >= 2) return;
        const myPow = this._power(id);
        for (const nb of this._neighborCountries(id)) {
            if (this.gs.isAtWar(id, nb) || this.gs.areAllies(id, nb)) continue;
            if (nb === this.gs.myCountryId) continue;
            const ratio = myPow / Math.max(this._power(nb), 1);
            if (ratio < 1.6) continue;
            const nbProfile = PROFILES[nb];
            const bonus = nbProfile && nbProfile.ideology !== profile.ideology ? 1.3 : 1.0;
            if (Math.random() < profile.aggression * 0.04 * bonus) {
                this.gs.addWar(id, nb);
                this._pullAllies(id, nb);
                addNotification(`⚔️ ${id} объявил войну ${nb}!`, 'war');
                break;
            }
        }
    }

    _seekAlly(id, profile) {
        for (const nb of this._neighborCountries(id)) {
            if (this.gs.areAllies(id, nb) || this.gs.isAtWar(id, nb)) continue;
            const nbp = PROFILES[nb];
            if (!nbp || (nbp.ideology !== profile.ideology && nbp.ideology !== 'neutral')) continue;
            if (Math.random() < 0.25) {
                this.gs.addAlliance(id, nb);
                addNotification(`🤝 ${id} и ${nb} заключили альянс!`, 'info');
                break;
            }
        }
    }

    // ========== ВОЕННЫЕ ДЕЙСТВИЯ С РОВНЫМ ФРОНТОМ ==========

    _military(id, units, enemies, mem, profile, day) {
        // Выбираем цель
        if (!mem.warTarget || !enemies.includes(mem.warTarget)
            || !this.world.getCountryCells(mem.warTarget).size
            || !this.world.getBorderWith(id, mem.warTarget).length) {
            mem.warTarget = this._pickTarget(id, enemies);
        }
        const target = mem.warTarget;
        if (!target) return;

        const border = this.world.getBorderWith(id, target);
        if (!border.length) { mem.warTarget = null; return; }

        // Сортируем границу для создания ровного фронта
        const sortedBorder = this._sortBorderPoints(border);
        
        // Распределяем юниты равномерно вдоль границы
        this._formStraightFront(id, units, sortedBorder, target, mem, day);
    }

    // Сортировка точек границы для ровного фронта
    _sortBorderPoints(borderCells) {
        // Преобразуем в координаты
        const points = borderCells.map(c => {
            const [x, y] = c.split(',').map(Number);
            return { x, y, key: c };
        });
        
        // Находим среднюю точку
        let sumX = 0, sumY = 0;
        for (const p of points) {
            sumX += p.x;
            sumY += p.y;
        }
        const centerX = sumX / points.length;
        const centerY = sumY / points.length;
        
        // Сортируем по углу относительно центра (для ровного фронта)
        points.sort((a, b) => {
            const angleA = Math.atan2(a.y - centerY, a.x - centerX);
            const angleB = Math.atan2(b.y - centerY, b.x - centerX);
            return angleA - angleB;
        });
        
        return points;
    }

    // Формирование ровного фронта
    _formStraightFront(id, units, borderPoints, target, mem, day) {
        if (units.length === 0 || borderPoints.length === 0) return;
        
        // Назначаем каждому юниту свою точку на границе
        for (let i = 0; i < units.length; i++) {
            const unitId = units[i];
            if (this.entities.inCombat[unitId]) continue;
            
            // Распределяем юниты равномерно вдоль фронта
            const borderIdx = i % borderPoints.length;
            const targetPoint = borderPoints[borderIdx];
            
            const ux = this.entities.x[unitId];
            const uy = this.entities.y[unitId];
            const dist = Math.abs(ux - targetPoint.x) + Math.abs(uy - targetPoint.y);
            
            if (dist === 0) {
                // Уже на границе — атакуем
                this._attackAdjacent(unitId, target);
            } else if (dist === 1) {
                // Рядом с границей
                const attacked = this._attackAdjacent(unitId, target);
                if (!attacked) {
                    this._moveToBorder(unitId, targetPoint);
                }
            } else {
                // Двигаемся к границе
                this._moveToBorder(unitId, targetPoint);
            }
        }
    }

    // Движение к точке на границе (без воды)
    _moveToBorder(unitId, targetPoint) {
        const ux = this.entities.x[unitId];
        const uy = this.entities.y[unitId];
        
        const dx = Math.sign(targetPoint.x - ux);
        const dy = Math.sign(targetPoint.y - uy);
        
        let newX = ux;
        let newY = uy;
        
        if (dx !== 0) newX += dx;
        else if (dy !== 0) newY += dy;
        
        // ❌ ПРОВЕРКА: НЕЛЬЗЯ ХОДИТЬ ПО ВОДЕ
        const cell = this.world.getCell(newX, newY);
        if (cell === 0) return false; // Вода — нельзя
        
        // Нельзя ходить на вражескую клетку без боя (только если она не вражеская)
        const isEnemy = this.gs.isAtWar(this.entities.owner[unitId], cell);
        if (isEnemy) {
            // Если рядом с врагом, атакуем
            return this._attackAdjacent(unitId, cell);
        }
        
        // Проверяем, не занята ли клетка
        const occupant = this.entities.getUnitAt(newX, newY);
        if (!occupant || occupant === unitId) {
            this.entities.moveTo(unitId, newX, newY);
            return true;
        }
        
        return false;
    }

    // Атака соседней вражеской клетки
    _attackAdjacent(unitId, targetCountry) {
        const ux = this.entities.x[unitId], uy = this.entities.y[unitId];
        const owner = this.entities.owner[unitId];

        for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
            const nx = ux + dx, ny = uy + dy;
            
            // ❌ НЕЛЬЗЯ АТАКОВАТЬ ВОДУ
            const cellOwner = this.world.getCell(nx, ny);
            if (cellOwner === 0) continue;
            
            if (cellOwner !== targetCountry) continue;

            const enemyUnit = this.entities.getUnitAt(nx, ny);
            if (enemyUnit) {
                this.entities.damage(enemyUnit, 15);
                const died = this.entities.hp[enemyUnit] <= 0;
                if (died) {
                    this.world.setCell(nx, ny, owner);
                    this.entities.moveTo(unitId, nx, ny);
                    this._checkCapitulation(targetCountry, owner);
                }
                return true;
            } else {
                this.world.setCell(nx, ny, owner);
                this.entities.moveTo(unitId, nx, ny);
                this._checkCapitulation(targetCountry, owner);
                return true;
            }
        }
        return false;
    }

    // ========== МИРНОЕ ВРЕМЯ ==========

    _peacetime(id, cells, units, profile) {
        if (profile.role === 'defender') {
            const nbs = this._neighborCountries(id);
            if (!nbs.length) return;
            
            const borderPts = [];
            for (const nb of nbs) {
                const b = this.world.getBorderWith(id, nb);
                for (const c of b.slice(0, 20)) {
                    const [x,y] = c.split(',').map(Number);
                    borderPts.push({x,y});
                }
            }
            
            for (let i = 0; i < units.length && i < borderPts.length; i++) {
                const uid = units[i];
                const target = borderPts[i];
                if (!target) continue;
                
                const dx = Math.sign(target.x - this.entities.x[uid]);
                const dy = Math.sign(target.y - this.entities.y[uid]);
                if (dx === 0 && dy === 0) continue;
                
                const nx = this.entities.x[uid] + (dx || (dy !== 0 ? 0 : 1));
                const ny = this.entities.y[uid] + (dx ? 0 : (dy || 1));
                
                // ❌ НЕЛЬЗЯ НА ВОДУ
                if (this.world.getCell(nx, ny) === 0) continue;
                if (!this.entities.getUnitAt(nx, ny)) {
                    this.entities.moveTo(uid, nx, ny);
                }
            }
        } else if (profile.role === 'aggressor' || profile.role === 'opportunist') {
            // Захват нейтральных клеток (но не воды)
            const candidates = [];
            for (const c of cells) {
                const [x,y] = c.split(',').map(Number);
                for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
                    const nx = x+dx, ny = y+dy;
                    // ❌ НЕЛЬЗЯ ЗАХВАТЫВАТЬ ВОДУ
                    if (this.world.getCell(nx, ny) === 0) continue;
                    if (!this.world.getCell(nx, ny)) {
                        candidates.push({x:nx,y:ny});
                    }
                }
            }
            if (!candidates.length) return;
            
            const target = candidates[Math.floor(Math.random() * Math.min(candidates.length, 8))];
            let bestUnit = null, bestDist = Infinity;
            for (const uid of units) {
                const d = Math.abs(this.entities.x[uid]-target.x)+Math.abs(this.entities.y[uid]-target.y);
                if (d < bestDist) { bestDist = d; bestUnit = uid; }
            }
            if (!bestUnit) return;
            
            if (bestDist === 0) {
                this.world.setCell(target.x, target.y, id);
            } else {
                const dx = Math.sign(target.x - this.entities.x[bestUnit]);
                const dy = Math.sign(target.y - this.entities.y[bestUnit]);
                const nx = this.entities.x[bestUnit] + dx;
                const ny = this.entities.y[bestUnit] + (dx ? 0 : dy);
                
                // ❌ НЕЛЬЗЯ НА ВОДУ
                if (this.world.getCell(nx, ny) === 0) return;
                
                if (!this.entities.getUnitAt(nx, ny)) {
                    if (!this.world.getCell(nx, ny)) {
                        this.world.setCell(nx, ny, id);
                        this.entities.moveTo(bestUnit, nx, ny);
                    } else if (this.world.getCell(nx, ny) === id) {
                        this.entities.moveTo(bestUnit, nx, ny);
                    }
                }
            }
        }
    }

    // ========== КАПИТУЛЯЦИЯ ==========

    _checkCapitulation(countryId, winner) {
        const cells = this.world.getCountryCells(countryId);
        if (cells.size > 3) return;

        for (const c of [...cells]) {
            const [x,y] = c.split(',').map(Number);
            this.world.setCell(x, y, winner);
        }
        for (const uid of this.entities.getEntitiesByOwner(countryId)) {
            this.entities.removeEntity(uid);
        }
        this.gs.wars = this.gs.wars.filter(w => w.a !== countryId && w.b !== countryId);
        this.gs.alliances = this.gs.alliances
            .map(a => { const s=new Set(a); s.delete(countryId); return s; })
            .filter(a => a.size > 1);

        for (const [, m] of this.mem) { if (m.warTarget === countryId) m.warTarget = null; }

        addNotification(`💀 ${countryId} капитулировал перед ${winner}!`, 'war');

        if (countryId === this.gs.myCountryId) {
            addNotification('💀 ВАША СТРАНА КАПИТУЛИРОВАЛА! Игра окончена.', 'war');
            this.gs.setGameSpeed(0);
            this.gs.isGameActive = false;
        }
    }

    // ========== ВСПОМОГАТЕЛЬНЫЕ ==========

    _enemies(id) {
        if (!this.gs.wars) return [];
        return this.gs.wars.flatMap(w => {
            if (w.a === id && this.world.getCountryCells(w.b).size) return [w.b];
            if (w.b === id && this.world.getCountryCells(w.a).size) return [w.a];
            return [];
        });
    }

    _neighborCountries(id) {
        const res = new Set();
        for (const c of this.world.getCountryCells(id)) {
            const [x,y] = c.split(',').map(Number);
            for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
                const nb = this.world.getCell(x+dx, y+dy);
                if (nb && nb !== id) res.add(nb);
            }
        }
        return [...res];
    }

    _power(id) {
        const p  = PROFILES[id];
        const base = p ? p.power : 20;
        return base * 0.4
             + this.world.getCountryCells(id).size * 0.4
             + this.entities.getEntitiesByOwner(id).length * 0.2;
    }

    _pickTarget(id, enemies) {
        let best = null, bestScore = Infinity;
        for (const e of enemies) {
            if (!this.world.getBorderWith(id, e).length) continue;
            const score = this._power(e);
            if (score < bestScore) { bestScore = score; best = e; }
        }
        return best;
    }
}
