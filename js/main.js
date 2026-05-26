// main.js — ПОЛНЫЙ С КОМАНДУЮЩИМИ И ПЛАВНЫМ ИГРОВЫМ ЦИКЛОМ

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
import { renderMap, resizeCanvas, setupMapEvents, screenToWorld, markDirty, processCameraMovement } from './map.js';
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

document.addEventListener('DOMContentLoaded', async () => {
    // Подгружаем отрисовку котлов из supply.js в общую шину
    const supplyMod = await import('./supply.js');
    window._modules.supply.drawPockets = supplyMod.drawPockets;

    // Скрываем загрузочный экран
    const ls = document.getElementById('loading-screen');
    
    // Инициализация размеров экрана и событий
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    setupMapEvents();

    // Загрузка карты Европы из json конфигурации
    try {
        const res = await fetch('uploaded:europe.json');
        const data = await res.json();
        if (data && data.gridData) {
            setGridData(data.gridData);
            initializeFactories(data.gridData);
            markDirty();
        }
    } catch (e) {
        console.error('Ошибка загрузки карты:', e);
    }

    // Рендер стартового меню выбора стран
    const listContainer = document.getElementById('country-list');
    if (listContainer) {
        listContainer.innerHTML = '';
        const sizes = {};
        Object.keys(getGridData()).forEach(pos => {
            const cid = getGridData()[pos];
            sizes[cid] = (sizes[cid] || 0) + 1;
        });

        Object.keys(COUNTRIES).forEach(cid => {
            if (!sizes[cid]) return; 
            const { createCountryButton } = require('./ui.js');
            const btn = createCountryButton(cid, sizes);
            btn.addEventListener('click', () => selectCountryAndStart(cid));
            listContainer.appendChild(btn);
        });
    }

    // Привязка UI кнопок управления скоростью и меню
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

    // Сердце игрового времени (Таймер суток)
    setInterval(() => {
        const speed = getGameSpeed();
        if (speed === 0 || !getMyCountryId()) return;

        let ticks = 1;
        if (speed === 2) ticks = 2;
        if (speed === 3) ticks = 4;

        for (let i = 0; i < ticks; i++) {
            advanceDay();
            
            // Расчет экономических, военных и логистических тиков
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
        document.getElementById('game-date').innerText = getDateString();
        
        if (Math.random() < 0.03) autoSave();

        markDirty();
    }, 1000);

    // Закрытие бокового меню информации о провинции
    document.getElementById('close-sidebar')?.addEventListener('click', () => {
        document.getElementById('info-sidebar')?.classList.add('hidden');
    });

    // Деактивация выделения юнитов по клику на правую кнопку мыши (ПКМ)
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
    
    // ========== ГЛОБАЛЬНЫЙ ХОТКЕЙ: ПРОБЕЛ ДЛЯ ПАУЗЫ ==========
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
    
    setTimeout(() => ls.remove(), 400);
    
    // ✅ ИДЕАЛЬНО ПЛАВНЫЙ ИГРОВОЙ ЦИКЛ ОБНОВЛЕНИЯ ЭКРАНА
    function animate() { 
        processCameraMovement(); // Двигаем камеру каждый кадр на основе нажатых клавиш
        renderMap();             // Отрисовываем карту под новыми плавными координатами
        requestAnimationFrame(animate); 
    }
    animate();
});

// Функции-помощники
function selectCountryAndStart(id) {
    setMyCountryId(id);
    setGameActive(true);
    setGameSpeed(0);
    document.getElementById('country-select').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    
    // Центрирование камеры на провинциях выбранного игрока
    const myCells = Object.keys(getGridData()).filter(k => getGridData()[k] === id);
    if (myCells.length > 0) {
        let sx = 0, sy = 0;
        myCells.forEach(c => {
            const [cx, cy] = c.split(',').map(Number);
            sx += cx * 20; sy += cy * 20;
        });
        const { setCamera } = require('./map.js');
        setCamera({ x: sx / myCells.length, y: sy / myCells.length, zoom: 0.9 });
    }
    
    updateTopBar(getPlayerResources());
    document.getElementById('game-date').innerText = getDateString();
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

// Эмуляция CommonJS require внутри браузерных ESM модулей для ui.js
function require(moduleName) {
    if (moduleName === './ui.js') {
        return {
            createCountryButton: (countryId, sizes) => {
                const info = getCountryInfo(countryId);
                const btn = document.createElement('button');
                btn.style.borderLeftColor = info.color;
                btn.style.borderLeftWidth = '4px';
                btn.innerHTML = `
                    <div style="display:flex; align-items:center; gap:12px;">
                        <span style="font-size:16px;">🏳️</span>
                        <div style="text-align:left;">
                            <div style="font-weight:bold; font-size:13px;">${info.name}</div>
                            <div style="font-size:10px; color:#888;">Провинций: ${sizes[countryId]} | Лидер: ${info.leader}</div>
                        </div>
                    </div>`;
                return btn;
            }
        };
    }
    return {};
}

window.recruitUnit = (type) => {
    document.getElementById('info-window')?.classList.add('hidden');
    window._recruitMode = type;
    showHint(`🎯 Выберите провинцию для развёртывания ${UNIT_STATS[type]?.icon || '🎖️'}`);
    document.getElementById('recruit-hint')?.classList.remove('hidden');
};
