# 🔧 Troubleshooting Guide: No Data Showing in Deployed App

If your deployed app on Render is not showing orders, warps, or fabric cuts, follow this step-by-step troubleshooting guide.

## 🔍 Step 1: Check Render Logs

1. Go to your [Render Dashboard](https://render.com)
2. Click on your deployed service
3. Go to the **"Logs"** tab
4. Look for error messages, especially:
   - `❌ Firebase initialization failed`
   - `❌ Missing environment variables`
   - `Error fetching data from Firestore`

## 🔐 Step 2: Verify Environment Variables

### Check if Variables are Set:
1. In Render Dashboard, go to your service
2. Click **"Environment"** tab
3. Verify these variables are present:
   - `NODE_ENV=production`
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_PRIVATE_KEY_ID`
   - `FIREBASE_PRIVATE_KEY`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_CLIENT_ID`
   - `FIREBASE_CLIENT_CERT_URL`

### Test Locally:
Run this command to debug environment variables:
```bash
npm run debug:env
```

### Fix Common Issues:

#### ⚠️ Firebase Private Key Format
The most common issue is with `FIREBASE_PRIVATE_KEY`. In Render:

1. Copy the ENTIRE private key including:
   ```
   -----BEGIN PRIVATE KEY-----
   [your key content]
   -----END PRIVATE KEY-----
   ```

2. **IMPORTANT**: Keep the `\n` characters as literal `\n` (not actual line breaks)
   
   ✅ **Correct format in Render:**
   ```
   -----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n
   ```
   
   ❌ **Wrong format:**
   ```
   -----BEGIN PRIVATE KEY-----
   MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
   -----END PRIVATE KEY-----
   ```

## 🔥 Step 3: Test Firebase Connection

### Test Database Connection:
```bash
npm run test:db
```

This will:
- Test Firebase initialization
- Check if collections exist
- Show how many documents are in each collection
- Identify if the database is empty

### Common Connection Issues:

1. **Wrong Project ID**: Verify `FIREBASE_PROJECT_ID` matches your Firebase project
2. **Invalid Service Account**: Make sure you downloaded the correct service account key
3. **Firestore not enabled**: Ensure Firestore is enabled in your Firebase project

## 📊 Step 4: Check Database Content

### If Database is Empty:
If the test shows your database is empty, you need to add data:

```bash
npm run add:sample
```

This will add sample data including:
- 3 Orders
- 3 Looms  
- 3 Warps
- 3 Fabric Cuts

### If Database Has Data:
Check Firebase Security Rules in your Firebase Console:

1. Go to Firestore Database → Rules
2. Make sure rules allow read/write access:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

## 🌐 Step 5: Test API Endpoints

Test if your API is working by visiting these URLs in your browser:

Replace `your-app-name` with your actual Render app name:

1. **Health Check**: `https://your-app-name.onrender.com/health`
   - Should return: `{"status":"OK","firebase":"connected"}`

2. **Orders API**: `https://your-app-name.onrender.com/api/orders`
   - Should return JSON array of orders

3. **Warps API**: `https://your-app-name.onrender.com/api/warps`
   - Should return JSON array of warps

If these return empty arrays `[]`, your database is empty.
If they return error messages, check Firebase connection.

## 🔄 Step 6: Force Redeploy

Sometimes a simple redeploy fixes issues:

1. In Render Dashboard, go to your service
2. Click **"Manual Deploy"** → **"Deploy latest commit"**
3. Wait for deployment to complete
4. Check logs for any new errors

## ⚡ Step 7: Quick Fixes

### Clear and Reset:
If nothing works, try this nuclear option:

1. **Clear Database** (⚠️ This deletes all data):
   ```bash
   # Only run this if you want to start fresh
   curl -X DELETE https://your-app-name.onrender.com/api/database/clear-all
   ```

2. **Add Fresh Sample Data**:
   ```bash
   npm run add:sample
   ```

### Local Testing:
Test production build locally:
```bash
npm run test:prod
```

## 🆘 Common Solutions

| Problem | Solution |
|---------|----------|
| Empty arrays returned | Database is empty → Run `npm run add:sample` |
| 401/403 errors | Check Firebase Security Rules |
| 500 server errors | Check environment variables |
| App loads but no data | Check API endpoints directly |
| Firebase init failed | Fix `FIREBASE_PRIVATE_KEY` format |

## 📱 Step 8: Test the Full App

After fixing issues:

1. Visit your deployed app URL
2. Login with credentials:
   - Admin: `admin` / `admin123`
   - Fabric: `fabric` / `fabric123`
   - Yarn: `yarn` / `yarn123`
3. Check each dashboard for data
4. Test creating new orders/warps/fabric cuts

## 🎯 Success Checklist

- [ ] Render logs show no errors
- [ ] Environment variables are set correctly
- [ ] Firebase private key is properly formatted
- [ ] Health endpoint returns success
- [ ] API endpoints return data
- [ ] Database contains sample data
- [ ] App dashboards show data
- [ ] All user roles work correctly

## 🚨 Still Not Working?

If you're still having issues:

1. **Check Render Logs**: Look for specific error messages
2. **Contact Support**: Create an issue with:
   - Your Render logs
   - Output from `npm run debug:env`
   - Output from `npm run test:db`
   - Screenshots of the issue

---

**Most Common Fix**: 90% of deployment issues are caused by incorrect `FIREBASE_PRIVATE_KEY` formatting in Render environment variables. Make sure it includes the `\n` characters and the BEGIN/END lines. 