// economy.js — ИСПРАВЛЕННАЯ ВЕРСИЯ

import { 
    getPlayerResources, setPlayerResources, 
    getBuildingQueue, setBuildingQueue, 
    getGridData, getMyCountryId, getCellStats, setCellStats,
    getUnits, getTech
} from './game.js';
import { BUILDING_STATS } from './data.js';
import { addNotification, calculateCountryStats } from './utils.js';

// ✅ ПРАВИЛЬНОЕ НАЧАЛО СТРОИТЕЛЬСТВА
export function startBuilding(buildingType, posKey) {
    const stats = BUILDING_STATS[buildingType];
    if (!stats) return false;

    // Проверка ресурсов
    const resources = getPlayerResources();
    if ((resources.equipment || 0) < stats.costEquipment) {
        addNotification(`Недостаточно снаряжения! Нужно ${stats.costEquipment} 🔫`, 'war');
        return false;
    }

    // Проверка территории
    const gridData = getGridData();
    const myId = getMyCountryId();
    if (gridData[posKey] !== myId) {
        addNotification('Можно строить только на своей территории!', 'war');
        return false;
    }

    // Списание ресурсов
    resources.equipment -= stats.costEquipment;
    setPlayerResources(resources);

    // ✅ ДОБАВЛЕНИЕ В ОЧЕРЕДЬ СТРОИТЕЛЬСТВА
    const queue = getBuildingQueue();
    queue.push({
        pos: posKey,
        type: buildingType,
        daysLeft: stats.buildTime,
        owner: myId
    });
    setBuildingQueue(queue);

    addNotification(`Строительство ${stats.name} начато! (${stats.buildTime} дней)`, 'info');
    
    // Обновление индикатора
    const buildIndicator = document.getElementById('build-indicator');
    if (buildIndicator) buildIndicator.classList.remove('hidden');
    
    return true;
}

// ✅ ОБРАБОТКА ЗАВЕРШЕНИЯ СТРОИТЕЛЬСТВА
export function processConstruction() {
    const queue = getBuildingQueue();
    if (!queue || queue.length === 0) {
        // Скрываем индикатор если очередь пуста
        const buildIndicator = document.getElementById('build-indicator');
        if (buildIndicator) buildIndicator.classList.add('hidden');
        return;
    }

    const current = queue[0];
    
    // Уменьшаем дни
    current.daysLeft = (current.daysLeft || 0) - 1;

    if (current.daysLeft <= 0) {
        // ✅ СТРОИТЕЛЬСТВО ЗАВЕРШЕНО — ПРИМЕНЯЕМ ИЗМЕНЕНИЯ
        const cellStats = getCellStats();
        
        // Убедимся что клетка существует в cellStats
        if (!cellStats[current.pos]) {
            cellStats[current.pos] = { 
                population: Math.floor(Math.random() * 80000) + 5000, 
                factories: 0, 
                buildings: [] 
            };
        }

        const cell = cellStats[current.pos];
        
        if (current.type === 'factory') {
            cell.factories = (cell.factories || 0) + 1;
            addNotification(`🏭 Военный завод построен! Всего заводов в провинции: ${cell.factories}`, 'info');
        } else if (current.type === 'port') {
            if (!cell.buildings) cell.buildings = [];
            cell.buildings.push('port');
            addNotification('⚓ Морской порт построен!', 'info');
        }

        // ✅ СОХРАНЯЕМ ИЗМЕНЕНИЯ
        setCellStats(cellStats);

        // Удаляем завершённый проект из очереди
        queue.shift();
        setBuildingQueue(queue);

        // Обновляем верхнюю панель (количество заводов могло измениться)
        if (typeof window !== 'undefined' && window.updateTopBar) {
            import('./ui.js').then(m => m.updateTopBar());
        }

        // Скрываем индикатор если больше ничего не строится
        if (queue.length === 0) {
            const buildIndicator = document.getElementById('build-indicator');
            if (buildIndicator) buildIndicator.classList.add('hidden');
        }
    }
}

// ✅ ОБНОВЛЕНИЕ ЭКОНОМИКИ
export function updateEconomy(techLevel, unitStats) {
    const resources = getPlayerResources();
    const myId = getMyCountryId();
    const gridData = getGridData();
    const cellStats = getCellStats();

    // Считаем общее количество заводов на территории игрока
    let totalFactories = 0;
    Object.entries(gridData).forEach(([pos, id]) => {
        if (id === myId && cellStats[pos]) {
            totalFactories += cellStats[pos].factories || 0;
        }
    });

    // Обновляем количество заводов в ресурсах
    resources.factories = totalFactories;

    // Производство снаряжения
    const industryBonus = 1 + ((techLevel || 1) - 1) * 0.05;
    const production = totalFactories * 1.5 * industryBonus;

    // Подсчёт обслуживания юнитов
    const units = getUnits() || [];
    let maintenance = 0;
    units.forEach(u => {
        if (u.owner === myId && u.trainingDaysLeft <= 0) {
            const stats = unitStats[u.type];
            if (stats) {
                maintenance += stats.maintenance || 0;
            }
        }
    });

    resources.equipment = Math.max(0, (resources.equipment || 0) + production - maintenance);
    setPlayerResources(resources);

    // Обновление UI
    updateTopBarUI(resources);
}

function updateTopBarUI(resources) {
    const manpowerElem = document.getElementById('val-manpower');
    const factoriesElem = document.getElementById('val-factories');
    const equipmentElem = document.getElementById('val-equipment');

    if (factoriesElem) factoriesElem.innerText = resources.factories || 0;
    if (equipmentElem) equipmentElem.innerText = Math.floor(resources.equipment || 0).toLocaleString();
}

// Экспорт для обратной совместимости
export function getUnitProduction(factories, techLevel) {
    const industryBonus = 1 + ((techLevel || 1) - 1) * 0.05;
    return factories * 1.5 * industryBonus;
}
