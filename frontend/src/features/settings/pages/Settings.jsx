// In frontend/src/pages/Settings.jsx

import React, { useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Switch,
  FormControlLabel,
  Tooltip
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useForm, Controller } from 'react-hook-form';
import toast from 'react-hot-toast';
import { api } from '@shared/api';

const SettingsPage = () => {
  const queryClient = useQueryClient();
  const { control, handleSubmit, reset, setValue } = useForm();

  const { data: settings, isLoading, error } = useQuery(
    'settings',
    () => api.getSettings(),
    {
      select: (response) => response.data.data,
      onSuccess: (data) => {
        if (data) {
          Object.keys(data).forEach(key => {
            const value = data[key].type === 'boolean' ? data[key].value === 'true' : data[key].value;
            setValue(key, value);
          });
        }
      }
    }
  );

  const { mutate: updateSettings, isLoading: isUpdating } = useMutation(
    api.updateSettings,
    {
      onSuccess: () => {
        toast.success('Settings updated successfully!');
        queryClient.invalidateQueries('settings');
      },
      onError: (err) => {
        toast.error(err.response?.data?.message || 'Failed to update settings.');
      }
    }
  );

  const onSubmit = (formData) => {
    updateSettings(formData);
  };

  if (isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  }

  if (error) {
    return <Alert severity="error">Failed to load settings. Please try again later.</Alert>;
  }

  // Helper to render the correct input based on setting type
  const renderField = (key, setting) => {
    switch (setting.type) {
      case 'boolean':
        return (
          <Controller
            name={key}
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={<Switch {...field} checked={field.value} />}
                label={setting.description}
              />
            )}
          />
        );
      case 'number':
        return (
          <Controller
            name={key}
            control={control}
            rules={{ required: true }}
            render={({ field }) => (
              <TextField {...field} label={setting.description} type="number" fullWidth />
            )}
          />
        );
      case 'string':
      default:
        return (
          <Controller
            name={key}
            control={control}
            rules={{ required: true }}
            render={({ field }) => (
              <TextField {...field} label={setting.description} fullWidth />
            )}
          />
        );
    }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>System Settings</Typography>
      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={3}>
            {settings && Object.entries(settings).map(([key, setting]) => (
              <Grid item xs={12} sm={6} key={key}>
                {/* FIX: The Tooltip now wraps a Box component, which can hold a ref */}
                <Tooltip title={`Database key: ${key}`} placement="top-start">
                    <Box>
                        {renderField(key, setting)}
                    </Box>
                </Tooltip>
              </Grid>
            ))}
            <Grid item xs={12} sx={{ mt: 2 }}>
              <Button type="submit" variant="contained" disabled={isUpdating}>
                {isUpdating ? <CircularProgress size={24} /> : 'Save Settings'}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
};

export default SettingsPage;
