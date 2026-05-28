// EntityManager.js — Компонентная система (массивы вместо объектов)

class EntityManager {
    constructor(maxEntities = 10000) {
        // Плоские массивы для каждого компонента
        this.nextId = 1;
        this.active = new Uint8Array(maxEntities);
        
        // Компоненты
        this.owner = new Uint16Array(maxEntities);
        this.type = new Uint8Array(maxEntities); // 0=infantry, 1=tank
        this.x = new Int16Array(maxEntities);
        this.y = new Int16Array(maxEntities);
        this.hp = new Uint16Array(maxEntities);
        this.training = new Uint8Array(maxEntities);
        this.inCombat = new Uint8Array(maxEntities);
        
        // Пути (списки, отдельное хранение)
        this.paths = new Map();
    }
    
    createEntity(owner, type, x, y) {
        const id = this.nextId++;
        this.active[id] = 1;
        this.owner[id] = owner;
        this.type[id] = type;
        this.x[id] = x;
        this.y[id] = y;
        this.hp[id] = type === 0 ? 100 : 50;
        this.training[id] = 10;
        this.inCombat[id] = 0;
        return id;
    }
    
    removeEntity(id) {
        this.active[id] = 0;
        this.paths.delete(id);
    }
    
    getEntitiesByOwner(ownerId) {
        const result = [];
        for (let i = 1; i < this.active.length; i++) {
            if (this.active[i] && this.owner[i] === ownerId) {
                result.push(i);
            }
        }
        return result;
    }
    
    // Быстрое получение юнитов в радиусе
    getEntitiesInRadius(cx, cy, radius) {
        const result = [];
        const radiusSq = radius * radius;
        for (let i = 1; i < this.active.length; i++) {
            if (!this.active[i]) continue;
            const dx = this.x[i] - cx;
            const dy = this.y[i] - cy;
            if (dx*dx + dy*dy <= radiusSq) {
                result.push(i);
            }
        }
        return result;
    }
}
