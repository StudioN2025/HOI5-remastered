import { getWars, setWars, getMyCountryId, getAlliances, setAlliances } from './game.js';
import { getCountryInfo, addNotification } from './utils.js';

export function declareWar(targetId) {
    const myId = getMyCountryId();
    const wars = getWars();
    
    // Проверка что не уже в войне
    const alreadyAtWar = wars.some(w => (w.a === myId && w.b === targetId) || (w.b === myId && w.a === targetId));
    if (alreadyAtWar) {
        addNotification('Уже в состоянии войны!', 'war');
        return;
    }
    
    wars.push({ a: myId, b: targetId });
    setWars(wars);
    addNotification(`${getCountryInfo(myId).name} объявляет войну ${getCountryInfo(targetId).name}!`, 'war');
    
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.add('hidden');
}

export function proposeAlliance(targetId) {
    const myId = getMyCountryId();
    const alliances = getAlliances();
    
    // Проверка что не уже в альянсе
    const alreadyAllied = alliances.some(a => a.has(myId) && a.has(targetId));
    if (alreadyAllied) {
        addNotification('Уже в альянсе!', 'info');
        return;
    }
    
    // 80% шанс согласия
    if (Math.random() < 0.8) {
        alliances.push(new Set([myId, targetId]));
        setAlliances(alliances);
        addNotification(`${getCountryInfo(myId).name} и ${getCountryInfo(targetId).name} заключили альянс!`, 'info');
    } else {
        addNotification(`${getCountryInfo(targetId).name} отклонил предложение альянса.`, 'info');
    }
    
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.add('hidden');
}
