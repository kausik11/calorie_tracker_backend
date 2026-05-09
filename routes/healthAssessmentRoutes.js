const express = require("express");
const { protect } = require("../middleware/auth");
const validate = require("../middleware/validate");
const {
  upsertHealthAssessment,
  getMyHealthAssessment,
} = require("../controllers/healthAssessmentController");
const { createHealthAssessmentValidator } = require("../validators/healthAssessmentValidator");

const router = express.Router();

router.use(protect);

/**
 * @swagger
 * /api/v1/health-assessment:
 *   post:
 *     summary: Save or update the app onboarding answers
 *     description: Accepts the same question keys used by app/onboarding.tsx.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - direction
 *               - mainGoal
 *               - challenges
 *               - height
 *               - heightUnit
 *               - weight
 *               - weightUnit
 *               - dateOfBirth
 *               - sex
 *               - activityLevel
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: Rahul
 *               direction:
 *                 type: string
 *                 enum: [lose_weight, maintain_weight, gain_weight, work_that_out]
 *               mainGoal:
 *                 type: string
 *                 enum: [understand_food, manage_condition, improve_health, improve_emotional_wellbeing, other]
 *               challenges:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 3
 *                 items:
 *                   type: string
 *                   enum:
 *                     - Lack of support
 *                     - Staying motivated
 *                     - Lack of knowledge
 *                     - Planning meals
 *                     - Partner or family diets
 *                     - Busy schedule
 *                     - Emotional eating
 *               height:
 *                 type: string
 *                 example: "175"
 *               heightUnit:
 *                 type: string
 *                 enum: [cm, ft/in]
 *               weight:
 *                 type: string
 *                 example: "72"
 *               weightUnit:
 *                 type: string
 *                 enum: [kg, lb]
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *                 example: "1998-04-21"
 *               sex:
 *                 type: string
 *                 enum: [female, male]
 *               activityLevel:
 *                 type: string
 *                 enum: [low, moderate, high, very_high]
 *     responses:
 *       200:
 *         description: Health assessment saved successfully
 */
router.post("/", createHealthAssessmentValidator, validate, upsertHealthAssessment);

/**
 * @swagger
 * /api/v1/health-assessment:
 *   get:
 *     summary: Get the signed-in user's onboarding answers
 *     responses:
 *       200:
 *         description: Health assessment found
 */
router.get("/", getMyHealthAssessment);

module.exports = router;
