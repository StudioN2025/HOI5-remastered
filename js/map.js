// js/map.js — ПОЛНАЯ ИСПРАВЛЕННАЯ СБОРКА ГРАФИЧЕСКОГО ДВИЖКА

import { COUNTRIES } from './data.js';
import { getGridData, getMyCountryId, getUnits, getSelectedUnitId } from './game.js';
import { getCountryInfo } from './utils.js';

// Константы рендеринга
export const CELL_SIZE = 20;
const MAP_WIDTH = 3000;  // Максимальный логический размер карты
const MAP_HEIGHT = 2000;

// Состояние камеры
export let camera = {
    x: 400,
    y: 200,
    zoom: 0.6,
    targetX: 400,
    targetY: 200,
    targetZoom: 0.6
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

// Инициализация скрытого холста
function initBgCanvas() {
    if (!bgCanvas) {
        bgCanvas = document.createElement('canvas');
    }
    bgCanvas.width = MAP_WIDTH;
    bgCanvas.height = MAP_HEIGHT;
    bgCtx = bgCanvas.getContext('2d');
    isDirty = true;
}

// Принудительный сброс графического кэша (вызывается из main.js после загрузки JSON)
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

// Преобразование экранных координат мыши в координаты игровой сетки (X, Y клетки)
export function screenToWorld(screenX, screenY) {
    const canvas = document.getElementById('map-canvas');
    if (!canvas) return { x: 0, y: 0 };
    
    // Вычисляем координаты относительно центра холста с учетом зума
    const worldX = (screenX - canvas.width / 2 - camera.x) / camera.zoom;
    const worldY = (screenY - canvas.height / 2 - camera.y) / camera.zoom;
    
    return {
        x: Math.floor(worldX / CELL_SIZE),
        y: Math.floor(worldY / CELL_SIZE)
    };
}

// Плавное перемещение камеры (интерполяция)
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

    // Скролл (зум) относительно курсора мыши
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomSpeed = 1.1;
        if (e.deltaY < 0) {
            if (camera.targetZoom < 2.5) camera.targetZoom *= zoomSpeed;
        } else {
            if (camera.targetZoom > 0.2) camera.targetZoom /= zoomSpeed;
        }
    }, { passive: false });

    // Нажатие мыши (начало перетаскивания карты)
    canvas.addEventListener('mousedown', (e) => {
        if (e.button === 0 || e.button === 1) { // ЛКМ или СРКМ
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

// РЕНДЕРИНГ БАЗОВОЙ СУШИ И СЕТКИ НА СКРЫТЫЙ ХОЛСТ
function drawBaseMapCache() {
    if (!bgCtx) initBgCanvas();

    // Заливаем весь скрытый холст цветом глубокого моря
    bgCtx.fillStyle = '#1a2b4c'; 
    bgCtx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

    const gridData = getGridData();
    if (!gridData || Object.keys(gridData).length === 0) return;

    // Шаг 1: Отрисовка цветных провинций суши
    for (const key in gridData) {
        const [cx, cy] = key.split(',').map(Number);
        const countryId = gridData[key];
        const info = COUNTRIES[countryId];
        
        bgCtx.fillStyle = info ? info.color : '#444444';
        bgCtx.fillRect(cx * CELL_SIZE, cy * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }

    // Шаг 2: Наложение сетки и легких границ между клетками
    bgCtx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
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

    // Если данные карты обновились, перерисовываем базовый скрытый кэш суши
    if (isDirty || !bgCanvas) {
        drawBaseMapCache();
    }

    // Очищаем основной экран цветом моря перед выводом камеры
    ctx.fillStyle = '#1a2b4c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    
    // Центрируем систему координат холста и применяем матрицу камеры
    ctx.translate(canvas.width / 2 + camera.x, canvas.height / 2 + camera.y);
    ctx.scale(camera.zoom, camera.zoom);

    // Выводим готовую базовую карту из кэша (мгновенно)
    ctx.drawImage(bgCanvas, 0, 0);

    // ОТРИСОВКА ДИНАМИЧЕСКИХ ОБЪЕКТОВ (ЮНИТЫ И АРМИИ)
    const units = getUnits();
    const selectedUnitId = getSelectedUnitId();
    const myCountryId = getMyCountryId();

    if (units && Object.keys(units).length > 0) {
        for (const uid in units) {
            const unit = units[uid];
            if (!unit || unit.x === undefined || unit.y === undefined) continue;

            const screenX = unit.x * CELL_SIZE + CELL_SIZE / 2;
            const screenY = unit.y * CELL_SIZE + CELL_SIZE / 2;

            // Подложка под иконку юнита (круг цвета его фракции)
            const countryInfo = COUNTRIES[unit.country];
            ctx.beginPath();
            ctx.arc(screenX, screenY, CELL_SIZE * 0.4, 0, Math.PI * 2);
            ctx.fillStyle = countryInfo ? countryInfo.color : '#fff';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = uid === selectedUnitId ? 3 : 1.5;
            ctx.fill();
            ctx.stroke();

            // Иконка типа войск (пехота, танки и т.д.)
            ctx.fillStyle = '#ffffff';
            ctx.font = '11px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            let icon = ' infantry' === unit.type || 'inf' === unit.type ? '🪖' : '🎖️';
            if (unit.type === 'tank' || unit.type === 'armor') icon = '🚜';
            
            ctx.fillText(icon, screenX, screenY);

            // Отображение численности дивизии (например, "10")
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 9px monospace';
            ctx.fillText(Math.ceil(unit.strength || 10), screenX + 6, screenY + 7);
        }
    }

    // Дополнительная отрисовка фронтовых котлов (если модуль supply подключен)
    if (window._modules && window._modules.supply && typeof window._modules.supply.drawPockets === 'function') {
        window._modules.supply.drawPockets(ctx, CELL_SIZE);
    }

    ctx.restore();
}

// Экспортируем функции в глобальную область видимости для отладки в консоли браузера
window._modules = window._modules || {};
window._modules.map = { markDirty, setCamera, screenToWorld, renderMap };
