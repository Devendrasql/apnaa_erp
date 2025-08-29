// In frontend/src/components/BranchFormModal.jsx

import React, { useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Grid,
  Switch,
  FormControlLabel
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';

const BranchFormModal = ({ open, onClose, onSubmit, branch, isLoading }) => {
  const { control, handleSubmit, reset, setValue } = useForm({
    defaultValues: {
      name: '',
      code: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      phone: '',
      email: '',
      license_number: '',
      gst_number: '',
      is_active: true,
    }
  });

  useEffect(() => {
    if (open) {
        if (branch) {
            setValue('name', branch.name);
            setValue('code', branch.code);
            setValue('address', branch.address);
            setValue('city', branch.city);
            setValue('state', branch.state);
            setValue('pincode', branch.pincode);
            setValue('phone', branch.phone || '');
            setValue('email', branch.email || '');
            setValue('license_number', branch.license_number);
            setValue('gst_number', branch.gst_number || '');
            // Convert the incoming number (0 or 1) to a boolean
            setValue('is_active', !!branch.is_active);
        } else {
            reset({
                name: '', code: '', address: '', city: '', state: '', pincode: '',
                phone: '', email: '', license_number: '', gst_number: '', is_active: true,
            });
        }
    }
  }, [branch, open, setValue, reset]);

  const handleFormSubmit = (data) => {
    onSubmit(data);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{branch ? 'Edit Branch' : 'Add New Branch'}</DialogTitle>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* All other TextFields remain the same */}
            <Grid item xs={12} sm={6}>
              <Controller name="name" control={control} rules={{ required: 'Branch name is required' }} render={({ field, fieldState }) => (<TextField {...field} label="Branch Name" fullWidth required error={!!fieldState.error} helperText={fieldState.error?.message} />)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller name="code" control={control} rules={{ required: 'Branch code is required' }} render={({ field, fieldState }) => (<TextField {...field} label="Branch Code" fullWidth required error={!!fieldState.error} helperText={fieldState.error?.message} />)} />
            </Grid>
            <Grid item xs={12}>
              <Controller name="address" control={control} rules={{ required: 'Address is required' }} render={({ field, fieldState }) => (<TextField {...field} label="Address" fullWidth required error={!!fieldState.error} helperText={fieldState.error?.message} />)} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Controller name="city" control={control} rules={{ required: 'City is required' }} render={({ field, fieldState }) => (<TextField {...field} label="City" fullWidth required error={!!fieldState.error} helperText={fieldState.error?.message} />)} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Controller name="state" control={control} rules={{ required: 'State is required' }} render={({ field, fieldState }) => (<TextField {...field} label="State" fullWidth required error={!!fieldState.error} helperText={fieldState.error?.message} />)} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Controller name="pincode" control={control} rules={{ required: 'Pincode is required' }} render={({ field, fieldState }) => (<TextField {...field} label="Pincode" fullWidth required error={!!fieldState.error} helperText={fieldState.error?.message} />)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller name="phone" control={control} render={({ field }) => <TextField {...field} label="Phone" fullWidth />} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller name="email" control={control} rules={{ pattern: { value: /^\S+@\S+$/i, message: 'Invalid email format' } }} render={({ field, fieldState }) => (<TextField {...field} label="Email" type="email" fullWidth error={!!fieldState.error} helperText={fieldState.error?.message} />)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller name="license_number" control={control} rules={{ required: 'License number is required' }} render={({ field, fieldState }) => (<TextField {...field} label="License Number" fullWidth required error={!!fieldState.error} helperText={fieldState.error?.message} />)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller name="gst_number" control={control} render={({ field }) => <TextField {...field} label="GST Number" fullWidth />} />
            </Grid>
            <Grid item xs={12}>
                <Controller
                    name="is_active"
                    control={control}
                    render={({ field }) => (
                        <FormControlLabel
                            // FIX: Ensure the value passed to 'checked' is always a boolean
                            control={<Switch {...field} checked={!!field.value} />}
                            label="Active"
                        />
                    )}
                />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={isLoading}>
            {isLoading ? 'Saving...' : (branch ? 'Save Changes' : 'Create Branch')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default BranchFormModal;
