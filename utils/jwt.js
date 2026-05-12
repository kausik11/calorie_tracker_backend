const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const ApiError = require("./apiError");
const { StatusCodes } = require("http-status-codes");
const env = require("../config/env");

const signAccessToken = (payload, options = {}) => {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    ...options,
  });
};

const signRefreshToken = (payload, options = {}) => {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
    ...options,
  });
};

const createTokenId = () => crypto.randomUUID();

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

const getTokenExpiryDate = (token) => {
  const decoded = jwt.decode(token);
  if (!decoded?.exp) {
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }

  return new Date(decoded.exp * 1000);
};

const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET);
  } catch (error) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid or expired access token");
  }
};

const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET);
  } catch (error) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid or expired refresh token");
  }
};

module.exports = {
  signAccessToken,
  signRefreshToken,
  createTokenId,
  hashToken,
  getTokenExpiryDate,
  verifyAccessToken,
  verifyRefreshToken,
};
