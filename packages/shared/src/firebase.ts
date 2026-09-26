import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};
export const configurationError =
  !config.apiKey || !config.projectId || !config.appId
    ? "Falta la configuración de Firebase. Completa el archivo .env de esta aplicación y reinicia Metro."
    : null;
function createServices() {
  if (configurationError) return null;
  const app = initializeApp(config);
  const db = getFirestore(app);
  const storage = config.storageBucket ? getStorage(app) : null;
  const host = process.env.EXPO_PUBLIC_EMULATOR_HOST;
  if (host) {
    connectFirestoreEmulator(db, host, 8080);
  }
  return { app, db, storage };
}
export const services = createServices();
