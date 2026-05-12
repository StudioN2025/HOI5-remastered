// game.js — центральное состояние игры

let _gridData = {};
let _cellStats = {};
let _units = [];
let _buildingQueue = [];
let _wars = [];
let _alliances = [];
let _myCountryId = null;
let _isGameActive = false;
let _gameSpeed = 0;
let _lastSavedSpeed = 1;
let _gameDate = new Date(1936, 0, 1, 12, 0);
let _tech = { industry: 1, infantry: 1, tank: 1 };
let _activeResearch = null;
let _activeFocus = null;
let _completedFocuses = new Set();
let _playerResources = { equipment: 1000, factories: 0, manpower: 500000 };
let _selectedUnitId = null;
let _activeBattles = [];

const MONTHS = ["ЯНВ", "ФЕВ", "МАР", "АПР", "МАЙ", "ИЮН", "ИЮЛ", "АВГ", "СЕН", "ОКТ", "НОЯ", "ДЕК"];

// ========== GETTERS ==========
export function getGridData() { return _gridData; }
export function getCellStats() { return _cellStats; }
export function getUnits() { return _units; }
export function getBuildingQueue() { return _buildingQueue; }
export function getWars() { return _wars; }
export function getAlliances() { return _alliances; }
export function getMyCountryId() { return _myCountryId; }
export function isGameActive() { return _isGameActive; }
export function getGameSpeed() { return _gameSpeed; }
export function getLastSavedSpeed() { return _lastSavedSpeed; }
export function getGameDate() { return _gameDate; }
export function getTech() { return _tech; }
export function getActiveResearch() { return _activeResearch; }
export function getActiveFocus() { return _activeFocus; }
export function getCompletedFocuses() { return _completedFocuses; }
export function getPlayerResources() { return _playerResources; }
export function getSelectedUnitId() { return _selectedUnitId; }
export function getActiveBattles() { return _activeBattles; }
export function getMonths() { return MONTHS; }

// ========== SETTERS ==========
export function setGridData(data) { _gridData = data || {}; }
export function setCellStats(data) { _cellStats = data || {}; }
export function setUnits(data) { _units = data || []; }
export function setBuildingQueue(data) { _buildingQueue = data || []; }
export function setWars(data) { _wars = data || []; }
export function setAlliances(data) { _alliances = data || []; }
export function setMyCountryId(id) { _myCountryId = id; }
export function setGameActive(active) { _isGameActive = active; }
export function setGameSpeed(speed) { 
    if (speed > 0) _lastSavedSpeed = speed;
    _gameSpeed = speed; 
}
export function setGameDate(date) { _gameDate = date; }
export function setTech(newTech) { Object.assign(_tech, newTech); }
export function setActiveResearch(research) { _activeResearch = research; }
export function setActiveFocus(focus) { _activeFocus = focus; }
export function addCompletedFocus(id) { _completedFocuses.add(id); }
export function setPlayerResources(res) { Object.assign(_playerResources, res); }
export function setSelectedUnitId(id) { _selectedUnitId = id; }
export function setActiveBattles(battles) { _activeBattles = battles; }

// ========== ВСПОМОГАТЕЛЬНЫЕ ==========
export function addUnit(unit) { 
    unit.id = unit.id || `unit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    unit.hp = unit.hp || 100;
    unit.trainingDaysLeft = unit.trainingDaysLeft ?? 10;
    unit.path = unit.path || [];
    _units.push(unit); 
}

export function removeUnit(id) { 
    _units = _units.filter(u => u.id !== id); 
}

export function addWar(a, b) {
    if (!_wars.some(w => (w.a === a && w.b === b) || (w.b === a && w.a === b))) {
        _wars.push({ a, b });
    }
}

export function removeWar(a, b) {
    _wars = _wars.filter(w => !((w.a === a && w.b === b) || (w.b === a && w.a === b)));
}

export function addAlliance(a, b) {
    if (!_alliances.some(al => al.has(a) && al.has(b))) {
        _alliances.push(new Set([a, b]));
    }
}

export function addToBuildingQueue(item) {
    _buildingQueue.push({
        ...item,
        daysLeft: item.daysLeft || 135
    });
}

export function getDateString() {
    return `${_gameDate.getDate()} ${MONTHS[_gameDate.getMonth()]} ${_gameDate.getFullYear()}`;
}

export function advanceDay() {
    _gameDate.setDate(_gameDate.getDate() + 1);
}
