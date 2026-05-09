const mongoose = require("mongoose");

const healthAssessmentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    firstName: {
      type: String,
      trim: true,
      maxlength: 40,
    },
    direction: {
      type: String,
      enum: ["lose_weight", "maintain_weight", "gain_weight", "work_that_out"],
      required: true,
    },
    mainGoal: {
      type: String,
      enum: [
        "understand_food",
        "manage_condition",
        "improve_health",
        "improve_emotional_wellbeing",
        "other",
      ],
      required: true,
    },
    challenges: {
      type: [
        {
          type: String,
          enum: [
            "Lack of support",
            "Staying motivated",
            "Lack of knowledge",
            "Planning meals",
            "Partner or family diets",
            "Busy schedule",
            "Emotional eating",
          ],
        },
      ],
      validate: {
        validator(value) {
          return Array.isArray(value) && value.length >= 1 && value.length <= 3;
        },
        message: "Select between 1 and 3 challenges",
      },
      required: true,
    },
    heightUnit: {
      type: String,
      enum: ["cm", "ft/in"],
      required: true,
    },
    height: {
      type: String,
      required: true,
      trim: true,
    },
    heightCm: {
      type: Number,
      min: 30,
      max: 300,
      required: true,
    },
    weightUnit: {
      type: String,
      enum: ["kg", "lb"],
      required: true,
    },
    weight: {
      type: String,
      required: true,
      trim: true,
    },
    currentWeightKg: {
      type: Number,
      min: 20,
      max: 500,
      required: true,
    },
    dateOfBirth: {
      type: Date,
      required: true,
    },
    age: {
      type: Number,
      min: 1,
      max: 120,
      required: true,
    },
    sex: {
      type: String,
      enum: ["male", "female"],
      required: true,
    },
    activityLevel: {
      type: String,
      enum: ["low", "moderate", "high", "very_high"],
      required: true,
    },
    dailyCalorieTarget: {
      type: Number,
      min: 800,
      max: 10000,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("HealthAssessment", healthAssessmentSchema);
