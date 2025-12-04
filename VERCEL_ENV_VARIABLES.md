# Environment Variables for Vercel Deployment

## Required Environment Variables

### 1. `NEXT_PUBLIC_API_URL` (Required)
- **Description**: The base URL for your backend API
- **Usage**: Used in `src/lib/api-client.ts` and `src/lib/unified-api-client.ts`
- **Example**: 
  - Development: `http://localhost:5000/api`
  - Production: `https://your-backend-api.com/api`
- **How to set in Vercel**:
  1. Go to your project settings in Vercel
  2. Navigate to "Environment Variables"
  3. Add: `NEXT_PUBLIC_API_URL` = `https://your-backend-api.com/api`

### 2. `NEXT_PUBLIC_APP_URL` (Optional but Recommended)
- **Description**: The base URL for your frontend application (used for QR code URLs)
- **Usage**: Used in `src/lib/utils.ts` to construct full QR payment URLs
- **Example**: 
  - Development: `http://localhost:9002`
  - Production: `https://your-app.vercel.app`
- **How it works**:
  - If not set, the system will use `window.location.origin` on the client-side
  - For server-side rendering, it will try to extract from `NEXT_PUBLIC_API_URL` or use a default
  - **Recommended**: Set this explicitly in production for reliable QR code URLs
- **How to set in Vercel**:
  1. Go to your project settings in Vercel
  2. Navigate to "Environment Variables"
  3. Add: `NEXT_PUBLIC_APP_URL` = `https://your-app.vercel.app`

## Optional Environment Variables

### 2. Firebase Configuration (If using Firebase)
If you're using Firebase for authentication or Firestore, you'll need to configure it. Currently, the Firebase config in `src/lib/firebase.ts` has placeholder values. If you plan to use Firebase, you should:

**Option A: Use Environment Variables (Recommended)**
Update `src/lib/firebase.ts` to use environment variables:
```typescript
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};
```

Then add these in Vercel:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

**Option B: Keep hardcoded values** (Not recommended for production)

## Notes

- All `NEXT_PUBLIC_*` variables are exposed to the browser, so don't put sensitive data in them
- `NODE_ENV` is automatically set by Vercel (development/production)
- Make sure your backend API allows CORS requests from your Vercel domain

## Quick Setup Steps for Vercel

1. **Import your GitHub repository** to Vercel
2. **Add Environment Variables**:
   - Go to Project Settings → Environment Variables
   - Add `NEXT_PUBLIC_API_URL` with your backend API URL
3. **Deploy** - Vercel will automatically build and deploy your app

## Testing Locally

Create a `.env.local` file in the root directory:
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

This file should be in `.gitignore` and not committed to the repository.

