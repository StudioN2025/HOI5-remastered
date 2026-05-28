// FocusSystem.js — Система национальных фокусов

export class FocusSystem {
    constructor(gameState, world, entities) {
        this.gameState = gameState;
        this.world = world;
        this.entities = entities;
        this.FOCUS_DURATION = 70;
    }
    
    getAvailableFocuses() {
        const focuses = this.getFocusesForCountry();
        const completed = this.gameState.completedFocuses;
        
        return focuses.filter(f => !completed.has(f.id) && this.checkPrerequisites(f.id));
    }
    
    startFocus(focusId) {
        const focuses = this.getFocusesForCountry();
        const focus = focuses.find(f => f.id === focusId);
        
        if (!focus) return false;
        if (this.gameState.completedFocuses.has(focus.id)) return false;
        if (this.gameState.activeFocus) return false;
        if (!this.checkPrerequisites(focusId)) return false;
        
        this.gameState.activeFocus = {
            ...focus,
            daysLeft: this.FOCUS_DURATION
        };
        
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
        
        switch(focus.id) {
            case 'ger_rearm':
                this.gameState.equipment += 1000;
                break;
            case 'ger_danzig':
                this.gameState.addWar(myId, 'poland');
                break;
            case 'ger_axis':
                this.gameState.addAlliance(myId, 'italy');
                this.gameState.addAlliance(myId, 'hungary');
                break;
            case 'ussr_five_year':
                // Добавить заводы
                break;
            case 'ussr_fin_war':
                this.gameState.addWar(myId, 'finland');
                break;
        }
    }
    
    getFocusesForCountry() {
        const focuses = {
            germany: [
                { id: 'ger_rearm', name: 'Перевооружение', desc: '+1000 снаряжения', prereqs: [] },
                { id: 'ger_danzig', name: 'Данциг или война', desc: 'Война с Польшей', prereqs: ['ger_rearm'] },
                { id: 'ger_axis', name: 'Создать Ось', desc: 'Альянс с Италией', prereqs: ['ger_rearm'] },
                { id: 'ger_west', name: 'Западный поход', desc: 'Война с Францией', prereqs: ['ger_rearm'] }
            ],
            ussr: [
                { id: 'ussr_five_year', name: 'Пятилетний план', desc: '+5 заводов', prereqs: [] },
                { id: 'ussr_fin_war', name: 'Зимняя война', desc: 'Война с Финляндией', prereqs: ['ussr_five_year'] }
            ]
        };
        
        return focuses[this.gameState.myCountryId] || [];
    }
    
    checkPrerequisites(focusId) {
        const focuses = this.getFocusesForCountry();
        const focus = focuses.find(f => f.id === focusId);
        if (!focus || focus.prereqs.length === 0) return true;
        
        return focus.prereqs.every(prereq => this.gameState.completedFocuses.has(prereq));
    }
}
