// This script clears all data from the specified Firestore collections.
// USE WITH CAUTION. This action is irreversible.

const admin = require('firebase-admin');
require('dotenv').config();

// --- Configuration ---
// Add the names of the collections you want to clear to this array.
const COLLECTIONS_TO_CLEAR = [
    'orders',
    'warps', 
    'looms',
    'fabricCuts',
    'freedQuantities',
    'counters',
    'inspections'
];
// ---------------------

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

async function clearDatabase() {
    console.log('🔥 Initializing Firebase Admin SDK...');
    try {
        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        }
        console.log('✅ Firebase Admin SDK initialized successfully.');
    } catch (error) {
        console.error('❌ Firebase initialization failed:', error.message);
        return;
    }

    const db = admin.firestore();
    
    console.log('\n🗑️  Starting database cleanup...');
    console.log('====================================');
    console.warn('⚠️  WARNING: This will permanently delete data from the following collections:');
    COLLECTIONS_TO_CLEAR.forEach(col => console.log(`  - ${col}`));
    console.log('====================================');

    for (const collectionName of COLLECTIONS_TO_CLEAR) {
        try {
            console.log(`\n🧹 Clearing collection: "${collectionName}"...`);
            const snapshot = await db.collection(collectionName).limit(500).get();
            
            if (snapshot.empty) {
                console.log(`  ✅ Collection "${collectionName}" is already empty.`);
                continue;
            }
            
            let totalDeleted = 0;
            // Firestore limits batches to 500 operations. We loop until the collection is empty.
            while (!snapshot.empty) {
                const batch = db.batch();
                snapshot.docs.forEach(doc => {
                    batch.delete(doc.ref);
                });
                
                await batch.commit();
                totalDeleted += snapshot.size;
                console.log(`  - Deleted ${snapshot.size} documents... (Total: ${totalDeleted})`);

                // Get the next batch
                const nextSnapshot = await db.collection(collectionName).limit(500).get();
                if (nextSnapshot.empty) {
                    break;
                }
                snapshot.docs = nextSnapshot.docs;
            }
            
            console.log(`  ✅ Finished clearing "${collectionName}". Total documents deleted: ${totalDeleted}`);
        } catch (error) {
            console.error(`  ❌ Error clearing collection "${collectionName}":`, error.message);
        }
    }
    
    console.log('\n\n🎉 Database cleanup complete!');
}

// Immediately invoke the function to start the process.
clearDatabase(); 