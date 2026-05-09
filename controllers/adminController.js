const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const { StatusCodes } = require("http-status-codes");

const User = require("../models/User");
const HealthAssessment = require("../models/HealthAssessment");
const DailyLog = require("../models/DailyLog");
const WaterLog = require("../models/WaterLog");
const WeightLog = require("../models/WeightLog");
const Reminder = require("../models/Reminder");
const PhotoAlbum = require("../models/PhotoAlbum");
const BreathTest = require("../models/BreathTest");
const Recipe = require("../models/Recipe");
const Food = require("../models/Food");
const Session = require("../models/Session");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const env = require("../config/env");

const compactConfig = (config) =>
  Object.fromEntries(Object.entries(config).filter(([, value]) => Boolean(value)));

const getEnvFirebaseConfig = () => {
  if (!env.FIREBASE_API_KEY || !env.FIREBASE_PROJECT_ID) {
    return null;
  }

  return compactConfig({
    apiKey: env.FIREBASE_API_KEY,
    authDomain: env.FIREBASE_AUTH_DOMAIN || `${env.FIREBASE_PROJECT_ID}.firebaseapp.com`,
    projectId: env.FIREBASE_PROJECT_ID,
    storageBucket: env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID,
    appId: env.FIREBASE_WEB_APP_ID,
  });
};

const getGoogleServicesConfig = () => {
  const filePath = path.resolve(__dirname, "../../google-services.json");
  const raw = fs.readFileSync(filePath, "utf8");
  const googleServices = JSON.parse(raw);
  const projectInfo = googleServices.project_info ?? {};
  const clientConfig = googleServices.client?.[0] ?? {};

  return compactConfig({
    apiKey: clientConfig.api_key?.[0]?.current_key ?? "",
    authDomain: projectInfo.project_id ? `${projectInfo.project_id}.firebaseapp.com` : "",
    projectId: projectInfo.project_id ?? "",
    storageBucket: projectInfo.storage_bucket ?? "",
    messagingSenderId: projectInfo.project_number ?? "",
  });
};

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const getAdminActor = async (req) => {
  if (req.adminUser?._id) {
    return req.adminUser;
  }

  const email = req.adminUser?.email || req.firebaseUser?.email;
  if (!email) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Admin email is required");
  }

  const normalizedEmail = email.toLowerCase();
  let admin = await User.findOne({ email: normalizedEmail });

  if (!admin) {
    admin = await User.create({
      name: normalizedEmail.split("@")[0],
      email: normalizedEmail,
      password: `firebase-admin-${Date.now()}`,
      role: "admin",
    });
  } else if (admin.role !== "admin") {
    admin.role = "admin";
    await admin.save();
  }

  return admin;
};

const getFirebaseConfig = asyncHandler(async (req, res) => {
  res.status(StatusCodes.OK).json({
    status: "success",
    data: getEnvFirebaseConfig() || getGoogleServicesConfig(),
  });
});

const getSummary = asyncHandler(async (req, res) => {
  const [users, admins, assessments, dailyLogs, waterLogs, weightLogs, foods, recipes] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: "admin" }),
    HealthAssessment.countDocuments(),
    DailyLog.countDocuments(),
    WaterLog.countDocuments(),
    WeightLog.countDocuments(),
    Food.countDocuments(),
    Recipe.countDocuments({ isPublic: true }),
  ]);

  res.status(StatusCodes.OK).json({
    status: "success",
    data: { users, admins, assessments, dailyLogs, waterLogs, weightLogs, foods, recipes },
  });
});

const listCatalogFoods = asyncHandler(async (req, res) => {
  const q = String(req.query.q || "").trim();
  const filter = q ? { $text: { $search: q } } : {};
  const foods = await Food.find(filter)
    .sort(q ? { score: { $meta: "textScore" } } : { createdAt: -1 })
    .select(q ? { score: { $meta: "textScore" } } : {})
    .limit(100)
    .lean();

  res.status(StatusCodes.OK).json({ status: "success", data: foods });
});

const createCatalogFood = asyncHandler(async (req, res) => {
  const admin = await getAdminActor(req);
  const food = await Food.create({
    ...req.body,
    isVerified: true,
    createdBy: admin._id,
  });

  res.status(StatusCodes.CREATED).json({
    status: "success",
    message: "Food added to catalog",
    data: food,
  });
});

const deleteCatalogFood = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.foodId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid foodId");
  }

  const deleted = await Food.findByIdAndDelete(req.params.foodId).lean();
  if (!deleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Food not found");
  }

  res.status(StatusCodes.OK).json({ status: "success", message: "Food deleted" });
});

const listCatalogRecipes = asyncHandler(async (req, res) => {
  const q = String(req.query.q || "").trim();
  const publicFilter = { isPublic: true };
  const filter = q ? { $and: [publicFilter, { $text: { $search: q } }] } : publicFilter;
  const recipes = await Recipe.find(filter)
    .sort(q ? { score: { $meta: "textScore" } } : { createdAt: -1 })
    .select(q ? { score: { $meta: "textScore" } } : {})
    .limit(100)
    .lean();

  res.status(StatusCodes.OK).json({ status: "success", data: recipes });
});

const createCatalogRecipe = asyncHandler(async (req, res) => {
  const admin = await getAdminActor(req);
  const recipe = await Recipe.create({
    user: admin._id,
    title: req.body.title,
    ingredients: req.body.ingredients,
    directions: req.body.directions,
    serves: req.body.serves,
    prepTime: req.body.prepTime,
    cookTime: req.body.cookTime,
    imageUrl: req.body.imageUrl || "",
    imagePublicId: "",
    isPublic: true,
  });

  res.status(StatusCodes.CREATED).json({
    status: "success",
    message: "Recipe added to catalog",
    data: recipe,
  });
});

const deleteCatalogRecipe = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.recipeId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid recipeId");
  }

  const deleted = await Recipe.findOneAndDelete({ _id: req.params.recipeId, isPublic: true }).lean();
  if (!deleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Recipe not found");
  }

  res.status(StatusCodes.OK).json({ status: "success", message: "Recipe deleted" });
});

const listClients = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const q = String(req.query.q || "").trim();
  const filter = q
    ? {
        $or: [
          { name: { $regex: q, $options: "i" } },
          { email: { $regex: q, $options: "i" } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    User.find(filter)
      .select("-password -refreshTokenHash")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  const userIds = users.map((user) => user._id);
  const [assessments, latestDailyLogs, latestWeights] = await Promise.all([
    HealthAssessment.find({ user: { $in: userIds } }).lean(),
    DailyLog.find({ user: { $in: userIds } }).sort({ date: -1 }).lean(),
    WeightLog.find({ user: { $in: userIds } }).sort({ date: -1 }).lean(),
  ]);

  const assessmentMap = new Map(assessments.map((item) => [item.user.toString(), item]));
  const dailyLogMap = new Map();
  const weightMap = new Map();

  latestDailyLogs.forEach((log) => {
    const key = log.user.toString();
    if (!dailyLogMap.has(key)) dailyLogMap.set(key, log);
  });

  latestWeights.forEach((log) => {
    const key = log.user.toString();
    if (!weightMap.has(key)) weightMap.set(key, log);
  });

  res.status(StatusCodes.OK).json({
    status: "success",
    data: {
      page,
      limit,
      total,
      clients: users.map((user) => ({
        ...user,
        healthAssessment: assessmentMap.get(user._id.toString()) || null,
        latestDailyLog: dailyLogMap.get(user._id.toString()) || null,
        latestWeightLog: weightMap.get(user._id.toString()) || null,
      })),
    },
  });
});

const getClient = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  if (!isValidObjectId(userId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid userId");
  }

  const [user, healthAssessment, dailyLogs, waterLogs, weightLogs, reminders, photos, breathTests, recipes, sessions] =
    await Promise.all([
      User.findById(userId).select("-password -refreshTokenHash").lean(),
      HealthAssessment.findOne({ user: userId }).lean(),
      DailyLog.find({ user: userId }).sort({ date: -1 }).limit(30).populate("meals.food").lean(),
      WaterLog.find({ user: userId }).sort({ date: -1 }).limit(30).lean(),
      WeightLog.find({ user: userId }).sort({ date: -1 }).limit(30).lean(),
      Reminder.find({ user: userId }).sort({ createdAt: -1 }).lean(),
      PhotoAlbum.find({ user: userId }).sort({ createdAt: -1 }).limit(30).lean(),
      BreathTest.find({ user: userId }).sort({ createdAt: -1 }).limit(30).lean(),
      Recipe.find({ user: userId }).sort({ createdAt: -1 }).limit(30).lean(),
      Session.find({ user: userId }).sort({ lastUsedAt: -1 }).select("_id userAgent ip expiresAt lastUsedAt revokedAt createdAt").lean(),
    ]);

  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Client not found");
  }

  res.status(StatusCodes.OK).json({
    status: "success",
    data: { user, healthAssessment, dailyLogs, waterLogs, weightLogs, reminders, photos, breathTests, recipes, sessions },
  });
});

const updateClient = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  if (!isValidObjectId(userId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid userId");
  }

  const allowedFields = [
    "name",
    "email",
    "age",
    "gender",
    "height",
    "weight",
    "targetWeight",
    "goal",
    "dailyCalorieTarget",
    "dailyWaterTarget",
    "role",
  ];
  const updates = {};

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  const user = await User.findByIdAndUpdate(userId, updates, {
    new: true,
    runValidators: true,
  })
    .select("-password -refreshTokenHash")
    .lean();

  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Client not found");
  }

  res.status(StatusCodes.OK).json({
    status: "success",
    message: "Client updated",
    data: user,
  });
});

const deleteClient = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  if (!isValidObjectId(userId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid userId");
  }

  const user = await User.findById(userId).lean();
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Client not found");
  }

  await Promise.all([
    User.deleteOne({ _id: userId }),
    HealthAssessment.deleteOne({ user: userId }),
    DailyLog.deleteMany({ user: userId }),
    WaterLog.deleteMany({ user: userId }),
    WeightLog.deleteMany({ user: userId }),
    Reminder.deleteMany({ user: userId }),
    PhotoAlbum.deleteMany({ user: userId }),
    BreathTest.deleteMany({ user: userId }),
    Recipe.deleteMany({ user: userId }),
    Session.deleteMany({ user: userId }),
  ]);

  res.status(StatusCodes.OK).json({
    status: "success",
    message: "Client and related data deleted",
  });
});

module.exports = {
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
};
