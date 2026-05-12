const express = require("express");
const { getDailyReport } = require("../controllers/reportController");
const { protect } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { dailyReportValidator } = require("../validators/reportValidator");

const router = express.Router();

router.use(protect);
router.get("/daily", dailyReportValidator, validate, getDailyReport);

module.exports = router;
