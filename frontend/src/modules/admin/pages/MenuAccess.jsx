import React, { useMemo, useState } from 'react';
import {
  Box, Paper, Typography, CircularProgress, Alert, Grid, FormControl, InputLabel, Select, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Checkbox, Button
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { api } from '@shared/api';
import { useAuth } from '@/contexts/AuthContext';
import { PRIMARY, MASTERS, PRODUCT_MASTERS } from '@/app/menuConfig';
import { flattenMenus } from '@/app/menuUtils';
import toast from 'react-hot-toast';

export default function MenuAccessPage() {
  const queryClient = useQueryClient();
  const [roleId, setRoleId] = useState('');
  const { isElevated } = useAuth();

  const rolesQ = useQuery(['roles-basic'], () => api.getAllRoles(), { select: r => r.data.data });
  const menusQ = useQuery(
    ['ui-menus'],
    () => api.getUIMenus(),
    { select: (r) => r?.data?.data || [], retry: 1 }
  );

  // current role → fetch bindings
//   const bindingsQ = useQuery(
//     ['menu-bindings', roleId],
//     () => api.getUIMenus({ params: { role_id: roleId }}), // if your API supports it
//     {
//       enabled: !!roleId,
//       select: r => r.data.bindings ?? r.data.data?.bindings ?? [],
//     }
//   );
  const bindingsQ = useQuery(['menu-bindings', roleId], () => api.getMenuBindings(roleId), {
    enabled: !!roleId,
    retry: false,
    // Accept either axios-style {data:{bindings}} or raw array
    select: (r) => Array.isArray(r)
      ? r
      : (r?.data?.bindings ?? r?.data?.data?.bindings ?? []),
  });

  // pretend we have PATCH /api/ui/menus/bindings { role_id, allowed_keys: string[] }
  const saveMutation = useMutation(
    (payload) => api.updateMenuBindings(payload), // add this wrapper in services if needed
    {
      onSuccess: () => {
        toast.success('Menu access updated');
        queryClient.invalidateQueries(['menu-bindings', roleId]);
      },
      onError: (e) => toast.error(e.response?.data?.message || 'Failed to update menu access'),
    }
  );

  const allMenus = useMemo(() => {
    const serverMenus = Array.isArray(menusQ.data) ? menusQ.data : [];
    if (serverMenus.length) return flattenMenus(serverMenus);
    return [...PRIMARY, ...MASTERS, ...PRODUCT_MASTERS].map((m) => ({ key: m.key, label: m.label, path: m.path }));
  }, [menusQ.data]);
  const roleMenus = useMemo(() => new Set(bindingsQ.data ?? []), [bindingsQ.data]);

  const toggle = (key) => {
    if (!roleId) return;
    const next = new Set(roleMenus);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    // optimistic update: keep query data as plain array to match select shape
    queryClient.setQueryData(['menu-bindings', roleId], Array.from(next));
  };

  const save = () => {
    if (!roleId) return toast.error('Choose a role first');
    const current = Array.isArray(bindingsQ.data)
      ? bindingsQ.data
      : (bindingsQ.data?.bindings ?? bindingsQ.data?.data?.bindings ?? []);
    const allowed_keys = Array.from(new Set(current));
    saveMutation.mutate({ role_id: roleId, allowed_keys });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h4">Menu Access</Typography>
        {isElevated && (
          <Button size="small" variant="outlined" onClick={async () => {
            try {
              // Build items from local config for initial insertion/upsert
              const toItem = (m, group, order) => ({
                key: m.key,
                label: m.label,
                path: m.path,
                perm: m.perm || null,
                group,
                order,
              });
              const items = [
                ...PRIMARY.map((m, i) => toItem(m, 'MAIN', i + 1)),
                ...MASTERS.map((m, i) => toItem(m, 'MASTERS', 10 + i + 1)),
                ...PRODUCT_MASTERS.map((m, i) => toItem(m, 'PRODUCT_MASTERS', 20 + i + 1)),
              ];
              await api.seedMenus({ items, mode: 'upsert' });
              toast.success('Menus inserted/updated successfully');
              queryClient.invalidateQueries(['ui-menus']);
            } catch (e) {
              toast.error(e?.response?.data?.message || 'Seeding failed. Ensure backend supports POST /ui/menus/seed');
            }
          }}>Seed Menus</Button>
        )}
      </Box>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Role</InputLabel>
              <Select value={roleId} label="Role" onChange={(e) => setRoleId(e.target.value)}>
                <MenuItem value=""><em>Choose role…</em></MenuItem>
                {(rolesQ.data ?? []).map(r => (
                  <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {(!roleId) && <Alert severity="info">Select a role to edit its menu access.</Alert>}
      {(rolesQ.isLoading || menusQ.isLoading || bindingsQ.isLoading) && <CircularProgress />}

      {roleId && !!allMenus.length && (
        <>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Menu Key</TableCell>
                  <TableCell>Label</TableCell>
                  <TableCell>Path</TableCell>
                  <TableCell align="center">Visible</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {allMenus.map(m => (
                  <TableRow key={m.key} hover>
                    <TableCell>{m.key}</TableCell>
                    <TableCell>{m.label}</TableCell>
                    <TableCell>{m.path}</TableCell>
                    <TableCell align="center">
                      <Checkbox
                        size="small"
                        checked={roleMenus.has(m.key)}
                        onChange={() => toggle(m.key)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button onClick={() => queryClient.invalidateQueries(['menu-bindings', roleId])}>Reset</Button>
            <Button variant="contained" onClick={save} disabled={saveMutation.isLoading}>
              {saveMutation.isLoading ? 'Saving…' : 'Save'}
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
}
