import React, { useMemo, useState } from 'react';
import {
  Box, Card, CardHeader, CardContent, Grid, TextField,
  Button, IconButton, Table, TableHead, TableRow, TableCell,
  TableBody, TableContainer, TablePagination, Chip, Tooltip, Stack,
  Switch, MenuItem, Select, InputLabel, FormControl
} from '@mui/material';
import { Add, Edit, FileDownload, CloudUpload } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import { api } from '@shared/api';
import { useNavigate } from 'react-router-dom';
import MfgBrandModal from '@features/manufacturers/components/MfgBrandModal';

function toCSV(rows) {
  const esc = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const out = [headers.map(esc).join(',')];
  for (const r of rows) out.push(headers.map(h => esc(r[h])).join(','));
  return out.join('\r\n');
}

export default function MfgBrandManager() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  // filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);

  // paging
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);

  // modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // fetch list
  const { data, isLoading } = useQuery(
    ['mfg-brands', { search, page: page + 1, limit, includeInactive }],
    () => api.getMfgBrands({
      search: search || undefined,
      page: page + 1,
      limit,
      include_inactive: includeInactive
    }),
    { keepPreviousData: true, select: (res) => res?.data }
  );
  const rows = data?.data || [];
  const total = data?.pagination?.total || 0;

  // categories from current page data
  const categoryOptions = useMemo(() => {
    const set = new Set(rows.map(r => r.category).filter(Boolean));
    return Array.from(set);
  }, [rows]);

  // toggle active (cascade)
  const { mutate: toggleActive, isLoading: toggling } = useMutation(
    ({ id, is_active }) => api.toggleMfgActive(id, is_active),
    {
      onSuccess: () => {
        toast.success('Status updated');
        qc.invalidateQueries(['mfg-brands']);
      },
      onError: (e) => toast.error(e?.response?.data?.message || 'Failed to update status')
    }
  );

  const onAdd = () => { setEditingId(null); setModalOpen(true); };
  const onEdit = (row) => { setEditingId(row.id); setModalOpen(true); };

  // download tidy CSV (one brand per row)
  const handleDownloadCSV = async () => {
    const resp = await api.getMfgBrands({ page: 1, limit: 5000, include_inactive: true, search: search || undefined });
    const list = resp?.data?.data || [];
    const tidy = [];
    for (const m of list) {
      if ((m.brands || []).length) {
        for (const b of m.brands) {
          tidy.push({
            manufacturer: m.name,
            manufacturer_category: m.category || '',
            manufacturer_active: m.is_active ? '1' : '0',
            brand: b.name,
            brand_active: b.is_active ? '1' : '0',
          });
        }
      } else {
        tidy.push({
          manufacturer: m.name,
          manufacturer_category: m.category || '',
          manufacturer_active: m.is_active ? '1' : '0',
          brand: '',
          brand_active: '',
        });
      }
    }
    const csv = toCSV(tidy);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'manufacturers_brands_tidy.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // client-side category filter
  const filteredRows = useMemo(() => {
    if (!category) return rows;
    return rows.filter(r => (r.category || '') === category);
  }, [rows, category]);

  return (
    <Box>
      <Card sx={{ borderRadius: 3, boxShadow: '0 6px 20px rgba(0,0,0,0.06)' }}>
        <CardHeader
          title="Manufacturers & Brands"
          sx={{ pb: 0.5 }}
          action={
            <Stack direction="row" spacing={1} alignItems="center">
              <Button
                variant="outlined"
                startIcon={<CloudUpload />}
                onClick={() => navigate('/manufacturers/import')}
              >
                Import CSV
              </Button>
              <Button
                variant="outlined"
                startIcon={<FileDownload />}
                onClick={handleDownloadCSV}
              >
                Download CSV
              </Button>
              <Button startIcon={<Add />} variant="contained" onClick={onAdd}>
                Add Manufacturer
              </Button>
            </Stack>
          }
        />
        <CardContent>
          <Grid container spacing={2} sx={{ mb: 1 }}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Search manufacturer or brand"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel id="cat-label">Category</InputLabel>
                <Select
                  labelId="cat-label"
                  label="Category"
                  value={category}
                  onChange={(e) => { setCategory(e.target.value); setPage(0); }}
                >
                  <MenuItem value=""><em>All</em></MenuItem>
                  {categoryOptions.map(c => (
                    <MenuItem key={c} value={c}>{c}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3} sx={{ display: 'flex', alignItems: 'center' }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Switch
                  checked={includeInactive}
                  onChange={(e) => { setIncludeInactive(e.target.checked); setPage(0); }}
                />
                <span style={{ fontSize: 13 }}>Show inactive</span>
              </Stack>
            </Grid>
          </Grid>

          <TableContainer>
            <Table size="small" sx={{ '& tbody tr:hover': { backgroundColor: 'rgba(0,0,0,0.02)' } }}>
              <TableHead>
                <TableRow>
                  <TableCell>Manufacturer</TableCell>
                  <TableCell width={220}>Category</TableCell>
                  <TableCell>Brands</TableCell>
                  <TableCell width={140} align="center">Status</TableCell>
                  <TableCell width={180} align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5}>Loading…</TableCell></TableRow>
                ) : filteredRows.length === 0 ? (
                  <TableRow><TableCell colSpan={5}>No records found.</TableCell></TableRow>
                ) : filteredRows.map((row) => {
                  const brands = (row.brands || []);
                  return (
                    <TableRow key={row.id} hover>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>{row.category || '-'}</TableCell>
                      <TableCell sx={{ whiteSpace: 'normal' }}>
                        {brands.length
                          ? brands.map((b, i) => (
                              <span
                                key={b.id || i}
                                style={{
                                  color: b.is_active ? undefined : '#d32f2f',
                                  fontWeight: b.is_active ? 400 : 600
                                }}
                              >
                                {b.name}{i < brands.length - 1 ? ', ' : ''}
                              </span>
                            ))
                          : '-'}
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          size="small"
                          label={row.is_active ? 'Active' : 'Inactive'}
                          color={row.is_active ? 'success' : 'default'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Tooltip title="Edit manufacturer & brands">
                            <IconButton size="small" onClick={() => onEdit(row)}>
                              <Edit fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={row.is_active ? 'Deactivate (cascade)' : 'Activate (cascade)'}>
                            <span>
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => toggleActive({ id: row.id, is_active: !row.is_active })}
                                disabled={toggling}
                              >
                                {row.is_active ? 'Deactivate' : 'Activate'}
                              </Button>
                            </span>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={limit}
            onRowsPerPageChange={(e) => { setLimit(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[10, 20, 50, 100]}
          />
        </CardContent>
      </Card>

      {modalOpen && (
        <MfgBrandModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          editingId={editingId}
        />
      )}
    </Box>
  );
}



