# 📱 Phone Authentication Setup Guide - Shurokkha AI

This guide completes the Firebase phone OTP authentication system for Shurokkha AI.

---

## ✅ What's Already Done

### Backend Configuration
- ✓ Firebase Auth SDK integrated with phone authentication support
- ✓ Firestore setup for storing user profiles
- ✓ Phone number normalization (+880 country code prefix)
- ✓ reCAPTCHA support for bot prevention

### Frontend Implementation
- ✓ **Login page** (`src/pages/Login.jsx`): Phone + OTP flow
- ✓ **Register page** (`src/pages/Register.jsx`): Mobile signup with profile collection
- ✓ **Profile page** (`src/pages/Profile.jsx`): Display user phone number
- ✓ **Auth Context** (`src/contexts/AuthContext.jsx`): Firebase phone auth state management
- ✓ **Protected routes** in `App.jsx`: Redirect unauthenticated users to login

### Firestore Database Structure
```
users/{uid}
  ├── name: string
  ├── age: number
  ├── phone: string (normalized +8801XXXXXXXXX)
  ├── bloodGroup: string
  ├── location: string
  └── createdAt: timestamp
```

---

## 🚀 Quick Start

### Step 1: Verify Firebase Console (Already Done)
You've enabled Phone authentication in Firebase Console. Verify these are set:

1. **Authentication → Sign-in method**
   - Phone provider should be **enabled** ✓

2. **Authentication → Authorized domains**
   - Should include: `http://localhost`, `http://127.0.0.1`
   - Add your deployed domain if applicable

### Step 2: Install Dependencies
```bash
npm install
cd server
npm install
cd ..
```

### Step 3: Configure Environment
Create or update `server/.env`:
```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3001
```

### Step 4: Start the Application

**Terminal 1 - Backend:**
```bash
cd server
npm start
# Server runs on http://localhost:3001
```

**Terminal 2 - Frontend:**
```bash
npm run dev
# App runs on http://localhost:5173
```

---

## 📲 Testing Phone Authentication

### Test Scenario 1: Register New User
1. Open the app → Click "নিবন্ধন করুন" (Register)
2. Fill profile details:
   - Name: Test User
   - Age: 30
   - Mobile: +8801712345678 (or your number)
   - Blood Group: A+
   - Location: Dhaka
3. Check consent box → Click "পরবর্তী ধাপ →"
4. **OTP will be sent to your phone**
5. Enter the 6-digit OTP code
6. Click "নিবন্ধন সম্পন্ন করুন"
7. ✅ Should be logged in and see Profile page

### Test Scenario 2: Login with Phone
1. Go back to login or open `/login` directly
2. Enter your registered phone: +8801712345678
3. Click "OTP পাঠান"
4. **OTP will be sent to your phone**
5. Enter the 6-digit code
6. Click "লগইন করুন"
7. ✅ Should be logged in

### Test Scenario 3: Verify Firestore Storage
1. Open [Firebase Console](https://console.firebase.google.com/)
2. Navigate to **Firestore Database**
3. Check `users` collection
4. Your user document should exist with all profile data

---

## 🔐 Security Features

### Phone Number Security
- Phone numbers are normalized to international format (+880 prefix)
- Invalid formats are rejected with clear error messages
- Firebase handles phone verification via SMS OTP

### Data Protection
- User profiles stored securely in Firestore
- Phone numbers not stored separately; Firebase Auth handles this
- reCAPTCHA prevents automated abuse

### Session Management
- Sessions persist via Firebase Auth state
- Logout clears all session data
- LocalStorage fallback for testing without Firebase

---

## 🛠️ Troubleshooting

### Issue: "OTP পাঠাতে ব্যর্থ হয়েছে" (Failed to send OTP)
**Solution:**
- Verify `http://localhost` is in authorized domains in Firebase Console
- Check your phone number format: must be +880XXXXXXXXX
- Ensure you don't have too many OTP requests (Firebase has rate limits)

### Issue: "OTP যাচাই ব্যর্থ হয়েছে" (OTP verification failed)
**Solution:**
- Ensure you entered the correct OTP code
- OTP codes expire after a few minutes; request a new one if needed
- Check that your phone received the SMS (sometimes delayed)

### Issue: User not appearing in Firestore
**Solution:**
- Check browser console for Firestore errors
- Verify Firestore database permissions allow reads/writes for authenticated users
- Check that you're logged into the correct Firebase project

### Issue: Recaptcha error
**Solution:**
- This is expected if you're not on an authorized domain
- Use `http://localhost:5173` for local testing
- reCAPTCHA is invisible and usually works automatically

---

## 📋 File Structure - Auth System

```
src/
├── firebase/
│   └── config.js                 # Firebase initialization + Auth config
├── contexts/
│   └── AuthContext.jsx           # Auth state provider (logout only)
├── pages/
│   ├── Login.jsx                 # Phone + OTP login
│   ├── Register.jsx              # Mobile signup with profile
│   ├── Profile.jsx               # Display user info + phone
│   ├── DataEntry.jsx             # Protected route (health data)
│   └── Emergency.jsx             # Protected route (SOS)
└── App.jsx                       # ProtectedRoute component
```

---

## ✨ User Flow

```
┌─────────────────┐
│   App Opens     │
└────────┬────────┘
         │
    Has session?
   /      |      \
  Yes     No     Check Firebase
   │      │           │
   │      └─→ Redirect to /login
   │              │
   │         Register?
   │        /      |
   │      No      Yes
   │      │        │
   │      ├────→ Phone + Profile
   │      │        │
   │      │    Send OTP to Phone
   │      │        │
   │      │    User enters OTP
   │      │        │
   │      └──→ Verify OTP
   │             │
   └────────────→ Save to Firestore
                  │
              ✅ Logged In
```

---

## 🎯 Next Steps

1. **Test on a real device** (or simulator) to verify SMS delivery
2. **Deploy to Firebase Hosting** for production testing
3. **Update Firebase rules** for Firestore to restrict data access per user
4. **Configure SMS provider** in Firebase (if needed for production scaling)

---

## 📞 Firebase Phone Auth Limits (Free Tier)

- **SMS:** 100 per day (development)
- **Rate limiting:** Automatic after multiple failures
- **Supported countries:** Most regions including Bangladesh

For production scaling, contact Firebase support for higher limits.

---

## 🔗 Resources

- [Firebase Phone Auth Docs](https://firebase.google.com/docs/auth/web/phone-auth)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [reCAPTCHA Setup](https://firebase.google.com/docs/auth/web/phone-auth#disable-app-verification)

---

**Status:** ✅ Phone authentication system fully implemented and ready to test.
