const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');

// Get all fabric cuts that have been scanned for loom-in (history) - ULTRA FAST VERSION WITH PAGINATION
router.get('/loom-in-history-ultra-fast', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { limit = '50', search = '', searchAll = 'false' } = req.query;
        const limitNumber = parseInt(limit);
        const isFullSearch = searchAll === 'true' || search.trim() !== '';
        
        console.log(`Fetching loom-in history - Limit: ${limitNumber}, Search: "${search}", Full Search: ${isFullSearch}`);
        const startTime = Date.now();
        
        // Step 1: Get all fabric cuts with inspection arrival in one scan
        const fabricCutsSnapshot = await db.collection('fabricCuts').get();
        const scannedFabricCuts = [];
        const warpIds = new Set();
        
        fabricCutsSnapshot.forEach(doc => {
            const fabricCutData = doc.data();
            // Only include fabric cuts that have been scanned for loom-in
            if (fabricCutData.inspectionArrival) {
                const fabricCut = {
                    id: doc.id,
                    ...fabricCutData
                };
                
                // If searching, apply search filter here for efficiency
                if (isFullSearch && search.trim() !== '') {
                    const searchTerm = search.toLowerCase();
                    const fabricNumber = fabricCut.fabricNumber?.toLowerCase() || '';
                    const qrData = `${fabricCut.warp?.warpNumber || 'unknown'}/${String(fabricCut.cutNumber || '').padStart(2, '0')}`.toLowerCase();
                    
                    if (fabricNumber.includes(searchTerm) || 
                        qrData.includes(searchTerm) ||
                        fabricCut.warp?.warpNumber?.toLowerCase().includes(searchTerm) ||
                        fabricCut.warp?.warpOrderNumber?.toLowerCase().includes(searchTerm)) {
                        scannedFabricCuts.push(fabricCut);
                        if (fabricCutData.warpId) {
                            warpIds.add(fabricCutData.warpId);
                        }
                    }
                } else {
                    scannedFabricCuts.push(fabricCut);
                    if (fabricCutData.warpId) {
                        warpIds.add(fabricCutData.warpId);
                    }
                }
            }
        });
        
        if (scannedFabricCuts.length === 0) {
            console.log('No scanned fabric cuts found');
            return res.json([]);
        }
        
        // Step 2: Batch fetch all warps in parallel
        const warpsMap = new Map();
        const orderIds = new Set();
        const loomIds = new Set();
        
        if (warpIds.size > 0) {
            const warpPromises = Array.from(warpIds).map(async (warpId) => {
                try {
                    const warpDoc = await db.collection('warps').doc(warpId).get();
                    if (warpDoc.exists) {
                        const warpData = { id: warpDoc.id, ...warpDoc.data() };
                        warpsMap.set(warpId, warpData);
                        
                        if (warpData.orderId) orderIds.add(warpData.orderId);
                        if (warpData.loomId) loomIds.add(warpData.loomId);
                    }
                } catch (err) {
                    console.error(`Error fetching warp ${warpId}:`, err);
                }
            });
            await Promise.all(warpPromises);
        }
        
        // Step 3: Batch fetch orders and looms in parallel
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
        
        // Step 4: Assemble the final response
        const enrichedFabricCuts = scannedFabricCuts.map(fabricCutData => {
            const warp = warpsMap.get(fabricCutData.warpId);
            let enrichedWarp = null;
            
            if (warp) {
                let loomData = warp.loomId ? loomsMap.get(warp.loomId) : null;
                
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
                    order: warp.orderId ? ordersMap.get(warp.orderId) : null,
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
        
        // Apply limit only if not doing a full search
        const finalResults = isFullSearch ? enrichedFabricCuts : enrichedFabricCuts.slice(0, limitNumber);
        
        const totalTime = Date.now() - startTime;
        console.log(`Ultra-fast loom-in history query completed in ${totalTime}ms for ${finalResults.length} fabric cuts (${enrichedFabricCuts.length} total found)`);
        
        res.json({
            fabricCuts: finalResults,
            totalCount: enrichedFabricCuts.length,
            isLimited: !isFullSearch,
            limit: limitNumber,
            hasMore: !isFullSearch && enrichedFabricCuts.length > limitNumber
        });
    } catch (err) {
        console.error('Error fetching loom-in history:', err);
        res.status(500).json({ message: err.message });
    }
});

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
        
        // Get all 4-point inspections to check scan status
        const inspectionsSnapshot = await db.collection('inspections').where('inspectionType', '==', '4-point').get();
        const inspectedCutIds = new Set();
        inspectionsSnapshot.forEach(doc => {
            inspectedCutIds.add(doc.data().fabricCutId);
        });

        // Get all processing orders to check which cuts have been sent
        const processingOrdersSnapshot = await db.collection('processingOrders').get();
        const processingCutNumbers = new Set();
        processingOrdersSnapshot.forEach(doc => {
            const order = doc.data();
            if (order.fabricCuts && Array.isArray(order.fabricCuts)) {
                order.fabricCuts.forEach(cut => {
                    if (cut.fabricNumber) {
                        processingCutNumbers.add(cut.fabricNumber);
                    }
                });
            }
        });

        console.log('Processing Cut Numbers Set:', Array.from(processingCutNumbers));

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
            
            const isProcessing = processingCutNumbers.has(fabricCutData.fabricNumber);
            if (fabricCutData.fabricNumber === 'W1-01' || fabricCutData.fabricNumber === 'W2-02') {
              console.log(`Checking fabricNumber: ${fabricCutData.fabricNumber}, Is in Processing Set? ${isProcessing}`);
            }
            
            return {
                ...fabricCutData,
                warp: enrichedWarp,
                scannedAt4Point: inspectedCutIds.has(fabricCutData.id) || fabricCutData.scannedAt4Point,
                isProcessing: isProcessing
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
        
        // Validation: Prevent creation of processing-received fabric cuts in main collection
        if (req.body.fabricNumber && req.body.fabricNumber.startsWith('WR/')) {
            return res.status(400).json({ 
                message: 'Processing-received fabric cuts (WR/ prefixed) should not be created in the main fabric cuts collection. They belong in processing orders.' 
            });
        }
        
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

            // Validation: Ensure we're not creating processing-received fabric cuts
            if (fabricNumber.startsWith('WR/')) {
                throw new Error(`Invalid fabric number format: ${fabricNumber}. WR/ prefixed numbers are reserved for processing-received cuts.`);
            }

            const fabricCutData = {
                fabricNumber,
                warpId: warpId,
                quantity: fabricCuts[i].quantity,
                cutNumber: currentCutNumber,
                totalCuts: fabricCuts.length,
                qrCode,
                location: 'Veerapandi', // Added location
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

// Get recent inspection arrivals (today) - ULTRA FAST VERSION
router.get('/recent-inspections-ultra-fast', async (req, res) => {
    try {
        const db = req.app.locals.db;
        console.log('Fetching recent inspections with ultra-fast optimized queries...');
        const startTime = Date.now();
        
        // Get today's date range
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        // Step 1: Get all fabric cuts and filter for today's arrivals in one scan
        const fabricCutsSnapshot = await db.collection('fabricCuts').get();
        const todaysFabricCuts = [];
        const warpIds = new Set();
        
        fabricCutsSnapshot.forEach(doc => {
            const fabricCutData = doc.data();
            
            // Check if has inspection arrival and is today
            if (!fabricCutData.inspectionArrival) return;
            
            const arrivalDate = fabricCutData.inspectionArrival?.toDate ? 
                fabricCutData.inspectionArrival.toDate() : 
                new Date(fabricCutData.inspectionArrival);
            
            // Check if arrival is today
            if (arrivalDate >= today && arrivalDate < tomorrow) {
                const fabricCut = {
                    id: doc.id,
                    ...fabricCutData
                };
                todaysFabricCuts.push(fabricCut);
                
                if (fabricCutData.warpId) {
                    warpIds.add(fabricCutData.warpId);
                }
            }
        });
        
        if (todaysFabricCuts.length === 0) {
            console.log('No recent inspections found for today');
            return res.json([]);
        }
        
        // Step 2: Batch fetch all warps and related data in parallel
        const [warpsMap, ordersMap] = await Promise.all([
            // Fetch warps
            (async () => {
                const warpsMap = new Map();
                const orderIds = new Set();
                
                if (warpIds.size > 0) {
                    const warpPromises = Array.from(warpIds).map(async (warpId) => {
                        try {
                            const warpDoc = await db.collection('warps').doc(warpId).get();
                            if (warpDoc.exists) {
                                const warpData = { id: warpDoc.id, ...warpDoc.data() };
                                warpsMap.set(warpId, warpData);
                                
                                if (warpData.orderId) orderIds.add(warpData.orderId);
                            }
                        } catch (err) {
                            console.error(`Error fetching warp ${warpId}:`, err);
                        }
                    });
                    await Promise.all(warpPromises);
                }
                
                return { warpsMap, orderIds };
            })(),
            
            // Pre-initialize orders map
            Promise.resolve(new Map())
        ]);
        
        // Step 3: Fetch orders in parallel
        const ordersMapFinal = new Map();
        if (warpsMap.orderIds && warpsMap.orderIds.size > 0) {
            const orderPromises = Array.from(warpsMap.orderIds).map(async (orderId) => {
                try {
                    const orderDoc = await db.collection('orders').doc(orderId).get();
                    if (orderDoc.exists) {
                        ordersMapFinal.set(orderId, {
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
        
        // Step 4: Assemble the final response
        const enrichedFabricCuts = todaysFabricCuts.map(fabricCutData => {
            const warp = warpsMap.warpsMap.get(fabricCutData.warpId);
            let enrichedWarp = null;
            
            if (warp) {
                enrichedWarp = {
                    ...warp,
                    order: warp.orderId ? ordersMapFinal.get(warp.orderId) : null
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
        console.log(`Ultra-fast recent inspections query completed in ${totalTime}ms for ${enrichedFabricCuts.length} fabric cuts`);
        
        res.json(enrichedFabricCuts);
    } catch (err) {
        console.error('Error fetching recent inspection arrivals:', err);
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
        
        console.log('=== QR CODE LOOKUP DEBUG ===');
        console.log('Raw QR code:', qrCode);
        
        // Parse QR code (format: WARPNUMBER/CUTNUMBER)
        const decodedQR = decodeURIComponent(qrCode);
        console.log('Decoded QR code:', decodedQR);
        
        const parts = decodedQR.split('/');
        console.log('QR parts:', parts);
        
        if (parts.length !== 2 && parts.length !== 3) {
            console.log('ERROR: Invalid QR code format - expected 2 or 3 parts, got:', parts.length);
            return res.status(400).json({ message: 'Invalid QR code format. Expected WARPNUMBER/CUTNUMBER or WARPNUMBER/CUTNUMBER/SPLITNUMBER' });
        }
        
        let warpNumber, cutNumber, splitNumber;
        
        if (parts.length === 2) {
            // Original fabric cut format: W2/01
            [warpNumber, cutNumber] = parts;
            splitNumber = null;
            console.log('Original fabric cut format detected');
        } else {
            // Split fabric cut format: W1/4/01
            [warpNumber, cutNumber, splitNumber] = parts;
            console.log('Split fabric cut format detected');
        }
        
        const parsedCutNumber = parseInt(cutNumber, 10);
        const parsedSplitNumber = splitNumber ? parseInt(splitNumber, 10) : null;
        
        console.log('Warp number:', warpNumber);
        console.log('Cut number string:', cutNumber);
        console.log('Parsed cut number:', parsedCutNumber);
        console.log('Split number string:', splitNumber);
        console.log('Parsed split number:', parsedSplitNumber);
        
        if (isNaN(parsedCutNumber) || (splitNumber && isNaN(parsedSplitNumber))) {
            console.log('ERROR: Invalid cut or split number');
            return res.status(400).json({ message: 'Invalid cut or split number in QR code' });
        }
        
        // Find fabric cut by fabricNumber pattern - try multiple comprehensive patterns
        const searchPatterns = [];
        
        if (splitNumber) {
            // For split fabric cuts: W1/5/01 input
            // Database stores: W1-5/01 format 
            searchPatterns.push(
                `${warpNumber}-${parsedCutNumber}/${String(parsedSplitNumber).padStart(2, '0')}`, // W1-5/01 (PRIMARY MATCH)
                `${warpNumber}-${parsedCutNumber}/${parsedSplitNumber}`, // W1-5/1
                `${warpNumber}-${String(parsedCutNumber).padStart(2, '0')}/${String(parsedSplitNumber).padStart(2, '0')}`, // W1-05/01
                `${warpNumber}-${String(parsedCutNumber).padStart(2, '0')}/${parsedSplitNumber}`, // W1-05/1
                `${warpNumber}/${parsedCutNumber}/${String(parsedSplitNumber).padStart(2, '0')}`, // W1/5/01
                `${warpNumber}/${parsedCutNumber}/${parsedSplitNumber}`, // W1/5/1
                `${warpNumber}-${parsedCutNumber}-${String(parsedSplitNumber).padStart(2, '0')}`, // W1-5-01
                `${warpNumber}-${parsedCutNumber}-${parsedSplitNumber}` // W1-5-1
            );
        } else {
            // For original fabric cuts: W2/01
            searchPatterns.push(
                `${warpNumber}-${String(parsedCutNumber).padStart(2, '0')}`, // W2-01 (PRIMARY MATCH)
                `${warpNumber}-${parsedCutNumber}`, // W2-1
                `${warpNumber}/${String(parsedCutNumber).padStart(2, '0')}`, // W2/01
                `${warpNumber}/${parsedCutNumber}` // W2/1
            );
        }
        
        console.log('Trying fabric number patterns:');
        searchPatterns.forEach((pattern, index) => {
            console.log(`  Pattern ${index + 1}:`, pattern);
        });
        
        // Get all fabric cuts and filter in JavaScript to avoid index requirement
        console.log('Fetching all fabric cuts...');
        const fabricCutsSnapshot = await db.collection('fabricCuts').get();
        console.log('Total fabric cuts found:', fabricCutsSnapshot.size);
        
        let fabricCutDoc = null;
        let fabricCutData = null;
        let matchedPattern = null;
        
        fabricCutsSnapshot.forEach(doc => {
            const data = doc.data();
            // Check if this fabric cut matches any of our search patterns
            if (searchPatterns.includes(data.fabricNumber)) {
                fabricCutDoc = doc;
                fabricCutData = data;
                matchedPattern = data.fabricNumber;
                console.log('MATCH FOUND! Fabric number:', data.fabricNumber);
                console.log('Matched pattern index:', searchPatterns.indexOf(data.fabricNumber) + 1);
            }
        });
        
        if (!fabricCutDoc) {
            console.log('ERROR: No fabric cut found for any pattern');
            // Log some existing fabric numbers for debugging
            const existingNumbers = [];
            fabricCutsSnapshot.forEach(doc => {
                const data = doc.data();
                if (data.fabricNumber) {
                    existingNumbers.push(data.fabricNumber);
                }
            });
            console.log('Existing fabric numbers (first 10):', existingNumbers.slice(0, 10));
            return res.status(404).json({ message: `Fabric cut not found for QR code: ${decodedQR}` });
        }
        
        console.log('Found fabric cut with ID:', fabricCutDoc.id);
        console.log('Matched pattern:', matchedPattern);
        
        // Get the associated warp and order
        let warpData = null;
        if (fabricCutData.warpId) {
            console.log('Fetching warp data for ID:', fabricCutData.warpId);
            const warpDoc = await db.collection('warps').doc(fabricCutData.warpId).get();
            if (warpDoc.exists) {
                const warp = warpDoc.data();
                console.log('Warp found:', warp.warpOrderNumber);
                
                // Get the associated order
                let orderData = null;
                if (warp.orderId) {
                    console.log('Fetching order data for ID:', warp.orderId);
                    const orderDoc = await db.collection('orders').doc(warp.orderId).get();
                    if (orderDoc.exists) {
                        orderData = {
                            id: orderDoc.id,
                            ...orderDoc.data()
                        };
                        console.log('Order found:', orderData.orderNumber);
                    }
                }
                
                // Get the associated loom
                let loomData = null;
                if (warp.loomId) {
                    console.log('Fetching loom data for ID:', warp.loomId);
                    const loomDoc = await db.collection('looms').doc(warp.loomId).get();
                    if (loomDoc.exists) {
                        loomData = {
                            id: loomDoc.id,
                            ...loomDoc.data()
                        };
                        console.log('Loom found:', loomData.loomName);
                    } else {
                        // Loom was deleted - use stored loom data from fabric cut if available
                        loomData = {
                            id: warp.loomId,
                            loomName: fabricCutData.loomName || 'N/A',
                            companyName: fabricCutData.companyName || 'N/A'
                        };
                        console.log('Using stored loom data:', loomData.loomName);
                    }
                }
                
                warpData = {
                    id: warpDoc.id,
                    ...warp,
                    order: orderData,
                    loom: loomData
                };
            } else {
                console.log('ERROR: Warp document not found');
            }
        }
        
        // Check if this fabric cut has already been inspected for 4-point
        if (fabricCutData.scannedAt4Point === true || fabricCutData['4-pointCompleted'] === true) {
            console.log('ERROR: Fabric cut already has 4-point inspection');
            console.log('scannedAt4Point:', fabricCutData.scannedAt4Point);
            console.log('4-pointCompleted:', fabricCutData['4-pointCompleted']);
            console.log('4-pointDate:', fabricCutData['4-pointDate']);
            console.log('=== END QR CODE LOOKUP DEBUG ===');
            return res.status(400).json({ 
                message: 'This fabric cut has already been inspected with 4-Point Inspection',
                error: 'ALREADY_INSPECTED',
                fabricNumber: fabricCutData.fabricNumber,
                inspectionDate: fabricCutData['4-pointDate']
            });
        }

        const response = {
            id: fabricCutDoc.id,
            ...fabricCutData,
            warp: warpData
        };
        
        console.log('SUCCESS: Returning fabric cut data');
        console.log('=== END QR CODE LOOKUP DEBUG ===');
        
        res.json(response);
    } catch (err) {
        console.error('=== QR CODE LOOKUP ERROR ===');
        console.error('Error finding fabric cut by QR code:', err);
        console.error('Error stack:', err.stack);
        res.status(500).json({ message: `Server error: ${err.message}` });
    }
});

// Generate print summary for search results
router.get('/print-summary', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { search = '' } = req.query;
        
        console.log(`Generating print summary for search: "${search}"`);
        const startTime = Date.now();
        
        // Get all fabric cuts with inspection arrival
        const fabricCutsSnapshot = await db.collection('fabricCuts').get();
        const scannedFabricCuts = [];
        const warpIds = new Set();
        
        fabricCutsSnapshot.forEach(doc => {
            const fabricCutData = doc.data();
            // Only include fabric cuts that have been scanned for loom-in
            if (fabricCutData.inspectionArrival) {
                const fabricCut = {
                    id: doc.id,
                    ...fabricCutData
                };
                
                // Apply search filter if provided
                if (search.trim() !== '') {
                    const searchTerm = search.toLowerCase();
                    const fabricNumber = fabricCut.fabricNumber?.toLowerCase() || '';
                    const qrData = `${fabricCut.warp?.warpNumber || 'unknown'}/${String(fabricCut.cutNumber || '').padStart(2, '0')}`.toLowerCase();
                    
                    if (fabricNumber.includes(searchTerm) || 
                        qrData.includes(searchTerm) ||
                        fabricCut.warp?.warpNumber?.toLowerCase().includes(searchTerm) ||
                        fabricCut.warp?.warpOrderNumber?.toLowerCase().includes(searchTerm)) {
                        scannedFabricCuts.push(fabricCut);
                        if (fabricCutData.warpId) {
                            warpIds.add(fabricCutData.warpId);
                        }
                    }
                } else {
                    scannedFabricCuts.push(fabricCut);
                    if (fabricCutData.warpId) {
                        warpIds.add(fabricCutData.warpId);
                    }
                }
            }
        });
        
        if (scannedFabricCuts.length === 0) {
            return res.json({
                summary: {
                    totalFabricCuts: 0,
                    totalQuantity: 0,
                    dateRange: null,
                    searchTerm: search
                },
                fabricCuts: []
            });
        }
        
        // Batch fetch all warps in parallel
        const warpsMap = new Map();
        const orderIds = new Set();
        const loomIds = new Set();
        
        if (warpIds.size > 0) {
            const warpPromises = Array.from(warpIds).map(async (warpId) => {
                try {
                    const warpDoc = await db.collection('warps').doc(warpId).get();
                    if (warpDoc.exists) {
                        const warpData = { id: warpDoc.id, ...warpDoc.data() };
                        warpsMap.set(warpId, warpData);
                        
                        if (warpData.orderId) orderIds.add(warpData.orderId);
                        if (warpData.loomId) loomIds.add(warpData.loomId);
                    }
                } catch (err) {
                    console.error(`Error fetching warp ${warpId}:`, err);
                }
            });
            await Promise.all(warpPromises);
        }
        
        // Batch fetch orders and looms in parallel
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
        
        // Assemble the final response with enriched data
        const enrichedFabricCuts = scannedFabricCuts.map(fabricCutData => {
            const warp = warpsMap.get(fabricCutData.warpId);
            let enrichedWarp = null;
            
            if (warp) {
                let loomData = warp.loomId ? loomsMap.get(warp.loomId) : null;
                
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
                    order: warp.orderId ? ordersMap.get(warp.orderId) : null,
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
        
        // Calculate summary statistics
        const totalQuantity = enrichedFabricCuts.reduce((sum, cut) => sum + (cut.quantity || 0), 0);
        const dates = enrichedFabricCuts.map(cut => {
            return cut.inspectionArrival?.toDate ? cut.inspectionArrival.toDate() : new Date(cut.inspectionArrival);
        });
        const dateRange = dates.length > 0 ? {
            from: new Date(Math.min(...dates)),
            to: new Date(Math.max(...dates))
        } : null;
        
        const totalTime = Date.now() - startTime;
        console.log(`Print summary generated in ${totalTime}ms for ${enrichedFabricCuts.length} fabric cuts`);
        
        res.json({
            summary: {
                totalFabricCuts: enrichedFabricCuts.length,
                totalQuantity,
                dateRange,
                searchTerm: search,
                generatedAt: new Date()
            },
            fabricCuts: enrichedFabricCuts
        });
    } catch (err) {
        console.error('Error generating print summary:', err);
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
        const fabricNumber = fabricCutData.fabricNumber;
        
        // Start a batch operation for atomic deletion
        const batch = db.batch();
        
        // Delete the fabric cut
        batch.delete(docRef);
        
        // Check if this fabric cut exists in processing receipts and delete them
        const processingReceiptsSnapshot = await db.collection('processingReceipts')
            .where('fabricNumber', '==', fabricNumber)
            .get();
        
        const processingReceiptsSnapshot2 = await db.collection('processingReceipts')
            .where('newFabricNumber', '==', fabricNumber)
            .get();
        
        let deletedReceiptsCount = 0;
        
        // Delete matching processing receipts
        processingReceiptsSnapshot.forEach(receiptDoc => {
            batch.delete(receiptDoc.ref);
            deletedReceiptsCount++;
        });
        
        processingReceiptsSnapshot2.forEach(receiptDoc => {
            batch.delete(receiptDoc.ref);
            deletedReceiptsCount++;
        });
        
        // Commit all deletions
        await batch.commit();
        
        let message = 'Fabric cut deleted successfully';
        if (wasInLoomIn) {
            message += '. This fabric cut has been removed from loom-in history as well.';
        }
        if (deletedReceiptsCount > 0) {
            message += ` Associated processing receipts (${deletedReceiptsCount}) have been cleaned up.`;
        }
        
        res.json({ 
            message: message,
            id: req.params.id,
            wasInLoomInHistory: wasInLoomIn,
            deletedReceiptsCount: deletedReceiptsCount
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

// Check if fabric cut has sub-cuts (to prevent cutting already cut fabrics)
router.get('/check-sub-cuts/:fabricId', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { fabricId } = req.params;
        
        // Check if this fabric has been used as a parent for sub-cuts
        const subCutsSnapshot = await db.collection('fabricCuts').get();
        
        let hasSubCuts = false;
        subCutsSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.parentFabricId === fabricId) {
                hasSubCuts = true;
            }
        });
        
        res.json({ hasSubCuts });
    } catch (err) {
        console.error('Error checking sub-cuts:', err);
        res.status(500).json({ message: err.message });
    }
});

// Split fabric into multiple pieces
router.post('/split-fabric', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { originalFabricId, cutQuantities } = req.body;
        
        if (!originalFabricId || !cutQuantities || cutQuantities.length < 2) {
            return res.status(400).json({ message: 'Invalid request data' });
        }
        
        // Get the original fabric cut
        const originalFabricDoc = await db.collection('fabricCuts').doc(originalFabricId).get();
        if (!originalFabricDoc.exists) {
            return res.status(404).json({ message: 'Original fabric cut not found' });
        }
        
        const originalFabric = originalFabricDoc.data();
        
        // Validate that total cut quantities equal original quantity
        const totalCutQuantity = cutQuantities.reduce((sum, qty) => sum + parseFloat(qty), 0);
        if (Math.abs(totalCutQuantity - originalFabric.quantity) > 0.01) {
            return res.status(400).json({ 
                message: 'Total cut quantities must equal original fabric quantity' 
            });
        }
        
        // Get warp and order information
        const warpDoc = await db.collection('warps').doc(originalFabric.warpId).get();
        if (!warpDoc.exists) {
            return res.status(404).json({ message: 'Associated warp not found' });
        }
        
        const warp = warpDoc.data();
        const orderDoc = await db.collection('orders').doc(warp.orderId).get();
        if (!orderDoc.exists) {
            return res.status(404).json({ message: 'Associated order not found' });
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
        
        // Create new fabric cuts with sub-numbering
        const newFabricCuts = [];
        const batch = db.batch();
        
        for (let i = 0; i < cutQuantities.length; i++) {
            const subCutNumber = i + 1;
            const newCutNumber = `${originalFabric.cutNumber}/${String(subCutNumber).padStart(2, '0')}`;
            const fabricNumber = `${warp.warpNumber || warp.warpOrderNumber || 'UNKNOWN'}-${newCutNumber}`;
            const qrData = `${warp.warpNumber || warp.warpOrderNumber || 'UNKNOWN'}/${newCutNumber}`;
            
            const qrCode = await QRCode.toDataURL(qrData);
            
            // Validation: Ensure we're not creating processing-received fabric cuts
            if (fabricNumber.startsWith('WR/')) {
                throw new Error(`Invalid fabric number format: ${fabricNumber}. WR/ prefixed numbers are reserved for processing-received cuts.`);
            }
            
            const newFabricCutData = {
                fabricNumber,
                warpId: originalFabric.warpId,
                quantity: parseFloat(cutQuantities[i]),
                cutNumber: newCutNumber,
                parentFabricId: originalFabricId,
                parentCutNumber: originalFabric.cutNumber,
                subCutNumber: subCutNumber,
                totalSubCuts: cutQuantities.length,
                qrCode,
                qrCodeData: qrCode, // Store QR code data for printing
                location: originalFabric.location || 'Veerapandi', // Inherit or set new location
                // Store loom snapshot data for historical preservation
                loomId: originalFabric.loomId,
                loomName: originalFabric.loomName || (loomData ? loomData.loomName : null),
                companyName: originalFabric.companyName || (loomData ? loomData.companyName : null),
                createdAt: new Date(),
                // Do not inherit inspection arrival - new cuts need to be scanned separately
                inspectionArrival: null
            };
            
            const docRef = db.collection('fabricCuts').doc();
            batch.set(docRef, newFabricCutData);
            
            newFabricCuts.push({
                id: docRef.id,
                ...newFabricCutData,
                warp: {
                    id: warpDoc.id,
                    ...warp,
                    order: {
                        id: orderDoc.id,
                        ...order
                    },
                    loom: loomData ? {
                        id: warp.loomId,
                        ...loomData
                    } : null
                }
            });
        }
        
        // Delete the original fabric cut
        batch.delete(db.collection('fabricCuts').doc(originalFabricId));
        
        // Check if original fabric exists in processing receipts and delete them
        const originalFabricNumber = originalFabric.fabricNumber;
        const processingReceiptsSnapshot = await db.collection('processingReceipts')
            .where('fabricNumber', '==', originalFabricNumber)
            .get();
        
        const processingReceiptsSnapshot2 = await db.collection('processingReceipts')
            .where('newFabricNumber', '==', originalFabricNumber)
            .get();
        
        // Delete matching processing receipts
        processingReceiptsSnapshot.forEach(receiptDoc => {
            batch.delete(receiptDoc.ref);
        });
        
        processingReceiptsSnapshot2.forEach(receiptDoc => {
            batch.delete(receiptDoc.ref);
        });
        
        // Commit all changes
        await batch.commit();
        
        res.status(201).json({
            message: `Fabric successfully cut into ${cutQuantities.length} pieces`,
            originalFabricId,
            newFabricCuts
        });
        
    } catch (err) {
        console.error('Error splitting fabric:', err);
        res.status(500).json({ message: err.message });
    }
});

// Get fabric cut for processing orders (only returns inspected fabric cuts)
router.get('/for-processing/:qrCode', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { qrCode } = req.params;
        
        console.log('=== PROCESSING ORDER FABRIC CUT LOOKUP ===');
        console.log('Raw QR code:', qrCode);
        
        // Parse QR code (format: WARPNUMBER/CUTNUMBER)
        const decodedQR = decodeURIComponent(qrCode);
        console.log('Decoded QR code:', decodedQR);
        
        const parts = decodedQR.split('/');
        console.log('QR parts:', parts);
        
        if (parts.length !== 2 && parts.length !== 3) {
            console.log('ERROR: Invalid QR code format');
            return res.status(400).json({ message: 'Invalid QR code format. Expected WARPNUMBER/CUTNUMBER' });
        }
        
        let warpNumber, cutNumber, splitNumber;
        
        if (parts.length === 2) {
            [warpNumber, cutNumber] = parts;
            splitNumber = null;
        } else {
            [warpNumber, cutNumber, splitNumber] = parts;
        }
        
        const parsedCutNumber = parseInt(cutNumber, 10);
        const parsedSplitNumber = splitNumber ? parseInt(splitNumber, 10) : null;
        
        if (isNaN(parsedCutNumber) || (splitNumber && isNaN(parsedSplitNumber))) {
            return res.status(400).json({ message: 'Invalid cut or split number in QR code' });
        }
        
        // Find fabric cut by fabricNumber pattern
        const searchPatterns = [];
        
        if (splitNumber) {
            searchPatterns.push(
                `${warpNumber}-${parsedCutNumber}/${String(parsedSplitNumber).padStart(2, '0')}`,
                `${warpNumber}-${parsedCutNumber}/${parsedSplitNumber}`,
                `${warpNumber}/${parsedCutNumber}/${String(parsedSplitNumber).padStart(2, '0')}`,
                `${warpNumber}/${parsedCutNumber}/${parsedSplitNumber}`
            );
        } else {
            searchPatterns.push(
                `${warpNumber}-${String(parsedCutNumber).padStart(2, '0')}`,
                `${warpNumber}-${parsedCutNumber}`,
                `${warpNumber}/${String(parsedCutNumber).padStart(2, '0')}`,
                `${warpNumber}/${parsedCutNumber}`
            );
        }
        
        console.log('Searching fabric number patterns:', searchPatterns);
        
        // Get all fabric cuts and filter
        const fabricCutsSnapshot = await db.collection('fabricCuts').get();
        
        let fabricCutDoc = null;
        let fabricCutData = null;
        
        fabricCutsSnapshot.forEach(doc => {
            const data = doc.data();
            if (searchPatterns.includes(data.fabricNumber)) {
                fabricCutDoc = doc;
                fabricCutData = data;
                console.log('MATCH FOUND! Fabric number:', data.fabricNumber);
            }
        });
        
        if (!fabricCutDoc) {
            console.log('Fabric cut not found for any pattern');
            return res.status(404).json({ 
                message: `Fabric cut not found for QR code: ${decodedQR}`,
                exists: false
            });
        }
        
        // Check if this fabric cut has been 4-point inspected
        const hasInspection = fabricCutData.scannedAt4Point === true || fabricCutData['4-pointCompleted'] === true;
        
        if (!hasInspection) {
            console.log('Fabric cut found but not inspected');
            return res.status(400).json({ 
                message: 'This fabric cut has not been scanned in 4-point inspection. Please complete inspection first.',
                exists: true,
                hasInspection: false,
                fabricNumber: fabricCutData.fabricNumber
            });
        }
        
        // Get inspection data to calculate actual inspected quantity
        let inspectionData = null;
        let actualInspectedQuantity = fabricCutData.quantity || 0; // Default to original quantity
        
        try {
            const inspectionsSnapshot = await db.collection('inspections')
                .where('fabricCutId', '==', fabricCutDoc.id)
                .where('inspectionType', '==', '4-point')
                .get();
            
            if (!inspectionsSnapshot.empty) {
                inspectionData = inspectionsSnapshot.docs[0].data();
                
                // Use the inspected quantity from inspection data (not actual quantity after mistakes)
                if (inspectionData.inspectedQuantity !== undefined) {
                    actualInspectedQuantity = inspectionData.inspectedQuantity;
                } else if (inspectionData.actualQuantity !== undefined) {
                    actualInspectedQuantity = inspectionData.actualQuantity;
                } else {
                    // Fallback to original quantity if no inspection quantity is available
                    actualInspectedQuantity = fabricCutData.quantity || 0;
                }
            }
        } catch (inspErr) {
            console.error('Error fetching inspection data:', inspErr);
            // Continue with original quantity as fallback
        }
        
        // Get warp and order information
        let warpData = null;
        let orderData = null;
        if (fabricCutData.warpId) {
            const warpDoc = await db.collection('warps').doc(fabricCutData.warpId).get();
            if (warpDoc.exists) {
                warpData = warpDoc.data();
                
                // Get order information
                if (warpData.orderId) {
                    const orderDoc = await db.collection('orders').doc(warpData.orderId).get();
                    if (orderDoc.exists) {
                        orderData = orderDoc.data();
                    }
                }
            }
        }
        
        // Return fabric cut data for processing orders
        const response = {
            exists: true,
            hasInspection: true,
            fabricNumber: fabricCutData.fabricNumber,
            warpNumber: warpData ? warpData.warpNumber || warpData.warpOrderNumber : warpNumber,
            inspectedQuantity: actualInspectedQuantity,
            originalQuantity: fabricCutData.quantity || 0,
            mistakeQuantity: inspectionData?.mistakeQuantity || fabricCutData.mistakeQuantity || 0,
            cutNumber: fabricCutData.cutNumber,
            warpId: fabricCutData.warpId,
            orderId: warpData ? warpData.orderId : null,
            orderNumber: orderData ? orderData.orderNumber : 'N/A',
            designNumber: orderData ? orderData.designNumber : 'N/A',
            designName: orderData ? orderData.designName : 'N/A',
            id: fabricCutDoc.id
        };
        
        console.log('Returning fabric cut data for processing:', response);
        console.log('=== END PROCESSING ORDER FABRIC CUT LOOKUP ===');
        
        res.json(response);
        
    } catch (err) {
        console.error('Error fetching fabric cut for processing:', err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;