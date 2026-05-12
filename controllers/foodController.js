const { StatusCodes } = require("http-status-codes");
const Food = require("../models/Food");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");
const { getPopularFoods, getRecentFoods } = require("../services/mealEntryService");

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const createFood = asyncHandler(async (req, res) => {
  const food = await Food.create({
    ...req.body,
    createdBy: req.user._id,
  });

  res.status(StatusCodes.CREATED).json({
    status: "success",
    message: "Food item created",
    data: food,
  });
});

const searchFoods = asyncHandler(async (req, res) => {
  const { q, category, barcode, page = 1, limit = 10 } = req.query;
  const numericPage = Math.max(Number(page) || 1, 1);
  const numericLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);
  const searchTerm = String(q || "").trim();
  const barcodeTerm = String(barcode || "").trim();
  const categoryTerm = String(category || "").trim().toLowerCase();

  const filter = {};

  if (barcodeTerm) {
    filter.barcode = barcodeTerm;
  }

  if (categoryTerm) {
    filter.category = categoryTerm;
  }

  if (searchTerm) {
    filter.$or = [
      { name: { $regex: escapeRegex(searchTerm), $options: "i" } },
      { brand: { $regex: escapeRegex(searchTerm), $options: "i" } },
      { barcode: searchTerm },
    ];
  }

  const [foods, total] = await Promise.all([
    Food.find(filter)
      .sort({ createdAt: -1 })
      .skip((numericPage - 1) * numericLimit)
      .limit(numericLimit)
      .lean(),
    Food.countDocuments(filter),
  ]);

  res.status(StatusCodes.OK).json({
    status: "success",
    data: foods,
    pagination: {
      total,
      page: numericPage,
      limit: numericLimit,
      pages: Math.ceil(total / numericLimit),
    },
  });
});

const getRecentFoodList = asyncHandler(async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
  const foods = await getRecentFoods(req.user._id, limit);

  res.status(StatusCodes.OK).json({
    status: "success",
    data: foods,
  });
});

const getPopularFoodList = asyncHandler(async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
  const foods = await getPopularFoods(limit);

  res.status(StatusCodes.OK).json({
    status: "success",
    data: foods,
  });
});

const getFoodById = asyncHandler(async (req, res) => {
  const { foodId } = req.params;
  const food = await Food.findById(foodId).lean();

  if (!food) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Food not found");
  }

  res.status(StatusCodes.OK).json({
    status: "success",
    data: food,
  });
});

module.exports = { createFood, searchFoods, getFoodById, getRecentFoodList, getPopularFoodList };
