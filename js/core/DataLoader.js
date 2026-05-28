// DataLoader.js — Загрузчик с отладкой

export class DataLoader {
    async loadMap(url, world) {
        console.log(`📥 Загрузка карты: ${url}`);
        
        const response = await fetch(url);
        const data = await response.json();
        
        const gridData = data.gridData;
        const total = Object.keys(gridData).length;
        let loaded = 0;
        
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        
        // Сначала проходим по всем клеткам для определения границ
        for (const [pos, owner] of Object.entries(gridData)) {
            const [x, y] = pos.split(',').map(Number);
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
        }
        
        // Устанавливаем границы ДО загрузки
        world.bounds = { minX, maxX, minY, maxY };
        console.log(`📐 Границы: X[${minX}..${maxX}], Y[${minY}..${maxY}]`);
        
        // Загружаем клетки
        for (const [pos, owner] of Object.entries(gridData)) {
            const [x, y] = pos.split(',').map(Number);
            world.setCell(x, y, owner);
            
            loaded++;
            if (loaded % 1000 === 0) {
                console.log(`📥 Загрузка карты: ${Math.floor(loaded / total * 100)}%`);
                await this.delay(0);
            }
        }
        
        // Загружаем постройки
        const cellStats = data.cellStats || {};
        for (const [pos, stats] of Object.entries(cellStats)) {
            const [x, y] = pos.split(',').map(Number);
            
            if (stats.factories > 0) {
                for (let i = 0; i < stats.factories; i++) {
                    world.addBuilding(x, y, 'factory');
                }
            }
            if (stats.buildings?.includes('port')) {
                world.addBuilding(x, y, 'port');
            }
        }
        
        // Проверка загрузки
        const totalCells = world.debugCheckCells();
        console.log(`✅ Карта загружена: ${total} клеток в JSON, ${totalCells} клеток в чанках`);
        
        return world;
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
