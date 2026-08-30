// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyANobhlLG-NOFX6hCmP3ok04OEP74rLOD4",
    authDomain: "afterhours-pos.firebaseapp.com",
    projectId: "afterhours-pos",
    storageBucket: "afterhours-pos.firebasestorage.app",
    messagingSenderId: "966905394380",
    appId: "1:966905394380:web:d2d149bd760105078fbe69",
    measurementId: "G-HW0FRVLJH7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
const analytics = getAnalytics(app);