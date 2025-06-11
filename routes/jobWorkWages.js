const express = require('express');
const router = express.Router();

// Function to generate invoice number
async function generateInvoiceNumber(db, warpNumber) {
    // Get or create counter document for this warp
    const counterRef = db.collection('counters').doc(`jobWorkWagesInvoice_${warpNumber}`);
    const counterDoc = await counterRef.get();
    
    let sequenceNumber = 1;
    
    if (counterDoc.exists) {
        sequenceNumber = counterDoc.data().count + 1;
        await counterRef.update({ count: sequenceNumber });
    } else {
        await counterRef.set({ count: sequenceNumber });
    }
    
    // Format sequence number with leading zeros (4 digits)
    const formattedSequence = sequenceNumber.toString().padStart(4, '0');
    
    // Generate invoice number: AT/WARPNUMBER/0001
    return `AT/${warpNumber}/${formattedSequence}`;
}

// Submit job work wages for approval
router.post('/submit', async (req, res) => {
    try {
        console.log('=== JOB WORK WAGES SUBMISSION ===');
        console.log('Request body:', req.body);

        const db = req.app.locals.db;
        
        // Generate invoice number
        const invoiceNumber = await generateInvoiceNumber(db, req.body.warpNumber);

        const submissionData = {
            ...req.body,
            invoiceNumber,
            submittedAt: new Date().toISOString(),
            status: 'pending'
        };

        // Add to job work wages submissions collection
        const docRef = await db.collection('jobWorkWagesSubmissions').add(submissionData);
        
        console.log('Job work wages submission created with ID:', docRef.id);
        console.log('Invoice number generated:', invoiceNumber);
        
        res.status(201).json({
            id: docRef.id,
            invoiceNumber,
            message: 'Job work wages submitted for approval successfully'
        });

    } catch (error) {
        console.error('Error submitting job work wages:', error);
        res.status(500).json({ 
            message: 'Failed to submit job work wages for approval',
            error: error.message 
        });
    }
});

// Get all pending job work wages submissions
router.get('/pending', async (req, res) => {
    try {
        console.log('=== FETCHING PENDING JOB WORK WAGES ===');
        
        const db = req.app.locals.db;
        const submissionsSnapshot = await db.collection('jobWorkWagesSubmissions')
            .where('status', '==', 'pending')
            .get();

        const submissions = [];
        submissionsSnapshot.forEach(doc => {
            submissions.push({
                id: doc.id,
                ...doc.data()
            });
        });

        // Sort by submittedAt in descending order (newest first)
        submissions.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

        console.log(`Found ${submissions.length} pending submissions`);
        
        res.json(submissions);

    } catch (error) {
        console.error('Error fetching pending submissions:', error);
        res.status(500).json({ 
            message: 'Failed to fetch pending submissions',
            error: error.message 
        });
    }
});

// Approve or reject job work wages submission
router.patch('/:id/approve', async (req, res) => {
    try {
        const { id } = req.params;
        const { action, remarks, updatedValues } = req.body; // action: 'approve' or 'reject'
        
        console.log(`=== ${action.toUpperCase()} JOB WORK WAGES ===`);
        console.log('Submission ID:', id);
        console.log('Action:', action);
        console.log('Remarks:', remarks);
        console.log('Updated Values:', updatedValues);

        const db = req.app.locals.db;
        const docRef = db.collection('jobWorkWagesSubmissions').doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: 'Submission not found' });
        }

        const updateData = {
            status: action === 'approve' ? 'approved' : 'rejected',
            reviewedAt: new Date().toISOString(),
            remarks: remarks || ''
        };

        // If there are updated values, include them in the update
        if (updatedValues) {
            updateData.originalTotalInspectedQuantity = doc.data().totalInspectedQuantity;
            updateData.originalTotalMistakeQuantity = doc.data().totalMistakeQuantity;
            updateData.originalTotalActualQuantity = doc.data().totalActualQuantity;
            updateData.originalRatePerMeter = doc.data().ratePerMeter;
            updateData.originalTotalWages = doc.data().totalWages;
            
            updateData.totalInspectedQuantity = updatedValues.totalInspectedQuantity;
            updateData.totalMistakeQuantity = updatedValues.totalMistakeQuantity;
            updateData.totalActualQuantity = updatedValues.totalActualQuantity;
            updateData.ratePerMeter = updatedValues.ratePerMeter;
            updateData.totalWages = updatedValues.totalWages;
            updateData.valuesUpdatedDuringApproval = true;
            
            console.log('Values were updated during approval process');
        }

        await docRef.update(updateData);

        console.log(`Job work wages ${action}d successfully`);
        
        res.json({
            message: `Job work wages ${action}d successfully`,
            ...updateData
        });

    } catch (error) {
        console.error(`Error ${req.body.action}ing job work wages:`, error);
        res.status(500).json({ 
            message: `Failed to ${req.body.action} job work wages`,
            error: error.message 
        });
    }
});

// Get all submissions (for history/reporting)
router.get('/all', async (req, res) => {
    try {
        console.log('=== FETCHING ALL JOB WORK WAGES SUBMISSIONS ===');
        
        const db = req.app.locals.db;
        const submissionsSnapshot = await db.collection('jobWorkWagesSubmissions')
            .orderBy('submittedAt', 'desc')
            .get();

        const submissions = [];
        submissionsSnapshot.forEach(doc => {
            submissions.push({
                id: doc.id,
                ...doc.data()
            });
        });

        console.log(`Found ${submissions.length} total submissions`);
        
        res.json(submissions);

    } catch (error) {
        console.error('Error fetching all submissions:', error);
        res.status(500).json({ 
            message: 'Failed to fetch submissions',
            error: error.message 
        });
    }
});

// Check if a warp has any submitted job work wages invoices
router.get('/check-warp-status/:warpId', async (req, res) => {
    try {
        const { warpId } = req.params;
        console.log('=== CHECKING WARP INVOICE STATUS ===');
        console.log('Warp ID:', warpId);

        const db = req.app.locals.db;
        const submissionsSnapshot = await db.collection('jobWorkWagesSubmissions')
            .where('warpId', '==', warpId)
            .get();

        const hasSubmittedInvoices = !submissionsSnapshot.empty;
        let pendingInvoices = [];
        let approvedInvoices = [];

        submissionsSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.status === 'pending') {
                pendingInvoices.push({ id: doc.id, ...data });
            } else if (data.status === 'approved') {
                approvedInvoices.push({ id: doc.id, ...data });
            }
        });

        console.log(`Warp ${warpId} has ${pendingInvoices.length} pending and ${approvedInvoices.length} approved invoices`);
        
        res.json({
            hasSubmittedInvoices,
            hasPendingInvoices: pendingInvoices.length > 0,
            hasApprovedInvoices: approvedInvoices.length > 0,
            pendingCount: pendingInvoices.length,
            approvedCount: approvedInvoices.length,
            pendingInvoices,
            approvedInvoices
        });

    } catch (error) {
        console.error('Error checking warp invoice status:', error);
        res.status(500).json({ 
            message: 'Failed to check warp invoice status',
            error: error.message 
        });
    }
});

// Delete a job work wages submission
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log('=== DELETING JOB WORK WAGES SUBMISSION ===');
        console.log('Submission ID:', id);

        const db = req.app.locals.db;
        const docRef = db.collection('jobWorkWagesSubmissions').doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: 'Submission not found' });
        }

        const submissionData = doc.data();
        
        // Delete the submission
        await docRef.delete();

        console.log(`Job work wages submission deleted successfully`);
        console.log('Deleted submission was for warp:', submissionData.warpNumber);
        
        res.json({
            message: 'Job work wages submission deleted successfully',
            deletedSubmission: {
                id,
                warpId: submissionData.warpId,
                warpNumber: submissionData.warpNumber,
                invoiceNumber: submissionData.invoiceNumber
            }
        });

    } catch (error) {
        console.error('Error deleting job work wages submission:', error);
        res.status(500).json({ 
            message: 'Failed to delete job work wages submission',
            error: error.message 
        });
    }
});

// Update payment status for job work wages submission
router.put('/:id/payment-status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // status should be 'payment_done'
        
        console.log('=== UPDATING PAYMENT STATUS ===');
        console.log('Submission ID:', id);
        console.log('New status:', status);

        const db = req.app.locals.db;
        const docRef = db.collection('jobWorkWagesSubmissions').doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: 'Submission not found' });
        }

        const currentData = doc.data();
        console.log('Current status:', currentData.status);
        console.log('Invoice number:', currentData.invoiceNumber);
        
        // Only allow updating payment status for approved or already paid invoices
        if (currentData.status !== 'approved' && currentData.status !== 'payment_done') {
            return res.status(400).json({ 
                message: 'Can only update payment status for approved or already paid invoices' 
            });
        }

        const updateData = {
            status: status,
            paymentUpdatedAt: new Date().toISOString()
        };

        // If marking as paid, add payment date
        if (status === 'payment_done') {
            updateData.paidAt = new Date().toISOString();
        }

        await docRef.update(updateData);

        console.log(`Payment status updated to: ${status}`);
        
        res.json({
            message: `Payment status updated successfully`,
            id,
            newStatus: status,
            updatedAt: updateData.paymentUpdatedAt
        });

    } catch (error) {
        console.error('Error updating payment status:', error);
        res.status(500).json({ 
            message: 'Failed to update payment status',
            error: error.message 
        });
    }
});

module.exports = router; 