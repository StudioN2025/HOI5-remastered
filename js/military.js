// military.js — юниты, рекрутинг, бои, движение

import { 
    getUnits, setUnits, getMyCountryId, getWars, 
    getPlayerResources, setPlayerResources,
    getActiveBattles, setActiveBattles,
    getGridData, setGridData,
    addUnit, removeUnit, getCellStats
} from './game.js';
import { UNIT_STATS } from './data.js';
import { isAtWar, addNotification } from './utils.js';
import { checkCapitulation } from './diplomacy.js';
import { renderMap, markDirty } from './map.js';
import { updateTopBar } from './ui.js';

// ========== РЕКРУТИНГ ==========

export function deployUnit(posKey, unitType) {
    const gridData = getGridData();
    const myCountryId = getMyCountryId();
    
    if (gridData[posKey] !== myCountryId) {
        addNotification('Можно развертывать только на своей территории!', 'war');
        return;
    }

    const stats = UNIT_STATS[unitType];
    if (!stats) return;

    const resources = getPlayerResources();
    
    if ((resources.equipment || 0) < stats.costEquipment) {
        addNotification('Недостаточно снаряжения!', 'war');
        return;
    }
    
    if ((resources.manpower || 0) < stats.costManpower) {
        addNotification('Недостаточно людских ресурсов!', 'war');
        return;
    }

    resources.equipment -= stats.costEquipment;
    resources.manpower -= stats.costManpower;
    setPlayerResources(resources);

    const unit = {
        id: `unit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        pos: posKey,
        owner: myCountryId,
        type: unitType,
        hp: stats.hp || 100,
        trainingDaysLeft: 10,
        path: [],
        moveCooldown: 0
    };
    
    addUnit(unit);
    
    addNotification(`${stats.icon} ${stats.name} начал тренировку (10 дней)!`, 'info');
    updateTopBar();
    markDirty();
}

// ========== ПРИКАЗ НА ДВИЖЕНИЕ ==========

export function giveOrder(posKey, selectedUnitId) {
    if (!selectedUnitId) return;
    
    const units = getUnits();
    const unit = units.find(u => u.id === selectedUnitId);
    if (!unit) return;

    const gridData = getGridData();
    const wars = getWars();
    
    if (!gridData[posKey]) {
        addNotification('Юниты не могут ходить по воде! Используйте порты для высадки.', 'war');
        return;
    }

    const [sx, sy] = unit.pos.split(',').map(Number);
    const [tx, ty] = posKey.split(',').map(Number);
    const distance = Math.sqrt(Math.pow(tx - sx, 2) + Math.pow(ty - sy, 2));

    const cellStats = getCellStats();
    const startCell = cellStats[unit.pos] || {};
    const targetCell = cellStats[posKey] || {};
    
    const hasStartPort = startCell.buildings && startCell.buildings.includes('port');
    const targetOwner = gridData[posKey];
    const isEnemyTarget = targetOwner && isAtWar(unit.owner, targetOwner, wars);

    // Морской десант
    if (hasStartPort && isEnemyTarget && distance <= 7) {
        if (unit.trainingDaysLeft > 0) {
            addNotification('Юнит ещё не готов!', 'war');
            return;
        }
        unit.trainingDaysLeft = 35;
        unit.pendingLanding = posKey;
        unit.path = [];
        setUnits(units);
        addNotification('Подготовка морской высадки: 35 дней', 'info');
        return;
    }

    // Морская переброска между своими портами
    if (hasStartPort && targetCell.buildings && targetCell.buildings.includes('port') && targetOwner === unit.owner && distance > 1) {
        if (unit.trainingDaysLeft > 0) {
            addNotification('Юнит ещё не готов!', 'war');
            return;
        }
        unit.pos = posKey;
        unit.path = [];
        setUnits(units);
        addNotification('Морская переброска завершена', 'info');
        markDirty();
        renderMap();
        return;
    }

    // Обычное движение
    let path = [];
    let cx = sx, cy = sy;
    let steps = 0;
    const maxSteps = 100;

    while ((cx !== tx || cy !== sy) && steps < maxSteps) {
        if (cx < tx) cx++;
        else if (cx > tx) cx--;
        if (cy < ty) cy++;
        else if (cy > ty) cy--;
        path.push(`${cx},${cy}`);
        steps++;
    }

    unit.path = path;
    unit.moveCooldown = 0;
    setUnits(units);
    markDirty();
}

// ========== ОБРАБОТКА ДВИЖЕНИЯ ==========

function areAllies(c1, c2) {
    if (c1 === c2) return true;
    const alliances = window._alliances || [];
    return alliances.some(a => a.has && a.has(c1) && a.has(c2));
}

export function processMovement() {
    const units = getUnits();
    const wars = getWars();
    const gridData = getGridData();
    const myId = getMyCountryId();
    let changed = false;

    units.forEach(u => {
        // Морской десант
        if (u.pendingLanding && u.trainingDaysLeft <= 0) {
            const targetPos = u.pendingLanding;
            const targetOwner = gridData[targetPos];
            
            if (targetOwner && isAtWar(u.owner, targetOwner, wars)) {
                const previousOwner = gridData[targetPos];
                gridData[targetPos] = u.owner;
                u.pos = targetPos;
                changed = true;
                
                if (u.owner === myId) {
                    addNotification('⚓ Морская высадка успешна!', 'war');
                }
                
                checkCapitulation(previousOwner, u.owner);
            } else {
                if (u.owner === myId) {
                    addNotification('Высадка отменена: цель больше не вражеская', 'info');
                }
            }
            u.pendingLanding = null;
        }

        // Тренировка
        if (u.trainingDaysLeft > 0) {
            u.trainingDaysLeft--;
            if (u.trainingDaysLeft === 0 && u.owner === myId) {
                addNotification(`Юнит ${UNIT_STATS[u.type]?.icon || ''} готов к бою!`, 'info');
            }
        }
        // Движение по пути
        else if (u.path && u.path.length > 0) {
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
                    const previousOwner = gridData[nextStep];
                    gridData[nextStep] = u.owner;
                    u.pos = nextStep;
                    changed = true;
                    
                    if (checkCapitulation(previousOwner, u.owner)) {
                        u.path = u.path.filter(step => {
                            const owner = gridData[step];
                            return owner === u.owner || isAtWar(u.owner, owner, wars);
                        });
                    }
                } else if (targetOwner === u.owner || areAllies(u.owner, targetOwner)) {
                    u.path.shift();
                    u.pos = nextStep;
                    changed = true;
                } else {
                    u.path = [];
                }
            }
        }
        
        // Регенерация
        const activeBattles = getActiveBattles();
        const inBattle = activeBattles.some(b => 
            (b.attacker && b.attacker.id === u.id) || 
            (b.defender && b.defender.id === u.id)
        );
        
        if (!inBattle && u.hp !== undefined) {
            const stats = UNIT_STATS[u.type];
            const maxHp = stats ? stats.hp : 100;
            if (u.hp < maxHp) {
                u.hp = Math.min(maxHp, (u.hp || 0) + 1);
            }
        }
    });

    if (changed) {
        setGridData(gridData);
        setUnits(units);
    }
}

// ========== БОЕВАЯ СИСТЕМА ==========

function getUnitName(type) {
    return UNIT_STATS[type]?.name || type;
}

export function processCombat() {
    const units = getUnits();
    const wars = getWars();
    const gridData = getGridData();
    const myId = getMyCountryId();
    let activeBattles = getActiveBattles() || [];

    // Находим новые коллизии
    for (let i = 0; i < units.length; i++) {
        for (let j = i + 1; j < units.length; j++) {
            if (units[i].pos === units[j].pos && 
                units[i].owner !== units[j].owner && 
                isAtWar(units[i].owner, units[j].owner, wars)) {
                
                const alreadyFighting = activeBattles.some(b => 
                    (b.attacker && b.attacker.id === units[i].id && b.defender && b.defender.id === units[j].id) ||
                    (b.attacker && b.attacker.id === units[j].id && b.defender && b.defender.id === units[i].id)
                );
                
                if (!alreadyFighting) {
                    const attacker = units[i].trainingDaysLeft <= 0 ? units[i] : units[j];
                    const defender = units[i].trainingDaysLeft <= 0 ? units[j] : units[i];
                    
                    activeBattles.push({ 
                        attacker: attacker,
                        defender: defender,
                        daysCounter: 0 
                    });
                    
                    if (attacker.owner === myId || defender.owner === myId) {
                        addNotification(`⚔️ Бой: ${getUnitName(attacker.type)} vs ${getUnitName(defender.type)}!`, 'war');
                    }
                }
            }
        }
    }

    // Обрабатываем текущие бои
    activeBattles = activeBattles.filter(battle => {
        if (!battle.attacker || !battle.defender) return false;
        
        const attackerExists = units.find(u => u.id === battle.attacker.id);
        const defenderExists = units.find(u => u.id === battle.defender.id);
        
        if (!attackerExists || !defenderExists) return false;
        if (battle.attacker.pos !== battle.defender.pos) return false;

        if ((battle.attacker.hp || 0) <= 0) {
            removeUnit(battle.attacker.id);
            if (battle.attacker.owner === myId || battle.defender.owner === myId) {
                addNotification(`${getUnitName(battle.attacker.type)} уничтожен в бою!`, 'war');
            }
            return false;
        }
        if ((battle.defender.hp || 0) <= 0) {
            const defenderPos = battle.defender.pos;
            const defenderOwner = gridData[defenderPos];
            
            removeUnit(battle.defender.id);
            
            if (battle.attacker.owner === myId || battle.defender.owner === myId) {
                addNotification(`${getUnitName(battle.defender.type)} уничтожен! Победа!`, 'war');
            }
            
            if (defenderOwner === battle.defender.owner) {
                const previousOwner = gridData[defenderPos];
                gridData[defenderPos] = battle.attacker.owner;
                setGridData(gridData);
                battle.attacker.pos = defenderPos;
                checkCapitulation(previousOwner, battle.attacker.owner);
            }
            return false;
        }

        battle.daysCounter = (battle.daysCounter || 0) + 1;
        
        if (battle.daysCounter >= 2) {
            battle.daysCounter = 0;
            
            const aStats = UNIT_STATS[battle.attacker.type] || { attack: 10, defense: 25, armor: 0 };
            const dStats = UNIT_STATS[battle.defender.type] || { attack: 10, defense: 25, armor: 0 };

            const aRawDamage = aStats.attack * (0.8 + Math.random() * 0.4);
            const dRawDamage = dStats.attack * (0.4 + Math.random() * 0.3);
            
            const defenderArmor = dStats.armor || 0;
            const aDamage = Math.max(1, Math.floor(aRawDamage * (1 - defenderArmor / 100)));
            const dDamage = Math.max(1, Math.floor(dRawDamage));

            battle.defender.hp = (battle.defender.hp || 0) - aDamage;
            battle.attacker.hp = (battle.attacker.hp || 0) - dDamage;
        }
        
        return true;
    });

    setActiveBattles(activeBattles);
}

export function clearRecruitMode() {
    window._recruitMode = null;
    const hint = document.getElementById('recruit-hint');
    if (hint) hint.classList.add('hidden');
}
