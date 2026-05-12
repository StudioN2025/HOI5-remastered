// diplomacy.js — дипломатия, войны, альянсы

import { getWars, setWars, getAlliances, setAlliances, getMyCountryId, addWar } from './game.js';
import { getCountryInfo, isAtWar, areAllies, getEnemiesOf, addNotification } from './utils.js';

export function declareWar(targetId) {
    const myId = getMyCountryId();
    const wars = getWars();
    
    if (isAtWar(myId, targetId, wars)) {
        addNotification('Уже в состоянии войны!', 'war');
        return;
    }
    
    addWar(myId, targetId);
    addNotification(`${getCountryInfo(myId).name} объявляет войну ${getCountryInfo(targetId).name}!`, 'war');
    
    // Закрываем сайдбар
    const sidebar = document.getElementById('info-sidebar');
    if (sidebar) sidebar.classList.add('hidden');
}

export function proposeAlliance(targetId) {
    const myId = getMyCountryId();
    const alliances = getAlliances();
    
    if (areAllies(myId, targetId, alliances)) {
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

export function kickFromAlliance(allyId) {
    const myId = getMyCountryId();
    const alliances = getAlliances();
    
    const newAlliances = alliances.filter(a => {
        if (a.has(myId) && a.has(allyId)) {
            addNotification(`${getCountryInfo(allyId).name} исключён из альянса!`, 'info');
            return false;
        }
        return true;
    });
    
    setAlliances(newAlliances);
}

export function callToWar(allyId) {
    const myId = getMyCountryId();
    const wars = getWars();
    const myEnemies = getEnemiesOf(myId, wars);
    
    myEnemies.forEach(enemy => {
        if (!isAtWar(allyId, enemy, wars)) {
            addWar(allyId, enemy);
        }
    });
    
    addNotification(`${getCountryInfo(allyId).name} вступает в войну на нашей стороне!`, 'war');
}

export function getWarsList() {
    return getEnemiesOf(getMyCountryId(), getWars());
}

export function getAlliancesList() {
    const myId = getMyCountryId();
    const allies = [];
    getAlliances().forEach(a => {
        if (a.has(myId)) {
            a.forEach(id => {
                if (id !== myId) allies.push(id);
            });
        }
    });
    return [...new Set(allies)];
}
