// frontend/src/pages/manufacturers/ManufacturerImport.jsx
import React, { useMemo, useState } from 'react';
import {
  Box, Card, CardHeader, CardContent, Button, Stack,
  Table, TableHead, TableRow, TableCell, TableBody, Alert, Typography
} from '@mui/material';
import { CloudUpload } from '@mui/icons-material';
import Papa from 'papaparse';
import { useMutation, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';


const normalizeHeader = (h) => (h || '').toString().trim().toLowerCase();

export default function ManufacturerImport() {
  const [rows, setRows] = useState([]);
  const [errors, setErrors] = useState([]);

  const parseFile = (file) => {
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const parsed = (result.data || []).map((r) => {
          // normalize keys
          const obj = {};
          for (const k of Object.keys(r)) {
            const nk = normalizeHeader(k);
            obj[nk] = r[k];
          }
          return {
            manufacturer: obj['manufacturer']?.trim() || '',
            key_brands: obj['key brands']?.trim() || obj['key_brands']?.trim() || '',
            category: obj['manufacturer category']?.trim() || obj['category']?.trim() || ''
          };
        });

        // basic validation
        const errs = [];
        parsed.forEach((r, i) => {
          if (!r.manufacturer) errs.push(`Row ${i + 2}: Manufacturer is required`);
        });

        setRows(parsed);
        setErrors(errs);
        if (!parsed.length) toast('No rows detected in the file.');
      },
      error: (e) => {
        toast.error('Failed to parse CSV');
        console.error(e);
      }
    });
  };

  const { mutate: doImport, isLoading } = useMutation(
    (payload) => api.importManufacturers(payload),
    {
      onSuccess: (res) => {
        const s = res?.data?.summary;
        toast.success(
          `Imported: ${s?.processed || 0} rows | New Mfg: ${s?.manufacturers_created || 0} | Updated: ${s?.manufacturers_updated || 0} | Brands: ${s?.brands_created || 0}`
        );
        if (s?.details?.length) {
          console.table(s.details);
        }
      },
      onError: (e) => toast.error(e?.response?.data?.message || 'Import failed')
    }
  );

  const sampleCsv = useMemo(
    () => [
      ['Manufacturer', 'Key Brands', 'Manufacturer Category'],
      ['Sun Pharmaceutical Industries', 'Pantocid', 'Pharmaceuticals (Prescription Medicines)'],
      ['Cipla', 'Ciplox', 'Pharmaceuticals (Prescription Medicines)'],
    ].map(r => r.join(',')).join('\n'),
    []
  );

  const handleDownloadSample = () => {
    const blob = new Blob([sampleCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'manufacturers_sample.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const onImport = () => {
    if (!rows.length) return toast.error('No rows to import');
    if (errors.length) return toast.error('Fix validation errors first');
    doImport({ rows });
  };

  return (
    <Box>
      <Card>
        <CardHeader title="Import Manufacturers & Key Brands" />
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <Button variant="outlined" onClick={handleDownloadSample}>Download Sample CSV</Button>
            <Button
              component="label"
              variant="contained"
              startIcon={<CloudUpload />}
            >
              Select CSV
              <input
                type="file"
                accept=".csv"
                hidden
                onChange={(e) => parseFile(e.target.files?.[0])}
              />
            </Button>
            <Box sx={{ flexGrow: 1 }} />
            <Button variant="contained" color="success" onClick={onImport} disabled={isLoading || !rows.length || !!errors.length}>
              Import {rows.length ? `(${rows.length})` : ''}
            </Button>
          </Stack>

          <Typography variant="body2" sx={{ mb: 1 }}>
            Expected columns: <b>Manufacturer</b>, <b>Key Brands</b> (comma/semicolon separated), <b>Manufacturer Category</b>.
          </Typography>

          {!!errors.length && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <b>Validation errors:</b>
              <ul style={{ margin: 0, paddingLeft: '1rem' }}>
                {errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </Alert>
          )}

          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell width={320}>Manufacturer</TableCell>
                <TableCell>Key Brands</TableCell>
                <TableCell width={320}>Manufacturer Category</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={3}>No data loaded.</TableCell></TableRow>
              ) : rows.map((r, i) => (
                <TableRow key={i} hover>
                  <TableCell>{r.manufacturer}</TableCell>
                  <TableCell>{r.key_brands}</TableCell>
                  <TableCell>{r.category}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Box>
  );
}
