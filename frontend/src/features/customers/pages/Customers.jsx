/**
 * Customers list with CRUD + Face enrollment on Create & Update
 * - Search + pagination
 * - On create, enroll face if captured
 * - On edit, optionally re-enroll if re-captured
 */

import React, { useState } from 'react';
import {
  Box, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TablePagination, CircularProgress, Alert, IconButton, Tooltip,
  TextField, InputAdornment
} from '@mui/material';
import { Add, Edit, Delete, Search } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useDebounce } from 'use-debounce';
import toast from 'react-hot-toast';

import {
  getCustomers,
  createCustomer as apiCreateCustomer,
  updateCustomer as apiUpdateCustomer,
  deleteCustomer as apiDeleteCustomer,
  enrollCustomerFace
} from '@shared/api';
import CustomerFormModal from '@/features/customers/components/CustomerFormModal';

export default function CustomersPage() {
  // table state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 500);

  // modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const queryClient = useQueryClient();

  // fetch customers
  const { data, isLoading, error } = useQuery(
    ['customers', page, rowsPerPage, debouncedSearchTerm],
    () => getCustomers({ page: page + 1, limit: rowsPerPage, search: debouncedSearchTerm }),
    { keepPreviousData: true }
  );

  const customers = data?.data?.data || [];
  const totalCustomers = data?.data?.pagination?.total || 0;

  // create + enroll
  const { mutate: createCustomer, isLoading: isCreating } = useMutation(
    async ({ formData, faceBase64 }) => {
      const res = await apiCreateCustomer(formData);
      const newId = res?.data?.data?.id;
      if (newId && faceBase64) {
        await enrollCustomerFace(newId, { imageBase64: faceBase64 });
      }
      return res;
    },
    {
      onSuccess: () => {
        toast.success('Customer created successfully!');
        queryClient.invalidateQueries('customers');
        setIsModalOpen(false);
      },
      onError: (err) => {
        toast.error(err?.response?.data?.message || 'Failed to create customer.');
      },
    }
  );

  // update + optional re-enroll
  const { mutate: updateCustomer, isLoading: isUpdating } = useMutation(
    async ({ id, data, faceBase64 }) => {
      const res = await apiUpdateCustomer(id, data);
      if (faceBase64) {
        await enrollCustomerFace(id, { imageBase64: faceBase64 });
      }
      return res;
    },
    {
      onSuccess: () => {
        toast.success('Customer updated successfully!');
        queryClient.invalidateQueries('customers');
        setIsModalOpen(false);
      },
      onError: (err) => {
        toast.error(err?.response?.data?.message || 'Failed to update customer.');
      },
    }
  );

  // delete
  const { mutate: deleteCustomer } = useMutation(apiDeleteCustomer, {
    onSuccess: () => {
      toast.success('Customer deleted successfully!');
      queryClient.invalidateQueries('customers');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to delete customer.');
    },
  });

  // handlers
  const handleChangePage = (_e, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); };
  const handleSearchChange = (e) => { setSearchTerm(e.target.value); setPage(0); };

  const handleAddNew = () => { setSelectedCustomer(null); setIsModalOpen(true); };
  const handleEdit = (c) => { setSelectedCustomer(c); setIsModalOpen(true); };
  const handleDelete = (id) => { if (window.confirm('Delete this customer?')) deleteCustomer(id); };
  const handleModalClose = () => { setIsModalOpen(false); setSelectedCustomer(null); };

  const handleFormSubmit = ({ formData, faceBase64 }) => {
    if (selectedCustomer) {
      updateCustomer({ id: selectedCustomer.id, data: formData, faceBase64 });
    } else {
      createCustomer({ formData, faceBase64 });
    }
  };

  return (
    <Box p={2}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">Customers</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={handleAddNew}>Add Customer</Button>
      </Box>

      <Box mb={2}>
        <TextField
          value={searchTerm}
          onChange={handleSearchChange}
          placeholder="Search by name or phone"
          InputProps={{ startAdornment: (<InputAdornment position="start"><Search/></InputAdornment>) }}
          fullWidth
        />
      </Box>

      {isLoading ? (
        <Box textAlign="center" mt={4}><CircularProgress /></Box>
      ) : error ? (
        <Alert severity="error">Failed to load customers.</Alert>
      ) : (
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>First Name</TableCell>
                  <TableCell>Last Name</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {customers.map((c) => (
                  <TableRow key={c.id} hover>
                    <TableCell>{c.first_name}</TableCell>
                    <TableCell>{c.last_name}</TableCell>
                    <TableCell>{c.phone}</TableCell>
                    <TableCell>{c.email || '—'}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit"><IconButton onClick={() => handleEdit(c)}><Edit /></IconButton></Tooltip>
                      <Tooltip title="Delete"><IconButton color="error" onClick={() => handleDelete(c.id)}><Delete /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[10, 25, 50]}
            component="div"
            count={totalCustomers}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Paper>
      )}

      <CustomerFormModal
        open={isModalOpen}
        onClose={handleModalClose}
        onSubmit={handleFormSubmit}
        customer={selectedCustomer}
        isLoading={isCreating || isUpdating}
      />
    </Box>
  );
}
