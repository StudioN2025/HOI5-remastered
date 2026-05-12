// map.js — ОПТИМИЗИРОВАННАЯ ВЕРСИЯ БЕЗ ЛАГОВ

import { getCountryInfo, getCellData } from './utils.js';
import { getGridData, getUnits, getMyCountryId, getBuildingQueue, getSelectedUnitId, getCellStats } from './game.js';
import { BUILDING_STATS } from './data.js';

const canvas = document.getElementById('map-canvas');
let ctx = canvas.getContext('2d', { 
    alpha: false,
    desynchronized: true 
});

const CELL_SIZE = 20;

let camera = { x: 0, y: 0, zoom: 0.8 };
let hoverCell = null;

// Оффскрин-канвас для кэширования
let offscreenCanvas = null;
let offscreenCtx = null;
let cacheValid = false;
let cachedVisibleRange = null;

export function getCamera() { return camera; }
export function getHoverCell() { return hoverCell; }
export function setHoverCell(cell) { hoverCell = cell; }
export function getCellSize() { return CELL_SIZE; }
export { canvas, ctx };

export function markDirty() {
    cacheValid = false;
}

export function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    offscreenCanvas = null;
    cacheValid = false;
}

export function screenToWorld(sx, sy) {
    const rect = canvas.getBoundingClientRect();
    const canvasX = sx - rect.left;
    const canvasY = sy - rect.top;
    const x = Math.floor(((canvasX - canvas.width / 2) / camera.zoom + camera.x) / CELL_SIZE);
    const y = Math.floor(((canvasY - canvas.height / 2) / camera.zoom + camera.y) / CELL_SIZE);
    return { x, y };
}

function getVisibleRange() {
    const invZoom = 1 / camera.zoom;
    return {
        startX: Math.floor((camera.x - canvas.width / 2 * invZoom) / CELL_SIZE) - 2,
        endX: Math.floor((camera.x + canvas.width / 2 * invZoom) / CELL_SIZE) + 2,
        startY: Math.floor((camera.y - canvas.height / 2 * invZoom) / CELL_SIZE) - 2,
        endY: Math.floor((camera.y + canvas.height / 2 * invZoom) / CELL_SIZE) + 2
    };
}

function isSameRange(a, b) {
    if (!a || !b) return false;
    return a.startX === b.startX && a.endX === b.endX &&
           a.startY === b.startY && a.endY === b.endY;
}

function renderToOffscreen(range) {
    if (!offscreenCanvas || offscreenCanvas.width !== canvas.width || offscreenCanvas.height !== canvas.height) {
        offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = canvas.width;
        offscreenCanvas.height = canvas.height;
        offscreenCtx = offscreenCanvas.getContext('2d', { alpha: false });
    }

    const ctx2 = offscreenCtx;
    
    // Фон
    ctx2.fillStyle = '#1b3a4b';
    ctx2.fillRect(0, 0, canvas.width, canvas.height);
    
    const gridData = getGridData();
    const cellStats = getCellStats() || {};
    const buildingQueue = getBuildingQueue();
    
    ctx2.save();
    ctx2.translate(canvas.width / 2 - camera.x * camera.zoom, canvas.height / 2 - camera.y * camera.zoom);
    ctx2.scale(camera.zoom, camera.zoom);

    const { startX, endX, startY, endY } = range;

    // Отрисовка клеток (фон)
    for (const [pos, id] of Object.entries(gridData)) {
        const [x, y] = pos.split(',').map(Number);
        if (x < startX || x > endX || y < startY || y > endY) continue;
        
        ctx2.fillStyle = getCountryInfo(id).color;
        ctx2.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }

    // Сетка и иконки
    ctx2.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx2.lineWidth = 0.5;
    
    for (const [pos, id] of Object.entries(gridData)) {
        const [x, y] = pos.split(',').map(Number);
        if (x < startX || x > endX || y < startY || y > endY) continue;
        
        // Тонкая сетка
        ctx2.strokeRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        
        // Иконки зданий
        const cell = cellStats[pos];
        if (!cell) continue;
        
        const px = x * CELL_SIZE;
        const py = y * CELL_SIZE;
        
        ctx2.font = '9px sans-serif';
        ctx2.textAlign = 'left';
        ctx2.textBaseline = 'top';
        
        let iconY = py + 2;
        
        if (cell.buildings?.includes('port')) {
            ctx2.fillStyle = '#3b82f6';
            ctx2.fillText('⚓', px + 1, iconY);
            iconY += 10;
        }
        
        if (cell.factories > 0) {
            ctx2.fillStyle = '#fff';
            ctx2.fillText('🏭', px + 1, iconY);
        }
    }

    // Стройка
    if (buildingQueue.length > 0 && buildingQueue[0]?.pos) {
        const current = buildingQueue[0];
        const [bx, by] = current.pos.split(',').map(Number);
        
        if (bx >= startX && bx <= endX && by >= startY && by <= endY) {
            const stats = BUILDING_STATS[current.type];
            if (stats) {
                const progress = Math.max(0, Math.min(1, (stats.buildTime - (current.daysLeft || 0)) / stats.buildTime));
                const barX = bx * CELL_SIZE;
                const barY = by * CELL_SIZE + CELL_SIZE - 3;
                
                ctx2.fillStyle = 'rgba(255,255,255,0.3)';
                ctx2.fillRect(barX, barY, CELL_SIZE, 3);
                ctx2.fillStyle = '#3b82f6';
                ctx2.fillRect(barX, barY, CELL_SIZE * progress, 3);
            }
        }
    }

    ctx2.restore();
    cacheValid = true;
    cachedVisibleRange = { ...range };
}

export function renderMap() {
    if (!ctx) return;
    
    const range = getVisibleRange();
    const gridData = getGridData();
    const units = getUnits();
    const selectedUnitId = getSelectedUnitId();
    
    // Кэшированная отрисовка статики
    if (!cacheValid || !isSameRange(range, cachedVisibleRange)) {
        renderToOffscreen(range);
    }
    
    // Копируем кэш на основной канвас
    if (offscreenCanvas) {
        ctx.drawImage(offscreenCanvas, 0, 0);
    }
    
    // Поверх рисуем динамику (юниты, ховер)
    ctx.save();
    ctx.translate(canvas.width / 2 - camera.x * camera.zoom, canvas.height / 2 - camera.y * camera.zoom);
    ctx.scale(camera.zoom, camera.zoom);
    
    const { startX, endX, startY, endY } = range;

    // Юниты
    if (units.length > 0) {
        for (const u of units) {
            if (!u?.pos) continue;
            
            const [ux, uy] = u.pos.split(',').map(Number);
            if (ux < startX || ux > endX || uy < startY || uy > endY) continue;
            
            const cx = ux * CELL_SIZE + CELL_SIZE / 2;
            const cy = uy * CELL_SIZE + CELL_SIZE / 2;
            
            // Подсветка выбранного
            if (selectedUnitId && u.id === selectedUnitId) {
                ctx.strokeStyle = '#fbbf24';
                ctx.lineWidth = 2;
                ctx.strokeRect(ux * CELL_SIZE - 1, uy * CELL_SIZE - 1, CELL_SIZE + 2, CELL_SIZE + 2);
            }
            
            // Иконка
            ctx.font = '14px serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            if (u.trainingDaysLeft > 0) {
                ctx.globalAlpha = 0.5;
                ctx.fillStyle = '#fff';
                ctx.fillText('🛠', cx, cy);
                ctx.globalAlpha = 1;
            } else {
                ctx.fillStyle = '#fff';
                ctx.fillText(u.type === 'tank' ? '🚜' : '💂', cx, cy);
            }
            
            // HP-бар
            if (u.hp !== undefined && u.hp !== null) {
                const stats = u.type === 'tank' ? { hp: 50 } : { hp: 100 };
                const maxHp = stats.hp || 100;
                const hpPercent = Math.max(0, Math.min(1, (u.hp || 0) / maxHp));
                
                const bw = CELL_SIZE * 0.7;
                const bx = ux * CELL_SIZE + (CELL_SIZE - bw) / 2;
                const by = uy * CELL_SIZE + CELL_SIZE - 5;
                
                ctx.fillStyle = 'rgba(0,0,0,0.6)';
                ctx.fillRect(bx, by, bw, 3);
                ctx.fillStyle = '#ef4444';
                ctx.fillRect(bx, by, bw, 3);
                ctx.fillStyle = '#22c55e';
                ctx.fillRect(bx, by, bw * hpPercent, 3);
            }
        }
    }

    // Ховер
    if (hoverCell && gridData[hoverCell]) {
        const [hx, hy] = hoverCell.split(',').map(Number);
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(hx * CELL_SIZE, hy * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(hx * CELL_SIZE, hy * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }

    ctx.restore();
}

export function updateCamera() {
    const keys = window._keys || {};
    const speed = 12 / camera.zoom;
    let moved = false;
    
    if (keys['KeyW'] || keys['ArrowUp']) { camera.y -= speed; moved = true; }
    if (keys['KeyS'] || keys['ArrowDown']) { camera.y += speed; moved = true; }
    if (keys['KeyA'] || keys['ArrowLeft']) { camera.x -= speed; moved = true; }
    if (keys['KeyD'] || keys['ArrowRight']) { camera.x += speed; moved = true; }
    
    if (moved) {
        cacheValid = false;
        renderMap();
    }
}

export function setupMapEvents() {
    let lastRender = 0;
    const RENDER_INTERVAL = 1000 / 30; // 30 FPS максимум
    
    function throttledRender() {
        const now = performance.now();
        if (now - lastRender > RENDER_INTERVAL) {
            lastRender = now;
            renderMap();
        }
    }

    // Зум
    canvas.addEventListener('wheel', e => {
        e.preventDefault();
        camera.zoom = Math.min(Math.max(camera.zoom * (e.deltaY > 0 ? 0.9 : 1.1), 0.1), 8);
        cacheValid = false;
        renderMap();
    }, { passive: false });

    // Мышь — ховер с троттлингом
    canvas.addEventListener('mousemove', e => {
        const rect = canvas.getBoundingClientRect();
        const world = screenToWorld(e.clientX, e.clientY);
        const newHover = `${world.x},${world.y}`;
        
        if (getGridData()[newHover] && hoverCell !== newHover) {
            hoverCell = newHover;
            cacheValid = false;
            throttledRender();
        } else if (!getGridData()[newHover] && hoverCell) {
            hoverCell = null;
            cacheValid = false;
            throttledRender();
        }
    });

    canvas.addEventListener('mouseleave', () => {
        hoverCell = null;
        cacheValid = false;
        renderMap();
    });

    // Клавиши
    window._keys = {};
    window.addEventListener('keydown', e => { window._keys[e.code] = true; });
    window.addEventListener('keyup', e => { window._keys[e.code] = false; });

    // Обновление камеры — тоже с троттлингом
    setInterval(() => {
        updateCamera();
    }, 1000 / 30);
}

resizeCanvas();
window.addEventListener('resize', () => {
    resizeCanvas();
    cacheValid = false;
    renderMap();
});
