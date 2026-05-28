// GameState.js — Центральное состояние игры

export class GameState {
    constructor() {
        this.myCountryId = null;
        this.isGameActive = false;
        this.gameSpeed = 1;
        this.gameDate = new Date(1936, 0, 1);
        this.days = 0;
        
        // Ресурсы
        this.equipment = 1000;
        this.manpower = 500000;
        this.factories = 0;
        
        // Технологии
        this.tech = { industry: 1, infantry: 1, tank: 1 };
        
        // Дипломатия
        this.wars = []; // { a, b }
        this.alliances = []; // Set()
        
        // Фокусы
        this.activeFocus = null;
        this.completedFocuses = new Set();
        
        // Активный юнит
        this.selectedUnitId = null;
        
        // Активные бои
        this.activeBattles = [];
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
    
    addWar(a, b) {
        if (!this.isAtWar(a, b)) {
            this.wars.push({ a, b });
        }
    }
    
    addAlliance(a, b) {
        if (!this.areAllies(a, b)) {
            this.alliances.push(new Set([a, b]));
        }
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
            factories: this.factories,
            tech: { ...this.tech },
            wars: [...this.wars],
            alliances: this.alliances.map(a => [...a]),
            activeFocus: this.activeFocus ? { ...this.activeFocus } : null,
            completedFocuses: [...this.completedFocuses],
            selectedUnitId: this.selectedUnitId
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
        this.factories = data.factories;
        this.tech = data.tech;
        this.wars = data.wars;
        this.alliances = data.alliances.map(a => new Set(a));
        this.activeFocus = data.activeFocus;
        this.completedFocuses = new Set(data.completedFocuses);
        this.selectedUnitId = data.selectedUnitId;
    }
}
