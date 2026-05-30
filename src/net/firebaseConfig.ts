// net/firebaseConfig.ts — PLACEHOLDER (plan §19).
// Firebase web config keys are PUBLIC by design; real security comes from the
// RTDB rules (firebase/database.rules.json) + authorized domains + (optional)
// App Check. Replace the placeholders below with the config object from the
// Firebase console (Project settings -> Your apps -> Web app), then wire the
// `net`/`profile` modules in Phase 2.
//
// TODO(user): create the Firebase project and paste the real values here.
export const firebaseConfig = {
  apiKey: 'REPLACE_ME',
  authDomain: 'REPLACE_ME.firebaseapp.com',
  databaseURL: 'https://REPLACE_ME-default-rtdb.firebaseio.com',
  projectId: 'REPLACE_ME',
  storageBucket: 'REPLACE_ME.appspot.com',
  messagingSenderId: 'REPLACE_ME',
  appId: 'REPLACE_ME',
} as const;

/** Set to true only after the values above are filled in. */
export const FIREBASE_CONFIGURED = false;
