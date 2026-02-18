const express = require("express");
const {
  addMealToDailyLog,
  removeMealFromDailyLog,
  getTodaySummary,
  getDateRangeSummary,
} = require("../controllers/dailyLogController");
const { protect } = require("../middleware/auth");
const validate = require("../middleware/validate");
const {
  addMealValidator,
  removeMealValidator,
  dateRangeValidator,
} = require("../validators/dailyLogValidator");

const router = express.Router();

router.use(protect);

router.post("/meals", addMealValidator, validate, addMealToDailyLog);
router.delete("/meals/:mealId", removeMealValidator, validate, removeMealFromDailyLog);
router.get("/today", getTodaySummary);
router.get("/range", dateRangeValidator, validate, getDateRangeSummary);

module.exports = router;
