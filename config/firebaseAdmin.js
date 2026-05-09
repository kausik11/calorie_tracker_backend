const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");
const env = require("./env");

const getProjectId = () => {
  if (env.FIREBASE_PROJECT_ID) {
    return env.FIREBASE_PROJECT_ID;
  }

  try {
    const googleServicesPath = path.resolve(__dirname, "../../google-services.json");
    const googleServices = JSON.parse(fs.readFileSync(googleServicesPath, "utf8"));
    return googleServices.project_info?.project_id;
  } catch (error) {
    return undefined;
  }
};

const getFirebaseAdmin = () => {
  if (admin.apps.length) {
    return admin;
  }

  admin.initializeApp({
    projectId: getProjectId(),
  });

  return admin;
};

module.exports = getFirebaseAdmin;
