import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

let app: FirebaseApp | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (app) return app;
  const config = {
    apiKey: import.meta.env.VITE_API_KEY as string,
    authDomain: import.meta.env.VITE_AUTH_DOMAIN as string,
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL as string,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
    appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
  };

  if (!config.apiKey || !config.databaseURL || !config.appId) {
    throw new Error('Config Firebase incompleta. Revisa variables VITE_* en .env');
  }

  app = getApps().length ? getApps()[0]! : initializeApp(config);
  return app;
}

export function getDB() {
  return getDatabase(getFirebaseApp());
}

