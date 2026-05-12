// economy.js — ресурсы и строительство

import { getPlayerResources, setPlayerResources, getBuildingQueue, setBuildingQueue, getGridData, getMyCountryId, getCellStats, addToBuildingQueue } from './game.js';
import { BUILDING_STATS } from './data.js';
import { addNotification } from './utils.js';

export function getUnitProduction(factories, techLevel) {
    const industryBonus = 1 + (techLevel - 1) * 0.05;
    return factories * 1.5 * industryBonus;
}

export function canAfford(costEquipment, costManpower = 0) {
    const resources = getPlayerResources();
    return resources.equipment >= costEquipment && resources.manpower >= costManpower;
}

export function deductResources(costEquipment, costManpower = 0) {
    const resources = getPlayerResources();
    if (!canAfford(costEquipment, costManpower)) return false;
    
    resources.equipment -= costEquipment;
    resources.manpower -= costManpower;
    setPlayerResources(resources);
    return true;
}

export function addResources(equipment, manpower = 0) {
    const resources = getPlayerResources();
    resources.equipment += equipment;
    resources.manpower += manpower;
    setPlayerResources(resources);
}

export function startBuilding(buildingType, posKey) {
    const stats = BUILDING_STATS[buildingType];
    if (!stats) return false;

    const resources = getPlayerResources();
    if (resources.equipment < stats.costEquipment) {
        addNotification('Недостаточно снаряжения!', 'war');
        return false;
    }

    resources.equipment -= stats.costEquipment;
    setPlayerResources(resources);

    addToBuildingQueue({
        pos: posKey,
        type: buildingType,
        daysLeft: stats.buildTime
    });

    addNotification(`Строительство ${stats.name} начато!`, 'info');
    return true;
}

export function processConstruction() {
    const queue = getBuildingQueue();
    if (queue.length === 0) return;

    const current = queue[0];
    current.daysLeft--;

    if (current.daysLeft <= 0) {
        const cellStats = getCellStats();
        const cell = cellStats[current.pos] || { population: 5000, factories: 0, buildings: [] };

        if (current.type === 'factory') {
            cell.factories = (cell.factories || 0) + 1;
        } else if (current.type === 'port') {
            if (!cell.buildings) cell.buildings = [];
            cell.buildings.push('port');
        }

        cellStats[current.pos] = cell;
        setCellStats(cellStats);
        queue.shift();
        setBuildingQueue(queue);

        const stats = BUILDING_STATS[current.type];
        addNotification(`Строительство ${stats.name} завершено!`, 'info');
    }
}

export function getMaintenanceCost(units, unitStats) {
    return units.reduce((acc, u) => {
        if (u.trainingDaysLeft <= 0 && u.owner === getMyCountryId()) {
            return acc + (unitStats[u.type]?.maintenance || 0);
        }
        return acc;
    }, 0);
}

export function updateEconomy(tech, unitStats) {
    const resources = getPlayerResources();
    const production = getUnitProduction(resources.factories, tech.industry);
    const maintenance = getMaintenanceCost(getUnits(), unitStats);

    resources.equipment = Math.max(0, resources.equipment + production - maintenance);
    setPlayerResources(resources);

    // Обновление верхней панели
    updateTopBar();
}

function updateTopBar() {
    const manpowerElem = document.getElementById('val-manpower');
    const factoriesElem = document.getElementById('val-factories');
    const equipmentElem = document.getElementById('val-equipment');
    
    const resources = getPlayerResources();
    
    if (manpowerElem) manpowerElem.innerText = Math.floor(resources.manpower || 0).toLocaleString();
    if (factoriesElem) factoriesElem.innerText = resources.factories || 0;
    if (equipmentElem) equipmentElem.innerText = Math.floor(resources.equipment || 0).toLocaleString();
}

function getUnits() {
    return window._units || [];
}
