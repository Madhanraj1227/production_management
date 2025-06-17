const express = require('express');
const router = express.Router();

// Clean up duplicate fabric numbers in processing orders
const cleanupDuplicateFabricNumbers = async (db) => {
  try {
    console.log('🔧 Starting cleanup of duplicate fabric numbers...');
    
    // Get all processing orders
    const ordersSnapshot = await db.collection('processingOrders').get();
    const batch = db.batch();
    let totalCleaned = 0;
    
    for (const orderDoc of ordersSnapshot.docs) {
      const order = orderDoc.data();
      
      // Collect all fabric cuts from both sources
      let allCuts = [];
      
      // Add from receivedFabricCuts
      if (order.receivedFabricCuts && order.receivedFabricCuts.length > 0) {
        allCuts = allCuts.concat(order.receivedFabricCuts);
      }
      
      // Add from receivedFabricCutsByDelivery (flatten the object)
      if (order.receivedFabricCutsByDelivery) {
        Object.values(order.receivedFabricCutsByDelivery).forEach(deliveryCuts => {
          if (Array.isArray(deliveryCuts)) {
            allCuts = allCuts.concat(deliveryCuts);
          }
        });
      }
      
      if (allCuts.length > 0) {
        // Track seen fabric numbers and remove duplicates
        const seenFabricNumbers = new Set();
        const cleanedCuts = [];
        let duplicatesRemoved = 0;
        
        allCuts.forEach(cut => {
          if (cut.newFabricNumber && !seenFabricNumbers.has(cut.newFabricNumber)) {
            seenFabricNumbers.add(cut.newFabricNumber);
            cleanedCuts.push(cut);
          } else {
            duplicatesRemoved++;
          }
        });
        
        if (duplicatesRemoved > 0) {
          console.log(`🔧 Order ${orderDoc.id}: Removed ${duplicatesRemoved} duplicate fabric numbers`);
          
          // Update the order with only the unique cuts and remove the old structure
          batch.update(orderDoc.ref, { 
            receivedFabricCuts: cleanedCuts,
            receivedFabricCutsByDelivery: null // Remove the legacy structure
          });
          
          totalCleaned += duplicatesRemoved;
        } else if (order.receivedFabricCutsByDelivery) {
          // If no duplicates but still using old structure, migrate to new structure
          console.log(`🔧 Order ${orderDoc.id}: Migrating from legacy receivedFabricCutsByDelivery structure`);
          batch.update(orderDoc.ref, { 
            receivedFabricCuts: cleanedCuts,
            receivedFabricCutsByDelivery: null
          });
        }
      }
    }
    
    if (totalCleaned > 0) {
      await batch.commit();
      console.log(`✅ Cleaned up ${totalCleaned} duplicate fabric numbers across all orders`);
    } else {
      console.log('✅ No duplicate fabric numbers found, but data structures may have been migrated');
      if (ordersSnapshot.docs.some(doc => doc.data().receivedFabricCutsByDelivery)) {
        await batch.commit();
        console.log('✅ Legacy data structures migrated to new format');
      }
    }
    
  } catch (error) {
    console.error('❌ Error cleaning up duplicate fabric numbers:', error);
  }
};

// Generate next available fabric number for an order
const getNextAvailableFabricNumber = (orderPart, existingNumbers) => {
  let cutNumber = 1;
  let fabricNumber;
  do {
    const cutNumberStr = String(cutNumber).padStart(2, '0');
    fabricNumber = `WR/${orderPart}/${cutNumberStr}`;
    cutNumber++;
  } while (existingNumbers.has(fabricNumber));
  return fabricNumber;
};

// Create a new processing order
router.post('/', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const {
      orderFormNumber,
      processingCenter,
      processes,
      fabricCuts,
      totalFabricCuts,
      totalQuantity,
      vehicleNumber,
      deliveryDate,
      deliveredBy,
      orderDetails,
      status,
      createdAt
    } = req.body;

    // Basic validation
    if (!orderFormNumber || !processingCenter || !fabricCuts || fabricCuts.length === 0) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }

    const newProcessingOrder = {
      orderFormNumber,
      processingCenter,
      processes,
      fabricCuts,
      totalFabricCuts,
      totalQuantity,
      vehicleNumber,
      deliveryDate,
      deliveredBy,
      orderDetails,
      status: status || 'sent',
      createdAt: createdAt ? new Date(createdAt) : new Date()
    };

    const docRef = await db.collection('processingOrders').add(newProcessingOrder);

    res.status(201).json({
      message: 'Processing order created successfully',
      id: docRef.id,
      ...newProcessingOrder
    });
  } catch (error) {
    console.error('Error creating processing order:', error);
    res.status(500).json({ message: 'Failed to create processing order' });
  }
});

// Get all processing orders
router.get('/', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const snapshot = await db.collection('processingOrders').orderBy('createdAt', 'desc').get();
    
    if (snapshot.empty) {
      return res.json([]);
    }

    const orders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(orders);
  } catch (error) {
    console.error('Error fetching processing orders:', error);
    res.status(500).json({ message: 'Failed to fetch processing orders' });
  }
});

// Update a processing order
router.put('/:id', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { id } = req.params;
    const updateData = req.body;

    // Add updatedAt timestamp
    updateData.updatedAt = new Date();

    const docRef = db.collection('processingOrders').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: 'Processing order not found' });
    }

    // If updating receivedFabricCuts, ensure unique fabric numbers
    if (updateData.receivedFabricCuts) {
      const orderData = doc.data();
      const orderNumberPart = orderData.orderFormNumber ? orderData.orderFormNumber.split('/').pop() || '00001' : '00001';
      
      // Get all existing fabric numbers from all processing orders
      const allOrdersSnapshot = await db.collection('processingOrders').get();
      const globalExistingNumbers = new Set();
      
      allOrdersSnapshot.forEach(orderDoc => {
        if (orderDoc.id !== id) { // Exclude current order
          const order = orderDoc.data();
          if (order.receivedFabricCuts) {
            order.receivedFabricCuts.forEach(cut => {
              if (cut.newFabricNumber) {
                globalExistingNumbers.add(cut.newFabricNumber);
              }
            });
          }
        }
      });
      
      // Clean up and renumber fabric cuts to ensure uniqueness
      const cleanedCuts = [];
      const localExistingNumbers = new Set(globalExistingNumbers);
      
      updateData.receivedFabricCuts.forEach(cut => {
        if (cut.newFabricNumber) {
          // If the fabric number already exists globally, generate a new one
          let fabricNumber = cut.newFabricNumber;
          if (localExistingNumbers.has(fabricNumber)) {
            fabricNumber = getNextAvailableFabricNumber(orderNumberPart, localExistingNumbers);
            console.log(`🔧 Reassigned duplicate fabric number ${cut.newFabricNumber} to ${fabricNumber}`);
          }
          
          cleanedCuts.push({
            ...cut,
            newFabricNumber: fabricNumber
          });
          localExistingNumbers.add(fabricNumber);
        } else {
          cleanedCuts.push(cut);
        }
      });
      
      updateData.receivedFabricCuts = cleanedCuts;
    }

    // Check if receivedFabricCuts is being updated
    const hasReceivedFabricCutsUpdate = updateData.receivedFabricCuts !== undefined;

    await docRef.update(updateData);

    // If receivedFabricCuts was updated, trigger sync with processing receipts
    if (hasReceivedFabricCutsUpdate) {
      try {
        // Auto-sync processing receipts
        const processingOrdersSnapshot = await db.collection('processingOrders').get();
        const processingOrders = processingOrdersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Fetch existing processing receipts
        const receiptsSnapshot = await db.collection('processingReceipts').get();
        const existingReceipts = receiptsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Build a map of existing receipts by fabric number for efficient lookup
        const existingReceiptsMap = new Map();
        existingReceipts.forEach(receipt => {
          existingReceiptsMap.set(receipt.fabricNumber || receipt.newFabricNumber, receipt);
        });
        
        // Collect all current fabric cuts from processing orders
        const currentFabricCuts = [];
        processingOrders.forEach(order => {
          if (order.receivedFabricCuts && order.receivedFabricCuts.length > 0) {
            order.receivedFabricCuts.forEach(cut => {
              currentFabricCuts.push({
                fabricNumber: cut.newFabricNumber,
                newFabricNumber: cut.newFabricNumber,
                originalFabricNumber: cut.originalFabricNumber || 'N/A',
                orderFormNumber: order.orderFormNumber,
                processingOrderId: order.id,
                processingCenter: order.processingCenter,
                orderNumber: order.orderDetails?.orderNumber || order.orderNumber || 'N/A',
                designName: order.orderDetails?.designName || order.designName || 'N/A',
                designNumber: order.orderDetails?.designNumber || order.designNumber || 'N/A',
                quantity: cut.quantity,
                deliveryNumber: cut.deliveryNumber,
                receivedBy: cut.receivedBy,
                receivedLocation: cut.location,
                receivedAt: cut.receivedAt,
                createdAt: new Date()
              });
            });
          }
        });
        
        // Build a map of current fabric cuts for efficient lookup
        const currentFabricCutsMap = new Map();
        currentFabricCuts.forEach(cut => {
          currentFabricCutsMap.set(cut.fabricNumber, cut);
        });
        
        const batch = db.batch();
        
        // Add new receipts that don't exist
        currentFabricCuts.forEach(cut => {
          if (!existingReceiptsMap.has(cut.fabricNumber)) {
            const receiptDocRef = db.collection('processingReceipts').doc();
            batch.set(receiptDocRef, cut);
          }
        });
        
        // Remove receipts that no longer exist in processing orders
        existingReceipts.forEach(receipt => {
          const fabricNumber = receipt.fabricNumber || receipt.newFabricNumber;
          if (!currentFabricCutsMap.has(fabricNumber)) {
            const receiptDocRef = db.collection('processingReceipts').doc(receipt.id);
            batch.delete(receiptDocRef);
          }
        });
        
        await batch.commit();
        console.log('Processing receipts auto-synchronized after processing order update');
        
      } catch (syncError) {
        console.error('Error auto-syncing processing receipts:', syncError);
        // Don't fail the update if sync fails
      }
    }

    res.json({
      message: 'Processing order updated successfully',
      id: id
    });
  } catch (error) {
    console.error('Error updating processing order:', error);
    res.status(500).json({ message: 'Failed to update processing order' });
  }
});

// Delete a processing order
router.delete('/:id', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { id } = req.params;

    const docRef = db.collection('processingOrders').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: 'Processing order not found' });
    }

    await docRef.delete();

    res.json({
      message: 'Processing order deleted successfully',
      id: id
    });
  } catch (error) {
    console.error('Error deleting processing order:', error);
    res.status(500).json({ message: 'Failed to delete processing order' });
  }
});

// Check if a fabric cut is in any processing order
router.get('/check-fabric-cut/:fabricCutId', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { fabricCutId } = req.params;
    const decodedFabricCutId = decodeURIComponent(fabricCutId);

    // The input can be in QR code format (e.g., W1/01) or canonical format (W1-01).
    // We need to check against the canonical format stored in the processing orders.
    // This is a simplified conversion. For a robust solution, this should share logic
    // with the `/for-processing` endpoint.
    let canonicalFabricNumber = decodedFabricCutId;
    if (decodedFabricCutId.includes('/')) {
        const parts = decodedFabricCutId.split('/');
        if (parts.length === 2) {
            const [warpNumber, cutNumber] = parts;
            const parsedCutNumber = parseInt(cutNumber, 10);
            if (!isNaN(parsedCutNumber)) {
                canonicalFabricNumber = `${warpNumber}-${String(parsedCutNumber).padStart(2, '0')}`;
            }
        }
    }

    console.log(`Checking for canonical fabric number: ${canonicalFabricNumber}`);

    const snapshot = await db.collection('processingOrders').get();
    
    if (snapshot.empty) {
      return res.json({ isUsed: false });
    }

    for (const doc of snapshot.docs) {
      const order = doc.data();
      if (order.fabricCuts && order.fabricCuts.some(cut => cut.fabricNumber === canonicalFabricNumber)) {
        return res.json({
          isUsed: true,
          orderFormNumber: order.orderFormNumber
        });
      }
    }

    res.json({ isUsed: false });
  } catch (error) {
    console.error('Error checking fabric cut in processing orders:', error);
    res.status(500).json({ message: 'Failed to check fabric cut' });
  }
});

// Cleanup duplicate fabric numbers endpoint
router.post('/cleanup-duplicates', async (req, res) => {
  try {
    const db = req.app.locals.db;
    await cleanupDuplicateFabricNumbers(db);
    res.json({ message: 'Duplicate fabric numbers cleanup completed successfully' });
  } catch (error) {
    console.error('Error in cleanup duplicates endpoint:', error);
    res.status(500).json({ message: 'Failed to cleanup duplicate fabric numbers' });
  }
});

module.exports = router; 