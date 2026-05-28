// Windows.js — Все игровые окна

import { UNIT_STATS, BUILDING_STATS } from '../data/Units.js';
import { getCountryInfo } from '../utils/helpers.js';

export class WindowsManager {
    constructor(world, entities, gameState) {
        this.world = world;
        this.entities = entities;
        this.gameState = gameState;
    }
    
    renderArmyWindow(content) {
        const myId = this.gameState.myCountryId;
        const units = this.entities.getEntitiesByOwner(myId);
        const resources = this.gameState;
        
        let html = `
            <div class="space-y-4">
                <div class="resources-grid">
                    <div class="resource-card">
                        <div class="resource-icon">🔫</div>
                        <div class="resource-value">${Math.floor(resources.equipment).toLocaleString()}</div>
                        <div class="resource-label">СНАРЯЖЕНИЕ</div>
                    </div>
                    <div class="resource-card">
                        <div class="resource-icon">👥</div>
                        <div class="resource-value">${Math.floor(resources.manpower).toLocaleString()}</div>
                        <div class="resource-label">ЛЮДСКИЕ РЕЗЕРВЫ</div>
                    </div>
                    <div class="resource-card">
                        <div class="resource-icon">🏭</div>
                        <div class="resource-value">${resources.factories}</div>
                        <div class="resource-label">ЗАВОДЫ</div>
                    </div>
                </div>
                
                <div class="section">
                    <div class="section-title">🆕 НАБОР ВОЙСК</div>
                    <div class="space-y-2">
                        ${Object.entries(UNIT_STATS).map(([key, u]) => {
                            const canAfford = resources.equipment >= u.costEquipment;
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
                
                <div class="section">
                    <div class="section-title">⚔️ МОИ ВОЙСКА (${units.length})</div>
                    <div class="space-y-2 max-h-60 overflow-y-auto">
                        ${units.length === 0 ? 
                            '<div class="text-center text-gray-500 py-8 italic">Нет войск. Наберите новые дивизии!</div>' : 
                            units.map(uId => {
                                const type = this.entities.type[uId];
                                const stats = UNIT_STATS[type === 0 ? 'infantry' : 'tank'];
                                const hpPercent = (this.entities.hp[uId] / this.entities.maxHp[uId]) * 100;
                                const status = this.entities.training[uId] > 0 ? `Тренировка: ${this.entities.training[uId]} дн.` : 
                                              this.entities.inCombat[uId] ? '⚔️ В бою' : 'Готов';
                                const statusColor = this.entities.training[uId] > 0 ? 'text-yellow-400' : 
                                                   this.entities.inCombat[uId] ? 'text-red-400' : 'text-green-400';
                                
                                return `
                                    <div class="unit-card-item">
                                        <div class="unit-card-header">
                                            <div class="unit-card-info">
                                                <span class="unit-icon">${stats.icon}</span>
                                                <div>
                                                    <div class="unit-name">${stats.name}</div>
                                                    <div class="unit-status ${statusColor}">${status}</div>
                                                </div>
                                            </div>
                                            <button onclick="window.selectUnitForMove('${uId}')" 
                                                class="btn-select" ${this.entities.inCombat[uId] ? 'disabled' : ''}>
                                                ${this.entities.inCombat[uId] ? '🔒' : 'ВЫБРАТЬ'}
                                            </button>
                                        </div>
                                        <div class="unit-hp-bar">
                                            <div class="hp-bar-bg">
                                                <div class="hp-bar-fill" style="width: ${hpPercent}%"></div>
                                            </div>
                                            <span class="hp-text">${Math.floor(this.entities.hp[uId])}/${this.entities.maxHp[uId]}</span>
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
    
    renderResearchWindow(content) {
        const tech = this.gameState.tech;
        
        let html = `
            <div class="space-y-4">
                <div class="section-title">🔬 ДЕРЕВО ТЕХНОЛОГИЙ</div>
                <div class="space-y-3">
                    <div class="bg-gray-700 p-4 rounded-lg border-l-4 border-blue-500">
                        <div class="flex justify-between items-center mb-2">
                            <span class="font-bold text-blue-400">🏭 Промышленность</span>
                            <span class="text-sm">Уровень ${tech.industry}/5</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill-blue" style="width: ${tech.industry * 20}%"></div>
                        </div>
                        <div class="text-xs text-gray-400 mt-2">+5% производство за уровень</div>
                        ${tech.industry < 5 ? `<button onclick="window.startResearch('industry', ${tech.industry + 1})" class="mt-3 bg-blue-700 hover:bg-blue-600 px-3 py-1 text-xs rounded">ИССЛЕДОВАТЬ УР.${tech.industry + 1}</button>` : '<div class="text-green-400 text-xs mt-3">✅ Максимальный уровень</div>'}
                    </div>
                    
                    <div class="bg-gray-700 p-4 rounded-lg border-l-4 border-green-500">
                        <div class="flex justify-between items-center mb-2">
                            <span class="font-bold text-green-400">💂 Пехота</span>
                            <span class="text-sm">Уровень ${tech.infantry}/5</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill-blue" style="width: ${tech.infantry * 20}%"></div>
                        </div>
                        <div class="text-xs text-gray-400 mt-2">+5% атака/защита пехоты за уровень</div>
                        ${tech.infantry < 5 ? `<button onclick="window.startResearch('infantry', ${tech.infantry + 1})" class="mt-3 bg-blue-700 hover:bg-blue-600 px-3 py-1 text-xs rounded">ИССЛЕДОВАТЬ УР.${tech.infantry + 1}</button>` : '<div class="text-green-400 text-xs mt-3">✅ Максимальный уровень</div>'}
                    </div>
                    
                    <div class="bg-gray-700 p-4 rounded-lg border-l-4 border-yellow-500">
                        <div class="flex justify-between items-center mb-2">
                            <span class="font-bold text-yellow-400">🚜 Танки</span>
                            <span class="text-sm">Уровень ${tech.tank}/5</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill-blue" style="width: ${tech.tank * 20}%"></div>
                        </div>
                        <div class="text-xs text-gray-400 mt-2">+5% атака/защита танков за уровень</div>
                        ${tech.tank < 5 ? `<button onclick="window.startResearch('tank', ${tech.tank + 1})" class="mt-3 bg-blue-700 hover:bg-blue-600 px-3 py-1 text-xs rounded">ИССЛЕДОВАТЬ УР.${tech.tank + 1}</button>` : '<div class="text-green-400 text-xs mt-3">✅ Максимальный уровень</div>'}
                    </div>
                </div>
            </div>
        `;
        
        content.innerHTML = html;
    }
    
    renderFocusWindow(content) {
        const focuses = {
            germany: [
                { id: 'ger_rearm', name: 'Перевооружение', desc: '+1000 снаряжения', icon: '🔫' },
                { id: 'ger_danzig', name: 'Данциг или война', desc: 'Война с Польшей', icon: '⚔️' },
                { id: 'ger_axis', name: 'Создать Ось', desc: 'Альянс с Италией', icon: '🤝' },
                { id: 'ger_west', name: 'Западный поход', desc: 'Война с Францией', icon: '🗺️' }
            ],
            ussr: [
                { id: 'ussr_five_year', name: 'Пятилетний план', desc: '+5 заводов', icon: '🏭' },
                { id: 'ussr_fin_war', name: 'Зимняя война', desc: 'Война с Финляндией', icon: '❄️' },
                { id: 'ussr_defense', name: 'Великая Отечественная', desc: '+6 дивизий', icon: '🛡️' }
            ]
        };
        
        const myId = this.gameState.myCountryId;
        const countryFocuses = focuses[myId] || [];
        const completed = this.gameState.completedFocuses;
        const activeFocus = this.gameState.activeFocus;
        
        let html = `
            <div class="space-y-3">
                <div class="section-title">⭐ НАЦИОНАЛЬНЫЕ ФОКУСЫ</div>
                <div class="focus-tree">
                    ${countryFocuses.map(focus => {
                        const isCompleted = completed.has(focus.id);
                        const isActive = activeFocus && activeFocus.id === focus.id;
                        const isAvailable = !isCompleted && !isActive;
                        
                        return `
                            <div class="focus-card ${isCompleted ? 'completed' : isActive ? 'active' : 'available'}" 
                                 onclick="${isAvailable ? `window.startFocus('${focus.id}')` : ''}">
                                <div class="focus-icon">${focus.icon}</div>
                                <div class="focus-info">
                                    <div class="focus-name">${focus.name}</div>
                                    <div class="focus-desc">${focus.desc}</div>
                                </div>
                                ${isActive ? `<div class="focus-progress"><div class="progress-fill" style="width: ${((70 - activeFocus.daysLeft) / 70) * 100}%"></div></div>` : ''}
                                ${isCompleted ? '<div class="focus-check">✓</div>' : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
                ${activeFocus ? `
                    <div class="bg-yellow-900/30 border border-yellow-500 p-3 rounded mt-3">
                        <div class="flex items-center gap-2">
                            <span class="text-yellow-500 font-bold">⚡ ${activeFocus.name}</span>
                            <span class="text-xs text-gray-400">(${activeFocus.daysLeft} дн.)</span>
                        </div>
                        <div class="progress-bar mt-2">
                            <div class="progress-fill" style="width: ${((70 - activeFocus.daysLeft) / 70) * 100}%"></div>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
        
        content.innerHTML = html;
    }
    
    renderDiplomacyWindow(content) {
        const myId = this.gameState.myCountryId;
        const allies = [];
        const enemies = [];
        
        for (const war of this.gameState.wars) {
            if (war.a === myId) enemies.push(war.b);
            if (war.b === myId) enemies.push(war.a);
        }
        
        for (const alliance of this.gameState.alliances) {
            if (alliance.has(myId)) {
                for (const id of alliance) {
                    if (id !== myId) allies.push(id);
                }
            }
        }
        
        let html = `
            <div class="space-y-4">
                <div class="diplo-section">
                    <div class="diplo-title diplo-allies">🤝 СОЮЗНИКИ (${allies.length})</div>
                    ${allies.length === 0 ? 
                        '<div class="diplo-empty">Нет союзников. ПКМ по стране на карте чтобы предложить альянс.</div>' : 
                        allies.map(a => `
                            <div class="diplo-card">
                                <div>
                                    <div class="diplo-country">${a.toUpperCase()}</div>
                                    <div class="diplo-ideology">—</div>
                                </div>
                                <div class="diplo-actions">
                                    <button onclick="window.callToWar('${a}')" class="btn-small btn-red">ПРИЗВАТЬ</button>
                                    <button onclick="window.kickAlly('${a}')" class="btn-small btn-gray">ИСКЛЮЧИТЬ</button>
                                </div>
                            </div>
                        `).join('')
                    }
                </div>
                
                <div class="diplo-section">
                    <div class="diplo-title diplo-enemies">⚔️ ВРАГИ (${enemies.length})</div>
                    ${enemies.length === 0 ? 
                        '<div class="diplo-empty">Мирное время</div>' : 
                        enemies.map(e => `
                            <div class="diplo-card enemy-card">
                                <div>
                                    <div class="diplo-country">${e.toUpperCase()}</div>
                                    <div class="diplo-ideology">—</div>
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
    
    renderBuildWindow(content) {
        const resources = this.gameState;
        
        let html = `
            <div class="space-y-4">
                <div class="resource-bar">
                    <span>🔫 Доступно снаряжения:</span>
                    <span class="text-yellow-400 font-bold">${Math.floor(resources.equipment).toLocaleString()}</span>
                </div>
                
                <div class="section-title">📦 ДОСТУПНЫЕ ПОСТРОЙКИ</div>
                <div class="space-y-2">
                    <div class="build-card">
                        <div class="build-info">
                            <span class="build-icon">🏭</span>
                            <div>
                                <div class="build-name">Военный завод</div>
                                <div class="build-cost">💰 500 🔫 | 135 дней</div>
                            </div>
                        </div>
                        <button onclick="window.selectBuildType('factory')" 
                            class="btn-build ${resources.equipment >= 500 ? 'btn-active' : 'btn-disabled'}"
                            ${resources.equipment < 500 ? 'disabled' : ''}>
                            ПОСТРОИТЬ
                        </button>
                    </div>
                    <div class="build-card">
                        <div class="build-info">
                            <span class="build-icon">⚓</span>
                            <div>
                                <div class="build-name">Морской порт</div>
                                <div class="build-cost">💰 300 🔫 | 90 дней</div>
                            </div>
                        </div>
                        <button onclick="window.selectBuildType('port')" 
                            class="btn-build ${resources.equipment >= 300 ? 'btn-active' : 'btn-disabled'}"
                            ${resources.equipment < 300 ? 'disabled' : ''}>
                            ПОСТРОИТЬ
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        content.innerHTML = html;
    }
    
    renderCommandersWindow(content) {
        const myId = this.gameState.myCountryId;
        const units = this.entities.getEntitiesByOwner(myId);
        
        let html = `
            <div class="space-y-4">
                <button onclick="window.createArmy()" class="bg-emerald-700 hover:bg-emerald-600 px-4 py-2 text-sm rounded font-bold w-full">
                    🆕 СОЗДАТЬ АРМИЮ
                </button>
                <div class="text-center text-gray-500 py-4">
                    Система армий в разработке...
                    <div class="text-xs mt-2">Выберите юнитов в окне АРМИЯ, затем создайте армию</div>
                </div>
            </div>
        `;
        
        content.innerHTML = html;
    }
    
    renderSaveWindow(content) {
        let html = `
            <div class="space-y-4">
                <div class="flex gap-2">
                    <button onclick="window.quickSave()" class="bg-emerald-700 hover:bg-emerald-600 px-4 py-2 text-sm rounded font-bold flex-1">💾 СОХРАНИТЬ</button>
                    <button onclick="window.quickLoad()" class="bg-blue-700 hover:bg-blue-600 px-4 py-2 text-sm rounded font-bold flex-1">📂 ЗАГРУЗИТЬ</button>
                </div>
                <div class="text-center text-gray-500 text-sm">
                    Автосохранение каждые 30 дней
                </div>
            </div>
        `;
        
        content.innerHTML = html;
    }
}
