# Render Deployment Guide

This guide will help you deploy the Fabric Production Tracker to Render.

## Prerequisites

1. **GitHub Repository**: Ensure your code is pushed to a GitHub repository
2. **Firebase Project**: Have your Firebase project set up with Firestore database
3. **Render Account**: Create a free account at [render.com](https://render.com)

## Step-by-Step Deployment

### 1. Prepare Environment Variables

You'll need these Firebase credentials from your Firebase project:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_PRIVATE_KEY_ID`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_CLIENT_ID`
- `FIREBASE_CLIENT_CERT_URL`

**To get these credentials:**

1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Download the JSON file
4. Extract the values from the JSON file

### 2. Deploy to Render

1. **Connect GitHub Repository**
   - Log into your Render dashboard
   - Click "New +" → "Web Service"
   - Connect your GitHub account and select your repository

2. **Configure Build Settings**
   - **Name**: `fabric-production-tracker`
   - **Environment**: `Node`
   - **Region**: Choose closest to your users
   - **Branch**: `main` (or your default branch)
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

3. **Set Environment Variables**
   
   In the Render dashboard, go to Environment and add:
   
   ```
   NODE_ENV=production
   FIREBASE_PROJECT_ID=your_project_id
   FIREBASE_PRIVATE_KEY_ID=your_private_key_id
   FIREBASE_PRIVATE_KEY=your_private_key
   FIREBASE_CLIENT_EMAIL=your_client_email
   FIREBASE_CLIENT_ID=your_client_id
   FIREBASE_CLIENT_CERT_URL=your_client_cert_url
   ```

   **Important**: For `FIREBASE_PRIVATE_KEY`, make sure to:
   - Copy the entire private key including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`
   - Keep all line breaks as `\n` characters

4. **Deploy**
   - Click "Create Web Service"
   - Render will automatically build and deploy your application
   - The build process will take 5-10 minutes

### 3. Post-Deployment

1. **Test the Application**
   - Once deployed, you'll get a URL like: `https://fabric-production-tracker.onrender.com`
   - Test all login credentials:
     - `admin` / `admin123`
     - `fabric` / `fabric123`
     - `yarn` / `yarn123`

2. **SSL Certificate**
   - Render automatically provides SSL certificates
   - Your app will be available over HTTPS

## Render Configuration Files

The project includes these deployment files:

- `render.yaml` - Render service configuration
- Updated `package.json` - Build scripts for deployment
- Modified `server.js` - Production static file serving

## Troubleshooting

### Common Issues:

1. **Build Fails**
   - Check that all dependencies are in `package.json`
   - Verify Node.js version compatibility

2. **Firebase Connection Issues**
   - Verify all environment variables are set correctly
   - Check Firebase private key formatting (ensure `\n` characters are preserved)

3. **404 Errors on Refresh**
   - The app is configured to handle client-side routing
   - All routes should work correctly with the catch-all handler

4. **Environment Variables Not Working**
   - Make sure `NODE_ENV=production` is set
   - Verify Firebase credentials are correctly formatted

### Logs and Debugging:

- Use Render's dashboard to view build and runtime logs
- Check the "Events" tab for deployment status
- Monitor the "Metrics" tab for performance

## Production Features

✅ **Automatic HTTPS**
✅ **Environment Variables**
✅ **Build Optimization**
✅ **Static File Serving**
✅ **Client-Side Routing Support**
✅ **Firebase Integration**
✅ **Role-Based Authentication**

## Cost

- **Free Tier**: Perfect for testing and small usage
- **Paid Plans**: Available for higher traffic and performance needs

## Updating the Application

1. Push changes to your GitHub repository
2. Render will automatically detect changes and redeploy
3. Monitor the deployment in the Render dashboard

## Firebase Security Rules

Make sure your Firestore security rules are configured for production:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to all documents
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

**Note**: Update these rules based on your security requirements.

## Support

If you encounter issues:
1. Check Render's documentation
2. Review the build and runtime logs
3. Verify Firebase configuration
4. Test locally with `NODE_ENV=production npm start` 