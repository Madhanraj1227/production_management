# 🚀 Render Deployment Checklist

## Pre-Deployment ✅

- [ ] Code pushed to GitHub repository
- [ ] Firebase project created and Firestore enabled
- [ ] Firebase service account key generated
- [ ] Environment variables prepared

## Render Setup ✅

- [ ] Render account created
- [ ] Repository connected to Render
- [ ] Build command set: `npm install && npm run build`
- [ ] Start command set: `npm start`
- [ ] Environment set to: `Node`

## Environment Variables ✅

Set these in Render dashboard → Environment:

- [ ] `NODE_ENV=production`
- [ ] `FIREBASE_PROJECT_ID=your_project_id`
- [ ] `FIREBASE_PRIVATE_KEY_ID=your_private_key_id`
- [ ] `FIREBASE_PRIVATE_KEY=your_private_key` (with \n preserved)
- [ ] `FIREBASE_CLIENT_EMAIL=your_client_email`
- [ ] `FIREBASE_CLIENT_ID=your_client_id`
- [ ] `FIREBASE_CLIENT_CERT_URL=your_client_cert_url`

## Post-Deployment Testing ✅

- [ ] Application loads without errors
- [ ] Login with admin credentials: `admin` / `admin123`
- [ ] Login with fabric credentials: `fabric` / `fabric123`
- [ ] Login with yarn credentials: `yarn` / `yarn123`
- [ ] Navigation works correctly for each role
- [ ] Dashboard loads with proper data
- [ ] Create test order/warp/fabric cut
- [ ] Print functionality works
- [ ] QR codes generate properly

## Troubleshooting 🔧

If deployment fails:

1. **Check Build Logs** in Render dashboard
2. **Verify Environment Variables** are correctly set
3. **Test Locally** with `npm run test:prod`
4. **Check Firebase Connection** in logs
5. **Review Node.js Version** compatibility

## Quick Commands 💻

```bash
# Test production locally
npm run test:prod

# Check environment variables
echo $NODE_ENV

# Verify build works
npm run build
```

## Success Indicators 🎉

✅ **Deployment succeeded**
✅ **All user roles work**
✅ **Data loads correctly**
✅ **No console errors**
✅ **HTTPS enabled**
✅ **All routes work**

---

**Your app is ready! 🎊** 