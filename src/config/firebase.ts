import * as admin from "firebase-admin";
import * as path from "path";
import * as fs from "fs";

let firebaseApp: admin.app.App | null = null;

/**
 * Initialize Firebase Admin SDK
 * Supports both environment variable and file-based configuration
 */
const initializeFirebase = (): admin.app.App => {
    if (firebaseApp) {
        return firebaseApp;
    }

    try {
        // Option 1: Try to load from environment variable
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            firebaseApp = admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
            console.log("Firebase initialized from environment variable");
            return firebaseApp;
        }

        // Option 2: Try to load from file
        const serviceAccountPath = path.join(__dirname, "firebase-service-account.json");
        if (fs.existsSync(serviceAccountPath)) {
            const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf-8"));
            firebaseApp = admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
            console.log("Firebase initialized from service account file");
            return firebaseApp;
        }

        // If neither is available, log warning but don't crash
        console.warn("Firebase service account not found. Push notifications will be disabled.");
        console.warn("Add FIREBASE_SERVICE_ACCOUNT env var or firebase-service-account.json file.");

        // Return a dummy app that will fail gracefully
        return admin.initializeApp();
    } catch (error) {
        console.error("Failed to initialize Firebase:", error);
        throw error;
    }
};

// Initialize on import
const firebase = initializeFirebase();

export default firebase;
export { admin };
