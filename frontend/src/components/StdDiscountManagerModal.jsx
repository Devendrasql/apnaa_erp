import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, Grid, IconButton, Typography
} from '@mui/material';
import { Delete, Edit } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { api } from '../services/api';
import toast from 'react-hot-toast';

export default function StdDiscountManagerModal({ open, onClose, branchId }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', percentage: '' });

  const { data, isLoading } = useQuery(
    ['stdDiscounts', branchId],
    () => api.getStdDiscounts({ branch_id: branchId }),
    { select: (res) => res.data.data }
  );

  const createMut = useMutation(api.createStdDiscount, {
    onSuccess: () => { toast.success('Standard discount created'); qc.invalidateQueries(['stdDiscounts', branchId]); setForm({ name: '', percentage: '' }); },
    onError: (e) => toast.error(e?.response?.data?.message || 'Failed to create discount')
  });

  const updateMut = useMutation(({ id, data }) => api.updateStdDiscount(id, data), {
    onSuccess: () => { toast.success('Standard discount updated'); qc.invalidateQueries(['stdDiscounts', branchId]); setEditing(null); setForm({ name: '', percentage: '' }); },
    onError: (e) => toast.error(e?.response?.data?.message || 'Failed to update discount')
  });

  const deleteMut = useMutation((id) => api.deleteStdDiscount(id), {
    onSuccess: () => { toast.success('Standard discount deactivated'); qc.invalidateQueries(['stdDiscounts', branchId]); },
    onError: (e) => toast.error(e?.response?.data?.message || 'Failed to delete discount')
  });

  const submit = () => {
    if (!form.name) return toast.error('name is required');
    const pct = Number(form.percentage);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) return toast.error('percentage must be 0-100');
    if (editing) {
      updateMut.mutate({ id: editing.id, data: { name: form.name, percentage: pct } });
    } else {
      createMut.mutate({ branch_id: branchId, name: form.name, percentage: pct });
    }
  };

  const startEdit = (row) => { setEditing(row); setForm({ name: row.name, percentage: String(row.percentage) }); };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Manage Standard Discounts</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={6}>
            <TextField fullWidth label="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </Grid>
          <Grid item xs={4}>
            <TextField fullWidth type="number" label="Percentage (0-100)" value={form.percentage} onChange={e => setForm(f => ({ ...f, percentage: e.target.value }))} />
          </Grid>
          <Grid item xs={2}>
            <Button variant="contained" onClick={submit} sx={{ height: '100%' }}>
              {editing ? 'Update' : 'Add'}
            </Button>
          </Grid>
        </Grid>

        {isLoading ? <Typography>Loading...</Typography> : (
          <Grid container spacing={1}>
            {data?.map(row => (
              <Grid item xs={12} key={row.id}>
                <Grid container alignItems="center" spacing={1} sx={{ borderBottom: '1px solid #eee', py: 1 }}>
                  <Grid item xs={5}><Typography>{row.name}</Typography></Grid>
                  <Grid item xs={3}><Typography color="text.secondary">{row.percentage}%</Typography></Grid>
                  <Grid item xs={2}><Typography color={row.is_active ? 'success.main' : 'error.main'}>{row.is_active ? 'Active' : 'Inactive'}</Typography></Grid>
                  <Grid item xs={2} sx={{ textAlign: 'right' }}>
                    <IconButton onClick={() => startEdit(row)}><Edit /></IconButton>
                    <IconButton onClick={() => deleteMut.mutate(row.id)}><Delete color="error" /></IconButton>
                  </Grid>
                </Grid>
              </Grid>
            ))}
          </Grid>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => { setEditing(null); setForm({ name: '', percentage: '' }); }} color="inherit">Clear</Button>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
