// main.js — главный файл, точка входа

import { COUNTRIES, UNIT_STATS, BUILDING_STATS } from './data.js';
import { 
    getGridData, setGridData, getCellStats, setCellStats, 
    setMyCountryId, setGameActive, setGameSpeed, setGameDate, 
    setUnits, setBuildingQueue, setPlayerResources,
    getMyCountryId, getPlayerResources, getBuildingQueue, 
    getUnits, getGameSpeed, getActiveResearch, getActiveFocus, 
    getSelectedUnitId, setSelectedUnitId, advanceDay, getDateString, 
    getTech, setWars, setAlliances, getWars, getAlliances,
    getActiveBattles, setActiveBattles, initializeFactories,
    getCellStats as getCellStatsData
} from './game.js';
import { renderMap, resizeCanvas, setupMapEvents, screenToWorld, markDirty } from './map.js';
import { deployUnit, giveOrder, processMovement, processCombat, clearRecruitMode } from './military.js';
import { processConstruction, updateEconomy } from './economy.js';
import { updateResearch } from './tech.js';
import { updateFocus } from './focuses.js';
import { runAllAI } from './ai.js';
import { openWindow, closeWindow, updateTopBar, showCountryInfo, showHint } from './ui.js';
import { getCountryInfo, addNotification } from './utils.js';
import { checkCapitulation } from './diplomacy.js';

// ========== ГЛОБАЛЬНЫЕ ДАННЫЕ ==========
window._gridData = {};
window._cellStats = {};
window._units = [];
window._wars = [];
window._alliances = [];
window._countries = COUNTRIES;
window._buildingQueue = [];
window._activeBattles = [];
window._myCountryId = null;
window._isGameActive = false;
window._gameSpeed = 0;
window._gameDate = new Date(1936, 0, 1, 12, 0);
window._tech = { industry: 1, infantry: 1, tank: 1 };
window._activeResearch = null;
window._activeFocus = null;
window._completedFocuses = new Set();
window._playerResources = { equipment: 1000, factories: 0, manpower: 500000 };
window._selectedUnitId = null;

// ========== ГЛОБАЛЬНЫЕ ФУНКЦИИ ==========
window.getPlayerResources = getPlayerResources;
window.setPlayerResources = setPlayerResources;
window.updateTopBar = updateTopBar;

let gameLoopId = null;

// ========== ЗАГРУЗКА КАРТЫ ==========
async function loadMapFromFile(filename) {
    try {
        const response = await fetch(`maps/${filename}`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        const cellCount = Object.keys(data.gridData || {}).length;
        console.log(`✅ Карта "${filename}" загружена (${cellCount} клеток)`);
        return data;
    } catch (error) {
        console.error('❌ Ошибка загрузки карты:', error);
        addNotification(`Ошибка загрузки карты: ${error.message}`, 'war');
        return null;
    }
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
async function init() {
    console.log('🚀 HOI V Remastered v2.0');
    
    resizeCanvas();
    setupMapEvents();
    renderMap();
    
    // Кнопка "Начать игру"
    document.getElementById('btn-play').onclick = async () => {
        const mapData = await loadMapFromFile('europe.json');
        
        if (!mapData) {
            addNotification('Не удалось загрузить карту. Проверьте maps/europe.json', 'war');
            return;
        }
        
        setGridData(mapData.gridData || {});
        setCellStats(mapData.cellStats || {});
        
        const countries = [...new Set(Object.values(getGridData()))];
        showCountrySelection(countries);
        
        addNotification(`Карта Европы (1936) загружена! ${countries.length} стран`, 'info');
    };
    
    // Кнопка отмены
    document.getElementById('btn-cancel').onclick = () => {
        document.getElementById('country-select').classList.add('hidden');
        document.getElementById('main-menu').classList.remove('hidden');
    };
    
    // Кнопки скорости
    document.querySelectorAll('.speed-btn').forEach(btn => {
        btn.onclick = () => {
            const speed = parseInt(btn.dataset.speed);
            setGameSpeed(speed);
            updateSpeedButtons(speed);
        };
    });
    
    // Вкладки
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.onclick = () => openWindow(btn.dataset.tab);
    });
    
    // Закрытие окон
    document.getElementById('close-window').onclick = closeWindow;
    document.getElementById('close-sidebar').onclick = () => {
        document.getElementById('info-sidebar').classList.add('hidden');
    };
    
    // ========== ОБРАБОТЧИК КЛИКОВ ПО КАРТЕ ==========
    const canvas = document.getElementById('map-canvas');
    
    canvas.addEventListener('click', async (e) => {
        const world = screenToWorld(e.clientX, e.clientY);
        const key = `${world.x},${world.y}`;
        const gridData = getGridData();
        const myCountryId = getMyCountryId();
        
        // Режим найма
        if (window._recruitMode) {
            if (gridData[key] === myCountryId) {
                deployUnit(key, window._recruitMode);
            } else {
                addNotification('Можно развертывать только на своей территории!', 'war');
            }
            window._recruitMode = null;
            document.getElementById('recruit-hint')?.classList.add('hidden');
            return;
        }
        
        // Режим стройки
        if (window._pendingBuild) {
            if (gridData[key] === myCountryId) {
                const { startBuilding } = await import('./economy.js');
                const success = startBuilding(window._pendingBuild, key);
                if (success) {
                    markDirty();
                    renderMap();
                    updateTopBar();
                }
            } else {
                addNotification('Строить можно только на своей территории!', 'war');
            }
            window._pendingBuild = null;
            document.getElementById('build-hint')?.classList.add('hidden');
            return;
        }
        
        // Выбран юнит — приказ на движение
        const selectedUnitId = getSelectedUnitId();
        if (selectedUnitId) {
            giveOrder(key, selectedUnitId);
            setSelectedUnitId(null);
            document.getElementById('order-hint')?.classList.add('hidden');
            return;
        }
        
        // Показ информации о стране
        if (gridData[key]) {
            showCountryInfo(gridData[key], key);
        }
    });
    
    // Обработчик ПКМ — выбор юнита или дипломатия
    canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (!getMyCountryId()) return;
        
        const world = screenToWorld(e.clientX, e.clientY);
        const key = `${world.x},${world.y}`;
        const units = getUnits();
        const myId = getMyCountryId();
        const gridData = getGridData();
        
        // Ищем своего юнита на клетке
        const unit = units.find(u => u.pos === key && u.owner === myId);
        if (unit) {
            setSelectedUnitId(unit.id);
            document.getElementById('order-hint')?.classList.remove('hidden');
            showHint('Выберите цель для движения');
            return;
        }
        
        // Если нет юнита — показываем дипломатию для страны
        if (gridData[key] && gridData[key] !== myId) {
            showCountryInfo(gridData[key], key);
        }
    });
    
    // Анимация карты
    function animate() {
        renderMap();
        requestAnimationFrame(animate);
    }
    animate();
}

// ========== ВЫБОР СТРАНЫ ==========
function showCountrySelection(countriesList) {
    const container = document.getElementById('country-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Сортируем: крупные страны первыми
    const gridData = getGridData();
    const countrySizes = {};
    Object.values(gridData).forEach(id => {
        countrySizes[id] = (countrySizes[id] || 0) + 1;
    });
    
    countriesList.sort((a, b) => (countrySizes[b] || 0) - (countrySizes[a] || 0));
    
    countriesList.forEach(countryId => {
        const info = getCountryInfo(countryId);
        const size = countrySizes[countryId] || 0;
        
        const btn = document.createElement('button');
        btn.style.borderLeftColor = info.color;
        btn.style.borderLeftWidth = '4px';
        btn.innerHTML = `
            <div class="font-bold">${info.name}</div>
            <div class="text-xs opacity-70">${info.ideology} • ${info.leader}</div>
            <div class="text-xs opacity-50 mt-1">📊 Провинций: ${size}</div>
        `;
        
        btn.onclick = () => startGame(countryId);
        container.appendChild(btn);
    });
    
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('country-select').classList.remove('hidden');
}

// ========== ЗАПУСК ИГРЫ ==========
function startGame(countryId) {
    setMyCountryId(countryId);
    setGameActive(true);
    setGameSpeed(1);
    setGameDate(new Date(1936, 0, 1, 12, 0));
    setUnits([]);
    setBuildingQueue([]);
    setWars([]);
    setAlliances([]);
    setActiveBattles([]);
    setPlayerResources({ equipment: 1000, factories: 0, manpower: 500000 });
    setSelectedUnitId(null);
    
    // Инициализируем заводы для всех стран
    initializeFactories();
    
    document.getElementById('country-select').classList.add('hidden');
    document.getElementById('game-container').classList.remove('hidden');
    document.getElementById('game-tabs').classList.remove('hidden');
    
    updateSpeedButtons(1);
    updateTopBar();
    markDirty();
    renderMap();
    
    addNotification(`Игра начата! Вы играете за ${getCountryInfo(countryId).name}`, 'info');
    addNotification('ПКМ по вражеской стране — дипломатия', 'info');
    addNotification('WASD — камера, колёсико — зум', 'info');
    
    // Запуск игрового цикла
    if (gameLoopId) cancelAnimationFrame(gameLoopId);
    startGameLoop();
}

// ========== ИГРОВОЙ ЦИКЛ ==========
function startGameLoop() {
    let lastTick = performance.now();
    const TICK_INTERVAL = 1000;
    
    function loop(timestamp) {
        const elapsed = timestamp - lastTick;
        const speed = getGameSpeed();
        
        if (speed > 0 && elapsed >= TICK_INTERVAL / speed) {
            lastTick = timestamp;
            
            // Игровой день
            advanceDay();
            
            // Обновление даты в UI
            const dateElem = document.getElementById('game-date');
            if (dateElem) dateElem.innerText = getDateString();
            
            // Обработка всех систем
            updateResearch();
            updateFocus();
            processConstruction();
            processMovement();
            processCombat();
            
            // Обновление экономики
            try {
                const { getUnitStatsWithTech } = require('./tech.js');
                const unitStats = getUnitStatsWithTech();
                updateEconomy(getTech().industry, unitStats);
            } catch(e) {
                updateEconomy(1, {
                    infantry: { maintenance: 0.2 },
                    tank: { maintenance: 1.5 }
                });
            }
            
            // ИИ
            runAllAI();
            
            // Обновление UI
            updateTopBar();
            updateOpenWindows();
            
            // Перерисовка карты
            markDirty();
        }
        
        gameLoopId = requestAnimationFrame(loop);
    }
    
    gameLoopId = requestAnimationFrame(loop);
}

function updateSpeedButtons(speed) {
    document.querySelectorAll('.speed-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.speed) === speed);
    });
}

function updateOpenWindows() {
    const win = document.getElementById('info-window');
    if (!win || win.classList.contains('hidden')) return;
    
    const title = document.getElementById('window-title');
    if (!title) return;
    
    if (title.innerText.includes('ТЕХНОЛОГИИ')) {
        import('./tech.js').then(m => m.updateResearchUI());
    } else if (title.innerText.includes('ФОКУСЫ')) {
        import('./focuses.js').then(m => m.updateFocusUI());
    } else if (title.innerText.includes('СТРОИТЕЛЬСТВО')) {
        openWindow('build');
    }
}

// ========== ГЛОБАЛЬНЫЕ ФУНКЦИИ ДЛЯ HTML ==========
window.recruitUnit = (type) => {
    document.getElementById('info-window')?.classList.add('hidden');
    window._recruitMode = type;
    showHint(`Выберите провинцию для развертывания ${UNIT_STATS[type]?.icon} ${UNIT_STATS[type]?.name}`);
    document.getElementById('recruit-hint')?.classList.remove('hidden');
};

// ========== ЗАПУСК ==========
init();
