import { calculateCountryStats } from './utils.js';
import { UNIT_STATS } from './data.js';

// ========== СОСТОЯНИЕ ИГРЫ ==========
let _gridData = {};
let _cellStats = {};
let _units = [];
let _buildingQueue = [];
let _wars = [];
let _alliances = [];
let _myCountryId = null;
let _isGameActive = false;
let _gameSpeed = 1;
let _gameDate = new Date(1936, 0, 1);
let _tech = { industry: 1, infantry: 1, tank: 1 };
let _activeResearch = null;
let _activeFocus = null;
let _completedFocuses = new Set();
let _playerResources = { equipment: 1000, factories: 0, manpower: 0 };

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
export function getGameDate() { return _gameDate; }
export function getTech() { return _tech; }
export function getActiveResearch() { return _activeResearch; }
export function getActiveFocus() { return _activeFocus; }
export function getCompletedFocuses() { return _completedFocuses; }
export function getPlayerResources() { return _playerResources; }

// ========== SETTERS ==========
export function setGridData(data) { _gridData = data; }
export function setCellStats(data) { _cellStats = data; }
export function setUnits(data) { _units = data; }
export function setBuildingQueue(data) { _buildingQueue = data; }
export function setWars(data) { _wars = data; }
export function setAlliances(data) { _alliances = data; }
export function setMyCountryId(id) { _myCountryId = id; }
export function setGameActive(active) { _isGameActive = active; }
export function setGameSpeed(speed) { _gameSpeed = speed; }
export function setGameDate(date) { _gameDate = date; }
export function setTech(newTech) { _tech = newTech; }
export function setActiveResearch(research) { _activeResearch = research; }
export function setActiveFocus(focus) { _activeFocus = focus; }
export function addCompletedFocus(id) { _completedFocuses.add(id); }
export function setPlayerResources(res) { _playerResources = res; }

// ========== ДОПОЛНИТЕЛЬНЫЕ ФУНКЦИИ ==========
export function addUnit(unit) { 
    _units.push(unit); 
}

export function removeUnit(id) { 
    _units = _units.filter(u => u.id !== id); 
}

export function updateTopBar() {
    if (!_myCountryId) return;
    
    // Импортируем утилиты динамически
    import('./utils.js').then(module => {
        const stats = module.calculateCountryStats(_myCountryId, _gridData, _cellStats);
        _playerResources.factories = stats.totalFactories;
        const totalManpower = stats.totalPop * 0.05;
        let usedManpower = 0;
        
        // Импортируем UNIT_STATS
        import('./data.js').then(data => {
            usedManpower = _units.reduce((acc, u) => acc + (data.UNIT_STATS[u.type]?.costManpower || 1000), 0);
            _playerResources.manpower = Math.max(0, totalManpower - usedManpower);
            
            const nameElem = document.getElementById('country-name');
            if (nameElem) nameElem.innerText = module.getCountryInfo(_myCountryId).name;
            
            const manpowerElem = document.getElementById('val-manpower');
            const factoriesElem = document.getElementById('val-factories');
            const equipmentElem = document.getElementById('val-equipment');
            
            if (manpowerElem) manpowerElem.innerText = Math.floor(_playerResources.manpower).toLocaleString();
            if (factoriesElem) factoriesElem.innerText = _playerResources.factories;
            if (equipmentElem) equipmentElem.innerText = Math.floor(_playerResources.equipment).toLocaleString();
        });
    });
}

// ========== ИГРОВОЙ ЦИКЛ ==========
export function processDay() {
    if (!_isGameActive || _gameSpeed === 0) return;
    
    // Обновление даты
    const months = ['ЯНВ', 'ФЕВ', 'МАР', 'АПР', 'МАЙ', 'ИЮН', 'ИЮЛ', 'АВГ', 'СЕН', 'ОКТ', 'НОЯ', 'ДЕК'];
    _gameDate.setDate(_gameDate.getDate() + 1);
    const dateElem = document.getElementById('game-date');
    if (dateElem) {
        dateElem.innerHTML = `${_gameDate.getDate()} ${months[_gameDate.getMonth()]} ${_gameDate.getFullYear()}`;
    }
    
    // Производство снаряжения
    const industryBonus = 1 + (_tech.industry - 1) * 0.05;
    const production = _playerResources.factories * 1.5 * industryBonus;
    
    import('./data.js').then(data => {
        let maintenance = _units.reduce((acc, u) => acc + (u.owner === _myCountryId ? (data.UNIT_STATS[u.type]?.maintenance || 0) : 0), 0);
        _playerResources.equipment = Math.max(0, _playerResources.equipment + production - maintenance);
        
        // Тренировка юнитов
        _units.forEach(u => { 
            if (u.trainingDaysLeft > 0) u.trainingDaysLeft--; 
        });
        
        updateTopBar();
    });
}

// ========== ОБРАБОТКА ИССЛЕДОВАНИЙ ==========
export function updateResearch() {
    if (!_activeResearch) return;
    
    _activeResearch.daysLeft--;
    
    if (_activeResearch.daysLeft <= 0) {
        _tech[_activeResearch.type] = _activeResearch.level;
        _activeResearch = null;
        
        import('./utils.js').then(module => {
            module.addNotification(`Исследование завершено!`, 'info');
        });
    }
    
    const indicator = document.getElementById('research-indicator');
    if (indicator) {
        if (_activeResearch) indicator.classList.remove('hidden');
        else indicator.classList.add('hidden');
    }
}

// ========== ОБРАБОТКА ФОКУСОВ ==========
export function updateFocus() {
    if (!_activeFocus) return;
    
    _activeFocus.daysLeft--;
    
    if (_activeFocus.daysLeft <= 0) {
        if (_activeFocus.effect) _activeFocus.effect();
        _completedFocuses.add(_activeFocus.id);
        _activeFocus = null;
        
        import('./utils.js').then(module => {
            module.addNotification(`Фокус завершён!`, 'info');
        });
    }
    
    const indicator = document.getElementById('focus-indicator');
    if (indicator) {
        if (_activeFocus) indicator.classList.remove('hidden');
        else indicator.classList.add('hidden');
    }
}

// ========== ОБРАБОТКА СТРОИТЕЛЬСТВА ==========
export function updateConstruction() {
    if (_buildingQueue.length === 0) return;
    
    const current = _buildingQueue[0];
    current.daysLeft--;
    
    if (current.daysLeft <= 0) {
        // Завершение стройки
        const cell = _cellStats[current.pos];
        if (cell) {
            if (current.type === 'factory') {
                cell.factories = (cell.factories || 0) + 1;
            } else if (current.type === 'port') {
                if (!cell.buildings) cell.buildings = [];
                cell.buildings.push('port');
            }
        }
        _buildingQueue.shift();
        
        import('./utils.js').then(module => {
            module.addNotification(`Строительство завершено!`, 'info');
        });
    }
    
    const indicator = document.getElementById('build-indicator');
    if (indicator) {
        if (_buildingQueue.length > 0) indicator.classList.remove('hidden');
        else indicator.classList.add('hidden');
    }
}

// ========== ОСНОВНОЙ ДНЕВНОЙ АПДЕЙТ ==========
let _lastUpdate = 0;
export function gameLoop(timestamp) {
    if (_lastUpdate === 0) _lastUpdate = timestamp;
    
    // Обновляем раз в секунду (1000 мс)
    if (timestamp - _lastUpdate >= 1000) {
        _lastUpdate = timestamp;
        processDay();
        updateResearch();
        updateFocus();
        updateConstruction();
    }
    
    requestAnimationFrame(gameLoop);
}
