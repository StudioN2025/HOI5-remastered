// Countries.js — Данные всех 45 стран с идеологиями

export const COUNTRIES = {
    // === ЕВРОПА ===
    germany: {
        name: "Third Reich",
        nameEn: "Third Reich",
        ideology: "Фашизм",
        ideologies: {
            "Фашизм":     { name: "Third Reich",           nameEn: "Third Reich",           leader: "Адольф Гитлер",           leaderEn: "Adolf Hitler",            color: "#3a3a3a", flag: "germany_fascist" },
            "Демократия":  { name: "Germany",              nameEn: "Germany",              leader: "Конрад Аденауэр",         leaderEn: "Konrad Adenauer",          color: "#dd0000", flag: "germany_democratic" },
            "Коммунизм":   { name: "DKP",                  nameEn: "DKP",                  leader: "Эрнст Тельман",           leaderEn: "Ernst Thälmann",           color: "#cc0000", flag: "germany_communist" },
            "Нейтралитет": { name: "Germany Empire",       nameEn: "Germany Empire",       leader: "Пауль фон Гинденбург",   leaderEn: "Paul von Hindenburg",      color: "#808080", flag: "germany_neutral" },
        }
    },
    ussr: {
        name: "СССР",
        nameEn: "Soviet Union",
        ideology: "Коммунизм",
        ideologies: {
            "Коммунизм":  { name: "СССР",                   nameEn: "Soviet Union",          leader: "Иосиф Сталин",            leaderEn: "Joseph Stalin",           color: "#990000", flag: "ussr_communist" },
            "Демократия": { name: "СССР",                   nameEn: "Soviet Union",          leader: "Георгий Пятаков",         leaderEn: "Georgy Pyatakov",         color: "#3b82f6", flag: "ussr_communist" },
            "Фашизм":     { name: "СССР",                   nameEn: "Soviet Union",          leader: "Власов",                  leaderEn: "Vlasov",                  color: "#8b0000", flag: "ussr_communist" },
            "Нейтралитет": { name: "СССР",                   nameEn: "Soviet Union",          leader: "Александр Колчак",        leaderEn: "Alexander Kolchak",        color: "#6b7280", flag: "ussr_communist" },
        }
    },
    poland: {
        name: "Польша",
        nameEn: "Poland",
        ideology: "Нейтралитет",
        ideologies: {
            "Нейтралитет": { name: "Польша",                nameEn: "Poland",                leader: "Игнаций Мосцицкий",       leaderEn: "Ignacy Mościcki",         color: "#ffc0cb", flag: "poland_neutral" },
            "Демократия":  { name: "Польша",                nameEn: "Poland",                leader: "Игнаций Мосцицкий",       leaderEn: "Ignacy Mościcki",         color: "#ffc0cb", flag: "poland_neutral" },
            "Фашизм":      { name: "Польша",                nameEn: "Poland",                leader: "Едрук Пилсудский",        leaderEn: "Józef Piłsudski",         color: "#dc2626", flag: "poland_neutral" },
            "Коммунизм":   { name: "Польша",                nameEn: "Poland",                leader: "Болеслав Берут",          leaderEn: "Bolesław Bierut",         color: "#990000", flag: "poland_neutral" },
        }
    },
    france: {
        name: "France",
        nameEn: "France",
        ideology: "Демократия",
        ideologies: {
            "Демократия":  { name: "France",               nameEn: "France",               leader: "Альбер Лебрен",           leaderEn: "Albert Lebrun",           color: "#3b82f6", flag: "france_democratic" },
            "Фашизм":      { name: "Vichy France",         nameEn: "Vichy France",         leader: "Пьер Лаваль",             leaderEn: "Pierre Laval",           color: "#1e3a5f", flag: "france_fascist" },
            "Коммунизм":   { name: "Socialist France",     nameEn: "Socialist France",     leader: "Морис Торез",             leaderEn: "Maurice Thorez",         color: "#cc0000", flag: "france_communist" },
            "Нейтралитет": { name: "France",               nameEn: "France",               leader: "Альбер Лебрен",           leaderEn: "Albert Lebrun",           color: "#6b7280", flag: "france_democratic" },
        }
    },
    uk: {
        name: "Великобритания",
        nameEn: "United Kingdom",
        ideology: "Демократия",
        ideologies: {
            "Демократия":  { name: "Великобритания",       nameEn: "United Kingdom",       leader: "Невилл Чемберлен",        leaderEn: "Neville Chamberlain",     color: "#ef4444", flag: "uk_democratic" },
            "Фашизм":      { name: "Великобритания",       nameEn: "United Kingdom",       leader: "Оswald Mosley",           leaderEn: "Oswald Mosley",           color: "#1a1a2e", flag: "uk_democratic" },
            "Коммунизм":   { name: "Великобритания",       nameEn: "United Kingdom",       leader: "Гарри Поллит",            leaderEn: "Harry Pollitt",           color: "#990000", flag: "uk_democratic" },
            "Нейтралитет": { name: "Великобритания",       nameEn: "United Kingdom",       leader: "Невилл Чемберлен",        leaderEn: "Neville Chamberlain",     color: "#6b7280", flag: "uk_democratic" },
        }
    },
    italy: {
        name: "Италия",
        nameEn: "Italy",
        ideology: "Фашизм",
        ideologies: {
            "Фашизм":      { name: "Италия",               nameEn: "Italy",                leader: "Бенито Муссолини",        leaderEn: "Benito Mussolini",        color: "#166534", flag: "italy_fascist" },
            "Демократия":  { name: "Италия",               nameEn: "Italy",                leader: "Альчиде Де Гаспери",      leaderEn: "Alcide De Gasperi",       color: "#3b82f6", flag: "italy_fascist" },
            "Коммунизм":   { name: "Италия",               nameEn: "Italy",                leader: "Пальмиро Тольятти",       leaderEn: "Palmiro Togliatti",       color: "#cc0000", flag: "italy_fascist" },
            "Нейтралитет": { name: "Италия",               nameEn: "Italy",                leader: "Виктор Эммануил III",     leaderEn: "Victor Emmanuel III",     color: "#6b7280", flag: "italy_fascist" },
        }
    },
    spain: {
        name: "Испания",
        nameEn: "Spain",
        ideology: "Фашизм",
        ideologies: {
            "Фашизм":      { name: "Испания",              nameEn: "Spain",                leader: "Франсиско Франко",        leaderEn: "Francisco Franco",        color: "#fbbf24", flag: "spain_fascist" },
            "Демократия":  { name: "Испания",              nameEn: "Spain",                leader: "Мануэль Асанья",          leaderEn: "Manuel Azaña",            color: "#3b82f6", flag: "spain_fascist" },
            "Коммунизм":   { name: "Испания",              nameEn: "Spain",                leader: "Долорес Ибаррури",        leaderEn: "Dolores Ibárruri",        color: "#990000", flag: "spain_fascist" },
            "Нейтралитет": { name: "Испания",              nameEn: "Spain",                leader: "Франсиско Франко",        leaderEn: "Francisco Franco",        color: "#6b7280", flag: "spain_fascist" },
        }
    },
    portugal: {
        name: "Португалия",
        nameEn: "Portugal",
        ideology: "Нейтралитет",
        ideologies: {
            "Нейтралитет": { name: "Португалия",           nameEn: "Portugal",             leader: "Антониу Салазар",         leaderEn: "António Salazar",         color: "#105d10", flag: "portugal_neutral" },
            "Фашизм":      { name: "Португалия",           nameEn: "Portugal",             leader: "Антониу Салазар",         leaderEn: "António Salazar",         color: "#dc2626", flag: "portugal_neutral" },
            "Демократия":  { name: "Португалия",           nameEn: "Portugal",             leader: "Мариу Суареш",            leaderEn: "Mário Soares",            color: "#3b82f6", flag: "portugal_neutral" },
            "Коммунизм":   { name: "Португалия",           nameEn: "Portugal",             leader: "Алвару Куньял",           leaderEn: "Álvaro Cunhal",           color: "#990000", flag: "portugal_neutral" },
        }
    },
    netherlands: {
        name: "Нидерланды",
        nameEn: "Netherlands",
        ideology: "Демократия",
        ideologies: {
            "Демократия":  { name: "Нидерланды",           nameEn: "Netherlands",          leader: "Вильгельмина",            leaderEn: "Wilhelmina",              color: "#f97316", flag: "netherlands_democratic" },
            "Фашизм":      { name: "Нидерланды",           nameEn: "Netherlands",          leader: "Антон Муссеерт",          leaderEn: "Anton Mussert",           color: "#dc2626", flag: "netherlands_democratic" },
            "Коммунизм":   { name: "Нидерланды",           nameEn: "Netherlands",          leader: "Давид Вискерс",           leaderEn: "David Wijnkoop",          color: "#990000", flag: "netherlands_democratic" },
            "Нейтралитет": { name: "Нидерланды",           nameEn: "Netherlands",          leader: "Вильгельмина",            leaderEn: "Wilhelmina",              color: "#6b7280", flag: "netherlands_democratic" },
        }
    },
    belgium: {
        name: "Бельгия",
        nameEn: "Belgium",
        ideology: "Демократия",
        ideologies: {
            "Демократия":  { name: "Бельгия",              nameEn: "Belgium",              leader: "Леопольд III",            leaderEn: "Leopold III",             color: "#eab308", flag: "belgium_democratic" },
            "Фашизм":      { name: "Бельгия",              nameEn: "Belgium",              leader: "Леон Дегрель",            leaderEn: "Léon Degrelle",           color: "#dc2626", flag: "belgium_democratic" },
            "Коммунизм":   { name: "Бельгия",              nameEn: "Belgium",              leader: "Жак Сорель",              leaderEn: "Jacques Sorel",           color: "#990000", flag: "belgium_democratic" },
            "Нейтралитет": { name: "Бельгия",              nameEn: "Belgium",              leader: "Леопольд III",            leaderEn: "Leopold III",             color: "#6b7280", flag: "belgium_democratic" },
        }
    },
    luxembourg: {
        name: "Люксембург",
        nameEn: "Luxembourg",
        ideology: "Демократия",
        ideologies: {
            "Демократия":  { name: "Люксембург",           nameEn: "Luxembourg",           leader: "Шарлотта",                leaderEn: "Charlotte",               color: "#67e8f9", flag: "luxembourg_democratic" },
            "Фашизм":      { name: "Люксембург",           nameEn: "Luxembourg",           leader: "Леон Дегрель",            leaderEn: "Léon Degrelle",           color: "#dc2626", flag: "luxembourg_democratic" },
            "Коммунизм":   { name: "Люксембург",           nameEn: "Luxembourg",           leader: "Доминик Орбах",           leaderEn: "Dominique Urbach",        color: "#990000", flag: "luxembourg_democratic" },
            "Нейтралитет": { name: "Люксембург",           nameEn: "Luxembourg",           leader: "Шарлотта",                leaderEn: "Charlotte",               color: "#6b7280", flag: "luxembourg_democratic" },
        }
    },
    switzerland: {
        name: "Швейцария",
        nameEn: "Switzerland",
        ideology: "Демократия",
        ideologies: {
            "Демократия":  { name: "Швейцария",            nameEn: "Switzerland",          leader: "Джузеппе Мотта",          leaderEn: "Giuseppe Motta",          color: "#dc2626", flag: "switzerland_democratic" },
            "Фашизм":      { name: "Швейцария",            nameEn: "Switzerland",          leader: "Генрих Гиммлер",          leaderEn: "Heinrich Himmler",        color: "#1a1a2e", flag: "switzerland_democratic" },
            "Коммунизм":   { name: "Швейцария",            nameEn: "Switzerland",          leader: "Эрнст Нунциан",           leaderEn: "Ernst Nobs",              color: "#990000", flag: "switzerland_democratic" },
            "Нейтралитет": { name: "Швейцария",            nameEn: "Switzerland",          leader: "Джузеппе Мотта",          leaderEn: "Giuseppe Motta",          color: "#6b7280", flag: "switzerland_democratic" },
        }
    },
    romania: {
        name: "Румыния",
        nameEn: "Romania",
        ideology: "Нейтралитет",
        ideologies: {
            "Нейтралитет": { name: "Румыния",              nameEn: "Romania",              leader: "Кароль II",               leaderEn: "Carol II",                color: "#f59e0b", flag: "romania_neutral" },
            "Фашизм":      { name: "Румыния",              nameEn: "Romania",              leader: "Ион Антонеску",           leaderEn: "Ion Antonescu",           color: "#dc2626", flag: "romania_neutral" },
            "Демократия":  { name: "Румыния",              nameEn: "Romania",              leader: "Петру Гроза",             leaderEn: "Petru Groza",             color: "#3b82f6", flag: "romania_neutral" },
            "Коммунизм":   { name: "Румыния",              nameEn: "Romania",              leader: "Георге Георгиу-Деж",      leaderEn: "Gheorghe Gheorghiu-Dej",  color: "#990000", flag: "romania_neutral" },
        }
    },
    hungary: {
        name: "Венгрия",
        nameEn: "Hungary",
        ideology: "Нейтралитет",
        ideologies: {
            "Нейтралитет": { name: "Венгрия",              nameEn: "Hungary",              leader: "Миклош Хорти",            leaderEn: "Miklós Horthy",           color: "#16a34a", flag: "hungary_neutral" },
            "Фашизм":      { name: "Венгрия",              nameEn: "Hungary",              leader: "Ференц Салаши",           leaderEn: "Ferenc Szálasi",          color: "#dc2626", flag: "hungary_neutral" },
            "Демократия":  { name: "Венгрия",              nameEn: "Hungary",              leader: "Миклош Хорти",            leaderEn: "Miklós Horthy",           color: "#3b82f6", flag: "hungary_neutral" },
            "Коммунизм":   { name: "Венгрия",              nameEn: "Hungary",              leader: "Матьяш Ракоши",           leaderEn: "Mátyás Rákosi",          color: "#990000", flag: "hungary_neutral" },
        }
    },
    bulgaria: {
        name: "Болгария",
        nameEn: "Bulgaria",
        ideology: "Нейтралитет",
        ideologies: {
            "Нейтралитет": { name: "Болгария",             nameEn: "Bulgaria",             leader: "Борис III",               leaderEn: "Boris III",               color: "#059669", flag: "bulgaria_neutral" },
            "Фашизм":      { name: "Болгария",             nameEn: "Bulgaria",             leader: "Борис III",               leaderEn: "Boris III",               color: "#dc2626", flag: "bulgaria_neutral" },
            "Демократия":  { name: "Болгария",             nameEn: "Bulgaria",             leader: "Кимон Георгиев",          leaderEn: "Kimon Georgiev",          color: "#3b82f6", flag: "bulgaria_neutral" },
            "Коммунизм":   { name: "Болгария",             nameEn: "Bulgaria",             leader: "Георгий Димитров",        leaderEn: "Georgi Dimitrov",         color: "#990000", flag: "bulgaria_neutral" },
        }
    },
    finland: {
        name: "Финляндия",
        nameEn: "Finland",
        ideology: "Нейтралитет",
        ideologies: {
            "Нейтралитет": { name: "Финляндия",            nameEn: "Finland",              leader: "Кюёсти Каллио",           leaderEn: "Kyösti Kallio",           color: "#e0e7ff", flag: "finland_neutral" },
            "Демократия":  { name: "Финляндия",            nameEn: "Finland",              leader: "Ристо Рюти",              leaderEn: "Risto Ryti",              color: "#3b82f6", flag: "finland_neutral" },
            "Фашизм":      { name: "Финляндия",            nameEn: "Finland",              leader: "Ристо Рюти",              leaderEn: "Risto Ryti",              color: "#dc2626", flag: "finland_neutral" },
            "Коммунизм":   { name: "Финляндия",            nameEn: "Finland",              leader: "Отто Куусинен",           leaderEn: "Otto Wille Kuusinen",     color: "#990000", flag: "finland_neutral" },
        }
    },
    norway: {
        name: "Норвегия",
        nameEn: "Norway",
        ideology: "Демократия",
        ideologies: {
            "Демократия":  { name: "Норвегия",             nameEn: "Norway",               leader: "Хаакон VII",              leaderEn: "Haakon VII",              color: "#dc2626", flag: "norway_democratic" },
            "Фашизм":      { name: "Норвегия",             nameEn: "Norway",               leader: "Видкун Квислинг",         leaderEn: "Vidkun Quisling",         color: "#1a1a2e", flag: "norway_democratic" },
            "Коммунизм":   { name: "Норвегия",             nameEn: "Norway",               leader: "Педер Фури",              leaderEn: "Peder Furubotn",          color: "#990000", flag: "norway_democratic" },
            "Нейтралитет": { name: "Норвегия",             nameEn: "Norway",               leader: "Хаакон VII",              leaderEn: "Haakon VII",              color: "#6b7280", flag: "norway_democratic" },
        }
    },
    sweden: {
        name: "Швеция",
        nameEn: "Sweden",
        ideology: "Демократия",
        ideologies: {
            "Демократия":  { name: "Швеция",               nameEn: "Sweden",               leader: "Густав V",                leaderEn: "Gustav V",                color: "#2563eb", flag: "sweden_democratic" },
            "Фашизм":      { name: "Швеция",               nameEn: "Sweden",               leader: "Пер Эдвин Скоглунд",      leaderEn: "Per Edvin Sköglund",      color: "#dc2626", flag: "sweden_democratic" },
            "Коммунизм":   { name: "Швеция",               nameEn: "Sweden",               leader: "Зет Хоглунд",             leaderEn: "Zeth Höglund",            color: "#990000", flag: "sweden_democratic" },
            "Нейтралитет": { name: "Швеция",               nameEn: "Sweden",               leader: "Густав V",                leaderEn: "Gustav V",                color: "#6b7280", flag: "sweden_democratic" },
        }
    },
    denmark: {
        name: "Дания",
        nameEn: "Denmark",
        ideology: "Демократия",
        ideologies: {
            "Демократия":  { name: "Дания",                nameEn: "Denmark",              leader: "Кристиан X",              leaderEn: "Christian X",             color: "#c026d3", flag: "denmark_democratic" },
            "Фашизм":      { name: "Дания",                nameEn: "Denmark",              leader: "Фриц Клаузен",            leaderEn: "Fritz Clausen",           color: "#dc2626", flag: "denmark_democratic" },
            "Коммунизм":   { name: "Дания",                nameEn: "Denmark",              leader: "Аксель Ларсен",           leaderEn: "Aksel Larsen",            color: "#990000", flag: "denmark_democratic" },
            "Нейтралитет": { name: "Дания",                nameEn: "Denmark",              leader: "Кристиан X",              leaderEn: "Christian X",             color: "#6b7280", flag: "denmark_democratic" },
        }
    },
    czechoslovakia: {
        name: "Чехословакия",
        nameEn: "Czechoslovakia",
        ideology: "Демократия",
        ideologies: {
            "Демократия":  { name: "Чехословакия",         nameEn: "Czechoslovakia",       leader: "Эдвард Бенеш",            leaderEn: "Edvard Beneš",            color: "#3b82f6", flag: "czechoslovakia_democratic" },
            "Фашизм":      { name: "Чехословакия",         nameEn: "Czechoslovakia",       leader: "Конрад Генляйн",          leaderEn: "Konrad Henlein",          color: "#dc2626", flag: "czechoslovakia_democratic" },
            "Коммунизм":   { name: "Чехословакия",         nameEn: "Czechoslovakia",       leader: "Клемент Готвальд",        leaderEn: "Klement Gottwald",        color: "#990000", flag: "czechoslovakia_democratic" },
            "Нейтралитет": { name: "Чехословакия",         nameEn: "Czechoslovakia",       leader: "Эдвард Бенеш",            leaderEn: "Edvard Beneš",            color: "#6b7280", flag: "czechoslovakia_democratic" },
        }
    },
    austria: {
        name: "Австрия",
        nameEn: "Austria",
        ideology: "Нейтралитет",
        ideologies: {
            "Нейтралитет": { name: "Австрия",              nameEn: "Austria",              leader: "Курт Шушниг",             leaderEn: "Kurt Schuschnigg",        color: "#ef4444", flag: "austria_neutral" },
            "Фашизм":      { name: "Австрия",              nameEn: "Austria",              leader: "Артур Зейсс-Инкварт",     leaderEn: "Arthur Seyss-Inquart",    color: "#dc2626", flag: "austria_neutral" },
            "Демократия":  { name: "Австрия",              nameEn: "Austria",              leader: "Карл Реннер",             leaderEn: "Karl Renner",             color: "#3b82f6", flag: "austria_neutral" },
            "Коммунизм":   { name: "Австрия",              nameEn: "Austria",              leader: "Эрнст Фишер",             leaderEn: "Ernst Fischer",           color: "#990000", flag: "austria_neutral" },
        }
    },
    yugoslavia: {
        name: "Югославия",
        nameEn: "Yugoslavia",
        ideology: "Нейтралитет",
        ideologies: {
            "Нейтралитет": { name: "Югославия",            nameEn: "Yugoslavia",           leader: "Пётр II",                 leaderEn: "Peter II",                color: "#1e40af", flag: "yugoslavia_neutral" },
            "Фашизм":      { name: "Югославия",            nameEn: "Yugoslavia",           leader: "Милан Недич",             leaderEn: "Milan Nedić",             color: "#dc2626", flag: "yugoslavia_neutral" },
            "Демократия":  { name: "Югославия",            nameEn: "Yugoslavia",           leader: "Иосип Броз Тито",         leaderEn: "Josip Broz Tito",         color: "#3b82f6", flag: "yugoslavia_neutral" },
            "Коммунизм":   { name: "Югославия",            nameEn: "Yugoslavia",           leader: "Иосип Броз Тито",         leaderEn: "Josip Broz Tito",         color: "#990000", flag: "yugoslavia_neutral" },
        }
    },
    greece: {
        name: "Греция",
        nameEn: "Greece",
        ideology: "Нейтралитет",
        ideologies: {
            "Нейтралитет": { name: "Греция",               nameEn: "Greece",               leader: "Иоаннис Метаксас",        leaderEn: "Ioannis Metaxas",         color: "#60a5fa", flag: "greece_neutral" },
            "Демократия":  { name: "Греция",               nameEn: "Greece",               leader: "Иоаннис Метаксас",        leaderEn: "Ioannis Metaxas",         color: "#3b82f6", flag: "greece_neutral" },
            "Фашизм":      { name: "Греция",               nameEn: "Greece",               leader: "Иоаннис Метаксас",        leaderEn: "Ioannis Metaxas",         color: "#dc2626", flag: "greece_neutral" },
            "Коммунизм":   { name: "Греция",               nameEn: "Greece",               leader: "Маркос Авгиерис",         leaderEn: "Markos Vafiadis",         color: "#990000", flag: "greece_neutral" },
        }
    },
    albania: {
        name: "Албания",
        nameEn: "Albania",
        ideology: "Нейтралитет",
        ideologies: {
            "Нейтралитет": { name: "Албания",              nameEn: "Albania",              leader: "Зогу I",                  leaderEn: "Zog I",                   color: "#dc2626", flag: "albania_neutral" },
            "Демократия":  { name: "Албания",              nameEn: "Albania",              leader: "Фан Ноли",                leaderEn: "Fan Noli",                color: "#3b82f6", flag: "albania_neutral" },
            "Фашизм":      { name: "Албания",              nameEn: "Albania",              leader: "Мехди Фрашери",           leaderEn: "Mehdi Frashëri",          color: "#1a1a2e", flag: "albania_neutral" },
            "Коммунизм":   { name: "Албания",              nameEn: "Albania",              leader: "Энвер Ходжа",             leaderEn: "Enver Hoxha",             color: "#990000", flag: "albania_neutral" },
        }
    },
    lithuania: {
        name: "Литва",
        nameEn: "Lithuania",
        ideology: "Нейтралитет",
        ideologies: {
            "Нейтралитет": { name: "Литва",                nameEn: "Lithuania",            leader: "Антанас Сметона",         leaderEn: "Antanas Smetona",         color: "#065f46", flag: "lithuania_neutral" },
            "Демократия":  { name: "Литва",                nameEn: "Lithuania",            leader: "Антанас Сметона",         leaderEn: "Antanas Smetona",         color: "#3b82f6", flag: "lithuania_neutral" },
            "Фашизм":      { name: "Литва",                nameEn: "Lithuania",            leader: "Антанас Сметона",         leaderEn: "Antanas Smetona",         color: "#dc2626", flag: "lithuania_neutral" },
            "Коммунизм":   { name: "Литва",                nameEn: "Lithuania",            leader: "Антанас Сnieckис",        leaderEn: "Antanas Sniečkus",        color: "#990000", flag: "lithuania_neutral" },
        }
    },
    latvia: {
        name: "Латвия",
        nameEn: "Latvia",
        ideology: "Нейтралитет",
        ideologies: {
            "Нейтралитет": { name: "Латвия",               nameEn: "Latvia",               leader: "Карлис Улманис",          leaderEn: "Kārlis Ulmanis",          color: "#7f1d1d", flag: "latvia_neutral" },
            "Демократия":  { name: "Латвия",               nameEn: "Latvia",               leader: "Карлис Улманис",          leaderEn: "Kārlis Ulmanis",          color: "#3b82f6", flag: "latvia_neutral" },
            "Фашизм":      { name: "Латвия",               nameEn: "Latvia",               leader: "Карлис Улманис",          leaderEn: "Kārlis Ulmanis",          color: "#dc2626", flag: "latvia_neutral" },
            "Коммунизм":   { name: "Латвия",               nameEn: "Latvia",               leader: "Август Кирхенштейн",      leaderEn: "Augusts Kirhenšteins",    color: "#990000", flag: "latvia_neutral" },
        }
    },
    estonia: {
        name: "Эстония",
        nameEn: "Estonia",
        ideology: "Нейтралитет",
        ideologies: {
            "Нейтралитет": { name: "Эстония",              nameEn: "Estonia",              leader: "Константин Пятс",         leaderEn: "Konstantin Päts",         color: "#1d4ed8", flag: "estonia_neutral" },
            "Демократия":  { name: "Эстония",              nameEn: "Estonia",              leader: "Константин Пятс",         leaderEn: "Konstantin Päts",         color: "#3b82f6", flag: "estonia_neutral" },
            "Фашизм":      { name: "Эстония",              nameEn: "Estonia",              leader: "Константин Пятс",         leaderEn: "Konstantin Päts",         color: "#dc2626", flag: "estonia_neutral" },
            "Коммунизм":   { name: "Эстония",              nameEn: "Estonia",              leader: "Йоханнес Варес",          leaderEn: "Johannes Vares",          color: "#990000", flag: "estonia_neutral" },
        }
    },
    slovakia: {
        name: "Словакия",
        nameEn: "Slovakia",
        ideology: "Фашизм",
        ideologies: {
            "Фашизм":      { name: "Словакия",             nameEn: "Slovakia",             leader: "Йозеф Тисо",              leaderEn: "Jozef Tiso",              color: "#2563eb", flag: "slovakia_fascist" },
            "Демократия":  { name: "Словакия",             nameEn: "Slovakia",             leader: "Йозеф Тисо",              leaderEn: "Jozef Tiso",              color: "#3b82f6", flag: "slovakia_fascist" },
            "Коммунизм":   { name: "Словакия",             nameEn: "Slovakia",             leader: "Владимир Клементис",      leaderEn: "Vladimír Clementis",      color: "#990000", flag: "slovakia_fascist" },
            "Нейтралитет": { name: "Словакия",             nameEn: "Slovakia",             leader: "Йозеф Тисо",              leaderEn: "Jozef Tiso",              color: "#6b7280", flag: "slovakia_fascist" },
        }
    },
    ireland: {
        name: "Ирландия",
        nameEn: "Ireland",
        ideology: "Демократия",
        ideologies: {
            "Демократия":  { name: "Ирландия",             nameEn: "Ireland",              leader: "Дуглас Хейд",             leaderEn: "Douglas Hyde",            color: "#16a34a", flag: "ireland_democratic" },
            "Фашизм":      { name: "Ирландия",             nameEn: "Ireland",              leader: "О'Даффи",                 leaderEn: "O'Duffy",                 color: "#dc2626", flag: "ireland_democratic" },
            "Коммунизм":   { name: "Ирландия",             nameEn: "Ireland",              leader: "Джеймс Коннолли",         leaderEn: "James Connolly",          color: "#990000", flag: "ireland_democratic" },
            "Нейтралитет": { name: "Ирландия",             nameEn: "Ireland",              leader: "Дуглас Хейд",             leaderEn: "Douglas Hyde",            color: "#6b7280", flag: "ireland_democratic" },
        }
    },
    iceland: {
        name: "Исландия",
        nameEn: "Iceland",
        ideology: "Демократия",
        ideologies: {
            "Демократия":  { name: "Исландия",             nameEn: "Iceland",              leader: "Эрлюгингур Торссон",      leaderEn: "Erlingur Thorsson",       color: "#3b82f6", flag: "uk_democratic" },
            "Нейтралитет": { name: "Исландия",             nameEn: "Iceland",              leader: "Эрлюгингур Торссон",      leaderEn: "Erlingur Thorsson",       color: "#6b7280", flag: "uk_democratic" },
        }
    },

    // === БЛИЖНИЙ ВОСТОК ===
    turkey: {
        name: "Турция",
        nameEn: "Turkey",
        ideology: "Нейтралитет",
        ideologies: {
            "Нейтралитет": { name: "Турция",               nameEn: "Turkey",               leader: "Мустафа Кемаль Ататюрк",  leaderEn: "Mustafa Kemal Atatürk",   color: "#dc2626", flag: "turkey_neutral" },
            "Демократия":  { name: "Турция",               nameEn: "Turkey",               leader: "Исмет Инёню",             leaderEn: "İsmet İnönü",             color: "#3b82f6", flag: "turkey_neutral" },
            "Фашизм":      { name: "Турция",               nameEn: "Turkey",               leader: "Махмуд Эскиджи",          leaderEn: "Mahmud Es'ad",            color: "#1a1a2e", flag: "turkey_neutral" },
            "Коммунизм":   { name: "Турция",               nameEn: "Turkey",               leader: "Шевкет Сюрсель",          leaderEn: "Şevket Süreyya",          color: "#990000", flag: "turkey_neutral" },
        }
    },
    iraq: {
        name: "Ирак",
        nameEn: "Iraq",
        ideology: "Нейтралитет",
        ideologies: {
            "Нейтралитет": { name: "Ирак",                 nameEn: "Iraq",                 leader: "Галиб Аль-Гаюни",         leaderEn: "Ali Jawdat",              color: "#166534", flag: "iraq_neutral" },
            "Фашизм":      { name: "Ирак",                 nameEn: "Iraq",                 leader: "Рашид Али",               leaderEn: "Rashid Ali",              color: "#dc2626", flag: "iraq_neutral" },
            "Демократия":  { name: "Ирак",                 nameEn: "Iraq",                 leader: "Нури аль-Саид",           leaderEn: "Nuri al-Said",            color: "#3b82f6", flag: "iraq_neutral" },
            "Коммунизм":   { name: "Ирак",                 nameEn: "Iraq",                 leader: "Карим Касем",             leaderEn: "Abd al-Karim Qasim",     color: "#990000", flag: "iraq_neutral" },
        }
    },
    iran: {
        name: "Иран",
        nameEn: "Iran",
        ideology: "Нейтралитет",
        ideologies: {
            "Нейтралитет": { name: "Иран",                 nameEn: "Iran",                 leader: "Реза Пехлеви",            leaderEn: "Reza Shah Pahlavi",       color: "#059669", flag: "iran_neutral" },
            "Демократия":  { name: "Иран",                 nameEn: "Iran",                 leader: "Мохаммед Мосаддык",       leaderEn: "Mohammad Mosaddegh",      color: "#3b82f6", flag: "iran_neutral" },
            "Фашизм":      { name: "Иран",                 nameEn: "Iran",                 leader: "Реза Пехлеви",            leaderEn: "Reza Shah Pahlavi",       color: "#dc2626", flag: "iran_neutral" },
            "Коммунизм":   { name: "Иран",                 nameEn: "Iran",                 leader: "Нуреддин Киянури",        leaderEn: "Nureddin Kianuri",        color: "#990000", flag: "iran_neutral" },
        }
    },
    saudi_arabia: {
        name: "Саудовская Аравия",
        nameEn: "Saudi Arabia",
        ideology: "Нейтралитет",
        ideologies: {
            "Нейтралитет": { name: "Саудовская Аравия",    nameEn: "Saudi Arabia",         leader: "Абдул-Азиз Аль-Сауд",     leaderEn: "Abdulaziz Al Saud",       color: "#15803d", flag: "saudi_arabia_neutral" },
            "Демократия":  { name: "Саудовская Аравия",    nameEn: "Saudi Arabia",         leader: "Абдул-Азиз Аль-Сауд",     leaderEn: "Abdulaziz Al Saud",       color: "#3b82f6", flag: "saudi_arabia_neutral" },
            "Фашизм":      { name: "Саудовская Аравия",    nameEn: "Saudi Arabia",         leader: "Абдул-Азиз Аль-Сауд",     leaderEn: "Abdulaziz Al Saud",       color: "#dc2626", flag: "saudi_arabia_neutral" },
            "Коммунизм":   { name: "Саудовская Аравия",    nameEn: "Saudi Arabia",         leader: "Абдул-Азиз Аль-Сауд",     leaderEn: "Abdulaziz Al Saud",       color: "#990000", flag: "saudi_arabia_neutral" },
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
