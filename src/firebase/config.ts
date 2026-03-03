const fallbackFirebaseConfig = {
  projectId: 'studio-463624611-f0333',
  appId: '1:713811885851:web:a89f6312e31e2018dcddbe',
  apiKey: 'AIzaSyBrkbOKvUYfgrss2sJDcmXxy2MceR7hiks',
  authDomain: 'studio-463624611-f0333.firebaseapp.com',
  measurementId: '',
  messagingSenderId: '713811885851',
};

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || fallbackFirebaseConfig.apiKey,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || fallbackFirebaseConfig.authDomain,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || fallbackFirebaseConfig.projectId,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || fallbackFirebaseConfig.messagingSenderId,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || fallbackFirebaseConfig.appId,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || fallbackFirebaseConfig.measurementId,
};
