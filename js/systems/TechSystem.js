// TechSystem.js — Система исследований

import { addNotification } from '../utils/helpers.js';

export class TechSystem {
    constructor(gameState) {
        this.gameState = gameState;
        this.RESEARCH_DURATION = 100;
    }
    
    canResearch(techType, level) {
        const current = this.gameState.tech[techType];
        if (current >= level) return false;
        if (current + 1 !== level) return false;
        if (this.gameState.activeResearch !== null) return false;
        return true;
    }
    
    startResearch(techType, level) {
        if (!this.canResearch(techType, level)) return false;
        
        this.gameState.activeResearch = {
            type: techType,
            level: level,
            daysLeft: this.RESEARCH_DURATION
        };
        
        addNotification(`🔬 Исследование ${techType} ур.${level} начато!`, 'info');
        return true;
    }
    
    update() {
        const active = this.gameState.activeResearch;
        if (!active) return;
        
        active.daysLeft--;
        
        if (active.daysLeft <= 0) {
            this.gameState.tech[active.type] = active.level;
            this.gameState.activeResearch = null;
            addNotification(`✅ ${active.type} уровень ${active.level} изучен!`, 'info');
        }
    }
}
