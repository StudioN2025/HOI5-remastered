// map.js — исправленная версия

import { getCountryInfo } from './utils.js';
import { getGridData, getUnits, getMyCountryId, getBuildingQueue, getSelectedUnitId, getCellStats } from './game.js';
import { BUILDING_STATS } from './data.js';
import { 
    getOffscreenCanvas, 
    renderDirtyCells, 
    getVisibleSourceRect, 
    getWorldBounds, 
    markAllDirty,
    CELL_SIZE 
} from './renderer.js';

const canvas = document.getElementById('map-canvas');
let ctx = canvas.getContext('2d', { 
    alpha: false,
    desynchronized: true
});

// Камера
let camera = { x: 0, y: 0, zoom: 0.6 };
let hoverCell = null;
let cameraInitialized = false;

// ... (остальные функции)

// Инициализация камеры ПО ЦЕНТРУ КАРТЫ (учитывая отрицательные координаты)
function initCamera() {
    const bounds = getWorldBounds();
    
    // Центр в МИРОВЫХ координатах (клетках)
    const centerCellX = (bounds.minX + bounds.maxX) / 2;
    const centerCellY = (bounds.minY + bounds.maxY) / 2;
    
    // Центр в пикселях
    const centerX = centerCellX * CELL_SIZE;
    const centerY = centerCellY * CELL_SIZE;
    
    camera.x = centerX;
    camera.y = centerY;
    
    // Автоматический зум, чтобы вся карта помещалась на экране
    const worldWidth = (bounds.maxX - bounds.minX + 2) * CELL_SIZE;
    const worldHeight = (bounds.maxY - bounds.minY + 2) * CELL_SIZE;
    
    const zoomX = canvas.width / worldWidth;
    const zoomY = canvas.height / worldHeight;
    camera.zoom = Math.min(zoomX, zoomY, 1.5) * 0.95;
    
    cameraInitialized = true;
    console.log(`🎥 Камера: центр клетка (${centerCellX.toFixed(1)}, ${centerCellY.toFixed(1)}), зум ${camera.zoom.toFixed(2)}`);
}

// Основной рендер
export function renderMap() {
    if (!ctx) return;
    
    const offscreen = getOffscreenCanvas();
    if (!offscreen) return;
    
    if (!cameraInitialized) {
        initCamera();
    }
    
    renderDirtyCells();
    
    // Очищаем экран
    ctx.fillStyle = '#0a1628';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const srcRect = getVisibleSourceRect(camera, canvas.width, canvas.height);
    
    if (srcRect.sw > 0 && srcRect.sh > 0 && srcRect.dw > 0 && srcRect.dh > 0) {
        try {
            // Включаем сглаживание для лучшего качества
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            
            ctx.drawImage(
                offscreen,
                srcRect.sx, srcRect.sy, srcRect.sw, srcRect.sh,
                srcRect.dx, srcRect.dy, srcRect.dw, srcRect.dh
            );
        } catch(e) {
            console.warn('Ошибка копирования:', e);
        }
    }
    
    renderDynamicLayer();
}

// ... (остальной код без изменений)

// ... остальной код renderDynamicLayer, updatePocketCache, updateCamera, setupMapEvents остаётся без изменений

// Динамический слой (оставляем как было)
function renderDynamicLayer() {
    const units = getUnits();
    const myId = getMyCountryId();
    const selectedUnitId = getSelectedUnitId();
    const gridData = getGridData();
    const buildingQueue = getBuildingQueue();
    
    ctx.save();
    
    for (const u of units) {
        if (!u?.pos) continue;
        const [ux, uy] = u.pos.split(',').map(Number);
        
        const screenX = (ux * CELL_SIZE - camera.x) * camera.zoom + canvas.width/2;
        const screenY = (uy * CELL_SIZE - camera.y) * camera.zoom + canvas.height/2;
        const size = CELL_SIZE * camera.zoom;
        
        if (screenX + size < 0 || screenX > canvas.width || screenY + size < 0 || screenY > canvas.height) continue;
        
        if (u.id === selectedUnitId && u.path?.length > 0) {
            const lastStep = u.path[u.path.length - 1];
            if (lastStep) {
                const [ex, ey] = lastStep.split(',').map(Number);
                const exScreen = (ex * CELL_SIZE + CELL_SIZE/2 - camera.x) * camera.zoom + canvas.width/2;
                const eyScreen = (ey * CELL_SIZE + CELL_SIZE/2 - camera.y) * camera.zoom + canvas.height/2;
                
                ctx.strokeStyle = 'rgba(255,215,0,0.5)';
                ctx.lineWidth = 2;
                ctx.setLineDash([3, 5]);
                ctx.beginPath();
                ctx.arc(exScreen, eyScreen, size * 0.3, 0, Math.PI*2);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }
        
        if (u.id === selectedUnitId) {
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 2;
            ctx.setLineDash([]);
            ctx.strokeRect(screenX - 1, screenY - 1, size + 2, size + 2);
        }
        
        ctx.font = `${Math.max(10, size * 0.7)}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';
        
        const cx = screenX + size/2;
        const cy = screenY + size/2;
        
        if (u.trainingDaysLeft > 0) {
            ctx.globalAlpha = 0.5;
            ctx.fillText('🛠', cx, cy);
            ctx.globalAlpha = 1;
        } else {
            ctx.fillText(u.type === 'tank' ? '🚜' : '💂', cx, cy);
        }
        
        if (u.hp != null) {
            const maxHp = u.type === 'tank' ? 50 : 100;
            const hpP = Math.max(0, Math.min(1, u.hp / maxHp));
            const barWidth = size * 0.6;
            const barX = screenX + (size - barWidth)/2;
            const barY = screenY + size - 4;
            
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(barX, barY, barWidth, 3);
            ctx.fillStyle = hpP > 0.5 ? '#22c55e' : hpP > 0.25 ? '#eab308' : '#ef4444';
            ctx.fillRect(barX, barY, barWidth * hpP, 3);
        }
    }
    
    if (buildingQueue.length > 0 && buildingQueue[0]?.pos) {
        const [bx, by] = buildingQueue[0].pos.split(',').map(Number);
        const stats = BUILDING_STATS[buildingQueue[0].type];
        if (stats) {
            const progress = Math.max(0, Math.min(1, (stats.buildTime - buildingQueue[0].daysLeft) / stats.buildTime));
            const bxScreen = (bx * CELL_SIZE - camera.x) * camera.zoom + canvas.width/2;
            const byScreen = ((by+1) * CELL_SIZE - 3 - camera.y) * camera.zoom + canvas.height/2;
            const width = CELL_SIZE * camera.zoom;
            
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.fillRect(bxScreen, byScreen, width, 3);
            ctx.fillStyle = '#3b82f6';
            ctx.fillRect(bxScreen, byScreen, width * progress, 3);
        }
    }
    
    pocketFrame++;
    if (pocketFrame >= POCKET_INTERVAL) {
        pocketFrame = 0;
        updatePocketCache();
    }
    
    if (pocketCache) {
        for (const pocket of pocketCache) {
            const pulse = Math.sin(Date.now() / 500) * 0.3 + 0.7;
            for (const pos of pocket.cells) {
                const [x, y] = pos.split(',').map(Number);
                const screenX = (x * CELL_SIZE - camera.x) * camera.zoom + canvas.width/2;
                const screenY = (y * CELL_SIZE - camera.y) * camera.zoom + canvas.height/2;
                const size = CELL_SIZE * camera.zoom;
                
                ctx.strokeStyle = pocket.isEnemy ? `rgba(255,30,30,${pulse})` : `rgba(255,200,0,${pulse})`;
                ctx.lineWidth = 2;
                ctx.setLineDash([4, 4]);
                ctx.strokeRect(screenX + 1, screenY + 1, size - 2, size - 2);
                ctx.setLineDash([]);
            }
        }
    }
    
    if (hoverCell && gridData[hoverCell]) {
        const [hx, hy] = hoverCell.split(',').map(Number);
        const screenX = (hx * CELL_SIZE - camera.x) * camera.zoom + canvas.width/2;
        const screenY = (hy * CELL_SIZE - camera.y) * camera.zoom + canvas.height/2;
        const size = CELL_SIZE * camera.zoom;
        
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(screenX, screenY, size, size);
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(screenX, screenY, size, size);
    }
    
    ctx.restore();
}

function updatePocketCache() {
    try {
        const myId = getMyCountryId();
        const wars = window._wars || [];
        if (!myId || !wars.length) { pocketCache = null; return; }
        
        import('./supply.js').then(m => {
            const allPockets = [];
            const countries = [...new Set(Object.values(getGridData()))];
            for (const countryId of countries) {
                const isEnemy = wars.some(w => (w.a === myId && w.b === countryId) || (w.b === myId && w.a === countryId));
                if (!isEnemy && countryId !== myId) continue;
                
                const pockets = m.getPocketsForCountry(countryId);
                for (const p of pockets) {
                    allPockets.push({ ...p, isEnemy: countryId !== myId });
                }
            }
            pocketCache = allPockets.length > 0 ? allPockets : null;
        });
    } catch(e) { pocketCache = null; }
}

export function updateCamera() {
    const keys = window._keys || {};
    const speed = 15 / camera.zoom;
    let moved = false;
    if (keys['KeyW'] || keys['ArrowUp']) { camera.y -= speed; moved = true; }
    if (keys['KeyS'] || keys['ArrowDown']) { camera.y += speed; moved = true; }
    if (keys['KeyA'] || keys['ArrowLeft']) { camera.x -= speed; moved = true; }
    if (keys['KeyD'] || keys['ArrowRight']) { camera.x += speed; moved = true; }
    if (moved) renderMap();
}

export function setupMapEvents() {
    canvas.addEventListener('wheel', e => {
        e.preventDefault();
        const before = screenToWorld(e.clientX, e.clientY);
        camera.zoom = Math.min(Math.max(camera.zoom * (e.deltaY > 0 ? 0.9 : 1.1), 0.1), 5);
        const after = screenToWorld(e.clientX, e.clientY);
        camera.x += before.x - after.x;
        camera.y += before.y - after.y;
        renderMap();
    }, { passive: false });

    canvas.addEventListener('mousemove', e => {
        const world = screenToWorld(e.clientX, e.clientY);
        const nh = `${world.x},${world.y}`;
        if (getGridData()[nh] !== undefined && hoverCell !== nh) {
            hoverCell = nh;
            renderMap();
        } else if (!getGridData()[nh] && hoverCell) {
            hoverCell = null;
            renderMap();
        }
    });

    canvas.addEventListener('mouseleave', () => { hoverCell = null; renderMap(); });

    window._keys = {};
    window.addEventListener('keydown', e => { window._keys[e.code] = true; });
    window.addEventListener('keyup', e => { window._keys[e.code] = false; });

    setInterval(updateCamera, 1000/30);
}

// Инициализация
resizeCanvas();
window.addEventListener('resize', () => { resizeCanvas(); renderMap(); });
