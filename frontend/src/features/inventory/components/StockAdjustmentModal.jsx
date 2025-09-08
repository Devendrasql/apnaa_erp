// In frontend/src/modules/inventory/components/StockAdjustmentModal.jsx

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
  Typography,
  Box
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';

const adjustmentReasons = [
    { value: 'adjustment', label: 'Stock Count Correction' },
    { value: 'damaged', label: 'Damaged Goods' },
    { value: 'expired', label: 'Expired Stock' },
    { value: 'return', label: 'Customer Return' },
];

const StockAdjustmentModal = ({ open, onClose, onSubmit, stockItem, isLoading }) => {
  const { control, handleSubmit, reset } = useForm({
    defaultValues: {
      quantity_change: '',
      reason: 'adjustment',
      notes: '',
    }
  });

  useEffect(() => {
    if (!open) {
      reset(); // Reset form when modal closes
    }
  }, [open, reset]);

  const handleFormSubmit = (data) => {
    // Convert quantity to a number and include the stock_id
    const submissionData = {
      ...data,
      stock_id: stockItem.stock_id,
      quantity_change: Number(data.quantity_change),
    };
    onSubmit(submissionData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Adjust Stock</DialogTitle>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogContent>
          {stockItem && (
            <Box sx={{ mb: 2 }}>
                <Typography variant="h6">{stockItem.product_name}</Typography>
                <Typography color="text.secondary">Batch: {stockItem.batch_number} | Current Stock: {stockItem.quantity_available}</Typography>
            </Box>
          )}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <Controller
                name="quantity_change"
                control={control}
                rules={{ required: 'This field is required', validate: value => value != 0 || 'Cannot be zero' }}
                render={({ field, fieldState }) => (
                  <TextField 
                    {...field} 
                    label="Quantity Change" 
                    type="number" 
                    fullWidth 
                    required 
                    helperText="Use negative for removal (e.g., -5)"
                    error={!!fieldState.error}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="reason"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <TextField {...field} select label="Reason" fullWidth required>
                    {adjustmentReasons.map((option) => (
                      <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <Controller
                name="notes"
                control={control}
                render={({ field }) => (
                  <TextField {...field} label="Notes (Optional)" fullWidth multiline rows={3} />
                )}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Adjust Stock'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default StockAdjustmentModal;
