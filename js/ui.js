import { state } from './state.js';
import { CONFIG } from './config.js';
import { months } from './state.js';
import { getCountryInfo } from './data/countries.js';
import { calculateCountryStats } from './map.js';
import { getUnitStats, getBuildingStats } from './units.js';
import { nationalFocuses } from './data/focuses.js';

export function updateTopBar() {
    if (!state.myCountryId) return;
    const stats = calculateCountryStats(state.myCountryId);
    state.playerResources.factories = stats.totalFactories;
    const totalManpower = stats.totalPop * CONFIG.MANPOWER_USAGE_PERCENT;
    
    // Оптимизация: кэшируем getUnitStats
    const unitStats = getUnitStats();
    const usedManpower = state.units.reduce((acc, u) => acc + unitStats[u.type].costManpower, 0);
    
    document.getElementById('val-manpower').innerText = Math.floor(Math.max(0, totalManpower - usedManpower)).toLocaleString();
    document.getElementById('val-fact').innerText = state.playerResources.factories;
    document.getElementById('val-equip').innerText = Math.floor(state.playerResources.equipment).toLocaleString();
    document.getElementById('top-country-name').innerText = getCountryInfo(state.myCountryId).name.toUpperCase();
}

export function updateDate() {
    document.getElementById('game-date').innerText = 
        `${state.gameDate.getDate()} ${months[state.gameDate.getMonth()]}, ${state.gameDate.getFullYear()}`;
}

export function createAlert(text, days, type = 'war') {
    const id = 'alert-' + Math.random().toString(36).substr(2, 9);
    const box = document.getElementById('notification-box');
    const div = document.createElement('div');
    div.id = id;
    div.className = type === 'war' ? "alert-war" : "alert-diplo";
    div.innerHTML = `<strong>${type === 'war' ? 'ВНИМАНИЕ' : 'ДИПЛОМАТИЯ'}</strong><br><span class="text-xs uppercase">${text}</span>`;
    box.appendChild(div);
    state.alerts.push({ id, days });
}

export function openWindow(tab) {
    const win = document.getElementById('hoi-window');
    const body = document.getElementById('window-body');
    const title = document.getElementById('window-title');
    win.style.display = 'flex';
    
    if (tab === 'diplomacy') {
        title.innerText = 'ДИПЛОМАТИЧЕСКИЙ КОРПУС';
        updateDiplomacyUI(body);
    } else if (tab === 'build') {
        title.innerText = 'ПРОГРАММА СТРОИТЕЛЬСТВА';
        updateBuildUI(body);
    } else if (tab === 'research') {
        title.innerText = 'ТЕХНОЛОГИЧЕСКИЙ ЦЕНТР';
        updateResearchUI(body);
    } else if (tab === 'politics') {
        title.innerText = 'ВНУТРЕННЯЯ ПОЛИТИКА';
        updatePoliticsUI(body);
    } else if (tab === 'army') {
        title.innerText = 'АРМИЯ — ШАБЛОНЫ';
        updateArmyUI(body);
    }
}

export function closeWindow() {
    document.getElementById('hoi-window').style.display = 'none';
}

function updatePoliticsUI(body) {
    const info = getCountryInfo(state.myCountryId);
    body.innerHTML = `
    <div class="bg-black/30 p-6 rounded border border-white/10">
        <h2 class="text-3xl font-bold text-yellow-500 mb-2">${info.name}</h2>
        <p class="text-sm uppercase tracking-widest text-gray-400 mb-6">${info.ideology}</p>
        <div class="flex gap-6 items-center mb-6">
            <div class="w-32 h-40 bg-gray-800 border-2 border-white/20 flex items-center justify-center text-4xl">👤</div>
            <div>
                <p class="text-xs text-gray-500 uppercase">Глава государства</p>
                <p class="text-xl font-bold">${info.leader}</p>
            </div>
        </div>
        <button onclick="window.openFocusTree()" class="hq-button w-full bg-yellow-800 border-yellow-600 text-sm">НАЦИОНАЛЬНЫЕ ФОКУСЫ</button>
    </div>`;
}

export function openFocusTree() {
    const title = document.getElementById('window-title');
    title.innerText = 'НАЦИОНАЛЬНЫЕ ФОКУСЫ';
    updateFocusUI();
}

export function updateFocusUI() {
    const body = document.getElementById('window-body');
    const countryFocuses = nationalFocuses[state.myCountryId] || [];
    let html = '';
    
    if (state.activeFocus) {
        html += `
        <div class="bg-yellow-900/20 border border-yellow-600/50 p-4 mb-4 rounded">
            <p class="text-[10px] text-yellow-500 font-bold uppercase mb-1">Выполняется: ${state.activeFocus.name}</p>
            <div class="progress-bg"><div class="progress-fill" style="width: ${((CONFIG.FOCUS_DURATION - state.activeFocus.daysLeft) / CONFIG.FOCUS_DURATION) * 100}%"></div></div>
            <p class="text-[9px] mt-1 text-right text-gray-400 italic">${state.activeFocus.daysLeft} ДНЕЙ ДО ЗАВЕРШЕНИЯ</p>
        </div>`;
    }
    
    html += `<div class="space-y-3">`;
    countryFocuses.forEach(f => {
        const isDone = state.completedFocuses.has(f.id);
        const isCurrent = state.activeFocus && state.activeFocus.id === f.id;
        html += `
        <div class="unit-card ${isDone ? 'opacity-50 border-emerald-600/50' : (isCurrent ? 'border-yellow-500 ring-1 ring-yellow-500' : '')}">
            <div class="flex justify-between items-center">
                <div>
                    <h4 class="font-bold text-sm ${isDone ? 'text-emerald-500' : 'text-yellow-500'}">${f.name}</h4>
                    <p class="text-[9px] text-gray-400 uppercase mt-1 leading-tight">${f.description}</p>
                </div>
                <div class="flex items-center">
                    ${!isDone && !state.activeFocus ? `<button onclick="window.startFocus('${f.id}')" class="bg-yellow-700 hover:bg-yellow-600 px-4 py-1 text-[10px] font-bold border border-yellow-400">ВЫБРАТЬ</button>` : ''}
                    ${isCurrent ? `<span class="text-yellow-500 text-[10px] animate-pulse font-bold tracking-tighter">В ПРОЦЕССЕ...</span>` : ''}
                    ${isDone ? `<span class="text-emerald-500 text-[10px] font-bold">ЗАВЕРШЕНО ✅</span>` : ''}
                </div>
            </div>
        </div>`;
    });
    html += `</div>`;
    
    if (countryFocuses.length === 0) {
        html = '<div class="text-center py-12 opacity-40 italic text-xs uppercase">Для этой державы нет уникальных фокусов</div>';
    }
    body.innerHTML = html;
}

function updateDiplomacyUI(body) {
    const allies = [];
    state.alliances.forEach(a => { 
        if(a.has(state.myCountryId)) a.forEach(id => { 
            if(id !== state.myCountryId) allies.push(id); 
        }); 
    });
    
    const enemies = [];
    state.wars.forEach(w => { 
        if (w.a === state.myCountryId) enemies.push(w.b); 
        else if (w.b === state.myCountryId) enemies.push(w.a); 
    });
    
    const uniqueEnemies = [...new Set(enemies)];
    
    let alliesHtml = allies.length > 0 ? allies.map(id => `
    <div class="unit-card flex justify-between items-center border-l-4 border-emerald-500">
        <div>
            <span class="font-bold text-emerald-400">${getCountryInfo(id).name}</span>
            <p class="text-[9px] opacity-60">Идеология: ${getCountryInfo(id).ideology}</p>
        </div>
    </div>`).join('') : '<div class="text-center opacity-40 py-4 text-[10px] italic">Нет союзников</div>';
    
    let enemiesHtml = uniqueEnemies.length > 0 ? uniqueEnemies.map(id => `
    <div class="unit-card flex justify-between items-center border-l-4 border-red-600">
        <div>
            <span class="font-bold text-red-500">${getCountryInfo(id).name}</span>
            <p class="text-[9px] opacity-60">Идеология: ${getCountryInfo(id).ideology}</p>
        </div>
        <div class="text-[10px] font-bold text-red-600 animate-pulse">В СОСТОЯНИИ ВОЙНЫ</div>
    </div>`).join('') : '<div class="text-center opacity-40 py-4 text-[10px] italic">Мирное время</div>';
    
    body.innerHTML = `
    <div class="mb-6">
        <h3 class="text-xs font-bold text-emerald-500 uppercase mb-2 border-b border-white/10 pb-1">Ваш Альянс</h3>
        ${alliesHtml}
    </div>
    <div>
        <h3 class="text-xs font-bold text-red-500 uppercase mb-2 border-b border-white/10 pb-1">Состояние войны</h3>
        ${enemiesHtml}
    </div>`;
}

function updateBuildUI(body) {
    let activeHtml = state.buildingQueue.length > 0 ? 
        `<div class="bg-blue-900/10 border border-blue-500/40 p-3 mb-6">
            <div class="flex justify-between text-[10px] mb-1">
                <span class="text-blue-400 font-bold">СТРОЙКА: ${getBuildingStats()[state.buildingQueue[0].type].name}</span>
                <span>${state.buildingQueue[0].daysLeft} дн.</span>
            </div>
            <div class="progress-bg"><div class="progress-fill-blue" style="width: ${((CONFIG.CONSTRUCTION_TIME - state.buildingQueue[0].daysLeft) / CONFIG.CONSTRUCTION_TIME) * 100}%"></div></div>
        </div>` : '';
    
    body.innerHTML = activeHtml + 
        `<div class="grid grid-cols-1 gap-2">${Object.entries(getBuildingStats()).map(([key, b]) => 
        `<div class="unit-card flex justify-between items-center">
            <span>${b.icon} ${b.name}</span>
            <button onclick="window.selectBuildType('${key}')" class="bg-blue-800 px-3 py-1 text-[10px]">ВЫБРАТЬ КЛЕТКУ</button>
        </div>`).join('')}</div>`;
}

function updateResearchUI(body) {
    body.innerHTML = `
    <div class="space-y-6">
        <div>
            <h4 class="text-blue-400 font-bold text-xs uppercase mb-2 border-b border-blue-900/30">Промышленность (+5% производство/ур)</h4>
            ${renderTechTier('industry', state.tech.industry, 'Эффективность')}
        </div>
        <div>
            <h4 class="text-yellow-400 font-bold text-xs uppercase mb-2 border-b border-yellow-900/30">Пехота (+5% мощь, +10% цена/ур)</h4>
            ${renderTechTier('infantry', state.tech.infantry, 'Снаряжение')}
        </div>
        <div>
            <h4 class="text-emerald-400 font-bold text-xs uppercase mb-2 border-b border-emerald-900/30">Танковые войска</h4>
            ${renderTechTier('tank', state.tech.tank, 'Бронетехника')}
        </div>
    </div>`;
}

function renderTechTier(type, currentLevel, name) {
    let html = '';
    for(let i = 1; i <= CONFIG.MAX_TECH_LEVEL; i++) {
        const isCompleted = i <= currentLevel;
        const isAvailable = i === currentLevel + 1 && (!state.activeResearch);
        const isProcessing = state.activeResearch && state.activeResearch.type === type && state.activeResearch.level === i;
        
        let buttonHtml = '';
        if (isCompleted) {
            buttonHtml = '<span class="text-emerald-500 text-[9px] font-bold">АКТИВНО</span>';
        } else if (isProcessing) {
            buttonHtml = `<span class="text-blue-400 text-[9px] animate-pulse">ИЗУЧАЕТСЯ (${state.activeResearch.daysLeft}д)</span>`;
        } else if (isAvailable) {
            buttonHtml = `<button onclick="window.startResearch('${type}', ${i})" class="bg-blue-800 hover:bg-blue-700 px-3 py-1 text-[9px] border border-blue-400">ИЗУЧИТЬ</button>`;
        } else {
            buttonHtml = '<span class="text-gray-600 text-[9px]">ЗАБЛОКИРОВАНО</span>';
        }
        
        html += `
        <div class="research-node ${isCompleted ? 'completed' : ''} flex justify-between items-center p-2 mb-1 bg-black/20 border border-white/10">
            <div class="text-xs ${isCompleted ? 'text-gold' : 'text-gray-300'}">${name} Ур. ${i}</div>
            ${buttonHtml}
        </div>`;
    }
    return html;
}

function updateArmyUI(body) {
    body.innerHTML = Object.entries(getUnitStats()).map(([key, u]) => `
    <div class="unit-card">
        <div class="flex justify-between items-start mb-2">
            <span class="text-lg font-bold">${u.icon} ${u.name}</span>
            <button onclick="window.startRecruitment('${key}')" class="bg-emerald-800 hover:bg-emerald-700 px-4 py-1 text-[10px] font-bold border border-emerald-400">РАЗВЕРНУТЬ</button>
        </div>
        <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] uppercase">
            <div class="flex justify-between border-b border-white/5">
                <span class="text-gray-400">Атака:</span> <span class="text-red-400">${u.attack.toFixed(1)}</span>
            </div>
            <div class="flex justify-between border-b border-white/5">
                <span class="text-gray-400">Снаряжение:</span> <span class="text-yellow-500">${u.costEquipment.toFixed(0)}</span>
            </div>
            <div class="flex justify-between border-b border-white/5">
                <span class="text-gray-400">Защита:</span> <span class="text-blue-400">${u.defense.toFixed(1)}</span>
            </div>
            <div class="flex justify-between border-b border-white/5">
                <span class="text-gray-400">Люди:</span> <span class="text-orange-300">${u.costManpower}</span>
            </div>
        </div>
    </div>`).join('');
}

export function showIntel(id, key, withDiplo) {
    const info = getCountryInfo(id);
    const stats = getCellData(key);
    
    document.getElementById('intel-name').innerText = info.name;
    document.getElementById('intel-leader').innerText = info.leader;
    document.getElementById('intel-ideology').innerText = info.ideology;
    document.getElementById('cell-pop').innerText = stats.population.toLocaleString();
    document.getElementById('cell-fact').innerText = stats.factories + (stats.buildings.includes('factory') ? 1 : 0);
    document.getElementById('intel-sidebar').style.display = 'block';
    
    const actionsDiv = document.getElementById('diplo-actions');
    const statusText = document.getElementById('diplo-status-text');
    document.getElementById('diplo-view-info').classList.toggle('hidden', !withDiplo || id === state.myCountryId);
}

export function setSpeed(s) {
    state.gameSpeed = s;
    if (s > 0) state.lastSavedSpeed = s;
    document.querySelectorAll('.speed-btn').forEach((btn, i) => {
        btn.classList.toggle('active', (s === 0 && i === 0) || (s === 1 && i === 1) || (s === 3 && i === 2) || (s === 5 && i === 3));
    });
}

export function resetMapMode() {
    state.diplomaticModeTarget = null;
    document.getElementById('btn-map-normal').classList.add('hidden');
    document.getElementById('intel-sidebar').style.display = 'none';
}
