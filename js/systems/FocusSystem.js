// FocusSystem.js — Дерево фокусов как в HOI4

import { addNotification } from '../utils/helpers.js';

// Дерево фокусов: id → { name, desc, icon, branch, tier, prereqs, effect }
export const FOCUS_TREE = {
    // ═══════════════════════════ ГЕРМАНИЯ ═══════════════════════════
    ger_rearm:      { id: 'ger_rearm', name: 'Перевооружение', desc: '+1000 снаряжения', icon: '🔫', country: 'germany', branch: 'military', tier: 0, prereqs: [], effect: { equipment: 1000 } },
    ger_danzig:     { id: 'ger_danzig', name: 'Данциг или война', desc: 'Война с Польшей', icon: '⚔️', country: 'germany', branch: 'military', tier: 1, prereqs: ['ger_rearm'], effect: { war: 'poland' } },
    ger_west:       { id: 'ger_west', name: 'Западный поход', desc: 'Война с Францией', icon: '🗺️', country: 'germany', branch: 'military', tier: 2, prereqs: ['ger_danzig'], effect: { war: 'france' } },
    ger_axis:       { id: 'ger_axis', name: 'Создать Ось', desc: 'Альянс с Италией', icon: '🤝', country: 'germany', branch: 'diplomacy', tier: 0, prereqs: [], effect: { allies: ['italy', 'hungary'] } },
    ger_east:       { id: 'ger_east', name: 'Восточный поход', desc: 'Война с СССР', icon: '💀', country: 'germany', branch: 'military', tier: 3, prereqs: ['ger_west'], effect: { war: 'ussr' } },
    ger_industry:   { id: 'ger_industry', name: 'Военная промышленность', desc: '+5 заводов', icon: '🏭', country: 'germany', branch: 'economy', tier: 0, prereqs: [], effect: { factories: 5 } },
    ger_tanks:      { id: 'ger_tanks', name: 'Танковая программа', desc: '+3 танка', icon: '🚜', country: 'germany', branch: 'military', tier: 1, prereqs: ['ger_rearm'], effect: { tanks: 3 } },

    // ═══════════════════════════ СССР ═══════════════════════════
    ussr_five_year: { id: 'ussr_five_year', name: 'Пятилетний план', desc: '+5 заводов', icon: '🏭', country: 'ussr', branch: 'economy', tier: 0, prereqs: [], effect: { factories: 5 } },
    ussr_industry:  { id: 'ussr_industry', name: 'Индустриализация', desc: '+10 заводов, +3000 снаряж.', icon: '⚙️', country: 'ussr', branch: 'economy', tier: 1, prereqs: ['ussr_five_year'], effect: { factories: 10, equipment: 3000 } },
    ussr_army:      { id: 'ussr_army', name: 'Красная Армия', desc: '+6 дивизий', icon: '🛡️', country: 'ussr', branch: 'military', tier: 0, prereqs: [], effect: { infantry: 6 } },
    ussr_baltic:    { id: 'ussr_baltic', name: 'Прибалтика', desc: 'Аннексия Прибалтики', icon: '🤝', country: 'ussr', branch: 'diplomacy', tier: 0, prereqs: [], effect: { annex: ['lithuania', 'latvia', 'estonia'] } },
    ussr_fin_war:   { id: 'ussr_fin_war', name: 'Зимняя война', desc: 'Война с Финляндией', icon: '❄️', country: 'ussr', branch: 'military', tier: 1, prereqs: ['ussr_army'], effect: { war: 'finland' } },
    ussr_defense:   { id: 'ussr_defense', name: 'Великая Отечественная', desc: '+6 дивизий, +2000 снаряж.', icon: '💪', country: 'ussr', branch: 'military', tier: 2, prereqs: ['ussr_fin_war'], effect: { infantry: 6, equipment: 2000 } },
    ussr_tanks:     { id: 'ussr_tanks', name: 'Танковая программа', desc: '+4 танка', icon: '🚜', country: 'ussr', branch: 'military', tier: 1, prereqs: ['ussr_five_year'], effect: { tanks: 4 } },

    // ═══════════════════════════ ФРАНЦИЯ ═══════════════════════════
    fra_maginot:    { id: 'fra_maginot', name: 'Линия Мажино', desc: '+3 завода', icon: '🏰', country: 'france', branch: 'economy', tier: 0, prereqs: [], effect: { factories: 3 } },
    fra_colonies:   { id: 'fra_colonies', name: 'Колониальная мобилизация', desc: '+5 дивизий', icon: '🌍', country: 'france', branch: 'military', tier: 0, prereqs: [], effect: { infantry: 5 } },
    fra_allies:     { id: 'fra_allies', name: 'Антанта', desc: 'Альянс с UK и Польшей', icon: '🤝', country: 'france', branch: 'diplomacy', tier: 1, prereqs: ['fra_maginot', 'fra_colonies'], effect: { allies: ['uk', 'poland'] } },
    fra_revanche:   { id: 'fra_revanche', name: 'Реванш', desc: 'Война с Германией', icon: '⚔️', country: 'france', branch: 'military', tier: 2, prereqs: ['fra_allies'], effect: { war: 'germany' } },

    // ═══════════════════════════ ВЕЛИКОБРИТАНИЯ ═══════════════════════════
    uk_navy:        { id: 'uk_navy', name: 'Владычица морей', desc: '+3 порта, +1000 снаряж.', icon: '⚓', country: 'uk', branch: 'economy', tier: 0, prereqs: [], effect: { ports: 3, equipment: 1000 } },
    uk_empire:      { id: 'uk_empire', name: 'Имперская конференция', desc: '+5 заводов, +2000 снаряж.', icon: '👑', country: 'uk', branch: 'economy', tier: 0, prereqs: [], effect: { factories: 5, equipment: 2000 } },
    uk_guarantee:   { id: 'uk_guarantee', name: 'Гарантии Польше', desc: 'Альянс с Польшей', icon: '📜', country: 'uk', branch: 'diplomacy', tier: 1, prereqs: ['uk_navy'], effect: { allies: ['poland'] } },
    uk_raf:         { id: 'uk_raf', name: 'Королевские ВВС', desc: '+4 дивизии, +1000 снаряж.', icon: '✈️', country: 'uk', branch: 'military', tier: 1, prereqs: ['uk_empire'], effect: { infantry: 4, equipment: 1000 } },
    uk_defense:     { id: 'uk_defense', name: 'Оборона Островов', desc: '+3 танка', icon: '🛡️', country: 'uk', branch: 'military', tier: 2, prereqs: ['uk_raf'], effect: { tanks: 3 } },

    // ═══════════════════════════ ИТАЛИЯ ═══════════════════════════
    ita_navy:       { id: 'ita_navy', name: 'Развитие флота', desc: '+2 порта', icon: '⚓', country: 'italy', branch: 'economy', tier: 0, prereqs: [], effect: { ports: 2 } },
    ita_empire:     { id: 'ita_empire', name: 'Итальянская империя', desc: '+1000 снаряж., +2 танка', icon: '👑', country: 'italy', branch: 'military', tier: 0, prereqs: [], effect: { equipment: 1000, tanks: 2 } },
    ita_revive:     { id: 'ita_revive', name: 'Возродить Рим', desc: 'Война с Югославией и Грецией', icon: '🏛️', country: 'italy', branch: 'military', tier: 1, prereqs: ['ita_empire'], effect: { war: 'yugoslavia' } },
    ita_allies:     { id: 'ita_allies', name: 'Средиземноморский союз', desc: 'Альянс с Испанией', icon: '🤝', country: 'italy', branch: 'diplomacy', tier: 1, prereqs: ['ita_navy'], effect: { allies: ['spain'] } },

    // ═══════════════════════════ ПОЛЬША ═══════════════════════════
    pol_army:       { id: 'pol_army', name: 'Модернизация армии', desc: '+3 дивизии', icon: '💂', country: 'poland', branch: 'military', tier: 0, prereqs: [], effect: { infantry: 3 } },
    pol_industry:   { id: 'pol_industry', name: 'Промышленный округ', desc: '+3 завода', icon: '🏭', country: 'poland', branch: 'economy', tier: 0, prereqs: [], effect: { factories: 3 } },
    pol_allies:     { id: 'pol_allies', name: 'Союзники', desc: 'Альянс с Францией и UK', icon: '🤝', country: 'poland', branch: 'diplomacy', tier: 1, prereqs: ['pol_army', 'pol_industry'], effect: { allies: ['france', 'uk'] } },
    pol_defense:    { id: 'pol_defense', name: 'План обороны', desc: '+2 танка', icon: '🛡️', country: 'poland', branch: 'military', tier: 1, prereqs: ['pol_army'], effect: { tanks: 2 } },
};

export class FocusSystem {
    constructor(gameState, world, entities) {
        this.gameState = gameState;
        this.world = world;
        this.entities = entities;
        this.FOCUS_DURATION = 70;
    }

    getFocusesForCountry(countryId) {
        const id = countryId || this.gameState.myCountryId;
        return Object.values(FOCUS_TREE).filter(f => f.country === id);
    }

    getAvailableFocuses() {
        const focuses = this.getFocusesForCountry();
        const completed = this.gameState.completedFocuses || new Set();
        return focuses.filter(f => !completed.has(f.id) && this.checkPrerequisites(f.id));
    }

    checkPrerequisites(focusId) {
        const focus = FOCUS_TREE[focusId];
        if (!focus) return false;
        if (!focus.prereqs || focus.prereqs.length === 0) return true;
        const completed = this.gameState.completedFocuses || new Set();
        return focus.prereqs.every(p => completed.has(p));
    }

    startFocus(focusId) {
        const focus = FOCUS_TREE[focusId];
        if (!focus) return false;
        const completed = this.gameState.completedFocuses || new Set();
        if (completed.has(focus.id)) return false;
        if (this.gameState.activeFocus) return false;
        if (!this.checkPrerequisites(focusId)) return false;

        this.gameState.activeFocus = { ...focus, daysLeft: this.FOCUS_DURATION };
        addNotification(`⭐ Фокус "${focus.name}" начат!`, 'info');
        return true;
    }

    update() {
        const active = this.gameState.activeFocus;
        if (!active) return;
        active.daysLeft--;
        if (active.daysLeft <= 0) {
            this.applyFocusEffect(active);
            this.gameState.completedFocuses.add(active.id);
            this.gameState.activeFocus = null;
            addNotification(`✅ Фокус "${active.name}" завершён!`, 'info');
        }
    }

    applyFocusEffect(focus) {
        const myId = this.gameState.myCountryId;
        const eff = focus.effect;
        if (!eff) return;

        if (eff.equipment) this.gameState.equipment += eff.equipment;
        if (eff.factories) this.addFactories(eff.factories);
        if (eff.ports) this.addPorts(eff.ports);
        if (eff.war) this.gameState.addWar(myId, eff.war);
        if (eff.allies) eff.allies.forEach(a => this.gameState.addAlliance(myId, a));
        if (eff.annex) {
            for (const c of eff.annex) {
                const cells = this.world.getCountryCells(c);
                for (const cell of cells) {
                    const [x, y] = cell.split(',').map(Number);
                    this.world.setCell(x, y, myId);
                }
            }
        }
        if (eff.infantry) {
            for (let i = 0; i < eff.infantry; i++) {
                const cells = Array.from(this.world.getCountryCells(myId));
                if (cells.length > 0) {
                    const [x, y] = cells[0].split(',').map(Number);
                    this.entities.createEntity(myId, 0, x + i, y);
                }
            }
        }
        if (eff.tanks) {
            for (let i = 0; i < eff.tanks; i++) {
                const cells = Array.from(this.world.getCountryCells(myId));
                if (cells.length > 0) {
                    const [x, y] = cells[0].split(',').map(Number);
                    this.entities.createEntity(myId, 1, x + i, y);
                }
            }
        }
    }

    addFactories(count) {
        const myId = this.gameState.myCountryId;
        const cells = Array.from(this.world.getCountryCells(myId));
        let added = 0;
        for (const cell of cells) {
            if (added >= count) break;
            const [x, y] = cell.split(',').map(Number);
            if (!this.world.hasBuilding(x, y, 'factory')) {
                this.world.addBuilding(x, y, 'factory');
                added++;
            }
        }
    }

    addPorts(count) {
        const myId = this.gameState.myCountryId;
        const cells = Array.from(this.world.getCountryCells(myId));
        let added = 0;
        for (const cell of cells) {
            if (added >= count) break;
            const [x, y] = cell.split(',').map(Number);
            if (this._isCoastal(x, y) && !this.world.hasBuilding(x, y, 'port')) {
                this.world.addBuilding(x, y, 'port');
                added++;
            }
        }
    }

    _isCoastal(x, y) {
        for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
            if (this.world.getCell(x + dx, y + dy) === 0) return true;
        }
        return false;
    }
}

