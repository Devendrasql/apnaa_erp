import React, { useMemo, useState } from 'react';
import {
  Box, Paper, Typography, Button, TextField, Grid, MenuItem as MItem,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  IconButton, Select, InputLabel, FormControl, CircularProgress, Alert
} from '@mui/material';
import { Add, Delete, ArrowUpward, ArrowDownward, FormatIndentIncrease, FormatIndentDecrease } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { api, upsertMenus, deleteMenu } from '@shared/api';
import { PRIMARY, MASTERS, PRODUCT_MASTERS } from '@/app/menuConfig';
import { flattenMenus, buildTreeFromFlat } from '@/app/menuUtils';
import { routeMeta } from '@/app/routesConfig';
import toast from 'react-hot-toast';

const GROUPS = [
  { value: 'MAIN', label: 'MAIN' },
  { value: 'MASTERS', label: 'MASTERS' },
  { value: 'PRODUCT_MASTERS', label: 'PRODUCT MASTERS' },
];

export default function MenuManager() {
  const qc = useQueryClient();

  const menusQ = useQuery(['ui-menus'], () => api.getUIMenus(), {
    select: (r) => Array.isArray(r?.data?.data) ? r.data.data : [],
  });

  // Build initial rows: prefer server menus; fallback to config if server empty
  const initialRows = useMemo(() => {
    const fromServer = menusQ.data || [];
    if (fromServer.length) return flattenMenus(fromServer);
    return [...PRIMARY, ...MASTERS, ...PRODUCT_MASTERS].map((m, i) => ({
      key: m.key, label: m.label, path: m.path, perm: m.perm || null, group: 'MAIN', order: i + 1, parent_key: null,
    }));
  }, [menusQ.data]);

  const [rows, setRows] = useState([]);
  const [groupFilter, setGroupFilter] = useState('ALL');
  React.useEffect(() => { setRows(initialRows); }, [initialRows]);

  const sortedRows = useMemo(() => {
    const arr = rows.filter((r) => groupFilter === 'ALL' || (r.group || 'MAIN') === groupFilter);
    return arr.sort((a, b) => {
      if ((a.group || '') !== (b.group || '')) return (a.group || '').localeCompare(b.group || '');
      if ((a.parent_key || '') !== (b.parent_key || '')) return (a.parent_key || '').localeCompare(b.parent_key || '');
      return (Number(a.order || 0) - Number(b.order || 0));
    });
  }, [rows]);

  const addRow = () => setRows((prev) => ([...prev, { key: '', label: '', path: '', perm: '', group: 'MAIN', order: (prev.length + 1), parent_key: '' }]));
  const addChild = (parentKey) => setRows((prev) => ([...prev, { key: '', label: '', path: '', perm: '', group: 'MAIN', order: (prev.length + 1), parent_key: parentKey }]));
  const delRow = (idx) => setRows((prev) => prev.filter((_, i) => i !== idx));
  const update = (idx, key, val) => setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [key]: val } : r)));

  const saveMutation = useMutation((payload) => upsertMenus(payload), {
    onSuccess: () => {
      toast.success('Menus saved');
      qc.invalidateQueries(['ui-menus']);
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Save failed'),
  });

  const removeMutation = useMutation((key) => deleteMenu(key), {
    onSuccess: () => {
      toast.success('Menu deleted');
      qc.invalidateQueries(['ui-menus']);
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Delete failed'),
  });

  const save = () => {
    // validate keys and labels
    const keyPattern = /^[a-z0-9_\-]+$/i;
    const bad = rows.find((r) => !r.key || !r.label || !keyPattern.test(String(r.key)));
    if (bad) return toast.error('Key (alphanumeric/_/-) and label are required');
    // cycle guard (no parent loops)
    const parentMap = new Map(rows.map((r) => [String(r.key), String(r.parent_key || '')]));
    const hasCycle = () => {
      for (const k of parentMap.keys()) {
        const seen = new Set();
        let cur = k;
        while (parentMap.get(cur)) {
          const p = parentMap.get(cur);
          if (p === k) return true;
          if (seen.has(p)) break;
          seen.add(p);
          cur = p;
        }
      }
      return false;
    };
    if (hasCycle()) return toast.error('Invalid nesting detected (cycle in parent hierarchy)');
    // normalize blanks to null
    const items = rows.map((r) => ({
      key: String(r.key).trim(),
      label: String(r.label).trim(),
      path: String(r.path || '').trim(),
      perm: String(r.perm || '').trim() || null,
      group: r.group || 'MAIN',
      order: Number(r.order || 0) || 0,
      parent_key: String(r.parent_key || '').trim() || null,
    }));
    saveMutation.mutate(items);
  };

  const moveRow = (rowKey, dir = 'up') => {
    setRows((prev) => {
      const byKey = new Map(prev.map((r) => [r.key, r]));
      const row = byKey.get(rowKey);
      if (!row) return prev;
      const siblings = prev
        .filter((r) => (r.group || 'MAIN') === (row.group || 'MAIN') && (String(r.parent_key || '') === String(row.parent_key || '')))
        .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
      const idx = siblings.findIndex((s) => s.key === rowKey);
      if (idx < 0) return prev;
      const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= siblings.length) return prev;
      const a = siblings[idx];
      const b = siblings[targetIdx];
      const aOrder = Number(a.order || 0);
      const bOrder = Number(b.order || 0);
      // swap orders
      a.order = bOrder; b.order = aOrder;
      return prev.map((r) => (r.key === a.key ? { ...a } : r.key === b.key ? { ...b } : r));
    });
  };

  const indentRow = (rowKey) => {
    setRows((prev) => {
      const list = [...prev];
      const idx = list.findIndex((r) => r.key === rowKey);
      if (idx <= 0) return prev;
      const row = { ...list[idx] };
      // make previous sibling (same group and same parent) the new parent
      const siblings = list
        .filter((r) => (r.group || 'MAIN') === (row.group || 'MAIN') && String(r.parent_key || '') === String(row.parent_key || ''))
        .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
      const sIdx = siblings.findIndex((s) => s.key === rowKey);
      if (sIdx <= 0) return prev;
      const newParent = siblings[sIdx - 1];
      row.parent_key = newParent.key;
      // place at end under new parent
      const maxOrder = Math.max(0, ...list.filter((r) => (r.group || 'MAIN') === (row.group || 'MAIN') && String(r.parent_key || '') === newParent.key).map((r) => Number(r.order || 0)));
      row.order = maxOrder + 1;
      list[idx] = row;
      return list;
    });
  };

  const outdentRow = (rowKey) => {
    setRows((prev) => {
      const list = [...prev];
      const idx = list.findIndex((r) => r.key === rowKey);
      if (idx < 0) return prev;
      const row = { ...list[idx] };
      if (!row.parent_key) return prev;
      const parent = list.find((r) => r.key === row.parent_key);
      // move to parent's parent
      const newParentKey = parent ? parent.parent_key || null : null;
      row.parent_key = newParentKey;
      const maxOrder = Math.max(0, ...list.filter((r) => (r.group || 'MAIN') === (row.group || 'MAIN') && String(r.parent_key || '') === String(newParentKey || '')).map((r) => Number(r.order || 0)));
      row.order = maxOrder + 1;
      list[idx] = row;
      return list;
    });
  };

  const deleteOne = (key) => {
    if (!key) return;
    removeMutation.mutate(key);
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 2 }}>Menu Manager</Typography>

      {menusQ.isLoading && <CircularProgress />}
      {menusQ.error && <Alert severity="error">Failed to load menus</Alert>}

      {!menusQ.isLoading && (
        <>
          <Box sx={{ mb: 1, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <Button startIcon={<Add />} onClick={addRow}>Add Menu</Button>
            <Button variant="contained" onClick={save} disabled={saveMutation.isLoading}>
              {saveMutation.isLoading ? 'Saving…' : 'Save'}
            </Button>
            <Button
              variant="outlined"
              onClick={async () => {
                try {
                  // Build seed from menuConfig groups
                  const fromConfig = [
                    ...PRIMARY.map((m, i) => ({ key: m.key, label: m.label, path: m.path, perm: m.perm || null, group: 'MAIN', order: 1 + i, parent_key: null })),
                    ...MASTERS.map((m, i) => ({ key: m.key, label: m.label, path: m.path, perm: m.perm || null, group: 'MASTERS', order: 10 + i + 1, parent_key: null })),
                    ...PRODUCT_MASTERS.map((m, i) => ({ key: m.key, label: m.label, path: m.path, perm: m.perm || null, group: 'PRODUCT_MASTERS', order: 20 + i + 1, parent_key: null })),
                  ];

                  // Build seed from routeMeta (skip dynamic routes and utility paths)
                  const mastersSet = new Set(['branches','customers','suppliers','users','roles','settings','menu-access','abac-policies']);
                  const pmSet = new Set(['products','categories','manufacturers','uom','dosage-forms','racks','std-discounts']);

                  const fromRoutes = (routeMeta || [])
                    .filter(r => r?.path && !r.path.includes(':') && !['/','/login','/403','/404'].includes(r.path))
                    .map((r, idx) => {
                      const seg = String(r.path).split('/').filter(Boolean)[0] || '';
                      const group = mastersSet.has(seg) ? 'MASTERS' : (pmSet.has(seg) ? 'PRODUCT_MASTERS' : 'MAIN');
                      const perm = Array.isArray(r.any) && r.any.length ? String(r.any[0]) : null;
                      const key = (seg || String(r.title || '').toLowerCase().replace(/\s+/g,'_')) || `route_${idx}`;
                      const label = r.title || seg || key;
                      const order = group === 'MAIN' ? 50 + idx : group === 'MASTERS' ? 150 + idx : 250 + idx;
                      return { key, label, path: r.path, perm, group, order, parent_key: null };
                    });

                  // Merge by key, prefer items with path
                  const map = new Map();
                  const put = (o) => {
                    if (!o || !o.key) return;
                    const ex = map.get(o.key);
                    if (!ex) { map.set(o.key, o); return; }
                    const hasPath = !!String(o.path || '').trim();
                    const exPath = !!String(ex.path || '').trim();
                    if (hasPath && !exPath) map.set(o.key, { ...ex, ...o });
                  };
                  [...fromConfig, ...fromRoutes].forEach(put);
                  const items = Array.from(map.values());

                  await upsertMenus(items);
                  toast.success('Seeded menus from existing features');
                  qc.invalidateQueries(['ui-menus']);
                } catch (e) {
                  toast.error(e?.response?.data?.message || 'Seeding features failed');
                }
              }}
            >
              Seed All Features
            </Button>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Group Filter</InputLabel>
              <Select value={groupFilter} label="Group Filter" onChange={(e) => setGroupFilter(e.target.value)}>
                <MItem value="ALL">All</MItem>
                {GROUPS.map((g) => (<MItem key={g.value} value={g.value}>{g.label}</MItem>))}
              </Select>
            </FormControl>
          </Box>

          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell width="16%">Key</TableCell>
                  <TableCell width="18%">Label</TableCell>
                  <TableCell width="22%">Path</TableCell>
                  <TableCell width="18%">Permission</TableCell>
                  <TableCell width="12%">Group</TableCell>
                  <TableCell width="14%">Parent</TableCell>
                  <TableCell width="8%">Order</TableCell>
                  <TableCell align="right" width="12%">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedRows.map((r, idx) => (
                  <TableRow key={idx}>
                    <TableCell><TextField size="small" fullWidth value={r.key} onChange={(e) => update(idx, 'key', e.target.value)} /></TableCell>
                    <TableCell><TextField size="small" fullWidth value={r.label} onChange={(e) => update(idx, 'label', e.target.value)} /></TableCell>
                    <TableCell><TextField size="small" fullWidth value={r.path} onChange={(e) => update(idx, 'path', e.target.value)} /></TableCell>
                    <TableCell><TextField size="small" fullWidth value={r.perm || ''} onChange={(e) => update(idx, 'perm', e.target.value)} placeholder="e.g. inventory:read" /></TableCell>
                    <TableCell>
                      <FormControl size="small" fullWidth>
                        <Select value={r.group || 'MAIN'} onChange={(e) => update(idx, 'group', e.target.value)}>
                          {GROUPS.map((g) => (<MItem key={g.value} value={g.value}>{g.label}</MItem>))}
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell>
                      <FormControl size="small" fullWidth>
                        <Select
                          value={r.parent_key || ''}
                          onChange={(e) => update(idx, 'parent_key', e.target.value)}
                          displayEmpty
                          renderValue={(v) => v || '(none)'}
                        >
                          <MItem value="">(none)</MItem>
                          {sortedRows
                            .filter((opt) => opt.key && opt.key !== r.key)
                            .map((opt) => (
                              <MItem key={opt.key} value={opt.key}>{opt.key}</MItem>
                            ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell><TextField size="small" type="number" fullWidth value={r.order || 0} onChange={(e) => update(idx, 'order', e.target.value)} /></TableCell>
                    <TableCell align="right">
                      <IconButton onClick={() => addChild(r.key)} size="small" title="Add child"><Add fontSize="small" /></IconButton>
                      <IconButton onClick={() => indentRow(r.key)} size="small" title="Indent (make child)"><FormatIndentIncrease fontSize="small" /></IconButton>
                      <IconButton onClick={() => outdentRow(r.key)} size="small" title="Outdent (promote)"><FormatIndentDecrease fontSize="small" /></IconButton>
                      <IconButton onClick={() => moveRow(r.key, 'up')} size="small" title="Move up"><ArrowUpward fontSize="small" /></IconButton>
                      <IconButton onClick={() => moveRow(r.key, 'down')} size="small" title="Move down"><ArrowDownward fontSize="small" /></IconButton>
                      <IconButton onClick={() => deleteOne(r.key)} size="small" title="Delete"><Delete /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {sortedRows.length === 0 && (<TableRow><TableCell colSpan={7} align="center">No menus</TableCell></TableRow>)}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Box>
  );
}
