// ui.js — пользовательский интерфейс

import { 
    getMyCountryId, getPlayerResources, getBuildingQueue, 
    getWars, getAlliances, getTech, getActiveResearch, 
    getActiveFocus, getCompletedFocuses, getUnits, getGameSpeed 
} from './game.js';
import { UNIT_STATS, BUILDING_STATS, TECH_TREE, COUNTRIES } from './data.js';
import { 
    getCountryInfo, getCellData, calculateCountryStats, 
    isAtWar, areAllies, getEnemiesOf, getAlliesOf, addNotification 
} from './utils.js';
import { declareWar, proposeAlliance, kickFromAlliance, callToWar } from './diplomacy.js';

// ========== ГЛОБАЛЬНЫЕ ФУНКЦИИ ДЛЯ ONCLICK ==========

window.startResearch = async (type, level) => {
    const { startResearch } = await import('./tech.js');
    startResearch(type, level);
    openWindow('research');
};

window.startFocus = async (focusId) => {
    const { startFocus } = await import('./focuses.js');
    startFocus(focusId);
    openWindow('focus');
};

window.selectUnitForMove = (unitId) => {
    import('./game.js').then(m => {
        m.setSelectedUnitId(unitId);
        closeWindow();
        showHint('Выберите цель для движения юнита');
        document.getElementById('order-hint')?.classList.remove('hidden');
        setTimeout(() => {
            document.getElementById('order-hint')?.classList.add('hidden');
        }, 10000);
    });
};

window.recruitUnit = (type) => {
    closeWindow();
    window._recruitMode = type;
    showHint(`Выберите провинцию для развертывания ${UNIT_STATS[type]?.icon} ${UNIT_STATS[type]?.name}`);
    document.getElementById('recruit-hint')?.classList.remove('hidden');
    setTimeout(() => {
        document.getElementById('recruit-hint')?.classList.add('hidden');
        window._recruitMode = null;
    }, 15000);
};

window.selectBuildType = async (type) => {
    const stats = BUILDING_STATS[type];
    const resources = getPlayerResources();
    
    if (resources.equipment < stats.costEquipment) {
        addNotification(`Недостаточно снаряжения! Нужно ${stats.costEquipment} 🔫`, 'war');
        return;
    }
    
    closeWindow();
    window._pendingBuild = type;
    showHint(`Выберите провинцию для строительства ${stats.icon} ${stats.name}`);
    document.getElementById('build-hint')?.classList.remove('hidden');
    setTimeout(() => {
        document.getElementById('build-hint')?.classList.add('hidden');
        window._pendingBuild = null;
    }, 15000);
};

window.declareWarOn = (id) => {
    declareWar(id);
    const sidebar = document.getElementById('info-sidebar');
    if (sidebar) sidebar.classList.add('hidden');
};

window.proposeAlly = (id) => {
    proposeAlliance(id);
    const sidebar = document.getElementById('info-sidebar');
    if (sidebar) sidebar.classList.add('hidden');
};

window.callToWar = callToWar;
window.kickAlly = kickFromAlliance;

// ========== УПРАВЛЕНИЕ ОКНАМИ ==========

export function openWindow(tab) {
    const win = document.getElementById('info-window');
    const title = document.getElementById('window-title');
    const content = document.getElementById('window-content');
    
    if (!win || !title || !content) return;
    
    win.classList.remove('hidden');
    
    switch(tab) {
        case 'army':
            title.innerText = '🎖️ АРМИЯ';
            renderArmyWindow(content);
            break;
        case 'research':
            title.innerText = '🔬 ТЕХНОЛОГИИ';
            renderResearchWindow(content);
            break;
        case 'focus':
            title.innerText = '⭐ НАЦИОНАЛЬНЫЕ ФОКУСЫ';
            renderFocusWindow(content);
            break;
        case 'diplomacy':
            title.innerText = '🤝 ДИПЛОМАТИЯ';
            renderDiplomacyWindow(content);
            break;
        case 'build':
            title.innerText = '🏗️ СТРОИТЕЛЬСТВО';
            renderBuildWindow(content);
            break;
    }
}

export function closeWindow() {
    document.getElementById('info-window')?.classList.add('hidden');
}

export function showHint(text) {
    const hint = document.getElementById('hint');
    const hintText = document.getElementById('hint-text');
    if (hint && hintText) {
        hintText.innerText = text;
        hint.classList.remove('hidden');
    }
}

export function hideHint() {
    document.getElementById('hint')?.classList.add('hidden');
}

// ========== ВЕРХНЯЯ ПАНЕЛЬ ==========

export function updateTopBar() {
    const myCountryId = getMyCountryId();
    if (!myCountryId) return;
    
    const resources = getPlayerResources();
    const gridData = window._gridData || {};
    const cellStats = window._cellStats || {};
    
    const stats = calculateCountryStats(myCountryId, gridData, cellStats);
    resources.factories = stats.totalFactories;
    
    const totalManpower = stats.totalPop * 0.05;
    const usedManpower = (getUnits() || [])
        .filter(u => u.owner === myCountryId)
        .reduce((acc, u) => acc + (UNIT_STATS[u.type]?.costManpower || 1000), 0);
    
    const countryNameElem = document.getElementById('country-name');
    const manpowerElem = document.getElementById('val-manpower');
    const factoriesElem = document.getElementById('val-factories');
    const equipmentElem = document.getElementById('val-equipment');
    
    if (countryNameElem) countryNameElem.innerText = getCountryInfo(myCountryId).name;
    if (manpowerElem) manpowerElem.innerText = Math.floor(Math.max(0, totalManpower - usedManpower)).toLocaleString();
    if (factoriesElem) factoriesElem.innerText = stats.totalFactories;
    if (equipmentElem) equipmentElem.innerText = Math.floor(resources.equipment || 0).toLocaleString();
}

// ========== БОКОВАЯ ПАНЕЛЬ ==========

export function showCountryInfo(countryId, posKey) {
    const info = getCountryInfo(countryId);
    const cellStats = window._cellStats || {};
    const cell = getCellData(posKey, cellStats);
    const myId = getMyCountryId();
    const wars = getWars();
    const alliances = getAlliances();
    
    const sidebar = document.getElementById('info-sidebar');
    if (!sidebar) return;
    
    // Заполняем данные
    document.getElementById('sidebar-title').innerText = info.name;
    document.getElementById('sidebar-leader').innerText = info.leader;
    document.getElementById('sidebar-ideology').innerText = info.ideology;
    document.getElementById('sidebar-pop').innerText = (cell.population || 0).toLocaleString();
    document.getElementById('sidebar-factories').innerText = cell.factories || 0;
    
    // Постройки
    const buildings = [];
    if (cell.factories > 0) {
        buildings.push(`🏭 Заводы: ${cell.factories}`);
    }
    if (cell.buildings && cell.buildings.includes('port')) {
        buildings.push('⚓ Порт');
    }
    document.getElementById('sidebar-buildings').innerText = buildings.length > 0 ? buildings.join(' | ') : 'Нет построек';
    
    // Действия
    const actionsDiv = document.getElementById('sidebar-actions');
    
    if (countryId !== myId && myId) {
        actionsDiv.classList.remove('hidden');
        const atWar = isAtWar(myId, countryId, wars);
        const allied = areAllies(myId, countryId, alliances);
        
        let actionsHtml = '';
        
        if (!atWar) {
            actionsHtml += `
                <button onclick="window.declareWarOn('${countryId}')" 
                    class="w-full bg-red-700 hover:bg-red-600 py-2.5 text-sm font-bold rounded mb-2 transition-colors">
                    ⚔️ ОБЪЯВИТЬ ВОЙНУ
                </button>
            `;
        } else {
            actionsHtml += `
                <div class="text-red-500 text-sm text-center mb-2 py-2 bg-red-900/30 rounded border border-red-800">
                    ⚔️ В СОСТОЯНИИ ВОЙНЫ
                </div>
            `;
        }
        
        if (!atWar && !allied) {
            actionsHtml += `
                <button onclick="window.proposeAlly('${countryId}')" 
                    class="w-full bg-emerald-700 hover:bg-emerald-600 py-2.5 text-sm font-bold rounded transition-colors">
                    🤝 ПРЕДЛОЖИТЬ АЛЬЯНС
                </button>
            `;
        } else if (allied) {
            actionsHtml += `
                <div class="text-emerald-400 text-sm text-center mb-2 py-2 bg-emerald-900/30 rounded border border-emerald-800">
                    🤝 В АЛЬЯНСЕ
                </div>
            `;
        }
        
        actionsDiv.innerHTML = actionsHtml;
    } else if (countryId === myId) {
        actionsDiv.classList.remove('hidden');
        actionsDiv.innerHTML = `
            <div class="text-yellow-400 text-sm text-center py-3 bg-yellow-900/20 rounded border border-yellow-800/50">
                ⭐ Это ваша страна
            </div>
        `;
    } else {
        actionsDiv.classList.add('hidden');
    }
    
    sidebar.classList.remove('hidden');
}

// ========== ОКНО АРМИИ ==========

function renderArmyWindow(content) {
    const myId = getMyCountryId();
    const units = (getUnits() || []).filter(u => u.owner === myId);
    const resources = getPlayerResources();
    
    let html = `
        <div class="space-y-4">
            <!-- Ресурсы -->
            <div class="resources-grid">
                <div class="resource-card">
                    <div class="resource-icon">🔫</div>
                    <div class="resource-value">${Math.floor(resources.equipment || 0).toLocaleString()}</div>
                    <div class="resource-label">СНАРЯЖЕНИЕ</div>
                </div>
                <div class="resource-card">
                    <div class="resource-icon">👥</div>
                    <div class="resource-value">${Math.floor(resources.manpower || 0).toLocaleString()}</div>
                    <div class="resource-label">ЛЮДСКИЕ РЕЗЕРВЫ</div>
                </div>
                <div class="resource-card">
                    <div class="resource-icon">🏭</div>
                    <div class="resource-value">${resources.factories || 0}</div>
                    <div class="resource-label">ЗАВОДЫ</div>
                </div>
            </div>
            
            <!-- Набор войск -->
            <div class="section">
                <div class="section-title">🆕 НАБОР ВОЙСК</div>
                <div class="space-y-2">
                    ${Object.entries(UNIT_STATS).map(([key, u]) => {
                        const canAfford = (resources.equipment || 0) >= u.costEquipment;
                        return `
                            <div class="recruit-card ${!canAfford ? 'opacity-50' : ''}">
                                <div class="recruit-info">
                                    <div class="recruit-header">
                                        <span class="recruit-icon">${u.icon}</span>
                                        <span class="recruit-name">${u.name}</span>
                                    </div>
                                    <div class="recruit-stats">
                                        <span>⚔️ ${u.attack}</span>
                                        <span>🛡️ ${u.defense}</span>
                                        <span>❤️ ${u.hp}</span>
                                        ${u.armor > 0 ? `<span>🛡️+ ${u.armor}</span>` : ''}
                                    </div>
                                    <div class="recruit-cost">
                                        <span>💰 ${u.costEquipment} 🔫</span>
                                        <span>👥 ${u.costManpower} чел</span>
                                    </div>
                                </div>
                                <button onclick="window.recruitUnit('${key}')" 
                                    class="btn-recruit ${canAfford ? 'btn-active' : 'btn-disabled'}"
                                    ${!canAfford ? 'disabled' : ''}>
                                    НАБРАТЬ
                                </button>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
            
            <!-- Мои войска -->
            <div class="section">
                <div class="section-title">⚔️ МОИ ВОЙСКА (${units.length})</div>
                <div class="space-y-2 max-h-60 overflow-y-auto">
                    ${units.length === 0 ? 
                        '<div class="text-center text-gray-500 py-8 italic">Нет войск. Наберите новые дивизии!</div>' : 
                        units.map(u => {
                            const stats = UNIT_STATS[u.type];
                            const hpPercent = stats ? Math.max(0, (u.hp || 0) / stats.hp * 100) : 100;
                            const statusColor = u.trainingDaysLeft > 0 ? 'text-yellow-400' : 'text-green-400';
                            const statusText = u.trainingDaysLeft > 0 ? `Тренировка: ${u.trainingDaysLeft} дн.` : 'Готов';
                            
                            return `
                                <div class="unit-card-item">
                                    <div class="unit-card-header">
                                        <div class="unit-card-info">
                                            <span class="unit-icon">${stats?.icon || '❓'}</span>
                                            <div>
                                                <div class="unit-name">${stats?.name || u.type}</div>
                                                <div class="unit-status ${statusColor}">${statusText}</div>
                                            </div>
                                        </div>
                                        <button onclick="window.selectUnitForMove('${u.id}')" 
                                            class="btn-select">
                                            ВЫБРАТЬ
                                        </button>
                                    </div>
                                    <div class="unit-hp-bar">
                                        <div class="hp-bar-bg">
                                            <div class="hp-bar-fill" style="width: ${hpPercent}%"></div>
                                        </div>
                                        <span class="hp-text">${Math.floor(u.hp || 0)}/${stats?.hp || 100}</span>
                                    </div>
                                </div>
                            `;
                        }).join('')
                    }
                </div>
            </div>
        </div>
    `;
    
    content.innerHTML = html;
}

// ========== ОКНО СТРОИТЕЛЬСТВА ==========

function renderBuildWindow(content) {
    const resources = getPlayerResources();
    const queue = getBuildingQueue();
    
    let html = `
        <div class="space-y-4">
            <!-- Ресурсы -->
            <div class="resource-bar">
                <span>🔫 Доступно снаряжения:</span>
                <span class="text-yellow-400 font-bold">${Math.floor(resources.equipment || 0).toLocaleString()}</span>
            </div>
    `;
    
    // Активная стройка
    if (queue.length > 0) {
        const current = queue[0];
        const stats = BUILDING_STATS[current.type];
        const progress = stats ? ((stats.buildTime - (current.daysLeft || 0)) / stats.buildTime) * 100 : 0;
        
        html += `
            <div class="construction-active">
                <div class="construction-header">
                    <span>🏗️ СТРОИТСЯ: ${stats?.name || current.type}</span>
                    <span class="construction-days">${current.daysLeft || 0} дн.</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill-blue" style="width: ${progress}%"></div>
                </div>
            </div>
        `;
    }
    
    // Доступные постройки
    html += `
            <div class="section-title">📦 ДОСТУПНЫЕ ПОСТРОЙКИ</div>
            <div class="space-y-2">
                ${Object.entries(BUILDING_STATS).map(([key, b]) => {
                    const canAfford = (resources.equipment || 0) >= b.costEquipment;
                    return `
                        <div class="build-card ${!canAfford ? 'opacity-50' : ''}">
                            <div class="build-info">
                                <span class="build-icon">${b.icon}</span>
                                <div>
                                    <div class="build-name">${b.name}</div>
                                    <div class="build-cost">💰 ${b.costEquipment} 🔫</div>
                                </div>
                            </div>
                            <button onclick="window.selectBuildType('${key}')" 
                                class="btn-build ${canAfford ? 'btn-active' : 'btn-disabled'}"
                                ${!canAfford ? 'disabled' : ''}>
                                ПОСТРОИТЬ
                            </button>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
    
    content.innerHTML = html;
}

// ========== ОКНО ДИПЛОМАТИИ ==========

function renderDiplomacyWindow(content) {
    const myId = getMyCountryId();
    const allies = getAlliesOf(myId, getAlliances());
    const enemies = getEnemiesOf(myId, getWars());
    
    let html = `
        <div class="space-y-4">
            <!-- Союзники -->
            <div class="diplo-section">
                <div class="diplo-title diplo-allies">🤝 СОЮЗНИКИ</div>
                ${allies.length === 0 ? 
                    '<div class="diplo-empty">Нет союзников. Используйте ПКМ по стране на карте чтобы предложить альянс.</div>' : 
                    allies.map(a => `
                        <div class="diplo-card">
                            <div>
                                <div class="diplo-country">${getCountryInfo(a).name}</div>
                                <div class="diplo-ideology">${getCountryInfo(a).ideology}</div>
                            </div>
                            <div class="diplo-actions">
                                <button onclick="window.callToWar('${a}')" class="btn-small btn-red">ПРИЗВАТЬ НА ВОЙНУ</button>
                                <button onclick="window.kickAlly('${a}')" class="btn-small btn-gray">ИСКЛЮЧИТЬ</button>
                            </div>
                        </div>
                    `).join('')
                }
            </div>
            
            <!-- Войны -->
            <div class="diplo-section">
                <div class="diplo-title diplo-enemies">⚔️ ВОЙНЫ</div>
                ${enemies.length === 0 ? 
                    '<div class="diplo-empty">Мирное время</div>' : 
                    enemies.map(e => `
                        <div class="diplo-card enemy-card">
                            <div>
                                <div class="diplo-country">${getCountryInfo(e).name}</div>
                                <div class="diplo-ideology">${getCountryInfo(e).ideology}</div>
                            </div>
                            <div class="diplo-status-war">⚔️ ВОЙНА</div>
                        </div>
                    `).join('')
                }
            </div>
        </div>
    `;
    
    content.innerHTML = html;
}

// ========== ОКНО ТЕХНОЛОГИЙ ==========

function renderResearchWindow(content) {
    import('./tech.js').then(m => m.updateResearchUI());
}

// ========== ОКНО ФОКУСОВ ==========

function renderFocusWindow(content) {
    import('./focuses.js').then(m => m.updateFocusUI());
}
