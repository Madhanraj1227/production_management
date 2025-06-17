const express = require('express');
const router = express.Router();

// Get all fabric movements
router.get('/', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const snapshot = await db.collection('fabricMovements').orderBy('createdAt', 'desc').get();
    
    const movements = [];
    snapshot.forEach(doc => {
      movements.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    res.json(movements);
  } catch (error) {
    console.error('Error fetching fabric movements:', error);
    res.status(500).json({ message: 'Failed to fetch fabric movements' });
  }
});

// Create new fabric movement
router.post('/', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { fabricCuts, fromLocation, toLocation, movedBy, notes } = req.body;

    // Validation
    if (!fabricCuts || fabricCuts.length === 0) {
      return res.status(400).json({ message: 'At least one fabric cut is required' });
    }

    if (!fromLocation || !toLocation) {
      return res.status(400).json({ message: 'From and to locations are required' });
    }

    if (!movedBy) {
      return res.status(400).json({ message: 'Moved by field is required' });
    }

    // Generate movement order number
    const movementSnapshot = await db.collection('fabricMovements').get();
    const nextNumber = movementSnapshot.size + 1;
    const movementOrderNumber = `MV/${String(nextNumber).padStart(4, '0')}`;

    // Create movement record
    const movementData = {
      movementOrderNumber,
      fabricCuts,
      fromLocation,
      toLocation,
      movedBy,
      notes: notes || '',
      status: 'pending', // pending, received
      createdAt: new Date(),
      receivedAt: null,
      receivedBy: null
    };

    const docRef = await db.collection('fabricMovements').add(movementData);

    res.status(201).json({
      id: docRef.id,
      ...movementData,
      message: 'Fabric movement created successfully'
    });

  } catch (error) {
    console.error('Error creating fabric movement:', error);
    res.status(500).json({ message: 'Failed to create fabric movement' });
  }
});

// Receive fabric cuts (update movement status and fabric locations)
router.put('/:id/receive', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { id } = req.params;
    const { receivedBy, receivedLocation } = req.body;

    if (!receivedBy) {
      return res.status(400).json({ message: 'Received by field is required' });
    }

    // Get the movement record
    const movementDoc = await db.collection('fabricMovements').doc(id).get();
    if (!movementDoc.exists) {
      return res.status(404).json({ message: 'Movement record not found' });
    }

    const movementData = movementDoc.data();
    
    if (movementData.status === 'received') {
      return res.status(400).json({ message: 'This movement has already been received' });
    }

    const batch = db.batch();

    // Update movement status
    batch.update(movementDoc.ref, {
      status: 'received',
      receivedAt: new Date(),
      receivedBy,
      receivedLocation: receivedLocation || movementData.toLocation
    });

    // Update fabric cut locations
    for (const fabricCut of movementData.fabricCuts) {
      const { fabricNumber, isProcessingReceived } = fabricCut;
      
      if (isProcessingReceived) {
        // Update processing receipts location
        const receiptsSnapshot = await db.collection('processingReceipts')
          .where('fabricNumber', '==', fabricNumber)
          .get();
        
        receiptsSnapshot.forEach(receiptDoc => {
          batch.update(receiptDoc.ref, {
            receivedLocation: receivedLocation || movementData.toLocation,
            updatedAt: new Date()
          });
        });

        // Also update processing orders if fabric exists there
        const processingOrdersSnapshot = await db.collection('processingOrders').get();
        processingOrdersSnapshot.forEach(orderDoc => {
          const orderData = orderDoc.data();
          if (orderData.receivedFabricCuts) {
            const updatedCuts = orderData.receivedFabricCuts.map(cut => {
              if (cut.newFabricNumber === fabricNumber) {
                return { ...cut, location: receivedLocation || movementData.toLocation };
              }
              return cut;
            });
            
            batch.update(orderDoc.ref, { receivedFabricCuts: updatedCuts });
          }
        });
      } else {
        // Update main fabric cuts location
        const fabricCutsSnapshot = await db.collection('fabricCuts')
          .where('fabricNumber', '==', fabricNumber)
          .get();
        
        fabricCutsSnapshot.forEach(fabricCutDoc => {
          batch.update(fabricCutDoc.ref, {
            location: receivedLocation || movementData.toLocation,
            updatedAt: new Date()
          });
        });
      }
    }

    await batch.commit();

    res.json({
      message: 'Fabric cuts received successfully',
      movementOrderNumber: movementData.movementOrderNumber
    });

  } catch (error) {
    console.error('Error receiving fabric cuts:', error);
    res.status(500).json({ message: 'Failed to receive fabric cuts' });
  }
});

// Search fabric cut by number (for validation and details)
router.get('/search/:fabricNumber', async (req, res) => {
  try {
    const db = req.app.locals.db;
    let { fabricNumber } = req.params;
    
    // Handle both QR sticker format (W3/02) and database format (W3-02)
    const searchNumbers = [
      fabricNumber, // Original format
      fabricNumber.replace('/', '-'), // Convert slash to hyphen
      fabricNumber.replace('-', '/'), // Convert hyphen to slash
    ];
    
    // Remove duplicates
    const uniqueSearchNumbers = [...new Set(searchNumbers)];
    
    let fabricCutData = null;
    let isProcessingReceived = false;
    let foundFabricNumber = null;

    // First check in main fabric cuts collection with all possible formats
    let fabricCutsSnapshot = null;
    for (const searchNum of uniqueSearchNumbers) {
      fabricCutsSnapshot = await db.collection('fabricCuts')
        .where('fabricNumber', '==', searchNum)
        .get();
      
      if (!fabricCutsSnapshot.empty) {
        foundFabricNumber = searchNum;
        break;
      }
    }

    if (!fabricCutsSnapshot.empty) {
      const doc = fabricCutsSnapshot.docs[0];
      const data = doc.data();
      
      // Check if it's 4-point inspected
      if (data.scannedAt4Point || data['4-pointCompleted']) {
        // Check if this fabric cut has been sent to processing (check all formats)
        const processingOrdersSnapshot = await db.collection('processingOrders').get();
        let sentToProcessing = false;
        
        for (const orderDoc of processingOrdersSnapshot.docs) {
          const orderData = orderDoc.data();
          if (orderData.fabricCuts && orderData.fabricCuts.some(cut => 
            uniqueSearchNumbers.includes(cut.fabricNumber)
          )) {
            sentToProcessing = true;
            break;
          }
        }
        
        if (sentToProcessing) {
          return res.status(400).json({ 
            message: 'This fabric cut has been sent to processing and cannot be moved. Use processing-received cuts instead.',
            exists: true,
            is4PointInspected: true,
            sentToProcessing: true
          });
        }
        
        // Get additional details from warp and order if available
        let orderNumber = 'N/A';
        let designName = 'N/A';
        let designNumber = 'N/A';
        let warpNumber = 'N/A';
        
        // Try to get warp information
        if (data.warpId) {
          try {
            const warpDoc = await db.collection('warps').doc(data.warpId).get();
            if (warpDoc.exists) {
              const warpData = warpDoc.data();
              warpNumber = warpData.warpOrderNumber || warpData.warpNumber || 'N/A';
              
              // Get order information from warp
              if (warpData.orderId) {
                const orderDoc = await db.collection('orders').doc(warpData.orderId).get();
                if (orderDoc.exists) {
                  const orderData = orderDoc.data();
                  orderNumber = orderData.orderNumber || 'N/A';
                  designName = orderData.designName || 'N/A';
                  designNumber = orderData.designNumber || 'N/A';
                }
              }
            }
          } catch (err) {
            console.error('Error fetching warp/order details:', err);
          }
        }
        
        // Fallback to embedded data if available
        if (orderNumber === 'N/A' && data.warp?.order?.orderNumber) {
          orderNumber = data.warp.order.orderNumber;
          designName = data.warp.order.designName || 'N/A';
          designNumber = data.warp.order.designNumber || 'N/A';
          warpNumber = data.warp.warpOrderNumber || 'N/A';
        }
        
        fabricCutData = {
          id: doc.id,
          fabricNumber: foundFabricNumber, // Use the format that was found
          quantity: data.quantity,
          location: data.location || 'Veerapandi',
          warpNumber,
          orderNumber,
          designName,
          designNumber,
          isProcessingReceived: false,
          is4PointInspected: true
        };
      } else {
        return res.status(400).json({ 
          message: 'This fabric cut has not completed 4-point inspection',
          exists: true,
          is4PointInspected: false
        });
      }
    } else {
      // Check in processing receipts with all possible formats
      let receiptsSnapshot = null;
      for (const searchNum of uniqueSearchNumbers) {
        receiptsSnapshot = await db.collection('processingReceipts')
          .where('fabricNumber', '==', searchNum)
          .get();
        
        if (!receiptsSnapshot.empty) {
          foundFabricNumber = searchNum;
          break;
        }
      }

      if (receiptsSnapshot && !receiptsSnapshot.empty) {
        const receiptData = receiptsSnapshot.docs[0].data();
        fabricCutData = {
          fabricNumber: foundFabricNumber, // Use the format that was found
          quantity: receiptData.quantity,
          location: receiptData.receivedLocation || 'Veerapandi',
          orderNumber: receiptData.orderNumber || 'N/A',
          designName: receiptData.designName || 'N/A',
          designNumber: receiptData.designNumber || 'N/A',
          processingCenter: receiptData.processingCenter || 'N/A',
          deliveryNumber: receiptData.deliveryNumber || 'N/A',
          isProcessingReceived: true,
          is4PointInspected: true // Processing received cuts are considered inspected
        };
        isProcessingReceived = true;
      }
    }

    if (!fabricCutData) {
      return res.status(404).json({ 
        message: 'Fabric cut not found or not eligible for movement',
        exists: false
      });
    }

    res.json({
      exists: true,
      isEligible: true,
      ...fabricCutData
    });

  } catch (error) {
    console.error('Error searching fabric cut:', error);
    res.status(500).json({ message: 'Failed to search fabric cut' });
  }
});

module.exports = router; 