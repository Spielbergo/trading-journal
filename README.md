# Trading Journal

A personal trading journal application built with Next.js to track and analyze your trades, similar to Tradezilla. Track your trades, view performance analytics, and improve your trading strategy.

## Features

- **Authentication**: Sign in with Google or email/password
- **Dashboard**: View key trading metrics at a glance including win rate, P&L, and recent trades
- **Trade Management**: Add, view, and delete trades with detailed information
- **Analytics**: Comprehensive trading statistics including profit factor, win/loss ratios, and monthly performance
- **Cloud Storage**: All data synced via Firebase Firestore - access from anywhere
- **Dark Mode UI**: Eye-friendly dark interface for comfortable viewing

## Prerequisites

- Node.js 18+ installed
- A Firebase account (free tier works fine)

## Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project
3. Enable **Authentication**:
   - Go to Authentication > Sign-in method
   - Enable "Google" provider
   - Enable "Email/Password" provider
4. Enable **Firestore Database**:
   - Go to Firestore Database
   - Create database in production mode
   - Start with these security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /trades/{trade} {
      allow read, write: if request.auth != null;
    }
  }
}
```

5. Get your Firebase config:
   - Go to Project Settings > General
   - Scroll to "Your apps" section
   - Click the web icon (</>)
   - Copy the config values

6. Create `.env.local` file in the project root and add your Firebase credentials:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

## Getting Started

### Installation

1. Install dependencies:

```bash
npm install
```

2. Set up your `.env.local` file with Firebase credentials (see Firebase Setup above)

### Development Server

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. You'll be redirected to the login page.

**First time?** Click "Sign up" to create an account or use "Continue with Google".

### Building for Production

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── app/
│   ├── dashboard/       # Dashboard page with key metrics
│   ├── trades/          # Trade management page
│   ├── analytics/       # Analytics and statistics page
│   ├── settings/        # Settings and data management
│   └── layout.js        # Root layout
└── components/
    ├── Layout.js        # Main layout wrapper
    └── Sidebar.js       # Navigation sidebar
```

## Data Storage

All trading data is stored securely in Firebase Firestore and shared across all authenticated users. Perfect for personal use or sharing with a small team.

## Technologies

- **Next.js 16** - React framework
- **JavaScript** - Programming language
- **Firebase Auth** - Authentication (Google & Email/Password)
- **Firebase Firestore** - Cloud database
- **CSS Modules** - Styling

## License

This is a personal project for individual use.

