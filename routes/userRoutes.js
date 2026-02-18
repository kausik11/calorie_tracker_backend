const express = require("express");
const { getMe, updateProfile, setCalorieGoal } = require("../controllers/userController");
const { protect } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { updateProfileValidator, calorieTargetValidator } = require("../validators/userValidator");

const router = express.Router();

router.use(protect);

router.get("/me", getMe);
router.patch("/profile", updateProfileValidator, validate, updateProfile);
router.patch("/calorie-goal", calorieTargetValidator, validate, setCalorieGoal);

module.exports = router;
