// ai.js — УМНЫЙ ИИ (ПОЛНАЯ ПЕРЕРАБОТКА)

import { 
    getMyCountryId, getGridData, getWars, getUnits, getGameSpeed, 
    addUnit, addToBuildingQueue, getActiveResearch, getTech, 
    setActiveResearch, getBuildingQueue, getCellStats,
    getAIActiveFocus, setAIActiveFocus, getAICompletedFocuses, addAICompletedFocus,
    getAlliances
} from './game.js';
import { NATIONAL_FOCUSES, UNIT_STATS, COUNTRIES } from './data.js';
import { isAtWar, getEnemiesOf, calculateCountryStats, addNotification } from './utils.js';

const RESEARCH_DURATION = 100;
const CONSTRUCTION_TIME = 135;

// Экономика ИИ
const aiResources = {};
const aiPersonality = {}; // Характер страны: aggressive, defensive, balanced

function getAIResources(countryId) {
    if (!aiResources[countryId]) {
        const stats = calculateCountryStats(countryId, getGridData(), getCellStats());
        aiResources[countryId] = {
            equipment: 500 + stats.totalFactories * 150,
            manpower: Math.floor(stats.totalPop * 0.05)
        };
    }
    return aiResources[countryId];
}

function getPersonality(countryId) {
    if (!aiPersonality[countryId]) {
        const info = COUNTRIES[countryId];
        const ideology = info?.ideology || 'Нейтралитет';
        
        if (ideology === 'Фашизм') aiPersonality[countryId] = 'aggressive';
        else if (ideology === 'Коммунизм') aiPersonality[countryId] = 'aggressive';
        else if (ideology === 'Демократия') aiPersonality[countryId] = 'defensive';
        else aiPersonality[countryId] = 'balanced';
    }
    return aiPersonality[countryId];
}

// ========== СТРАТЕГИЧЕСКАЯ ОЦЕНКА ==========

function getBorderCells(countryId, targetId) {
    const gridData = getGridData();
    const borders = [];
    
    for (const [pos, owner] of Object.entries(gridData)) {
        if (owner !== countryId) continue;
        
        const [x, y] = pos.split(',').map(Number);
        const neighbors = [[0,1],[0,-1],[1,0],[-1,0]];
        const touchesEnemy = neighbors.some(([dx, dy]) => 
            gridData[`${x+dx},${y+dy}`] === targetId
        );
        
        if (touchesEnemy) borders.push(pos);
    }
    return borders;
}

function getFrontLine(countryId) {
    const enemies = getEnemiesOf(countryId, getWars());
    const gridData = getGridData();
    const frontLine = [];
    
    for (const [pos, owner] of Object.entries(gridData)) {
        if (owner !== countryId) continue;
        
        const [x, y] = pos.split(',').map(Number);
        const neighbors = [[0,1],[0,-1],[1,0],[-1,0]];
        const touchesEnemy = neighbors.some(([dx, dy]) => {
            const neighbor = gridData[`${x+dx},${y+dy}`];
            return neighbor && enemies.includes(neighbor);
        });
        
        if (touchesEnemy) frontLine.push(pos);
    }
    return frontLine;
}

function getWeakestEnemy(countryId) {
    const enemies = getEnemiesOf(countryId, getWars());
    if (!enemies.length) return null;
    
    let weakest = null;
    let weakestPower = Infinity;
    
    for (const enemyId of enemies) {
        const stats = calculateCountryStats(enemyId, getGridData(), getCellStats());
        const units = getUnits().filter(u => u.owner === enemyId);
        
        // Сила = заводы * 2 + юниты * 5
        const power = stats.totalFactories * 2 + units.length * 5;
        
        if (power < weakestPower) {
            weakestPower = power;
            weakest = enemyId;
        }
    }
    
    return weakest;
}

function getStrongestEnemy(countryId) {
    const enemies = getEnemiesOf(countryId, getWars());
    if (!enemies.length) return null;
    
    let strongest = null;
    let strongestPower = 0;
    
    for (const enemyId of enemies) {
        const stats = calculateCountryStats(enemyId, getGridData(), getCellStats());
        const units = getUnits().filter(u => u.owner === enemyId);
        const power = stats.totalFactories * 2 + units.length * 5;
        
        if (power > strongestPower) {
            strongestPower = power;
            strongest = enemyId;
        }
    }
    
    return strongest;
}

// ========== ВОЕННОЕ ПЛАНИРОВАНИЕ ==========

function planOffensive(countryId, unit, enemies) {
    if (!enemies.length || unit.inCombat) return;
    
    const frontLine = getFrontLine(countryId);
    if (!frontLine.length) return;
    
    // Находим ближайшую вражескую клетку к линии фронта
    let bestTarget = null;
    let bestDistance = Infinity;
    
    for (const frontPos of frontLine) {
        const [fx, fy] = frontPos.split(',').map(Number);
        const [ux, uy] = unit.pos.split(',').map(Number);
        
        // Ищем вражеские клетки рядом с линией фронта
        const gridData = getGridData();
        const neighbors = [[0,1],[0,-1],[1,0],[-1,0]];
        
        for (const [dx, dy] of neighbors) {
            const targetPos = `${fx+dx},${fy+dy}`;
            const targetOwner = gridData[targetPos];
            
            if (targetOwner && enemies.includes(targetOwner)) {
                const dist = Math.abs(ux - (fx+dx)) + Math.abs(uy - (fy+dy));
                if (dist < bestDistance) {
                    bestDistance = dist;
                    bestTarget = targetPos;
                }
            }
        }
    }
    
    if (bestTarget && bestDistance < 30) {
        unit.path = calculatePath(unit.pos, bestTarget, countryId);
    }
}

function planDefense(countryId, unit, enemies) {
    if (!enemies.length || unit.inCombat) return;
    
    const gridData = getGridData();
    const frontLine = getFrontLine(countryId);
    
    if (!frontLine.length) return;
    
    // Находим участок фронта где меньше всего своих войск
    let weakestFront = null;
    let weakestCount = Infinity;
    
    for (const pos of frontLine) {
        const myUnits = getUnits().filter(u => u.owner === countryId && u.pos === pos);
        if (myUnits.length < weakestCount) {
            weakestCount = myUnits.length;
            weakestFront = pos;
        }
    }
    
    if (weakestFront && weakestCount < 2) {
        unit.path = calculatePath(unit.pos, weakestFront, countryId);
    }
}

function planEncirclement(countryId, unit, enemies) {
    if (!enemies.length || unit.inCombat || Math.random() > 0.15) return;
    
    const gridData = getGridData();
    const enemyAreas = [];
    
    // Ищем вражеские выступы (клетки окружённые на 3+ сторон)
    for (const [pos, owner] of Object.entries(gridData)) {
        if (!enemies.includes(owner)) continue;
        
        const [x, y] = pos.split(',').map(Number);
        const neighbors = [[0,1],[0,-1],[1,0],[-1,0]];
        let blockedSides = 0;
        
        for (const [dx, dy] of neighbors) {
            const neighbor = gridData[`${x+dx},${y+dy}`];
            if (!neighbor || neighbor === countryId || 
                getAlliances().some(a => a.has(countryId) && a.has(neighbor))) {
                blockedSides++;
            }
        }
        
        if (blockedSides >= 3) enemyAreas.push(pos);
    }
    
    if (enemyAreas.length) {
        const target = enemyAreas[Math.floor(Math.random() * enemyAreas.length)];
        unit.path = calculatePath(unit.pos, target, countryId);
    }
}

function calculatePath(startPos, endPos, owner) {
    const gridData = getGridData();
    const units = getUnits();
    const wars = getWars();
    const enemies = getEnemiesOf(owner, wars);
    
    const [sx, sy] = startPos.split(',').map(Number);
    const [tx, ty] = endPos.split(',').map(Number);
    
    const queue = [{ x: sx, y: sy, path: [] }];
    const visited = new Set([`${sx},${sy}`]);
    
    while (queue.length > 0) {
        const { x, y, path } = queue.shift();
        
        if (x === tx && y === ty) return path;
        if (path.length > 80) continue;
        
        const neighbors = [[1,0],[-1,0],[0,1],[0,-1]].sort(() => Math.random() - 0.5);
        
        for (const [dx, dy] of neighbors) {
            const nx = x + dx, ny = y + dy;
            const key = `${nx},${ny}`;
            
            if (visited.has(key)) continue;
            
            const cellOwner = gridData[key];
            if (!cellOwner) continue;
            
            // Не идём через вражеских юнитов
            const enemyUnit = units.find(u => u.pos === key && u.owner !== owner && 
                isAtWar(owner, u.owner, wars));
            if (enemyUnit) continue;
            
            const isEnemy = enemies.includes(cellOwner);
            const isAlly = cellOwner === owner || getAlliances().some(a => a.has(owner) && a.has(cellOwner));
            
            if (!isEnemy && !isAlly) continue;
            
            visited.add(key);
            queue.push({ x: nx, y: ny, path: [...path, key] });
        }
    }
    
    return null;
}

// ========== ЭКОНОМИЧЕСКОЕ ПЛАНИРОВАНИЕ ==========

function shouldBuildMilitary(countryId) {
    const stats = calculateCountryStats(countryId, getGridData(), getCellStats());
    const units = getUnits().filter(u => u.owner === countryId);
    
    // Если врагов больше чем юнитов — срочно строим армию
    const enemies = getEnemiesOf(countryId, getWars());
    if (enemies.length > 0 && units.length < 5) return true;
    
    // Если маленькая страна — фокус на фабрики
    if (stats.cellCount < 20) return false;
    
    return units.length < stats.totalFactories * 0.5;
}

// ========== ГЛАВНЫЙ ИИ ==========

export function runCountryAI(countryId) {
    const myId = getMyCountryId();
    if (countryId === myId || getGameSpeed() === 0) return;
    
    const personality = getPersonality(countryId);
    const stats = calculateCountryStats(countryId, getGridData(), getCellStats());
    const aiRes = getAIResources(countryId);
    const enemies = getEnemiesOf(countryId, getWars());
    const myUnits = getUnits().filter(u => u.owner === countryId);
    const frontLine = getFrontLine(countryId);
    
    // ========== 1. ПРОИЗВОДСТВО ==========
    aiRes.equipment += stats.totalFactories * 1.5;
    
    // ========== 2. ИССЛЕДОВАНИЯ ==========
    if (!getActiveResearch() && Math.random() < 0.05) {
        const priority = enemies.length > 0 ? 
            ['tank', 'infantry', 'industry'] : 
            ['industry', 'infantry', 'tank'];
        
        for (const techType of priority) {
            const currentLevel = getTech()[techType] || 1;
            if (currentLevel < 5) {
                setActiveResearch({ type: techType, level: currentLevel + 1, daysLeft: RESEARCH_DURATION });
                break;
            }
        }
    }
    
    // ========== 3. ФОКУСЫ ==========
    const aiActiveFocus = getAIActiveFocus(countryId);
    const aiCompleted = getAICompletedFocuses(countryId);
    const countryFocuses = NATIONAL_FOCUSES[countryId] || [];
    
    if (!aiActiveFocus && countryFocuses.length) {
        const available = countryFocuses.filter(f => !aiCompleted.has(f.id));
        if (available.length && Math.random() < 0.1) {
            const focus = available[Math.floor(Math.random() * Math.min(3, available.length))];
            setAIActiveFocus(countryId, { ...focus, daysLeft: 70 });
        }
    }
    
    if (aiActiveFocus) {
        aiActiveFocus.daysLeft--;
        if (aiActiveFocus.daysLeft <= 0) {
            if (aiActiveFocus.effect) {
                const ctx = {
                    resources: aiRes,
                    declareWar: (targetId) => {
                        import('./game.js').then(m => m.addWar(countryId, targetId));
                    },
                    addEquipment: (amount) => { aiRes.equipment += amount; }
                };
                aiActiveFocus.effect(ctx);
            }
            addAICompletedFocus(countryId, aiActiveFocus.id);
            setAIActiveFocus(countryId, null);
        }
    }
    
    // ========== 4. СТРОИТЕЛЬСТВО ==========
    const aiQueue = getBuildingQueue().filter(b => b.owner === countryId);
    const needFactories = stats.totalFactories < stats.cellCount * 0.15;
    
    if (aiQueue.length < 3 && aiRes.equipment >= 500 && Math.random() < 0.1) {
        const myCells = Object.keys(getGridData()).filter(pos => getGridData()[pos] === countryId);
        if (myCells.length) {
            const pos = myCells[Math.floor(Math.random() * myCells.length)];
            aiRes.equipment -= 500;
            addToBuildingQueue({ type: 'factory', pos, daysLeft: CONSTRUCTION_TIME, owner: countryId });
        }
    }
    
    // ========== 5. АРМИЯ ==========
    const maxUnits = Math.max(3, Math.floor(stats.totalFactories * 0.6) + 5);
    
    if (myUnits.length < maxUnits) {
        const buildChance = enemies.length > 0 ? 0.15 : 0.04;
        
        if (Math.random() < buildChance) {
            // Выбираем тип юнита
            let unitType = 'infantry';
            if (stats.totalFactories > 3 && getTech().tank > 1 && Math.random() < 0.4) {
                unitType = 'tank';
            }
            
            const cost = UNIT_STATS[unitType].costEquipment;
            
            if (aiRes.equipment >= cost) {
                // Размещаем ближе к фронту или в столице
                let spawnPos;
                if (frontLine.length && enemies.length) {
                    spawnPos = frontLine[Math.floor(Math.random() * frontLine.length)];
                } else {
                    const myCells = Object.keys(getGridData()).filter(pos => getGridData()[pos] === countryId);
                    spawnPos = myCells[Math.floor(Math.random() * myCells.length)];
                }
                
                if (spawnPos) {
                    aiRes.equipment -= cost;
                    addUnit({
                        id: `ai_${countryId}_${Date.now()}_${Math.random().toString(36).substr(2,9)}`,
                        pos: spawnPos,
                        owner: countryId,
                        type: unitType,
                        hp: UNIT_STATS[unitType].hp || 100,
                        trainingDaysLeft: 10,
                        path: [],
                        moveCooldown: 0,
                        inCombat: false
                    });
                }
            }
        }
    }
    
    // ========== 6. ВОЕННАЯ СТРАТЕГИЯ ==========
    if (!enemies.length) return;
    
    // Оценка баланса сил
    const myPower = myUnits.filter(u => u.trainingDaysLeft <= 0).length * 3 + stats.totalFactories * 2;
    let enemyPower = 0;
    enemies.forEach(e => {
        const eStats = calculateCountryStats(e, getGridData(), getCellStats());
        const eUnits = getUnits().filter(u => u.owner === e && u.trainingDaysLeft <= 0);
        enemyPower += eUnits.length * 3 + eStats.totalFactories * 2;
    });
    
    const advantage = myPower / Math.max(1, enemyPower);
    
    // Формируем группы
    const availableUnits = myUnits.filter(u => u.trainingDaysLeft <= 0 && !u.inCombat);
    const idleUnits = availableUnits.filter(u => !u.path || u.path.length === 0);
    
    // Разделяем на атакующие и защитные группы
    const attackGroup = [];
    const defenseGroup = [];
    
    // 70% в атаку если преимущество, 30% если劣势
    const attackRatio = advantage > 1.2 ? 0.7 : advantage > 0.8 ? 0.5 : 0.3;
    
    idleUnits.forEach(u => {
        if (Math.random() < attackRatio) attackGroup.push(u);
        else defenseGroup.push(u);
    });
    
    // АТАКУЮЩИЕ — концентрируются на слабейшем враге
    const target = getWeakestEnemy(countryId);
    if (target && attackGroup.length) {
        const borderCells = getBorderCells(countryId, target);
        
        // Групповая атака на одну точку прорыва
        if (borderCells.length && attackGroup.length >= 2) {
            const breakthrough = borderCells[Math.floor(Math.random() * borderCells.length)];
            
            attackGroup.forEach(u => {
                const targetCell = findAdjacentEnemyCell(breakthrough, target);
                if (targetCell) {
                    const path = calculatePath(u.pos, targetCell, countryId);
                    if (path) u.path = path;
                }
            });
        }
    }
    
    // ОБОРОНЯЮЩИЕСЯ — защищают фронт и ключевые точки
    defenseGroup.forEach(u => {
        if (frontLine.length) {
            // Ищем точку фронта где врагов больше всего
            let hottestFront = null;
            let maxEnemies = 0;
            
            for (const pos of frontLine) {
                const [fx, fy] = pos.split(',').map(Number);
                const nearbyEnemies = getUnits().filter(eu => {
                    const [ex, ey] = eu.pos.split(',').map(Number);
                    return enemies.includes(eu.owner) && 
                           Math.abs(ex-fx) <= 2 && Math.abs(ey-fy) <= 2;
                }).length;
                
                if (nearbyEnemies > maxEnemies) {
                    maxEnemies = nearbyEnemies;
                    hottestFront = pos;
                }
            }
            
            if (hottestFront) {
                const path = calculatePath(u.pos, hottestFront, countryId);
                if (path) u.path = path;
            }
        }
    });
    
    // Тактика окружения (15% шанс)
    if (advantage > 1.5 && attackGroup.length >= 3 && Math.random() < 0.15) {
        const encirclementTarget = getStrongestEnemy(countryId);
        if (encirclementTarget) {
            const borderCells = getBorderCells(countryId, encirclementTarget);
            if (borderCells.length >= 2) {
                // Два удара с разных сторон
                const flank1 = borderCells[0];
                const flank2 = borderCells[borderCells.length - 1];
                
                const half = Math.floor(attackGroup.length / 2);
                attackGroup.slice(0, half).forEach(u => {
                    const target = findAdjacentEnemyCell(flank1, encirclementTarget);
                    if (target) { const p = calculatePath(u.pos, target, countryId); if (p) u.path = p; }
                });
                attackGroup.slice(half).forEach(u => {
                    const target = findAdjacentEnemyCell(flank2, encirclementTarget);
                    if (target) { const p = calculatePath(u.pos, target, countryId); if (p) u.path = p; }
                });
            }
        }
    }
}

function findAdjacentEnemyCell(frontCell, enemyId) {
    const gridData = getGridData();
    const [fx, fy] = frontCell.split(',').map(Number);
    const neighbors = [[0,1],[0,-1],[1,0],[-1,0]];
    
    for (const [dx, dy] of neighbors) {
        const pos = `${fx+dx},${fy+dy}`;
        if (gridData[pos] === enemyId) return pos;
    }
    return null;
}

export function runAllAI() {
    const gridData = getGridData();
    const allCountries = [...new Set(Object.values(gridData))];
    allCountries.forEach(countryId => runCountryAI(countryId));
}
