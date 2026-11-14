import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';


// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAX7NIrqSvZSsZi5rLymNg2xvm5V9uzAdY",
  authDomain: "spark-search-626e0.firebaseapp.com",
  projectId: "spark-search-626e0",
  storageBucket: "spark-search-626e0.firebasestorage.app",
  messagingSenderId: "177696627328",
  appId: "1:177696627328:web:41d9b7046c48b9c8df6465"
};

// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);