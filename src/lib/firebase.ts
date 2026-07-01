import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentSingleTabManager, getFirestore, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBUXJzolEAonIoJQKUBWsWd5-6R1_l2-qE',
  authDomain: 'gradly-tuition-manager.firebaseapp.com',
  projectId: 'gradly-tuition-manager',
  storageBucket: 'gradly-tuition-manager.firebasestorage.app',
  messagingSenderId: '617870599581',
  appId: '1:617870599581:web:0f3c2ac5184c91caf3bb74',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Only enable persistence in the browser (not during SSR)
let db: ReturnType<typeof getFirestore>;
if (typeof window !== 'undefined') {
  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentSingleTabManager({}) }),
    });
  } catch {
    db = getFirestore(app);
  }
} else {
  db = getFirestore(app);
}

// Pre-warm the Firestore connection immediately on page load.
// Starts the WebSocket before any page-specific queries run.
if (typeof window !== 'undefined') {
  getDoc(doc(db, 'config', 'teacher')).catch(() => {});
}

export { db };
export default app;
