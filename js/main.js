import { COUNTRIES, DEFAULT_MAP, UNIT_STATS } from './data.js';
import { getCountryInfo, addNotification } from './utils.js';
import { 
    setGridData, setCellStats, setMyCountryId, setGameActive, 
    setGameSpeed, setGameDate, setUnits, updateTopBar,
    getGridData, getMyCountryId
} from './game.js';
import { renderMap, resizeCanvas, setupMapEvents, screenToWorld } from './map.js';
import { openTab, closeWindow, showCountryInfo } from './ui.js';

let pendingRecruit = null;

window.openTab = openTab;
window.closeWindow = closeWindow;
window.showCountryInfo = showCountryInfo;

// Рекрутинг через глобальное окно
window.recruitUnit = (type) => {
    closeWindow();
    pendingRecruit = type;
    
    // Удаляем старую подсказку если есть
    const oldHint = document.getElementById('recruit-hint');
    if (oldHint) oldHint.remove();
    
    const hint = document.createElement('div');
    hint.id = 'recruit-hint';
    hint.className = 'fixed bottom-24 left-1/2 -translate-x-1/2 bg-black/90 px-5 py-2 rounded-full text-yellow-400 text-xs z-30 whitespace-nowrap border border-yellow-500/50';
    hint.innerHTML = `💡 Выберите провинцию для развертывания ${UNIT_STATS[type].icon} ${UNIT_STATS[type].name}`;
    document.body.appendChild(hint);
    
    setTimeout(() => hint.remove(), 15000);
};

function init() {
    console.log('🚀 HOI V Remastered загружается...');
    
    resizeCanvas();
    setupMapEvents();
    
    // Кнопки меню
    const startBtn = document.getElementById('btn-start');
    const loadBtn = document.getElementById('btn-load-map');
    const cancelBtn = document.getElementById('btn-cancel');
    const closeWindowBtn = document.getElementById('close-window');
    const mapFileInput = document.getElementById('map-file-input');
    
    if (startBtn) startBtn.onclick = () => loadDefaultMap();
    if (loadBtn) loadBtn.onclick = () => mapFileInput?.click();
    if (cancelBtn) cancelBtn.onclick = () => document.getElementById('country-select')?.classList.add('hidden');
    if (closeWindowBtn) closeWindowBtn.onclick = () => document.getElementById('info-window')?.classList.add('hidden');
    
    if (mapFileInput) {
        mapFileInput.onchange = (e) => {
            if (e.target.files[0]) loadMapFromFile(e.target.files[0]);
        };
    }
    
    // Кнопки скорости
    document.querySelectorAll('.speed-btn').forEach(btn => {
        btn.onclick = () => {
            const speed = parseInt(btn.dataset.speed);
            setGameSpeed(speed);
            document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        };
    });
    
    setupCanvasClick();
    
    // Запуск игрового цикла
    requestAnimationFrame(gameLoop);
    
    console.log('✅ Готово! Жду загрузки карты...');
}

function setupCanvasClick() {
    const canvas = document.getElementById('map-canvas');
    if (!canvas) return;
    
    canvas.addEventListener('click', (e) => {
        const world = screenToWorld(e.clientX, e.clientY);
        const key = `${world.x},${world.y}`;
        const gridData = getGridData();
        const myId = getMyCountryId();
        
        // Рекрутинг
        if (pendingRecruit) {
            if (gridData[key] === myId) {
                import('./game.js').then(({ addUnit }) => {
                    addUnit({
                        id: Math.random().toString(36).substr(2, 8),
                        pos: key,
                        owner: myId,
                        type: pendingRecruit,
                        trainingDaysLeft: 10,
                        hp: UNIT_STATS[pendingRecruit].hp,
                        path: []
                    });
                    addNotification(`${UNIT_STATS[pendingRecruit].name} развернута!`, 'info');
                    pendingRecruit = null;
                    const hint = document.getElementById('recruit-hint');
                    if (hint) hint.remove();
                    renderMap();
                });
            } else {
                addNotification('Можно развертывать только на своей территории!', 'war');
            }
            return;
        }
        
        // Показ информации о стране
        if (gridData[key]) {
            showCountryInfo(gridData[key], key);
        }
    });
}

function loadDefaultMap() {
    console.log('Загрузка дефолтной карты...');
    setGridData(DEFAULT_MAP.gridData);
    setCellStats(DEFAULT_MAP.cellStats || {});
    
    const countries = [...new Set(Object.values(DEFAULT_MAP.gridData))];
    if (countries.length === 0) {
        addNotification('Ошибка: карта пуста!', 'war');
        return;
    }
    
    showCountrySelection(countries);
}

function loadMapFromFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            setGridData(data.gridData || {});
            setCellStats(data.cellStats || {});
            
            const countries = [...new Set(Object.values(data.gridData))];
            if (countries.length === 0) {
                addNotification('Ошибка: на карте нет стран!', 'war');
                return;
            }
            
            addNotification(`Карта "${file.name}" загружена!`, 'info');
            showCountrySelection(countries);
        } catch(err) {
            addNotification('Ошибка JSON: ' + err.message, 'war');
        }
    };
    reader.readAsText(file);
}

function showCountrySelection(countries) {
    const container = document.getElementById('country-list');
    if (!container) return;
    
    container.innerHTML = '';
    
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
    
    const countrySelect = document.getElementById('country-select');
    const mainMenu = document.getElementById('main-menu');
    if (countrySelect) countrySelect.classList.remove('hidden');
    if (mainMenu) mainMenu.classList.add('hidden');
}

function startGame(countryId) {
    console.log('Старт игры за', countryId);
    
    setMyCountryId(countryId);
    setGameActive(true);
    setGameSpeed(1);
    setGameDate(new Date(1936, 0, 1));
    setUnits([]);
    
    const gameContainer = document.getElementById('game-container');
    const countrySelect = document.getElementById('country-select');
    const gameTabs = document.getElementById('game-tabs');
    
    if (gameContainer) gameContainer.classList.remove('hidden');
    if (countrySelect) countrySelect.classList.add('hidden');
    if (gameTabs) gameTabs.classList.remove('hidden');
    
    updateTopBar();
    renderMap();
    
    addNotification(`Игра начата! Вы играете за ${getCountryInfo(countryId).name}`, 'info');
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
