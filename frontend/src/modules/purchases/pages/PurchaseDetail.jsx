// In frontend/src/pages/PurchaseDetail.jsx

import React from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  Alert,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip
} from '@mui/material';
import { ArrowBack, CheckCircle } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query'; // 1. Import mutation and client hooks
import toast from 'react-hot-toast'; // 2. Import toast for notifications
import { api } from '@shared/api';

const PurchaseDetailPage = () => {
  const { id } = useParams();
  const queryClient = useQueryClient(); // 3. Initialize the query client

  const { data: purchase, isLoading, error } = useQuery(
    ['purchaseDetails', id],
    () => api.getPurchaseById(id),
    {
      enabled: !!id,
      select: (response) => response.data.data,
    }
  );

  // 4. Create the mutation for posting to stock
  const { mutate: postToStock, isLoading: isPosting } = useMutation(
    () => api.postPurchaseToStock(id),
    {
      onSuccess: () => {
        toast.success('Purchase successfully posted to stock!');
        // Refetch the details for this purchase and the main inventory list
        queryClient.invalidateQueries(['purchaseDetails', id]);
        queryClient.invalidateQueries('inventoryStock');
      },
      onError: (err) => {
        toast.error(err.response?.data?.message || 'Failed to post to stock.');
      }
    }
  );

  // 5. Update the handler to call the mutation
  const handlePostToStock = () => {
    if (window.confirm('Are you sure you want to post this purchase to stock? This action cannot be undone.')) {
      postToStock();
    }
  };

  if (isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  }

  if (error) {
    return <Alert severity="error">Failed to load purchase details.</Alert>;
  }

  if (!purchase) {
    return <Typography>No purchase data found.</Typography>;
  }

  return (
    <Box>
      <Button component={RouterLink} to="/purchases" startIcon={<ArrowBack />} sx={{ mb: 2 }}>
        Back to Purchase Entries
      </Button>

      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box>
                <Typography variant="h4" gutterBottom>Purchase Details</Typography>
                <Typography variant="h6" color="primary.main">{purchase.invoice_number}</Typography>
            </Box>
            <Chip label={purchase.is_posted ? 'Posted to Stock' : 'Pending'} color={purchase.is_posted ? 'success' : 'warning'} />
        </Box>
        
        {/* 6. Connect the button's state and onClick handler */}
        {!purchase.is_posted && (
            <Button 
                variant="contained" 
                startIcon={<CheckCircle />}
                onClick={handlePostToStock}
                disabled={isPosting}
            >
                {isPosting ? 'Posting...' : 'Post to Stock'}
            </Button>
        )}
        
        <Divider sx={{ my: 2 }} />

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}><Typography variant="subtitle2">Supplier:</Typography><Typography>{purchase.supplier_name}</Typography></Grid>
          <Grid item xs={12} md={6}><Typography variant="subtitle2">Branch:</Typography><Typography>{purchase.branch_name}</Typography></Grid>
          <Grid item xs={12} md={6}><Typography variant="subtitle2">Invoice Date:</Typography><Typography>{new Date(purchase.invoice_date).toLocaleDateString()}</Typography></Grid>
          <Grid item xs={12} md={6}><Typography variant="subtitle2">Created By:</Typography><Typography>{purchase.creator_name}</Typography></Grid>
        </Grid>

        <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>Items Purchased</Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Product</TableCell>
                <TableCell>Batch #</TableCell>
                <TableCell align="right">Qty</TableCell>
                <TableCell align="right">Free</TableCell>
                <TableCell align="right">Purchase Price</TableCell>
                <TableCell align="right">Disc %</TableCell>
                <TableCell align="right">GST %</TableCell>
                <TableCell align="right">Line Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {purchase.items?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.product_name}</TableCell>
                  <TableCell>{item.batch_number}</TableCell>
                  <TableCell align="right">{item.quantity}</TableCell>
                  <TableCell align="right">{item.free_qty}</TableCell>
                  <TableCell align="right">₹{Number(item.purchase_price).toFixed(2)}</TableCell>
                  <TableCell align="right">{Number(item.scheme_discount_percentage) + Number(item.cash_discount_percentage)}%</TableCell>
                  <TableCell align="right">{Number(item.gst_percentage)}%</TableCell>
                  <TableCell align="right">₹{Number(item.line_total).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
          <Box sx={{ width: '300px', textAlign: 'right' }}>
            <Typography>Total Amount: ₹{Number(purchase.total_amount).toFixed(2)}</Typography>
            <Typography>Total Discount: ₹{Number(purchase.total_discount).toFixed(2)}</Typography>
            <Typography>Total Tax: ₹{Number(purchase.total_tax).toFixed(2)}</Typography>
            <Divider sx={{my: 1}} />
            <Typography variant="h6">Net Amount: ₹{Number(purchase.net_amount).toFixed(2)}</Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default PurchaseDetailPage;



