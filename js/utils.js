import { COUNTRIES } from './data.js';

export function getCountryInfo(id) {
    return COUNTRIES[id] || { name: id.toUpperCase(), color: "#555", leader: "?", ideology: "?" };
}

export function getCellData(key, cellStats) {
    if (!cellStats[key]) {
        cellStats[key] = { population: Math.floor(Math.random() * 80000) + 5000, factories: 0, buildings: [] };
    }
    return cellStats[key];
}

export function calculateCountryStats(countryId, gridData, cellStats) {
    let stats = { totalPop: 0, totalFactories: 0, cellCount: 0 };
    Object.entries(gridData).forEach(([pos, id]) => {
        if (id === countryId) {
            const data = getCellData(pos, cellStats);
            stats.totalPop += data.population;
            stats.totalFactories += data.factories;
            stats.cellCount++;
        }
    });
    return stats;
}

export function isAtWar(c1, c2, wars) {
    return wars.some(w => (w.a === c1 && w.b === c2) || (w.b === c1 && w.a === c2));
}

export function areAllies(c1, c2, alliances) {
    if (c1 === c2) return true;
    return alliances.some(a => a.has(c1) && a.has(c2));
}

export function addNotification(text, type = 'info') {
    const container = document.getElementById('notifications');
    const notif = document.createElement('div');
    notif.className = `p-3 rounded border-l-4 ${type === 'war' ? 'bg-red-900/80 border-red-500' : 'bg-blue-900/80 border-blue-500'} text-sm notification-slide`;
    notif.innerHTML = `<strong>${type === 'war' ? '⚔️ ВОЙНА' : '📢 СООБЩЕНИЕ'}</strong><br>${text}`;
    container.appendChild(notif);
    setTimeout(() => notif.remove(), 5000);
}

export function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}