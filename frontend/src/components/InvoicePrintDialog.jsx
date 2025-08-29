import React, { useEffect, useRef } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, Divider, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material';

const fmtMoney = (n) => `₹${Number(n || 0).toFixed(2)}`;
const fmtExpiry = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${mm}/${yy}`;
};

export default function InvoicePrintDialog({
  open,
  onClose,
  onPrinted,
  invoiceNumber,
  branch,
  customer,
  items,
  totals,
  paymentMethod,
}) {
  const areaRef = useRef(null);

  // print css scoped to dialog
  const css = `
    @media print {
      body * { visibility: hidden; }
      #print-area, #print-area * { visibility: visible; }
      #print-area { position: absolute; left: 0; top: 0; width: 100%; }
      .no-print { display: none !important; }
      .print-table th, .print-table td { border: 1px solid #000; padding: 6px; }
    }
  `;

  const handlePrint = async () => {
    // open print dialog
    window.print();
    // when dialog closes (user printed or canceled), we still clear the screen
    onPrinted?.();
  };

  useEffect(() => {
    // auto-open once it appears after sale
    // You can disable auto print if you want a manual click only
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <style>{css}</style>

      <DialogTitle>Invoice Preview</DialogTitle>
      <DialogContent dividers>
        <Box id="print-area" ref={areaRef}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="h6">Invoice: {invoiceNumber}</Typography>
            <Typography variant="body2">Date: {new Date().toLocaleString()}</Typography>
          </Box>
          <Typography variant="body2">
            <strong>Branch:</strong> {branch?.name || branch?.id || '—'}
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Customer:</strong> {customer ? `${customer.first_name} ${customer.last_name} (${customer.phone})` : 'Walk-in'}
          </Typography>
          <Divider sx={{ my: 1 }} />

          <Table size="small" className="print-table">
            <TableHead>
              <TableRow>
                <TableCell>Product</TableCell>
                <TableCell>Batch</TableCell>
                <TableCell>Expiry</TableCell>
                <TableCell align="right">MRP</TableCell>
                <TableCell align="right">Price</TableCell>
                <TableCell align="right">Disc%</TableCell>
                <TableCell align="right">GST%</TableCell>
                <TableCell align="center">Qty</TableCell>
                <TableCell align="right">Line Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((i) => {
                const base = Number(i.selling_price || 0) * Number(i.quantity || 0);
                const lt = base * (1 - Number(i.discount_percentage || 0) / 100);
                return (
                  <TableRow key={i.stock_id}>
                    <TableCell>{i.product_name}</TableCell>
                    <TableCell>{i.batch_number}</TableCell>
                    <TableCell>{fmtExpiry(i.expiry_date)}</TableCell>
                    <TableCell align="right">{fmtMoney(i.mrp)}</TableCell>
                    <TableCell align="right">{fmtMoney(i.selling_price)}</TableCell>
                    <TableCell align="right">{Number(i.discount_percentage || 0).toFixed(2)}</TableCell>
                    <TableCell align="right">{Number(i.gst_percentage || 0).toFixed(2)}</TableCell>
                    <TableCell align="center">{i.quantity}</TableCell>
                    <TableCell align="right">{fmtMoney(lt)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <Divider sx={{ my: 1 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography>Payment Method: {paymentMethod?.toUpperCase?.() || '—'}</Typography>
            <Box>
              <Typography>Total: {fmtMoney(totals?.totalAmount)}</Typography>
              <Typography variant="h6">Final: {fmtMoney(totals?.finalAmount)}</Typography>
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button variant="contained" onClick={handlePrint} startIcon={<span className="no-print">🖨️</span>}>
          Print Invoice
        </Button>
      </DialogActions>
    </Dialog>
  );
}
