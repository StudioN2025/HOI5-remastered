// military.js (исправленная версия)
import { getUnits, setUnits, getMyCountryId, getWars } from './game.js';
import { UNIT_STATS } from './data.js';
import { isAtWar, addNotification } from './utils.js';
import { renderMap } from './map.js';

export function setSelectedUnitId(id) {
    window.selectedUnitId = id;
}

export function moveUnit(unitId, targetPos) {
    const units = getUnits();
    const unit = units.find(u => u.id === unitId);
    if (!unit) return false;
    
    const [sx, sy] = unit.pos.split(',').map(Number);
    const [tx, ty] = targetPos.split(',').map(Number);
    
    let path = [];
    let cx = sx, cy = sy;
    let steps = 0;
    const maxSteps = 50;
    
    while ((cx !== tx || cy !== sy) && steps < maxSteps) {
        if (cx < tx) cx++;
        else if (cx > tx) cx--;
        if (cy < ty) cy++;
        else if (cy > ty) cy--;
        path.push(`${cx},${cy}`);
        steps++;
    }
    
    unit.path = path;
    setUnits(units);
    renderMap();
    return true;
}

export function startRecruitment(unitType, posKey) {
    const myCountryId = getMyCountryId();
    const units = getUnits();
    const stats = UNIT_STATS[unitType];
    
    if (!stats) return false;
    
    // Проверка ресурсов
    const resources = window.getPlayerResources?.() || { equipment: 0, manpower: 0 };
    if (resources.equipment < stats.costEquipment || resources.manpower < stats.costManpower) {
        addNotification('Недостаточно ресурсов для найма!', 'war');
        return false;
    }
    
    // Списание ресурсов
    resources.equipment -= stats.costEquipment;
    resources.manpower -= stats.costManpower;
    if (window.setPlayerResources) window.setPlayerResources(resources);
    
    // Создание юнита
    const newUnit = {
        id: `unit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: unitType,
        owner: myCountryId,
        pos: posKey,
        hp: stats.hp,
        trainingDaysLeft: 30,
        path: []
    };
    
    units.push(newUnit);
    setUnits(units);
    
    addNotification(`${stats.icon} ${stats.name} начал тренировку!`, 'info');
    return true;
}

export function processCombat() {
    const units = getUnits();
    const wars = getWars();
    let battles = [];
    
    // Находим коллизии
    for (let i = 0; i < units.length; i++) {
        for (let j = i + 1; j < units.length; j++) {
            if (units[i].pos === units[j].pos && units[i].owner !== units[j].owner) {
                if (isAtWar(units[i].owner, units[j].owner, wars)) {
                    battles.push([units[i], units[j]]);
                }
            }
        }
    }
    
    // Обрабатываем бои
    battles.forEach(([a, b]) => {
        const aStats = UNIT_STATS[a.type];
        const bStats = UNIT_STATS[b.type];
        
        if (!aStats || !bStats) return;
        
        // Урон
        const aDamage = Math.max(1, Math.floor(aStats.attack * (Math.random() * 0.5 + 0.5)));
        const bDamage = Math.max(1, Math.floor(bStats.attack * (Math.random() * 0.3 + 0.3)));
        
        a.hp = (a.hp || aStats.hp) - bDamage;
        b.hp = (b.hp || bStats.hp) - aDamage;
        
        addNotification(`⚔️ Бой: ${aStats.name} vs ${bStats.name}!`, 'war');
        
        // Смерть
        if (a.hp <= 0) {
            setUnits(units.filter(u => u.id !== a.id));
            addNotification(`${aStats.name} уничтожена!`, 'war');
        }
        if (b.hp <= 0) {
            setUnits(units.filter(u => u.id !== b.id));
            addNotification(`${bStats.name} уничтожена!`, 'war');
        }
    });
    
    // Движение юнитов
    const myId = getMyCountryId();
    units.forEach(u => {
        if (u.path && u.path.length > 0) {
            if (!u.moveCooldown) u.moveCooldown = 0;
            u.moveCooldown++;
            if (u.moveCooldown >= 2) {
                u.moveCooldown = 0;
                const next = u.path[0];
                const gridData = window._gridData || {};
                
                if (!gridData[next]) return;
                
                if (isAtWar(u.owner, gridData[next], wars)) {
                    u.path.shift();
                    gridData[next] = u.owner;
                    u.pos = next;
                    window._gridData = gridData;
                } else if (gridData[next] === u.owner) {
                    u.path.shift();
                    u.pos = next;
                } else {
                    u.path = [];
                }
            }
        }
    });
    
    // Регенерация
    units.forEach(u => {
        const stats = UNIT_STATS[u.type];
        if (stats && u.hp < stats.hp && u.owner === myId) {
            u.hp = Math.min(stats.hp, u.hp + 1);
        }
    });
    
    setUnits(units);
    renderMap();
}
