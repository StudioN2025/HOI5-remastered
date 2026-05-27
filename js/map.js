// js/map.js — ГРАФИЧЕСКИЙ ДВИЖК С ПОДДЕРЖКОЙ ОТРИЦАТЕЛЬНЫХ КООРДИНАТ (ЦЕНТР В 0,0)

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

// Сдвиг координат (офсет) для компенсации отрицательных координат из JSON
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

// Принудительный сброс графического кэша
export function markDirty() {
    isDirty = true;
}

// Изменение размеров основного холста под окно браузера
export function resizeCanvas() {
    const canvas = document.getElementById('map-canvas');
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    markDirty();
}

// Установка параметров камеры
export function setCamera(newCam) {
    if (newCam.x !== undefined) { camera.x = camera.targetX = newCam.x; }
    if (newCam.y !== undefined) { camera.y = camera.targetY = newCam.y; }
    if (newCam.zoom !== undefined) { camera.zoom = camera.targetZoom = newCam.zoom; }
    markDirty();
}

// Преобразование экранных координат мыши в координаты игровой сетки (с учетом сдвига карты)
export function screenToWorld(screenX, screenY) {
    const canvas = document.getElementById('map-canvas');
    if (!canvas) return { x: 0, y: 0 };
    
    const worldX = (screenX - canvas.width / 2 - camera.x) / camera.zoom;
    const worldY = (screenY - canvas.height / 2 - camera.y) / camera.zoom;
    
    return {
        x: Math.floor(worldX / CELL_SIZE) - mapOffset.x,
        y: Math.floor(worldY / CELL_SIZE) - mapOffset.y
    };
}

// Плавное перемещение и зум камеры (интерполяция кадров)
export function processCameraMovement() {
    const lerpFactor = 0.15;
    
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

// Настройка обработчиков событий мыши и колесика
export function setupMapEvents() {
    const canvas = document.getElementById('map-canvas');
    if (!canvas) return;

    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomSpeed = 1.15;
        if (e.deltaY < 0) {
            if (camera.targetZoom < 3.0) camera.targetZoom *= zoomSpeed;
        } else {
            if (camera.targetZoom > 0.1) camera.targetZoom /= zoomSpeed;
        }
    }, { passive: false });

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

// 🔥 ФИКС: АВТОМАТИЧЕСКИЙ РАСЧЕТ РАЗМЕРОВ И СДВИГА ДЛЯ КАРТ С ЦЕНТРОМ В 0,0
defineDrawCache();
function drawBaseMapCache() {
    const gridData = getGridData();
    if (!gridData || Object.keys(gridData).length === 0) return;

    // Находим экстремумы (минимумы и максимумы) координат, включая отрицательные
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    Object.keys(gridData).forEach(key => {
        const [cx, cy] = key.split(',').map(Number);
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;
    });

    // Запоминаем сдвиг: если minX = -50, то нам нужно сдвинуть всё вправо на +50 клеток, чтобы войти в видимую зону холста
    mapOffset.x = minX < 0 ? Math.abs(minX) + 5 : 5;
    mapOffset.y = minY < 0 ? Math.abs(minY) + 5 : 5;

    // Вычисляем полный физический размер карты от самого левого до самого правого края
    const totalWidthCells = (maxX - minX) + mapOffset.x + 10;
    const totalHeightCells = (maxY - minY) + mapOffset.y + 10;

    if (!bgCanvas) {
        bgCanvas = document.createElement('canvas');
    }
    
    bgCanvas.width = totalWidthCells * CELL_SIZE;
    bgCanvas.height = totalHeightCells * CELL_SIZE;
    bgCtx = bgCanvas.getContext('2d');

    // Заливаем всё пространство морем
    bgCtx.fillStyle = '#1a2b4c'; 
    bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);

    // Отрисовка цветных провинций суши с учетом mapOffset
    for (const key in gridData) {
        const [cx, cy] = key.split(',').map(Number);
        const countryId = gridData[key];
        const info = COUNTRIES[countryId];
        
        // Применяем сдвиг координат, перенося минусы в плюсы
        const drawX = (cx + mapOffset.x) * CELL_SIZE;
        const drawY = (cy + mapOffset.y) * CELL_SIZE;

        bgCtx.fillStyle = info ? info.color : '#444444';
        bgCtx.fillRect(drawX, drawY, CELL_SIZE, CELL_SIZE);
    }

    // Наложение сетки и легких границ между клетками
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

// ОСНОВНАЯ ФУНКЦИЯ ОТРИСОВКИ
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
    
    // Центрируем камеру
    ctx.translate(canvas.width / 2 + camera.x, canvas.height / 2 + camera.y);
    ctx.scale(camera.zoom, camera.zoom);

    // Выводим сгенерированный кэш карты на экран
    if (bgCanvas) {
        ctx.drawImage(bgCanvas, 0, 0);
    }

    // ОТРИСОВКА ЮНИТОВ (Тоже с учетом mapOffset)
    const units = getUnits();
    const selectedUnitId = getSelectedUnitId();

    if (units && Object.keys(units).length > 0) {
        for (const uid in units) {
            const unit = units[uid];
            if (!unit || unit.x === undefined || unit.y === undefined) continue;

            // Сдвигаем координаты юнита на тот же офсет, что и карту
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
