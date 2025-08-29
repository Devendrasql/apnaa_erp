// In frontend/src/pages/StockTransferDetail.jsx

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
import { ArrowBack, CheckCircle, LocalShipping } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import { api } from '../services/api';

const statusColors = {
    pending: 'warning',
    in_transit: 'info',
    received: 'success',
    cancelled: 'error',
};

const StockTransferDetailPage = () => {
  const { id: transferId } = useParams();
  const queryClient = useQueryClient();

  const { data: transfer, isLoading, error } = useQuery(
    ['stockTransferDetails', transferId],
    () => api.getStockTransferById(transferId),
    {
      enabled: !!transferId,
      select: (response) => response.data.data,
    }
  );

  // Mutation for updating the transfer status
  const { mutate: updateStatus, isLoading: isUpdatingStatus } = useMutation(
    ({ status }) => api.updateTransferStatus(transferId, status),
    {
      onSuccess: () => {
        toast.success('Transfer status updated!');
        queryClient.invalidateQueries(['stockTransferDetails', transferId]);
        queryClient.invalidateQueries('stockTransfers');
      },
      onError: (err) => {
        toast.error(err.response?.data?.message || 'Failed to update status.');
      }
    }
  );

  const handleDispatch = () => {
    if (window.confirm('Are you sure you want to dispatch this transfer? This will deduct stock from the source branch.')) {
      updateStatus({ status: 'in_transit' });
    }
  };

  const handleReceive = () => {
    if (window.confirm('Are you sure you want to mark this transfer as received? This will add stock to the destination branch.')) {
      updateStatus({ status: 'received' });
    }
  };


  if (isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  }

  if (error) {
    return <Alert severity="error">Failed to load stock transfer details.</Alert>;
  }

  if (!transfer) {
    return <Typography>No Stock Transfer data found.</Typography>;
  }

  return (
    <Box>
      <Button
        component={RouterLink}
        to="/stock-transfers"
        startIcon={<ArrowBack />}
        sx={{ mb: 2 }}
      >
        Back to Stock Transfers
      </Button>

      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box>
                <Typography variant="h4" gutterBottom>Stock Transfer</Typography>
                <Typography variant="h6" color="primary.main">{transfer.transfer_number}</Typography>
            </Box>
            <Chip label={transfer.status.replace('_', ' ')} color={statusColors[transfer.status] || 'default'} sx={{textTransform: 'capitalize'}} />
        </Box>
        
        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            {transfer.status === 'pending' && (
                <Button 
                    variant="contained" 
                    color="info" 
                    startIcon={<LocalShipping />} 
                    onClick={handleDispatch}
                    disabled={isUpdatingStatus}
                >
                    {isUpdatingStatus ? 'Dispatching...' : 'Dispatch Transfer'}
                </Button>
            )}
            {transfer.status === 'in_transit' && (
                <Button 
                    variant="contained" 
                    color="success" 
                    startIcon={<CheckCircle />}
                    onClick={handleReceive}
                    disabled={isUpdatingStatus}
                >
                    {isUpdatingStatus ? 'Receiving...' : 'Mark as Received'}
                </Button>
            )}
        </Box>
        
        <Divider sx={{ my: 2 }} />

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}><Typography variant="subtitle2" color="text.secondary">From Branch:</Typography><Typography>{transfer.from_branch_name}</Typography></Grid>
          <Grid item xs={12} md={6}><Typography variant="subtitle2" color="text.secondary">To Branch:</Typography><Typography>{transfer.to_branch_name}</Typography></Grid>
          <Grid item xs={12} md={6}><Typography variant="subtitle2" color="text.secondary">Transfer Date:</Typography><Typography>{new Date(transfer.transfer_date).toLocaleString()}</Typography></Grid>
        </Grid>

        <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>Items in Transfer</Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Product Name</TableCell>
                <TableCell>SKU</TableCell>
                <TableCell>Batch #</TableCell>
                <TableCell align="right">Quantity</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transfer.items?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.product_name}</TableCell>
                  <TableCell>{item.sku}</TableCell>
                  <TableCell>{item.batch_number}</TableCell>
                  <TableCell align="right">{item.quantity_requested}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default StockTransferDetailPage;
