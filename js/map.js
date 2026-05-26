// map.js — РЕНДЕРЕР СПОСОБНЫЙ ОБРАБОТАТЬ 1 000 000+ КЛЕТОК

import { getCountryInfo } from './utils.js';
import { getGridData, getUnits, getMyCountryId, getBuildingQueue, getSelectedUnitId, getCellStats } from './game.js';
import { BUILDING_STATS } from './data.js';

const canvas = document.getElementById('map-canvas');
let ctx = canvas.getContext('2d', { 
    alpha: false,
    desynchronized: true,
    willReadFrequently: false
});

const CELL_SIZE = 20;

// Камера и переменные плавности
let camera = { x: 0, y: 0, zoom: 0.8 };
let targetCamera = { x: 0, y: 0 }; // Целевая позиция для интерполяции
let isFirstFrame = true;           // Флаг для начальной привязки

let hoverCell = null;

// Кэши
let offscreenCanvas = null;
let offscreenCtx = null;
let cacheValid = false;
let cachedRange = null;

// ✅ ТАЙЛОВАЯ СИСТЕМА
const TILE_SIZE = 512; // Размер тайла в пикселях
let tileCache = new Map(); // "tx,ty,zoom" -> ImageData
const MAX_TILES = 64; // Максимум тайлов в кэше

// Кэш котлов
let pocketCache = null;
let pocketFrame = 0;
const POCKET_INTERVAL = 60;

// Кэш юнитов
let unitCache = null;
let unitCacheValid = false;

// Состояние клавиш клавиатуры
let keys = {};

export function getCamera() { return camera; }
export function setCamera(c) { 
    camera = c; 
    targetCamera.x = c.x;
    targetCamera.y = c.y;
    tileCache.clear(); 
}

export function markDirty() {
    cacheValid = false;
    unitCacheValid = false;
}

// Перевод координат экрана в координаты игрового мира
export function screenToWorld(sx, sy) {
    const worldX = (sx - canvas.width / 2) / camera.zoom + camera.x;
    const worldY = (sy - canvas.height / 2) / camera.zoom + camera.y;
    return {
        x: Math.floor(worldX / CELL_SIZE),
        y: Math.floor(worldY / CELL_SIZE)
    };
}

// Изменение размеров холста
export function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    tileCache.clear();
    markDirty();
    renderMap();
}

// ✅ ОБНОВЛЕНИЕ КАМЕРЫ КАЖДЫЙ КАДР (Инерция и Плавность)
export function processCameraMovement() {
    let speed = 12 / camera.zoom; // Скорость перемещения зависит от зума
    let moved = false;

    // Первичная инициализация целевой позиции
    if (isFirstFrame) {
        targetCamera.x = camera.x;
        targetCamera.y = camera.y;
        isFirstFrame = false;
    }

    // Изменяем целевую позицию при нажатии клавиш
    if (keys['KeyW'] || keys['ArrowUp'])    { targetCamera.y -= speed; moved = true; }
    if (keys['KeyS'] || keys['ArrowDown'])  { targetCamera.y += speed; moved = true; }
    if (keys['KeyA'] || keys['ArrowLeft'])  { targetCamera.x -= speed; moved = true; }
    if (keys['KeyD'] || keys['ArrowRight']) { targetCamera.x += speed; moved = true; }

    // Линейная интерполяция (LERP) для плавного дотягивания (0.15 — коэффициент мягкости)
    const dx = targetCamera.x - camera.x;
    const dy = targetCamera.y - camera.y;

    if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
        camera.x += dx * 0.15;
        camera.y += dy * 0.15;
        tileCache.clear(); // Сбрасываем кэш, так как координаты сдвинулись
    }
}

// ✅ НАСТРОЙКА СОБЫТИЙ КАРТЫ
export function setupMapEvents() {
    // Плавный зум к позиции курсора мыши
    canvas.addEventListener('wheel', e => {
        e.preventDefault();
        const before = screenToWorld(e.clientX, e.clientY);
        
        camera.zoom = Math.min(Math.max(camera.zoom * (e.deltaY > 0 ? 0.9 : 1.1), 0.05), 10);
        
        const after = screenToWorld(e.clientX, e.clientY);
        
        // Корректируем позицию, чтобы зум шёл в точку курсора
        camera.x += before.x - after.x;
        camera.y += before.y - after.y;
        
        // Синхронизируем целевую позицию, чтобы избежать рывков инерции после зума
        targetCamera.x = camera.x;
        targetCamera.y = camera.y;

        tileCache.clear();
    }, { passive: false });

    canvas.addEventListener('mousemove', e => {
        const world = screenToWorld(e.clientX, e.clientY);
        const nh = `${world.x},${world.y}`;
        if (getGridData()[nh] !== undefined && hoverCell !== nh) {
            hoverCell = nh;
        } else if (!getGridData()[nh] && hoverCell) {
            hoverCell = null;
        }
    });

    canvas.addEventListener('mouseleave', () => { 
        hoverCell = null; 
    });

    // Фиксация нажатий клавиатуры
    window.addEventListener('keydown', e => {
        if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
        keys[e.code] = true;
    });

    window.addEventListener('keyup', e => {
        keys[e.code] = false;
    });

    // Клик по карте
    canvas.addEventListener('click', async (e) => {
        const world = screenToWorld(e.clientX, e.clientY);
        const key = `${world.x},${world.y}`;
        const gridData = getGridData();
        const myId = getMyCountryId();

        if (window._recruitMode) {
            if (gridData[key] !== myId) {
                const { addNotification } = await import('./utils.js');
                addNotification('Можно нанимать войска только на своей территории!', 'war');
                return;
            }
            const { deployUnit } = await import('./military.js');
            deployUnit(key, window._recruitMode);
            window._recruitMode = null;
            document.getElementById('recruit-hint')?.classList.add('hidden');
            return;
        }

        const selId = getSelectedUnitId();
        if (selId !== null) {
            const units = getUnits();
            const u = units.find(unit => unit.id === selId);
            if (u && u.owner === myId) {
                const targetUnit = units.find(unit => unit.pos === key && unit.id !== selId);
                const { giveOrder } = await import('./military.js');
                
                if (targetUnit && isAtWar(myId, targetUnit.owner, window._wars || [])) {
                    giveOrder(selId, key, 'attack');
                } else {
                    giveOrder(selId, key, 'move');
                }
                const { setSelectedUnitId } = await import('./game.js');
                setSelectedUnitId(null);
                document.getElementById('order-hint')?.classList.add('hidden');
                return;
            }
        }

        if (window._selectedArmy) {
            if (gridData[key] && isAtWar(myId, gridData[key], window._wars || [])) {
                const { getArmies } = await import('./commanders.js');
                const army = getArmies().find(a => a.id === window._selectedArmy);
                if (army) {
                    const { giveOrder } = await import('./military.js');
                    army.units.forEach(uid => giveOrder(uid, key, 'attack'));
                    const { addNotification } = await import('./utils.js');
                    addNotification(`Армия "${army.name}" начала наступление!`, 'info');
                }
            }
            window._selectedArmy = null;
            document.getElementById('order-hint')?.classList.add('hidden');
            return;
        }

        const clickedUnit = getUnits().find(u => u.pos === key);
        if (clickedUnit && clickedUnit.owner === myId && (clickedUnit.trainingDaysLeft || 0) <= 0) {
            const { setSelectedUnitId } = await import('./game.js');
            setSelectedUnitId(clickedUnit.id);
            document.getElementById('info-sidebar')?.classList.add('hidden');
            const { showHint } = await import('./ui.js');
            showHint('⚔️ ЛКМ по врагу = атака | ЛКМ по клетке = движение');
            return;
        }
        
        if (gridData[key] && gridData[key] !== myId) {
            const { showCountryInfo } = await import('./ui.js');
            showCountryInfo(gridData[key], key);
        }
    });
}

// ✅ ОСНОВНОЙ РЕНДЕР КАРТЫ
export function renderMap() {
    if (!canvas.width || !canvas.height) return;

    // Очистка экрана базовым цветом океана
    ctx.fillStyle = '#1b3a4b'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const gridData = getGridData();
    const myCountryId = getMyCountryId();

    // Расчет видимого диапазона тайлов
    const startTileX = Math.floor(((0 - canvas.width / 2) / camera.zoom + camera.x) / TILE_SIZE);
    const endTileX = Math.ceil(((canvas.width - canvas.width / 2) / camera.zoom + camera.x) / TILE_SIZE);
    const startTileY = Math.floor(((0 - canvas.height / 2) / camera.zoom + camera.y) / TILE_SIZE);
    const endTileY = Math.ceil(((canvas.height - canvas.height / 2) / camera.zoom + camera.y) / TILE_SIZE);

    // Отрисовка видимых тайлов
    for (let tx = startTileX; tx <= endTileX; tx++) {
        for (let ty = startTileY; ty <= endTileY; ty++) {
            renderTile(tx, ty);
        }
    }

    // Отрисовка динамических объектов (Котлы, Бои, Юниты) поверх кэша тайлов
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    // Отрисовка котлов логистической системы
    const { drawPockets } = requireSupply();
    if (drawPockets) {
        drawPockets(ctx, CELL_SIZE, pocketCache, pocketFrame, POCKET_INTERVAL, (data) => pocketCache = data, (f) => pocketFrame = f);
    }

    // Подсветка клетки под курсором мыши
    if (hoverCell) {
        const [hx, hy] = hoverCell.split(',').map(Number);
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(hx * CELL_SIZE, hy * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }

    // Визуализация текущих сражений
    const battles = window._activeBattles || [];
    battles.forEach(b => {
        if (!b.attacker || !b.defender) return;
        const [ax, ay] = b.attacker.pos.split(',').map(Number);
        const [dx, dy] = b.defender.pos.split(',').map(Number);

        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ax * CELL_SIZE + CELL_SIZE / 2, ay * CELL_SIZE + CELL_SIZE / 2);
        ctx.lineTo(dx * CELL_SIZE + CELL_SIZE / 2, dy * CELL_SIZE + CELL_SIZE / 2);
        ctx.stroke();

        ctx.font = '10px serif';
        ctx.fillStyle = '#ef4444';
        ctx.textAlign = 'center';
        ctx.fillText('💥', dx * CELL_SIZE + CELL_SIZE / 2, dy * CELL_SIZE + CELL_SIZE / 2 - 2);
    });

    // Отрисовка армий и дивизий
    const units = getUnits();
    const selUnitId = getSelectedUnitId();

    units.forEach(u => {
        const [ux, uy] = u.pos.split(',').map(Number);
        const isSelected = u.id === selUnitId;

        // Коррекция смещения юнитов на одной клетке
        let offsetX = 0, offsetY = 0;
        const shared = units.filter(o => o.pos === u.pos);
        if (shared.length > 1) {
            const idx = shared.findIndex(o => o.id === u.id);
            offsetX = (idx % 2) * 6 - 3;
            offsetY = Math.floor(idx / 2) * 6 - 3;
        }

        const rx = ux * CELL_SIZE + CELL_SIZE / 2 + offsetX;
        const ry = uy * CELL_SIZE + CELL_SIZE / 2 + offsetY;

        // Отрисовка плашек юнитов
        ctx.fillStyle = u.owner === myCountryId ? '#15803d' : '#ef4444';
        if (isSelected) ctx.fillStyle = '#eab308';

        ctx.beginPath();
        ctx.arc(rx, ry, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Отображение типа юнита (Пехота / Танки)
        ctx.fillStyle = 'white';
        ctx.font = '7px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(u.type === 'tank' ? '♞' : '♟', rx, ry);

        // Индикатор ХП дивизии под кружком
        const hpPercent = (u.hp || 100) / 100;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(rx - 6, ry + 7, 12, 2);
        ctx.fillStyle = hpPercent > 0.5 ? '#22c55e' : '#ef4444';
        ctx.fillRect(rx - 6, ry + 7, 12 * hpPercent, 2);

        // Метка снабжения (если отрезан от баз)
        if (u.outOfSupply) {
            ctx.fillStyle = '#f97316';
            ctx.font = '8px sans-serif';
            ctx.fillText('⚠️', rx + 6, ry - 6);
        }
    });

    ctx.restore();
}

// ✅ ОТРИСОВКА И КЭШИРОВАНИЕ ТАЙЛОВ КАРТЫ
function renderTile(tx, ty) {
    const cacheKey = `${tx},${ty},${camera.zoom}`;
    
    if (tileCache.has(cacheKey)) {
        const imgData = tileCache.get(cacheKey);
        const sx = tx * TILE_SIZE - camera.x * camera.zoom + canvas.width / 2;
        const sy = ty * TILE_SIZE - camera.y * camera.zoom + canvas.height / 2;
        ctx.putImageData(imgData, sx, sy);
        return;
    }

    if (!offscreenCanvas) {
        offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = TILE_SIZE;
        offscreenCanvas.height = TILE_SIZE;
        offscreenCtx = offscreenCanvas.getContext('2d', { alpha: false });
    }

    // Заполнение фона океана на тайле
    offscreenCtx.fillStyle = '#1b3a4b';
    offscreenCtx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);

    offscreenCtx.save();
    offscreenCtx.scale(camera.zoom, camera.zoom);
    
    const worldTileSize = TILE_SIZE / camera.zoom;
    const wx0 = tx * worldTileSize;
    const wy0 = ty * worldTileSize;
    offscreenCtx.translate(-wx0, -wy0);

    const gridData = getGridData();
    const cellStats = getCellStats();
    const myId = getMyCountryId();

    const cx0 = Math.floor(wx0 / CELL_SIZE) - 1;
    const cx1 = Math.ceil((wx0 + worldTileSize) / CELL_SIZE) + 1;
    const cy0 = Math.floor(wy0 / CELL_SIZE) - 1;
    const cy1 = Math.ceil((wy0 + worldTileSize) / CELL_SIZE) + 1;

    // Отрисовка сухопутных ячеек провинций внутри тайла
    for (let cx = cx0; cx <= cx1; cx++) {
        for (let cy = cy0; cy <= cy1; cy++) {
            const posKey = `${cx},${cy}`;
            const countryId = gridData[posKey];
            if (!countryId) continue;

            const info = getCountryInfo(countryId);
            offscreenCtx.fillStyle = info.color || '#4b5563';
            offscreenCtx.fillRect(cx * CELL_SIZE, cy * CELL_SIZE, CELL_SIZE, CELL_SIZE);

            // Тонкая разметка границ
            offscreenCtx.strokeStyle = 'rgba(0,0,0,0.15)';
            offscreenCtx.lineWidth = 0.5;
            offscreenCtx.strokeRect(cx * CELL_SIZE, cy * CELL_SIZE, CELL_SIZE, CELL_SIZE);

            // Отрисовка построенных фабрик / заводов
            const cStat = cellStats[posKey];
            if (cStat && cStat.factories > 0) {
                offscreenCtx.fillStyle = 'rgba(255,255,255,0.25)';
                offscreenCtx.font = '7px sans-serif';
                offscreenCtx.fillText('🏭', cx * CELL_SIZE + 2, cy * CELL_SIZE + CELL_SIZE - 2);
            }
        }
    }

    offscreenCtx.restore();

    // Сохранение готового изображения тайла в ОЗУ кэша
    const imgData = offscreenCtx.getImageData(0, 0, TILE_SIZE, TILE_SIZE);
    if (tileCache.size >= MAX_TILES) {
        const firstKey = tileCache.keys().next().value;
        tileCache.delete(firstKey);
    }
    tileCache.set(cacheKey, imgData);

    const sx = tx * TILE_SIZE - camera.x * camera.zoom + canvas.width / 2;
    const sy = ty * TILE_SIZE - camera.y * camera.zoom + canvas.height / 2;
    ctx.putImageData(imgData, sx, sy);
}

// Ленивый импорт логистики для разрыва циклических зависимостей
let supplyModule = null;
function requireSupply() {
    if (!supplyModule && window._modules && window._modules.supply) {
        supplyModule = window._modules.supply;
    }
    return supplyModule || {};
}
