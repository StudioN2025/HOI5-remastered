// main.js — НОВАЯ ТОЧКА ВХОДА (исправлен дубликат gameLoopId)

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
import { ProductionSystem } from './systems/ProductionSystem.js';
import { MovementSystem } from './systems/MovementSystem.js';
import { ArmyManager } from './systems/ArmyManager.js';
import { SupplySystem } from './systems/SupplySystem.js';
import { DiplomacySystem } from './systems/DiplomacySystem.js';
import { TechSystem, TECH_TREE, TECH_BRANCHES } from './systems/TechSystem.js';
import { FocusSystem, FOCUS_TREE } from './systems/FocusSystem.js';
import { loadFocusTree } from './data/FocusTree.js';
import { QueueSystem, TRAIN_DEFS, BUILD_DEFS } from './systems/QueueSystem.js';
import { addNotification } from './utils/helpers.js';
import { COUNTRIES } from './data/Countries.js';

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
let armyManager = null;
let production = null;
let supply = null;
let diplomacy = null;
let tech = null;
let focus = null;
let queue = null;

let animationFrameId = null;
let lastTimestamp = 0;
let needsRender = true; // глобальная — чтобы touch-обработчики видели

async function init() {
    console.log('🚀 Heirloom v4.0');

    // Минимальная инициализация — показываем меню сразу
    world = new World();
    entities = new EntityManager(50000);
    renderer = new RendererWebGL('map-canvas');
    gameState = new GameState();

    economy = new EconomySystem(world, entities, gameState);
    combat = new CombatSystem(world, entities, gameState);
    production = new ProductionSystem(world, entities, gameState, combat);
    movement = new MovementSystem(world, entities, gameState);
    armyManager = new ArmyManager(entities, gameState, world);
    window._armyManager = armyManager;
    supply = new SupplySystem(world, entities, gameState);
    diplomacy = new DiplomacySystem(gameState, world, entities);
    tech = new TechSystem(gameState);
    combat.tech = tech;
    window._TECH_TREE = TECH_TREE;
    window._TECH_BRANCHES = TECH_BRANCHES;
    window._FOCUS_TREE = FOCUS_TREE;
    window._COUNTRIES_MAP = COUNTRIES;
    focus = new FocusSystem(gameState, world, entities);

    notifications = new Notifications();
    topBar = new TopBar(gameState);
    windowsManager = new WindowsManager(world, entities, gameState, tech, focus);
    uiManager = new UIManager(world, entities, gameState, windowsManager, topBar);

    // Показываем меню — пользователь сам нажимает "НАЧАТЬ"
    setupEvents();
}

// Загружаем ресурсы по кнопке
async function loadGameData() {
    showLoadingScreen();
    updateLoadingBar(10, 'Загрузка карты...');

    const loader = new DataLoader();
    await loader.loadMap('maps/europe.json', world);

    updateLoadingBar(50, 'Генерация рельефа...');
    world.generateTerrain();

    updateLoadingBar(60, 'Загрузка фокусов...');
    const loadedFocuses = await loadFocusTree();
    window._FOCUS_TREE = loadedFocuses;

    updateLoadingBar(75, 'Предзагрузка ресурсов...');
    await preloadResources();

    updateLoadingBar(85, 'Инициализация ИИ...');
    aiController = new AIController(world, entities, gameState);
    aiController.production = production;
    await aiController.init();

    updateLoadingBar(100, 'Готово!');
    setTimeout(() => hideLoadingScreen(), 300);
    showCountrySelection();
}

async function preloadResources() {
    const images = [
        { src: 'assets/army/germany_soldier.png', name: 'germany_soldier' },
        { src: 'assets/army/france_soldier.png', name: 'france_soldier' },
        { src: 'assets/army/soviet_soldier.png', name: 'soviet_soldier' },
    ];
    const failed = [];
    const timeout = new Promise(resolve => setTimeout(resolve, 10000));
    const loads = Promise.all(images.map(({ src, name }) => new Promise(resolve => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => { failed.push(name); resolve(); };
        img.src = src;
    })));
    await Promise.race([loads, timeout]);

    if (failed.length > 0) {
        addNotification(`⚠️ Не загрузилось: ${failed.join(', ')}. Плохой интернет или проблемы с сервером. Будут использоваться эмодзи.`, 'war');
    }
}

function setupEvents() {
    // Кнопки меню
    const btnPlay = document.getElementById('btn-play');
    const btnCancel = document.getElementById('btn-cancel');
    const closeWindowBtn = document.getElementById('close-window');
    const closeSidebarBtn = document.getElementById('close-sidebar');
    
    if (btnPlay) btnPlay.onclick = () => loadGameData();
    if (btnCancel) btnCancel.onclick = () => hideCountrySelection();
    if (closeWindowBtn) closeWindowBtn.onclick = () => {
        // Если открыто окно капитуляции — не даём закрыть без выбора
        if (window._capitulationPending) return;
        uiManager.closeWindow();
    };
    if (closeSidebarBtn) closeSidebarBtn.onclick = () => uiManager.closeSidebar();
    
    // Кнопки скорости
    document.querySelectorAll('.speed-btn').forEach(btn => {
        btn.onclick = () => {
            const speed = parseInt(btn.dataset.speed);
            if (isNaN(speed)) return;
            gameState.setGameSpeed(speed);
            updateSpeedButtons(speed);
        };
    });

    // Кнопка полноэкранного режима
    document.getElementById('btn-fullscreen')?.addEventListener('click', () => {
        const el = document.documentElement;
        if (!document.fullscreenElement) {
            if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
            else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen().catch(() => {});
            else if (el.msRequestFullscreen) el.msRequestFullscreen().catch(() => {});
        } else {
            if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
            else if (document.webkitExitFullscreen) document.webkitExitFullscreen().catch(() => {});
        }
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

        // Shift+drag — выделение юнитов как кистью
        let shiftDragging = false;
        canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0 && e.shiftKey) {
                shiftDragging = true;
                if (window._recruitMode || window._pendingBuild) return;
                // Shift+drag по юнитам — выделяем как кистью
                const worldPos = renderer.screenToWorld(e.clientX, e.clientY);
                const unitId = entities.getUnitAt(worldPos.x, worldPos.y);
                if (unitId !== null && entities.owner[unitId] === gameState.myCountryId) {
                    const sel = gameState._selectedUnits;
                    const idx = sel.indexOf(unitId);
                    if (idx >= 0) sel.splice(idx, 1);
                    else sel.push(unitId);
                }
            }
        });
        canvas.addEventListener('mousemove', (e) => {
            if (!shiftDragging) return;
            // Режим найма/стройки — ставим клетки кистью
            if (window._recruitMode || window._pendingBuild) {
                const worldPos = renderer.screenToWorld(e.clientX, e.clientY);
                const cellOwner = world.getCell(worldPos.x, worldPos.y);
                if (cellOwner === gameState.myCountryId) {
                    if (window._recruitMode) {
                        production.enqueueTraining(worldPos.x, worldPos.y, window._recruitMode);
                    } else if (window._pendingBuild) {
                        production.enqueueBuilding(worldPos.x, worldPos.y, window._pendingBuild);
                    }
                }
                return;
            }
            // Обычный режим — выделяем юниты кистью
            const worldPos = renderer.screenToWorld(e.clientX, e.clientY);
            const unitId = entities.getUnitAt(worldPos.x, worldPos.y);
            if (unitId !== null && entities.owner[unitId] === gameState.myCountryId) {
                const sel = gameState._selectedUnits;
                if (sel.indexOf(unitId) === -1) sel.push(unitId);
            }
        });
        canvas.addEventListener('mouseup', () => {
            shiftDragging = false;
            if (gameState._selectedUnits.length > 0) {
                document.getElementById('order-hint').innerHTML = '🎖️ Выделено: ' + gameState._selectedUnits.length + ' юнитов (Создать армию в КОМАНДУЮЩИЕ)';
                document.getElementById('order-hint').classList.remove('hidden');
            }
        });

        // ===== МОБИЛЬНОЕ УПРАВЛЕНИЕ =====
        let touchStartX = 0, touchStartY = 0;
        let touchStartTime = 0;
        let isTouchDragging = false;
        let lastPinchDist = 0;
        let touchMoved = false;
        let fullscreenRequested = false;
        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth < 768;

        // Авто-полноэкранный режим на мобильных при первом тапе
        function requestFullscreen() {
            if (fullscreenRequested) return;
            fullscreenRequested = true;
            const el = document.documentElement;
            if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
            else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen().catch(() => {});
            else if (el.msRequestFullscreen) el.msRequestFullscreen().catch(() => {});
        }

        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            // Запрашиваем полноэкранный режим при первом тапе
            if (isMobile) requestFullscreen();
            if (e.touches.length === 1) {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
                touchStartTime = Date.now();
                isTouchDragging = true;
                touchMoved = false;
            } else if (e.touches.length === 2) {
                // Пинч-зум
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                lastPinchDist = Math.sqrt(dx * dx + dy * dy);
            }
        }, { passive: false });

        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (e.touches.length === 1 && isTouchDragging) {
                const dx = e.touches[0].clientX - touchStartX;
                const dy = e.touches[0].clientY - touchStartY;

                if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
                    touchMoved = true;
                }

                // Двигаем камеру
                renderer.camera.x -= dx / renderer.camera.zoom;
                renderer.camera.y -= dy / renderer.camera.zoom;
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
                needsRender = true;
            } else if (e.touches.length === 2) {
                // Пинч-зум
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (lastPinchDist > 0) {
                    const scale = dist / lastPinchDist;
                    const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                    const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
                    // Пальцы врозь → зум больше, пальцы вместе → зум меньше
                    const newZoom = renderer.camera.zoom * scale;
                    renderer.camera.zoom = Math.min(Math.max(newZoom, 0.15), 3);
                    needsRender = true;
                }
                lastPinchDist = dist;
                needsRender = true;
            }
        }, { passive: false });

        canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (e.touches.length === 0) {
                // Тап — обрабатываем как клик или долгое нажатие
                if (!touchMoved && Date.now() - touchStartTime < 300) {
                    // Короткий тап = клик
                    const fakeEvent = {
                        clientX: touchStartX,
                        clientY: touchStartY,
                        shiftKey: false,
                        button: 0
                    };
                    handleCanvasClick(fakeEvent);
                } else if (touchMoved) {
                    // Свайп — ничего (камера уже двигалась)
                }
                // Долгое нажатие (>500мс) = контекстное меню
                if (!touchMoved && Date.now() - touchStartTime >= 500) {
                    const fakeEvent = {
                        clientX: touchStartX,
                        clientY: touchStartY,
                        preventDefault: () => {}
                    };
                    handleCanvasRightClick(fakeEvent);
                }
                isTouchDragging = false;
                lastPinchDist = 0;
            }
        }, { passive: false });
    }
    
    // Клавиши
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    // Глобальные функции для вызова из HTML
    window.recruitUnit = (type) => {
        uiManager.closeWindow();
        window._recruitMode = type;
        const hint = document.getElementById('recruit-hint');
        if (hint) {
            const costs = { infantry: '100 снаряж. / 1000 манмощи / 30 дней', tank: '800 снаряж. / 500 манмощи / 60 дней' };
            hint.innerHTML = `🪖 Выберите клетку (${costs[type] || type}) — ЛКМ | Shift+ЛКМ — несколько`;
            hint.classList.remove('hidden');
        }
        addNotification(`Выберите провинцию для обучения ${type}`, 'info');
        setTimeout(() => {
            if (hint) hint.classList.add('hidden');
            window._recruitMode = null;
        }, 20000);
    };

    window.selectBuildType = (type) => {
        uiManager.closeWindow();
        window._pendingBuild = type;
        const hint = document.getElementById('build-hint');
        if (hint) {
            const costs = { factory: '500 снаряж. / 90 дней', port: '300 снаряж. / 60 дней' };
            hint.innerHTML = `🏗️ Выберите клетку (${costs[type] || type}) — ЛКМ | Shift+ЛКМ — несколько`;
            hint.classList.remove('hidden');
        }
        addNotification(`Выберите провинцию для строительства`, 'info');
        setTimeout(() => {
            if (hint) hint.classList.add('hidden');
            window._pendingBuild = null;
        }, 20000);
    };

    window.selectUnitForMove = (unitId) => {
        gameState.selectedUnitId = unitId;
        uiManager.closeWindow();
        const hint = document.getElementById('order-hint');
        if (hint) {
            hint.innerHTML = '⚔️ Выбран юнит — ЛКМ куда идти, ПКМ отмена';
            hint.classList.remove('hidden');
        }
        addNotification(`Юнит выбран — ЛКМ для указания цели`, 'info');
        setTimeout(() => {
            if (hint) hint.classList.add('hidden');
        }, 15000);
    };

    window.startResearch = (techId) => {
        tech.startResearch(gameState.myCountryId, techId);
        uiManager.openWindow('research');
    };
    
    window.startFocus = (focusId) => {
        focus.startFocus(focusId);
        uiManager.openWindow('focus');
    };
    
    window.declareWarOn = (id) => {
        diplomacy.declareWar(id);
        uiManager.openWindow('diplomacy');
    };

    window.justifyWar = (id) => {
        diplomacy.startJustification(id);
        uiManager.openWindow('diplomacy');
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

    // Призыв к оружию — показать врагов союзника для выбора
    window.callToArms = (allyId) => {
        var enemyList = [];
        if (gameState.wars) {
            for (var w = 0; w < gameState.wars.length; w++) {
                var war = gameState.wars[w];
                if (war.a === allyId) enemyList.push(war.b);
                if (war.b === allyId) enemyList.push(war.a);
            }
        }
        if (enemyList.length === 0) {
            addNotification('🤝 ' + allyId.toUpperCase() + ' не воюет', 'info');
            return;
        }
        if (enemyList.length === 1) {
            // Один враг — сразу объявляем войну
            diplomacy.declareWarForced(enemyList[0]);
            addNotification('⚔️ Вы вступили в войну по призыву ' + allyId.toUpperCase(), 'war');
            uiManager.openWindow('diplomacy');
            return;
        }
        // Несколько врагов — показываем окно выбора
        var content = document.getElementById('window-content');
        var html = '<div style="padding:16px;">';
        html += '<div style="text-align:center;margin-bottom:16px;"><div style="font-size:24px;margin-bottom:8px;">⚔️</div>';
        html += '<div style="font-size:14px;font-weight:bold;color:#eab308;">Призыв к оружию от ' + allyId.toUpperCase() + '</div>';
        html += '<div style="font-size:11px;color:#9ca3af;margin-top:4px;">Выберите против кого объявить войну:</div></div>';
        for (var i = 0; i < enemyList.length; i++) {
            var eName = (window._COUNTRIES_MAP && window._COUNTRIES_MAP[enemyList[i]]) ? window._COUNTRIES_MAP[enemyList[i]].name : enemyList[i].toUpperCase();
            html += '<button onclick="diplomacy.declareWarForced(\'' + enemyList[i] + '\');document.getElementById(\'info-window\').classList.add(\'hidden\');addNotification(\'⚔️ Вы вступили в войну!\',\'war\');uiManager.openWindow(\'diplomacy\')" style="width:100%;padding:10px;background:#991b1b;color:white;border:2px solid #ef4444;border-radius:6px;margin-bottom:6px;cursor:pointer;text-align:left;">';
            html += '<div style="font-size:12px;font-weight:bold;">⚔️ Объявить войну ' + eName.toUpperCase() + '</div></button>';
        }
        html += '<button onclick="document.getElementById(\'info-window\').classList.add(\'hidden\')" style="width:100%;padding:8px;background:#374151;color:white;border:1px solid #4b5563;border-radius:6px;margin-top:8px;cursor:pointer;">Отказаться</button>';
        html += '</div>';
        content.innerHTML = html;
        document.getElementById('window-title').innerText = '⚔️ ПРИЗЫВ К ОРУЖИЮ';
        document.getElementById('info-window').classList.remove('hidden');
    };

    window.releaseVassal = (vassalId) => {
        gameState.removeVassal(gameState.myCountryId, vassalId);
        addNotification('👑 ' + vassalId.toUpperCase() + ' освобождён', 'info');
        uiManager.openWindow('diplomacy');
    };

    window.startIdeologyChange = (targetIdeology) => {
        var currentIdeology = (window._COUNTRIES_MAP && window._COUNTRIES_MAP[gameState.myCountryId]) ? window._COUNTRIES_MAP[gameState.myCountryId].ideology : 'Нейтралитет';
        var days = 200;
        if (currentIdeology === 'Нейтралитет' || targetIdeology === 'Нейтралитет') days = 150;
        if (currentIdeology === targetIdeology) return;
        gameState.ideologyChange = { target: targetIdeology, daysLeft: days, totalDays: days };
        addNotification('⚡ Смена идеологии на ' + targetIdeology + ' (' + days + ' дней)', 'info');
        uiManager.openWindow('diplomacy');
    };

    window.cancelIdeologyChange = () => {
        gameState.ideologyChange = null;
        addNotification('⚡ Смена идеологии отменена', 'info');
        uiManager.openWindow('diplomacy');
    };

    window.applyIdeologyChange = (newIdeology) => {
        var myId = gameState.myCountryId;
        if (window._COUNTRIES_MAP && window._COUNTRIES_MAP[myId]) {
            window._COUNTRIES_MAP[myId].ideology = newIdeology;
            var c = window._COUNTRIES_MAP[myId];
            if (c.ideologies && c.ideologies[newIdeology]) {
                var data = c.ideologies[newIdeology];
                if (data.name) c.name = data.name;
                if (data.leader) c.leader = data.leader;
                if (data.color) c.color = data.color;
            }
        }
        gameState.ideologyChange = null;
        if (renderer) renderer._polygonCache = null;
        addNotification('⚡ Идеология изменена на ' + newIdeology + '!', 'war');
        if (topBar) topBar.update();
        uiManager.openWindow('diplomacy');
    };

    window.capitulationChoice = (choice) => {
        var data = window._capitulationData;
        if (!data) return;
        var enemyId = data.enemyId;
        var winnerId = data.winnerId;
        var cells = data.cells;
        var countryName = (COUNTRIES[enemyId] ? COUNTRIES[enemyId].name : enemyId).toUpperCase();

        if (choice === 'annex') {
            // Аннексируем только оригинальные клетки врага (не захваченные у других)
            var origCells = gameState.warOriginalCells ? gameState.warOriginalCells[enemyId] : null;
            var cellsToAnnex = origCells || cells;
            for (var ci = 0; ci < cellsToAnnex.length; ci++) {
                var parts = cellsToAnnex[ci].split(',');
                var cx = parseInt(parts[0]), cy = parseInt(parts[1]);
                if (world.getCell(cx, cy) === enemyId) {
                    world.setCell(cx, cy, winnerId);
                }
            }
            // Клетки захваченные у других — возвращаем владельцу
            if (origCells) {
                var origSet = new Set(origCells);
                for (var ci = 0; ci < cells.length; ci++) {
                    var parts = cells[ci].split(',');
                    var cx = parseInt(parts[0]), cy = parseInt(parts[1]);
                    if (!origSet.has(cells[ci]) && world.getCell(cx, cy) === enemyId) {
                        // Эта клетка захвачена у кого-то — возвращаем оригинальному владельцу
                        // Ищем кому принадлежала клетка до захвата
                        world.setCell(cx, cy, 0);
                    }
                }
            }
            var enemyUnits = entities.getEntitiesByOwner(enemyId);
            for (var ui = 0; ui < enemyUnits.length; ui++) {
                entities.removeEntity(enemyUnits[ui]);
            }
            delete world.capitals[enemyId];
            addNotification('🏴 ' + countryName + ' аннексирован!', 'war');
        } else if (choice === 'vassal') {
            // Возвращаем вассалу его оригинальные территории
            var originalCells = gameState.warOriginalCells ? gameState.warOriginalCells[enemyId] : null;
            if (originalCells) {
                for (var ci = 0; ci < cells.length; ci++) {
                    var parts = cells[ci].split(',');
                    var cx = parseInt(parts[0]), cy = parseInt(parts[1]);
                    if (world.getCell(cx, cy) === winnerId) {
                        world.setCell(cx, cy, enemyId);
                    }
                }
                // Восстанавливаем клетки которые были у врага но захвачены другими
                for (var ci = 0; ci < originalCells.length; ci++) {
                    var parts = originalCells[ci].split(',');
                    var cx = parseInt(parts[0]), cy = parseInt(parts[1]);
                    if (world.getCell(cx, cy) !== enemyId) {
                        world.setCell(cx, cy, enemyId);
                    }
                }
                addNotification('🔄 ' + countryName + ' получает свои территории обратно', 'info');
            }
            gameState.addVassal(winnerId, enemyId);
            gameState.addAlliance(winnerId, enemyId);
            addNotification('👑 ' + countryName + ' стал вассалом!', 'war');
        } else if (choice === 'release') {
            addNotification('🕊️ ' + countryName + ' освобождён', 'info');
        }

        window._capitulationData = null;
        window._capitulationPending = false;
        document.getElementById('info-window').classList.add('hidden');
        gameState.isGameActive = true;
    };
    
    window.quickSave = () => {
        saveGame();
        addNotification('💾 Файл .hrl скачан!', 'info');
    };

    window.quickLoad = () => {
        loadGame();
    };

    window.saveToSlot = window.quickSave;
    window.loadFromSlot = window.quickLoad;

    window.toggleAutosave = () => {
        gameState.autosave = gameState.autosave === false ? true : false;
        addNotification('💾 Автосохранение: ' + (gameState.autosave !== false ? 'включено' : 'выключено'), 'info');
        uiManager.openWindow('save');
    };
    
    window.createArmy = () => {
        if (!armyManager) return;
        const selected = gameState._selectedUnits || [];
        if (selected.length < 2) {
            addNotification('Выделите минимум 2 юнита (ПКМ для выбора)', 'war');
            return;
        }
        armyManager.createArmy(selected);
        gameState._selectedUnits = [];
        gameState.selectedUnitId = null;
        updateArmyPanel();
    };

    window.disbandArmy = (armyId) => {
        if (armyManager) armyManager.disbandArmy(armyId);
    };

    window.setArmyFrontLine = (armyId) => {
        if (!armyManager) return;
        addNotification('Выберите вражескую клетку на карте', 'info');
        window._frontLineArmyId = armyId;
        setTimeout(function() { window._frontLineArmyId = null; }, 15000);
    };

    window.selectArmy = (armyId) => {
        if (!armyManager) return;
        if (gameState._selectedArmyId === armyId) {
            gameState._selectedArmyId = null;
        } else {
            gameState._selectedArmyId = armyId;
        }
        gameState.selectedUnitId = null;
        updateArmyPanel();
    };

    // Множественный выбор юнитов ПКМ
    window._selectedUnits = [];
    gameState._selectedUnits = [];
    gameState._selectedArmyId = null;
}

// ── ТУТОР ─────────────────────────────────────────────────────────────

var TUTORIAL_STEPS = [
    { icon: '🎮', title: 'Добро пожаловать в Heirloom!', text: 'Стратегия в стиле Hearts of Iron. Управляйте страной, воюйте, стройте армию и меняйте ход истории!' },
    { icon: '🗺️', title: 'Навигация по карте', text: '<b>WASD</b> или зажатая ЛКМ — движение камеры.<br><b>Колёсико мыши</b> — приближение/отдаление.<br><b>Пробел</b> — пауза/продолжить.' },
    { icon: '🏗️', title: 'Строительство', text: 'Откройте вкладку <b>СТРОЙКА</b> и выберите тип постройки.<br>Затем кликните по клетке вашей территории на карте.<br><b>🏭 Заводы</b> — дают снаряжение. <b>⚓ Порты</b> — для флота.' },
    { icon: '🎖️', title: 'Набор войск', text: 'Откройте <b>АРМИЯ</b> → нажмите <b>➕ ПЕХОТА</b> или <b>➕ ТАНК</b>.<br>Затем кликните по своей клетке — юнит появится там.<br>Юниты автоматически сражаются при встрече с врагом.' },
    { icon: '⭐', title: 'Национальные фокусы', text: 'Вкладка <b>ФОКУСЫ</b> — дерево развития страны.<br>Кликните по доступному фокусу чтобы начать изучение.<br>Фокусы дают бонусы: заводы, войска, союзы.' },
    { icon: '🤝', title: 'Дипломатия', text: 'Вкладка <b>ДИПЛОМАТИЯ</b>:<br>🤝 <b>Союзники</b> —在一起 воюют.<br>⚔️ <b>Враги</b> — прогресс капитуляции.<br>⚡ <b>Идеология</b> — смена политического строя.' },
    { icon: '🎖️', title: 'Армии', text: '<b>ПКМ</b> по юнитам — выделение.<br><b>Создать армию</b> — объединяет юниты.<br><b>Shift+клик</b> на юните армии — выделить для приказа.<br><b>🎯 Граница</b> — автоматическая оборона/атака.' },
    { icon: '⚔️', title: 'Готово к завоеванию!', text: 'Объявите войну через дипломатию и захватывайте территории.<br>Когда враг потеряет достаточно клеток — он капитулирует.<br>Выберите: аннексировать, сделать вассалом или освободить.<br><br>Удачи, фюрер! 🎮' },
];

var tutorialStep = 0;

function startTutorial() {
    tutorialStep = 0;
    var overlay = document.getElementById('tutorial-overlay');
    if (!overlay) return;
    overlay.classList.remove('hidden');
    showTutorialStep();
    document.getElementById('tutorial-next').onclick = nextTutorialStep;
    document.getElementById('tutorial-skip').onclick = closeTutorial;
}

function showTutorialStep() {
    var step = TUTORIAL_STEPS[tutorialStep];
    if (!step) { closeTutorial(); return; }
    document.getElementById('tutorial-icon').textContent = step.icon;
    document.getElementById('tutorial-title').textContent = step.title;
    document.getElementById('tutorial-text').innerHTML = step.text;
    document.getElementById('tutorial-step').textContent = 'Шаг ' + (tutorialStep + 1) + ' / ' + TUTORIAL_STEPS.length;
    var btn = document.getElementById('tutorial-next');
    btn.textContent = tutorialStep === TUTORIAL_STEPS.length - 1 ? 'Начать игру! 🎮' : 'Далее →';
}

function nextTutorialStep() {
    tutorialStep++;
    if (tutorialStep >= TUTORIAL_STEPS.length) {
        closeTutorial();
    } else {
        showTutorialStep();
    }
}

function closeTutorial() {
    var overlay = document.getElementById('tutorial-overlay');
    if (overlay) overlay.classList.add('hidden');
    localStorage.setItem('heirloom_tutorial_done', '1');
}

function showArmyCommandPanel(army, screenX, screenY) {
    var panel = document.getElementById('army-command-panel');
    if (!panel) return;

    var frontLineText = army.frontLine ? 'Отвязать от ' + army.frontLine.enemyId.toUpperCase() : 'На границу...';
    var frontLineAction = army.frontLine ? 'window.removeArmyFrontLine(' + army.id + ')' : 'window.setArmyFrontLine(' + army.id + ')';

    var html = '';
    html += '<div style="font-size:12px;font-weight:bold;color:' + army.color + ';margin-bottom:8px;">🎖️ ' + army.name + '</div>';
    html += '<div style="font-size:10px;color:#9ca3af;margin-bottom:8px;">Юнитов: ' + army.unitIds.size + '</div>';
    html += '<button onclick="' + frontLineAction + ';window.hideArmyCommandPanel()" style="width:100%;padding:8px;background:#854d0e;color:white;border:none;border-radius:4px;margin-bottom:4px;cursor:pointer;font-size:11px;text-align:left;">🎯 ' + frontLineText + '</button>';
    html += '<button onclick="window.giveArmyMoveOrder(' + army.id + ');window.hideArmyCommandPanel()" style="width:100%;padding:8px;background:#1d4ed8;color:white;border:none;border-radius:4px;margin-bottom:4px;cursor:pointer;font-size:11px;text-align:left;">🚶 Переместить армию</button>';
    html += '<button onclick="window.disbandArmy(' + army.id + ');window.hideArmyCommandPanel()" style="width:100%;padding:8px;background:#991b1b;color:white;border:none;border-radius:4px;cursor:pointer;font-size:11px;text-align:left;">🗑️ Распустить</button>';

    panel.innerHTML = html;
    panel.style.left = Math.min(screenX + 10, window.innerWidth - 200) + 'px';
    panel.style.top = Math.max(screenY - 120, 10) + 'px';
    panel.classList.remove('hidden');
}

window.hideArmyCommandPanel = function() {
    var panel = document.getElementById('army-command-panel');
    if (panel) panel.classList.add('hidden');
};

window.removeArmyFrontLine = function(armyId) {
    if (!armyManager) return;
    var army = armyManager.armies.find(function(a) { return a.id === armyId; });
    if (army) {
        army.frontLine = null;
        addNotification('🎖️ ' + army.name + ' отвязана от границы', 'info');
    }
};

window.giveArmyMoveOrder = function(armyId) {
    gameState._selectedArmyId = armyId;
    addNotification('Кликните на карту — куда переместить армию', 'info');
};

function handleCanvasClick(e) {
    if (!gameState.isGameActive) return;

    const worldPos = renderer.screenToWorld(e.clientX, e.clientY);
    const cellOwner = world.getCell(worldPos.x, worldPos.y);

    // Клик по юниту армии
    const clickUnit = entities.getUnitAt(worldPos.x, worldPos.y);
    if (clickUnit !== null && entities.owner[clickUnit] === gameState.myCountryId) {
        const army = armyManager ? armyManager.getArmyForUnit(clickUnit) : null;
        if (army) {
            if (e.shiftKey) {
                // Shift+клик — выделить армию для приказа
                gameState._selectedArmyId = army.id;
                gameState.selectedUnitId = null;
                document.getElementById('order-hint').innerHTML = '🎖️ Армия выбрана — ЛКМ куда переместить';
                document.getElementById('order-hint').classList.remove('hidden');
                updateArmyPanel();
            } else {
                // Обычный клик — панель приказов
                showArmyCommandPanel(army, e.clientX, e.clientY);
            }
            return;
        }
    }

    // Клик по одиночному юниту — выделить для приказа
    if (clickUnit !== null && entities.owner[clickUnit] === gameState.myCountryId) {
        gameState.selectedUnitId = clickUnit;
        const hint = document.getElementById('order-hint');
        if (hint) {
            hint.innerHTML = '⚔️ Юнит выбран — ЛКМ куда идти, ПКМ отмена';
            hint.classList.remove('hidden');
        }
        return;
    }

    window.hideArmyCommandPanel();

    // Режим найма
    if (window._recruitMode) {
        if (cellOwner === gameState.myCountryId) {
            production.enqueueTraining(worldPos.x, worldPos.y, window._recruitMode);
        }
        // Без Shift — выходим из режима
        if (!e.shiftKey) {
            window._recruitMode = null;
            document.getElementById('recruit-hint')?.classList.add('hidden');
        }
        return;
    }

    // Режим привязки армии к границе
    if (window._frontLineArmyId && cellOwner && cellOwner !== gameState.myCountryId && !gameState.areAllies(gameState.myCountryId, cellOwner)) {
        armyManager.setFrontLine(window._frontLineArmyId, cellOwner, movement);
        window._frontLineArmyId = null;
        return;
    }

    // Режим строительства
    if (window._pendingBuild) {
        if (cellOwner === gameState.myCountryId) {
            production.enqueueBuilding(worldPos.x, worldPos.y, window._pendingBuild);
        }
        if (!e.shiftKey) {
            window._pendingBuild = null;
            document.getElementById('build-hint')?.classList.add('hidden');
        }
        return;
    }

    // Есть выбранная армия → приказ всей армии
    if (gameState._selectedArmyId && armyManager) {
        const army = armyManager.armies.find(a => a.id === gameState._selectedArmyId);
        if (army) {
            armyManager.giveArmyOrder(army.id, worldPos.x, worldPos.y, movement);
        }
        gameState._selectedArmyId = null;
        document.getElementById('order-hint')?.classList.add('hidden');
        updateArmyPanel();
        return;
    }

    // Есть выбранный юнит → ЛКМ по карте = приказ на движение / атаку
    if (gameState.selectedUnitId !== null) {
        const unitId = gameState.selectedUnitId;

        // Клик по воде — морской десант или выход в море
        const isWater = world.isWater(worldPos.x, worldPos.y);
        if (isWater) {
            movement.giveOrder(unitId, worldPos.x, worldPos.y);
        } else if (cellOwner !== 0 && gameState.isAtWar(gameState.myCountryId, cellOwner)) {
            movement.giveOrder(unitId, worldPos.x, worldPos.y);
        } else if (cellOwner === gameState.myCountryId
            || (gameState.areAllies && gameState.areAllies(gameState.myCountryId, cellOwner))) {
            movement.giveOrder(unitId, worldPos.x, worldPos.y);
        } else {
            addNotification('Нельзя идти туда!', 'war');
        }

        gameState.selectedUnitId = null;
        gameState._selectedUnits = [];
        gameState._selectedArmyId = null;
        document.getElementById('order-hint')?.classList.add('hidden');
        return;
    }

    // Клик по клетке без выбранного юнита — показываем информацию о стране
    if (cellOwner !== 0) {
        uiManager.showCountryInfo(cellOwner, { x: worldPos.x, y: worldPos.y });
    }
}

function handleCanvasRightClick(e) {
    e.preventDefault();
    if (!gameState.isGameActive) return;

    // Отменяем режимы
    if (window._recruitMode || window._pendingBuild) {
        window._recruitMode = null;
        window._pendingBuild = null;
        document.getElementById('recruit-hint')?.classList.add('hidden');
        document.getElementById('build-hint')?.classList.add('hidden');
        return;
    }

    // ПКМ по пустому месту — очистить выбор
    const worldPos = renderer.screenToWorld(e.clientX, e.clientY);
    const unitId = entities.getUnitAt(worldPos.x, worldPos.y);

    if (unitId === null || entities.owner[unitId] !== gameState.myCountryId) {
        gameState.selectedUnitId = null;
        gameState._selectedUnits = [];
        gameState._selectedArmyId = null;
        document.getElementById('order-hint')?.classList.add('hidden');
        return;
    }

    // ПКМ по юниту — добавить/убрать из множественного выбора
    const sel = gameState._selectedUnits;
    const idx = sel.indexOf(unitId);
    if (idx >= 0) {
        sel.splice(idx, 1);
    } else {
        sel.push(unitId);
    }

    if (sel.length === 1) {
        gameState.selectedUnitId = sel[0];
    } else {
        gameState.selectedUnitId = null;
    }

    if (sel.length > 0) {
        addNotification(`Выбрано: ${sel.length} юнитов (Откройте АРМИИ → Создать)`, 'info');
    }
}

function handleCanvasWheel(e) {
    e.preventDefault();
    renderer.zoom(e.deltaY, e.clientX, e.clientY);
}

function handleKeyDown(e) {
    if (!gameState.isGameActive) return;
    
    if (e.code === 'Space') {
        e.preventDefault();
        const newSpeed = gameState.gameSpeed === 0 ? 1 : 0;
        gameState.setGameSpeed(newSpeed);
        updateSpeedButtons(newSpeed);
    }
    
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
    
    if (moved) e.preventDefault();
}

function handleKeyUp(e) {}

function startGameLoop() {
    if (animationFrameId) return;
    
    let lastTick = performance.now();
    let accumulator = 0;
    const TICK_DURATION = 1000 / 60;
    let dayAccumulator = 0;
    const BASE_DAY_MS = 3000;
    const SPEED_MULTIPLIERS = { 1: 1.0, 2: 2.5, 3: 6.0, 4: 15.0, 5: 40.0 };
    let lastRenderTime = 0;
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth < 768;
    const MIN_RENDER_INTERVAL = isMobile ? 1000 / 15 : 1000 / 30;

    // Помечаем необходимость рендера при движении камеры
    window.addEventListener('keydown', () => { needsRender = true; });
    window.addEventListener('mousemove', () => { needsRender = true; });
    window.addEventListener('mousedown', () => { needsRender = true; });
    window.addEventListener('wheel', () => { needsRender = true; });

    function loop(now) {
        let delta = Math.min(100, now - lastTick);
        lastTick = now;
        accumulator += delta;
        dayAccumulator += delta;

        while (accumulator >= TICK_DURATION) {
            if (gameState.isGameActive) updateGame();
            accumulator -= TICK_DURATION;
        }

        if (dayAccumulator >= BASE_DAY_MS / (SPEED_MULTIPLIERS[gameState.gameSpeed] || 1) && gameState.gameSpeed > 0 && gameState.isGameActive) {
            dayAccumulator = 0;
            gameState.advanceDay();

            if (economy) economy.update();
            if (production) production.update();
            if (supply) supply.update();
            if (combat) combat.update();
            if (movement) movement.update();
            if (armyManager) armyManager.update();
            if (armyManager) armyManager.updateFrontLines(movement);
            if (aiController) aiController.update();
            if (tech) tech.update();
            if (focus) focus.update();

            // Прогресс смены идеологии
            if (gameState.ideologyChange) {
                gameState.ideologyChange.daysLeft--;
                if (gameState.ideologyChange.daysLeft <= 0) {
                    window.applyIdeologyChange(gameState.ideologyChange.target);
                }
            }

            // Прогресс обоснования войны
            if (gameState.justifications) {
                gameState.justifications.daysLeft--;
                if (gameState.justifications.daysLeft <= 0) {
                    var jTarget = gameState.justifications.target;
                    addNotification('📜 Обоснование войны против ' + jTarget.toUpperCase() + ' завершено!', 'info');
                    gameState.justifications.daysLeft = 0;
                }
            }

            // Проверка капитуляции
            if (gameState.wars.length > 0) {
                gameState.updateWarSnapshots(world);
                var warsToRemove = [];
                for (var wi = 0; wi < gameState.wars.length; wi++) {
                    var war = gameState.wars[wi];
                    var checkCapitulate = function(enemyId, winnerId) {
                        if (!enemyId || world.getCountryCells(enemyId).size === 0) return;
                        var countryInfo = COUNTRIES[enemyId];
                        if (!countryInfo) return;
                        var threshold = gameState.getCapitulationThreshold(countryInfo.ideology);
                        var progress = gameState.getWarProgress(enemyId, world);
                        if (gameState.days % 30 === 0) console.log('[Cap] ' + enemyId + ': ' + progress + '%/' + threshold + '% start=' + gameState.warStartCells[enemyId] + ' cur=' + world.getCountryCells(enemyId).size);
                        if (progress >= threshold && !window._capitulationPending) {
                            var cells = Array.from(world.getCountryCells(enemyId));
                            // Если это игрок — показываем окно выбора
                            if (winnerId === gameState.myCountryId) {
                                window._capitulationPending = true;
                                gameState.isGameActive = false;
                                windowsManager.renderCapitulationWindow(
                                    document.getElementById('window-content'),
                                    { enemyId: enemyId, winnerId: winnerId, cells: cells }
                                );
                                document.getElementById('info-window').classList.remove('hidden');
                                document.getElementById('window-title').innerText = '🏳️ КАПИТУЛЯЦИЯ';
                            } else {
                                // AI автоматически делает вассалом
                                addNotification('🏳️ ' + enemyId.toUpperCase() + ' капитулировал!', 'war');
                                gameState.addVassal(winnerId, enemyId);
                                gameState.addAlliance(winnerId, enemyId);
                                // Убираем лишние войска врага (оставляем минимум 3)
                                var enemyU = entities.getEntitiesByOwner(enemyId);
                                for (var eu = enemyU.length - 1; eu >= 3; eu--) {
                                    entities.removeEntity(enemyU[eu]);
                                }
                            }
                            warsToRemove.push(wi);
                        }
                    };
                    if (gameState.myCountryId) {
                        if (war.a === gameState.myCountryId) checkCapitulate(war.b, war.a);
                        if (war.b === gameState.myCountryId) checkCapitulate(war.a, war.b);
                    }
                }
                for (var ri = warsToRemove.length - 1; ri >= 0; ri--) {
                    gameState.wars.splice(warsToRemove[ri], 1);
                }
            }

            // Проверка приглашений в войну
            if (gameState.warInvitations && gameState.warInvitations.length > 0 && !window._capitulationPending) {
                var inv = gameState.warInvitations.shift();
                if (inv && !gameState.isAtWar(gameState.myCountryId, inv.enemy)) {
                    var fromName = (COUNTRIES[inv.from] ? COUNTRIES[inv.from].name : inv.from).toUpperCase();
                    var enemyName = (COUNTRIES[inv.enemy] ? COUNTRIES[inv.enemy].name : inv.enemy).toUpperCase();
                    gameState.isGameActive = false;
                    var content = document.getElementById('window-content');
                    var html = '<div style="padding:16px;">';
                    html += '<div style="text-align:center;margin-bottom:16px;"><div style="font-size:24px;margin-bottom:8px;">📢</div>';
                    html += '<div style="font-size:14px;font-weight:bold;color:#eab308;">' + fromName + ' просит о помощи!</div>';
                    html += '<div style="font-size:11px;color:#9ca3af;margin-top:4px;">Объявить войну ' + enemyName + '?</div></div>';
                    html += '<button onclick="gameState.addWar(gameState.myCountryId,\'' + inv.enemy + '\',world);gameState.isGameActive=true;document.getElementById(\'info-window\').classList.add(\'hidden\');addNotification(\'⚔️ Вы вступили в войну!\',\'war\')" style="width:100%;padding:12px;background:#991b1b;color:white;border:2px solid #ef4444;border-radius:8px;margin-bottom:8px;cursor:pointer;font-weight:bold;font-size:13px;">⚔️ ВСТУПИТЬ В ВОЙНУ</button>';
                    html += '<button onclick="gameState.isGameActive=true;document.getElementById(\'info-window\').classList.add(\'hidden\')" style="width:100%;padding:10px;background:#374151;color:white;border:1px solid #4b5563;border-radius:8px;cursor:pointer;">ОТКАЗАТЬСЯ</button>';
                    html += '</div>';
                    content.innerHTML = html;
                    document.getElementById('window-title').innerText = '📢 ПРИГЛАШЕНИЕ В ВОЙНУ';
                    document.getElementById('info-window').classList.remove('hidden');
                }
            }

            if (topBar) topBar.update();

            needsRender = true;

            if (gameState.days % 30 === 0 && gameState.days > 0 && gameState.autosave !== false) {
                // Автосохранение — тихое скачивание
                const saveData = {
                    version: '5.0',
                    timestamp: Date.now(),
                    world: world.serialize(),
                    entities: entities.serialize(),
                    gameState: gameState.serialize()
                };
                const blob = new Blob([JSON.stringify(saveData)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `autosave_${gameState.days}.hrl`;
                a.click();
                URL.revokeObjectURL(url);
            }
        }

        // Рендер: только если нужно и прошёл минимальный интервал
        if (needsRender && gameState.isGameActive && renderer) {
            if (now - lastRenderTime >= MIN_RENDER_INTERVAL) {
                renderer.render(world, entities, gameState, production);
                lastRenderTime = now;
                needsRender = false;
            }
        }

        animationFrameId = requestAnimationFrame(loop);
    }

    animationFrameId = requestAnimationFrame(loop);
}

function updateGame() {
    // Движение обрабатывается только в дневном тике (movement.update)
    // Здесь только рендер обновляется каждый кадр
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

function updateArmyPanel() {
    if (!armyManager || !gameState.myCountryId) return;
    const armies = armyManager.getArmiesForCountry(gameState.myCountryId);
    const cards = document.getElementById('army-cards');
    const countEl = document.getElementById('army-count');
    if (!cards) return;

    countEl.textContent = `${armies.length} армий`;

    let html = '';
    for (const army of armies) {
        const isSelected = gameState._selectedArmyId === army.id;
        const unitCount = [...army.unitIds].filter(id => entities.active[id]).length;
        html += `
            <div class="army-card ${isSelected ? 'selected' : ''}" onclick="window.selectArmy(${army.id})" style="border-color:${army.color}">
                <div class="army-card-color" style="background:${army.color}"></div>
                <div class="army-card-info">
                    <div class="army-card-name">${army.name}</div>
                    <div class="army-card-count">${unitCount} юнитов</div>
                </div>
                <button class="army-card-disband" onclick="event.stopPropagation(); window.disbandArmy(${army.id})" title="Распустить">✕</button>
            </div>
        `;
    }
    cards.innerHTML = html;
}

// Кнопка создания армии
document.getElementById('btn-create-army')?.addEventListener('click', () => {
    window.createArmy();
});

// Обновляем панель армий каждые 2 секунды
setInterval(updateArmyPanel, 2000);

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
                <div class="flex items-center gap-2">
                    <img src="assets/flags/${c.id}.png" style="width:32px;height:22px;border-radius:3px;" onerror="this.style.display='none'">
                    <div>
                        <div class="font-bold text-lg">${c.id.toUpperCase()}</div>
                        <div class="text-xs opacity-70">${c.size} провинций</div>
                    </div>
                </div>
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
                <div class="flex items-center gap-2">
                    <img src="assets/flags/${c.id}.png" style="width:24px;height:16px;border-radius:2px;" onerror="this.style.display='none'">
                    <div>
                        <div class="font-bold">${c.id.toUpperCase()}</div>
                        <div class="text-xs opacity-50">${c.size} провинций</div>
                    </div>
                </div>
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
    gameState.days = 0;
    gameState.gameDate = new Date(1936, 0, 1);

    // Создаём юниты для игрока
    const cells = Array.from(world.getCountryCells(countryId));
    console.log(`📋 Клетки страны ${countryId}: ${cells.length}`);

    // Начальные людские ресурсы = 1000 на клетку
    gameState.manpower = cells.length * 1000;
    gameState.maxManpower = cells.length * 1000;

    if (cells.length > 0) {
        const sortedCells = cells.sort();
        const capital = sortedCells[0].split(',').map(Number);
        console.log(`🏰 Первая клетка: (${capital[0]}, ${capital[1]})`);

        // Создаём 3 пехотные дивизии
        for (let i = 0; i < 3; i++) {
            const x = capital[0] + (i % 2);
            const y = capital[1] + Math.floor(i / 2);

            if (world.getCell(x, y) === countryId) {
                const unitId = entities.createEntity(countryId, 0, x, y);
                console.log(`✅ Создан юнит ${unitId} в (${x},${y})`);
            }
        }
    }
    
    // Закрываем меню и показываем игру
    document.getElementById('country-select').classList.add('hidden');
    document.getElementById('game-container').classList.remove('hidden');
    document.getElementById('game-tabs').classList.remove('hidden');
    
    updateSpeedButtons(1);
    if (topBar) topBar.update();
    
    addNotification(`🎌 Вы играете за ${countryId.toUpperCase()}`, 'info');
    addNotification(`🖱️ Клик по юниту → ЛКМ по врагу = АТАКА`, 'info');
    addNotification(`⌨️ WASD — камера | Пробел — пауза`, 'info');
    
    if (renderer) renderer.cameraInitialized = false;
    
    // Запускаем игровой цикл ТОЛЬКО ПОСЛЕ выбора страны
    startGameLoop();

    // Тутор при первом запуске
    if (!localStorage.getItem('heirloom_tutorial_done')) {
        startTutorial();
    }
}

function saveGame() {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2);
    const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
    const fileName = `${gameState.myCountryId.toUpperCase()}_${day}.${month}.${year}_${time}.hrl`;

    const saveData = {
        version: '5.0',
        timestamp: Date.now(),
        world: world.serialize(),
        entities: entities.serialize(),
        gameState: gameState.serialize()
    };

    const blob = new Blob([JSON.stringify(saveData)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
}

function loadGame() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.hrl,.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target.result);

                // Проверяем наличие обязательных полей
                if (!data.world || !data.entities || !data.gameState) {
                    addNotification('Ошибка: неверный формат файла', 'war');
                    return;
                }

                world = World.deserialize(data.world);
                world.generateTerrain();
                entities = new EntityManager(50000);
                entities.deserialize(data.entities);
                gameState.deserialize(data.gameState);

                economy = new EconomySystem(world, entities, gameState);
                combat = new CombatSystem(world, entities, gameState);
                movement = new MovementSystem(world, entities, gameState);
                armyManager = new ArmyManager(entities, gameState, world);
                window._armyManager = armyManager;
                supply = new SupplySystem(world, entities, gameState);
                diplomacy = new DiplomacySystem(gameState, world, entities);
                tech = new TechSystem(gameState);
                combat.tech = tech;
                focus = new FocusSystem(gameState, world, entities);

                windowsManager = new WindowsManager(world, entities, gameState, tech, focus);
                uiManager = new UIManager(world, entities, gameState, windowsManager, topBar);

                gameState.isGameActive = true;
                gameState.setGameSpeed(1);

                document.getElementById('country-select').classList.add('hidden');
                document.getElementById('game-container').classList.remove('hidden');
                document.getElementById('game-tabs').classList.remove('hidden');

                if (renderer) renderer.cameraInitialized = false;
                if (!animationFrameId) startGameLoop();
                updateSpeedButtons(1);

                addNotification(`📂 Игра загружена!`, 'info');
            } catch(err) {
                console.error('[LoadError]', err.message, err.stack);
                // Показываем ошибку в окне чтобы можно было прочитать
                var errWin = document.getElementById('info-window');
                var errContent = document.getElementById('window-content');
                var errTitle = document.getElementById('window-title');
                if (errWin && errContent && errTitle) {
                    errTitle.innerText = '❌ ОШИБКА ЗАГРУЗКИ';
                    errContent.innerHTML = '<div style="padding:16px;color:#ef4444;font-family:monospace;font-size:12px;white-space:pre-wrap;word-break:break-all;">' + err.message + '\n\n' + (err.stack || '') + '</div>';
                    errWin.classList.remove('hidden');
                }
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

function showLoadingScreen() {
    const div = document.createElement('div');
    div.id = 'loading-screen';
    div.innerHTML = `
        <div style="position:fixed;inset:0;background:#0a0a0a;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:9999;font-family:'Special Elite',monospace">
            <div style="font-size:48px;margin-bottom:20px;">⚙️</div>
            <div style="font-size:24px;margin-bottom:10px;color:#eab308;letter-spacing:.2em">HEIRLOOM</div>
            <div style="font-size:14px;margin-bottom:30px;color:#888;letter-spacing:.15em">STRATEGY</div>
            <div style="width:300px;height:8px;background:#1f2937;border-radius:4px;overflow:hidden;border:1px solid #374151">
                <div id="loading-bar" style="width:0%;height:100%;background:linear-gradient(90deg,#eab308,#fbbf24);transition:width 0.4s ease"></div>
            </div>
            <div id="loading-text" style="margin-top:16px;font-size:12px;color:#9ca3af;letter-spacing:.1em">ЗАГРУЗКА...</div>
        </div>
    `;
    document.body.appendChild(div);
}

function updateLoadingBar(percent, text) {
    const bar = document.getElementById('loading-bar');
    const label = document.getElementById('loading-text');
    if (bar) bar.style.width = `${percent}%`;
    if (label) label.textContent = text;
}

function hideLoadingScreen() {
    const el = document.getElementById('loading-screen');
    if (el) {
        el.style.opacity = '0';
        el.style.transition = 'opacity 0.5s';
        setTimeout(() => el.remove(), 500);
    }
}

// Запуск
init().catch(console.error);
