// AIController.js — Умный исторический ИИ v2.0

import { addNotification } from '../utils/helpers.js';

// =============================================
// ИСТОРИЧЕСКИЕ ДАННЫЕ
// =============================================

const COUNTRY_PROFILES = {
    germany:        { power: 95, ideology: 'fascist',   aggression: 0.9, role: 'aggressor' },
    italy:          { power: 65, ideology: 'fascist',   aggression: 0.7, role: 'aggressor' },
    ussr:           { power: 90, ideology: 'communist', aggression: 0.6, role: 'opportunist' },
    uk:             { power: 85, ideology: 'democratic', aggression: 0.2, role: 'defender' },
    france:         { power: 80, ideology: 'democratic', aggression: 0.15, role: 'defender' },
    usa:            { power: 100, ideology: 'democratic', aggression: 0.1, role: 'defender' },
    spain:          { power: 55, ideology: 'fascist',   aggression: 0.4, role: 'neutral' },
    poland:         { power: 50, ideology: 'democratic', aggression: 0.3, role: 'defender' },
    turkey:         { power: 45, ideology: 'neutral',   aggression: 0.2, role: 'neutral' },
    yugoslavia:     { power: 40, ideology: 'democratic', aggression: 0.2, role: 'defender' },
    czechoslovakia: { power: 40, ideology: 'democratic', aggression: 0.1, role: 'defender' },
    greece:         { power: 35, ideology: 'democratic', aggression: 0.1, role: 'defender' },
    romania:        { power: 35, ideology: 'fascist',   aggression: 0.3, role: 'opportunist' },
    hungary:        { power: 30, ideology: 'fascist',   aggression: 0.4, role: 'opportunist' },
    netherlands:    { power: 30, ideology: 'democratic', aggression: 0.05, role: 'neutral' },
    belgium:        { power: 28, ideology: 'democratic', aggression: 0.05, role: 'neutral' },
    portugal:       { power: 25, ideology: 'fascist',   aggression: 0.1, role: 'neutral' },
    finland:        { power: 25, ideology: 'democratic', aggression: 0.1, role: 'defender' },
    bulgaria:       { power: 22, ideology: 'fascist',   aggression: 0.35, role: 'opportunist' },
    austria:        { power: 20, ideology: 'fascist',   aggression: 0.1, role: 'neutral' },
    switzerland:    { power: 18, ideology: 'neutral',   aggression: 0.0, role: 'neutral' },
    denmark:        { power: 15, ideology: 'democratic', aggression: 0.05, role: 'neutral' },
    lithuania:      { power: 12, ideology: 'democratic', aggression: 0.1, role: 'neutral' },
    latvia:         { power: 10, ideology: 'democratic', aggression: 0.05, role: 'neutral' },
    estonia:        { power: 10, ideology: 'democratic', aggression: 0.05, role: 'neutral' },
    luxembourg:     { power: 5,  ideology: 'democratic', aggression: 0.0, role: 'neutral' },
    slovakia:       { power: 15, ideology: 'fascist',   aggression: 0.2, role: 'opportunist' },
};

// Исторические альянсы
const INITIAL_ALLIANCES = [
    { name: 'Ось',      members: ['germany', 'italy'] },
    { name: 'Союзники', members: ['uk', 'france'] },
];

// Исторические триггеры войн (день от старта = 1 Янв 1936)
// 1939-09-01 = день ~1339 от 1936-01-01
const HISTORICAL_WARS = [
    { day: 100,  attacker: 'italy',   defender: 'greece',        chance: 0.4, label: 'вторжение в Грецию' },
    { day: 200,  attacker: 'germany', defender: 'austria',       chance: 0.7, label: 'аншлюс Австрии' },
    { day: 400,  attacker: 'germany', defender: 'czechoslovakia',chance: 0.8, label: 'захват Чехословакии' },
    { day: 600,  attacker: 'ussr',    defender: 'finland',       chance: 0.6, label: 'Зимняя война' },
    { day: 700,  attacker: 'germany', defender: 'poland',        chance: 0.95, label: 'вторжение в Польшу' },
    { day: 730,  attacker: 'germany', defender: 'france',        chance: 0.9, label: 'вторжение во Францию' },
    { day: 730,  attacker: 'germany', defender: 'belgium',       chance: 0.9, label: 'оккупация Бельгии' },
    { day: 730,  attacker: 'germany', defender: 'netherlands',   chance: 0.9, label: 'оккупация Нидерландов' },
    { day: 730,  attacker: 'germany', defender: 'luxembourg',    chance: 0.9, label: 'оккупация Люксембурга' },
    { day: 800,  attacker: 'germany', defender: 'denmark',       chance: 0.9, label: 'оккупация Дании' },
    { day: 900,  attacker: 'italy',   defender: 'yugoslavia',    chance: 0.5, label: 'вторжение в Югославию' },
    { day: 1000, attacker: 'germany', defender: 'ussr',          chance: 0.95, label: 'операция Барбаросса' },
    { day: 1000, attacker: 'romania', defender: 'ussr',          chance: 0.6, label: 'Румыния атакует СССР' },
    { day: 1000, attacker: 'hungary', defender: 'ussr',          chance: 0.5, label: 'Венгрия атакует СССР' },
    { day: 1000, attacker: 'bulgaria', defender: 'yugoslavia',   chance: 0.5, label: 'Болгария атакует Югославию' },
];

// =============================================
// ОСНОВНОЙ КОНТРОЛЛЕР
// =============================================

export class AIController {
    constructor(world, entities, gameState) {
        this.world = world;
        this.entities = entities;
        this.gameState = gameState;

        this.memory = new Map();         // countryId -> { ... }
        this.firedWars = new Set();      // уже сработавшие триггеры
        this.alliancesInited = false;
        this.roundRobinIndex = 0;        // для обхода стран по очереди
        this.COUNTRIES_PER_TICK = 3;     // обрабатываем N стран за вызов
    }

    async init() {
        console.log('🤖 AI v2.0 инициализирован');
    }

    // Вызывается из main.js раз в игровой день
    update() {
        const day = this.gameState.days;

        // Один раз инициализируем альянсы
        if (!this.alliancesInited && day >= 1) {
            this._initAlliances();
            this.alliancesInited = true;
        }

        // Исторические триггеры войн
        this._checkHistoricalWars(day);

        // Обновляем страны по круговому принципу
        const countries = this.world.getAllCountries().filter(c => c !== this.gameState.myCountryId);
        if (countries.length === 0) return;

        for (let i = 0; i < this.COUNTRIES_PER_TICK; i++) {
            const idx = this.roundRobinIndex % countries.length;
            this.roundRobinIndex++;
            this._processCountry(countries[idx], day);
        }
    }

    // =============================================
    // АЛЬЯНСЫ
    // =============================================

    _initAlliances() {
        for (const alliance of INITIAL_ALLIANCES) {
            const members = alliance.members.filter(m => this.world.getCountryCells(m).size > 0);
            for (let i = 0; i < members.length; i++) {
                for (let j = i + 1; j < members.length; j++) {
                    if (!this.gameState.areAllies(members[i], members[j])) {
                        this.gameState.addAlliance(members[i], members[j]);
                    }
                }
            }
        }
        console.log('🤝 Исторические альянсы сформированы');
    }

    // =============================================
    // ИСТОРИЧЕСКИЕ ВОЙНЫ
    // =============================================

    _checkHistoricalWars(day) {
        for (let i = 0; i < HISTORICAL_WARS.length; i++) {
            const trigger = HISTORICAL_WARS[i];
            if (this.firedWars.has(i)) continue;
            if (day < trigger.day) continue;
            if (Math.random() > trigger.chance) {
                // Отложим, но не больше чем на 30 дней
                if (day > trigger.day + 30) {
                    this.firedWars.add(i); // пропускаем навсегда
                }
                continue;
            }

            const { attacker, defender } = trigger;

            // Не воевать с самим собой или если уже воюют
            if (attacker === defender) { this.firedWars.add(i); continue; }
            if (this.gameState.isAtWar(attacker, defender)) { this.firedWars.add(i); continue; }

            // Страна должна существовать
            if (this.world.getCountryCells(attacker).size === 0) { this.firedWars.add(i); continue; }
            if (this.world.getCountryCells(defender).size === 0) { this.firedWars.add(i); continue; }

            // Союзники атакующего тоже вступают
            this.gameState.addWar(attacker, defender);
            this._pullAlliesIntoWar(attacker, defender);

            const myId = this.gameState.myCountryId;
            if (attacker === myId || defender === myId) {
                addNotification(`⚔️ ${trigger.label}! Вы вовлечены в войну!`, 'war');
            } else {
                addNotification(`⚔️ ${trigger.label}!`, 'war');
            }

            this.firedWars.add(i);
        }
    }

    _pullAlliesIntoWar(attacker, defender) {
        // Союзники атакующего объявляют войну защитнику
        const attackerAllies = this._getAllies(attacker);
        for (const ally of attackerAllies) {
            if (ally === defender) continue;
            if (!this.gameState.isAtWar(ally, defender)) {
                this.gameState.addWar(ally, defender);
            }
        }
        // Союзники защитника объявляют войну атакующему
        const defenderAllies = this._getAllies(defender);
        for (const ally of defenderAllies) {
            if (ally === attacker) continue;
            if (!this.gameState.isAtWar(ally, attacker)) {
                this.gameState.addWar(ally, attacker);
            }
        }
    }

    _getAllies(countryId) {
        const allies = [];
        for (const alliance of this.gameState.alliances) {
            if (alliance.has(countryId)) {
                for (const member of alliance) {
                    if (member !== countryId) allies.push(member);
                }
            }
        }
        return allies;
    }

    // =============================================
    // ОБРАБОТКА СТРАНЫ
    // =============================================

    _processCountry(countryId, day) {
        const cells = this.world.getCountryCells(countryId);
        if (cells.size === 0) return;

        const profile = COUNTRY_PROFILES[countryId] || { power: 20, aggression: 0.2, role: 'neutral' };
        const units = this.entities.getEntitiesByOwner(countryId);
        const enemies = this._getEnemies(countryId);
        const factories = this._countFactories(countryId);

        // Инициализируем память
        if (!this.memory.has(countryId)) {
            this.memory.set(countryId, {
                warTarget: null,
                lastRecruit: 0,
                lastBuild: 0,
                lastDiplomacy: 0,
                attackCooldown: 0,
            });
        }
        const mem = this.memory.get(countryId);
        if (mem.attackCooldown > 0) mem.attackCooldown--;

        // --- Найм ---
        this._doRecruitment(countryId, cells, units, profile, enemies.length > 0);

        // --- Строительство ---
        this._doBuild(countryId, cells, factories, profile);

        // --- Дипломатия ---
        this._doDiplomacy(countryId, profile, mem, day);

        // --- Военные действия ---
        if (enemies.length > 0 && units.length > 0) {
            this._doMilitary(countryId, units, enemies, mem, profile);
        }
        // --- Экспансия (только агрессоры и оппортунисты) ---
        else if (units.length > 0 && (profile.role === 'aggressor' || profile.role === 'opportunist')) {
            this._doExpansion(countryId, cells, units);
        }
        // --- Защитники держат оборону у границ ---
        else if (units.length > 0 && profile.role === 'defender') {
            this._doDefend(countryId, cells, units);
        }
    }

    // =============================================
    // НАЙМ
    // =============================================

    _doRecruitment(countryId, cells, units, profile, atWar) {
        const mem = this.memory.get(countryId);
        const now = Date.now();
        const cooldown = atWar ? 5000 : 10000;
        if (now - mem.lastRecruit < cooldown) return;

        const targetUnits = this._targetUnitCount(cells.size, profile, atWar);
        if (units.length >= targetUnits) return;

        const toAdd = Math.min(atWar ? 3 : 1, targetUnits - units.length);
        for (let i = 0; i < toAdd; i++) {
            this._recruitUnit(countryId, cells, profile, atWar);
        }
        mem.lastRecruit = now;
    }

    _targetUnitCount(cellCount, profile, atWar) {
        const base = Math.floor(cellCount / (profile.power >= 70 ? 4 : profile.power >= 40 ? 6 : 8));
        const warBonus = atWar ? 1.5 : 1;
        return Math.min(Math.max(base, 5), 50) * warBonus;
    }

    _recruitUnit(countryId, cells, profile, atWar) {
        // Ищем клетку с заводом или ближайшую к центру
        let bestCell = null, bestScore = -Infinity;
        let sumX = 0, sumY = 0;
        for (const c of cells) {
            const [cx, cy] = c.split(',').map(Number);
            sumX += cx; sumY += cy;
        }
        const cx0 = sumX / cells.size, cy0 = sumY / cells.size;

        for (const cell of cells) {
            const [x, y] = cell.split(',').map(Number);
            let score = -Math.abs(x - cx0) - Math.abs(y - cy0);
            if (this.world.hasBuilding(x, y, 'factory')) score += 50;
            if (!this.entities.getUnitAt(x, y)) score += 10; // свободная клетка
            if (score > bestScore) { bestScore = score; bestCell = cell; }
        }
        if (!bestCell) return;

        const [x, y] = bestCell.split(',').map(Number);
        // Танки только для сильных стран на войне с заводом
        const useTank = profile.power >= 60 && atWar && this.world.hasBuilding(x, y, 'factory');
        this.entities.createEntity(countryId, useTank ? 1 : 0, x, y);
    }

    // =============================================
    // СТРОИТЕЛЬСТВО
    // =============================================

    _doBuild(countryId, cells, factories, profile) {
        const mem = this.memory.get(countryId);
        const now = Date.now();
        if (now - mem.lastBuild < 20000) return;

        const targetFactories = Math.min(
            profile.power >= 70 ? 15 : profile.power >= 40 ? 8 : 4,
            Math.floor(cells.size / 12)
        );
        if (factories >= targetFactories) return;

        // Строим в клетке без завода
        const available = [];
        for (const cell of cells) {
            const [x, y] = cell.split(',').map(Number);
            if (!this.world.hasBuilding(x, y, 'factory')) available.push([x, y]);
        }
        if (available.length === 0) return;

        const [x, y] = available[Math.floor(Math.random() * available.length)];
        this.world.addBuilding(x, y, 'factory');
        mem.lastBuild = now;
    }

    // =============================================
    // ДИПЛОМАТИЯ
    // =============================================

    _doDiplomacy(countryId, profile, mem, day) {
        const now = Date.now();
        if (now - mem.lastDiplomacy < 30000) return;
        mem.lastDiplomacy = now;

        // Агрессоры могут сами объявлять войны (не исторические)
        if (profile.role === 'aggressor' || profile.role === 'opportunist') {
            this._considerWar(countryId, profile);
        }

        // Защитники ищут союзников если в опасности
        if (profile.role === 'defender') {
            this._seekAlliance(countryId, profile);
        }
    }

    _considerWar(countryId, profile) {
        const enemies = this._getEnemies(countryId);
        if (enemies.length >= 2) return; // уже достаточно войн

        const myPower = this._calcPower(countryId);
        const neighbors = this._getNeighboringCountries(countryId);

        for (const neighbor of neighbors) {
            if (this.gameState.isAtWar(countryId, neighbor)) continue;
            if (this.gameState.areAllies(countryId, neighbor)) continue;
            if (neighbor === this.gameState.myCountryId) continue;

            const theirPower = this._calcPower(neighbor);
            const neighborProfile = COUNTRY_PROFILES[neighbor];

            // Атакуем только если значительно сильнее
            const powerRatio = myPower / Math.max(theirPower, 1);
            if (powerRatio < 1.5) continue;

            // Идеологические противники атакуются охотнее
            const ideologyBonus = neighborProfile && neighborProfile.ideology !== profile.ideology ? 1.3 : 1.0;
            const roll = Math.random();

            if (roll < profile.aggression * 0.05 * ideologyBonus) {
                this.gameState.addWar(countryId, neighbor);
                this._pullAlliesIntoWar(countryId, neighbor);
                addNotification(`⚔️ ${countryId} объявляет войну ${neighbor}!`, 'war');
                break;
            }
        }
    }

    _seekAlliance(countryId, profile) {
        const enemies = this._getEnemies(countryId);
        if (enemies.length === 0) return; // не в опасности

        const neighbors = this._getNeighboringCountries(countryId);
        for (const neighbor of neighbors) {
            if (this.gameState.areAllies(countryId, neighbor)) continue;
            if (this.gameState.isAtWar(countryId, neighbor)) continue;

            const neighborProfile = COUNTRY_PROFILES[neighbor];
            if (!neighborProfile) continue;
            // Ищем союзников со схожей идеологией
            if (neighborProfile.ideology !== profile.ideology && neighborProfile.ideology !== 'neutral') continue;

            if (Math.random() < 0.3) {
                this.gameState.addAlliance(countryId, neighbor);
                addNotification(`🤝 ${countryId} и ${neighbor} заключили альянс!`, 'info');
                break;
            }
        }
    }

    // =============================================
    // ВОЕННЫЕ ДЕЙСТВИЯ
    // =============================================

    _doMilitary(countryId, units, enemies, mem, profile) {
        // Выбираем приоритетного врага — слабейшего соседа
        let warTarget = mem.warTarget;
        if (!warTarget || !enemies.includes(warTarget) || this.world.getCountryCells(warTarget).size === 0) {
            warTarget = this._pickWarTarget(countryId, enemies);
            mem.warTarget = warTarget;
        }
        if (!warTarget) return;

        const border = this.world.getBorderWith(countryId, warTarget);
        if (border.length === 0) {
            // Нет общей границы — переключаемся
            mem.warTarget = null;
            return;
        }

        // Разделяем юниты на атакующих (80%) и защитников (20%)
        const attackCount = Math.ceil(units.length * 0.8);
        const attackers = units.slice(0, attackCount);
        const defenders = units.slice(attackCount);

        // Атакующие движутся к границе и атакуют фронтом
        this._advanceFront(countryId, attackers, warTarget, border, mem);

        // Защитники держатся у своих границ
        if (defenders.length > 0) {
            this._holdBorder(countryId, defenders);
        }
    }

    _advanceFront(countryId, units, target, border, mem) {
        if (mem.attackCooldown > 0) return;

        // Распределяем юниты по точкам на границе
        const borderPts = border.slice(0, Math.min(border.length, units.length)).map(b => {
            const [x, y] = b.split(',').map(Number);
            return { x, y };
        });

        for (let i = 0; i < units.length; i++) {
            const unitId = units[i];
            if (this.entities.inCombat[unitId]) continue;

            // Назначаем точку на границе (round-robin)
            const targetPt = borderPts[i % borderPts.length];
            if (!targetPt) continue;

            const ux = this.entities.x[unitId];
            const uy = this.entities.y[unitId];
            const dist = Math.abs(ux - targetPt.x) + Math.abs(uy - targetPt.y);

            if (dist <= 1) {
                // Уже у границы — атакуем вражескую клетку
                this._attackAdjacentEnemy(unitId, target);
            } else {
                // Двигаемся к границе
                this._moveToward(unitId, targetPt.x, targetPt.y, true);
            }
        }

        mem.attackCooldown = 2;
    }

    _attackAdjacentEnemy(unitId, targetCountry) {
        const ux = this.entities.x[unitId];
        const uy = this.entities.y[unitId];

        for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
            const nx = ux + dx, ny = uy + dy;
            if (this.world.getCell(nx, ny) === targetCountry) {
                // Захватываем клетку
                const owner = this.entities.owner[unitId];
                this.world.setCell(nx, ny, owner);
                this.entities.moveTo(unitId, nx, ny);

                // Проверяем капитуляцию
                if (this.world.getCountryCells(targetCountry).size < 3) {
                    this._handleCapitulation(targetCountry, owner);
                }
                break;
            }
        }
    }

    _holdBorder(countryId, units) {
        // Держим юниты у границ со всеми врагами
        const allEnemies = this._getEnemies(countryId);
        if (allEnemies.length === 0) return;

        for (const unitId of units) {
            const ux = this.entities.x[unitId];
            const uy = this.entities.y[unitId];

            // Ищем ближайший вражеский юнит или границу
            let closestBorderPt = null, closestDist = Infinity;
            for (const enemy of allEnemies) {
                const border = this.world.getBorderWith(countryId, enemy);
                for (const b of border.slice(0, 10)) {
                    const [bx, by] = b.split(',').map(Number);
                    const d = Math.abs(ux - bx) + Math.abs(uy - by);
                    if (d < closestDist) { closestDist = d; closestBorderPt = { x: bx, y: by }; }
                }
            }

            if (closestBorderPt && closestDist > 2) {
                this._moveToward(unitId, closestBorderPt.x, closestBorderPt.y, true);
            }
        }
    }

    // =============================================
    // ЭКСПАНСИЯ (нейтральные территории)
    // =============================================

    _doExpansion(countryId, cells, units) {
        // Ищем нейтральную клетку рядом с нашей территорией
        const candidates = [];
        for (const cell of cells) {
            const [x, y] = cell.split(',').map(Number);
            for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
                const nx = x + dx, ny = y + dy;
                if (this.world.getCell(nx, ny) === 0) {
                    candidates.push({ x: nx, y: ny });
                }
            }
        }
        if (candidates.length === 0) return;

        const target = candidates[Math.floor(Math.random() * Math.min(candidates.length, 5))];

        // Ближайший юнит движется туда
        let bestUnit = null, bestDist = Infinity;
        for (const unitId of units) {
            const d = Math.abs(this.entities.x[unitId] - target.x) + Math.abs(this.entities.y[unitId] - target.y);
            if (d < bestDist) { bestDist = d; bestUnit = unitId; }
        }
        if (!bestUnit) return;

        if (bestDist <= 1) {
            // Захватываем
            this.world.setCell(target.x, target.y, countryId);
            this.entities.moveTo(bestUnit, target.x, target.y);
        } else {
            this._moveToward(bestUnit, target.x, target.y, false);
        }
    }

    // =============================================
    // ОБОРОНА
    // =============================================

    _doDefend(countryId, cells, units) {
        // Держим юниты ближе к границам страны
        const allNeighborCountries = this._getNeighboringCountries(countryId);
        if (allNeighborCountries.length === 0) return;

        const borderCells = [];
        for (const cell of cells) {
            const [x, y] = cell.split(',').map(Number);
            const neighbors = [
                this.world.getCell(x+1, y), this.world.getCell(x-1, y),
                this.world.getCell(x, y+1), this.world.getCell(x, y-1),
            ];
            const isBorder = neighbors.some(n => n !== 0 && n !== countryId);
            if (isBorder) borderCells.push({ x, y });
        }
        if (borderCells.length === 0) return;

        for (let i = 0; i < units.length; i++) {
            const unitId = units[i];
            const target = borderCells[i % borderCells.length];
            const ux = this.entities.x[unitId], uy = this.entities.y[unitId];
            const d = Math.abs(ux - target.x) + Math.abs(uy - target.y);
            if (d > 1) this._moveToward(unitId, target.x, target.y, true);
        }
    }

    // =============================================
    // ВСПОМОГАТЕЛЬНЫЕ
    // =============================================

    _moveToward(unitId, tx, ty, stayOnLand) {
        const ux = this.entities.x[unitId];
        const uy = this.entities.y[unitId];

        const dx = Math.sign(tx - ux);
        const dy = Math.sign(ty - uy);

        // Пробуем основное направление, потом альтернативное
        const moves = [];
        if (dx !== 0) moves.push([dx, 0]);
        if (dy !== 0) moves.push([0, dy]);
        if (dx !== 0 && dy !== 0) moves.push([dx, dy]);

        for (const [mx, my] of moves) {
            const nx = ux + mx, ny = uy + my;
            const cell = this.world.getCell(nx, ny);
            if (stayOnLand && cell === 0) continue;
            if (!stayOnLand && cell !== 0) continue;
            if (this.entities.getUnitAt(nx, ny)) continue; // клетка занята
            this.entities.moveTo(unitId, nx, ny);
            return;
        }
    }

    _pickWarTarget(countryId, enemies) {
        let weakest = null, weakestPower = Infinity;
        for (const enemy of enemies) {
            const cells = this.world.getCountryCells(enemy);
            if (cells.size === 0) continue;
            // Проверяем что есть общая граница
            const border = this.world.getBorderWith(countryId, enemy);
            if (border.length === 0) continue;
            const power = this._calcPower(enemy);
            if (power < weakestPower) { weakestPower = power; weakest = enemy; }
        }
        return weakest;
    }

    _calcPower(countryId) {
        const profile = COUNTRY_PROFILES[countryId];
        const base = profile ? profile.power : 20;
        const cells = this.world.getCountryCells(countryId).size;
        const units = this.entities.getEntitiesByOwner(countryId).length;
        return base * 0.4 + cells * 0.4 + units * 0.2;
    }

    _getEnemies(countryId) {
        const enemies = [];
        if (!this.gameState.wars) return enemies;
        for (const war of this.gameState.wars) {
            if (war.a === countryId && this.world.getCountryCells(war.b).size > 0) enemies.push(war.b);
            if (war.b === countryId && this.world.getCountryCells(war.a).size > 0) enemies.push(war.a);
        }
        return enemies;
    }

    _getNeighboringCountries(countryId) {
        const neighbors = new Set();
        const cells = this.world.getCountryCells(countryId);
        for (const cell of cells) {
            const [x, y] = cell.split(',').map(Number);
            for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
                const neighbor = this.world.getCell(x + dx, y + dy);
                if (neighbor !== 0 && neighbor !== countryId) neighbors.add(neighbor);
            }
        }
        return [...neighbors];
    }

    _countFactories(countryId) {
        let count = 0;
        for (const cell of this.world.getCountryCells(countryId)) {
            const [x, y] = cell.split(',').map(Number);
            if (this.world.hasBuilding(x, y, 'factory')) count++;
        }
        return count;
    }

    _handleCapitulation(countryId, winner) {
        const cells = this.world.getCountryCells(countryId);
        for (const cell of cells) {
            const [x, y] = cell.split(',').map(Number);
            this.world.setCell(x, y, winner);
        }
        const units = this.entities.getEntitiesByOwner(countryId);
        for (const unitId of units) this.entities.removeEntity(unitId);

        this.gameState.wars = this.gameState.wars.filter(w => w.a !== countryId && w.b !== countryId);
        const newAlliances = [];
        for (const alliance of this.gameState.alliances) {
            const na = new Set(alliance);
            na.delete(countryId);
            if (na.size > 1) newAlliances.push(na);
        }
        this.gameState.alliances = newAlliances;

        addNotification(`💀 ${countryId} капитулировал перед ${winner}!`, 'war');

        if (countryId === this.gameState.myCountryId) {
            addNotification('💀 ВАША СТРАНА КАПИТУЛИРОВАЛА! Игра окончена.', 'war');
            this.gameState.setGameSpeed(0);
            this.gameState.isGameActive = false;
        }
    }
}
