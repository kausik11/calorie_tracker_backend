const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

const routes = require("./routes");
const { notFoundHandler } = require("./middleware/notFound");
const { errorHandler } = require("./middleware/errorHandler");
const { swaggerDocs, swaggerUi } = require("./config/swagger");
const connectDB = require("./config/db");
const env = require("./config/env");

const app = express();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "error",
    message: "Too many requests. Please try again later.",
  },
});

app.use(helmet());
const allowAllOrigins = env.CORS_ORIGIN === "*";

app.use(
  cors({
    origin: allowAllOrigins ? "*" : env.CORS_ORIGIN,
    credentials: allowAllOrigins ? false : true,
  })
);
app.use(limiter);
app.use(morgan("dev"));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use(async (req, res, next) => {
  try {
    await connectDB(env.MONGO_URI);
    next();
  } catch (error) {
    next(error);
  }
});

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));
app.use("/api/v1", routes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
