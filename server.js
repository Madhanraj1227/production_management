const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());

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

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Make db available to routes
app.locals.db = db;

console.log('Firebase Connected');

// Routes
app.use('/api/orders', require('./routes/orders'));
app.use('/api/warps', require('./routes/warps'));
app.use('/api/fabric-cuts', require('./routes/fabricCuts'));
app.use('/api/looms', require('./routes/looms'));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Export db for other modules
module.exports = { db }; 