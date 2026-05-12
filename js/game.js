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

// Отдельные данные для ИИ
let _aiActiveFocus = {};
let _aiCompletedFocuses = {};

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

// Геттеры для ИИ
export function getAIActiveFocus(countryId) { return _aiActiveFocus[countryId] || null; }
export function getAICompletedFocuses(countryId) {
    if (!_aiCompletedFocuses[countryId]) _aiCompletedFocuses[countryId] = new Set();
    return _aiCompletedFocuses[countryId];
}

// ========== SETTERS ==========
export function setGridData(data) { 
    _gridData = data || {}; 
    window._gridData = _gridData;
}
export function setCellStats(data) { 
    _cellStats = data || {}; 
    window._cellStats = _cellStats;
}
export function setUnits(data) { 
    _units = data || []; 
    window._units = _units;
}
export function setBuildingQueue(data) { 
    _buildingQueue = data || []; 
    window._buildingQueue = _buildingQueue;
}
export function setWars(data) { 
    _wars = data || []; 
    window._wars = _wars;
}
export function setAlliances(data) { 
    _alliances = data || []; 
    window._alliances = _alliances;
}
export function setMyCountryId(id) { 
    _myCountryId = id; 
    window._myCountryId = id;
}
export function setGameActive(active) { 
    _isGameActive = active; 
    window._isGameActive = active;
}
export function setGameSpeed(speed) { 
    if (speed > 0) _lastSavedSpeed = speed;
    _gameSpeed = speed; 
    window._gameSpeed = speed;
}
export function setGameDate(date) { 
    _gameDate = date; 
    window._gameDate = date;
}
export function setTech(newTech) { 
    Object.assign(_tech, newTech); 
    window._tech = _tech;
}
export function setActiveResearch(research) { 
    _activeResearch = research; 
    window._activeResearch = research;
}
export function setActiveFocus(focus) { 
    _activeFocus = focus; 
    window._activeFocus = focus;
}
export function addCompletedFocus(id) { 
    _completedFocuses.add(id); 
    window._completedFocuses = _completedFocuses;
}
export function setPlayerResources(res) { 
    Object.assign(_playerResources, res); 
    window._playerResources = _playerResources;
}
export function setSelectedUnitId(id) { 
    _selectedUnitId = id; 
    window._selectedUnitId = id;
}
export function setActiveBattles(battles) { 
    _activeBattles = battles || []; 
    window._activeBattles = _activeBattles;
}

// Сеттеры для ИИ
export function setAIActiveFocus(countryId, focus) { _aiActiveFocus[countryId] = focus; }
export function addAICompletedFocus(countryId, focusId) {
    if (!_aiCompletedFocuses[countryId]) _aiCompletedFocuses[countryId] = new Set();
    _aiCompletedFocuses[countryId].add(focusId);
}

// ========== ДОБАВЛЕНИЕ / УДАЛЕНИЕ ==========
export function addUnit(unit) {
    if (!unit.id) unit.id = `unit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    unit.hp = unit.hp ?? 100;
    unit.trainingDaysLeft = unit.trainingDaysLeft ?? 10;
    unit.path = unit.path || [];
    unit.moveCooldown = unit.moveCooldown || 0;
    unit.inCombat = unit.inCombat || false;
    _units.push(unit);
    window._units = _units;
}

export function removeUnit(id) {
    _units = _units.filter(u => u.id !== id);
    window._units = _units;
}

export function addWar(a, b) {
    if (!_wars.some(w => (w.a === a && w.b === b) || (w.b === a && w.a === b))) {
        _wars.push({ a, b });
        window._wars = _wars;
    }
}

export function removeWar(a, b) {
    _wars = _wars.filter(w => !((w.a === a && w.b === b) || (w.b === a && w.a === b)));
    window._wars = _wars;
}

export function addAlliance(a, b) {
    if (!_alliances.some(al => al.has(a) && al.has(b))) {
        _alliances.push(new Set([a, b]));
        window._alliances = _alliances;
    }
}

export function addToBuildingQueue(item) {
    _buildingQueue.push({
        ...item,
        daysLeft: item.daysLeft || 135
    });
    window._buildingQueue = _buildingQueue;
}

// ========== ВРЕМЯ ==========
export function getDateString() {
    if (!_gameDate) return "1 ЯНВ 1936";
    return `${_gameDate.getDate()} ${MONTHS[_gameDate.getMonth()]} ${_gameDate.getFullYear()}`;
}

export function advanceDay() {
    if (!_gameDate) _gameDate = new Date(1936, 0, 1, 12, 0);
    _gameDate.setDate(_gameDate.getDate() + 1);
}

// ========== ИНИЦИАЛИЗАЦИЯ ЗАВОДОВ ==========
export function initializeFactories() {
    const gridData = getGridData();
    const cellStats = getCellStats();
    
    const countrySizes = {};
    Object.values(gridData).forEach(id => {
        countrySizes[id] = (countrySizes[id] || 0) + 1;
    });
    
    Object.keys(cellStats).forEach(pos => {
        if (cellStats[pos]) cellStats[pos].factories = 0;
    });
    
    Object.keys(gridData).forEach(pos => {
        if (!cellStats[pos]) {
            cellStats[pos] = {
                population: Math.floor(Math.random() * 80000) + 5000,
                factories: 0,
                buildings: []
            };
        }
    });
    
    Object.entries(countrySizes).forEach(([countryId, size]) => {
        let totalFactories = 0;
        if (size >= 100) totalFactories = Math.floor(size * 0.3);
        else if (size >= 50) totalFactories = Math.floor(size * 0.25);
        else if (size >= 20) totalFactories = Math.floor(size * 0.2);
        else if (size >= 10) totalFactories = Math.floor(size * 0.15);
        else totalFactories = Math.max(1, Math.floor(size * 0.1));
        
        const countryCells = Object.entries(gridData)
            .filter(([pos, id]) => id === countryId)
            .map(([pos]) => pos);
        
        const shuffled = countryCells.sort(() => Math.random() - 0.5);
        
        for (let i = 0; i < Math.min(totalFactories, shuffled.length); i++) {
            const pos = shuffled[i];
            if (cellStats[pos]) {
                cellStats[pos].factories = (cellStats[pos].factories || 0) + 1;
                const [x, y] = pos.split(',').map(Number);
                const neighbors = [[0,1],[0,-1],[1,0],[-1,0]];
                const isCoastal = neighbors.some(([dx, dy]) => !gridData[`${x+dx},${y+dy}`]);
                if (isCoastal && Math.random() < 0.1) {
                    if (!cellStats[pos].buildings) cellStats[pos].buildings = [];
                    if (!cellStats[pos].buildings.includes('port')) {
                        cellStats[pos].buildings.push('port');
                    }
                }
            }
        }
    });
    
    setCellStats(cellStats);
    console.log('✅ Заводы и порты распределены по всем странам');
}

// ========== СБРОС ==========
export function resetGameState() {
    _gridData = {};
    _cellStats = {};
    _units = [];
    _buildingQueue = [];
    _wars = [];
    _alliances = [];
    _myCountryId = null;
    _isGameActive = false;
    _gameSpeed = 0;
    _lastSavedSpeed = 1;
    _gameDate = new Date(1936, 0, 1, 12, 0);
    _tech = { industry: 1, infantry: 1, tank: 1 };
    _activeResearch = null;
    _activeFocus = null;
    _completedFocuses = new Set();
    _playerResources = { equipment: 1000, factories: 0, manpower: 500000 };
    _selectedUnitId = null;
    _activeBattles = [];
    _aiActiveFocus = {};
    _aiCompletedFocuses = {};
}
