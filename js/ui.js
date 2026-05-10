import { getCountryInfo, addNotification } from './utils.js';
import { getMyCountryId, getWars, getAlliances, getUnits, getResources, getGridData } from './game.js';
import { UNIT_STATS } from './data.js';
import { declareWar, proposeAlliance } from './diplomacy.js';

export function openTab(tab) {
    const windowDiv = document.getElementById('info-window');
    const content = document.getElementById('window-content');
    const title = document.getElementById('window-title');
    
    if (!windowDiv || !content || !title) return;
    
    windowDiv.classList.remove('hidden');
    
    if (tab === 'army') {
        title.innerText = 'АРМИЯ';
        renderArmy(content);
    } else if (tab === 'build') {
        title.innerText = 'СТРОИТЕЛЬСТВО';
        renderBuild(content);
    } else if (tab === 'diplomacy') {
        title.innerText = 'ДИПЛОМАТИЯ';
        renderDiplomacy(content);
    }
}

export function closeWindow() {
    const windowDiv = document.getElementById('info-window');
    if (windowDiv) windowDiv.classList.add('hidden');
}

function renderArmy(container) {
    const units = getUnits();
    const myId = getMyCountryId();
    const myUnits = units.filter(u => u.owner === myId);
    const resources = getResources();
    
    let html = '<div class="space-y-3 mb-4">';
    html += `<div class="bg-gray-700 p-2 rounded text-sm text-center">🔫 Снаряжение: ${Math.floor(resources.equipment)} | 👥 Люди: ${Math.floor(resources.manpower)}</div>`;
    html += '<div class="space-y-2">';
    
    Object.entries(UNIT_STATS).forEach(([key, u]) => {
        const canAfford = resources.equipment >= u.cost && resources.manpower >= u.manpower;
        html += `
            <div class="unit-card flex justify-between items-center">
                <div>
                    <span class="text-xl">${u.icon}</span>
                    <span class="font-bold">${u.name}</span>
                    <div class="text-xs text-gray-400">⚔️${u.attack} 🛡️${u.defense} ❤️${u.hp}</div>
                    <div class="text-[10px] text-gray-500">${u.cost}🔫 ${u.manpower}👥</div>
                </div>
                <button onclick="window.recruitUnit('${key}')" 
                    class="px-3 py-1 text-xs rounded ${canAfford ? 'bg-emerald-700 hover:bg-emerald-600' : 'bg-gray-600 cursor-not-allowed'}"
                    ${!canAfford ? 'disabled' : ''}>
                    НАБРАТЬ
                </button>
            </div>
        `;
    });
    
    html += '</div><div class="mt-4 font-bold text-yellow-500">⚔️ ВОЙСКА (' + myUnits.length + ')</div>';
    
    if (myUnits.length === 0) {
        html += '<div class="text-gray-400 text-sm text-center py-2">Нет войск</div>';
    } else {
        myUnits.forEach(u => {
            html += `
                <div class="bg-gray-700 p-2 rounded text-sm flex justify-between items-center">
                    <span>${UNIT_STATS[u.type]?.icon} ${UNIT_STATS[u.type]?.name}</span>
                    <span class="text-xs ${u.trainingDaysLeft > 0 ? 'text-yellow-500' : 'text-green-500'}">
                        ${u.trainingDaysLeft > 0 ? `тренировка ${u.trainingDaysLeft} дн.` : 'готов'}
                    </span>
                </div>
            `;
        });
    }
    
    html += '</div>';
    container.innerHTML = html;
}

function renderBuild(container) {
    const resources = getResources();
    
    let html = '<div class="space-y-3">';
    html += `<div class="bg-gray-700 p-2 rounded text-sm text-center">🔫 Снаряжение: ${Math.floor(resources.equipment)}</div>`;
    html += `
        <div class="unit-card">
            <div class="flex justify-between items-center">
                <div><span class="text-2xl">🏭</span> <span class="font-bold">ВОЕННЫЙ ЗАВОД</span></div>
                <div class="text-yellow-500">500 🔫</div>
            </div>
            <div class="text-xs text-gray-400 mt-1">Увеличивает производство снаряжения</div>
            <button onclick="window.buildFactory()" 
                class="mt-2 w-full bg-blue-700 hover:bg-blue-600 py-1 text-sm rounded ${resources.equipment >= 500 ? '' : 'opacity-50 cursor-not-allowed'}"
                ${resources.equipment >= 500 ? '' : 'disabled'}>
                ПОСТРОИТЬ
            </button>
        </div>
        <div class="unit-card">
            <div class="flex justify-between items-center">
                <div><span class="text-2xl">⚓</span> <span class="font-bold">МОРСКОЙ ПОРТ</span></div>
                <div class="text-yellow-500">300 🔫</div>
            </div>
            <div class="text-xs text-gray-400 mt-1">Позволяет морские переброски</div>
            <button onclick="window.buildPort()" 
                class="mt-2 w-full bg-blue-700 hover:bg-blue-600 py-1 text-sm rounded ${resources.equipment >= 300 ? '' : 'opacity-50 cursor-not-allowed'}"
                ${resources.equipment >= 300 ? '' : 'disabled'}>
                ПОСТРОИТЬ
            </button>
        </div>
    `;
    html += '</div>';
    container.innerHTML = html;
}

function renderDiplomacy(container) {
    const myId = getMyCountryId();
    const wars = getWars();
    const alliances = getAlliances();
    
    const enemies = [];
    wars.forEach(w => {
        if (w.a === myId) enemies.push(w.b);
        if (w.b === myId) enemies.push(w.a);
    });
    
    const allies = [];
    alliances.forEach(a => {
        if (a.has(myId)) {
            a.forEach(id => { if (id !== myId) allies.push(id); });
        }
    });
    
    let html = `
        <div class="mb-4">
            <div class="font-bold text-emerald-500 mb-2">🤝 СОЮЗНИКИ</div>
            ${allies.length === 0 ? '<div class="text-gray-400 text-sm">Нет союзников</div>' : ''}
            ${allies.map(a => `<div class="bg-gray-700 p-2 rounded mb-1">${getCountryInfo(a).name}</div>`).join('')}
        </div>
        <div>
            <div class="font-bold text-red-500 mb-2">⚔️ ВОЙНЫ</div>
            ${enemies.length === 0 ? '<div class="text-gray-400 text-sm">Мирное время</div>' : ''}
            ${enemies.map(e => `<div class="bg-gray-700 p-2 rounded mb-1">${getCountryInfo(e).name}</div>`).join('')}
        </div>
    `;
    
    container.innerHTML = html;
}

window.buildFactory = () => {
    addNotification('Выберите провинцию для строительства завода (в разработке)', 'info');
};

window.buildPort = () => {
    addNotification('Выберите провинцию для строительства порта (в разработке)', 'info');
};

export function showCountryInfo(countryId, posKey) {
    const info = getCountryInfo(countryId);
    const sidebar = document.getElementById('sidebar');
    const title = document.getElementById('sidebar-title');
    const actions = document.getElementById('sidebar-actions');
    const myId = getMyCountryId();
    
    if (!sidebar || !title || !actions) return;
    
    title.innerText = info.name;
    
    if (countryId !== myId) {
        actions.innerHTML = `
            <button onclick="window.declareWarOn('${countryId}')" class="w-full bg-red-700 hover:bg-red-600 py-2 text-sm rounded mb-2">⚔️ ОБЪЯВИТЬ ВОЙНУ</button>
            <button onclick="window.proposeAlly('${countryId}')" class="w-full bg-emerald-700 hover:bg-emerald-600 py-2 text-sm rounded">🤝 ПРЕДЛОЖИТЬ АЛЬЯНС</button>
        `;
    } else {
        actions.innerHTML = '<div class="text-center text-gray-400 text-sm">Это ваша страна</div>';
    }
    
    sidebar.classList.remove('hidden');
}

window.declareWarOn = (id) => declareWar(id);
window.proposeAlly = (id) => proposeAlliance(id);

// Клик вне сайдбара для закрытия
document.addEventListener('click', (e) => {
    const sidebar = document.getElementById('sidebar');
    const sidebarActions = document.getElementById('sidebar-actions');
    if (sidebar && !sidebar.contains(e.target) && !sidebarActions?.contains(e.target)) {
        if (e.target !== document.getElementById('map-canvas')) {
            sidebar.classList.add('hidden');
        }
    }
});
