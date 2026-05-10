import { CONFIG } from './config.js';
import { state } from './state.js';
import { getCountryInfo } from './data/countries.js';
import { isAtWar, areAllies } from './units.js';

const canvas = document.getElementById('grid-canvas');
const ctx = canvas.getContext('2d');

export function initMap() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

export function renderMap() {
    ctx.fillStyle = '#1b3a4b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.translate(canvas.width/2 - state.camera.x * state.camera.zoom, canvas.height/2 - state.camera.y * state.camera.zoom);
    ctx.scale(state.camera.zoom, state.camera.zoom);
    
    // Оптимизация: рисуем только видимые клетки
    const startCol = Math.floor((state.camera.x - canvas.width/2/state.camera.zoom) / CONFIG.CELL_SIZE) - 1;
    const endCol = Math.floor((state.camera.x + canvas.width/2/state.camera.zoom) / CONFIG.CELL_SIZE) + 1;
    const startRow = Math.floor((state.camera.y - canvas.height/2/state.camera.zoom) / CONFIG.CELL_SIZE) - 1;
    const endRow = Math.floor((state.camera.y + canvas.height/2/state.camera.zoom) / CONFIG.CELL_SIZE) + 1;
    
    Object.entries(state.gridData).forEach(([pos, id]) => {
        const [x, y] = pos.split(',').map(Number);
        
        // Пропускаем невидимые клетки
        if (x < startCol || x > endCol || y < startRow || y > endRow) return;
        
        let color = getCountryInfo(id).color;
        
        if (state.isGameMode && state.diplomaticModeTarget) {
            if (id === state.diplomaticModeTarget) color = "#fbbf24";
            else if (isAtWar(state.diplomaticModeTarget, id)) color = "#ef4444";
            else if (areAllies(state.diplomaticModeTarget, id)) color = "#15803d";
            else color = "#4b5563";
        }
        
        ctx.fillStyle = color;
        ctx.fillRect(x * CONFIG.CELL_SIZE, y * CONFIG.CELL_SIZE, CONFIG.CELL_SIZE, CONFIG.CELL_SIZE);
        
        if (state.hoverCell === pos) {
            ctx.fillStyle = "rgba(255,255,255,0.2)";
            ctx.fillRect(x * CONFIG.CELL_SIZE, y * CONFIG.CELL_SIZE, CONFIG.CELL_SIZE, CONFIG.CELL_SIZE);
        }
        
        ctx.strokeStyle = "rgba(0,0,0,0.1)";
        ctx.strokeRect(x * CONFIG.CELL_SIZE, y * CONFIG.CELL_SIZE, CONFIG.CELL_SIZE, CONFIG.CELL_SIZE);
        
        // Отрисовка зданий
        const cell = getCellData(pos);
        if (cell.factories > 0 || (cell.buildings && cell.buildings.length > 0)) {
            ctx.font = `${CONFIG.CELL_SIZE * 0.6}px sans-serif`;
            if (cell.buildings.includes('port')) {
                ctx.fillStyle = "#3b82f6";
                ctx.fillText("⚓", x * CONFIG.CELL_SIZE + 2, y * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE - 2);
            } else if (cell.factories > 0) {
                ctx.fillStyle = "white";
                ctx.fillText("🏭", x * CONFIG.CELL_SIZE + 2, y * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE - 2);
            }
        }
    });
    
    // Отрисовка очереди строительства
    if (state.buildingQueue.length > 0) {
        const p = state.buildingQueue[0];
        const [x, y] = p.pos.split(',').map(Number);
        ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
        ctx.fillRect(x * CONFIG.CELL_SIZE, y * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE - 4, CONFIG.CELL_SIZE, 4);
        ctx.fillStyle = "#3b82f6";
        ctx.fillRect(x * CONFIG.CELL_SIZE, y * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE - 4, 
            CONFIG.CELL_SIZE * ((CONFIG.CONSTRUCTION_TIME - p.daysLeft) / CONFIG.CONSTRUCTION_TIME), 4);
    }
    
    ctx.restore();
}

export function getCellData(key) {
    if (!state.cellStats[key]) {
        state.cellStats[key] = { 
            population: Math.floor(Math.random() * 80000) + 5000, 
            factories: Math.random() > 0.9 ? 1 : 0, 
            buildings: [] 
        };
    }
    return state.cellStats[key];
}

export function screenToWorld(sx, sy) {
    const rect = canvas.getBoundingClientRect();
    const canvasX = sx - rect.left;
    const canvasY = sy - rect.top;
    
    const x = Math.floor(((canvasX - canvas.width/2) / state.camera.zoom + state.camera.x) / CONFIG.CELL_SIZE);
    const y = Math.floor(((canvasY - canvas.height/2) / state.camera.zoom + state.camera.y) / CONFIG.CELL_SIZE);
    return { x, y };
}

export function updateCamera() {
    const speed = 15 / state.camera.zoom;
    if (state.keys['KeyW']) state.camera.y -= speed;
    if (state.keys['KeyS']) state.camera.y += speed;
    if (state.keys['KeyA']) state.camera.x -= speed;
    if (state.keys['KeyD']) state.camera.x += speed;
}

export function calculateCountryStats(countryId) {
    let stats = { totalPop: 0, totalFactories: 0, cellCount: 0 };
    Object.entries(state.gridData).forEach(([pos, id]) => {
        if (id === countryId) {
            const data = getCellData(pos);
            stats.totalPop += data.population;
            stats.totalFactories += data.factories;
            stats.cellCount++;
        }
    });
    return stats;
}

// ✅ Функция центрирования камеры на карте
export function centerCameraOnMap() {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    
    Object.keys(state.gridData).forEach(pos => {
        const [x, y] = pos.split(',').map(Number);
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
    });
    
    if (minX === Infinity) {
        state.camera.x = 0;
        state.camera.y = 0;
        console.log('⚠️ Карта пуста!');
        return;
    }
    
    const centerX = (minX + maxX) / 2 * CONFIG.CELL_SIZE;
    const centerY = (minY + maxY) / 2 * CONFIG.CELL_SIZE;
    
    state.camera.x = centerX;
    state.camera.y = centerY;
    
    console.log(`🗺 Карта: ${minX},${minY} до ${maxX},${maxY}`);
    console.log(`📍 Камера центрирована на: ${centerX}, ${centerY}`);
}
