// GameState.js — Центральное состояние игры

export class GameState {
    constructor() {
        this.myCountryId = null;
        this.isGameActive = false;
        this.gameSpeed = 1;
        this.gameDate = new Date(1936, 0, 1);
        this.days = 0;
        
        this.equipment = 5000;
        this.manpower = 500000;
        this.maxManpower = 500000;
        this.factories = 0;
        
        // Глобальные технологии (для совместимости)
        this.tech = { industry: 1, infantry: 1, tank: 1 };
        
        // Технологии по странам
        this.countryTech = new Map();
        this.countryResearch = new Map();
        
        this.wars = [];
        this.alliances = [];
        this.vassals = {}; // { overlordId: [vassalId, ...] }
        this.warStartCells = {}; // { countryId: originalCellCount }
        this.warOriginalCells = {};
        this.warInvitations = []; // [{ from, enemy, time }]
        this.ideologyChange = null;
        this.justifications = null; // { target, daysLeft, totalDays }
        
        this.activeFocus = null;
        this.completedFocuses = new Set();
        
        this.selectedUnitId = null;
        this.activeBattles = [];

        // Очереди производства игрока
        // { x, y, type, daysLeft, totalDays }
        this.trainingQueue    = [];
        // { x, y, buildingType, daysLeft, totalDays }
        this.constructionQueue = [];
    }
    
    advanceDay() {
        this.gameDate.setDate(this.gameDate.getDate() + 1);
        this.days++;
    }
    
    getDateString() {
        const months = ["ЯНВ", "ФЕВ", "МАР", "АПР", "МАЙ", "ИЮН", "ИЮЛ", "АВГ", "СЕН", "ОКТ", "НОЯ", "ДЕК"];
        return `${this.gameDate.getDate()} ${months[this.gameDate.getMonth()]} ${this.gameDate.getFullYear()}`;
    }
    
    setGameSpeed(speed) {
        this.gameSpeed = speed;
    }
    
    isAtWar(c1, c2) {
        return this.wars.some(w => (w.a === c1 && w.b === c2) || (w.b === c1 && w.a === c2));
    }
    
    areAllies(c1, c2) {
        if (c1 === c2) return true;
        return this.alliances.some(a => a.has(c1) && a.has(c2));
    }
    
    addWar(a, b, world) {
        if (this.isAtWar(a, b)) return;

        this.wars.push({ a, b });
        if (world) {
            if (!this.warStartCells[a]) this.warStartCells[a] = world.getCountryCells(a).size;
            if (!this.warStartCells[b]) this.warStartCells[b] = world.getCountryCells(b).size;
            if (!this.warOriginalCells) this.warOriginalCells = {};
            if (!this.warOriginalCells[b]) this.warOriginalCells[b] = Array.from(world.getCountryCells(b));
        }

        // Вассалы лорда вступают в войну (НО не против своего лорда)
        for (const lord of [a, b]) {
            const vassals = this.getVassals(lord);
            for (const v of vassals) {
                const enemy = lord === a ? b : a;
                // Вассал не воюет со своим лордом
                if (enemy === lord) continue;
                if (!this.isAtWar(v, enemy)) {
                    this.wars.push({ a: v, b: enemy });
                    if (world) {
                        if (!this.warStartCells[v]) this.warStartCells[v] = world.getCountryCells(v).size;
                        if (!this.warStartCells[enemy]) this.warStartCells[enemy] = world.getCountryCells(enemy).size;
                    }
                }
            }
        }

        // Приглашение игроку — только если союзник воюет и враг не игрок и не вассал игрока
        const my = this.myCountryId;
        if (my && a !== my && b !== my) {
            for (const side of [a, b]) {
                const enemy = side === a ? b : a;
                if (this.areAllies(my, side) && !this.isAtWar(my, enemy)) {
                    var myVassals = this.getVassals(my);
                    if (myVassals.indexOf(enemy) === -1) {
                        // Проверяем отклонённые — повторяем через 30 дней
                        var declined = this._declinedInvites || {};
                        var lastDeclined = declined[enemy];
                        if (!lastDeclined || this.days >= lastDeclined) {
                            this.warInvitations.push({ from: side, enemy: enemy, time: Date.now() });
                        }
                    }
                    }
                }
            }
        }
    }

    getWarProgress(enemyId, world) {
        var start = this.warStartCells[enemyId];
        if (!start || start === 0) return 0;
        var current = world ? world.getCountryCells(enemyId).size : start;
        var lost = start - current;
        return Math.max(0, Math.min(100, Math.floor((lost / start) * 100)));
    }

    updateWarSnapshots(world) {
        if (!world) return;
        for (var i = 0; i < this.wars.length; i++) {
            var w = this.wars[i];
            if (!this.warStartCells[w.a]) this.warStartCells[w.a] = world.getCountryCells(w.a).size;
            if (!this.warStartCells[w.b]) this.warStartCells[w.b] = world.getCountryCells(w.b).size;
        }
    }

    getCapitulationThreshold(ideology) {
        if (ideology === 'Фашизм' || ideology === 'Коммунизм') return 95;
        if (ideology === 'Нейтралитет') return 80;
        return 70; // Демократия
    }
    
    addAlliance(a, b) {
        if (!this.areAllies(a, b)) {
            this.alliances.push(new Set([a, b]));
        }
    }

    addVassal(overlord, vassal) {
        if (!this.vassals[overlord]) this.vassals[overlord] = [];
        if (!this.vassals[overlord].includes(vassal)) {
            this.vassals[overlord].push(vassal);
        }
    }

    removeVassal(overlord, vassal) {
        if (this.vassals[overlord]) {
            this.vassals[overlord] = this.vassals[overlord].filter(function(v) { return v !== vassal; });
            if (this.vassals[overlord].length === 0) delete this.vassals[overlord];
        }
    }

    getVassals(countryId) {
        return this.vassals[countryId] || [];
    }

    getOverlord(countryId) {
        for (var overlord in this.vassals) {
            if (this.vassals[overlord].indexOf(countryId) !== -1) return overlord;
        }
        return null;
    }

    isVassal(countryId) {
        return this.getOverlord(countryId) !== null;
    }
    
    serialize() {
        return {
            myCountryId: this.myCountryId,
            isGameActive: this.isGameActive,
            gameSpeed: this.gameSpeed,
            gameDate: this.gameDate.toISOString(),
            days: this.days,
            equipment: this.equipment,
            manpower: this.manpower,
            maxManpower: this.maxManpower,
            factories: this.factories,
            tech: { ...this.tech },
            countryTech: Array.from(this.countryTech.entries()),
            countryResearch: Array.from(this.countryResearch.entries()),
            wars: [...this.wars],
            alliances: this.alliances.map(a => [...a]),
            vassals: { ...this.vassals },
            warStartCells: { ...this.warStartCells },
            warOriginalCells: this.warOriginalCells || {},
            warInvitations: this.warInvitations || [],
            activeFocus: this.activeFocus ? { ...this.activeFocus } : null,
            completedFocuses: [...this.completedFocuses],
            selectedUnitId: this.selectedUnitId,
            activeBattles: this.activeBattles.map(b => ({ ...b })),
            trainingQueue: this.trainingQueue.map(q => ({ ...q })),
            constructionQueue: this.constructionQueue.map(q => ({ ...q })),
            autosave: this.autosave,
            ideologyChange: this.ideologyChange,
            justifications: this.justifications,
        };
    }

    deserialize(data) {
        this.myCountryId = data.myCountryId;
        this.isGameActive = data.isGameActive;
        this.gameSpeed = data.gameSpeed;
        this.gameDate = new Date(data.gameDate);
        this.days = data.days;
        this.equipment = data.equipment;
        this.manpower = data.manpower;
        this.maxManpower = data.maxManpower || data.manpower;
        this.factories = data.factories;
        this.tech = data.tech || { industry: 1, infantry: 1, tank: 1 };
        this.countryTech = new Map(data.countryTech || []);
        this.countryResearch = new Map(data.countryResearch || []);
        this.wars = data.wars || [];
        this.alliances = (data.alliances || []).map(a => new Set(a));
        this.vassals = data.vassals || {};
        this.warStartCells = data.warStartCells || {};
        this.warOriginalCells = data.warOriginalCells || {};
        this.warInvitations = data.warInvitations || [];
        this.activeFocus = data.activeFocus;
        this.completedFocuses = new Set(data.completedFocuses || []);
        this.selectedUnitId = data.selectedUnitId;
        this.activeBattles = data.activeBattles || [];
        this.trainingQueue = data.trainingQueue || [];
        this.constructionQueue = data.constructionQueue || [];
        this.autosave = data.autosave !== undefined ? data.autosave : true;
        this.ideologyChange = data.ideologyChange || null;
        this.justifications = data.justifications || null;
        this._capitulationPending = false;
    }
}
