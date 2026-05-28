// main.js — НОВАЯ ТОЧКА ВХОДА (полностью рабочий)

import { World } from './core/World.js';
import { EntityManager } from './core/EntityManager.js';
import { RendererWebGL } from './core/RendererWebGL.js';
import { GameState } from './core/GameState.js';
import { DataLoader } from './core/DataLoader.js';
import { AIController } from './ai/AIController.js';
import { UIManager } from './ui/UIManager.js';
import { WindowsManager } from './ui/Windows.js';
import { TopBar } from './ui/TopBar.js';
import { Notifications } from './ui/Notifications.js';
import { EconomySystem } from './systems/EconomySystem.js';
import { CombatSystem } from './systems/CombatSystem.js';
import { MovementSystem } from './systems/MovementSystem.js';
import { SupplySystem } from './systems/SupplySystem.js';
import { DiplomacySystem } from './systems/DiplomacySystem.js';
import { TechSystem } from './systems/TechSystem.js';
import { FocusSystem } from './systems/FocusSystem.js';
import { addNotification } from './utils/helpers.js';

// Глобальные экземпляры
let world = null;
let entities = null;
let renderer = null;
let gameState = null;
let aiController = null;
let uiManager = null;
let windowsManager = null;
let topBar = null;
let notifications = null;
let economy = null;
let combat = null;
let movement = null;
let supply = null;
let diplomacy = null;
let tech = null;
let focus = null;

let gameLoopId = null;
let lastTimestamp = 0;

async function init() {
    console.log('🚀 HOI5 Remastered v3.0');
    
    showLoadingScreen();
    
    // Инициализация ядра
    world = new World();
    entities = new EntityManager(50000);
    renderer = new RendererWebGL('map-canvas');
    gameState = new GameState();
    
    // Инициализация систем
    economy = new EconomySystem(world, entities, gameState);
    combat = new CombatSystem(world, entities, gameState);
    movement = new MovementSystem(world, entities);
    supply = new SupplySystem(world, entities, gameState);
    diplomacy = new DiplomacySystem(gameState, world, entities);
    tech = new TechSystem(gameState);
    focus = new FocusSystem(gameState, world, entities);
    
    // Инициализация UI
    notifications = new Notifications();
    topBar = new TopBar(gameState);
    windowsManager = new WindowsManager(world, entities, gameState);
    uiManager = new UIManager(world, entities, gameState, windowsManager, topBar);
    
    // Загрузка карты
    const loader = new DataLoader();
    await loader.loadMap('maps/europe.json', world);
    
    // Инициализация ИИ
    aiController = new AIController(world, entities, gameState);
    await aiController.init();
    
    // Настройка событий
    setupEvents();
    
    // Старт игрового цикла
    startGameLoop();
    
    // Скрываем загрузку
    hideLoadingScreen();
    
    // Показываем выбор страны
    showCountrySelection();
}

function setupEvents() {
    // Кнопки меню
    const btnPlay = document.getElementById('btn-play');
    const btnCancel = document.getElementById('btn-cancel');
    const closeWindowBtn = document.getElementById('close-window');
    const closeSidebarBtn = document.getElementById('close-sidebar');
    
    if (btnPlay) btnPlay.onclick = () => showCountrySelection();
    if (btnCancel) btnCancel.onclick = () => hideCountrySelection();
    if (closeWindowBtn) closeWindowBtn.onclick = () => uiManager.closeWindow();
    if (closeSidebarBtn) closeSidebarBtn.onclick = () => uiManager.closeSidebar();
    
    // Кнопки скорости
    document.querySelectorAll('.speed-btn').forEach(btn => {
        btn.onclick = () => {
            const speed = parseInt(btn.dataset.speed);
            gameState.setGameSpeed(speed);
            updateSpeedButtons(speed);
        };
    });
    
    // Кнопки вкладок
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.onclick = () => {
            if (btn.dataset.tab === 'save') {
                uiManager.openWindow('save');
            } else {
                uiManager.openWindow(btn.dataset.tab);
            }
        };
    });
    
    // Клики по карте
    const canvas = document.getElementById('map-canvas');
    if (canvas) {
        canvas.addEventListener('click', handleCanvasClick);
        canvas.addEventListener('contextmenu', handleCanvasRightClick);
        canvas.addEventListener('wheel', handleCanvasWheel);
        canvas.addEventListener('mousemove', handleCanvasMouseMove);
    }
    
    // Клавиши
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    // Глобальные функции для вызова из HTML
    window.recruitUnit = (type) => {
        uiManager.closeWindow();
        window._recruitMode = type;
        const hint = document.getElementById('recruit-hint');
        if (hint) hint.classList.remove('hidden');
        addNotification(`Выберите провинцию для найма ${type}`, 'info');
        setTimeout(() => {
            if (hint) hint.classList.add('hidden');
            window._recruitMode = null;
        }, 15000);
    };
    
    window.selectBuildType = (type) => {
        uiManager.closeWindow();
        window._pendingBuild = type;
        const hint = document.getElementById('build-hint');
        if (hint) hint.classList.remove('hidden');
        addNotification(`Выберите провинцию для строительства`, 'info');
        setTimeout(() => {
            if (hint) hint.classList.add('hidden');
            window._pendingBuild = null;
        }, 15000);
    };
    
    window.selectUnitForMove = (unitId) => {
        gameState.selectedUnitId = unitId;
        uiManager.closeWindow();
        const hint = document.getElementById('order-hint');
        if (hint) hint.classList.remove('hidden');
        addNotification(`Выберите цель для движения`, 'info');
        setTimeout(() => {
            if (hint) hint.classList.add('hidden');
        }, 10000);
    };
    
    window.startResearch = (type, level) => {
        tech.startResearch(type, level);
        uiManager.openWindow('research');
    };
    
    window.startFocus = (focusId) => {
        focus.startFocus(focusId);
        uiManager.openWindow('focus');
    };
    
    window.declareWarOn = (id) => {
        diplomacy.declareWar(id);
        uiManager.closeSidebar();
    };
    
    window.proposeAlly = (id) => {
        diplomacy.proposeAlliance(id);
        uiManager.closeSidebar();
    };
    
    window.callToWar = (id) => {
        diplomacy.callToWar(id);
    };
    
    window.kickAlly = (id) => {
        diplomacy.kickFromAlliance(id);
        uiManager.openWindow('diplomacy');
    };
    
    window.quickSave = () => {
        saveGame();
        addNotification('💾 Игра сохранена!', 'info');
    };
    
    window.quickLoad = () => {
        loadGame();
        addNotification('📂 Игра загружена!', 'info');
        renderer.cameraInitialized = false;
    };
    
    window.createArmy = () => {
        addNotification('Система армий в разработке', 'info');
    };
}

function handleCanvasClick(e) {
    if (!gameState.isGameActive) return;
    
    const rect = renderer.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const worldPos = renderer.screenToWorld(e.clientX, e.clientY);
    const cellOwner = world.getCell(worldPos.x, worldPos.y);
    
    // Режим найма
    if (window._recruitMode) {
        if (cellOwner === gameState.myCountryId) {
            const typeNum = window._recruitMode === 'infantry' ? 0 : 1;
            const unitId = entities.createEntity(gameState.myCountryId, typeNum, worldPos.x, worldPos.y);
            if (unitId) {
                const cost = window._recruitMode === 'infantry' ? 100 : 800;
                const manpower = window._recruitMode === 'infantry' ? 1000 : 500;
                gameState.equipment -= cost;
                gameState.manpower -= manpower;
                addNotification(`Юнит нанят!`, 'info');
            }
        } else {
            addNotification('Можно нанимать только на своей территории!', 'war');
        }
        window._recruitMode = null;
        document.getElementById('recruit-hint')?.classList.add('hidden');
        return;
    }
    
    // Режим строительства
    if (window._pendingBuild) {
        if (cellOwner === gameState.myCountryId) {
            world.addBuilding(worldPos.x, worldPos.y, window._pendingBuild);
            const cost = window._pendingBuild === 'factory' ? 500 : 300;
            gameState.equipment -= cost;
            addNotification(`Строительство начато!`, 'info');
        } else {
            addNotification('Можно строить только на своей территории!', 'war');
        }
        window._pendingBuild = null;
        document.getElementById('build-hint')?.classList.add('hidden');
        return;
    }
    
    // Выбран юнит
    if (gameState.selectedUnitId !== null) {
        const unitId = gameState.selectedUnitId;
        
        // Атака или движение
        if (cellOwner !== 0 && gameState.isAtWar && gameState.isAtWar(gameState.myCountryId, cellOwner)) {
            const targetUnit = entities.getUnitAt(worldPos.x, worldPos.y);
            if (targetUnit && entities.owner[targetUnit] === cellOwner) {
                combat.startCombat(unitId, targetUnit);
            } else {
                movement.giveOrder(unitId, worldPos.x, worldPos.y);
            }
        } else if (cellOwner === gameState.myCountryId || (gameState.areAllies && gameState.areAllies(gameState.myCountryId, cellOwner))) {
            movement.giveOrder(unitId, worldPos.x, worldPos.y);
        }
        
        gameState.selectedUnitId = null;
        document.getElementById('order-hint')?.classList.add('hidden');
        return;
    }
    
    // Выбор юнита
    const unitId = entities.getUnitAt(worldPos.x, worldPos.y);
    if (unitId !== null && entities.owner[unitId] === gameState.myCountryId) {
        gameState.selectedUnitId = unitId;
        document.getElementById('order-hint')?.classList.remove('hidden');
        addNotification(`Юнит выбран. ПКМ для отмены.`, 'info');
        return;
    }
    
    // Показ информации о стране
    if (cellOwner !== 0) {
        uiManager.showCountryInfo(cellOwner, { x: worldPos.x, y: worldPos.y });
    }
}

function handleCanvasRightClick(e) {
    e.preventDefault();
    
    if (!gameState.isGameActive) return;
    
    // Отмена выбора юнита
    if (gameState.selectedUnitId !== null) {
        gameState.selectedUnitId = null;
        document.getElementById('order-hint')?.classList.add('hidden');
        addNotification(`Выбор отменён`, 'info');
        return;
    }
    
    // Показ информации о клетке
    const worldPos = renderer.screenToWorld(e.clientX, e.clientY);
    const cellOwner = world.getCell(worldPos.x, worldPos.y);
    if (cellOwner !== 0) {
        uiManager.showCountryInfo(cellOwner, { x: worldPos.x, y: worldPos.y });
    }
}

function handleCanvasWheel(e) {
    e.preventDefault();
    renderer.zoom(e.deltaY, e.clientX, e.clientY);
}

function handleCanvasMouseMove(e) {
    // Для ховера можно добавить позже
}

function handleKeyDown(e) {
    if (!gameState.isGameActive) return;
    
    // Пробел - пауза
    if (e.code === 'Space') {
        e.preventDefault();
        const newSpeed = gameState.gameSpeed === 0 ? 1 : 0;
        gameState.setGameSpeed(newSpeed);
        updateSpeedButtons(newSpeed);
    }
    
    // WASD для движения камеры
    const speed = 20 / renderer.camera.zoom;
    let moved = false;
    
    if (e.code === 'KeyW' || e.code === 'ArrowUp') {
        renderer.camera.y -= speed;
        moved = true;
    }
    if (e.code === 'KeyS' || e.code === 'ArrowDown') {
        renderer.camera.y += speed;
        moved = true;
    }
    if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        renderer.camera.x -= speed;
        moved = true;
    }
    if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        renderer.camera.x += speed;
        moved = true;
    }
    
    if (moved) {
        e.preventDefault();
    }
}

function handleKeyUp(e) {
    // Можно добавить логику при отпускании клавиш
}

let gameLoopId = null;
let isRendering = false;

function startGameLoop() {
    if (gameLoopId) return;
    
    function loop() {
        // Рендерим ТОЛЬКО если игра активна
        if (gameState.isGameActive && renderer) {
            renderer.render(world, entities, gameState);
            if (topBar) topBar.update();
        }
        
        gameLoopId = requestAnimationFrame(loop);
    }
    
    gameLoopId = requestAnimationFrame(loop);
}

// И не вызывайте startGameLoop в init() — вызывайте её после выбора страны

function updateGame() {
    if (movement) movement.updatePositions();
    
    if (gameState.gameSpeed > 0 && Math.random() < 0.1 && aiController) {
        aiController.update();
    }
    
    if (tech) tech.update();
    if (focus) focus.update();
}

function updateSpeedButtons(speed) {
    document.querySelectorAll('.speed-btn').forEach(btn => {
        const btnSpeed = parseInt(btn.dataset.speed);
        if (btnSpeed === speed) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function showCountrySelection() {
    const countries = world.getAllCountries();
    const list = document.getElementById('country-list');
    if (!list) return;
    
    list.innerHTML = '';
    
    const countriesWithSize = countries.map(c => ({
        id: c,
        size: world.getCountryCells(c).size
    })).sort((a, b) => b.size - a.size);
    
    const major = countriesWithSize.filter(c => c.size >= 30);
    const minor = countriesWithSize.filter(c => c.size < 30);
    
    if (major.length) {
        const majorTitle = document.createElement('div');
        majorTitle.className = 'text-xs text-yellow-600 uppercase py-2 border-b mb-2';
        majorTitle.innerText = 'ВЕЛИКИЕ ДЕРЖАВЫ';
        list.appendChild(majorTitle);
        
        major.forEach(c => {
            const btn = document.createElement('button');
            btn.className = 'w-full text-left p-3 border rounded mb-2 hover:bg-white/20 transition';
            btn.innerHTML = `
                <div class="font-bold text-lg">${c.id.toUpperCase()}</div>
                <div class="text-xs opacity-70">${c.size} провинций</div>
            `;
            btn.onclick = () => startGame(c.id);
            list.appendChild(btn);
        });
    }
    
    if (minor.length) {
        const minorTitle = document.createElement('div');
        minorTitle.className = 'text-xs text-gray-500 uppercase py-2 border-b mb-2 mt-4';
        minorTitle.innerText = 'РЕГИОНАЛЬНЫЕ ДЕРЖАВЫ';
        list.appendChild(minorTitle);
        
        minor.forEach(c => {
            const btn = document.createElement('button');
            btn.className = 'w-full text-left p-2 border rounded mb-1 hover:bg-white/10 transition text-sm';
            btn.innerHTML = `
                <div class="font-bold">${c.id.toUpperCase()}</div>
                <div class="text-xs opacity-50">${c.size} провинций</div>
            `;
            btn.onclick = () => startGame(c.id);
            list.appendChild(btn);
        });
    }
    
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('country-select').classList.remove('hidden');
}

function hideCountrySelection() {
    document.getElementById('country-select').classList.add('hidden');
    document.getElementById('main-menu').classList.remove('hidden');
}

function startGame(countryId) {
    gameState.myCountryId = countryId;
    gameState.isGameActive = true;
    gameState.setGameSpeed(1);
    gameState.equipment = 5000;
    gameState.manpower = 500000;
    gameState.days = 0;
    gameState.gameDate = new Date(1936, 0, 1);
    
    // СОЗДАЁМ ЮНИТЫ ДЛЯ ИГРОКА
    const cells = Array.from(world.getCountryCells(countryId));
    console.log(`📋 Клетки страны ${countryId}: ${cells.length}`);
    
    if (cells.length > 0) {
        const sortedCells = cells.sort();
        const capital = sortedCells[0].split(',').map(Number);
        console.log(`🏰 Столица: (${capital[0]}, ${capital[1]})`);
        
        const offsets = [[0,0], [1,0], [0,1]];
        for (let i = 0; i < offsets.length; i++) {
            const [dx, dy] = offsets[i];
            const x = capital[0] + dx;
            const y = capital[1] + dy;
            
            if (world.getCell(x, y) === countryId) {
                const unitId = entities.createEntity(countryId, 0, x, y);
                console.log(`✅ Создан юнит ${unitId} в (${x},${y})`);
            }
        }
        
        const hasFactory = world.hasBuilding(capital[0], capital[1], 'factory');
        if (hasFactory) {
            const unitId = entities.createEntity(countryId, 1, capital[0] + 2, capital[1]);
            console.log(`✅ Создан танк ${unitId} в (${capital[0] + 2},${capital[1]})`);
        }
    }
    
    document.getElementById('country-select').classList.add('hidden');
    document.getElementById('game-container').classList.remove('hidden');
    document.getElementById('game-tabs').classList.remove('hidden');
    
    updateSpeedButtons(1);
    if (topBar) topBar.update();
    
    addNotification(`🎌 Вы играете за ${countryId.toUpperCase()}`, 'info');
    addNotification(`🖱️ Клик по юниту → ЛКМ по врагу = АТАКА`, 'info');
    addNotification(`⌨️ WASD — камера | Пробел — пауза`, 'info');
    
    if (renderer) renderer.cameraInitialized = false;
}

function saveGame() {
    const saveData = {
        version: '3.0',
        timestamp: Date.now(),
        world: world.serialize(),
        entities: entities.serialize(),
        gameState: gameState.serialize()
    };
    localStorage.setItem('hoi5_save', JSON.stringify(saveData));
}

function loadGame() {
    const raw = localStorage.getItem('hoi5_save');
    if (!raw) {
        addNotification('Нет сохранений!', 'war');
        return;
    }
    
    try {
        const data = JSON.parse(raw);
        world = World.deserialize(data.world);
        entities = new EntityManager(50000);
        entities.deserialize(data.entities);
        gameState.deserialize(data.gameState);
        
        economy = new EconomySystem(world, entities, gameState);
        combat = new CombatSystem(world, entities, gameState);
        movement = new MovementSystem(world, entities);
        supply = new SupplySystem(world, entities, gameState);
        diplomacy = new DiplomacySystem(gameState, world, entities);
        tech = new TechSystem(gameState);
        focus = new FocusSystem(gameState, world, entities);
        
        addNotification(`📂 Игра загружена! День ${gameState.days}`, 'info');
    } catch(e) {
        console.error('Ошибка загрузки:', e);
        addNotification('Ошибка загрузки сохранения!', 'war');
    }
}

function showLoadingScreen() {
    const div = document.createElement('div');
    div.id = 'loading-screen';
    div.innerHTML = `
        <div style="position:fixed;inset:0;background:#0a0a0a;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:9999">
            <div style="font-size:48px;margin-bottom:20px;">⚙️</div>
            <div style="font-size:24px;margin-bottom:30px;">HOI5 REMASTERED</div>
            <div style="width:300px;height:4px;background:#333;border-radius:2px;overflow:hidden">
                <div id="loading-bar" style="width:0%;height:100%;background:#eab308;transition:width 0.3s"></div>
            </div>
            <div id="loading-text" style="margin-top:16px;font-size:12px;color:#888">ЗАГРУЗКА...</div>
        </div>
    `;
    document.body.appendChild(div);
}

function hideLoadingScreen() {
    const el = document.getElementById('loading-screen');
    if (el) el.remove();
}

// Запуск
init().catch(console.error);
