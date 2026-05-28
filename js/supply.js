// supply.js — ОПТИМИЗИРОВАННАЯ ВЕРСИЯ (реже проверяем котлы)

import { getGridData, getUnits, getMyCountryId, getWars, getCellStats, getAlliances, getGameDate } from './game.js';
import { isAtWar, addNotification } from './utils.js';
import { checkCapitulation } from './diplomacy.js';

// Ограничение частоты проверки котлов
let supplyTickCounter = 0;
const SUPPLY_TICK_INTERVAL = 5; // Проверяем котлы раз в 5 дней

// Кэш для групп и котлов
let groupCache = new Map();
let pocketCache = new Map();
let lastUpdateDay = 0;

function getCurrentDay() {
    const date = getGameDate();
    return Math.floor(date.getTime() / 86400000);
}

function areAlliesWith(c1, c2) {
    if (c1 === c2) return true;
    const alliances = getAlliances ? getAlliances() : (window._alliances || []);
    return alliances.some(a => a.has && a.has(c1) && a.has(c2));
}

function getEnemiesOf(countryId, wars) {
    const enemies = [];
    for (const w of wars) {
        if (w.a === countryId) enemies.push(w.b);
        if (w.b === countryId) enemies.push(w.a);
    }
    return [...new Set(enemies)];
}

// ========== ПОИСК СВЯЗНЫХ ГРУПП С КЭШЕМ ==========

function findAllGroups(countryId) {
    const currentDay = getCurrentDay();
    const cached = groupCache.get(countryId);
    
    // Используем кэш если он свежий (менее 5 дней)
    if (cached && (currentDay - cached.day) < SUPPLY_TICK_INTERVAL) {
        return cached.groups;
    }
    
    const gridData = getGridData();
    const myCells = Object.keys(gridData).filter(pos => gridData[pos] === countryId);
    if (myCells.length === 0) return [];
    
    const visited = new Set();
    const allGroups = [];
    
    for (const startPos of myCells) {
        if (visited.has(startPos)) continue;
        
        const group = new Set();
        const queue = [startPos];
        visited.add(startPos);
        
        while (queue.length > 0) {
            const pos = queue.shift();
            group.add(pos);
            
            const [x, y] = pos.split(',').map(Number);
            for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
                const neighbor = `${x+dx},${y+dy}`;
                if (visited.has(neighbor)) continue;
                
                const owner = gridData[neighbor];
                if (owner === countryId || areAlliesWith(countryId, owner)) {
                    visited.add(neighbor);
                    queue.push(neighbor);
                }
            }
        }
        
        allGroups.push(group);
    }
    
    allGroups.sort((a, b) => b.size - a.size);
    
    // Сохраняем в кэш
    groupCache.set(countryId, { groups: allGroups, day: currentDay });
    
    return allGroups;
}

function isFullySurroundedByEnemies(pos, countryId, enemies) {
    const gridData = getGridData();
    const [x, y] = pos.split(',').map(Number);
    
    let totalNeighbors = 0;
    let enemyNeighbors = 0;
    
    for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
        const neighbor = `${x+dx},${y+dy}`;
        const owner = gridData[neighbor];
        
        if (owner === undefined) continue;
        
        totalNeighbors++;
        
        if (enemies.includes(owner) || !owner) {
            enemyNeighbors++;
        }
    }
    
    return totalNeighbors > 0 && enemyNeighbors >= totalNeighbors;
}

function isGroupSurrounded(group, countryId, enemies) {
    if (group.size === 0) return false;
    
    const gridData = getGridData();
    
    for (const pos of group) {
        const [x, y] = pos.split(',').map(Number);
        
        for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
            const neighbor = `${x+dx},${y+dy}`;
            const owner = gridData[neighbor];
            
            if (group.has(neighbor)) continue;
            
            if (!owner) return false;
            if (owner === countryId) continue;
            if (areAlliesWith(countryId, owner)) return false;
            if (!enemies.includes(owner)) return false;
        }
    }
    
    return true;
}

function findPockets(countryId) {
    const currentDay = getCurrentDay();
    const cached = pocketCache.get(countryId);
    
    // Используем кэш если он свежий
    if (cached && (currentDay - cached.day) < SUPPLY_TICK_INTERVAL) {
        return cached.pockets;
    }
    
    const gridData = getGridData();
    const wars = getWars();
    const enemies = getEnemiesOf(countryId, wars);
    const myCells = Object.keys(gridData).filter(pos => gridData[pos] === countryId);
    
    if (myCells.length === 0) return [];
    if (enemies.length === 0) return [];
    if (myCells.length <= 5) return [];
    
    const allGroups = findAllGroups(countryId);
    if (allGroups.length === 0) return [];
    
    const pockets = [];
    
    for (let i = 1; i < allGroups.length; i++) {
        const group = allGroups[i];
        
        const cellStats = getCellStats();
        let hasPort = false;
        for (const pos of group) {
            const cell = cellStats[pos];
            if (cell?.buildings?.includes('port')) {
                hasPort = true;
                break;
            }
        }
        if (hasPort) continue;
        
        let touchesWater = false;
        for (const pos of group) {
            const [x, y] = pos.split(',').map(Number);
            for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
                if (!gridData[`${x+dx},${y+dy}`]) {
                    touchesWater = true;
                    break;
                }
            }
            if (touchesWater) break;
        }
        if (touchesWater) continue;
        
        let touchesNeutral = false;
        for (const pos of group) {
            const [x, y] = pos.split(',').map(Number);
            for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
                const neighbor = `${x+dx},${y+dy}`;
                const owner = gridData[neighbor];
                if (owner && owner !== countryId && !enemies.includes(owner) && !areAlliesWith(countryId, owner)) {
                    touchesNeutral = true;
                    break;
                }
            }
            if (touchesNeutral) break;
        }
        if (touchesNeutral) continue;
        
        if (isGroupSurrounded(group, countryId, enemies)) {
            pockets.push({
                cells: [...group],
                size: group.size,
                countryId: countryId
            });
        }
    }
    
    // Сохраняем в кэш
    pocketCache.set(countryId, { pockets, day: currentDay });
    
    return pockets;
}

// ========== ШТРАФЫ ==========

function applySupplyPenalties() {
    const myId = getMyCountryId();
    const gridData = getGridData();
    const allCountries = [...new Set(Object.values(gridData))];
    const wars = getWars();
    const notifiedPockets = new Set();
    
    for (const countryId of allCountries) {
        const pockets = findPockets(countryId);
        if (pockets.length === 0) continue;
        
        for (const pocket of pockets) {
            const units = getUnits();
            let unitsLost = 0;
            
            for (const u of units) {
                if (u.owner === countryId && pocket.cells.includes(u.pos)) {
                    const supplyDamage = 2 + Math.floor(Math.random() * 4);
                    u.hp = Math.max(0, (u.hp || 0) - supplyDamage);
                    u.supplyPenalty = true;
                    
                    if (u.hp <= 0) {
                        import('./game.js').then(m => m.removeUnit(u.id));
                        unitsLost++;
                    }
                }
            }
            
            const pocketKey = `${countryId}_${pocket.size}`;
            
            if (countryId === myId && !notifiedPockets.has(pocketKey)) {
                notifiedPockets.add(pocketKey);
                addNotification(`⚠️ ${pocket.size} провинций в котле! Потери: ${unitsLost} юнитов.`, 'war');
                setTimeout(() => notifiedPockets.delete(pocketKey), 10000);
            }
            
            if (isAtWar(myId, countryId, wars) && !notifiedPockets.has(`enemy_${pocketKey}`)) {
                notifiedPockets.add(`enemy_${pocketKey}`);
                addNotification(`🔥 Враг в котле! ${pocket.size} клеток окружены.`, 'war');
                setTimeout(() => notifiedPockets.delete(`enemy_${pocketKey}`), 10000);
            }
        }
        
        const allCells = Object.values(gridData).filter(id => id === countryId).length;
        const totalPocketCells = pockets.reduce((sum, p) => sum + p.size, 0);
        
        if (totalPocketCells >= allCells * 0.9 && allCells > 10) {
            const enemies = getEnemiesOf(countryId, wars);
            if (enemies.length > 0) {
                addNotification(`💀 ${countryId.toUpperCase()} капитулирует!`, 'war');
                checkCapitulation(countryId, enemies[0]);
            }
        }
    }
}

// ========== ЭКСПОРТ ==========

export function processSupply() {
    supplyTickCounter++;
    if (supplyTickCounter < SUPPLY_TICK_INTERVAL) return;
    supplyTickCounter = 0;
    
    applySupplyPenalties();
}

export function getPocketsForCountry(countryId) { 
    return findPockets(countryId); 
}

// Очистка кэша при загрузке игры
export function clearSupplyCache() {
    groupCache.clear();
    pocketCache.clear();
    lastUpdateDay = 0;
    console.log('🧹 Supply cache cleared');
}

export function debugSupply(countryId) {
    const allGroups = findAllGroups(countryId);
    const pockets = findPockets(countryId);
    console.log(`=== ${countryId}: ${allGroups.length} групп, ${pockets.length} котлов ===`);
    return { allGroups, pockets };
}
