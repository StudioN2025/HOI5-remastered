// map.js — оптимизированный рендеринг карты

import { getCountryInfo, getCellData } from './utils.js';
import { getGridData, getUnits, getMyCountryId, getBuildingQueue, getSelectedUnitId, getActiveBattles, getWars, getAlliances } from './game.js';
import { BUILDING_STATS } from './data.js';

const canvas = document.getElementById('map-canvas');
let ctx = canvas.getContext('2d');
const CELL_SIZE = 20;

let hoverCell = null;
let camera = { x: 0, y: 0, zoom: 0.8 };

// Кэш для оптимизации
let cachedGridData = null;
let cachedUnits = null;
let needRedraw = true;

export function getCamera() { return camera; }
export function setCamera(newCamera) { camera = newCamera; needRedraw = true; }
export function getHoverCell() { return hoverCell; }
export function setHoverCell(cell) { 
    if (hoverCell !== cell) {
        hoverCell = cell;
        needRedraw = true;
    }
}
export function getCellSize() { return CELL_SIZE; }
export { canvas, ctx };

export function markDirty() {
    needRedraw = true;
}

export function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    needRedraw = true;
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

function getUnitIcon(type) {
    return type === 'tank' ? '🚜' : '💂';
}

export function renderMap() {
    if (!ctx) return;
    
    const gridData = getGridData();
    const units = getUnits();
    const buildingQueue = getBuildingQueue();
    const myCountryId = getMyCountryId();
    const selectedUnitId = getSelectedUnitId();
    
    // Проверяем, нужно ли перерисовывать
    if (!needRedraw && 
        cachedGridData === gridData && 
        cachedUnits === units) {
        return;
    }
    
    cachedGridData = gridData;
    cachedUnits = units;
    needRedraw = false;
    
    // Очистка и фон
    ctx.fillStyle = '#1b3a4b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.translate(canvas.width / 2 - camera.x * camera.zoom, canvas.height / 2 - camera.y * camera.zoom);
    ctx.scale(camera.zoom, camera.zoom);

    // Вычисляем видимую область
    const invZoom = 1 / camera.zoom;
    const startX = Math.floor((camera.x - canvas.width / 2 * invZoom) / CELL_SIZE) - 1;
    const endX = Math.floor((camera.x + canvas.width / 2 * invZoom) / CELL_SIZE) + 1;
    const startY = Math.floor((camera.y - canvas.height / 2 * invZoom) / CELL_SIZE) - 1;
    const endY = Math.floor((camera.y + canvas.height / 2 * invZoom) / CELL_SIZE) + 1;

    // Отрисовка клеток
    const cellStats = {};
    
    // Сначала рисуем все клетки одним цветом для оптимизации
    Object.entries(gridData).forEach(([pos, id]) => {
        const [x, y] = pos.split(',').map(Number);
        if (x < startX || x > endX || y < startY || y > endY) return;
        
        ctx.fillStyle = getCountryInfo(id).color;
        ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    });
    
    // Затем рисуем рамки и иконки
    Object.entries(gridData).forEach(([pos, id]) => {
        const [x, y] = pos.split(',').map(Number);
        if (x < startX || x > endX || y < startY || y > endY) return;
        
        // Рамка клетки
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.strokeRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        
        // Иконки зданий
        const cell = getCellData(pos, cellStats);
        if (cell.factories > 0 || (cell.buildings && cell.buildings.includes('port'))) {
            ctx.font = `${CELL_SIZE * 0.55}px sans-serif`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'bottom';
            
            if (cell.buildings && cell.buildings.includes('port')) {
                ctx.fillStyle = '#3b82f6';
                ctx.fillText('⚓', x * CELL_SIZE + 1, y * CELL_SIZE + CELL_SIZE);
            }
            if (cell.factories > 0) {
                ctx.fillStyle = '#ffffff';
                ctx.fillText('🏭', x * CELL_SIZE + 1, y * CELL_SIZE + CELL_SIZE - (cell.buildings?.includes('port') ? 8 : 0));
            }
        }
    });

    // Стройка (только если есть активная)
    if (buildingQueue.length > 0 && buildingQueue[0]) {
        const current = buildingQueue[0];
        const [bx, by] = current.pos.split(',').map(Number);
        if (bx >= startX && bx <= endX && by >= startY && by <= endY) {
            const stats = BUILDING_STATS[current.type];
            if (stats) {
                const progress = (stats.buildTime - current.daysLeft) / stats.buildTime;
                
                // Фон прогресс-бара
                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.fillRect(bx * CELL_SIZE, by * CELL_SIZE + CELL_SIZE - 4, CELL_SIZE, 4);
                
                // Заполнение прогресс-бара
                ctx.fillStyle = '#3b82f6';
                ctx.fillRect(bx * CELL_SIZE, by * CELL_SIZE + CELL_SIZE - 4, CELL_SIZE * progress, 4);
            }
        }
    }

    // Ховер
    if (hoverCell && gridData[hoverCell]) {
        const [hx, hy] = hoverCell.split(',').map(Number);
        if (hx >= startX && hx <= endX && hy >= startY && hy <= endY) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.fillRect(hx * CELL_SIZE, hy * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 1;
            ctx.strokeRect(hx * CELL_SIZE, hy * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        }
    }

    // Юниты (всегда поверх клеток)
    if (units.length > 0) {
        units.forEach(u => {
            const [ux, uy] = u.pos.split(',').map(Number);
            if (ux < startX || ux > endX || uy < startY || uy > endY) return;

            // Подсветка выбранного юнита
            if (u.id === selectedUnitId) {
                ctx.strokeStyle = '#fbbf24';
                ctx.lineWidth = 2;
                ctx.strokeRect(ux * CELL_SIZE - 2, uy * CELL_SIZE - 2, CELL_SIZE + 4, CELL_SIZE + 4);
            }

            // Иконка юнита
            ctx.font = `${CELL_SIZE * 0.75}px serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            if (u.trainingDaysLeft > 0) {
                ctx.globalAlpha = 0.5;
                ctx.fillText('🛠', ux * CELL_SIZE + CELL_SIZE / 2, uy * CELL_SIZE + CELL_SIZE / 2);
                ctx.globalAlpha = 1;
            } else {
                ctx.fillText(getUnitIcon(u.type), ux * CELL_SIZE + CELL_SIZE / 2, uy * CELL_SIZE + CELL_SIZE / 2);
            }
            
            // Полоска здоровья
            const hpPercent = u.hp / 100;
            const barWidth = CELL_SIZE * 0.7;
            const barHeight = 3;
            const barX = ux * CELL_SIZE + (CELL_SIZE - barWidth) / 2;
            const barY = uy * CELL_SIZE + CELL_SIZE - barHeight - 1;
            
            // Фон полоски
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);
            
            // Красная часть (потерянное здоровье)
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(barX, barY, barWidth, barHeight);
            
            // Зеленая часть (текущее здоровье)
            ctx.fillStyle = '#22c55e';
            ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);
        });
    }

    ctx.restore();
}

export function updateCamera() {
    const keys = window._keys || {};
    const speed = 15 / camera.zoom;
    if (keys['KeyW']) { camera.y -= speed; needRedraw = true; }
    if (keys['KeyS']) { camera.y += speed; needRedraw = true; }
    if (keys['KeyA']) { camera.x -= speed; needRedraw = true; }
    if (keys['KeyD']) { camera.x += speed; needRedraw = true; }
}

export function setupMapEvents() {
    // Зум колесиком
    canvas.addEventListener('wheel', e => {
        e.preventDefault();
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        camera.zoom = Math.min(Math.max(camera.zoom * zoomFactor, 0.1), 8);
        needRedraw = true;
        renderMap();
    }, { passive: false });

    // Отслеживание мыши — с троттлингом
    let lastMoveTime = 0;
    const MOVE_THROTTLE = 50; // мс между обновлениями ховера
    
    canvas.addEventListener('mousemove', e => {
        const now = Date.now();
        if (now - lastMoveTime < MOVE_THROTTLE) return;
        lastMoveTime = now;
        
        const world = screenToWorld(e.clientX, e.clientY);
        const newHover = `${world.x},${world.y}`;
        
        if (getGridData()[newHover] && hoverCell !== newHover) {
            hoverCell = newHover;
            needRedraw = true;
        } else if (!getGridData()[newHover] && hoverCell) {
            hoverCell = null;
            needRedraw = true;
        }
    });

    canvas.addEventListener('mouseleave', () => {
        if (hoverCell) {
            hoverCell = null;
            needRedraw = true;
        }
    });

    // Клавиши с троттлингом
    window._keys = {};
    window.addEventListener('keydown', e => { 
        if (['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) {
            window._keys[e.code] = true;
            needRedraw = true;
        }
    });
    window.addEventListener('keyup', e => { 
        window._keys[e.code] = false; 
    });

    // Интервал обновления камеры с фиксированной частотой
    setInterval(() => {
        updateCamera();
        if (needRedraw) renderMap();
    }, 1000 / 30); // 30 FPS для камеры
}

// Инициализация
resizeCanvas();
window.addEventListener('resize', () => {
    resizeCanvas();
    needRedraw = true;
});
