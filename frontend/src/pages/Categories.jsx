// In frontend/src/pages/Categories.jsx

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
import CategoryFormModal from '../components/CategoryFormModal'; // 1. Import the modal

const CategoriesPage = () => {
  // 2. Add state for the modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const queryClient = useQueryClient();

  // Fetching categories data
  const { data: categories, isLoading, error } = useQuery(
    'categories',
    () => api.getCategories(),
    {
      select: (response) => response.data.data
    }
  );

  // 3. Add mutations for CRUD operations
  const { mutate: createCategory, isLoading: isCreating } = useMutation(api.createCategory, {
    onSuccess: () => {
      toast.success('Category created successfully!');
      queryClient.invalidateQueries('categories');
      setIsModalOpen(false);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to create category.');
    }
  });

  const { mutate: updateCategory, isLoading: isUpdating } = useMutation(({ id, data }) => api.updateCategory(id, data), {
    onSuccess: () => {
      toast.success('Category updated successfully!');
      queryClient.invalidateQueries('categories');
      setIsModalOpen(false);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update category.');
    }
  });

  const { mutate: deleteCategory } = useMutation(api.deleteCategory, {
    onSuccess: () => {
      toast.success('Category deleted successfully!');
      queryClient.invalidateQueries('categories');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to delete category.');
    }
  });

  // --- Event Handlers ---

  const handleAddNew = () => {
    setSelectedCategory(null);
    setIsModalOpen(true);
  };

  const handleEdit = (category) => {
    setSelectedCategory(category);
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this category? This may affect associated products.')) {
      deleteCategory(id);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedCategory(null);
  };

  const handleFormSubmit = (formData) => {
    if (selectedCategory) {
      updateCategory({ id: selectedCategory.id, data: formData });
    } else {
      createCategory(formData);
    }
  };

  if (isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  }

  if (error) {
    return <Alert severity="error">Failed to load categories. Please try again later.</Alert>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Manage Product Categories</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleAddNew}
        >
          Add New Category
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Parent Category</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {categories?.map((category) => (
              <TableRow key={category.id} hover>
                <TableCell sx={{ fontWeight: 'bold' }}>{category.name}</TableCell>
                <TableCell>{category.description || 'N/A'}</TableCell>
                <TableCell>{category.parent_name || 'N/A'}</TableCell>
                <TableCell>
                  <Typography sx={{ color: category.is_active ? 'success.main' : 'error.main', fontWeight: 'bold' }}>
                    {category.is_active ? 'Active' : 'Inactive'}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Edit">
                    <IconButton onClick={() => handleEdit(category)}><Edit /></IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton onClick={() => handleDelete(category.id)} color="error"><Delete /></IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 4. Render the modal */}
      <CategoryFormModal
        open={isModalOpen}
        onClose={handleModalClose}
        onSubmit={handleFormSubmit}
        category={selectedCategory}
        isLoading={isCreating || isUpdating}
      />
    </Box>
  );
};

export default CategoriesPage;
