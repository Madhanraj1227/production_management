const express = require('express');
const router = express.Router();

// Create new processing receipts
router.post('/', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { receipts } = req.body;

    if (!receipts || !Array.isArray(receipts) || receipts.length === 0) {
      return res.status(400).json({ message: 'Missing or invalid receipts data.' });
    }

    const batch = db.batch();
    const createdReceipts = [];

    receipts.forEach(receipt => {
      const docRef = db.collection('processingReceipts').doc();
      const newReceipt = { ...receipt, createdAt: new Date() };
      batch.set(docRef, newReceipt);
      createdReceipts.push({ id: docRef.id, ...newReceipt });
    });

    await batch.commit();

    res.status(201).json({
      message: 'Processing receipts created successfully',
      receipts: createdReceipts
    });
  } catch (error) {
    console.error('Error creating processing receipts:', error);
    res.status(500).json({ message: 'Failed to create processing receipts' });
  }
});

// Sync processing receipts with processing orders
router.post('/sync', async (req, res) => {
  try {
    const db = req.app.locals.db;
    
    // Fetch all processing orders
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
    let addedCount = 0;
    let removedCount = 0;
    
    // Add new receipts that don't exist
    currentFabricCuts.forEach(cut => {
      if (!existingReceiptsMap.has(cut.fabricNumber)) {
        const docRef = db.collection('processingReceipts').doc();
        batch.set(docRef, cut);
        addedCount++;
      }
    });
    
    // Remove receipts that no longer exist in processing orders
    existingReceipts.forEach(receipt => {
      const fabricNumber = receipt.fabricNumber || receipt.newFabricNumber;
      if (!currentFabricCutsMap.has(fabricNumber)) {
        const docRef = db.collection('processingReceipts').doc(receipt.id);
        batch.delete(docRef);
        removedCount++;
      }
    });
    
    await batch.commit();
    
    res.json({
      message: 'Processing receipts synchronized successfully',
      addedCount,
      removedCount,
      totalCurrent: currentFabricCuts.length
    });
    
  } catch (error) {
    console.error('Error syncing processing receipts:', error);
    res.status(500).json({ message: 'Failed to sync processing receipts' });
  }
});

// Get all processing receipts
router.get('/', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const snapshot = await db.collection('processingReceipts').orderBy('receivedAt', 'desc').get();

    if (snapshot.empty) {
      return res.json([]);
    }

    const receipts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(receipts);
  } catch (error) {
    console.error('Error fetching processing receipts:', error);
    res.status(500).json({ message: 'Failed to fetch processing receipts' });
  }
});

// Update a processing receipt
router.put('/:id', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { id } = req.params;
    const { deliveryNumber, quantity, receivedLocation } = req.body;

    if (!deliveryNumber && !quantity && !receivedLocation) {
        return res.status(400).json({ message: 'No fields to update provided.' });
    }

    const docRef = db.collection('processingReceipts').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: 'Receipt not found' });
    }
    
    const updateData = { updatedAt: new Date() };
    if (deliveryNumber) updateData.deliveryNumber = deliveryNumber;
    if (quantity) updateData.quantity = parseFloat(quantity);
    if (receivedLocation) updateData.receivedLocation = receivedLocation;

    await docRef.update(updateData);

    res.json({ message: 'Receipt updated successfully', id });
  } catch (error) {
    console.error('Error updating processing receipt:', error);
    res.status(500).json({ message: 'Failed to update receipt' });
  }
});

// Delete a processing receipt by fabric number
router.delete('/by-fabric/:fabricNumber', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { fabricNumber } = req.params;
    
    // Find and delete all receipts with this fabric number
    const snapshot = await db.collection('processingReceipts')
      .where('fabricNumber', '==', fabricNumber)
      .get();
    
    if (snapshot.empty) {
      // Also check for newFabricNumber
      const snapshot2 = await db.collection('processingReceipts')
        .where('newFabricNumber', '==', fabricNumber)
        .get();
      
      if (snapshot2.empty) {
        return res.status(404).json({ message: 'Receipt not found' });
      }
      
      const batch = db.batch();
      snapshot2.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      
      return res.json({ 
        message: 'Receipt deleted successfully', 
        fabricNumber,
        deletedCount: snapshot2.docs.length 
      });
    }
    
    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    res.json({ 
      message: 'Receipt deleted successfully', 
      fabricNumber,
      deletedCount: snapshot.docs.length 
    });
  } catch (error) {
    console.error('Error deleting processing receipt:', error);
    res.status(500).json({ message: 'Failed to delete receipt' });
  }
});

// Delete a processing receipt
router.delete('/:id', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { id } = req.params;
    const docRef = db.collection('processingReceipts').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: 'Receipt not found' });
    }

    await docRef.delete();
    res.json({ message: 'Receipt deleted successfully', id });
  } catch (error) {
    console.error('Error deleting processing receipt:', error);
    res.status(500).json({ message: 'Failed to delete receipt' });
  }
});

module.exports = router; 