import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  CircularProgress,
  FormControlLabel,
  Switch,
  Typography,
} from '@mui/material';
import toast from 'react-hot-toast';
import { useRoleFeatures, useUpdateRoleFeatures } from '@/features/roles/hooks';

const FeaturesFormModal = ({ open, onClose, role }) => {
  const { data, isLoading } = useRoleFeatures(role?.id, { enabled: open && !!role });
  const updateMutation = useUpdateRoleFeatures(role?.id);
  const [features, setFeatures] = useState([]);

  useEffect(() => {
    if (data) {
      const mapped = data.map((f) => ({
        key: f.key,
        description: f.description,
        defaultValue: Boolean(f.default_value),
        value: f.override != null ? Boolean(f.override) : Boolean(f.default_value),
      }));
      setFeatures(mapped);
    } else if (!open) {
      setFeatures([]);
    }
  }, [data, open]);

  const handleToggle = (key) => (e) => {
    const checked = e.target.checked;
    setFeatures((prev) => prev.map((f) => (f.key === key ? { ...f, value: checked } : f)));
  };

  const handleSave = () => {
    const payload = {};
    features.forEach((f) => {
      if (f.value === f.defaultValue) payload[f.key] = null;
      else payload[f.key] = f.value;
    });
    updateMutation.mutate(payload, {
      onSuccess: () => {
        toast.success('Role features updated');
        onClose();
      },
      onError: (err) => toast.error(err?.response?.data?.message || 'Failed to update role features'),
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Manage Features for "{role?.name}"</DialogTitle>
      <DialogContent dividers>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 2 }}>
            {features.map((f) => (
              <FormControlLabel
                key={f.key}
                control={<Switch checked={!!f.value} onChange={handleToggle(f.key)} />}
                label={f.description || f.key}
              />
            ))}
            {!features.length && (
              <Typography variant="body2" color="text.secondary">No features found.</Typography>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={updateMutation.isLoading}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={updateMutation.isLoading}>
          {updateMutation.isLoading ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FeaturesFormModal;
