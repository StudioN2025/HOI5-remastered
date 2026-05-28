// renderer.js — Супер-оптимизированный рендер для 50k+ клеток

import { getGridData, getUnits, getMyCountryId, getCellStats } from './game.js';
import { getCountryInfo } from './utils.js';

let offscreenCanvas = null;
let offscreenCtx = null;
let lastRenderedHash = null;
let dirtyCells = new Set();

// Хэш для отслеживания изменений
function getCellHash(owner, factories, hasPort) {
    return `${owner}|${factories}|${hasPort}`;
}

// Пометить клетку как грязную
export function markCellDirty(pos) {
    dirtyCells.add(pos);
}

// Пометить все клетки страны как грязные
export function markCountryDirty(countryId) {
    const gridData = getGridData();
    for (const [pos, owner] of Object.entries(gridData)) {
        if (owner === countryId) dirtyCells.add(pos);
    }
}

// Перерендерить только грязные клетки
export function renderDirtyCells() {
    if (!offscreenCanvas) initOffscreen();
    
    const gridData = getGridData();
    const cellStats = getCellStats();
    
    for (const pos of dirtyCells) {
        const owner = gridData[pos];
        if (!owner) continue;
        
        const [x, y] = pos.split(',').map(Number);
        const cell = cellStats[pos] || {};
        const factories = cell.factories || 0;
        const hasPort = cell.buildings?.includes('port') || false;
        
        const currentHash = getCellHash(owner, factories, hasPort);
        const oldHash = lastRenderedHash[pos];
        
        if (currentHash !== oldHash || oldHash === undefined) {
            // Перерисовываем клетку
            offscreenCtx.fillStyle = getCountryInfo(owner).color;
            offscreenCtx.fillRect(x * 20, y * 20, 20, 20);
            
            // Иконки
            if (hasPort) {
                offscreenCtx.fillStyle = '#3b82f6';
                offscreenCtx.font = '9px sans-serif';
                offscreenCtx.fillText('⚓', x * 20 + 1, y * 20 + 2);
            }
            if (factories > 0) {
                offscreenCtx.fillStyle = '#fff';
                offscreenCtx.fillText('🏭', x * 20 + 1, y * 20 + (hasPort ? 12 : 2));
            }
            
            lastRenderedHash[pos] = currentHash;
        }
    }
    
    dirtyCells.clear();
}

function initOffscreen() {
    const gridData = getGridData();
    let maxX = 0, maxY = 0;
    for (const pos of Object.keys(gridData)) {
        const [x, y] = pos.split(',').map(Number);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
    }
    
    offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = (maxX + 1) * 20;
    offscreenCanvas.height = (maxY + 1) * 20;
    offscreenCtx = offscreenCanvas.getContext('2d');
    lastRenderedHash = {};
    
    // Первоначальная полная отрисовка
    for (const [pos, owner] of Object.entries(gridData)) {
        dirtyCells.add(pos);
    }
    renderDirtyCells();
}

export function getOffscreenCanvas() { return offscreenCanvas; }
