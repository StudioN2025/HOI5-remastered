// js/main.js — ФИНАЛЬНАЯ СБОРКА С СИНХРОНИЗАЦИЕЙ СДВИГА КАРТЫ

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
    autoSave
} from './game.js';
import { renderMap, resizeCanvas, setupMapEvents, screenToWorld, markDirty, processCameraMovement, setCamera, mapOffset } from './map.js';
import { deployUnit, giveOrder, processMovement, processCombat } from './military.js';
import { processConstruction, updateEconomy } from './economy.js';
import { processSupply } from './supply.js';
import { updateResearch } from './tech.js';
import { updateFocus } from './focuses.js';
import { runAllAI } from './ai.js';
import { openWindow, closeWindow, updateTopBar, showCountryInfo, showHint, showSaveLoadMenu } from './ui.js';
import { getCountryInfo, addNotification, isAtWar } from './utils.js';
import { getCommanderBonus } from './commanders.js';

// Глобальная шина модулей для ленивых связей
window._modules = { supply: { drawPockets: null } };

// Автоматическое определение путей для корректной работы GitHub Pages
const isGitHubPages = window.location.hostname.includes('github.io');
const repoName = window.location.pathname.split('/')[1];
const BASE_URL = isGitHubPages ? `/${repoName}/` : '/';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const supplyMod = await import(`./supply.js`);
        window._modules.supply.drawPockets = supplyMod.drawPockets;
    } catch (err) {
        console.error('Ошибка импорта supply.js:', err);
    }

    const ls = document.getElementById('loading-screen');
    
    resizeCanvas();
    window.addEventListener('resize', () => {
        resizeCanvas();
        markDirty();
    });
    setupMapEvents();

    // Загрузка карты
    try {
        const mapPath = `${BASE_URL}maps/europe.json`;
        const res = await fetch(mapPath).catch(() => fetch('../maps/europe.json'));
        
        if (!res.ok) throw new Error(`Сервер ответил со статусом ${res.status}`);
        
        const data = await res.json();
        if (data && data.gridData) {
            setGridData(data.gridData);
            initializeFactories(data.gridData);
            
            // Сначала принудительно генерируем кэш в map.js, чтобы заполнился mapOffset
            markDirty();
            renderMap(); 

            // 🔥 ФИКС: Фокусируем камеру на центр с учетом mapOffset
            const cells = Object.keys(data.gridData);
            if (cells.length > 0) {
                let totalX = 0;
                let totalY = 0;
                cells.forEach(key => {
                    const [cx, cy] = key.split(',').map(Number);
                    // Считаем координаты уже перенесенные в плюсовую зону
                    totalX += (cx + mapOffset.x) * 20; 
                    totalY += (cy + mapOffset.y) * 20;
                });
                
                const centerX = totalX / cells.length;
                const centerY = totalY / cells.length;
                
                // Центрируем камеру ровно на середине Европы и слегка отдаляем
                setCamera({ x: -centerX * 0.35, y: -centerY * 0.35, zoom: 0.35 });
            }

            markDirty();
            renderCountrySelectionList();
        }
    } catch (e) {
        console.error('КРИТИЧЕСКАЯ ОШИБКА ЗАГРУЗКИ КАРТЫ:', e);
    }

    // Привязка UI кнопок управления
    document.getElementById('btn-play')?.addEventListener('click', () => {
        document.getElementById('main-menu')?.classList.add('hidden');
        document.getElementById('country-select')?.classList.remove('hidden');
    });

    document.getElementById('btn-cancel')?.addEventListener('click', () => {
        document.getElementById('country-select')?.classList.add('hidden');
        document.getElementById('main-menu')?.classList.remove('hidden');
    });

    document.getElementById('speed-pause')?.addEventListener('click', () => changeSpeedUI(0));
    document.getElementById('speed-1')?.addEventListener('click', () => changeSpeedUI(1));
    document.getElementById('speed-2')?.addEventListener('click', () => changeSpeedUI(2));
    document.getElementById('speed-3')?.addEventListener('click', () => changeSpeedUI(3));

    document.getElementById('nav-research')?.addEventListener('click', () => openWindow('research'));
    document.getElementById('nav-focus')?.addEventListener('click', () => openWindow('focus'));
    document.getElementById('nav-commanders')?.addEventListener('click', () => openWindow('commanders'));
    document.getElementById('nav-save')?.addEventListener('click', () => showSaveLoadMenu());

    // Игровой таймер времени (сутки)
    setInterval(() => {
        const speed = getGameSpeed();
        if (speed === 0 || !getMyCountryId()) return;

        let ticks = 1;
        if (speed === 2) ticks = 2;
        if (speed === 3) ticks = 4;

        for (let i = 0; i < ticks; i++) {
            advanceDay();
            processMovement();
            processCombat();
            processConstruction();
            updateEconomy();
            processSupply();
            updateResearch();
            updateFocus();
            runAllAI();
        }

        updateTopBar(getPlayerResources());
        const dateElem = document.getElementById('game-date');
        if (dateElem) dateElem.innerText = getDateString();
        
        if (Math.random() < 0.03) autoSave();

        markDirty();
    }, 1000);

    document.getElementById('close-sidebar')?.addEventListener('click', () => {
        document.getElementById('info-sidebar')?.classList.add('hidden');
    });

    // Обработка кликов (выделение/деактивация)
    window.addEventListener('mousedown', (e) => {
        if (e.button === 2) { 
            setSelectedUnitId(null);
            window._recruitMode = null;
            window._selectedArmy = null;
            document.getElementById('recruit-hint')?.classList.add('hidden');
            document.getElementById('order-hint')?.classList.add('hidden');
            document.getElementById('info-sidebar')?.classList.add('hidden');
            showHint('⚔️ ЛКМ по врагу = атака | ЛКМ по клетке = движение');
            return;
        }
        
        const key = screenToWorld(e.clientX, e.clientY);
        const gridData = getGridData();
        const myId = getMyCountryId();
        if (gridData[`${key.x},${key.y}`] && gridData[`${key.x},${key.y}`] !== myId) {
            showCountryInfo(gridData[`${key.x},${key.y}`], `${key.x},${key.y}`);
        }
    });
    
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && getMyCountryId()) {
            if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
            e.preventDefault();
            const s = getGameSpeed();
            if (s === 0) {
                setGameSpeed(1);
                updateSpeedButtons(1);
            } else {
                setGameSpeed(0);
                updateSpeedButtons(0);
            }
        }
    });
    
    if (ls) {
        setTimeout(() => ls.remove(), 400);
    }

    function animate() { 
        processCameraMovement(); 
        renderMap();             
        requestAnimationFrame(animate); 
    }
    animate();
});

// Генерация списка выбора держав
function renderCountrySelectionList() {
    const listContainer = document.getElementById('country-list');
    if (!listContainer) return;
    
    listContainer.innerHTML = '';
    const sizes = {};
    const gridData = getGridData();
    
    Object.keys(gridData).forEach(pos => {
        const cid = gridData[pos];
        sizes[cid] = (sizes[cid] || 0) + 1;
    });

    Object.keys(COUNTRIES).forEach(cid => {
        if (!sizes[cid]) return; 
        
        const info = getCountryInfo(cid);
        const btn = document.createElement('button');
        btn.style.borderLeftColor = info.color;
        btn.style.borderLeftWidth = '4px';
        
        btn.innerHTML = `
            <div style="display:flex; align-items:center; gap:12px; pointer-events:none;">
                <img src="${BASE_URL}assets/flags/${cid}.png" 
                     onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'16\' viewBox=\'0 0 24 16\'><rect width=\'24\' height=\'16\' fill=\'%23555\'/></svg>'" 
                     style="width:28px; height:18px; object-fit:cover; border:1px solid #444; border-radius:2px;" 
                     alt="${info.name}"/>
                <div style="text-align:left;">
                    <div style="font-weight:bold; font-size:13px; color:#fff;">${info.name}</div>
                    <div style="font-size:10px; color:#aaa;">Провинций: ${sizes[cid]} | Лидер: ${info.leader}</div>
                </div>
            </div>`;
            
        btn.addEventListener('click', () => selectCountryAndStart(cid));
        listContainer.appendChild(btn);
    });
}

function selectCountryAndStart(id) {
    setMyCountryId(id);
    setGameActive(true);
    setGameSpeed(0);
    
    document.getElementById('country-select')?.classList.add('hidden');
    
    const hud = document.getElementById('hud');
    if (hud) {
        hud.classList.remove('hidden');
    } else {
        document.getElementById('top-bar')?.classList.remove('hidden');
        document.getElementById('speed-controls')?.classList.remove('hidden');
        document.getElementById('game-navigation')?.classList.remove('hidden');
    }
    
    const gridData = getGridData();
    const myCells = Object.keys(gridData).filter(k => gridData[k] === id);
    if (myCells.length > 0) {
        let sx = 0, sy = 0;
        myCells.forEach(c => {
            const [cx, cy] = c.split(',').map(Number);
            // При выборе страны камера центрируется тоже с учетом mapOffset
            sx += (cx + mapOffset.x) * 20; 
            sy += (cy + mapOffset.y) * 20;
        });
        setCamera({ x: sx / myCells.length, y: sy / myCells.length, zoom: 0.8 });
    }
    
    updateTopBar(getPlayerResources());
    const dateElem = document.getElementById('game-date');
    if (dateElem) dateElem.innerText = getDateString();
    
    markDirty();
}

function changeSpeedUI(val) {
    setGameSpeed(val);
    updateSpeedButtons(val);
}

function updateSpeedButtons(speed) {
    ['speed-pause', 'speed-1', 'speed-2', 'speed-3'].forEach(id => {
        document.getElementById(id)?.classList.remove('active');
    });
    if (speed === 0) document.getElementById('speed-pause')?.classList.add('active');
    if (speed === 1) document.getElementById('speed-1')?.classList.add('active');
    if (speed === 2) document.getElementById('speed-2')?.classList.add('active');
    if (speed === 3) document.getElementById('speed-3')?.classList.add('active');
}

window.recruitUnit = (type) => {
    document.getElementById('info-window')?.classList.add('hidden');
    window._recruitMode = type;
    showHint(`🎯 Выберите провинцию для развёртывания ${UNIT_STATS[type]?.icon || '🎖️'}`);
    document.getElementById('recruit-hint')?.classList.remove('hidden');
};

window.showSaveMenu = () => showSaveLoadMenu();
