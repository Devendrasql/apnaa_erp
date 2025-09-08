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
  InputAdornment,
  Chip
} from '@mui/material';
import { Add, Edit, Delete, Search } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useDebounce } from 'use-debounce';
import toast from 'react-hot-toast';

import { api } from '@shared/api';
import UserFormModal from '@/features/users/components/UserFormModal';

const roleColors = {
  'Super Admin': 'error',
  'Admin': 'error',
  'Branch Manager': 'primary',
  'Pharmacist / Sales Staff': 'info',
};

const UsersPage = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 500);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery(
    ['users', page, rowsPerPage, debouncedSearchTerm],
    () => api.getUsers({ page: page + 1, limit: rowsPerPage, search: debouncedSearchTerm }),
    { keepPreviousData: true }
  );

  const users = data?.data?.data || [];
  const total = data?.data?.pagination?.total || 0;

  const { mutate: createUser, isLoading: isCreating } = useMutation(api.createUser, {
    onSuccess: () => { toast.success('User created'); queryClient.invalidateQueries('users'); setIsModalOpen(false); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create user'),
  });
  const { mutate: updateUser, isLoading: isUpdating } = useMutation(({ id, data }) => api.updateUser(id, data), {
    onSuccess: () => { toast.success('User updated'); queryClient.invalidateQueries('users'); setIsModalOpen(false); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update user'),
  });
  const { mutate: deleteUser } = useMutation(api.deleteUser, {
    onSuccess: () => { toast.success('User deleted'); queryClient.invalidateQueries('users'); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete user'),
  });

  const handleChangePage = (e, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); };
  const handleSearchChange = (e) => setSearchTerm(e.target.value);

  const handleAddNew = () => { setSelectedUser(null); setIsModalOpen(true); };
  const handleEdit = (user) => { setSelectedUser(user); setIsModalOpen(true); };
  const handleDelete = (id) => { if (window.confirm('Delete this user?')) deleteUser(id); };
  const handleClose = () => { setIsModalOpen(false); setSelectedUser(null); };
  const handleSubmit = (form) => { selectedUser ? updateUser({ id: selectedUser.id, data: form }) : createUser(form); };

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error">Failed to load users.</Alert>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">Users</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField size="small" placeholder="Search" value={searchTerm} onChange={handleSearchChange} InputProps={{ startAdornment: (<InputAdornment position="start"><Search /></InputAdornment>) }} />
          <Button variant="contained" startIcon={<Add />} onClick={handleAddNew}>Add User</Button>
        </Box>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id} hover>
                <TableCell>{u.name}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>
                  <Chip size="small" color={roleColors[u.role_name] || 'default'} label={u.role_name || '—'} />
                </TableCell>
                <TableCell>{u.active ? 'Active' : 'Inactive'}</TableCell>
                <TableCell align="right">
                  <Tooltip title="Edit"><IconButton onClick={() => handleEdit(u)}><Edit /></IconButton></Tooltip>
                  <Tooltip title="Delete"><IconButton color="error" onClick={() => handleDelete(u.id)}><Delete /></IconButton></Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination component="div" count={total} page={page} onPageChange={handleChangePage} rowsPerPage={rowsPerPage} onRowsPerPageChange={handleChangeRowsPerPage} />

      <UserFormModal open={isModalOpen} onClose={handleClose} onSubmit={handleSubmit} user={selectedUser} isLoading={isCreating || isUpdating} />
    </Box>
  );
};

export default UsersPage;

