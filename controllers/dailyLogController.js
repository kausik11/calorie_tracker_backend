const { StatusCodes } = require("http-status-codes");
const DailyLog = require("../models/DailyLog");
const Food = require("../models/Food");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");
const { calculateMacrosByQuantity } = require("../utils/macroCalculator");
const { getStartOfDayUTC } = require("../utils/date");

const getOrCreateLog = async (userId, date) => {
  const startDate = getStartOfDayUTC(date);
  const existing = await DailyLog.findOne({ user: userId, date: startDate });
  if (existing) return existing;

  return DailyLog.create({
    user: userId,
    date: startDate,
    meals: [],
  });
};

const addMealToDailyLog = asyncHandler(async (req, res) => {
  const { foodId, quantity, date } = req.body;
  const logDate = getStartOfDayUTC(date || new Date());

  const food = await Food.findById(foodId).lean();
  if (!food) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Food item not found");
  }

  const macros = calculateMacrosByQuantity(food, Number(quantity));
  const log = await getOrCreateLog(req.user._id, logDate);

  log.meals.push({
    food: food._id,
    quantity: Number(quantity),
    ...macros,
  });

  await log.save();
  await log.populate("meals.food", "name brand servingSize");

  res.status(StatusCodes.CREATED).json({
    status: "success",
    message: "Meal added to daily log",
    data: log,
  });
});

const removeMealFromDailyLog = asyncHandler(async (req, res) => {
  const { mealId } = req.params;
  const logDate = getStartOfDayUTC(req.query.date || new Date());

  const log = await DailyLog.findOne({ user: req.user._id, date: logDate });
  if (!log) {
    throw new ApiError(StatusCodes.NOT_FOUND, "No log found for this date");
  }

  const meal = log.meals.id(mealId);
  if (!meal) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Meal not found in daily log");
  }

  meal.deleteOne();
  await log.save();

  res.status(StatusCodes.OK).json({
    status: "success",
    message: "Meal removed successfully",
    data: log,
  });
});

const getTodaySummary = asyncHandler(async (req, res) => {
  const today = getStartOfDayUTC(new Date());
  const log = await DailyLog.findOne({ user: req.user._id, date: today })
    .populate("meals.food", "name brand servingSize")
    .lean();

  res.status(StatusCodes.OK).json({
    status: "success",
    data: log || {
      user: req.user._id,
      date: today,
      meals: [],
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0,
    },
  });
});

const getDateRangeSummary = asyncHandler(async (req, res) => {
  const startDate = getStartOfDayUTC(req.query.startDate);
  const endDate = getStartOfDayUTC(req.query.endDate);

  if (endDate < startDate) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "endDate cannot be before startDate");
  }

  const logs = await DailyLog.find({
    user: req.user._id,
    date: { $gte: startDate, $lte: endDate },
  })
    .sort({ date: 1 })
    .lean();

  const totals = logs.reduce(
    (acc, log) => {
      acc.totalCalories += log.totalCalories;
      acc.totalProtein += log.totalProtein;
      acc.totalCarbs += log.totalCarbs;
      acc.totalFat += log.totalFat;
      return acc;
    },
    { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 }
  );

  res.status(StatusCodes.OK).json({
    status: "success",
    data: {
      range: { startDate, endDate },
      days: logs.length,
      totals,
      logs,
    },
  });
});

module.exports = {
  addMealToDailyLog,
  removeMealFromDailyLog,
  getTodaySummary,
  getDateRangeSummary,
};
