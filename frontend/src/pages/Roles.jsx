// In frontend/src/pages/Roles.jsx

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
  CircularProgress,
  Alert,
  Button
} from '@mui/material';
import { useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import { useRoles, useUpdateRole } from '@/features/roles/hooks';
import PermissionsFormModal from '../components/PermissionsFormModal'; // 1. Import the modal

const RolesPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const queryClient = useQueryClient();

  // Fetching roles data
  const { data: roles, isLoading, error } = useRoles();

  // Mutation for updating a role's permissions
  const updateRoleMutation = useUpdateRole(selectedRole?.id);

  const handleManagePermissions = (role) => {
    setSelectedRole(role);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedRole(null);
  };

  const handleFormSubmit = (formData) => {
    updateRoleMutation.mutate(formData, {
      onSuccess: () => {
        toast.success('Role permissions updated successfully!');
        setIsModalOpen(false);
      },
      onError: (err) => {
        toast.error(err?.response?.data?.message || 'Failed to update role.');
      },
    });
  };

  if (isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  }

  if (error) {
    return <Alert severity="error">Failed to load roles. Please try again later.</Alert>;
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>Manage Roles & Permissions</Typography>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Role Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {roles?.map((role) => (
              <TableRow key={role.id} hover>
                <TableCell sx={{ fontWeight: 'bold' }}>{role.name}</TableCell>
                <TableCell>{role.description}</TableCell>
                <TableCell align="right">
                  <Button 
                    variant="outlined" 
                    size="small"
                    onClick={() => handleManagePermissions(role)}
                    disabled={!!role.is_system_role}
                  >
                    Manage Permissions
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Render the modal */}
      <PermissionsFormModal
        open={isModalOpen}
        onClose={handleModalClose}
        onSubmit={handleFormSubmit}
        role={selectedRole}
        isLoading={updateRoleMutation.isLoading}
      />
    </Box>
  );
};

export default RolesPage;
