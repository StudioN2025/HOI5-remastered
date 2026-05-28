// RendererWebGL.js — ТОЛЬКО CANVAS 2D (работает 100%)

export class RendererWebGL {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        // Принудительно используем Canvas 2D
        this.ctx = this.canvas.getContext('2d');
        this.useFallback = true;
        
        this.camera = { x: 0, y: 0, zoom: 0.6 };
        this.cameraInitialized = false;
        
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }
    
    render(world, entities, gameState) {
        if (!this.ctx) return;
        
        const ctx = this.ctx;
        const bounds = world.bounds;
        
        // Если границы не определены, выходим
        if (bounds.minX === Infinity || !world.chunks.size) {
            // Рисуем сообщение о загрузке
            ctx.fillStyle = '#1a3a4a';
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            ctx.fillStyle = '#ffffff';
            ctx.font = '16px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('Загрузка карты...', this.canvas.width/2, this.canvas.height/2);
            return;
        }
        
        // Инициализируем камеру если нужно
        if (!this.cameraInitialized) {
            const centerX = (bounds.minX + bounds.maxX) / 2 * 20;
            const centerY = (bounds.minY + bounds.maxY) / 2 * 20;
            this.camera.x = centerX;
            this.camera.y = centerY;
            
            const worldWidth = (bounds.maxX - bounds.minX + 2) * 20;
            const worldHeight = (bounds.maxY - bounds.minY + 2) * 20;
            const zoomX = this.canvas.width / worldWidth;
            const zoomY = this.canvas.height / worldHeight;
            this.camera.zoom = Math.min(zoomX, zoomY, 1.5) * 0.95;
            this.cameraInitialized = true;
            
            console.log(`🎥 Камера: центр (${centerX}, ${centerY}), зум ${this.camera.zoom.toFixed(2)}`);
            console.log(`📐 Мир: X[${bounds.minX}..${bounds.maxX}], Y[${bounds.minY}..${bounds.maxY}]`);
        }
        
        // Очищаем экран
        ctx.fillStyle = '#1a3a4a';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Вычисляем видимые клетки
        const startX = Math.max(bounds.minX, Math.floor((this.camera.x - this.canvas.width / 2 / this.camera.zoom) / 20));
        const endX = Math.min(bounds.maxX, Math.ceil((this.camera.x + this.canvas.width / 2 / this.camera.zoom) / 20));
        const startY = Math.max(bounds.minY, Math.floor((this.camera.y - this.canvas.height / 2 / this.camera.zoom) / 20));
        const endY = Math.min(bounds.maxY, Math.ceil((this.camera.y + this.canvas.height / 2 / this.camera.zoom) / 20));
        
        // Рисуем клетки
        let cellsDrawn = 0;
        for (let x = startX; x <= endX; x++) {
            for (let y = startY; y <= endY; y++) {
                const owner = world.getCell(x, y);
                if (owner === 0) continue;
                
                const screenX = (x * 20 - this.camera.x) * this.camera.zoom + this.canvas.width / 2;
                const screenY = (y * 20 - this.camera.y) * this.camera.zoom + this.canvas.height / 2;
                const size = 20 * this.camera.zoom;
                
                if (screenX + size < 0 || screenX > this.canvas.width || 
                    screenY + size < 0 || screenY > this.canvas.height) continue;
                
                // Цвет страны
                ctx.fillStyle = this.getCountryColor(owner);
                ctx.fillRect(screenX, screenY, size, size);
                
                // Граница
                ctx.strokeStyle = 'rgba(0,0,0,0.15)';
                ctx.lineWidth = 0.5;
                ctx.strokeRect(screenX, screenY, size, size);
                
                cellsDrawn++;
            }
        }
        
        // Рисуем юнитов
        for (let i = 1; i < entities.nextId; i++) {
            if (!entities.active[i]) continue;
            
            const x = entities.x[i];
            const y = entities.y[i];
            
            const screenX = (x * 20 - this.camera.x) * this.camera.zoom + this.canvas.width / 2;
            const screenY = (y * 20 - this.camera.y) * this.camera.zoom + this.canvas.height / 2;
            const size = 20 * this.camera.zoom;
            
            if (screenX + size < 0 || screenX > this.canvas.width || 
                screenY + size < 0 || screenY > this.canvas.height) continue;
            
            ctx.font = `${Math.max(12, size * 0.7)}px "Segoe UI Emoji"`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#ffffff';
            
            const icon = entities.type[i] === 0 ? '💂' : '🚜';
            ctx.fillText(icon, screenX + size / 2, screenY + size / 2);
            
            // HP бар
            if (size > 15) {
                const hpPercent = entities.hp[i] / entities.maxHp[i];
                const barWidth = size * 0.6;
                const barX = screenX + (size - barWidth) / 2;
                const barY = screenY + size - 3;
                
                ctx.fillStyle = 'rgba(0,0,0,0.6)';
                ctx.fillRect(barX, barY, barWidth, 3);
                ctx.fillStyle = hpPercent > 0.5 ? '#22c55e' : hpPercent > 0.25 ? '#eab308' : '#ef4444';
                ctx.fillRect(barX, barY, barWidth * hpPercent, 3);
            }
        }
        
        // Рисуем выделенного юнита
        const selectedId = gameState.selectedUnitId;
        if (selectedId && entities.active[selectedId]) {
            const x = entities.x[selectedId];
            const y = entities.y[selectedId];
            
            const screenX = (x * 20 - this.camera.x) * this.camera.zoom + this.canvas.width / 2;
            const screenY = (y * 20 - this.camera.y) * this.camera.zoom + this.canvas.height / 2;
            const size = 20 * this.camera.zoom;
            
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 2;
            ctx.strokeRect(screenX - 2, screenY - 2, size + 4, size + 4);
        }
        
        // Лог количества отрисованных клеток (раз в 60 кадров)
        if (Math.random() < 0.02) {
            console.log(`🎨 Отрисовано клеток: ${cellsDrawn}, юнитов: ${entities.nextId - 1}`);
        }
    }
    
    getCountryColor(countryId) {
        const colors = {
            germany: '#3a3a3a',
            ussr: '#990000',
            poland: '#ffc0cb',
            france: '#3b82f6',
            uk: '#ef4444',
            italy: '#166534',
            spain: '#fbbf24',
            portugal: '#105d10',
            netherlands: '#f97316',
            belgium: '#eab308',
            luxembourg: '#67e8f9',
            switzerland: '#dc2626',
            romania: '#eab308',
            hungary: '#166534',
            bulgaria: '#105d10',
            finland: '#ffffff',
            czechoslovakia: '#3b82f6',
            austria: '#ef4444',
            denmark: '#ef4444',
            greece: '#60a5fa',
            yugoslavia: '#1e3a8a',
            lithuania: '#065f46',
            latvia: '#8b0000',
            estonia: '#4682b4',
            slovakia: '#60a5fa',
            turkey: '#c8102e'
        };
        return colors[countryId] || '#666666';
    }
    
    screenToWorld(screenX, screenY) {
        return {
            x: Math.floor(((screenX - this.canvas.width / 2) / this.camera.zoom + this.camera.x) / 20),
            y: Math.floor(((screenY - this.canvas.height / 2) / this.camera.zoom + this.camera.y) / 20)
        };
    }
    
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    setCamera(x, y) {
        this.camera.x = x;
        this.camera.y = y;
    }
    
    zoom(delta, mouseX, mouseY) {
        const before = this.screenToWorld(mouseX, mouseY);
        this.camera.zoom = Math.min(Math.max(this.camera.zoom * (delta > 0 ? 0.9 : 1.1), 0.1), 5);
        const after = this.screenToWorld(mouseX, mouseY);
        this.camera.x += before.x - after.x;
        this.camera.y += before.y - after.y;
    }
}
