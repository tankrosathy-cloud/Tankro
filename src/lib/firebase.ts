import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  projectId: "sonorous-hue-b3bk6",
  appId: "1:684252112832:web:4bde91dd76c6ca25e14a25",
  apiKey: "AIzaSyDY7aBep_asEUrFm-EYf4OOlKxOaLHbGrI",
  authDomain: "sonorous-hue-b3bk6.firebaseapp.com",
  firestoreDatabaseId: "tankro-erode",
  storageBucket: "sonorous-hue-b3bk6.firebasestorage.app",
  messagingSenderId: "684252112832"
};

const app = initializeApp(firebaseConfig);

// Initialize Firestore with modern persistence cache
export const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true,
  localCache: persistentLocalCache({tabManager: persistentMultipleTabManager()})
}, firebaseConfig.firestoreDatabaseId);

export const auth = getAuth(app);
