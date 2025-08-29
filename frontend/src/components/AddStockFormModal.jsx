// In frontend/src/components/AddStockFormModal.jsx

import React, { useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Grid,
  MenuItem,
  CircularProgress,
  Autocomplete
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { useQuery } from 'react-query';
import { api } from '../services/api';

const AddStockFormModal = ({ open, onClose, onSubmit, isLoading }) => {
  const { control, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: {
      product_id: null,
      branch_id: '',
      supplier_id: '',
      batch_number: '',
      expiry_date: '',
      quantity: '',
      purchase_price: '',
      mrp: '',
      selling_price: '',
    }
  });

  // Watch the selected product to auto-fill pricing info
  const selectedProduct = watch('product_id');

  // Fetch data for dropdowns
  const { data: productsData, isLoading: isLoadingProducts } = useQuery('products', () => api.getProducts({ limit: 1000 }));
  const { data: branchesData, isLoading: isLoadingBranches } = useQuery('branches', () => api.getBranches());
  const { data: suppliersData, isLoading: isLoadingSuppliers } = useQuery('suppliers', () => api.getSuppliers());

  const products = productsData?.data?.data || [];
  const branches = branchesData?.data?.data || [];
  const suppliers = suppliersData?.data?.data || [];

  // Auto-fill pricing fields when a product is selected
  useEffect(() => {
    if (selectedProduct) {
      setValue('purchase_price', selectedProduct.purchase_price);
      setValue('mrp', selectedProduct.mrp);
      setValue('selling_price', selectedProduct.selling_price);
    }
  }, [selectedProduct, setValue]);

  useEffect(() => {
    if (!open) {
      reset(); // Reset form when modal closes
    }
  }, [open, reset]);

  const handleFormSubmit = (data) => {
    // Ensure product_id is just the ID
    const submissionData = {
      ...data,
      product_id: data.product_id.id,
    };
    onSubmit(submissionData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Add New Stock</DialogTitle>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            
            <Grid item xs={12}>
              <Controller
                name="product_id"
                control={control}
                rules={{ required: 'Product is required' }}
                render={({ field, fieldState }) => (
                  <Autocomplete
                    {...field}
                    options={products}
                    getOptionLabel={(option) => option.name || ''}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    loading={isLoadingProducts}
                    onChange={(e, value) => field.onChange(value)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Select Product"
                        required
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {isLoadingProducts ? <CircularProgress color="inherit" size={20} /> : null}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller name="branch_id" control={control} rules={{ required: true }} render={({ field }) => (
                <TextField {...field} select label="Branch" fullWidth required disabled={isLoadingBranches}>
                  {branches.map((branch) => (<MenuItem key={branch.id} value={branch.id}>{branch.name}</MenuItem>))}
                </TextField>
              )} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller name="supplier_id" control={control} render={({ field }) => (
                <TextField {...field} select label="Supplier (Optional)" fullWidth disabled={isLoadingSuppliers}>
                  {suppliers.map((supplier) => (<MenuItem key={supplier.id} value={supplier.id}>{supplier.name}</MenuItem>))}
                </TextField>
              )} />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller name="batch_number" control={control} rules={{ required: 'Batch number is required' }} render={({ field, fieldState }) => (<TextField {...field} label="Batch Number" fullWidth required error={!!fieldState.error} helperText={fieldState.error?.message} />)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller name="expiry_date" control={control} rules={{ required: 'Expiry date is required' }} render={({ field, fieldState }) => (<TextField {...field} label="Expiry Date" type="date" InputLabelProps={{ shrink: true }} fullWidth required error={!!fieldState.error} helperText={fieldState.error?.message} />)} />
            </Grid>

            <Grid item xs={12} sm={3}>
              <Controller name="quantity" control={control} rules={{ required: true, min: 1 }} render={({ field }) => (<TextField {...field} label="Quantity" type="number" fullWidth required />)} />
            </Grid>
            <Grid item xs={12} sm={3}>
              <Controller name="purchase_price" control={control} rules={{ required: true, min: 0 }} render={({ field }) => (<TextField {...field} label="Purchase Price" type="number" fullWidth required />)} />
            </Grid>
            <Grid item xs={12} sm={3}>
              <Controller name="mrp" control={control} rules={{ required: true, min: 0 }} render={({ field }) => (<TextField {...field} label="MRP" type="number" fullWidth required />)} />
            </Grid>
            <Grid item xs={12} sm={3}>
              <Controller name="selling_price" control={control} rules={{ required: true, min: 0 }} render={({ field }) => (<TextField {...field} label="Selling Price" type="number" fullWidth required />)} />
            </Grid>

          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Add Stock'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default AddStockFormModal;
