// Database Connection Test Script
// This script tests if we can connect to Firestore and read data

const admin = require('firebase-admin');
require('dotenv').config();

console.log('🔥 Testing Database Connection...');
console.log('==================================');

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

async function testDatabase() {
    try {
        console.log('1. Initializing Firebase Admin SDK...');
        
        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        }
        
        console.log('✅ Firebase Admin SDK initialized successfully');
        
        const db = admin.firestore();
        console.log('2. Getting Firestore instance...');
        
        // Test 1: Check orders collection
        console.log('\n📊 Testing Orders Collection:');
        const ordersSnapshot = await db.collection('orders').limit(5).get();
        console.log(`   Found ${ordersSnapshot.size} orders`);
        
        if (!ordersSnapshot.empty) {
            ordersSnapshot.forEach(doc => {
                const data = doc.data();
                console.log(`   - Order ID: ${doc.id}`);
                console.log(`     Customer: ${data.customerName || 'N/A'}`);
                console.log(`     Quantity: ${data.orderQuantity || 'N/A'}`);
            });
        }
        
        // Test 2: Check warps collection
        console.log('\n🧵 Testing Warps Collection:');
        const warpsSnapshot = await db.collection('warps').limit(5).get();
        console.log(`   Found ${warpsSnapshot.size} warps`);
        
        if (!warpsSnapshot.empty) {
            warpsSnapshot.forEach(doc => {
                const data = doc.data();
                console.log(`   - Warp ID: ${doc.id}`);
                console.log(`     Warp Number: ${data.warpNumber || 'N/A'}`);
                console.log(`     Status: ${data.status || 'N/A'}`);
            });
        }
        
        // Test 3: Check fabric cuts collection
        console.log('\n✂️ Testing Fabric Cuts Collection:');
        const fabricCutsSnapshot = await db.collection('fabricCuts').limit(5).get();
        console.log(`   Found ${fabricCutsSnapshot.size} fabric cuts`);
        
        if (!fabricCutsSnapshot.empty) {
            fabricCutsSnapshot.forEach(doc => {
                const data = doc.data();
                console.log(`   - Fabric Cut ID: ${doc.id}`);
                console.log(`     Fabric Number: ${data.fabricNumber || 'N/A'}`);
                console.log(`     Quantity: ${data.quantity || 'N/A'}`);
            });
        }
        
        // Test 4: Check looms collection
        console.log('\n🏭 Testing Looms Collection:');
        const loomsSnapshot = await db.collection('looms').limit(5).get();
        console.log(`   Found ${loomsSnapshot.size} looms`);
        
        if (!loomsSnapshot.empty) {
            loomsSnapshot.forEach(doc => {
                const data = doc.data();
                console.log(`   - Loom ID: ${doc.id}`);
                console.log(`     Loom Name: ${data.loomName || 'N/A'}`);
                console.log(`     Status: ${data.status || 'N/A'}`);
            });
        }
        
        // Summary
        console.log('\n📈 Database Summary:');
        console.log(`   Orders: ${ordersSnapshot.size}`);
        console.log(`   Warps: ${warpsSnapshot.size}`);
        console.log(`   Fabric Cuts: ${fabricCutsSnapshot.size}`);
        console.log(`   Looms: ${loomsSnapshot.size}`);
        
        if (ordersSnapshot.size === 0 && warpsSnapshot.size === 0 && 
            fabricCutsSnapshot.size === 0 && loomsSnapshot.size === 0) {
            console.log('\n⚠️  DATABASE IS EMPTY!');
            console.log('   This explains why no data is showing in your app.');
            console.log('   You need to add some sample data to see anything.');
        }
        
    } catch (error) {
        console.error('❌ Database test failed:', error.message);
        console.error('Full error:', error);
    }
}

testDatabase(); 