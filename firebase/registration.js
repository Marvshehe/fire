// fire.js (updated to remove tab logic, add loading indicators, and fix post-registration behavior)
// No more showTab, since sections are separate and always visible.
// Removed redirect to login tab; instead, show a message encouraging login.
// Added loading show/hide for better UX.
// Ignored the old registration.js as it's incompatible and non-Firebase.

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDu8T1FY8-lxmpo-hqU4uUekr6uBQgb9_4",
  authDomain: "fir-e464e.firebaseapp.com",
  projectId: "fir-e464e",
  storageBucket: "fir-e464e.firebasestorage.app",
  messagingSenderId: "287727936870",
  appId: "1:287727936870:web:967da4c2458f052d5214a7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Handle registration form submission
document.getElementById("registerForm").addEventListener("submit", function(e) {
  e.preventDefault();

  const email = document.getElementById("registerEmail").value;
  const password = document.getElementById("registerPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  const errorMessage = document.getElementById("registerErrorMessage");
  const loading = document.getElementById("register-loading");

  // Clear previous error messages
  errorMessage.textContent = "";
  errorMessage.style.color = "red";

  // Show loading
  loading.style.display = 'block';

  // Validate inputs
  if (!email || !password || !confirmPassword) {
    errorMessage.textContent = "Please fill in all fields.";
    loading.style.display = 'none';
    return;
  }

  if (password !== confirmPassword) {
    errorMessage.textContent = "Passwords do not match.";
    loading.style.display = 'none';
    return;
  }

  createUserWithEmailAndPassword(auth, email, password)
    .then(async (userCredential) => {
      // Signed up successfully
      const user = userCredential.user;

      try {
        // Create user document in Firestore
        await setDoc(doc(db, "users", user.uid), {
          email: user.email,
          uid: user.uid,
          emailVerified: false,
          createdAt: serverTimestamp(),
          lastLoginAt: serverTimestamp()
        });

        // Send email verification
        await sendEmailVerification(user);

        errorMessage.textContent = "Registration successful! Please check your email for verification. You can now log in on the left.";
        errorMessage.style.color = "green";

        // Clear form
        document.getElementById("registerForm").reset();
      } catch (firestoreError) {
        console.error("Error creating user document:", firestoreError);
        errorMessage.textContent = "Registration successful but there was an issue saving user data.";
        errorMessage.style.color = "orange";
      }
      loading.style.display = 'none';
    })
    .catch((error) => {
      loading.style.display = 'none';
      const errorCode = error.code;
      let errorMsg = error.message;

      // Provide user-friendly error messages
      switch (errorCode) {
        case 'auth/email-already-in-use':
          errorMsg = "This email is already registered. Please use a different email or try logging in.";
          break;
        case 'auth/weak-password':
          errorMsg = "Password is too weak. Please use at least 6 characters.";
          break;
        case 'auth/invalid-email':
          errorMsg = "Please enter a valid email address.";
          break;
        default:
          errorMsg = error.message;
      }

      errorMessage.textContent = errorMsg;
    });
});

// Handle login form submission
document.getElementById("loginForm").addEventListener("submit", function(e) {
  e.preventDefault();

  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;
  const loginErrorMessage = document.getElementById("loginErrorMessage");
  const loading = document.getElementById("login-loading");

  // Clear previous error messages
  loginErrorMessage.textContent = "";
  loginErrorMessage.style.color = "red";

  // Show loading
  loading.style.display = 'block';

  // Validate inputs
  if (!email || !password) {
    loginErrorMessage.textContent = "Please fill in all fields.";
    loading.style.display = 'none';
    return;
  }

  signInWithEmailAndPassword(auth, email, password)
    .then(async (userCredential) => {
      // Signed in successfully
      const user = userCredential.user;

      // Check if email is verified
      if (!user.emailVerified) {
        loginErrorMessage.textContent = "Please verify your email before logging in. Check your inbox for the verification link.";
        loginErrorMessage.style.color = "orange";

        // Offer to resend verification email
        const resendVerification = confirm("Your email is not verified. Would you like us to resend the verification email?");
        if (resendVerification) {
          try {
            await sendEmailVerification(user);
            alert("Verification email sent! Please check your inbox.");
          } catch (error) {
            console.error("Error sending verification email:", error);
            alert("Error sending verification email. Please try again later.");
          }
        }

        // Sign out the user since email is not verified
        await auth.signOut();
        loading.style.display = 'none';
        return;
      }

      try {
        // Update user document in Firestore with last login time
        await setDoc(doc(db, "users", user.uid), {
          lastLoginAt: serverTimestamp(),
          emailVerified: true
        }, { merge: true });

        // Get user data from Firestore
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          console.log("User data:", userDoc.data());
        }

        loginErrorMessage.textContent = "Login successful! Redirecting...";
        loginErrorMessage.style.color = "green";

        // Redirect to dashboard
        setTimeout(() => {
          window.location.href = "dashboard.html";
        }, 1000);
      } catch (firestoreError) {
        console.error("Error updating user data:", firestoreError);
        // Allow login even if Firestore update fails
        loginErrorMessage.textContent = "Login successful! Redirecting...";
        loginErrorMessage.style.color = "green";

        setTimeout(() => {
          window.location.href = "dashboard.html";
        }, 1000);
      }
      loading.style.display = 'none';
    })
    .catch((error) => {
      loading.style.display = 'none';
      const errorCode = error.code;
      let errorMsg = error.message;

      // Provide user-friendly error messages
      switch (errorCode) {
        case 'auth/user-not-found':
          errorMsg = "No account found with this email. Please sign up first.";
          break;
        case 'auth/wrong-password':
          errorMsg = "Incorrect password. Please try again.";
          break;
        case 'auth/invalid-email':
          errorMsg = "Please enter a valid email address.";
          break;
        case 'auth/too-many-requests':
          errorMsg = "Too many failed login attempts. Please try again later.";
          break;
        default:
          errorMsg = error.message;
      }

      loginErrorMessage.textContent = errorMsg;
    });
});

// Monitor authentication state changes
onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log("User is signed in:", user.email);

    // Update email verification status in Firestore if it has changed
    if (user.emailVerified) {
      try {
        await setDoc(doc(db, "users", user.uid), {
          emailVerified: true
        }, { merge: true });
      } catch (error) {
        console.error("Error updating email verification status:", error);
      }
    }
  } else {
    console.log("User is signed out");
  }
});

// Optional: Function to resend verification email
function resendVerificationEmail() {
  const user = auth.currentUser;
  if (user && !user.emailVerified) {
    sendEmailVerification(user)
      .then(() => {
        alert("Verification email sent! Please check your inbox.");
      })
      .catch((error) => {
        console.error("Error sending verification email:", error);
        alert("Error sending verification email. Please try again later.");
      });
  } else if (user && user.emailVerified) {
    alert("Your email is already verified!");
  } else {
    alert("No user is currently logged in.");
  }
}