// military.js — ПОЛНЫЙ С МУЛЬТИ-БОЕМ И ФИКСАЦИЕЙ ТАНКОВ

import { 
    getUnits, setUnits, getMyCountryId, getWars, 
    getPlayerResources, setPlayerResources,
    getActiveBattles, setActiveBattles,
    getGridData, setGridData,
    addUnit, removeUnit, getCellStats, getAlliances
} from './game.js';
import { UNIT_STATS } from './data.js';
import { isAtWar, addNotification } from './utils.js';
import { checkCapitulation } from './diplomacy.js';
import { renderMap, markDirty } from './map.js';
import { updateTopBar } from './ui.js';

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

function areAlliesCheck(c1, c2) {
    if (c1 === c2) return true;
    const alliances = getAlliances();
    return alliances.some(a => a.has && a.has(c1) && a.has(c2));
}

// ========== ОПТИМИЗИРОВАННЫЙ ПОИСК ПУТИ (A* с эвристикой) ==========

function findPathAvoidingEnemies(startPos, endPos, owner) {
    const gridData = getGridData();
    const units = getUnits();
    const wars = getWars();
    
    const [sx, sy] = startPos.split(',').map(Number);
    const [tx, ty] = endPos.split(',').map(Number);
    
    // Эвристика (Манхэттенская дистанция)
    function heuristic(x, y) {
        return Math.abs(x - tx) + Math.abs(y - ty);
    }
    
    const openSet = new Map();
    const closedSet = new Set();
    
    const startKey = `${sx},${sy}`;
    openSet.set(startKey, {
        g: 0,
        f: heuristic(sx, sy),
        parent: null,
        x: sx, y: sy
    });
    
    while (openSet.size > 0) {
        let current = null;
        let currentKey = null;
        for (const [key, node] of openSet) {
            if (!current || node.f < current.f) {
                current = node;
                currentKey = key;
            }
        }
        
        if (current.x === tx && current.y === ty) {
            const path = [];
            let node = current;
            while (node.parent) {
                path.unshift(`${node.x},${node.y}`);
                node = node.parent;
            }
            return path;
        }
        
        openSet.delete(currentKey);
        closedSet.add(currentKey);
        
        if (current.g > 100) continue;
        
        const neighbors = [[1,0], [-1,0], [0,1], [0,-1]];
        for (const [dx, dy] of neighbors) {
            const nx = current.x + dx;
            const ny = current.y + dy;
            const nKey = `${nx},${ny}`;
            
            if (closedSet.has(nKey)) continue;
            if (!gridData[nKey]) continue;
            
            const enemyUnit = units.find(u => 
                u.pos === nKey && 
                u.owner !== owner && 
                isAtWar(owner, u.owner, wars)
            );
            if (enemyUnit) continue;
            
            const cellOwner = gridData[nKey];
            const isEnemyCountry = cellOwner && isAtWar(owner, cellOwner, wars);
            const isAlly = areAlliesCheck(owner, cellOwner);
            
            if (cellOwner !== owner && !isAlly && !isEnemyCountry) continue;
            
            const tentativeG = current.g + 1;
            const existing = openSet.get(nKey);
            
            if (!existing || tentativeG < existing.g) {
                openSet.set(nKey, {
                    g: tentativeG,
                    f: tentativeG + heuristic(nx, ny),
                    parent: current,
                    x: nx, y: ny
                });
            }
        }
    }
    
    return null;
}

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
        moveCooldown: 0,
        inCombat: false
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

    if (unit.inCombat) {
        addNotification('Юнит ведёт бой и не может двигаться!', 'war');
        return;
    }

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
    
    const hasStartPort = startCell.buildings && startCell.buildings.includes('port');
    const targetOwner = gridData[posKey];
    const isEnemyTarget = targetOwner && isAtWar(unit.owner, targetOwner, wars);

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

    const targetCell = cellStats[posKey] || {};
    const hasTargetPort = targetCell.buildings && targetCell.buildings.includes('port');
    
    if (hasStartPort && hasTargetPort && targetOwner === unit.owner && distance > 1) {
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

    const path = findPathAvoidingEnemies(unit.pos, posKey, unit.owner);
    
    if (!path) {
        addNotification('Путь заблокирован вражескими войсками!', 'war');
        return;
    }
    
    unit.path = path;
    unit.moveCooldown = 0;
    setUnits(units);
    markDirty();
}

// ========== ОБРАБОТКА ДВИЖЕНИЯ ==========

export function processMovement() {
    const units = getUnits();
    const wars = getWars();
    const gridData = getGridData();
    const myId = getMyCountryId();
    let changed = false;

    units.forEach(u => {
        if (u.inCombat) {
            u.path = [];
            return;
        }
        
        if (u.pendingLanding && u.trainingDaysLeft <= 0) {
            const targetPos = u.pendingLanding;
            const targetOwner = gridData[targetPos];
            
            if (targetOwner && isAtWar(u.owner, targetOwner, wars)) {
                const enemyOnTarget = getUnits().find(unit => 
                    unit.pos === targetPos && 
                    unit.owner !== u.owner && 
                    isAtWar(u.owner, unit.owner, wars)
                );
                
                if (enemyOnTarget) {
                    const battles = getActiveBattles();
                    battles.push({ attacker: u, defender: enemyOnTarget, daysCounter: 0 });
                    setActiveBattles(battles);
                    u.inCombat = true;
                    enemyOnTarget.inCombat = true;
                    if (u.owner === myId) {
                        addNotification('⚔️ Десант вступил в бой при высадке!', 'war');
                    }
                } else {
                    const previousOwner = gridData[targetPos];
                    gridData[targetPos] = u.owner;
                    setGridData(gridData);
                    u.pos = targetPos;
                    changed = true;
                    checkCapitulation(previousOwner, u.owner);
                }
            }
            u.pendingLanding = null;
        }

        if (u.trainingDaysLeft > 0) {
            u.trainingDaysLeft--;
            if (u.trainingDaysLeft === 0 && u.owner === myId) {
                addNotification(`Юнит ${UNIT_STATS[u.type]?.icon || ''} готов к бою!`, 'info');
            }
        }
        else if (u.path && u.path.length > 0 && !u.inCombat) {
            u.moveCooldown = (u.moveCooldown || 0) + 1;
            
            if (u.moveCooldown >= 2) {
                u.moveCooldown = 0;
                const nextStep = u.path[0];
                const targetOwner = gridData[nextStep];

                if (!targetOwner) {
                    u.path = [];
                    return;
                }

                const enemyOnNext = getUnits().find(unit => 
                    unit.pos === nextStep && 
                    unit.owner !== u.owner && 
                    isAtWar(u.owner, unit.owner, wars)
                );

                if (enemyOnNext) {
                    const battles = getActiveBattles();
                    battles.push({ attacker: u, defender: enemyOnNext, daysCounter: 0 });
                    setActiveBattles(battles);
                    u.inCombat = true;
                    enemyOnNext.inCombat = true;
                    u.path = [];
                    if (u.owner === myId) {
                        addNotification('⚔️ Столкновение с врагом!', 'war');
                    }
                    return;
                }

                const isEnemyCountry = isAtWar(u.owner, targetOwner, wars);
                const isAlly = areAlliesCheck(u.owner, targetOwner);
                
                if (isEnemyCountry) {
                    u.path.shift();
                    const previousOwner = gridData[nextStep];
                    gridData[nextStep] = u.owner;
                    setGridData(gridData);
                    u.pos = nextStep;
                    changed = true;
                    
                    if (checkCapitulation(previousOwner, u.owner)) {
                        u.path = u.path.filter(step => {
                            const owner = gridData[step];
                            return owner === u.owner || isAtWar(u.owner, owner, wars);
                        });
                    }
                } else if (targetOwner === u.owner || isAlly) {
                    u.path.shift();
                    u.pos = nextStep;
                    changed = true;
                } else {
                    u.path = [];
                }
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
    let battles = getActiveBattles() || [];

    // Находим все коллизии
    for (let i = 0; i < units.length; i++) {
        for (let j = i + 1; j < units.length; j++) {
            const [ix, iy] = units[i].pos.split(',').map(Number);
            const [jx, jy] = units[j].pos.split(',').map(Number);
            const dist = Math.sqrt(Math.pow(jx - ix, 2) + Math.pow(jy - iy, 2));
            
            if (dist <= 1.5 && 
                units[i].owner !== units[j].owner && 
                isAtWar(units[i].owner, units[j].owner, wars)) {
                
                const alreadyFighting = battles.some(b => 
                    (b.attacker?.id === units[i].id && b.defender?.id === units[j].id) ||
                    (b.attacker?.id === units[j].id && b.defender?.id === units[i].id)
                );
                
                if (!alreadyFighting) {
                    const aStats = UNIT_STATS[units[i].type] || { attack: 10 };
                    const dStats = UNIT_STATS[units[j].type] || { attack: 10 };
                    
                    const attacker = aStats.attack >= dStats.attack ? units[i] : units[j];
                    const defender = attacker.id === units[i].id ? units[j] : units[i];
                    
                    battles.push({ attacker, defender, daysCounter: 0 });
                    attacker.inCombat = true;
                    defender.inCombat = true;
                    
                    if (attacker.owner === myId || defender.owner === myId) {
                        addNotification(`⚔️ Бой: ${getUnitName(attacker.type)} vs ${getUnitName(defender.type)}!`, 'war');
                    }
                }
            }
        }
    }

    // Обрабатываем все бои
    battles = battles.filter(battle => {
        if (!battle.attacker || !battle.defender) return false;
        
        const attacker = units.find(u => u.id === battle.attacker.id);
        const defender = units.find(u => u.id === battle.defender.id);
        
        if (!attacker || !defender) {
            if (attacker) attacker.inCombat = false;
            if (defender) defender.inCombat = false;
            return false;
        }
        
        const [ax, ay] = attacker.pos.split(',').map(Number);
        const [dx, dy] = defender.pos.split(',').map(Number);
        const distance = Math.sqrt(Math.pow(dx - ax, 2) + Math.pow(dy - ay, 2));
        
        if (distance > 1.5 && attacker.pos !== defender.pos) {
            attacker.inCombat = false;
            defender.inCombat = false;
            return false;
        }
        
        if ((attacker.hp || 0) <= 0) {
            removeUnit(attacker.id);
            const stillInCombat = battles.some(b => 
                b !== battle && 
                (b.defender?.id === defender.id || b.attacker?.id === defender.id)
            );
            if (!stillInCombat) defender.inCombat = false;
            
            if (attacker.owner === myId || defender.owner === myId) {
                addNotification(`${getUnitName(attacker.type)} уничтожен в бою!`, 'war');
            }
            return false;
        }
        
        if ((defender.hp || 0) <= 0) {
            const defenderPos = defender.pos;
            const defenderOwner = gridData[defenderPos];
            
            removeUnit(defender.id);
            
            const stillInCombat = battles.some(b => 
                b !== battle && 
                (b.defender?.id === attacker.id || b.attacker?.id === attacker.id)
            );
            if (!stillInCombat) attacker.inCombat = false;
            
            if (attacker.owner === myId || defender.owner === myId) {
                addNotification(`${getUnitName(defender.type)} уничтожен! Победа!`, 'war');
            }
            
            if (defenderOwner === defender.owner && attacker.pos === defender.pos) {
                const previousOwner = gridData[defenderPos];
                gridData[defenderPos] = attacker.owner;
                setGridData(gridData);
                attacker.pos = defenderPos;
                checkCapitulation(previousOwner, attacker.owner);
            }
            return false;
        }

        battle.daysCounter = (battle.daysCounter || 0) + 1;
        
        if (battle.daysCounter >= 2) {
            battle.daysCounter = 0;
            
            const aStats = UNIT_STATS[attacker.type] || { attack: 10, defense: 25, armor: 0 };
            const dStats = UNIT_STATS[defender.type] || { attack: 10, defense: 25, armor: 0 };

            const attackersOnDefender = battles.filter(b => 
                b.defender?.id === defender.id || b.attacker?.id === defender.id
            ).length;
            
            const attackersOnAttacker = battles.filter(b => 
                b.defender?.id === attacker.id || b.attacker?.id === attacker.id
            ).length;

            const aMultiplier = Math.min(2.0, 1.0 + (attackersOnDefender - 1) * 0.3);
            const dMultiplier = Math.min(2.0, 1.0 + (attackersOnAttacker - 1) * 0.3);
            
            const defenderDefenseBonus = 1.4;
            
            const aRawDamage = aStats.attack * aMultiplier * (0.8 + Math.random() * 0.4);
            const dRawDamage = dStats.attack * dMultiplier * 0.5 * (0.8 + Math.random() * 0.4);
            
            const aDamage = Math.max(3, Math.floor(aRawDamage - dStats.defense * defenderDefenseBonus * 0.3));
            const dDamage = Math.max(2, Math.floor(dRawDamage));
            
            const defenderArmor = 1 - (dStats.armor || 0) / 150;
            const attackerArmor = 1 - (aStats.armor || 0) / 150;
            
            const finalADamage = Math.max(1, Math.floor(aDamage * defenderArmor));
            const finalDDamage = Math.max(1, Math.floor(dDamage * attackerArmor));

            defender.hp = Math.max(0, (defender.hp || 0) - finalADamage);
            attacker.hp = Math.max(0, (attacker.hp || 0) - finalDDamage);
        }
        
        return true;
    });

    setActiveBattles(battles);
}

export function clearRecruitMode() {
    window._recruitMode = null;
    const hint = document.getElementById('recruit-hint');
    if (hint) hint.classList.add('hidden');
}
