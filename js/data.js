// data.js — все константы и данные игры

export const COUNTRIES = {
    "germany": { name: "Германия", color: "#3a3a3a", leader: "Адольф Гитлер", ideology: "Фашизм" },
    "ussr": { name: "СССР", color: "#990000", leader: "Иосиф Сталин", ideology: "Коммунизм" },
    "poland": { name: "Польша", color: "#ffc0cb", leader: "Игнаций Мосцицкий", ideology: "Нейтралитет" },
    "france": { name: "Франция", color: "#3b82f6", leader: "Альбер Лебрен", ideology: "Демократия" },
    "uk": { name: "Великобритания", color: "#ef4444", leader: "Невилл Чемберлен", ideology: "Демократия" },
    "italy": { name: "Италия", color: "#166534", leader: "Бенито Муссолини", ideology: "Фашизм" },
    "spain": { name: "Испания", color: "#fbbf24", leader: "Франсиско Франко", ideology: "Фашизм" },
    "portugal": { name: "Португалия", color: "#105d10", leader: "Антониу Салазар", ideology: "Нейтралитет" },
    "netherlands": { name: "Нидерланды", color: "#f97316", leader: "Вильгельмина", ideology: "Демократия" },
    "belgium": { name: "Бельгия", color: "#eab308", leader: "Леопольд III", ideology: "Демократия" },
    "luxembourg": { name: "Люксембург", color: "#67e8f9", leader: "Шарлотта", ideology: "Демократия" },
    "switzerland": { name: "Швейцария", color: "#dc2626", leader: "Джузеппе Мотта", ideology: "Демократия" },
    "romania": { name: "Румыния", color: "#eab308", leader: "Кароль II", ideology: "Нейтралитет" },
    "hungary": { name: "Венгрия", color: "#166534", leader: "Миклош Хорти", ideology: "Нейтралитет" },
    "bulgaria": { name: "Болгария", color: "#105d10", leader: "Борис III", ideology: "Нейтралитет" },
    "finland": { name: "Финляндия", color: "#ffffff", leader: "Кюёсти Каллио", ideology: "Нейтралитет" },
    "czechoslovakia": { name: "Чехословакия", color: "#3b82f6", leader: "Эдвард Бенеш", ideology: "Демократия" },
    "austria": { name: "Австрия", color: "#ef4444", leader: "Курт Шушниг", ideology: "Нейтралитет" },
    "denmark": { name: "Дания", color: "#ef4444", leader: "Кристиан X", ideology: "Демократия" },
    "greece": { name: "Греция", color: "#60a5fa", leader: "Иоаннис Метаксас", ideology: "Нейтралитет" },
    "yugoslavia": { name: "Югославия", color: "#1e3a8a", leader: "Пётр II", ideology: "Нейтралитет" },
    "lithuania": { name: "Литва", color: "#065f46", leader: "Антанас Сметона", ideology: "Нейтралитет" },
    "latvia": { name: "Латвия", color: "#8b0000", leader: "Карлис Улманис", ideology: "Нейтралитет" },
    "estonia": { name: "Эстония", color: "#4682b4", leader: "Константин Пятс", ideology: "Нейтралитет" },
    "slovakia": { name: "Словакия", color: "#60a5fa", leader: "Йозеф Тисо", ideology: "Фашизм" }
    "turkey": { name: "Турция", color: "#c8102e", leader: "Мустафа Кемаль Ататюрк", ideology: "Нейтралитет" },
};

export const UNIT_STATS = {
    infantry: { 
        name: "Пехота", icon: "💂", 
        costEquipment: 100, costManpower: 1000,
        attack: 10, defense: 25, hp: 100, armor: 0,
        maintenance: 0.2
    },
    tank: { 
        name: "Танки", icon: "🚜", 
        costEquipment: 800, costManpower: 500,
        attack: 45, defense: 15, hp: 50, armor: 30,
        maintenance: 1.5
    }
};

export const BUILDING_STATS = {
    factory: { name: "Военный завод", icon: "🏭", costEquipment: 500, buildTime: 135 },
    port: { name: "Морской порт", icon: "⚓", costEquipment: 300, buildTime: 90 }
};

export const TECH_TREE = {
    industry: { name: "Промышленность", maxLevel: 5, bonus: 0.05 },
    infantry: { name: "Пехота", maxLevel: 5, bonus: 0.05 },
    tank: { name: "Танки", maxLevel: 5, bonus: 0.05 }
};

// data.js — ПОЛНЫЙ NATIONAL_FOCUSES ДЛЯ ВСЕХ СТРАН

export const NATIONAL_FOCUSES = {
    germany: [
        { 
            id: 'ger_rearm', 
            name: "Перевооружение", 
            description: "+1000 снаряжения", 
            effect: (ctx) => { ctx.resources.equipment += 1000; } 
        },
        { 
            id: 'ger_danzig', 
            name: "Данциг или война", 
            description: "Война с Польшей", 
            effect: (ctx) => { ctx.declareWar('poland'); } 
        },
        { 
            id: 'ger_axis', 
            name: "Создать Ось", 
            description: "Альянс с Италией, Венгрией, Румынией", 
            effect: (ctx) => { 
                ctx.proposeAlliance('italy');
                ctx.proposeAlliance('hungary');
                ctx.proposeAlliance('romania');
            } 
        },
        { 
            id: 'ger_break_pact', 
            name: "Разорвать пакт", 
            description: "Война с СССР, +4 танковые дивизии", 
            effect: (ctx) => { 
                ctx.declareWar('ussr');
                ctx.addUnits('tank', 4);
            } 
        },
        { 
            id: 'ger_west', 
            name: "Западный поход", 
            description: "Война с Францией, Бельгией, Нидерландами", 
            effect: (ctx) => { 
                ctx.declareWar('france');
                ctx.declareWar('belgium');
                ctx.declareWar('netherlands');
            } 
        }
    ],
    
    ussr: [
        { 
            id: 'ussr_five_year', 
            name: "Пятилетний план", 
            description: "+5 заводов на территории СССР", 
            effect: (ctx) => { ctx.addFactories(5); } 
        },
        { 
            id: 'ussr_fin_war', 
            name: "Зимняя война", 
            description: "Война с Финляндией", 
            effect: (ctx) => { ctx.declareWar('finland'); } 
        },
        { 
            id: 'ussr_baltic', 
            name: "Прибалтийский вопрос", 
            description: "Аннексия Литвы, Латвии, Эстонии", 
            effect: (ctx) => {
                ['lithuania', 'latvia', 'estonia'].forEach(t => {
                    if (Math.random() < 0.7) {
                        const gridData = ctx.getGridData();
                        Object.keys(gridData).forEach(key => {
                            if (gridData[key] === t) gridData[key] = 'ussr';
                        });
                    } else {
                        ctx.declareWar(t);
                    }
                });
            } 
        },
        { 
            id: 'ussr_defense', 
            name: "Великая Отечественная", 
            description: "+6 пехотных дивизий, +2000 снаряжения", 
            effect: (ctx) => { 
                ctx.addUnits('infantry', 6);
                ctx.resources.equipment += 2000;
            } 
        },
        { 
            id: 'ussr_industry', 
            name: "Индустриализация", 
            description: "+10 заводов, +3000 снаряжения", 
            effect: (ctx) => { 
                ctx.addFactories(10);
                ctx.resources.equipment += 3000;
            } 
        }
    ],
    
    italy: [
        { 
            id: 'ita_navy', 
            name: "Развитие флота", 
            description: "+2 порта на побережье", 
            effect: (ctx) => {
                const gridData = ctx.getGridData();
                const cellStats = ctx.getCellStats();
                let portsAdded = 0;
                for (const [pos, id] of Object.entries(gridData)) {
                    if (id === 'italy' && portsAdded < 2) {
                        const [x, y] = pos.split(',').map(Number);
                        const isCoastal = [[0,1],[0,-1],[1,0],[-1,0]].some(([dx,dy]) => !gridData[`${x+dx},${y+dy}`]);
                        if (isCoastal) {
                            if (!cellStats[pos]) cellStats[pos] = { population: 10000, factories: 0, buildings: [] };
                            if (!cellStats[pos].buildings.includes('port')) {
                                cellStats[pos].buildings.push('port');
                                portsAdded++;
                            }
                        }
                    }
                }
            } 
        },
        { 
            id: 'ita_revive', 
            name: "Возродить Рим", 
            description: "Война с Югославией и Грецией", 
            effect: (ctx) => { 
                ctx.declareWar('yugoslavia');
                ctx.declareWar('greece');
            } 
        },
        { 
            id: 'ita_empire', 
            name: "Итальянская империя", 
            description: "+1000 снаряжения, +2 танковые дивизии", 
            effect: (ctx) => { 
                ctx.resources.equipment += 1000;
                ctx.addUnits('tank', 2);
            } 
        },
        { 
            id: 'ita_allies', 
            name: "Средиземноморский союз", 
            description: "Альянс с Испанией и Португалией", 
            effect: (ctx) => { 
                ctx.proposeAlliance('spain');
                ctx.proposeAlliance('portugal');
            } 
        }
    ],
    
    uk: [
        { 
            id: 'uk_navy', 
            name: "Владычица морей", 
            description: "+3 порта, +1000 снаряжения", 
            effect: (ctx) => {
                const gridData = ctx.getGridData();
                const cellStats = ctx.getCellStats();
                let portsAdded = 0;
                for (const [pos, id] of Object.entries(gridData)) {
                    if (id === 'uk' && portsAdded < 3) {
                        const [x, y] = pos.split(',').map(Number);
                        const isCoastal = [[0,1],[0,-1],[1,0],[-1,0]].some(([dx,dy]) => !gridData[`${x+dx},${y+dy}`]);
                        if (isCoastal) {
                            if (!cellStats[pos]) cellStats[pos] = { population: 10000, factories: 0, buildings: [] };
                            if (!cellStats[pos].buildings) cellStats[pos].buildings = [];
                            if (!cellStats[pos].buildings.includes('port')) {
                                cellStats[pos].buildings.push('port');
                                portsAdded++;
                            }
                        }
                    }
                }
                ctx.resources.equipment += 1000;
            } 
        },
        { 
            id: 'uk_empire', 
            name: "Имперская конференция", 
            description: "+5 заводов, +2000 снаряжения", 
            effect: (ctx) => { 
                ctx.addFactories(5);
                ctx.resources.equipment += 2000;
            } 
        },
        { 
            id: 'uk_guarantee', 
            name: "Гарантии Польше", 
            description: "Альянс с Польшей. Если Германия нападёт — война.", 
            effect: (ctx) => { 
                ctx.proposeAlliance('poland');
            } 
        },
        { 
            id: 'uk_raf', 
            name: "Королевские ВВС", 
            description: "+4 пехотные дивизии, +1000 снаряжения", 
            effect: (ctx) => { 
                ctx.addUnits('infantry', 4);
                ctx.resources.equipment += 1000;
            } 
        }
    ],
    
    france: [
        { 
            id: 'fra_maginot', 
            name: "Линия Мажино", 
            description: "+3 завода на границе с Германией", 
            effect: (ctx) => { ctx.addFactories(3); } 
        },
        { 
            id: 'fra_allies', 
            name: "Антанта", 
            description: "Альянс с Великобританией и Польшей", 
            effect: (ctx) => { 
                ctx.proposeAlliance('uk');
                ctx.proposeAlliance('poland');
            } 
        },
        { 
            id: 'fra_colonies', 
            name: "Колониальная мобилизация", 
            description: "+5 пехотных дивизий, +1500 снаряжения", 
            effect: (ctx) => { 
                ctx.addUnits('infantry', 5);
                ctx.resources.equipment += 1500;
            } 
        },
        { 
            id: 'fra_revanche', 
            name: "Реванш", 
            description: "Война с Германией", 
            effect: (ctx) => { ctx.declareWar('germany'); } 
        }
    ],
    
    poland: [
        { 
            id: 'pol_army', 
            name: "Модернизация армии", 
            description: "+3 пехотные дивизии, +500 снаряжения", 
            effect: (ctx) => { 
                ctx.addUnits('infantry', 3);
                ctx.resources.equipment += 500;
            } 
        },
        { 
            id: 'pol_allies', 
            name: "Союзники", 
            description: "Альянс с Францией и Великобританией", 
            effect: (ctx) => { 
                ctx.proposeAlliance('france');
                ctx.proposeAlliance('uk');
            } 
        },
        { 
            id: 'pol_industry', 
            name: "Центральный промышленный округ", 
            description: "+3 завода", 
            effect: (ctx) => { ctx.addFactories(3); } 
        },
        { 
            id: 'pol_defense', 
            name: "План обороны", 
            description: "+2 танковые дивизии, +1000 снаряжения", 
            effect: (ctx) => { 
                ctx.addUnits('tank', 2);
                ctx.resources.equipment += 1000;
            } 
        }
    ],
    
    spain: [
        { 
            id: 'spa_rebuild', 
            name: "Восстановление после войны", 
            description: "+2 завода, +500 снаряжения", 
            effect: (ctx) => { 
                ctx.addFactories(2);
                ctx.resources.equipment += 500;
            } 
        },
        { 
            id: 'spa_neutral', 
            name: "Нейтралитет", 
            description: "Отказ от вступления в войны", 
            effect: (ctx) => { /* Ничего, просто фокус */ } 
        },
        { 
            id: 'spa_empire', 
            name: "Испанская империя", 
            description: "Война с Португалией", 
            effect: (ctx) => { ctx.declareWar('portugal'); } 
        },
        { 
            id: 'spa_fleet', 
            name: "Армада", 
            description: "+2 порта, +500 снаряжения", 
            effect: (ctx) => {
                const gridData = ctx.getGridData();
                const cellStats = ctx.getCellStats();
                let portsAdded = 0;
                for (const [pos, id] of Object.entries(gridData)) {
                    if (id === 'spain' && portsAdded < 2) {
                        const [x, y] = pos.split(',').map(Number);
                        if ([[0,1],[0,-1],[1,0],[-1,0]].some(([dx,dy]) => !gridData[`${x+dx},${y+dy}`])) {
                            if (!cellStats[pos]) cellStats[pos] = { population: 10000, factories: 0, buildings: [] };
                            if (!cellStats[pos].buildings) cellStats[pos].buildings = [];
                            if (!cellStats[pos].buildings.includes('port')) {
                                cellStats[pos].buildings.push('port');
                                portsAdded++;
                            }
                        }
                    }
                }
                ctx.resources.equipment += 500;
            } 
        }
    ],
    
    turkey: [
        { 
            id: 'tur_modernize', 
            name: "Модернизация армии", 
            description: "+1000 снаряжения, +2 пехотные дивизии", 
            effect: (ctx) => { 
                ctx.resources.equipment += 1000;
                ctx.addUnits('infantry', 2);
            } 
        },
        { 
            id: 'tur_balkans', 
            name: "Влияние на Балканах", 
            description: "Альянс с Болгарией, война с Грецией", 
            effect: (ctx) => { 
                ctx.proposeAlliance('bulgaria');
                ctx.declareWar('greece');
            } 
        },
        { 
            id: 'tur_straits', 
            name: "Контроль над проливами", 
            description: "+2 порта на побережье", 
            effect: (ctx) => {
                const gridData = ctx.getGridData();
                const cellStats = ctx.getCellStats();
                let portsAdded = 0;
                for (const [pos, id] of Object.entries(gridData)) {
                    if (id === 'turkey' && portsAdded < 2) {
                        const [x, y] = pos.split(',').map(Number);
                        if ([[0,1],[0,-1],[1,0],[-1,0]].some(([dx,dy]) => !gridData[`${x+dx},${y+dy}`])) {
                            if (!cellStats[pos]) cellStats[pos] = { population: 10000, factories: 0, buildings: [] };
                            if (!cellStats[pos].buildings) cellStats[pos].buildings = [];
                            if (!cellStats[pos].buildings.includes('port')) {
                                cellStats[pos].buildings.push('port');
                                portsAdded++;
                            }
                        }
                    }
                }
            } 
        },
        { 
            id: 'tur_pan_turkic', 
            name: "Пантюркизм", 
            description: "Война с СССР", 
            effect: (ctx) => { ctx.declareWar('ussr'); } 
        }
    ],
    
    romania: [
        { 
            id: 'rom_army', 
            name: "Королевская армия", 
            description: "+2 пехотные дивизии, +500 снаряжения", 
            effect: (ctx) => { 
                ctx.addUnits('infantry', 2);
                ctx.resources.equipment += 500;
            } 
        },
        { 
            id: 'rom_oil', 
            name: "Нефтяные месторождения", 
            description: "+3 завода, +1000 снаряжения", 
            effect: (ctx) => { 
                ctx.addFactories(3);
                ctx.resources.equipment += 1000;
            } 
        },
        { 
            id: 'rom_balkans', 
            name: "Балканский пакт", 
            description: "Альянс с Югославией и Грецией", 
            effect: (ctx) => { 
                ctx.proposeAlliance('yugoslavia');
                ctx.proposeAlliance('greece');
            } 
        }
    ],
    
    hungary: [
        { 
            id: 'hun_army', 
            name: "Гонвед", 
            description: "+2 пехотные дивизии, +500 снаряжения", 
            effect: (ctx) => { 
                ctx.addUnits('infantry', 2);
                ctx.resources.equipment += 500;
            } 
        },
        { 
            id: 'hun_revise', 
            name: "Пересмотр Трианона", 
            description: "Война с Чехословакией и Румынией", 
            effect: (ctx) => { 
                ctx.declareWar('czechoslovakia');
                ctx.declareWar('romania');
            } 
        },
        { 
            id: 'hun_axis', 
            name: "Присоединиться к Оси", 
            description: "Альянс с Германией и Италией", 
            effect: (ctx) => { 
                ctx.proposeAlliance('germany');
                ctx.proposeAlliance('italy');
            } 
        }
    ],
    
    yugoslavia: [
        { 
            id: 'yug_army', 
            name: "Королевская армия", 
            description: "+2 пехотные дивизии, +500 снаряжения", 
            effect: (ctx) => { 
                ctx.addUnits('infantry', 2);
                ctx.resources.equipment += 500;
            } 
        },
        { 
            id: 'yug_unity', 
            name: "Братство и единство", 
            description: "+2 завода", 
            effect: (ctx) => { ctx.addFactories(2); } 
        },
        { 
            id: 'yug_balkans', 
            name: "Балканский союз", 
            description: "Альянс с Румынией и Грецией", 
            effect: (ctx) => { 
                ctx.proposeAlliance('romania');
                ctx.proposeAlliance('greece');
            } 
        }
    ],
    
    greece: [
        { 
            id: 'gre_army', 
            name: "Эллинская армия", 
            description: "+2 пехотные дивизии, +500 снаряжения", 
            effect: (ctx) => { 
                ctx.addUnits('infantry', 2);
                ctx.resources.equipment += 500;
            } 
        },
        { 
            id: 'gre_navy', 
            name: "Эллинский флот", 
            description: "+2 порта", 
            effect: (ctx) => {
                const gridData = ctx.getGridData();
                const cellStats = ctx.getCellStats();
                let portsAdded = 0;
                for (const [pos, id] of Object.entries(gridData)) {
                    if (id === 'greece' && portsAdded < 2) {
                        const [x, y] = pos.split(',').map(Number);
                        if ([[0,1],[0,-1],[1,0],[-1,0]].some(([dx,dy]) => !gridData[`${x+dx},${y+dy}`])) {
                            if (!cellStats[pos]) cellStats[pos] = { population: 10000, factories: 0, buildings: [] };
                            if (!cellStats[pos].buildings) cellStats[pos].buildings = [];
                            if (!cellStats[pos].buildings.includes('port')) {
                                cellStats[pos].buildings.push('port');
                                portsAdded++;
                            }
                        }
                    }
                }
            } 
        },
        { 
            id: 'gre_megali', 
            name: "Великая идея", 
            description: "Война с Турцией", 
            effect: (ctx) => { ctx.declareWar('turkey'); } 
        }
    ],
    
    bulgaria: [
        { 
            id: 'bul_army', 
            name: "Царская армия", 
            description: "+2 пехотные дивизии, +500 снаряжения", 
            effect: (ctx) => { 
                ctx.addUnits('infantry', 2);
                ctx.resources.equipment += 500;
            } 
        },
        { 
            id: 'bul_revise', 
            name: "Великая Болгария", 
            description: "Война с Югославией и Грецией", 
            effect: (ctx) => { 
                ctx.declareWar('yugoslavia');
                ctx.declareWar('greece');
            } 
        }
    ],
    
    finland: [
        { 
            id: 'fin_defense', 
            name: "Линия Маннергейма", 
            description: "+3 пехотные дивизии, +1000 снаряжения", 
            effect: (ctx) => { 
                ctx.addUnits('infantry', 3);
                ctx.resources.equipment += 1000;
            } 
        },
        { 
            id: 'fin_continue', 
            name: "Война-продолжение", 
            description: "Война с СССР", 
            effect: (ctx) => { ctx.declareWar('ussr'); } 
        }
    ],
    
    sweden: [
        { 
            id: 'swe_neutral', 
            name: "Вооружённый нейтралитет", 
            description: "+2 завода, +1000 снаряжения", 
            effect: (ctx) => { 
                ctx.addFactories(2);
                ctx.resources.equipment += 1000;
            } 
        },
        { 
            id: 'swe_army', 
            name: "Шведская сталь", 
            description: "+2 танковые дивизии", 
            effect: (ctx) => { ctx.addUnits('tank', 2); } 
        }
    ],
    
    norway: [
        { 
            id: 'nor_defense', 
            name: "Оборона фьордов", 
            description: "+2 пехотные дивизии, +1 порт", 
            effect: (ctx) => {
                ctx.addUnits('infantry', 2);
                const gridData = ctx.getGridData();
                const cellStats = ctx.getCellStats();
                for (const [pos, id] of Object.entries(gridData)) {
                    if (id === 'norway') {
                        const [x, y] = pos.split(',').map(Number);
                        if ([[0,1],[0,-1],[1,0],[-1,0]].some(([dx,dy]) => !gridData[`${x+dx},${y+dy}`])) {
                            if (!cellStats[pos]) cellStats[pos] = { population: 10000, factories: 0, buildings: [] };
                            if (!cellStats[pos].buildings) cellStats[pos].buildings = [];
                            if (!cellStats[pos].buildings.includes('port')) {
                                cellStats[pos].buildings.push('port');
                                break;
                            }
                        }
                    }
                }
            } 
        }
    ],
    
    denmark: [
        { 
            id: 'den_defense', 
            name: "Оборона проливов", 
            description: "+2 пехотные дивизии, +500 снаряжения", 
            effect: (ctx) => { 
                ctx.addUnits('infantry', 2);
                ctx.resources.equipment += 500;
            } 
        }
    ],
    
    netherlands: [
        { 
            id: 'net_colonies', 
            name: "Колониальные ресурсы", 
            description: "+2 завода, +1000 снаряжения", 
            effect: (ctx) => { 
                ctx.addFactories(2);
                ctx.resources.equipment += 1000;
            } 
        },
        { 
            id: 'net_defense', 
            name: "Водная линия", 
            description: "+3 пехотные дивизии", 
            effect: (ctx) => { ctx.addUnits('infantry', 3); } 
        }
    ],
    
    belgium: [
        { 
            id: 'bel_forts', 
            name: "Укрепления", 
            description: "+2 завода, +500 снаряжения", 
            effect: (ctx) => { 
                ctx.addFactories(2);
                ctx.resources.equipment += 500;
            } 
        },
        { 
            id: 'bel_neutral', 
            name: "Нейтралитет", 
            description: "Отказ от альянсов", 
            effect: (ctx) => { /* Ничего */ } 
        }
    ],
    
    czechoslovakia: [
        { 
            id: 'cze_forts', 
            name: "Пограничные укрепления", 
            description: "+3 завода, +1000 снаряжения", 
            effect: (ctx) => { 
                ctx.addFactories(3);
                ctx.resources.equipment += 1000;
            } 
        },
        { 
            id: 'cze_army', 
            name: "Мобилизация", 
            description: "+4 пехотные дивизии", 
            effect: (ctx) => { ctx.addUnits('infantry', 4); } 
        },
        { 
            id: 'cze_allies', 
            name: "Малая Антанта", 
            description: "Альянс с Румынией и Югославией", 
            effect: (ctx) => { 
                ctx.proposeAlliance('romania');
                ctx.proposeAlliance('yugoslavia');
            } 
        }
    ],
    
    austria: [
        { 
            id: 'aus_army', 
            name: "Федеральная армия", 
            description: "+2 пехотные дивизии, +500 снаряжения", 
            effect: (ctx) => { 
                ctx.addUnits('infantry', 2);
                ctx.resources.equipment += 500;
            } 
        },
        { 
            id: 'aus_anschluss', 
            name: "Аншлюс", 
            description: "Присоединиться к Германии", 
            effect: (ctx) => {
                const gridData = ctx.getGridData();
                Object.keys(gridData).forEach(key => {
                    if (gridData[key] === 'austria') gridData[key] = 'germany';
                });
            } 
        }
    ],
    
    switzerland: [
        { 
            id: 'swi_neutral', 
            name: "Вечный нейтралитет", 
            description: "+3 завода, +2000 снаряжения", 
            effect: (ctx) => { 
                ctx.addFactories(3);
                ctx.resources.equipment += 2000;
            } 
        },
        { 
            id: 'swi_banks', 
            name: "Швейцарские банки", 
            description: "+3000 снаряжения", 
            effect: (ctx) => { ctx.resources.equipment += 3000; } 
        }
    ],
    
    portugal: [
        { 
            id: 'por_colonies', 
            name: "Колониальная империя", 
            description: "+2 завода, +1000 снаряжения", 
            effect: (ctx) => { 
                ctx.addFactories(2);
                ctx.resources.equipment += 1000;
            } 
        },
        { 
            id: 'por_army', 
            name: "Эштаду Нову", 
            description: "+2 пехотные дивизии", 
            effect: (ctx) => { ctx.addUnits('infantry', 2); } 
        }
    ],
    
    lithuania: [
        { 
            id: 'lit_army', 
            name: "Войско Литовское", 
            description: "+2 пехотные дивизии, +500 снаряжения", 
            effect: (ctx) => { 
                ctx.addUnits('infantry', 2);
                ctx.resources.equipment += 500;
            } 
        }
    ],
    
    latvia: [
        { 
            id: 'lat_army', 
            name: "Земессардзе", 
            description: "+2 пехотные дивизии, +500 снаряжения", 
            effect: (ctx) => { 
                ctx.addUnits('infantry', 2);
                ctx.resources.equipment += 500;
            } 
        }
    ],
    
    estonia: [
        { 
            id: 'est_army', 
            name: "Кайтселийт", 
            description: "+2 пехотные дивизии, +500 снаряжения", 
            effect: (ctx) => { 
                ctx.addUnits('infantry', 2);
                ctx.resources.equipment += 500;
            } 
        }
    ],
    
    luxembourg: [
        { 
            id: 'lux_defense', 
            name: "Крошечная но гордая", 
            description: "+1 пехотная дивизия, +2000 снаряжения", 
            effect: (ctx) => { 
                ctx.addUnits('infantry', 1);
                ctx.resources.equipment += 2000;
            } 
        }
    ],
    
    slovakia: [
        { 
            id: 'slo_army', 
            name: "Словацкая армия", 
            description: "+2 пехотные дивизии, +500 снаряжения", 
            effect: (ctx) => { 
                ctx.addUnits('infantry', 2);
                ctx.resources.equipment += 500;
            } 
        },
        { 
            id: 'slo_axis', 
            name: "Верность Оси", 
            description: "Альянс с Германией", 
            effect: (ctx) => { ctx.proposeAlliance('germany'); } 
        }
    ]
};
export const DEMO_MAP = {
    gridData: {
        "10,10": "germany", "11,10": "germany", "12,10": "germany",
        "10,11": "germany", "11,11": "germany", "12,11": "germany",
        "10,12": "poland", "11,12": "poland", "12,12": "poland",
        "5,10": "france", "6,10": "france", "7,10": "france",
        "5,11": "france", "6,11": "france",
        "15,10": "ussr", "16,10": "ussr", "15,11": "ussr", "16,11": "ussr",
        "8,8": "uk", "9,8": "uk",
        "13,13": "italy", "14,13": "italy",
        "9,9": "belgium", "10,9": "netherlands"
    },
    cellStats: {},
    version: "1.0"
};
