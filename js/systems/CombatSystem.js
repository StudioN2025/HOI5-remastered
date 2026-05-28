// CombatSystem.js — Боевая система

import { addNotification } from '../utils/helpers.js';

export class CombatSystem {
    constructor(world, entities, gameState) {
        this.world = world;
        this.entities = entities;
        this.gameState = gameState;
        this.battleCounter = 0;
    }
    
    update() {
        const units = this.entities;
        const battles = [];
        
        // Находим все столкновения
        for (let i = 1; i < units.nextId; i++) {
            if (!units.active[i]) continue;
            
            for (let j = i + 1; j < units.nextId; j++) {
                if (!units.active[j]) continue;
                
                const dx = units.x[i] - units.x[j];
                const dy = units.y[i] - units.y[j];
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist <= 1.5 && units.owner[i] !== units.owner[j]) {
                    if (this.gameState.isAtWar(units.owner[i], units.owner[j])) {
                        battles.push({ a: i, b: j });
                        units.inCombat[i] = 1;
                        units.inCombat[j] = 1;
                    }
                }
            }
        }
        
        // Обрабатываем бои
        for (const battle of battles) {
            this.resolveBattle(battle.a, battle.b);
        }
    }
    
    startCombat(attackerId, defenderId) {
        const units = this.entities;
        if (units.inCombat[attackerId] || units.inCombat[defenderId]) return;
        
        units.inCombat[attackerId] = 1;
        units.inCombat[defenderId] = 1;
        addNotification(`⚔️ Начался бой!`, 'war');
    }
    
    resolveBattle(a, b) {
        const units = this.entities;
        
        const aAttack = units.type[a] === 0 ? 10 : 45;
        const aDefense = units.type[a] === 0 ? 25 : 15;
        const bAttack = units.type[b] === 0 ? 10 : 45;
        const bDefense = units.type[b] === 0 ? 25 : 15;
        
        const aArmor = units.type[a] === 0 ? 0 : 30;
        const bArmor = units.type[b] === 0 ? 0 : 30;
        
        let aDamage = Math.max(2, Math.floor(aAttack - bDefense * 0.3));
        let bDamage = Math.max(2, Math.floor(bAttack - aDefense * 0.3));
        
        aDamage = Math.max(1, Math.floor(aDamage * (1 - bArmor / 150)));
        bDamage = Math.max(1, Math.floor(bDamage * (1 - aArmor / 150)));
        
        const aDied = units.damage(a, aDamage);
        const bDied = units.damage(b, bDamage);
        
        if (aDied) {
            units.inCombat[b] = 0;
            if (units.owner[b] === this.gameState.myCountryId) {
                addNotification(`✅ Наш юнит победил в бою!`, 'info');
            }
        }
        if (bDied) {
            units.inCombat[a] = 0;
            if (units.owner[a] === this.gameState.myCountryId) {
                addNotification(`✅ Наш юнит победил в бою!`, 'info');
            }
        }
    }
}
