// AIWorker.js — Web Worker для ИИ

// В основном потоке:
export function initAIWorker() {
    const worker = new Worker('js/workers/AIWorker.js');
    
    worker.onmessage = (e) => {
        const { countryId, orders } = e.data;
        // Применяем приказы от ИИ
        orders.forEach(order => {
            if (order.type === 'move') {
                // даём приказ на движение
            } else if (order.type === 'build') {
                // начинаем стройку
            }
        });
    };
    
    return worker;
}

// В воркере (AIWorker.js):
self.onmessage = (e) => {
    const { countryId, worldData, unitsData, enemies } = e.data;
    
    // ИИ логика здесь (без DOM)
    const orders = [];
    
    // ... расчёты ИИ ...
    
    self.postMessage({ countryId, orders });
};
