// RendererWebGL.js — Оптимизированный рендер (Map-итерация вместо полного грида)

export class RendererWebGL {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');

        this.camera = { x: 0, y: 0, zoom: 0.6 };
        this.cameraInitialized = false;

        this.resize();
        window.addEventListener('resize', () => this.resize());

        this.frameCount = 0;
        this.unitImages = {};
        this._loadImages();

        // Определение мобильного
        this.isMobile = /Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent) || window.innerWidth < 768;

        // Кэш цветов
        this._colorCache = new Map();
        this._initColorCache();
    }

    _loadImages() {
        const imageMap = {
            germany: 'assets/army/germany_soldier.png',
            france: 'assets/army/france_soldier.png',
            ussr: 'assets/army/soviet_soldier.png',
            uk: 'assets/army/british_soldier.png',
            italy: 'assets/army/italian_soldier.png',
            poland: 'assets/army/poland_soldier.png',
            czechoslovakia: 'assets/army/czechoslovakia_soldier.png',
            estonia: 'assets/army/estonia_soldier.png',
            romania: 'assets/army/romania_soldier.png',
            turkey: 'assets/army/turckey_soldier.png',
        };
        for (const [country, src] of Object.entries(imageMap)) {
            const img = new Image();
            img.src = src;
            img.onload = () => { this.unitImages[country] = img; };
        }
    }

    _initColorCache() {
        const colors = {
            germany:'#3a3a3a',ussr:'#990000',poland:'#ffc0cb',france:'#3b82f6',
            uk:'#ef4444',italy:'#166534',spain:'#fbbf24',portugal:'#105d10',
            netherlands:'#f97316',belgium:'#eab308',luxembourg:'#67e8f9',
            switzerland:'#dc2626',romania:'#f59e0b',hungary:'#16a34a',
            bulgaria:'#059669',finland:'#e0e7ff',norway:'#dc2626',sweden:'#2563eb',
            denmark:'#c026d3',czechoslovakia:'#3b82f6',austria:'#ef4444',
            yugoslavia:'#1e40af',greece:'#60a5fa',albania:'#dc2626',
            lithuania:'#065f46',latvia:'#7f1d1d',estonia:'#1d4ed8',
            slovakia:'#2563eb',ireland:'#16a34a',iceland:'#3b82f6',
            turkey:'#dc2626',iraq:'#166534',iran:'#059669',
            saudi_arabia:'#15803d',syria:'#14532d',jordan:'#065f46',
            palestine:'#fbbf24',egypt:'#f59e0b',libya:'#7c2d12',
            tunisia:'#c2410c',algeria:'#065f46',morocco:'#047857',
        };
        for (const [k, v] of Object.entries(colors)) this._colorCache.set(k, v);
    }

    render(world, entities, gameState, production) {
        if (!this.ctx) return;
        const ctx = this.ctx;
        const bounds = world.bounds;

        if (bounds.minX === Infinity || world.cells.size === 0) {
            ctx.fillStyle = '#1a3a4a';
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            ctx.fillStyle = '#fff'; ctx.font = '16px monospace'; ctx.textAlign = 'center';
            ctx.fillText('Загрузка карты...', this.canvas.width/2, this.canvas.height/2);
            return;
        }

        // Камера
        if (!this.cameraInitialized) {
            const ww = (bounds.maxX - bounds.minX + 2) * 20;
            const wh = (bounds.maxY - bounds.minY + 2) * 20;
            this.camera.x = ((bounds.minX + bounds.maxX) / 2) * 20;
            this.camera.y = ((bounds.minY + bounds.maxY) / 2) * 20;
            this.camera.zoom = Math.min(this.canvas.width / ww, this.canvas.height / wh, 0.8) * 0.9;
            this.cameraInitialized = true;
        }

        // Очистка
        ctx.fillStyle = '#1a3a4a';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const zoom = this.camera.zoom;
        const camX = this.canvas.width / 2 - this.camera.x * zoom;
        const camY = this.canvas.height / 2 - this.camera.y * zoom;
        const size = 20 * zoom;
        const W = this.canvas.width;
        const H = this.canvas.height;

        // Границы видимой области
        const viewMinX = this.camera.x - W / 2 / zoom;
        const viewMaxX = this.camera.x + W / 2 / zoom;
        const viewMinY = this.camera.y - H / 2 / zoom;
        const viewMaxY = this.camera.y + H / 2 / zoom;

        // ── ОДИН ПРОХОД: клетки + границы + здания ──
        const colorBuckets = new Map();
        const buildingCells = [];

        for (const [posKey, owner] of world.cells) {
            const [cx, cy] = posKey.split(',').map(Number);

            // Быстрая проверка видимости
            const wx = cx * 20;
            const wy = cy * 20;
            if (wx < viewMinX - 20 || wx > viewMaxX + 20 || wy < viewMinY - 20 || wy > viewMaxY + 20) continue;

            const screenX = wx * zoom + camX;
            const screenY = wy * zoom + camY;

            if (screenX + size < -10 || screenX > W + 10 || screenY + size < -10 || screenY > H + 10) continue;

            // Клетка по цвету
            const color = this._colorCache.get(owner) || '#666666';
            if (!colorBuckets.has(color)) colorBuckets.set(color, []);
            colorBuckets.get(color).push(screenX, screenY);

            // Здания (собираем отдельно, рисуем потом)
            if (size > 12 && world.buildings.has(posKey)) {
                const blds = world.buildings.get(posKey);
                if (blds.has('port') || blds.has('factory')) {
                    buildingCells.push({ x: screenX, y: screenY, blds });
                }
            }
        }

        // Рисуем клетки по цветам
        for (const [color, coords] of colorBuckets) {
            ctx.fillStyle = color;
            for (let i = 0; i < coords.length; i += 2) {
                ctx.fillRect(coords[i], coords[i + 1], size, size);
            }
        }

        // Границы — только на десктопе и при достаточном зуме
        if (!this.isMobile && size > 4) {
            ctx.strokeStyle = 'rgba(0,0,0,0.2)';
            ctx.lineWidth = 0.5;
            const bp = new Path2D();
            for (const [color, coords] of colorBuckets) {
                for (let i = 0; i < coords.length; i += 2) {
                    bp.rect(coords[i], coords[i + 1], size, size);
                }
            }
            ctx.stroke(bp);
        }

        // Здания — только на десктопе и при зуме > 15
        if (!this.isMobile && size > 12) {
            const emojiSize = Math.max(8, Math.min(14, size * 0.55));
            ctx.font = `${emojiSize}px "Segoe UI Emoji"`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            for (const b of buildingCells) {
                let yOff = 2;
                if (b.blds.has('port')) {
                    ctx.fillStyle = '#3b82f6';
                    ctx.fillText('⚓', b.x + 2, b.y + yOff);
                    yOff += size * 0.45;
                }
                if (b.blds.has('factory')) {
                    ctx.fillStyle = '#fff';
                    ctx.fillText('🏭', b.x + 2, b.y + yOff);
                }
            }
        }

        // ── ЮНИТЫ ──
        let unitsDrawn = 0;
        for (let i = 1; i < entities.nextId; i++) {
            if (!entities.active[i]) continue;
            const screenX = entities.x[i] * 20 * zoom + camX;
            const screenY = entities.y[i] * 20 * zoom + camY;
            if (screenX + size < -10 || screenX > W + 10 || screenY + size < -10 || screenY > H + 10) continue;

            const owner = entities.owner[i];
            const unitType = entities.type[i];

            // Мобильный — только эмодзи, без изображений и деталей
            if (this.isMobile) {
                ctx.fillStyle = owner === gameState.myCountryId ? '#fff'
                    : (gameState.isAtWar && gameState.isAtWar(gameState.myCountryId, owner)) ? '#ff6666' : '#ccc';
                ctx.font = `${Math.max(10, size * 0.6)}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(unitType === 0 ? '●' : '■', screenX + size / 2, screenY + size / 2);
                unitsDrawn++;
                continue;
            }

            // Десктоп — полная отрисовка
            const img = this.unitImages[owner];
            if (img && unitType === 0) {
                const iconSize = size * 1.2;
                const off = (size - iconSize) / 2;
                if (gameState.isAtWar && gameState.isAtWar(gameState.myCountryId, owner)) {
                    ctx.globalAlpha = 0.3;
                    ctx.fillStyle = '#ff0000';
                    ctx.fillRect(screenX, screenY, size, size);
                    ctx.globalAlpha = 1;
                }
                ctx.drawImage(img, screenX + off, screenY + off, iconSize, iconSize);
            } else {
                ctx.fillStyle = owner === gameState.myCountryId ? '#fff'
                    : (gameState.isAtWar && gameState.isAtWar(gameState.myCountryId, owner)) ? '#ff6666' : '#ccc';
                ctx.font = `${Math.max(12, size * 0.7)}px "Segoe UI Emoji"`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(unitType === 0 ? '💂' : '🚜', screenX + size / 2, screenY + size / 2);
            }

            if (entities.hp[i] < entities.maxHp[i] && size > 15) {
                const hp = entities.hp[i] / entities.maxHp[i];
                const bw = size * 0.6;
                ctx.fillStyle = 'rgba(0,0,0,0.6)';
                ctx.fillRect(screenX + (size - bw) / 2, screenY + size - 3, bw, 3);
                ctx.fillStyle = hp > 0.5 ? '#22c55e' : hp > 0.25 ? '#eab308' : '#ef4444';
                ctx.fillRect(screenX + (size - bw) / 2, screenY + size - 3, bw * hp, 3);
            }

            // Подсветка армии — цветная полоска снизу
            if (window._armyManager && owner === gameState.myCountryId) {
                const army = window._armyManager.getArmyForUnit(i);
                if (army) {
                    ctx.fillStyle = army.color;
                    ctx.fillRect(screenX, screenY + size - 2, size, 3);
                }
            }

            // Множественный выбор — жёлтая рамка
            if (gameState._selectedUnits && gameState._selectedUnits.includes(i)) {
                ctx.strokeStyle = '#fbbf24';
                ctx.lineWidth = 2;
                ctx.strokeRect(screenX - 1, screenY - 1, size + 2, size + 2);
            }

            unitsDrawn++;
        }

        // Выделенный юнит
        const selId = gameState.selectedUnitId;
        if (selId && entities.active[selId]) {
            const sx = entities.x[selId] * 20 * zoom + camX;
            const sy = entities.y[selId] * 20 * zoom + camY;
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 2;
            ctx.strokeRect(sx - 2, sy - 2, size + 4, size + 4);
        }

        // Очереди производства — только на десктопе
        if (!this.isMobile) {
            const queue = production ? production.getPlayerQueue() : [];
            if (size > 8 && queue.length) {
                for (const item of queue) {
                    const qx = item.x * 20 * zoom + camX;
                    const qy = item.y * 20 * zoom + camY;
                    if (qx < -size || qx > W + size || qy < -size || qy > H + size) continue;
                    const isUnit = item.type === 'unit';
                    ctx.fillStyle = isUnit ? 'rgba(59,130,246,0.35)' : 'rgba(234,179,8,0.35)';
                    ctx.fillRect(qx, qy, size, size);
                    const pct = 1 - item.daysLeft / item.totalDays;
                    ctx.fillStyle = 'rgba(0,0,0,0.5)';
                    ctx.fillRect(qx, qy + size - 4, size, 4);
                    ctx.fillStyle = isUnit ? '#3b82f6' : '#eab308';
                    ctx.fillRect(qx, qy + size - 4, size * pct, 4);
                }
            }
        }

        this.frameCount++;
    }

    screenToWorld(screenX, screenY) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: Math.floor(((screenX - rect.left - this.canvas.width / 2) / this.camera.zoom + this.camera.x) / 20),
            y: Math.floor(((screenY - rect.top - this.canvas.height / 2) / this.camera.zoom + this.camera.y) / 20)
        };
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.cameraInitialized = false;
    }

    setCamera(x, y) { this.camera.x = x; this.camera.y = y; }

    zoom(delta, mouseX, mouseY) {
        const before = this.screenToWorld(mouseX, mouseY);
        this.camera.zoom = Math.min(Math.max(this.camera.zoom * (delta > 0 ? 0.9 : 1.1), 0.15), 3);
        const after = this.screenToWorld(mouseX, mouseY);
        this.camera.x += (before.x - after.x) * 20;
        this.camera.y += (before.y - after.y) * 20;
    }
}
