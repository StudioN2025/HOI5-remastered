// ai.js — ИИ НЕ ТРОГАЕТ ИГРОКА

import { 
    getMyCountryId, getGridData, getWars, getUnits, getGameSpeed, 
    addUnit, addToBuildingQueue, getActiveResearch, getTech, 
    setActiveResearch, getActiveFocus, getCompletedFocuses, setActiveFocus, 
    getBuildingQueue, getCellStats,
    getAlliances
} from './game.js';
import { NATIONAL_FOCUSES, UNIT_STATS } from './data.js';
import { isAtWar, getEnemiesOf, calculateCountryStats } from './utils.js';

const RESEARCH_DURATION = 100;
const CONSTRUCTION_TIME = 135;

const aiResources = {};

function getAIResources(countryId) {
    if (!aiResources[countryId]) {
        const stats = calculateCountryStats(countryId, getGridData(), getCellStats());
        aiResources[countryId] = {
            equipment: 500 + stats.totalFactories * 100,
            manpower: stats.totalPop * 0.05
        };
    }
    return aiResources[countryId];
}

export function runCountryAI(countryId) {
    const myId = getMyCountryId();
    
    // ✅ НЕ ТРОГАЕМ ИГРОКА
    if (countryId === myId || getGameSpeed() === 0) return;

    const stats = calculateCountryStats(countryId, getGridData(), getCellStats());
    const aiRes = getAIResources(countryId);

    // 1. Исследования
    if (!getActiveResearch() && Math.random() < 0.05) {
        const techs = ['industry', 'infantry', 'tank'];
        const randomTech = techs[Math.floor(Math.random() * techs.length)];
        const currentLevel = getTech()[randomTech] || 1;
        if (currentLevel < 5) {
            setActiveResearch({ type: randomTech, level: currentLevel + 1, daysLeft: RESEARCH_DURATION });
        }
    }

    // 2. Национальные фокусы
    if (!getActiveFocus() && NATIONAL_FOCUSES[countryId]) {
        const completed = getCompletedFocuses();
        const available = NATIONAL_FOCUSES[countryId].filter(f => !completed.has(f.id));
        if (available.length > 0 && Math.random() < 0.1) {
            const focus = available[0];
            setActiveFocus({ ...focus, daysLeft: 70 });
        }
    }

    // 3. Строительство
    const aiQueue = getBuildingQueue().filter(b => b.owner === countryId);
    if (aiQueue.length < 2 && stats.totalFactories > 0) {
        if (aiRes.equipment >= 500 && Math.random() < 0.1) {
            const myCells = Object.keys(getGridData()).filter(pos => getGridData()[pos] === countryId);
            if (myCells.length > 0) {
                const randomPos = myCells[Math.floor(Math.random() * myCells.length)];
                aiRes.equipment -= 500;
                addToBuildingQueue({ 
                    type: 'factory', 
                    pos: randomPos, 
                    daysLeft: CONSTRUCTION_TIME, 
                    owner: countryId 
                });
            }
        }
    }

    // 4. Создание армии
    const aiUnits = getUnits().filter(u => u.owner === countryId);
    const maxUnits = Math.floor(stats.totalFactories * 0.5) + 3;
    
    if (aiUnits.length < maxUnits && Math.random() < 0.08) {
        const unitType = Math.random() > 0.3 ? 'infantry' : 'tank';
        const unitStats = UNIT_STATS[unitType];
        
        if (aiRes.equipment >= unitStats.costEquipment) {
            const myCells = Object.keys(getGridData()).filter(pos => getGridData()[pos] === countryId);
            if (myCells.length > 0) {
                const spawnPos = myCells[Math.floor(Math.random() * myCells.length)];
                aiRes.equipment -= unitStats.costEquipment;
                
                const unit = {
                    id: `ai_${countryId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    pos: spawnPos,
                    owner: countryId,
                    type: unitType,
                    hp: unitStats.hp || 100,
                    trainingDaysLeft: 10,
                    path: [],
                    moveCooldown: 0,
                    inCombat: false
                };
                addUnit(unit);
            }
        }
    }

    // 5. Военная логика
    const enemies = getEnemiesOf(countryId, getWars());
    
    aiUnits.forEach(u => {
        if (u.trainingDaysLeft <= 0 && !u.inCombat && u.path.length === 0 && enemies.length > 0 && Math.random() < 0.3) {
            const enemyCells = Object.keys(getGridData()).filter(pos => enemies.includes(getGridData()[pos]));
            if (enemyCells.length > 0) {
                const target = enemyCells[Math.floor(Math.random() * enemyCells.length)];
                
                const [sx, sy] = u.pos.split(',').map(Number);
                const [tx, ty] = target.split(',').map(Number);
                
                let path = [];
                let cx = sx, cy = sy;
                let steps = 0;
                
                while ((cx !== tx || cy !== sy) && steps < 100) {
                    if (cx < tx) cx++;
                    else if (cx > tx) cx--;
                    if (cy < ty) cy++;
                    else if (cy > ty) cy--;
                    path.push(`${cx},${cy}`);
                    steps++;
                }
                
                u.path = path;
            }
        }
    });
    
    // Производство для ИИ
    aiRes.equipment += stats.totalFactories * 1.5;
}

export function runAllAI() {
    const gridData = getGridData();
    const allCountries = [...new Set(Object.values(gridData))];
    allCountries.forEach(countryId => runCountryAI(countryId));
}
