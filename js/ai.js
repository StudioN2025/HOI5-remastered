// ai.js — искусственный интеллект для компьютерных стран

import { getMyCountryId, getGridData, getWars, getUnits, getGameSpeed, addWar, addUnit, addToBuildingQueue, getActiveResearch, getTech, setActiveResearch, getActiveFocus, getCompletedFocuses, setActiveFocus, getBuildingQueue } from './game.js';
import { NATIONAL_FOCUSES } from './data.js';
import { isAtWar, getEnemiesOf, calculateCountryStats } from './utils.js';

const RESEARCH_DURATION = 100;
const CONSTRUCTION_TIME = 135;

export function runCountryAI(countryId) {
    if (countryId === getMyCountryId() || getGameSpeed() === 0) return;

    const stats = calculateCountryStats(countryId, getGridData(), {});

    // 1. Исследования
    if (!getActiveResearch() && Math.random() < 0.1) {
        const techs = ['industry', 'infantry', 'tank'];
        const randomTech = techs[Math.floor(Math.random() * techs.length)];
        const currentLevel = getTech()[randomTech] || 1;
        setActiveResearch({ type: randomTech, level: currentLevel + 1, daysLeft: RESEARCH_DURATION });
    }

    // 2. Национальные фокусы
    if (!getActiveFocus() && NATIONAL_FOCUSES[countryId]) {
        const completed = getCompletedFocuses();
        const available = NATIONAL_FOCUSES[countryId].filter(f => !completed.has(f.id));
        if (available.length > 0 && Math.random() < 0.15) {
            const focus = available[0];
            setActiveFocus({ ...focus, daysLeft: 70 });
        }
    }

    // 3. Строительство
    if (getBuildingQueue().length < 2 && stats.totalFactories > 0 && Math.random() < 0.1) {
        const myCells = Object.keys(getGridData()).filter(pos => getGridData()[pos] === countryId);
        if (myCells.length > 0) {
            const randomPos = myCells[Math.floor(Math.random() * myCells.length)];
            addToBuildingQueue({ type: 'factory', pos: randomPos, daysLeft: CONSTRUCTION_TIME });
        }
    }

    // 4. Создание армии
    if (stats.totalFactories > 0 && Math.random() < 0.05) {
        const myCells = Object.keys(getGridData()).filter(pos => getGridData()[pos] === countryId);
        if (myCells.length > 0) {
            const spawnPos = myCells[Math.floor(Math.random() * myCells.length)];
            const unitType = Math.random() > 0.3 ? 'infantry' : 'tank';
            addUnit({ pos: spawnPos, owner: countryId, type: unitType, trainingDaysLeft: 10, path: [] });
        }
    }

    // 5. Военная логика
    const units = getUnits().filter(u => u.owner === countryId && u.path.length === 0);
    const enemies = getEnemiesOf(countryId, getWars());

    units.forEach(u => {
        if (enemies.length > 0 && Math.random() < 0.3) {
            const enemyCells = Object.keys(getGridData()).filter(pos => enemies.includes(getGridData()[pos]));
            if (enemyCells.length > 0) {
                const target = enemyCells[Math.floor(Math.random() * enemyCells.length)];
                
                const [sx, sy] = u.pos.split(',').map(Number);
                const [tx, ty] = target.split(',').map(Number);
                
                let path = [];
                let cx = sx, cy = sy;
                let steps = 0;
                
                while ((cx !== tx || cy !== sy) && steps < 50) {
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
}

export function runAllAI() {
    const gridData = getGridData();
    const allCountries = [...new Set(Object.values(gridData))];
    allCountries.forEach(countryId => runCountryAI(countryId));
}
