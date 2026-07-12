// FocusTree.js — Загрузка фокусов из папки focuses/

export let FOCUS_TREE = {};

const FOCUS_FILES = [
    'focuses/germany.json',
    'focuses/france.json',
    'focuses/ussr.json',
    'focuses/uk.json',
    'focuses/poland.json',
    'focuses/italy.json',
    'focuses/luxembourg.json',
];

const nodeH = 60;

function convertFocusJSON(json) {
    const result = {};

    for (const [treeKey, treeData] of Object.entries(json)) {
        if (!treeData || !treeData.Focuses) continue;

        const country = treeKey.toLowerCase().includes('germany') ? 'germany'
            : treeKey.toLowerCase().includes('france') ? 'france'
            : treeKey.toLowerCase().includes('ussr') ? 'ussr'
            : treeKey.toLowerCase().includes('uk') ? 'uk'
            : treeKey.toLowerCase().includes('italy') ? 'italy'
            : treeKey.toLowerCase().includes('poland') ? 'poland'
            : treeKey.toLowerCase().includes('luxembourg') ? 'luxembourg'
            : null;

        if (!country) continue; // Пропускаем неизвестные страны

        const focuses = treeData.Focuses;
        const nameToId = {};
        for (const f of focuses) {
            nameToId[f.name] = f.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
        }

        // Определяем tier для каждого фокуса (глубина зависимостей)
        const tierMap = {};
        function calcTier(name, visited = new Set()) {
            if (tierMap[name] !== undefined) return tierMap[name];
            if (visited.has(name)) return 0;
            visited.add(name);
            const f = focuses.find(ff => ff.name === name);
            if (!f || !f.requirements || f.requirements.length === 0) { tierMap[name] = 0; return 0; }
            const maxParent = Math.max(...f.requirements.map(r => calcTier(r, new Set(visited))));
            tierMap[name] = maxParent + 1;
            return tierMap[name];
        }
        for (const f of focuses) calcTier(f.name);

        // Определяем колонку (ветку) для каждого фокуса
        const colMap = {};
        let colIdx = 0;
        const usedCols = new Set();
        for (const f of focuses) {
            const id = nameToId[f.name];
            if (!f.requirements || f.requirements.length === 0) {
                colMap[id] = colIdx++;
            } else {
                const parentCol = colMap[nameToId[f.requirements[0]]] || 0;
                colMap[id] = parentCol;
            }
        }

        // Позиционируем
        const nodeW = 130, gapX = 40, gapY = 70;
        for (const f of focuses) {
            const id = nameToId[f.name];
            const tier = tierMap[f.name] || 0;
            const col = colMap[id] || 0;
            result[id] = {
                id,
                name: f.name,
                desc: (f.effects || []).slice(0, 2).join(', ') || '',
                icon: '⭐',
                country,
                x: f.x !== undefined ? f.x : 30 + col * (nodeW + gapX),
                y: f.y !== undefined ? f.y : 40 + tier * (nodeH + gapY),
                prereqs: (f.requirements || []).map(r => nameToId[r]).filter(Boolean),
                effect: {},
            };
        }
    }
    return result;
}

export async function loadFocusTree() {
    const allFocuses = {};

    for (const file of FOCUS_FILES) {
        try {
            const resp = await fetch(file);
            if (!resp.ok) continue;
            const json = await resp.json();
            const converted = convertFocusJSON(json);
            Object.assign(allFocuses, converted);
            console.log(`📋 Загружено ${Object.keys(converted).length} фокусов из ${file}`);
        } catch (e) {
            console.warn(`⚠️ Не удалось загрузить ${file}: ${e.message}`);
        }
    }

    FOCUS_TREE = allFocuses;
    console.log(`✅ Всего фокусов: ${Object.keys(FOCUS_TREE).length}`);
    return FOCUS_TREE;
}
