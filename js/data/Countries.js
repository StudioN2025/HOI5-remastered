// Countries.js — Данные всех 45 стран с идеологиями

export const COUNTRIES = {
    // === ЕВРОПА ===
    germany: {
        name: "Германия",
        ideology: "Фашизм",
        ideologies: {
            "Фашизм":    { leader: "Адольф Гитлер",     color: "#3a3a3a", flag: "germany" },
            "Демократия": { leader: "Конрад Аденауэр",   color: "#dd0000", flag: "germany_democratic" },
            "Коммунизм":  { leader: "Эрнст Тельман",     color: "#cc0000", flag: "germany_communist" },
            "Нейтралитет": { leader: "Пауль фон Гинденбург", color: "#808080", flag: "germany_neutral" },
        }
    },
    ussr: {
        name: "СССР",
        ideology: "Коммунизм",
        ideologies: {
            "Коммунизм":  { leader: "Иосиф Сталин",     color: "#990000", flag: "ussr" },
            "Демократия": { leader: "Георгий Пятаков",   color: "#3b82f6", flag: "ussr" },
            "Фашизм":     { leader: "Власов",            color: "#8b0000", flag: "ussr" },
            "Нейтралитет": { leader: "Александр Колчак", color: "#6b7280", flag: "ussr" },
        }
    },
    poland: {
        name: "Польша",
        ideology: "Нейтралитет",
        ideologies: {
            "Нейтралитет": { leader: "Игнаций Мосцицкий", color: "#ffc0cb", flag: "poland" },
            "Демократия":  { leader: "Игнаций Мосцицкий", color: "#ffc0cb", flag: "poland" },
            "Фашизм":      { leader: "Едрук Пилсудский",   color: "#dc2626", flag: "poland" },
            "Коммунизм":   { leader: "Болеслав Берут",     color: "#990000", flag: "poland" },
        }
    },
    france: {
        name: "Франция",
        ideology: "Демократия",
        ideologies: {
            "Демократия":  { leader: "Альбер Лебрен",     color: "#3b82f6", flag: "france" },
            "Фашизм":      { leader: "Пьер Лаваль",       color: "#1e3a5f", flag: "france" },
            "Коммунизм":   { leader: "Морис Торез",        color: "#cc0000", flag: "france" },
            "Нейтралитет": { leader: "Альбер Лебрен",     color: "#6b7280", flag: "france" },
        }
    },
    uk: {
        name: "Великобритания",
        ideology: "Демократия",
        ideologies: {
            "Демократия":  { leader: "Невилл Чемберлен",  color: "#ef4444", flag: "uk" },
            "Фашизм":      { leader: "Оswald Mosley",     color: "#1a1a2e", flag: "uk" },
            "Коммунизм":   { leader: "Гарри Поллит",      color: "#990000", flag: "uk" },
            "Нейтралитет": { leader: "Невилл Чемберлен",  color: "#6b7280", flag: "uk" },
        }
    },
    italy: {
        name: "Италия",
        ideology: "Фашизм",
        ideologies: {
            "Фашизм":      { leader: "Бенито Муссолини",  color: "#166534", flag: "italy" },
            "Демократия":  { leader: "Альчиде Де Гаспери", color: "#3b82f6", flag: "italy" },
            "Коммунизм":   { leader: "Пальмиро Тольятти", color: "#cc0000", flag: "italy" },
            "Нейтралитет": { leader: "Виктор Эммануил III", color: "#6b7280", flag: "italy" },
        }
    },
    spain: {
        name: "Испания",
        ideology: "Фашизм",
        ideologies: {
            "Фашизм":      { leader: "Франсиско Франко",  color: "#fbbf24", flag: "spain" },
            "Демократия":  { leader: "Мануэль Асанья",    color: "#3b82f6", flag: "spain" },
            "Коммунизм":   { leader: "Долорес Ибаррури", color: "#990000", flag: "spain" },
            "Нейтралитет": { leader: "Франсиско Франко",  color: "#6b7280", flag: "spain" },
        }
    },
    portugal: {
        name: "Португалия",
        ideology: "Нейтралитет",
        ideologies: {
            "Нейтралитет": { leader: "Антониу Салазар",   color: "#105d10", flag: "portugal" },
            "Фашизм":      { leader: "Антониу Салазар",   color: "#dc2626", flag: "portugal" },
            "Демократия":  { leader: "Мариу Суареш",      color: "#3b82f6", flag: "portugal" },
            "Коммунизм":   { leader: "Алвару Куньял",     color: "#990000", flag: "portugal" },
        }
    },
    netherlands: {
        name: "Нидерланды",
        ideology: "Демократия",
        ideologies: {
            "Демократия":  { leader: "Вильгельмина",      color: "#f97316", flag: "netherlands" },
            "Фашизм":      { leader: "Антон Муссеерт",    color: "#dc2626", flag: "netherlands" },
            "Коммунизм":   { leader: "Давид Вискерс",     color: "#990000", flag: "netherlands" },
            "Нейтралитет": { leader: "Вильгельмина",      color: "#6b7280", flag: "netherlands" },
        }
    },
    belgium: {
        name: "Бельгия",
        ideology: "Демократия",
        ideologies: {
            "Демократия":  { leader: "Леопольд III",      color: "#eab308", flag: "belgium" },
            "Фашизм":      { leader: "Леон Дегрель",      color: "#dc2626", flag: "belgium" },
            "Коммунизм":   { leader: "Жак Сорель",        color: "#990000", flag: "belgium" },
            "Нейтралитет": { leader: "Леопольд III",      color: "#6b7280", flag: "belgium" },
        }
    },
    luxembourg: {
        name: "Люксембург",
        ideology: "Демократия",
        ideologies: {
            "Демократия":  { leader: "Шарлотта",          color: "#67e8f9", flag: "luxembourg" },
            "Фашизм":      { leader: "Леон Дегрель",      color: "#dc2626", flag: "luxembourg" },
            "Коммунизм":   { leader: "Доминик Орбах",     color: "#990000", flag: "luxembourg" },
            "Нейтралитет": { leader: "Шарлотта",          color: "#6b7280", flag: "luxembourg" },
        }
    },
    switzerland: {
        name: "Швейцария",
        ideology: "Демократия",
        ideologies: {
            "Демократия":  { leader: "Джузеппе Мотта",    color: "#dc2626", flag: "switzerland" },
            "Фашизм":      { leader: "Генрих Гиммлер",    color: "#1a1a2e", flag: "switzerland" },
            "Коммунизм":   { leader: "Эрнст Нунциан",     color: "#990000", flag: "switzerland" },
            "Нейтралитет": { leader: "Джузеппе Мотта",    color: "#6b7280", flag: "switzerland" },
        }
    },
    romania: {
        name: "Румыния",
        ideology: "Нейтралитет",
        ideologies: {
            "Нейтралитет": { leader: "Кароль II",         color: "#f59e0b", flag: "romania" },
            "Фашизм":      { leader: "Ион Антонеску",     color: "#dc2626", flag: "romania" },
            "Демократия":  { leader: "Петру Гроза",       color: "#3b82f6", flag: "romania" },
            "Коммунизм":   { leader: "Георге Георгиу-Деж", color: "#990000", flag: "romania" },
        }
    },
    hungary: {
        name: "Венгрия",
        ideology: "Нейтралитет",
        ideologies: {
            "Нейтралитет": { leader: "Миклош Хорти",     color: "#16a34a", flag: "hungary" },
            "Фашизм":      { leader: "Ференц Салаши",    color: "#dc2626", flag: "hungary" },
            "Демократия":  { leader: "Миклош Хорти",     color: "#3b82f6", flag: "hungary" },
            "Коммунизм":   { leader: "Матьяш Ракоши",    color: "#990000", flag: "hungary" },
        }
    },
    bulgaria: {
        name: "Болгария",
        ideology: "Нейтралитет",
        ideologies: {
            "Нейтралитет": { leader: "Борис III",         color: "#059669", flag: "bulgaria" },
            "Фашизм":      { leader: "Борис III",         color: "#dc2626", flag: "bulgaria" },
            "Демократия":  { leader: "Кимон Георгиев",   color: "#3b82f6", flag: "bulgaria" },
            "Коммунизм":   { leader: "Георгий Димитров",  color: "#990000", flag: "bulgaria" },
        }
    },
    finland: {
        name: "Финляндия",
        ideology: "Нейтралитет",
        ideologies: {
            "Нейтралитет": { leader: "Кюёсти Каллио",    color: "#e0e7ff", flag: "finland" },
            "Демократия":  { leader: "Ристо Рюти",       color: "#3b82f6", flag: "finland" },
            "Фашизм":      { leader: "Ристо Рюти",       color: "#dc2626", flag: "finland" },
            "Коммунизм":   { leader: "Отто Куусинен",    color: "#990000", flag: "finland" },
        }
    },
    norway: {
        name: "Норвегия",
        ideology: "Демократия",
        ideologies: {
            "Демократия":  { leader: "Хаакон VII",       color: "#dc2626", flag: "norway" },
            "Фашизм":      { leader: "Видкун Квислинг",  color: "#1a1a2e", flag: "norway" },
            "Коммунизм":   { leader: "Педер Фури",       color: "#990000", flag: "norway" },
            "Нейтралитет": { leader: "Хаакон VII",       color: "#6b7280", flag: "norway" },
        }
    },
    sweden: {
        name: "Швеция",
        ideology: "Демократия",
        ideologies: {
            "Демократия":  { leader: "Густав V",         color: "#2563eb", flag: "sweden" },
            "Фашизм":      { leader: "Пер Эдвин Скоглунд", color: "#dc2626", flag: "sweden" },
            "Коммунизм":   { leader: "Зет Хоглунд",      color: "#990000", flag: "sweden" },
            "Нейтралитет": { leader: "Густав V",         color: "#6b7280", flag: "sweden" },
        }
    },
    denmark: {
        name: "Дания",
        ideology: "Демократия",
        ideologies: {
            "Демократия":  { leader: "Кристиан X",       color: "#c026d3", flag: "denmark" },
            "Фашизм":      { leader: "Фриц Клаузен",     color: "#dc2626", flag: "denmark" },
            "Коммунизм":   { leader: "Аксель Ларсен",    color: "#990000", flag: "denmark" },
            "Нейтралитет": { leader: "Кристиан X",       color: "#6b7280", flag: "denmark" },
        }
    },
    czechoslovakia: {
        name: "Чехословакия",
        ideology: "Демократия",
        ideologies: {
            "Демократия":  { leader: "Эдвард Бенеш",    color: "#3b82f6", flag: "czechoslovakia" },
            "Фашизм":      { leader: "Конрад Генляйн",  color: "#dc2626", flag: "czechoslovakia" },
            "Коммунизм":   { leader: "Клемент Готвальд", color: "#990000", flag: "czechoslovakia" },
            "Нейтралитет": { leader: "Эдвард Бенеш",    color: "#6b7280", flag: "czechoslovakia" },
        }
    },
    austria: {
        name: "Австрия",
        ideology: "Нейтралитет",
        ideologies: {
            "Нейтралитет": { leader: "Курт Шушниг",     color: "#ef4444", flag: "austria" },
            "Фашизм":      { leader: "Артур Зейсс-Инкварт", color: "#dc2626", flag: "austria" },
            "Демократия":  { leader: "Карл Реннер",      color: "#3b82f6", flag: "austria" },
            "Коммунизм":   { leader: "Эрнст Фишер",     color: "#990000", flag: "austria" },
        }
    },
    yugoslavia: {
        name: "Югославия",
        ideology: "Нейтралитет",
        ideologies: {
            "Нейтралитет": { leader: "Пётр II",          color: "#1e40af", flag: "yugoslavia" },
            "Фашизм":      { leader: "Милан Недич",      color: "#dc2626", flag: "yugoslavia" },
            "Демократия":  { leader: "Иосип Броз Тито",  color: "#3b82f6", flag: "yugoslavia" },
            "Коммунизм":   { leader: "Иосип Броз Тито",  color: "#990000", flag: "yugoslavia" },
        }
    },
    greece: {
        name: "Греция",
        ideology: "Нейтралитет",
        ideologies: {
            "Нейтралитет": { leader: "Иоаннис Метаксас", color: "#60a5fa", flag: "greece" },
            "Демократия":  { leader: "Иоаннис Метаксас", color: "#3b82f6", flag: "greece" },
            "Фашизм":      { leader: "Иоаннис Метаксас", color: "#dc2626", flag: "greece" },
            "Коммунизм":   { leader: "Маркос Авгиерис",  color: "#990000", flag: "greece" },
        }
    },
    albania: {
        name: "Албания",
        ideology: "Нейтралитет",
        ideologies: {
            "Нейтралитет": { leader: "Зогу I",           color: "#dc2626", flag: "albania" },
            "Демократия":  { leader: "Фан Ноли",         color: "#3b82f6", flag: "albania" },
            "Фашизм":      { leader: "Мехди Фрашери",    color: "#1a1a2e", flag: "albania" },
            "Коммунизм":   { leader: "Энвер Ходжа",      color: "#990000", flag: "albania" },
        }
    },
    lithuania: {
        name: "Литва",
        ideology: "Нейтралитет",
        ideologies: {
            "Нейтралитет": { leader: "Антанас Сметона",  color: "#065f46", flag: "lithuania" },
            "Демократия":  { leader: "Антанас Сметона",  color: "#3b82f6", flag: "lithuania" },
            "Фашизм":      { leader: "Антанас Сметона",  color: "#dc2626", flag: "lithuania" },
            "Коммунизм":   { leader: "Антанас Сnieckис",  color: "#990000", flag: "lithuania" },
        }
    },
    latvia: {
        name: "Латвия",
        ideology: "Нейтралитет",
        ideologies: {
            "Нейтралитет": { leader: "Карлис Улманис",   color: "#7f1d1d", flag: "latvia" },
            "Демократия":  { leader: "Карлис Улманис",   color: "#3b82f6", flag: "latvia" },
            "Фашизм":      { leader: "Карлис Улманис",   color: "#dc2626", flag: "latvia" },
            "Коммунизм":   { leader: "Август Кирхенштейн", color: "#990000", flag: "latvia" },
        }
    },
    estonia: {
        name: "Эстония",
        ideology: "Нейтралитет",
        ideologies: {
            "Нейтралитет": { leader: "Константин Пятс",  color: "#1d4ed8", flag: "estonia" },
            "Демократия":  { leader: "Константин Пятс",  color: "#3b82f6", flag: "estonia" },
            "Фашизм":      { leader: "Константин Пятс",  color: "#dc2626", flag: "estonia" },
            "Коммунизм":   { leader: "Йоханнес Варес",   color: "#990000", flag: "estonia" },
        }
    },
    slovakia: {
        name: "Словакия",
        ideology: "Фашизм",
        ideologies: {
            "Фашизм":      { leader: "Йозеф Тисо",      color: "#2563eb", flag: "slovakia" },
            "Демократия":  { leader: "Йозеф Тисо",      color: "#3b82f6", flag: "slovakia" },
            "Коммунизм":   { leader: "Владимир Клементис", color: "#990000", flag: "slovakia" },
            "Нейтралитет": { leader: "Йозеф Тисо",      color: "#6b7280", flag: "slovakia" },
        }
    },
    ireland: {
        name: "Ирландия",
        ideology: "Демократия",
        ideologies: {
            "Демократия":  { leader: "Дуглас Хейд",      color: "#16a34a", flag: "ireland" },
            "Фашизм":      { leader: "О'Даффи",          color: "#dc2626", flag: "ireland" },
            "Коммунизм":   { leader: "Джеймс Коннолли",  color: "#990000", flag: "ireland" },
            "Нейтралитет": { leader: "Дуглас Хейд",      color: "#6b7280", flag: "ireland" },
        }
    },
    iceland: {
        name: "Исландия",
        ideology: "Демократия",
        ideologies: {
            "Демократия":  { leader: "Эрлюгингур Торссон", color: "#3b82f6", flag: "uk" },
            "Нейтралитет": { leader: "Эрлюгингур Торссон", color: "#6b7280", flag: "uk" },
        }
    },

    // === БЛИЖНИЙ ВОСТОК ===
    turkey: {
        name: "Турция",
        ideology: "Нейтралитет",
        ideologies: {
            "Нейтралитет": { leader: "Мустафа Кемаль Ататюрк", color: "#dc2626", flag: "turkey" },
            "Демократия":  { leader: "Исмет Инёню",     color: "#3b82f6", flag: "turkey" },
            "Фашизм":      { leader: "Махмуд Эскиджи",  color: "#1a1a2e", flag: "turkey" },
            "Коммунизм":   { leader: "Шевкет Сюрсель",  color: "#990000", flag: "turkey" },
        }
    },
    iraq: {
        name: "Ирак",
        ideology: "Нейтралитет",
        ideologies: {
            "Нейтралитет": { leader: "Галиб Аль-Гаюни", color: "#166534", flag: "iraq" },
            "Фашизм":      { leader: "Рашид Али",       color: "#dc2626", flag: "iraq" },
            "Демократия":  { leader: "Нури аль-Саид",   color: "#3b82f6", flag: "iraq" },
            "Коммунизм":   { leader: "Карим Касем",      color: "#990000", flag: "iraq" },
        }
    },
    iran: {
        name: "Иран",
        ideology: "Нейтралитет",
        ideologies: {
            "Нейтралитет": { leader: "Реза Пехлеви",     color: "#059669", flag: "iran" },
            "Демократия":  { leader: "Мохаммед Мосаддык", color: "#3b82f6", flag: "iran" },
            "Фашизм":      { leader: "Реза Пехлеви",     color: "#dc2626", flag: "iran" },
            "Коммунизм":   { leader: "Нуреддин Киянури", color: "#990000", flag: "iran" },
        }
    },
    saudi_arabia: {
        name: "Саудовская Аравия",
        ideology: "Нейтралитет",
        ideologies: {
            "Нейтралитет": { leader: "Абдул-Азиз Аль-Сауд", color: "#15803d", flag: "saudi_arabia" },
            "Демократия":  { leader: "Абдул-Азиз Аль-Сауд", color: "#3b82f6", flag: "saudi_arabia" },
            "Фашизм":      { leader: "Абдул-Азиз Аль-Сауд", color: "#dc2626", flag: "saudi_arabia" },
            "Коммунизм":   { leader: "Абдул-Азиз Аль-Сауд", color: "#990000", flag: "saudi_arabia" },
        }
    },
};

// Хелпер для получения данных по идеологии
export function getIdeologyData(countryId, ideology) {
    const c = COUNTRIES[countryId];
    if (!c) return { leader: "Неизвестно", color: "#666666", flag: countryId };
    if (c.ideologies && c.ideologies[ideology]) {
        return c.ideologies[ideology];
    }
    return { leader: c.leader || "Неизвестно", color: c.color || "#666666", flag: countryId };
}

// Для совместимости
export function getDefaultCountryInfo(id) {
    return COUNTRIES[id] || { name: id.toUpperCase(), color: "#666666", leader: "Неизвестно", ideology: "Нейтралитет" };
}
