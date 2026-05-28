// Units.js — Характеристики юнитов и построек

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
