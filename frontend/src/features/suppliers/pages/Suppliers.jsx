import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
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
  IconButton,
  Tooltip,
  TextField,
  InputAdornment
} from '@mui/material';
import { Add, Edit, Delete, Search } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useDebounce } from 'use-debounce';
import toast from 'react-hot-toast';

import { api } from '@shared/api';
import SupplierFormModal from '@/features/suppliers/components/SupplierFormModal';

const SuppliersPage = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 500);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery(
    ['suppliers', page, rowsPerPage, debouncedSearchTerm],
    () => api.getSuppliers({ page: page + 1, limit: rowsPerPage, search: debouncedSearchTerm }),
    { keepPreviousData: true }
  );

  const suppliers = data?.data?.data || [];
  const totalSuppliers = data?.data?.pagination?.total || 0;

  const { mutate: createSupplier, isLoading: isCreating } = useMutation(api.createSupplier, {
    onSuccess: () => { toast.success('Supplier created'); queryClient.invalidateQueries('suppliers'); setIsModalOpen(false); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create supplier'),
  });
  const { mutate: updateSupplier, isLoading: isUpdating } = useMutation(({ id, data }) => api.updateSupplier(id, data), {
    onSuccess: () => { toast.success('Supplier updated'); queryClient.invalidateQueries('suppliers'); setIsModalOpen(false); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update supplier'),
  });
  const { mutate: deleteSupplier } = useMutation(api.deleteSupplier, {
    onSuccess: () => { toast.success('Supplier deleted'); queryClient.invalidateQueries('suppliers'); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete supplier'),
  });

  const handleSearchChange = (e) => setSearchTerm(e.target.value);
  const handleChangePage = (e, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); };

  const handleAddNew = () => { setSelectedSupplier(null); setIsModalOpen(true); };
  const handleEdit = (supplier) => { setSelectedSupplier(supplier); setIsModalOpen(true); };
  const handleDelete = (id) => { if (window.confirm('Delete this supplier?')) deleteSupplier(id); };
  const handleClose = () => { setIsModalOpen(false); setSelectedSupplier(null); };
  const handleSubmit = (form) => { selectedSupplier ? updateSupplier({ id: selectedSupplier.id, data: form }) : createSupplier(form); };

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error">Failed to load suppliers.</Alert>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">Suppliers</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField size="small" placeholder="Search" value={searchTerm} onChange={handleSearchChange} InputProps={{ startAdornment: (<InputAdornment position="start"><Search /></InputAdornment>) }} />
          <Button variant="contained" startIcon={<Add />} onClick={handleAddNew}>Add Supplier</Button>
        </Box>
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Contact</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {suppliers.map((s) => (
              <TableRow key={s.id} hover>
                <TableCell>{s.name}</TableCell>
                <TableCell>{s.contact_person || '—'}</TableCell>
                <TableCell>{s.phone || '—'}</TableCell>
                <TableCell align="right">
                  <Tooltip title="Edit"><IconButton onClick={() => handleEdit(s)}><Edit /></IconButton></Tooltip>
                  <Tooltip title="Delete"><IconButton color="error" onClick={() => handleDelete(s.id)}><Delete /></IconButton></Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination component="div" count={totalSuppliers} page={page} onPageChange={handleChangePage} rowsPerPage={rowsPerPage} onRowsPerPageChange={handleChangeRowsPerPage} />
      <SupplierFormModal open={isModalOpen} onClose={handleClose} onSubmit={handleSubmit} supplier={selectedSupplier} isLoading={isCreating || isUpdating} />
    </Box>
  );
};

export default SuppliersPage;

