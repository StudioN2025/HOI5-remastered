// World.js — Чанковая система для 100k+ клеток

const CHUNK_SIZE = 16; // 16x16 клеток в чанке

class WorldChunk {
    constructor(cx, cy) {
        this.cx = cx;
        this.cy = cy;
        this.cells = new Uint16Array(CHUNK_SIZE * CHUNK_SIZE); // ID стран
        this.dirty = true;
    }
    
    getCellIndex(localX, localY) {
        return localY * CHUNK_SIZE + localX;
    }
    
    setCell(localX, localY, countryId) {
        this.cells[this.getCellIndex(localX, localY)] = countryId;
        this.dirty = true;
    }
    
    getCell(localX, localY) {
        return this.cells[this.getCellIndex(localX, localY)];
    }
}

class World {
    constructor() {
        this.chunks = new Map(); // key "cx,cy" -> WorldChunk
        this.countryCache = new Map(); // countryId -> Set(cellKeys)
    }
    
    getChunkKey(cx, cy) { return `${cx},${cy}`; }
    
    getChunk(cx, cy) {
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
        const chunk = this.getChunk(cx, cy);
        const oldId = chunk.getCell(lx, ly);
        
        if (oldId !== countryId) {
            chunk.setCell(lx, ly, countryId);
            
            // Обновляем кэш стран
            if (oldId !== 0) {
                const oldSet = this.countryCache.get(oldId);
                if (oldSet) oldSet.delete(`${x},${y}`);
            }
            if (countryId !== 0) {
                if (!this.countryCache.has(countryId)) {
                    this.countryCache.set(countryId, new Set());
                }
                this.countryCache.get(countryId).add(`${x},${y}`);
            }
        }
    }
    
    getCell(x, y) {
        const { cx, cy, lx, ly } = this.worldToChunk(x, y);
        const chunk = this.chunks.get(this.getChunkKey(cx, cy));
        return chunk ? chunk.getCell(lx, ly) : 0;
    }
    
    getCountryCells(countryId) {
        return this.countryCache.get(countryId) || new Set();
    }
    
    // Быстрый поиск соседей
    getNeighbors(x, y) {
        return [
            this.getCell(x+1, y),
            this.getCell(x-1, y),
            this.getCell(x, y+1),
            this.getCell(x, y-1)
        ];
    }
}
