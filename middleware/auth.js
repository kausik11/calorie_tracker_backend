const { StatusCodes } = require("http-status-codes");
const User = require("../models/User");
const Session = require("../models/Session");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");
const { verifyAccessToken } = require("../utils/jwt");

const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Authorization token missing");
  }

  const token = authHeader.split(" ")[1];
  const decoded = verifyAccessToken(token);

  const [user, session] = await Promise.all([
    User.findById(decoded.sub).select("-password -refreshTokenHash").lean(),
    decoded.sid
      ? Session.findOne({
          _id: decoded.sid,
          user: decoded.sub,
          revokedAt: { $exists: false },
          expiresAt: { $gt: new Date() },
        }).lean()
      : null,
  ]);

  if (!user) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "User no longer exists");
  }

  if (decoded.sid && !session) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Session is no longer active");
  }

  if (session) {
    await Session.findByIdAndUpdate(session._id, { lastUsedAt: new Date() });
  }

  req.user = user;
  req.authSession = session;
  next();
});

module.exports = { protect };
