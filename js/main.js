import { COUNTRIES, UNIT_STATS } from './data.js';
import { getCountryInfo, addNotification } from './utils.js';
import { 
    setGridData, setCellStats, setMyCountryId, setGameActive, 
    setGameSpeed, setGameDate, setUnits, updateTopBar,
    getGridData, getMyCountryId, setResources, getResources
} from './game.js';
import { renderMap, resizeCanvas, setupMapEvents, screenToWorld } from './map.js';
import { openTab, closeWindow, showCountryInfo } from './ui.js';

let pendingRecruit = null;
let availableMaps = [];

window.openTab = openTab;
window.closeWindow = closeWindow;
window.showCountryInfo = showCountryInfo;

// Рекрутинг через глобальное окно
window.recruitUnit = (type) => {
    closeWindow();
    pendingRecruit = type;
    
    const oldHint = document.getElementById('recruit-hint');
    if (oldHint) oldHint.remove();
    
    const hint = document.createElement('div');
    hint.id = 'recruit-hint';
    hint.className = 'fixed bottom-24 left-1/2 -translate-x-1/2 bg-black/90 px-5 py-2 rounded-full text-yellow-400 text-xs z-30 whitespace-nowrap border border-yellow-500/50';
    hint.innerHTML = `💡 Выберите провинцию для развертывания ${UNIT_STATS[type].icon} ${UNIT_STATS[type].name}`;
    document.body.appendChild(hint);
    
    setTimeout(() => hint.remove(), 15000);
};

// Строительство
window.buildFactory = () => {
    addNotification('Выберите провинцию для строительства завода (ПКМ по клетке)', 'info');
    window.pendingBuild = 'factory';
    setTimeout(() => { window.pendingBuild = null; }, 15000);
};

window.buildPort = () => {
    addNotification('Выберите провинцию для строительства порта (ПКМ по клетке)', 'info');
    window.pendingBuild = 'port';
    setTimeout(() => { window.pendingBuild = null; }, 15000);
};

async function init() {
    console.log('🚀 HOI V Remastered загружается...');
    
    // Показываем экран загрузки
    showLoadingScreen('Загрузка игры...');
    
    // Инициализация canvas и событий
    resizeCanvas();
    setupMapEvents();
    
    // Настройка кнопок меню
    setupMenuButtons();
    
    // Кнопки скорости
    setupSpeedButtons();
    
    // Загрузка списка карт
    await loadMapsList();
    
    // Настройка кликов по canvas
    setupCanvasClick();
    
    // Запуск игрового цикла
    requestAnimationFrame(gameLoop);
    
    // Скрываем загрузку
    hideLoadingScreen();
    
    console.log('✅ Готово! Выберите карту для начала игры');
}

function showLoadingScreen(message) {
    let loadingDiv = document.getElementById('loading-screen');
    if (!loadingDiv) {
        loadingDiv = document.createElement('div');
        loadingDiv.id = 'loading-screen';
        loadingDiv.className = 'fixed inset-0 z-[100] bg-black/90 flex items-center justify-center';
        loadingDiv.innerHTML = `
            <div class="bg-[#e3d1b5] p-8 rounded-lg border-4 border-amber-800 w-96 text-center">
                <div class="text-3xl mb-4">⏳</div>
                <div class="font-bold text-xl mb-2">ЗАГРУЗКА</div>
                <div class="text-sm text-gray-600" id="loading-message">${message}</div>
                <div class="mt-4 w-full bg-gray-300 rounded-full h-2 overflow-hidden">
                    <div class="bg-amber-600 h-full rounded-full animate-pulse" style="width: 100%"></div>
                </div>
            </div>
        `;
        document.body.appendChild(loadingDiv);
    } else {
        const msgEl = document.getElementById('loading-message');
        if (msgEl) msgEl.innerText = message;
        loadingDiv.classList.remove('hidden');
    }
}

function hideLoadingScreen() {
    const loadingDiv = document.getElementById('loading-screen');
    if (loadingDiv) loadingDiv.classList.add('hidden');
}

function setupMenuButtons() {
    const startBtn = document.getElementById('btn-start');
    const loadBtn = document.getElementById('btn-load-map');
    const cancelBtn = document.getElementById('btn-cancel');
    const closeWindowBtn = document.getElementById('close-window');
    const mapFileInput = document.getElementById('map-file-input');
    const refreshMapsBtn = document.getElementById('btn-refresh-maps');
    
    if (startBtn) startBtn.onclick = () => showMapsList();
    if (loadBtn) loadBtn.onclick = () => mapFileInput?.click();
    if (cancelBtn) cancelBtn.onclick = () => document.getElementById('country-select')?.classList.add('hidden');
    if (closeWindowBtn) closeWindowBtn.onclick = () => document.getElementById('info-window')?.classList.add('hidden');
    if (refreshMapsBtn) refreshMapsBtn.onclick = () => loadMapsList();
    
    if (mapFileInput) {
        mapFileInput.onchange = (e) => {
            if (e.target.files[0]) loadMapFromFile(e.target.files[0]);
        };
    }
}

function setupSpeedButtons() {
    document.querySelectorAll('.speed-btn').forEach(btn => {
        btn.onclick = () => {
            const speed = parseInt(btn.dataset.speed);
            setGameSpeed(speed);
            document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        };
    });
}

async function loadMapsList() {
    showLoadingScreen('Загрузка списка карт...');
    
    // Список доступных карт в папке maps
    const mapFiles = [
        'europe.json',
        'world.json',
        'custom.json'
    ];
    
    availableMaps = [];
    
    for (const mapFile of mapFiles) {
        try {
            const response = await fetch(`maps/${mapFile}`);
            if (response.ok) {
                const data = await response.json();
                availableMaps.push({
                    name: mapFile,
                    data: data,
                    preview: null
                });
                console.log(`✅ Карта загружена: ${mapFile}`);
            }
        } catch (e) {
            console.log(`⚠️ Карта не найдена: ${mapFile}`);
        }
    }
    
    // Если нет карт в папке, создаем дефолтную
    if (availableMaps.length === 0) {
        console.log('📦 Создаю дефолтную карту...');
        availableMaps.push({
            name: 'default.json',
            data: createDefaultMap(),
            preview: null
        });
    }
    
    hideLoadingScreen();
    showMapsList();
}

function createDefaultMap() {
    const gridData = {};
    
    // Германия
    for (let x = 10; x <= 14; x++) {
        for (let y = 10; y <= 12; y++) {
            gridData[`${x},${y}`] = 'germany';
        }
    }
    
    // СССР
    for (let x = 18; x <= 22; x++) {
        for (let y = 10; y <= 13; y++) {
            gridData[`${x},${y}`] = 'ussr';
        }
    }
    
    // Польша
    for (let x = 15; x <= 17; x++) {
        for (let y = 10; y <= 12; y++) {
            gridData[`${x},${y}`] = 'poland';
        }
    }
    
    // Франция
    for (let x = 5; x <= 8; x++) {
        for (let y = 10; y <= 12; y++) {
            gridData[`${x},${y}`] = 'france';
        }
    }
    
    // Англия
    for (let x = 6; x <= 8; x++) {
        for (let y = 6; y <= 8; y++) {
            gridData[`${x},${y}`] = 'uk';
        }
    }
    
    return { gridData, cellStats: {}, version: '1.0' };
}

function showMapsList() {
    const container = document.getElementById('country-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Заголовок
    const title = document.createElement('div');
    title.className = 'text-center font-bold text-lg mb-4 border-b pb-2';
    title.innerText = 'ВЫБЕРИТЕ КАРТУ';
    container.appendChild(title);
    
    // Список карт
    availableMaps.forEach(map => {
        const btn = document.createElement('button');
        btn.className = 'w-full text-left p-3 border border-gray-300 rounded bg-white/50 hover:bg-white font-bold text-sm transition mb-2';
        btn.innerHTML = `
            <div class="font-bold">🗺️ ${map.name}</div>
            <div class="text-xs text-gray-600">Клеток: ${Object.keys(map.data.gridData).length}</div>
        `;
        btn.onclick = () => selectMap(map);
        container.appendChild(btn);
    });
    
    // Разделитель
    const divider = document.createElement('div');
    divider.className = 'border-t border-gray-300 my-3';
    container.appendChild(divider);
    
    // Кнопка загрузки своей карты
    const loadBtn = document.createElement('button');
    loadBtn.className = 'w-full bg-gray-700 text-white py-2 rounded text-sm mb-2';
    loadBtn.innerHTML = '📁 ЗАГРУЗИТЬ СВОЮ КАРТУ';
    loadBtn.onclick = () => document.getElementById('map-file-input')?.click();
    container.appendChild(loadBtn);
    
    // Кнопка обновления
    const refreshBtn = document.createElement('button');
    refreshBtn.className = 'w-full bg-gray-600 text-white py-2 rounded text-sm';
    refreshBtn.innerHTML = '🔄 ОБНОВИТЬ СПИСОК';
    refreshBtn.onclick = () => loadMapsList();
    container.appendChild(refreshBtn);
    
    const countrySelect = document.getElementById('country-select');
    const mainMenu = document.getElementById('main-menu');
    
    if (countrySelect) {
        // Меняем заголовок окна
        const titleEl = countrySelect.querySelector('h2');
        if (titleEl) titleEl.innerText = 'ВЫБЕРИТЕ КАРТУ';
        countrySelect.classList.remove('hidden');
    }
    if (mainMenu) mainMenu.classList.add('hidden');
}

function selectMap(map) {
    console.log('Загрузка карты:', map.name);
    showLoadingScreen(`Загрузка карты ${map.name}...`);
    
    // Загружаем данные карты
    setGridData(map.data.gridData);
    setCellStats(map.data.cellStats || {});
    
    // Получаем список стран на карте
    const countriesOnMap = [...new Set(Object.values(map.data.gridData))];
    
    if (countriesOnMap.length === 0) {
        addNotification('Ошибка: карта пуста!', 'war');
        hideLoadingScreen();
        return;
    }
    
    hideLoadingScreen();
    showCountrySelection(countriesOnMap);
}

function loadMapFromFile(file) {
    showLoadingScreen(`Загрузка ${file.name}...`);
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            setGridData(data.gridData || {});
            setCellStats(data.cellStats || {});
            
            const countries = [...new Set(Object.values(data.gridData))];
            if (countries.length === 0) {
                addNotification('Ошибка: на карте нет стран!', 'war');
                hideLoadingScreen();
                return;
            }
            
            addNotification(`Карта "${file.name}" загружена!`, 'info');
            hideLoadingScreen();
            showCountrySelection(countries);
        } catch(err) {
            addNotification('Ошибка JSON: ' + err.message, 'war');
            hideLoadingScreen();
        }
    };
    reader.readAsText(file);
}

function showCountrySelection(countries) {
    const container = document.getElementById('country-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Заголовок
    const title = document.createElement('div');
    title.className = 'text-center font-bold text-lg mb-4 border-b pb-2';
    title.innerText = 'ВЫБЕРИТЕ СТРАНУ';
    container.appendChild(title);
    
    countries.forEach(id => {
        const info = getCountryInfo(id);
        const btn = document.createElement('button');
        btn.className = 'w-full text-left p-3 border border-gray-300 rounded bg-white/50 hover:bg-white font-bold text-sm transition mb-2';
        btn.style.borderLeftColor = info.color;
        btn.style.borderLeftWidth = '4px';
        btn.innerHTML = `
            <div class="font-bold">${info.name}</div>
            <div class="text-xs text-gray-600">${info.ideology} • ${info.leader}</div>
        `;
        btn.onclick = () => startGame(id);
        container.appendChild(btn);
    });
    
    // Кнопка назад к картам
    const backBtn = document.createElement('button');
    backBtn.className = 'w-full bg-gray-600 text-white py-2 rounded text-sm mt-2';
    backBtn.innerHTML = '◀ НАЗАД К КАРТАМ';
    backBtn.onclick = () => showMapsList();
    container.appendChild(backBtn);
    
    const countrySelect = document.getElementById('country-select');
    const mainMenu = document.getElementById('main-menu');
    
    if (countrySelect) {
        const titleEl = countrySelect.querySelector('h2');
        if (titleEl) titleEl.innerText = 'ВЫБЕРИТЕ СТРАНУ';
        countrySelect.classList.remove('hidden');
    }
    if (mainMenu) mainMenu.classList.add('hidden');
}

function startGame(countryId) {
    console.log('Старт игры за', countryId);
    showLoadingScreen(`Запуск игры за ${getCountryInfo(countryId).name}...`);
    
    // Инициализация игрового состояния
    setMyCountryId(countryId);
    setGameActive(true);
    setGameSpeed(1);
    setGameDate(new Date(1936, 0, 1));
    setUnits([]);
    setResources({ equipment: 1000, factories: 0, manpower: 0 });
    
    // Обновляем ресурсы из статистики страны
    const { updateTopBar: updateBar } = await import('./game.js');
    updateBar();
    
    // Показываем игровой интерфейс
    const gameContainer = document.getElementById('game-container');
    const countrySelect = document.getElementById('country-select');
    const gameTabs = document.getElementById('game-tabs');
    
    if (gameContainer) gameContainer.classList.remove('hidden');
    if (countrySelect) countrySelect.classList.add('hidden');
    if (gameTabs) gameTabs.classList.remove('hidden');
    
    // Рендерим карту
    renderMap();
    
    hideLoadingScreen();
    addNotification(`Игра начата! Вы играете за ${getCountryInfo(countryId).name}`, 'info');
    addNotification(`Ваши ресурсы: ${Math.floor(getResources().equipment)} снаряжения`, 'info');
}

function setupCanvasClick() {
    const canvas = document.getElementById('map-canvas');
    if (!canvas) return;
    
    canvas.addEventListener('click', (e) => {
        const world = screenToWorld(e.clientX, e.clientY);
        const key = `${world.x},${world.y}`;
        const gridData = getGridData();
        const myId = getMyCountryId();
        const resources = getResources();
        
        // Рекрутинг
        if (pendingRecruit) {
            const unitStats = UNIT_STATS[pendingRecruit];
            if (gridData[key] === myId) {
                if (resources.equipment >= unitStats.cost && resources.manpower >= unitStats.manpower) {
                    import('./game.js').then(({ addUnit, getResources, setResources }) => {
                        const res = getResources();
                        res.equipment -= unitStats.cost;
                        res.manpower -= unitStats.manpower;
                        setResources(res);
                        
                        addUnit({
                            id: Math.random().toString(36).substr(2, 8),
                            pos: key,
                            owner: myId,
                            type: pendingRecruit,
                            trainingDaysLeft: 10,
                            hp: unitStats.hp,
                            path: []
                        });
                        addNotification(`${unitStats.name} развернута!`, 'info');
                        pendingRecruit = null;
                        const hint = document.getElementById('recruit-hint');
                        if (hint) hint.remove();
                        renderMap();
                        updateTopBar();
                    });
                } else {
                    addNotification(`Недостаточно ресурсов! Нужно: ${unitStats.cost}🔫 ${unitStats.manpower}👥`, 'war');
                }
            } else {
                addNotification('Можно развертывать только на своей территории!', 'war');
            }
            return;
        }
        
        // Строительство
        if (window.pendingBuild) {
            if (gridData[key] === myId) {
                const buildType = window.pendingBuild;
                const cost = buildType === 'factory' ? 500 : 300;
                
                if (resources.equipment >= cost) {
                    import('./game.js').then(({ getResources, setResources, addToBuildingQueue, BUILDING_STATS }) => {
                        const res = getResources();
                        res.equipment -= cost;
                        setResources(res);
                        
                        addToBuildingQueue({
                            pos: key,
                            type: buildType,
                            daysLeft: buildType === 'factory' ? 135 : 90
                        });
                        addNotification(`Строительство ${buildType === 'factory' ? 'завода' : 'порта'} начато!`, 'info');
                        window.pendingBuild = null;
                        renderMap();
                        updateTopBar();
                    });
                } else {
                    addNotification(`Недостаточно снаряжения! Нужно: ${cost}`, 'war');
                }
            } else {
                addNotification('Строить можно только на своей территории!', 'war');
            }
            return;
        }
        
        // Показ информации о стране
        if (gridData[key]) {
            showCountryInfo(gridData[key], key);
        }
    });
    
    // ПКМ для отмены
    canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (pendingRecruit) {
            pendingRecruit = null;
            const hint = document.getElementById('recruit-hint');
            if (hint) hint.remove();
            addNotification('Набор отменен', 'info');
        }
        if (window.pendingBuild) {
            window.pendingBuild = null;
            addNotification('Строительство отменено', 'info');
        }
    });
}

function gameLoop(timestamp) {
    renderMap();
    requestAnimationFrame(gameLoop);
}

// Запуск после загрузки DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
