const { StatusCodes } = require("http-status-codes");
const User = require("../models/User");
const Session = require("../models/Session");
const HealthAssessment = require("../models/HealthAssessment");
const getFirebaseAdmin = require("../config/firebaseAdmin");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  createTokenId,
  hashToken,
  getTokenExpiryDate,
} = require("../utils/jwt");

const buildUserPayload = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  age: user.age,
  gender: user.gender,
  height: user.height,
  weight: user.weight,
  goal: user.goal,
  dailyCalorieTarget: user.dailyCalorieTarget,
  role: user.role,
});

const buildAuthResponse = (user, tokens, session) => ({
  status: "success",
  data: {
    user: buildUserPayload(user),
    session: {
      id: session._id,
      expiresAt: session.expiresAt,
    },
    ...tokens,
  },
});

const issueTokens = ({ user, sessionId }) => {
  const refreshTokenId = createTokenId();
  const tokenPayload = { sub: user._id.toString(), role: user.role, sid: sessionId.toString() };
  const accessToken = signAccessToken(tokenPayload);
  const refreshToken = signRefreshToken(tokenPayload, { jwtid: refreshTokenId });

  return {
    accessToken,
    refreshToken,
    refreshTokenId,
    refreshTokenHash: hashToken(refreshToken),
    refreshTokenExpiresAt: getTokenExpiryDate(refreshToken),
  };
};

const createSession = async (req, user) => {
  const session = new Session({
    user: user._id,
    userAgent: req.get("user-agent"),
    ip: req.ip,
  });
  const tokens = issueTokens({ user, sessionId: session._id });

  session.refreshTokenHash = tokens.refreshTokenHash;
  session.refreshTokenId = tokens.refreshTokenId;
  session.expiresAt = tokens.refreshTokenExpiresAt;
  session.lastUsedAt = new Date();
  await session.save();

  return { session, tokens };
};

const ACTIVITY_FACTORS = {
  low: 1.2,
  moderate: 1.375,
  high: 1.55,
  very_high: 1.725,
};

const calculateAge = (dateOfBirth) => {
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getUTCFullYear() - dob.getUTCFullYear();
  const monthDiff = today.getUTCMonth() - dob.getUTCMonth();
  const isBeforeBirthday = monthDiff < 0 || (monthDiff === 0 && today.getUTCDate() < dob.getUTCDate());

  return isBeforeBirthday ? age - 1 : age;
};

const roundToTwo = (value) => Number(value.toFixed(2));

const convertHeightToCm = ({ height, heightUnit }) => {
  if (heightUnit === "cm") {
    return Number(String(height).trim());
  }

  const numericHeight = Number(String(height).trim());
  const feet = Math.trunc(numericHeight);
  const inchText = String(height).trim().split(".")[1] || "0";
  const inches = Number(inchText.length === 1 ? inchText : inchText.slice(0, 2));

  return feet * 30.48 + inches * 2.54;
};

const convertWeightToKg = ({ weight, weightUnit }) => {
  const numericWeight = Number(String(weight).trim());
  return weightUnit === "lb" ? numericWeight * 0.45359237 : numericWeight;
};

const calculateDailyCalorieTarget = ({ sex, currentWeightKg, heightCm, age, activityLevel, direction }) => {
  const base = 10 * currentWeightKg + 6.25 * heightCm - 5 * age + (sex === "male" ? 5 : -161);
  const maintenance = base * ACTIVITY_FACTORS[activityLevel];
  const adjusted = maintenance + (direction === "lose_weight" ? -500 : direction === "gain_weight" ? 500 : 0);

  return Math.min(Math.max(Math.round(adjusted), 800), 10000);
};

const mapDirectionToUserGoal = (direction) => {
  if (direction === "lose_weight") return "weight_loss";
  if (direction === "gain_weight") return "weight_gain";
  return "maintenance";
};

const saveFirebaseOnboarding = async (user, onboarding) => {
  if (!onboarding) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Onboarding answers are missing from Firebase login request");
  }

  const requiredFields = ["direction", "mainGoal", "challenges", "height", "heightUnit", "weight", "weightUnit", "dateOfBirth", "sex", "activityLevel"];
  const missingFields = requiredFields.filter((field) => {
    const value = onboarding[field];
    return value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);
  });

  if (missingFields.length) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Onboarding answers are incomplete: ${missingFields.join(", ")}`
    );
  }

  const heightCm = roundToTwo(convertHeightToCm(onboarding));
  const currentWeightKg = roundToTwo(convertWeightToKg(onboarding));
  const age = calculateAge(onboarding.dateOfBirth);
  const dailyCalorieTarget = calculateDailyCalorieTarget({
    sex: onboarding.sex,
    currentWeightKg,
    heightCm,
    age,
    activityLevel: onboarding.activityLevel,
    direction: onboarding.direction,
  });
  const firstName = String(onboarding.firstName || user.name || "").trim();

  const assessment = await HealthAssessment.findOneAndUpdate(
    { user: user._id },
    {
      user: user._id,
      firstName,
      direction: onboarding.direction,
      mainGoal: onboarding.mainGoal,
      challenges: onboarding.challenges,
      heightUnit: onboarding.heightUnit,
      height: String(onboarding.height).trim(),
      heightCm,
      weightUnit: onboarding.weightUnit,
      weight: String(onboarding.weight).trim(),
      currentWeightKg,
      dateOfBirth: new Date(onboarding.dateOfBirth),
      age,
      sex: onboarding.sex,
      activityLevel: onboarding.activityLevel,
      dailyCalorieTarget,
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  ).lean();

  await User.findByIdAndUpdate(
    user._id,
    {
      ...(firstName ? { name: firstName } : {}),
      age,
      gender: onboarding.sex,
      height: heightCm,
      weight: currentWeightKg,
      goal: mapDirectionToUserGoal(onboarding.direction),
      dailyCalorieTarget,
    },
    { runValidators: true }
  );

  return assessment;
};

const maybeSaveFirebaseOnboarding = async (user, onboarding) => {
  if (onboarding) {
    return saveFirebaseOnboarding(user, onboarding);
  }

  return HealthAssessment.findOne({ user: user._id }).lean();
};

const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existing = await User.findOne({ email }).lean();
  if (existing) {
    throw new ApiError(StatusCodes.CONFLICT, "User already exists with this email");
  }

  const user = await User.create({ name, email, password });
  const { session, tokens } = await createSession(req, user);

  res
    .status(StatusCodes.CREATED)
    .json(buildAuthResponse(user, tokens, session));
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid email or password");
  }

  const { session, tokens } = await createSession(req, user);

  res.status(StatusCodes.OK).json(buildAuthResponse(user, tokens, session));
});

const firebaseLogin = asyncHandler(async (req, res) => {
  const { idToken, onboarding } = req.body;
  const firebase = getFirebaseAdmin();
  const decodedToken = await firebase.auth().verifyIdToken(idToken);
  const email = decodedToken.email?.toLowerCase();

  if (!email) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Firebase account email is required");
  }

  const name = decodedToken.name || email.split("@")[0];
  let user = await User.findOne({ email });

  if (!user) {
    user = await User.create({
      name,
      email,
      password: `firebase-${decodedToken.uid}-${Date.now()}`,
    });
  } else if (!user.name || user.name === user.email) {
    user.name = name;
    await user.save();
  }

  const assessment = await maybeSaveFirebaseOnboarding(user, onboarding);
  const refreshedUser = await User.findById(user._id);
  const { session, tokens } = await createSession(req, refreshedUser || user);

  const response = buildAuthResponse(refreshedUser || user, tokens, session);
  response.data.healthAssessment = assessment;

  res.status(StatusCodes.OK).json(response);
});

const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body;
  const decoded = verifyRefreshToken(token);

  if (!decoded.sid || !decoded.jti) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Refresh token is missing session data");
  }

  const session = await Session.findOne({
    _id: decoded.sid,
    user: decoded.sub,
    revokedAt: { $exists: false },
    expiresAt: { $gt: new Date() },
  }).select("+refreshTokenHash +refreshTokenId");

  if (!session) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Refresh token is invalid");
  }

  const tokenHash = hashToken(token);
  const isValidStoredToken =
    tokenHash === session.refreshTokenHash && decoded.jti === session.refreshTokenId;

  if (!isValidStoredToken) {
    session.revokedAt = new Date();
    await session.save();
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Refresh token does not match");
  }

  const user = await User.findById(decoded.sub);
  if (!user) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "User no longer exists");
  }

  const tokens = issueTokens({ user, sessionId: session._id });
  session.refreshTokenHash = tokens.refreshTokenHash;
  session.refreshTokenId = tokens.refreshTokenId;
  session.expiresAt = tokens.refreshTokenExpiresAt;
  session.lastUsedAt = new Date();
  await session.save();

  res.status(StatusCodes.OK).json({
    status: "success",
    data: {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      session: {
        id: session._id,
        expiresAt: session.expiresAt,
      },
    },
  });
});

const logout = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body;
  if (!token) {
    return res.status(StatusCodes.OK).json({
      status: "success",
      message: "Logged out",
    });
  }

  try {
    const decoded = verifyRefreshToken(token);
    if (decoded.sid) {
      await Session.findOneAndUpdate(
        { _id: decoded.sid, user: decoded.sub },
        { revokedAt: new Date() }
      );
    }
  } catch (error) {
    // Idempotent logout: return success even if token is invalid.
  }

  return res.status(StatusCodes.OK).json({
    status: "success",
    message: "Logged out",
  });
});

const listSessions = asyncHandler(async (req, res) => {
  const sessions = await Session.find({
    user: req.user._id,
    revokedAt: { $exists: false },
    expiresAt: { $gt: new Date() },
  })
    .sort({ lastUsedAt: -1 })
    .select("_id userAgent ip expiresAt lastUsedAt createdAt")
    .lean();

  res.status(StatusCodes.OK).json({
    status: "success",
    data: sessions.map((session) => ({
      ...session,
      isCurrent: req.authSession?._id.toString() === session._id.toString(),
    })),
  });
});

const revokeSession = asyncHandler(async (req, res) => {
  const session = await Session.findOneAndUpdate(
    {
      _id: req.params.sessionId,
      user: req.user._id,
      revokedAt: { $exists: false },
    },
    { revokedAt: new Date() },
    { new: true }
  ).lean();

  if (!session) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Session not found");
  }

  res.status(StatusCodes.OK).json({
    status: "success",
    message: "Session revoked",
  });
});

module.exports = { register, login, firebaseLogin, refreshToken, logout, listSessions, revokeSession };
