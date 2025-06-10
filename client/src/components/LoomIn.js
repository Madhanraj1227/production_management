import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
    Container,
    Paper,
    Typography,
    TextField,
    Button,
    Box,
    Alert,
    Grid,
    Card,
    CardContent,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    ButtonGroup,
    InputAdornment,
    Stepper,
    Step,
    StepLabel
} from '@mui/material';
import {
    Delete as DeleteIcon,
    CheckCircle as CheckCircleIcon,
    QrCodeScanner as QrCodeScannerIcon,
    History as HistoryIcon,
    Search as SearchIcon,
    Clear as ClearIcon,
    ContentCut as ContentCutIcon,
    Print as PrintIcon,
    Add as AddIcon,
    Remove as RemoveIcon,
    Refresh as RefreshIcon,
    PrintOutlined as PrintOutlinedIcon
} from '@mui/icons-material';

const LoomIn = () => {
    const { view } = useParams(); // Get view parameter from URL
    const [activeView, setActiveView] = useState(() => {
        // Set initial view based on URL parameter, default to 'scan'
        return view === 'history' ? 'history' : view === 'cut' ? 'cut' : 'scan';
    });
    const [manualCode, setManualCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [recentScans, setRecentScans] = useState([]);
    const [pendingCount, setPendingCount] = useState(0);
    const [scannedFabricCuts, setScannedFabricCuts] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    
    // Fabric Cutting States
    const [showCutDialog, setShowCutDialog] = useState(false);
    const [cutStep, setCutStep] = useState(0);
    const [fabricToCut, setFabricToCut] = useState(null);
    const [numberOfCuts, setNumberOfCuts] = useState(2);
    const [cutQuantities, setCutQuantities] = useState([]);
    const [generatedCuts, setGeneratedCuts] = useState([]);
    const [cuttingInProgress, setCuttingInProgress] = useState(false);
    
    // History view states
    const [historyData, setHistoryData] = useState([]);
    const [filteredHistoryData, setFilteredHistoryData] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    const [filters, setFilters] = useState({
        searchText: '',
        scannedDateFrom: '',
        scannedDateTo: ''
    });
    
    // Caching and optimization states
    const [historyCache, setHistoryCache] = useState(null);
    const [recentScansCache, setRecentScansCache] = useState(null);
    const [lastHistoryFetch, setLastHistoryFetch] = useState(null);
    const [lastRecentScansFetch, setLastRecentScansFetch] = useState(null);
    
    // Add ref for the input field to maintain focus
    const inputRef = useRef(null);

    useEffect(() => {
        loadInitialData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Update active view when URL parameter changes
    useEffect(() => {
        setActiveView(view === 'history' ? 'history' : view === 'cut' ? 'cut' : 'scan');
    }, [view]);

    useEffect(() => {
        if (activeView === 'history' && historyData.length === 0) {
            fetchHistoryData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeView, historyData.length]);

    useEffect(() => {
        // Apply filters whenever filters or historyData changes
        applyFilters();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters, historyData]);

    // Listen for external fabric cut updates that might affect loom-in history
    useEffect(() => {
        const handleFabricCutUpdate = (event) => {
            if (event.detail && event.detail.affectsLoomInHistory && activeView === 'history') {
                setSuccess('Loom-in history updated - fabric cut was modified');
                setTimeout(() => setSuccess(''), 3000);
                fetchHistoryData(); // Refresh the data
            }
        };
        
        const handleFabricCutDelete = (event) => {
            if (event.detail && event.detail.wasInLoomInHistory && activeView === 'history') {
                setSuccess('Loom-in history updated - fabric cut was deleted');
                setTimeout(() => setSuccess(''), 3000);
                fetchHistoryData(); // Refresh the data
            }
        };
        
        // Listen for custom events from other components
        window.addEventListener('fabricCutUpdated', handleFabricCutUpdate);
        window.addEventListener('fabricCutDeleted', handleFabricCutDelete);
        
        return () => {
            window.removeEventListener('fabricCutUpdated', handleFabricCutUpdate);
            window.removeEventListener('fabricCutDeleted', handleFabricCutDelete);
        };
    }, [activeView]);

    const loadInitialData = async () => {
        setInitialLoading(true);
        await Promise.all([
            fetchRecentScans(),
            fetchPendingCount()
        ]);
        setInitialLoading(false);
    };

    const fetchHistoryData = async (forceRefresh = false) => {
        // Check cache first (cache for 30 seconds)
        const now = Date.now();
        const cacheExpiry = 30000; // 30 seconds
        
        if (!forceRefresh && historyCache && lastHistoryFetch && 
            (now - lastHistoryFetch) < cacheExpiry) {
            console.log('Using cached history data');
            setHistoryData(historyCache);
            return;
        }
        
        setHistoryLoading(true);
        try {
            // Use the ultra-optimized endpoint for better performance
            const response = await fetch(buildApiUrl('fabric-cuts/loom-in-history-ultra-fast'));
            if (response.ok) {
                const data = await response.json();
                const historyArray = data.fabricCuts || [];
                
                setHistoryData(historyArray);
                setHistoryCache(historyArray);
                setLastHistoryFetch(now);
            } else {
                setError('Failed to fetch history data');
            }
        } catch (err) {
            console.error('Error fetching history:', err);
            setError('Network error: Could not fetch history data');
        } finally {
            setHistoryLoading(false);
        }
    };

    const applyFilters = () => {
        if (!historyData || historyData.length === 0) {
            setFilteredHistoryData([]);
            return;
        }

        let filtered = [...historyData];

        // Apply text search filter
        if (filters.searchText) {
            const searchTerm = filters.searchText.toLowerCase();
            filtered = filtered.filter(item => 
                item.fabricNumber?.toLowerCase().includes(searchTerm) ||
                item.warp?.warpNumber?.toLowerCase().includes(searchTerm) ||
                item.warp?.order?.orderNumber?.toLowerCase().includes(searchTerm) ||
                item.warp?.order?.designName?.toLowerCase().includes(searchTerm) ||
                item.warp?.order?.designNumber?.toLowerCase().includes(searchTerm)
            );
        }

        // Apply date filter
        if (filters.scannedDateFrom || filters.scannedDateTo) {
            filtered = filtered.filter(item => {
                if (!item.inspectionArrival) return false;
                
                let arrivalDate;
                if (item.inspectionArrival._seconds && item.inspectionArrival._nanoseconds !== undefined) {
                    // Firebase timestamp format
                    arrivalDate = new Date(item.inspectionArrival._seconds * 1000 + item.inspectionArrival._nanoseconds / 1000000);
                } else if (item.inspectionArrival.toDate) {
                    // Firebase Timestamp object with toDate method
                    arrivalDate = item.inspectionArrival.toDate();
                } else {
                    // Regular timestamp or Date object
                    arrivalDate = new Date(item.inspectionArrival);
                }
                
                const fromDate = filters.scannedDateFrom ? new Date(filters.scannedDateFrom) : null;
                const toDate = filters.scannedDateTo ? new Date(filters.scannedDateTo + 'T23:59:59') : null; // Include end of day
                
                const isAfterFrom = !fromDate || arrivalDate >= fromDate;
                const isBeforeTo = !toDate || arrivalDate <= toDate;
                
                return isAfterFrom && isBeforeTo;
            });
        }

        setFilteredHistoryData(filtered);
    };

    const getTotalQuantity = () => {
        return parseFloat(filteredHistoryData.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0)).toFixed(2);
    };

    // Fabric Cutting Functions
    const startFabricCutting = async (qrCode) => {
        setError('');
        setCuttingInProgress(true);
        
        try {
            // Validate QR code format
            const parts = qrCode.split('/');
            if (parts.length !== 2) {
                throw new Error('Invalid fabric cut ID format. Expected: WARPNUMBER/CUTNUMBER');
            }

            // Fetch fabric cut details
            const response = await fetch(buildApiUrl('fabric-cuts/by-qr/${encodeURIComponent(qrCode)}'));
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Fabric cut not found');
            }

            const fabricCut = await response.json();
            
            // Check if fabric has already been cut (has sub-cuts)
            const checkSubCutsResponse = await fetch(buildApiUrl('fabric-cuts/check-sub-cuts/${fabricCut.id}'));
            if (checkSubCutsResponse.ok) {
                const subCutsData = await checkSubCutsResponse.json();
                if (subCutsData.hasSubCuts) {
                    throw new Error('This fabric has already been cut into sub-pieces');
                }
            }

            setFabricToCut(fabricCut);
            setCutStep(0);
            setNumberOfCuts(2);
            setCutQuantities([fabricCut.quantity / 2, fabricCut.quantity / 2]);
            setShowCutDialog(true);
            
        } catch (err) {
            setError(err.message);
        } finally {
            setCuttingInProgress(false);
        }
    };

    const updateNumberOfCuts = (newCount) => {
        if (newCount < 2 || newCount > 10) return;
        
        setNumberOfCuts(newCount);
        const equalQuantity = fabricToCut.quantity / newCount;
        setCutQuantities(Array(newCount).fill(equalQuantity));
    };

    const updateCutQuantity = (index, quantity) => {
        const newQuantities = [...cutQuantities];
        newQuantities[index] = parseFloat(quantity) || 0;
        setCutQuantities(newQuantities);
    };

    const getTotalCutQuantity = () => {
        return cutQuantities.reduce((sum, qty) => sum + qty, 0);
    };

    const canProceedToCutting = () => {
        const total = getTotalCutQuantity();
        return Math.abs(total - fabricToCut.quantity) < 0.01 && cutQuantities.every(qty => qty > 0);
    };

    const executeFabricCutting = async () => {
        if (!canProceedToCutting()) {
            setError('Total cut quantities must equal original fabric quantity');
            return;
        }

        setCuttingInProgress(true);
        setError('');

        try {
            const response = await fetch(buildApiUrl('fabric-cuts/split-fabric'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    originalFabricId: fabricToCut.id,
                    cutQuantities: cutQuantities
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to cut fabric');
            }

            const result = await response.json();
            setGeneratedCuts(result.newFabricCuts);
            setCutStep(2);
            setSuccess(`Successfully cut fabric into ${cutQuantities.length} pieces`);

            // Refresh data (force refresh to show new cuts)
            await Promise.all([
                fetchRecentScans(true),
                fetchPendingCount()
            ]);

        } catch (err) {
            setError(err.message);
        } finally {
            setCuttingInProgress(false);
        }
    };

    const printAllCutQRs = () => {
        const printWindow = window.open('', '_blank');
        
        // Generate HTML for all stickers, each on its own page
        let htmlContent = `
            <html>
                <head>
                    <title>Fabric Cut QR Stickers - ${generatedCuts.length} pieces</title>
                    <style>
                        @page {
                            size: 9.5cm 5.5cm;
                            margin: 2mm;
                        }
                        @media print {
                            body { -webkit-print-color-adjust: exact; }
                            .page-break { page-break-before: always; }
                        }
                        body { 
                            font-family: Arial, sans-serif; 
                            margin: 0; 
                            padding: 0;
                            font-size: 8px;
                        }
                        .sticker {
                            border: 1px solid #000;
                            padding: 2mm;
                            width: 9.1cm;
                            height: 5.1cm;
                            box-sizing: border-box;
                            display: flex;
                            flex-direction: column;
                            overflow: hidden;
                            page-break-after: always;
                        }
                        .sticker:last-child {
                            page-break-after: avoid;
                        }
                        .company-name {
                            text-align: center;
                            font-weight: bold;
                            font-size: 12px;
                            margin-bottom: 2mm;
                            border-bottom: 1px solid #ccc;
                            padding-bottom: 1mm;
                            flex-shrink: 0;
                        }
                        .content {
                            display: flex;
                            flex: 1;
                            min-height: 0;
                        }
                        .qr-section {
                            width: 45%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        }
                        .qr-section img {
                            max-width: 32mm;
                            max-height: 32mm;
                        }
                        .info-section {
                            width: 55%;
                            padding-left: 2mm;
                            display: flex;
                            flex-direction: column;
                            justify-content: space-around;
                        }
                        .info-row {
                            display: flex;
                            justify-content: space-between;
                            margin-bottom: 0.5mm;
                        }
                        .info-label {
                            font-weight: bold;
                            color: #333;
                            font-size: 7px;
                        }
                        .info-value {
                            color: #000;
                            font-size: 7px;
                        }
                    </style>
                </head>
                <body>`;
        
        // Add each sticker on its own page
        generatedCuts.forEach((cut, index) => {
            htmlContent += `
                <div class="sticker">
                    <div class="company-name">ASHOK TEXTILES</div>
                    <div class="content">
                        <div class="qr-section">
                            <img src="${cut.qrCodeData}" alt="QR Code" />
                        </div>
                        <div class="info-section">
                            <div class="info-row">
                                <span class="info-label">Order:</span>
                                <span class="info-value">${cut.warp?.order?.orderNumber || 'N/A'}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Design Name:</span>
                                <span class="info-value">${cut.warp?.order?.designName || 'N/A'}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Design Number:</span>
                                <span class="info-value">${cut.warp?.order?.designNumber || 'N/A'}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Warp:</span>
                                <span class="info-value">${cut.warp?.warpOrderNumber || 'N/A'}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Loom:</span>
                                <span class="info-value">${cut.warp?.loom?.loomName || 'N/A'}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Quantity:</span>
                                <span class="info-value">${cut.quantity}m</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Fabric No:</span>
                                <span class="info-value">${cut.fabricNumber}</span>
                            </div>
                        </div>
                    </div>
                </div>`;
        });
        
        htmlContent += `
                    <script>
                        window.onload = function() {
                            window.print();
                            window.onafterprint = function() {
                                window.close();
                            };
                        };
                    </script>
                </body>
            </html>
        `;
        
        printWindow.document.write(htmlContent);
        printWindow.document.close();
    };

    const closeCutDialog = () => {
        setShowCutDialog(false);
        setCutStep(0);
        setFabricToCut(null);
        setNumberOfCuts(2);
        setCutQuantities([]);
        setGeneratedCuts([]);
        setError('');
    };

    const hasActiveFilters = () => {
        return filters.searchText || filters.scannedDateFrom || filters.scannedDateTo;
    };

    const clearFilters = () => {
        setFilters({
            searchText: '',
            scannedDateFrom: '',
            scannedDateTo: ''
        });
    };

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const fetchPendingCount = async () => {
        try {
            const response = await fetch(buildApiUrl('fabric-cuts/pending-inspection-count'));
            if (response.ok) {
                const data = await response.json();
                setPendingCount(data.count);
            } else {
                console.error('Failed to fetch pending count');
            }
        } catch (err) {
            console.error('Network error fetching pending count:', err);
        }
    };

    const fetchRecentScans = async (forceRefresh = false) => {
        // Check cache first (cache for 15 seconds for recent scans)
        const now = Date.now();
        const cacheExpiry = 15000; // 15 seconds
        
        if (!forceRefresh && recentScansCache && lastRecentScansFetch && 
            (now - lastRecentScansFetch) < cacheExpiry) {
            console.log('Using cached recent scans data');
            setRecentScans(recentScansCache);
            return;
        }
        
        try {
            console.log('Fetching recent scans...');
            // Use ultra-optimized endpoint for better performance
            const response = await fetch(buildApiUrl('fabric-cuts/recent-inspections-ultra-fast'));
            console.log('Recent scans response status:', response.status);
            
            if (response.ok) {
                const data = await response.json();
                console.log('Recent scans data:', data);
                const recentScansArray = Array.isArray(data) ? data : [];
                
                setRecentScans(recentScansArray);
                setRecentScansCache(recentScansArray);
                setLastRecentScansFetch(now);
            } else {
                const errorText = await response.text();
                console.error('Error response:', errorText);
                setRecentScans([]);
                if (response.status !== 404) {
                    setError(`Failed to fetch recent scans: ${response.status}`);
                }
            }
        } catch (err) {
            console.error('Network error fetching recent scans:', err);
            setRecentScans([]);
            setError('Network error: Could not connect to server');
        }
    };

    const handleQRScan = async (qrCode) => {
        console.log('Processing fabric cut ID:', qrCode);
        setError('');
        setLoading(true);

        try {
            // Validate QR code format (should be WARPNUMBER/CUTNUMBER)
            const parts = qrCode.split('/');
            if (parts.length !== 2) {
                throw new Error('Invalid fabric cut ID format. Expected: WARPNUMBER/CUTNUMBER');
            }

            const [warpNumber, cutNumber] = parts;
            if (!warpNumber || !cutNumber || isNaN(parseInt(cutNumber))) {
                throw new Error('Invalid fabric cut ID. Check warp number and cut number.');
            }

            // Check if already scanned
            if (scannedFabricCuts.some(item => item.qrCode === qrCode)) {
                setError(`Fabric cut ID ${qrCode} has already been added to the list`);
                return;
            }

            console.log('Making API call to:', buildApiUrl('fabric-cuts/by-qr/${encodeURIComponent(qrCode)}'));
            const response = await fetch(buildApiUrl('fabric-cuts/by-qr/${encodeURIComponent(qrCode)}'));
            console.log('Response status:', response.status);
            
            if (response.ok) {
                const fabricCut = await response.json();
                console.log('Fabric cut found:', fabricCut);
                
                if (fabricCut.inspectionArrival) {
                    const arrivalDate = new Date(fabricCut.inspectionArrival);
                    setError(`This fabric cut was already marked as arrived on ${formatDate(arrivalDate)}`);
                } else {
                    // Add to scanned list
                    const scannedItem = {
                        ...fabricCut,
                        qrCode: qrCode,
                        scannedAt: new Date()
                    };
                    setScannedFabricCuts(prev => [...prev, scannedItem]);
                    setSuccess(`Added ${fabricCut.fabricNumber} to batch list`);
                    
                    // Clear success message after 2 seconds
                    setTimeout(() => setSuccess(''), 2000);
                    
                    // Clear the input field and refocus for next entry
                    setManualCode('');
                    setTimeout(() => {
                        if (inputRef.current) {
                            inputRef.current.focus();
                        }
                    }, 100);
                }
            } else {
                const errorData = await response.json();
                console.error('API error:', errorData);
                setError(errorData.message || `Server error: ${response.status}`);
            }
        } catch (err) {
            console.error('Processing error:', err);
            setError(err.message || 'Error processing fabric cut ID');
        } finally {
            setLoading(false);
        }
    };

    const handleManualSubmit = () => {
        console.log('handleManualSubmit called with:', manualCode);
        if (manualCode.trim()) {
            handleQRScan(manualCode.trim());
        }
    };

    const removeFromList = (index) => {
        console.log('Removing item at index:', index);
        setScannedFabricCuts(prev => prev.filter((_, i) => i !== index));
        // Refocus the input after removing item
        setTimeout(() => {
            if (inputRef.current) {
                inputRef.current.focus();
            }
        }, 100);
    };

    const clearAllScanned = () => {
        setScannedFabricCuts([]);
        setSuccess('Cleared all scanned items');
        setTimeout(() => setSuccess(''), 2000);
        // Refocus the input after clearing
        setTimeout(() => {
            if (inputRef.current) {
                inputRef.current.focus();
            }
        }, 100);
    };

    const submitAllFabricCuts = async () => {
        if (scannedFabricCuts.length === 0) {
            setError('No fabric cuts to submit');
            return;
        }
        
        setShowConfirmDialog(true);
    };

    const confirmBatchSubmission = async () => {
        setShowConfirmDialog(false);
        setSubmitting(true);
        setError('');

        try {
            const promises = scannedFabricCuts.map(fabricCut => 
                fetch(buildApiUrl('fabric-cuts/${fabricCut.id}/inspection-arrival'), {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                })
            );

            const responses = await Promise.all(promises);
            
            let successCount = 0;
            let errorCount = 0;
            
            for (const response of responses) {
                if (response.ok) {
                    successCount++;
                } else {
                    errorCount++;
                }
            }

            if (successCount > 0) {
                setSuccess(`Successfully marked ${successCount} fabric cut${successCount > 1 ? 's' : ''} as arrived at inspection`);
                setScannedFabricCuts([]);
                
                // Refresh data (force refresh to show new data)
                await Promise.all([
                    fetchRecentScans(true),
                    fetchPendingCount()
                ]);
                
                // Refresh history data if on history view
                if (activeView === 'history') {
                    await fetchHistoryData(true);
                }
                
                // Refocus the input for next entries
                setTimeout(() => {
                    if (inputRef.current) {
                        inputRef.current.focus();
                    }
                }, 100);
            }
            
            if (errorCount > 0) {
                setError(`Failed to process ${errorCount} fabric cut${errorCount > 1 ? 's' : ''}`);
            }
        } catch (err) {
            console.error('Error submitting fabric cuts:', err);
            setError('Failed to submit fabric cuts: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        
        let date;
        if (timestamp._seconds && timestamp._nanoseconds !== undefined) {
            // Firebase timestamp format
            date = new Date(timestamp._seconds * 1000 + timestamp._nanoseconds / 1000000);
        } else if (timestamp.toDate) {
            // Firebase Timestamp object with toDate method
            date = timestamp.toDate();
        } else {
            // Regular timestamp or Date object
            date = new Date(timestamp);
        }
        
        return date.toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const renderHistoryView = () => (
        <>
            {/* History Header with Filters */}
            <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h6">
                        Loom-In History ({filteredHistoryData.length} records)
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        {hasActiveFilters() && (
                            <Typography variant="h6" color="primary">
                                Total Quantity: {getTotalQuantity()} meters
                            </Typography>
                        )}
                        <Button 
                            variant="outlined" 
                            size="small"
                            onClick={printSummary}
                            disabled={historyLoading}
                            startIcon={<PrintOutlinedIcon />}
                            color="secondary"
                        >
                            Print Summary
                        </Button>
                        <Button 
                            variant="outlined" 
                            size="small"
                            onClick={clearFilters}
                            startIcon={<ClearIcon />}
                        >
                            Clear Filters
                        </Button>
                        <Button 
                            variant="contained" 
                            size="small"
                            onClick={refreshHistoryData}
                            disabled={historyLoading}
                            startIcon={historyLoading ? <CircularProgress size={16} /> : <RefreshIcon />}
                        >
                            {historyLoading ? 'Refreshing...' : 'Refresh'}
                        </Button>
                    </Box>
                </Box>

                {/* Search and Filters */}
                <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                        <TextField
                            fullWidth
                            size="small"
                            label="Search All"
                            placeholder="Search by fabric number, warp number, order number, design name, or design number..."
                            value={filters.searchText}
                            onChange={(e) => handleFilterChange('searchText', e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon />
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <TextField
                            fullWidth
                            size="small"
                            label="Scanned Date From"
                            type="date"
                            value={filters.scannedDateFrom}
                            onChange={(e) => handleFilterChange('scannedDateFrom', e.target.value)}
                            InputLabelProps={{
                                shrink: true,
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <TextField
                            fullWidth
                            size="small"
                            label="Scanned Date To"
                            type="date"
                            value={filters.scannedDateTo}
                            onChange={(e) => handleFilterChange('scannedDateTo', e.target.value)}
                            InputLabelProps={{
                                shrink: true,
                            }}
                        />
                    </Grid>
                </Grid>
            </Paper>

            {/* History Table */}
            <Paper elevation={3} sx={{ p: 3 }}>
                {historyLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : filteredHistoryData.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                        <Typography variant="body1">
                            {historyData.length === 0 ? 'No loom-in history available.' : 'No records match the current filters.'}
                        </Typography>
                    </Box>
                ) : (
                    <TableContainer sx={{ maxHeight: 600 }}>
                        <Table stickyHeader>
                            <TableHead>
                                <TableRow>
                                    <TableCell><strong>Fabric Cut ID</strong></TableCell>
                                    <TableCell><strong>Fabric Number</strong></TableCell>
                                    <TableCell><strong>Warp Number</strong></TableCell>
                                    <TableCell><strong>Order Number</strong></TableCell>
                                    <TableCell><strong>Design Name</strong></TableCell>
                                    <TableCell><strong>Design Number</strong></TableCell>
                                    <TableCell><strong>Loom-In Scanned Date</strong></TableCell>
                                    <TableCell><strong>Quantity (meters)</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredHistoryData.map((fabricCut, index) => (
                                    <TableRow key={index} hover>
                                        <TableCell>
                                            <Chip 
                                                label={`${fabricCut.warp?.warpNumber || 'N/A'}/${String(fabricCut.cutNumber || '?').padStart(2, '0')}`}
                                                size="small" 
                                                color="primary" 
                                                variant="outlined"
                                            />
                                        </TableCell>
                                        <TableCell>{fabricCut.fabricNumber || 'N/A'}</TableCell>
                                        <TableCell>{fabricCut.warp?.warpNumber || fabricCut.warp?.warpOrderNumber || 'N/A'}</TableCell>
                                        <TableCell>{fabricCut.warp?.order?.orderNumber || fabricCut.warp?.order?.orderName || 'N/A'}</TableCell>
                                        <TableCell>{fabricCut.warp?.order?.designName || 'N/A'}</TableCell>
                                        <TableCell>{fabricCut.warp?.order?.designNumber || 'N/A'}</TableCell>
                                        <TableCell>{formatDate(fabricCut.inspectionArrival)}</TableCell>
                                        <TableCell>{parseFloat(fabricCut.quantity || 0).toFixed(2)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>
        </>
    );

    const renderScanView = () => (
        <>
            {/* Statistics Cards */}
            <Grid container spacing={2} sx={{ mb: 4 }}>
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                            <Typography variant="h6" color="primary" sx={{ fontSize: '0.9rem' }}>
                                Pending Inspection
                            </Typography>
                            <Typography variant="h4">
                                {pendingCount}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                            <Typography variant="h6" color="success.main" sx={{ fontSize: '0.9rem' }}>
                                Today's Arrivals
                            </Typography>
                            <Typography variant="h4">
                                {recentScans.length}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Manual Input Section */}
            <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Scan or Enter Fabric Cut ID
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', maxWidth: 600 }}>
                    <TextField
                        fullWidth
                        placeholder="Scan QR code or enter fabric cut ID (e.g., W001/01)"
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                                handleManualSubmit();
                            }
                        }}
                        variant="outlined"
                        size="medium"
                        inputRef={inputRef}
                        disabled={loading}
                        autoFocus
                        InputProps={{
                            endAdornment: loading && <CircularProgress size={20} />
                        }}
                    />
                </Box>
                
                <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                    Automatically adds to list when you press Enter or scan QR code. Format: WARPNUMBER/CUTNUMBER (e.g., W001/01, W002/05)
                </Typography>
            </Paper>

            {/* Scanned Fabric Cuts List */}
            <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                        Fabric Cuts to Submit ({scannedFabricCuts.length})
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        {scannedFabricCuts.length > 0 && (
                            <>
                                <Button 
                                    variant="outlined" 
                                    color="error"
                                    onClick={clearAllScanned}
                                    size="small"
                                    disabled={submitting}
                                >
                                    Clear All
                                </Button>
                                <Button 
                                    variant="contained" 
                                    color="primary"
                                    onClick={submitAllFabricCuts}
                                    disabled={submitting}
                                    startIcon={submitting ? <CircularProgress size={16} /> : <CheckCircleIcon />}
                                >
                                    {submitting ? 'Submitting...' : `Submit All (${scannedFabricCuts.length})`}
                                </Button>
                            </>
                        )}
                    </Box>
                </Box>

                {scannedFabricCuts.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                        <Typography variant="body1">
                            No fabric cuts added yet. Scan QR codes or enter fabric cut IDs above to automatically add them to the batch.
                        </Typography>
                    </Box>
                ) : (
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell><strong>Fabric Cut ID</strong></TableCell>
                                    <TableCell><strong>Fabric Number</strong></TableCell>
                                    <TableCell><strong>Warp</strong></TableCell>
                                    <TableCell><strong>Order</strong></TableCell>
                                    <TableCell><strong>Quantity</strong></TableCell>
                                    <TableCell><strong>Cut Number</strong></TableCell>
                                    <TableCell><strong>Actions</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {scannedFabricCuts.map((fabricCut, index) => (
                                    <TableRow key={index}>
                                        <TableCell>
                                            <Chip 
                                                label={fabricCut.qrCode} 
                                                size="small" 
                                                color="primary" 
                                                variant="outlined"
                                            />
                                        </TableCell>
                                        <TableCell>{fabricCut.fabricNumber}</TableCell>
                                        <TableCell>
                                            {fabricCut.warp?.warpNumber || fabricCut.warp?.warpOrderNumber || 'N/A'}
                                        </TableCell>
                                        <TableCell>
                                            {fabricCut.warp?.order?.orderNumber || fabricCut.warp?.order?.orderName || 'N/A'}
                                        </TableCell>
                                        <TableCell>{parseFloat(fabricCut.quantity || 0).toFixed(2)} meters</TableCell>
                                        <TableCell>{fabricCut.cutNumber}</TableCell>
                                        <TableCell>
                                            <IconButton 
                                                color="error" 
                                                size="small"
                                                onClick={() => removeFromList(index)}
                                                disabled={submitting}
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>
        </>
    );

    const renderCutView = () => (
        <>
            {/* Fabric Cutting Header */}
            <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Fabric Cutting
                </Typography>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                    Scan a fabric QR code to cut it into multiple pieces. Each piece will get a new QR code.
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', maxWidth: 600, mt: 2 }}>
                    <TextField
                        fullWidth
                        placeholder="Scan QR code or enter fabric cut ID (e.g., W001/01)"
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter' && manualCode.trim()) {
                                startFabricCutting(manualCode.trim());
                                setManualCode('');
                            }
                        }}
                        variant="outlined"
                        size="medium"
                        disabled={cuttingInProgress}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <ContentCutIcon />
                                </InputAdornment>
                            ),
                            endAdornment: cuttingInProgress && <CircularProgress size={20} />
                        }}
                    />
                    <Button
                        variant="contained"
                        onClick={() => {
                            if (manualCode.trim()) {
                                startFabricCutting(manualCode.trim());
                                setManualCode('');
                            }
                        }}
                        disabled={!manualCode.trim() || cuttingInProgress}
                        startIcon={<ContentCutIcon />}
                    >
                        Cut Fabric
                    </Button>
                </Box>
            </Paper>

            {/* Instructions Card */}
            <Paper elevation={3} sx={{ p: 3, mb: 3, bgcolor: 'info.light', color: 'info.contrastText' }}>
                <Typography variant="h6" gutterBottom>
                    📋 How to Cut Fabric:
                </Typography>
                <Typography variant="body2" component="div">
                    <strong>Step 1:</strong> Scan or enter the fabric QR code (e.g., WOF0001/01)
                    <br />
                    <strong>Step 2:</strong> Choose how many pieces to cut (2-10 pieces)
                    <br />
                    <strong>Step 3:</strong> Enter quantity for each piece (total must equal original)
                    <br />
                    <strong>Step 4:</strong> Confirm cutting - original fabric will be replaced
                    <br />
                    <strong>Step 5:</strong> Print QR stickers for new cut pieces
                </Typography>
            </Paper>
        </>
    );

    const refreshHistoryData = async () => {
        setHistoryLoading(true);
        await fetchHistoryData(true); // Force refresh
        setHistoryLoading(false);
    };

    const printSummary = async () => {
        try {
            setHistoryLoading(true);
            const searchParam = filters.searchText ? `?search=${encodeURIComponent(filters.searchText)}` : '';
            const response = await fetch(buildApiUrl('fabric-cuts/print-summary${searchParam}'));
            
            if (!response.ok) {
                throw new Error('Failed to generate print summary');
            }
            
            const data = await response.json();
            generatePrintReport(data);
        } catch (err) {
            console.error('Error generating print summary:', err);
            setError('Failed to generate print summary');
            setTimeout(() => setError(''), 3000);
        } finally {
            setHistoryLoading(false);
        }
    };

    const generatePrintReport = (data) => {
        const { summary, fabricCuts } = data;
        
        // Get the first fabric cut to extract order and warp details for header
        const firstCut = fabricCuts[0];
        const warpOrderNumber = firstCut?.warp?.warpOrderNumber || 'N/A';
        const orderNumber = firstCut?.warp?.order?.orderNumber || 'N/A';
        const designName = firstCut?.warp?.order?.designName || 'N/A';
        const designNumber = firstCut?.warp?.order?.designNumber || 'N/A';
        const loomName = firstCut?.warp?.loom?.loomName || firstCut?.loomName || 'N/A';
        const companyName = firstCut?.warp?.loom?.companyName || firstCut?.companyName || 'N/A';
        
        // Create a new window for printing
        const printWindow = window.open('', '_blank');
        
        // Generate the HTML content for the print report
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Loom-In Summary Report</title>
                <style>
                    @page {
                        size: A4 landscape;
                        margin: 8mm;
                    }
                    
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        font-size: 10px;
                        line-height: 1.2;
                        color: #333;
                    }
                    
                    .header {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        margin-bottom: 8px;
                        padding-bottom: 8px;
                        border-bottom: 2px solid #8B0000;
                        min-height: 120px;
                    }
                    
                    .header-left {
                        flex: 2;
                        text-align: left;
                        display: flex;
                        flex-direction: column;
                        align-items: flex-start;
                        justify-content: flex-start;
                        gap: 0px;
                    }
                    
                    .header-center {
                        flex: 1;
                        text-align: center;
                        margin: 0 30px;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                    }
                    
                    .header-right {
                        flex: 2;
                        text-align: left;
                        font-size: 11px;
                        padding-left: 20px;
                        display: flex;
                        flex-direction: column;
                        justify-content: flex-end;
                        padding-bottom: 10px;
                    }
                    
                    .logo {
                        width: 140px;
                        height: 140px;
                        border-radius: 8px;
                        object-fit: contain;
                        margin-bottom: 5px;
                    }
                    
                    .report-title {
                        font-size: 20px;
                        color: #8B0000;
                        font-weight: bold;
                        margin: 0px;
                        text-align: center;
                    }
                    
                    .report-subtitle {
                        font-size: 14px;
                        color: #666;
                        margin-bottom: 8px;
                    }
                    
                    .report-info {
                        font-size: 10px;
                        color: #666;
                        margin-bottom: 2px;
                        line-height: 1.2;
                        text-align: center;
                    }
                    
                    .order-detail-item {
                        margin-bottom: 6px;
                        display: flex;
                        justify-content: space-between;
                    }
                    
                    .order-detail-label {
                        font-weight: bold;
                        color: #8B0000;
                        min-width: 90px;
                        font-size: 11px;
                    }
                    
                    .order-detail-value {
                        color: #333;
                        font-weight: 500;
                        font-size: 11px;
                    }
                    
                    .summary-cards {
                        display: grid;
                        grid-template-columns: repeat(3, 1fr);
                        gap: 8px;
                        margin-bottom: 8px;
                    }
                    
                    .summary-card {
                        background: #f8f9fa;
                        padding: 6px;
                        border-radius: 4px;
                        border-left: 3px solid #8B0000;
                        text-align: center;
                    }
                    
                    .summary-card h3 {
                        font-size: 9px;
                        color: #666;
                        margin-bottom: 3px;
                        text-transform: uppercase;
                        letter-spacing: 0.3px;
                    }
                    
                    .summary-card .value {
                        font-size: 16px;
                        font-weight: bold;
                        color: #8B0000;
                    }
                    
                    .table-container {
                        background: white;
                        border-radius: 6px;
                        overflow: hidden;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    }
                    
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        font-size: 11px;
                    }
                    
                    th {
                        background: #8B0000;
                        color: white;
                        padding: 6px 8px;
                        text-align: left;
                        font-weight: 600;
                        font-size: 11px;
                    }
                    
                    td {
                        padding: 5px 8px;
                        border-bottom: 1px solid #eee;
                        vertical-align: middle;
                    }
                    
                    tr:nth-child(even) {
                        background: #f8f9fa;
                    }
                    
                    .fabric-number {
                        font-weight: bold;
                        color: #8B0000;
                        font-size: 11px;
                    }
                    
                    .quantity {
                        text-align: center;
                        font-weight: bold;
                        font-size: 11px;
                    }
                    
                    .date {
                        font-size: 11px;
                        color: #000;
                        white-space: nowrap;
                        font-weight: 600;
                        background-color: #f8f9fa;
                        padding: 4px 6px;
                        border-radius: 4px;
                        border: 1px solid #e9ecef;
                    }
                    
                    .footer {
                        margin-top: 8px;
                        padding-top: 5px;
                        border-top: 1px solid #eee;
                        text-align: center;
                        color: #666;
                        font-size: 7px;
                    }
                    
                    @media print {
                        body {
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }
                        
                        .header {
                            page-break-inside: avoid;
                        }
                        
                        .summary-cards {
                            page-break-inside: avoid;
                        }
                        
                        table {
                            page-break-inside: auto;
                        }
                        
                        tr {
                            page-break-inside: avoid;
                            page-break-after: auto;
                        }
                        
                        thead {
                            display: table-header-group;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="header-left">
                        <img src="/ashok-textiles-logo.png" alt="Company Logo" class="logo" />
                    </div>
                    
                    <div class="header-center">
                        <div class="report-title">Loom-In Summary Report</div>
                        <div class="report-info">Generated: ${new Date().toLocaleString()}</div>
                        ${summary.searchTerm ? `<div class="report-info">Search: "${summary.searchTerm}"</div>` : ''}
                    </div>
                    
                    <div class="header-right">
                        <div class="order-detail-item">
                            <span class="order-detail-label">Warp Order:</span>
                            <span class="order-detail-value">${warpOrderNumber}</span>
                        </div>
                        <div class="order-detail-item">
                            <span class="order-detail-label">Order:</span>
                            <span class="order-detail-value">${orderNumber}</span>
                        </div>
                        <div class="order-detail-item">
                            <span class="order-detail-label">Design:</span>
                            <span class="order-detail-value">${designName}</span>
                        </div>
                        <div class="order-detail-item">
                            <span class="order-detail-label">Design #:</span>
                            <span class="order-detail-value">${designNumber}</span>
                        </div>
                        <div class="order-detail-item">
                            <span class="order-detail-label">Loom:</span>
                            <span class="order-detail-value">${loomName}</span>
                        </div>
                        <div class="order-detail-item">
                            <span class="order-detail-label">Company:</span>
                            <span class="order-detail-value">${companyName}</span>
                        </div>
                    </div>
                </div>
                
                <div class="summary-cards">
                    <div class="summary-card">
                        <h3>Total Fabric Cuts</h3>
                        <div class="value">${summary.totalFabricCuts}</div>
                    </div>
                    <div class="summary-card">
                        <h3>Total Quantity</h3>
                        <div class="value">${parseFloat(summary.totalQuantity || 0).toFixed(2)}</div>
                    </div>
                    <div class="summary-card">
                        <h3>Date Range</h3>
                        <div class="value" style="font-size: 10px;">
                            ${summary.dateRange ? `${new Date(summary.dateRange.from).toLocaleDateString()} - ${new Date(summary.dateRange.to).toLocaleDateString()}` : 'N/A'}
                        </div>
                    </div>
                </div>
                
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 35%;">Fabric Number</th>
                                <th style="width: 15%;">Quantity</th>
                                <th style="width: 50%;">Scan Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${fabricCuts.map(cut => `
                                <tr>
                                    <td class="fabric-number">${cut.fabricNumber || 'N/A'}</td>
                                    <td class="quantity">${parseFloat(cut.quantity || 0).toFixed(2)}</td>
                                    <td class="date">
                                        ${cut.inspectionArrival ? (() => {
                                            try {
                                                let date;
                                                if (cut.inspectionArrival._seconds) {
                                                    // Firebase timestamp with _seconds and _nanoseconds
                                                    date = new Date(cut.inspectionArrival._seconds * 1000);
                                                } else if (cut.inspectionArrival.seconds) {
                                                    // Firebase timestamp with seconds and nanoseconds
                                                    date = new Date(cut.inspectionArrival.seconds * 1000);
                                                } else if (cut.inspectionArrival.toDate) {
                                                    // Firebase Timestamp object with toDate method
                                                    date = cut.inspectionArrival.toDate();
                                                } else {
                                                    // Regular timestamp or Date object
                                                    date = new Date(cut.inspectionArrival);
                                                }
                                                
                                                if (isNaN(date.getTime())) {
                                                    return 'Invalid Date';
                                                }
                                                
                                                return date.toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: '2-digit',
                                                    day: '2-digit'
                                                }) + ' ' + date.toLocaleTimeString('en-US', {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    hour12: true
                                                });
                                            } catch (error) {
                                                console.error('Date formatting error:', error, cut.inspectionArrival);
                                                return 'Date Error';
                                            }
                                        })() : 'No Date'}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                
                <div class="footer">
                    <p>This report was automatically generated by the ${companyName} - Loom-In Module</p>
                    <p>Report contains ${summary.totalFabricCuts} fabric cuts with a total quantity of ${parseFloat(summary.totalQuantity || 0).toFixed(2)} units</p>
                </div>
            </body>
            </html>
        `;
        
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        
        // Trigger print dialog after content loads
        printWindow.onload = () => {
            printWindow.print();
        };
    };

    if (initialLoading) {
        return (
            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
                    <CircularProgress />
                    <Typography variant="h6" sx={{ ml: 2 }}>
                        Loading data...
                    </Typography>
                </Box>
            </Container>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            {/* Header with Navigation */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Box>
                    <Typography variant="h4" gutterBottom>
                        Loom-In: Inspection Arrival
                    </Typography>
                    <Typography variant="body1" color="textSecondary">
                        {activeView === 'scan' 
                            ? 'Scan QR codes or enter fabric cut IDs - they\'ll be automatically added to your batch list'
                            : activeView === 'cut'
                            ? 'Cut fabric into multiple pieces with new QR codes for each piece'
                            : 'View complete history of all fabric cuts scanned for loom-in with filtering options'
                        }
                    </Typography>
                </Box>
                
                {/* Navigation Buttons */}
                <ButtonGroup variant="contained" size="large">
                    <Button
                        variant={activeView === 'scan' ? 'contained' : 'outlined'}
                        startIcon={<QrCodeScannerIcon />}
                        onClick={() => setActiveView('scan')}
                    >
                        QR Scan
                    </Button>
                    <Button
                        variant={activeView === 'cut' ? 'contained' : 'outlined'}
                        startIcon={<ContentCutIcon />}
                        onClick={() => setActiveView('cut')}
                    >
                        Cut Fabric
                    </Button>
                    <Button
                        variant={activeView === 'history' ? 'contained' : 'outlined'}
                        startIcon={<HistoryIcon />}
                        onClick={() => setActiveView('history')}
                    >
                        History
                    </Button>
                </ButtonGroup>
            </Box>

            {/* Error and Success Messages */}
            {error && (
                <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}
            {success && (
                <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>
                    {success}
                </Alert>
            )}

            {/* Content based on active view */}
            {activeView === 'scan' ? renderScanView() : activeView === 'cut' ? renderCutView() : renderHistoryView()}

            {/* Fabric Cutting Dialog */}
            <Dialog open={showCutDialog} onClose={closeCutDialog} maxWidth="md" fullWidth>
                <DialogTitle>
                    <Typography variant="h6">Cut Fabric: {fabricToCut?.fabricNumber}</Typography>
                    <Typography variant="body2" color="textSecondary">
                        Original Quantity: {parseFloat(fabricToCut?.quantity || 0).toFixed(2)}m
                    </Typography>
                </DialogTitle>
                <DialogContent>
                    <Stepper activeStep={cutStep} sx={{ mb: 3 }}>
                        <Step>
                            <StepLabel>Number of Cuts</StepLabel>
                        </Step>
                        <Step>
                            <StepLabel>Set Quantities</StepLabel>
                        </Step>
                        <Step>
                            <StepLabel>Print QR Codes</StepLabel>
                        </Step>
                    </Stepper>

                    {cutStep === 0 && (
                        <Box>
                            <Typography variant="h6" gutterBottom>
                                How many pieces do you want to cut this fabric into?
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
                                <IconButton 
                                    onClick={() => updateNumberOfCuts(numberOfCuts - 1)}
                                    disabled={numberOfCuts <= 2}
                                >
                                    <RemoveIcon />
                                </IconButton>
                                <TextField
                                    type="number"
                                    value={numberOfCuts}
                                    onChange={(e) => updateNumberOfCuts(parseInt(e.target.value))}
                                    inputProps={{ min: 2, max: 10 }}
                                    sx={{ width: 100 }}
                                />
                                <IconButton 
                                    onClick={() => updateNumberOfCuts(numberOfCuts + 1)}
                                    disabled={numberOfCuts >= 10}
                                >
                                    <AddIcon />
                                </IconButton>
                                <Typography variant="body1">pieces</Typography>
                            </Box>
                            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                                You can cut into 2-10 pieces. Each piece will get a unique QR code.
                            </Typography>
                        </Box>
                    )}

                    {cutStep === 1 && (
                        <Box>
                            <Typography variant="h6" gutterBottom>
                                Set quantity for each piece (Total: {parseFloat(fabricToCut?.quantity || 0).toFixed(2)}m)
                            </Typography>
                            <Grid container spacing={2} sx={{ mt: 1 }}>
                                {cutQuantities.map((quantity, index) => (
                                    <Grid item xs={12} sm={6} md={4} key={index}>
                                        <TextField
                                            fullWidth
                                            label={`Piece ${index + 1} (m)`}
                                            type="number"
                                            value={quantity}
                                            onChange={(e) => updateCutQuantity(index, e.target.value)}
                                            inputProps={{ min: 0.1, step: 0.1 }}
                                        />
                                    </Grid>
                                ))}
                            </Grid>
                            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                                <Typography variant="body2">
                                    <strong>Total Cut Quantity:</strong> {getTotalCutQuantity().toFixed(2)}m
                                </Typography>
                                <Typography variant="body2">
                                    <strong>Original Quantity:</strong> {parseFloat(fabricToCut?.quantity || 0).toFixed(2)}m
                                </Typography>
                                <Typography 
                                    variant="body2" 
                                    color={canProceedToCutting() ? 'success.main' : 'error.main'}
                                >
                                    <strong>Difference:</strong> {(getTotalCutQuantity() - fabricToCut?.quantity).toFixed(2)}m
                                </Typography>
                            </Box>
                            {!canProceedToCutting() && (
                                <Alert severity="warning" sx={{ mt: 2 }}>
                                    Total cut quantities must equal the original fabric quantity ({parseFloat(fabricToCut?.quantity || 0).toFixed(2)}m) exactly.
                                </Alert>
                            )}
                        </Box>
                    )}

                    {cutStep === 2 && (
                        <Box>
                            <Typography variant="h6" gutterBottom color="success.main">
                                ✅ Fabric successfully cut into {generatedCuts.length} pieces!
                            </Typography>
                            <Typography variant="body2" color="textSecondary" gutterBottom>
                                The original fabric has been removed and replaced with these new pieces:
                            </Typography>
                            
                            {/* Print All Button */}
                            <Box sx={{ mb: 3, textAlign: 'center' }}>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    size="large"
                                    startIcon={<PrintIcon />}
                                    onClick={printAllCutQRs}
                                    sx={{ minWidth: 200 }}
                                >
                                    Print All {generatedCuts.length} QR Stickers
                                </Button>
                                <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                                    Each sticker will be printed on a separate page
                                </Typography>
                            </Box>
                            
                            <TableContainer sx={{ mt: 2 }}>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell><strong>New Fabric ID</strong></TableCell>
                                            <TableCell><strong>Fabric Number</strong></TableCell>
                                            <TableCell><strong>Quantity</strong></TableCell>
                                            <TableCell><strong>QR Code</strong></TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {generatedCuts.map((cut, index) => (
                                            <TableRow key={index}>
                                                <TableCell>
                                                    <Chip label={cut.id} size="small" color="primary" />
                                                </TableCell>
                                                <TableCell>{cut.fabricNumber}</TableCell>
                                                <TableCell>{parseFloat(cut.quantity || 0).toFixed(2)}m</TableCell>
                                                <TableCell>
                                                    <Chip 
                                                        label={`${cut.warp?.warpOrderNumber}/${String(cut.cutNumber).padStart(2, '0')}`}
                                                        size="small" 
                                                        variant="outlined"
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeCutDialog}>
                        {cutStep === 2 ? 'Close' : 'Cancel'}
                    </Button>
                    {cutStep === 0 && (
                        <Button 
                            variant="contained" 
                            onClick={() => setCutStep(1)}
                        >
                            Next: Set Quantities
                        </Button>
                    )}
                    {cutStep === 1 && (
                        <>
                            <Button onClick={() => setCutStep(0)}>
                                Back
                            </Button>
                            <Button 
                                variant="contained" 
                                onClick={executeFabricCutting}
                                disabled={!canProceedToCutting() || cuttingInProgress}
                            >
                                {cuttingInProgress ? <CircularProgress size={20} /> : 'Cut Fabric'}
                            </Button>
                        </>
                    )}
                </DialogActions>
            </Dialog>

            {/* Batch Confirmation Dialog */}
            <Dialog open={showConfirmDialog} onClose={() => setShowConfirmDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Confirm Batch Submission</DialogTitle>
                <DialogContent>
                    <Typography variant="body1" gutterBottom>
                        Are you sure you want to submit {scannedFabricCuts.length === 1 ? 'this fabric cut' : `all ${scannedFabricCuts.length} fabric cuts`} for inspection arrival?
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                        This action will mark {scannedFabricCuts.length === 1 ? 'the fabric cut' : 'all listed fabric cuts'} as arrived at the inspection area.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowConfirmDialog(false)} disabled={submitting}>Cancel</Button>
                    <Button 
                        variant="contained" 
                        onClick={confirmBatchSubmission}
                        disabled={submitting}
                    >
                        {submitting ? <CircularProgress size={20} /> : 'Confirm Submission'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default LoomIn;