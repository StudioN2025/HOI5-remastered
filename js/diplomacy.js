// diplomacy.js — ИСПРАВЛЕННАЯ ВЕРСИЯ

import { 
    getWars, setWars, getAlliances, setAlliances, 
    getMyCountryId, addWar, removeWar as removeWarFromGame,
    getGridData, setGridData, getUnits, setUnits
} from './game.js';
import { getCountryInfo, isAtWar, areAllies, getEnemiesOf, addNotification } from './utils.js';

// ✅ ОБЪЯВЛЕНИЕ ВОЙНЫ
export function declareWar(targetId) {
    const myId = getMyCountryId();
    const wars = getWars();
    
    if (isAtWar(myId, targetId, wars)) {
        addNotification('Уже в состоянии войны!', 'war');
        return;
    }
    
    // Разрываем альянс если были союзниками
    const alliances = getAlliances();
    const newAlliances = alliances.filter(a => {
        if (a.has(myId) && a.has(targetId)) {
            addNotification(`Альянс с ${getCountryInfo(targetId).name} разорван!`, 'war');
            return false;
        }
        return true;
    });
    setAlliances(newAlliances);
    
    // Добавляем войну
    addWar(myId, targetId);
    
    addNotification(`${getCountryInfo(myId).name} объявляет войну ${getCountryInfo(targetId).name}!`, 'war');
    
    // Закрываем сайдбар
    const sidebar = document.getElementById('info-sidebar');
    if (sidebar) sidebar.classList.add('hidden');
}

// ✅ ПРЕДЛОЖЕНИЕ АЛЬЯНСА
export function proposeAlliance(targetId) {
    const myId = getMyCountryId();
    const wars = getWars();
    
    // Нельзя заключить альянс с врагом
    if (isAtWar(myId, targetId, wars)) {
        addNotification('Нельзя заключить альянс с врагом!', 'war');
        return;
    }
    
    const alliances = getAlliances();
    
    if (areAllies(myId, targetId, alliances)) {
        addNotification('Уже в альянсе!', 'info');
        return;
    }
    
    // 80% шанс успеха
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

// ✅ ИСКЛЮЧЕНИЕ ИЗ АЛЬЯНСА
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

// ✅ ПРИЗЫВ К ВОЙНЕ
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

// ✅ ПРОВЕРКА КАПИТУЛЯЦИИ
export function checkCapitulation(targetCountry, winnerCountry) {
    const gridData = getGridData();
    
    // Считаем количество клеток страны
    let cellCount = 0;
    Object.values(gridData).forEach(id => {
        if (id === targetCountry) cellCount++;
    });
    
    // Капитуляция если меньше 3 клеток
    if (cellCount < 3 && cellCount > 0) {
        addNotification(`КАПИТУЛЯЦИЯ: ${getCountryInfo(targetCountry).name} сдаётся ${getCountryInfo(winnerCountry).name}!`, 'war');
        
        // Передаём территорию победителю
        Object.keys(gridData).forEach(key => {
            if (gridData[key] === targetCountry) {
                gridData[key] = winnerCountry;
            }
        });
        setGridData(gridData);
        
        // Удаляем страну из всех войн
        const wars = getWars();
        const newWars = wars.filter(w => w.a !== targetCountry && w.b !== targetCountry);
        setWars(newWars);
        
        // Удаляем страну из всех альянсов
        const alliances = getAlliances();
        const newAlliances = alliances.map(a => {
            const newSet = new Set(a);
            newSet.delete(targetCountry);
            return newSet;
        }).filter(a => a.size > 1);
        setAlliances(newAlliances);
        
        // Удаляем юниты капитулировавшей страны
        const units = getUnits();
        const newUnits = units.filter(u => u.owner !== targetCountry);
        setUnits(newUnits);
        
        // Если капитулировала страна игрока
        if (targetCountry === getMyCountryId()) {
            addNotification('ВАША СТРАНА КАПИТУЛИРОВАЛА! Игра окончена.', 'war');
        }
        
        return true;
    } else if (cellCount === 0) {
        // Страна уже уничтожена — удаляем из списков
        const wars = getWars();
        const newWars = wars.filter(w => w.a !== targetCountry && w.b !== targetCountry);
        setWars(newWars);
        
        const alliances = getAlliances();
        const newAlliances = alliances.map(a => {
            const newSet = new Set(a);
            newSet.delete(targetCountry);
            return newSet;
        }).filter(a => a.size > 1);
        setAlliances(newAlliances);
        
        return true;
    }
    
    return false;
}

// ✅ ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
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
