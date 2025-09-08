import React, { useMemo, useEffect } from 'react';
import {
  Box, Grid, Typography, Divider, Table, TableHead, TableRow, TableCell, TableBody, Paper
} from '@mui/material';
import { useParams, useLocation } from 'react-router-dom';
import { useQuery } from 'react-query';
import { api } from '@shared/api';

const nf = (x) => { const n = Number(x); return Number.isFinite(n) ? n : 0; };
const money = (n) => `₹${nf(n).toFixed(2)}`;
const fmtDateTime = (iso) => { if (!iso) return '—'; const d = new Date(iso); return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString(); };
const fmtExpiry = (iso) => { if (!iso) return '—'; const d = new Date(iso); if (Number.isNaN(d.getTime())) return '—'; const mm = String(d.getMonth()+1).padStart(2,'0'); const yy = String(d.getFullYear()).slice(-2); return `${mm}/${yy}`; };
const txt = (v, fb = '—') => {
  if (v == null) return fb;
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v);
  const cand = v.value ?? v.name ?? v.label ?? v.title ?? v.code ?? v.slug ?? null;
  return cand != null ? String(cand) : fb;
};

export default function InvoicePrint() {
  const { id } = useParams();
  const location = useLocation();
  const autoPrint = new URLSearchParams(location.search).get('print') === '1';

  const { data, isLoading, error } = useQuery(['saleDetails', id], () => api.getSaleDetails(id), { enabled: !!id });

  const sale = data?.data?.data || data?.data || {};
  const items = sale.items || sale.sale_items || [];
  const branch = sale.branch || sale.branch_details || {};
  const org = sale.organization || sale.org || {};
  const customer = sale.customer || sale.customer_details || {};
  const cashier = sale.cashier || sale.cashier_details || {};

  const totals = useMemo(() => {
    if (sale?.totals) {
      return {
        taxable: nf(sale.totals.taxable ?? sale.totals.subtotal ?? sale.total_amount),
        gst: nf(sale.totals.gst ?? sale.tax_amount),
        grand: nf(sale.totals.grand ?? sale.final_amount ?? sale.total_amount),
      };
    }
    let taxable = 0, gst = 0;
    for (const it of items) {
      const qty = nf(it.quantity);
      const price = nf(it.selling_price ?? it.unit_price ?? it.price ?? it.mrp);
      const discP = nf(it.discount_percentage);
      const taxP = nf(it.tax_percentage ?? it.gst_percentage);
      const base = qty * price * (1 - discP / 100);
      taxable += base;
      gst += base * (taxP / 100);
    }
    return { taxable, gst, grand: taxable + gst };
  }, [sale, items]);

  useEffect(() => {
    if (autoPrint && !isLoading && !error) {
      const t = setTimeout(() => window.print(), 250);
      return () => clearTimeout(t);
    }
  }, [autoPrint, isLoading, error]);

  if (isLoading) return <Box p={2}><Typography>Loading invoice…</Typography></Box>;
  if (error) return <Box p={2}><Typography color="error">Failed to load invoice.</Typography></Box>;

  return (
    <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #invoice, #invoice * { visibility: visible; }
          #invoice { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>

      <Paper id="invoice" elevation={0} sx={{ width: '210mm', maxWidth: '100%', p: 3, background: '#fff', color: '#000', fontSize: 13 }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            {txt(org.name || branch.org_name || branch.company_name || 'INVOICE')}
          </Typography>
          <Typography sx={{ whiteSpace: 'pre-line' }}>
            {[
              txt(branch.name || '—'),
              [branch.address_line1, branch.address_line2, branch.city, branch.state, branch.pincode].filter(Boolean).map(txt).join(', '),
              `Phone: ${txt(branch.phone || branch.mobile || org.phone || '—')}`
            ].filter(Boolean).join('\n')}
          </Typography>
          <Typography>
            {`GSTIN: ${txt(branch.gst_number || branch.gstin || org.gstin || '—')}`}
            {`  ·  DL No: ${txt(branch.drug_license_no || branch.dl_no || '—')}`}
          </Typography>
        </Box>

        <Divider sx={{ my: 1.5 }} />

        <Grid container spacing={2} sx={{ mb: 1 }}>
          <Grid item xs={7}>
            <Typography sx={{ fontWeight: 600, mb: 0.5 }}>Bill To</Typography>
            <Typography>{txt(`${txt(customer.first_name, '')} ${txt(customer.last_name, '')}`.trim() || 'Walk-in Customer')}</Typography>
            <Typography>{`Phone: ${txt(customer.phone || '—')}`}</Typography>
            {customer.gstin ? <Typography>{`GSTIN: ${txt(customer.gstin)}`}</Typography> : null}
          </Grid>
          <Grid item xs={5}>
            <Typography>{`Invoice #: ${txt(sale.invoice_number)}`}</Typography>
            <Typography>{`Date: ${fmtDateTime(sale.sale_date || sale.created_at)}`}</Typography>
            <Typography>{`Cashier: ${txt(cashier.name || sale.cashier_name || '—')}`}</Typography>
            <Typography>{`Branch: ${txt(branch.name || '—')}`}</Typography>
          </Grid>
        </Grid>

        <Table size="small" sx={{ mt: 1, borderTop: '1px solid #ddd', borderBottom: '1px solid #ddd' }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 28 }}>#</TableCell>
              <TableCell>Product</TableCell>
              <TableCell>Batch</TableCell>
              <TableCell>Expiry</TableCell>
              <TableCell align="right">MRP</TableCell>
              <TableCell align="right">Price</TableCell>
              <TableCell align="right">Disc%</TableCell>
              <TableCell align="right">GST%</TableCell>
              <TableCell align="right">Qty</TableCell>
              <TableCell align="right">Line Total</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((it, idx) => {
              const qty = nf(it.quantity);
              const price = nf(it.selling_price ?? it.unit_price ?? it.price ?? it.mrp);
              const discP = nf(it.discount_percentage);
              const gstP = nf(it.tax_percentage ?? it.gst_percentage);
              const base = qty * price * (1 - discP / 100);
              const total = base * (1 + gstP / 100);
              return (
                <TableRow key={it.id ?? idx}>
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell>
                    <div style={{ fontWeight: 600 }}>{txt(it.product_name || it.name)}</div>
                    {it.sku ? <div style={{ fontSize: 11, color: '#666' }}>{txt(it.sku)}</div> : null}
                  </TableCell>
                  <TableCell>{txt(it.batch_number || it.batch || 'NA')}</TableCell>
                  <TableCell>{fmtExpiry(it.expiry_date)}</TableCell>
                  <TableCell align="right">{money(it.mrp)}</TableCell>
                  <TableCell align="right">{money(price)}</TableCell>
                  <TableCell align="right">{nf(discP).toFixed(2)}</TableCell>
                  <TableCell align="right">{nf(gstP).toFixed(2)}</TableCell>
                  <TableCell align="right">{nf(qty).toFixed(2).replace(/\.00$/, '')}</TableCell>
                  <TableCell align="right">{money(total)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        <Box sx={{ mt: 2, ml: 'auto', width: 300 }}>
          <Grid container>
            <Grid item xs={6}><Typography>Subtotal (Taxable)</Typography></Grid>
            <Grid item xs={6} textAlign="right"><Typography>{money(totals.taxable)}</Typography></Grid>
            <Grid item xs={6}><Typography>GST</Typography></Grid>
            <Grid item xs={6} textAlign="right"><Typography>{money(totals.gst)}</Typography></Grid>
            <Grid item xs={12}><Divider sx={{ my: 1 }} /></Grid>
            <Grid item xs={6}><Typography variant="h6" sx={{ fontWeight: 700 }}>Grand Total</Typography></Grid>
            <Grid item xs={6} textAlign="right"><Typography variant="h6" sx={{ fontWeight: 700 }}>{money(totals.grand)}</Typography></Grid>
          </Grid>
          {sale?.final_amount != null && nf(sale.final_amount) !== nf(totals.grand) ? (
            <Typography variant="caption" color="text.secondary">
              (Recorded final amount: {money(sale.final_amount)})
            </Typography>
          ) : null}
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography variant="body2">
          Thank you for shopping with {txt(branch.name || org.name || 'us')}. Goods once sold will not be taken back.
          All disputes subject to {txt(branch.city || branch.state || 'store jurisdiction')}.
        </Typography>
      </Paper>
    </Box>
  );
}








// import React, { useMemo, useEffect } from 'react';
// import {
//   Box, Grid, Typography, Divider, Table, TableHead, TableRow, TableCell, TableBody, Paper
// } from '@mui/material';
// import { useParams, useLocation } from 'react-router-dom';
// import { useQuery } from 'react-query';
// import api from '../services/api';

// const nf = (x) => {
//   const n = Number(x);
//   return Number.isFinite(n) ? n : 0;
// };
// const money = (n) => `₹${nf(n).toFixed(2)}`;
// const fmtDateTime = (iso) => {
//   if (!iso) return '—';
//   const d = new Date(iso);
//   return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
// };
// const fmtExpiry = (iso) => {
//   if (!iso) return '—';
//   const d = new Date(iso);
//   if (Number.isNaN(d.getTime())) return '—';
//   const mm = String(d.getMonth() + 1).padStart(2, '0');
//   const yy = String(d.getFullYear()).slice(-2);
//   return `${mm}/${yy}`;
// };
// // Safely turn any possibly-object value into a string for Typography
// const txt = (v, fallback = '—') => {
//   if (v == null) return fallback;
//   if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v);
//   // common object shapes: { value }, { name }, { label }, etc.
//   const cand = v.value ?? v.name ?? v.label ?? v.title ?? v.code ?? v.slug ?? null;
//   return cand != null ? String(cand) : fallback;
// };

// export default function InvoicePrint() {
//   const { id } = useParams();
//   const location = useLocation();
//   const autoPrint = new URLSearchParams(location.search).get('print') === '1';

//   const { data, isLoading, error } = useQuery(
//     ['saleDetails', id],
//     () => api.getSaleDetails(id),
//     { enabled: !!id }
//   );

//   const sale = data?.data?.data || data?.data || {};
//   const items = sale.items || sale.sale_items || [];
//   const branch = sale.branch || sale.branch_details || {};
//   const org = sale.organization || sale.org || {};
//   const customer = sale.customer || sale.customer_details || {};
//   const cashier = sale.cashier || sale.cashier_details || {};

//   // compute totals if backend didn’t send
//   const totals = useMemo(() => {
//     if (sale?.totals) {
//       return {
//         taxable: nf(sale.totals.taxable ?? sale.totals.subtotal ?? sale.total_amount),
//         gst: nf(sale.totals.gst ?? sale.tax_amount),
//         grand: nf(sale.totals.grand ?? sale.final_amount ?? sale.total_amount),
//       };
//     }
//     let taxable = 0, gst = 0;
//     for (const it of items) {
//       const qty = nf(it.quantity);
//       const price = nf(it.selling_price ?? it.unit_price ?? it.price ?? it.mrp);
//       const discP = nf(it.discount_percentage);
//       const taxP = nf(it.tax_percentage ?? it.gst_percentage);
//       const base = qty * price * (1 - discP / 100);
//       taxable += base;
//       gst += base * (taxP / 100);
//     }
//     return { taxable, gst, grand: taxable + gst };
//   }, [sale, items]);

//   // Print just the invoice area
//   useEffect(() => {
//     if (autoPrint && !isLoading && !error) {
//       // slight delay so fonts/layout settle
//       const t = setTimeout(() => window.print(), 250);
//       return () => clearTimeout(t);
//     }
//   }, [autoPrint, isLoading, error]);

//   if (isLoading) {
//     return <Box p={2}><Typography>Loading invoice…</Typography></Box>;
//   }
//   if (error) {
//     return <Box p={2}><Typography color="error">Failed to load invoice.</Typography></Box>;
//   }

//   return (
//     <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
//       {/* print-only CSS so only #invoice prints */}
//       <style>{`
//         @media print {
//           body * { visibility: hidden; }
//           #invoice, #invoice * { visibility: visible; }
//           #invoice { position: absolute; left: 0; top: 0; width: 100%; }
//         }
//       `}</style>

//       <Paper id="invoice" elevation={0} sx={{
//         width: '210mm', // A4 width
//         maxWidth: '100%',
//         p: 3,
//         background: '#fff',
//         color: '#000',
//         fontSize: 13
//       }}>
//         {/* Header: Org / Branch */}
//         <Box sx={{ mb: 2 }}>
//           <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
//             {txt(org.name || branch.org_name || branch.company_name || 'INVOICE')}
//           </Typography>
//           <Typography sx={{ whiteSpace: 'pre-line' }}>
//             {[
//               txt(branch.name || '—'),
//               [branch.address_line1, branch.address_line2, branch.city, branch.state, branch.pincode]
//                 .filter(Boolean).map(txt).join(', '),
//               `Phone: ${txt(branch.phone || branch.mobile || org.phone || '—')}`
//             ].filter(Boolean).join('\n')}
//           </Typography>
//           <Typography>
//             {`GSTIN: ${txt(branch.gst_number || branch.gstin || org.gstin || '—')}`}
//             {`  ·  DL No: ${txt(branch.drug_license_no || branch.dl_no || '—')}`}
//           </Typography>
//         </Box>

//         <Divider sx={{ my: 1.5 }} />

//         {/* Invoice meta */}
//         <Grid container spacing={2} sx={{ mb: 1 }}>
//           <Grid item xs={7}>
//             <Typography sx={{ fontWeight: 600, mb: 0.5 }}>Bill To</Typography>
//             <Typography>{txt(`${txt(customer.first_name, '')} ${txt(customer.last_name, '')}`.trim() || 'Walk-in Customer')}</Typography>
//             <Typography>{`Phone: ${txt(customer.phone || '—')}`}</Typography>
//             {customer.gstin ? <Typography>{`GSTIN: ${txt(customer.gstin)}`}</Typography> : null}
//           </Grid>
//           <Grid item xs={5}>
//             <Typography>{`Invoice #: ${txt(sale.invoice_number)}`}</Typography>
//             <Typography>{`Date: ${fmtDateTime(sale.sale_date || sale.created_at)}`}</Typography>
//             <Typography>{`Cashier: ${txt(cashier.name || sale.cashier_name || '—')}`}</Typography>
//             <Typography>{`Branch: ${txt(branch.name || '—')}`}</Typography>
//           </Grid>
//         </Grid>

//         {/* Items */}
//         <Table size="small" sx={{ mt: 1, borderTop: '1px solid #ddd', borderBottom: '1px solid #ddd' }}>
//           <TableHead>
//             <TableRow>
//               <TableCell sx={{ width: 28 }}>#</TableCell>
//               <TableCell>Product</TableCell>
//               <TableCell>Batch</TableCell>
//               <TableCell>Expiry</TableCell>
//               <TableCell align="right">MRP</TableCell>
//               <TableCell align="right">Price</TableCell>
//               <TableCell align="right">Disc%</TableCell>
//               <TableCell align="right">GST%</TableCell>
//               <TableCell align="right">Qty</TableCell>
//               <TableCell align="right">Line Total</TableCell>
//             </TableRow>
//           </TableHead>
//           <TableBody>
//             {items.map((it, idx) => {
//               const qty = nf(it.quantity);
//               const price = nf(it.selling_price ?? it.unit_price ?? it.price ?? it.mrp);
//               const discP = nf(it.discount_percentage);
//               const gstP = nf(it.tax_percentage ?? it.gst_percentage);
//               const base = qty * price * (1 - discP / 100);
//               const total = base * (1 + gstP / 100);
//               return (
//                 <TableRow key={it.id ?? idx}>
//                   <TableCell>{idx + 1}</TableCell>
//                   <TableCell>
//                     <div style={{ fontWeight: 600 }}>{txt(it.product_name || it.name)}</div>
//                     {it.sku ? <div style={{ fontSize: 11, color: '#666' }}>{txt(it.sku)}</div> : null}
//                   </TableCell>
//                   <TableCell>{txt(it.batch_number || it.batch || 'NA')}</TableCell>
//                   <TableCell>{fmtExpiry(it.expiry_date)}</TableCell>
//                   <TableCell align="right">{money(it.mrp)}</TableCell>
//                   <TableCell align="right">{money(price)}</TableCell>
//                   <TableCell align="right">{nf(discP).toFixed(2)}</TableCell>
//                   <TableCell align="right">{nf(gstP).toFixed(2)}</TableCell>
//                   <TableCell align="right">{nf(qty).toFixed(2).replace(/\.00$/, '')}</TableCell>
//                   <TableCell align="right">{money(total)}</TableCell>
//                 </TableRow>
//               );
//             })}
//           </TableBody>
//         </Table>

//         {/* Totals */}
//         <Box sx={{ mt: 2, ml: 'auto', width: 300 }}>
//           <Grid container>
//             <Grid item xs={6}><Typography>Subtotal (Taxable)</Typography></Grid>
//             <Grid item xs={6} textAlign="right"><Typography>{money(totals.taxable)}</Typography></Grid>
//             <Grid item xs={6}><Typography>GST</Typography></Grid>
//             <Grid item xs={6} textAlign="right"><Typography>{money(totals.gst)}</Typography></Grid>
//             <Grid item xs={12}><Divider sx={{ my: 1 }} /></Grid>
//             <Grid item xs={6}><Typography variant="h6" sx={{ fontWeight: 700 }}>Grand Total</Typography></Grid>
//             <Grid item xs={6} textAlign="right"><Typography variant="h6" sx={{ fontWeight: 700 }}>{money(totals.grand)}</Typography></Grid>
//           </Grid>
//           {sale?.final_amount != null && nf(sale.final_amount) !== nf(totals.grand) ? (
//             <Typography variant="caption" color="text.secondary">
//               (Recorded final amount: {money(sale.final_amount)})
//             </Typography>
//           ) : null}
//         </Box>

//         <Divider sx={{ my: 2 }} />

//         <Typography variant="body2">
//           Thank you for shopping with {txt(branch.name || org.name || 'us')}. Goods once sold will not be taken back.  
//           All disputes subject to {txt(branch.city || branch.state || 'store jurisdiction')}.
//         </Typography>
//       </Paper>
//     </Box>
//   );
// }
