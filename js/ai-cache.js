// ai-cache.js — Кэш для оптимизации ИИ

import { getGridData, getWars, getGameDate } from './game.js';
import { getEnemiesOf, areAllies } from './utils.js';

// Кэш
let borderCache = new Map();      // countryId -> Set(borderPositions)
let frontLineCache = new Map();   // countryId -> Set(frontPositions)
let lastUpdateCache = new Map();  // countryId -> lastUpdateDay

const UPDATE_INTERVAL_DAYS = 3;   // Обновляем раз в 3 дня

function getCurrentDay() {
    const date = getGameDate();
    return Math.floor(date.getTime() / 86400000);
}

// Проверить, нужно ли обновлять кэш для страны
function shouldUpdate(countryId) {
    const lastUpdate = lastUpdateCache.get(countryId);
    if (lastUpdate === undefined) return true;
    const currentDay = getCurrentDay();
    return (currentDay - lastUpdate) >= UPDATE_INTERVAL_DAYS;
}

// Обновить кэш для страны
export function updateAICache(countryId) {
    if (!shouldUpdate(countryId)) return false;
    
    const gridData = getGridData();
    const wars = getWars();
    const enemies = getEnemiesOf(countryId, wars);
    const alliances = window._alliances || [];
    
    const borders = new Set();
    const frontLine = new Set();
    
    // Находим все клетки страны
    const myCells = [];
    for (const [pos, owner] of Object.entries(gridData)) {
        if (owner === countryId) myCells.push(pos);
    }
    
    // Для каждой клетки проверяем соседей
    for (const pos of myCells) {
        const [x, y] = pos.split(',').map(Number);
        let isBorder = false;
        let isFront = false;
        
        for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
            const neighbor = `${x+dx},${y+dy}`;
            const neighborOwner = gridData[neighbor];
            
            if (neighborOwner && neighborOwner !== countryId && !areAllies(countryId, neighborOwner, alliances)) {
                isBorder = true;
                if (enemies.includes(neighborOwner)) {
                    isFront = true;
                }
            }
        }
        
        if (isBorder) borders.add(pos);
        if (isFront) frontLine.add(pos);
    }
    
    borderCache.set(countryId, borders);
    frontLineCache.set(countryId, frontLine);
    lastUpdateCache.set(countryId, getCurrentDay());
    
    return true;
}

// Получить границы страны
export function getCachedBorders(countryId) {
    updateAICache(countryId);
    return borderCache.get(countryId) || new Set();
}

// Получить фронт страны
export function getCachedFrontLine(countryId) {
    updateAICache(countryId);
    return frontLineCache.get(countryId) || new Set();
}

// Получить границы с конкретным врагом
export function getCachedBordersWithEnemy(countryId, enemyId) {
    const borders = getCachedBorders(countryId);
    const gridData = getGridData();
    const result = [];
    
    for (const pos of borders) {
        const [x, y] = pos.split(',').map(Number);
        for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
            if (gridData[`${x+dx},${y+dy}`] === enemyId) {
                result.push(pos);
                break;
            }
        }
    }
    
    return result;
}

// Очистить весь кэш (при загрузке игры)
export function clearAICache() {
    borderCache.clear();
    frontLineCache.clear();
    lastUpdateCache.clear();
}

// Получить статистику кэша (для дебага)
export function getAICacheStats() {
    return {
        borderCacheSize: borderCache.size,
        frontLineCacheSize: frontLineCache.size,
        lastUpdateSize: lastUpdateCache.size
    };
}
