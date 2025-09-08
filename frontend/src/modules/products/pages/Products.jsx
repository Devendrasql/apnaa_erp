// In frontend/src/pages/Products.jsx

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
import { useQueryClient } from 'react-query';
import { useDebounce } from 'use-debounce';
import toast from 'react-hot-toast';

import { api } from '@shared/api';
import { useProducts, useDeleteProduct } from '@modules/products/hooks';
import { getProductById } from '@modules/products/api';
import { normalizeProductDetail } from '@modules/products/utils';
import ProductFormModal from '@modules/products/components/ProductFormModal';

const ProductsPage = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 500);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const queryClient = useQueryClient();

  // Fetching the list of master products from your backend
  const { data, isLoading, error } = useProducts({ page: page + 1, limit: rowsPerPage, search: debouncedSearchTerm });

  const products = data?.data || [];
  const totalProducts = data?.pagination?.total || 0;

  // --- Mutation for Deleting a Product ---
  const deleteProductMutation = useDeleteProduct();

  // --- Event Handlers ---
  const handleChangePage = (_, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };

  const handleAddNew = () => {
    setSelectedProduct(null);
    setIsModalOpen(true);
  };

  const handleEdit = async (product) => {
    setIsLoadingDetails(true);
    try {
        // CRITICAL: Fetch the full product details, including all variants and ingredients,
        // before opening the modal for editing.
        const response = await getProductById(product.id);
        const normalized = normalizeProductDetail(response);
        setSelectedProduct(normalized);
        setIsModalOpen(true);
    } catch (err) {
        toast.error('Failed to fetch complete product details.');
    } finally {
        setIsLoadingDetails(false);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this product and all its variants? This action cannot be undone.')) {
      deleteProductMutation.mutate(id, {
        onSuccess: () => {
          toast.success('Product and all its variants deleted successfully!');
          queryClient.invalidateQueries(['products']);
        },
        onError: (err) => toast.error(err?.response?.data?.message || 'Failed to delete product.'),
      });
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
    // Refetch the list to show any new or updated products
    queryClient.invalidateQueries('products');
  };

  if (error) {
    return <Alert severity="error">Failed to load products: {error.message}</Alert>;
  }

  return (
    <Box sx={{p:3}}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Product Master</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={handleAddNew}>
          Add New Product
        </Button>
      </Box>

      <Paper sx={{ mb: 2, p: 2 }}>
        <TextField
            fullWidth
            placeholder="Search by Product Name or Generic Name..."
            value={searchTerm}
            onChange={handleSearchChange}
            InputProps={{
                startAdornment: ( <InputAdornment position="start"><Search /></InputAdornment> ),
            }}
        />
      </Paper>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Product Name</TableCell>
                  <TableCell>Generic Name</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Manufacturer</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id} hover>
                    <TableCell sx={{ fontWeight: 'bold' }}>{product.name}</TableCell>
                    <TableCell>{product.generic_name || 'N/A'}</TableCell>
                    <TableCell>{product.category_name || 'N/A'}</TableCell>
                    <TableCell>{product.manufacturer_name || 'N/A'}</TableCell>
                    <TableCell>
                      <Typography sx={{ color: product.is_active ? 'success.main' : 'error.main', fontWeight: 'bold' }}>
                        {product.is_active ? 'Active' : 'Inactive'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton onClick={() => handleEdit(product)} disabled={isLoadingDetails}>
                          {isLoadingDetails && selectedProduct?.id === product.id ? <CircularProgress size={24} /> : <Edit />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton onClick={() => handleDelete(product.id)} color="error"><Delete /></IconButton>
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
            count={totalProducts}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </>
      )}

      {/* The modal is only rendered when it's open */}
      {isModalOpen && (
        <ProductFormModal
            open={isModalOpen}
            onClose={handleModalClose}
            product={selectedProduct}
        />
      )}
    </Box>
  );
};

export default ProductsPage;
