const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());

// Environment variable validation and debugging
console.log('🔍 Environment Variables Check:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID);
console.log('FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL);
console.log('FIREBASE_PRIVATE_KEY_ID:', process.env.FIREBASE_PRIVATE_KEY_ID);
console.log('FIREBASE_PRIVATE_KEY length:', process.env.FIREBASE_PRIVATE_KEY?.length || 'undefined');
console.log('FIREBASE_CLIENT_ID:', process.env.FIREBASE_CLIENT_ID);
console.log('FIREBASE_CLIENT_CERT_URL:', process.env.FIREBASE_CLIENT_CERT_URL);

// Check for missing environment variables
const requiredEnvVars = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_PRIVATE_KEY_ID', 
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_CLIENT_ID',
  'FIREBASE_CLIENT_CERT_URL'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error('❌ Missing environment variables:', missingVars);
  console.error('💡 Please add these to your Render environment variables');
} else {
  console.log('✅ All required environment variables are present');
}

// Firebase Admin SDK initialization
const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
};

try {
  admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
  });
  console.log('✅ Firebase Admin SDK initialized successfully');
} catch (error) {
  console.error('❌ Firebase initialization failed:', error.message);
  console.error('🔍 Service account config check:');
  console.error('  - project_id:', serviceAccount.project_id);
  console.error('  - client_email:', serviceAccount.client_email);
  console.error('  - private_key_id:', serviceAccount.private_key_id);
  console.error('  - private_key length:', serviceAccount.private_key?.length);
}

const db = admin.firestore();

// Make db available to routes
app.locals.db = db;

console.log('🔥 Firebase Connected');

// Import routes
const orderRoutes = require('./routes/orders');
const warpRoutes = require('./routes/warps');
const loomRoutes = require('./routes/looms');
const fabricCutRoutes = require('./routes/fabricCuts');
const databaseRoutes = require('./routes/database');
const inspectionRoutes = require('./routes/inspections');

// Use routes
app.use('/api/orders', orderRoutes);
app.use('/api/warps', warpRoutes);
app.use('/api/looms', loomRoutes);
app.use('/api/fabric-cuts', fabricCutRoutes);
app.use('/api/database', databaseRoutes);
app.use('/api/inspections', inspectionRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    firebase: 'connected'
  });
});

// Serve static files from the React app build directory
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/build')));

  // The "catchall" handler: send back React's index.html file.
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Export db for other modules
module.exports = { db }; 