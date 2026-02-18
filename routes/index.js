const express = require("express");
const authRoutes = require("./authRoutes");
const userRoutes = require("./userRoutes");
const foodRoutes = require("./foodRoutes");
const dailyLogRoutes = require("./dailyLogRoutes");
const waterRoutes = require("./waterRoutes");
const weightRoutes = require("./weightRoutes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/foods", foodRoutes);
router.use("/logs", dailyLogRoutes);
router.use("/water", waterRoutes);
router.use("/weight", weightRoutes);

module.exports = router;
