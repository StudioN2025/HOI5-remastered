import { calculateCountryStats } from './utils.js';
import { UNIT_STATS } from './data.js';

// СОСТОЯНИЕ
let gridData = {};
let cellStats = {};
let units = [];
let wars = [];
let alliances = [];
let myCountryId = null;
let gameActive = false;
let gameSpeed = 1;
let gameDate = new Date(1936, 0, 1);
let resources = { equipment: 1000, factories: 0, manpower: 0 };
let buildingQueue = [];
let activeResearch = null;
let activeFocus = null;
let completedFocuses = new Set();
let selectedUnitId = null;

// GETTERS / SETTERS
export function getGridData() { return gridData; }
export function setGridData(data) { gridData = data; window._gridData = data; }

export function getCellStats() { return cellStats; }
export function setCellStats(data) { cellStats = data; }

export function getUnits() { return units; }
export function setUnits(data) { units = data; }
export function addUnit(u) { units.push(u); }
export function removeUnit(id) { units = units.filter(u => u.id !== id); }

export function getWars() { return wars; }
export function setWars(data) { wars = data; }

export function getAlliances() { return alliances; }
export function setAlliances(data) { alliances = data; }

export function getMyCountryId() { return myCountryId; }
export function setMyCountryId(id) { myCountryId = id; window._myCountryId = id; }

export function isGameActive() { return gameActive; }
export function getGameActive() { return gameActive; }  // <-- ДОБАВЛЕНО
export function setGameActive(active) { gameActive = active; }

export function getGameSpeed() { return gameSpeed; }
export function setGameSpeed(speed) { gameSpeed = speed; }

export function getGameDate() { return gameDate; }
export function setGameDate(date) { gameDate = date; }

export function getResources() { return resources; }
export function setResources(r) { resources = r; }

export function getBuildingQueue() { return buildingQueue; }
export function setBuildingQueue(q) { buildingQueue = q; }
export function addToBuildingQueue(item) { buildingQueue.push(item); }

export function getActiveResearch() { return activeResearch; }
export function setActiveResearch(r) { activeResearch = r; }

export function getActiveFocus() { return activeFocus; }
export function setActiveFocus(f) { activeFocus = f; }

export function getCompletedFocuses() { return completedFocuses; }
export function addCompletedFocus(id) { completedFocuses.add(id); }

export function getSelectedUnitId() { return selectedUnitId; }
export function setSelectedUnitId(id) { selectedUnitId = id; }

export function updateTopBar() {
    if (!myCountryId) return;
    const stats = calculateCountryStats(myCountryId, gridData, cellStats);
    resources.factories = stats.totalFactories;
    const totalManpower = stats.totalPop * 0.05;
    const usedManpower = units.reduce((acc, u) => acc + (UNIT_STATS[u.type]?.manpower || 0), 0);
    resources.manpower = Math.max(0, totalManpower - usedManpower);
    
    const manpowerEl = document.getElementById('val-manpower');
    const factoriesEl = document.getElementById('val-factories');
    const equipmentEl = document.getElementById('val-equipment');
    const countryNameEl = document.getElementById('country-name');
    
    if (manpowerEl) manpowerEl.innerText = Math.floor(resources.manpower).toLocaleString();
    if (factoriesEl) factoriesEl.innerText = resources.factories;
    if (equipmentEl) equipmentEl.innerText = Math.floor(resources.equipment).toLocaleString();
    if (countryNameEl) countryNameEl.innerText = myCountryId.toUpperCase();
}

export function processDay() {
    if (!gameActive || gameSpeed === 0) return;
    
    const months = ['ЯНВ', 'ФЕВ', 'МАР', 'АПР', 'МАЙ', 'ИЮН', 'ИЮЛ', 'АВГ', 'СЕН', 'ОКТ', 'НОЯ', 'ДЕК'];
    gameDate.setDate(gameDate.getDate() + 1);
    const dateEl = document.getElementById('game-date');
    if (dateEl) dateEl.innerHTML = `${gameDate.getDate()} ${months[gameDate.getMonth()]} ${gameDate.getFullYear()}`;
    
    // Производство
    const production = resources.factories * 1.5;
    const maintenance = units.reduce((acc, u) => acc + (u.owner === myCountryId ? (UNIT_STATS[u.type]?.maintenance || 0) : 0), 0);
    resources.equipment = Math.max(0, resources.equipment + production - maintenance);
    
    // Тренировка
    units.forEach(u => { if (u.trainingDaysLeft > 0) u.trainingDaysLeft--; });
    
    // Движение юнитов
    units.forEach(u => {
        if (u.path && u.path.length > 0) {
            if (!u.moveCooldown) u.moveCooldown = 0;
            u.moveCooldown++;
            if (u.moveCooldown >= 2) {
                u.moveCooldown = 0;
                const next = u.path[0];
                if (gridData[next]) {
                    const isWar = wars.some(w => (w.a === u.owner && w.b === gridData[next]) || (w.b === u.owner && w.a === gridData[next]));
                    if (isWar) {
                        u.path.shift();
                        gridData[next] = u.owner;
                        u.pos = next;
                    } else if (gridData[next] === u.owner) {
                        u.path.shift();
                        u.pos = next;
                    } else {
                        u.path = [];
                    }
                }
            }
        }
    });
    
    // Стройка
    if (buildingQueue.length > 0 && buildingQueue[0]) {
        buildingQueue[0].daysLeft--;
        if (buildingQueue[0].daysLeft <= 0) {
            const finished = buildingQueue.shift();
            const cell = cellStats[finished.pos];
            if (cell) {
                if (finished.type === 'factory') cell.factories = (cell.factories || 0) + 1;
                if (finished.type === 'port') cell.buildings = [...(cell.buildings || []), 'port'];
            }
        }
    }
    
    updateTopBar();
}

let lastDay = 0;
export function gameLoop(timestamp) {
    if (lastDay === 0) lastDay = timestamp;
    if (timestamp - lastDay >= 1000) {
        lastDay = timestamp;
        processDay();
    }
    requestAnimationFrame(gameLoop);
}
