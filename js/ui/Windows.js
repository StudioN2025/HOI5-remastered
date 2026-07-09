// Windows.js — Все игровые окна

import { UNIT_STATS, BUILDING_STATS } from '../data/Units.js';
import { getCountryInfo } from '../utils/helpers.js';

export class WindowsManager {
    constructor(world, entities, gameState, techSystem) {
        this.world = world;
        this.entities = entities;
        this.gameState = gameState;
        this.tech = techSystem;
    }
    
    renderArmyWindow(content) {
        const myId = this.gameState.myCountryId;
        if (!myId) {
            content.innerHTML = '<div class="text-center text-gray-400 py-8">Выберите страну</div>';
            return;
        }
        
        const units = this.entities.getEntitiesByOwner(myId);
        const resources = this.gameState;
        
        let html = `
            <div class="space-y-4">
                <div class="resources-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px;">
                    <div class="resource-card" style="background:#374151;padding:12px;border-radius:8px;text-align:center;">
                        <div class="resource-icon" style="font-size:24px;">🔫</div>
                        <div class="resource-value" style="font-size:18px;font-weight:bold;color:#eab308;">${Math.floor(resources.equipment).toLocaleString()}</div>
                        <div class="resource-label" style="font-size:9px;color:#9ca3af;">СНАРЯЖЕНИЕ</div>
                    </div>
                    <div class="resource-card" style="background:#374151;padding:12px;border-radius:8px;text-align:center;">
                        <div class="resource-icon" style="font-size:24px;">👥</div>
                        <div class="resource-value" style="font-size:18px;font-weight:bold;color:#eab308;">${Math.floor(resources.manpower).toLocaleString()}</div>
                        <div class="resource-label" style="font-size:9px;color:#9ca3af;">ЛЮДСКИЕ РЕЗЕРВЫ</div>
                    </div>
                    <div class="resource-card" style="background:#374151;padding:12px;border-radius:8px;text-align:center;">
                        <div class="resource-icon" style="font-size:24px;">🏭</div>
                        <div class="resource-value" style="font-size:18px;font-weight:bold;color:#eab308;">${resources.factories || 0}</div>
                        <div class="resource-label" style="font-size:9px;color:#9ca3af;">ЗАВОДЫ</div>
                    </div>
                </div>
                
                <div class="section">
                    <div class="section-title" style="font-size:14px;font-weight:bold;color:#eab308;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #374151;">🆕 НАБОР ВОЙСК</div>
                    <div class="space-y-2">
                        ${Object.entries(UNIT_STATS).map(([key, u]) => {
                            const canAfford = resources.equipment >= u.costEquipment;
                            return `
                                <div class="recruit-card" style="background:#374151;padding:12px;border-radius:8px;border-left:4px solid #eab308;display:flex;justify-content:space-between;align-items:center;gap:12px;${!canAfford ? 'opacity-50' : ''}">
                                    <div class="recruit-info" style="flex:1;">
                                        <div class="recruit-header" style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                                            <span class="recruit-icon" style="font-size:24px;">${u.icon}</span>
                                            <span class="recruit-name" style="font-weight:bold;">${u.name}</span>
                                        </div>
                                        <div class="recruit-stats" style="display:flex;gap:12px;font-size:11px;color:#d1d5db;flex-wrap:wrap;">
                                            <span>⚔️ ${u.attack}</span>
                                            <span>🛡️ ${u.defense}</span>
                                            <span>❤️ ${u.hp}</span>
                                            ${u.armor > 0 ? `<span>🛡️+ ${u.armor}</span>` : ''}
                                        </div>
                                        <div class="recruit-cost" style="display:flex;gap:12px;font-size:10px;color:#9ca3af;margin-top:4px;">
                                            <span>💰 ${u.costEquipment} 🔫</span>
                                            <span>👥 ${u.costManpower} чел</span>
                                        </div>
                                    </div>
                                    <button onclick="window.recruitUnit('${key}')" 
                                        class="btn-recruit" style="padding:8px 16px;border-radius:6px;font-size:11px;font-weight:bold;background:${canAfford ? '#15803d' : '#4b5563'};color:white;cursor:${canAfford ? 'pointer' : 'not-allowed'};"
                                        ${!canAfford ? 'disabled' : ''}>
                                        НАБРАТЬ
                                    </button>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
                
                <div class="section">
                    <div class="section-title" style="font-size:14px;font-weight:bold;color:#eab308;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #374151;">⚔️ МОИ ВОЙСКА (${units.length})</div>
                    <div class="space-y-2" style="max-height:300px;overflow-y:auto;">
                        ${units.length === 0 ? 
                            '<div class="text-center text-gray-500 py-8 italic">Нет войск. Наберите новые дивизии!</div>' : 
                            units.map(uId => {
                                const type = this.entities.type[uId];
                                const stats = UNIT_STATS[type === 0 ? 'infantry' : 'tank'];
                                const hpPercent = (this.entities.hp[uId] / this.entities.maxHp[uId]) * 100;
                                const status = this.entities.training[uId] > 0 ? `Тренировка: ${this.entities.training[uId]} дн.` : 
                                              this.entities.inCombat[uId] ? '⚔️ В бою' : 'Готов';
                                const statusColor = this.entities.training[uId] > 0 ? '#eab308' : 
                                                   this.entities.inCombat[uId] ? '#ef4444' : '#22c55e';
                                
                                return `
                                    <div class="unit-card-item" style="background:#374151;padding:12px;border-radius:8px;border-left:4px solid #3b82f6;">
                                        <div class="unit-card-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                                            <div class="unit-card-info" style="display:flex;align-items:center;gap:8px;">
                                                <span class="unit-icon" style="font-size:24px;">${stats.icon}</span>
                                                <div>
                                                    <div class="unit-name" style="font-weight:bold;font-size:14px;">${stats.name}</div>
                                                    <div class="unit-status" style="font-size:10px;color:${statusColor};">${status}</div>
                                                </div>
                                            </div>
                                            <button onclick="window.selectUnitForMove('${uId}')" 
                                                class="btn-select" style="padding:6px 12px;border-radius:4px;font-size:10px;font-weight:bold;background:#2563eb;color:white;cursor:pointer;${this.entities.inCombat[uId] ? 'opacity-50' : ''}" ${this.entities.inCombat[uId] ? 'disabled' : ''}>
                                                ${this.entities.inCombat[uId] ? '🔒' : 'ВЫБРАТЬ'}
                                            </button>
                                        </div>
                                        <div class="unit-hp-bar" style="display:flex;align-items:center;gap:8px;">
                                            <div class="hp-bar-bg" style="flex:1;height:6px;background:#4b5563;border-radius:3px;overflow:hidden;">
                                                <div class="hp-bar-fill" style="width: ${hpPercent}%;height:100%;background:#22c55e;"></div>
                                            </div>
                                            <span class="hp-text" style="font-size:10px;color:#9ca3af;min-width:60px;">${Math.floor(this.entities.hp[uId])}/${this.entities.maxHp[uId]}</span>
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
        const techTree = window._TECH_TREE || {};
        const unlocked = this.tech && this.tech.getPlayerTech ? this.tech.getPlayerTech() : new Set();
        const activeResearch = this.tech && this.tech.getPlayerResearch ? this.tech.getPlayerResearch() : null;

        // Позиции нод для каждой ветки (x, y)
        const layouts = {
            industry: { x: 0,   nodes: ['industry_1','mining_1','industry_2','mining_2','industry_3','industry_4','industry_5'] },
            infantry: { x: 170, nodes: ['infantry_1','mountain_1','infantry_2','special_1','infantry_3','infantry_4','infantry_5'] },
            tank:     { x: 340, nodes: ['tank_1','armor_1','tank_2','engine_1','tank_3','tank_4','tank_5'] },
            air:      { x: 510, nodes: ['air_1','air_2','air_3','air_4'] },
            navy:     { x: 650, nodes: ['navy_1','navy_2','navy_3','navy_4'] },
        };

        // Собираем позиции всех нод
        const nodePos = {}; // techId → {x, y}
        const nodeW = 120, nodeH = 60, gapX = 10, gapY = 8;

        for (const [branchId, layout] of Object.entries(layouts)) {
            const bx = layout.x;
            for (let i = 0; i < layout.nodes.length; i++) {
                const tid = layout.nodes[i];
                if (!techTree[tid]) continue;
                nodePos[tid] = { x: bx, y: 50 + i * (nodeH + gapY) };
            }
        }

        // Определяем границы карты
        let maxX = 0, maxY = 0;
        for (const p of Object.values(nodePos)) {
            maxX = Math.max(maxX, p.x + nodeW);
            maxY = Math.max(maxY, p.y + nodeH);
        }
        const mapW = maxX + 20;
        const mapH = maxY + 20;

        // SVG для линий связей
        let svg = `<svg style="position:absolute;top:0;left:0;width:${mapW}px;height:${mapH}px;pointer-events:none;">`;

        for (const t of Object.values(techTree)) {
            if (!nodePos[t.id]) continue;
            for (const preId of t.prereqs) {
                if (!nodePos[preId]) continue;
                const from = nodePos[preId];
                const to = nodePos[t.id];
                const x1 = from.x + nodeW / 2;
                const y1 = from.y + nodeH;
                const x2 = to.x + nodeW / 2;
                const y2 = to.y;

                const preUnlocked = unlocked.has(preId);
                const color = preUnlocked ? '#22c55e' : '#374151';
                svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="2" stroke-dasharray="${preUnlocked ? '' : '4,4'}"/>`;
                // Стрелка
                svg += `<polygon points="${x2-4},${y2-2} ${x2+4},${y2-2} ${x2},${y2+4}" fill="${color}"/>`;
            }
        }
        svg += `</svg>`;

        // Ноды
        let nodes = '';
        for (const [techId, pos] of Object.entries(nodePos)) {
            const t = techTree[techId];
            if (!t) continue;

            const isUnlocked = unlocked.has(techId);
            const canResearch = !isUnlocked && !activeResearch && t.prereqs.every(p => unlocked.has(p));
            const isResearching = activeResearch && activeResearch.techId === techId;

            let bg = '#111827', border = '#374151', text = '#6b7280';
            if (isUnlocked)     { bg = '#052e16'; border = '#22c55e'; text = '#86efac'; }
            if (isResearching)  { bg = '#0c1e3a'; border = '#3b82f6'; text = '#93c5fd'; }
            if (canResearch)    { bg = '#422006'; border = '#eab308'; text = '#fde047'; }

            const click = canResearch ? `onclick="window.startResearch('${techId}')"` : '';
            const hover = canResearch ? 'onmouseover="this.style.transform=\'scale(1.08)\';this.style.boxShadow=\'0 0 12px rgba(234,179,8,0.4)\'" onmouseout="this.style.transform=\'\';this.style.boxShadow=\'\'"' : '';

            nodes += `<div ${click} ${hover} style="position:absolute;left:${pos.x}px;top:${pos.y}px;width:${nodeW}px;height:${nodeH}px;background:${bg};border:2px solid ${border};border-radius:8px;padding:6px;text-align:center;cursor:${canResearch?'pointer':'default'};transition:all 0.15s;${canResearch?'transform:scale(1.02);':''}">`;
            nodes += `<div style="font-size:18px;">${t.icon}</div>`;
            nodes += `<div style="font-size:8px;font-weight:bold;color:${text};line-height:1.2;margin-top:2px;">${t.name}</div>`;
            nodes += `<div style="font-size:7px;color:#6b7280;margin-top:1px;">${t.desc}</div>`;

            if (isUnlocked)     nodes += `<div style="font-size:7px;color:#22c55e;margin-top:2px;">✓</div>`;
            else if (isResearching) nodes += `<div style="font-size:7px;color:#3b82f6;margin-top:2px;">⏳${activeResearch.daysLeft}д</div>`;
            else if (canResearch)   nodes += `<div style="font-size:7px;color:#eab308;margin-top:2px;">🔬${t.cost}д</div>`;
            else                    nodes += `<div style="font-size:7px;color:#4b5563;margin-top:2px;">🔒</div>`;

            nodes += `</div>`;
        }

        // Заголовки веток
        let headers = '';
        const branchInfo = {
            industry: { name: 'ПРОМЫШЛЕННОСТЬ', color: '#3b82f6', icon: '🏭' },
            infantry: { name: 'ПЕХОТА', color: '#22c55e', icon: '💂' },
            tank:     { name: 'ТАНКИ', color: '#eab308', icon: '🚜' },
            air:      { name: 'АВИАЦИЯ', color: '#8b5cf6', icon: '✈️' },
            navy:     { name: 'ФЛОТ', color: '#06b6d4', icon: '⚓' },
        };
        for (const [bid, layout] of Object.entries(layouts)) {
            const bi = branchInfo[bid];
            headers += `<div style="position:absolute;left:${layout.x}px;top:8px;width:${nodeW}px;text-align:center;color:${bi.color};font-size:10px;font-weight:bold;">${bi.icon} ${bi.name}</div>`;
        }

        // Баннер исследования
        let banner = '';
        if (activeResearch) {
            const rt = techTree[activeResearch.techId];
            if (rt) {
                banner = `<div style="background:linear-gradient(90deg,#1e3a5f,#1e293b);border:1px solid #3b82f6;border-radius:8px;padding:8px;margin-bottom:8px;text-align:center;display:flex;align-items:center;justify-content:center;gap:10px;">
                    <span style="font-size:20px;">${rt.icon}</span>
                    <div><div style="color:#60a5fa;font-size:9px;text-transform:uppercase;">Исследуется</div><div style="font-weight:bold;font-size:12px;">${rt.name}</div></div>
                    <div style="background:#1e40af;padding:3px 8px;border-radius:10px;font-size:10px;color:#93c5fd;">${activeResearch.daysLeft} дн.</div>
                </div>`;
            }
        }

        content.innerHTML = `
            ${banner}
            <div style="position:relative;width:${mapW}px;height:${mapH}px;overflow:auto;">
                ${svg}
                ${headers}
                ${nodes}
            </div>
        `;
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
            ],
            france: [
                { id: 'fra_maginot', name: 'Линия Мажино', desc: '+3 завода', icon: '🏰' },
                { id: 'fra_allies', name: 'Антанта', desc: 'Альянс с Англией', icon: '🤝' }
            ]
        };
        
        const myId = this.gameState.myCountryId;
        const countryFocuses = focuses[myId] || [];
        const completed = this.gameState.completedFocuses || new Set();
        const activeFocus = this.gameState.activeFocus;
        
        let html = `
            <div class="space-y-3">
                <div class="section-title" style="font-size:14px;font-weight:bold;color:#eab308;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #374151;">⭐ НАЦИОНАЛЬНЫЕ ФОКУСЫ</div>
                <div class="focus-tree">
                    ${countryFocuses.map(focus => {
                        const isCompleted = completed.has(focus.id);
                        const isActive = activeFocus && activeFocus.id === focus.id;
                        const isAvailable = !isCompleted && !isActive;
                        const borderColor = isCompleted ? '#22c55e' : isActive ? '#fbbf24' : '#3b82f6';
                        
                        return `
                            <div class="focus-card" style="background:#1f2937;padding:12px;border-radius:8px;margin-bottom:8px;border-left:4px solid ${borderColor};cursor:${isAvailable ? 'pointer' : 'default'};"
                                 onclick="${isAvailable ? `window.startFocus('${focus.id}')` : ''}">
                                <div style="display:flex;align-items:center;gap:12px;">
                                    <div style="font-size:24px;">${focus.icon}</div>
                                    <div style="flex:1;">
                                        <div style="font-weight:bold;">${focus.name}</div>
                                        <div style="font-size:11px;color:#9ca3af;">${focus.desc}</div>
                                    </div>
                                    ${isActive ? `<div style="font-size:12px;color:#fbbf24;">⚡</div>` : ''}
                                    ${isCompleted ? `<div style="font-size:16px;color:#22c55e;">✓</div>` : ''}
                                </div>
                                ${isActive ? `<div class="progress-bar mt-2" style="width:100%;height:4px;background:#374151;border-radius:2px;overflow:hidden;"><div class="progress-fill" style="width: ${((70 - activeFocus.daysLeft) / 70) * 100}%;height:100%;background:#fbbf24;"></div></div>` : ''}
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
                        <div class="progress-bar mt-2" style="width:100%;height:4px;background:#374151;border-radius:2px;overflow:hidden;">
                            <div class="progress-fill" style="width: ${((70 - activeFocus.daysLeft) / 70) * 100}%;height:100%;background:#fbbf24;"></div>
                        </div>
                    </div>
                ` : ''}
                ${countryFocuses.length === 0 ? '<div class="text-center text-gray-400 py-8">Нет доступных фокусов для этой страны</div>' : ''}
            </div>
        `;
        
        content.innerHTML = html;
    }
    
    renderDiplomacyWindow(content) {
        const myId = this.gameState.myCountryId;
        if (!myId) {
            content.innerHTML = '<div class="text-center text-gray-400 py-8">Выберите страну</div>';
            return;
        }
        
        const allies = [];
        const enemies = [];
        
        if (this.gameState.wars) {
            for (const war of this.gameState.wars) {
                if (war.a === myId) enemies.push(war.b);
                if (war.b === myId) enemies.push(war.a);
            }
        }
        
        if (this.gameState.alliances) {
            for (const alliance of this.gameState.alliances) {
                if (alliance.has(myId)) {
                    for (const id of alliance) {
                        if (id !== myId) allies.push(id);
                    }
                }
            }
        }
        
        let html = `
            <div class="space-y-4">
                <div class="diplo-section" style="background:#1f2937;padding:16px;border-radius:8px;">
                    <div class="diplo-title diplo-allies" style="color:#4ade80;margin-bottom:12px;font-size:14px;font-weight:bold;">🤝 СОЮЗНИКИ (${allies.length})</div>
                    ${allies.length === 0 ? 
                        '<div class="text-center text-gray-500 py-4">Нет союзников. ПКМ по стране на карте чтобы предложить альянс.</div>' : 
                        allies.map(a => `
                            <div style="background:#374151;padding:12px;border-radius:8px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
                                <div>
                                    <div style="font-weight:bold;">${a.toUpperCase()}</div>
                                </div>
                                <div style="display:flex;gap:8px;">
                                    <button onclick="window.callToWar('${a}')" style="background:#991b1b;color:white;padding:4px 8px;border-radius:4px;font-size:11px;cursor:pointer;">ПРИЗВАТЬ</button>
                                    <button onclick="window.kickAlly('${a}')" style="background:#4b5563;color:white;padding:4px 8px;border-radius:4px;font-size:11px;cursor:pointer;">ИСКЛЮЧИТЬ</button>
                                </div>
                            </div>
                        `).join('')
                    }
                </div>
                
                <div class="diplo-section" style="background:#1f2937;padding:16px;border-radius:8px;">
                    <div class="diplo-title diplo-enemies" style="color:#f87171;margin-bottom:12px;font-size:14px;font-weight:bold;">⚔️ ВРАГИ (${enemies.length})</div>
                    ${enemies.length === 0 ? 
                        '<div class="text-center text-gray-500 py-4">Мирное время</div>' : 
                        enemies.map(e => `
                            <div style="background:#374151;padding:12px;border-radius:8px;margin-bottom:8px;border-left:4px solid #ef4444;display:flex;justify-content:space-between;align-items:center;">
                                <div>
                                    <div style="font-weight:bold;">${e.toUpperCase()}</div>
                                </div>
                                <div class="diplo-status-war" style="color:#f87171;font-size:12px;">⚔️ ВОЙНА</div>
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
                <div class="resource-bar" style="background:#374151;padding:12px;border-radius:8px;display:flex;justify-content:space-between;">
                    <span>🔫 Доступно снаряжения:</span>
                    <span class="text-yellow-400 font-bold">${Math.floor(resources.equipment).toLocaleString()}</span>
                </div>
                
                <div class="section-title" style="font-size:14px;font-weight:bold;color:#eab308;margin-bottom:12px;">📦 ДОСТУПНЫЕ ПОСТРОЙКИ</div>
                <div class="space-y-2">
                    <div class="build-card" style="background:#374151;padding:12px;border-radius:8px;display:flex;justify-content:space-between;align-items:center;">
                        <div style="display:flex;align-items:center;gap:12px;">
                            <span style="font-size:28px;">🏭</span>
                            <div>
                                <div style="font-weight:bold;">Военный завод</div>
                                <div style="font-size:11px;color:#9ca3af;">💰 500 🔫 | 135 дней</div>
                            </div>
                        </div>
                        <button onclick="window.selectBuildType('factory')" 
                            class="btn-build" style="padding:8px 16px;border-radius:6px;font-size:11px;font-weight:bold;background:${resources.equipment >= 500 ? '#15803d' : '#4b5563'};color:white;cursor:${resources.equipment >= 500 ? 'pointer' : 'not-allowed'};"
                            ${resources.equipment < 500 ? 'disabled' : ''}>
                            ПОСТРОИТЬ
                        </button>
                    </div>
                    <div class="build-card" style="background:#374151;padding:12px;border-radius:8px;display:flex;justify-content:space-between;align-items:center;">
                        <div style="display:flex;align-items:center;gap:12px;">
                            <span style="font-size:28px;">⚓</span>
                            <div>
                                <div style="font-weight:bold;">Морской порт</div>
                                <div style="font-size:11px;color:#9ca3af;">💰 300 🔫 | 90 дней</div>
                            </div>
                        </div>
                        <button onclick="window.selectBuildType('port')" 
                            class="btn-build" style="padding:8px 16px;border-radius:6px;font-size:11px;font-weight:bold;background:${resources.equipment >= 300 ? '#15803d' : '#4b5563'};color:white;cursor:${resources.equipment >= 300 ? 'pointer' : 'not-allowed'};"
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
        const armies = window._armyManager ? window._armyManager.getArmiesForCountry(myId) : [];

        let armyList = '';
        if (armies.length) {
            for (const army of armies) {
                armyList += `
                    <div style="background:#1f2937;border-left:4px solid ${army.color};padding:10px;border-radius:6px;margin-bottom:6px;">
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <span style="font-weight:bold;color:${army.color};">${army.name}</span>
                            <span style="font-size:11px;color:#9ca3af;">${army.unitIds.size} юнитов</span>
                        </div>
                        <div style="display:flex;gap:4px;margin-top:6px;">
                            <button onclick="window.selectArmy(${army.id})" style="background:#374151;color:white;padding:4px 8px;border-radius:4px;font-size:10px;cursor:pointer;">🎖️ Выбрать</button>
                            <button onclick="window.disbandArmy(${army.id})" style="background:#991b1b;color:white;padding:4px 8px;border-radius:4px;font-size:10px;cursor:pointer;">🗑️</button>
                        </div>
                    </div>
                `;
            }
        } else {
            armyList = '<div class="text-center text-gray-500 py-4 text-sm">Нет армий. Создайте первую!</div>';
        }

        content.innerHTML = `
            <div class="space-y-4">
                <button onclick="window.createArmy()" style="background:#15803d;color:white;padding:12px;border-radius:8px;font-weight:bold;width:100%;cursor:pointer;">
                    🆕 СОЗДАТЬ АРМИЮ из выделенных юнитов
                </button>
                <div style="font-size:11px;color:#9ca3af;text-align:center;">ПКМ по юнитам → выделить несколько → Создать</div>
                ${armyList}
            </div>
        `;
    }
    
    renderSaveWindow(content) {
        let html = `
            <div class="space-y-4">
                <div style="display:flex;gap:8px;">
                    <button onclick="window.quickSave()" style="background:#15803d;color:white;padding:12px;border-radius:8px;font-weight:bold;flex:1;cursor:pointer;">💾 СОХРАНИТЬ</button>
                    <button onclick="window.quickLoad()" style="background:#2563eb;color:white;padding:12px;border-radius:8px;font-weight:bold;flex:1;cursor:pointer;">📂 ЗАГРУЗИТЬ</button>
                </div>
                <div class="text-center text-gray-500 text-sm">
                    Автосохранение каждые 30 дней
                </div>
            </div>
        `;
        
        content.innerHTML = html;
    }
}
