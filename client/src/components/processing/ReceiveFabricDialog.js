import {
  Assignment as AssignmentIcon,
  QrCode as QrCodeIcon,
  Business as BusinessIcon,
  Build as BuildIcon,
  QrCodeScanner as QrCodeScannerIcon,
  Delete as DeleteIcon,
  LocalShipping as LocalShippingIcon,
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  Print as PrintIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { buildApiUrl } from '../config/api';

const steps = [
// ... existing code ...
function ReceiveFabricDialog({ open, onClose, order, onReceiveComplete }) {
  const [deliveryNumber, setDeliveryNumber] = useState('');
  const [numberOfCuts, setNumberOfCuts] = useState('');
  const [receivedCuts, setReceivedCuts] = useState([]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [qrStickers, setQrStickers] = useState([]);

  useEffect(() => {
    // When the dialog opens, reset state
    if (order) {
      setDeliveryNumber('');
      setNumberOfCuts('');
      setReceivedCuts([]);
      setError('');
      setIsSubmitting(false);
      setQrStickers([]);
    }
  }, [order]);

  useEffect(() => {
    // Generate rows based on the number of cuts entered
    const num = parseInt(numberOfCuts, 10);
    if (!isNaN(num) && num > 0 && num <= order?.totalFabricCuts) {
      // Preserve existing quantities if possible
      const newCuts = Array.from({ length: num }, (_, i) => {
        return receivedCuts[i] || { id: i, quantity: '' };
      });
      setReceivedCuts(newCuts);
    } else {
      setReceivedCuts([]);
    }
  }, [numberOfCuts, order?.totalFabricCuts]);


  const handleQuantityChange = (id, value) => {
// ... existing code ...
        order.fabricCuts && order.fabricCuts.some(cut => cut.fabricNumber.toLowerCase() === trimmedInput.toLowerCase())
      );
      
      if (isAlreadyUsed) {
        setScanError(`Fabric cut ${trimmedInput} is already in another processing order.`);
        return;
      }
      const handleSubmit = async () => {
    // ... to be implemented
      };

  if (!order) return null;

  const totalReceivedQty = receivedCuts.reduce((sum, cut) => sum + (parseFloat(cut.quantity) || 0), 0);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
// ... existing code ...
            <TextField
              fullWidth
              label="Delivery Number from Processing Center"
              variant="outlined"
              value={deliveryNumber}
              onChange={(e) => setDeliveryNumber(e.target.value)}
              sx={{ mb: 3, bgcolor: 'white' }}
            />
            <TextField
              fullWidth
              type="number"
              label={`Number of Fabric Cuts Received (Max: ${order.totalFabricCuts})`}
              variant="outlined"
              value={numberOfCuts}
              onChange={(e) => setNumberOfCuts(e.target.value)}
              sx={{ mb: 2, bgcolor: 'white' }}
              inputProps={{ min: 1, max: order.totalFabricCuts }}
            />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                Enter Received Quantities
              </Typography>
            </Box>
            
            <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
// ... existing code ...
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Received Quantity (m) *</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {receivedCuts.map((cut, index) => (
                    <TableRow key={cut.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <TextField
                          fullWidth
                          variant="standard"
                          placeholder="e.g., 74.5"
                          value={cut.quantity}
                          onChange={(e) => handleQuantityChange(cut.id, e.target.value)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
// ... existing code ...
                <Box sx={{ display: 'flex', justifyContent: 'space-between', my: 1.5, color: 'green' }}>
                  <Typography sx={{ fontWeight: 'bold' }}>Fabrics Received:</Typography>
                  <Typography sx={{ fontWeight: 'bold' }}>{receivedCuts.length} cuts</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', my: 1.5, color: 'green' }}>
                  <Typography sx={{ fontWeight: 'bold' }}>Total Received Qty:</Typography>
                  <Typography sx={{ fontWeight: 'bold' }}>{totalReceivedQty.toFixed(2)} m</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
// ... existing code ...

</code_block_to_apply_changes_from> 