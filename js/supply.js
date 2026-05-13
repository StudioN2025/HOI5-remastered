// supply.js — ПОЛНАЯ ФИНАЛЬНАЯ СИСТЕМА СНАБЖЕНИЯ И КОТЛОВ

import { getGridData, getUnits, getMyCountryId, getWars, getCellStats, getAlliances } from './game.js';
import { isAtWar, addNotification } from './utils.js';
import { checkCapitulation } from './diplomacy.js';

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

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

// ========== ПОИСК ОСНОВНОЙ ГРУППЫ (СТОЛИЦЫ) ==========

function findCapitalGroup(countryId) {
    const gridData = getGridData();
    const myCells = Object.keys(gridData).filter(pos => gridData[pos] === countryId);
    
    if (myCells.length === 0) return new Set();
    
    const visited = new Set();
    const groups = [];
    
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
        
        groups.push(group);
    }
    
    groups.sort((a, b) => b.size - a.size);
    return groups.length > 0 ? groups[0] : new Set();
}

// ========== ПРОВЕРКА СНАБЖЕНИЯ ==========

function countConnectedCells(pos, countryId, visited) {
    if (visited.has(pos)) return 0;
    visited.add(pos);
    
    const gridData = getGridData();
    const [x, y] = pos.split(',').map(Number);
    let count = 1;
    
    for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
        const neighbor = `${x+dx},${y+dy}`;
        const owner = gridData[neighbor];
        if (owner === countryId || areAlliesWith(countryId, owner)) {
            count += countConnectedCells(neighbor, countryId, visited);
        }
    }
    
    return count;
}

function hasSupplyPath(pos, countryId, capitalGroup, visited = new Set()) {
    if (visited.has(pos)) return false;
    if (capitalGroup.has(pos)) return true;
    
    visited.add(pos);
    
    const gridData = getGridData();
    const cellStats = getCellStats();
    const myCells = Object.keys(gridData).filter(p => gridData[p] === countryId);
    
    // Порт = бесконечное снабжение
    const cell = cellStats[pos];
    if (cell && cell.buildings && cell.buildings.includes('port')) {
        return true;
    }
    
    // Завод снабжает если страна маленькая
    if (cell && cell.factories > 0) {
        if (myCells.length <= 10) return true;
        
        const groupSize = countConnectedCells(pos, countryId, new Set());
        if (groupSize <= 5) return true;
    }
    
    // Ищем путь к основной группе
    const [x, y] = pos.split(',').map(Number);
    for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
        const neighborPos = `${x+dx},${y+dy}`;
        const owner = gridData[neighborPos];
        
        if (owner === countryId || areAlliesWith(countryId, owner)) {
            if (hasSupplyPath(neighborPos, countryId, capitalGroup, visited)) {
                return true;
            }
        }
    }
    
    return false;
}

// ========== СБОР КОТЛОВ ==========

function collectPocketGroup(pos, countryId, capitalGroup, group, visited) {
    if (visited.has(pos)) return;
    if (capitalGroup.has(pos)) return;
    
    const cellStats = getCellStats();
    const cell = cellStats[pos];
    
    // Порт прерывает группу (он в снабжении)
    if (cell && cell.buildings && cell.buildings.includes('port')) return;
    
    // Завод с маленькой группой тоже не котёл
    if (cell && cell.factories > 0) {
        const groupSize = countConnectedCells(pos, countryId, new Set());
        if (groupSize <= 5) return;
    }
    
    visited.add(pos);
    group.add(pos);
    
    const gridData = getGridData();
    const [x, y] = pos.split(',').map(Number);
    
    for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
        const neighbor = `${x+dx},${y+dy}`;
        if (gridData[neighbor] === countryId && !visited.has(neighbor)) {
            collectPocketGroup(neighbor, countryId, capitalGroup, group, visited);
        }
    }
}

function findPockets(countryId) {
    const gridData = getGridData();
    const capitalGroup = findCapitalGroup(countryId);
    
    if (capitalGroup.size === 0) return [];
    
    const myCells = Object.keys(gridData).filter(pos => gridData[pos] === countryId);
    
    // ✅ МАЛЕНЬКАЯ СТРАНА (≤5 клеток) — всегда в снабжении
    if (myCells.length <= 5) return [];
    
    const cellStats = getCellStats();
    
    // ✅ Есть порт — вся страна в снабжении
    let hasPort = false;
    for (const pos of myCells) {
        const cell = cellStats[pos];
        if (cell && cell.buildings && cell.buildings.includes('port')) {
            hasPort = true;
            break;
        }
    }
    if (hasPort) return [];
    
    // ✅ Достаточно заводов (1 завод на 3 клетки) — страна в снабжении
    let totalFactories = 0;
    for (const pos of myCells) {
        const cell = cellStats[pos];
        if (cell) totalFactories += cell.factories || 0;
    }
    if (totalFactories > 0 && myCells.length <= totalFactories * 3) {
        return [];
    }
    
    const pockets = [];
    const processed = new Set();
    
    for (const pos of myCells) {
        if (capitalGroup.has(pos)) continue;
        if (processed.has(pos)) continue;
        
        const cell = cellStats[pos];
        
        // Порт всегда в снабжении
        if (cell && cell.buildings && cell.buildings.includes('port')) continue;
        
        // Проверяем связь с основной группой
        if (!hasSupplyPath(pos, countryId, capitalGroup, new Set())) {
            const pocketGroup = new Set();
            collectPocketGroup(pos, countryId, capitalGroup, pocketGroup, new Set());
            
            // ✅ Маленькая группа с заводом — не котёл
            if (pocketGroup.size <= 5) {
                let pocketFactories = 0;
                for (const p of pocketGroup) {
                    const c = cellStats[p];
                    if (c) pocketFactories += c.factories || 0;
                }
                if (pocketFactories > 0) continue;
            }
            
            if (pocketGroup.size > 0) {
                for (const p of pocketGroup) processed.add(p);
                
                pockets.push({
                    cells: [...pocketGroup],
                    size: pocketGroup.size,
                    countryId: countryId
                });
            }
        }
    }
    
    // ✅ Маленькая страна (≤10 клеток) с 80%+ в котлах — не считаем котлами
    const totalPocketCells = pockets.reduce((sum, p) => sum + p.size, 0);
    if (myCells.length <= 10 && totalPocketCells >= myCells.length * 0.8) {
        return [];
    }
    
    return pockets;
}

// ========== ПРИМЕНЕНИЕ ШТРАФОВ ==========

function applySupplyPenalties() {
    const myId = getMyCountryId();
    const gridData = getGridData();
    const allCountries = [...new Set(Object.values(gridData))];
    const wars = getWars();
    const notifiedPockets = new Set();
    
    for (const countryId of allCountries) {
        const pockets = findPockets(countryId);
        
        for (const pocket of pockets) {
            const units = getUnits();
            let unitsLost = 0;
            
            for (const u of units) {
                if (u.owner === countryId && pocket.cells.includes(u.pos)) {
                    // Урон 2-5 HP в день от голода
                    const supplyDamage = 2 + Math.floor(Math.random() * 4);
                    u.hp = Math.max(0, (u.hp || 0) - supplyDamage);
                    u.supplyPenalty = true;
                    
                    if (u.hp <= 0) {
                        import('./game.js').then(m => m.removeUnit(u.id));
                        unitsLost++;
                    }
                }
            }
            
            // Уведомления
            const pocketKey = `${countryId}_${pocket.size}`;
            
            if (countryId === myId && !notifiedPockets.has(pocketKey)) {
                notifiedPockets.add(pocketKey);
                addNotification(`⚠️ ${pocket.size} провинций отрезаны от снабжения!`, 'war');
                setTimeout(() => notifiedPockets.delete(pocketKey), 10000);
            }
            
            if (isAtWar(myId, countryId, wars) && !notifiedPockets.has(`enemy_${pocketKey}`)) {
                notifiedPockets.add(`enemy_${pocketKey}`);
                addNotification(`🔥 Враг в котле! ${pocket.size} клеток без снабжения.`, 'war');
                setTimeout(() => notifiedPockets.delete(`enemy_${pocketKey}`), 10000);
            }
        }
        
        // Авто-капитуляция если 90%+ страны в котлах
        const totalPocketCells = pockets.reduce((sum, p) => sum + p.size, 0);
        const allCells = Object.values(gridData).filter(id => id === countryId).length;
        
        if (totalPocketCells > 0 && allCells > 0 && totalPocketCells >= allCells * 0.9) {
            const enemies = getEnemiesOf(countryId, wars);
            if (enemies.length > 0) {
                addNotification(`💀 ${countryId.toUpperCase()} полностью окружена! Капитуляция!`, 'war');
                checkCapitulation(countryId, enemies[0]);
            }
        }
    }
}

// ========== ВИЗУАЛИЗАЦИЯ КОТЛОВ ==========

export function renderSupplyOverlay(ctx, camera, CELL_SIZE) {
    const myId = getMyCountryId();
    const gridData = getGridData();
    const wars = getWars();
    
    const allPockets = [];
    for (const countryId of [...new Set(Object.values(gridData))]) {
        const isEnemy = isAtWar(myId, countryId, wars);
        const isOurs = countryId === myId;
        
        if (!isEnemy && !isOurs) continue;
        
        const pockets = findPockets(countryId);
        for (const pocket of pockets) {
            allPockets.push({ ...pocket, isEnemy, isOurs });
        }
    }
    
    if (allPockets.length === 0) return;
    
    const now = Date.now();
    
    for (const pocket of allPockets) {
        const pulse = Math.sin(now / 500) * 0.3 + 0.7;
        
        for (const pos of pocket.cells) {
            const [x, y] = pos.split(',').map(Number);
            const screenX = x * CELL_SIZE;
            const screenY = y * CELL_SIZE;
            
            // Пульсирующая рамка
            ctx.strokeStyle = pocket.isEnemy ? 
                `rgba(255, 30, 30, ${pulse})` : 
                `rgba(255, 200, 0, ${pulse})`;
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.strokeRect(screenX + 1, screenY + 1, CELL_SIZE - 2, CELL_SIZE - 2);
            ctx.setLineDash([]);
            
            // Затемнение
            ctx.fillStyle = pocket.isEnemy ? 
                'rgba(255, 0, 0, 0.12)' : 
                'rgba(255, 200, 0, 0.12)';
            ctx.fillRect(screenX, screenY, CELL_SIZE, CELL_SIZE);
            
            // Иконка черепа для больших котлов
            if (pocket.size > 3) {
                const cx = screenX + CELL_SIZE / 2;
                const cy = screenY + CELL_SIZE / 2;
                
                ctx.font = `${CELL_SIZE * 0.6}px serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = pocket.isEnemy ? 
                    `rgba(255, 50, 50, ${pulse})` : 
                    `rgba(255, 180, 0, ${pulse})`;
                ctx.fillText('💀', cx, cy);
            }
        }
    }
}

// ========== ЭКСПОРТ ДЛЯ ИГРОВОГО ЦИКЛА ==========

export function processSupply() {
    applySupplyPenalties();
}

export function getPocketsForCountry(countryId) {
    return findPockets(countryId);
}

// ========== ОТЛАДКА ==========

export function debugSupply(countryId) {
    const capitalGroup = findCapitalGroup(countryId);
    const pockets = findPockets(countryId);
    const myCells = Object.keys(getGridData()).filter(pos => getGridData()[pos] === countryId);
    
    console.log(`=== СНАБЖЕНИЕ: ${countryId} ===`);
    console.log(`Всего клеток: ${myCells.length}`);
    console.log(`Основная группа: ${capitalGroup.size} клеток`);
    console.log(`Котлы: ${pockets.length}`);
    
    for (const p of pockets) {
        console.log(`  - Котёл: ${p.size} клеток, позиции: ${p.cells.slice(0, 3).join(', ')}...`);
    }
    
    return { capitalGroup, pockets };
}
