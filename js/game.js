import { calculateCountryStats } from './utils.js';

// СОСТОЯНИЕ
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

// GETTERS/SETTERS
export function getGridData() { return gridData; }
export function setGridData(data) { gridData = data; }
export function getCellStats() { return cellStats; }
export function setCellStats(data) { cellStats = data; }
export function getUnits() { return units; }
export function setUnits(data) { units = data; }
export function addUnit(unit) { units.push(unit); }
export function removeUnit(id) { units = units.filter(u => u.id !== id); }
export function getBuildingQueue() { return buildingQueue; }
export function setBuildingQueue(data) { buildingQueue = data; }
export function getWars() { return wars; }
export function setWars(data) { wars = data; }
export function getAlliances() { return alliances; }
export function setAlliances(data) { alliances = data; }
export function getMyCountryId() { return myCountryId; }
export function setMyCountryId(id) { myCountryId = id; }
export function isGameActive() { return isGameActive; }
export function setGameActive(active) { isGameActive = active; }
export function getGameSpeed() { return gameSpeed; }
export function setGameSpeed(speed) { gameSpeed = speed; }
export function getGameDate() { return gameDate; }
export function setGameDate(date) { gameDate = date; }
export function getTech() { return tech; }
export function setTech(newTech) { tech = newTech; }
export function getActiveResearch() { return activeResearch; }
export function setActiveResearch(research) { activeResearch = research; }
export function getActiveFocus() { return activeFocus; }
export function setActiveFocus(focus) { activeFocus = focus; }
export function getCompletedFocuses() { return completedFocuses; }
export function addCompletedFocus(id) { completedFocuses.add(id); }
export function getPlayerResources() { return playerResources; }
export function setPlayerResources(res) { playerResources = res; }

export function updateTopBar() {
    if (!myCountryId) return;
    const stats = calculateCountryStats(myCountryId, gridData, cellStats);
    playerResources.factories = stats.totalFactories;
    const totalManpower = stats.totalPop * 0.05;
    const usedManpower = units.reduce((acc, u) => acc + (UNIT_STATS[u.type]?.costManpower || 0), 0);
    playerResources.manpower = Math.max(0, totalManpower - usedManpower);
    
    document.getElementById('val-manpower').innerText = Math.floor(playerResources.manpower).toLocaleString();
    document.getElementById('val-factories').innerText = playerResources.factories;
    document.getElementById('val-equipment').innerText = Math.floor(playerResources.equipment).toLocaleString();
    document.getElementById('country-name').innerText = getCountryInfo(myCountryId).name;
}

export function processDay() {
    if (!isGameActive || gameSpeed === 0) return;
    
    const months = ['ЯНВ', 'ФЕВ', 'МАР', 'АПР', 'МАЙ', 'ИЮН', 'ИЮЛ', 'АВГ', 'СЕН', 'ОКТ', 'НОЯ', 'ДЕК'];
    gameDate.setDate(gameDate.getDate() + 1);
    document.getElementById('game-date').innerHTML = `${gameDate.getDate()} ${months[gameDate.getMonth()]} ${gameDate.getFullYear()}`;
    
    // Производство
    const industryBonus = 1 + (tech.industry - 1) * 0.05;
    const production = playerResources.factories * 1.5 * industryBonus;
    let maintenance = units.reduce((acc, u) => acc + (u.owner === myCountryId ? (UNIT_STATS[u.type]?.maintenance || 0) : 0), 0);
    playerResources.equipment = Math.max(0, playerResources.equipment + production - maintenance);
    
    // Тренировка
    units.forEach(u => { if (u.trainingDaysLeft > 0) u.trainingDaysLeft--; });
    
    updateTopBar();
}

let lastUpdate = 0;
export function gameLoop(timestamp) {
    if (lastUpdate === 0) lastUpdate = timestamp;
    if (timestamp - lastUpdate >= 1000) {
        lastUpdate = timestamp;
        processDay();
    }
    requestAnimationFrame(gameLoop);
}