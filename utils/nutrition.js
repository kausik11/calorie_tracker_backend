const NUTRIENT_KEYS = [
  "calories",
  "protein",
  "carbs",
  "fat",
  "fiber",
  "sugar",
  "sodium",
  "potassium",
  "cholesterol",
  "water",
];

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snacks", "other"];

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
};

const roundNutrition = (value, decimals = 2) => Number(toNumber(value).toFixed(decimals));

const emptyNutrition = () =>
  NUTRIENT_KEYS.reduce((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {});

const calculateNutrition = (food, quantity = 1) => {
  const factor = toNumber(quantity);
  const nutrition = emptyNutrition();

  NUTRIENT_KEYS.forEach((key) => {
    nutrition[key] = roundNutrition(toNumber(food?.[key]) * factor);
  });

  return nutrition;
};

const addNutrition = (target, source) => {
  NUTRIENT_KEYS.forEach((key) => {
    target[key] = roundNutrition(toNumber(target[key]) + toNumber(source?.[key]));
  });
  return target;
};

const normalizeDate = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
};

const getNextDay = (date) => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + 1);
  return next;
};

const emptyMeals = () =>
  MEAL_TYPES.reduce((acc, mealType) => {
    acc[mealType] = {
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0,
      totalFiber: 0,
      totalSugar: 0,
      totalSodium: 0,
      totalPotassium: 0,
      totalCholesterol: 0,
      totalWater: 0,
      foods: [],
    };
    return acc;
  }, {});

module.exports = {
  NUTRIENT_KEYS,
  MEAL_TYPES,
  addNutrition,
  calculateNutrition,
  emptyMeals,
  emptyNutrition,
  getNextDay,
  normalizeDate,
  roundNutrition,
  toNumber,
};
