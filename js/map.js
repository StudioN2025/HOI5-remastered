// map.js — ПОЛНОСТЬЮ ИСПРАВЛЕННАЯ ВЕРСИЯ

import { getCountryInfo, getCellData } from './utils.js';
import { getGridData, getUnits, getMyCountryId, getBuildingQueue, getSelectedUnitId, getCellStats } from './game.js';
import { BUILDING_STATS } from './data.js';

const canvas = document.getElementById('map-canvas');
let ctx = canvas.getContext('2d');
const CELL_SIZE = 20;

let hoverCell = null;
let camera = { x: 0, y: 0, zoom: 0.8 };
let needRedraw = true;

export function getCamera() { return camera; }
export function setCamera(newCamera) { camera = newCamera; needRedraw = true; }
export function getHoverCell() { return hoverCell; }
export function setHoverCell(cell) { 
    if (hoverCell !== cell) {
        hoverCell = cell;
        needRedraw = true;
    }
}
export function getCellSize() { return CELL_SIZE; }
export { canvas, ctx };

export function markDirty() {
    needRedraw = true;
}

export function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    needRedraw = true;
    renderMap();
}

export function screenToWorld(sx, sy) {
    const rect = canvas.getBoundingClientRect();
    const canvasX = sx - rect.left;
    const canvasY = sy - rect.top;
    const x = Math.floor(((canvasX - canvas.width / 2) / camera.zoom + camera.x) / CELL_SIZE);
    const y = Math.floor(((canvasY - canvas.height / 2) / camera.zoom + camera.y) / CELL_SIZE);
    return { x, y };
}

export function renderMap() {
    if (!ctx) return;
    
    const gridData = getGridData();
    // ✅ ИСПОЛЬЗУЕМ ГЛОБАЛЬНЫЙ cellStats, а не локальный
    const cellStats = getCellStats() || {};
    
    if (!gridData || Object.keys(gridData).length === 0) return;
    
    // Очистка
    ctx.fillStyle = '#1b3a4b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.translate(canvas.width / 2 - camera.x * camera.zoom, canvas.height / 2 - camera.y * camera.zoom);
    ctx.scale(camera.zoom, camera.zoom);

    // Видимая область
    const invZoom = 1 / camera.zoom;
    const startX = Math.floor((camera.x - canvas.width / 2 * invZoom) / CELL_SIZE) - 2;
    const endX = Math.floor((camera.x + canvas.width / 2 * invZoom) / CELL_SIZE) + 2;
    const startY = Math.floor((camera.y - canvas.height / 2 * invZoom) / CELL_SIZE) - 2;
    const endY = Math.floor((camera.y + canvas.height / 2 * invZoom) / CELL_SIZE) + 2;

    // ✅ РИСУЕМ КЛЕТКИ (один проход)
    Object.entries(gridData).forEach(([pos, id]) => {
        const [x, y] = pos.split(',').map(Number);
        if (x < startX || x > endX || y < startY || y > endY) return;
        
        const px = x * CELL_SIZE;
        const py = y * CELL_SIZE;
        
        // Заливка клетки
        ctx.fillStyle = getCountryInfo(id).color;
        ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
        
        // Рамка
        ctx.strokeStyle = 'rgba(0,0,0,0.12)';
        ctx.lineWidth = 1;
        ctx.strokeRect(px, py, CELL_SIZE, CELL_SIZE);
    });

    // ✅ РИСУЕМ ИКОНКИ ЗДАНИЙ (отдельный проход, поверх клеток)
    Object.entries(cellStats).forEach(([pos, cell]) => {
        if (!gridData[pos]) return;
        
        const [x, y] = pos.split(',').map(Number);
        if (x < startX || x > endX || y < startY || y > endY) return;
        
        const px = x * CELL_SIZE;
        const py = y * CELL_SIZE;
        
        ctx.font = `${CELL_SIZE * 0.5}px sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        let iconY = py + 2;
        
        // Порт
        if (cell.buildings && cell.buildings.includes('port')) {
            ctx.fillStyle = '#3b82f6';
            ctx.fillText('⚓', px + 1, iconY);
            iconY += CELL_SIZE * 0.5;
        }
        
        // Заводы
        if (cell.factories > 0) {
            ctx.fillStyle = '#ffffff';
            ctx.fillText('🏭', px + 1, iconY);
        }
    });

    // ✅ СТРОЙКА
    const buildingQueue = getBuildingQueue();
    if (buildingQueue && buildingQueue.length > 0 && buildingQueue[0]) {
        const current = buildingQueue[0];
        if (current.pos) {
            const [bx, by] = current.pos.split(',').map(Number);
            if (bx >= startX && bx <= endX && by >= startY && by <= endY) {
                const stats = BUILDING_STATS[current.type];
                if (stats) {
                    const progress = Math.max(0, Math.min(1, (stats.buildTime - (current.daysLeft || 0)) / stats.buildTime));
                    
                    const barX = bx * CELL_SIZE;
                    const barY = by * CELL_SIZE + CELL_SIZE - 4;
                    
                    // Фон прогресс-бара
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                    ctx.fillRect(barX, barY, CELL_SIZE, 4);
                    
                    // Заполнение
                    ctx.fillStyle = '#3b82f6';
                    ctx.fillRect(barX, barY, CELL_SIZE * progress, 4);
                }
            }
        }
    }

    // ✅ ХОВЕР
    if (hoverCell && gridData[hoverCell]) {
        const [hx, hy] = hoverCell.split(',').map(Number);
        if (hx >= startX && hx <= endX && hy >= startY && hy <= endY) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.fillRect(hx * CELL_SIZE, hy * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 1;
            ctx.strokeRect(hx * CELL_SIZE, hy * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        }
    }

    // ✅ ЮНИТЫ
    const units = getUnits() || [];
    const selectedUnitId = getSelectedUnitId();
    
    if (units.length > 0) {
        units.forEach(u => {
            if (!u || !u.pos) return;
            
            const [ux, uy] = u.pos.split(',').map(Number);
            if (ux < startX || ux > endX || uy < startY || uy > endY) return;

            const centerX = ux * CELL_SIZE + CELL_SIZE / 2;
            const centerY = uy * CELL_SIZE + CELL_SIZE / 2;

            // Подсветка выбранного
            if (selectedUnitId && u.id === selectedUnitId) {
                ctx.strokeStyle = '#fbbf24';
                ctx.lineWidth = 2;
                ctx.strokeRect(ux * CELL_SIZE - 1, uy * CELL_SIZE - 1, CELL_SIZE + 2, CELL_SIZE + 2);
            }

            // Иконка
            ctx.font = `${CELL_SIZE * 0.7}px serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            if (u.trainingDaysLeft > 0) {
                ctx.globalAlpha = 0.6;
                ctx.fillStyle = '#ffffff';
                ctx.fillText('🛠', centerX, centerY);
                ctx.globalAlpha = 1;
            } else {
                ctx.fillStyle = '#ffffff';
                ctx.fillText(u.type === 'tank' ? '🚜' : '💂', centerX, centerY);
            }
            
            // Полоска здоровья
            if (u.hp !== undefined) {
                const stats = u.type === 'tank' ? { hp: 50 } : { hp: 100 };
                const maxHp = stats.hp || 100;
                const hpPercent = Math.max(0, Math.min(1, (u.hp || 0) / maxHp));
                
                const barWidth = CELL_SIZE * 0.6;
                const barX = ux * CELL_SIZE + (CELL_SIZE - barWidth) / 2;
                const barY = uy * CELL_SIZE + CELL_SIZE - 6;
                
                // Фон
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.fillRect(barX, barY, barWidth, 4);
                
                // Красная часть
                ctx.fillStyle = '#ef4444';
                ctx.fillRect(barX, barY, barWidth, 4);
                
                // Зелёная часть
                ctx.fillStyle = '#22c55e';
                ctx.fillRect(barX, barY, barWidth * hpPercent, 4);
            }
        });
    }

    ctx.restore();
    needRedraw = false;
}

export function updateCamera() {
    const keys = window._keys || {};
    const speed = 10 / camera.zoom;
    let moved = false;
    
    if (keys['KeyW']) { camera.y -= speed; moved = true; }
    if (keys['KeyS']) { camera.y += speed; moved = true; }
    if (keys['KeyA']) { camera.x -= speed; moved = true; }
    if (keys['KeyD']) { camera.x += speed; moved = true; }
    
    if (moved) {
        needRedraw = true;
        renderMap();
    }
}

export function setupMapEvents() {
    // Зум
    canvas.addEventListener('wheel', e => {
        e.preventDefault();
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        camera.zoom = Math.min(Math.max(camera.zoom * zoomFactor, 0.1), 8);
        needRedraw = true;
        renderMap();
    }, { passive: false });

    // Мышь
    canvas.addEventListener('mousemove', e => {
        const world = screenToWorld(e.clientX, e.clientY);
        const newHover = `${world.x},${world.y}`;
        const gridData = getGridData();
        
        if (gridData[newHover] && hoverCell !== newHover) {
            hoverCell = newHover;
            needRedraw = true;
            renderMap();
        } else if (!gridData[newHover] && hoverCell) {
            hoverCell = null;
            needRedraw = true;
            renderMap();
        }
    });

    canvas.addEventListener('mouseleave', () => {
        if (hoverCell) {
            hoverCell = null;
            needRedraw = true;
            renderMap();
        }
    });

    // Клавиши
    window._keys = {};
    window.addEventListener('keydown', e => { 
        window._keys[e.code] = true; 
    });
    window.addEventListener('keyup', e => { 
        window._keys[e.code] = false; 
    });

    // Интервал камеры
    setInterval(() => {
        updateCamera();
    }, 1000 / 30);
}

// Ресайз
window.addEventListener('resize', () => {
    resizeCanvas();
    needRedraw = true;
});

// Инициализация
resizeCanvas();
