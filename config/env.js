const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT) || 6000,
  MONGO_URI: process.env.MONGO_URI,
  MONGO_DNS_SERVERS: process.env.MONGO_DNS_SERVERS,
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
  FIREBASE_API_KEY: process.env.FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN,
  FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_WEB_APP_ID: process.env.FIREBASE_WEB_APP_ID,
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
  CORS_ORIGIN: process.env.CORS_ORIGIN || "*",
  RATE_LIMIT_MAX: Number(process.env.RATE_LIMIT_MAX) || 300,
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  CLOUDINARY_UPLOAD_FOLDER: process.env.CLOUDINARY_UPLOAD_FOLDER || "singhbackend/love-stories",
  CLOUDINARY_RECIPE_FOLDER: process.env.CLOUDINARY_RECIPE_FOLDER || "singhbackend/recipes",
  BREATH_TEST_TARGET_HOLD_TIME: Number(process.env.BREATH_TEST_TARGET_HOLD_TIME) || 60,
};

const requiredVars = [
  "MONGO_URI",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
];
if (env.NODE_ENV !== "test") {
  requiredVars.forEach((key) => {
    if (!env[key]) {
      console.warn(`Missing environment variable: ${key}`);
    }
  });
}

module.exports = env;
