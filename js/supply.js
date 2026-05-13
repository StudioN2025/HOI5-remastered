// supply.js — СИСТЕМА СНАБЖЕНИЯ И КОТЛОВ

import { getGridData, getUnits, getMyCountryId, getWars, getCellStats, getAlliances } from './game.js';
import { isAtWar, addNotification } from './utils.js';
import { checkCapitulation } from './diplomacy.js';

// ========== СНАБЖЕНИЕ ==========

// Проверяет, есть ли путь от клетки до столицы/порта
function hasSupplyPath(pos, countryId, visited = new Set()) {
    if (visited.has(pos)) return false;
    visited.add(pos);
    
    const gridData = getGridData();
    const [x, y] = pos.split(',').map(Number);
    const cellStats = getCellStats();
    const cell = cellStats[pos];
    
    // Порт = источник снабжения
    if (cell && cell.buildings && cell.buildings.includes('port')) return true;
    
    // Ищем путь до любой своей клетки
    const neighbors = [[0,1],[0,-1],[1,0],[-1,0]];
    
    for (const [dx, dy] of neighbors) {
        const neighborPos = `${x+dx},${y+dy}`;
        const owner = gridData[neighborPos];
        
        // Своя территория или союзная
        if (owner === countryId || areAlliesWith(countryId, owner)) {
            if (hasSupplyPath(neighborPos, countryId, visited)) return true;
        }
    }
    
    return false;
}

function areAlliesWith(c1, c2) {
    if (c1 === c2) return true;
    const alliances = getAlliances();
    return alliances.some(a => a.has(c1) && a.has(c2));
}

// ========== ПОИСК КОТЛОВ ==========

// Находит все отрезанные от снабжения группы клеток
function findPockets(countryId) {
    const gridData = getGridData();
    const myCells = [];
    
    // Собираем все клетки страны
    for (const [pos, owner] of Object.entries(gridData)) {
        if (owner === countryId) myCells.push(pos);
    }
    
    if (myCells.length === 0) return [];
    
    // Разбиваем на связные группы
    const visited = new Set();
    const pockets = [];
    
    for (const startPos of myCells) {
        if (visited.has(startPos)) continue;
        
        // BFS поиск связной группы
        const group = [];
        const queue = [startPos];
        visited.add(startPos);
        
        while (queue.length > 0) {
            const pos = queue.shift();
            group.push(pos);
            
            const [x, y] = pos.split(',').map(Number);
            const neighbors = [[0,1],[0,-1],[1,0],[-1,0]];
            
            for (const [dx, dy] of neighbors) {
                const neighbor = `${x+dx},${y+dy}`;
                if (visited.has(neighbor)) continue;
                
                const owner = gridData[neighbor];
                if (owner === countryId) {
                    visited.add(neighbor);
                    queue.push(neighbor);
                }
            }
        }
        
        // Проверяем есть ли у группы снабжение
        let hasSupply = false;
        for (const pos of group) {
            if (hasSupplyPath(pos, countryId, new Set())) {
                hasSupply = true;
                break;
            }
        }
        
        if (!hasSupply && group.length > 0) {
            pockets.push({
                cells: group,
                size: group.length,
                countryId: countryId
            });
        }
    }
    
    return pockets;
}

// ========== ШТРАФЫ ЗА ОКРУЖЕНИЕ ==========

function applySupplyPenalties() {
    const myId = getMyCountryId();
    const gridData = getGridData();
    const allCountries = [...new Set(Object.values(gridData))];
    const wars = getWars();
    
    for (const countryId of allCountries) {
        const pockets = findPockets(countryId);
        
        for (const pocket of pockets) {
            // Юниты в котле теряют HP каждый день
            const units = getUnits();
            for (const u of units) {
                if (u.owner === countryId && pocket.cells.includes(u.pos)) {
                    // Урон от отсутствия снабжения: 2-5 HP в день
                    const supplyDamage = 2 + Math.floor(Math.random() * 3);
                    u.hp = Math.max(0, (u.hp || 0) - supplyDamage);
                    
                    // Уничтожение юнита без снабжения
                    if (u.hp <= 0) {
                        import('./game.js').then(m => m.removeUnit(u.id));
                        
                        if (countryId === myId) {
                            addNotification(`💀 Юнит уничтожен в котле без снабжения!`, 'war');
                        }
                    }
                }
            }
            
            // Уведомление игроку о котле
            if (countryId === myId) {
                addNotification(`⚠️ ${pocket.size} провинций отрезаны от снабжения!`, 'war');
            }
            
            // Уведомление если враг в котле
            if (isAtWar(myId, countryId, wars)) {
                addNotification(`🔥 Враг отрезан! ${pocket.size} клеток в окружении.`, 'war');
            }
        }
        
        // Авто-капитуляция если котёл = вся страна
        const stats = import('./utils.js').then(m => m.calculateCountryStats(countryId, gridData, getCellStats()));
        const totalPocketCells = pockets.reduce((sum, p) => sum + p.size, 0);
        
        if (totalPocketCells > 0 && pockets.length === 1) {
            const allCells = Object.values(gridData).filter(id => id === countryId).length;
            if (totalPocketCells >= allCells * 0.9) {
                // 90%+ страны в котле
                const enemies = getEnemiesOf(countryId, wars);
                if (enemies.length > 0) {
                    checkCapitulation(countryId, enemies[0]);
                }
            }
        }
    }
}

function getEnemiesOf(countryId, wars) {
    const enemies = [];
    for (const w of wars) {
        if (w.a === countryId) enemies.push(w.b);
        if (w.b === countryId) enemies.push(w.a);
    }
    return [...new Set(enemies)];
}

// ========== ВИЗУАЛИЗАЦИЯ КОТЛОВ НА КАРТЕ ==========

export function renderSupplyOverlay(ctx, camera, CELL_SIZE) {
    const myId = getMyCountryId();
    const gridData = getGridData();
    const wars = getWars();
    
    for (const countryId of [...new Set(Object.values(gridData))]) {
        const pockets = findPockets(countryId);
        
        for (const pocket of pockets) {
            // Показываем только если это враг или мы
            const isEnemy = isAtWar(myId, countryId, wars);
            const isOurs = countryId === myId;
            
            if (isEnemy || isOurs) {
                for (const pos of pocket.cells) {
                    const [x, y] = pos.split(',').map(Number);
                    
                    // Красная рамка для вражеских котлов, жёлтая для своих
                    ctx.strokeStyle = isEnemy ? 'rgba(255, 0, 0, 0.6)' : 'rgba(255, 255, 0, 0.6)';
                    ctx.lineWidth = 2;
                    ctx.setLineDash([4, 4]);
                    ctx.strokeRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                    ctx.setLineDash([]);
                }
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
