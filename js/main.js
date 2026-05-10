import { CONFIG } from './config.js';
import { state, months } from './state.js';
import { initMap, renderMap, getCellData, screenToWorld, updateCamera, calculateCountryStats } from './map.js';
import { getUnitStats, processCombat, isAtWar, areAllies, renderUnits } from './units.js';
import { updateTopBar, updateDate, createAlert, openWindow, closeWindow, showIntel, setSpeed, openFocusTree, updateFocusUI } from './ui.js';
import { runCountryAI } from './ai.js';
import { nationalFocuses } from './data/focuses.js';
import { getCountryInfo } from './data/countries.js';

const canvas = document.getElementById('grid-canvas');
const ctx = canvas.getContext('2d');

// Загрузка карты
async function loadMap() {
    try {
        const response = await fetch(CONFIG.MAP_PATH);
        const data = await response.json();
        state.gridData = data.gridData || {};
        state.cellStats = data.cellStats || {};
        return true;
    } catch (e) {
        console.error('Ошибка загрузки карты:', e);
        alert('Не удалось загрузить карту! Проверьте файл assets/maps/europe_1936.json');
        return false;
    }
}

// Игровой цикл
let lastTime = 0;
let tickAccumulator = 0;

function gameLoop(currentTime) {
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;
    
    if (state.gameSpeed > 0) {
        tickAccumulator += deltaTime;
        const tickInterval = CONFIG.TICK_RATE / state.gameSpeed;
        
        while (tickAccumulator >= tickInterval) {
            onDayPassed();
            tickAccumulator -= tickInterval;
        }
    }
    
    updateCamera();
    renderMap();
    renderUnits(ctx, CONFIG.CELL_SIZE);
    updateDate();
    
    requestAnimationFrame(gameLoop);
}

// Обработка дня
function onDayPassed() {
    const oldDate = new Date(state.gameDate);
    state.gameDate = new Date(state.gameDate.getTime() + 3600000); // +1 час
    
    if (state.gameDate.getDate() !== oldDate.getDate()) {
        // Фокусы
        if (state.activeFocus) {
            document.getElementById('focus-indicator').classList.remove('hidden');
            state.activeFocus.daysLeft--;
            if (state.activeFocus.daysLeft <= 0) {
                state.activeFocus.effect(state, {
                    getCellData,
                    createAlert,
                    isAtWar,
                    areAllies,
                    getCountryInfo
                });
                state.completedFocuses.add(state.activeFocus.id);
                state.activeFocus = null;
                document.getElementById('focus-indicator').classList.add('hidden');
                if(document.getElementById('hoi-window').style.display === 'flex') updateFocusUI();
            }
        }
        
        // Исследования
        if (state.activeResearch) {
            state.activeResearch.daysLeft--;
            if (state.activeResearch.daysLeft <= 0) {
                state.tech[state.activeResearch.type] = state.activeResearch.level;
                createAlert(`ИССЛЕДОВАНИЕ ЗАВЕРШЕНО: ${state.activeResearch.type.toUpperCase()} УР.${state.activeResearch.level}`, 10, 'diplo');
                state.activeResearch = null;
                document.getElementById('research-indicator').classList.add('hidden');
            }
        }
        
        // Строительство
        if (state.buildingQueue.length > 0) {
            document.getElementById('build-indicator').classList.remove('hidden');
            const activeProject = state.buildingQueue[0];
            activeProject.daysLeft--;
            if (activeProject.daysLeft <= 0) {
                const cell = getCellData(activeProject.pos);
                if (activeProject.type === 'factory') {
                    cell.factories++;
                } else if (activeProject.type === 'port') {
                    cell.buildings.push('port');
                }
                createAlert(`СТРОИТЕЛЬСТВО ЗАВЕРШЕНО`, 5, 'diplo');
                state.buildingQueue.shift();
            }
        } else {
            document.getElementById('build-indicator').classList.add('hidden');
        }
        
        // Производство
        const industryBonus = 1 + (state.tech.industry - 1) * 0.05;
        let production = (state.playerResources.factories * CONFIG.PRODUCTION_PER_FACTORY) * industryBonus;
        let maintenance = 0;
        state.units.forEach(u => {
            if (u.owner === state.myCountryId && u.trainingDaysLeft <= 0) {
                maintenance += getUnitStats()[u.type].maintenance;
            }
        });
        state.playerResources.equipment = Math.max(0, state.playerResources.equipment + production - maintenance);
        
        // ИИ
        Object.keys(state.gridData).forEach(id => {
            const countryId = state.gridData[id];
            if (countryId && countryId !== state.myCountryId) {
                runCountryAI(countryId);
            }
        });
        
        // Бои
        processCombat();
        
        // Движение юнитов
        state.units.forEach(u => {
            if (u.trainingDaysLeft > 0) u.trainingDaysLeft--;
            else if (u.path && u.path.length > 0) {
                if (u.moveCooldown === undefined) u.moveCooldown = 0;
                u.moveCooldown++;
                if (u.moveCooldown >= 2) {
                    u.moveCooldown = 0;
                    const nextStep = u.path[0];
                    const targetOwner = state.gridData[nextStep];
                    const enemyInCell = state.units.find(unit => unit.pos === nextStep && isAtWar(u.owner, unit.owner));
                    
                    if (enemyInCell) {
                        if (!state.activeBattles.some(b => b.attacker.id === u.id)) {
                            state.activeBattles.push({ attacker: u, defender: enemyInCell, daysCounter: 0 });
                        }
                    } else if (isAtWar(u.owner, targetOwner)) {
                        state.gridData[nextStep] = u.owner;
                        u.pos = nextStep;
                        u.path.shift();
                    } else if (targetOwner === u.owner || areAllies(u.owner, targetOwner)) {
                        u.pos = nextStep;
                        u.path.shift();
                    }
                }
            }
        });
        
        updateTopBar();
    }
}

// Старт игры
export async function startGame() {
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('game-container').classList.remove('hidden');
    
    const loaded = await loadMap();
    if (!loaded) return;
    
    initMap();
    showCountrySelect();
    gameLoop(0);
}

function showCountrySelect() {
    const ids = [...new Set(Object.values(state.gridData))];
    const list = document.getElementById('play-country-list');
    list.innerHTML = '';
    
    ids.forEach(id => {
        const btn = document.createElement('button');
        btn.className = "w-full text-left p-3 border-b border-black/10 font-bold uppercase text-xs";
        btn.innerText = getCountryInfo(id).name;
        btn.onclick = () => {
            state.myCountryId = id;
            state.isGameMode = true;
            setSpeed(1);
            updateTopBar();
            document.getElementById('play-menu').style.display = 'none';
            document.getElementById('ui-wrapper').classList.add('hidden-panel');
            document.getElementById('game-tabs').classList.remove('hidden');
            document.getElementById('top-country-name').innerText = getCountryInfo(id).name.toUpperCase();
        };
        list.appendChild(btn);
    });
    
    document.getElementById('play-menu').style.display = 'flex';
}

// Глобальные функции для HTML
window.startGame = startGame;
window.openFocusTree = openFocusTree;
window.startFocus = (id) => {
    const countryFocuses = nationalFocuses[state.myCountryId] || [];
    const f = countryFocuses.find(x => x.id === id);
    if (f) {
        state.activeFocus = { ...f, daysLeft: CONFIG.FOCUS_DURATION };
        updateFocusUI();
    }
};
window.startResearch = (type, level) => {
    state.activeResearch = { type, level, daysLeft: CONFIG.RESEARCH_DURATION };
    document.getElementById('research-indicator').classList.remove('hidden');
};
window.selectBuildType = (type) => {
    const b = getUnitStats().factory;
    if (state.playerResources.equipment < b.costEquipment) {
        createAlert("НЕДОСТАТОЧНО СНАРЯЖЕНИЯ", 3, 'war');
        return;
    }
    state.buildModeType = type;
    closeWindow();
    document.getElementById('build-hint').classList.remove('hidden');
};
window.startRecruitment = (type) => {
    state.recruitMode = type;
    closeWindow();
    document.getElementById('recruit-hint').classList.remove('hidden');
};
window.setSpeed = setSpeed;
window.openWindow = openWindow;
window.closeWindow = closeWindow;

// Обработчики событий
window.addEventListener('keydown', e => {
    if (e.code === 'Space' && state.isGameMode) {
        e.preventDefault();
        if (state.gameSpeed === 0) setSpeed(state.lastSavedSpeed);
        else setSpeed(0);
    }
    state.keys[e.code] = true;
});

window.addEventListener('keyup', e => state.keys[e.code] = false);

window.addEventListener('wheel', e => {
    state.camera.zoom = Math.min(Math.max(state.camera.zoom * (e.deltaY > 0 ? 0.9 : 1.1), 0.05), 10);
}, { passive: true });

canvas.addEventListener('mousedown', e => {
    const world = screenToWorld(e.clientX, e.clientY);
    const key = `${world.x},${world.y}`;
    const clickedId = state.gridData[key];
    
    if (state.isGameMode) {
        if (state.recruitMode) {
            // Развертывание
        } else if (state.buildModeType) {
            // Строительство
        } else if (e.button === 2 && clickedId) {
            state.diplomaticModeTarget = clickedId;
            document.getElementById('btn-map-normal').classList.remove('hidden');
            showIntel(clickedId, key, true);
        } else if (clickedId) {
            showIntel(clickedId, key, false);
        }
    }
});

canvas.addEventListener('mousemove', e => {
    const world = screenToWorld(e.clientX, e.clientY);
    const key = `${world.x},${world.y}`;
    state.hoverCell = state.gridData[key] ? key : null;
});

window.addEventListener('contextmenu', e => e.preventDefault());
