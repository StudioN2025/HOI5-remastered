// military.js — юниты, рекрутинг, бои

import { getUnits, setUnits, getMyCountryId, getWars, getPlayerResources, setPlayerResources, getActiveBattles, setActiveBattles, getGridData, setGridData, addUnit, removeUnit } from './game.js';
import { UNIT_STATS } from './data.js';
import { isAtWar, addNotification } from './utils.js';
import { renderMap } from './map.js';

let recruitMode = null;

export function setRecruitMode(type) {
    recruitMode = type;
}

export function getRecruitMode() {
    return recruitMode;
}

export function clearRecruitMode() {
    recruitMode = null;
    document.getElementById('recruit-hint')?.classList.add('hidden');
}

export function startRecruitment(unitType, posKey) {
    const myCountryId = getMyCountryId();
    const stats = UNIT_STATS[unitType];
    if (!stats) return false;

    const resources = getPlayerResources();
    if (resources.equipment < stats.costEquipment) {
        addNotification('Недостаточно снаряжения!', 'war');
        return false;
    }

    resources.equipment -= stats.costEquipment;
    setPlayerResources(resources);

    addUnit({
        pos: posKey,
        owner: myCountryId,
        type: unitType,
        hp: stats.hp,
        trainingDaysLeft: 10,
        path: []
    });

    addNotification(`${stats.icon} ${stats.name} начал тренировку!`, 'info');
    return true;
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

export function giveOrder(posKey, selectedUnitId) {
    if (!selectedUnitId) return;
    
    const units = getUnits();
    const unit = units.find(u => u.id === selectedUnitId);
    if (!unit) return;

    const gridData = getGridData();
    if (!gridData[posKey]) {
        addNotification('Юниты не могут ходить по воде!', 'war');
        return;
    }

    const [sx, sy] = unit.pos.split(',').map(Number);
    const [tx, ty] = posKey.split(',').map(Number);
    const distance = Math.sqrt(Math.pow(tx - sx, 2) + Math.pow(ty - sy, 2));

    // Морской десант
    const startCell = getCellData(unit.pos);
    const hasStartPort = startCell.buildings?.includes('port');
    const targetOwner = gridData[posKey];
    const isAtWarWithTarget = targetOwner && isAtWar(unit.owner, targetOwner, getWars());

    if (hasStartPort && isAtWarWithTarget && distance <= 7) {
        unit.trainingDaysLeft = 35;
        unit.pendingLanding = posKey;
        addNotification('Подготовка морской высадки: 35 дней', 'info');
        return;
    }

    // Морская переброска между портами
    const targetCell = getCellData(posKey);
    const hasTargetPort = targetCell.buildings?.includes('port');
    if (hasStartPort && hasTargetPort && targetOwner === unit.owner) {
        unit.pos = posKey;
        unit.path = [];
        addNotification('Морская переброска завершена', 'info');
        setUnits(units);
        renderMap();
        return;
    }

    moveUnit(unit.id, posKey);
}

function getCellData(key) {
    const cellStats = window._cellStats || {};
    if (!cellStats[key]) {
        cellStats[key] = { population: 5000, factories: 0, buildings: [] };
    }
    return cellStats[key];
}

export function deployUnit(posKey, unitType) {
    if (!unitType || !posKey) return;
    
    const gridData = getGridData();
    const myCountryId = getMyCountryId();
    
    if (gridData[posKey] !== myCountryId) {
        addNotification('Можно развертывать только на своей территории!', 'war');
        return;
    }

    startRecruitment(unitType, posKey);
}

export function processMovement() {
    const units = getUnits();
    const wars = getWars();
    const gridData = getGridData();

    units.forEach(u => {
        // Морской десант
        if (u.pendingLanding && u.trainingDaysLeft <= 0) {
            const targetPos = u.pendingLanding;
            const targetOwner = gridData[targetPos];
            if (targetOwner && isAtWar(u.owner, targetOwner, wars)) {
                gridData[targetPos] = u.owner;
                setGridData(gridData);
                u.pos = targetPos;
                addNotification('Высадка успешна!', 'war');
                checkCapitulation(targetOwner, u.owner);
            }
            u.pendingLanding = null;
        }

        // Движение по пути
        if (u.trainingDaysLeft > 0) {
            u.trainingDaysLeft--;
        } else if (u.path && u.path.length > 0) {
            if (u.moveCooldown === undefined) u.moveCooldown = 0;
            u.moveCooldown++;
            
            if (u.moveCooldown >= 2) {
                u.moveCooldown = 0;
                const nextStep = u.path[0];
                const targetOwner = gridData[nextStep];

                if (!targetOwner) {
                    u.path = [];
                    return;
                }

                if (isAtWar(u.owner, targetOwner, wars)) {
                    u.path.shift();
                    gridData[nextStep] = u.owner;
                    setGridData(gridData);
                    u.pos = nextStep;
                    checkCapitulation(targetOwner, u.owner);
                } else if (targetOwner === u.owner || areAllies(u.owner, targetOwner, wars, getAlliances())) {
                    u.path.shift();
                    u.pos = nextStep;
                } else {
                    u.path = [];
                }
            }
        }
    });

    setUnits(units);
}

function areAllies(c1, c2, wars, alliances) {
    if (c1 === c2) return true;
    return alliances.some(a => a.has(c1) && a.has(c2));
}

function getAlliances() {
    return window._alliances || [];
}

function checkCapitulation(targetCountry, winnerCountry) {
    const gridData = getGridData();
    const cellCount = Object.values(gridData).filter(id => id === targetCountry).length;
    
    if (cellCount < 3) {
        addNotification(`${getCountryInfo(targetCountry).name} капитулирует!`, 'war');

        Object.keys(gridData).forEach(key => {
            if (gridData[key] === targetCountry) {
                gridData[key] = winnerCountry;
            }
        });
        setGridData(gridData);

        const wars = getWars();
        const newWars = wars.filter(w => w.a !== targetCountry && w.b !== targetCountry);
        setWars(newWars);

        const units = getUnits();
        const newUnits = units.filter(u => u.owner !== targetCountry);
        setUnits(newUnits);
    }
}

function getCountryInfo(id) {
    const countries = window._countries || {};
    return countries[id] || { name: id.toUpperCase() };
}

export function processCombat() {
    const units = getUnits();
    const wars = getWars();
    let activeBattles = getActiveBattles();

    // Находим коллизии
    for (let i = 0; i < units.length; i++) {
        for (let j = i + 1; j < units.length; j++) {
            if (units[i].pos === units[j].pos && 
                units[i].owner !== units[j].owner && 
                isAtWar(units[i].owner, units[j].owner, wars)) {
                
                const alreadyFighting = activeBattles.some(b => 
                    (b.attacker.id === units[i].id || b.defender.id === units[i].id) &&
                    (b.attacker.id === units[j].id || b.defender.id === units[j].id)
                );
                
                if (!alreadyFighting) {
                    activeBattles.push({ 
                        attacker: units[i], 
                        defender: units[j], 
                        daysCounter: 0 
                    });
                }
            }
        }
    }

    // Обрабатываем бои
    activeBattles = activeBattles.filter(battle => {
        if (battle.attacker.hp <= 0 || battle.defender.hp <= 0) {
            if (battle.defender.hp <= 0) {
                const gridData = getGridData();
                gridData[battle.defender.pos] = battle.attacker.owner;
                setGridData(gridData);
                removeUnit(battle.defender.id);
                addNotification(`${getUnitName(battle.defender.type)} уничтожен!`, 'war');
            }
            if (battle.attacker.hp <= 0) {
                removeUnit(battle.attacker.id);
                addNotification(`${getUnitName(battle.attacker.type)} уничтожен!`, 'war');
            }
            return false;
        }

        battle.daysCounter++;
        if (battle.daysCounter >= 2) {
            battle.daysCounter = 0;
            
            const aStats = UNIT_STATS[battle.attacker.type];
            const dStats = UNIT_STATS[battle.defender.type];
            
            if (!aStats || !dStats) return true;

            const aDamage = Math.max(1, Math.floor(aStats.attack * (Math.random() * 0.5 + 0.5)));
            const dDamage = Math.max(1, Math.floor(dStats.attack * 0.5));
            
            battle.defender.hp -= aDamage;
            battle.attacker.hp -= dDamage;
            
            addNotification('⚔️ Идёт бой!', 'war');
        }
        return true;
    });

    // Регенерация
    units.forEach(u => {
        const inBattle = activeBattles.some(b => 
            b.attacker.id === u.id || b.defender.id === u.id
        );
        const stats = UNIT_STATS[u.type];
        if (!inBattle && stats && u.hp < stats.hp) {
            u.hp = Math.min(stats.hp, u.hp + 5);
        }
    });

    setActiveBattles(activeBattles);
    setUnits(units);
}
