const { StatusCodes } = require("http-status-codes");
const MealEntry = require("../models/MealEntry");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");
const { createMealEntry } = require("../services/mealEntryService");

const addMealEntry = asyncHandler(async (req, res) => {
  const entry = await createMealEntry({
    userId: req.user._id,
    foodId: req.body.foodId,
    mealType: req.body.mealType,
    quantity: req.body.quantity,
    date: req.body.date,
  });

  res.status(StatusCodes.CREATED).json({
    status: "success",
    message: "Food added to meal",
    data: entry,
  });
});

const removeMealEntry = asyncHandler(async (req, res) => {
  const entry = await MealEntry.findOneAndDelete({
    _id: req.params.entryId,
    userId: req.user._id,
  }).lean();

  if (!entry) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Meal entry not found");
  }

  res.status(StatusCodes.OK).json({
    status: "success",
    message: "Meal entry deleted",
  });
});

module.exports = { addMealEntry, removeMealEntry };
