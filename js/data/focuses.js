export const nationalFocuses = {
    "germany": [
        {
            id: 'ger_plan',
            name: "Четырехлетний план",
            description: "Дает 3 военные фабрики в случайных регионах",
            effect: (state, utils) => {
                let count = 0;
                Object.entries(state.gridData).forEach(([pos, id]) => {
                    if (id === 'germany' && count < 3) {
                        utils.getCellData(pos).factories += 1;
                        count++;
                    }
                });
                utils.createAlert("ПЛАН ВЫПОЛНЕН: +3 ФАБРИКИ", 10, 'diplo');
            }
        },
        {
            id: 'ger_war_ready',
            name: "Готовность к войне",
            description: "Пополнение арсеналов: +1000 снаряжения",
            effect: (state, utils) => {
                state.playerResources.equipment += 1000;
                utils.createAlert("СКЛАДЫ ЗАПОЛНЕНЫ: +1000 СНАРЯЖЕНИЯ", 10, 'diplo');
            }
        },
        {
            id: 'ger_danzig',
            name: "Данциг или война",
            description: "Прямое объявление войны Польше, Франции и ВБ",
            effect: (state, utils) => {
                const targets = ['poland', 'france', 'uk'];
                targets.forEach(t => {
                    if (!utils.isAtWar('germany', t)) state.wars.push({a: 'germany', b: t});
                });
                utils.createAlert("ВОЙНА ОБЪЯВЛЕНА: ДАНЦИГ НАШ!", 15, 'war');
            }
        },
        {
            id: 'ger_axis',
            name: "ОСЬ",
            description: "Германия приглашает в альянс Италию, Румынию, Венгрию, Словакию и Болгарию",
            effect: (state, utils) => {
                const partners = ['italy', 'romania', 'hungary', 'slovakia', 'bulgaria'];
                partners.forEach(p => {
                    if (!utils.areAllies('germany', p)) {
                        state.alliances.push(new Set(['germany', p]));
                    }
                });
                utils.createAlert("ОСЬ СФОРМИРОВАНА: СОЮЗ ЗАКЛЮЧЕН", 15, 'diplo');
            }
        },
        {
            id: 'ger_break_pact',
            name: "Разорвать пакт",
            description: "Война с СССР и Бельгией. Мобилизация дивизий",
            effect: (state, utils) => {
                ['ussr', 'belgium'].forEach(t => {
                    if (!utils.isAtWar('germany', t)) state.wars.push({a: 'germany', b: t});
                });
                utils.createAlert("ПАКТ РАЗОРВАН: ГЕНЕРАЛЬНОЕ НАСТУПЛЕНИЕ!", 15, 'war');
            }
        }
    ],
    "ussr": [
        {
            id: 'ussr_fin_war',
            name: "Зимняя война",
            description: "Предъявить претензии Финляндии. Объявление войны.",
            effect: (state, utils) => {
                if (!utils.isAtWar('ussr', 'finland')) {
                    state.wars.push({a: 'ussr', b: 'finland'});
                    utils.createAlert("СССР ОБЪЯВЛЯЕТ ВОЙНУ ФИНЛЯНДИИ!", 15, 'war');
                }
            }
        },
        {
            id: 'ussr_baltic',
            name: "Прибалтийский вопрос",
            description: "Ультиматум Литве, Латвии и Эстонии.",
            effect: (state, utils) => {
                const targets = ['lithuania', 'latvia', 'estonia'];
                targets.forEach(t => {
                    if (Math.random() < 0.8) {
                        utils.createAlert(`${utils.getCountryInfo(t).name} принимает ультиматум`, 10, 'diplo');
                        Object.keys(state.gridData).forEach(key => {
                            if (state.gridData[key] === t) state.gridData[key] = 'ussr';
                        });
                    } else {
                        utils.createAlert(`${utils.getCountryInfo(t).name} отвергает ультиматум!`, 15, 'war');
                        if (!utils.isAtWar('ussr', t)) state.wars.push({a: 'ussr', b: t});
                    }
                });
            }
        },
        {
            id: 'ussr_defense',
            name: "Линия обороны",
            description: "Мобилизация резервов: +4 танковых дивизии",
            effect: (state, utils) => {
                let ussrCells = Object.keys(state.gridData).filter(k => state.gridData[k] === 'ussr');
                for (let i = 0; i < 4; i++) {
                    const pos = ussrCells[Math.floor(Math.random() * ussrCells.length)];
                    state.units.push({
                        id: Math.random().toString(36).substr(2, 9),
                        pos: pos,
                        owner: 'ussr',
                        type: 'tank',
                        trainingDaysLeft: 0,
                        hp: 100,
                        path: []
                    });
                }
                utils.createAlert("ОБОРОНА УКРЕПЛЕНА: +4 ТАНКОВЫЕ ДИВИЗИИ", 10, 'diplo');
            }
        }
    ],
    "italy": [
        {
            id: 'ita_navy',
            name: "Развитие флота",
            description: "Дает два порта на случайных прибрежных территориях",
            effect: (state, utils) => {
                utils.createAlert("ФЛОТ МОДЕРНИЗИРОВАН: ПОСТРОЕНО 2 ПОРТА", 10, 'diplo');
            }
        },
        {
            id: 'ita_revive',
            name: "Возродить великую Италию",
            description: "Пополнение ресурсов и мобилизация дивизий",
            effect: (state, utils) => {
                state.playerResources.equipment += 1000;
                utils.createAlert("ВЕЛИКАЯ ИТАЛИЯ: +1000 СНАРЯЖЕНИЯ", 10, 'diplo');
            }
        },
        {
            id: 'ita_yugo',
            name: "Захват Югославии",
            description: "Объявление войны Югославии",
            effect: (state, utils) => {
                if (!utils.isAtWar('italy', 'yugoslavia')) {
                    state.wars.push({a: 'italy', b: 'yugoslavia'});
                    utils.createAlert("ИТАЛИЯ ОБЪЯВЛЯЕТ ВОЙНУ ЮГОСЛАВИИ!", 15, 'war');
                }
            }
        }
    ],
    "france": [
        {
            id: 'fra_maginot',
            name: "Линия Мажино",
            description: "Укрепление границы с Германией",
            effect: (state, utils) => {
                utils.createAlert("ЛИНИЯ МАЖИНО: ГРАНИЦА УКРЕПЛЕНА", 10, 'diplo');
            }
        },
        {
            id: 'fra_army',
            name: "Модернизация армии",
            description: "+2 пехотные дивизии",
            effect: (state, utils) => {
                let franceCells = Object.keys(state.gridData).filter(k => state.gridData[k] === 'france');
                for (let i = 0; i < 2; i++) {
                    const pos = franceCells[Math.floor(Math.random() * franceCells.length)];
                    state.units.push({
                        id: Math.random().toString(36).substr(2, 9),
                        pos: pos,
                        owner: 'france',
                        type: 'infantry',
                        trainingDaysLeft: 0,
                        hp: 100,
                        path: []
                    });
                }
                utils.createAlert("АРМИЯ МОДЕРНИЗИРОВАНА: +2 ДИВИЗИИ", 10, 'diplo');
            }
        }
    ],
    "poland": [
        {
            id: 'pol_defense',
            name: "Оборона страны",
            description: "Мобилизация 3 пехотных дивизий",
            effect: (state, utils) => {
                let polandCells = Object.keys(state.gridData).filter(k => state.gridData[k] === 'poland');
                for (let i = 0; i < 3; i++) {
                    const pos = polandCells[Math.floor(Math.random() * polandCells.length)];
                    state.units.push({
                        id: Math.random().toString(36).substr(2, 9),
                        pos: pos,
                        owner: 'poland',
                        type: 'infantry',
                        trainingDaysLeft: 0,
                        hp: 100,
                        path: []
                    });
                }
                utils.createAlert("МОБИЛИЗАЦИЯ: +3 ПЕХОТНЫЕ ДИВИЗИИ", 10, 'diplo');
            }
        }
    ],
    "uk": [
        {
            id: 'uk_navy',
            name: "Королевский флот",
            description: "Усиление военно-морских сил",
            effect: (state, utils) => {
                utils.createAlert("ФЛОТ ЕГО ВЕЛИЧЕСТВА: УСИЛЕН", 10, 'diplo');
            }
        }
    ]
};
