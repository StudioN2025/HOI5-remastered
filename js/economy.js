import { getPlayerResources, setPlayerResources } from './game.js';
import { addNotification } from './utils.js';

export function updateProduction(factories, techLevel) {
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

export function startBuilding(buildingType, posKey, costEquipment, buildTime) {
    if (!canAfford(costEquipment)) {
        addNotification('Недостаточно снаряжения!', 'war');
        return false;
    }
    
    deductResources(costEquipment);
    return { pos: posKey, type: buildingType, daysLeft: buildTime };
}