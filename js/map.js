import { getCountryInfo, getCellData } from './utils.js';
import { getGridData, getUnits, getMyCountryId, getBuildingQueue } from './game.js';
import { UNIT_STATS, BUILDING_STATS } from './data.js';

const canvas = document.getElementById('map-canvas');
let ctx = canvas.getContext('2d');
const CELL_SIZE = 20;
let camera = { x: 0, y: 0, zoom: 1 };
let hoverCell = null;

export function getCamera() { return camera; }
export function setCamera(newCamera) { camera = newCamera; }

// Вычисление центра карты
export function calculateMapCenter() {
    const gridData = getGridData();
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    
    Object.keys(gridData).forEach(pos => {
        const [x, y] = pos.split(',').map(Number);
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
    });
    
    if (minX === Infinity) return { x: 0, y: 0 };
    
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    return { x: centerX * CELL_SIZE, y: centerY * CELL_SIZE };
}

export function centerCameraOnMap() {
    const center = calculateMapCenter();
    camera.x = center.x;
    camera.y = center.y;
    renderMap();
}

export function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    console.log('resizeCanvas:', canvas.width, canvas.height);
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

// ГЛАВНАЯ ФУНКЦИЯ РЕНДЕРА
export function renderMap() {
    if (!ctx) {
        console.error('ctx is null');
        return;
    }
    
    // ТЕСТ: закрасить красным
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    console.log('renderMap вызван, canvas size:', canvas.width, canvas.height);
    
    const gridData = getGridData();
    const units = getUnits();
    const myCountryId = getMyCountryId();
    const buildingQueue = getBuildingQueue();
    
    if (canvas.width === 0 || canvas.height === 0) {
        console.warn('Canvas size is 0');
        return;
    }
    
    ctx.save();
    ctx.translate(canvas.width/2 - camera.x * camera.zoom, canvas.height/2 - camera.y * camera.zoom);
    ctx.scale(camera.zoom, camera.zoom);
    
    const startX = Math.floor((camera.x - canvas.width/2/camera.zoom) / CELL_SIZE) - 2;
    const endX = Math.floor((camera.x + canvas.width/2/camera.zoom) / CELL_SIZE) + 2;
    const startY = Math.floor((camera.y - canvas.height/2/camera.zoom) / CELL_SIZE) - 2;
    const endY = Math.floor((camera.y + canvas.height/2/camera.zoom) / CELL_SIZE) + 2;
    
    let cellsDrawn = 0;
    
    // Рисуем клетки
    for (let x = startX; x <= endX; x++) {
        for (let y = startY; y <= endY; y++) {
            const key = `${x},${y}`;
            const id = gridData[key];
            if (id) {
                ctx.fillStyle = getCountryInfo(id).color;
                ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                ctx.strokeStyle = 'rgba(0,0,0,0.1)';
                ctx.strokeRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                cellsDrawn++;
            }
        }
    }
    
    console.log('Cells drawn:', cellsDrawn, 'Range X:', startX, endX, 'Y:', startY, endY);
    
    // Юниты
    units.forEach(u => {
        const [x, y] = u.pos.split(',').map(Number);
        if (x >= startX && x <= endX && y >= startY && y <= endY) {
            ctx.font = `${CELL_SIZE * 0.8}px sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = '#ffffff';
            ctx.fillText(UNIT_STATS[u.type]?.icon || "?", x * CELL_SIZE + CELL_SIZE/2, y * CELL_SIZE + CELL_SIZE/2);
        }
    });
    
    ctx.restore();
}

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
    canvas.addEventListener('wheel', e => {
        e.preventDefault();
        camera.zoom = Math.min(Math.max(camera.zoom * (e.deltaY > 0 ? 0.9 : 1.1), 0.3), 3);
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
    
    let lastMoveTime = 0;
    function updateCameraMove() {
        const now = Date.now();
        if (now - lastMoveTime < 16) {
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
        
        if (moved) throttledRender();
        requestAnimationFrame(updateCameraMove);
    }
    updateCameraMove();
}
