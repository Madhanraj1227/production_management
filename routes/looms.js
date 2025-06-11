const express = require('express');
const router = express.Router();

// Get all looms
router.get('/', async (req, res) => {
    try {
        const db = req.app.locals.db;
        console.log('Fetching looms with ultra-optimized queries...');
        const startTime = Date.now();
        
        // Step 1: Get all looms in one query
        const loomsSnapshot = await db.collection('looms').get();
        const looms = [];
        
        loomsSnapshot.forEach(doc => {
            looms.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        if (looms.length === 0) {
            console.log('No looms found');
            return res.json([]);
        }
        
        // Step 2: Get all warps to find which looms are busy and their associated data
        const warpsSnapshot = await db.collection('warps').get();
        const loomWarpsMap = new Map(); // loomId -> active warp data
        const activeWarpIds = [];
        const orderIds = new Set();
        
        warpsSnapshot.forEach(doc => {
            const warpData = { id: doc.id, ...doc.data() };
            
            if (warpData.loomId && warpData.status === 'active') {
                loomWarpsMap.set(warpData.loomId, warpData);
                activeWarpIds.push(doc.id);
                if (warpData.orderId) {
                    orderIds.add(warpData.orderId);
                }
            }
        });
        
        // Step 3: Batch fetch all orders for active warps
        const ordersMap = new Map();
        if (orderIds.size > 0) {
            const orderPromises = Array.from(orderIds).map(async (orderId) => {
                try {
                    const orderDoc = await db.collection('orders').doc(orderId).get();
                    if (orderDoc.exists) {
                        ordersMap.set(orderId, {
                            id: orderDoc.id,
                            ...orderDoc.data()
                        });
                    }
                } catch (err) {
                    console.error(`Error fetching order ${orderId}:`, err);
                }
            });
            await Promise.all(orderPromises);
        }
        
        // Step 4: Get fabric cuts statistics for all active warps
        const fabricCutsStatsMap = new Map(); // warpId -> stats
        if (activeWarpIds.length > 0) {
            const fabricCutsSnapshot = await db.collection('fabricCuts').get();
            
            // Initialize stats for all active warps
            activeWarpIds.forEach(warpId => {
                fabricCutsStatsMap.set(warpId, {
                    totalCuts: 0,
                    totalProduction: 0
                });
            });
            
            // Calculate stats from fabric cuts
            fabricCutsSnapshot.forEach(doc => {
                const cutData = doc.data();
                const warpId = cutData.warpId;
                
                if (warpId && fabricCutsStatsMap.has(warpId)) {
                    const stats = fabricCutsStatsMap.get(warpId);
                    stats.totalCuts += 1;
                    stats.totalProduction += cutData.quantity || 0;
                }
            });
        }
        
        // Step 5: Assemble enriched looms data
        const enrichedLooms = looms.map(loom => {
            const activeWarp = loomWarpsMap.get(loom.id);
            
            let warpData = null;
            let orderData = null;
            let fabricCutStats = null;
            
            if (activeWarp) {
                warpData = activeWarp;
                
                // Get associated order
                if (activeWarp.orderId) {
                    orderData = ordersMap.get(activeWarp.orderId) || null;
                }
                
                // Get fabric cut statistics
                fabricCutStats = fabricCutsStatsMap.get(activeWarp.id) || {
                    totalCuts: 0,
                    totalProduction: 0
                };
            }
            
            return {
                ...loom,
                warp: warpData,
                order: orderData,
                fabricCutStats: fabricCutStats
            };
        });
        
        // Step 6: Sort by createdAt (newest first)
        enrichedLooms.sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
            return dateB.getTime() - dateA.getTime();
        });
        
        const totalTime = Date.now() - startTime;
        console.log(`Ultra-optimized looms query completed in ${totalTime}ms for ${enrichedLooms.length} looms`);
        
        res.json(enrichedLooms);
    } catch (err) {
        console.error('Error in ultra-optimized looms endpoint:', err);
        res.status(500).json({ message: err.message });
    }
});

// Get idle looms
router.get('/idle', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const snapshot = await db.collection('looms')
            .where('status', '==', 'idle')
            .get();
        
        const looms = [];
        snapshot.forEach(doc => {
            looms.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Sort by createdAt (newest first)
        looms.sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
            return dateB.getTime() - dateA.getTime();
        });
        
        res.json(looms);
    } catch (err) {
        console.error('Error fetching idle looms:', err);
        res.status(500).json({ message: err.message });
    }
});

// Get all looms with optimized queries - ENHANCED PERFORMANCE VERSION
router.get('/optimized', async (req, res) => {
    try {
        const db = req.app.locals.db;
        console.log('Fetching looms with ultra-optimized queries...');
        const startTime = Date.now();
        
        // Step 1: Get all looms in one query
        const loomsSnapshot = await db.collection('looms').get();
        const looms = [];
        
        loomsSnapshot.forEach(doc => {
            looms.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        if (looms.length === 0) {
            console.log('No looms found');
            return res.json([]);
        }
        
        // Step 2: Get all warps to find which looms are busy and their associated data
        const warpsSnapshot = await db.collection('warps').get();
        const loomWarpsMap = new Map(); // loomId -> active warp data
        const activeWarpIds = [];
        const orderIds = new Set();
        
        warpsSnapshot.forEach(doc => {
            const warpData = { id: doc.id, ...doc.data() };
            
            if (warpData.loomId && warpData.status === 'active') {
                loomWarpsMap.set(warpData.loomId, warpData);
                activeWarpIds.push(doc.id);
                if (warpData.orderId) {
                    orderIds.add(warpData.orderId);
                }
            }
        });
        
        // Step 3: Batch fetch all orders for active warps
        const ordersMap = new Map();
        if (orderIds.size > 0) {
            const orderPromises = Array.from(orderIds).map(async (orderId) => {
                try {
                    const orderDoc = await db.collection('orders').doc(orderId).get();
                    if (orderDoc.exists) {
                        ordersMap.set(orderId, {
                            id: orderDoc.id,
                            ...orderDoc.data()
                        });
                    }
                } catch (err) {
                    console.error(`Error fetching order ${orderId}:`, err);
                }
            });
            await Promise.all(orderPromises);
        }
        
        // Step 4: Get fabric cuts statistics for all active warps
        const fabricCutsStatsMap = new Map(); // warpId -> stats
        if (activeWarpIds.length > 0) {
            const fabricCutsSnapshot = await db.collection('fabricCuts').get();
            
            // Initialize stats for all active warps
            activeWarpIds.forEach(warpId => {
                fabricCutsStatsMap.set(warpId, {
                    totalCuts: 0,
                    totalProduction: 0
                });
            });
            
            // Calculate stats from fabric cuts
            fabricCutsSnapshot.forEach(doc => {
                const cutData = doc.data();
                const warpId = cutData.warpId;
                
                if (warpId && fabricCutsStatsMap.has(warpId)) {
                    const stats = fabricCutsStatsMap.get(warpId);
                    stats.totalCuts += 1;
                    stats.totalProduction += cutData.quantity || 0;
                }
            });
        }
        
        // Step 5: Assemble enriched looms data
        const enrichedLooms = looms.map(loom => {
            const activeWarp = loomWarpsMap.get(loom.id);
            
            let warpData = null;
            let orderData = null;
            let fabricCutStats = null;
            
            if (activeWarp) {
                warpData = activeWarp;
                
                // Get associated order
                if (activeWarp.orderId) {
                    orderData = ordersMap.get(activeWarp.orderId) || null;
                }
                
                // Get fabric cut statistics
                fabricCutStats = fabricCutsStatsMap.get(activeWarp.id) || {
                    totalCuts: 0,
                    totalProduction: 0
                };
            }
            
            return {
                ...loom,
                warp: warpData,
                order: orderData,
                fabricCutStats: fabricCutStats
            };
        });
        
        // Step 6: Sort by createdAt (newest first)
        enrichedLooms.sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
            return dateB.getTime() - dateA.getTime();
        });
        
        const totalTime = Date.now() - startTime;
        console.log(`Ultra-optimized looms query completed in ${totalTime}ms for ${enrichedLooms.length} looms`);
        
        res.json(enrichedLooms);
    } catch (err) {
        console.error('Error in ultra-optimized looms endpoint:', err);
        res.status(500).json({ message: err.message });
    }
});

// Create new loom
router.post('/', async (req, res) => {
    const loomData = {
        companyName: req.body.companyName,
        loomName: req.body.loomName,
        status: 'idle', // idle, busy, maintenance
        createdAt: new Date()
    };

    try {
        const db = req.app.locals.db;
        const docRef = await db.collection('looms').add(loomData);
        
        const newLoom = {
            id: docRef.id,
            ...loomData
        };
        
        res.status(201).json(newLoom);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Get single loom
router.get('/:id', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const doc = await db.collection('looms').doc(req.params.id).get();
        
        if (doc.exists) {
            res.json({
                id: doc.id,
                ...doc.data()
            });
        } else {
            res.status(404).json({ message: 'Loom not found' });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Update loom status
router.patch('/:id', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const loomRef = db.collection('looms').doc(req.params.id);
        const doc = await loomRef.get();
        
        if (doc.exists) {
            await loomRef.update({
                status: req.body.status
            });
            
            const updatedDoc = await loomRef.get();
            res.json({
                id: updatedDoc.id,
                ...updatedDoc.data()
            });
        } else {
            res.status(404).json({ message: 'Loom not found' });
        }
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update loom details (company name, loom name, etc.)
router.put('/:id', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const loomRef = db.collection('looms').doc(req.params.id);
        const doc = await loomRef.get();
        
        if (!doc.exists) {
            return res.status(404).json({ message: 'Loom not found' });
        }
        
        const updateData = {
            companyName: req.body.companyName,
            loomName: req.body.loomName,
            updatedAt: new Date()
        };
        
        // Only update status if provided and loom is not busy
        if (req.body.status && doc.data().status !== 'busy') {
            updateData.status = req.body.status;
        }
        
        await loomRef.update(updateData);
        
        const updatedDoc = await loomRef.get();
        res.json({
            id: updatedDoc.id,
            ...updatedDoc.data()
        });
    } catch (err) {
        console.error('Error updating loom:', err);
        res.status(400).json({ message: err.message });
    }
});

// Delete loom
router.delete('/:id', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const loomRef = db.collection('looms').doc(req.params.id);
        const doc = await loomRef.get();
        
        if (!doc.exists) {
            return res.status(404).json({ message: 'Loom not found' });
        }
        
        const loomData = doc.data();
        
        // Only check if loom is currently busy - don't allow deletion of busy looms
        if (loomData.status === 'busy') {
            return res.status(400).json({ 
                message: 'Cannot delete a loom that is currently busy. Please complete or stop the active warp first.' 
            });
        }
        
        // Check for active warps only (not historical ones)
        const activeWarpsSnapshot = await db.collection('warps')
            .where('loomId', '==', req.params.id)
            .where('status', '==', 'active')
            .get();
        
        if (!activeWarpsSnapshot.empty) {
            return res.status(400).json({ 
                message: 'Cannot delete loom as it has active warps. Please complete or stop the active warps first.' 
            });
        }
        
        // Allow deletion of idle/maintenance looms even with historical warps
        // Historical data in warps and fabric cuts will be preserved
        await loomRef.delete();
        
        res.json({ 
            message: 'Loom deleted successfully. Historical warp and fabric cut data has been preserved.', 
            id: req.params.id 
        });
    } catch (err) {
        console.error('Error deleting loom:', err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router; 