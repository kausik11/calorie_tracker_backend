const { body, query, param } = require("express-validator");

const createFoodValidator = [
  body("name").trim().notEmpty().withMessage("Food name is required"),
  body("brand").optional().trim(),
  body("category").optional().trim().isLength({ max: 80 }).withMessage("Category is too long"),
  body("servingSize")
    .optional()
    .isFloat({ gt: 0 })
    .withMessage("Serving size must be greater than 0"),
  body("servingUnit").optional().trim().isLength({ max: 40 }).withMessage("Serving unit is too long"),
  body("calories").isFloat({ min: 0 }).withMessage("Calories must be a positive number"),
  body("protein").isFloat({ min: 0 }).withMessage("Protein must be a positive number"),
  body("carbs").isFloat({ min: 0 }).withMessage("Carbs must be a positive number"),
  body("fat").isFloat({ min: 0 }).withMessage("Fat must be a positive number"),
  body("fiber").optional().isFloat({ min: 0 }).withMessage("Fiber must be a positive number"),
  body("sugar").optional().isFloat({ min: 0 }).withMessage("Sugar must be a positive number"),
  body("sodium").optional().isFloat({ min: 0 }).withMessage("Sodium must be a positive number"),
  body("potassium").optional().isFloat({ min: 0 }).withMessage("Potassium must be a positive number"),
  body("cholesterol").optional().isFloat({ min: 0 }).withMessage("Cholesterol must be a positive number"),
  body("water").optional().isFloat({ min: 0 }).withMessage("Water must be a positive number"),
  body("micronutrients").optional().isObject().withMessage("micronutrients must be an object"),
  body("image").optional().isString().withMessage("image must be a URL string"),
  body("barcode").optional().trim(),
  body("pieceWeight")
    .optional()
    .isFloat({ gt: 0 })
    .withMessage("pieceWeight must be greater than 0"),
  body("isVerified").optional().isBoolean().withMessage("isVerified must be true or false"),
  body("verified").optional().isBoolean().withMessage("verified must be true or false"),
  body("createdByAdmin").optional().isBoolean().withMessage("createdByAdmin must be true or false"),
];

const foodSearchValidator = [
  query("q").optional().isString().withMessage("Search query must be a string"),
  query("category").optional().isString().withMessage("category must be a string"),
  query("barcode").optional().isString().withMessage("barcode must be a string"),
  query("page").optional().isInt({ min: 1 }).withMessage("Page must be >= 1"),
  query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be 1-100"),
];

const foodIdValidator = [param("foodId").isMongoId().withMessage("Invalid food id")];

module.exports = { createFoodValidator, foodSearchValidator, foodIdValidator };
