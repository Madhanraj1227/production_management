const express = require('express');
const router = express.Router();

// GET all inspections
router.get('/', async (req, res) => {
  try {
    const db = req.app.locals.db;
    
    // Get all inspections
    const inspectionsSnapshot = await db.collection('inspections').get();
    
    const inspections = [];
    const fabricCutIds = new Set();
    
    inspectionsSnapshot.forEach(doc => {
      const data = doc.data();
      inspections.push({
        id: doc.id,
        ...data
      });
      if (data.fabricCutId) {
        fabricCutIds.add(data.fabricCutId);
      }
    });
    
    // Batch fetch fabric cuts with their related data
    const fabricCutsMap = new Map();
    const warpIds = new Set();
    
    if (fabricCutIds.size > 0) {
      const fabricCutPromises = Array.from(fabricCutIds).map(async (fabricCutId) => {
        try {
          const fabricCutDoc = await db.collection('fabricCuts').doc(fabricCutId).get();
          if (fabricCutDoc.exists) {
            const fabricCutData = { id: fabricCutDoc.id, ...fabricCutDoc.data() };
            fabricCutsMap.set(fabricCutId, fabricCutData);
            if (fabricCutData.warpId) {
              warpIds.add(fabricCutData.warpId);
            }
          }
        } catch (err) {
          console.error(`Error fetching fabric cut ${fabricCutId}:`, err);
        }
      });
      await Promise.all(fabricCutPromises);
    }
    
    // Batch fetch warps and their orders/looms
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
    
    // Batch fetch orders and looms
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
    
    // Assemble the final response with all related data
    const enrichedInspections = inspections.map(inspection => {
      const fabricCut = fabricCutsMap.get(inspection.fabricCutId);
      let enrichedFabricCut = fabricCut;
      
      if (fabricCut && fabricCut.warpId) {
        const warp = warpsMap.get(fabricCut.warpId);
        if (warp) {
          const order = warp.orderId ? ordersMap.get(warp.orderId) : null;
          const loom = warp.loomId ? loomsMap.get(warp.loomId) : null;
          
          enrichedFabricCut = {
            ...fabricCut,
            warp: {
              ...warp,
              order: order,
              loom: loom
            }
          };
        }
      }
      
      return {
        ...inspection,
        fabricCut: enrichedFabricCut
      };
    });
    
    res.json(enrichedInspections);
  } catch (error) {
    console.error('Error fetching inspections:', error);
    res.status(500).json({ error: 'Failed to fetch inspections' });
  }
});

// GET inspections by order ID
router.get('/by-order/:orderId', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { orderId } = req.params;

    // 1. Find all warps for the given order
    const warpsSnapshot = await db.collection('warps').where('orderId', '==', orderId).get();
    if (warpsSnapshot.empty) {
      return res.json([]);
    }
    const warpIds = warpsSnapshot.docs.map(doc => doc.id);

    // 2. Find all fabric cuts for those warps
    const fabricCutsSnapshot = await db.collection('fabricCuts').where('warpId', 'in', warpIds).get();
    if (fabricCutsSnapshot.empty) {
      return res.json([]);
    }
    const fabricCutIds = fabricCutsSnapshot.docs.map(doc => doc.id);

    // 3. Find all inspections for those fabric cuts
    const inspectionsSnapshot = await db.collection('inspections').where('fabricCutId', 'in', fabricCutIds).get();
    const inspections = inspectionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Create a map of fabric cuts for easy lookup
    const fabricCutsMap = new Map();
    fabricCutsSnapshot.docs.forEach(doc => {
        fabricCutsMap.set(doc.id, { id: doc.id, ...doc.data() });
    });

    // Attach fabric cut data to each inspection
    const enrichedInspections = inspections.map(inspection => ({
        ...inspection,
        fabricCut: fabricCutsMap.get(inspection.fabricCutId) || null
    }));

    res.json(enrichedInspections);
  } catch (error) {
    console.error('Error fetching inspections by order:', error);
    res.status(500).json({ error: 'Failed to fetch inspections by order' });
  }
});

// GET inspections by fabric cut ID
router.get('/fabric-cut/:fabricCutId', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const inspectionsSnapshot = await db.collection('inspections')
      .where('fabricCutId', '==', req.params.fabricCutId)
      .get();
    
    const inspections = [];
    inspectionsSnapshot.forEach(doc => {
      inspections.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    res.json(inspections);
  } catch (error) {
    console.error('Error fetching inspections by fabric cut:', error);
    res.status(500).json({ error: 'Failed to fetch inspections' });
  }
});

// GET 4-Point inspections with fabric cut details
router.get('/4-point', async (req, res) => {
  try {
    const db = req.app.locals.db;
    
    // Get all 4-Point inspections
    const inspectionsSnapshot = await db.collection('inspections')
      .where('inspectionType', '==', '4-point')
      .get();
    
    const inspections = [];
    const fabricCutIds = new Set();
    
    inspectionsSnapshot.forEach(doc => {
      const data = doc.data();
      inspections.push({
        id: doc.id,
        ...data
      });
      if (data.fabricCutId) {
        fabricCutIds.add(data.fabricCutId);
      }
    });
    
    // Batch fetch fabric cuts with their related data
    const fabricCutsMap = new Map();
    const warpIds = new Set();
    
    if (fabricCutIds.size > 0) {
      const fabricCutPromises = Array.from(fabricCutIds).map(async (fabricCutId) => {
        try {
          const fabricCutDoc = await db.collection('fabricCuts').doc(fabricCutId).get();
          if (fabricCutDoc.exists) {
            const fabricCutData = { id: fabricCutDoc.id, ...fabricCutDoc.data() };
            fabricCutsMap.set(fabricCutId, fabricCutData);
            if (fabricCutData.warpId) {
              warpIds.add(fabricCutData.warpId);
            }
          }
        } catch (err) {
          console.error(`Error fetching fabric cut ${fabricCutId}:`, err);
        }
      });
      await Promise.all(fabricCutPromises);
    }
    
    // Batch fetch warps and their orders/looms
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
    
    // Batch fetch orders and looms
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
    
    // Assemble the final response with all related data
    const enrichedInspections = inspections.map(inspection => {
      const fabricCut = fabricCutsMap.get(inspection.fabricCutId);
      let enrichedFabricCut = fabricCut;
      
      if (fabricCut && fabricCut.warpId) {
        const warp = warpsMap.get(fabricCut.warpId);
        if (warp) {
          const order = warp.orderId ? ordersMap.get(warp.orderId) : null;
          const loom = warp.loomId ? loomsMap.get(warp.loomId) : null;
          
          enrichedFabricCut = {
            ...fabricCut,
            warp: {
              ...warp,
              order: order,
              loom: loom
            }
          };
        }
      }
      
      return {
        ...inspection,
        fabricCut: enrichedFabricCut
      };
    });
    
    res.json(enrichedInspections);
  } catch (error) {
    console.error('Error fetching 4-Point inspections:', error);
    res.status(500).json({ error: 'Failed to fetch 4-Point inspections' });
  }
});

// GET inspection by ID
router.get('/:id', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const doc = await db.collection('inspections').doc(req.params.id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Inspection not found' });
    }
    
    res.json({
      id: doc.id,
      ...doc.data()
    });
  } catch (error) {
    console.error('Error fetching inspection:', error);
    res.status(500).json({ error: 'Failed to fetch inspection' });
  }
});

// POST create new inspection
router.post('/', async (req, res) => {
  try {
    console.log('=== INSPECTION CREATION DEBUG ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const db = req.app.locals.db;
    const { fabricCutId, ...otherData } = req.body;

    console.log('Extracted fabricCutId:', fabricCutId);
    console.log('Other data:', JSON.stringify(otherData, null, 2));

    if (!fabricCutId) {
      console.log('ERROR: No fabricCutId provided');
      return res.status(400).json({ error: 'Fabric Cut ID is required' });
    }

    // --- Data Enrichment Step ---
    // Fetch fabric cut to get warpId, fabricNumber, etc.
    console.log('Fetching fabric cut doc...');
    const fabricCutDoc = await db.collection('fabricCuts').doc(fabricCutId).get();
    if (!fabricCutDoc.exists) {
      console.log('ERROR: Fabric cut not found:', fabricCutId);
      return res.status(404).json({ error: 'Fabric cut not found' });
    }
    const fabricCutData = fabricCutDoc.data();
    console.log('Fabric cut data:', JSON.stringify(fabricCutData, null, 2));

    const inspectionData = {
      ...otherData,
      fabricCutId: fabricCutId,
      fabricNumber: fabricCutData.fabricNumber, // From fetched data
      warpId: fabricCutData.warpId, // From fetched data
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    console.log('Final inspection data:', JSON.stringify(inspectionData, null, 2));
    
    console.log('Adding inspection to database...');
    const docRef = await db.collection('inspections').add(inspectionData);
    console.log('Inspection created with ID:', docRef.id);
    
    // Update fabric cut with inspection status
    console.log('Updating fabric cut with inspection status...');
    if (inspectionData.inspectionType === '4-point') {
        await fabricCutDoc.ref.update({
            scannedAt4Point: true,
            [`${inspectionData.inspectionType}Completed`]: true,
            [`${inspectionData.inspectionType}Date`]: inspectionData.inspectionDate,
            updatedAt: new Date().toISOString()
        });
        console.log('Updated fabric cut with 4-point status');
    } else {
         await fabricCutDoc.ref.update({
            [`${inspectionData.inspectionType}Completed`]: true,
            [`${inspectionData.inspectionType}Date`]: inspectionData.inspectionDate,
            updatedAt: new Date().toISOString()
        });
        console.log('Updated fabric cut with inspection status');
    }
    
    console.log('SUCCESS: Inspection created and fabric cut updated');
    res.status(201).json({
      id: docRef.id,
      ...inspectionData
    });
  } catch (error) {
    console.error('=== INSPECTION CREATION ERROR ===');
    console.error('Error creating inspection:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to create inspection', details: error.message });
  }
});

// PUT update inspection
router.put('/:id', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const updateData = {
      ...req.body,
      updatedAt: new Date().toISOString()
    };
    
    await db.collection('inspections').doc(req.params.id).update(updateData);
    
    const updatedDoc = await db.collection('inspections').doc(req.params.id).get();
    
    res.json({
      id: updatedDoc.id,
      ...updatedDoc.data()
    });
  } catch (error) {
    console.error('Error updating inspection:', error);
    res.status(500).json({ error: 'Failed to update inspection' });
  }
});

// DELETE inspection
router.delete('/:id', async (req, res) => {
  try {
    const db = req.app.locals.db;
    await db.collection('inspections').doc(req.params.id).delete();
    
    res.json({ message: 'Inspection deleted successfully' });
  } catch (error) {
    console.error('Error deleting inspection:', error);
    res.status(500).json({ error: 'Failed to delete inspection' });
  }
});

module.exports = router; 