import { getMyCountryId, getActiveFocus, setActiveFocus, getCompletedFocuses, addCompletedFocus } from './game.js';
import { getCountryInfo, addNotification } from './utils.js';
import { declareWar } from './diplomacy.js';
import { addUnit } from './military.js';

const NATIONAL_FOCUSES = {
    germany: [
        { id: 'rearmament', name: 'Перевооружение', description: '+1000 снаряжения', effect: (ctx) => { ctx.resources.equipment += 1000; } },
        { id: 'danzig', name: 'Данциг или война', description: 'Война с Польшей', effect: (ctx) => { declareWar('poland'); } },
        { id: 'axis', name: 'Ось', description: 'Альянс с Италией', effect: (ctx) => { /* альянс с Италией */ } }
    ],
    ussr: [
        { id: 'five_year', name: 'Пятилетка', description: '+3 фабрики', effect: (ctx) => { /* добавление фабрик */ } },
        { id: 'great_patriotic', name: 'Великая Отечественная', description: 'Мобилизация', effect: (ctx) => { /* мобилизация */ } }
    ]
};

export function getAvailableFocuses() {
    const myCountryId = getMyCountryId();
    const completed = getCompletedFocuses();
    const focuses = NATIONAL_FOCUSES[myCountryId] || [];
    
    return focuses.filter(f => !completed.has(f.id));
}

export function startFocus(focusId) {
    const myCountryId = getMyCountryId();
    const focuses = NATIONAL_FOCUSES[myCountryId] || [];
    const focus = focuses.find(f => f.id === focusId);
    const completed = getCompletedFocuses();
    
    if (!focus || completed.has(focus.id)) return false;
    if (getActiveFocus()) return false;
    
    setActiveFocus({
        ...focus,
        daysLeft: 70
    });
    
    addNotification(`Национальный фокус "${focus.name}" начат!`, 'info');
    return true;
}

export function updateFocus() {
    const activeFocus = getActiveFocus();
    if (!activeFocus) return;
    
    activeFocus.daysLeft--;
    
    if (activeFocus.daysLeft <= 0) {
        const ctx = { resources: window.getPlayerResources?.() || {} };
        activeFocus.effect(ctx);
        addCompletedFocus(activeFocus.id);
        setActiveFocus(null);
        addNotification(`Фокус "${activeFocus.name}" завершён!`, 'info');
    }
}

export function updateFocusUI() {
    const container = document.getElementById('window-content');
    if (!container) return;
    
    const activeFocus = getActiveFocus();
    const availableFocuses = getAvailableFocuses();
    const myCountryId = getMyCountryId();
    
    if (!NATIONAL_FOCUSES[myCountryId]) {
        container.innerHTML = '<div class="text-center text-gray-400 py-8">Нет доступных фокусов для этой страны</div>';
        return;
    }
    
    let html = '';
    
    if (activeFocus) {
        html += `
            <div class="bg-yellow-900/30 border border-yellow-500 p-3 rounded mb-4">
                <div class="font-bold text-yellow-500">Выполняется: ${activeFocus.name}</div>
                <div class="progress-bar mt-2">
                    <div class="progress-fill" style="width: ${((70 - activeFocus.daysLeft) / 70) * 100}%"></div>
                </div>
                <div class="text-right text-xs text-gray-400 mt-1">${activeFocus.daysLeft} дней</div>
            </div>
        `;
    }
    
    html += '<div class="space-y-2">';
    availableFocuses.forEach(focus => {
        html += `
            <div class="unit-card flex justify-between items-center">
                <div>
                    <div class="font-bold">${focus.name}</div>
                    <div class="text-xs text-gray-400">${focus.description}</div>
                </div>
                ${!activeFocus ? `<button onclick="window.startFocus('${focus.id}')" class="bg-yellow-700 hover:bg-yellow-600 px-3 py-1 text-xs rounded">ВЫБРАТЬ</button>` : ''}
            </div>
        `;
    });
    html += '</div>';
    
    container.innerHTML = html;
}