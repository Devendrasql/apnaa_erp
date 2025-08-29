// In frontend/src/components/StockTransferFormModal.jsx

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
  Autocomplete,
  Box,
  Typography,
  IconButton,
  Divider
} from '@mui/material';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { useQuery } from 'react-query';
import { Add, Delete } from '@mui/icons-material';
import { api } from '../services/api';
import toast from 'react-hot-toast';

const StockTransferFormModal = ({ open, onClose, onSubmit, isLoading }) => {
  // Correctly initialize useForm and all its methods
  const { control, handleSubmit, reset, watch, setValue } = useForm({
    defaultValues: {
      from_branch_id: '',
      to_branch_id: '',
      notes: '',
      items: [{ stock_id: null, quantity: 1 }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items"
  });

  const fromBranchId = watch("from_branch_id");

  // Fetch data for dropdowns
  const { data: branchesData, isLoading: isLoadingBranches } = useQuery('branches', () => api.getBranches());
  const { data: stockData, isLoading: isLoadingStock } = useQuery(
    ['inventoryStockForTransfer', fromBranchId], // Use a unique query key
    () => api.getStock({ branch_id: fromBranchId, limit: 1000 }),
    {
      enabled: !!fromBranchId, // Only fetch stock when a "from" branch is selected
      select: (res) => res.data.data
    }
  );

  const branches = branchesData?.data?.data || [];
  const availableStock = stockData || [];

  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  const handleFormSubmit = (data) => {
    const submissionData = {
        ...data,
        // Filter out any empty item rows and format the data for the backend
        items: data.items
            .filter(item => item.stock_id && Number(item.quantity) > 0)
            .map(item => ({
                stock_id: item.stock_id.stock_id,
                product_id: item.stock_id.product_id,
                quantity: Number(item.quantity),
                batch_number: item.stock_id.batch_number,
                expiry_date: item.stock_id.expiry_date,
                sku: item.stock_id.sku,
            }))
    };

    if (submissionData.items.length === 0) {
        toast.error("Please add at least one valid item to the transfer.");
        return;
    }

    onSubmit(submissionData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>Create New Stock Transfer</DialogTitle>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <Controller name="from_branch_id" control={control} rules={{ required: 'This field is required' }} render={({ field, fieldState }) => (
                <TextField {...field} select label="From Branch (Source)" fullWidth required error={!!fieldState.error} helperText={fieldState.error?.message} disabled={isLoadingBranches}>
                  {branches.map((branch) => (<MenuItem key={branch.id} value={branch.id}>{branch.name}</MenuItem>))}
                </TextField>
              )} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller name="to_branch_id" control={control} rules={{ required: 'This field is required' }} render={({ field, fieldState }) => (
                <TextField {...field} select label="To Branch (Destination)" fullWidth required error={!!fieldState.error} helperText={fieldState.error?.message} disabled={isLoadingBranches}>
                  {branches.filter(b => b.id !== fromBranchId).map((branch) => (<MenuItem key={branch.id} value={branch.id}>{branch.name}</MenuItem>))}
                </TextField>
              )} />
            </Grid>
            <Grid item xs={12}>
                <Controller name="notes" control={control} render={({ field }) => (<TextField {...field} label="Notes" fullWidth multiline rows={2} />)} />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }}><Typography>Items to Transfer</Typography></Divider>

          {fields.map((field, index) => (
            <Grid container spacing={2} key={field.id} sx={{ mb: 2, alignItems: 'center' }}>
              <Grid item xs={12} md={8}>
                <Controller
                  name={`items.${index}.stock_id`}
                  control={control}
                  rules={{ required: 'Please select a product batch' }}
                  render={({ field: controllerField, fieldState }) => (
                    <Autocomplete
                      {...controllerField}
                      options={availableStock}
                      disabled={!fromBranchId || isLoadingStock}
                      getOptionLabel={(option) => `${option.product_name} (Batch: ${option.batch_number}, Available: ${option.quantity_available})` || ''}
                      isOptionEqualToValue={(option, value) => option.stock_id === value.stock_id}
                      loading={isLoadingStock}
                      onChange={(e, value) => controllerField.onChange(value)}
                      renderInput={(params) => <TextField {...params} label="Select Product Batch" required error={!!fieldState.error} helperText={fieldState.error?.message} />}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={6} md={3}>
                <Controller 
                    name={`items.${index}.quantity`} 
                    control={control} 
                    rules={{ required: 'Quantity is required', min: { value: 1, message: "Min 1" } }} 
                    render={({ field, fieldState }) => (
                        <TextField 
                            {...field} 
                            label="Quantity" 
                            type="number" 
                            fullWidth 
                            required 
                            error={!!fieldState.error} 
                            helperText={fieldState.error?.message}
                        />
                    )} 
                />
              </Grid>
              <Grid item xs={6} md={1}>
                <IconButton onClick={() => remove(index)} color="error"><Delete /></IconButton>
              </Grid>
            </Grid>
          ))}
          
          <Button startIcon={<Add />} onClick={() => append({ stock_id: null, quantity: 1 })} disabled={!fromBranchId}>
            Add Item
          </Button>

        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={isLoading}>
            {isLoading ? 'Creating...' : 'Create Transfer Request'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default StockTransferFormModal;
