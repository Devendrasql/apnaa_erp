// In frontend/src/pages/Profile.jsx

import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Divider
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { useMutation } from 'react-query';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@shared/api';

const ProfilePage = () => {
  const { user } = useAuth(); // Get the logged-in user's data from context
  const { control, handleSubmit, reset } = useForm({
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
  });

  const { mutate: changePassword, isLoading, error } = useMutation(api.changePassword, {
    onSuccess: () => {
      toast.success('Password changed successfully!');
      reset(); // Clear the form fields
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to change password.');
    }
  });

  const onSubmit = (data) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword
    });
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>My Profile</Typography>
      <Grid container spacing={3}>
        {/* User Details Section */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>User Information</Typography>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="subtitle1"><strong>Name:</strong> {user?.first_name} {user?.last_name}</Typography>
            <Typography variant="subtitle1"><strong>Username:</strong> {user?.username}</Typography>
            <Typography variant="subtitle1"><strong>Email:</strong> {user?.email}</Typography>
            <Typography variant="subtitle1"><strong>Role:</strong> <span style={{textTransform: 'capitalize'}}>{user?.role?.replace('_', ' ')}</span></Typography>
            <Typography variant="subtitle1"><strong>Branch:</strong> {user?.branch_name || 'N/A'}</Typography>
          </Paper>
        </Grid>

        {/* Change Password Section */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>Change Password</Typography>
            <Divider sx={{ mb: 2 }} />
            <form onSubmit={handleSubmit(onSubmit)}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Controller
                    name="currentPassword"
                    control={control}
                    rules={{ required: 'Current password is required' }}
                    render={({ field, fieldState }) => (
                      <TextField 
                        {...field} 
                        label="Current Password" 
                        type="password" 
                        fullWidth 
                        required 
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Controller
                    name="newPassword"
                    control={control}
                    rules={{ required: 'New password is required', minLength: { value: 6, message: 'Password must be at least 6 characters' } }}
                    render={({ field, fieldState }) => (
                      <TextField 
                        {...field} 
                        label="New Password" 
                        type="password" 
                        fullWidth 
                        required 
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Controller
                    name="confirmPassword"
                    control={control}
                    rules={{ required: 'Please confirm your new password' }}
                    render={({ field, fieldState }) => (
                      <TextField 
                        {...field} 
                        label="Confirm New Password" 
                        type="password" 
                        fullWidth 
                        required 
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button type="submit" variant="contained" disabled={isLoading}>
                    {isLoading ? <CircularProgress size={24} /> : 'Update Password'}
                  </Button>
                </Grid>
              </Grid>
            </form>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ProfilePage;
