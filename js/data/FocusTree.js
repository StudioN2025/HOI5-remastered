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
            : 'germany';

        const nameToId = {};
        for (const f of treeData.Focuses) {
            nameToId[f.name] = f.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
        }

        for (const f of treeData.Focuses) {
            const id = nameToId[f.name];
            result[id] = {
                id,
                name: f.name,
                desc: (f.effects || []).slice(0, 2).join(', ') || '',
                icon: '⭐',
                country,
                tier: 0,
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
