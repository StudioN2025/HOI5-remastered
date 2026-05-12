// ui.js — пользовательский интерфейс

import { getMyCountryId, getPlayerResources, getBuildingQueue, getWars, getAlliances, getTech, getActiveResearch, getActiveFocus, getCompletedFocuses, getUnits, getGameSpeed } from './game.js';
import { UNIT_STATS, BUILDING_STATS, TECH_TREE, COUNTRIES } from './data.js';
import { getCountryInfo, getCellData, calculateCountryStats, isAtWar, areAllies, getEnemiesOf, getAlliesOf, addNotification } from './utils.js';
import { declareWar, proposeAlliance, kickFromAlliance, callToWar } from './diplomacy.js';
import { setRecruitMode, clearRecruitMode, getRecruitMode } from './military.js';

// Глобальные ссылки для onclick из HTML
window.startResearch = async (type, level) => {
    const { startResearch } = await import('./tech.js');
    startResearch(type, level);
    openWindow('research');
};

window.startFocus = async (focusId) => {
    const { startFocus } = await import('./focuses.js');
    startFocus(focusId);
    openWindow('focus');
};

window.selectUnitForMove = (unitId) => {
    import('./game.js').then(m => {
        m.setSelectedUnitId(unitId);
        closeWindow();
        showHint('Выберите цель для движения юнита');
        setTimeout(() => document.getElementById('order-hint')?.classList.add('hidden'), 10000);
    });
};

window.recruitUnit = (type) => {
    setRecruitMode(type);
    closeWindow();
    document.getElementById('recruit-hint')?.classList.remove('hidden');
};

window.declareWarOn = (id) => {
    declareWar(id);
    const sidebar = document.getElementById('info-sidebar');
    if (sidebar) sidebar.classList.add('hidden');
};

window.proposeAlly = (id) => {
    proposeAlliance(id);
    const sidebar = document.getElementById('info-sidebar');
    if (sidebar) sidebar.classList.add('hidden');
};

export function openWindow(tab) {
    const win = document.getElementById('info-window');
    const title = document.getElementById('window-title');
    const content = document.getElementById('window-content');
    
    if (!win || !title || !content) return;
    
    win.classList.remove('hidden');
    
    switch(tab) {
        case 'army': renderArmyWindow(title, content); break;
        case 'research': renderResearchWindow(title, content); break;
        case 'focus': renderFocusWindow(title, content); break;
        case 'diplomacy': renderDiplomacyWindow(title, content); break;
        case 'build': renderBuildWindow(title, content); break;
    }
}

export function closeWindow() {
    document.getElementById('info-window')?.classList.add('hidden');
}

export function showHint(text) {
    const hint = document.getElementById('hint');
    const hintText = document.getElementById('hint-text');
    if (hint && hintText) {
        hintText.innerText = text;
        hint.classList.remove('hidden');
    }
}

export function updateTopBar() {
    const myCountryId = getMyCountryId();
    if (!myCountryId) return;
    
    const resources = getPlayerResources();
    const stats = calculateCountryStats(myCountryId, window._gridData || {}, window._cellStats || {});
    
    resources.factories = stats.totalFactories;
    
    const countryNameElem = document.getElementById('country-name');
    const manpowerElem = document.getElementById('val-manpower');
    const factoriesElem = document.getElementById('val-factories');
    const equipmentElem = document.getElementById('val-equipment');
    
    if (countryNameElem) countryNameElem.innerText = getCountryInfo(myCountryId).name;
    if (manpowerElem) manpowerElem.innerText = Math.floor(resources.manpower || 0).toLocaleString();
    if (factoriesElem) factoriesElem.innerText = resources.factories || 0;
    if (equipmentElem) equipmentElem.innerText = Math.floor(resources.equipment || 0).toLocaleString();
}

export function showCountryInfo(countryId, posKey) {
    const info = getCountryInfo(countryId);
    const cell = getCellData(posKey, window._cellStats || {});
    const myId = getMyCountryId();
    
    const sidebar = document.getElementById('info-sidebar');
    if (!sidebar) return;
    
    document.getElementById('sidebar-title').innerText = info.name;
    document.getElementById('sidebar-leader').innerText = info.leader;
    document.getElementById('sidebar-ideology').innerText = info.ideology;
    document.getElementById('sidebar-pop').innerText = (cell.population || 0).toLocaleString();
    document.getElementById('sidebar-factories').innerText = cell.factories || 0;
    
    const actionsDiv = document.getElementById('sidebar-actions');
    
    if (countryId !== myId) {
        actionsDiv.classList.remove('hidden');
        const atWar = isAtWar(myId, countryId, getWars());
        const allied = areAllies(myId, countryId, getAlliances());
        
        actionsDiv.innerHTML = `
            ${!atWar ? `<button onclick="window.declareWarOn('${countryId}')" class="w-full bg-red-700 hover:bg-red-600 py-2 text-sm font-bold rounded mb-2">⚔️ ОБЪЯВИТЬ ВОЙНУ</button>` : '<div class="text-red-500 text-sm text-center mb-2">⚔️ В СОСТОЯНИИ ВОЙНЫ</div>'}
            ${!atWar && !allied ? `<button onclick="window.proposeAlly('${countryId}')" class="w-full bg-emerald-700 hover:bg-emerald-600 py-2 text-sm font-bold rounded">🤝 ПРЕДЛОЖИТЬ АЛЬЯНС</button>` : ''}
        `;
    } else {
        actionsDiv.classList.add('hidden');
    }
    
    sidebar.classList.remove('hidden');
}

function renderArmyWindow(title, content) {
    title.innerText = '🎖️ АРМИЯ';
    const myId = getMyCountryId();
    const units = getUnits().filter(u => u.owner === myId);
    const resources = getPlayerResources();
    
    let html = `
        <div class="space-y-3 mb-4">
            <div class="bg-gray-700 p-4 rounded-lg">
                <div class="grid grid-cols-3 gap-2 text-center">
                    <div>
                        <div class="text-xs text-gray-400">🔫 СНАРЯЖЕНИЕ</div>
                        <div class="text-lg font-bold text-yellow-400">${Math.floor(resources.equipment || 0).toLocaleString()}</div>
                    </div>
                    <div>
                        <div class="text-xs text-gray-400">👥 ЛЮДИ</div>
                        <div class="text-lg font-bold text-emerald-400">${Math.floor(resources.manpower || 0).toLocaleString()}</div>
                    </div>
                    <div>
                        <div class="text-xs text-gray-400">🏭 ЗАВОДЫ</div>
                        <div class="text-lg font-bold text-blue-400">${resources.factories || 0}</div>
                    </div>
                </div>
            </div>
            
            <div class="font-bold text-yellow-500">🆕 НАБОР ВОЙСК</div>
            <div class="space-y-2">
                ${Object.entries(UNIT_STATS).map(([key, u]) => `
                    <div class="bg-gray-700 p-3 rounded-lg border-l-4 border-yellow-500">
                        <div class="flex justify-between items-center">
                            <div>
                                <span class="text-2xl">${u.icon}</span>
                                <span class="font-bold ml-2">${u.name}</span>
                                <div class="text-xs text-gray-400 mt-1">💰 ${u.costEquipment} 🔫 | 👥 ${u.costManpower} чел</div>
                            </div>
                            <button onclick="window.recruitUnit('${key}')" class="bg-emerald-700 hover:bg-emerald-600 px-4 py-2 text-xs rounded font-bold">НАБРАТЬ</button>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="font-bold text-yellow-500 mt-4">⚔️ ВОЙСКА (${units.length})</div>
            <div class="space-y-2 max-h-60 overflow-y-auto">
                ${units.length === 0 ? '<div class="text-center text-gray-500 py-4">Нет войск</div>' : ''}
                ${units.map(u => {
                    const stats = UNIT_STATS[u.type];
                    const hpPercent = stats ? (u.hp / stats.hp * 100) : 100;
                    return `
                        <div class="bg-gray-700 p-3 rounded-lg">
                            <div class="flex justify-between items-center">
                                <div>
                                    <span class="text-xl">${stats?.icon || '❓'}</span>
                                    <span class="font-bold ml-1">${stats?.name || u.type}</span>
                                    ${u.trainingDaysLeft > 0 ? `<span class="text-xs text-yellow-400 ml-2">(тренировка: ${u.trainingDaysLeft} дн.)</span>` : '<span class="text-xs text-green-400 ml-2">✓ готов</span>'}
                                </div>
                                <button onclick="window.selectUnitForMove('${u.id}')" class="bg-blue-700 hover:bg-blue-600 px-3 py-1 text-xs rounded">ВЫБРАТЬ</button>
                            </div>
                            <div class="mt-2">
                                <div class="w-full bg-gray-600 rounded-full h-2 overflow-hidden">
                                    <div class="bg-green-500 h-full rounded-full" style="width: ${hpPercent}%"></div>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
    
    content.innerHTML = html;
}

function renderBuildWindow(title, content) {
    title.innerText = '🏗️ СТРОИТЕЛЬСТВО';
    const resources = getPlayerResources();
    const queue = getBuildingQueue();
    
    let html = '';
    
    if (queue.length > 0 && queue[0]) {
        const current = queue[0];
        const stats = BUILDING_STATS[current.type];
        const progress = stats ? ((stats.buildTime - current.daysLeft) / stats.buildTime) * 100 : 0;
        
        html += `
            <div class="bg-blue-900/30 border border-blue-500 p-4 rounded mb-4">
                <div class="flex justify-between text-sm mb-2">
                    <span>🏗️ ${stats?.name || current.type}</span>
                    <span>${current.daysLeft} дн.</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill-blue" style="width: ${progress}%"></div>
                </div>
            </div>
        `;
    }
    
    html += '<div class="grid grid-cols-1 gap-2">';
    Object.entries(BUILDING_STATS).forEach(([key, b]) => {
        html += `
            <button onclick="window.selectBuildType('${key}')" class="bg-blue-800 hover:bg-blue-700 p-4 rounded text-center">
                <div class="text-2xl">${b.icon}</div>
                <div class="text-sm font-bold">${b.name}</div>
                <div class="text-xs text-gray-300">${b.costEquipment} 🔫</div>
            </button>
        `;
    });
    html += '</div>';
    
    content.innerHTML = html;
}

function renderDiplomacyWindow(title, content) {
    title.innerText = '🤝 ДИПЛОМАТИЯ';
    const myId = getMyCountryId();
    const allies = getAlliesOf(myId, getAlliances());
    const enemies = getEnemiesOf(myId, getWars());
    
    content.innerHTML = `
        <div class="space-y-4">
            <div class="bg-gray-700 p-4 rounded-lg">
                <div class="font-bold text-emerald-400 mb-2">🤝 СОЮЗНИКИ</div>
                ${allies.length === 0 ? '<div class="text-gray-400 text-sm py-2">Нет союзников</div>' : 
                    allies.map(a => `
                        <div class="bg-gray-600 p-2 rounded mb-1 flex justify-between items-center">
                            <span>${getCountryInfo(a).name}</span>
                            <div class="flex gap-2">
                                <button onclick="window.callToWar('${a}')" class="bg-red-700 hover:bg-red-600 px-2 py-1 text-xs rounded">ПРИЗВАТЬ</button>
                                <button onclick="window.kickAlly('${a}')" class="bg-gray-600 hover:bg-gray-500 px-2 py-1 text-xs rounded">ИСКЛЮЧИТЬ</button>
                            </div>
                        </div>
                    `).join('')
                }
            </div>
            <div class="bg-gray-700 p-4 rounded-lg">
                <div class="font-bold text-red-400 mb-2">⚔️ ВОЙНЫ</div>
                ${enemies.length === 0 ? '<div class="text-gray-400 text-sm py-2">Мирное время</div>' : 
                    enemies.map(e => `
                        <div class="bg-gray-600 p-2 rounded mb-1">
                            <span>${getCountryInfo(e).name}</span>
                            <span class="text-red-400 text-xs ml-2">⚔️ война</span>
                        </div>
                    `).join('')
                }
            </div>
        </div>
    `;
}

function renderResearchWindow(title, content) {
    title.innerText = '🔬 ТЕХНОЛОГИИ';
    import('./tech.js').then(m => m.updateResearchUI());
}

function renderFocusWindow(title, content) {
    title.innerText = '⭐ НАЦИОНАЛЬНЫЕ ФОКУСЫ';
    import('./focuses.js').then(m => m.updateFocusUI());
}

// Глобальные функции для окон
window.openWindow = openWindow;
window.closeWindow = closeWindow;
window.selectBuildType = (type) => {
    import('./economy.js').then(m => {
        closeWindow();
        m.startBuilding(type, null);
        showHint('Выберите провинцию для строительства');
        window._pendingBuild = type;
        setTimeout(() => {
            document.getElementById('hint')?.classList.add('hidden');
            window._pendingBuild = null;
        }, 10000);
    });
};
window.callToWar = callToWar;
window.kickAlly = kickFromAlliance;
