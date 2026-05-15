// map.js — ОПТИМИЗИРОВАННЫЙ БЕЗ ЛАГОВ

import { getCountryInfo } from './utils.js';
import { getGridData, getUnits, getMyCountryId, getBuildingQueue, getSelectedUnitId, getCellStats } from './game.js';
import { BUILDING_STATS } from './data.js';

const canvas = document.getElementById('map-canvas');
let ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });

const CELL_SIZE = 20;

let camera = { x: 0, y: 0, zoom: 0.8 };
let hoverCell = null;

// Оффскрин-канвас для статики
let offscreenCanvas = null;
let offscreenCtx = null;
let cacheValid = false;

// Кэш котлов (обновляется раз в 30 кадров)
let pocketCache = null;
let pocketCacheFrame = 0;
const POCKET_CACHE_INTERVAL = 30;

export function getCamera() { return camera; }
export function getHoverCell() { return hoverCell; }
export function setHoverCell(cell) { hoverCell = cell; }
export function getCellSize() { return CELL_SIZE; }
export { canvas, ctx };

export function markDirty() {
    cacheValid = false;
    pocketCache = null;
}

export function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    offscreenCanvas = null;
    cacheValid = false;
}

export function screenToWorld(sx, sy) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: Math.floor(((sx - rect.left - canvas.width/2) / camera.zoom + camera.x) / CELL_SIZE),
        y: Math.floor(((sy - rect.top - canvas.height/2) / camera.zoom + camera.y) / CELL_SIZE)
    };
}

function getVisibleRange() {
    const invZoom = 1 / camera.zoom;
    return {
        startX: Math.floor((camera.x - canvas.width/2 * invZoom) / CELL_SIZE) - 2,
        endX: Math.floor((camera.x + canvas.width/2 * invZoom) / CELL_SIZE) + 2,
        startY: Math.floor((camera.y - canvas.height/2 * invZoom) / CELL_SIZE) - 2,
        endY: Math.floor((camera.y + canvas.height/2 * invZoom) / CELL_SIZE) + 2
    };
}

// Рендер статики
function renderStatic(range) {
    if (!offscreenCanvas || offscreenCanvas.width !== canvas.width || offscreenCanvas.height !== canvas.height) {
        offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = canvas.width;
        offscreenCanvas.height = canvas.height;
        offscreenCtx = offscreenCanvas.getContext('2d', { alpha: false });
    }

    const ctx2 = offscreenCtx;
    ctx2.fillStyle = '#1b3a4b';
    ctx2.fillRect(0, 0, canvas.width, canvas.height);
    
    const gridData = getGridData();
    const cellStats = getCellStats() || {};
    const buildingQueue = getBuildingQueue();
    
    ctx2.save();
    ctx2.translate(canvas.width/2 - camera.x * camera.zoom, canvas.height/2 - camera.y * camera.zoom);
    ctx2.scale(camera.zoom, camera.zoom);

    const { startX, endX, startY, endY } = range;

    // Клетки + иконки в одном проходе
    for (const [pos, id] of Object.entries(gridData)) {
        const [x, y] = pos.split(',').map(Number);
        if (x < startX || x > endX || y < startY || y > endY) continue;
        
        ctx2.fillStyle = getCountryInfo(id).color;
        ctx2.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        
        ctx2.strokeStyle = 'rgba(0,0,0,0.06)';
        ctx2.lineWidth = 0.5;
        ctx2.strokeRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        
        // Иконки
        const cell = cellStats[pos];
        if (!cell) continue;
        
        ctx2.font = '9px sans-serif';
        ctx2.textAlign = 'left';
        ctx2.textBaseline = 'top';
        
        let iconY = y * CELL_SIZE + 2;
        if (cell.buildings?.includes('port')) {
            ctx2.fillStyle = '#3b82f6';
            ctx2.fillText('⚓', x * CELL_SIZE + 1, iconY);
            iconY += 10;
        }
        if (cell.factories > 0) {
            ctx2.fillStyle = '#fff';
            ctx2.fillText('🏭', x * CELL_SIZE + 1, iconY);
        }
    }

    // Стройка
    if (buildingQueue.length > 0 && buildingQueue[0]?.pos) {
        const [bx, by] = buildingQueue[0].pos.split(',').map(Number);
        if (bx >= startX && bx <= endX && by >= startY && by <= endY) {
            const stats = BUILDING_STATS[buildingQueue[0].type];
            if (stats) {
                const p = Math.max(0, Math.min(1, (stats.buildTime - buildingQueue[0].daysLeft) / stats.buildTime));
                ctx2.fillStyle = 'rgba(255,255,255,0.3)';
                ctx2.fillRect(bx * CELL_SIZE, by * CELL_SIZE + CELL_SIZE - 3, CELL_SIZE, 3);
                ctx2.fillStyle = '#3b82f6';
                ctx2.fillRect(bx * CELL_SIZE, by * CELL_SIZE + CELL_SIZE - 3, CELL_SIZE * p, 3);
            }
        }
    }

    ctx2.restore();
    cacheValid = true;
}

// Основной рендер
export function renderMap() {
    if (!ctx) return;
    
    const range = getVisibleRange();
    
    // Статика — кэшируется
    if (!cacheValid) renderStatic(range);
    if (offscreenCanvas) ctx.drawImage(offscreenCanvas, 0, 0);
    
    // Динамика
    ctx.save();
    ctx.translate(canvas.width/2 - camera.x * camera.zoom, canvas.height/2 - camera.y * camera.zoom);
    ctx.scale(camera.zoom, camera.zoom);
    
    const { startX, endX, startY, endY } = range;
    const units = getUnits();
    const myId = getMyCountryId();
    const selectedUnitId = getSelectedUnitId();
    const now = Date.now();
    
    // ✅ КОТЛЫ — обновляем раз в 30 кадров
    pocketCacheFrame++;
    if (pocketCacheFrame >= POCKET_CACHE_INTERVAL || !pocketCache) {
        pocketCacheFrame = 0;
        updatePocketCache();
    }
    
    // Рисуем котлы из кэша
    if (pocketCache) {
        for (const pocket of pocketCache) {
            const pulse = Math.sin(now / 500) * 0.3 + 0.7;
            for (const pos of pocket.cells) {
                const [x, y] = pos.split(',').map(Number);
                if (x < startX || x > endX || y < startY || y > endY) continue;
                
                ctx.strokeStyle = pocket.isEnemy ? `rgba(255,30,30,${pulse})` : `rgba(255,200,0,${pulse})`;
                ctx.lineWidth = 2;
                ctx.setLineDash([4, 4]);
                ctx.strokeRect(x * CELL_SIZE + 1, y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
                ctx.setLineDash([]);
                
                ctx.fillStyle = pocket.isEnemy ? 'rgba(255,0,0,0.06)' : 'rgba(255,200,0,0.06)';
                ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            }
        }
    }
    
    // Стрелки пути
    for (const u of units) {
        if (!u?.path?.length || (u.owner !== myId && u.id !== selectedUnitId)) continue;
        
        const [sx, sy] = u.pos.split(',').map(Number);
        const lastStep = u.path[u.path.length - 1];
        if (!lastStep) continue;
        const [ex, ey] = lastStep.split(',').map(Number);
        
        const pulse = Math.sin(now / 400) * 0.3 + 0.7;
        ctx.strokeStyle = `rgba(255,215,0,${pulse})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(ex * CELL_SIZE + CELL_SIZE/2, ey * CELL_SIZE + CELL_SIZE/2, CELL_SIZE * 0.3, 0, Math.PI*2);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Только если выбран — полный путь
        if (u.id === selectedUnitId && u.path.length > 1) {
            ctx.strokeStyle = 'rgba(255,215,0,0.3)';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 5]);
            ctx.beginPath();
            ctx.moveTo(sx * CELL_SIZE + CELL_SIZE/2, sy * CELL_SIZE + CELL_SIZE/2);
            for (let i = 0; i < u.path.length; i += 2) {
                const [px, py] = u.path[i].split(',').map(Number);
                ctx.lineTo(px * CELL_SIZE + CELL_SIZE/2, py * CELL_SIZE + CELL_SIZE/2);
            }
            ctx.lineTo(ex * CELL_SIZE + CELL_SIZE/2, ey * CELL_SIZE + CELL_SIZE/2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }
    
    // Юниты
    for (const u of units) {
        if (!u?.pos) continue;
        const [ux, uy] = u.pos.split(',').map(Number);
        if (ux < startX || ux > endX || uy < startY || uy > endY) continue;
        
        const cx = ux * CELL_SIZE + CELL_SIZE/2;
        const cy = uy * CELL_SIZE + CELL_SIZE/2;
        
        if (u.id === selectedUnitId) {
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 2;
            ctx.setLineDash([]);
            ctx.strokeRect(ux * CELL_SIZE - 1, uy * CELL_SIZE - 1, CELL_SIZE + 2, CELL_SIZE + 2);
        }
        
        ctx.font = '14px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';
        
        if (u.trainingDaysLeft > 0) {
            ctx.globalAlpha = 0.5;
            ctx.fillText('🛠', cx, cy);
            ctx.globalAlpha = 1;
        } else {
            ctx.fillText(u.type === 'tank' ? '🚜' : '💂', cx, cy);
        }
        
        // HP бар
        if (u.hp != null) {
            const maxHp = u.type === 'tank' ? 50 : 100;
            const hpP = Math.max(0, Math.min(1, u.hp / maxHp));
            const bw = CELL_SIZE * 0.6;
            const bx = ux * CELL_SIZE + (CELL_SIZE - bw)/2;
            const by = uy * CELL_SIZE + CELL_SIZE - 5;
            
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(bx, by, bw, 3);
            ctx.fillStyle = hpP > 0.5 ? '#22c55e' : hpP > 0.25 ? '#eab308' : '#ef4444';
            ctx.fillRect(bx, by, bw * hpP, 3);
        }
    }
    
    // Ховер
    if (hoverCell && getGridData()[hoverCell]) {
        const [hx, hy] = hoverCell.split(',').map(Number);
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(hx * CELL_SIZE, hy * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([]);
        ctx.strokeRect(hx * CELL_SIZE, hy * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }
    
    ctx.restore();
}

// ✅ Обновление кэша котлов (вызывается редко)
function updatePocketCache() {
    try {
        const myId = getMyCountryId();
        const gridData = getGridData();
        const wars = window._wars || [];
        
        if (!myId || !wars.length) {
            pocketCache = null;
            return;
        }
        
        import('./supply.js').then(m => {
            const allPockets = [];
            for (const countryId of [...new Set(Object.values(gridData))]) {
                const isEnemy = wars.some(w => (w.a === myId && w.b === countryId) || (w.b === myId && w.a === countryId));
                const isOurs = countryId === myId;
                if (!isEnemy && !isOurs) continue;
                
                const pockets = m.getPocketsForCountry(countryId);
                for (const pocket of pockets) {
                    allPockets.push({ ...pocket, isEnemy, isOurs });
                }
            }
            pocketCache = allPockets;
        });
    } catch(e) {
        pocketCache = null;
    }
}

export function updateCamera() {
    const keys = window._keys || {};
    const speed = 12 / camera.zoom;
    let moved = false;
    if (keys['KeyW'] || keys['ArrowUp']) { camera.y -= speed; moved = true; }
    if (keys['KeyS'] || keys['ArrowDown']) { camera.y += speed; moved = true; }
    if (keys['KeyA'] || keys['ArrowLeft']) { camera.x -= speed; moved = true; }
    if (keys['KeyD'] || keys['ArrowRight']) { camera.x += speed; moved = true; }
    if (moved) { cacheValid = false; renderMap(); }
}

export function setupMapEvents() {
    canvas.addEventListener('wheel', e => {
        e.preventDefault();
        const worldBefore = screenToWorld(e.clientX, e.clientY);
        camera.zoom = Math.min(Math.max(camera.zoom * (e.deltaY > 0 ? 0.9 : 1.1), 0.1), 8);
        const worldAfter = screenToWorld(e.clientX, e.clientY);
        camera.x += worldBefore.x - worldAfter.x;
        camera.y += worldBefore.y - worldAfter.y;
        cacheValid = false;
        renderMap();
    }, { passive: false });

    canvas.addEventListener('mousemove', e => {
        const world = screenToWorld(e.clientX, e.clientY);
        const newHover = `${world.x},${world.y}`;
        if (getGridData()[newHover] && hoverCell !== newHover) {
            hoverCell = newHover;
            renderMap();
        } else if (!getGridData()[newHover] && hoverCell) {
            hoverCell = null;
            renderMap();
        }
    });

    canvas.addEventListener('mouseleave', () => { hoverCell = null; renderMap(); });

    window._keys = {};
    window.addEventListener('keydown', e => { window._keys[e.code] = true; });
    window.addEventListener('keyup', e => { window._keys[e.code] = false; });

    setInterval(() => updateCamera(), 1000/30);
}

resizeCanvas();
window.addEventListener('resize', () => { resizeCanvas(); cacheValid = false; renderMap(); });
