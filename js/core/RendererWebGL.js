// RendererWebGL.js — WebGL рендер для 60 FPS

export class RendererWebGL {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.gl = this.canvas.getContext('webgl2', { alpha: false, antialias: true });
        
        if (!this.gl) {
            console.warn('WebGL2 не поддерживается, падаем на Canvas2D');
            this.useFallback = true;
            this.ctx = this.canvas.getContext('2d');
        } else {
            this.useFallback = false;
            this.initWebGL();
        }
        
        this.camera = { x: 0, y: 0, zoom: 0.6 };
        this.resize();
        
        window.addEventListener('resize', () => this.resize());
    }
    
    initWebGL() {
        const gl = this.gl;
        
        // Вершинный шейдер
        const vsSource = `
            attribute vec2 a_position;
            attribute vec2 a_texCoord;
            uniform vec2 u_resolution;
            uniform vec2 u_camera;
            uniform float u_zoom;
            varying vec2 v_texCoord;
            
            void main() {
                vec2 screenPos = (a_position - u_camera) * u_zoom + u_resolution / 2.0;
                vec2 clipSpace = screenPos / u_resolution * 2.0 - 1.0;
                gl_Position = vec4(clipSpace, 0, 1);
                v_texCoord = a_texCoord;
            }
        `;
        
        // Фрагментный шейдер
        const fsSource = `
            precision highp float;
            uniform sampler2D u_texture;
            varying vec2 v_texCoord;
            
            void main() {
                gl_FragColor = texture2D(u_texture, v_texCoord);
            }
        `;
        
        const vs = this.compileShader(gl.VERTEX_SHADER, vsSource);
        const fs = this.compileShader(gl.FRAGMENT_SHADER, fsSource);
        
        this.program = gl.createProgram();
        gl.attachShader(this.program, vs);
        gl.attachShader(this.program, fs);
        gl.linkProgram(this.program);
        
        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            console.error('Shader link failed');
        }
        
        gl.useProgram(this.program);
        
        // Аттрибуты
        this.positionLoc = gl.getAttribLocation(this.program, 'a_position');
        this.texCoordLoc = gl.getAttribLocation(this.program, 'a_texCoord');
        
        // Юниформы
        this.resolutionLoc = gl.getUniformLocation(this.program, 'u_resolution');
        this.cameraLoc = gl.getUniformLocation(this.program, 'u_camera');
        this.zoomLoc = gl.getUniformLocation(this.program, 'u_zoom');
        
        // Буферы
        this.positionBuffer = gl.createBuffer();
        this.texCoordBuffer = gl.createBuffer();
        
        // Текстурный атлас
        this.createTextureAtlas();
        
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    }
    
    compileShader(type, source) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader compile error:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        
        return shader;
    }
    
    createTextureAtlas() {
        const gl = this.gl;
        const size = 512;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        // Заливка фона
        ctx.fillStyle = '#1a3a4a';
        ctx.fillRect(0, 0, size, size);
        
        // Рисуем тайлы для разных типов клеток
        const tileSize = 32;
        const colors = {
            germany: '#3a3a3a',
            ussr: '#990000',
            poland: '#ffc0cb',
            france: '#3b82f6',
            uk: '#ef4444',
            italy: '#166534',
            default: '#666666'
        };
        
        let x = 0, y = 0;
        for (const [country, color] of Object.entries(colors)) {
            ctx.fillStyle = color;
            ctx.fillRect(x, y, tileSize, tileSize);
            ctx.strokeStyle = 'rgba(0,0,0,0.2)';
            ctx.strokeRect(x, y, tileSize, tileSize);
            
            x += tileSize;
            if (x >= size) {
                x = 0;
                y += tileSize;
            }
        }
        
        // Иконки
        ctx.font = '24px "Segoe UI Emoji"';
        ctx.fillStyle = '#fff';
        ctx.fillText('💂', 0, 100);
        ctx.fillText('🚜', 32, 100);
        ctx.fillText('⚓', 64, 100);
        ctx.fillText('🏭', 96, 100);
        
        this.texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    }
    
    render(world, entities, gameState) {
        if (this.useFallback) {
            this.renderFallback(world, entities, gameState);
            return;
        }
        
        const gl = this.gl;
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        gl.clearColor(0.1, 0.2, 0.25, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        
        gl.useProgram(this.program);
        
        // Устанавливаем юниформы
        gl.uniform2f(this.resolutionLoc, this.canvas.width, this.canvas.height);
        gl.uniform2f(this.cameraLoc, this.camera.x, this.camera.y);
        gl.uniform1f(this.zoomLoc, this.camera.zoom);
        
        // Рисуем клетки
        this.renderCells(world);
        
        // Рисуем юниты
        this.renderUnits(entities);
    }
    
    renderCells(world) {
        // В реальной реализации здесь будет отрисовка видимых чанков
        // Для краткости пока заглушка
    }
    
    renderUnits(entities) {
        // Отрисовка юнитов
        for (let i = 1; i < entities.nextId; i++) {
            if (!entities.active[i]) continue;
            
            const x = entities.x[i];
            const y = entities.y[i];
            const screenX = (x * 20 - this.camera.x) * this.camera.zoom + this.canvas.width / 2;
            const screenY = (y * 20 - this.camera.y) * this.camera.zoom + this.canvas.height / 2;
            const size = 20 * this.camera.zoom;
            
            // Заглушка: рисуем прямоугольник вместо иконки
            // В полной версии тут будет вызов WebGL для отрисовки спрайта
        }
    }
    
    renderFallback(world, entities, gameState) {
        // Canvas 2D fallback
        this.ctx.fillStyle = '#1a3a4a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Рисуем видимые клетки
        const bounds = world.bounds;
        const startX = Math.max(bounds.minX, Math.floor((this.camera.x - this.canvas.width / 2 / this.camera.zoom) / 20));
        const endX = Math.min(bounds.maxX, Math.ceil((this.camera.x + this.canvas.width / 2 / this.camera.zoom) / 20));
        const startY = Math.max(bounds.minY, Math.floor((this.camera.y - this.canvas.height / 2 / this.camera.zoom) / 20));
        const endY = Math.min(bounds.maxY, Math.ceil((this.camera.y + this.canvas.height / 2 / this.camera.zoom) / 20));
        
        for (let x = startX; x <= endX; x++) {
            for (let y = startY; y <= endY; y++) {
                const owner = world.getCell(x, y);
                if (owner === 0) continue;
                
                const screenX = (x * 20 - this.camera.x) * this.camera.zoom + this.canvas.width / 2;
                const screenY = (y * 20 - this.camera.y) * this.camera.zoom + this.canvas.height / 2;
                const size = 20 * this.camera.zoom;
                
                this.ctx.fillStyle = this.getCountryColor(owner);
                this.ctx.fillRect(screenX, screenY, size, size);
                this.ctx.strokeStyle = 'rgba(0,0,0,0.1)';
                this.ctx.strokeRect(screenX, screenY, size, size);
            }
        }
        
        // Рисуем юниты
        for (let i = 1; i < entities.nextId; i++) {
            if (!entities.active[i]) continue;
            
            const x = entities.x[i];
            const y = entities.y[i];
            const screenX = (x * 20 - this.camera.x) * this.camera.zoom + this.canvas.width / 2;
            const screenY = (y * 20 - this.camera.y) * this.camera.zoom + this.canvas.height / 2;
            const size = 20 * this.camera.zoom;
            
            this.ctx.font = `${size * 0.7}px "Segoe UI Emoji"`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillStyle = '#fff';
            this.ctx.fillText(entities.type[i] === 0 ? '💂' : '🚜', screenX + size / 2, screenY + size / 2);
        }
    }
    
    getCountryColor(countryId) {
        const colors = {
            germany: '#3a3a3a',
            ussr: '#990000',
            poland: '#ffc0cb',
            france: '#3b82f6',
            uk: '#ef4444',
            italy: '#166534'
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
        
        if (this.gl) {
            this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        }
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
