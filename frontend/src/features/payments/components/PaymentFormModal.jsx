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

const PaymentFormModal = ({ open, onClose, onSubmit, sale, isLoading }) => {
  const { control, handleSubmit, reset, watch } = useForm({
    defaultValues: {
      amount_paid: '',
      payment_method: 'cash',
      payment_date: new Date().toISOString().split('T')[0],
      notes: '',
    }
  });

  const amountPaidValue = watch('amount_paid');

  useEffect(() => {
    if (open) {
      reset({
        amount_paid: sale?.balance_amount || '',
        payment_method: 'cash',
        payment_date: new Date().toISOString().split('T')[0],
        notes: '',
      });
    }
  }, [sale, open, reset]);

  const handleFormSubmit = (data) => {
    const submissionData = {
      ...data,
      sale_id: sale.id,
      amount_paid: Number(data.amount_paid),
    };
    onSubmit(submissionData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Record Payment</DialogTitle>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogContent>
          {sale && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6">{sale.invoice_number}</Typography>
              <Typography color="text.secondary">
                Balance Due: <Typography component="span" color="error.main" fontWeight="bold">₹{Number(sale.balance_amount).toLocaleString()}</Typography>
              </Typography>
            </Box>
          )}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <Controller
                name="amount_paid"
                control={control}
                rules={{ required: 'Amount is required', min: { value: 0.01, message: 'Amount must be positive' }, max: { value: Number(sale?.balance_amount), message: 'Cannot exceed balance due' } }}
                render={({ field, fieldState }) => (
                  <TextField {...field} label="Amount Paid" type="number" fullWidth required autoFocus error={!!fieldState.error} helperText={fieldState.error?.message} />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller name="payment_method" control={control} rules={{ required: true }} render={({ field }) => (
                <TextField {...field} select label="Payment Method" fullWidth required>
                  <MenuItem value="cash">Cash</MenuItem>
                  <MenuItem value="card">Card</MenuItem>
                  <MenuItem value="upi">UPI</MenuItem>
                  <MenuItem value="cheque">Cheque</MenuItem>
                </TextField>
              )} />
            </Grid>
            <Grid item xs={12}>
              <Controller name="payment_date" control={control} rules={{ required: true }} render={({ field }) => (
                <TextField {...field} label="Payment Date" type="date" InputLabelProps={{ shrink: true }} fullWidth required />
              )} />
            </Grid>
            <Grid item xs={12}>
              <Controller name="notes" control={control} render={({ field }) => (
                <TextField {...field} label="Notes (Optional)" fullWidth multiline rows={3} />
              )} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Record Payment'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default PaymentFormModal;
