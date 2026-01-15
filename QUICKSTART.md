# Quick Start Guide

## 🎉 Your Trading Journal is Ready!

Your trading journal app with Firebase authentication is now set up and running!

## 📋 What's Been Set Up

### ✅ Authentication
- Sign in with Google
- Sign in with Email/Password
- Sign up functionality
- Protected routes (must be logged in to access)
- Sign out functionality

### ✅ Pages & Features
- **Login Page** (`/login`) - Sign in to your account
- **Sign Up Page** (`/signup`) - Create a new account
- **Dashboard** (`/dashboard`) - Overview of trading statistics
- **Trades** (`/trades`) - Add, view, and delete trades
- **Analytics** (`/analytics`) - Detailed trading analytics
- **Settings** (`/settings`) - App information

### ✅ Firebase Integration
- Firebase Authentication for user management
- Firestore Database for storing trades
- All authenticated users share the same data
- Perfect for personal use or small teams
- Real-time data synchronization

## 🚀 Next Steps

### 1. Set Up Firebase (Required)

Before you can use the app, you need to configure Firebase:

1. Follow the instructions in [FIREBASE_SETUP.md](./FIREBASE_SETUP.md)
2. Create a Firebase project
3. Enable Authentication (Google + Email/Password)
4. Enable Firestore Database
5. Copy your credentials to `.env.local`

**Important:** The app won't work without Firebase credentials!

### 2. Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 3. Create Your First Account

1. You'll be redirected to the login page
2. Click "Sign up" to create an account
3. Use Google Sign-In or Email/Password
4. Start adding trades!

## 📁 Project Structure

```
src/
├── app/
│   ├── login/          # Login page
│   ├── signup/         # Sign up page
│   ├── dashboard/      # Main dashboard
│   ├── trades/         # Trade management
│   ├── analytics/      # Analytics & stats
│   └── settings/       # Settings page
├── components/
│   ├── Layout.js       # App layout wrapper
│   ├── Sidebar.js      # Navigation sidebar
│   └── ProtectedRoute.js # Route protection
├── contexts/
│   └── AuthContext.js  # Authentication state
└── lib/
    ├── firebase.js     # Firebase configuration
    └── tradesService.js # Firestore operations
```

## 🔒 Security

- All routes (except login/signup) require authentication
- All authenticated users can view and manage all trades
- Firestore security rules require authentication
- Firebase handles password hashing and security
- Perfect for solo trading or sharing with trusted team members

## 📊 Using the App

### Adding a Trade
1. Go to the Trades page
2. Click "+ Add Trade"
3. Fill in trade details:
   - Date
   - Symbol (e.g., AAPL, TSLA)
   - Type (Long/Short)
   - Quantity
   - Entry Price
   - Exit Price
   - Optional notes
4. P&L is calculated automatically
5. Click "Add Trade"

### Viewing Analytics
- Dashboard shows recent trades and key metrics
- Analytics page shows comprehensive statistics
- Data updates in real-time

### Deleting Trades
- Go to Trades page
- Click "Delete" next to any trade
- Confirm deletion

## 🛠️ Configuration Files

### `.env.local` (Create this file!)
Contains your Firebase credentials. See `.env.example` for the template.

### `.env.example`
Template for environment variables. Copy to `.env.local` and fill in your values.

## 🐛 Troubleshooting

### "Firebase: Error (auth/unauthorized-domain)"
- Add your domain to Firebase Console > Authentication > Settings > Authorized domains

### "Missing or insufficient permissions"
- Check Firestore security rules
- Make sure you're signed in

### Can't sign in with Google
- Verify Google provider is enabled in Firebase Console
- Clear browser cache

### Page shows "Loading..."
- Check browser console for errors
- Verify Firebase credentials in `.env.local`
- Make sure Firestore is enabled

## 📚 Resources

- [Firebase Setup Guide](./FIREBASE_SETUP.md) - Detailed Firebase configuration
- [README.md](./README.md) - Full project documentation
- [Firebase Docs](https://firebase.google.com/docs) - Official Firebase documentation

## 🎨 Customization Ideas

- Add trade screenshots/images using Firebase Storage
- Add trade tags/categories
- Create custom reports
- Add trade strategies tracking
- Export trades to CSV
- Add dark/light theme toggle
- Add more chart visualizations

## ❓ Need Help?

Check these files for more information:
- `FIREBASE_SETUP.md` - Firebase configuration help
- `README.md` - Project overview and setup
- Firebase Console - Monitor usage and errors

Enjoy tracking your trades! 📈
