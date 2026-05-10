export const countries = {
    "germany": { name: "Германия", color: "#3a3a3a", leader: "Адольф Гитлер", ideology: "Фашизм" },
    "ussr": { name: "СССР", color: "#990000", leader: "Иосиф Сталин", ideology: "Коммунизм" },
    "poland": { name: "Польша", color: "#ffc0cb", leader: "Игнаций Мосцицкий", ideology: "Нейтралитет" },
    "france": { name: "Франция", color: "#3b82f6", leader: "Альбер Лебрен", ideology: "Демократия" },
    "italy": { name: "Италия", color: "#166534", leader: "Бенито Муссолини", ideology: "Фашизм" },
    "portugal": { name: "Португалия", color: "#105d10", leader: "Антониу Салазар", ideology: "Нейтралитет" },
    "netherlands": { name: "Нидерланды", color: "#f97316", leader: "Вильгельмина", ideology: "Демократия" },
    "belgium": { name: "Бельгия", color: "#eab308", leader: "Леопольд III", ideology: "Демократия" },
    "luxembourg": { name: "Люксембург", color: "#67e8f9", leader: "Шарлотта", ideology: "Демократия" },
    "slovakia": { name: "Словакия", color: "#60a5fa", leader: "Йозеф Тисо", ideology: "Фашизм" },
    "lithuania": { name: "Литва", color: "#065f46", leader: "Антанас Сметона", ideology: "Нейтралитет" },
    "uk": { name: "Великобритания", color: "#ef4444", leader: "Невилл Чемберлен", ideology: "Демократия" },
    "switzerland": { name: "Швейцария", color: "#dc2626", leader: "Джузеппе Мотта", ideology: "Демократия" },
    "spain": { name: "Испания", color: "#fbbf24", leader: "Нисето Алькала Самора", ideology: "Демократия" },
    "romania": { name: "Румыния", color: "#eab308", leader: "Кароль II", ideology: "Нейтралитет" },
    "hungary": { name: "Венгрия", color: "#166534", leader: "Миклош Хорти", ideology: "Нейтралитет" },
    "bulgaria": { name: "Болгария", color: "#105d10", leader: "Борис III", ideology: "Нейтралитет" },
    "finland": { name: "Финляндия", color: "#ffffff", leader: "Кюёсти Каллио", ideology: "Нейтралитет" },
    "latvia": { name: "Латвия", color: "#8b0000", leader: "Карлис Улманис", ideology: "Нейтралитет" },
    "estonia": { name: "Эстония", color: "#4682b4", leader: "Константин Пятс", ideology: "Нейтралитет" },
    "yugoslavia": { name: "Югославия", color: "#1e3a8a", leader: "Пётр II Карагеоргиевич", ideology: "Нейтралитет" },
    "greece": { name: "Греция", color: "#60a5fa", leader: "Иоаннис Метаксас", ideology: "Нейтралитет" }
};

export function generateColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = '#';
    for (let i = 0; i < 3; i++) {
        let value = (hash >> (i * 8)) & 0xFF;
        value = Math.floor(value * 0.7 + 50);
        color += ('00' + value.toString(16)).substr(-2);
    }
    return color;
}

export function getCountryInfo(id) {
    if (!countries[id]) {
        countries[id] = { name: id.toUpperCase(), color: generateColor(id), leader: "Лидер", ideology: "Нейтралитет" };
    }
    return countries[id];
}
