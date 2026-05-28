// performance.js — Мониторинг производительности

let fps = 0;
let frameCount = 0;
let lastTime = performance.now();

export function startPerformanceMonitor() {
    setInterval(() => {
        const now = performance.now();
        const delta = now - lastTime;
        fps = Math.round((frameCount * 1000) / delta);
        frameCount = 0;
        lastTime = now;
        
        // Выводим в консоль если FPS низкий
        if (fps < 30) {
            console.warn(`⚠️ Low FPS: ${fps}`);
        }
    }, 1000);
}

export function trackFrame() {
    frameCount++;
}

export function getFPS() {
    return fps;
}

// Измерение времени выполнения функции
export async function measureTime(name, fn) {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    const duration = end - start;
    
    if (duration > 16) { // Дольше 16ms (60fps)
        console.warn(`⚠️ Slow operation "${name}": ${duration.toFixed(2)}ms`);
    }
    
    return result;
}

// Статистика по размерам данных
export function logGameStats() {
    const gridData = window._gridData || {};
    const cellsCount = Object.keys(gridData).length;
    const unitsCount = (window._units || []).length;
    const warsCount = (window._wars || []).length;
    const alliancesCount = (window._alliances || []).length;
    
    console.log(`📊 Game stats: ${cellsCount} cells, ${unitsCount} units, ${warsCount} wars, ${alliancesCount} alliances`);
    
    return { cellsCount, unitsCount, warsCount, alliancesCount };
}
