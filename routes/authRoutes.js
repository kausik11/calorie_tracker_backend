const express = require("express");
const {
  register,
  login,
  firebaseLogin,
  refreshToken,
  logout,
  listSessions,
  revokeSession,
} = require("../controllers/authController");
const { protect } = require("../middleware/auth");
const validate = require("../middleware/validate");
const {
  registerValidator,
  loginValidator,
  firebaseLoginValidator,
  refreshTokenValidator,
} = require("../validators/authValidator");

const router = express.Router();

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user
 */
router.post("/register", registerValidator, validate, register);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login user
 */
router.post("/login", loginValidator, validate, login);

/**
 * @swagger
 * /api/v1/auth/firebase:
 *   post:
 *     summary: Login or create a backend user from a Firebase ID token
 */
router.post("/firebase", firebaseLoginValidator, validate, firebaseLogin);

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Refresh access token
 */
router.post("/refresh", refreshTokenValidator, validate, refreshToken);

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Logout user
 */
router.post("/logout", logout);

/**
 * @swagger
 * /api/v1/auth/sessions:
 *   get:
 *     summary: List active auth sessions for the signed-in user
 */
router.get("/sessions", protect, listSessions);

/**
 * @swagger
 * /api/v1/auth/sessions/{sessionId}:
 *   delete:
 *     summary: Revoke one active auth session
 */
router.delete("/sessions/:sessionId", protect, revokeSession);

module.exports = router;
