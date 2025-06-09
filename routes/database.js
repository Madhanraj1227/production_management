const express = require('express');
const router = express.Router();

// Clear all data from database - USE WITH CAUTION
router.delete('/clear-all', async (req, res) => {
    try {
        const db = req.app.locals.db;
        
        // List of all collections to clear
        const collections = [
            'orders',
            'warps', 
            'looms',
            'fabricCuts',
            'freedQuantities',
            'counters',
            'inspections'
        ];
        
        console.log('🗑️  Starting database cleanup...');
        
        const results = {};
        
        // Clear each collection
        for (const collectionName of collections) {
            try {
                console.log(`Clearing ${collectionName} collection...`);
                
                // Get all documents in the collection
                const snapshot = await db.collection(collectionName).get();
                
                if (snapshot.empty) {
                    results[collectionName] = { deleted: 0, message: 'Collection was already empty' };
                    continue;
                }
                
                // Delete documents in batches (Firestore limit is 500 operations per batch)
                const batchSize = 500;
                const docCount = snapshot.docs.length;
                let deletedCount = 0;
                
                for (let i = 0; i < snapshot.docs.length; i += batchSize) {
                    const batch = db.batch();
                    const batchDocs = snapshot.docs.slice(i, i + batchSize);
                    
                    batchDocs.forEach(doc => {
                        batch.delete(doc.ref);
                    });
                    
                    await batch.commit();
                    deletedCount += batchDocs.length;
                    
                    console.log(`  - Deleted ${deletedCount}/${docCount} documents from ${collectionName}`);
                }
                
                results[collectionName] = { 
                    deleted: deletedCount, 
                    message: `Successfully deleted ${deletedCount} documents` 
                };
                
            } catch (error) {
                console.error(`Error clearing ${collectionName}:`, error);
                results[collectionName] = { 
                    deleted: 0, 
                    error: error.message 
                };
            }
        }
        
        console.log('✅ Database cleanup completed!');
        
        // Return summary
        const totalDeleted = Object.values(results).reduce((sum, result) => sum + (result.deleted || 0), 0);
        
        res.json({
            message: `Database cleared successfully! Deleted ${totalDeleted} total documents.`,
            timestamp: new Date().toISOString(),
            results: results,
            summary: {
                totalDocumentsDeleted: totalDeleted,
                collectionsProcessed: collections.length,
                success: true
            }
        });
        
    } catch (error) {
        console.error('Error clearing database:', error);
        res.status(500).json({ 
            error: 'Failed to clear database', 
            message: error.message,
            success: false
        });
    }
});

// Get database statistics
router.get('/stats', async (req, res) => {
    try {
        const db = req.app.locals.db;
        
        const collections = [
            'orders',
            'warps', 
            'looms',
            'fabricCuts',
            'freedQuantities',
            'counters',
            'inspections'
        ];
        
        const stats = {};
        let totalDocuments = 0;
        
        for (const collectionName of collections) {
            try {
                const snapshot = await db.collection(collectionName).get();
                const count = snapshot.size;
                stats[collectionName] = count;
                totalDocuments += count;
            } catch (error) {
                stats[collectionName] = `Error: ${error.message}`;
            }
        }
        
        res.json({
            collections: stats,
            totalDocuments: totalDocuments,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error getting database stats:', error);
        res.status(500).json({ 
            error: 'Failed to get database statistics', 
            message: error.message 
        });
    }
});

module.exports = router; 