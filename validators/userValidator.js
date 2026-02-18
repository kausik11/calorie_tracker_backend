const { body } = require("express-validator");

const updateProfileValidator = [
  body("age").optional().isInt({ min: 1, max: 120 }).withMessage("Age must be between 1 and 120"),
  body("gender").optional().isIn(["male", "female", "other"]).withMessage("Invalid gender"),
  body("height").optional().isFloat({ min: 30, max: 300 }).withMessage("Height must be in cm"),
  body("weight").optional().isFloat({ min: 20, max: 500 }).withMessage("Weight must be in kg"),
  body("goal")
    .optional()
    .isIn(["weight_loss", "weight_gain", "maintenance"])
    .withMessage("Invalid goal value"),
];

const calorieTargetValidator = [
  body("dailyCalorieTarget")
    .isInt({ min: 800, max: 10000 })
    .withMessage("Daily calorie target must be between 800 and 10000"),
];

module.exports = { updateProfileValidator, calorieTargetValidator };
