const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');

// Get all fabric cuts that have been scanned for loom-in (history) - OPTIMIZED VERSION
router.get('/loom-in-history', async (req, res) => {
    try {
        const db = req.app.locals.db;
        console.log('Fetching loom-in history with optimized queries...');
        const startTime = Date.now();
        
        // Step 1: Get all fabric cuts with inspection arrival
        const fabricCutsSnapshot = await db.collection('fabricCuts').get();
        const scannedFabricCuts = [];
        
        fabricCutsSnapshot.forEach(doc => {
            const fabricCutData = doc.data();
            // Only include fabric cuts that have been scanned for loom-in
            if (fabricCutData.inspectionArrival) {
                scannedFabricCuts.push({
                    id: doc.id,
                    ...fabricCutData
                });
            }
        });
        
        if (scannedFabricCuts.length === 0) {
            console.log('No scanned fabric cuts found');
            return res.json([]);
        }
        
        // Step 2: Batch fetch all related data
        const warpIds = [...new Set(scannedFabricCuts.map(cut => cut.warpId).filter(Boolean))];
        const warpsData = {};
        const ordersData = {};
        const loomsData = {};
        
        // Batch fetch warps
        const warpPromises = warpIds.map(async (warpId) => {
            try {
                const warpDoc = await db.collection('warps').doc(warpId).get();
                if (warpDoc.exists) {
                    const warpData = warpDoc.data();
                    warpsData[warpId] = {
                        id: warpDoc.id,
                        ...warpData
                    };
                    return warpData; // Return for collecting order and loom IDs
                }
            } catch (err) {
                console.error(`Error fetching warp ${warpId}:`, err);
            }
            return null;
        });
        
        const warpResults = await Promise.all(warpPromises);
        const validWarps = warpResults.filter(Boolean);
        
        // Collect unique order and loom IDs
        const orderIds = [...new Set(validWarps.map(warp => warp.orderId).filter(Boolean))];
        const loomIds = [...new Set(validWarps.map(warp => warp.loomId).filter(Boolean))];
        
        // Batch fetch orders and looms in parallel
        const [orderResults, loomResults] = await Promise.all([
            Promise.all(orderIds.map(async (orderId) => {
                try {
                    const orderDoc = await db.collection('orders').doc(orderId).get();
                    if (orderDoc.exists) {
                        ordersData[orderId] = {
                            id: orderDoc.id,
                            ...orderDoc.data()
                        };
                    }
                } catch (err) {
                    console.error(`Error fetching order ${orderId}:`, err);
                }
            })),
            Promise.all(loomIds.map(async (loomId) => {
                try {
                    const loomDoc = await db.collection('looms').doc(loomId).get();
                    if (loomDoc.exists) {
                        loomsData[loomId] = {
                            id: loomDoc.id,
                            ...loomDoc.data()
                        };
                    }
                } catch (err) {
                    console.error(`Error fetching loom ${loomId}:`, err);
                }
            }))
        ]);
        
        // Step 3: Assemble the final response
        const enrichedFabricCuts = scannedFabricCuts.map(fabricCutData => {
            const warp = warpsData[fabricCutData.warpId];
            let enrichedWarp = null;
            
            if (warp) {
                let loomData = warp.loomId ? loomsData[warp.loomId] : null;
                
                // If loom was deleted but we have stored loom data in fabric cut, use that
                if (!loomData && warp.loomId && (fabricCutData.loomName || fabricCutData.companyName)) {
                    loomData = {
                        id: warp.loomId,
                        loomName: fabricCutData.loomName || 'N/A',
                        companyName: fabricCutData.companyName || 'N/A'
                    };
                }
                
                enrichedWarp = {
                    ...warp,
                    order: warp.orderId ? ordersData[warp.orderId] : null,
                    loom: loomData
                };
            }
            
            return {
                ...fabricCutData,
                warp: enrichedWarp
            };
        });
        
        // Sort by inspection arrival time (newest first)
        enrichedFabricCuts.sort((a, b) => {
            const dateA = a.inspectionArrival?.toDate ? a.inspectionArrival.toDate() : new Date(a.inspectionArrival);
            const dateB = b.inspectionArrival?.toDate ? b.inspectionArrival.toDate() : new Date(b.inspectionArrival);
            return dateB.getTime() - dateA.getTime();
        });
        
        const totalTime = Date.now() - startTime;
        console.log(`Optimized loom-in history query completed in ${totalTime}ms for ${enrichedFabricCuts.length} fabric cuts`);
        
        res.json(enrichedFabricCuts);
    } catch (err) {
        console.error('Error fetching loom-in history:', err);
        res.status(500).json({ message: err.message });
    }
});

// Get fabric cuts with optional filtering (optimized for performance)
router.get('/optimized', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { warpId, date } = req.query;
        
        // Get all fabric cuts and filter in JavaScript to avoid index requirement
        const fabricCutsQuery = db.collection('fabricCuts');
        const snapshot = await fabricCutsQuery.get();
        
        // Convert to array and apply filtering + sorting in JavaScript
        let allFabricCuts = [];
        snapshot.forEach(doc => {
            const data = {
                id: doc.id,
                ...doc.data()
            };
            
            // Apply warp filter if specified
            if (warpId && data.warpId !== warpId) {
                return; // Skip this cut
            }
            
            // Apply date filter if specified
            if (date) {
                const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
                const filterDate = new Date(date);
                
                // Check if the fabric cut was created on the selected date
                if (createdAt.toDateString() !== filterDate.toDateString()) {
                    return; // Skip this cut
                }
            }
            
            allFabricCuts.push(data);
        });
        
        // Sort by createdAt in descending order
        allFabricCuts.sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
            return dateB.getTime() - dateA.getTime();
        });
        
        // Batch fetch related data to minimize database calls
        const warpIds = [...new Set(allFabricCuts.map(cut => cut.warpId).filter(Boolean))];
        const warpsData = {};
        const ordersData = {};
        const loomsData = {};
        
        // Fetch all unique warps in parallel
        if (warpIds.length > 0) {
            const warpPromises = warpIds.map(async (warpId) => {
                const warpDoc = await db.collection('warps').doc(warpId).get();
                if (warpDoc.exists) {
                    const warpData = warpDoc.data();
                    warpsData[warpId] = {
                        id: warpDoc.id,
                        ...warpData
                    };
                    
                    // Return warp data for collecting order and loom IDs
                    return warpData;
                }
                return null;
            });
            
            const warpResults = await Promise.all(warpPromises);
            const validWarps = warpResults.filter(Boolean);
            
            // Collect unique order and loom IDs
            const orderIds = [...new Set(validWarps.map(warp => warp.orderId).filter(Boolean))];
            const loomIds = [...new Set(validWarps.map(warp => warp.loomId).filter(Boolean))];
            
            // Fetch orders and looms in parallel
            await Promise.all([
                Promise.all(orderIds.map(async (orderId) => {
                    try {
                        const orderDoc = await db.collection('orders').doc(orderId).get();
                        if (orderDoc.exists) {
                            ordersData[orderId] = {
                                id: orderDoc.id,
                                ...orderDoc.data()
                            };
                        }
                    } catch (err) {
                        console.error(`Error fetching order ${orderId}:`, err);
                    }
                })),
                Promise.all(loomIds.map(async (loomId) => {
                    try {
                        const loomDoc = await db.collection('looms').doc(loomId).get();
                        if (loomDoc.exists) {
                            loomsData[loomId] = {
                                id: loomDoc.id,
                                ...loomDoc.data()
                            };
                        }
                    } catch (err) {
                        console.error(`Error fetching loom ${loomId}:`, err);
                    }
                }))
            ]);
        }
        
        // Enrich fabric cuts with related data
        const enrichedFabricCuts = allFabricCuts.map(fabricCutData => {
            const warp = warpsData[fabricCutData.warpId];
            let enrichedWarp = null;
            
            if (warp) {
                enrichedWarp = {
                    ...warp,
                    order: warp.orderId ? ordersData[warp.orderId] : null,
                    loom: warp.loomId ? loomsData[warp.loomId] : null
                };
            }
            
            return {
                ...fabricCutData,
                warp: enrichedWarp
            };
        });
        
        res.json(enrichedFabricCuts);
    } catch (err) {
        console.error('Error fetching fabric cuts:', err);
        res.status(500).json({ message: err.message });
    }
});

// Get all fabric cuts with optimized queries - ENHANCED PERFORMANCE VERSION
router.get('/ultra-optimized', async (req, res) => {
    try {
        const db = req.app.locals.db;
        console.log('Fetching fabric cuts with ultra-optimized queries...');
        const startTime = Date.now();
        
        // Step 1: Get all fabric cuts in one query
        const fabricCutsSnapshot = await db.collection('fabricCuts').get();
        const fabricCuts = [];
        const warpIds = new Set();
        
        fabricCutsSnapshot.forEach(doc => {
            const fabricCutData = {
                id: doc.id,
                ...doc.data()
            };
            fabricCuts.push(fabricCutData);
            
            if (fabricCutData.warpId) {
                warpIds.add(fabricCutData.warpId);
            }
        });
        
        if (fabricCuts.length === 0) {
            console.log('No fabric cuts found');
            return res.json([]);
        }
        
        // Step 2: Batch fetch all warps
        const warpsMap = new Map();
        const orderIds = new Set();
        const loomIds = new Set();
        
        if (warpIds.size > 0) {
            const warpPromises = Array.from(warpIds).map(async (warpId) => {
                try {
                    const warpDoc = await db.collection('warps').doc(warpId).get();
                    if (warpDoc.exists) {
                        const warpData = {
                            id: warpDoc.id,
                            ...warpDoc.data()
                        };
                        warpsMap.set(warpId, warpData);
                        
                        // Collect order and loom IDs
                        if (warpData.orderId) orderIds.add(warpData.orderId);
                        if (warpData.loomId) loomIds.add(warpData.loomId);
                    }
                } catch (err) {
                    console.error(`Error fetching warp ${warpId}:`, err);
                }
            });
            await Promise.all(warpPromises);
        }
        
        // Step 3: Batch fetch all orders and looms in parallel
        const [ordersMap, loomsMap] = await Promise.all([
            // Fetch orders
            (async () => {
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
                return ordersMap;
            })(),
            
            // Fetch looms
            (async () => {
                const loomsMap = new Map();
                if (loomIds.size > 0) {
                    const loomPromises = Array.from(loomIds).map(async (loomId) => {
                        try {
                            const loomDoc = await db.collection('looms').doc(loomId).get();
                            if (loomDoc.exists) {
                                loomsMap.set(loomId, {
                                    id: loomDoc.id,
                                    ...loomDoc.data()
                                });
                            }
                        } catch (err) {
                            console.error(`Error fetching loom ${loomId}:`, err);
                        }
                    });
                    await Promise.all(loomPromises);
                }
                return loomsMap;
            })()
        ]);
        
        // Step 4: Assemble enriched fabric cuts data
        const enrichedFabricCuts = fabricCuts.map(fabricCutData => {
            const warp = warpsMap.get(fabricCutData.warpId);
            let enrichedWarp = null;
            
            if (warp) {
                // Get associated order
                const order = warp.orderId ? ordersMap.get(warp.orderId) : null;
                
                // Get associated loom
                let loom = null;
                if (warp.loomId) {
                    loom = loomsMap.get(warp.loomId);
                    
                    // If loom was deleted but we have stored loom data in fabric cut, use that
                    if (!loom && (fabricCutData.loomName || fabricCutData.companyName)) {
                        loom = {
                            id: warp.loomId,
                            loomName: fabricCutData.loomName || 'N/A',
                            companyName: fabricCutData.companyName || 'N/A'
                        };
                    }
                }
                
                enrichedWarp = {
                    ...warp,
                    order: order,
                    loom: loom
                };
            }
            
            return {
                ...fabricCutData,
                warp: enrichedWarp
            };
        });
        
        // Step 5: Sort by createdAt (newest first)
        enrichedFabricCuts.sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
            return dateB.getTime() - dateA.getTime();
        });
        
        const totalTime = Date.now() - startTime;
        console.log(`Ultra-optimized fabric cuts query completed in ${totalTime}ms for ${enrichedFabricCuts.length} fabric cuts`);
        
        res.json(enrichedFabricCuts);
    } catch (err) {
        console.error('Error in ultra-optimized fabric cuts endpoint:', err);
        res.status(500).json({ message: err.message });
    }
});

// Get all fabric cuts
router.get('/', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const fabricCutsRef = db.collection('fabricCuts');
        const snapshot = await fabricCutsRef.get();
        
        const fabricCuts = [];
        const allDocs = [];
        
        // First, collect all documents
        snapshot.forEach(doc => {
            allDocs.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Sort by createdAt in JavaScript to avoid index requirement
        allDocs.sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
            return dateB.getTime() - dateA.getTime(); // Descending order
        });
        
        for (const doc of allDocs) {
            const fabricCutData = doc;
            
            // Get the associated warp and order
            let warpData = null;
            if (fabricCutData.warpId) {
                const warpDoc = await db.collection('warps').doc(fabricCutData.warpId).get();
                if (warpDoc.exists) {
                    const warp = warpDoc.data();
                    
                    // Get the associated order
                    let orderData = null;
                    if (warp.orderId) {
                        const orderDoc = await db.collection('orders').doc(warp.orderId).get();
                        if (orderDoc.exists) {
                            orderData = {
                                id: orderDoc.id,
                                ...orderDoc.data()
                            };
                        }
                    }
                    
                    // Get the associated loom
                    let loomData = null;
                    if (warp.loomId) {
                        const loomDoc = await db.collection('looms').doc(warp.loomId).get();
                        if (loomDoc.exists) {
                            loomData = {
                                id: loomDoc.id,
                                ...loomDoc.data()
                            };
                        } else {
                            // Loom was deleted - use stored loom data from fabric cut if available
                            loomData = {
                                id: warp.loomId,
                                loomName: fabricCutData.loomName || 'N/A',
                                companyName: fabricCutData.companyName || 'N/A'
                            };
                        }
                    }
                    
                    warpData = {
                        id: warpDoc.id,
                        ...warp,
                        order: orderData,
                        loom: loomData
                    };
                }
            }
            
            fabricCuts.push({
                id: doc.id,
                ...fabricCutData,
                warp: warpData
            });
        }
        
        res.json(fabricCuts);
    } catch (err) {
        console.error('Error fetching fabric cuts:', err);
        res.status(500).json({ message: err.message });
    }
});

// Get fabric cuts by warp ID
router.get('/by-warp/:warpId', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { warpId } = req.params;
        
        // Get all fabric cuts and filter in JavaScript to avoid index requirement
        const fabricCutsRef = db.collection('fabricCuts');
        const snapshot = await fabricCutsRef.get();
        
        const fabricCuts = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            // Only include fabric cuts for the specified warp
            if (data.warpId === warpId) {
                fabricCuts.push({
                    id: doc.id,
                    ...data
                });
            }
        });
        
        // Sort by createdAt in JavaScript to avoid composite index requirement
        fabricCuts.sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
            return dateB.getTime() - dateA.getTime(); // Descending order
        });
        
        res.json(fabricCuts);
    } catch (err) {
        console.error('Error fetching fabric cuts by warp:', err);
        res.status(500).json({ message: err.message });
    }
});

// Get production data by order ID
router.get('/by-order/:orderId', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { orderId } = req.params;
        
        // Get all warps for this order
        const warpsQuery = db.collection('warps').where('orderId', '==', orderId);
        const warpsSnapshot = await warpsQuery.get();
        
        if (warpsSnapshot.empty) {
            return res.json({
                warps: [],
                totalProduction: 0,
                productionByDate: {},
                fabricCuts: []
            });
        }
        
        let totalProduction = 0;
        const productionByDate = {};
        const warpsData = [];
        const allFabricCuts = [];
        
        // Get all fabric cuts once to avoid multiple queries
        const allFabricCutsSnapshot = await db.collection('fabricCuts').get();
        const allFabricCutsData = [];
        allFabricCutsSnapshot.forEach(doc => {
            allFabricCutsData.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Process each warp
        for (const warpDoc of warpsSnapshot.docs) {
            const warpData = {
                id: warpDoc.id,
                ...warpDoc.data()
            };
            
            let warpProduction = 0;
            const warpFabricCuts = [];
            
            // Filter fabric cuts for this warp
            allFabricCutsData.forEach(fabricCutData => {
                // Only include fabric cuts for this warp
                if (fabricCutData.warpId === warpDoc.id) {
                    const quantity = parseFloat(fabricCutData.quantity) || 0;
                    warpProduction += quantity;
                    totalProduction += quantity;
                    
                    // Group by date
                    const createdAt = fabricCutData.createdAt?.toDate ? fabricCutData.createdAt.toDate() : new Date(fabricCutData.createdAt);
                    const dateKey = createdAt.toISOString().split('T')[0]; // YYYY-MM-DD format
                    
                    if (!productionByDate[dateKey]) {
                        productionByDate[dateKey] = 0;
                    }
                    productionByDate[dateKey] += quantity;
                    
                    warpFabricCuts.push(fabricCutData);
                    allFabricCuts.push(fabricCutData);
                }
            });
            
            // Add production data to warp
            warpData.totalProduction = warpProduction;
            warpData.fabricCuts = warpFabricCuts;
            warpsData.push(warpData);
        }
        
        // Sort production by date
        const sortedProductionByDate = Object.entries(productionByDate)
            .sort(([a], [b]) => new Date(b) - new Date(a))
            .reduce((acc, [date, quantity]) => {
                acc[date] = quantity;
                return acc;
            }, {});
        
        res.json({
            warps: warpsData,
            totalProduction: Math.round(totalProduction * 100) / 100, // Round to 2 decimal places
            productionByDate: sortedProductionByDate,
            fabricCuts: allFabricCuts
        });
    } catch (err) {
        console.error('Error fetching production data by order:', err);
        res.status(500).json({ message: err.message });
    }
});

// Create fabric cuts in batch
router.post('/', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { warpId, fabricCuts } = req.body; // fabricCuts is an array of { quantity }
        
        // Get warp and order information
        const warpDoc = await db.collection('warps').doc(warpId).get();
        if (!warpDoc.exists) {
            return res.status(404).json({ message: 'Warp not found' });
        }
        
        const warp = warpDoc.data();
        const orderDoc = await db.collection('orders').doc(warp.orderId).get();
        if (!orderDoc.exists) {
            return res.status(404).json({ message: 'Order not found' });
        }
        
        const order = orderDoc.data();
        
        // Get loom information
        let loomData = null;
        if (warp.loomId) {
            const loomDoc = await db.collection('looms').doc(warp.loomId).get();
            if (loomDoc.exists) {
                loomData = loomDoc.data();
            }
        }

        // Get existing fabric cuts for this warp to determine the next cut number
        const existingFabricCutsSnapshot = await db.collection('fabricCuts').get();
        
        let startingCutNumber = 1;
        if (!existingFabricCutsSnapshot.empty) {
            // Find the highest cut number for this warp in JavaScript
            let maxCutNumber = 0;
            existingFabricCutsSnapshot.forEach(doc => {
                const data = doc.data();
                // Only consider fabric cuts from the same warp
                if (data.warpId === warpId) {
                    const cutNumber = data.cutNumber || 0;
                    if (cutNumber > maxCutNumber) {
                        maxCutNumber = cutNumber;
                    }
                }
            });
            startingCutNumber = maxCutNumber + 1;
        }
        
        console.log(`Starting fabric cut number for warp ${warpId}: ${startingCutNumber}`);
        
        const createdFabricCuts = [];
        const batch = db.batch();
        
        // Create fabric cuts and QR codes for each cut
        for (let i = 0; i < fabricCuts.length; i++) {
            const currentCutNumber = startingCutNumber + i;
            const fabricNumber = `${warp.warpNumber || warp.warpOrderNumber || 'UNKNOWN'}-${String(currentCutNumber).padStart(2, '0')}`;
            const sequenceNumber = String(currentCutNumber).padStart(2, '0');
            const qrData = `${warp.warpNumber || warp.warpOrderNumber || 'UNKNOWN'}/${sequenceNumber}`;

            const qrCode = await QRCode.toDataURL(qrData);

            const fabricCutData = {
                fabricNumber,
                warpId: warpId,
                quantity: fabricCuts[i].quantity,
                cutNumber: currentCutNumber,
                totalCuts: fabricCuts.length,
                qrCode,
                // Store loom snapshot data for historical preservation
                loomId: warp.loomId || null,
                loomName: loomData ? loomData.loomName : null,
                companyName: loomData ? loomData.companyName : null,
                createdAt: new Date()
            };

            const docRef = db.collection('fabricCuts').doc();
            batch.set(docRef, fabricCutData);
            
            createdFabricCuts.push({
                id: docRef.id,
                ...fabricCutData,
                qrData: {
                    fabricNumber,
                    warpNumber: warp.warpNumber || warp.warpOrderNumber || 'N/A',
                    orderNumber: order.orderNumber || order.orderName || 'N/A',
                    orderId: order.id || warp.orderId,
                    designName: order.designName || 'N/A',
                    designNumber: order.designNumber || 'N/A',
                    quantity: fabricCuts[i].quantity,
                    loomName: loomData ? loomData.loomName : 'N/A',
                    companyName: loomData ? loomData.companyName : 'ASHOK TEXTILES',
                    cutNumber: currentCutNumber,
                    totalCuts: fabricCuts.length
                }
            });
        }
        
        await batch.commit();
        
        res.status(201).json({
            message: `${fabricCuts.length} fabric cuts created successfully`,
            fabricCuts: createdFabricCuts
        });
    } catch (err) {
        console.error('Error creating fabric cuts:', err);
        res.status(400).json({ message: err.message });
    }
});

// Get fabric cuts pending inspection
router.get('/pending-inspection', async (req, res) => {
    try {
        const db = req.app.locals.db;

        // Get all fabric cuts and filter in JavaScript since Firestore can't efficiently query for undefined fields
        const allFabricCutsSnapshot = await db.collection('fabricCuts').get();
        
        const pendingCutsData = [];
        allFabricCutsSnapshot.forEach(doc => {
            const data = doc.data();
            // Check if inspectionArrival is undefined or null
            if (!data.inspectionArrival) {
                pendingCutsData.push({ id: doc.id, ...data });
            }
        });

        // Batch fetch related data to minimize database calls
        const warpIds = [...new Set(pendingCutsData.map(cut => cut.warpId).filter(Boolean))];
        const warpsData = {};
        const ordersData = {};

        if (warpIds.length > 0) {
            const warpPromises = warpIds.map(id => db.collection('warps').doc(id).get());
            const warpDocs = await Promise.all(warpPromises);

            const orderIds = [];
            warpDocs.forEach(doc => {
                if (doc.exists) {
                    const warpData = doc.data();
                    warpsData[doc.id] = { id: doc.id, ...warpData };
                    if (warpData.orderId) {
                        orderIds.push(warpData.orderId);
                    }
                }
            });
            
            const uniqueOrderIds = [...new Set(orderIds)];
            if (uniqueOrderIds.length > 0) {
                const orderPromises = uniqueOrderIds.map(id => db.collection('orders').doc(id).get());
                const orderDocs = await Promise.all(orderPromises);
                orderDocs.forEach(doc => {
                    if (doc.exists) {
                        ordersData[doc.id] = { id: doc.id, ...doc.data() };
                    }
                });
            }
        }
        
        // Build the final response
        const fabricCuts = pendingCutsData.map(cut => {
            const warp = warpsData[cut.warpId];
            let enrichedWarp = null;
            if (warp) {
                enrichedWarp = {
                    ...warp,
                    order: warp.orderId ? ordersData[warp.orderId] : null
                };
            }
            return { ...cut, warp: enrichedWarp };
        });

        // Sort by creation date (newest first)
        fabricCuts.sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
            return dateB.getTime() - dateA.getTime();
        });
        
        res.json(fabricCuts);
    } catch (err) {
        console.error('Error fetching pending inspection fabric cuts:', err);
        res.status(500).json({ message: err.message });
    }
});

// Get count of fabric cuts pending inspection - OPTIMIZED VERSION
router.get('/pending-inspection-count', async (req, res) => {
    try {
        const db = req.app.locals.db;
        
        // Get all fabric cuts and count those without inspectionArrival
        const snapshot = await db.collection('fabricCuts').get();
        let count = 0;
        
        snapshot.forEach(doc => {
            const data = doc.data();
            // Check if inspectionArrival is undefined or null
            if (!data.inspectionArrival) {
                count++;
            }
        });
        
        res.json({ count });
    } catch (err) {
        console.error('Error fetching pending inspection count:', err);
        res.status(500).json({ message: err.message });
    }
});

// Get recent inspection arrivals (today) - OPTIMIZED VERSION
router.get('/recent-inspections', async (req, res) => {
    try {
        const db = req.app.locals.db;
        console.log('Fetching recent inspections with optimized queries...');
        const startTime = Date.now();
        
        // Get today's date range
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        // Step 1: Get all fabric cuts and filter for today's arrivals
        const fabricCutsSnapshot = await db.collection('fabricCuts').get();
        const todaysFabricCuts = [];
        
        fabricCutsSnapshot.forEach(doc => {
            const fabricCutData = doc.data();
            
            // Check if has inspection arrival and is today
            if (!fabricCutData.inspectionArrival) return;
            
            const arrivalDate = fabricCutData.inspectionArrival?.toDate ? 
                fabricCutData.inspectionArrival.toDate() : 
                new Date(fabricCutData.inspectionArrival);
            
            // Check if arrival is today
            if (arrivalDate >= today && arrivalDate < tomorrow) {
                todaysFabricCuts.push({
                    id: doc.id,
                    ...fabricCutData
                });
            }
        });
        
        if (todaysFabricCuts.length === 0) {
            console.log('No recent inspections found for today');
            return res.json([]);
        }
        
        // Step 2: Batch fetch all related data
        const warpIds = [...new Set(todaysFabricCuts.map(cut => cut.warpId).filter(Boolean))];
        const warpsData = {};
        const ordersData = {};
        
        // Batch fetch warps
        const warpPromises = warpIds.map(async (warpId) => {
            try {
                const warpDoc = await db.collection('warps').doc(warpId).get();
                if (warpDoc.exists) {
                    const warpData = warpDoc.data();
                    warpsData[warpId] = {
                        id: warpDoc.id,
                        ...warpData
                    };
                    return warpData; // Return for collecting order IDs
                }
            } catch (err) {
                console.error(`Error fetching warp ${warpId}:`, err);
            }
            return null;
        });
        
        const warpResults = await Promise.all(warpPromises);
        const validWarps = warpResults.filter(Boolean);
        
        // Collect unique order IDs
        const orderIds = [...new Set(validWarps.map(warp => warp.orderId).filter(Boolean))];
        
        // Batch fetch orders
        await Promise.all(orderIds.map(async (orderId) => {
            try {
                const orderDoc = await db.collection('orders').doc(orderId).get();
                if (orderDoc.exists) {
                    ordersData[orderId] = {
                        id: orderDoc.id,
                        ...orderDoc.data()
                    };
                }
            } catch (err) {
                console.error(`Error fetching order ${orderId}:`, err);
            }
        }));
        
        // Step 3: Assemble the final response
        const enrichedFabricCuts = todaysFabricCuts.map(fabricCutData => {
            const warp = warpsData[fabricCutData.warpId];
            let enrichedWarp = null;
            
            if (warp) {
                enrichedWarp = {
                    ...warp,
                    order: warp.orderId ? ordersData[warp.orderId] : null
                };
            }
            
            return {
                ...fabricCutData,
                warp: enrichedWarp
            };
        });
        
        // Sort by inspection arrival time (newest first)
        enrichedFabricCuts.sort((a, b) => {
            const dateA = a.inspectionArrival?.toDate ? a.inspectionArrival.toDate() : new Date(a.inspectionArrival);
            const dateB = b.inspectionArrival?.toDate ? b.inspectionArrival.toDate() : new Date(b.inspectionArrival);
            return dateB.getTime() - dateA.getTime();
        });
        
        const totalTime = Date.now() - startTime;
        console.log(`Optimized recent inspections query completed in ${totalTime}ms for ${enrichedFabricCuts.length} fabric cuts`);
        
        res.json(enrichedFabricCuts);
    } catch (err) {
        console.error('Error fetching recent inspection arrivals:', err);
        res.status(500).json({ message: err.message });
    }
});

// Get fabric cut by QR code
router.get('/by-qr/:qrCode', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { qrCode } = req.params;
        
        // Parse QR code (format: WARPNUMBER/CUTNUMBER)
        const decodedQR = decodeURIComponent(qrCode);
        const parts = decodedQR.split('/');
        
        if (parts.length !== 2) {
            return res.status(400).json({ message: 'Invalid QR code format' });
        }
        
        const [warpNumber, cutNumberStr] = parts;
        const cutNumber = parseInt(cutNumberStr, 10);
        
        if (isNaN(cutNumber)) {
            return res.status(400).json({ message: 'Invalid cut number in QR code' });
        }
        
        // Find fabric cut by fabricNumber pattern (WARPNUMBER-CUTNUMBER)
        const fabricNumber = `${warpNumber}-${String(cutNumber).padStart(2, '0')}`;
        
        // Get all fabric cuts and filter in JavaScript to avoid index requirement
        const fabricCutsSnapshot = await db.collection('fabricCuts').get();
        
        let fabricCutDoc = null;
        let fabricCutData = null;
        
        fabricCutsSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.fabricNumber === fabricNumber) {
                fabricCutDoc = doc;
                fabricCutData = data;
            }
        });
        
        if (!fabricCutDoc) {
            return res.status(404).json({ message: 'Fabric cut not found' });
        }
        
        // Get the associated warp and order
        let warpData = null;
        if (fabricCutData.warpId) {
            const warpDoc = await db.collection('warps').doc(fabricCutData.warpId).get();
            if (warpDoc.exists) {
                const warp = warpDoc.data();
                
                // Get the associated order
                let orderData = null;
                if (warp.orderId) {
                    const orderDoc = await db.collection('orders').doc(warp.orderId).get();
                    if (orderDoc.exists) {
                        orderData = {
                            id: orderDoc.id,
                            ...orderDoc.data()
                        };
                    }
                }
                
                // Get the associated loom
                let loomData = null;
                if (warp.loomId) {
                    const loomDoc = await db.collection('looms').doc(warp.loomId).get();
                    if (loomDoc.exists) {
                        loomData = {
                            id: loomDoc.id,
                            ...loomDoc.data()
                        };
                    } else {
                        // Loom was deleted - use stored loom data from fabric cut if available
                        loomData = {
                            id: warp.loomId,
                            loomName: fabricCutData.loomName || 'N/A',
                            companyName: fabricCutData.companyName || 'N/A'
                        };
                    }
                }
                
                warpData = {
                    id: warpDoc.id,
                    ...warp,
                    order: orderData,
                    loom: loomData
                };
            }
        }
        
        res.json({
            id: fabricCutDoc.id,
            ...fabricCutData,
            warp: warpData
        });
    } catch (err) {
        console.error('Error finding fabric cut by QR code:', err);
        res.status(500).json({ message: err.message });
    }
});

// Get single fabric cut
router.get('/:id', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const doc = await db.collection('fabricCuts').doc(req.params.id).get();
        
        if (doc.exists) {
            const fabricCutData = doc.data();
            
            // Get the associated warp and order
            let warpData = null;
            if (fabricCutData.warpId) {
                const warpDoc = await db.collection('warps').doc(fabricCutData.warpId).get();
                if (warpDoc.exists) {
                    const warp = warpDoc.data();
                    
                    // Get the associated order
                    let orderData = null;
                    if (warp.orderId) {
                        const orderDoc = await db.collection('orders').doc(warp.orderId).get();
                        if (orderDoc.exists) {
                            orderData = {
                                id: orderDoc.id,
                                ...orderDoc.data()
                            };
                        }
                    }
                    
                    // Get the associated loom
                    let loomData = null;
                    if (warp.loomId) {
                        const loomDoc = await db.collection('looms').doc(warp.loomId).get();
                        if (loomDoc.exists) {
                            loomData = {
                                id: loomDoc.id,
                                ...loomDoc.data()
                            };
                        } else {
                            // Loom was deleted - use stored loom data from fabric cut if available
                            loomData = {
                                id: warp.loomId,
                                loomName: fabricCutData.loomName || 'N/A',
                                companyName: fabricCutData.companyName || 'N/A'
                            };
                        }
                    }
                    
                    warpData = {
                        id: warpDoc.id,
                        ...warp,
                        order: orderData,
                        loom: loomData
                    };
                }
            }
            
            res.json({
                id: doc.id,
                ...fabricCutData,
                warp: warpData
            });
        } else {
            res.status(404).json({ message: 'Fabric cut not found' });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Update fabric cut quantity
router.put('/:id', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { quantity } = req.body;
        
        if (!quantity || quantity <= 0) {
            return res.status(400).json({ message: 'Valid quantity is required' });
        }
        
        const docRef = db.collection('fabricCuts').doc(req.params.id);
        const doc = await docRef.get();
        
        if (!doc.exists) {
            return res.status(404).json({ message: 'Fabric cut not found' });
        }

        const fabricCutData = doc.data();
        const wasInLoomIn = !!fabricCutData.inspectionArrival;
        
        await docRef.update({
            quantity: parseInt(quantity),
            updatedAt: new Date()
        });
        
        let message = 'Fabric cut quantity updated successfully';
        if (wasInLoomIn) {
            message += '. This fabric cut is in loom-in history and the quantity change will be reflected there.';
        }
        
        res.json({ 
            message: message,
            id: req.params.id,
            quantity: parseInt(quantity),
            affectsLoomInHistory: wasInLoomIn
        });
    } catch (err) {
        console.error('Error updating fabric cut:', err);
        res.status(500).json({ message: err.message });
    }
});

// Delete fabric cut
router.delete('/:id', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const docRef = db.collection('fabricCuts').doc(req.params.id);
        const doc = await docRef.get();
        
        if (!doc.exists) {
            return res.status(404).json({ message: 'Fabric cut not found' });
        }

        const fabricCutData = doc.data();
        const wasInLoomIn = !!fabricCutData.inspectionArrival;
        
        await docRef.delete();
        
        let message = 'Fabric cut deleted successfully';
        if (wasInLoomIn) {
            message += '. This fabric cut has been removed from loom-in history as well.';
        }
        
        res.json({ 
            message: message,
            id: req.params.id,
            wasInLoomInHistory: wasInLoomIn
        });
    } catch (err) {
        console.error('Error deleting fabric cut:', err);
        res.status(500).json({ message: err.message });
    }
});

// Mark fabric cut as arrived at inspection
router.patch('/:id/inspection-arrival', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { id } = req.params;
        
        const docRef = db.collection('fabricCuts').doc(id);
        const doc = await docRef.get();
        
        if (!doc.exists) {
            return res.status(404).json({ message: 'Fabric cut not found' });
        }
        
        const fabricCutData = doc.data();
        
        // Check if already marked as arrived
        if (fabricCutData.inspectionArrival) {
            return res.status(400).json({ 
                message: 'Fabric cut already marked as arrived at inspection',
                arrivalTime: fabricCutData.inspectionArrival
            });
        }
        
        // Update with inspection arrival timestamp
        await docRef.update({
            inspectionArrival: new Date(),
            updatedAt: new Date()
        });
        
        res.json({ 
            message: 'Fabric cut marked as arrived at inspection',
            id: id,
            arrivalTime: new Date()
        });
    } catch (err) {
        console.error('Error marking inspection arrival:', err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;