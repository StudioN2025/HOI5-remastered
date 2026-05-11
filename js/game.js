import { calculateCountryStats } from './utils.js';
import { UNIT_STATS } from './data.js';

// СОСТОЯНИЕ ИГРЫ
let gridData = {};
let cellStats = {};
let units = [];
let buildingQueue = [];
let wars = [];
let alliances = [];
let myCountryId = null;
let isGameActive = false;
let gameSpeed = 1;
let gameDate = new Date(1936, 0, 1);
let tech = { industry: 1, infantry: 1, tank: 1 };
let activeResearch = null;
let activeFocus = null;
let completedFocuses = new Set();
let playerResources = { equipment: 1000, factories: 0, manpower: 0 };

// GETTERS
export function getGridData() { return gridData; }
export function getCellStats() { return cellStats; }
export function getUnits() { return units; }
export function getBuildingQueue() { return buildingQueue; }
export function getWars() { return wars; }
export function getAlliances() { return alliances; }
export function getMyCountryId() { return myCountryId; }
export function isGameActive() { return isGameActive; }
export function getGameSpeed() { return gameSpeed; }
export function getGameDate() { return gameDate; }
export function getTech() { return tech; }
export function getActiveResearch() { return activeResearch; }
export function getActiveFocus() { return activeFocus; }
export function getCompletedFocuses() { return completedFocuses; }
export function getPlayerResources() { return playerResources; }

// SETTERS
export function setGridData(data) { gridData = data; }
export function setCellStats(data) { cellStats = data; }
export function setUnits(data) { units = data; }
export function setBuildingQueue(data) { buildingQueue = data; }
export function setWars(data) { wars = data; }
export function setAlliances(data) { alliances = data; }
export function setMyCountryId(id) { myCountryId = id; }
export function setGameActive(active) { isGameActive = active; }
export function setGameSpeed(speed) { gameSpeed = speed; }
export function setGameDate(date) { gameDate = date; }
export function setTech(newTech) { tech = newTech; }
export function setActiveResearch(research) { activeResearch = research; }
export function setActiveFocus(focus) { activeFocus = focus; }
export function addCompletedFocus(id) { completedFocuses.add(id); }
export function setPlayerResources(res) { playerResources = res; }

// Добавление/удаление юнитов
export function addUnit(unit) { units.push(unit); }
export function removeUnit(id) { units = units.filter(u => u.id !== id); setUnits(units); }

export function updateTopBar() {
    if (!myCountryId) return;
    const { calculateCountryStats, getCountryInfo } = await import('./utils.js');
    const stats = calculateCountryStats(myCountryId, gridData, cellStats);
    playerResources.factories = stats.totalFactories;
    const totalManpower = stats.totalPop * 0.05;
    const usedManpower = units.reduce((acc, u) => acc + (UNIT_STATS?.[u.type]?.costManpower || 0), 0);
    playerResources.manpower = Math.max(0, totalManpower - usedManpower);
    
    document.getElementById('val-manpower').innerText = Math.floor(playerResources.manpower).toLocaleString();
    document.getElementById('val-factories').innerText = playerResources.factories;
    document.getElementById('val-equipment').innerText = Math.floor(playerResources.equipment).toLocaleString();
    document.getElementById('country-name').innerText = getCountryInfo(myCountryId).name;
}    
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
