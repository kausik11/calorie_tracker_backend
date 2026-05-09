const { StatusCodes } = require("http-status-codes");
const Food = require("../models/Food");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");

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
  const { q, page = 1, limit = 10 } = req.query;
  const numericPage = Number(page);
  const numericLimit = Number(limit);
  const searchTerm = String(q || "").trim();

  const filter = searchTerm
    ? {
        $or: [
          { name: { $regex: escapeRegex(searchTerm), $options: "i" } },
          { brand: { $regex: escapeRegex(searchTerm), $options: "i" } },
        ],
      }
    : {};

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

module.exports = { createFood, searchFoods, getFoodById };
