// net/firebaseConfig.ts — Firebase web config (plan §19). These keys are PUBLIC
// by design; security comes from the RTDB rules + authorized domains. Project:
// augmented-apple-game (RTDB us-central1, Anonymous Auth enabled).
export const firebaseConfig = {
  apiKey: 'AIzaSyBntFufsRT7aI8oG4tsQHunyzWNtY-PBCM',
  authDomain: 'augmented-apple-game.firebaseapp.com',
  databaseURL: 'https://augmented-apple-game-default-rtdb.firebaseio.com',
  projectId: 'augmented-apple-game',
  storageBucket: 'augmented-apple-game.firebasestorage.app',
  messagingSenderId: '185191169212',
  appId: '1:185191169212:web:32eb1da48b6c3d01eca4b9',
} as const;

/** True now that the values above are real. */
export const FIREBASE_CONFIGURED = true;
