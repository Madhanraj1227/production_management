# Fabric Production Tracker - Deployment Guide

## 🚀 Render Deployment Instructions

### 1. Prerequisites

- GitHub repository with the latest code
- Firebase project with admin SDK credentials
- Render account (https://render.com)

### 2. Environment Variables Required

Add these environment variables in your Render dashboard:

```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_CLIENT_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxx%40your-project.iam.gserviceaccount.com
NODE_ENV=production
PORT=10000
```

**Important Notes:**
- The `FIREBASE_PRIVATE_KEY` must include the full key with `\n` newlines preserved
- Make sure to wrap the private key in double quotes in Render
- All other environment variables are set automatically via `render.yaml`

### 3. Deployment Steps

1. **Push Code to GitHub:**
   ```bash
   git add .
   git commit -m "Deploy: Ready for Render deployment"
   git push origin main
   ```

2. **Create New Web Service in Render:**
   - Go to https://render.com/dashboard
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the repository: `fabric-production-tracker`
   - Choose branch: `main`

3. **Configure Service:**
   - **Name:** `fabric-production-tracker`
   - **Environment:** `Node`
   - **Build Command:** `npm install --no-audit --no-fund && npm run build`
   - **Start Command:** `npm start`
   - **Plan:** Choose your preferred plan (Starter is sufficient for testing)

4. **Add Environment Variables:**
   - In the service settings, go to "Environment"
   - Add all the Firebase environment variables listed above
   - The other variables (NODE_ENV, PORT, etc.) are set via render.yaml

5. **Deploy:**
   - Click "Create Web Service"
   - Wait for the build and deployment to complete

### 4. Build Process

The deployment uses a custom build script (`build-for-render.js`) that:

- ✅ Optimizes memory usage for Render's environment
- ✅ Installs dependencies with optimized flags
- ✅ Builds the React client application
- ✅ Disables source maps for faster builds
- ✅ Handles ESLint and preflight checks

### 5. File Structure

```
project-root/
├── server.js                 # Main Express server
├── package.json              # Server dependencies
├── build-for-render.js       # Custom build script
├── render.yaml               # Render configuration
├── routes/                   # API routes
│   ├── fabricMovements.js
│   ├── processingOrders.js
│   └── ...
└── client/                   # React application
    ├── package.json          # Client dependencies
    ├── src/                  # React components
    └── build/                # Built React files (created during deployment)
```

### 6. Features Included

- ✅ **Fabric Movement System** - Move fabrics between locations
- ✅ **Processing Orders** - Send fabrics for processing
- ✅ **4-Point Inspection** - Quality control system
- ✅ **QR Code Generation** - Fabric tracking with QR codes
- ✅ **Print Functionality** - Movement order forms
- ✅ **Search & Filters** - Find movements and fabrics
- ✅ **Firebase Integration** - Real-time database
- ✅ **Responsive UI** - Works on mobile and desktop

### 7. Post-Deployment Verification

After deployment, verify these features work:

1. **API Health Check:** `https://your-app.onrender.com/` should show "Fabric Production Tracker API is running"
2. **Frontend:** The React app should load at your Render URL
3. **Database Connection:** Firebase should connect successfully
4. **Fabric Movement:** Create and receive movement orders
5. **QR Scanning:** Scan QR codes to add fabric cuts
6. **Print Orders:** Print movement order forms

### 8. Troubleshooting

**Build Fails:**
- Check that all environment variables are set correctly
- Ensure Firebase credentials are properly formatted
- Check build logs for specific errors

**App Loads but Database Errors:**
- Verify Firebase environment variables
- Check Firebase project permissions
- Ensure service account has proper roles

**Performance Issues:**
- Monitor memory usage in Render dashboard
- Consider upgrading to a higher tier plan
- Check for memory leaks in application

### 9. Environment Variable Template

Copy this template for your Render environment variables:

```bash
# Copy your actual values from Firebase project settings
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_ID=
FIREBASE_CLIENT_CERT_URL=
```

### 10. Maintenance

- **Logs:** Check application logs in Render dashboard
- **Updates:** Push to GitHub main branch to trigger automatic redeployment
- **Scaling:** Adjust plan in Render dashboard as needed
- **Monitoring:** Use Render's built-in monitoring tools

---

🚀 **Ready for Production!** This application is optimized for Render deployment with proper error handling, logging, and performance optimization. 