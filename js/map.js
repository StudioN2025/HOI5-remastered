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
    if (!ctx) return;
    
    const gridData = getGridData();
    const units = getUnits();
    const myCountryId = getMyCountryId();
    const buildingQueue = getBuildingQueue();
    
    if (canvas.width === 0 || canvas.height === 0) return;
    
    // Фон - море
    ctx.fillStyle = '#1b3a4b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.translate(canvas.width/2 - camera.x * camera.zoom, canvas.height/2 - camera.y * camera.zoom);
    ctx.scale(camera.zoom, camera.zoom);
    
    const startX = Math.floor((camera.x - canvas.width/2/camera.zoom) / CELL_SIZE) - 2;
    const endX = Math.floor((camera.x + canvas.width/2/camera.zoom) / CELL_SIZE) + 2;
    const startY = Math.floor((camera.y - canvas.height/2/camera.zoom) / CELL_SIZE) - 2;
    const endY = Math.floor((camera.y + canvas.height/2/camera.zoom) / CELL_SIZE) + 2;
    
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
                
                // Здания
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
    
    // Стройка
    if (buildingQueue.length > 0 && buildingQueue[0]) {
        const [x, y] = buildingQueue[0].pos.split(',').map(Number);
        const stats = BUILDING_STATS[buildingQueue[0].type];
        if (stats && x >= startX && x <= endX && y >= startY && y <= endY) {
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
        if (x >= startX && x <= endX && y >= startY && y <= endY) {
            ctx.font = `${CELL_SIZE * 0.8}px sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = u.owner === myCountryId ? '#ffffff' : '#ff9999';
            ctx.globalAlpha = u.trainingDaysLeft > 0 ? 0.5 : 1;
            ctx.fillText(UNIT_STATS[u.type]?.icon || "?", x * CELL_SIZE + CELL_SIZE/2, y * CELL_SIZE + CELL_SIZE/2);
            ctx.globalAlpha = 1;
            
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
    // Mouse events
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
    
    // Touch events for mobile
    let touchStartDistance = 0;
    let touchStartZoom = 1;
    let lastTouchX = 0, lastTouchY = 0;
    let isTouching = false;
    
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            lastTouchX = touch.clientX;
            lastTouchY = touch.clientY;
            isTouching = true;
        } else if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            touchStartDistance = Math.sqrt(dx * dx + dy * dy);
            touchStartZoom = camera.zoom;
            isTouching = false;
        }
    });
    
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (e.touches.length === 1 && isTouching) {
            const touch = e.touches[0];
            const dx = touch.clientX - lastTouchX;
            const dy = touch.clientY - lastTouchY;
            camera.x -= dx / camera.zoom;
            camera.y -= dy / camera.zoom;
            lastTouchX = touch.clientX;
            lastTouchY = touch.clientY;
            throttledRender();
        } else if (e.touches.length === 2 && touchStartDistance > 0) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const scale = distance / touchStartDistance;
            camera.zoom = Math.min(Math.max(touchStartZoom * scale, 0.3), 3);
            throttledRender();
        }
    });
    
    canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        isTouching = false;
        touchStartDistance = 0;
    });
    
    // Keyboard controls
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
