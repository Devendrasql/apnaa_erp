// In frontend/src/components/PurchaseOrderFormModal.jsx

import React, { useState, useEffect } from 'react';
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
  Autocomplete,
  Box,
  Typography,
  IconButton,
  Divider
} from '@mui/material';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { useQuery } from 'react-query';
import { Add, Delete } from '@mui/icons-material';
import { api } from '@shared/api';

const PurchaseOrderFormModal = ({ open, onClose, onSubmit, isLoading }) => {
  const { control, handleSubmit, reset, watch, setValue } = useForm({
    defaultValues: {
      branch_id: '',
      supplier_id: '',
      expected_delivery_date: '',
      notes: '',
      items: [{ product_id: null, quantity_ordered: 1, unit_price: 0 }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items"
  });

  // Fetch data for dropdowns
  const { data: branchesData, isLoading: isLoadingBranches } = useQuery('branches', () => api.getBranches());
  const { data: suppliersData, isLoading: isLoadingSuppliers } = useQuery('suppliers', () => api.getSuppliers());
  const { data: productsData, isLoading: isLoadingProducts } = useQuery('products', () => api.getProducts({ limit: 1000 }));

  const branches = branchesData?.data?.data || [];
  const suppliers = suppliersData?.data?.data || [];
  const products = productsData?.data?.data || [];

  useEffect(() => {
    if (!open) {
      reset(); // Reset form when modal closes
    }
  }, [open, reset]);

  const handleFormSubmit = (data) => {
    const submissionData = {
        ...data,
        items: data.items.map(item => ({
            ...item,
            product_id: item.product_id.id // Ensure we only send the ID
        }))
    };
    onSubmit(submissionData);
  };
  
  const selectedItems = watch('items');
  const totalAmount = selectedItems.reduce((sum, item) => {
      return sum + (Number(item.quantity_ordered) || 0) * (Number(item.unit_price) || 0);
  }, 0);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>Create New Purchase Order</DialogTitle>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <Controller name="branch_id" control={control} rules={{ required: true }} render={({ field }) => (
                <TextField {...field} select label="Branch" fullWidth required disabled={isLoadingBranches}>
                  {branches.map((branch) => (<MenuItem key={branch.id} value={branch.id}>{branch.name}</MenuItem>))}
                </TextField>
              )} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller name="supplier_id" control={control} rules={{ required: true }} render={({ field }) => (
                <TextField {...field} select label="Supplier" fullWidth required disabled={isLoadingSuppliers}>
                  {suppliers.map((supplier) => (<MenuItem key={supplier.id} value={supplier.id}>{supplier.name}</MenuItem>))}
                </TextField>
              )} />
            </Grid>
            <Grid item xs={12} sm={6}>
                <Controller name="expected_delivery_date" control={control} render={({ field }) => (<TextField {...field} label="Expected Delivery Date" type="date" InputLabelProps={{ shrink: true }} fullWidth />)} />
            </Grid>
             <Grid item xs={12} sm={6}>
                <Controller name="notes" control={control} render={({ field }) => (<TextField {...field} label="Notes" fullWidth multiline rows={1} />)} />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }}><Typography>Order Items</Typography></Divider>

          {fields.map((field, index) => (
            <Grid container spacing={2} key={field.id} sx={{ mb: 2, alignItems: 'center' }}>
              <Grid item xs={12} md={5}>
                <Controller
                  name={`items.${index}.product_id`}
                  control={control}
                  rules={{ required: true }}
                  render={({ field: controllerField }) => (
                    <Autocomplete
                      {...controllerField}
                      options={products}
                      getOptionLabel={(option) => option.name || ''}
                      isOptionEqualToValue={(option, value) => option.id === value.id}
                      loading={isLoadingProducts}
                      onChange={(e, value) => {
                        controllerField.onChange(value);
                        setValue(`items.${index}.unit_price`, value ? value.purchase_price : 0);
                      }}
                      renderInput={(params) => <TextField {...params} label="Product" required />}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={6} md={3}>
                <Controller name={`items.${index}.quantity_ordered`} control={control} rules={{ required: true, min: 1 }} render={({ field }) => (<TextField {...field} label="Quantity" type="number" fullWidth required />)} />
              </Grid>
              <Grid item xs={6} md={3}>
                <Controller name={`items.${index}.unit_price`} control={control} rules={{ required: true, min: 0 }} render={({ field }) => (<TextField {...field} label="Unit Price (₹)" type="number" fullWidth required />)} />
              </Grid>
              <Grid item xs={12} md={1}>
                <IconButton onClick={() => remove(index)} color="error"><Delete /></IconButton>
              </Grid>
            </Grid>
          ))}
          
          <Button startIcon={<Add />} onClick={() => append({ product_id: null, quantity_ordered: 1, unit_price: 0 })}>
            Add Item
          </Button>

          <Box sx={{mt: 3, display: 'flex', justifyContent: 'flex-end'}}>
              <Typography variant="h6">Total Amount: ₹{totalAmount.toFixed(2)}</Typography>
          </Box>

        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Create PO'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default PurchaseOrderFormModal;
