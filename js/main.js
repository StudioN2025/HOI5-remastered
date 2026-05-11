import { COUNTRIES, DEFAULT_MAP } from './data.js';
import { getCountryInfo, addNotification } from './utils.js';
import { 
    setGridData, setCellStats, setMyCountryId, setGameActive, 
    setGameSpeed, getGameSpeed, getPlayerResources, setGameDate,
    getUnits, setUnits, getBuildingQueue, setBuildingQueue,
    getGridData, getMyCountryId
} from './game.js';
import { renderMap, resizeCanvas, setupMapEvents, setCamera, canvas } from './map.js';
import { setSelectedUnitId } from './military.js';
import { openWindow, closeWindow, showCountryInfo } from './ui.js';

// Глобальные функции для вызова из onclick
window.openWindow = openWindow;
window.closeWindow = closeWindow;
window.showCountryInfo = showCountryInfo;
window.setSelectedUnitId = setSelectedUnitId;

// Инициализация приложения
async function init() {
    console.log('🚀 HOI V Remastered v1.0');
    
    // Настройка canvas и событий
    resizeCanvas();
    setupMapEvents();
    
    // Обработчики UI
    document.getElementById('btn-start').onclick = () => loadDemoMap();
    document.getElementById('btn-load-map').onclick = () => document.getElementById('map-file-input').click();
    document.getElementById('btn-cancel-country').onclick = () => {
        document.getElementById('country-select').classList.add('hidden');
        document.getElementById('main-menu').classList.remove('hidden');
    };
    document.getElementById('close-window').onclick = () => document.getElementById('info-window').classList.add('hidden');
    document.getElementById('close-sidebar').onclick = () => document.getElementById('info-sidebar').classList.add('hidden');
    document.getElementById('btn-editor').onclick = () => {
        window.open('editor.html', '_blank');
    };
    
    // Кнопки скорости
    document.querySelectorAll('.speed-btn').forEach(btn => {
        btn.onclick = () => {
            const speed = parseInt(btn.dataset.speed);
            setGameSpeed(speed);
            document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        };
    });
    
    // Загрузка файла карты
    document.getElementById('map-file-input').onchange = (e) => {
        if (e.target.files[0]) {
            loadMapFromFile(e.target.files[0]);
        }
    };
    
    // Настройка кликов по карте
    setupMapClickHandler();
    
    // Рендерим пустую карту (чтобы не было пустоты)
    renderMap();
    
    // Старт анимации
    requestAnimationFrame(animate);
    
    console.log('✅ Готово!');
}

function setupMapClickHandler() {
    canvas.addEventListener('click', async (e) => {
        const { screenToWorld } = await import('./map.js');
        const world = screenToWorld(e.clientX, e.clientY);
        const key = `${world.x},${world.y}`;
        const gridData = (await import('./game.js')).getGridData();
        const myCountryId = (await import('./game.js')).getMyCountryId();
        
        // Обработка рекрутинга
        if (window._pendingRecruit) {
            if (gridData[key] === myCountryId) {
                const { startRecruitment } = await import('./military.js');
                startRecruitment(window._pendingRecruit, key);
                window._pendingRecruit = null;
                document.getElementById('hint').classList.add('hidden');
            } else {
                addNotification('Можно развертывать только на своей территории!', 'war');
            }
            return;
        }
        
        // Обработка строительства
        if (window._pendingBuild) {
            if (gridData[key] === myCountryId) {
                const { BUILDING_STATS } = await import('./data.js');
                const { deductResources } = await import('./economy.js');
                const { getPlayerResources, getBuildingQueue, setBuildingQueue } = await import('./game.js');
                
                const stats = BUILDING_STATS[window._pendingBuild];
                if (getPlayerResources().equipment >= stats.costEquipment) {
                    deductResources(stats.costEquipment, 0);
                    const queue = getBuildingQueue();
                    queue.push({
                        pos: key,
                        type: window._pendingBuild,
                        daysLeft: stats.buildTime
                    });
                    setBuildingQueue(queue);
                    addNotification(`Строительство ${stats.name} начато!`, 'info');
                } else {
                    addNotification('Недостаточно снаряжения!', 'war');
                }
                window._pendingBuild = null;
                document.getElementById('hint').classList.add('hidden');
            } else {
                addNotification('Строить можно только на своей территории!', 'war');
            }
            return;
        }
        
        // Показ информации о стране
        if (gridData[key]) {
            showCountryInfo(gridData[key], key);
        }
    });
}

function loadDemoMap() {
    // Используем встроенную демо-карту
    const demoMap = {
        gridData: {
            "10,10": "germany", "11,10": "germany", "12,10": "germany",
            "10,11": "germany", "11,11": "germany", "12,11": "germany",
            "10,12": "poland", "11,12": "poland", "12,12": "poland",
            "5,10": "france", "6,10": "france", "7,10": "france",
            "5,11": "france", "6,11": "france",
            "15,10": "ussr", "16,10": "ussr",
            "8,8": "uk", "9,8": "uk"
        },
        cellStats: {}
    };
    
    setGridData(demoMap.gridData);
    setCellStats(demoMap.cellStats);
    
    const countriesOnMap = [...new Set(Object.values(demoMap.gridData))];
    if (countriesOnMap.length === 0) {
        addNotification('Ошибка: карта пуста!', 'war');
        return;
    }
    
    showCountrySelection(countriesOnMap);
}

function loadMapFromFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            setGridData(data.gridData || {});
            setCellStats(data.cellStats || {});
            
            const countriesOnMap = [...new Set(Object.values(data.gridData))];
            if (countriesOnMap.length === 0) {
                addNotification('Ошибка: на карте нет стран!', 'war');
                return;
            }
            
            document.getElementById('map-name').innerText = file.name;
            document.getElementById('map-info').classList.remove('hidden');
            
            showCountrySelection(countriesOnMap);
            addNotification(`Карта "${file.name}" загружена!`, 'info');
        } catch(err) {
            addNotification('Ошибка загрузки JSON: ' + err.message, 'war');
        }
    };
    reader.readAsText(file);
}

function showCountrySelection(countriesList) {
    const container = document.getElementById('country-list');
    container.innerHTML = '';
    
    if (!countriesList || countriesList.length === 0) {
        container.innerHTML = '<div class="text-center text-gray-500 py-4">Нет доступных стран</div>';
        return;
    }
    
    countriesList.forEach(countryId => {
        const info = getCountryInfo(countryId);
        const btn = document.createElement('button');
        btn.className = 'w-full text-left p-3 border border-gray-300 rounded bg-white/50 hover:bg-white font-bold text-sm transition';
        btn.style.borderLeftColor = info.color;
        btn.style.borderLeftWidth = '4px';
        btn.innerHTML = `
            <div class="font-bold">${info.name}</div>
            <div class="text-xs text-gray-600">${info.ideology} • ${info.leader}</div>
        `;
        btn.onclick = () => {
            startGame(countryId);
        };
        container.appendChild(btn);
    });
    
    document.getElementById('country-select').classList.remove('hidden');
    document.getElementById('main-menu').classList.add('hidden');
}

async function startGame(countryId) {
    setMyCountryId(countryId);
    setGameActive(true);
    setGameSpeed(1);
    setGameDate(new Date(1936, 0, 1));
    setUnits([]);
    setBuildingQueue([]);
    setSelectedUnitId(null);
    
    // Скрываем меню выбора
    document.getElementById('country-select').classList.add('hidden');
    document.getElementById('game-container').classList.remove('hidden');
    
    // Показываем вкладки
    document.getElementById('game-tabs').classList.remove('hidden');
    
    // Обновляем панель
    const { updateTopBar } = await import('./game.js');
    updateTopBar();
    
    // Рендерим карту
    renderMap();
    
    // Устанавливаем камеру на центр карты
    const gridData = (await import('./game.js')).getGridData();
    const keys = Object.keys(gridData);
    if (keys.length > 0) {
        let sumX = 0, sumY = 0;
        keys.forEach(key => {
            const [x, y] = key.split(',').map(Number);
            sumX += x;
            sumY += y;
        });
        const centerX = sumX / keys.length;
        const centerY = sumY / keys.length;
        setCamera({ x: centerX * 20, y: centerY * 20, zoom: 1 });
        renderMap();
    }
    
    addNotification(`Игра начата! Вы играете за ${getCountryInfo(countryId).name}`, 'info');
}

// Анимационный цикл
function animate() {
    renderMap();
    requestAnimationFrame(animate);
}

// Запуск
init();
