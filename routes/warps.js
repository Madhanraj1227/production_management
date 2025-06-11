const express = require('express');
const router = express.Router();

// GET /api/warps - Get all warps
router.get('/', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const warpsSnapshot = await db.collection('warps').get();
    const warps = warpsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Sort by createdAt in JavaScript to avoid index requirement
    warps.sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
      return dateB.getTime() - dateA.getTime(); // Descending order
    });
    
    res.json(warps);
  } catch (error) {
    console.error('Error fetching warps:', error);
    res.status(500).json({ error: 'Failed to fetch warps' });
  }
});

// Get count of active warps
router.get('/count/active', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const warpsRef = db.collection('warps');
        
        // Count warps with status 'active'
        const snapshot = await warpsRef
            .where('status', '==', 'active')
            .get();
        
        res.json({ count: snapshot.size });
    } catch (err) {
        console.error('Error getting active warps count:', err);
        res.status(500).json({ message: err.message });
    }
});

// Get warps with production summary (ultra-optimized for performance)
router.get('/ultra-optimized', async (req, res) => {
    try {
        const db = req.app.locals.db;
        console.log('Fetching warps with ultra-optimized queries...');
        const startTime = Date.now();
        
        // Step 1: Get all warps in one query
        const warpsSnapshot = await db.collection('warps').get();
        const warps = [];
        const orderIds = new Set();
        const loomIds = new Set();
        const warpIds = [];
        
        // First pass: collect all warps and related IDs
        warpsSnapshot.docs.forEach(doc => {
            const warpData = doc.data();
            const warp = {
                id: doc.id,
                ...warpData
            };
            warps.push(warp);
            warpIds.push(doc.id);
            
            if (warpData.orderId) orderIds.add(warpData.orderId);
            if (warpData.loomId) loomIds.add(warpData.loomId);
        });
        
        console.log(`Step 1: Collected ${warps.length} warps, ${orderIds.size} orders, ${loomIds.size} looms in ${Date.now() - startTime}ms`);
        
        // Step 2: Batch fetch all related data in parallel
        const [ordersMap, loomsMap, productionMap] = await Promise.all([
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
            })(),
            
            // Fetch all fabric cuts in one query and group by warpId
            (async () => {
                const productionMap = new Map();
                
                if (warpIds.length > 0) {
                    // Initialize all warp production data
                    warpIds.forEach(warpId => {
                        productionMap.set(warpId, {
                            totalProduction: 0,
                            totalCuts: 0
                        });
                    });
                    
                    // Get all fabric cuts for all warps in one query
                    const allFabricCutsSnapshot = await db.collection('fabricCuts')
                        .where('warpId', 'in', warpIds.slice(0, 10)) // Firestore 'in' query limit is 10
                        .get();
                    
                    // Process fabric cuts in batches if there are more than 10 warps
                    if (warpIds.length > 10) {
                        const batches = [];
                        for (let i = 10; i < warpIds.length; i += 10) {
                            const batch = warpIds.slice(i, i + 10);
                            batches.push(
                                db.collection('fabricCuts').where('warpId', 'in', batch).get()
                            );
                        }
                        
                        const batchResults = await Promise.all(batches);
                        batchResults.forEach(snapshot => {
                            snapshot.forEach(doc => {
                                const cutData = doc.data();
                                const warpId = cutData.warpId;
                                if (warpId && productionMap.has(warpId)) {
                                    const current = productionMap.get(warpId);
                                    productionMap.set(warpId, {
                                        totalProduction: current.totalProduction + (cutData.quantity || 0),
                                        totalCuts: current.totalCuts + 1
                                    });
                                }
                            });
                        });
                    }
                    
                    // Process the first batch
                    allFabricCutsSnapshot.forEach(doc => {
                        const cutData = doc.data();
                        const warpId = cutData.warpId;
                        if (warpId && productionMap.has(warpId)) {
                            const current = productionMap.get(warpId);
                            productionMap.set(warpId, {
                                totalProduction: current.totalProduction + (cutData.quantity || 0),
                                totalCuts: current.totalCuts + 1
                            });
                        }
                    });
                }
                
                return productionMap;
            })()
        ]);
        
        console.log(`Step 2: Fetched all related data in ${Date.now() - startTime}ms`);
        
        // Step 3: Combine all data
        const enrichedWarps = warps.map(warp => ({
            ...warp,
            order: warp.orderId ? ordersMap.get(warp.orderId) || null : null,
            loom: warp.loomId ? loomsMap.get(warp.loomId) || null : null,
            production: productionMap.get(warp.id) || { totalProduction: 0, totalCuts: 0 }
        }));
        
        // Step 4: Sort by createdAt
        enrichedWarps.sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
            return dateB.getTime() - dateA.getTime();
        });
        
        const totalTime = Date.now() - startTime;
        console.log(`Ultra-optimized warps query completed in ${totalTime}ms for ${enrichedWarps.length} warps`);
        res.json(enrichedWarps);
    } catch (err) {
        console.error('Error in ultra-optimized warps endpoint:', err);
        res.status(500).json({ message: err.message });
    }
});

// Get warps with production summary (optimized for performance)
router.get('/optimized', async (req, res) => {
    try {
        const db = req.app.locals.db;
        console.log('Fetching warps with optimized queries...');
        
        // Get all warps in one query
        const warpsSnapshot = await db.collection('warps').get();
        const warps = [];
        const orderIds = new Set();
        const loomIds = new Set();
        const warpIds = [];
        
        // First pass: collect all warps and related IDs
        warpsSnapshot.docs.forEach(doc => {
            const warpData = doc.data();
            const warp = {
                id: doc.id,
                ...warpData
            };
            warps.push(warp);
            warpIds.push(doc.id);
            
            if (warpData.orderId) orderIds.add(warpData.orderId);
            if (warpData.loomId) loomIds.add(warpData.loomId);
        });
        
        // Batch fetch orders
        const ordersMap = new Map();
        if (orderIds.size > 0) {
            console.log(`Fetching ${orderIds.size} orders in batch...`);
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
        
        // Batch fetch looms
        const loomsMap = new Map();
        if (loomIds.size > 0) {
            console.log(`Fetching ${loomIds.size} looms in batch...`);
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
        
        // Batch fetch fabric cuts production data
        const productionMap = new Map();
        if (warpIds.length > 0) {
            console.log(`Calculating production for ${warpIds.length} warps...`);
            
            // Use Promise.allSettled to handle any individual failures
            const productionPromises = warpIds.map(async (warpId) => {
                try {
                    const fabricCutsSnapshot = await db.collection('fabricCuts')
                        .where('warpId', '==', warpId)
                        .get();
                    
                    let totalProduction = 0;
                    let totalCuts = 0;
                    
                    fabricCutsSnapshot.forEach(cutDoc => {
                        const cutData = cutDoc.data();
                        totalProduction += cutData.quantity || 0;
                        totalCuts += 1;
                    });
                    
                    productionMap.set(warpId, {
                        totalProduction,
                        totalCuts
                    });
                } catch (err) {
                    console.error(`Error fetching fabric cuts for warp ${warpId}:`, err);
                    productionMap.set(warpId, {
                        totalProduction: 0,
                        totalCuts: 0
                    });
                }
            });
            
            await Promise.allSettled(productionPromises);
        }
        
        // Combine all data
        const enrichedWarps = warps.map(warp => ({
            ...warp,
            order: warp.orderId ? ordersMap.get(warp.orderId) || null : null,
            loom: warp.loomId ? loomsMap.get(warp.loomId) || null : null,
            production: productionMap.get(warp.id) || { totalProduction: 0, totalCuts: 0 }
        }));
        
        // Sort by createdAt
        enrichedWarps.sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
            return dateB.getTime() - dateA.getTime();
        });
        
        console.log(`Successfully processed ${enrichedWarps.length} warps with optimized queries`);
        res.json(enrichedWarps);
    } catch (err) {
        console.error('Error in optimized warps endpoint:', err);
        res.status(500).json({ message: err.message });
    }
});

// Get warps with production summary (optimized for performance)
router.get('/with-production', async (req, res) => {
    try {
        const db = req.app.locals.db;
        
        // Get all warps without ordering to avoid index requirement
        const warpsSnapshot = await db.collection('warps').get();
        const warps = [];
        
        for (const doc of warpsSnapshot.docs) {
            const warpData = doc.data();
            
            // Get associated order
            let orderData = null;
            if (warpData.orderId) {
                try {
                    const orderDoc = await db.collection('orders').doc(warpData.orderId).get();
                    if (orderDoc.exists) {
                        orderData = {
                            id: orderDoc.id,
                            ...orderDoc.data()
                        };
                    }
                } catch (err) {
                    console.error('Error fetching order:', err);
                }
            }
            
            // Get associated loom
            let loomData = null;
            if (warpData.loomId) {
                try {
                    const loomDoc = await db.collection('looms').doc(warpData.loomId).get();
                    if (loomDoc.exists) {
                        loomData = {
                            id: loomDoc.id,
                            ...loomDoc.data()
                        };
                    }
                } catch (err) {
                    console.error('Error fetching loom:', err);
                }
            }
            
            // Calculate production data from fabric cuts
            let production = {
                totalProduction: 0,
                totalCuts: 0
            };
            
            try {
                const fabricCutsSnapshot = await db.collection('fabricCuts')
                    .where('warpId', '==', doc.id)
                    .get();
                
                let totalProduction = 0;
                let totalCuts = 0;
                
                fabricCutsSnapshot.forEach(cutDoc => {
                    const cutData = cutDoc.data();
                    totalProduction += cutData.quantity || 0;
                    totalCuts += 1;
                });
                
                production = {
                    totalProduction: totalProduction,
                    totalCuts: totalCuts
                };
            } catch (err) {
                console.error('Error fetching fabric cuts for warp:', doc.id, err);
                // Keep default values if error occurs
            }
            
            warps.push({
                id: doc.id,
                ...warpData,
                order: orderData,
                loom: loomData,
                production: production
            });
        }
        
        // Sort by createdAt in JavaScript to avoid index requirement
        warps.sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
            return dateB.getTime() - dateA.getTime(); // Descending order
        });
        
        res.json(warps);
    } catch (err) {
        console.error('Error fetching warps with production:', err);
        res.status(500).json({ message: err.message });
    }
});

// Get only active warps for fabric cuts
router.get('/active', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const warpsRef = db.collection('warps');
        const snapshot = await warpsRef.where('status', '==', 'active').get();
        
        const warps = [];
        for (const doc of snapshot.docs) {
            const warpData = doc.data();
            
            // Get the associated order
            let orderData = null;
            if (warpData.orderId) {
                const orderDoc = await db.collection('orders').doc(warpData.orderId).get();
                if (orderDoc.exists) {
                    orderData = {
                        id: orderDoc.id,
                        ...orderDoc.data()
                    };
                }
            }
            
            // Get the associated loom
            let loomData = null;
            if (warpData.loomId) {
                const loomDoc = await db.collection('looms').doc(warpData.loomId).get();
                if (loomDoc.exists) {
                    loomData = {
                        id: loomDoc.id,
                        ...loomDoc.data()
                    };
                }
            }
            
            warps.push({
                id: doc.id,
                ...warpData,
                order: orderData,
                loom: loomData
            });
        }
        
        // Sort by creation date
        warps.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        res.json(warps);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/warps/by-order/:orderId - Get warps by order ID
router.get('/by-order/:orderId', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { orderId } = req.params;
        
        const warpsRef = db.collection('warps');
        const snapshot = await warpsRef.where('orderId', '==', orderId).get();
        
        const warps = [];
        for (const doc of snapshot.docs) {
            const warpData = doc.data();
            
            // Get the associated loom
            let loomData = null;
            if (warpData.loomId) {
                try {
                    const loomDoc = await db.collection('looms').doc(warpData.loomId).get();
                    if (loomDoc.exists) {
                        loomData = {
                            id: loomDoc.id,
                            ...loomDoc.data()
                        };
                    }
                } catch (err) {
                    console.error('Error fetching loom:', err);
                }
            }
            
            warps.push({
                id: doc.id,
                ...warpData,
                loom: loomData
            });
        }
        
        // Sort by creation date in JavaScript instead
        warps.sort((a, b) => {
            const dateA = a.createdAt?._seconds || a.createdAt?.seconds || 0;
            const dateB = b.createdAt?._seconds || b.createdAt?.seconds || 0;
            return dateB - dateA;
        });
        
        res.json(warps);
    } catch (err) {
        console.error('Error fetching warps by order:', err);
        res.status(500).json({ message: err.message });
    }
});

// POST /api/warps - Create a new warp
router.post('/', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { warpOrderNumber, orderId, quantity, loomId, startDate, endDate } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    const requestedQuantity = Number(quantity);

    // Check available quantity including freed quantities
    try {
      const orderDoc = await db.collection('orders').doc(orderId).get();
      if (!orderDoc.exists) {
        return res.status(400).json({ error: 'Order not found' });
      }

      const orderData = orderDoc.data();
      const totalWarpingQuantity = orderData.warpingQuantity || 0;
      const totalOrderQuantity = orderData.orderQuantity || 0;

      // Get all existing warps for this order
      const warpsSnapshot = await db.collection('warps')
        .where('orderId', '==', orderId)
        .get();

      let allocatedQuantity = 0;
      warpsSnapshot.forEach(doc => {
        const warpData = doc.data();
        allocatedQuantity += warpData.quantity || 0;
      });

      // Get freed quantity for this order
      let freedQuantity = 0;
      let freedQuantityDoc = null;
      try {
        const freedQuantitySnapshot = await db.collection('freedQuantities')
          .where('orderId', '==', orderId)
          .get();

        if (!freedQuantitySnapshot.empty) {
          freedQuantityDoc = freedQuantitySnapshot.docs[0];
          freedQuantity = freedQuantityDoc.data().totalFreedQuantity || 0;
        }
      } catch (error) {
        console.error('Error fetching freed quantity:', error);
      }

      // Use warping quantity instead of order quantity for validation
      const availableQuantity = totalWarpingQuantity - allocatedQuantity + freedQuantity;

      if (requestedQuantity > availableQuantity) {
        return res.status(400).json({ 
          error: `Insufficient quantity. Requested: ${requestedQuantity}m, Available: ${availableQuantity}m (from warping quantity: ${totalWarpingQuantity}m)` 
        });
      }

      // If we're using freed quantity, deduct from it
      if (freedQuantity > 0 && freedQuantityDoc) {
        const quantityFromFreed = Math.min(requestedQuantity, freedQuantity);
        const newFreedQuantity = freedQuantity - quantityFromFreed;
        
        if (newFreedQuantity > 0) {
          await freedQuantityDoc.ref.update({
            totalFreedQuantity: newFreedQuantity,
            updatedAt: new Date()
          });
        } else {
          // If no freed quantity left, delete the record
          await freedQuantityDoc.ref.delete();
        }
      }
    } catch (error) {
      console.error('Error checking available quantity:', error);
      return res.status(500).json({ error: 'Error validating quantity availability' });
    }

    // Create warp data with correct field names
    const warpData = {
      warpOrderNumber,
      orderId,
      quantity: requestedQuantity,
      loomId,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      status: 'active', // Warps are immediately active when created
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Add warp to database
    const warpRef = await db.collection('warps').add(warpData);

    // Update order status to RUNNING
    await db.collection('orders').doc(orderId).update({
      status: 'RUNNING',
      updatedAt: new Date()
    });

    // Update loom status to busy if loomId is provided
    if (loomId) {
      await db.collection('looms').doc(loomId).update({
        status: 'busy',
        updatedAt: new Date()
      });
    }

    res.status(201).json({
      id: warpRef.id,
      ...warpData
    });
  } catch (error) {
    console.error('Error creating warp:', error);
    res.status(500).json({ error: 'Failed to create warp' });
  }
});

// GET /api/warps/:id - Get a single warp by ID
router.get('/:id', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const warpDoc = await db.collection('warps').doc(req.params.id).get();
    
    if (!warpDoc.exists) {
      return res.status(404).json({ error: 'Warp not found' });
    }

    const warpData = warpDoc.data();
    
    // Get associated order
    let orderData = null;
    if (warpData.orderId) {
      try {
        const orderDoc = await db.collection('orders').doc(warpData.orderId).get();
        if (orderDoc.exists) {
          orderData = {
            id: orderDoc.id,
            ...orderDoc.data()
          };
        }
      } catch (err) {
        console.error('Error fetching order:', err);
      }
    }
    
    // Get associated loom
    let loomData = null;
    if (warpData.loomId) {
      try {
        const loomDoc = await db.collection('looms').doc(warpData.loomId).get();
        if (loomDoc.exists) {
          loomData = {
            id: loomDoc.id,
            ...loomDoc.data()
          };
        }
      } catch (err) {
        console.error('Error fetching loom:', err);
      }
    }

    res.json({
      id: warpDoc.id,
      ...warpData,
      order: orderData,
      loom: loomData
    });
  } catch (error) {
    console.error('Error fetching warp:', error);
    res.status(500).json({ error: 'Failed to fetch warp' });
  }
});

// PUT /api/warps/:id - Update a warp
router.put('/:id', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const warpData = {
      ...req.body,
      updatedAt: new Date()
    };

    await db.collection('warps').doc(req.params.id).update(warpData);

    const updatedWarp = await db.collection('warps').doc(req.params.id).get();
    res.json({
      id: updatedWarp.id,
      ...updatedWarp.data()
    });
  } catch (error) {
    console.error('Error updating warp:', error);
    res.status(500).json({ error: 'Failed to update warp' });
  }
});

// PATCH /api/warps/:id - Update warp status and other fields
router.patch('/:id', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const updateData = {
      ...req.body,
      updatedAt: new Date()
    };

    // Get the current warp data
    const warpDoc = await db.collection('warps').doc(req.params.id).get();
    if (!warpDoc.exists) {
      return res.status(404).json({ error: 'Warp not found' });
    }

    const currentWarpData = warpDoc.data();

    // Handle status-specific actions BEFORE updating
    if (req.body.status) {
      // If marking warp as complete or stopped, set completion date and free up the loom
      if (req.body.status === 'complete' || req.body.status === 'stopped') {
        // Set completion date in the update data
        updateData.completionDate = new Date();
        
        // Free up the loom if it exists
        const loomId = updateData.loomId || currentWarpData.loomId;
        if (loomId) {
          await db.collection('looms').doc(loomId).update({
            status: 'idle',
            updatedAt: new Date()
          });
        }
      }
    }

    // Handle loom reassignment
    if (req.body.loomId && req.body.loomId !== currentWarpData.loomId) {
      // Free up the old loom if it exists
      if (currentWarpData.loomId) {
        await db.collection('looms').doc(currentWarpData.loomId).update({
          status: 'idle',
          updatedAt: new Date()
        });
      }
      
      // Assign the new loom
      await db.collection('looms').doc(req.body.loomId).update({
        status: 'busy',
        updatedAt: new Date()
      });
    }

    // Handle stopped warp with remaining quantity
    if (req.body.status === 'stopped' && req.body.remainingQuantity !== undefined) {
      const originalQuantity = req.body.originalQuantity || currentWarpData.quantity;
      const remainingQuantity = parseFloat(req.body.remainingQuantity);
      const usedQuantity = originalQuantity - remainingQuantity;

      // Update the warp with remaining quantity as the new quantity
      updateData.quantity = remainingQuantity;
      updateData.originalQuantity = originalQuantity;
      updateData.usedQuantity = usedQuantity;

      // Create a freed quantity record for the order - FREE THE REMAINING QUANTITY (unused portion)
      if (remainingQuantity > 0 && currentWarpData.orderId) {
        try {
          // Check if freed quantity record already exists for this order
          const freedQuantitySnapshot = await db.collection('freedQuantities')
            .where('orderId', '==', currentWarpData.orderId)
            .get();

          if (freedQuantitySnapshot.empty) {
            // Create new freed quantity record
            await db.collection('freedQuantities').add({
              orderId: currentWarpData.orderId,
              totalFreedQuantity: remainingQuantity, // Free the remaining (unused) quantity
              createdAt: new Date(),
              updatedAt: new Date()
            });
          } else {
            // Update existing freed quantity record
            const freedDoc = freedQuantitySnapshot.docs[0];
            const currentFreed = freedDoc.data().totalFreedQuantity || 0;
            await freedDoc.ref.update({
              totalFreedQuantity: currentFreed + remainingQuantity, // Add remaining quantity to freed
              updatedAt: new Date()
            });
          }
        } catch (error) {
          console.error('Error updating freed quantity:', error);
          // Don't fail the main operation if this fails
        }
      }
    }

    // Update the warp with all the data including completion date
    await db.collection('warps').doc(req.params.id).update(updateData);

    // Get updated warp data with relationships
    const updatedWarpDoc = await db.collection('warps').doc(req.params.id).get();
    const updatedWarpData = updatedWarpDoc.data();
    
    // Get associated order
    let orderData = null;
    if (updatedWarpData.orderId) {
      try {
        const orderDoc = await db.collection('orders').doc(updatedWarpData.orderId).get();
        if (orderDoc.exists) {
          orderData = {
            id: orderDoc.id,
            ...orderDoc.data()
          };
        }
      } catch (err) {
        console.error('Error fetching order:', err);
      }
    }
    
    // Get associated loom
    let loomData = null;
    if (updatedWarpData.loomId) {
      try {
        const loomDoc = await db.collection('looms').doc(updatedWarpData.loomId).get();
        if (loomDoc.exists) {
          loomData = {
            id: loomDoc.id,
            ...loomDoc.data()
          };
        }
      } catch (err) {
        console.error('Error fetching loom:', err);
      }
    }

    res.json({
      id: updatedWarpDoc.id,
      ...updatedWarpData,
      order: orderData,
      loom: loomData
    });
  } catch (error) {
    console.error('Error updating warp:', error);
    res.status(500).json({ error: 'Failed to update warp' });
  }
});

// GET /api/warps/available-quantity/:orderId - Get available quantity for an order
router.get('/available-quantity/:orderId', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { orderId } = req.params;

    // Get the order
    const orderDoc = await db.collection('orders').doc(orderId).get();
    if (!orderDoc.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const orderData = orderDoc.data();
    const totalWarpingQuantity = orderData.warpingQuantity || 0;
    const totalOrderQuantity = orderData.orderQuantity || 0;

    // Get all warps for this order
    const warpsSnapshot = await db.collection('warps')
      .where('orderId', '==', orderId)
      .get();

    let allocatedQuantity = 0;
    warpsSnapshot.forEach(doc => {
      const warpData = doc.data();
      // For stopped warps, use originalQuantity if available, otherwise use current quantity
      // This ensures we count the full original allocation, not the reduced remaining quantity
      if (warpData.status === 'stopped' && warpData.originalQuantity) {
        allocatedQuantity += warpData.originalQuantity;
      } else {
        allocatedQuantity += warpData.quantity || 0;
      }
    });

    // Get freed quantity for this order
    let freedQuantity = 0;
    try {
      const freedQuantitySnapshot = await db.collection('freedQuantities')
        .where('orderId', '==', orderId)
        .get();

      if (!freedQuantitySnapshot.empty) {
        const freedDoc = freedQuantitySnapshot.docs[0];
        freedQuantity = freedDoc.data().totalFreedQuantity || 0;
      }
    } catch (error) {
      console.error('Error fetching freed quantity:', error);
      // Continue without freed quantity if error occurs
    }

    // Use warping quantity for available calculation
    const availableQuantity = totalWarpingQuantity - allocatedQuantity + freedQuantity;

    res.json({
      orderId,
      totalWarpingQuantity,
      totalOrderQuantity,
      allocatedQuantity,
      freedQuantity,
      availableQuantity: Math.max(0, availableQuantity)
    });
  } catch (error) {
    console.error('Error fetching available quantity:', error);
    res.status(500).json({ error: 'Failed to fetch available quantity' });
  }
});

// DELETE /api/warps/:id - Delete a warp
router.delete('/:id', async (req, res) => {
  try {
    const db = req.app.locals.db;
    await db.collection('warps').doc(req.params.id).delete();
    res.json({ message: 'Warp deleted successfully' });
  } catch (error) {
    console.error('Error deleting warp:', error);
    res.status(500).json({ error: 'Failed to delete warp' });
  }
});

// Get all details for a completed warp for wage calculation
router.get('/wages-details/:warpNumber', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { warpNumber } = req.params;

        // 1. Find the warp by warpNumber
        const warpsSnapshot = await db.collection('warps').where('warpOrderNumber', '==', warpNumber).limit(1).get();
        if (warpsSnapshot.empty) {
            return res.status(404).json({ message: `Warp with number ${warpNumber} not found.` });
        }

        const warpDoc = warpsSnapshot.docs[0];
        const warp = { id: warpDoc.id, ...warpDoc.data() };

        // 2. Check if the warp is completed or stopped
        if (warp.status !== 'complete' && warp.status !== 'stopped') {
            return res.status(400).json({ message: `Warp ${warpNumber} is not ready for wage calculation. Status must be 'complete' or 'stopped'. Current status: ${warp.status}.` });
        }

        // 3. Fetch loom, order, and all fabric cuts for the warp in parallel
        const [loom, order, fabricCutsSnapshot] = await Promise.all([
            warp.loomId ? db.collection('looms').doc(warp.loomId).get() : Promise.resolve(null),
            warp.orderId ? db.collection('orders').doc(warp.orderId).get() : Promise.resolve(null),
            db.collection('fabricCuts').where('warpId', '==', warp.id).get()
        ]);

        const fabricCuts = fabricCutsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const fabricCutIds = fabricCuts.map(cut => cut.id);

        // 4. Fetch all 4-point inspections for all fabric cuts of this warp
        let inspectionsMap = new Map();
        if (fabricCutIds.length > 0) {
            const inspectionPromises = [];
            // Firestore 'in' query has a limit of 30 values per query
            for (let i = 0; i < fabricCutIds.length; i += 30) {
                const batchIds = fabricCutIds.slice(i, i + 30);
                inspectionPromises.push(
                    db.collection('inspections')
                        .where('fabricCutId', 'in', batchIds)
                        .where('inspectionType', '==', '4-point')
                        .get()
                );
            }

            const inspectionSnapshots = await Promise.all(inspectionPromises);
            inspectionSnapshots.forEach(snapshot => {
                snapshot.forEach(doc => {
                    const inspectionData = doc.data();
                    inspectionsMap.set(inspectionData.fabricCutId, { id: doc.id, ...inspectionData });
                });
            });
        }
        
        // --- NEW VALIDATION STEP ---
        // Check if all fabric cuts have been scanned at 4-point inspection
        const notScannedAt4Point = fabricCuts.filter(cut => !inspectionsMap.has(cut.id));

        if (notScannedAt4Point.length > 0) {
            const missingCuts = notScannedAt4Point.map(cut => cut.fabricNumber).join(', ');
            const message = `The following fabric cuts must be scanned at 4-Point Inspection before calculating wages: ${missingCuts}.`;
            return res.status(400).json({ message });
        }
        // --- END NEW VALIDATION ---

        // 5. Assemble the data
        const loomData = loom && loom.exists ? { id: loom.id, ...loom.data() } : null;
        const orderData = order && order.exists ? { id: order.id, ...order.data() } : null;

        const fabricCutsData = fabricCuts.map(cut => {
            const inspectionData = inspectionsMap.get(cut.id) || {};
            
            // Handle both inspector formats: array (new) and individual fields (old)
            let inspectors = [];
            if (inspectionData.inspectors && inspectionData.inspectors.length > 0) {
                // New format: inspectors array
                inspectors = inspectionData.inspectors;
            } else if (inspectionData.inspector1 || inspectionData.inspector2) {
                // Old format: individual inspector fields
                inspectors = [inspectionData.inspector1, inspectionData.inspector2].filter(Boolean);
            }
            
            return {
                ...cut,
                loomInDate: cut.createdAt,
                inspectedQuantity: inspectionData.inspectedQuantity || 0,
                mistakeQuantity: inspectionData.mistakeQuantity || 0,
                actualQuantity: inspectionData.actualQuantity || 0,
                mistakes: inspectionData.mistakes || [],
                inspectors: inspectors,
                inspector1: inspectionData.inspector1 || null,
                inspector2: inspectionData.inspector2 || null,
                inspectionDate: inspectionData.inspectionDate || null,
            };
        });

        // 6. Send the complete response
        res.json({
            warp,
            loom: loomData,
            order: orderData,
            fabricCuts: fabricCutsData,
        });

    } catch (error) {
        console.error(`Error fetching wage details for warp ${req.params.warpNumber}:`, error);
        res.status(500).json({ message: 'Failed to fetch wage details.' });
    }
});

module.exports = router; 