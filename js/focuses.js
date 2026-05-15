// focuses.js — ВИЗУАЛЬНОЕ ДЕРЕВО ФОКУСОВ КАК В HoI4

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

// ========== ВИЗУАЛЬНОЕ ДЕРЕВО ФОКУСОВ ==========

// Позиции фокусов для каждой страны (x, y на канвасе)
const FOCUS_POSITIONS = {
    germany: {
        ger_rearm: { x: 400, y: 100 },
        ger_danzig: { x: 250, y: 250 },
        ger_axis: { x: 400, y: 250 },
        ger_west: { x: 550, y: 250 },
        ger_break_pact: { x: 400, y: 400 }
    },
    ussr: {
        ussr_five_year: { x: 300, y: 100 },
        ussr_industry: { x: 500, y: 100 },
        ussr_fin_war: { x: 200, y: 250 },
        ussr_baltic: { x: 400, y: 250 },
        ussr_defense: { x: 300, y: 400 }
    },
    italy: {
        ita_navy: { x: 350, y: 100 },
        ita_empire: { x: 500, y: 100 },
        ita_revive: { x: 350, y: 250 },
        ita_allies: { x: 500, y: 250 }
    },
    uk: {
        uk_navy: { x: 300, y: 100 },
        uk_empire: { x: 500, y: 100 },
        uk_guarantee: { x: 300, y: 250 },
        uk_raf: { x: 500, y: 250 }
    },
    france: {
        fra_maginot: { x: 300, y: 100 },
        fra_colonies: { x: 500, y: 100 },
        fra_allies: { x: 300, y: 250 },
        fra_revanche: { x: 500, y: 250 }
    },
    poland: {
        pol_army: { x: 300, y: 100 },
        pol_industry: { x: 500, y: 100 },
        pol_allies: { x: 300, y: 250 },
        pol_defense: { x: 500, y: 250 }
    },
    turkey: {
        tur_modernize: { x: 350, y: 100 },
        tur_straits: { x: 500, y: 100 },
        tur_balkans: { x: 350, y: 250 },
        tur_pan_turkic: { x: 500, y: 250 }
    }
};

// Соединения между фокусами (линии)
const FOCUS_CONNECTIONS = {
    germany: [
        ['ger_rearm', 'ger_danzig'],
        ['ger_rearm', 'ger_axis'],
        ['ger_rearm', 'ger_west'],
        ['ger_danzig', 'ger_break_pact'],
        ['ger_axis', 'ger_break_pact'],
        ['ger_west', 'ger_break_pact']
    ],
    ussr: [
        ['ussr_five_year', 'ussr_fin_war'],
        ['ussr_five_year', 'ussr_baltic'],
        ['ussr_industry', 'ussr_baltic'],
        ['ussr_baltic', 'ussr_defense'],
        ['ussr_fin_war', 'ussr_defense']
    ],
    italy: [
        ['ita_navy', 'ita_revive'],
        ['ita_empire', 'ita_revive'],
        ['ita_navy', 'ita_allies'],
        ['ita_empire', 'ita_allies']
    ],
    uk: [
        ['uk_navy', 'uk_guarantee'],
        ['uk_empire', 'uk_guarantee'],
        ['uk_navy', 'uk_raf'],
        ['uk_empire', 'uk_raf']
    ],
    france: [
        ['fra_maginot', 'fra_allies'],
        ['fra_colonies', 'fra_allies'],
        ['fra_maginot', 'fra_revanche'],
        ['fra_colonies', 'fra_revanche']
    ],
    poland: [
        ['pol_army', 'pol_allies'],
        ['pol_industry', 'pol_allies'],
        ['pol_army', 'pol_defense'],
        ['pol_industry', 'pol_defense']
    ],
    turkey: [
        ['tur_modernize', 'tur_balkans'],
        ['tur_straits', 'tur_balkans'],
        ['tur_modernize', 'tur_pan_turkic'],
        ['tur_straits', 'tur_pan_turkic']
    ]
};

// Иконки для фокусов
const FOCUS_ICONS = {
    // Военные
    ger_rearm: '🔫', ger_danzig: '⚔️', ger_west: '🗺️', ger_break_pact: '💥',
    ussr_fin_war: '❄️', ussr_defense: '🛡️',
    ita_revive: '🏛️', ita_navy: '⚓',
    uk_raf: '✈️', uk_navy: '🚢',
    fra_revanche: '⚔️', fra_maginot: '🏰',
    pol_army: '💂', pol_defense: '🛡️',
    tur_modernize: '🔫', tur_pan_turkic: '🐺',
    
    // Экономические
    ussr_five_year: '🏭', ussr_industry: '⚙️',
    ita_empire: '👑',
    uk_empire: '🌍',
    fra_colonies: '🌍',
    pol_industry: '🏭',
    tur_straits: '🌊',
    
    // Дипломатические
    ger_axis: '🤝',
    ussr_baltic: '🤝',
    ita_allies: '🤝',
    uk_guarantee: '📜',
    fra_allies: '🤝',
    pol_allies: '🤝',
    tur_balkans: '🤝'
};

export function updateFocusUI() {
    const container = document.getElementById('window-content');
    if (!container) return;
    
    const myCountryId = getMyCountryId();
    const allFocuses = NATIONAL_FOCUSES[myCountryId] || [];
    const completed = getCompletedFocuses();
    const activeFocus = getActiveFocus();
    const positions = FOCUS_POSITIONS[myCountryId] || {};
    const connections = FOCUS_CONNECTIONS[myCountryId] || [];
    
    if (allFocuses.length === 0) {
        container.innerHTML = '<div class="text-center text-gray-400 py-8">Нет доступных фокусов для этой страны</div>';
        return;
    }
    
    // Создаём SVG для дерева фокусов
    const svgWidth = 750;
    const svgHeight = 500;
    
    let html = `
        <div class="focus-tree-container" style="overflow: auto; max-height: 65vh;">
            <svg width="${svgWidth}" height="${svgHeight}" style="background: #1a1a2e; border-radius: 8px;">
                <!-- Сетка -->
                <defs>
                    <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                        <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)"/>
                
                <!-- Соединительные линии -->
                ${connections.map(([from, to]) => {
                    const p1 = positions[from];
                    const p2 = positions[to];
                    if (!p1 || !p2) return '';
                    
                    const isFromDone = completed.has(from);
                    const isToDone = completed.has(to);
                    const isActive = activeFocus && (activeFocus.id === from || activeFocus.id === to);
                    
                    const lineColor = isActive ? '#fbbf24' : (isFromDone && isToDone) ? '#22c55e' : '#4b5563';
                    const lineWidth = isActive ? 3 : 2;
                    
                    return `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="${lineColor}" stroke-width="${lineWidth}" stroke-dasharray="${isActive ? '8,4' : 'none'}"/>`;
                }).join('')}
                
                <!-- Ноды фокусов -->
                ${allFocuses.map(focus => {
                    const pos = positions[focus.id];
                    if (!pos) return '';
                    
                    const isDone = completed.has(focus.id);
                    const isActive = activeFocus && activeFocus.id === focus.id;
                    const isAvailable = !isDone && !activeFocus;
                    const icon = FOCUS_ICONS[focus.id] || '⭐';
                    
                    // Цвета ноды
                    let bgColor = '#374151';
                    let borderColor = '#4b5563';
                    let textColor = '#9ca3af';
                    
                    if (isDone) {
                        bgColor = '#14532d';
                        borderColor = '#22c55e';
                        textColor = '#86efac';
                    } else if (isActive) {
                        bgColor = '#713f12';
                        borderColor = '#fbbf24';
                        textColor = '#fde68a';
                    } else if (isAvailable) {
                        bgColor = '#1e3a5f';
                        borderColor = '#3b82f6';
                        textColor = '#93c5fd';
                    }
                    
                    // Размер ноды
                    const nodeSize = 60;
                    const x = pos.x - nodeSize/2;
                    const y = pos.y - nodeSize/2;
                    
                    return `
                        <g class="focus-node" style="cursor: ${isAvailable ? 'pointer' : 'default'}" onclick="${isAvailable ? `window.startFocus('${focus.id}')` : ''}">
                            <!-- Тень -->
                            <rect x="${x+2}" y="${y+2}" width="${nodeSize}" height="${nodeSize}" rx="8" fill="rgba(0,0,0,0.3)"/>
                            <!-- Фон -->
                            <rect x="${x}" y="${y}" width="${nodeSize}" height="${nodeSize}" rx="8" fill="${bgColor}" stroke="${borderColor}" stroke-width="${isActive ? 3 : 2}"/>
                            <!-- Иконка -->
                            <text x="${pos.x}" y="${pos.y - 2}" text-anchor="middle" font-size="22">${icon}</text>
                            <!-- Прогресс для активного -->
                            ${isActive ? `
                                <rect x="${x+4}" y="${y + nodeSize - 10}" width="${(nodeSize-8) * ((70 - activeFocus.daysLeft) / 70)}" height="4" rx="2" fill="#fbbf24"/>
                                <rect x="${x+4}" y="${y + nodeSize - 10}" width="${nodeSize-8}" height="4" rx="2" fill="none" stroke="#4b5563" stroke-width="1"/>
                            ` : ''}
                            <!-- Галочка для завершённого -->
                            ${isDone ? `
                                <circle cx="${pos.x + nodeSize/2 - 8}" cy="${pos.y - nodeSize/2 + 8}" r="10" fill="#22c55e"/>
                                <text x="${pos.x + nodeSize/2 - 8}" y="${pos.y - nodeSize/2 + 13}" text-anchor="middle" font-size="12" fill="white">✓</text>
                            ` : ''}
                            <!-- Название -->
                            <text x="${pos.x}" y="${pos.y + nodeSize/2 + 16}" text-anchor="middle" font-size="10" fill="${textColor}" font-family="'Special Elite', monospace">${focus.name}</text>
                        </g>
                    `;
                }).join('')}
            </svg>
        </div>
    `;
    
    // Легенда
    if (activeFocus) {
        html += `
            <div class="bg-yellow-900/30 border border-yellow-500 p-3 rounded mt-3">
                <div class="flex items-center gap-2">
                    <span class="text-yellow-500 font-bold">⚡ Выполняется: ${activeFocus.name}</span>
                    <span class="text-xs text-gray-400">(${activeFocus.daysLeft} дней)</span>
                </div>
                <div class="progress-bar mt-2">
                    <div class="progress-fill" style="width: ${((70 - activeFocus.daysLeft) / 70) * 100}%"></div>
                </div>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

window.startFocus = startFocus;
