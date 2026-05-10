import { CONFIG } from './config.js';
import { state } from './state.js';
import { getCellData } from './map.js';

export function getUnitStats() {
    const infLevel = state.tech.infantry;
    const infStatMult = 1 + (infLevel - 1) * 0.05;
    const infCostMult = 1 + (infLevel - 1) * 0.10;
    const tankStatMult = 1 + (state.tech.tank - 1) * 0.05;
    
    return {
        infantry: {
            name: `Пехота (Ур. ${infLevel})`, icon: "💂",
            costEquipment: Math.round(100 * infCostMult),
            costManpower: Math.round(1000 * infCostMult),
            attack: 10 * infStatMult,
            defense: 25 * infStatMult,
            hp: 100 * infStatMult,
            armor: 0,
            maintenance: 0.2 * infStatMult
        },
        tank: {
            name: `Танки (Ур. ${state.tech.tank})`, icon: "🚜",
            costEquipment: 800 * (1 + (state.tech.tank - 1) * 0.1),
            costManpower: 500,
            attack: 45 * tankStatMult,
            defense: 15 * tankStatMult,
            hp: 50 * tankStatMult,
            armor: 30 * tankStatMult,
            maintenance: 1.5
        }
    };
}

export function getBuildingStats() {
    return {
        factory: {
            name: "Военный завод", icon: "🏭",
            costEquipment: 500,
            description: "Увеличивает производство снаряжения"
        },
        port: {
            name: "Морской порт", icon: "⚓️",
            costEquipment: 300,
            description: "Позволяет перебрасывать войска"
        }
    };
}

export function isAtWar(c1, c2) {
    return state.wars.some(w => (w.a === c1 && w.b === c2) || (w.b === c1 && w.a === c2));
}

export function areAllies(c1, c2) {
    if (c1 === c2) return true;
    return state.alliances.some(alliance => alliance.has(c1) && alliance.has(c2));
}

export function renderUnits(ctx, cellSize) {
    // Оптимизация: кэшируем ссылки на функции и свойства
    const selectedId = state.selectedUnitId;
    const units = state.units;
    const activeBattles = state.activeBattles;
    const getStats = getUnitStats();
    
    units.forEach(u => {
        const [x, y] = u.pos.split(',').map(Number);
        
        if (u.id === selectedId) {
            ctx.strokeStyle = "#fbbf24";
            ctx.lineWidth = 2;
            ctx.strokeRect(x * cellSize - 2, y * cellSize - 2, cellSize + 4, cellSize + 4);
        }
        
        ctx.font = `${cellSize * 0.8}px serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        
        if (u.trainingDaysLeft > 0) {
            ctx.globalAlpha = 0.5;
            ctx.fillText("🛠", x * cellSize + cellSize / 2, y * cellSize + cellSize / 2);
            ctx.globalAlpha = 1;
        } else {
            ctx.fillText(getStats[u.type].icon, x * cellSize + cellSize / 2, y * cellSize + cellSize / 2);
        }
        
        // Полоска HP
        if (u.hp !== undefined) {
            const maxHp = getStats[u.type].hp;
            const hpWidth = cellSize * 0.6;
            const hpX = x * cellSize + cellSize/2 - hpWidth/2;
            const hpY = y * cellSize + cellSize - 3;
            ctx.fillStyle = 'red';
            ctx.fillRect(hpX, hpY, hpWidth, 3);
            ctx.fillStyle = 'green';
            ctx.fillRect(hpX, hpY, hpWidth * (u.hp / maxHp), 3);
        }
    });
    
    // Отрисовка боев
    activeBattles.forEach(battle => {
        const [ax, ay] = battle.attacker.pos.split(',').map(Number);
        const [dx, dy] = battle.defender.pos.split(',').map(Number);
        const midX = (ax + dx) / 2 * cellSize + cellSize / 2;
        const midY = (ay + dy) / 2 * cellSize + cellSize / 2;
        ctx.font = '20px serif';
        ctx.textAlign = 'center';
        ctx.fillText('⚔️', midX, midY);
    });
}

export function processCombat() {
    const unitStats = getUnitStats();
    
    state.activeBattles = state.activeBattles.filter(battle => {
        if (battle.attacker.hp <= 0 || battle.defender.hp <= 0) {
            if (battle.defender.hp <= 0) {
                state.gridData[battle.defender.pos] = battle.attacker.owner;
                battle.attacker.pos = battle.defender.pos;
                state.units = state.units.filter(u => u.id !== battle.defender.id);
            }
            return false;
        }
        
        battle.daysCounter++;
        if (battle.daysCounter >= 2) {
            battle.daysCounter = 0;
            const aStats = unitStats[battle.attacker.type];
            const dStats = unitStats[battle.defender.type];
            battle.defender.hp -= Math.max(1, aStats.attack * (Math.random() * 0.5 + 0.5));
            battle.attacker.hp -= Math.max(1, dStats.attack * 0.5);
        }
        return true;
    });
}

export function checkCapitulation(targetCountry, winnerCountry) {
    let cellCount = 0;
    for (const id of Object.values(state.gridData)) {
        if (id === targetCountry) cellCount++;
    }
    
    if (cellCount < 3) {
        for (const key of Object.keys(state.gridData)) { 
            if (state.gridData[key] === targetCountry) state.gridData[key] = winnerCountry; 
        }
        state.wars = state.wars.filter(w => w.a !== targetCountry && w.b !== targetCountry);
        state.units = state.units.filter(u => u.owner !== targetCountry);
    }
}
