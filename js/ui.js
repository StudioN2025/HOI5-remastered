import { getCountryInfo, getCellData, addNotification, isAtWar, areAllies } from './utils.js';
import { getMyCountryId, getWars, getAlliances, getGridData, getCellStats, getPlayerResources, getUnits, getBuildingQueue } from './game.js';
import { UNIT_STATS, BUILDING_STATS, TECH_TREE } from './data.js';
import { startRecruitment, setSelectedUnitId } from './military.js';
import { declareWar, proposeAlliance, kickFromAlliance, getWarsList, getAlliancesList } from './diplomacy.js';
import { startResearch, getTechLevel, updateResearchUI } from './tech.js';
import { startFocus, updateFocusUI, getAvailableFocuses } from './focuses.js';

let currentOpenTab = null;

export function openWindow(tab) {
    const windowDiv = document.getElementById('info-window');
    const content = document.getElementById('window-content');
    const title = document.getElementById('window-title');
    
    windowDiv.classList.remove('hidden');
    currentOpenTab = tab;
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    
    if (tab === 'army') {
        title.innerText = 'АРМИЯ';
        renderArmyUI(content);
    } else if (tab === 'research') {
        title.innerText = 'ТЕХНОЛОГИИ';
        updateResearchUI();
    } else if (tab === 'focus') {
        title.innerText = 'НАЦИОНАЛЬНЫЕ ФОКУСЫ';
        updateFocusUI();
    } else if (tab === 'diplomacy') {
        title.innerText = 'ДИПЛОМАТИЯ';
        renderDiplomacyUI(content);
    } else if (tab === 'build') {
        title.innerText = 'СТРОИТЕЛЬСТВО';
        renderBuildUI(content);
    } else if (tab === 'economy') {
        title.innerText = 'ЭКОНОМИКА';
        renderEconomyUI(content);
    }
}

export function closeWindow() {
    document.getElementById('info-window').classList.add('hidden');
    currentOpenTab = null;
}

function renderArmyUI(container) {
    const units = getUnits();
    const myCountryId = getMyCountryId();
    const myUnits = units.filter(u => u.owner === myCountryId);
    
    let html = `
        <div class="space-y-3 mb-4">
            <div class="bg-gray-700 p-3 rounded">
                <div class="font-bold mb-2">🆕 НАБОР</div>
                <div class="grid grid-cols-2 gap-2">
    `;
    
    Object.entries(UNIT_STATS).forEach(([key, u]) => {
        html += `
            <button onclick="window.openRecruitPanel('${key}')" class="bg-emerald-800 hover:bg-emerald-700 p-2 rounded text-sm">
                ${u.icon} ${u.name}
            </button>
        `;
    });
    
    html += `
                </div>
            </div>
            <div class="font-bold text-yellow-500">⚔️ ВОЙСКА (${myUnits.length})</div>
    `;
    
    if (myUnits.length === 0) {
        html += '<div class="text-center text-gray-400 py-4">Нет войск</div>';
    } else {
        myUnits.forEach(u => {
            const stats = UNIT_STATS[u.type];
            html += `
                <div class="unit-card">
                    <div class="flex justify-between items-center">
                        <div>
                            <span class="font-bold">${stats.icon} ${stats.name}</span>
                            ${u.trainingDaysLeft > 0 ? `<span class="text-xs text-yellow-500 ml-2">(тренировка: ${u.trainingDaysLeft} дн.)</span>` : ''}
                        </div>
                        <button onclick="window.selectUnit('${u.id}')" class="bg-blue-700 hover:bg-blue-600 px-3 py-1 text-xs rounded">ВЫБРАТЬ</button>
                    </div>
                    <div class="text-xs text-gray-400 mt-1">❤️ HP: ${Math.floor(u.hp || 100)}/${stats.hp}</div>
                    ${u.path?.length > 0 ? `<div class="text-xs text-blue-400">🚶 В движении</div>` : ''}
                </div>
            `;
        });
    }
    
    html += '</div>';
    container.innerHTML = html;
}

window.openRecruitPanel = (unitType) => {
    closeWindow();
    const hint = document.getElementById('hint');
    const hintText = document.getElementById('hint-text');
    hintText.innerText = `Выберите провинцию для развертывания ${UNIT_STATS[unitType].name}`;
    hint.classList.remove('hidden');
    
    window._pendingRecruit = unitType;
    setTimeout(() => {
        hint.classList.add('hidden');
        window._pendingRecruit = null;
    }, 10000);
};

window.selectUnit = (unitId) => {
    setSelectedUnitId(unitId);
    closeWindow();
    const hint = document.getElementById('hint');
    const hintText = document.getElementById('hint-text');
    hintText.innerText = `Выберите цель для движения`;
    hint.classList.remove('hidden');
    setTimeout(() => hint.classList.add('hidden'), 5000);
};

function renderDiplomacyUI(container) {
    const myCountryId = getMyCountryId();
    const enemies = getWarsList();
    const allies = getAlliancesList();
    
    let html = `
        <div class="mb-6">
            <div class="font-bold text-emerald-500 mb-2">🤝 СОЮЗНИКИ</div>
            ${allies.length === 0 ? '<div class="text-gray-400 text-sm">Нет союзников</div>' : ''}
            ${allies.map(a => `
                <div class="bg-gray-700 p-2 rounded mb-1 flex justify-between items-center">
                    <span>${getCountryInfo(a).name}</span>
                    <button onclick="window.kickAlly('${a}')" class="text-red-400 text-xs hover:text-red-300">ИСКЛЮЧИТЬ</button>
                </div>
            `).join('')}
        </div>
        <div>
            <div class="font-bold text-red-500 mb-2">⚔️ ВОЙНЫ</div>
            ${enemies.length === 0 ? '<div class="text-gray-400 text-sm">Мирное время</div>' : ''}
            ${enemies.map(e => `
                <div class="bg-gray-700 p-2 rounded mb-1">
                    <span>${getCountryInfo(e).name}</span>
                </div>
            `).join('')}
        </div>
    `;
    
    container.innerHTML = html;
}

function renderBuildUI(container) {
    const buildingQueue = getBuildingQueue();
    
    let html = '';
    
    if (buildingQueue.length > 0) {
        const current = buildingQueue[0];
        const stats = BUILDING_STATS[current.type];
        html += `
            <div class="bg-blue-900/30 border border-blue-500 p-3 rounded mb-4">
                <div class="flex justify-between text-sm">
                    <span>🏗️ ${stats?.name || 'Стройка'}</span>
                    <span>${current.daysLeft} дн.</span>
                </div>
                <div class="progress-bar mt-2">
                    <div class="progress-fill bg-blue-500" style="width: ${((stats?.buildTime - current.daysLeft) / stats?.buildTime) * 100}%"></div>
                </div>
            </div>
        `;
    }
    
    html += '<div class="grid grid-cols-2 gap-2">';
    Object.entries(BUILDING_STATS).forEach(([key, b]) => {
        html += `
            <button onclick="window.openBuildMode('${key}')" class="bg-blue-800 hover:bg-blue-700 p-3 rounded text-center">
                <div class="text-2xl">${b.icon}</div>
                <div class="text-xs font-bold">${b.name}</div>
                <div class="text-[10px] text-gray-300">${b.costEquipment} 🔫</div>
            </button>
        `;
    });
    html += '</div>';
    
    container.innerHTML = html;
}

window.openBuildMode = (buildType) => {
    closeWindow();
    const hint = document.getElementById('hint');
    const hintText = document.getElementById('hint-text');
    hintText.innerText = `Выберите провинцию для строительства ${BUILDING_STATS[buildType].name}`;
    hint.classList.remove('hidden');
    
    window._pendingBuild = buildType;
    setTimeout(() => {
        hint.classList.add('hidden');
        window._pendingBuild = null;
    }, 10000);
};

function renderEconomyUI(container) {
    const resources = getPlayerResources();
    const myCountryId = getMyCountryId();
    
    let html = `
        <div class="space-y-4">
            <div class="bg-gray-700 p-4 rounded">
                <div class="text-sm text-gray-400">РЕСУРСЫ</div>
                <div class="text-2xl font-bold text-yellow-500">🔫 ${Math.floor(resources.equipment).toLocaleString()}</div>
                <div class="text-lg">👥 ${Math.floor(resources.manpower).toLocaleString()}</div>
                <div class="text-lg">🏭 ${resources.factories}</div>
            </div>
            <div class="bg-gray-700 p-4 rounded">
                <div class="text-sm text-gray-400">ПРОИЗВОДСТВО</div>
                <div class="text-sm">+${Math.floor(resources.factories * 1.5)} 🔫 в день</div>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

export function showCountryInfo(countryId, posKey) {
    const info = getCountryInfo(countryId);
    const cell = getCellData(posKey, getCellStats());
    const myCountryId = getMyCountryId();
    
    document.getElementById('sidebar-title').innerText = info.name;
    document.getElementById('sidebar-leader').innerText = info.leader;
    document.getElementById('sidebar-ideology').innerText = info.ideology;
    document.getElementById('sidebar-pop').innerText = cell.population.toLocaleString();
    document.getElementById('sidebar-factories').innerText = cell.factories;
    
    const actionsDiv = document.getElementById('sidebar-actions');
    if (countryId !== myCountryId) {
        actionsDiv.classList.remove('hidden');
        const isAtWarFlag = isAtWar(myCountryId, countryId, getWars());
        const isAllied = areAllies(myCountryId, countryId, getAlliances());
        
        actionsDiv.innerHTML = `
            ${!isAtWarFlag ? `<button id="btn-war" class="w-full bg-red-700 hover:bg-red-600 py-2 text-sm font-bold mb-2 rounded">⚔️ ОБЪЯВИТЬ ВОЙНУ</button>` : '<div class="text-red-500 text-sm text-center mb-2">⚔️ В СОСТОЯНИИ ВОЙНЫ</div>'}
            ${!isAllied && !isAtWarFlag ? `<button id="btn-ally" class="w-full bg-emerald-700 hover:bg-emerald-600 py-2 text-sm font-bold rounded">🤝 ПРЕДЛОЖИТЬ АЛЬЯНС</button>` : ''}
        `;
        
        const warBtn = document.getElementById('btn-war');
        const allyBtn = document.getElementById('btn-ally');
        if (warBtn) warBtn.onclick = () => { declareWar(countryId); showCountryInfo(countryId, posKey); };
        if (allyBtn) allyBtn.onclick = () => { proposeAlliance(countryId); showCountryInfo(countryId, posKey); };
    } else {
        actionsDiv.classList.add('hidden');
    }
    
    document.getElementById('info-sidebar').classList.remove('hidden');
}

export function setupUIEvents() {
    // Закрытие сайдбара при клике вне
    document.addEventListener('click', (e) => {
        const sidebar = document.getElementById('info-sidebar');
        const sidebarActions = document.getElementById('sidebar-actions');
        if (sidebar && !sidebar.contains(e.target) && !sidebarActions?.contains(e.target)) {
            if (e.target !== canvas) {
                sidebar.classList.add('hidden');
            }
        }
    });
}