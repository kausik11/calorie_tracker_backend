const express = require("express");
const { addMealEntry, removeMealEntry } = require("../controllers/mealEntryController");
const { protect } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { createMealEntryValidator, mealEntryIdValidator } = require("../validators/mealEntryValidator");

const router = express.Router();

router.use(protect);
router.post("/", createMealEntryValidator, validate, addMealEntry);
router.delete("/:entryId", mealEntryIdValidator, validate, removeMealEntry);

module.exports = router;
