const mongoose = require("mongoose");
const { MEAL_TYPES, NUTRIENT_KEYS, normalizeDate } = require("../utils/nutrition");

const nutritionSchema = new mongoose.Schema(
  NUTRIENT_KEYS.reduce((schema, key) => {
    schema[key] = { type: Number, default: 0, min: 0 };
    return schema;
  }, {}),
  { _id: false }
);

const mealEntrySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    mealType: {
      type: String,
      enum: MEAL_TYPES,
      required: true,
      index: true,
    },
    foodId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Food",
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0.0001,
    },
    consumedServing: {
      size: { type: Number, default: 1, min: 0 },
      unit: { type: String, default: "serving", trim: true },
    },
    calculatedNutrition: {
      type: nutritionSchema,
      default: () => ({}),
    },
  },
  { timestamps: true }
);

mealEntrySchema.pre("validate", function mealEntryPreValidate(next) {
  const normalized = normalizeDate(this.date || new Date());
  if (normalized) {
    this.date = normalized;
  }
  next();
});

mealEntrySchema.index({ userId: 1, date: 1, mealType: 1, createdAt: -1 });
mealEntrySchema.index({ userId: 1, foodId: 1, createdAt: -1 });
mealEntrySchema.index(
  { userId: 1, foodId: 1, mealType: 1, date: 1, quantity: 1, createdAt: 1 },
  { partialFilterExpression: { quantity: { $gt: 0 } } }
);

module.exports = mongoose.model("MealEntry", mealEntrySchema);
