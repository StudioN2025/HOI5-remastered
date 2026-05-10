import { getCountryInfo, getCellData } from './utils.js';
import { getGridData, getUnits, getMyCountryId, getBuildingQueue } from './game.js';
import { UNIT_STATS, BUILDING_STATS } from './data.js';

const canvas = document.getElementById('map-canvas');
let ctx = canvas.getContext('2d');
const CELL_SIZE = 20;
let camera = { x: 0, y: 0, zoom: 1 };
let hoverCell = null;

// КЭШ для отрисованных клеток (для статичной карты)
let cachedMapImage = null;
let lastGridHash = null;

// Функция для хеширования карты (чтобы понять, изменилась ли она)
function getGridHash() {
    const gridData = getGridData();
    let hash = '';
    const keys = Object.keys(gridData).slice(0, 100);
    for (const key of keys) {
        hash += key + gridData[key];
    }
    return hash;
}

export function getCamera() { return camera; }
export function setCamera(newCamera) { camera = newCamera; }

export function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    cachedMapImage = null; // Сбрасываем кэш при изменении размера
    renderMap();
}

export function screenToWorld(sx, sy) {
    const rect = canvas.getBoundingClientRect();
    const canvasX = sx - rect.left;
    const canvasY = sy - rect.top;
    const x = Math.floor(((canvasX - canvas.width/2) / camera.zoom + camera.x) / CELL_SIZE);
    const y = Math.floor(((canvasY - canvas.height/2) / camera.zoom + camera.y) / CELL_SIZE);
    return { x, y };
}

// Рендер ТОЛЬКО видимой области (без кэша, но быстро)
export function renderMap() {
    if (!ctx) return;
    
    const gridData = getGridData();
    const units = getUnits();
    const myCountryId = getMyCountryId();
    const buildingQueue = getBuildingQueue();
    
    // Оптимизация: не рисуем если окно маленькое или зум слишком большой
    if (canvas.width === 0 || canvas.height === 0) return;
    
    ctx.fillStyle = '#1b3a4b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.translate(canvas.width/2 - camera.x * camera.zoom, canvas.height/2 - camera.y * camera.zoom);
    ctx.scale(camera.zoom, camera.zoom);
    
    // Рисуем ТОЛЬКО видимые клетки
    const startX = Math.floor((camera.x - canvas.width/2/camera.zoom) / CELL_SIZE) - 2;
    const endX = Math.floor((camera.x + canvas.width/2/camera.zoom) / CELL_SIZE) + 2;
    const startY = Math.floor((camera.y - canvas.height/2/camera.zoom) / CELL_SIZE) - 2;
    const endY = Math.floor((camera.y + canvas.height/2/camera.zoom) / CELL_SIZE) + 2;
    
    // Ограничиваем диапазон, чтобы не рисовать лишнее
    const minX = Math.max(startX, -100);
    const maxX = Math.min(endX, 200);
    const minY = Math.max(startY, -100);
    const maxY = Math.min(endY, 300);
    
    // Рисуем клетки
    for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
            const key = `${x},${y}`;
            const id = gridData[key];
            if (id) {
                ctx.fillStyle = getCountryInfo(id).color;
                ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                ctx.strokeStyle = 'rgba(0,0,0,0.1)';
                ctx.strokeRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            }
        }
    }
    
    // Рисуем здания (только на видимых)
    for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
            const key = `${x},${y}`;
            const id = gridData[key];
            if (id) {
                const cell = getCellData(key, {});
                if (cell.factories > 0) {
                    ctx.font = `${CELL_SIZE * 0.6}px sans-serif`;
                    ctx.fillStyle = 'white';
                    ctx.fillText("🏭", x * CELL_SIZE + 2, y * CELL_SIZE + CELL_SIZE - 4);
                }
                if (cell.buildings?.includes('port')) {
                    ctx.fillStyle = '#3b82f6';
                    ctx.fillText("⚓", x * CELL_SIZE + 2, y * CELL_SIZE + CELL_SIZE - 4);
                }
            }
        }
    }
    
    // Стройка (только активная)
    if (buildingQueue.length > 0 && buildingQueue[0]) {
        const [x, y] = buildingQueue[0].pos.split(',').map(Number);
        if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
            const stats = BUILDING_STATS[buildingQueue[0].type];
            if (stats) {
                ctx.fillStyle = 'rgba(255,255,255,0.3)';
                ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE + CELL_SIZE - 4, CELL_SIZE, 4);
                const progress = (stats.buildTime - buildingQueue[0].daysLeft) / stats.buildTime;
                ctx.fillStyle = '#3b82f6';
                ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE + CELL_SIZE - 4, CELL_SIZE * progress, 4);
            }
        }
    }
    
    // Рисуем юниты
    units.forEach(u => {
        const [x, y] = u.pos.split(',').map(Number);
        if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
            ctx.font = `${CELL_SIZE * 0.8}px sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = u.owner === myCountryId ? '#ffffff' : '#ff9999';
            ctx.globalAlpha = u.trainingDaysLeft > 0 ? 0.5 : 1;
            ctx.fillText(UNIT_STATS[u.type]?.icon || "❓", x * CELL_SIZE + CELL_SIZE/2, y * CELL_SIZE + CELL_SIZE/2);
            ctx.globalAlpha = 1;
            
            // Полоска здоровья (только если HP меньше максимума)
            const stats = UNIT_STATS[u.type];
            if (stats && u.hp && u.hp < stats.hp) {
                const hpPercent = u.hp / stats.hp;
                ctx.fillStyle = '#ff4444';
                ctx.fillRect(x * CELL_SIZE + 2, y * CELL_SIZE + CELL_SIZE - 6, CELL_SIZE - 4, 3);
                ctx.fillStyle = '#44ff44';
                ctx.fillRect(x * CELL_SIZE + 2, y * CELL_SIZE + CELL_SIZE - 6, (CELL_SIZE - 4) * hpPercent, 3);
            }
        }
    });
    
    // Ховер
    if (hoverCell && gridData[hoverCell]) {
        const [hx, hy] = hoverCell.split(',').map(Number);
        if (hx >= minX && hx <= maxX && hy >= minY && hy <= maxY) {
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.fillRect(hx * CELL_SIZE, hy * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            ctx.strokeStyle = 'rgba(255,255,255,0.5)';
            ctx.strokeRect(hx * CELL_SIZE, hy * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        }
    }
    
    ctx.restore();
}

// Оптимизированное обновление камеры с throttling
let lastCameraUpdate = 0;
let pendingRender = false;

function throttledRender() {
    if (pendingRender) return;
    pendingRender = true;
    requestAnimationFrame(() => {
        renderMap();
        pendingRender = false;
    });
}

export function setupMapEvents() {
    let wheelTimeout;
    
    canvas.addEventListener('wheel', e => {
        e.preventDefault();
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        camera.zoom = Math.min(Math.max(camera.zoom * zoomFactor, 0.3), 3);
        throttledRender();
    });
    
    canvas.addEventListener('mousemove', e => {
        const world = screenToWorld(e.clientX, e.clientY);
        hoverCell = `${world.x},${world.y}`;
        throttledRender();
    });
    
    canvas.addEventListener('mouseleave', () => {
        hoverCell = null;
        throttledRender();
    });
    
    const keys = {};
    window.addEventListener('keydown', e => { keys[e.code] = true; });
    window.addEventListener('keyup', e => { keys[e.code] = false; });
    
    // Оптимизированное движение камеры - не каждый кадр, а с интервалом
    let lastMoveTime = 0;
    function updateCameraMove() {
        const now = Date.now();
        if (now - lastMoveTime < 16) { // ~60fps
            requestAnimationFrame(updateCameraMove);
            return;
        }
        lastMoveTime = now;
        
        let moved = false;
        const speed = 15 / camera.zoom;
        if (keys['KeyW']) { camera.y -= speed; moved = true; }
        if (keys['KeyS']) { camera.y += speed; moved = true; }
        if (keys['KeyA']) { camera.x -= speed; moved = true; }
        if (keys['KeyD']) { camera.x += speed; moved = true; }
        
        if (moved) {
            throttledRender();
        }
        requestAnimationFrame(updateCameraMove);
    }
    updateCameraMove();
}
