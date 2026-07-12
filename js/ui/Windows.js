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
        if (!myId) { content.innerHTML = '<div style="padding:20px;text-align:center;color:#6b7280;">Выберите страну</div>'; return; }
        const units = this.entities.getEntitiesByOwner(myId);
        const res = this.gameState;
        
        let html = '<div style="padding:12px;">';
        html += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px;">';
        html += '<div style="background:#374151;padding:12px;border-radius:8px;text-align:center;"><div style="font-size:24px;">🔫</div><div style="font-size:18px;font-weight:bold;color:#eab308;">' + Math.floor(res.equipment).toLocaleString() + '</div><div style="font-size:9px;color:#9ca3af;">СНАРЯЖЕНИЕ</div></div>';
        html += '<div style="background:#374151;padding:12px;border-radius:8px;text-align:center;"><div style="font-size:24px;">👥</div><div style="font-size:18px;font-weight:bold;color:#eab308;">' + Math.floor(res.manpower).toLocaleString() + '</div><div style="font-size:9px;color:#9ca3af;">ЛЮДСКИЕ</div></div>';
        html += '<div style="background:#374151;padding:12px;border-radius:8px;text-align:center;"><div style="font-size:24px;">🏭</div><div style="font-size:18px;font-weight:bold;color:#eab308;">' + (res.factories || 0) + '</div><div style="font-size:9px;color:#9ca3af;">ЗАВОДЫ</div></div>';
        html += '</div>';
        
        html += '<div style="font-size:14px;font-weight:bold;color:#eab308;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #374151;">⚔️ МОИ ВОЙСКА (' + units.length + ')</div>';

        html += '<div style="display:flex;gap:6px;margin-bottom:12px;">';
        html += '<button onclick="window.recruitUnit && window.recruitUnit(\'infantry\')" style="flex:1;padding:10px;background:#15803d;color:white;border:none;border-radius:6px;font-weight:bold;cursor:pointer;font-size:12px;">➕ ПЕХОТА</button>';
        html += '<button onclick="window.recruitUnit && window.recruitUnit(\'tank\')" style="flex:1;padding:10px;background:#1d4ed8;color:white;border:none;border-radius:6px;font-weight:bold;cursor:pointer;font-size:12px;">➕ ТАНК</button>';
        html += '<button onclick="window.createArmy && window.createArmy()" style="flex:1;padding:10px;background:#854d0e;color:white;border:none;border-radius:6px;font-weight:bold;cursor:pointer;font-size:12px;">🎖️ АРМИЯ</button>';
        html += '</div>';
        
        if (units.length === 0) {
            html += '<div style="color:#6b7280;text-align:center;padding:20px;">Нет войск</div>';
        } else {
            for (const uId of units) {
                const type = this.entities.type[uId];
                const stats = UNIT_STATS[type === 0 ? 'infantry' : 'tank'];
                const hp = Math.floor((this.entities.hp[uId] / this.entities.maxHp[uId]) * 100);
                const status = this.entities.inCombat[uId] ? '⚔️ БОЙ' : '✅ Готов';
                html += '<div style="background:#1f2937;padding:10px;border-radius:6px;margin-bottom:6px;border-left:4px solid ' + (this.entities.inCombat[uId] ? '#ef4444' : '#22c55e') + ';">';
                html += '<div style="display:flex;justify-content:space-between;align-items:center;">';
                html += '<span style="font-weight:bold;">' + stats.icon + ' ' + stats.name + '</span>';
                html += '<span style="font-size:10px;color:' + (this.entities.inCombat[uId] ? '#ef4444' : '#22c55e') + ';">' + status + '</span>';
                html += '</div>';
                html += '<div style="background:#374151;height:4px;border-radius:2px;margin-top:4px;"><div style="width:' + hp + '%;height:100%;background:' + (hp > 50 ? '#22c55e' : hp > 25 ? '#eab308' : '#ef4444') + ';"></div></div>';
                html += '</div>';
            }
        }
        
        content.innerHTML = html;
    }
    
    renderFocusWindow(content) {
        // Фокусное окно — свой скролл, без padding
        content.style.padding = '0';
        content.style.overflow = 'hidden';
        var focusTree = window._FOCUS_TREE || {};
        var myId = this.gameState.myCountryId;
        var completed = this.gameState.completedFocuses || new Set();
        var activeFocus = this.gameState.activeFocus;
        var allFocuses = Object.values(focusTree).filter(function(f) { return f.country === myId; });

        console.log('[Focus] myId=' + myId + ' total=' + Object.keys(focusTree).length + ' matched=' + allFocuses.length);

        if (!allFocuses.length) {
            content.innerHTML = '<div style="padding:20px;text-align:center;color:#6b7280;">Нет фокусов для ' + (myId || '?') + '</div>';
            return;
        }

        var NW = 140, NH = 70, PAD = 10;

        var minX = 99999, minY = 99999, maxX = 0, maxY = 0;
        for (var i = 0; i < allFocuses.length; i++) {
            var f = allFocuses[i];
            var fx = f.x !== undefined ? f.x : 50;
            var fy = f.y !== undefined ? f.y : 50;
            if (fx < minX) minX = fx;
            if (fy < minY) minY = fy;
            if (fx + NW > maxX) maxX = fx + NW;
            if (fy + NH > maxY) maxY = fy + NH;
        }

        var pos = {};
        for (var i = 0; i < allFocuses.length; i++) {
            var f = allFocuses[i];
            var fx = f.x !== undefined ? f.x : 50;
            var fy = f.y !== undefined ? f.y : 50;
            pos[f.id] = { x: fx - minX + PAD, y: fy - minY + PAD };
        }

        var totalW = maxX - minX + PAD * 2;
        var totalH = maxY - minY + PAD * 2;
        if (totalW < 400) totalW = 400;
        if (totalH < 300) totalH = 300;

        var svg = '<svg style="position:absolute;top:0;left:0;width:' + totalW + 'px;height:' + totalH + 'px;pointer-events:none;z-index:1;">';
        for (var i = 0; i < allFocuses.length; i++) {
            var f = allFocuses[i];
            if (!pos[f.id]) continue;
            var prereqs = f.prereqs || [];
            for (var j = 0; j < prereqs.length; j++) {
                var preId = prereqs[j];
                if (!pos[preId]) continue;
                var a = pos[preId], b = pos[f.id];
                var ok = completed.has(preId);
                var clr = ok ? '#22c55e' : '#4b5563';
                var ax = a.x + NW / 2, ay = a.y + NH;
                var bx2 = b.x + NW / 2, by2 = b.y;
                svg += '<line x1="' + ax + '" y1="' + ay + '" x2="' + bx2 + '" y2="' + by2 + '" stroke="' + clr + '" stroke-width="2" ' + (ok ? '' : 'stroke-dasharray="5,3"') + '/>';
                var dx = bx2 - ax, dy = by2 - ay;
                var len = Math.sqrt(dx * dx + dy * dy) || 1;
                var ux = dx / len, uy = dy / len;
                svg += '<polygon points="' + (bx2 - ux*5 - uy*3) + ',' + (by2 - uy*5 + ux*3) + ' ' + (bx2 - ux*5 + uy*3) + ',' + (by2 - uy*5 - ux*3) + ' ' + bx2 + ',' + by2 + '" fill="' + clr + '"/>';
            }
        }
        svg += '</svg>';

        var nodes = '';
        for (var i = 0; i < allFocuses.length; i++) {
            var f = allFocuses[i];
            var p = pos[f.id];
            if (!p) continue;
            var done = completed.has(f.id);
            var isActive = activeFocus && activeFocus.id === f.id;
            var avail = !done && !isActive && this.focusSys && this.focusSys.checkPrerequisites(f.id);
            var bg, border, txt;
            if (done) { bg = '#052e16'; border = '#22c55e'; txt = '#86efac'; }
            else if (isActive) { bg = '#0c1e3a'; border = '#3b82f6'; txt = '#93c5fd'; }
            else if (avail) { bg = '#422006'; border = '#eab308'; txt = '#fde047'; }
            else { bg = '#1f2937'; border = '#4b5563'; txt = '#9ca3af'; }
            var click = avail ? ' onclick="window.startFocus(\'' + f.id + '\')"' : '';
            nodes += '<div' + click + ' style="position:absolute;left:' + p.x + 'px;top:' + p.y + 'px;width:' + NW + 'px;height:' + NH + 'px;background:' + bg + ';border:2px solid ' + border + ';border-radius:6px;padding:6px;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:2;' + (avail ? 'cursor:pointer;' : '') + '">';
            nodes += '<div style="font-size:20px;">' + (f.icon || '⭐') + '</div>';
            nodes += '<div style="font-size:10px;font-weight:bold;color:' + txt + ';margin-top:2px;line-height:1.1;">' + f.name + '</div>';
            if (f.desc) nodes += '<div style="font-size:8px;color:#888;margin-top:1px;line-height:1.1;max-width:' + (NW - 12) + 'px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + f.desc + '</div>';
            if (done) nodes += '<div style="font-size:8px;color:#22c55e;margin-top:1px;">✓</div>';
            else if (isActive) nodes += '<div style="font-size:8px;color:#3b82f6;margin-top:1px;">⏳ ' + activeFocus.daysLeft + 'д</div>';
            else if (avail) nodes += '<div style="font-size:8px;color:#eab308;margin-top:1px;">Начать</div>';
            else nodes += '<div style="font-size:8px;color:#4b5563;margin-top:1px;">🔒</div>';
            nodes += '</div>';
        }

        var html = '<div id="focus-scroll" style="width:100%;height:100%;overflow:auto;background:#0a0a0a;">';
        html += '<div style="position:relative;width:' + totalW + 'px;height:' + totalH + 'px;min-width:100%;min-height:100%;">';
        html += svg + nodes;
        html += '</div></div>';

        content.innerHTML = html;
    }

    renderResearchWindow(content) {
        content.style.padding = '';
        content.style.overflow = '';
        var myId = this.gameState.myCountryId;
        if (!myId) { content.innerHTML = '<div style="padding:20px;text-align:center;color:#6b7280;">Выберите страну</div>'; return; }

        var techTree = window._TECH_TREE || {};
        var techBranches = window._TECH_BRANCHES || {};
        var unlocked = this.tech ? this.tech.getUnlocked(myId) : new Set();
        var research = this.tech ? this.tech.getPlayerResearch() : null;

        var html = '<div style="padding:12px;">';

        // Текущее исследование
        if (research && research.techId) {
            var rt = techTree[research.techId];
            if (rt) {
                var pct = Math.floor((research.daysLeft / rt.cost) * 100);
                html += '<div style="background:#0c1e3a;border:1px solid #3b82f6;border-radius:8px;padding:12px;margin-bottom:16px;">';
                html += '<div style="font-size:12px;font-weight:bold;color:#93c5fd;">🔬 Исследуется: ' + rt.icon + ' ' + rt.name + '</div>';
                html += '<div style="background:#1f2937;height:8px;border-radius:4px;margin-top:8px;"><div style="width:' + pct + '%;height:100%;background:#3b82f6;border-radius:4px;"></div></div>';
                html += '<div style="font-size:10px;color:#6b7280;margin-top:4px;">Осталось ' + research.daysLeft + ' дн.</div>';
                html += '</div>';
            }
        }

        // Ветки
        for (var bKey in techBranches) {
            var branch = techBranches[bKey];
            html += '<div style="margin-bottom:16px;">';
            html += '<div style="font-size:13px;font-weight:bold;color:' + branch.color + ';margin-bottom:8px;">' + branch.icon + ' ' + branch.name + '</div>';

            for (var tKey in techTree) {
                var tech = techTree[tKey];
                if (tech.branch !== bKey) continue;
                var isUnlocked = unlocked.has(tech.id);
                var isResearching = research && research.techId === tech.id;
                var prereqDone = tech.level <= 1 || unlocked.has(tech.branch + '_' + (tech.level - 1));
                var canResearch = !isUnlocked && !isResearching && prereqDone && !research;

                var bg, border, txt;
                if (isUnlocked) { bg = '#052e16'; border = '#22c55e'; txt = '#86efac'; }
                else if (isResearching) { bg = '#0c1e3a'; border = '#3b82f6'; txt = '#93c5fd'; }
                else if (canResearch) { bg = '#422006'; border = '#eab308'; txt = '#fde047'; }
                else { bg = '#1f2937'; border = '#4b5563'; txt = '#6b7280'; }

                var click = canResearch ? ' onclick="window.startResearch && window.startResearch(\'' + tech.id + '\')"' : '';
                html += '<div' + click + ' style="background:' + bg + ';border:1px solid ' + border + ';border-radius:6px;padding:10px;margin-bottom:6px;display:flex;align-items:center;gap:10px;' + (canResearch ? 'cursor:pointer;' : '') + '">';
                html += '<div style="font-size:24px;">' + tech.icon + '</div>';
                html += '<div style="flex:1;">';
                html += '<div style="font-size:11px;font-weight:bold;color:' + txt + ';">' + tech.name + '</div>';
                html += '<div style="font-size:9px;color:#6b7280;">' + tech.desc + '</div>';
                html += '</div>';
                html += '<div style="text-align:right;">';
                if (isUnlocked) html += '<div style="font-size:10px;color:#22c55e;">✓</div>';
                else if (isResearching) html += '<div style="font-size:10px;color:#3b82f6;">⏳</div>';
                else html += '<div style="font-size:10px;color:#6b7280;">' + tech.cost + ' дн.</div>';
                html += '</div>';
                html += '</div>';
            }
            html += '</div>';
        }
        html += '</div>';
        content.innerHTML = html;
    }
    
    renderDiplomacyWindow(content) {
        const myId = this.gameState.myCountryId;
        if (!myId) { content.innerHTML = '<div style="padding:20px;text-align:center;color:#6b7280;">Выберите страну</div>'; return; }
        const allies = [], enemies = [];
        if (this.gameState.wars) { for (var w of this.gameState.wars) { if (w.a === myId) enemies.push(w.b); if (w.b === myId) enemies.push(w.a); } }
        if (this.gameState.alliances) { for (var a of this.gameState.alliances) { if (a.has(myId)) { for (var id of a) { if (id !== myId) allies.push(id); } } } }
        var html = '<div style="padding:12px;">';
        html += '<div style="margin-bottom:12px;"><div style="font-size:12px;font-weight:bold;color:#22c55e;margin-bottom:6px;">🤝 Союзники (' + allies.length + ')</div>';
        if (allies.length === 0) html += '<div style="color:#6b7280;font-size:11px;text-align:center;padding:8px;">Нет союзников</div>';
        else { for (var i = 0; i < allies.length; i++) { html += '<div style="background:#0a2e1a;border:1px solid #22c55e;border-radius:4px;padding:6px 8px;margin-bottom:4px;display:flex;justify-content:space-between;align-items:center;"><span style="font-weight:bold;font-size:11px;">' + allies[i].toUpperCase() + '</span><button onclick="window.kickAlly(\'' + allies[i] + '\')" style="background:#991b1b;color:white;padding:3px 6px;border-radius:3px;font-size:9px;cursor:pointer;">✕</button></div>'; } }
        html += '</div>';
        html += '<div><div style="font-size:12px;font-weight:bold;color:#ef4444;margin-bottom:6px;">⚔️ Враги (' + enemies.length + ')</div>';
        if (enemies.length === 0) html += '<div style="color:#6b7280;font-size:11px;text-align:center;padding:8px;">Мирное время</div>';
        else { for (var i = 0; i < enemies.length; i++) { html += '<div style="background:#1a0a0a;border:1px solid #ef4444;border-radius:4px;padding:6px 8px;margin-bottom:4px;"><span style="font-weight:bold;font-size:11px;color:#ef4444;">' + enemies[i].toUpperCase() + '</span></div>'; } }
        html += '</div>';
        content.innerHTML = html;
    }
    
    renderBuildWindow(content) {
        const res = this.gameState;
        var html = '<div style="padding:12px;">';
        html += '<div style="background:#374151;padding:12px;border-radius:8px;display:flex;justify-content:space-between;margin-bottom:12px;"><span>🔫 Снаряжение:</span><span style="color:#fbbf24;font-weight:bold;">' + Math.floor(res.equipment).toLocaleString() + '</span></div>';
        html += '<div style="font-size:14px;font-weight:bold;color:#eab308;margin-bottom:12px;">📦 ПОСТРОЙКИ</div>';
        html += '<div style="background:#1f2937;padding:12px;border-radius:8px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;"><div><div style="font-weight:bold;">🏭 Завод</div><div style="font-size:11px;color:#9ca3af;">500 🔫 | 135 дн.</div></div><button onclick="window.selectBuildType(\'factory\')" style="padding:8px 16px;border-radius:6px;font-size:11px;font-weight:bold;background:' + (res.equipment >= 500 ? '#15803d' : '#4b5563') + ';color:white;cursor:' + (res.equipment >= 500 ? 'pointer' : 'not-allowed') + ';">ПОСТРОИТЬ</button></div>';
        html += '<div style="background:#1f2937;padding:12px;border-radius:8px;display:flex;justify-content:space-between;align-items:center;"><div><div style="font-weight:bold;">⚓ Порт</div><div style="font-size:11px;color:#9ca3af;">300 🔫 | 90 дн.</div></div><button onclick="window.selectBuildType(\'port\')" style="padding:8px 16px;border-radius:6px;font-size:11px;font-weight:bold;background:' + (res.equipment >= 300 ? '#15803d' : '#4b5563') + ';color:white;cursor:' + (res.equipment >= 300 ? 'pointer' : 'not-allowed') + ';">ПОСТРОИТЬ</button></div>';
        html += '</div>';
        content.innerHTML = html;
    }
    
    renderCommandersWindow(content) {
        const myId = this.gameState.myCountryId;
        const armies = window._armyManager ? window._armyManager.getArmiesForCountry(myId) : [];
        var html = '<div style="padding:12px;">';
        html += '<button onclick="window.createArmy()" style="background:#15803d;color:white;padding:12px;border-radius:8px;font-weight:bold;width:100%;cursor:pointer;margin-bottom:12px;">➕ СОЗДАТЬ АРМИЮ</button>';
        if (armies.length === 0) {
            html += '<div style="color:#6b7280;text-align:center;padding:20px;">Нет армий</div>';
        } else {
            for (var i = 0; i < armies.length; i++) {
                var army = armies[i];
                html += '<div style="background:#1f2937;border-left:4px solid ' + army.color + ';padding:10px;border-radius:6px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;">';
                html += '<span style="font-weight:bold;color:' + army.color + ';">' + army.name + ' (' + army.unitIds.size + ')</span>';
                html += '<button onclick="window.selectArmy(' + army.id + ')" style="background:#374151;color:white;padding:4px 8px;border-radius:4px;font-size:10px;cursor:pointer;">🎖️</button>';
                html += '</div>';
            }
        }
        html += '</div>';
        content.innerHTML = html;
    }
    
    renderSaveWindow(content) {
        content.innerHTML = '<div style="padding:12px;"><button onclick="window.quickSave()" style="background:#15803d;color:white;padding:12px;border-radius:8px;font-weight:bold;width:100%;cursor:pointer;margin-bottom:8px;">💾 СОХРАНИТЬ</button><button onclick="window.quickLoad()" style="background:#2563eb;color:white;padding:12px;border-radius:8px;font-weight:bold;width:100%;cursor:pointer;">📂 ЗАГРУЗИТЬ</button></div>';
    }
}
