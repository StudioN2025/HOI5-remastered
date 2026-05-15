// focuses.js — ПОЛНЫЙ С addPorts

import { 
    getMyCountryId, getActiveFocus, setActiveFocus, 
    getCompletedFocuses, addCompletedFocus, 
    getPlayerResources, setPlayerResources, 
    getGridData, getCellStats, setCellStats,
    addUnit, addWar 
} from './game.js';
import { NATIONAL_FOCUSES } from './data.js';
import { addNotification } from './utils.js';

export function getAvailableFocuses() {
    const myCountryId = getMyCountryId();
    const completed = getCompletedFocuses();
    const focuses = NATIONAL_FOCUSES[myCountryId] || [];
    return focuses.filter(f => !completed.has(f.id));
}

export function startFocus(focusId) {
    const myCountryId = getMyCountryId();
    const focuses = NATIONAL_FOCUSES[myCountryId] || [];
    const focus = focuses.find(f => f.id === focusId);
    const completed = getCompletedFocuses();
    
    if (!focus || completed.has(focus.id)) return false;
    if (getActiveFocus()) {
        addNotification('Фокус уже выполняется!', 'info');
        return false;
    }
    
    setActiveFocus({ ...focus, daysLeft: 70 });
    addNotification(`Национальный фокус "${focus.name}" начат!`, 'info');
    
    const indicator = document.getElementById('focus-indicator');
    if (indicator) indicator.classList.remove('hidden');
    return true;
}

export function updateFocus() {
    const activeFocus = getActiveFocus();
    if (!activeFocus) return;
    
    activeFocus.daysLeft--;
    
    if (activeFocus.daysLeft <= 0) {
        const ctx = createFocusContext();
        if (activeFocus.effect) activeFocus.effect(ctx);
        addCompletedFocus(activeFocus.id);
        setActiveFocus(null);
        addNotification(`Фокус "${activeFocus.name}" завершён!`, 'info');
        
        const indicator = document.getElementById('focus-indicator');
        if (indicator) indicator.classList.add('hidden');
    }
}

function createFocusContext() {
    const resources = getPlayerResources();
    const myId = getMyCountryId();
    return {
        resources,
        declareWar: (targetId) => addWar(myId, targetId),
        proposeAlliance: (targetId) => {
            import('./diplomacy.js').then(m => m.proposeAlliance(targetId));
        },
        addEquipment: (amount) => {
            resources.equipment += amount;
            setPlayerResources(resources);
        },
        addFactories: (count) => {
            const gridData = getGridData();
            const myCells = Object.keys(gridData).filter(k => gridData[k] === myId);
            const cellStats = getCellStats();
            for (let i = 0; i < count && i < myCells.length; i++) {
                const pos = myCells[i];
                if (!cellStats[pos]) cellStats[pos] = { population: 10000, factories: 0, buildings: [] };
                cellStats[pos].factories = (cellStats[pos].factories || 0) + 1;
            }
            setCellStats(cellStats);
        },
        addUnits: (type, count) => {
            const gridData = getGridData();
            const myCells = Object.keys(gridData).filter(k => gridData[k] === myId);
            for (let i = 0; i < count; i++) {
                const pos = myCells[Math.floor(Math.random() * myCells.length)];
                if (pos) {
                    addUnit({ pos, owner: myId, type, trainingDaysLeft: 0, path: [], inCombat: false });
                }
            }
        },
        addPorts: (count) => {
            const gridData = getGridData();
            const cellStats = getCellStats();
            const myCells = Object.keys(gridData).filter(k => gridData[k] === myId);
            let portsAdded = 0;
            
            for (const pos of myCells) {
                if (portsAdded >= count) break;
                const [x, y] = pos.split(',').map(Number);
                const isCoastal = [[0,1],[0,-1],[1,0],[-1,0]].some(([dx,dy]) => !gridData[`${x+dx},${y+dy}`]);
                if (isCoastal) {
                    if (!cellStats[pos]) cellStats[pos] = { population: 10000, factories: 0, buildings: [] };
                    if (!cellStats[pos].buildings) cellStats[pos].buildings = [];
                    if (!cellStats[pos].buildings.includes('port')) {
                        cellStats[pos].buildings.push('port');
                        portsAdded++;
                    }
                }
            }
            setCellStats(cellStats);
        },
        getGridData: () => getGridData(),
        getCellStats: () => getCellStats()
    };
}

export function updateFocusUI() {
    const container = document.getElementById('window-content');
    if (!container) return;
    
    const activeFocus = getActiveFocus();
    const availableFocuses = getAvailableFocuses();
    const myCountryId = getMyCountryId();
    const allFocuses = NATIONAL_FOCUSES[myCountryId] || [];
    const completed = getCompletedFocuses();
    
    let html = '';
    
    if (activeFocus) {
        const progress = ((70 - activeFocus.daysLeft) / 70) * 100;
        html += `
            <div class="bg-yellow-900/30 border border-yellow-500 p-4 rounded mb-4">
                <div class="font-bold text-yellow-500">Выполняется: ${activeFocus.name}</div>
                <div class="progress-bar mt-2">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                </div>
                <div class="text-right text-xs text-gray-400 mt-1">${activeFocus.daysLeft} дней</div>
            </div>
        `;
    }
    
    html += '<div class="space-y-3">';
    allFocuses.forEach(focus => {
        const isDone = completed.has(focus.id);
        const isAvailable = !isDone && !activeFocus;
        
        html += `
            <div class="unit-card ${isDone ? 'opacity-50' : ''}">
                <div class="flex justify-between items-center">
                    <div>
                        <div class="font-bold ${isDone ? 'text-emerald-500' : 'text-yellow-500'}">${focus.name}</div>
                        <div class="text-xs text-gray-400 mt-1">${focus.description}</div>
                    </div>
                    <div>
                        ${isAvailable ? `<button onclick="window.startFocus('${focus.id}')" class="bg-yellow-700 hover:bg-yellow-600 px-3 py-1 text-xs rounded">ВЫБРАТЬ</button>` : ''}
                        ${isDone ? '<span class="text-emerald-500 text-xs">✅ ЗАВЕРШЕНО</span>' : ''}
                    </div>
                </div>
            </div>
        `;
    });
    html += '</div>';
    
    container.innerHTML = html;
}

window.startFocus = startFocus;
