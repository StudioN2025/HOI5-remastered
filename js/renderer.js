// renderer.js — Супер-оптимизированный рендер для 50k+ клеток

import { getGridData, getUnits, getMyCountryId, getCellStats, getBuildingQueue } from './game.js';
import { getCountryInfo } from './utils.js';
import { BUILDING_STATS } from './data.js';

let offscreenCanvas = null;
let offscreenCtx = null;
let lastRenderedHash = new Map(); // pos -> hash
let dirtyCells = new Set();

let worldBounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 };
const CELL_SIZE = 20;

// Хэш для отслеживания изменений клетки
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

// Пометить все клетки (полный перерендер)
export function markAllDirty() {
    const gridData = getGridData();
    for (const pos of Object.keys(gridData)) {
        dirtyCells.add(pos);
    }
}

// Обновить границы мира
function updateWorldBounds() {
    const gridData = getGridData();
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    
    for (const pos of Object.keys(gridData)) {
        const [x, y] = pos.split(',').map(Number);
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
    }
    
    worldBounds = { minX, maxX, minY, maxY };
}

// Инициализация оффскрин-канваса
export function initOffscreen() {
    updateWorldBounds();
    
    const width = (worldBounds.maxX - worldBounds.minX + 2) * CELL_SIZE;
    const height = (worldBounds.maxY - worldBounds.minY + 2) * CELL_SIZE;
    
    offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = width;
    offscreenCanvas.height = height;
    offscreenCtx = offscreenCanvas.getContext('2d');
    
    // Заполняем фон
    offscreenCtx.fillStyle = '#1b3a4b';
    offscreenCtx.fillRect(0, 0, width, height);
    
    // Отрисовываем все клетки
    const gridData = getGridData();
    for (const pos of Object.keys(gridData)) {
        dirtyCells.add(pos);
    }
    renderDirtyCells();
    
    console.log(`✅ Offscreen canvas создан: ${width}x${height}`);
}

// Перерендерить только грязные клетки
export function renderDirtyCells() {
    if (!offscreenCanvas) {
        initOffscreen();
        return;
    }
    
    const gridData = getGridData();
    const cellStats = getCellStats();
    
    for (const pos of dirtyCells) {
        const owner = gridData[pos];
        if (!owner) continue;
        
        const [x, y] = pos.split(',').map(Number);
        const screenX = (x - worldBounds.minX) * CELL_SIZE;
        const screenY = (y - worldBounds.minY) * CELL_SIZE;
        
        const cell = cellStats[pos] || {};
        const factories = cell.factories || 0;
        const hasPort = cell.buildings?.includes('port') || false;
        
        const currentHash = getCellHash(owner, factories, hasPort);
        const oldHash = lastRenderedHash.get(pos);
        
        if (currentHash !== oldHash) {
            // Рисуем клетку
            offscreenCtx.fillStyle = getCountryInfo(owner).color;
            offscreenCtx.fillRect(screenX, screenY, CELL_SIZE, CELL_SIZE);
            
            // Обводка
            offscreenCtx.strokeStyle = 'rgba(0,0,0,0.06)';
            offscreenCtx.lineWidth = 0.5;
            offscreenCtx.strokeRect(screenX, screenY, CELL_SIZE, CELL_SIZE);
            
            // Иконки
            offscreenCtx.font = '9px sans-serif';
            offscreenCtx.fillStyle = '#fff';
            
            if (hasPort) {
                offscreenCtx.fillStyle = '#3b82f6';
                offscreenCtx.fillText('⚓', screenX + 1, screenY + 2);
            }
            if (factories > 0) {
                offscreenCtx.fillStyle = '#fff';
                const yOffset = hasPort ? 12 : 2;
                offscreenCtx.fillText('🏭', screenX + 1, screenY + yOffset);
            }
            
            lastRenderedHash.set(pos, currentHash);
        }
    }
    
    dirtyCells.clear();
}

// Получить оффскрин-канвас
export function getOffscreenCanvas() {
    if (!offscreenCanvas) initOffscreen();
    return offscreenCanvas;
}

// Получить границы мира
export function getWorldBounds() {
    return worldBounds;
}

// ✅ ВАЖНО: Получить видимую область на оффскрин-канвасе
export function getVisibleSourceRect(camera, canvasWidth, canvasHeight) {
    const invZoom = 1 / camera.zoom;
    
    let startX = Math.max(worldBounds.minX, Math.floor((camera.x - canvasWidth/2 * invZoom) / CELL_SIZE));
    let endX = Math.min(worldBounds.maxX, Math.ceil((camera.x + canvasWidth/2 * invZoom) / CELL_SIZE));
    let startY = Math.max(worldBounds.minY, Math.floor((camera.y - canvasHeight/2 * invZoom) / CELL_SIZE));
    let endY = Math.min(worldBounds.maxY, Math.ceil((camera.y + canvasHeight/2 * invZoom) / CELL_SIZE));
    
    // Корректируем, чтобы не выходить за границы
    startX = Math.max(startX, worldBounds.minX);
    endX = Math.min(endX, worldBounds.maxX);
    startY = Math.max(startY, worldBounds.minY);
    endY = Math.min(endY, worldBounds.maxY);
    
    const sx = (startX - worldBounds.minX) * CELL_SIZE;
    const sy = (startY - worldBounds.minY) * CELL_SIZE;
    const sw = (endX - startX + 1) * CELL_SIZE;
    const sh = (endY - startY + 1) * CELL_SIZE;
    
    const dx = (startX * CELL_SIZE - camera.x) * camera.zoom + canvasWidth/2;
    const dy = (startY * CELL_SIZE - camera.y) * camera.zoom + canvasHeight/2;
    const dw = sw * camera.zoom;
    const dh = sh * camera.zoom;
    
    return { sx, sy, sw, sh, dx, dy, dw, dh };
}

// Экспорт CELL_SIZE для других модулей
export { CELL_SIZE };
