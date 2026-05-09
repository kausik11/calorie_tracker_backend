const express = require("express");
const { protectFirebaseAdmin } = require("../middleware/firebaseAdminAuth");
const validate = require("../middleware/validate");
const { createFoodValidator, foodIdValidator } = require("../validators/foodValidator");
const { createRecipeValidator, recipeIdValidator } = require("../validators/recipeValidator");
const {
  getFirebaseConfig,
  getSummary,
  listCatalogFoods,
  createCatalogFood,
  deleteCatalogFood,
  listCatalogRecipes,
  createCatalogRecipe,
  deleteCatalogRecipe,
  listClients,
  getClient,
  updateClient,
  deleteClient,
} = require("../controllers/adminController");

const router = express.Router();

router.get("/firebase-config", getFirebaseConfig);
router.use(protectFirebaseAdmin);
router.get("/summary", getSummary);
router.get("/foods", listCatalogFoods);
router.post("/foods", createFoodValidator, validate, createCatalogFood);
router.delete("/foods/:foodId", foodIdValidator, validate, deleteCatalogFood);
router.get("/recipes", listCatalogRecipes);
router.post("/recipes", createRecipeValidator, validate, createCatalogRecipe);
router.delete("/recipes/:recipeId", recipeIdValidator, validate, deleteCatalogRecipe);
router.get("/clients", listClients);
router.get("/clients/:userId", getClient);
router.patch("/clients/:userId", updateClient);
router.delete("/clients/:userId", deleteClient);

module.exports = router;
