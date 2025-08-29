// In frontend/src/pages/Branches.jsx

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
  CircularProgress,
  Alert,
  IconButton,
  Tooltip
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';

import { api } from '../services/api';
import BranchFormModal from '../components/BranchFormModal';

const BranchesPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(null);

  const queryClient = useQueryClient();

  const { data: branches, isLoading, error } = useQuery(
    'branches',
    () => api.getBranches(),
    { select: (response) => response.data.data }
  );

  // --- Mutations with Toast Notifications ---

  const { mutate: createBranch, isLoading: isCreating } = useMutation(api.createBranch, {
    onSuccess: () => {
      toast.success('Branch created successfully!');
      queryClient.invalidateQueries('branches');
      setIsModalOpen(false);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to create branch.');
    }
  });

  const { mutate: updateBranch, isLoading: isUpdating } = useMutation(({ id, data }) => api.updateBranch(id, data), {
    onSuccess: () => {
      toast.success('Branch updated successfully!');
      queryClient.invalidateQueries('branches');
      setIsModalOpen(false);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update branch.');
    }
  });

  const { mutate: deleteBranch } = useMutation(api.deleteBranch, {
    onSuccess: () => {
      toast.success('Branch deleted successfully!');
      queryClient.invalidateQueries('branches');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to delete branch.');
    }
  });

  // --- Event Handlers ---

  const handleAddNew = () => {
    setSelectedBranch(null);
    setIsModalOpen(true);
  };

  const handleEdit = (branch) => {
    setSelectedBranch(branch);
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this branch?')) {
      deleteBranch(id);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedBranch(null);
  };

  const handleFormSubmit = (formData) => {
    if (selectedBranch) {
      updateBranch({ id: selectedBranch.id, data: formData });
    } else {
      createBranch(formData);
    }
  };

  if (isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  }

  if (error) {
    return <Alert severity="error">Failed to load branches. Please try again later.</Alert>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Manage Branches</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={handleAddNew}>
          Add New Branch
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Code</TableCell>
              <TableCell>City</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {branches?.map((branch) => (
              <TableRow key={branch.id} hover>
                <TableCell>{branch.name}</TableCell>
                <TableCell>{branch.code}</TableCell>
                <TableCell>{branch.city}</TableCell>
                <TableCell>{branch.phone}</TableCell>
                <TableCell>
                  <Typography sx={{ color: branch.is_active ? 'success.main' : 'error.main', fontWeight: 'bold' }}>
                    {branch.is_active ? 'Active' : 'Inactive'}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Edit">
                    <IconButton onClick={() => handleEdit(branch)}><Edit /></IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton onClick={() => handleDelete(branch.id)} color="error"><Delete /></IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <BranchFormModal
        open={isModalOpen}
        onClose={handleModalClose}
        onSubmit={handleFormSubmit}
        branch={selectedBranch}
        isLoading={isCreating || isUpdating}
      />
    </Box>
  );
};

export default BranchesPage;
