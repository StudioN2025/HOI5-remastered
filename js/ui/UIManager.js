// UIManager.js — Управление интерфейсом (исправлен)

import { getCountryInfo } from '../utils/helpers.js';

export class UIManager {
    constructor(world, entities, gameState, windowsManager, topBar) {
        this.world = world;
        this.entities = entities;
        this.gameState = gameState;
        this.windowsManager = windowsManager;
        this.topBar = topBar;
    }
    
    update() {
        if (this.topBar) this.topBar.update();
    }
    
    updateTopBar() {
        if (this.topBar) this.topBar.update();
    }
    
    updateDate() {
        const dateElem = document.getElementById('game-date');
        if (dateElem && this.gameState) {
            dateElem.innerText = this.gameState.getDateString();
        }
    }
    
    openWindow(tab) {
        const win = document.getElementById('info-window');
        const title = document.getElementById('window-title');
        const content = document.getElementById('window-content');
        
        if (!win || !title || !content) return;
        
        win.classList.remove('hidden');

        // Сброс стилей при переключении вкладок
        content.style.padding = '';
        content.style.overflow = '';
        
        const titles = {
            army: '🎖️ АРМИЯ',
            research: '🔬 ТЕХНОЛОГИИ',
            focus: '⭐ НАЦИОНАЛЬНЫЕ ФОКУСЫ',
            diplomacy: '🤝 ДИПЛОМАТИЯ',
            build: '🏗️ СТРОИТЕЛЬСТВО',
            commanders: '🎖️ КОМАНДУЮЩИЕ',
            save: '💾 СОХРАНЕНИЯ'
        };
        
        title.innerText = titles[tab] || 'ОКНО';
        
        // Вызываем соответствующий метод WindowsManager
        if (this.windowsManager) {
            switch(tab) {
                case 'army':
                    this.windowsManager.renderArmyWindow(content);
                    break;
                case 'research':
                    this.windowsManager.renderResearchWindow(content);
                    break;
                case 'focus':
                    this.windowsManager.renderFocusWindow(content);
                    break;
                case 'diplomacy':
                    this.windowsManager.renderDiplomacyWindow(content);
                    break;
                case 'build':
                    this.windowsManager.renderBuildWindow(content);
                    break;
                case 'commanders':
                    this.windowsManager.renderCommandersWindow(content);
                    break;
                case 'save':
                    this.windowsManager.renderSaveWindow(content);
                    break;
                default:
                    content.innerHTML = '<div class="text-center text-gray-400 py-8">В разработке...</div>';
            }
        } else {
            content.innerHTML = '<div class="text-center text-gray-400 py-8">Ошибка: WindowsManager не инициализирован</div>';
        }
    }
    
    closeWindow() {
        const win = document.getElementById('info-window');
        if (win) win.classList.add('hidden');
    }
    
    closeSidebar() {
        const sidebar = document.getElementById('info-sidebar');
        if (sidebar) sidebar.classList.add('hidden');
    }
    
    showCountryInfo(countryId, pos) {
        const sidebar = document.getElementById('info-sidebar');
        const title = document.getElementById('sidebar-title');
        
        if (!sidebar || !title) return;
        
        const countryInfo = getCountryInfo(countryId);

        // Показываем флаг если есть
        const flagSrc = `assets/flags/${countryId}.png`;
        title.innerHTML = `<div class="flex items-center gap-2"><img src="${flagSrc}" style="width:24px;height:16px;border-radius:2px;" onerror="this.style.display='none'">${countryInfo.name}</div>`;
        
        const leaderElem = document.getElementById('sidebar-leader');
        const ideologyElem = document.getElementById('sidebar-ideology');
        const popElem = document.getElementById('sidebar-pop');
        const factoriesElem = document.getElementById('sidebar-factories');
        const buildingsElem = document.getElementById('sidebar-buildings');
        const actionsDiv = document.getElementById('sidebar-actions');
        
        if (leaderElem) leaderElem.innerText = countryInfo.leader;
        if (ideologyElem) ideologyElem.innerText = countryInfo.ideology;
        
        // Считаем статистику за ВСЮ страну
        const cells = this.world.getCountryCells(countryId);
        let totalPop = 0;
        let totalFactories = 0;
        let totalPorts = 0;
        
        for (const cellKey of cells) {
            const [cx, cy] = cellKey.split(',').map(Number);
            if (this.world.hasBuilding(cx, cy, 'factory')) totalFactories++;
            if (this.world.hasBuilding(cx, cy, 'port')) totalPorts++;
            const stats = this.world.cellStats.get(cellKey);
            if (stats && stats.population) totalPop += stats.population;
        }
        
        // Показываем реальные людские ресурсы страны
        const actualManpower = countryId === this.gameState.myCountryId
            ? Math.floor(this.gameState.manpower)
            : cells.size * 1000;
        
        if (popElem) popElem.innerText = `${actualManpower.toLocaleString()} чел.`;
        if (factoriesElem) factoriesElem.innerText = `${totalFactories} 🏭`;
        if (buildingsElem) buildingsElem.innerText = totalPorts > 0 ? `${totalPorts} ⚓` : 'Нет портов';
        
        if (actionsDiv && countryId !== this.gameState.myCountryId) {
            actionsDiv.classList.remove('hidden');
            const atWar = this.gameState.isAtWar && this.gameState.isAtWar(this.gameState.myCountryId, countryId);
            const allied = this.gameState.areAllies && this.gameState.areAllies(this.gameState.myCountryId, countryId);
            
            actionsDiv.innerHTML = `
                ${!atWar ? `<button onclick="window.declareWarOn('${countryId}')" style="width:100%;background:#991b1b;color:white;padding:10px;border-radius:6px;margin-bottom:8px;font-weight:bold;cursor:pointer;">⚔️ ОБЪЯВИТЬ ВОЙНУ</button>` : '<div style="color:#f87171;text-align:center;padding:10px;background:#7f1d1d30;border-radius:6px;margin-bottom:8px;">⚔️ В СОСТОЯНИИ ВОЙНЫ</div>'}
                ${!atWar && !allied ? `<button onclick="window.proposeAlly('${countryId}')" style="width:100%;background:#15803d;color:white;padding:10px;border-radius:6px;font-weight:bold;cursor:pointer;">🤝 ПРЕДЛОЖИТЬ АЛЬЯНС</button>` : allied ? '<div style="color:#4ade80;text-align:center;padding:10px;background:#16653430;border-radius:6px;">🤝 В АЛЬЯНСЕ</div>' : ''}
            `;
        } else if (actionsDiv) {
            actionsDiv.classList.add('hidden');
        }
        
        sidebar.classList.remove('hidden');
    }
    
    showOrderHint() {
        const hint = document.getElementById('order-hint');
        if (hint) hint.classList.remove('hidden');
    }
    
    hideOrderHint() {
        const hint = document.getElementById('order-hint');
        if (hint) hint.classList.add('hidden');
    }
}
