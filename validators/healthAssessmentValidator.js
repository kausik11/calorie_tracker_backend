const { body } = require("express-validator");

const CHALLENGE_OPTIONS = [
  "Lack of support",
  "Staying motivated",
  "Lack of knowledge",
  "Planning meals",
  "Partner or family diets",
  "Busy schedule",
  "Emotional eating",
];

const normalizeText = (value) => {
  if (typeof value !== "string") return value;
  return value.trim().toLowerCase().replace(/\s+/g, "_");
};

const normalizeDirection = (value) => {
  const normalized = normalizeText(value);
  const map = {
    lose_weight: "lose_weight",
    gain_weight: "gain_weight",
    gain_my_weight: "gain_weight",
    maintain_my_weight: "maintain_weight",
    maintain_weight: "maintain_weight",
    work_that_out: "work_that_out",
  };
  return map[normalized] || normalized;
};

const normalizeMainGoal = (value) => {
  const normalized = normalizeText(value);
  const map = {
    understand_food: "understand_food",
    understand_my_food_intake: "understand_food",
    understand_food_intake: "understand_food",
    manage_condition: "manage_condition",
    manage_a_medical_condition: "manage_condition",
    manage_medical_condition: "manage_condition",
    improve_health: "improve_health",
    improve_my_overall_health: "improve_health",
    improve_overall_health: "improve_health",
    improve_emotional_wellbeing: "improve_emotional_wellbeing",
    improve_my_emotional_wellbeing: "improve_emotional_wellbeing",
    other: "other",
  };
  return map[normalized] || normalized;
};

const normalizeHeightUnit = (value) => {
  if (value === "ft_in" || value === "ftin" || value === "feet_inches") {
    return "ft/in";
  }

  return value;
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

const createHealthAssessmentValidator = [
  body("firstName")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ max: 40 })
    .withMessage("firstName must be 40 characters or fewer"),
  body("direction")
    .customSanitizer((value, { req }) => normalizeDirection(value ?? req.body.hereTo))
    .isIn(["lose_weight", "maintain_weight", "gain_weight", "work_that_out"])
    .withMessage("direction must be lose_weight, maintain_weight, gain_weight, or work_that_out"),
  body("mainGoal")
    .customSanitizer((value, { req }) => normalizeMainGoal(value ?? req.body.mainHealthGoal))
    .isIn([
      "understand_food",
      "manage_condition",
      "improve_health",
      "improve_emotional_wellbeing",
      "other",
    ])
    .withMessage(
      "mainGoal must be understand_food, manage_condition, improve_health, improve_emotional_wellbeing, or other"
    ),
  body("challenges")
    .isArray({ min: 1, max: 3 })
    .withMessage("challenges must include 1 to 3 selected options")
    .custom((value) => value.every((item) => CHALLENGE_OPTIONS.includes(item)))
    .withMessage("challenges contains an unsupported option"),
  body("heightUnit")
    .customSanitizer(normalizeHeightUnit)
    .isIn(["cm", "ft/in"])
    .withMessage("heightUnit must be cm or ft/in"),
  body("height")
    .customSanitizer((value, { req }) => value ?? req.body.heightCm)
    .custom((value, { req }) => value !== undefined || req.body.heightCm !== undefined)
    .withMessage("height is required")
    .bail()
    .custom((value) => Number.isFinite(Number(String(value).trim())) && Number(String(value).trim()) > 0)
    .withMessage("height must be a positive number"),
  body("weightUnit")
    .customSanitizer((value) => value ?? "kg")
    .isIn(["kg", "lb"])
    .withMessage("weightUnit must be kg or lb"),
  body("weight")
    .customSanitizer((value, { req }) => value ?? req.body.currentWeightKg)
    .custom((value, { req }) => value !== undefined || req.body.currentWeightKg !== undefined)
    .withMessage("weight is required")
    .bail()
    .custom((value) => Number.isFinite(Number(String(value).trim())) && Number(String(value).trim()) > 0)
    .withMessage("weight must be a positive number"),
  body("dateOfBirth")
    .isISO8601()
    .withMessage("dateOfBirth must be a valid date")
    .custom((value) => {
      const dob = new Date(value);
      const now = new Date();
      if (dob > now) {
        throw new Error("dateOfBirth cannot be in the future");
      }

      const age = calculateAge(dob);
      if (age < 13 || age > 120) {
        throw new Error("dateOfBirth must produce an age between 13 and 120");
      }

      return true;
    }),
  body("sex").isIn(["male", "female"]).withMessage("sex must be male or female"),
  body("activityLevel")
    .isIn(["low", "moderate", "high", "very_high"])
    .withMessage("activityLevel must be low, moderate, high, or very_high"),
];

module.exports = { createHealthAssessmentValidator };
