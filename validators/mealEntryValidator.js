const { body, param } = require("express-validator");
const { MEAL_TYPES } = require("../utils/nutrition");

const normalizeMealType = (value) => (typeof value === "string" ? value.trim().toLowerCase() : value);

const createMealEntryValidator = [
  body("foodId").isMongoId().withMessage("Valid foodId is required"),
  body("mealType")
    .customSanitizer(normalizeMealType)
    .isIn(MEAL_TYPES)
    .withMessage(`mealType must be one of: ${MEAL_TYPES.join(", ")}`),
  body("quantity").isFloat({ gt: 0 }).withMessage("quantity must be greater than 0"),
  body("date").optional().isISO8601().withMessage("date must be a valid ISO date"),
];

const mealEntryIdValidator = [param("entryId").isMongoId().withMessage("Invalid meal entry id")];

module.exports = { createMealEntryValidator, mealEntryIdValidator };
