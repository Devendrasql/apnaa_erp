// In frontend/src/pages/SaleDetails.jsx

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
  Button
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useQuery } from 'react-query';
import { api } from '../services/api';

const SaleDetailsPage = () => {
  const { id } = useParams(); // Get the sale ID from the URL

  const { data: sale, isLoading, error } = useQuery(
    ['saleDetails', id],
    () => api.getSaleDetails(id),
    {
      enabled: !!id, // Only run the query if the ID exists
      select: (response) => response.data.data,
    }
  );

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">Failed to load sale details. The sale may not exist or an error occurred.</Alert>;
  }

  return (
    <Box>
      <Button
        component={RouterLink}
        to="/sales"
        startIcon={<ArrowBack />}
        sx={{ mb: 2 }}
      >
        Back to Sales History
      </Button>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Sale Details
        </Typography>
        <Typography variant="h6" color="primary.main" gutterBottom>
          {sale.invoice_number}
        </Typography>
        <Divider sx={{ my: 2 }} />

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary">Date:</Typography>
            <Typography>{new Date(sale.sale_date).toLocaleString()}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary">Branch:</Typography>
            <Typography>{sale.branch_name}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary">Customer:</Typography>
            <Typography>{sale.customer_name || 'Walk-in Customer'}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary">Cashier:</Typography>
            <Typography>{sale.cashier_name}</Typography>
          </Grid>
        </Grid>

        <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
          Items Sold
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Product Name</TableCell>
                <TableCell>Batch #</TableCell>
                <TableCell align="right">Quantity</TableCell>
                <TableCell align="right">Unit Price</TableCell>
                <TableCell align="right">Line Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sale.items?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.product_name} ({item.sku})</TableCell>
                  <TableCell>{item.batch_number}</TableCell>
                  <TableCell align="right">{item.quantity}</TableCell>
                  <TableCell align="right">₹{Number(item.unit_price).toFixed(2)}</TableCell>
                  <TableCell align="right">₹{Number(item.line_total).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
          <Box sx={{ width: '300px' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography>Total Amount:</Typography>
              <Typography>₹{Number(sale.total_amount).toFixed(2)}</Typography>
            </Box>
            <Divider />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <Typography variant="h6">Final Amount:</Typography>
              <Typography variant="h6">₹{Number(sale.final_amount).toFixed(2)}</Typography>
            </Box>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default SaleDetailsPage;
