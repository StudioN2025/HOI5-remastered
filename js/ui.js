import { getCountryInfo, addNotification } from './utils.js';
import { getMyCountryId, getWars, getAlliances, getUnits, getResources, getBuildingQueue, updateTopBar } from './game.js';
import { UNIT_STATS, BUILDING_STATS } from './data.js';
import { declareWar, proposeAlliance } from './diplomacy.js';
import { renderMap } from './map.js';

// Глобальные функции для вызова из onclick
window.openTab = function(tab) {
    console.log('openTab called:', tab);
    const windowDiv = document.getElementById('info-window');
    const content = document.getElementById('window-content');
    const title = document.getElementById('window-title');
    
    if (!windowDiv || !content || !title) {
        console.error('Window elements not found');
        return;
    }
    
    windowDiv.classList.remove('hidden');
    
    if (tab === 'army') {
        title.innerText = '🎖️ АРМИЯ';
        renderArmy(content);
    } else if (tab === 'build') {
        title.innerText = '🏗️ СТРОИТЕЛЬСТВО';
        renderBuild(content);
    } else if (tab === 'diplomacy') {
        title.innerText = '🤝 ДИПЛОМАТИЯ';
        renderDiplomacy(content);
    } else if (tab === 'research') {
        title.innerText = '🔬 ТЕХНОЛОГИИ';
        renderResearch(content);
    } else if (tab === 'focus') {
        title.innerText = '⭐ НАЦИОНАЛЬНЫЕ ФОКУСЫ';
        renderFocus(content);
    }
};

window.closeWindow = function() {
    const windowDiv = document.getElementById('info-window');
    if (windowDiv) windowDiv.classList.add('hidden');
};

function renderArmy(container) {
    const units = getUnits();
    const myId = getMyCountryId();
    const myUnits = units.filter(u => u.owner === myId);
    const resources = getResources();
    
    let html = `
        <div class="space-y-3 mb-4">
            <div class="bg-gray-700 p-3 rounded-lg">
                <div class="grid grid-cols-3 gap-2 text-center">
                    <div>
                        <div class="text-xs text-gray-400">🔫 СНАРЯЖЕНИЕ</div>
                        <div class="text-lg font-bold text-yellow-400">${Math.floor(resources.equipment).toLocaleString()}</div>
                    </div>
                    <div>
                        <div class="text-xs text-gray-400">👥 ЛЮДИ</div>
                        <div class="text-lg font-bold text-emerald-400">${Math.floor(resources.manpower).toLocaleString()}</div>
                    </div>
                    <div>
                        <div class="text-xs text-gray-400">🏭 ЗАВОДЫ</div>
                        <div class="text-lg font-bold text-blue-400">${resources.factories}</div>
                    </div>
                </div>
            </div>
            <div class="font-bold text-yellow-500 text-sm mb-2">🆕 НАБОР ВОЙСК</div>
            <div class="space-y-2">
    `;
    
    Object.entries(UNIT_STATS).forEach(([key, u]) => {
        const canAfford = resources.equipment >= u.cost && resources.manpower >= u.manpower;
        html += `
            <div class="bg-gray-700 p-3 rounded-lg border-l-4 border-yellow-500">
                <div class="flex justify-between items-center">
                    <div>
                        <span class="text-2xl">${u.icon}</span>
                        <span class="font-bold text-white ml-2">${u.name}</span>
                        <div class="text-xs text-gray-300 mt-1">⚔️ Атака: ${u.attack} | 🛡️ Защита: ${u.defense} | ❤️ HP: ${u.hp}</div>
                        <div class="text-[10px] text-gray-400">💰 ${u.cost} 🔫 | 👥 ${u.manpower} чел</div>
                    </div>
                    <button onclick="window.recruitUnit('${key}')" 
                        class="px-3 py-1.5 text-xs rounded-lg font-bold transition ${canAfford ? 'bg-emerald-700 hover:bg-emerald-600' : 'bg-gray-600 cursor-not-allowed'} text-white"
                        ${!canAfford ? 'disabled' : ''}>
                        НАБРАТЬ
                    </button>
                </div>
            </div>
        `;
    });
    
    html += `
            </div>
            <div class="mt-4">
                <div class="font-bold text-yellow-500 text-sm mb-2">⚔️ ВОЙСКА (${myUnits.length})</div>
                <div class="space-y-2 max-h-60 overflow-y-auto">
    `;
    
    if (myUnits.length === 0) {
        html += '<div class="text-center text-gray-500 py-4">Нет войск. Наберите новые!</div>';
    } else {
        myUnits.forEach(u => {
            const stats = UNIT_STATS[u.type];
            const hpPercent = u.hp ? (u.hp / stats.hp * 100) : 100;
            html += `
                <div class="bg-gray-700 p-2 rounded-lg">
                    <div class="flex justify-between items-center">
                        <div>
                            <span class="text-xl">${stats.icon}</span>
                            <span class="font-bold text-white ml-1">${stats.name}</span>
                            ${u.trainingDaysLeft > 0 ? `<span class="text-xs text-yellow-400 ml-2">(тренировка: ${u.trainingDaysLeft} дн.)</span>` : '<span class="text-xs text-green-400 ml-2">✓ готов</span>'}
                        </div>
                        <button onclick="window.selectUnitForMove('${u.id}')" class="bg-blue-700 hover:bg-blue-600 px-3 py-1 text-xs rounded text-white">ВЫБРАТЬ</button>
                    </div>
                    <div class="mt-1">
                        <div class="flex justify-between text-xs text-gray-400 mb-0.5">
                            <span>❤️ Здоровье</span>
                            <span>${Math.floor(u.hp || stats.hp)}/${stats.hp}</span>
                        </div>
                        <div class="w-full bg-gray-600 rounded-full h-1.5 overflow-hidden">
                            <div class="bg-green-500 h-full rounded-full" style="width: ${hpPercent}%"></div>
                        </div>
                    </div>
                </div>
            `;
        });
    }
    
    html += `
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

function renderBuild(container) {
    const resources = getResources();
    const buildingQueue = getBuildingQueue();
    
    let html = `
        <div class="space-y-3">
            <div class="bg-gray-700 p-3 rounded-lg text-center">
                <div class="text-xs text-gray-400">🔫 ДОСТУПНО СНАРЯЖЕНИЯ</div>
                <div class="text-2xl font-bold text-yellow-400">${Math.floor(resources.equipment).toLocaleString()}</div>
            </div>
    `;
    
    if (buildingQueue.length > 0) {
        const current = buildingQueue[0];
        const stats = BUILDING_STATS[current.type];
        const progress = ((stats.buildTime - current.daysLeft) / stats.buildTime) * 100;
        html += `
            <div class="bg-blue-900/50 border border-blue-500 p-3 rounded-lg">
                <div class="flex justify-between text-sm mb-1">
                    <span class="text-white">🏗️ СТРОИТСЯ: ${stats.name}</span>
                    <span class="text-blue-300">${current.daysLeft} дн.</span>
                </div>
                <div class="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div class="bg-blue-500 h-full rounded-full transition-all" style="width: ${progress}%"></div>
                </div>
            </div>
        `;
    }
    
    html += `
            <div class="font-bold text-yellow-500 text-sm mb-2">📦 ДОСТУПНЫЕ ПОСТРОЙКИ</div>
            <div class="space-y-2">
                <div class="bg-gray-700 p-3 rounded-lg border-l-4 border-blue-500">
                    <div class="flex justify-between items-center">
                        <div>
                            <span class="text-2xl">🏭</span>
                            <span class="font-bold text-white ml-2">ВОЕННЫЙ ЗАВОД</span>
                            <div class="text-xs text-gray-300 mt-1">Увеличивает производство снаряжения на +1.5 в день</div>
                        </div>
                        <div class="text-right">
                            <div class="text-yellow-400 font-bold">500 🔫</div>
                            <button onclick="window.buildFactory()" 
                                class="mt-1 px-3 py-1 text-xs rounded-lg font-bold ${resources.equipment >= 500 ? 'bg-blue-700 hover:bg-blue-600' : 'bg-gray-600 cursor-not-allowed'} text-white"
                                ${resources.equipment >= 500 ? '' : 'disabled'}>
                                ПОСТРОИТЬ
                            </button>
                        </div>
                    </div>
                </div>
                <div class="bg-gray-700 p-3 rounded-lg border-l-4 border-cyan-500">
                    <div class="flex justify-between items-center">
                        <div>
                            <span class="text-2xl">⚓</span>
                            <span class="font-bold text-white ml-2">МОРСКОЙ ПОРТ</span>
                            <div class="text-xs text-gray-300 mt-1">Позволяет морские десанты и переброски</div>
                        </div>
                        <div class="text-right">
                            <div class="text-yellow-400 font-bold">300 🔫</div>
                            <button onclick="window.buildPort()" 
                                class="mt-1 px-3 py-1 text-xs rounded-lg font-bold ${resources.equipment >= 300 ? 'bg-cyan-700 hover:bg-cyan-600' : 'bg-gray-600 cursor-not-allowed'} text-white"
                                ${resources.equipment >= 300 ? '' : 'disabled'}>
                                ПОСТРОИТЬ
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
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
        <div class="space-y-4">
            <div class="bg-gray-700 p-3 rounded-lg">
                <div class="font-bold text-emerald-400 mb-2">🤝 СОЮЗНИКИ</div>
                ${allies.length === 0 ? '<div class="text-gray-400 text-sm text-center py-2">Нет союзников</div>' : ''}
                ${allies.map(a => `<div class="bg-gray-600 p-2 rounded mb-1 flex justify-between items-center"><span class="text-white">${getCountryInfo(a).name}</span><span class="text-emerald-400 text-xs">★ в альянсе</span></div>`).join('')}
            </div>
            <div class="bg-gray-700 p-3 rounded-lg">
                <div class="font-bold text-red-400 mb-2">⚔️ ВОЙНЫ</div>
                ${enemies.length === 0 ? '<div class="text-gray-400 text-sm text-center py-2">Мирное время</div>' : ''}
                ${enemies.map(e => `<div class="bg-gray-600 p-2 rounded mb-1 flex justify-between items-center"><span class="text-white">${getCountryInfo(e).name}</span><span class="text-red-400 text-xs">⚔️ война</span></div>`).join('')}
            </div>
            <div class="bg-gray-700 p-3 rounded-lg">
                <div class="font-bold text-blue-400 mb-2">ℹ️ ИНФОРМАЦИЯ</div>
                <div class="text-xs text-gray-300">Кликните ПКМ по любой клетке на карте, чтобы посмотреть информацию о стране и дипломатические действия.</div>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

function renderResearch(container) {
    let html = `
        <div class="space-y-3">
            <div class="bg-gray-700 p-3 rounded-lg text-center">
                <div class="text-xs text-gray-400">🔬 ТЕХНОЛОГИЧЕСКИЙ ЦЕНТР</div>
                <div class="text-sm text-gray-300 mt-1">Исследования увеличивают боевую мощь и эффективность</div>
            </div>
            <div class="space-y-2">
                <div class="bg-gray-700 p-3 rounded-lg border-l-4 border-blue-500">
                    <div class="flex justify-between items-center">
                        <div>
                            <span class="font-bold text-white">🏭 ПРОМЫШЛЕННОСТЬ</span>
                            <div class="text-xs text-gray-300">Увеличивает производство снаряжения на +5% за уровень</div>
                        </div>
                        <div class="text-yellow-400">Ур. ${window.getTechLevel?.('industry') || 1}/5</div>
                    </div>
                    <div class="mt-2 w-full bg-gray-600 rounded-full h-1.5 overflow-hidden">
                        <div class="bg-blue-500 h-full rounded-full" style="width: ${((window.getTechLevel?.('industry') || 1) / 5) * 100}%"></div>
                    </div>
                </div>
                <div class="bg-gray-700 p-3 rounded-lg border-l-4 border-green-500">
                    <div class="flex justify-between items-center">
                        <div>
                            <span class="font-bold text-white">💂 ПЕХОТА</span>
                            <div class="text-xs text-gray-300">+5% атака/защита, +10% стоимость за уровень</div>
                        </div>
                        <div class="text-yellow-400">Ур. ${window.getTechLevel?.('infantry') || 1}/5</div>
                    </div>
                    <div class="mt-2 w-full bg-gray-600 rounded-full h-1.5 overflow-hidden">
                        <div class="bg-green-500 h-full rounded-full" style="width: ${((window.getTechLevel?.('infantry') || 1) / 5) * 100}%"></div>
                    </div>
                </div>
                <div class="bg-gray-700 p-3 rounded-lg border-l-4 border-orange-500">
                    <div class="flex justify-between items-center">
                        <div>
                            <span class="font-bold text-white">🚜 ТАНКИ</span>
                            <div class="text-xs text-gray-300">+5% атака/броня за уровень</div>
                        </div>
                        <div class="text-yellow-400">Ур. ${window.getTechLevel?.('tank') || 1}/5</div>
                    </div>
                    <div class="mt-2 w-full bg-gray-600 rounded-full h-1.5 overflow-hidden">
                        <div class="bg-orange-500 h-full rounded-full" style="width: ${((window.getTechLevel?.('tank') || 1) / 5) * 100}%"></div>
                    </div>
                </div>
            </div>
            <div class="text-center text-xs text-gray-500">Технологии в разработке</div>
        </div>
    `;
    container.innerHTML = html;
}

function renderFocus(container) {
    container.innerHTML = `
        <div class="space-y-3">
            <div class="bg-gray-700 p-3 rounded-lg text-center">
                <div class="text-xs text-gray-400">⭐ НАЦИОНАЛЬНЫЕ ФОКУСЫ</div>
                <div class="text-sm text-gray-300 mt-1">Уникальные деревья решений для каждой страны</div>
            </div>
            <div class="bg-gray-700 p-3 rounded-lg">
                <div class="text-center text-gray-400 py-4">
                    Фокусы будут доступны в следующем обновлении<br>
                    Каждая страна получит уникальное дерево решений
                </div>
            </div>
        </div>
    `;
}

window.recruitUnit = (type) => {
    window.closeWindow();
    const hint = document.getElementById('hint');
    const hintText = document.getElementById('hint-text');
    if (hint && hintText) {
        hintText.innerText = `Выберите провинцию для развертывания ${UNIT_STATS[type].icon} ${UNIT_STATS[type].name}`;
        hint.classList.remove('hidden');
        window.pendingRecruit = type;
        setTimeout(() => {
            hint.classList.add('hidden');
            window.pendingRecruit = null;
        }, 15000);
    }
};

window.selectUnitForMove = (unitId) => {
    window.closeWindow();
    window.selectedUnitId = unitId;
    const hint = document.getElementById('hint');
    const hintText = document.getElementById('hint-text');
    if (hint && hintText) {
        hintText.innerText = `Выберите цель для движения юнита`;
        hint.classList.remove('hidden');
        setTimeout(() => {
            hint.classList.add('hidden');
            window.selectedUnitId = null;
        }, 15000);
    }
};

window.buildFactory = () => {
    window.closeWindow();
    addNotification('Выберите провинцию для строительства завода (ЛКМ по клетке)', 'info');
    window.pendingBuild = 'factory';
    setTimeout(() => { window.pendingBuild = null; }, 15000);
};

window.buildPort = () => {
    window.closeWindow();
    addNotification('Выберите провинцию для строительства порта (ЛКМ по клетке)', 'info');
    window.pendingBuild = 'port';
    setTimeout(() => { window.pendingBuild = null; }, 15000);
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
            <button onclick="window.declareWarOn('${countryId}')" class="w-full bg-red-700 hover:bg-red-600 py-2 text-sm rounded-lg mb-2 text-white font-bold transition">⚔️ ОБЪЯВИТЬ ВОЙНУ</button>
            <button onclick="window.proposeAlly('${countryId}')" class="w-full bg-emerald-700 hover:bg-emerald-600 py-2 text-sm rounded-lg text-white font-bold transition">🤝 ПРЕДЛОЖИТЬ АЛЬЯНС</button>
        `;
    } else {
        actions.innerHTML = '<div class="text-center text-gray-400 text-sm py-2">Это ваша страна</div>';
    }
    
    sidebar.classList.remove('hidden');
}

window.declareWarOn = (id) => declareWar(id);
window.proposeAlly = (id) => proposeAlliance(id);

// Закрытие сайдбара при клике вне
document.addEventListener('click', (e) => {
    const sidebar = document.getElementById('sidebar');
    if (sidebar && !sidebar.contains(e.target)) {
        const actions = document.getElementById('sidebar-actions');
        if (actions && !actions.contains(e.target)) {
            if (e.target !== document.getElementById('map-canvas')) {
                sidebar.classList.add('hidden');
            }
        }
    }
});

// Добавляем глобальные функции для технологий
window.getTechLevel = (type) => {
    return 1; // временно, пока нет системы технологий
};
