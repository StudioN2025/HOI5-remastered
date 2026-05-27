// js/ui.js — ПОЛНАЯ ИСПРАВЛЕННАЯ СБОРКА ИНТЕРФЕЙСА И МОДАЛЬНЫХ ОКН

import { COUNTRIES, UNIT_STATS, BUILDING_STATS } from './data.js';
import { getGridData, getMyCountryId, getCellStats, getUnits, getWars, getAlliances } from './game.js';
import { getCountryInfo, addNotification } from './utils.js';

// Закрытие любого активного модального окна
export function closeWindow() {
    const win = document.getElementById('info-window');
    if (win) win.classList.add('hidden');
}

// Открытие игровых вкладок (Фокусы, Исследования, Генералы)
export async function openWindow(type) {
    const win = document.getElementById('info-window');
    const title = document.getElementById('window-title');
    const content = document.getElementById('window-content');
    
    if (!win || !title || !content) return;
    
    content.innerHTML = '<p style="color:#aaa; padding:10px;">Загрузка данных подсистемы...</p>';
    win.classList.remove('hidden');

    try {
        if (type === 'research') {
            title.innerText = '🔬 НАУЧНО-ТЕХНИЧЕСКИЙ ПРОГРЕСС';
            const { renderResearchWindow } = await import('./tech.js');
            renderResearchWindow(content);
        } 
        else if (type === 'focus') {
            title.innerText = '⚡ НАЦИОНАЛЬНЫЕ ПРИОРИТЕТЫ (ФОКУСЫ)';
            const { renderFocusTree } = await import('./focuses.js');
            renderFocusTree(content);
        } 
        else if (type === 'commanders') {
            title.innerText = '👤 СТАВКА ГЕНЕРАЛИТЕТА';
            const { renderCommandersWindow } = await import('./commanders.js');
            renderCommandersWindow(content);
        }
    } catch (err) {
        console.error(`Ошибка отрисовки окна ${type}:`, err);
        content.innerHTML = `<p style="color:#ff5555; padding:10px;">Ошибка загрузки подмодуля. Проверьте консоль.</p>`;
    }
}

// Обновление числовых показателей на верхней панели ресурсов (HUD)
export function updateTopBar(resources) {
    if (!resources) return;
    
    const eqElem = document.getElementById('val-equipment');
    const factElem = document.getElementById('val-factories');
    const manElem = document.getElementById('val-manpower');
    
    if (eqElem) eqElem.innerText = Math.floor(resources.equipment || 0);
    if (factElem) factElem.innerText = Math.floor(resources.factories || 0);
    
    if (manElem) {
        const mp = resources.manpower || 0;
        manElem.innerText = mp >= 1000000 
            ? (mp / 1000000).toFixed(2) + 'M' 
            : Math.floor(mp / 1000) + 'k';
    }
}

// Вывод кратких текстовых хинтов внизу экрана
export function showHint(text) {
    const hint = document.getElementById('hint');
    if (hint) {
        hint.innerText = text;
        hint.classList.remove('hidden');
    }
}

// ОТОБРАЖЕНИЕ БОКОВОЙ ПАНЕЛИ ИНФОРМАЦИИ О ПРОВИНЦИИ (КЛИК ПО КЛЕТКЕ)
export function showCountryInfo(countryId, cellKey) {
    window._lastSelectedCellKey = cellKey; // Сохраняем ключ для автообновлений панелей
    
    const sidebar = document.getElementById('info-sidebar');
    const title = document.getElementById('sidebar-title');
    const leader = document.getElementById('sidebar-leader');
    const ideology = document.getElementById('sidebar-ideology');
    const pop = document.getElementById('sidebar-pop');
    const factories = document.getElementById('sidebar-factories');
    const buildings = document.getElementById('sidebar-buildings');
    const actions = document.getElementById('sidebar-actions');

    if (!sidebar) return;

    const info = getCountryInfo(countryId);
    const stats = getCellStats(cellKey) || { pop: 1.2, factories: 0, infrastructure: 1 };
    const myId = getMyCountryId();

    if (title) title.innerText = info.name.toUpperCase();
    if (leader) leader.innerText = info.leader;
    if (ideology) ideology.innerText = info.ideology || 'Нейтралитет';
    if (pop) pop.innerText = (stats.pop || 1.0).toFixed(1) + ' млн';
    if (factories) factories.innerText = stats.factories || 0;

    if (buildings) {
        buildings.innerText = `Инфраструктура: ${stats.infrastructure || 1}/5`;
    }

    if (actions) {
        actions.innerHTML = '';
        actions.classList.remove('hidden');

        if (countryId === myId) {
            // Своя земля
            actions.innerHTML = `
                <button class="action-btn build-btn" onclick="window.recruitUnit('infantry')">🪖 Сформировать пехоту</button>
                <button class="action-btn build-btn" onclick="window.recruitUnit('tank')">🚜 Сформировать танки</button>
                <div style="margin-top:8px; display:flex; gap:4px;">
                    <button class="action-btn" style="flex:1;" onclick="window.startBuilding('${cellKey}', 'factory')">🏗️ Фабрику</button>
                    <button class="action-btn" style="flex:1;" onclick="window.startBuilding('${cellKey}', 'infra')">🛣️ Инфраструктуру</button>
                </div>
            `;
        } else {
            // Чужая земля — Дипломатия
            const wars = getWars() || [];
            const alliances = getAlliances() || [];

            const currentlyAtWar = wars.some(w => 
                (w.attacker === myId && w.defender === countryId) || 
                (w.attacker === countryId && w.defender === myId)
            );
            const currentlyAllied = alliances.some(a => 
                (a.countryA === myId && a.countryB === countryId) || 
                (a.countryA === countryId && a.countryB === myId)
            );

            if (currentlyAtWar) {
                actions.innerHTML = `<div style="color:#ff3333; font-weight:bold; text-align:center; padding:10px; border:1px dashed #ff3333;">⚔️ МЫ В СОСТОЯНИИ ВОЙНЫ</div>`;
            } else if (currentlyAllied) {
                actions.innerHTML = `<div style="color:#33ff33; font-weight:bold; text-align:center; padding:10px; border:1px dashed #33ff33;">🤝 НАШ СОЮЗНИК</div>`;
            } else {
                actions.innerHTML = `
                    <button class="action-btn war-btn" onclick="window.declareWarOn('${countryId}')">⚔️ ОБЪЯВИТЬ ВОЙНУ</button>
                    <button class="action-btn trade-btn" onclick="window.offerAlliance('${countryId}')">🤝 ПРЕДЛОЖИТЬ СОЮЗ</button>
                `;
            }
        }
    }

    sidebar.classList.remove('hidden');
}

// Сохранения и загрузки сейвов
export function showSaveLoadMenu() {
    const win = document.getElementById('info-window');
    const title = document.getElementById('window-title');
    const content = document.getElementById('window-content');
    
    if (!win || !title || !content) return;

    title.innerText = '💾 УПРАВЛЕНИЕ СИМУЛЯЦИЕЙ (МЕНЮ)';
    content.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:12px; padding:15px;">
            <p style="font-size:12px; color:#aaa; text-align:center;">Текущая сессия HOI5 Remastered записывается в память браузера автоматически.</p>
            <button class="hq-button" id="menu-save-btn">💾 СОХРАНИТЬ ИГРУ НА ДИСК</button>
            <button class="hq-button" id="menu-load-btn" style="background:#3b533b;">📂 ЗАГРУЗИТЬ ИЗ ФАЙЛА</button>
            <button class="hq-button cancel-btn" style="margin-top:15px;" onclick="location.reload()">🚪 ВЫЙТИ В ГЛАВНОЕ МЕНЮ</button>
        </div>
    `;

    win.classList.remove('hidden');

    document.getElementById('menu-save-btn')?.addEventListener('click', () => {
        const { exportSave } = window._modules.game || {};
        if (typeof exportSave === 'function') exportSave();
        else addNotification('Ошибка: Модуль автосохранений недоступен', 'red');
    });

    document.getElementById('menu-load-btn')?.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = async (evt) => {
                try {
                    const parsed = JSON.parse(evt.target.result);
                    const { importSave } = window._modules.game || {};
                    if (typeof importSave === 'function' && importSave(parsed)) {
                        closeWindow();
                        addNotification('Сессия симуляции успешно восстановлена!', 'green');
                    }
                } catch(err) {
                    addNotification('Критическая ошибка: Файл сохранения поврежден', 'red');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    });
}

window._modules = window._modules || {};
window._modules.ui = { closeWindow, openWindow, updateTopBar, showHint, showCountryInfo, showSaveLoadMenu };
