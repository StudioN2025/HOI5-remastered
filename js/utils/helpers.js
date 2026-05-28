// helpers.js — Вспомогательные функции

import { COUNTRIES } from '../data/Countries.js';

export function getCountryInfo(id) {
    return COUNTRIES[id] || { 
        name: id.toUpperCase(), 
        color: generateColor(id), 
        leader: "Неизвестно", 
        ideology: "Нейтралитет" 
    };
}

export function generateColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = '#';
    for (let i = 0; i < 3; i++) {
        let value = (hash >> (i * 8)) & 0xFF;
        value = Math.floor(value * 0.7 + 50);
        color += ('00' + value.toString(16)).substr(-2);
    }
    return color;
}

export function addNotification(text, type = 'info') {
    const container = document.getElementById('notifications');
    if (!container) return;
    
    const notif = document.createElement('div');
    notif.className = type === 'war' ? 'notif-war' : 'notif-info';
    notif.innerHTML = `<strong>${type === 'war' ? '⚔️ ВНИМАНИЕ' : '📢 СООБЩЕНИЕ'}</strong><br><span style="font-size:11px">${text}</span>`;
    container.appendChild(notif);
    
    setTimeout(() => {
        notif.style.opacity = '0';
        notif.style.transition = 'opacity 0.3s';
        setTimeout(() => notif.remove(), 300);
    }, 5000);
}

export function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return Math.floor(num).toString();
}
