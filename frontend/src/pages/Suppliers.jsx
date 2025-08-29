// In frontend/src/pages/Suppliers.jsx

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

import { api } from '../services/api';
import SupplierFormModal from '../components/SupplierFormModal'; // Import the modal

const SuppliersPage = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 500);

  // State for the modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  const queryClient = useQueryClient();

  // Fetching suppliers data
  const { data, isLoading, error } = useQuery(
    ['suppliers', page, rowsPerPage, debouncedSearchTerm],
    () => api.getSuppliers({ 
      page: page + 1, 
      limit: rowsPerPage, 
      search: debouncedSearchTerm 
    }),
    {
      keepPreviousData: true,
    }
  );

  const suppliers = data?.data?.data || [];
  const totalSuppliers = data?.data?.pagination?.total || 0;

  // --- Mutations for CRUD operations ---

  const { mutate: createSupplier, isLoading: isCreating } = useMutation(api.createSupplier, {
    onSuccess: () => {
      toast.success('Supplier created successfully!');
      queryClient.invalidateQueries('suppliers');
      setIsModalOpen(false);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to create supplier.');
    }
  });

  const { mutate: updateSupplier, isLoading: isUpdating } = useMutation(({ id, data }) => api.updateSupplier(id, data), {
    onSuccess: () => {
      toast.success('Supplier updated successfully!');
      queryClient.invalidateQueries('suppliers');
      setIsModalOpen(false);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update supplier.');
    }
  });

  const { mutate: deleteSupplier } = useMutation(api.deleteSupplier, {
    onSuccess: () => {
      toast.success('Supplier deleted successfully!');
      queryClient.invalidateQueries('suppliers');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to delete supplier.');
    }
  });

  // --- Event Handlers ---

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };

  const handleAddNew = () => {
    setSelectedSupplier(null);
    setIsModalOpen(true);
  };

  const handleEdit = (supplier) => {
    setSelectedSupplier(supplier);
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this supplier?')) {
      deleteSupplier(id);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedSupplier(null);
  };

  const handleFormSubmit = (formData) => {
    if (selectedSupplier) {
      updateSupplier({ id: selectedSupplier.id, data: formData });
    } else {
      createSupplier(formData);
    }
  };

  if (error) {
    return <Alert severity="error">Failed to load suppliers. Please try again later.</Alert>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Manage Suppliers</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleAddNew}
        >
          Add New Supplier
        </Button>
      </Box>

      <Paper sx={{ mb: 2, p: 2 }}>
        <TextField
            fullWidth
            placeholder="Search by name, code, or phone..."
            value={searchTerm}
            onChange={handleSearchChange}
            InputProps={{
                startAdornment: (
                    <InputAdornment position="start">
                        <Search />
                    </InputAdornment>
                ),
            }}
        />
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
                  <TableCell>Name</TableCell>
                  <TableCell>Code</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Contact Person</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {suppliers.map((supplier) => (
                  <TableRow key={supplier.id} hover>
                    <TableCell sx={{ fontWeight: 'bold' }}>{supplier.name}</TableCell>
                    <TableCell>{supplier.code}</TableCell>
                    <TableCell>{supplier.phone || 'N/A'}</TableCell>
                    <TableCell>{supplier.contact_person || 'N/A'}</TableCell>
                    <TableCell>
                      <Typography sx={{ color: supplier.is_active ? 'success.main' : 'error.main', fontWeight: 'bold' }}>
                        {supplier.is_active ? 'Active' : 'Inactive'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton onClick={() => handleEdit(supplier)}><Edit /></IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton onClick={() => handleDelete(supplier.id)} color="error"><Delete /></IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          <TablePagination
            rowsPerPageOptions={[10, 25, 50]}
            component="div"
            count={totalSuppliers}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </>
      )}

      <SupplierFormModal
        open={isModalOpen}
        onClose={handleModalClose}
        onSubmit={handleFormSubmit}
        supplier={selectedSupplier}
        isLoading={isCreating || isUpdating}
      />
    </Box>
  );
};

export default SuppliersPage;
