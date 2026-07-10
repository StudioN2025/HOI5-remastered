// Windows.js — Все игровые окна

import { UNIT_STATS, BUILDING_STATS } from '../data/Units.js';
import { getCountryInfo } from '../utils/helpers.js';

export class WindowsManager {
    constructor(world, entities, gameState, techSystem, focusSystem) {
        this.world = world;
        this.entities = entities;
        this.gameState = gameState;
        this.tech = techSystem;
        this.focusSys = focusSystem;
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

        let html = `<div style="padding:12px;">`;
        html += `<div style="font-size:16px;font-weight:bold;color:#eab308;margin-bottom:12px;text-align:center;">🔬 ДЕРЕВО ТЕХНОЛОГИЙ</div>`;

        // Баннер исследования
        if (activeResearch) {
            const rt = techTree[activeResearch.techId];
            if (rt) {
                html += `<div style="background:#1e3a5f;border:1px solid #3b82f6;border-radius:8px;padding:10px;margin-bottom:16px;text-align:center;">
                    <div style="color:#60a5fa;font-size:10px;">ИССЛЕДУЕТСЯ</div>
                    <div style="font-weight:bold;font-size:14px;margin:4px 0;">${rt.icon} ${rt.name}</div>
                    <div style="color:#9ca3af;font-size:11px;">Осталось ${activeResearch.daysLeft} дней</div>
                </div>`;
            }
        }

        // Ветки
        const branchInfo = {
            industry: { name: 'ПРОМЫШЛЕННОСТЬ', color: '#3b82f6', icon: '🏭' },
            infantry: { name: 'ПЕХОТА', color: '#22c55e', icon: '💂' },
            tank:     { name: 'ТАНКИ', color: '#eab308', icon: '🚜' },
        };

        html += `<div style="display:flex;gap:16px;overflow-x:auto;padding-bottom:8px;">`;

        for (const [branchId, bi] of Object.entries(branchInfo)) {
            const branchTechs = Object.values(techTree).filter(t => t.branch === branchId).sort((a, b) => a.level - b.level);
            if (!branchTechs.length) continue;

            html += `<div style="min-width:140px;flex-shrink:0;">`;
            html += `<div style="color:${bi.color};font-weight:bold;font-size:11px;text-align:center;margin-bottom:8px;">${bi.icon} ${bi.name}</div>`;

            for (let i = 0; i < branchTechs.length; i++) {
                const t = branchTechs[i];
                const isUnlocked = unlocked.has(t.id);
                const prereq = t.level > 1 ? `${branchId}_${t.level - 1}` : null;
                const canResearch = !isUnlocked && !activeResearch && (!prereq || unlocked.has(prereq));
                const isResearching = activeResearch && activeResearch.techId === t.id;

                let bg = '#1f2937', border = '#374151', text = '#9ca3af';
                if (isUnlocked)    { bg = '#052e16'; border = '#22c55e'; text = '#86efac'; }
                if (isResearching) { bg = '#0c1e3a'; border = '#3b82f6'; text = '#93c5fd'; }
                if (canResearch)   { bg = '#422006'; border = '#eab308'; text = '#fde047'; }

                const click = canResearch ? `onclick="window.startResearch('${t.id}')" style="cursor:pointer;"` : '';

                if (i > 0) {
                    const prevOk = unlocked.has(branchTechs[i-1].id);
                    html += `<div style="text-align:center;color:${prevOk ? '#22c55e' : '#374151'};font-size:14px;margin:2px 0;">▼</div>`;
                }

                html += `<div ${click} style="background:${bg};border:2px solid ${border};border-radius:6px;padding:8px;text-align:center;">`;
                html += `<div style="font-size:20px;">${t.icon}</div>`;
                html += `<div style="font-size:10px;font-weight:bold;color:${text};margin-top:3px;">${t.name}</div>`;
                html += `<div style="font-size:8px;color:#6b7280;margin-top:2px;">${t.desc}</div>`;
                if (isUnlocked)     html += `<div style="font-size:8px;color:#22c55e;margin-top:3px;">✓</div>`;
                else if (isResearching) html += `<div style="font-size:8px;color:#3b82f6;margin-top:3px;">⏳ ${activeResearch.daysLeft}д</div>`;
                else if (canResearch)   html += `<div style="font-size:8px;color:#eab308;margin-top:3px;">🔬 ${t.cost}д</div>`;
                else                    html += `<div style="font-size:8px;color:#6b7280;margin-top:3px;">🔒</div>`;
                html += `</div>`;
            }
            html += `</div>`;
        }

        html += `</div></div>`;
        content.innerHTML = html;
    }
    
    renderFocusWindow(content) {
        const focusTree = window._FOCUS_TREE || {};
        const myId = this.gameState.myCountryId;
        const completed = this.gameState.completedFocuses || new Set();
        const activeFocus = this.gameState.activeFocus;

        const countryFocuses = Object.values(focusTree).filter(f => f.country === myId);
        if (!countryFocuses.length) {
            content.innerHTML = '<div style="padding:20px;text-align:center;color:#6b7280;">Нет фокусов для этой страны</div>';
            return;
        }

        // Определяем позиции нод по tier
        // tier 0 = корень (сверху по центру)
        // tier 1+ = ветки влево и вправо
        const nodeW = 110, nodeH = 55, gapY = 12, gapX = 30;
        const nodePos = {};

        // Разбиваем на группы по tier
        const byTier = {};
        for (const f of countryFocuses) {
            if (!byTier[f.tier]) byTier[f.tier] = [];
            byTier[f.tier].push(f);
        }

        const tiers = Object.keys(byTier).map(Number).sort((a, b) => a - b);

        for (const tier of tiers) {
            const items = byTier[tier];
            const colCount = items.length;

            for (let i = 0; i < colCount; i++) {
                const f = items[i];
                // Корень — по центру, остальные — разброс
                const x = tier === 0 ? 200 : 10 + i * (nodeW + gapX);
                const y = 30 + tier * (nodeH + gapY);
                nodePos[f.id] = { x, y };
            }
        }

        let mapW = 0, mapH = 0;
        for (const p of Object.values(nodePos)) {
            mapW = Math.max(mapW, p.x + nodeW + 20);
            mapH = Math.max(mapH, p.y + nodeH + 20);
        }

        // SVG линии
        let svg = `<svg style="position:absolute;top:0;left:0;width:${mapW}px;height:${mapH}px;pointer-events:none;">`;
        for (const f of countryFocuses) {
            if (!nodePos[f.id]) continue;
            for (const preId of (f.prereqs || [])) {
                if (!nodePos[preId]) continue;
                const from = nodePos[preId];
                const to = nodePos[f.id];
                const ok = completed.has(preId);
                const c = ok ? '#22c55e' : '#374151';
                svg += `<line x1="${from.x + nodeW/2}" y1="${from.y + nodeH}" x2="${to.x + nodeW/2}" y2="${to.y}" stroke="${c}" stroke-width="2" ${ok ? '' : 'stroke-dasharray="5,3"'}/>`;
                svg += `<polygon points="${to.x+nodeW/2-5},${to.y-1} ${to.x+nodeW/2+5},${to.y-1} ${to.x+nodeW/2},${to.y+5}" fill="${c}"/>`;
            }
        }
        svg += `</svg>`;

        // Ноды
        let nodes = '';
        for (const f of countryFocuses) {
            const pos = nodePos[f.id];
            if (!pos) continue;
            const done = completed.has(f.id);
            const active = activeFocus && activeFocus.id === f.id;
            const avail = !done && !active && this.focusSys && this.focusSys.checkPrerequisites(f.id);

            let bg = '#1a1a2e', border = '#2d2d44', txt = '#888';
            if (done)   { bg = '#0a2e1a'; border = '#22c55e'; txt = '#86efac'; }
            if (active) { bg = '#0a1a3e'; border = '#3b82f6'; txt = '#93c5fd'; }
            if (avail)  { bg = '#2e2a0a'; border = '#eab308'; txt = '#fde047'; }
            const glow = avail ? 'box-shadow:0 0 8px rgba(234,179,8,0.3);' : done ? 'box-shadow:0 0 6px rgba(34,197,94,0.2);' : '';
            const click = avail ? `onclick="window.startFocus('${f.id}')" style="cursor:pointer;"` : '';

            nodes += `<div ${click} style="position:absolute;left:${pos.x}px;top:${pos.y}px;width:${nodeW}px;height:${nodeH}px;background:${bg};border:2px solid ${border};border-radius:4px;padding:4px 6px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;${glow}">`;
            nodes += `<div style="font-size:18px;">${f.icon}</div>`;
            nodes += `<div style="font-size:8px;font-weight:bold;color:${txt};margin-top:2px;line-height:1.1;">${f.name}</div>`;
            if (done) nodes += `<div style="font-size:7px;color:#22c55e;margin-top:1px;">✓</div>`;
            else if (active) nodes += `<div style="font-size:7px;color:#3b82f6;margin-top:1px;">⏳${activeFocus.daysLeft}д</div>`;
            else if (avail) nodes += `<div style="font-size:7px;color:#eab308;margin-top:1px;">⭐</div>`;
            else nodes += `<div style="font-size:7px;color:#444;margin-top:1px;">🔒</div>`;
            nodes += `</div>`;
        }

        content.innerHTML = `<div style="position:relative;width:${mapW}px;height:${mapH}px;overflow:auto;padding:4px;">${svg}${nodes}</div>`;
    }

    renderDiplomacyWindow(content) {

        // Собираем ветки
        const branchIds = [...new Set(countryFocuses.map(f => f.branch))];
        const nodeW = 110, nodeH = 60, gapY = 14, gapX = 40;
        const nodePos = {};

        for (let bi = 0; bi < branchIds.length; bi++) {
            const bId = branchIds[bi];
            const items = countryFocuses.filter(f => f.branch === bId).sort((a, b) => a.tier - b.tier);
            const bx = 10 + bi * (nodeW + gapX);

            for (let ti = 0; ti < items.length; ti++) {
                nodePos[items[ti].id] = { x: bx, y: 35 + ti * (nodeH + gapY) };
            }
        }

        let mapW = 0, mapH = 0;
        for (const p of Object.values(nodePos)) {
            mapW = Math.max(mapW, p.x + nodeW);
            mapH = Math.max(mapH, p.y + nodeH);
        }
        mapW += 20; mapH += 20;

        // SVG линии
        let svg = `<svg style="position:absolute;top:0;left:0;width:${mapW}px;height:${mapH}px;pointer-events:none;">`;
        for (const f of countryFocuses) {
            if (!nodePos[f.id]) continue;
            for (const preId of (f.prereqs || [])) {
                if (!nodePos[preId]) continue;
                const from = nodePos[preId];
                const to = nodePos[f.id];
                const x1 = from.x + nodeW / 2;
                const y1 = from.y + nodeH;
                const x2 = to.x + nodeW / 2;
                const y2 = to.y;
                const ok = completed.has(preId);
                const c = ok ? '#22c55e' : '#374151';
                svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="2" ${ok ? '' : 'stroke-dasharray="5,3"'}/>`;
                svg += `<polygon points="${x2-5},${y2-1} ${x2+5},${y2-1} ${x2},${y2+5}" fill="${c}"/>`;
            }
        }
        svg += `</svg>`;

        // Заголовки
        let headers = '';
        for (let bi = 0; bi < branchIds.length; bi++) {
            const bInfo = branchInfo[branchIds[bi]] || { name: branchIds[bi], color: '#666', icon: '📁' };
            headers += `<div style="position:absolute;left:${10 + bi * (nodeW + gapX)}px;top:8px;width:${nodeW}px;text-align:center;color:${bInfo.color};font-size:10px;font-weight:bold;letter-spacing:0.05em;">${bInfo.icon} ${bInfo.name}</div>`;
        }

        // Ноды
        let nodes = '';
        for (const f of countryFocuses) {
            const pos = nodePos[f.id];
            if (!pos) continue;

            const done = completed.has(f.id);
            const active = activeFocus && activeFocus.id === f.id;
            const avail = !done && !active && this.focusSys && this.focusSys.checkPrerequisites(f.id);

            let bg = '#1a1a2e', border = '#2d2d44', txt = '#888';
            if (done)   { bg = '#0a2e1a'; border = '#22c55e'; txt = '#86efac'; }
            if (active) { bg = '#0a1a3e'; border = '#3b82f6'; txt = '#93c5fd'; }
            if (avail)  { bg = '#2e2a0a'; border = '#eab308'; txt = '#fde047'; }

            const click = avail ? `onclick="window.startFocus('${f.id}')" style="cursor:pointer;"` : '';
            const glow = avail ? 'box-shadow:0 0 8px rgba(234,179,8,0.3);' : done ? 'box-shadow:0 0 6px rgba(34,197,94,0.2);' : '';

            nodes += `<div ${click} style="position:absolute;left:${pos.x}px;top:${pos.y}px;width:${nodeW}px;height:${nodeH}px;background:${bg};border:2px solid ${border};border-radius:4px;padding:4px 6px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;${glow}">`;
            nodes += `<div style="font-size:18px;line-height:1;">${f.icon}</div>`;
            nodes += `<div style="font-size:8px;font-weight:bold;color:${txt};margin-top:3px;line-height:1.1;">${f.name}</div>`;
            if (done) nodes += `<div style="font-size:7px;color:#22c55e;margin-top:2px;">✓</div>`;
            else if (active) nodes += `<div style="font-size:7px;color:#3b82f6;margin-top:2px;">⏳${activeFocus.daysLeft}д</div>`;
            else if (avail) nodes += `<div style="font-size:7px;color:#eab308;margin-top:2px;">⭐</div>`;
            else nodes += `<div style="font-size:7px;color:#444;margin-top:2px;">🔒</div>`;
            nodes += `</div>`;
        }

        content.innerHTML = `
            <div style="position:relative;width:${mapW}px;height:${mapH}px;overflow:auto;padding:4px;">
                ${svg}
                ${headers}
                ${nodes}
            </div>
        `;
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
        const slotName = localStorage.getItem('heirloom_slotName') || 'Нет сохранений';

        content.innerHTML = `
            <div style="padding:12px;">
                <div style="display:flex;gap:8px;margin-bottom:16px;">
                    <button onclick="window.quickSave()" style="background:#15803d;color:white;padding:12px;border-radius:8px;font-weight:bold;flex:1;cursor:pointer;">💾 СОХРАНИТЬ</button>
                    <button onclick="window.quickLoad()" style="background:#2563eb;color:white;padding:12px;border-radius:8px;font-weight:bold;flex:1;cursor:pointer;">📂 ЗАГРУЗИТЬ</button>
                </div>
                <div style="background:#1f2937;border:1px solid #374151;border-radius:6px;padding:10px;">
                    <div style="font-size:10px;color:#9ca3af;margin-bottom:4px;">ПОСЛЕДНЕЕ СОХРАНЕНИЕ:</div>
                    <div style="font-size:13px;color:#eab308;font-weight:bold;font-family:monospace;">${slotName}</div>
                </div>
                <div style="text-align:center;color:#6b7280;font-size:10px;margin-top:8px;">Автосохранение каждые 30 дней</div>
            </div>
        `;
    }
}
