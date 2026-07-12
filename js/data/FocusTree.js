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

// Определяет эффект по названию и описанию фокуса
function guessEffect(name, desc) {
    const n = name.toLowerCase();
    const d = desc.toLowerCase();
    const joined = (n + ' ' + d);

    const effect = {};

    // Заводы
    if (joined.includes('завод') || joined.includes('промышл')) {
        const m = joined.match(/(\d+)\s*завод/);
        effect.factories = m ? parseInt(m[1]) : 3;
    }

    // Танки
    if (joined.includes('танк') && !joined.includes('противотанк')) {
        const m = joined.match(/(\d+)\s*танк/);
        effect.tanks = m ? parseInt(m[1]) : 2;
    }

    // Пехота / дивизии / войска
    if (joined.includes('дивизи') || joined.includes('войск') || joined.includes('пехот')) {
        const m = joined.match(/(\d+)\s*(?:дивиз|войск|пехот)/);
        effect.infantry = m ? parseInt(m[1]) : 3;
    }

    // Снаряжение
    if (joined.includes('снаряж')) {
        const m = joined.match(/(\d+)/);
        effect.equipment = m ? parseInt(m[1]) : 500;
    }

    // Люди
    if (joined.includes('призыв') || joined.includes('населени') || joined.includes('рекрут')) {
        effect.manpower = 5000;
    }

    // Порты
    if (joined.includes('порт') || joined.includes('верф')) {
        effect.ports = 1;
    }

    // Война
    if (joined.includes('война') || joined.includes('нападени') || joined.includes('атак')) {
        if (d.includes('польш')) effect.war = 'poland';
        else if (d.includes('франц')) effect.war = 'france';
        else if (d.includes('ссср') || d.includes('совет') || d.includes('восточ')) effect.war = 'ussr';
        else if (d.includes('финлянд')) effect.war = 'finland';
        else if (d.includes('британ') || d.includes('лондон')) effect.war = 'uk';
    }

    // Альянс
    if (joined.includes('альянс') || joined.includes('союз') || joined.includes('пакт')) {
        if (d.includes('итали')) effect.allies = ['italy'];
        if (d.includes('япон')) effect.allies = ['japan'];
        if (d.includes('румын')) effect.allies = ['romania'];
    }

    // Аннексия
    if (joined.includes('аннекс') || joined.includes('присоедин') || joined.includes('протекторат')) {
        if (d.includes('австри')) effect.annex = ['austria'];
        if (d.includes('чех') || d.includes('судет')) effect.annex = ['czechoslovakia'];
        if (d.includes('балтик') || d.includes('литва') || d.includes('латв') || d.includes('эстон')) effect.annex = ['lithuania', 'latvia', 'estonia'];
        if (d.includes('мемел')) effect.annex = ['lithuania'];
    }

    // Если ничего не нашли — даём хоть что-то
    if (Object.keys(effect).length === 0) {
        effect.equipment = 200;
    }

    return effect;
}

function convertFocusJSON(json, filename) {
    const result = [];

    for (const [treeKey, treeData] of Object.entries(json)) {
        if (!treeData || !treeData.Focuses) continue;

        const fname = filename.toLowerCase();
        const key = treeKey.toLowerCase();
        let country = null;
        if (fname.includes('germany') || key.includes('germany')) country = 'germany';
        else if (fname.includes('france') || key.includes('france')) country = 'france';
        else if (fname.includes('ussr') || key.includes('ussr') || key.includes('soviet')) country = 'ussr';
        else if (fname.includes('uk') || key.includes('uk') || key.includes('britain')) country = 'uk';
        else if (fname.includes('poland') || key.includes('poland')) country = 'poland';
        else if (fname.includes('italy') || key.includes('italy')) country = 'italy';
        if (!country) continue;

        const focuses = treeData.Focuses;
        if (!focuses || !focuses.length) continue;

        const nameToId = {};
        for (const f of focuses) {
            nameToId[f.name] = country + '_' + f.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
        }

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

        const colCache = {};
        let nextCol = 0;
        for (const f of focuses) {
            const id = nameToId[f.name];
            if (!f.requirements || !f.requirements.length) colCache[id] = nextCol++;
            else colCache[id] = colCache[nameToId[f.requirements[0]]] ?? 0;
        }

        for (const f of focuses) {
            const id = nameToId[f.name];
            const tier = depthCache[f.name] || 0;
            const col = colCache[id] ?? 0;
            const desc = (f.effects || []).join(', ') || '';
            const effect = guessEffect(f.name, desc);

            result.push({
                id, name: f.name,
                desc: desc,
                icon: '⭐', country,
                x: f.x !== undefined ? f.x : 30 + col * 170,
                y: f.y !== undefined ? f.y : 40 + tier * 70,
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
            if (!resp.ok) continue;
            const json = await resp.json();
            const arr = convertFocusJSON(json, file);
            for (const f of arr) allFocuses[f.id] = f;
            console.log(`📋 ${file}: ${arr.length} фокусов`);
        } catch (e) { console.error(`❌ ${file}: ${e.message}`); }
    }
    FOCUS_TREE = allFocuses;
    console.log(`✅ Фокусов: ${Object.keys(FOCUS_TREE).length}`);
    return FOCUS_TREE;
}
