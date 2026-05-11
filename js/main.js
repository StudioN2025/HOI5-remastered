import { COUNTRIES, UNIT_STATS, BUILDING_STATS, TECH_TREE, DEMO_MAP } from './data.js';
import { 
    getGridData, setGridData, setCellStats, setMyCountryId, setGameActive, 
    setGameSpeed, setGameDate, setUnits, setBuildingQueue, getMyCountryId,
    getPlayerResources, getBuildingQueue as getBuildQueue, setBuildingQueue as setBuildQueue,
    getUnits, setPlayerResources, updateTopBar
} from './game.js';
import { renderMap, resizeCanvas, setupMapEvents, setCamera } from './map.js';
import { setSelectedUnitId, startRecruitment, moveUnit } from './military.js';
import { getCountryInfo, addNotification, calculateCountryStats, getCellData } from './utils.js';
import { declareWar, kickFromAlliance, getWarsList, getAlliancesList, isAtWar, areAllies } from './diplomacy.js';

// Глобальные данные для доступа из onclick
window.UNIT_STATS = UNIT_STATS;
window.BUILDING_STATS = BUILDING_STATS;
window.getCountryInfo = getCountryInfo;
window.addNotification = addNotification;

// ========== ГЛОБАЛЬНЫЕ ФУНКЦИИ ДЛЯ UI ==========
window.openRecruitPanel = (unitType) => {
    document.getElementById('info-window').classList.add('hidden');
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

window.openBuildMode = (buildType) => {
    document.getElementById('info-window').classList.add('hidden');
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

window.selectUnit = (unitId) => {
    setSelectedUnitId(unitId);
    document.getElementById('info-window').classList.add('hidden');
    const hint = document.getElementById('hint');
    const hintText = document.getElementById('hint-text');
    hintText.innerText = `Выберите цель для движения`;
    hint.classList.remove('hidden');
    setTimeout(() => hint.classList.add('hidden'), 5000);
};

window.kickAlly = (allyId) => {
    kickFromAlliance(allyId);
    document.getElementById('info-window').classList.add('hidden');
    openWindow('diplomacy');
};

window.startResearch = async (type, level) => {
    const { setActiveResearch } = await import('./game.js');
    setActiveResearch({ type, level, daysLeft: 100 });
    addNotification(`Исследование ${TECH_TREE[type].name} ур.${level} начато!`, 'info');
    openWindow('research');
};

// ========== ОКНА ==========
async function openWindow(tab) {
    const windowDiv = document.getElementById('info-window');
    const content = document.getElementById('window-content');
    const title = document.getElementById('window-title');
    
    windowDiv.classList.remove('hidden');
    
    if (tab === 'army') {
        title.innerText = 'АРМИЯ';
        const myCountryId = getMyCountryId();
        const units = getUnits();
        const myUnits = units.filter(u => u.owner === myCountryId);
        
        let html = `
            <div class="space-y-3 mb-4">
                <div class="bg-gray-700 p-3 rounded">
                    <div class="font-bold mb-2">🆕 НАБОР</div>
                    <div class="grid grid-cols-2 gap-2">
                        ${Object.entries(UNIT_STATS).map(([key, u]) => `
                            <button onclick="window.openRecruitPanel('${key}')" class="bg-emerald-800 hover:bg-emerald-700 p-2 rounded text-sm">
                                ${u.icon} ${u.name}
                            </button>
                        `).join('')}
                    </div>
                </div>
                <div class="font-bold text-yellow-500">⚔️ ВОЙСКА (${myUnits.length})</div>
        `;
        
        if (myUnits.length === 0) {
            html += '<div class="text-center text-gray-400 py-4">Нет войск</div>';
        } else {
            myUnits.forEach(u => {
                html += `
                    <div class="bg-gray-700 p-3 rounded border-l-4 border-yellow-500">
                        <div class="flex justify-between items-center">
                            <div>
                                <span class="font-bold">${UNIT_STATS[u.type]?.icon} ${UNIT_STATS[u.type]?.name}</span>
                                ${u.trainingDaysLeft > 0 ? `<span class="text-xs text-yellow-500 ml-2">(тренировка: ${u.trainingDaysLeft} дн.)</span>` : ''}
                            </div>
                            <button onclick="window.selectUnit('${u.id}')" class="bg-blue-700 hover:bg-blue-600 px-3 py-1 text-xs rounded">ВЫБРАТЬ</button>
                        </div>
                        <div class="text-xs text-gray-400 mt-1">❤️ HP: ${Math.floor(u.hp || 100)}/${UNIT_STATS[u.type]?.hp}</div>
                        ${u.path?.length > 0 ? '<div class="text-xs text-blue-400">🚶 В движении</div>' : ''}
                    </div>
                `;
            });
        }
        html += '</div>';
        content.innerHTML = html;
    }
    else if (tab === 'research') {
        title.innerText = 'ТЕХНОЛОГИИ';
        const { getTech, getActiveResearch } = await import('./game.js');
        const tech = getTech();
        const activeResearch = getActiveResearch();
        
        let html = '<div class="space-y-4">';
        for (const [key, value] of Object.entries(TECH_TREE)) {
            const currentLevel = tech[key] || 1;
            html += `
                <div class="bg-gray-700 p-3 rounded">
                    <div class="flex justify-between items-center mb-2">
                        <span class="font-bold text-yellow-500">${value.name}</span>
                        <span class="text-sm">Уровень ${currentLevel}/${value.maxLevel}</span>
                    </div>
                    <div class="w-full h-1.5 bg-gray-600 rounded-full overflow-hidden mb-2">
                        <div class="h-full bg-yellow-500 transition-all" style="width: ${(currentLevel/value.maxLevel)*100}%"></div>
                    </div>
            `;
            if (currentLevel < value.maxLevel && (!activeResearch || activeResearch.type !== key)) {
                html += `<button onclick="window.startResearch('${key}', ${currentLevel+1})" class="bg-blue-700 hover:bg-blue-600 px-3 py-1 text-xs rounded">ИССЛЕДОВАТЬ УР.${currentLevel+1}</button>`;
            } else if (activeResearch && activeResearch.type === key) {
                html += `<div class="text-xs text-blue-400">🔬 Исследуется: ${activeResearch.daysLeft} дней</div>`;
            }
            html += `</div>`;
        }
        html += '</div>';
        content.innerHTML = html;
    }
    else if (tab === 'focus') {
        title.innerText = 'НАЦИОНАЛЬНЫЕ ФОКУСЫ';
        content.innerHTML = '<div class="text-center text-gray-400 py-8">⭐ Фокусы будут добавлены в следующем обновлении</div>';
    }
    else if (tab === 'diplomacy') {
        title.innerText = 'ДИПЛОМАТИЯ';
        const enemies = getWarsList();
        const allies = getAlliancesList();
        
        content.innerHTML = `
            <div class="mb-6">
                <div class="font-bold text-emerald-500 mb-2">🤝 СОЮЗНИКИ</div>
                ${allies.length === 0 ? '<div class="text-gray-400 text-sm">Нет союзников</div>' : 
                    allies.map(a => `<div class="bg-gray-700 p-2 rounded mb-1 flex justify-between items-center">
                        <span>${getCountryInfo(a).name}</span>
                        <button onclick="window.kickAlly('${a}')" class="text-red-400 text-xs hover:text-red-300">ИСКЛЮЧИТЬ</button>
                    </div>`).join('')
                }
            </div>
            <div>
                <div class="font-bold text-red-500 mb-2">⚔️ ВОЙНЫ</div>
                ${enemies.length === 0 ? '<div class="text-gray-400 text-sm">Мирное время</div>' : 
                    enemies.map(e => `<div class="bg-gray-700 p-2 rounded mb-1">${getCountryInfo(e).name}</div>`).join('')
                }
            </div>
            <button id="btn-find-enemy" class="w-full bg-red-800 hover:bg-red-700 py-2 text-sm font-bold rounded mt-4">🎯 НАЙТИ ВРАГА</button>
        `;
        
        setTimeout(() => {
            const btn = document.getElementById('btn-find-enemy');
            if (btn) btn.onclick = () => addNotification('Ищите врагов на карте и нажимайте на них ПКМ', 'info');
        }, 10);
    }
    else if (tab === 'build') {
        title.innerText = 'СТРОИТЕЛЬСТВО';
        const queue = getBuildQueue();
        
        let html = '';
        if (queue.length > 0 && queue[0]) {
            const stats = BUILDING_STATS[queue[0].type];
            if (stats) {
                const progress = ((stats.buildTime - queue[0].daysLeft) / stats.buildTime) * 100;
                html += `
                    <div class="bg-blue-900/30 border border-blue-500 p-3 rounded mb-4">
                        <div class="flex justify-between text-sm">
                            <span>🏗️ ${stats.name}</span>
                            <span>${queue[0].daysLeft} дн.</span>
                        </div>
                        <div class="w-full h-1.5 bg-gray-600 rounded-full overflow-hidden mt-2">
                            <div class="h-full bg-blue-500 transition-all" style="width: ${progress}%"></div>
                        </div>
                    </div>
                `;
            }
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
        content.innerHTML = html;
    }
    else if (tab === 'economy') {
        title.innerText = 'ЭКОНОМИКА';
        const resources = getPlayerResources();
        const myCountryId = getMyCountryId();
        const stats = calculateCountryStats(myCountryId, getGridData(), {});
        
        content.innerHTML = `
            <div class="space-y-4">
                <div class="bg-gray-700 p-4 rounded">
                    <div class="text-sm text-gray-400">РЕСУРСЫ</div>
                    <div class="text-2xl font-bold text-yellow-500">🔫 ${Math.floor(resources.equipment).toLocaleString()}</div>
                    <div class="text-lg">👥 ${Math.floor(resources.manpower).toLocaleString()}</div>
                    <div class="text-lg">🏭 ${resources.factories}</div>
                </div>
                <div class="bg-gray-700 p-4 rounded">
                    <div class="text-sm text-gray-400">ТЕРРИТОРИЯ</div>
                    <div class="text-lg">📊 Провинций: ${stats.cellCount}</div>
                    <div class="text-lg">👨‍👩‍👧‍👦 Население: ${Math.floor(stats.totalPop).toLocaleString()}</div>
                </div>
            </div>
        `;
    }
}

window.openWindow = openWindow;
window.closeWindow = () => document.getElementById('info-window').classList.add('hidden');

window.showCountryInfo = (countryId, posKey) => {
    const info = getCountryInfo(countryId);
    const cell = getCellData(posKey, {});
    
    document.getElementById('sidebar-title').innerText = info.name;
    document.getElementById('sidebar-leader').innerText = info.leader;
    document.getElementById('sidebar-ideology').innerText = info.ideology;
    document.getElementById('sidebar-pop').innerText = cell.population.toLocaleString();
    document.getElementById('sidebar-factories').innerText = cell.factories;
    
    const actionsDiv = document.getElementById('sidebar-actions');
    const myCountryId = getMyCountryId();
    
    if (countryId !== myCountryId) {
        actionsDiv.classList.remove('hidden');
        const atWar = isAtWar(myCountryId, countryId);
        
        actionsDiv.innerHTML = `
            ${!atWar ? `<button id="btn-declare-war" class="w-full bg-red-700 hover:bg-red-600 py-2 text-sm font-bold mb-2 rounded">⚔️ ОБЪЯВИТЬ ВОЙНУ</button>` : '<div class="text-red-500 text-sm text-center mb-2">⚔️ В СОСТОЯНИИ ВОЙНЫ</div>'}
            ${!atWar && !areAllies(myCountryId, countryId) ? `<button id="btn-ally" class="w-full bg-emerald-700 hover:bg-emerald-600 py-2 text-sm font-bold rounded">🤝 ПРЕДЛОЖИТЬ АЛЬЯНС</button>` : ''}
        `;
        
        setTimeout(() => {
            const warBtn = document.getElementById('btn-declare-war');
            const allyBtn = document.getElementById('btn-ally');
            if (warBtn) warBtn.onclick = () => { declareWar(countryId); window.showCountryInfo(countryId, posKey); };
            if (allyBtn) allyBtn.onclick = () => { 
                import('./diplomacy.js').then(m => m.proposeAlliance(countryId));
                window.showCountryInfo(countryId, posKey);
            };
        }, 10);
    } else {
        actionsDiv.classList.add('hidden');
    }
    
    document.getElementById('info-sidebar').classList.remove('hidden');
};

// ========== ИНИЦИАЛИЗАЦИЯ ==========
async function init() {
    console.log('🚀 HOI V Remastered');
    
    resizeCanvas();
    setupMapEvents();
    renderMap();
    
    // Кнопка демо-карты
    document.getElementById('btn-start').onclick = () => {
        setGridData(DEMO_MAP.gridData);
        setCellStats(DEMO_MAP.cellStats);
        const countries = [...new Set(Object.values(DEMO_MAP.gridData))];
        showCountrySelection(countries);
    };
    
    // Кнопка загрузки карты
    document.getElementById('btn-load-map').onclick = () => {
        document.getElementById('map-file-input').click();
    };
    
    // Загрузка файла
    document.getElementById('map-file-input').onchange = (e) => {
        if (e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const data = JSON.parse(ev.target.result);
                    setGridData(data.gridData || {});
                    setCellStats(data.cellStats || {});
                    const countries = [...new Set(Object.values(data.gridData))];
                    showCountrySelection(countries);
                    addNotification(`Карта "${e.target.files[0].name}" загружена!`, 'info');
                } catch(err) {
                    addNotification('Ошибка загрузки JSON', 'war');
                }
            };
            reader.readAsText(e.target.files[0]);
        }
    };
    
    // Отмена выбора страны
    document.getElementById('btn-cancel-country').onclick = () => {
        document.getElementById('country-select').classList.add('hidden');
        document.getElementById('main-menu').classList.remove('hidden');
    };
    
    // Закрытие окон
    document.getElementById('close-window').onclick = () => document.getElementById('info-window').classList.add('hidden');
    document.getElementById('close-sidebar').onclick = () => document.getElementById('info-sidebar').classList.add('hidden');
    
    // Кнопки скорости
    document.querySelectorAll('.speed-btn').forEach(btn => {
        btn.onclick = () => {
            const speed = parseInt(btn.dataset.speed);
            setGameSpeed(speed);
            document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active', 'bg-yellow-600'));
            if (speed > 0) btn.classList.add('active', 'bg-yellow-600');
        };
    });
    
    // Вкладки
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.onclick = () => openWindow(btn.dataset.tab);
    });
    
    // Клики по карте
    const canvas = document.getElementById('map-canvas');
    canvas.addEventListener('click', async (e) => {
        const { screenToWorld } = await import('./map.js');
        const world = screenToWorld(e.clientX, e.clientY);
        const key = `${world.x},${world.y}`;
        const gridData = getGridData();
        const myCountryId = getMyCountryId();
        
        // Режим найма
        if (window._pendingRecruit) {
            if (gridData[key] === myCountryId) {
                startRecruitment(window._pendingRecruit, key);
                window._pendingRecruit = null;
                document.getElementById('hint').classList.add('hidden');
            } else {
                addNotification('Можно развертывать только на своей территории!', 'war');
            }
            return;
        }
        
        // Режим стройки
        if (window._pendingBuild) {
            if (gridData[key] === myCountryId) {
                const stats = BUILDING_STATS[window._pendingBuild];
                const resources = getPlayerResources();
                if (resources.equipment >= stats.costEquipment) {
                    resources.equipment -= stats.costEquipment;
                    setPlayerResources(resources);
                    const queue = getBuildQueue();
                    queue.push({ pos: key, type: window._pendingBuild, daysLeft: stats.buildTime });
                    setBuildQueue(queue);
                    addNotification(`Строительство ${stats.name} начато!`, 'info');
                    updateTopBar();
                } else {
                    addNotification('Недостаточно снаряжения!', 'war');
                }
                window._pendingBuild = null;
                document.getElementById('hint').classList.add('hidden');
            } else {
                addNotification('Строить можно только на своей территории!', 'war');
            }
            return;
        }
        
        // Показ информации о стране
        if (gridData[key]) {
            window.showCountryInfo(gridData[key], key);
        }
    });
    
    // Анимация
    function animate() {
        renderMap();
        requestAnimationFrame(animate);
    }
    animate();
}

function showCountrySelection(countriesList) {
    const container = document.getElementById('country-list');
    container.innerHTML = '';
    
    countriesList.forEach(countryId => {
        const info = getCountryInfo(countryId);
        const btn = document.createElement('button');
        btn.className = 'w-full text-left p-3 border border-gray-300 rounded bg-white/50 hover:bg-white font-bold text-sm mb-2 transition';
        btn.style.borderLeftColor = info.color;
        btn.style.borderLeftWidth = '4px';
        btn.innerHTML = `<div class="font-bold">${info.name}</div><div class="text-xs text-gray-600">${info.ideology} • ${info.leader}</div>`;
        btn.onclick = () => {
            setMyCountryId(countryId);
            setGameActive(true);
            setGameSpeed(1);
            setGameDate(new Date(1936, 0, 1));
            setUnits([]);
            setBuildingQueue([]);
            setPlayerResources({ equipment: 1000, factories: 0, manpower: 0 });
            
            document.getElementById('country-select').classList.add('hidden');
            document.getElementById('game-container').classList.remove('hidden');
            document.getElementById('game-tabs').classList.remove('hidden');
            
            updateTopBar();
            renderMap();
            addNotification(`Игра начата! Вы играете за ${info.name}`, 'info');
        };
        container.appendChild(btn);
    });
    
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('country-select').classList.remove('hidden');
}

// Запуск
init();
