// renderer.js — ИСПРАВЛЕННАЯ ВЕРСИЯ

import { getGridData, getCellStats } from './game.js';
import { getCountryInfo } from './utils.js';

let offscreenCanvas = null;
let offscreenCtx = null;
let dirtyCells = new Set();
let worldBounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 };
let isInitialized = false;
const CELL_SIZE = 20;

// Обновить границы мира на основе реальных данных
function updateWorldBounds() {
    const gridData = getGridData();
    
    // Если данных нет, возвращаем дефолтные значения
    if (!gridData || Object.keys(gridData).length === 0) {
        console.warn('⚠️ Нет данных для расчёта границ');
        worldBounds = { minX: 0, maxX: 100, minY: 0, maxY: 100 };
        return;
    }
    
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    
    for (const pos of Object.keys(gridData)) {
        const [x, y] = pos.split(',').map(Number);
        if (isNaN(x) || isNaN(y)) continue;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
    }
    
    // Если всё ещё Infinity, ставим запасные значения
    if (!isFinite(minX)) minX = 0;
    if (!isFinite(maxX)) maxX = 100;
    if (!isFinite(minY)) minY = 0;
    if (!isFinite(maxY)) maxY = 100;
    
    worldBounds = { minX, maxX, minY, maxY };
    console.log(`📐 Границы мира: X[${minX}..${maxX}], Y[${minY}..${maxY}]`);
}

export function markAllDirty() {
    const gridData = getGridData();
    if (!gridData) return;
    for (const pos of Object.keys(gridData)) {
        dirtyCells.add(pos);
    }
}

export function initOffscreen() {
    // Сначала обновляем границы
    updateWorldBounds();
    
    const width = (worldBounds.maxX - worldBounds.minX + 2) * CELL_SIZE;
    const height = (worldBounds.maxY - worldBounds.minY + 2) * CELL_SIZE;
    
    // Проверка на валидность размеров
    if (!isFinite(width) || !isFinite(height) || width <= 0 || height <= 0) {
        console.error('❌ Некорректные размеры оффскрин-канваса:', width, height);
        return;
    }
    
    offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = width;
    offscreenCanvas.height = height;
    offscreenCtx = offscreenCanvas.getContext('2d');
    
    // Заполняем фон (море)
    offscreenCtx.fillStyle = '#1b3a4b';
    offscreenCtx.fillRect(0, 0, width, height);
    
    // Помечаем все клетки как грязные для отрисовки
    markAllDirty();
    renderDirtyCells();
    
    isInitialized = true;
    console.log(`✅ Offscreen canvas создан: ${width}x${height}`);
}

export function renderDirtyCells() {
    if (!offscreenCanvas) {
        initOffscreen();
        return;
    }
    
    const gridData = getGridData();
    if (!gridData) return;
    
    const cellStats = getCellStats() || {};
    
    for (const pos of dirtyCells) {
        const owner = gridData[pos];
        if (!owner) continue;
        
        const [x, y] = pos.split(',').map(Number);
        if (isNaN(x) || isNaN(y)) continue;
        
        const screenX = (x - worldBounds.minX) * CELL_SIZE;
        const screenY = (y - worldBounds.minY) * CELL_SIZE;
        
        // Проверка на выход за границы
        if (screenX < 0 || screenY < 0 || screenX >= offscreenCanvas.width || screenY >= offscreenCanvas.height) {
            continue;
        }
        
        const cell = cellStats[pos] || {};
        const factories = cell.factories || 0;
        const hasPort = cell.buildings?.includes('port') || false;
        
        // Рисуем клетку
        offscreenCtx.fillStyle = getCountryInfo(owner).color;
        offscreenCtx.fillRect(screenX, screenY, CELL_SIZE, CELL_SIZE);
        
        // Обводка
        offscreenCtx.strokeStyle = 'rgba(0,0,0,0.1)';
        offscreenCtx.lineWidth = 0.5;
        offscreenCtx.strokeRect(screenX, screenY, CELL_SIZE, CELL_SIZE);
        
        // Иконки
        offscreenCtx.font = `${Math.max(8, CELL_SIZE * 0.5)}px sans-serif`;
        offscreenCtx.textAlign = 'left';
        offscreenCtx.textBaseline = 'top';
        
        let yOffset = 2;
        if (hasPort) {
            offscreenCtx.fillStyle = '#3b82f6';
            offscreenCtx.fillText('⚓', screenX + 2, screenY + yOffset);
            yOffset += 10;
        }
        if (factories > 0) {
            offscreenCtx.fillStyle = '#fff';
            offscreenCtx.fillText('🏭', screenX + 2, screenY + yOffset);
        }
    }
    
    dirtyCells.clear();
}

export function getOffscreenCanvas() {
    if (!isInitialized || !offscreenCanvas) {
        initOffscreen();
    }
    return offscreenCanvas;
}

export function getWorldBounds() {
    return worldBounds;
}

export function getVisibleSourceRect(camera, canvasWidth, canvasHeight) {
    // Если камера не настроена, возвращаем нулевой прямоугольник
    if (!camera || camera.zoom === undefined) {
        return { sx: 0, sy: 0, sw: 0, sh: 0, dx: 0, dy: 0, dw: 0, dh: 0 };
    }
    
    const invZoom = 1 / camera.zoom;
    
    let startX = Math.floor((camera.x - canvasWidth/2 * invZoom) / CELL_SIZE);
    let endX = Math.ceil((camera.x + canvasWidth/2 * invZoom) / CELL_SIZE);
    let startY = Math.floor((camera.y - canvasHeight/2 * invZoom) / CELL_SIZE);
    let endY = Math.ceil((camera.y + canvasHeight/2 * invZoom) / CELL_SIZE);
    
    // Ограничиваем границами мира
    startX = Math.max(startX, worldBounds.minX);
    endX = Math.min(endX, worldBounds.maxX);
    startY = Math.max(startY, worldBounds.minY);
    endY = Math.min(endY, worldBounds.maxY);
    
    // Если ничего не видно
    if (startX > endX || startY > endY) {
        return { sx: 0, sy: 0, sw: 0, sh: 0, dx: 0, dy: 0, dw: 0, dh: 0 };
    }
    
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

export function markCellDirty(pos) {
    dirtyCells.add(pos);
}

export function markCountryDirty(countryId) {
    const gridData = getGridData();
    if (!gridData) return;
    for (const [pos, owner] of Object.entries(gridData)) {
        if (owner === countryId) dirtyCells.add(pos);
    }
}

export { CELL_SIZE };
