import { getCountryInfo, getCellData } from './utils.js';
import { getGridData, getUnits, getMyCountryId, getBuildingQueue, getSelectedUnitId } from './game.js';
import { UNIT_STATS, BUILDING_STATS } from './data.js';

const canvas = document.getElementById('map-canvas');
let ctx = canvas.getContext('2d');
const CELL_SIZE = 20;
let hoverCell = null;
let camera = { x: 0, y: 0, zoom: 1 };

export function getCamera() { return camera; }
export function setCamera(newCamera) { camera = newCamera; }
export function getHoverCell() { return hoverCell; }
export function setHoverCell(cell) { hoverCell = cell; }

export function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
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

export function worldToScreen(x, y) {
    const screenX = (x * CELL_SIZE - camera.x) * camera.zoom + canvas.width/2;
    const screenY = (y * CELL_SIZE - camera.y) * camera.zoom + canvas.height/2;
    return { x: screenX, y: screenY };
}

export function clearCanvas() {
    if (!ctx) return;
    // Очищаем весь канвас
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Заливаем фоном
    ctx.fillStyle = '#1b3a4b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

export function renderMap() {
    if (!ctx) return;
    
    // ✅ КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ: очищаем канвас перед отрисовкой
    clearCanvas();
    
    const gridData = getGridData();
    const units = getUnits();
    const buildingQueue = getBuildingQueue();
    const myCountryId = getMyCountryId();
    const selectedUnitId = getSelectedUnitId?.() || null;
    
    ctx.save();
    ctx.translate(canvas.width/2 - camera.x * camera.zoom, canvas.height/2 - camera.y * camera.zoom);
    ctx.scale(camera.zoom, camera.zoom);
    
    const startX = Math.floor((camera.x - canvas.width/2/camera.zoom) / CELL_SIZE) - 1;
    const endX = Math.floor((camera.x + canvas.width/2/camera.zoom) / CELL_SIZE) + 1;
    const startY = Math.floor((camera.y - canvas.height/2/camera.zoom) / CELL_SIZE) - 1;
    const endY = Math.floor((camera.y + canvas.height/2/camera.zoom) / CELL_SIZE) + 1;
    
    // Рисуем клетки
    Object.entries(gridData).forEach(([pos, id]) => {
        const [x, y] = pos.split(',').map(Number);
        if (x < startX || x > endX || y < startY || y > endY) return;
        
        ctx.fillStyle = getCountryInfo(id).color;
        ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.strokeRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        
        // Здания
        const cell = getCellData(pos, {});
        if (cell.factories > 0) {
            ctx.font = `${CELL_SIZE * 0.6}px sans-serif`;
            ctx.fillStyle = 'white';
            ctx.fillText("🏭", x * CELL_SIZE + 2, y * CELL_SIZE + CELL_SIZE - 4);
        }
        if (cell.buildings?.includes('port')) {
            ctx.fillStyle = '#3b82f6';
            ctx.fillText("⚓", x * CELL_SIZE + 2, y * CELL_SIZE + CELL_SIZE - 4);
        }
    });
    
    // Стройка
    if (buildingQueue.length > 0 && buildingQueue[0]) {
        const [x, y] = buildingQueue[0].pos.split(',').map(Number);
        const stats = BUILDING_STATS[buildingQueue[0].type];
        if (stats) {
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE + CELL_SIZE - 4, CELL_SIZE, 4);
            const progress = (stats.buildTime - buildingQueue[0].daysLeft) / stats.buildTime;
            ctx.fillStyle = '#3b82f6';
            ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE + CELL_SIZE - 4, CELL_SIZE * progress, 4);
        }
    }
    
    // Юниты
    units.forEach(u => {
        const [x, y] = u.pos.split(',').map(Number);
        if (x < startX || x > endX || y < startY || y > endY) return;
        
        if (u.id === selectedUnitId) {
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 2;
            ctx.strokeRect(x * CELL_SIZE - 2, y * CELL_SIZE - 2, CELL_SIZE + 4, CELL_SIZE + 4);
        }
        
        ctx.font = `${CELL_SIZE * 0.8}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = u.owner === myCountryId ? '#ffffff' : '#ff9999';
        ctx.globalAlpha = u.trainingDaysLeft > 0 ? 0.5 : 1;
        ctx.fillText(UNIT_STATS[u.type]?.icon || "❓", x * CELL_SIZE + CELL_SIZE/2, y * CELL_SIZE + CELL_SIZE/2);
        ctx.globalAlpha = 1;
    });
    
    // Ховер
    if (hoverCell && gridData[hoverCell]) {
        const [hx, hy] = hoverCell.split(',').map(Number);
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(hx * CELL_SIZE, hy * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.strokeRect(hx * CELL_SIZE, hy * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }
    
    ctx.restore();
}

export function updateCamera() {
    const keys = window._keys || {};
    const speed = 15 / camera.zoom;
    let moved = false;
    if (keys['KeyW']) { camera.y -= speed; moved = true; }
    if (keys['KeyS']) { camera.y += speed; moved = true; }
    if (keys['KeyA']) { camera.x -= speed; moved = true; }
    if (keys['KeyD']) { camera.x += speed; moved = true; }
    if (moved) renderMap();
}

export function setupMapEvents() {
    canvas.addEventListener('wheel', e => {
        e.preventDefault();
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        camera.zoom = Math.min(Math.max(camera.zoom * zoomFactor, 0.2), 4);
        renderMap();
    });
    
    canvas.addEventListener('mousemove', e => {
        const world = screenToWorld(e.clientX, e.clientY);
        hoverCell = `${world.x},${world.y}`;
        renderMap();
    });
    
    canvas.addEventListener('mouseleave', () => {
        hoverCell = null;
        renderMap();
    });
    
    window._keys = {};
    window.addEventListener('keydown', e => { window._keys[e.code] = true; });
    window.addEventListener('keyup', e => { window._keys[e.code] = false; });
    
    setInterval(() => updateCamera(), 16);
}

// Экспортируем canvas для внешнего доступа
export { canvas, ctx };
