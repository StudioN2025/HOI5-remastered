// main.js — НОВАЯ ТОЧКА ВХОДА С WEBGL

import { World } from './core/World.js';
import { EntityManager } from './core/EntityManager.js';
import { RendererWebGL } from './core/RendererWebGL.js';
import { GameState } from './core/GameState.js';
import { DataLoader } from './core/DataLoader.js';
import { AIController } from './ai/AIController.js';
import { UIManager } from './ui/UIManager.js';
import { EconomySystem } from './systems/EconomySystem.js';
import { CombatSystem } from './systems/CombatSystem.js';
import { MovementSystem } from './systems/MovementSystem.js';
import { SupplySystem } from './systems/SupplySystem.js';

// Глобальные экземпляры
let world = null;
let entities = null;
let renderer = null;
let gameState = null;
let aiController = null;
let uiManager = null;
let economy = null;
let combat = null;
let movement = null;
let supply = null;

let gameLoopId = null;
let lastTimestamp = 0;

async function init() {
    console.log('🚀 HOI5 Remastered v3.0 (WebGL)');
    
    // Показываем загрузку
    showLoadingScreen();
    
    // Инициализация ядра
    world = new World();
    entities = new EntityManager(50000); // до 50k юнитов
    renderer = new RendererWebGL('map-canvas');
    gameState = new GameState();
    
    // Инициализация систем
    economy = new EconomySystem(world, entities, gameState);
    combat = new CombatSystem(world, entities, gameState);
    movement = new MovementSystem(world, entities);
    supply = new SupplySystem(world, entities, gameState);
    
    // Инициализация UI
    uiManager = new UIManager(world, entities, gameState);
    
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
}

function setupEvents() {
    document.getElementById('btn-play').onclick = () => showCountrySelection();
    document.getElementById('btn-cancel').onclick = () => hideCountrySelection();
    
    document.querySelectorAll('.speed-btn').forEach(btn => {
        btn.onclick = () => {
            const speed = parseInt(btn.dataset.speed);
            gameState.setGameSpeed(speed);
            updateSpeedButtons(speed);
        };
    });
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.onclick = () => uiManager.openWindow(btn.dataset.tab);
    });
    
    document.getElementById('close-window').onclick = () => uiManager.closeWindow();
    document.getElementById('close-sidebar').onclick = () => uiManager.closeSidebar();
    
    // Клики по карте
    const canvas = document.getElementById('map-canvas');
    canvas.addEventListener('click', handleCanvasClick);
    canvas.addEventListener('contextmenu', handleCanvasRightClick);
    
    // Клавиши
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            e.preventDefault();
            const newSpeed = gameState.gameSpeed === 0 ? 1 : 0;
            gameState.setGameSpeed(newSpeed);
            updateSpeedButtons(newSpeed);
        }
    });
}

function startGameLoop() {
    let lastTick = performance.now();
    let accumulator = 0;
    const TICK_DURATION = 1000 / 60; // 60 FPS
    
    function loop(now) {
        let delta = Math.min(1000, now - lastTick);
        lastTick = now;
        accumulator += delta;
        
        // Обновление состояния игры (60 раз в секунду)
        while (accumulator >= TICK_DURATION) {
            updateGame();
            accumulator -= TICK_DURATION;
        }
        
        // Рендер (WebGL)
        renderer.render(world, entities, gameState);
        
        // Обновление UI
        uiManager.update();
        
        gameLoopId = requestAnimationFrame(loop);
    }
    
    gameLoopId = requestAnimationFrame(loop);
}

let dayCounter = 0;
const DAYS_PER_UPDATE = 60; // 1 игровой день = 60 тиков (~1 секунда при 60 FPS)

function updateGame() {
    dayCounter++;
    
    if (dayCounter >= DAYS_PER_UPDATE) {
        dayCounter = 0;
        
        // Обновление дня
        gameState.advanceDay();
        uiManager.updateDate();
        
        // Экономика
        economy.update();
        
        // Снабжение
        supply.update();
        
        // Движение юнитов
        movement.update();
        
        // Бои
        combat.update();
        
        // ИИ (в отдельном потоке)
        aiController.update();
        
        // Автосохранение
        if (gameState.days % 30 === 0) {
            saveGame();
        }
    }
    
    // Движение юнитов (каждый кадр, но с задержкой)
    movement.updatePositions();
}

function handleCanvasClick(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const worldPos = renderer.screenToWorld(x, y);
    const cellOwner = world.getCell(worldPos.x, worldPos.y);
    
    // Логика выбора юнитов и отдачи приказов
    if (gameState.selectedUnitId !== null) {
        movement.giveOrder(gameState.selectedUnitId, worldPos.x, worldPos.y);
        gameState.selectedUnitId = null;
        uiManager.hideOrderHint();
    } else if (cellOwner === gameState.myCountryId) {
        // Выбор юнита
        const unitId = entities.getUnitAt(worldPos.x, worldPos.y);
        if (unitId !== null) {
            gameState.selectedUnitId = unitId;
            uiManager.showOrderHint();
        }
    } else if (cellOwner !== 0) {
        uiManager.showCountryInfo(cellOwner, worldPos);
    }
}

function handleCanvasRightClick(e) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const worldPos = renderer.screenToWorld(x, y);
    const unitId = entities.getUnitAt(worldPos.x, worldPos.y);
    
    if (unitId !== null && entities.owner[unitId] === gameState.myCountryId) {
        gameState.selectedUnitId = unitId;
        uiManager.showOrderHint();
    }
}

function showCountrySelection() {
    const countries = world.getAllCountries();
    const list = document.getElementById('country-list');
    list.innerHTML = '';
    
    countries.forEach(countryId => {
        const btn = document.createElement('button');
        btn.innerHTML = `<div class="font-bold">${countryId}</div>`;
        btn.onclick = () => startGame(countryId);
        list.appendChild(btn);
    });
    
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
    
    document.getElementById('country-select').classList.add('hidden');
    document.getElementById('game-container').classList.remove('hidden');
    document.getElementById('game-tabs').classList.remove('hidden');
    
    updateSpeedButtons(1);
    uiManager.updateTopBar();
}

function updateSpeedButtons(speed) {
    document.querySelectorAll('.speed-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.speed) === speed);
    });
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

function showLoadingScreen() {
    const div = document.createElement('div');
    div.id = 'loading-screen';
    div.innerHTML = `<div style="position:fixed;inset:0;background:#0a0a0a;display:flex;align-items:center;justify-content:center;z-index:9999">Загрузка...</div>`;
    document.body.appendChild(div);
}

function hideLoadingScreen() {
    document.getElementById('loading-screen')?.remove();
}

// Запуск
init().catch(console.error);
