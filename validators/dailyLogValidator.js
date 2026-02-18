const { body, param, query } = require("express-validator");

const addMealValidator = [
  body("foodId").isMongoId().withMessage("Valid foodId is required"),
  body("quantity").isFloat({ min: 1 }).withMessage("Quantity must be a positive number in grams"),
  body("date")
    .optional()
    .isISO8601()
    .withMessage("Date must be a valid ISO date string"),
];

const removeMealValidator = [
  param("mealId").isMongoId().withMessage("Invalid meal id"),
  query("date").optional().isISO8601().withMessage("Date must be a valid ISO date string"),
];

const dateRangeValidator = [
  query("startDate").isISO8601().withMessage("startDate must be a valid date"),
  query("endDate").isISO8601().withMessage("endDate must be a valid date"),
];

module.exports = { addMealValidator, removeMealValidator, dateRangeValidator };
