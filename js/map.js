// js/map.js — ДИНАМИЧЕСКИЙ ГРАФИЧЕСКИЙ ДВИЖК БЕЗ ОГРАНИЧЕНИЙ НА РАЗМЕР КАРТЫ

import { COUNTRIES } from './data.js';
import { getGridData, getMyCountryId, getUnits, getSelectedUnitId } from './game.js';
import { getCountryInfo } from './utils.js';

// Константы рендеринга
export const CELL_SIZE = 20;

// Состояние камеры (динамические координаты)
export let camera = {
    x: 0,
    y: 0,
    zoom: 0.5,
    targetX: 0,
    targetY: 0,
    targetZoom: 0.5
};

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

// Преобразование экранных координат мыши в координаты игровой сетки
export function screenToWorld(screenX, screenY) {
    const canvas = document.getElementById('map-canvas');
    if (!canvas) return { x: 0, y: 0 };
    
    const worldX = (screenX - canvas.width / 2 - camera.x) / camera.zoom;
    const worldY = (screenY - canvas.height / 2 - camera.y) / camera.zoom;
    
    return {
        x: Math.floor(worldX / CELL_SIZE),
        y: Math.floor(worldY / CELL_SIZE)
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

// Настройка обработчиков событий мыши, тача и колесика
export function setupMapEvents() {
    const canvas = document.getElementById('map-canvas');
    if (!canvas) return;

    // Скролл (зум) относительно центра экрана
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomSpeed = 1.15;
        if (e.deltaY < 0) {
            if (camera.targetZoom < 3.0) camera.targetZoom *= zoomSpeed;
        } else {
            if (camera.targetZoom > 0.1) camera.targetZoom /= zoomSpeed;
        }
    }, { passive: false });

    // Нажатие мыши (начало перетаскивания карты)
    canvas.addEventListener('mousedown', (e) => {
        if (e.button === 0 || e.button === 1) { 
            isDragging = true;
            startX = e.clientX - camera.targetX;
            startY = e.clientY - camera.targetY;
        }
    });

    // Перемещение мыши
    window.addEventListener('mousemove', (e) => {
        if (isDragging) {
            camera.targetX = e.clientX - startX;
            camera.targetY = e.clientY - startY;
        }
    });

    // Отпускание мыши
    window.addEventListener('mouseup', () => {
        isDragging = false;
    });
}

// 🔥 ФИКС: АВТОМАТИЧЕСКИЙ РАСЧЕТ РАЗМЕРОВ СКРЫТОГО ХОЛСТА ПОД РЕАЛЬНЫЙ JSON
defineDrawCache();
function drawBaseMapCache() {
    const gridData = getGridData();
    if (!gridData || Object.keys(gridData).length === 0) return;

    // Находим максимальные границы X и Y среди всех клеток в europe.json
    let maxX = 0;
    let maxY = 0;
    Object.keys(gridData).forEach(key => {
        const [cx, cy] = key.split(',').map(Number);
        if (cx > maxX) maxX = cx;
        if (cy > maxY) maxY = cy;
    });

    // Создаем или пересоздаем холст строго под размеры карты (+ запас в 10 клеток)
    if (!bgCanvas) {
        bgCanvas = document.createElement('canvas');
    }
    
    const requiredWidth = (maxX + 10) * CELL_SIZE;
    const requiredHeight = (maxY + 10) * CELL_SIZE;

    // Задаем размеры, только если они изменились, чтобы не сбрасывать контекст зря
    if (bgCanvas.width !== requiredWidth || bgCanvas.height !== requiredHeight) {
        bgCanvas.width = requiredWidth;
        bgCanvas.height = requiredHeight;
    }

    bgCtx = bgCanvas.getContext('2d');

    // Заливаем море под размер получившейся карты
    bgCtx.fillStyle = '#1a2b4c'; 
    bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);

    // Отрисовка цветных провинций суши
    for (const key in gridData) {
        const [cx, cy] = key.split(',').map(Number);
        const countryId = gridData[key];
        const info = COUNTRIES[countryId];
        
        bgCtx.fillStyle = info ? info.color : '#444444';
        bgCtx.fillRect(cx * CELL_SIZE, cy * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }

    // Наложение сетки и легких границ между клетками
    bgCtx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
    bgCtx.lineWidth = 1;
    for (const key in gridData) {
        const [cx, cy] = key.split(',').map(Number);
        bgCtx.strokeRect(cx * CELL_SIZE, cy * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }

    isDirty = false;
}

// ОСНОВНАЯ ФУНКЦИЯ ОТРИСОВКИ (ВЫЗЫВАЕТСЯ КАЖДЫЙ КАДР ИЗ ANIMATE)
export function renderMap() {
    const canvas = document.getElementById('map-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Если данные карты обновились, генерируем заново весь кэш суши
    if (isDirty || !bgCanvas) {
        drawBaseMapCache();
    }

    // Очищаем основной экран цветом моря
    ctx.fillStyle = '#1a2b4c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    
    // Сдвигаем матрицу к центру экрана и применяем координаты камеры
    ctx.translate(canvas.width / 2 + camera.x, canvas.height / 2 + camera.y);
    ctx.scale(camera.zoom, camera.zoom);

    // Отрисовываем готовую карту из кэша (теперь она гарантированно целая)
    if (bgCanvas) {
        ctx.drawImage(bgCanvas, 0, 0);
    }

    // ОТРИСОВКА ДИНАМИЧЕСКИХ ОБЪЕКТОВ (ЮНИТЫ И АРМИИ)
    const units = getUnits();
    const selectedUnitId = getSelectedUnitId();

    if (units && Object.keys(units).length > 0) {
        for (const uid in units) {
            const unit = units[uid];
            if (!unit || unit.x === undefined || unit.y === undefined) continue;

            const screenX = unit.x * CELL_SIZE + CELL_SIZE / 2;
            const screenY = unit.y * CELL_SIZE + CELL_SIZE / 2;

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
