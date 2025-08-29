// frontend/src/components/MfgBrandModal.jsx
import React, { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Grid, TextField, Switch, FormControlLabel, IconButton, Tooltip, Stack, Chip
} from '@mui/material';
import { AddCircleOutline } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { api } from '../services/api';
import toast from 'react-hot-toast';

const newBrand = () => ({ id: null, name: '', is_active: true, key: Math.random() });

export default function MfgBrandModal({ open, onClose, editingId }) {
  const qc = useQueryClient();
  const isEditing = !!editingId;

  const { data, isLoading } = useQuery(
    ['mfg-brand', editingId],
    () => api.getMfgBrandById(editingId),
    { enabled: isEditing, select: (res) => res.data.data }
  );

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [brands, setBrands] = useState([newBrand()]);

  useEffect(() => {
    if (isEditing && data) {
      setName(data.name || '');
      setCategory(data.category || '');
      setIsActive(!!data.is_active);
      const mapped = (data.brands || []).map(b => ({ id: b.id, name: b.name, is_active: !!b.is_active, key: Math.random() }));
      setBrands(mapped.length ? mapped : [newBrand()]);
    } else if (!isEditing) {
      setName('');
      setCategory('');
      setIsActive(true);
      setBrands([newBrand()]);
    }
  }, [isEditing, data]);

  const { mutate: create, isLoading: creating } = useMutation(
    (payload) => api.createMfgBrand(payload),
    {
      onSuccess: () => {
        toast.success('Created');
        qc.invalidateQueries(['mfg-brands']);
        onClose();
      },
      onError: (e) => toast.error(e?.response?.data?.message || 'Failed to create')
    }
  );

  const { mutate: update, isLoading: updating } = useMutation(
    ({ id, payload }) => api.updateMfgBrand(id, payload),
    {
      onSuccess: () => {
        toast.success('Updated');
        qc.invalidateQueries(['mfg-brands']);
        qc.invalidateQueries(['mfg-brand', editingId]);
        onClose();
      },
      onError: (e) => toast.error(e?.response?.data?.message || 'Failed to update')
    }
  );

  const addBrand = () => setBrands(prev => [...prev, newBrand()]);
  const setBrand = (idx, patch) =>
    setBrands(prev => prev.map((b, i) => (i === idx ? { ...b, ...patch } : b)));

  const onSubmit = () => {
    if (!name.trim()) return toast.error('Manufacturer name is required');
    const cleanedBrands = brands
      .map(b => ({ id: b.id || undefined, name: (b.name || '').trim(), is_active: !!b.is_active }))
      .filter(b => b.name); // ignore empty rows

    if (cleanedBrands.length === 0) {
      toast.error('Add at least one brand');
      return;
    }

    const payload = {
      name: name.trim(),
      category: category.trim() || null,
      is_active: !!isActive,
      brands: cleanedBrands
    };

    if (isEditing) update({ id: editingId, payload });
    else create(payload);
  };

  const saving = creating || updating;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{isEditing ? 'Edit Manufacturer & Brands' : 'Add Manufacturer & Brands'}</DialogTitle>
      <DialogContent dividers>
        {isLoading && isEditing ? 'Loading…' : (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Manufacturer Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Category (optional)"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={2} sx={{ display: 'flex', alignItems: 'center' }}>
              <FormControlLabel
                control={<Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />}
                label="Active"
              />
            </Grid>

            <Grid item xs={12}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <strong>Brands</strong>
                <Chip label="No delete — toggle active/inactive" size="small" variant="outlined" />
              </Stack>
            </Grid>

            {brands.map((b, idx) => (
              <React.Fragment key={b.key}>
                <Grid item xs={12} sm={8}>
                  <TextField
                    fullWidth
                    label={`Brand Name ${idx + 1}`}
                    value={b.name}
                    onChange={(e) => setBrand(idx, { name: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={4} sx={{ display: 'flex', alignItems: 'center' }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={!!b.is_active}
                        onChange={(e) => setBrand(idx, { is_active: e.target.checked })}
                      />
                    }
                    label="Active"
                  />
                </Grid>
              </React.Fragment>
            ))}

            <Grid item xs={12}>
              <Button startIcon={<AddCircleOutline />} onClick={addBrand}>
                Add Another Brand
              </Button>
            </Grid>
          </Grid>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={onSubmit} variant="contained" disabled={saving}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
