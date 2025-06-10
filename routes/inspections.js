const express = require('express');
const router = express.Router();
const { admin, db } = require('./database');

// GET all inspections with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      inspectionType, 
      dateFrom, 
      dateTo, 
      fabricId, 
      inspectedBy,
      sortBy = 'inspectionDate',
      sortOrder = 'desc'
    } = req.query;

    console.log(`📋 Fetching inspections - Page: ${page}, Limit: ${limit}, Type: ${inspectionType || 'all'}`);

    let query = db.collection('inspections');

    // Apply filters
    if (inspectionType) {
      query = query.where('inspectionType', '==', inspectionType);
    }
    
    if (fabricId) {
      query = query.where('fabricId', '==', fabricId);
    }
    
    if (inspectedBy) {
      query = query.where('inspectedBy', '==', inspectedBy);
    }

    // Date range filter
    if (dateFrom) {
      query = query.where('inspectionDate', '>=', new Date(dateFrom).toISOString());
    }
    
    if (dateTo) {
      query = query.where('inspectionDate', '<=', new Date(dateTo).toISOString());
    }

    // Apply sorting
    query = query.orderBy(sortBy, sortOrder);

    // Apply pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    if (offset > 0) {
      const offsetSnapshot = await query.limit(offset).get();
      if (!offsetSnapshot.empty) {
        const lastDoc = offsetSnapshot.docs[offsetSnapshot.docs.length - 1];
        query = query.startAfter(lastDoc);
      }
    }

    query = query.limit(parseInt(limit));

    const snapshot = await query.get();
    const inspections = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Get total count for pagination
    const countQuery = db.collection('inspections');
    const countSnapshot = await countQuery.get();
    const totalCount = countSnapshot.size;

    console.log(`✅ Found ${inspections.length} inspections out of ${totalCount} total`);

    res.json({
      inspections,
      totalCount,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalCount / parseInt(limit)),
      hasMore: (parseInt(page) * parseInt(limit)) < totalCount
    });

  } catch (error) {
    console.error('❌ Error fetching inspections:', error);
    res.status(500).json({ 
      message: 'Error fetching inspections', 
      error: error.message 
    });
  }
});

// GET single inspection by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📋 Fetching inspection: ${id}`);

    const doc = await db.collection('inspections').doc(id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ message: 'Inspection not found' });
    }

    const inspection = {
      id: doc.id,
      ...doc.data()
    };

    console.log(`✅ Found inspection: ${inspection.fabricId} - ${inspection.inspectionType}`);
    res.json(inspection);

  } catch (error) {
    console.error('❌ Error fetching inspection:', error);
    res.status(500).json({ 
      message: 'Error fetching inspection', 
      error: error.message 
    });
  }
});

// POST new inspection
router.post('/', async (req, res) => {
  try {
    const inspectionData = {
      ...req.body,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    console.log(`📋 Creating new ${inspectionData.inspectionType} inspection for fabric: ${inspectionData.fabricId}`);

    // Validate required fields
    const requiredFields = ['fabricId', 'originalQuantity', 'mistakeDescription', 'inspectionType', 'inspectedBy'];
    const missingFields = requiredFields.filter(field => !inspectionData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        message: `Missing required fields: ${missingFields.join(', ')}` 
      });
    }

    // Validate numeric fields
    if (inspectionData.originalQuantity <= 0) {
      return res.status(400).json({ 
        message: 'Original quantity must be greater than 0' 
      });
    }

    if (inspectionData.mistakeQuantity < 0) {
      return res.status(400).json({ 
        message: 'Mistake quantity cannot be negative' 
      });
    }

    // Create document
    const docRef = await db.collection('inspections').add(inspectionData);
    const newDoc = await docRef.get();
    
    const createdInspection = {
      id: newDoc.id,
      ...newDoc.data()
    };

    console.log(`✅ Inspection created successfully: ${createdInspection.id}`);
    res.status(201).json(createdInspection);

  } catch (error) {
    console.error('❌ Error creating inspection:', error);
    res.status(500).json({ 
      message: 'Error creating inspection', 
      error: error.message 
    });
  }
});

// PUT update inspection
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = {
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    console.log(`📋 Updating inspection: ${id}`);

    const docRef = db.collection('inspections').doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ message: 'Inspection not found' });
    }

    await docRef.update(updateData);
    const updatedDoc = await docRef.get();
    
    const updatedInspection = {
      id: updatedDoc.id,
      ...updatedDoc.data()
    };

    console.log(`✅ Inspection updated successfully: ${id}`);
    res.json(updatedInspection);

  } catch (error) {
    console.error('❌ Error updating inspection:', error);
    res.status(500).json({ 
      message: 'Error updating inspection', 
      error: error.message 
    });
  }
});

// DELETE inspection
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📋 Deleting inspection: ${id}`);

    const docRef = db.collection('inspections').doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ message: 'Inspection not found' });
    }

    await docRef.delete();
    console.log(`✅ Inspection deleted successfully: ${id}`);
    
    res.json({ message: 'Inspection deleted successfully' });

  } catch (error) {
    console.error('❌ Error deleting inspection:', error);
    res.status(500).json({ 
      message: 'Error deleting inspection', 
      error: error.message 
    });
  }
});

// GET inspection statistics
router.get('/stats/summary', async (req, res) => {
  try {
    console.log('📊 Fetching inspection statistics...');

    const snapshot = await db.collection('inspections').get();
    const inspections = snapshot.docs.map(doc => doc.data());

    const stats = {
      totalInspections: inspections.length,
      byType: {
        'four-point': inspections.filter(i => i.inspectionType === 'four-point').length,
        'unwashed': inspections.filter(i => i.inspectionType === 'unwashed').length,
        'washed': inspections.filter(i => i.inspectionType === 'washed').length
      },
      totalOriginalQuantity: inspections.reduce((sum, i) => sum + (i.originalQuantity || 0), 0),
      totalMistakeQuantity: inspections.reduce((sum, i) => sum + (i.mistakeQuantity || 0), 0),
      totalActualQuantity: inspections.reduce((sum, i) => sum + (i.actualQuantity || 0), 0),
      defectRate: 0
    };

    // Calculate defect rate percentage
    if (stats.totalOriginalQuantity > 0) {
      stats.defectRate = ((stats.totalMistakeQuantity / stats.totalOriginalQuantity) * 100).toFixed(2);
    }

    console.log(`✅ Stats generated: ${stats.totalInspections} total inspections`);
    res.json(stats);

  } catch (error) {
    console.error('❌ Error fetching inspection statistics:', error);
    res.status(500).json({ 
      message: 'Error fetching inspection statistics', 
      error: error.message 
    });
  }
});

module.exports = router; 