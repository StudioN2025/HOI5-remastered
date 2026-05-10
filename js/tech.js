import { getTech, setTech, getActiveResearch, setActiveResearch } from './game.js';
import { TECH_TREE } from './data.js';
import { addNotification } from './utils.js';

export function getTechLevel(techType) {
    const tech = getTech();
    return tech[techType] || 1;
}

export function canResearch(techType, level) {
    const tech = getTech();
    const activeResearch = getActiveResearch();
    
    if (activeResearch) return false;
    if (tech[techType] >= level) return false;
    if (tech[techType] + 1 !== level) return false;
    
    return true;
}

export function startResearch(techType, level) {
    if (!canResearch(techType, level)) return false;
    
    setActiveResearch({
        type: techType,
        level: level,
        daysLeft: 100
    });
    
    addNotification(`Исследование ${TECH_TREE[techType]?.name} ур.${level} начато!`, 'info');
    return true;
}

export function updateResearch() {
    const activeResearch = getActiveResearch();
    if (!activeResearch) return;
    
    activeResearch.daysLeft--;
    
    if (activeResearch.daysLeft <= 0) {
        const tech = getTech();
        tech[activeResearch.type] = activeResearch.level;
        setTech(tech);
        setActiveResearch(null);
        addNotification(`Исследование ${TECH_TREE[activeResearch.type]?.name} ур.${activeResearch.level} завершено!`, 'info');
    }
}

export function updateResearchUI() {
    const tech = getTech();
    const activeResearch = getActiveResearch();
    
    const container = document.getElementById('window-content');
    if (!container) return;
    
    let html = '<div class="space-y-4">';
    for (const [key, value] of Object.entries(TECH_TREE)) {
        const currentLevel = tech[key] || 1;
        html += `
            <div class="bg-gray-700 p-3 rounded">
                <div class="flex justify-between items-center mb-2">
                    <span class="font-bold text-yellow-500">${value.name}</span>
                    <span class="text-sm">Уровень ${currentLevel}/${value.maxLevel}</span>
                </div>
                <div class="progress-bar mb-2">
                    <div class="progress-fill" style="width: ${(currentLevel/value.maxLevel)*100}%"></div>
                </div>
        `;
        
        if (currentLevel < value.maxLevel && (!activeResearch || activeResearch.type !== key)) {
            html += `<button onclick="window.startResearch('${key}', ${currentLevel+1})" class="bg-blue-700 hover:bg-blue-600 px-3 py-1 text-xs rounded">ИССЛЕДОВАТЬ УР.${currentLevel+1}</button>`;
        } else if (activeResearch && activeResearch.type === key) {
            html += `<div class="text-xs text-blue-400">🔬 Исследуется: ${activeResearch.daysLeft} дней</div>`;
        }
        
        html += `</div>`;
    }
    html += '</div>';
    
    container.innerHTML = html;
}