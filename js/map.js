// js/map.js — ГРАФИЧЕСКИЙ ДВИЖК С ИСПРАВЛЕННЫМ ЗУМОМ И КЛИКАМИ

import { COUNTRIES } from './data.js';
import { getGridData, getMyCountryId, getUnits, getSelectedUnitId } from './game.js';
import { getCountryInfo } from './utils.js';

// Константы рендеринга
export const CELL_SIZE = 20;

// Состояние камеры
export let camera = {
    x: 0,
    y: 0,
    zoom: 0.5,
    targetX: 0,
    targetY: 0,
    targetZoom: 0.5
};

// Сдвиг координат для компенсации отрицательных координат из JSON
export let mapOffset = { x: 0, y: 0 };

// Состояние мыши и перетаскивания
let isDragging = false;
let startX = 0;
let startY = 0;

// Флаг необходимости перерисовки кэша суши
let isDirty = true;

// Скрытый холст для оптимизации отрисовки базовой карты
let bgCanvas = null;
let bgCtx = null;

export function markDirty() {
    isDirty = true;
}

export function resizeCanvas() {
    const canvas = document.getElementById('map-canvas');
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    markDirty();
}

export function setCamera(newCam) {
    if (newCam.x !== undefined) { camera.x = camera.targetX = newCam.x; }
    if (newCam.y !== undefined) { camera.y = camera.targetY = newCam.y; }
    if (newCam.zoom !== undefined) { camera.zoom = camera.targetZoom = newCam.zoom; }
    markDirty();
}

// 🔥 ФИКС КЛИКОВ: Преобразование экранных координат в координаты игровой сетки JSON
export function screenToWorld(screenX, screenY) {
    const canvas = document.getElementById('map-canvas');
    if (!canvas) return { x: 0, y: 0 };
    
    // Вычисляем точку относительно центра экрана, куда смещена камера
    const worldX = (screenX - canvas.width / 2 - camera.x) / camera.zoom;
    const worldY = (screenY - canvas.height / 2 - camera.y) / camera.zoom;
    
    // Переводим пиксели в сетку и ВЫЧИТАЕМ mapOffset, чтобы вернуть исходные координаты JSON (включая минусовые)
    return {
        x: Math.floor(worldX / CELL_SIZE) - mapOffset.x,
        y: Math.floor(worldY / CELL_SIZE) - mapOffset.y
    };
}

export function processCameraMovement() {
    const lerpFactor = 0.2; // Чуть быстрее сглаживание для отзывчивости
    
    if (Math.abs(camera.x - camera.targetX) > 0.1) {
        camera.x += (camera.targetX - camera.x) * lerpFactor;
    }
    if (Math.abs(camera.y - camera.targetY) > 0.1) {
        camera.y += (camera.targetY - camera.y) * lerpFactor;
    }
    if (Math.abs(camera.zoom - camera.targetZoom) > 0.001) {
        camera.zoom += (camera.targetZoom - camera.zoom) * lerpFactor;
    }
}

// 🔥 ФИКС ЗУМА ТУДА, ГДЕ МЫШЬ
export function setupMapEvents() {
    const canvas = document.getElementById('map-canvas');
    if (!canvas) return;

    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        
        const zoomSpeed = 1.2;
        const oldZoom = camera.targetZoom;
        let newZoom = oldZoom;

        if (e.deltaY < 0) {
            if (oldZoom < 3.0) newZoom = oldZoom * zoomSpeed;
        } else {
            if (oldZoom > 0.08) newZoom = oldZoom / zoomSpeed;
        }

        if (newZoom === oldZoom) return;

        // Координаты мыши относительно центра экрана
        const mouseX = e.clientX - canvas.width / 2;
        const mouseY = e.clientY - canvas.height / 2;

        // Корректируем положение камеры, чтобы точка под мышкой не смещалась при зуме
        camera.targetX = mouseX - (mouseX - camera.targetX) * (newZoom / oldZoom);
        camera.targetY = mouseY - (mouseY - camera.targetY) * (newZoom / oldZoom);
        camera.targetZoom = newZoom;
        
        markDirty();
    }, { passive: false });

    // Начало перетаскивания (ЛКМ или колесико)
    canvas.addEventListener('mousedown', (e) => {
        if (e.button === 0 || e.button === 1) { 
            isDragging = true;
            startX = e.clientX - camera.targetX;
            startY = e.clientY - camera.targetY;
        }
    });

    window.addEventListener('mousemove', (e) => {
        if (isDragging) {
            camera.targetX = e.clientX - startX;
            camera.targetY = e.clientY - startY;
        }
    });

    window.addEventListener('mouseup', () => {
        isDragging = false;
    });
}

defineDrawCache();
function drawBaseMapCache() {
    const gridData = getGridData();
    if (!gridData || Object.keys(gridData).length === 0) return;

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    Object.keys(gridData).forEach(key => {
        const [cx, cy] = key.split(',').map(Number);
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;
    });

    // Офсеты: добавляем запас
    mapOffset.x = minX < 0 ? Math.abs(minX) + 5 : 5;
    mapOffset.y = minY < 0 ? Math.abs(minY) + 5 : 5;

    const totalWidthCells = (maxX - minX) + mapOffset.x + 10;
    const totalHeightCells = (maxY - minY) + mapOffset.y + 10;

    if (!bgCanvas) bgCanvas = document.createElement('canvas');
    
    bgCanvas.width = totalWidthCells * CELL_SIZE;
    bgCanvas.height = totalHeightCells * CELL_SIZE;
    bgCtx = bgCanvas.getContext('2d');

    bgCtx.fillStyle = '#1a2b4c'; 
    bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);

    for (const key in gridData) {
        const [cx, cy] = key.split(',').map(Number);
        const countryId = gridData[key];
        const info = COUNTRIES[countryId];
        
        const drawX = (cx + mapOffset.x) * CELL_SIZE;
        const drawY = (cy + mapOffset.y) * CELL_SIZE;

        bgCtx.fillStyle = info ? info.color : '#444444';
        bgCtx.fillRect(drawX, drawY, CELL_SIZE, CELL_SIZE);
    }

    bgCtx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
    bgCtx.lineWidth = 1;
    for (const key in gridData) {
        const [cx, cy] = key.split(',').map(Number);
        const drawX = (cx + mapOffset.x) * CELL_SIZE;
        const drawY = (cy + mapOffset.y) * CELL_SIZE;
        bgCtx.strokeRect(drawX, drawY, CELL_SIZE, CELL_SIZE);
    }

    isDirty = false;
}

export function renderMap() {
    const canvas = document.getElementById('map-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (isDirty || !bgCanvas) {
        drawBaseMapCache();
    }

    ctx.fillStyle = '#1a2b4c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    
    // Трансформируем холст относительно центра экрана игрока
    ctx.translate(canvas.width / 2 + camera.x, canvas.height / 2 + camera.y);
    ctx.scale(camera.zoom, camera.zoom);

    if (bgCanvas) {
        ctx.drawImage(bgCanvas, 0, 0);
    }

    // Рендеринг юнитов
    const units = getUnits();
    const selectedUnitId = getSelectedUnitId();

    if (units && Object.keys(units).length > 0) {
        for (const uid in units) {
            const unit = units[uid];
            if (!unit || unit.x === undefined || unit.y === undefined) continue;

            const screenX = (unit.x + mapOffset.x) * CELL_SIZE + CELL_SIZE / 2;
            const screenY = (unit.y + mapOffset.y) * CELL_SIZE + CELL_SIZE / 2;

            const countryInfo = COUNTRIES[unit.country];
            ctx.beginPath();
            ctx.arc(screenX, screenY, CELL_SIZE * 0.4, 0, Math.PI * 2);
            ctx.fillStyle = countryInfo ? countryInfo.color : '#fff';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = uid === selectedUnitId ? 3 : 1.5;
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.font = '11px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            let icon = '🪖';
            if (unit.type === 'tank' || unit.type === 'armor') icon = '🚜';
            ctx.fillText(icon, screenX, screenY);

            ctx.fillStyle = '#000000';
            ctx.font = 'bold 9px monospace';
            ctx.fillText(Math.ceil(unit.strength || 10), screenX + 6, screenY + 7);
        }
    }

    if (window._modules && window._modules.supply && typeof window._modules.supply.drawPockets === 'function') {
        window._modules.supply.drawPockets(ctx, CELL_SIZE);
    }

    ctx.restore();
}

function defineDrawCache() { window._modules = window._modules || {}; window._modules.map = { markDirty, setCamera, screenToWorld, renderMap }; }
