// CombatSystem.js — Боевая система (исправлена)

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
        
        // Находим все столкновения (юниты на одной клетке или соседних)
        for (let i = 1; i < units.nextId; i++) {
            if (!units.active[i]) continue;
            
            for (let j = i + 1; j < units.nextId; j++) {
                if (!units.active[j]) continue;
                
                // Проверяем расстояние (в одной клетке или соседних)
                const dx = units.x[i] - units.x[j];
                const dy = units.y[i] - units.y[j];
                const dist = Math.abs(dx) + Math.abs(dy);
                
                // Бой если на одной клетке или соседних (дистанция 0 или 1)
                if (dist <= 1 && units.owner[i] !== units.owner[j]) {
                    if (this.gameState.isAtWar(units.owner[i], units.owner[j])) {
                        // Проверяем не в бою ли уже
                        const alreadyFighting = this.gameState.activeBattles.some(b => 
                            (b.a === i && b.b === j) || (b.a === j && b.b === i)
                        );
                        
                        if (!alreadyFighting) {
                            battles.push({ a: i, b: j });
                            units.inCombat[i] = 1;
                            units.inCombat[j] = 1;
                        }
                    }
                }
            }
        }
        
        // Добавляем новые бои
        for (const battle of battles) {
            this.gameState.activeBattles.push({
                a: battle.a,
                b: battle.b,
                counter: 0
            });
            
            if (units.owner[battle.a] === this.gameState.myCountryId ||
                units.owner[battle.b] === this.gameState.myCountryId) {
                addNotification(`⚔️ Бой между ${units.owner[battle.a]} и ${units.owner[battle.b]}!`, 'war');
            }
        }
        
        // Обрабатываем текущие бои
        this.processBattles();
    }
    
    processBattles() {
        const units = this.entities;
        const newBattles = [];
        
        for (const battle of this.gameState.activeBattles) {
            const attacker = battle.a;
            const defender = battle.b;
            
            // Проверяем что оба юнита ещё живы
            if (!units.active[attacker] || !units.active[defender]) {
                if (units.active[attacker]) units.inCombat[attacker] = 0;
                if (units.active[defender]) units.inCombat[defender] = 0;
                continue;
            }
            
            // Проверяем что они всё ещё рядом
            const dx = units.x[attacker] - units.x[defender];
            const dy = units.y[attacker] - units.y[defender];
            const dist = Math.abs(dx) + Math.abs(dy);
            
            if (dist > 1) {
                units.inCombat[attacker] = 0;
                units.inCombat[defender] = 0;
                continue;
            }
            
            // Увеличиваем счётчик боя
            battle.counter++;
            
            // Наносим урон раз в 2 дня
            if (battle.counter >= 2) {
                battle.counter = 0;
                
                // Характеристики
                const aType = units.type[attacker];
                const bType = units.type[defender];
                
                let aAttack = aType === 0 ? 10 : 45;
                let aDefense = aType === 0 ? 25 : 15;
                let bAttack = bType === 0 ? 10 : 45;
                let bDefense = bType === 0 ? 25 : 15;
                
                // Бонус от технологий
                const techBonus = (this.gameState.tech?.infantry || 1) * 0.05;
                if (aType === 0) {
                    aAttack = Math.floor(aAttack * (1 + techBonus));
                    aDefense = Math.floor(aDefense * (1 + techBonus));
                } else {
                    const tankBonus = (this.gameState.tech?.tank || 1) * 0.05;
                    aAttack = Math.floor(aAttack * (1 + tankBonus));
                }
                if (bType === 0) {
                    bAttack = Math.floor(bAttack * (1 + techBonus));
                    bDefense = Math.floor(bDefense * (1 + techBonus));
                } else {
                    const tankBonus = (this.gameState.tech?.tank || 1) * 0.05;
                    bAttack = Math.floor(bAttack * (1 + tankBonus));
                }
                
                // Броня
                const aArmor = aType === 0 ? 0 : 30;
                const bArmor = bType === 0 ? 0 : 30;
                
                // Урон
                let aDamage = Math.max(2, Math.floor(aAttack - bDefense * 0.3));
                let bDamage = Math.max(2, Math.floor(bAttack - aDefense * 0.3));
                
                // Броня снижает урон
                aDamage = Math.max(1, Math.floor(aDamage * (1 - bArmor / 150)));
                bDamage = Math.max(1, Math.floor(bDamage * (1 - aArmor / 150)));
                
                // Случайность ±20%
                aDamage = Math.floor(aDamage * (0.8 + Math.random() * 0.4));
                bDamage = Math.floor(bDamage * (0.8 + Math.random() * 0.4));
                
                // Наносим урон
                const aDied = units.damage(attacker, aDamage);
                const bDied = units.damage(defender, bDamage);
                
                // Логирование
                if (aDied || bDied) {
                    if (units.owner[attacker] === this.gameState.myCountryId ||
                        units.owner[defender] === this.gameState.myCountryId) {
                        if (aDied) addNotification(`💀 ${units.owner[attacker]} юнит уничтожен!`, 'war');
                        if (bDied) addNotification(`💀 ${units.owner[defender]} юнит уничтожен!`, 'war');
                    }
                }
                
                // Если кто-то умер, выводим из боя
                if (aDied || bDied) {
                    if (aDied) units.inCombat[attacker] = 0;
                    if (bDied) units.inCombat[defender] = 0;
                    continue;
                }
            }
            
            newBattles.push(battle);
        }
        
        this.gameState.activeBattles = newBattles;
    }
    
    startCombat(attackerId, defenderId) {
        const units = this.entities;
        if (units.inCombat[attackerId] || units.inCombat[defenderId]) return false;
        
        // Проверяем что они рядом
        const dx = units.x[attackerId] - units.x[defenderId];
        const dy = units.y[attackerId] - units.y[defenderId];
        if (Math.abs(dx) + Math.abs(dy) > 1) return false;
        
        this.gameState.activeBattles.push({
            a: attackerId,
            b: defenderId,
            counter: 0
        });
        
        units.inCombat[attackerId] = 1;
        units.inCombat[defenderId] = 1;
        
        addNotification(`⚔️ Начался бой!`, 'war');
        return true;
    }
}
