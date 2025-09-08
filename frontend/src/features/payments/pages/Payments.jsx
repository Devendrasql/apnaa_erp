import React, { useState } from 'react';
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
  InputAdornment,
  Button
} from '@mui/material';
import { Search, Payment } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useDebounce } from 'use-debounce';
import toast from 'react-hot-toast';

import { api } from '@shared/api'; 
import { useAuth } from '@/contexts/AuthContext';
import PaymentFormModal from '@/features/payments/components/PaymentFormModal';

const PaymentsPage = () => {
  const { currentBranch } = useAuth();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 500);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);

  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery(
    ['outstandingSales', page, rowsPerPage, debouncedSearchTerm, currentBranch?.id],
    () => api.getOutstandingSales({ 
      page: page + 1, 
      limit: rowsPerPage, 
      search: debouncedSearchTerm,
      branch_id: currentBranch?.id 
    }),
    { enabled: !!currentBranch, keepPreviousData: true }
  );

  const sales = data?.data?.data || [];
  const totalSales = data?.data?.pagination?.total || 0;

  const { mutate: recordPayment, isLoading: isRecording } = useMutation(api.recordPayment, {
    onSuccess: () => { toast.success('Payment recorded successfully!'); queryClient.invalidateQueries('outstandingSales'); setIsModalOpen(false); },
    onError: (err) => { toast.error(err.response?.data?.message || 'Failed to record payment.'); }
  });

  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => { setRowsPerPage(parseInt(event.target.value, 10)); setPage(0); };
  const handleSearchChange = (event) => setSearchTerm(event.target.value);

  const handleOpenPayment = (sale) => { setSelectedSale(sale); setIsModalOpen(true); };
  const handleClose = () => { setIsModalOpen(false); setSelectedSale(null); };
  const handleSubmit = (form) => { recordPayment({ sale_id: selectedSale.id, ...form }); };

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error">Failed to load outstanding sales.</Alert>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">Payments</Typography>
        <TextField size="small" placeholder="Search" value={searchTerm} onChange={handleSearchChange} InputProps={{ startAdornment: (<InputAdornment position="start"><Search /></InputAdornment>) }} />
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Invoice</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Amount Due</TableCell>
              <TableCell>Due Date</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sales.map((s) => (
              <TableRow key={s.id} hover>
                <TableCell>{s.invoice_no}</TableCell>
                <TableCell>{s.customer_name || '—'}</TableCell>
                <TableCell>{s.amount_due}</TableCell>
                <TableCell>{s.due_date}</TableCell>
                <TableCell align="right">
                  <Button size="small" variant="contained" startIcon={<Payment />} onClick={() => handleOpenPayment(s)}>Record</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination component="div" count={totalSales} page={page} onPageChange={handleChangePage} rowsPerPage={rowsPerPage} onRowsPerPageChange={handleChangeRowsPerPage} />

      <PaymentFormModal open={isModalOpen} onClose={handleClose} onSubmit={handleSubmit} sale={selectedSale} isLoading={isRecording} />
    </Box>
  );
};

export default PaymentsPage;

