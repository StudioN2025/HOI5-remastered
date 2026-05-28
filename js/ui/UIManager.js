// UIManager.js — Управление интерфейсом

export class UIManager {
    constructor(world, entities, gameState) {
        this.world = world;
        this.entities = entities;
        this.gameState = gameState;
    }
    
    update() {
        this.updateTopBar();
    }
    
    updateTopBar() {
        const myId = this.gameState.myCountryId;
        if (!myId) return;
        
        const cells = this.world.getCountryCells(myId);
        const manpower = Math.floor(cells.size * 5000) - this.entities.getEntitiesByOwner(myId).length * 1000;
        
        document.getElementById('country-name').innerHTML = `<span class="flex items-center gap-2">${myId.toUpperCase()}</span>`;
        document.getElementById('val-manpower').innerText = Math.max(0, manpower).toLocaleString();
        document.getElementById('val-factories').innerText = this.gameState.factories;
        document.getElementById('val-equipment').innerText = Math.floor(this.gameState.equipment).toLocaleString();
    }
    
    updateDate() {
        const dateElem = document.getElementById('game-date');
        if (dateElem) dateElem.innerText = this.gameState.getDateString();
    }
    
    openWindow(tab) {
        const win = document.getElementById('info-window');
        const title = document.getElementById('window-title');
        const content = document.getElementById('window-content');
        
        win.classList.remove('hidden');
        
        const titles = {
            army: '🎖️ АРМИЯ',
            research: '🔬 ТЕХНОЛОГИИ',
            focus: '⭐ НАЦИОНАЛЬНЫЕ ФОКУСЫ',
            diplomacy: '🤝 ДИПЛОМАТИЯ',
            build: '🏗️ СТРОИТЕЛЬСТВО',
            commanders: '🎖️ КОМАНДУЮЩИЕ'
        };
        
        title.innerText = titles[tab] || 'ОКНО';
        content.innerHTML = `<div class="text-center text-gray-400 py-8">В разработке...</div>`;
    }
    
    closeWindow() {
        document.getElementById('info-window').classList.add('hidden');
    }
    
    closeSidebar() {
        document.getElementById('info-sidebar').classList.add('hidden');
    }
    
    showCountryInfo(countryId, pos) {
        const sidebar = document.getElementById('info-sidebar');
        const title = document.getElementById('sidebar-title');
        
        title.innerHTML = `<div class="flex items-center gap-2">${countryId.toUpperCase()}</div>`;
        
        document.getElementById('sidebar-leader').innerText = 'Лидер';
        document.getElementById('sidebar-ideology').innerText = 'Идеология';
        document.getElementById('sidebar-pop').innerText = '—';
        document.getElementById('sidebar-factories').innerText = '—';
        document.getElementById('sidebar-buildings').innerText = '—';
        
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
