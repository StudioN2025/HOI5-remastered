// World.js — Чанковая система для 100k+ клеток

const CHUNK_SIZE = 16;
const CHUNK_SIZE_SQ = CHUNK_SIZE * CHUNK_SIZE;

export class WorldChunk {
    constructor(cx, cy) {
        this.cx = cx;
        this.cy = cy;
        this.cells = new Uint16Array(CHUNK_SIZE_SQ);
        this.dirty = true;
        this.buildings = new Map(); // cellIndex -> Set(buildings)
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
    
    serialize() {
        return {
            cx: this.cx,
            cy: this.cy,
            cells: Array.from(this.cells),
            buildings: Array.from(this.buildings.entries()).map(([k, v]) => [k, Array.from(v)])
        };
    }
    
    static deserialize(data) {
        const chunk = new WorldChunk(data.cx, data.cy);
        chunk.cells = new Uint16Array(data.cells);
        chunk.buildings = new Map(data.buildings.map(([k, v]) => [k, new Set(v)]));
        return chunk;
    }
}

export class World {
    constructor() {
        this.chunks = new Map();
        this.countryCache = new Map(); // countryId -> Set(cellKeys)
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
    
    worldToChunk(x, y) {
        return {
            cx: Math.floor(x / CHUNK_SIZE),
            cy: Math.floor(y / CHUNK_SIZE),
            lx: ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE,
            ly: ((y % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE
        };
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
            if (oldId !== 0) {
                const key = `${x},${y}`;
                const oldSet = this.countryCache.get(oldId);
                if (oldSet) oldSet.delete(key);
            }
            if (countryId !== 0) {
                const key = `${x},${y}`;
                if (!this.countryCache.has(countryId)) {
                    this.countryCache.set(countryId, new Set());
                }
                this.countryCache.get(countryId).add(key);
            }
        }
    }
    
    getCell(x, y) {
        const { cx, cy, lx, ly } = this.worldToChunk(x, y);
        const key = this.getChunkKey(cx, cy);
        const chunk = this.chunks.get(key);
        return chunk ? chunk.getCell(lx, ly) : 0;
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
        return chunk ? chunk.hasBuilding(lx, ly, buildingType) : false;
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
    
    // Получить границы с врагом
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
    
    // Сериализация
    serialize() {
        return {
            chunks: Array.from(this.chunks.entries()).map(([k, v]) => [k, v.serialize()]),
            bounds: this.bounds,
            version: '3.0'
        };
    }
    
    // Десериализация
    static deserialize(data) {
        const world = new World();
        for (const [key, chunkData] of data.chunks) {
            world.chunks.set(key, WorldChunk.deserialize(chunkData));
        }
        world.bounds = data.bounds;
        
        // Восстанавливаем кэш стран
        for (const [key, chunk] of world.chunks) {
            for (let i = 0; i < chunk.cells.length; i++) {
                const countryId = chunk.cells[i];
                if (countryId !== 0) {
                    const lx = i % CHUNK_SIZE;
                    const ly = Math.floor(i / CHUNK_SIZE);
                    const x = chunk.cx * CHUNK_SIZE + lx;
                    const y = chunk.cy * CHUNK_SIZE + ly;
                    const cellKey = `${x},${y}`;
                    
                    if (!world.countryCache.has(countryId)) {
                        world.countryCache.set(countryId, new Set());
                    }
                    world.countryCache.get(countryId).add(cellKey);
                }
            }
        }
        
        return world;
    }
}
