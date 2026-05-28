// DataLoader.js — убедитесь, что bounds обновляются

export class DataLoader {
    async loadMap(url, world) {
        console.log(`📥 Загрузка карты: ${url}`);
        
        const response = await fetch(url);
        const data = await response.json();
        
        const gridData = data.gridData;
        const total = Object.keys(gridData).length;
        let loaded = 0;
        
        // ОБНОВЛЯЕМ ГРАНИЦЫ ВРУЧНУЮ
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        
        for (const [pos, owner] of Object.entries(gridData)) {
            const [x, y] = pos.split(',').map(Number);
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
            
            world.setCell(x, y, owner);
            
            loaded++;
            if (loaded % 1000 === 0) {
                console.log(`📥 Загрузка карты: ${Math.floor(loaded / total * 100)}%`);
                await this.delay(0);
            }
        }
        
        // Устанавливаем границы в world
        world.bounds = { minX, maxX, minY, maxY };
        
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
        
        console.log(`✅ Карта загружена: ${total} клеток, границы X[${minX}..${maxX}], Y[${minY}..${maxY}]`);
        return world;
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
