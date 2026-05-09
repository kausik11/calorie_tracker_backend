const { StatusCodes } = require("http-status-codes");
const HealthAssessment = require("../models/HealthAssessment");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");

const ACTIVITY_FACTORS = {
  low: 1.2,
  moderate: 1.375,
  high: 1.55,
  very_high: 1.725,
};

const calculateAge = (dateOfBirth) => {
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getUTCFullYear() - dob.getUTCFullYear();
  const monthDiff = today.getUTCMonth() - dob.getUTCMonth();
  const isBeforeBirthday =
    monthDiff < 0 || (monthDiff === 0 && today.getUTCDate() < dob.getUTCDate());

  if (isBeforeBirthday) {
    age -= 1;
  }

  return age;
};

const roundToTwo = (value) => Number(value.toFixed(2));

const getNumericInput = (value) => Number(String(value).trim());

const convertHeightToCm = ({ height, heightUnit, heightFt, heightIn }) => {
  if (heightUnit === "cm") {
    return getNumericInput(height);
  }

  if (heightFt !== undefined || heightIn !== undefined) {
    return Number(heightFt || 0) * 30.48 + Number(heightIn || 0) * 2.54;
  }

  const numericHeight = getNumericInput(height);
  const feet = Math.trunc(numericHeight);
  const inchText = String(height).trim().split(".")[1] || "0";
  const inches = Number(inchText.length === 1 ? inchText : inchText.slice(0, 2));

  return feet * 30.48 + inches * 2.54;
};

const convertWeightToKg = ({ weight, weightUnit }) => {
  const numericWeight = getNumericInput(weight);
  return weightUnit === "lb" ? numericWeight * 0.45359237 : numericWeight;
};

const calculateDailyCalorieTarget = ({ sex, currentWeightKg, heightCm, age, activityLevel, direction }) => {
  const base =
    10 * currentWeightKg + 6.25 * heightCm - 5 * age + (sex === "male" ? 5 : -161);
  const maintenance = base * ACTIVITY_FACTORS[activityLevel];
  const adjusted =
    maintenance + (direction === "lose_weight" ? -500 : direction === "gain_weight" ? 500 : 0);

  return Math.min(Math.max(Math.round(adjusted), 800), 10000);
};

const mapDirectionToUserGoal = (direction) => {
  if (direction === "lose_weight") {
    return "weight_loss";
  }

  if (direction === "gain_weight") {
    return "weight_gain";
  }

  return "maintenance";
};

const upsertHealthAssessment = asyncHandler(async (req, res) => {
  const {
    firstName,
    direction,
    mainGoal,
    challenges,
    heightUnit,
    heightFt,
    heightIn,
    dateOfBirth,
    sex,
    activityLevel,
  } = req.body;

  const height = req.body.height ?? req.body.heightCm;
  const weight = req.body.weight ?? req.body.currentWeightKg;
  const weightUnit = req.body.weightUnit ?? "kg";
  const normalizedHeightCm = roundToTwo(
    convertHeightToCm({ height, heightUnit, heightFt, heightIn })
  );
  const normalizedWeightKg = roundToTwo(convertWeightToKg({ weight, weightUnit }));
  const age = calculateAge(dateOfBirth);
  const dailyCalorieTarget = calculateDailyCalorieTarget({
    sex,
    currentWeightKg: normalizedWeightKg,
    heightCm: normalizedHeightCm,
    age,
    activityLevel,
    direction,
  });

  const payload = {
    user: req.user._id,
    firstName,
    direction,
    mainGoal,
    challenges,
    heightUnit,
    height: String(height).trim(),
    heightCm: normalizedHeightCm,
    weightUnit,
    weight: String(weight).trim(),
    currentWeightKg: normalizedWeightKg,
    dateOfBirth: new Date(dateOfBirth),
    age,
    sex,
    activityLevel,
    dailyCalorieTarget,
  };

  const assessment = await HealthAssessment.findOneAndUpdate({ user: req.user._id }, payload, {
    new: true,
    upsert: true,
    runValidators: true,
    setDefaultsOnInsert: true,
  }).lean();

  await User.findByIdAndUpdate(
    req.user._id,
    {
      ...(firstName ? { name: firstName } : {}),
      age,
      gender: sex,
      height: normalizedHeightCm,
      weight: normalizedWeightKg,
      goal: mapDirectionToUserGoal(direction),
      dailyCalorieTarget,
    },
    { runValidators: true }
  );

  res.status(StatusCodes.OK).json({
    status: "success",
    message: "Health assessment saved successfully",
    data: assessment,
  });
});

const getMyHealthAssessment = asyncHandler(async (req, res) => {
  const assessment = await HealthAssessment.findOne({ user: req.user._id }).lean();
  if (!assessment) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Health assessment not found");
  }

  res.status(StatusCodes.OK).json({
    status: "success",
    data: assessment,
  });
});

module.exports = { upsertHealthAssessment, getMyHealthAssessment };
