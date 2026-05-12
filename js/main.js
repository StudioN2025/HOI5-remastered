// main.js — главный файл, точка входа

import { COUNTRIES, UNIT_STATS, BUILDING_STATS, DEMO_MAP } from './data.js';
import { 
    getGridData, setGridData, getCellStats, setCellStats, setMyCountryId, setGameActive,
    setGameSpeed, setGameDate, setUnits, setBuildingQueue, setPlayerResources,
    getMyCountryId, getPlayerResources, getBuildingQueue, getUnits, getGameSpeed,
    getActiveResearch, getActiveFocus, getSelectedUnitId, setSelectedUnitId,
    advanceDay, getDateString, getTech, setGameDate as setDate
} from './game.js';
import { renderMap, resizeCanvas, setupMapEvents, screenToWorld } from './map.js';
import { deployUnit, giveOrder, processMovement, processCombat } from './military.js';
import { updateEconomy } from './economy.js';
import { updateResearch } from './tech.js';
import { updateFocus } from './focuses.js';
import { runAllAI } from './ai.js';
import { openWindow, closeWindow, updateTopBar, showCountryInfo, showHint } from './ui.js';
import { getCountryInfo, addNotification } from './utils.js';
import { declareWar } from './diplomacy.js';

// Глобальные данные
window._gridData = {};
window._cellStats = {};
window._units = [];
window._wars = [];
window._alliances = [];
window._countries = COUNTRIES;

// Глобальные функции для onclick
window.getPlayerResources = getPlayerResources;
window.setPlayerResources = setPlayerResources;

let gameLoopId = null;

// ========== ИНИЦИАЛИЗАЦИЯ ==========
async function init() {
    console.log('🚀 HOI V Remastered v2.0');
    
    resizeCanvas();
    setupMapEvents();
    renderMap();
    
    // Кнопка "Начать игру" в меню
    document.getElementById('btn-play').onclick = () => {
        setGridData(DEMO_MAP.gridData);
        setCellStats(DEMO_MAP.cellStats);
        
        const countries = [...new Set(Object.values(DEMO_MAP.gridData))];
        showCountrySelection(countries);
    };
    
    // Кнопка загрузки карты
    document.getElementById('btn-load-map').onclick = () => {
        document.getElementById('map-file-input').click();
    };
    
    // Обработчик загрузки файла
    document.getElementById('map-file-input').onchange = (e) => {
        if (e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const data = JSON.parse(ev.target.result);
                    setGridData(data.gridData || data);
                    setCellStats(data.cellStats || {});
                    
                    const countries = [...new Set(Object.values(getGridData()))];
                    showCountrySelection(countries);
                    
                    addNotification(`Карта "${e.target.files[0].name}" загружена!`, 'info');
                } catch(err) {
                    addNotification('Ошибка загрузки JSON файла', 'war');
                }
            };
            reader.readAsText(e.target.files[0]);
        }
    };
    
    // Кнопка отмены выбора страны
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
    
    // Обработчик кликов по карте
    const canvas = document.getElementById('map-canvas');
    canvas.addEventListener('click', async (e) => {
        const world = screenToWorld(e.clientX, e.clientY);
        const key = `${world.x},${world.y}`;
        const gridData = getGridData();
        const myCountryId = getMyCountryId();
        
        // Режим найма
        const recruitMode = window._recruitMode;
        if (recruitMode) {
            if (gridData[key] === myCountryId) {
                deployUnit(key, recruitMode);
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
                startBuilding(window._pendingBuild, key);
                updateTopBar();
            } else {
                addNotification('Строить можно только на своей территории!', 'war');
            }
            window._pendingBuild = null;
            document.getElementById('build-hint')?.classList.add('hidden');
            return;
        }
        
        // Выбран юнит
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
    
    // Обработчик ПКМ для выбора юнита
    canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (!getMyCountryId()) return;
        
        const world = screenToWorld(e.clientX, e.clientY);
        const key = `${world.x},${world.y}`;
        const units = getUnits();
        const myId = getMyCountryId();
        
        const unit = units.find(u => u.pos === key && u.owner === myId);
        if (unit) {
            setSelectedUnitId(unit.id);
            document.getElementById('order-hint')?.classList.remove('hidden');
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
    if (!container) return;
    
    container.innerHTML = '';
    
    countriesList.forEach(countryId => {
        const info = getCountryInfo(countryId);
        const btn = document.createElement('button');
        btn.style.borderLeftColor = info.color;
        btn.style.borderLeftWidth = '4px';
        btn.innerHTML = `
            <div class="font-bold">${info.name}</div>
            <div class="text-xs opacity-70">${info.ideology} • ${info.leader}</div>
        `;
        
        btn.onclick = () => startGame(countryId);
        container.appendChild(btn);
    });
    
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('country-select').classList.remove('hidden');
}

function startGame(countryId) {
    setMyCountryId(countryId);
    setGameActive(true);
    setGameSpeed(1);
    setGameDate(new Date(1936, 0, 1, 12, 0));
    setUnits([]);
    setBuildingQueue([]);
    setPlayerResources({ equipment: 1000, factories: 0, manpower: 500000 });
    setSelectedUnitId(null);
    
    document.getElementById('country-select').classList.add('hidden');
    document.getElementById('game-container').classList.remove('hidden');
    document.getElementById('game-tabs').classList.remove('hidden');
    
    updateSpeedButtons(1);
    updateTopBar();
    renderMap();
    
    addNotification(`Игра начата! Вы играете за ${getCountryInfo(countryId).name}`, 'info');
    
    // Запуск игрового цикла
    if (gameLoopId) cancelAnimationFrame(gameLoopId);
    startGameLoop();
}

function startGameLoop() {
    let lastTick = performance.now();
    const TICK_INTERVAL = 1000; // 1 секунда = 1 игровой день на скорости 1x
    
    function loop(timestamp) {
        const elapsed = timestamp - lastTick;
        const speed = getGameSpeed();
        
        if (speed > 0 && elapsed >= TICK_INTERVAL / speed) {
            lastTick = timestamp;
            
            // Игровой день
            advanceDay();
            
            // Обновление даты в интерфейсе
            document.getElementById('game-date').innerText = getDateString();
            
            // Обработка всех систем
            updateResearch();
            updateFocus();
            processMovement();
            processCombat();
            updateEconomy(getTech(), {});
            runAllAI();
            updateTopBar();
            
            // Обновление UI если окна открыты
            updateOpenWindows();
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
    
    // Обновляем содержимое в зависимости от открытой вкладки
    if (title.innerText.includes('ТЕХНОЛОГИИ')) {
        import('./tech.js').then(m => m.updateResearchUI());
    } else if (title.innerText.includes('ФОКУСЫ')) {
        import('./focuses.js').then(m => m.updateFocusUI());
    }
}

// Экспортируем для использования в HTML
window.recruitUnit = (type) => {
    document.getElementById('info-window')?.classList.add('hidden');
    window._recruitMode = type;
    showHint(`Выберите провинцию для развертывания ${UNIT_STATS[type]?.icon} ${UNIT_STATS[type]?.name}`);
    document.getElementById('recruit-hint')?.classList.remove('hidden');
};

// Запуск
init();
