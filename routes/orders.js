const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/orders/';
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Create unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept specific file types
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, DOCX, JPG, and PNG files are allowed'));
    }
  }
});

// Function to generate order number
async function generateOrderNumber(db, orderType) {
  const currentYear = new Date().getFullYear();
  const typePrefix = orderType === 'bulk' ? 'B' : 'S';
  
  // Get or create counter document for this year and type
  const counterRef = db.collection('counters').doc(`orders_${currentYear}_${typePrefix}`);
  const counterDoc = await counterRef.get();
  
  let sequenceNumber = 1;
  
  if (counterDoc.exists) {
    sequenceNumber = counterDoc.data().count + 1;
    await counterRef.update({ count: sequenceNumber });
  } else {
    await counterRef.set({ count: sequenceNumber });
  }
  
  // Format sequence number with leading zeros (5 digits)
  const formattedSequence = sequenceNumber.toString().padStart(5, '0');
  
  // Generate order number: AT/2025/B/00001
  return `AT/${currentYear}/${typePrefix}/${formattedSequence}`;
}

// Get all orders
router.get('/', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const ordersRef = db.collection('orders');
        // Remove orderBy to avoid index requirement - sort in memory instead
        const snapshot = await ordersRef.get();
        
        const orders = [];
        snapshot.forEach(doc => {
            orders.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Sort in memory by createdAt descending
        orders.sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
            return dateB.getTime() - dateA.getTime();
        });
        
        res.json(orders);
    } catch (err) {
        console.error('Error fetching orders:', err);
        res.status(500).json({ message: err.message });
    }
});

// Get active orders (NEW, RUNNING, PENDING) - simplified to avoid composite index
router.get('/active', async (req, res) => {
  try {
    const db = req.app.locals.db;
    // Simplified query without orderBy to avoid composite index requirement
    const ordersSnapshot = await db.collection('orders')
      .where('status', 'in', ['NEW', 'RUNNING', 'PENDING'])
      .get();

    const orders = [];
    ordersSnapshot.forEach(doc => {
      orders.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // Sort in memory by createdAt descending
    orders.sort((a, b) => {
      const aTime = a.createdAt?.toDate?.() || new Date(0);
      const bTime = b.createdAt?.toDate?.() || new Date(0);
      return bTime - aTime;
    });

    res.json(orders);
  } catch (error) {
    console.error('Error getting active orders:', error);
    res.status(500).json({ error: 'Failed to get active orders' });
  }
});

// Get count of active orders
router.get('/count/active', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const ordersRef = db.collection('orders');
        
        // Count orders that are not completed or cancelled
        const snapshot = await ordersRef
            .where('status', 'in', ['NEW', 'RUNNING', 'PENDING'])
            .get();
        
        res.json({ count: snapshot.size });
    } catch (err) {
        console.error('Error getting active orders count:', err);
        res.status(500).json({ message: err.message });
    }
});

// Get all orders with optimized queries - ENHANCED PERFORMANCE VERSION
router.get('/optimized', async (req, res) => {
    try {
        const db = req.app.locals.db;
        console.log('Fetching orders with ultra-optimized queries...');
        const startTime = Date.now();
        
        // Step 1: Get all orders in one query
        const ordersSnapshot = await db.collection('orders').get();
        const orders = [];
        
        ordersSnapshot.forEach(doc => {
            orders.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        if (orders.length === 0) {
            console.log('No orders found');
            return res.json([]);
        }
        
        // Step 2: Get all warps to calculate order production statistics
        const warpsSnapshot = await db.collection('warps').get();
        const orderWarpsMap = new Map(); // orderId -> warps[]
        const warpIds = [];
        
        warpsSnapshot.forEach(doc => {
            const warpData = { id: doc.id, ...doc.data() };
            const orderId = warpData.orderId;
            
            if (orderId) {
                warpIds.push(doc.id);
                if (!orderWarpsMap.has(orderId)) {
                    orderWarpsMap.set(orderId, []);
                }
                orderWarpsMap.get(orderId).push(warpData);
            }
        });
        
        // Step 3: Get all fabric cuts to calculate production statistics
        let fabricCutsMap = new Map(); // warpId -> fabric cuts[]
        if (warpIds.length > 0) {
            const fabricCutsSnapshot = await db.collection('fabricCuts').get();
            
            fabricCutsSnapshot.forEach(doc => {
                const cutData = doc.data();
                const warpId = cutData.warpId;
                
                if (warpId && warpIds.includes(warpId)) {
                    if (!fabricCutsMap.has(warpId)) {
                        fabricCutsMap.set(warpId, []);
                    }
                    fabricCutsMap.get(warpId).push(cutData);
                }
            });
        }
        
        // Step 4: Calculate production statistics for each order
        const enrichedOrders = orders.map(order => {
            const orderWarps = orderWarpsMap.get(order.id) || [];
            let totalWarps = orderWarps.length;
            let totalProduction = 0;
            let totalCuts = 0;
            let activeWarps = 0;
            
            // Calculate production from all warps for this order
            orderWarps.forEach(warp => {
                if (warp.status === 'active') {
                    activeWarps++;
                }
                
                const warpCuts = fabricCutsMap.get(warp.id) || [];
                warpCuts.forEach(cut => {
                    totalProduction += cut.quantity || 0;
                    totalCuts++;
                });
            });
            
            // Calculate progress percentage
            const progressPercentage = order.orderQuantity > 0 
                ? Math.min(100, Math.round((totalProduction / order.orderQuantity) * 100))
                : 0;
            
            return {
                ...order,
                production: {
                    totalWarps,
                    activeWarps,
                    totalProduction,
                    totalCuts,
                    progressPercentage,
                    remainingQuantity: Math.max(0, (order.orderQuantity || 0) - totalProduction)
                }
            };
        });
        
        // Step 5: Sort by createdAt (newest first)
        enrichedOrders.sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
            return dateB.getTime() - dateA.getTime();
        });
        
        const totalTime = Date.now() - startTime;
        console.log(`Ultra-optimized orders query completed in ${totalTime}ms for ${enrichedOrders.length} orders`);
        
        res.json(enrichedOrders);
    } catch (err) {
        console.error('Error in ultra-optimized orders endpoint:', err);
        res.status(500).json({ message: err.message });
    }
});

// Create new order with file uploads
router.post('/', upload.fields([
  { name: 'designSheet', maxCount: 1 },
  { name: 'yarnRequirementSheet', maxCount: 1 },
  { name: 'dyeingOrderForm', maxCount: 1 }
]), async (req, res) => {
    try {
        const db = req.app.locals.db;
        
        // Generate automatic order number
        const orderNumber = await generateOrderNumber(db, req.body.type);
        
        const orderData = {
            orderNumber: orderNumber, // Generated order number
            designName: req.body.designName,
            designNumber: req.body.designNumber,
            orderQuantity: Number(req.body.orderQuantity),
            warpingQuantity: Number(req.body.warpingQuantity),
            type: req.body.type,
            count: req.body.count,
            construction: req.body.construction,
            merchandiser: req.body.merchandiser,
            status: 'NEW', // Default status
            createdAt: new Date()
        };

        // Validate that warping quantity is greater than order quantity
        if (orderData.warpingQuantity <= orderData.orderQuantity) {
            return res.status(400).json({ 
                message: 'Warping quantity must be greater than order quantity to account for shrinkage and wastage' 
            });
        }

        // Add file information if files were uploaded
        const files = {};
        if (req.files) {
            if (req.files.designSheet) {
                files.designSheet = {
                    filename: req.files.designSheet[0].filename,
                    originalname: req.files.designSheet[0].originalname,
                    path: req.files.designSheet[0].path,
                    size: req.files.designSheet[0].size
                };
            }
            
            if (req.files.yarnRequirementSheet) {
                files.yarnRequirementSheet = {
                    filename: req.files.yarnRequirementSheet[0].filename,
                    originalname: req.files.yarnRequirementSheet[0].originalname,
                    path: req.files.yarnRequirementSheet[0].path,
                    size: req.files.yarnRequirementSheet[0].size
                };
            }
            
            if (req.files.dyeingOrderForm) {
                files.dyeingOrderForm = {
                    filename: req.files.dyeingOrderForm[0].filename,
                    originalname: req.files.dyeingOrderForm[0].originalname,
                    path: req.files.dyeingOrderForm[0].path,
                    size: req.files.dyeingOrderForm[0].size
                };
            }
        }

        // Add files to order data if any were uploaded
        if (Object.keys(files).length > 0) {
            orderData.files = files;
        }

        const docRef = await db.collection('orders').add(orderData);
        
        const newOrder = {
            id: docRef.id,
            ...orderData
        };
        
        res.status(201).json(newOrder);
    } catch (err) {
        console.error('Error creating order:', err);
        res.status(400).json({ message: err.message });
    }
});

// Download file endpoint
router.get('/:id/download/:fileType', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const doc = await db.collection('orders').doc(req.params.id).get();
        
        if (!doc.exists) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const orderData = doc.data();
        const fileType = req.params.fileType;
        
        if (!orderData.files || !orderData.files[fileType]) {
            return res.status(404).json({ message: 'File not found' });
        }

        const file = orderData.files[fileType];
        const filePath = path.join(__dirname, '..', file.path);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'File not found on server' });
        }

        res.download(filePath, file.originalname);
    } catch (err) {
        console.error('Error downloading file:', err);
        res.status(500).json({ message: err.message });
    }
});

// Get single order
router.get('/:id', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const doc = await db.collection('orders').doc(req.params.id).get();
        
        if (doc.exists) {
            res.json({
                id: doc.id,
                ...doc.data()
            });
        } else {
            res.status(404).json({ message: 'Order not found' });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Update order status
router.patch('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const db = req.app.locals.db;
        
        await db.collection('orders').doc(req.params.id).update({
            status: status,
            updatedAt: new Date()
        });
        
        res.json({ message: 'Order status updated successfully' });
    } catch (err) {
        console.error('Error updating order status:', err);
        res.status(500).json({ message: err.message });
    }
});

// Update order details
router.put('/:id', upload.fields([
  { name: 'designSheet', maxCount: 1 },
  { name: 'yarnRequirementSheet', maxCount: 1 },
  { name: 'dyeingOrderForm', maxCount: 1 }
]), async (req, res) => {
    try {
        const db = req.app.locals.db;
        
        // Get existing order to preserve existing files if no new files are uploaded
        const existingOrderDoc = await db.collection('orders').doc(req.params.id).get();
        if (!existingOrderDoc.exists) {
            return res.status(404).json({ message: 'Order not found' });
        }
        
        const existingOrderData = existingOrderDoc.data();
        
        const updateData = {
            designName: req.body.designName,
            designNumber: req.body.designNumber,
            orderQuantity: Number(req.body.orderQuantity),
            warpingQuantity: Number(req.body.warpingQuantity),
            type: req.body.type,
            count: req.body.count,
            construction: req.body.construction,
            merchandiser: req.body.merchandiser,
            updatedAt: new Date()
        };

        // Validate that warping quantity is greater than order quantity
        if (updateData.warpingQuantity <= updateData.orderQuantity) {
            return res.status(400).json({ 
                message: 'Warping quantity must be greater than order quantity to account for shrinkage and wastage' 
            });
        }

        // Start with existing files (if any)
        let files = existingOrderData.files || {};

        // Handle file updates if any new files are uploaded
        if (req.files && Object.keys(req.files).length > 0) {
            if (req.files.designSheet) {
                files.designSheet = {
                    filename: req.files.designSheet[0].filename,
                    originalname: req.files.designSheet[0].originalname,
                    path: req.files.designSheet[0].path,
                    size: req.files.designSheet[0].size
                };
            }
            
            if (req.files.yarnRequirementSheet) {
                files.yarnRequirementSheet = {
                    filename: req.files.yarnRequirementSheet[0].filename,
                    originalname: req.files.yarnRequirementSheet[0].originalname,
                    path: req.files.yarnRequirementSheet[0].path,
                    size: req.files.yarnRequirementSheet[0].size
                };
            }
            
            if (req.files.dyeingOrderForm) {
                files.dyeingOrderForm = {
                    filename: req.files.dyeingOrderForm[0].filename,
                    originalname: req.files.dyeingOrderForm[0].originalname,
                    path: req.files.dyeingOrderForm[0].path,
                    size: req.files.dyeingOrderForm[0].size
                };
            }
        }

        // Only add files to updateData if there are any files
        if (Object.keys(files).length > 0) {
            updateData.files = files;
        }

        await db.collection('orders').doc(req.params.id).update(updateData);
        
        const updatedDoc = await db.collection('orders').doc(req.params.id).get();
        const updatedOrder = {
            id: updatedDoc.id,
            ...updatedDoc.data()
        };
        
        res.json(updatedOrder);
    } catch (err) {
        console.error('Error updating order:', err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router; 