const { StatusCodes } = require("http-status-codes");
const User = require("../models/User");
const getFirebaseAdmin = require("../config/firebaseAdmin");
const env = require("../config/env");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");

const getBearerToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.split(" ")[1];
};

const getAllowedAdminEmails = () =>
  env.ADMIN_EMAILS.split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

const protectFirebaseAdmin = asyncHandler(async (req, res, next) => {
  const token = getBearerToken(req);
  if (!token) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Firebase ID token missing");
  }

  const firebase = getFirebaseAdmin();
  const decodedToken = await firebase.auth().verifyIdToken(token);
  const email = decodedToken.email?.toLowerCase();

  if (!email) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Firebase user email is required for admin access");
  }

  const allowedEmails = getAllowedAdminEmails();
  const adminUser = await User.findOne({ email }).select("_id name email role").lean();
  const isAllowedByEmail = allowedEmails.includes(email);
  const isAllowedByRole = adminUser?.role === "admin";

  if (!isAllowedByEmail && !isAllowedByRole) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Admin access denied");
  }

  req.firebaseUser = decodedToken;
  req.adminUser = adminUser || { email, role: "firebase-admin" };
  next();
});

module.exports = { protectFirebaseAdmin };
