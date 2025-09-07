import React, { useMemo, useState } from 'react';
import {
  Box, Paper, Typography, Button, TextField, Grid, IconButton,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  CircularProgress, Alert
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { api } from '../services/api';
import toast from 'react-hot-toast';

export default function AbacPoliciesPage() {
  const qc = useQueryClient();

  const policiesQ = useQuery(['abac-policies'], () => api.getAbacPolicies(), {
    select: r => r.data.data ?? r.data
  });

  const saveMutation = useMutation(
    (payload) => api.updateAbacPolicies(payload),
    {
      onSuccess: () => {
        toast.success('Policies saved');
        qc.invalidateQueries(['abac-policies']);
      },
      onError: (e) => toast.error(e.response?.data?.message || 'Failed to save policies')
    }
  );

  const [rows, setRows] = useState([]);

  React.useEffect(() => {
    const src = policiesQ.data ?? [];
    // each policy: { id?, name, effect, action, resource, condition: string (JSON logic or CEL) }
    setRows(Array.isArray(src) ? src : []);
  }, [policiesQ.data]);

  const addRow = () => setRows(prev => [...prev, { name: '', effect: 'allow', action: '', resource: '', condition: '' }]);
  const delRow = (idx) => setRows(prev => prev.filter((_, i) => i !== idx));
  const updateRow = (idx, key, value) => setRows(prev => prev.map((r, i) => i === idx ? { ...r, [key]: value } : r));

  const save = () => {
    // basic guard: ensure name/action/resource
    const bad = rows.find(r => !r.name || !r.action || !r.resource);
    if (bad) return toast.error('Name, action, and resource are required');
    saveMutation.mutate({ policies: rows });
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 2 }}>ABAC Policies</Typography>

      {policiesQ.isLoading && <CircularProgress />}
      {policiesQ.error && <Alert severity="error">Failed to load policies</Alert>}

      {!policiesQ.isLoading && (
        <>
          <Box sx={{ mb: 1 }}>
            <Button startIcon={<Add />} onClick={addRow}>Add Policy</Button>
          </Box>

          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell width="15%">Name</TableCell>
                  <TableCell width="10%">Effect</TableCell>
                  <TableCell width="20%">Action</TableCell>
                  <TableCell width="20%">Resource</TableCell>
                  <TableCell>Condition (JSONLogic / CEL / SQL WHERE)</TableCell>
                  <TableCell align="right" width="5%">Del</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r, idx) => (
                  <TableRow key={idx}>
                    <TableCell><TextField size="small" fullWidth value={r.name} onChange={e => updateRow(idx, 'name', e.target.value)} /></TableCell>
                    <TableCell>
                      <TextField size="small" fullWidth value={r.effect} onChange={e => updateRow(idx, 'effect', e.target.value)} placeholder="allow | deny" />
                    </TableCell>
                    <TableCell><TextField size="small" fullWidth value={r.action} onChange={e => updateRow(idx, 'action', e.target.value)} placeholder="e.g. sales.read" /></TableCell>
                    <TableCell><TextField size="small" fullWidth value={r.resource} onChange={e => updateRow(idx, 'resource', e.target.value)} placeholder="e.g. sales" /></TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        fullWidth
                        value={r.condition}
                        onChange={e => updateRow(idx, 'condition', e.target.value)}
                        placeholder={'Example (JSONLogic): {"==":[{"var":"branch_id"}, {"var":"ctx.branch_id"}]}'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton onClick={() => delRow(idx)} size="small"><Delete /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow><TableCell colSpan={6} align="center">No policies</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button onClick={() => policiesQ.refetch()}>Reset</Button>
            <Button variant="contained" onClick={save} disabled={saveMutation.isLoading}>
              {saveMutation.isLoading ? 'Saving…' : 'Save'}
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
}
