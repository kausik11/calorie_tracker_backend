const { StatusCodes } = require("http-status-codes");
const asyncHandler = require("../utils/asyncHandler");
const { buildDailyReport } = require("../services/mealEntryService");

const getDailyReport = asyncHandler(async (req, res) => {
  const report = await buildDailyReport(req.user._id, req.query.date || new Date());

  res.status(StatusCodes.OK).json({
    status: "success",
    data: report,
  });
});

module.exports = { getDailyReport };
