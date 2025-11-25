// Firebase configuration
// EduConnect Firebase Project Configuration
const firebaseConfig = {
  apiKey: "AIzaSyB-ttA0Wanu5FlGD-pKV6kADqvOphEc_rA",
  authDomain: "educonnect-6dbc6.firebaseapp.com",
  projectId: "educonnect-6dbc6",
  storageBucket: "educonnect-6dbc6.firebasestorage.app",
  messagingSenderId: "908642658470",
  appId: "1:908642658470:web:cac53595fe21df53076c67"
};

// Initialize Firebase (using compat SDK for compatibility with existing code)
firebase.initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { auth, db };
}

