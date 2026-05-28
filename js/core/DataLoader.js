// DataLoader.js — Загрузка карт с прогрессом

export class DataLoader {
    async loadMap(url, world) {
        console.log(`📥 Загрузка карты: ${url}`);
        
        const response = await fetch(url);
        const data = await response.json();
        
        const gridData = data.gridData;
        const total = Object.keys(gridData).length;
        let loaded = 0;
        
        // Загружаем клетки в чанковую систему
        for (const [pos, owner] of Object.entries(gridData)) {
            const [x, y] = pos.split(',').map(Number);
            world.setCell(x, y, owner);
            
            loaded++;
            if (loaded % 1000 === 0) {
                console.log(`📥 Загрузка карты: ${Math.floor(loaded / total * 100)}%`);
                await this.delay(0); // Даём время на рендер
            }
        }
        
        // Загружаем статистику клеток (заводы, порты)
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
        
        console.log(`✅ Карта загружена: ${total} клеток`);
        return world;
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
