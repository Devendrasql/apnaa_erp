// In frontend/src/features/branches/pages/Branches.jsx

import React, { useState, useMemo } from 'react';
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
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  TextField
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';

import { api } from '@shared/api';
import BranchFormModal from '@/features/branches/components/BranchFormModal';

const BranchesPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery('branches', () => api.getBranches(), {
    select: (res) => res.data.data,
  });

  const branches = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter((b) => b.name?.toLowerCase().includes(q) || b.code?.toLowerCase().includes(q));
  }, [data, search]);

  const { mutate: createBranch, isLoading: isCreating } = useMutation(api.createBranch, {
    onSuccess: () => { toast.success('Branch created'); queryClient.invalidateQueries('branches'); setIsModalOpen(false); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create branch'),
  });

  const { mutate: updateBranch, isLoading: isUpdating } = useMutation(({ id, data }) => api.updateBranch(id, data), {
    onSuccess: () => { toast.success('Branch updated'); queryClient.invalidateQueries('branches'); setIsModalOpen(false); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update branch'),
  });

  const { mutate: deleteBranch } = useMutation(api.deleteBranch, {
    onSuccess: () => { toast.success('Branch deleted'); queryClient.invalidateQueries('branches'); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete branch'),
  });

  const handleAddNew = () => { setSelectedBranch(null); setIsModalOpen(true); };
  const handleEdit = (branch) => { setSelectedBranch(branch); setIsModalOpen(true); };
  const handleDelete = (id) => { if (window.confirm('Delete this branch?')) deleteBranch(id); };
  const handleClose = () => { setIsModalOpen(false); setSelectedBranch(null); };
  const handleSubmit = (form) => { selectedBranch ? updateBranch({ id: selectedBranch.id, data: form }) : createBranch(form); };

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error">Failed to load branches.</Alert>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">Branches</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField size="small" placeholder="Search by name or code" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Button variant="contained" startIcon={<Add />} onClick={handleAddNew}>Add Branch</Button>
        </Box>
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Code</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>City</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {branches.map((b) => (
              <TableRow key={b.id} hover>
                <TableCell>{b.code}</TableCell>
                <TableCell>{b.name}</TableCell>
                <TableCell>{b.city || '—'}</TableCell>
                <TableCell>{b.active ? 'Active' : 'Inactive'}</TableCell>
                <TableCell align="right">
                  <Tooltip title="Edit"><IconButton onClick={() => handleEdit(b)}><Edit /></IconButton></Tooltip>
                  <Tooltip title="Delete"><IconButton color="error" onClick={() => handleDelete(b.id)}><Delete /></IconButton></Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <BranchFormModal open={isModalOpen} onClose={handleClose} onSubmit={handleSubmit} branch={selectedBranch} isLoading={isCreating || isUpdating} />
    </Box>
  );
};

export default BranchesPage;

