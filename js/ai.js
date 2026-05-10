import { state } from './state.js';
import { CONFIG } from './config.js';
import { calculateCountryStats } from './map.js';
import { getUnitStats } from './units.js';
import { nationalFocuses } from './data/focuses.js';

export function runCountryAI(countryId) {
    if (countryId === state.myCountryId || state.gameSpeed === 0) return;
    
    const stats = calculateCountryStats(countryId);
    
    // 1. Исследования
    if (!state.activeResearch && Math.random() < 0.1) {
        const techs = ['industry', 'tank', 'infantry', 'construction'];
        const randomTech = techs[Math.floor(Math.random() * techs.length)];
        state.activeResearch = { type: randomTech, level: state.tech[randomTech] + 1, daysLeft: CONFIG.RESEARCH_DURATION };
    }
    
    // 2. Национальные фокусы
    if (!state.activeFocus && nationalFocuses[countryId]) {
        const availableFocuses = nationalFocuses[countryId].filter(f => !state.completedFocuses.has(f.id));
        if (availableFocuses.length > 0) {
            const focus = availableFocuses[0];
            state.activeFocus = { ...focus, daysLeft: CONFIG.FOCUS_DURATION };
        }
    }
    
    // 3. Строительство
    if (state.buildingQueue.length < 2) {
        const myCells = Object.keys(state.gridData).filter(pos => state.gridData[pos] === countryId);
        if (myCells.length > 0) {
            const randomPos = myCells[Math.floor(Math.random() * myCells.length)];
            state.buildingQueue.push({ type: 'factory', pos: randomPos, daysLeft: CONFIG.CONSTRUCTION_TIME });
        }
    }
    
    // 4. Создание армии
    if (stats.totalFactories > 0 && Math.random() < 0.05) {
        const myCells = Object.keys(state.gridData).filter(pos => state.gridData[pos] === countryId);
        const spawnPos = myCells[Math.floor(Math.random() * myCells.length)];
        state.units.push({
            id: Math.random().toString(36).substr(2, 9),
            pos: spawnPos,
            owner: countryId,
            type: Math.random() > 0.3 ? 'infantry' : 'tank',
            hp: 100,
            trainingDaysLeft: 10,
            path: []
        });
    }
}
