// military.js — ОПТИМИЗИРОВАННАЯ ВЕРСИЯ

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
    
    // Open set (priority queue через Map с поиском минимума)
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
        // Находим узел с наименьшим f
        let current = null;
        let currentKey = null;
        for (const [key, node] of openSet) {
            if (!current || node.f < current.f) {
                current = node;
                currentKey = key;
            }
        }
        
        // Проверяем, достигли ли цели
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
        
        // Лимит глубины пути
        if (current.g > 100) continue;
        
        // Проверяем соседей
        const neighbors = [[1,0], [-1,0], [0,1], [0,-1]];
        for (const [dx, dy] of neighbors) {
            const nx = current.x + dx;
            const ny = current.y + dy;
            const nKey = `${nx},${ny}`;
            
            if (closedSet.has(nKey)) continue;
            if (!gridData[nKey]) continue;
            
            // Проверка на вражеский юнит
            const enemyUnit = units.find(u => 
                u.pos === nKey && 
                u.owner !== owner && 
                isAtWar(owner, u.owner, wars)
            );
            if (enemyUnit) continue;
            
            const cellOwner = gridData[nKey];
            const isEnemyCountry = cellOwner && isAtWar(owner, cellOwner, wars);
            const isAlly = areAlliesCheck(owner, cellOwner);
            
            // Можно ходить только по своей территории, союзной или вражеской
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

// ========== ОСТАЛЬНОЙ КОД БЕЗ ИЗМЕНЕНИЙ ==========
// ... (весь остальной код military.js остаётся таким же, 
// только нужно заменить старую функцию findPathAvoidingEnemies на эту)

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

// ... (остальной код processMovement, processCombat и т.д. остаётся без изменений)
