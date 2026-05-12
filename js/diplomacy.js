// diplomacy.js (полная исправленная версия)
import { getWars, setWars, getMyCountryId, getAlliances, setAlliances } from './game.js';
import { getCountryInfo, addNotification } from './utils.js';

export function declareWar(targetId) {
    const myId = getMyCountryId();
    const wars = getWars();
    
    const alreadyAtWar = wars.some(w => (w.a === myId && w.b === targetId) || (w.b === myId && w.a === targetId));
    if (alreadyAtWar) {
        addNotification('Уже в состоянии войны!', 'war');
        return;
    }
    
    wars.push({ a: myId, b: targetId });
    setWars(wars);
    addNotification(`${getCountryInfo(myId).name} объявляет войну ${getCountryInfo(targetId).name}!`, 'war');
    
    const sidebar = document.getElementById('info-sidebar');
    if (sidebar) sidebar.classList.add('hidden');
}

export function proposeAlliance(targetId) {
    const myId = getMyCountryId();
    const alliances = getAlliances();
    
    const alreadyAllied = alliances.some(a => a.has(myId) && a.has(targetId));
    if (alreadyAllied) {
        addNotification('Уже в альянсе!', 'info');
        return;
    }
    
    if (Math.random() < 0.8) {
        alliances.push(new Set([myId, targetId]));
        setAlliances(alliances);
        addNotification(`${getCountryInfo(myId).name} и ${getCountryInfo(targetId).name} заключили альянс!`, 'info');
    } else {
        addNotification(`${getCountryInfo(targetId).name} отклонил предложение альянса.`, 'info');
    }
    
    const sidebar = document.getElementById('info-sidebar');
    if (sidebar) sidebar.classList.add('hidden');
}

export function getWarsList() {
    const wars = getWars();
    const myId = getMyCountryId();
    const enemies = [];
    wars.forEach(w => {
        if (w.a === myId) enemies.push(w.b);
        if (w.b === myId) enemies.push(w.a);
    });
    return enemies;
}

export function getAlliancesList() {
    const alliances = getAlliances();
    const myId = getMyCountryId();
    const allies = [];
    alliances.forEach(a => {
        if (a.has(myId)) {
            a.forEach(id => {
                if (id !== myId) allies.push(id);
            });
        }
    });
    return allies;
}

export function isAtWar(c1, c2) {
    const wars = getWars();
    return wars.some(w => (w.a === c1 && w.b === c2) || (w.b === c1 && w.a === c2));
}

export function areAllies(c1, c2) {
    if (c1 === c2) return true;
    const alliances = getAlliances();
    return alliances.some(a => a.has(c1) && a.has(c2));
}

export function kickFromAlliance(allyId) {
    const alliances = getAlliances();
    const myId = getMyCountryId();
    const newAlliances = alliances.filter(a => {
        if (a.has(myId) && a.has(allyId)) {
            addNotification(`${getCountryInfo(allyId).name} исключён из альянса!`, 'info');
            return false;
        }
        return true;
    });
    setAlliances(newAlliances);
}
