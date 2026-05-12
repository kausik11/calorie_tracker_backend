const { query } = require("express-validator");

const dailyReportValidator = [
  query("date").optional().isISO8601().withMessage("date must be a valid ISO date"),
];

module.exports = { dailyReportValidator };
