// main.js — ПОЛНАЯ ФИНАЛЬНАЯ ВЕРСИЯ

import { COUNTRIES, UNIT_STATS, BUILDING_STATS } from './data.js';
import { 
    getGridData, setGridData, getCellStats, setCellStats, 
    setMyCountryId, setGameActive, setGameSpeed, setGameDate, 
    setUnits, setBuildingQueue, setPlayerResources,
    getMyCountryId, getPlayerResources, getBuildingQueue, 
    getUnits, getGameSpeed, getActiveResearch, getActiveFocus, 
    getSelectedUnitId, setSelectedUnitId, advanceDay, getDateString, 
    getTech, setWars, setAlliances, getWars, getAlliances,
    getActiveBattles, setActiveBattles, initializeFactories
} from './game.js';
import { renderMap, resizeCanvas, setupMapEvents, screenToWorld, markDirty } from './map.js';
import { deployUnit, giveOrder, processMovement, processCombat, clearRecruitMode } from './military.js';
import { processConstruction, updateEconomy } from './economy.js';
import { updateResearch } from './tech.js';
import { updateFocus } from './focuses.js';
import { runAllAI } from './ai.js';
import { openWindow, closeWindow, updateTopBar, showCountryInfo, showHint } from './ui.js';
import { getCountryInfo, addNotification, isAtWar } from './utils.js';

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

// ========== ПРЕДЗАГРУЗКА ИЗОБРАЖЕНИЙ ==========
const IMAGES_TO_PRELOAD = [
    'assets/hoi5-backend.png',
    'assets/uploading-screan.png'
];

function preloadImages() {
    const loadPromises = IMAGES_TO_PRELOAD.map(src => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                console.log(`✅ Загружено: ${src}`);
                resolve(img);
            };
            img.onerror = () => {
                console.warn(`⚠️ Не удалось загрузить: ${src} (будет использован фон по умолчанию)`);
                resolve(null);
            };
            img.src = src;
        });
    });
    
    return Promise.all(loadPromises);
}

// ========== ЭКРАН ЗАГРУЗКИ ==========
function showLoadingScreen() {
    const menu = document.getElementById('main-menu');
    if (menu) menu.style.display = 'none';
    
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loading-screen';
    loadingDiv.innerHTML = `
        <div style="
            position: fixed;
            inset: 0;
            z-index: 9999;
            background: #0a0a0a;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-family: 'Special Elite', monospace;
            color: #eab308;
        ">
            <div style="font-size: 48px; margin-bottom: 20px;">⚙️</div>
            <div style="font-size: 24px; letter-spacing: 0.2em; margin-bottom: 30px;">HOI V REMASTERED</div>
            <div id="loading-bar-container" style="
                width: 300px;
                height: 8px;
                background: #1f2937;
                border-radius: 4px;
                overflow: hidden;
                border: 1px solid #4b5563;
            ">
                <div id="loading-bar-fill" style="
                    width: 0%;
                    height: 100%;
                    background: linear-gradient(90deg, #eab308, #fbbf24);
                    transition: width 0.3s ease;
                "></div>
            </div>
            <div id="loading-text" style="
                margin-top: 16px;
                font-size: 12px;
                color: #9ca3af;
                letter-spacing: 0.1em;
            ">ЗАГРУЗКА РЕСУРСОВ...</div>
        </div>
    `;
    document.body.appendChild(loadingDiv);
    
    return {
        setProgress: (percent) => {
            const fill = document.getElementById('loading-bar-fill');
            if (fill) fill.style.width = `${Math.min(100, Math.max(0, percent))}%`;
        },
        setText: (text) => {
            const textEl = document.getElementById('loading-text');
            if (textEl) textEl.innerText = text;
        },
        remove: () => {
            const screen = document.getElementById('loading-screen');
            if (screen) {
                screen.style.opacity = '0';
                screen.style.transition = 'opacity 0.3s ease';
                setTimeout(() => {
                    screen.remove();
                }, 300);
            }
            if (menu) menu.style.display = '';
        }
    };
}

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

// ========== ПРОВЕРКА АЛЬЯНСА ==========
function areAlliesCheck(c1, c2) {
    if (c1 === c2) return true;
    const alliances = getAlliances();
    return alliances.some(a => a.has && a.has(c1) && a.has(c2));
}

// ========== ВЫБОР СТРАНЫ ==========
function showCountrySelection(countriesList) {
    const container = document.getElementById('country-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    const gridData = getGridData();
    const countrySizes = {};
    Object.values(gridData).forEach(id => {
        countrySizes[id] = (countrySizes[id] || 0) + 1;
    });
    
    countriesList.sort((a, b) => (countrySizes[b] || 0) - (countrySizes[a] || 0));
    
    const majorCountries = countriesList.filter(id => (countrySizes[id] || 0) >= 30);
    const minorCountries = countriesList.filter(id => (countrySizes[id] || 0) < 30);
    
    if (majorCountries.length > 0) {
        const majorLabel = document.createElement('div');
        majorLabel.style.cssText = 'font-size: 10px; color: #854d0e; text-transform: uppercase; letter-spacing: 0.1em; padding: 4px 0; border-bottom: 1px solid rgba(0,0,0,0.1); margin-bottom: 4px;';
        majorLabel.innerText = 'Великие державы';
        container.appendChild(majorLabel);
        
        majorCountries.forEach(countryId => {
            container.appendChild(createCountryButton(countryId, countrySizes));
        });
    }
    
    if (minorCountries.length > 0) {
        const minorLabel = document.createElement('div');
        minorLabel.style.cssText = 'font-size: 10px; color: #854d0e; text-transform: uppercase; letter-spacing: 0.1em; padding: 8px 0 4px; border-bottom: 1px solid rgba(0,0,0,0.1); margin-bottom: 4px;';
        minorLabel.innerText = 'Региональные державы';
        container.appendChild(minorLabel);
        
        minorCountries.forEach(countryId => {
            container.appendChild(createCountryButton(countryId, countrySizes));
        });
    }
    
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('country-select').classList.remove('hidden');
}

function createCountryButton(countryId, countrySizes) {
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
    return btn;
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
    
    initializeFactories();
    
    document.getElementById('country-select').classList.add('hidden');
    document.getElementById('game-container').classList.remove('hidden');
    document.getElementById('game-tabs').classList.remove('hidden');
    
    updateSpeedButtons(1);
    updateTopBar();
    markDirty();
    renderMap();
    
    const info = getCountryInfo(countryId);
    addNotification(`🎌 Игра начата! Вы играете за ${info.name}`, 'info');
    addNotification(`👑 Лидер: ${info.leader} | ⚡ ${info.ideology}`, 'info');
    addNotification('🖱️ Выберите юнит и кликните по врагу для атаки', 'info');
    addNotification('⌨️ WASD — камера | Колёсико — зум | Пробел — пауза', 'info');
    
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
            
            advanceDay();
            
            const dateElem = document.getElementById('game-date');
            if (dateElem) dateElem.innerText = getDateString();
            
            updateResearch();
            updateFocus();
            processConstruction();
            processMovement();
            processCombat();
            
            try {
                const unitStats = {
                    infantry: { maintenance: 0.2 },
                    tank: { maintenance: 1.5 }
                };
                updateEconomy(getTech().industry, unitStats);
            } catch(e) {
                console.warn('Ошибка обновления экономики:', e);
            }
            
            runAllAI();
            
            updateTopBar();
            updateOpenWindows();
            
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

// ========== ИНИЦИАЛИЗАЦИЯ ==========
async function init() {
    console.log('🚀 HOI V Remastered v2.0 — Запуск');
    
    const loadingScreen = showLoadingScreen();
    
    loadingScreen.setText('ЗАГРУЗКА ИЗОБРАЖЕНИЙ...');
    loadingScreen.setProgress(10);
    await preloadImages();
    
    loadingScreen.setText('ИНИЦИАЛИЗАЦИЯ КАРТЫ...');
    loadingScreen.setProgress(40);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    resizeCanvas();
    setupMapEvents();
    renderMap();
    
    loadingScreen.setText('ЗАГРУЗКА МОДУЛЕЙ...');
    loadingScreen.setProgress(70);
    await new Promise(resolve => setTimeout(resolve, 200));
    
    loadingScreen.setText('ПОДГОТОВКА ИНТЕРФЕЙСА...');
    loadingScreen.setProgress(90);
    
    // ========== ОБРАБОТЧИКИ СОБЫТИЙ ==========
    
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
        const units = getUnits();
        const wars = getWars();
        
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
        
        // ========== ВЫБРАН ЮНИТ — АТАКА ИЛИ ДВИЖЕНИЕ ==========
        const selectedUnitId = getSelectedUnitId();
        if (selectedUnitId) {
            const selectedUnit = units.find(u => u.id === selectedUnitId);
            
            if (!selectedUnit) {
                setSelectedUnitId(null);
                document.getElementById('order-hint')?.classList.add('hidden');
                return;
            }
            
            const targetOwner = gridData[key];
            
            // ✅ КЛИК ПО ВРАГУ (территория или юнит) — АТАКА
            if (targetOwner && isAtWar(myCountryId, targetOwner, wars)) {
                // Ищем вражеского юнита на клетке
                const enemyUnit = units.find(u => u.pos === key && u.owner !== myCountryId && isAtWar(myCountryId, u.owner, wars));
                
                if (enemyUnit) {
                    // ✅ АТАКА ВРАЖЕСКОГО ЮНИТА
                    const activeBattles = getActiveBattles();
                    const alreadyFighting = activeBattles.some(b =>
                        (b.attacker && b.attacker.id === selectedUnit.id && b.defender && b.defender.id === enemyUnit.id) ||
                        (b.attacker && b.attacker.id === enemyUnit.id && b.defender && b.defender.id === selectedUnit.id)
                    );
                    
                    if (!alreadyFighting) {
                        activeBattles.push({
                            attacker: selectedUnit,
                            defender: enemyUnit,
                            daysCounter: 0
                        });
                        setActiveBattles(activeBattles);
                        
                        const enemyName = enemyUnit.type === 'tank' ? '🚜 Танки' : '💂 Пехоту';
                        addNotification(`⚔️ Атака на вражескую ${enemyName}! Бой начат!`, 'war');
                    }
                    
                    setSelectedUnitId(null);
                    document.getElementById('order-hint')?.classList.add('hidden');
                    markDirty();
                    return;
                }
                
                // ✅ Вражеская территория БЕЗ юнита — захват
                giveOrder(key, selectedUnitId);
                setSelectedUnitId(null);
                document.getElementById('order-hint')?.classList.add('hidden');
                return;
            }
            
            // ✅ Клик по своей или союзной клетке — движение
            if (targetOwner === myCountryId || areAlliesCheck(myCountryId, targetOwner)) {
                giveOrder(key, selectedUnitId);
                setSelectedUnitId(null);
                document.getElementById('order-hint')?.classList.add('hidden');
                return;
            }
            
            // ✅ Клик по нейтральной стране
            if (targetOwner) {
                addNotification('⚡ Нельзя атаковать нейтральную страну! Объявите войну через ПКМ по клетке страны.', 'war');
            } else {
                addNotification('🌊 Юниты не могут ходить по воде! Используйте порты.', 'war');
            }
            setSelectedUnitId(null);
            document.getElementById('order-hint')?.classList.add('hidden');
            return;
        }
        
        // ========== ЮНИТ НЕ ВЫБРАН — ПОКАЗ ИНФОРМАЦИИ ==========
        if (gridData[key]) {
            showCountryInfo(gridData[key], key);
        }
    });
    
    // ========== ОБРАБОТЧИК ПКМ — ВЫБОР ЮНИТА ИЛИ ДИПЛОМАТИЯ ==========
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
            document.getElementById('info-sidebar')?.classList.add('hidden');
            showHint('⚔️ Кликните по врагу для атаки или по территории для захвата');
            return;
        }
        
        // Если нет юнита — показываем дипломатию для страны
        if (gridData[key] && gridData[key] !== myId) {
            showCountryInfo(gridData[key], key);
        }
    });
    
    // ========== ПРОБЕЛ — ПАУЗА ==========
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && getMyCountryId()) {
            e.preventDefault();
            const speed = getGameSpeed();
            if (speed === 0) {
                setGameSpeed(1);
                updateSpeedButtons(1);
            } else {
                setGameSpeed(0);
                updateSpeedButtons(0);
            }
        }
    });
    
    // Завершение загрузки
    loadingScreen.setProgress(100);
    loadingScreen.setText('ГОТОВО');
    
    setTimeout(() => {
        loadingScreen.remove();
        console.log('✅ Инициализация завершена');
    }, 400);
    
    // Анимация карты
    function animate() {
        renderMap();
        requestAnimationFrame(animate);
    }
    animate();
}

// ========== ГЛОБАЛЬНЫЕ ФУНКЦИИ ДЛЯ HTML ==========
window.recruitUnit = (type) => {
    document.getElementById('info-window')?.classList.add('hidden');
    window._recruitMode = type;
    showHint(`🎯 Выберите провинцию для развертывания ${UNIT_STATS[type]?.icon} ${UNIT_STATS[type]?.name}`);
    document.getElementById('recruit-hint')?.classList.remove('hidden');
};

// ========== ЗАПУСК ==========
init().catch(error => {
    console.error('❌ Ошибка инициализации:', error);
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) loadingScreen.remove();
    document.getElementById('main-menu').style.display = '';
});
