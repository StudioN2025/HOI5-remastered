// FocusTree.js — Загрузка фокусов из папки focuses/

export let FOCUS_TREE = {};

const FOCUS_FILES = [
    'focuses/germany.json',
    'focuses/france.json',
    'focuses/ussr.json',
    'focuses/uk.json',
    'focuses/poland.json',
    'focuses/italy.json',
];

function convertFocusJSON(json, filename) {
    const result = [];

    for (const [treeKey, treeData] of Object.entries(json)) {
        if (!treeData || !treeData.Focuses) continue;

        // Определяем страну из имени файла или ключа
        const fname = filename.toLowerCase();
        const key = treeKey.toLowerCase();
        let country = null;
        if (fname.includes('germany') || key.includes('germany')) country = 'germany';
        else if (fname.includes('france') || key.includes('france')) country = 'france';
        else if (fname.includes('ussr') || key.includes('ussr') || key.includes('soviet')) country = 'ussr';
        else if (fname.includes('uk') || key.includes('uk') || key.includes('britain')) country = 'uk';
        else if (fname.includes('poland') || key.includes('poland')) country = 'poland';
        else if (fname.includes('italy') || key.includes('italy')) country = 'italy';

        if (!country) {
            console.warn(`⚠️ Страна не определена для ${filename}, пропускаем`);
            continue;
        }

        const focuses = treeData.Focuses;
        if (!focuses || !focuses.length) continue;

        // Создаём маппинг имен → id
        const nameToId = {};
        for (const f of focuses) {
            nameToId[f.name] = f.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
        }

        // Вычисляем глубину (tier) для каждой ноды
        const depthCache = {};
        function getDepth(name, seen) {
            if (depthCache[name] !== undefined) return depthCache[name];
            if (seen.has(name)) return 0;
            seen.add(name);
            const f = focuses.find(ff => ff.name === name);
            if (!f || !f.requirements || !f.requirements.length) { depthCache[name] = 0; return 0; }
            let maxD = 0;
            for (const r of f.requirements) {
                const d = getDepth(r, new Set(seen));
                if (d > maxD) maxD = d;
            }
            depthCache[name] = maxD + 1;
            return maxD + 1;
        }
        for (const f of focuses) getDepth(f.name, new Set());

        // Вычисляем колонку (ветку) по первой зависимости
        const colCache = {};
        let nextCol = 0;
        for (const f of focuses) {
            const id = nameToId[f.name];
            if (!f.requirements || !f.requirements.length) {
                colCache[id] = nextCol++;
            } else {
                colCache[id] = colCache[nameToId[f.requirements[0]]] ?? 0;
            }
        }

        // Создаём ноды
        const NW = 130, GX = 40, GY = 70, NH = 60;
        for (const f of focuses) {
            const id = nameToId[f.name];
            const tier = depthCache[f.name] || 0;
            const col = colCache[id] ?? 0;
            const effects = f.effects || [];

            // Определяем эффект из текста
            const effect = {};
            const joined = effects.join(' ');
            if (joined.includes('завод')) effect.factories = parseInt(joined.match(/\d+/)?.[0] || 3);
            if (joined.includes('танк')) effect.tanks = parseInt(joined.match(/\d+/)?.[0] || 2);
            if (joined.includes('дивизи') || joined.includes('войск')) effect.infantry = parseInt(joined.match(/\d+/)?.[0] || 3);
            if (joined.includes('снаряж')) effect.equipment = parseInt(joined.match(/\d+/)?.[0]) || 500;
            if (joined.includes('война') || joined.includes('атак')) {
                // Пытаемся найти цель войны
                if (joined.toLowerCase().includes('поланд')) effect.war = 'poland';
                else if (joined.toLowerCase().includes('франц')) effect.war = 'france';
                else if (joined.toLowerCase().includes('ссср') || joined.toLowerCase().includes('совет')) effect.war = 'ussr';
                else if (joined.toLowerCase().includes('финлянд')) effect.war = 'finland';
            }
            if (joined.includes('альянс') || joined.includes('союз')) {
                if (joined.toLowerCase().includes('итали')) effect.allies = ['italy'];
                if (joined.toLowerCase().includes('япон')) effect.allies = ['japan'];
            }
            if (joined.toLowerCase().includes('аннекс') || joined.toLowerCase().includes('присоедин')) {
                if (joined.toLowerCase().includes('австри')) effect.annex = ['austria'];
                if (joined.toLowerCase().includes('чех') || joined.toLowerCase().includes('судет')) effect.annex = ['czechoslovakia'];
                if (joined.toLowerCase().includes('балтик')) effect.annex = ['lithuania', 'latvia', 'estonia'];
            }

            result.push({
                id, name: f.name,
                desc: effects.slice(0, 2).join(', ') || '',
                icon: '⭐', country,
                x: 30 + col * 170, y: 40 + tier * 70,
                prereqs: (f.requirements || []).map(r => nameToId[r]).filter(Boolean),
                effect,
            });
        }
    }

    return result;
}

export async function loadFocusTree() {
    const allFocuses = {};

    for (const file of FOCUS_FILES) {
        try {
            const resp = await fetch(file);
            if (!resp.ok) { console.warn(`⚠️ ${file}: HTTP ${resp.status}`); continue; }
            const json = await resp.json();
            console.log(`📂 ${file}: ключей=${Object.keys(json).length}, тип=${typeof json}`);
            const arr = convertFocusJSON(json, file);
            console.log(`📋 ${file}: сконвертировано ${arr.length} фокусов`);
            for (const f of arr) allFocuses[f.id] = f;
        } catch (e) {
            console.error(`❌ ${file}: ${e.message}`, e);
        }
    }

    FOCUS_TREE = allFocuses;
    console.log(`✅ Итого: ${Object.keys(FOCUS_TREE).length} фокусов`);
    console.log('🔑 Примеры ID:', Object.keys(FOCUS_TREE).slice(0, 5));
    return FOCUS_TREE;
}
    }

    FOCUS_TREE = allFocuses;
    console.log(`✅ Итого: ${Object.keys(FOCUS_TREE).length} фокусов`);
    return FOCUS_TREE;
}
