require("dotenv").config();

const admin = require("firebase-admin");
const serviceAccount = require("../sa-key.json");

// Avoid re-initializing the default app during local reloads.
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
}

module.exports.storage = admin.app().storage().bucket();