// In frontend/src/pages/Sales.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  CircularProgress,
  Alert,
  TextField,
  Grid,
  Button,
  IconButton,
  Tooltip,
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import { useQuery } from 'react-query';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const SalesPage = () => {
  const { currentBranch } = useAuth();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filters, setFilters] = useState({
    from_date: '',
    to_date: '',
    search: '',
  });

  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery(
    ['sales', page, rowsPerPage, filters, currentBranch?.id],
    () => api.getSales({
      page: page + 1,
      limit: rowsPerPage,
      branch_id: currentBranch?.id,
      ...filters
    }),
    {
      enabled: !!currentBranch,
      keepPreviousData: true,
    }
  );

  const sales = data?.data?.data || [];
  const totalSales = data?.data?.pagination?.total || 0;

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setPage(0);
  };

  const handleChangePage = (_e, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); };

  const handleViewDetails = (saleId) => navigate(`/sales/${saleId}`);
  const handlePrint = (saleId) => window.open(`/invoice/${saleId}?print=1`, '_blank', 'noopener,noreferrer');

  if (error) {
    return <Alert severity="error">Failed to load sales history. Please try again later.</Alert>;
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>Sales History</Typography>

      <Paper sx={{ mb: 2, p: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              name="search"
              label="Search by Invoice #"
              value={filters.search}
              onChange={handleFilterChange}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              name="from_date"
              label="From Date"
              type="date"
              value={filters.from_date}
              onChange={handleFilterChange}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              name="to_date"
              label="To Date"
              type="date"
              value={filters.to_date}
              onChange={handleFilterChange}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </Grid>
      </Paper>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Invoice #</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Amount (₹)</TableCell>
                  <TableCell>Cashier</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sales.length > 0 ? sales.map((sale) => (
                  <TableRow key={sale.id} hover>
                    <TableCell sx={{ fontWeight: 'bold' }}>{sale.invoice_number}</TableCell>
                    <TableCell>{new Date(sale.sale_date).toLocaleString()}</TableCell>
                    <TableCell>{sale.customer_name || 'Walk-in'}</TableCell>
                    <TableCell>₹{Number(sale.final_amount || 0).toLocaleString()}</TableCell>
                    <TableCell>{sale.cashier_name}</TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      <Tooltip title="View details">
                        <Button variant="outlined" size="small" onClick={() => handleViewDetails(sale.id)} sx={{ mr: 1 }}>
                          View Details
                        </Button>
                      </Tooltip>
                      <Tooltip title="Print invoice">
                        <IconButton size="small" onClick={() => handlePrint(sale.id)}>
                          <PrintIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography sx={{ p: 4 }}>No sales found for the selected criteria.</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            rowsPerPageOptions={[10, 20, 50]}
            component="div"
            count={totalSales}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </>
      )}
    </Box>
  );
};

export default SalesPage;
