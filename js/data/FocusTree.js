// FocusTree.js — Деревья фокусов всех стран

// ═══════════════════════════ ГЕРМАНИЯ ═══════════════════════════
const GERMANY = {
    versailles:         { id: 'versailles',         name: 'Отрицание Версаля',           desc: 'Начало пути',                icon: '📜', country: 'germany', branch: 'root', tier: 0, prereqs: [], effect: { equipment: 500 } },
    rhineland:          { id: 'rhineland',          name: 'Рейнланд',                    desc: 'Порты, укрепления',          icon: '🏰', country: 'germany', branch: 'left', tier: 1, prereqs: ['versailles'], effect: { ports: 1, equipment: 500 } },
    rearm:              { id: 'rearm',              name: 'Перевооружение',              desc: 'Заводы, оружие',             icon: '🔫', country: 'germany', branch: 'right', tier: 1, prereqs: ['versailles'], effect: { factories: 3 } },
    anschluss:          { id: 'anschluss',          name: 'Аншлюс Австрии',              desc: 'Аннексия',                   icon: '🤝', country: 'germany', branch: 'left', tier: 2, prereqs: ['rhineland'], effect: { annex: ['austria'] } },
    mediterranean:     { id: 'mediterranean',      name: 'Средиземноморье',             desc: 'Альянс Италии',             icon: '⚓', country: 'germany', branch: 'left', tier: 2, prereqs: ['rhineland'], effect: { allies: ['italy'] } },
    four_year_plan:     { id: 'four_year_plan',     name: 'Четырёхлетний план',          desc: 'Промышленность',            icon: '🏭', country: 'germany', branch: 'right', tier: 2, prereqs: ['rearm'], effect: { factories: 5, equipment: 1000 } },
    panzerwaffe:        { id: 'panzerwaffe',        name: 'Панцерваффе',                desc: 'Танковая программа',         icon: '🚜', country: 'germany', branch: 'right', tier: 2, prereqs: ['rearm'], effect: { tanks: 3 } },
    sudeten:           { id: 'sudeten',            name: 'Судетский кризис',            desc: 'Аннексия Чехии',             icon: '⚔️', country: 'germany', branch: 'left', tier: 3, prereqs: ['anschluss'], effect: { annex: ['czechoslovakia'], equipment: 2000 } },
    autarky:           { id: 'autarky',            name: 'Автаркия',                    desc: 'Экономика',                  icon: '⚙️', country: 'germany', branch: 'right', tier: 3, prereqs: ['four_year_plan'], effect: { factories: 3, equipment: 1500 } },
    tiger_tank:        { id: 'tiger_tank',         name: 'Тигр',                        desc: 'Тяжёлые танки',              icon: '💀', country: 'germany', branch: 'right', tier: 3, prereqs: ['panzerwaffe'], effect: { tanks: 3, equipment: 1000 } },
    molotov:           { id: 'molotov',            name: 'Пакт Молотова',               desc: 'Союз с СССР',                icon: '🤝', country: 'germany', branch: 'left', tier: 4, prereqs: ['sudeten'], effect: { allies: ['ussr'] } },
    panther:           { id: 'panther',            name: 'Пантера',                    desc: 'Средние танки',              icon: '🛡️', country: 'germany', branch: 'right', tier: 4, prereqs: ['tiger_tank'], effect: { tanks: 4, equipment: 1500 } },
    poland_war:        { id: 'poland_war',         name: 'Польша',                     desc: 'Начало войны',               icon: '⚔️', country: 'germany', branch: 'center', tier: 5, prereqs: ['molotov'], effect: { war: 'poland' } },
    france_war:        { id: 'france_war',         name: 'Франция',                    desc: 'Блицкриг',                   icon: '🗺️', country: 'germany', branch: 'center', tier: 6, prereqs: ['poland_war'], effect: { war: 'france' } },
    barb:              { id: 'barb',               name: 'Барбаросса',                 desc: 'Война с СССР',               icon: '💀', country: 'germany', branch: 'center', tier: 7, prereqs: ['france_war'], effect: { war: 'ussr' } },
    total_war:         { id: 'total_war',          name: 'Тотальная война',             desc: 'Максимум',                   icon: '🔥', country: 'germany', branch: 'center', tier: 8, prereqs: ['barb'], effect: { factories: 5, infantry: 5, tanks: 3 } },
    fall:              { id: 'fall',               name: 'Падение Рейха',              desc: 'Конец',                      icon: '🏳️', country: 'germany', branch: 'center', tier: 9, prereqs: ['total_war'], effect: {} },
};

// ═══════════════════════════ ФРАНЦИЯ ═══════════════════════════
const FRANCE = {
    maginot:            { id: 'maginot',            name: 'Линия Мажино',               desc: 'Укрепления',                 icon: '🏰', country: 'france', branch: 'root', tier: 0, prereqs: [], effect: { factories: 3 } },
    maginot_up:         { id: 'maginot_up',         name: 'Укрепление Мажино',          desc: '+30% защиты',                icon: '🛡️', country: 'france', branch: 'left', tier: 1, prereqs: ['maginot'], effect: { equipment: 1000 } },
    econ_crisis:        { id: 'econ_crisis',        name: 'Экономический кризис',       desc: 'Проблемы',                   icon: '📉', country: 'france', branch: 'right', tier: 1, prereqs: ['maginot'], effect: { factories: 2 } },
    belgian_plan:       { id: 'belgian_plan',       name: 'Бельгийский план',           desc: 'Оборона',                    icon: '🗺️', country: 'france', branch: 'left', tier: 2, prereqs: ['maginot_up'], effect: { infantry: 3 } },
    front_populaire:    { id: 'front_populaire',    name: 'Народный фронт',             desc: 'Реформы',                    icon: '✊', country: 'france', branch: 'right', tier: 2, prereqs: ['econ_crisis'], effect: { equipment: 500 } },
    waiting:            { id: 'waiting',            name: 'Ожидание',                   desc: 'Статичная оборона',          icon: '⏳', country: 'france', branch: 'left', tier: 3, prereqs: ['belgian_plan'], effect: { factories: 2 } },
    rearmament:         { id: 'rearmament',         name: 'Перевооружение',             desc: 'Армия',                      icon: '🔫', country: 'france', branch: 'right', tier: 3, prereqs: ['front_populaire'], effect: { infantry: 3, tanks: 2 } },
    belgium_fall:       { id: 'belgium_fall',       name: 'Падение Бельгии',            desc: 'Немцы через Арденны',        icon: '💀', country: 'france', branch: 'left', tier: 4, prereqs: ['waiting'], effect: { equipment: -500 } },
    free_france:        { id: 'free_france',        name: 'Свободная Франция',          desc: 'Де Голль',                   icon: '🏴', country: 'france', branch: 'right', tier: 4, prereqs: ['rearmament'], effect: { infantry: 5 } },
    resistance:         { id: 'resistance',         name: 'Сопротивление',              desc: 'Партизаны',                  icon: '✊', country: 'france', branch: 'right', tier: 5, prereqs: ['free_france'], effect: { equipment: 1000 } },
    normandy:           { id: 'normandy',           name: 'Нормандия',                  desc: 'Десант',                     icon: '⚓', country: 'france', branch: 'center', tier: 6, prereqs: ['resistance'], effect: { infantry: 5, tanks: 3 } },
    paris:              { id: 'paris',              name: 'Освобождение Парижа',         desc: 'Победа',                     icon: '🏆', country: 'france', branch: 'center', tier: 7, prereqs: ['normandy'], effect: { equipment: 3000 } },
    victory:            { id: 'victory',            name: 'Победа',                     desc: 'Конец',                      icon: '🏳️', country: 'france', branch: 'center', tier: 8, prereqs: ['paris'], effect: {} },
};

// ═══════════════════════════ СССР ═══════════════════════════
const USSR = {
    five_year:          { id: 'five_year',          name: 'Пятилетний план',             desc: 'Индустрия',                  icon: '🏭', country: 'ussr', branch: 'root', tier: 0, prereqs: [], effect: { factories: 5 } },
    second_five:        { id: 'second_five',        name: 'Вторая пятилетка',            desc: '+3 завода',                   icon: '⚙️', country: 'ussr', branch: 'left', tier: 1, prereqs: ['five_year'], effect: { factories: 3, equipment: 2000 } },
    collectivization:   { id: 'collectivization',   name: 'Коллективизация',             desc: 'Продовольствие',              icon: '🌾', country: 'ussr', branch: 'right', tier: 1, prereqs: ['five_year'], effect: { manpower: 5000 } },
    ural_complex:       { id: 'ural_complex',       name: 'Уральский комплекс',          desc: 'Эвакуация заводов',           icon: '🏭', country: 'ussr', branch: 'left', tier: 2, prereqs: ['second_five'], effect: { factories: 4 } },
    tank_harkov:        { id: 'tank_harkov',       name: 'Танкостроение',               desc: 'Т-34',                        icon: '🚜', country: 'ussr', branch: 'left', tier: 2, prereqs: ['second_five'], effect: { tanks: 4 } },
    kolkhoz:           { id: 'kolkhoz',           name: 'Совхозы',                     desc: 'Продовольствие',              icon: '🌾', country: 'ussr', branch: 'right', tier: 2, prereqs: ['collectivization'], effect: { manpower: 3000 } },
    red_army:          { id: 'red_army',          name: 'Красная Армия',               desc: '6 дивизий',                   icon: '🛡️', country: 'ussr', branch: 'center', tier: 0, prereqs: [], effect: { infantry: 6 } },
    baltic:            { id: 'baltic',            name: 'Прибалтика',                  desc: 'Аннексия',                    icon: '🤝', country: 'ussr', branch: 'left', tier: 3, prereqs: ['five_year'], effect: { annex: ['lithuania', 'latvia', 'estonia'] } },
    fin_war:           { id: 'fin_war',           name: 'Зимняя война',                desc: 'Финляндия',                   icon: '❄️', country: 'ussr', branch: 'center', tier: 1, prereqs: ['red_army'], effect: { war: 'finland' } },
    great_pat:         { id: 'great_pat',         name: 'Великая Отечественная',       desc: '+6 дивизий',                  icon: '💪', country: 'ussr', branch: 'center', tier: 2, prereqs: ['fin_war'], effect: { infantry: 6, equipment: 2000 } },
    stalin_line:       { id: 'stalin_line',       name: 'Линия Сталина',               desc: 'Укрепления',                  icon: '🏰', country: 'ussr', branch: 'left', tier: 3, prereqs: ['ural_complex'], effect: { equipment: 2000 } },
    t34:               { id: 't34',               name: 'Т-34',                        desc: 'Легендарный танк',            icon: '🚜', country: 'ussr', branch: 'left', tier: 3, prereqs: ['tank_harkov'], effect: { tanks: 5 } },
    battle_moscow:     { id: 'battle_moscow',     name: 'Битва за Москву',             desc: 'Оборона',                     icon: '⚔️', country: 'ussr', branch: 'center', tier: 3, prereqs: ['great_pat'], effect: { infantry: 4, equipment: 1000 } },
    stalingrad:        { id: 'stalingrad',        name: 'Сталинград',                  desc: 'Перелом',                     icon: '💀', country: 'ussr', branch: 'center', tier: 4, prereqs: ['battle_moscow'], effect: { infantry: 5, tanks: 3, equipment: 2000 } },
    kursk:             { id: 'kursk',             name: 'Курская дуга',                desc: 'Танковая битва',              icon: '🚜', country: 'ussr', branch: 'center', tier: 5, prereqs: ['stalingrad'], effect: { tanks: 5 } },
    bagration:         { id: 'bagration',         name: 'Багратион',                   desc: 'Наступление',                 icon: '⚔️', country: 'ussr', branch: 'center', tier: 6, prereqs: ['kursk'], effect: { infantry: 8, tanks: 5 } },
    berlin:            { id: 'berlin',            name: 'Берлин',                      desc: 'Конец войны',                 icon: '🏆', country: 'ussr', branch: 'center', tier: 7, prereqs: ['bagration'], effect: {} },
};

// ═══════════════════════════ ВЕЛИКОБРИТАНИЯ ═══════════════════════════
const UK = {
    royal_navy:         { id: 'royal_navy',         name: 'Королевский флот',            desc: 'Морская мощь',               icon: '⚓', country: 'uk', branch: 'root', tier: 0, prereqs: [], effect: { ports: 3, equipment: 1000 } },
    navy_modern:        { id: 'navy_modern',        name: 'Модернизация флота',          desc: 'Авианосцы',                  icon: '🚢', country: 'uk', branch: 'left', tier: 1, prereqs: ['royal_navy'], effect: { equipment: 1500 } },
    atlantic:           { id: 'atlantic',           name: 'Атлантическая блокада',      desc: 'Блокада Германии',           icon: '🗺️', country: 'uk', branch: 'right', tier: 1, prereqs: ['royal_navy'], effect: { equipment: 1000 } },
    carriers:           { id: 'carriers',          name: 'Авианосцы',                  desc: 'Морская авиация',            icon: '✈️', country: 'uk', branch: 'left', tier: 2, prereqs: ['navy_modern'], effect: { equipment: 2000 } },
    u_boats:            { id: 'u_boats',           name: 'Охота на подлодки',           desc: 'Атлантика',                  icon: '🔱', country: 'uk', branch: 'right', tier: 2, prereqs: ['atlantic'], effect: { ports: 2 } },
    war_cabinet:        { id: 'war_cabinet',       name: 'Военный кабинет',             desc: 'Мобилизация',                icon: '📋', country: 'uk', branch: 'center', tier: 0, prereqs: [], effect: { factories: 3, infantry: 3 } },
    battle_britain:     { id: 'battle_britain',    name: 'Битва за Британию',           desc: 'ВВС',                        icon: '✈️', country: 'uk', branch: 'center', tier: 1, prereqs: ['war_cabinet'], effect: { equipment: 1500 } },
    empire:             { id: 'empire',            name: 'Империя',                    desc: 'Колонии',                    icon: '👑', country: 'uk', branch: 'center', tier: 2, prereqs: ['battle_britain'], effect: { infantry: 5, manpower: 5000 } },
    north_africa:       { id: 'north_africa',      name: 'Северная Африка',            desc: 'Кампания',                   icon: '🗺️', country: 'uk', branch: 'center', tier: 3, prereqs: ['empire'], effect: { infantry: 3, equipment: 1000 } },
    d_day:              { id: 'd_day',             name: 'День Д',                     desc: 'Нормандия',                  icon: '⚓', country: 'uk', branch: 'center', tier: 4, prereqs: ['north_africa'], effect: { infantry: 5, tanks: 3 } },
    victory_eu:         { id: 'victory_eu',        name: 'Победа в Европе',            desc: 'Конец',                      icon: '🏆', country: 'uk', branch: 'center', tier: 5, prereqs: ['d_day'], effect: {} },
};

// ═══════════════════════════ ЭКСПОРТ ═══════════════════════════
export const FOCUS_TREE = {
    ...GERMANY,
    ...FRANCE,
    ...USSR,
    ...UK,
};
