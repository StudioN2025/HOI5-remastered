// World.js — Чанковая система с поддержкой отрицательных координат

const CHUNK_SIZE = 16;
const CHUNK_SIZE_SQ = CHUNK_SIZE * CHUNK_SIZE;

export class WorldChunk {
    constructor(cx, cy) {
        this.cx = cx;
        this.cy = cy;
        this.cells = new Uint16Array(CHUNK_SIZE_SQ);
        this.dirty = true;
        this.buildings = new Map();
    }
    
    getIndex(lx, ly) {
        return ly * CHUNK_SIZE + lx;
    }
    
    setCell(lx, ly, countryId) {
        const idx = this.getIndex(lx, ly);
        this.cells[idx] = countryId;
        this.dirty = true;
    }
    
    getCell(lx, ly) {
        return this.cells[this.getIndex(lx, ly)];
    }
    
    addBuilding(lx, ly, buildingType) {
        const idx = this.getIndex(lx, ly);
        if (!this.buildings.has(idx)) {
            this.buildings.set(idx, new Set());
        }
        this.buildings.get(idx).add(buildingType);
        this.dirty = true;
    }
    
    hasBuilding(lx, ly, buildingType) {
        const idx = this.getIndex(lx, ly);
        return this.buildings.has(idx) && this.buildings.get(idx).has(buildingType);
    }
}

export class World {
    constructor() {
        this.chunks = new Map();
        this.countryCache = new Map();
        this.bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
    }
    
    getChunkKey(cx, cy) {
        return `${cx},${cy}`;
    }
    
    getOrCreateChunk(cx, cy) {
        const key = this.getChunkKey(cx, cy);
        if (!this.chunks.has(key)) {
            this.chunks.set(key, new WorldChunk(cx, cy));
        }
        return this.chunks.get(key);
    }
    
    // Преобразование мировых координат в чанк и локальные
    worldToChunk(x, y) {
        // Для отрицательных координат: -1 // 16 = -1, но нам нужно -1
        let cx = Math.floor(x / CHUNK_SIZE);
        let cy = Math.floor(y / CHUNK_SIZE);
        let lx = x - cx * CHUNK_SIZE;
        let ly = y - cy * CHUNK_SIZE;
        
        // Корректировка для отрицательных координат
        if (lx < 0) {
            lx += CHUNK_SIZE;
            cx -= 1;
        }
        if (ly < 0) {
            ly += CHUNK_SIZE;
            cy -= 1;
        }
        
        return { cx, cy, lx, ly };
    }
    
    setCell(x, y, countryId) {
        const { cx, cy, lx, ly } = this.worldToChunk(x, y);
        const chunk = this.getOrCreateChunk(cx, cy);
        const oldId = chunk.getCell(lx, ly);
        
        if (oldId !== countryId) {
            chunk.setCell(lx, ly, countryId);
            
            // Обновляем границы
            this.bounds.minX = Math.min(this.bounds.minX, x);
            this.bounds.maxX = Math.max(this.bounds.maxX, x);
            this.bounds.minY = Math.min(this.bounds.minY, y);
            this.bounds.maxY = Math.max(this.bounds.maxY, y);
            
            // Обновляем кэш стран
            const cellKey = `${x},${y}`;
            if (oldId !== 0) {
                const oldSet = this.countryCache.get(oldId);
                if (oldSet) oldSet.delete(cellKey);
            }
            if (countryId !== 0) {
                if (!this.countryCache.has(countryId)) {
                    this.countryCache.set(countryId, new Set());
                }
                this.countryCache.get(countryId).add(cellKey);
            }
        }
    }
    
    getCell(x, y) {
        const { cx, cy, lx, ly } = this.worldToChunk(x, y);
        const key = this.getChunkKey(cx, cy);
        const chunk = this.chunks.get(key);
        if (!chunk) return 0;
        return chunk.getCell(lx, ly);
    }
    
    addBuilding(x, y, buildingType) {
        const { cx, cy, lx, ly } = this.worldToChunk(x, y);
        const chunk = this.getOrCreateChunk(cx, cy);
        chunk.addBuilding(lx, ly, buildingType);
    }
    
    hasBuilding(x, y, buildingType) {
        const { cx, cy, lx, ly } = this.worldToChunk(x, y);
        const key = this.getChunkKey(cx, cy);
        const chunk = this.chunks.get(key);
        if (!chunk) return false;
        return chunk.hasBuilding(lx, ly, buildingType);
    }
    
    getCountryCells(countryId) {
        return this.countryCache.get(countryId) || new Set();
    }
    
    getAllCountries() {
        return Array.from(this.countryCache.keys());
    }
    
    getNeighbors(x, y) {
        return [
            this.getCell(x + 1, y),
            this.getCell(x - 1, y),
            this.getCell(x, y + 1),
            this.getCell(x, y - 1)
        ];
    }
    
    getBorderWith(countryId, enemyId) {
        const cells = this.getCountryCells(countryId);
        const borders = [];
        
        for (const cell of cells) {
            const [x, y] = cell.split(',').map(Number);
            const neighbors = this.getNeighbors(x, y);
            if (neighbors.some(n => n === enemyId)) {
                borders.push(cell);
            }
        }
        
        return borders;
    }
    
    // Отладка: проверить все клетки
    debugCheckCells() {
        let totalCells = 0;
        for (const [key, chunk] of this.chunks) {
            for (let i = 0; i < chunk.cells.length; i++) {
                if (chunk.cells[i] !== 0) totalCells++;
            }
        }
        console.log(`📊 Всего клеток в чанках: ${totalCells}, в кэше стран: ${this.countryCache.size}`);
        return totalCells;
    }
}
