import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
// Initialize Firestore using the configured database ID
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
