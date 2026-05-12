const { StatusCodes } = require("http-status-codes");
const Food = require("../models/Food");
const MealEntry = require("../models/MealEntry");
const ApiError = require("../utils/apiError");
const {
  MEAL_TYPES,
  NUTRIENT_KEYS,
  addNutrition,
  calculateNutrition,
  emptyMeals,
  emptyNutrition,
  getNextDay,
  normalizeDate,
  roundNutrition,
  toNumber,
} = require("../utils/nutrition");

const ensureMealType = (mealType) => {
  const normalized = String(mealType || "").trim().toLowerCase();
  if (!MEAL_TYPES.includes(normalized)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, `mealType must be one of: ${MEAL_TYPES.join(", ")}`);
  }
  return normalized;
};

const getFoodOrThrow = async (foodId) => {
  const food = await Food.findById(foodId).lean();
  if (!food) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Food item not found");
  }
  return food;
};

const createMealEntry = async ({ userId, foodId, mealType, quantity, date }) => {
  const normalizedDate = normalizeDate(date || new Date());
  if (!normalizedDate) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "date must be a valid date");
  }

  const numericQuantity = Number(quantity);
  if (!Number.isFinite(numericQuantity) || numericQuantity <= 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "quantity must be greater than 0");
  }

  const food = await getFoodOrThrow(foodId);
  const normalizedMealType = ensureMealType(mealType);

  const duplicateWindow = new Date(Date.now() - 15 * 1000);
  const duplicate = await MealEntry.findOne({
    userId,
    foodId: food._id,
    mealType: normalizedMealType,
    date: normalizedDate,
    quantity: numericQuantity,
    createdAt: { $gte: duplicateWindow },
  }).lean();

  if (duplicate) {
    throw new ApiError(StatusCodes.CONFLICT, "This food was just added. Please wait before adding it again.");
  }

  const entry = await MealEntry.create({
    userId,
    date: normalizedDate,
    mealType: normalizedMealType,
    foodId: food._id,
    quantity: numericQuantity,
    consumedServing: {
      size: toNumber(food.servingSize) || 1,
      unit: food.servingUnit || "serving",
    },
    calculatedNutrition: calculateNutrition(food, numericQuantity),
  });

  await Food.findByIdAndUpdate(food._id, { $inc: { usageCount: 1 } }).catch(() => null);
  return MealEntry.findById(entry._id).populate("foodId", "name brand category servingSize servingUnit image barcode").lean();
};

const buildDailyReport = async (userId, rawDate = new Date()) => {
  const date = normalizeDate(rawDate);
  if (!date) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "date must be a valid date");
  }

  const [aggregation = null, entries] = await Promise.all([
    MealEntry.aggregate([
      { $match: { userId, date: { $gte: date, $lt: getNextDay(date) } } },
      {
        $group: NUTRIENT_KEYS.reduce(
          (group, key) => {
            group[key] = { $sum: `$calculatedNutrition.${key}` };
            return group;
          },
          { _id: "$mealType", count: { $sum: 1 } }
        ),
      },
    ]),
    MealEntry.find({ userId, date: { $gte: date, $lt: getNextDay(date) } })
      .populate("foodId", "name brand category servingSize servingUnit image barcode")
      .sort({ mealType: 1, createdAt: 1 })
      .lean(),
  ]);

  const meals = emptyMeals();
  const totals = emptyNutrition();

  aggregation.forEach((mealTotal) => {
    const mealType = mealTotal._id;
    if (!meals[mealType]) return;

    NUTRIENT_KEYS.forEach((key) => {
      const value = roundNutrition(mealTotal[key]);
      totals[key] = roundNutrition(totals[key] + value);
      const label = `total${key[0].toUpperCase()}${key.slice(1)}`;
      meals[mealType][label] = value;
    });
  });

  entries.forEach((entry) => {
    const meal = meals[entry.mealType];
    if (!meal) return;

    meal.foods.push({
      id: entry._id,
      food: entry.foodId,
      quantity: entry.quantity,
      consumedServing: entry.consumedServing,
      calculatedNutrition: entry.calculatedNutrition,
      createdAt: entry.createdAt,
    });
  });

  return {
    date,
    meals,
    totals,
    remainingCalories: null,
    macroGoals: null,
  };
};

const getRecentFoods = async (userId, limit = 20) =>
  MealEntry.aggregate([
    { $match: { userId } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: "$foodId", lastEatenAt: { $first: "$createdAt" }, timesEaten: { $sum: 1 } } },
    { $sort: { lastEatenAt: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: "foods",
        localField: "_id",
        foreignField: "_id",
        as: "food",
      },
    },
    { $unwind: "$food" },
    { $project: { _id: "$food._id", food: "$food", lastEatenAt: 1, timesEaten: 1 } },
  ]);

const getPopularFoods = async (limit = 20) =>
  MealEntry.aggregate([
    { $group: { _id: "$foodId", timesEaten: { $sum: 1 }, lastEatenAt: { $max: "$createdAt" } } },
    { $sort: { timesEaten: -1, lastEatenAt: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: "foods",
        localField: "_id",
        foreignField: "_id",
        as: "food",
      },
    },
    { $unwind: "$food" },
    { $project: { _id: "$food._id", food: "$food", timesEaten: 1, lastEatenAt: 1 } },
  ]);

module.exports = {
  buildDailyReport,
  createMealEntry,
  getPopularFoods,
  getRecentFoods,
};
