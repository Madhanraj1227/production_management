// Sample Data Insertion Script
// This script will add sample data to your Firebase database

const admin = require('firebase-admin');
require('dotenv').config();

console.log('🌱 Adding Sample Data to Database...');
console.log('====================================');

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

async function addSampleData() {
    try {
        console.log('1. Initializing Firebase Admin SDK...');
        
        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        }
        
        const db = admin.firestore();
        
        // Sample Orders
        console.log('\n📊 Adding Sample Orders...');
        const orders = [
            {
                customerName: 'ABC Textiles Ltd',
                orderQuantity: 1000,
                fabricType: 'Cotton',
                orderDate: new Date(),
                status: 'active',
                createdAt: new Date()
            },
            {
                customerName: 'XYZ Fashion House',
                orderQuantity: 750,
                fabricType: 'Silk',
                orderDate: new Date(),
                status: 'active',
                createdAt: new Date()
            },
            {
                customerName: 'Modern Fabrics Inc',
                orderQuantity: 1200,
                fabricType: 'Polyester',
                orderDate: new Date(),
                status: 'completed',
                createdAt: new Date()
            }
        ];
        
        const orderIds = [];
        for (const order of orders) {
            const docRef = await db.collection('orders').add(order);
            orderIds.push(docRef.id);
            console.log(`   Added order: ${order.customerName} (ID: ${docRef.id})`);
        }
        
        // Sample Looms
        console.log('\n🏭 Adding Sample Looms...');
        const looms = [
            {
                loomName: 'Loom-001',
                companyName: 'ASHOK TEXTILES',
                status: 'idle',
                createdAt: new Date()
            },
            {
                loomName: 'Loom-002',
                companyName: 'ASHOK TEXTILES',
                status: 'busy',
                createdAt: new Date()
            },
            {
                loomName: 'Loom-003',
                companyName: 'External Job Work',
                status: 'idle',
                createdAt: new Date()
            }
        ];
        
        const loomIds = [];
        for (const loom of looms) {
            const docRef = await db.collection('looms').add(loom);
            loomIds.push(docRef.id);
            console.log(`   Added loom: ${loom.loomName} (ID: ${docRef.id})`);
        }
        
        // Sample Warps
        console.log('\n🧵 Adding Sample Warps...');
        const warps = [
            {
                warpNumber: 'WRP-001',
                warpOrderNumber: 'WO-001',
                orderId: orderIds[0],
                loomId: loomIds[1], // busy loom
                status: 'active',
                createdAt: new Date()
            },
            {
                warpNumber: 'WRP-002',
                warpOrderNumber: 'WO-002',
                orderId: orderIds[1],
                loomId: loomIds[0], // idle loom
                status: 'completed',
                createdAt: new Date()
            },
            {
                warpNumber: 'WRP-003',
                warpOrderNumber: 'WO-003',
                orderId: orderIds[0],
                loomId: loomIds[2],
                status: 'active',
                createdAt: new Date()
            }
        ];
        
        const warpIds = [];
        for (const warp of warps) {
            const docRef = await db.collection('warps').add(warp);
            warpIds.push(docRef.id);
            console.log(`   Added warp: ${warp.warpNumber} (ID: ${docRef.id})`);
        }
        
        // Sample Fabric Cuts
        console.log('\n✂️ Adding Sample Fabric Cuts...');
        const fabricCuts = [
            {
                fabricNumber: 'WRP-001-01',
                warpId: warpIds[0],
                quantity: 25.5,
                cutNumber: 1,
                totalCuts: 3,
                loomId: loomIds[1],
                loomName: 'Loom-002',
                companyName: 'ASHOK TEXTILES',
                createdAt: new Date()
            },
            {
                fabricNumber: 'WRP-001-02',
                warpId: warpIds[0],
                quantity: 30.0,
                cutNumber: 2,
                totalCuts: 3,
                loomId: loomIds[1],
                loomName: 'Loom-002',
                companyName: 'ASHOK TEXTILES',
                createdAt: new Date()
            },
            {
                fabricNumber: 'WRP-002-01',
                warpId: warpIds[1],
                quantity: 28.75,
                cutNumber: 1,
                totalCuts: 2,
                loomId: loomIds[0],
                loomName: 'Loom-001',
                companyName: 'ASHOK TEXTILES',
                inspectionArrival: new Date(), // This makes it appear in loom-in history
                createdAt: new Date()
            }
        ];
        
        for (const fabricCut of fabricCuts) {
            const docRef = await db.collection('fabricCuts').add(fabricCut);
            console.log(`   Added fabric cut: ${fabricCut.fabricNumber} (ID: ${docRef.id})`);
        }
        
        console.log('\n✅ Sample data added successfully!');
        console.log('\n📈 Summary:');
        console.log(`   Orders: ${orders.length}`);
        console.log(`   Looms: ${looms.length}`);
        console.log(`   Warps: ${warps.length}`);
        console.log(`   Fabric Cuts: ${fabricCuts.length}`);
        console.log('\n🎉 Your app should now show data when you refresh it!');
        
    } catch (error) {
        console.error('❌ Failed to add sample data:', error.message);
        console.error('Full error:', error);
    }
}

addSampleData(); 