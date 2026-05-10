import { getWars, setWars, getAlliances, setAlliances, getMyCountryId } from './game.js';
import { isAtWar, areAllies, addNotification } from './utils.js';
import { getCountryInfo } from './utils.js';

export function declareWar(targetCountryId) {
    const myCountryId = getMyCountryId();
    const wars = getWars();
    
    if (isAtWar(myCountryId, targetCountryId, wars)) {
        addNotification('Уже в состоянии войны!', 'war');
        return false;
    }
    
    wars.push({ a: myCountryId, b: targetCountryId });
    setWars(wars);
    addNotification(`${getCountryInfo(myCountryId).name} объявляет войну ${getCountryInfo(targetCountryId).name}!`, 'war');
    return true;
}

export function proposeAlliance(targetCountryId) {
    const myCountryId = getMyCountryId();
    const alliances = getAlliances();
    
    if (areAllies(myCountryId, targetCountryId, alliances)) {
        addNotification('Уже в альянсе!', 'info');
        return false;
    }
    
    // 80% шанс согласия
    if (Math.random() < 0.8) {
        alliances.push(new Set([myCountryId, targetCountryId]));
        setAlliances(alliances);
        addNotification(`${getCountryInfo(myCountryId).name} и ${getCountryInfo(targetCountryId).name} заключили альянс!`, 'info');
        return true;
    } else {
        addNotification(`${getCountryInfo(targetCountryId).name} отклонил предложение альянса.`, 'info');
        return false;
    }
}

export function kickFromAlliance(allyId) {
    const myCountryId = getMyCountryId();
    let alliances = getAlliances();
    
    alliances = alliances.filter(a => !(a.has(myCountryId) && a.has(allyId)));
    setAlliances(alliances);
    addNotification(`Альянс с ${getCountryInfo(allyId).name} расторгнут!`, 'info');
    return true;
}

export function getWarsList() {
    const myCountryId = getMyCountryId();
    const wars = getWars();
    const enemies = [];
    
    wars.forEach(w => {
        if (w.a === myCountryId) enemies.push(w.b);
        if (w.b === myCountryId) enemies.push(w.a);
    });
    
    return [...new Set(enemies)];
}

export function getAlliancesList() {
    const myCountryId = getMyCountryId();
    const alliances = getAlliances();
    const allies = [];
    
    alliances.forEach(a => {
        if (a.has(myCountryId)) {
            a.forEach(id => {
                if (id !== myCountryId) allies.push(id);
            });
        }
    });
    
    return [...new Set(allies)];
}