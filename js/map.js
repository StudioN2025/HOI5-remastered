// map.js — рендеринг карты

import { getCountryInfo, getCellData } from './utils.js';
import { getGridData, getUnits, getMyCountryId, getBuildingQueue, getSelectedUnitId, getActiveBattles, getWars, getAlliances } from './game.js';
import { BUILDING_STATS } from './data.js';

const canvas = document.getElementById('map-canvas');
let ctx = canvas.getContext('2d');
const CELL_SIZE = 20;
let hoverCell = null;
let camera = { x: 0, y: 0, zoom: 0.8 };

export function getCamera() { return camera; }
export function setCamera(newCamera) { camera = newCamera; }
export function getHoverCell() { return hoverCell; }
export function setHoverCell(cell) { hoverCell = cell; }
export function getCellSize() { return CELL_SIZE; }
export { canvas, ctx };

export function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
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

export function worldToScreen(x, y) {
    const screenX = (x * CELL_SIZE - camera.x) * camera.zoom + canvas.width / 2;
    const screenY = (y * CELL_SIZE - camera.y) * camera.zoom + canvas.height / 2;
    return { x: screenX, y: screenY };
}

export function renderMap() {
    if (!ctx) return;
    
    ctx.fillStyle = '#1b3a4b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width / 2 - camera.x * camera.zoom, canvas.height / 2 - camera.y * camera.zoom);
    ctx.scale(camera.zoom, camera.zoom);

    const gridData = getGridData();
    const units = getUnits();
    const buildingQueue = getBuildingQueue();
    const myCountryId = getMyCountryId();
    const selectedUnitId = getSelectedUnitId();
    const wars = getWars();
    const alliances = getAlliances();

    const startX = Math.floor((camera.x - canvas.width / 2 / camera.zoom) / CELL_SIZE) - 1;
    const endX = Math.floor((camera.x + canvas.width / 2 / camera.zoom) / CELL_SIZE) + 1;
    const startY = Math.floor((camera.y - canvas.height / 2 / camera.zoom) / CELL_SIZE) - 1;
    const endY = Math.floor((camera.y + canvas.height / 2 / camera.zoom) / CELL_SIZE) + 1;

    // Рисуем клетки
    Object.entries(gridData).forEach(([pos, id]) => {
        const [x, y] = pos.split(',').map(Number);
        if (x < startX || x > endX || y < startY || y > endY) return;

        ctx.fillStyle = getCountryInfo(id).color;
        ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.strokeRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    });

    // Ховер
    if (hoverCell && gridData[hoverCell]) {
        const [hx, hy] = hoverCell.split(',').map(Number);
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(hx * CELL_SIZE, hy * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }

    // Стройка
    if (buildingQueue.length > 0 && buildingQueue[0]) {
        const [bx, by] = buildingQueue[0].pos.split(',').map(Number);
        const stats = BUILDING_STATS[buildingQueue[0].type];
        if (stats) {
            const progress = (stats.buildTime - buildingQueue[0].daysLeft) / stats.buildTime;
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.fillRect(bx * CELL_SIZE, by * CELL_SIZE + CELL_SIZE - 4, CELL_SIZE, 4);
            ctx.fillStyle = '#3b82f6';
            ctx.fillRect(bx * CELL_SIZE, by * CELL_SIZE + CELL_SIZE - 4, CELL_SIZE * progress, 4);
        }
    }

    // Юниты
    units.forEach(u => {
        const [ux, uy] = u.pos.split(',').map(Number);
        if (ux < startX || ux > endX || uy < startY || uy > endY) return;

        // Подсветка выбранного юнита
        if (u.id === selectedUnitId) {
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 2;
            ctx.strokeRect(ux * CELL_SIZE - 2, uy * CELL_SIZE - 2, CELL_SIZE + 4, CELL_SIZE + 4);
        }

        ctx.font = `${CELL_SIZE * 0.8}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        if (u.trainingDaysLeft > 0) {
            ctx.globalAlpha = 0.5;
            ctx.fillText('🛠', ux * CELL_SIZE + CELL_SIZE / 2, uy * CELL_SIZE + CELL_SIZE / 2);
            ctx.globalAlpha = 1;
        } else {
            ctx.fillText(getUnitIcon(u.type), ux * CELL_SIZE + CELL_SIZE / 2, uy * CELL_SIZE + CELL_SIZE / 2);
        }
    });

    ctx.restore();
}

function getUnitIcon(type) {
    return type === 'tank' ? '🚜' : '💂';
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
    // Зум
    canvas.addEventListener('wheel', e => {
        e.preventDefault();
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        camera.zoom = Math.min(Math.max(camera.zoom * zoomFactor, 0.05), 10);
        renderMap();
    }, { passive: false });

    // Ховер
    canvas.addEventListener('mousemove', e => {
        const world = screenToWorld(e.clientX, e.clientY);
        hoverCell = `${world.x},${world.y}`;
        renderMap();
    });

    canvas.addEventListener('mouseleave', () => {
        hoverCell = null;
        renderMap();
    });

    // Клавиши
    window._keys = {};
    window.addEventListener('keydown', e => { window._keys[e.code] = true; });
    window.addEventListener('keyup', e => { window._keys[e.code] = false; });

    setInterval(() => updateCamera(), 16);
}
