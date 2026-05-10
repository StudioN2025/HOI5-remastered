import { getUnits, setUnits, getMyCountryId, getWars, isGameActive } from './game.js';
import { UNIT_STATS } from './data.js';
import { isAtWar, addNotification } from './utils.js';
import { renderMap } from './map.js';

let selectedUnitId = null;

export function getSelectedUnitId() { return selectedUnitId; }
export function setSelectedUnitId(id) { selectedUnitId = id; }

export function addUnit(unit) {
    const units = getUnits();
    units.push(unit);
    setUnits(units);
    renderMap();
}

export function removeUnit(id) {
    const units = getUnits();
    setUnits(units.filter(u => u.id !== id));
    renderMap();
}

export function moveUnit(unitId, targetPos) {
    const units = getUnits();
    const unit = units.find(u => u.id === unitId);
    if (!unit) return false;
    
    const [sx, sy] = unit.pos.split(',').map(Number);
    const [tx, ty] = targetPos.split(',').map(Number);
    
    let path = [];
    let cx = sx, cy = sy;
    while (cx !== tx || cy !== ty) {
        if (cx < tx) cx++;
        else if (cx > tx) cx--;
        if (cy < ty) cy++;
        else if (cy > ty) cy--;
        path.push(`${cx},${cy}`);
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
    
    units.push({
        id: Math.random().toString(36).substr(2, 9),
        pos: posKey,
        owner: myCountryId,
        type: unitType,
        trainingDaysLeft: 10,
        path: [],
        hp: stats.hp
    });
    
    setUnits(units);
    addNotification(`Дивизия ${stats.name} развернута!`, 'info');
    renderMap();
    return true;
}

export function processCombat() {
    const units = getUnits();
    const wars = getWars();
    let battles = [];
    
    // Находим коллизии
    for (let i = 0; i < units.length; i++) {
        for (let j = i + 1; j < units.length; j++) {
            if (units[i].pos === units[j].pos && isAtWar(units[i].owner, units[j].owner, wars)) {
                battles.push([units[i], units[j]]);
            }
        }
    }
    
    // Обрабатываем бои
    battles.forEach(([a, b]) => {
        const aStats = UNIT_STATS[a.type];
        const bStats = UNIT_STATS[b.type];
        
        // Урон
        a.hp = (a.hp || 100) - Math.max(1, bStats.attack * (Math.random() * 0.5 + 0.5));
        b.hp = (b.hp || 100) - Math.max(1, aStats.attack * (Math.random() * 0.5 + 0.5));
        
        addNotification(`⚔️ Бой между ${aStats.name} и ${bStats.name}!`, 'war');
        
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
    
    // Регенерация
    const myCountryId = getMyCountryId();
    units.forEach(u => {
        if (u.owner === myCountryId && u.hp < UNIT_STATS[u.type].hp) {
            u.hp = Math.min(UNIT_STATS[u.type].hp, u.hp + 2);
        }
    });
    
    setUnits(units);
    renderMap();
}