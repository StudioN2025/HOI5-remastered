// supply.js — ПОЛНАЯ ФИНАЛЬНАЯ СИСТЕМА СНАБЖЕНИЯ И КОТЛОВ (ФИКС ЭКСКЛАВОВ)

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

// ========== ПОИСК КОТЛОВ ==========

function findAllGroups(countryId) {
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
                // Своя территория ИЛИ союзная (снабжение через союзников)
                if (owner === countryId || areAlliesWith(countryId, owner)) {
                    visited.add(neighbor);
                    queue.push(neighbor);
                }
            }
        }
        
        allGroups.push(group);
    }
    
    // Сортируем по размеру (самая большая = столица)
    allGroups.sort((a, b) => b.size - a.size);
    return allGroups;
}

function isGroupSelfSufficient(group, countryId, allMyCells) {
    const cellStats = getCellStats();
    const gridData = getGridData();
    
    let hasPort = false;
    let totalFactories = 0;
    let waterBorderCount = 0;
    let totalBorderCount = 0;
    
    for (const pos of group) {
        const cell = cellStats[pos];
        if (cell?.buildings?.includes('port')) hasPort = true;
        if (cell) totalFactories += cell.factories || 0;
        
        // Считаем водные границы
        const [x, y] = pos.split(',').map(Number);
        for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
            totalBorderCount++;
            if (!gridData[`${x+dx},${y+dy}`]) waterBorderCount++;
        }
    }
    
    const waterRatio = totalBorderCount > 0 ? waterBorderCount / totalBorderCount : 0;
    
    // ✅ Порт = морское снабжение (не котёл)
    if (hasPort) return true;
    
    // ✅ Полуостров/остров (30%+ водных границ) = не котёл
    if (waterRatio >= 0.3) return true;
    
    // ✅ Крупный регион с заводами
    if (group.size >= 10 && totalFactories >= 2) return true;
    
    // ✅ Средний регион с заводами
    if (group.size >= 5 && totalFactories >= 1) return true;
    
    // ✅ Очень маленькая группа (1-4 клетки) с заводом
    if (group.size <= 4 && totalFactories >= 1) return true;
    
    // ✅ Снабжение через союзников
    for (const pos of group) {
        const [x, y] = pos.split(',').map(Number);
        for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
            const neighbor = `${x+dx},${y+dy}`;
            const owner = gridData[neighbor];
            if (owner && owner !== countryId && areAlliesWith(countryId, owner)) {
                return true; // Есть граница с союзником = снабжение
            }
        }
    }
    
    return false;
}

function findPockets(countryId) {
    const gridData = getGridData();
    const myCells = Object.keys(gridData).filter(pos => gridData[pos] === countryId);
    
    if (myCells.length === 0) return [];
    
    // ✅ МАЛЕНЬКАЯ СТРАНА (≤5 клеток) — всегда в снабжении
    if (myCells.length <= 5) return [];
    
    // ✅ Собираем все связные группы
    const allGroups = findAllGroups(countryId);
    if (allGroups.length <= 1) return []; // Одна группа = нет котлов
    
    const pockets = [];
    
    // Проверяем каждую группу кроме самой большой
    for (let i = 1; i < allGroups.length; i++) {
        const group = allGroups[i];
        
        // Проверяем самодостаточность
        if (isGroupSelfSufficient(group, countryId, myCells)) {
            continue; // Не котёл
        }
        
        // Проверяем связь с основной группой через союзников
        let connectedToMain = false;
        const mainGroup = allGroups[0];
        
        for (const pos of group) {
            const [x, y] = pos.split(',').map(Number);
            for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
                const neighbor = `${x+dx},${y+dy}`;
                const owner = gridData[neighbor];
                
                // Если сосед — союзник, и союзник граничит с основной группой
                if (owner && areAlliesWith(countryId, owner) && owner !== countryId) {
                    // Проверяем граничит ли союзник с основной группой
                    for (const mainPos of mainGroup) {
                        const [mx, my] = mainPos.split(',').map(Number);
                        const dist = Math.abs(x+dx - mx) + Math.abs(y+dy - my);
                        if (dist <= 3) { // Союзник рядом с основной группой
                            connectedToMain = true;
                            break;
                        }
                    }
                }
                if (connectedToMain) break;
            }
            if (connectedToMain) break;
        }
        
        if (connectedToMain) continue; // Снабжение через союзника
        
        // Это реальный котёл
        pockets.push({
            cells: [...group],
            size: group.size,
            countryId: countryId
        });
    }
    
    // ✅ Финальная проверка: если "котлы" = почти вся страна, а страна небольшая
    const totalPocketCells = pockets.reduce((sum, p) => sum + p.size, 0);
    if (myCells.length <= 30 && totalPocketCells >= myCells.length * 0.8) {
        return []; // Это не котлы, это основная территория разделена
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
        
        if (pockets.length === 0) continue;
        
        const allCells = Object.values(gridData).filter(id => id === countryId).length;
        const totalPocketCells = pockets.reduce((sum, p) => sum + p.size, 0);
        
        // ✅ Если котлы = почти вся страна — не применяем штрафы (ложное срабатывание)
        if (totalPocketCells >= allCells * 0.8 && allCells <= 30) continue;
        
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
            
            // Уведомления (не спамим)
            const pocketKey = `${countryId}_${pocket.size}`;
            
            if (countryId === myId && !notifiedPockets.has(pocketKey)) {
                notifiedPockets.add(pocketKey);
                addNotification(`⚠️ ${pocket.size} провинций отрезаны от снабжения! Потери: ${unitsLost} юнитов.`, 'war');
                setTimeout(() => notifiedPockets.delete(pocketKey), 10000);
            }
            
            if (isAtWar(myId, countryId, wars) && !notifiedPockets.has(`enemy_${pocketKey}`)) {
                notifiedPockets.add(`enemy_${pocketKey}`);
                addNotification(`🔥 Враг в котле! ${pocket.size} клеток без снабжения.`, 'war');
                setTimeout(() => notifiedPockets.delete(`enemy_${pocketKey}`), 10000);
            }
        }
        
        // Авто-капитуляция только если 90%+ в РЕАЛЬНЫХ котлах и страна не маленькая
        if (totalPocketCells >= allCells * 0.9 && allCells > 10) {
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
    
    if (!myId || !wars.length) return;
    
    const now = Date.now();
    
    for (const countryId of [...new Set(Object.values(gridData))]) {
        const isEnemy = isAtWar(myId, countryId, wars);
        const isOurs = countryId === myId;
        
        if (!isEnemy && !isOurs) continue;
        
        const pockets = findPockets(countryId);
        if (pockets.length === 0) continue;
        
        for (const pocket of pockets) {
            const pulse = Math.sin(now / 500) * 0.3 + 0.7;
            
            for (const pos of pocket.cells) {
                const [x, y] = pos.split(',').map(Number);
                const screenX = x * CELL_SIZE;
                const screenY = y * CELL_SIZE;
                
                // Пульсирующая рамка
                ctx.strokeStyle = isEnemy ? 
                    `rgba(255, 30, 30, ${pulse})` : 
                    `rgba(255, 200, 0, ${pulse})`;
                ctx.lineWidth = 2;
                ctx.setLineDash([4, 4]);
                ctx.strokeRect(screenX + 1, screenY + 1, CELL_SIZE - 2, CELL_SIZE - 2);
                ctx.setLineDash([]);
                
                // Лёгкое затемнение
                ctx.fillStyle = isEnemy ? 
                    'rgba(255, 0, 0, 0.08)' : 
                    'rgba(255, 200, 0, 0.08)';
                ctx.fillRect(screenX, screenY, CELL_SIZE, CELL_SIZE);
                
                // 💀 только для больших котлов (>5 клеток)
                if (pocket.size > 5) {
                    const cx = screenX + CELL_SIZE / 2;
                    const cy = screenY + CELL_SIZE / 2;
                    
                    ctx.font = `${CELL_SIZE * 0.6}px serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle = isEnemy ? 
                        `rgba(255, 50, 50, ${pulse + 0.2})` : 
                        `rgba(255, 180, 0, ${pulse + 0.2})`;
                    ctx.fillText('💀', cx, cy);
                }
            }
        }
    }
}

// ========== ЭКСПОРТ ==========

export function processSupply() {
    applySupplyPenalties();
}

export function getPocketsForCountry(countryId) {
    return findPockets(countryId);
}

// ========== ОТЛАДКА ==========

export function debugSupply(countryId) {
    const allGroups = findAllGroups(countryId);
    const pockets = findPockets(countryId);
    const myCells = Object.keys(getGridData()).filter(pos => getGridData()[pos] === countryId);
    
    console.log(`=== СНАБЖЕНИЕ: ${countryId} ===`);
    console.log(`Всего клеток: ${myCells.length}`);
    console.log(`Связных групп: ${allGroups.length}`);
    
    allGroups.forEach((group, i) => {
        const cellStats = getCellStats();
        let ports = 0, factories = 0;
        for (const pos of group) {
            const cell = cellStats[pos];
            if (cell?.buildings?.includes('port')) ports++;
            if (cell) factories += cell.factories || 0;
        }
        
        const status = i === 0 ? '🏛️ СТОЛИЦА' : 
            pockets.some(p => p.cells.some(c => group.has(c))) ? '🔥 КОТЁЛ' : '✅ Снабжается';
        
        console.log(`  Группа ${i+1}: ${group.size} клеток | 🏭${factories} | ⚓${ports} | ${status}`);
    });
    
    return { allGroups, pockets };
}
