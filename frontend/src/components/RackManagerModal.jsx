import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, Grid, IconButton, Typography
} from '@mui/material';
import { Delete, Edit } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { api } from '../services/api';
import toast from 'react-hot-toast';

export default function RackManagerModal({ open, onClose, branchId }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ rack_code: '', rack_name: '' });

  const { data, isLoading } = useQuery(
    ['racks', branchId],
    () => api.getRacks({ branch_id: branchId }),
    { select: (res) => res.data.data }
  );

  const createMut = useMutation(api.createRack, {
    onSuccess: () => { toast.success('Rack created'); qc.invalidateQueries(['racks', branchId]); setForm({ rack_code: '', rack_name: '' }); },
    onError: (e) => toast.error(e?.response?.data?.message || 'Failed to create rack')
  });

  const updateMut = useMutation(({ id, data }) => api.updateRack(id, data), {
    onSuccess: () => { toast.success('Rack updated'); qc.invalidateQueries(['racks', branchId]); setEditing(null); setForm({ rack_code: '', rack_name: '' }); },
    onError: (e) => toast.error(e?.response?.data?.message || 'Failed to update rack')
  });

  const deleteMut = useMutation((id) => api.deleteRack(id), {
    onSuccess: () => { toast.success('Rack deactivated'); qc.invalidateQueries(['racks', branchId]); },
    onError: (e) => toast.error(e?.response?.data?.message || 'Failed to delete rack')
  });

  const submit = () => {
    if (!form.rack_code) return toast.error('rack_code is required');
    if (editing) {
      updateMut.mutate({ id: editing.id, data: { rack_code: form.rack_code, rack_name: form.rack_name } });
    } else {
      createMut.mutate({ branch_id: branchId, rack_code: form.rack_code, rack_name: form.rack_name });
    }
  };

  const startEdit = (row) => { setEditing(row); setForm({ rack_code: row.rack_code, rack_name: row.rack_name || '' }); };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Manage Racks</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={5}>
            <TextField fullWidth label="Rack Code" value={form.rack_code} onChange={e => setForm(f => ({ ...f, rack_code: e.target.value }))} />
          </Grid>
          <Grid item xs={5}>
            <TextField fullWidth label="Rack Name (optional)" value={form.rack_name} onChange={e => setForm(f => ({ ...f, rack_name: e.target.value }))} />
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
                  <Grid item xs={3}><Typography>{row.rack_code}</Typography></Grid>
                  <Grid item xs={5}><Typography color="text.secondary">{row.rack_name || '-'}</Typography></Grid>
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
        <Button onClick={() => { setEditing(null); setForm({ rack_code: '', rack_name: '' }); }} color="inherit">Clear</Button>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
