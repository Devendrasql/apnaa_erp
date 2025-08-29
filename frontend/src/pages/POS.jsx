import React, { useMemo, useState } from 'react';
import {
  Box, Typography, Grid, Paper, TextField, Autocomplete, CircularProgress,
  Divider, Button, IconButton, Chip, FormControl, InputLabel, Select, MenuItem,
  Stack, Table, TableHead, TableRow, TableCell, TableBody, Tooltip,
} from '@mui/material';
import {
  Add, Remove, Delete, PersonSearch, Face as FaceIcon,
  History as HistoryIcon, Print as PrintIcon, Lock as LockIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useDebounce } from 'use-debounce';
import toast from 'react-hot-toast';

import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import CustomerSearchModal from '../components/CustomerSearchModal';
import FaceCaptureDialog from '../components/FaceCaptureDialog';
import InvoicePrintDialog from '../components/InvoicePrintDialog';
import CustomerHistoryDialog from '../components/CustomerHistoryDialog';

const fmtMoney = (n) => `₹${Number(n || 0).toFixed(2)}`;
const fmtExpiry = (isoDate) => {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return '—';
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${mm}/${yy}`;
};
const sixMonthsAgoISO = () => { const d = new Date(); d.setMonth(d.getMonth() - 6); return d.toISOString().slice(0, 10); };
const todayISO = () => new Date().toISOString().slice(0, 10);

const POSPage = () => {
  const { currentBranch, user, hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);

  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [recognitionLogId, setRecognitionLogId] = useState(null);

  const [faceOpen, setFaceOpen] = useState(false);
  const [faceBusy, setFaceBusy] = useState(false);

  const [frozen, setFrozen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [lastInvoice, setLastInvoice] = useState(null);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyParams, setHistoryParams] = useState(null);

  // Permission: discount edit (from context)
  const canEditDiscount = hasPermission('pos.discount.edit', 'sales.discount.edit', 'discount.edit');

  // === stock search (per-branch stock) ===
  const { data: stockData, isLoading: isLoadingStock } = useQuery(
    ['stockForSale', debouncedSearchTerm, currentBranch?.id],
    () => api.getStock({ search: debouncedSearchTerm, limit: 15, branch_id: currentBranch?.id }),
    { enabled: !!debouncedSearchTerm && !!currentBranch?.id, select: (resp) => resp.data.data || [] }
  );
  const options = stockData || [];

  // number coercion
  const nf = (x, fallback = 0) => {
    const n = Number(x);
    return Number.isFinite(n) ? n : fallback;
  };

  const onSelectStock = (_e, row) => {
    if (!row) return;

    const price =
      nf(row.selling_price, NaN) ||
      nf(row.unit_price, NaN) ||
      nf(row.price, NaN) ||
      nf(row.mrp, 0);

    const mrp = nf(row.mrp, price);
    const gstPct = nf(row.gst_percentage, NaN) || nf(row.tax_percentage, 12);

    const stockId = row.stock_id ?? row.id;
    const existing = cart.find((i) => i.stock_id === stockId);

    const newItem = {
      stock_id: stockId,
      product_id: row.product_id ?? row.variant_id ?? row.id,
      product_name: row.product_name || row.name || '—',
      batch_number: row.batch_number || row.batch || 'NA',
      expiry_date: row.expiry_date || null,

      mrp,
      selling_price: price,
      gst_percentage: gstPct,

      discount_percentage: 0,
      quantity: 1,
      quantity_available: nf(row.quantity_available, 0),
    };

    if (existing) {
      if (existing.quantity + 1 > existing.quantity_available) {
        toast.error(`Only ${existing.quantity_available} available in this batch`);
        return;
      }
      setCart((prev) =>
        prev.map((i) => (i.stock_id === stockId ? { ...i, quantity: i.quantity + 1 } : i))
      );
    } else {
      setCart((prev) => [...prev, newItem]);
    }

    setSearchTerm('');
  };

  const updateQty = (stockId, newQty) => {
    setCart((prev) => {
      const item = prev.find((i) => i.stock_id === stockId);
      if (!item) return prev;
      if (newQty <= 0) return prev.filter((i) => i.stock_id !== stockId);
      if (newQty > item.quantity_available) {
        toast.error(`Only ${item.quantity_available} available in this batch`);
        return prev;
      }
      return prev.map((i) => (i.stock_id === stockId ? { ...i, quantity: newQty } : i));
    });
  };

  const updateDiscount = (stockId, val) => {
    if (!canEditDiscount) {
      toast.error('You do not have permission to edit discounts.');
      return;
    }
    const pct = Math.max(0, Math.min(100, nf(val, 0)));
    setCart((prev) => prev.map((i) => (i.stock_id === stockId ? { ...i, discount_percentage: pct } : i)));
  };

  const lineTotal = (i) => {
    const base = nf(i.selling_price) * nf(i.quantity);
    const afterDisc = base * (1 - nf(i.discount_percentage) / 100);
    return afterDisc;
  };

  const totals = useMemo(() => {
    const totalAmount = cart.reduce((s, i) => s + lineTotal(i), 0);
    const finalAmount = totalAmount;
    return { totalAmount, finalAmount };
  }, [cart]);

  // === Create Sale ===
  const { mutate: createSale, isLoading: isCreatingSale } = useMutation(api.createSale, {
    onSuccess: (response) => {
      const invoice_number = response?.data?.data?.invoice_number;
      toast.success(`Sale completed! Invoice: ${invoice_number}`);

      setFrozen(true);
      setLastInvoice({ invoice_number, timestamp: new Date().toISOString() });
      setPrintOpen(true);

      queryClient.invalidateQueries('dashboardStats');
      queryClient.invalidateQueries(['stockForSale']);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to complete sale.');
    },
  });

  const handleCompleteSale = () => {
    if (!currentBranch?.id) return toast.error('Please select a branch first.');
    if (cart.length === 0) return toast.error('Cart is empty.');
    if (totals.finalAmount <= 0) return toast.error('Total must be greater than 0.');

    const itemsPayload = cart.map((i) => ({
      stock_id: i.stock_id,
      product_id: i.product_id,
      quantity: i.quantity,
      selling_price: Number(i.selling_price ?? 0),
      mrp: Number(i.mrp ?? i.selling_price ?? 0),
      discount_percentage: Number(i.discount_percentage ?? 0),
      tax_percentage: Number(i.gst_percentage ?? 12),
      batch_number: i.batch_number,
      expiry_date: i.expiry_date,
    }));

    createSale({
      branch_id: currentBranch.id,
      customer_id: customer?.id || null,
      items: itemsPayload,
      payment_method: paymentMethod,
      total_amount: Number(totals.totalAmount),
      final_amount: Number(totals.finalAmount),
      face_recognition_log_id: recognitionLogId || null,
    });
  };

  const handlePrinted = () => {
    setCart([]);
    setCustomer(null);
    setPaymentMethod('cash');
    setFrozen(false);
    setRecognitionLogId(null);
    setLastInvoice(null);
    setPrintOpen(false);
  };

  const orgId = currentBranch?.org_id || user?.org_id || user?.organization_id || null;
  const handleFaceCapture = async (imageBase64) => {
    try {
      setFaceBusy(true);
      const { data } = await api.identifyCustomerFace({ imageBase64, org_id: orgId, store_id: currentBranch?.id });
      if (data?.ok && data.customer) {
        setCustomer(data.customer);
        setRecognitionLogId(data.recognition_log_id || null);
        toast.success(`Matched: ${data.customer.first_name} ${data.customer.last_name}`);
      } else {
        setRecognitionLogId(null);
        toast.error('No face match found');
      }
    } catch (e) {
      console.error(e);
      toast.error('Face identify failed');
    } finally {
      setFaceBusy(false);
      setFaceOpen(false);
    }
  };

  const openCustomerHistory = () => {
    if (!customer) return toast.error('Select a customer first');
    setHistoryParams({
      customer_id: customer.id,
      from_date: sixMonthsAgoISO(),
      to_date: todayISO(),
      branch_id: currentBranch?.id || undefined,
    });
    setHistoryOpen(true);
  };

  return (
    <>
      <Box p={2}>
        <Grid container spacing={2}>
          {/* LEFT: product search + cart grid */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>Products</Typography>

              <Autocomplete
                value={null}
                onChange={onSelectStock}
                inputValue={searchTerm}
                onInputChange={(_, v) => setSearchTerm(v)}
                options={options}
                disableClearable
                getOptionLabel={(o) => {
                  const name = o?.product_name || o?.name || '';
                  const batch = o?.batch_number || o?.batch || '—';
                  const mrp = nf(o?.mrp, 0);
                  const sp = nf(o?.selling_price ?? o?.price ?? o?.unit_price, mrp);
                  const qty = nf(o?.quantity_available, 0);
                  const exp = fmtExpiry(o?.expiry_date);
                  return `${name} | Batch ${batch} | MRP ${fmtMoney(mrp)} | Price ${fmtMoney(sp)} | Exp ${exp} | Avl ${qty}`;
                }}
                loading={isLoadingStock}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Search products by name / code"
                    disabled={!currentBranch || frozen}
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {isLoadingStock ? <CircularProgress color="inherit" size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />

              <Divider sx={{ my: 2 }} />

              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Product</TableCell>
                      <TableCell>Batch</TableCell>
                      <TableCell>Expiry</TableCell>
                      <TableCell align="right">MRP</TableCell>
                      <TableCell align="right">Price</TableCell>
                      <TableCell align="right">Disc %</TableCell>
                      <TableCell align="right">GST %</TableCell>
                      <TableCell align="center" sx={{ minWidth: 140 }}>Qty</TableCell>
                      <TableCell align="right">Line Total</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {cart.map((i) => (
                      <TableRow key={i.stock_id} hover>
                        <TableCell>{i.product_name}</TableCell>
                        <TableCell>{i.batch_number}</TableCell>
                        <TableCell>{fmtExpiry(i.expiry_date)}</TableCell>
                        <TableCell align="right">{fmtMoney(i.mrp)}</TableCell>
                        <TableCell align="right">{fmtMoney(i.selling_price)}</TableCell>

                        {/* Discount – controlled by permission */}
                        <TableCell align="right" sx={{ width: 110 }}>
                          <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end">
                            <TextField
                              type="number"
                              size="small"
                              value={i.discount_percentage}
                              onChange={(e) => updateDiscount(i.stock_id, e.target.value)}
                              inputProps={{ min: 0, max: 100, step: 0.5, style: { textAlign: 'right' } }}
                              disabled={!canEditDiscount || frozen}
                              sx={{ width: 80 }}
                            />
                            {!canEditDiscount && (
                              <Tooltip title="You need permission: pos.discount.edit">
                                <span><LockIcon fontSize="small" sx={{ color: 'text.disabled' }} /></span>
                              </Tooltip>
                            )}
                          </Stack>
                        </TableCell>

                        <TableCell align="right">{nf(i.gst_percentage, 0).toFixed(2)}</TableCell>

                        <TableCell align="center">
                          <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
                            <IconButton size="small" onClick={() => updateQty(i.stock_id, i.quantity - 1)} disabled={frozen}><Remove /></IconButton>
                            <Typography>{i.quantity}</Typography>
                            <IconButton size="small" onClick={() => updateQty(i.stock_id, i.quantity + 1)} disabled={frozen}><Add /></IconButton>
                          </Stack>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            Avl: {i.quantity_available}
                          </Typography>
                        </TableCell>

                        <TableCell align="right">{fmtMoney(lineTotal(i))}</TableCell>

                        <TableCell align="center">
                          <Tooltip title="Remove">
                            <span>
                              <IconButton size="small" color="error" onClick={() => updateQty(i.stock_id, 0)} disabled={frozen}>
                                <Delete />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}

                    {cart.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={10} align="center" sx={{ color: 'text.secondary' }}>
                          Cart is empty. Search products above to add them.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Box>
            </Paper>
          </Grid>

          {/* RIGHT: customer + payment + totals */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">Customer</Typography>
                <Stack direction="row" spacing={1}>
                  <Button startIcon={<PersonSearch />} onClick={() => setIsCustomerModalOpen(true)} disabled={frozen}>
                    {customer ? 'Change' : 'Select'}
                  </Button>
                  <Button startIcon={<FaceIcon />} variant="outlined" onClick={() => setFaceOpen(true)} disabled={faceBusy || frozen}>
                    Retrieve by Face
                  </Button>
                </Stack>
              </Box>

              {customer ? (
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                  <Chip
                    label={`${customer.first_name} ${customer.last_name} (${customer.phone})`}
                    onDelete={frozen ? undefined : () => setCustomer(null)}
                    color="primary"
                  />
                  <Tooltip title="Last 6 months invoices">
                    <span>
                      <IconButton size="small" color="primary" onClick={openCustomerHistory} disabled={!customer}>
                        <HistoryIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Stack>
              ) : (
                <Typography sx={{ mt: 1, color: 'text.secondary' }}>Walk-in Customer</Typography>
              )}
            </Paper>

            <Paper sx={{ p: 2, mt: 2 }}>
              <Typography variant="h6">Payment Summary</Typography>

              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Payment Method</InputLabel>
                <Select value={paymentMethod} label="Payment Method" onChange={(e) => setPaymentMethod(e.target.value)} disabled={frozen}>
                  <MenuItem value="cash">Cash</MenuItem>
                  <MenuItem value="card">Card</MenuItem>
                  <MenuItem value="upi">UPI</MenuItem>
                </Select>
              </FormControl>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                <Typography>Total Amount</Typography>
                <Typography>{fmtMoney(totals.totalAmount)}</Typography>
              </Box>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="h5">Final Amount</Typography>
                <Typography variant="h5">{fmtMoney(totals.finalAmount)}</Typography>
              </Box>

              {!frozen ? (
                <Button variant="contained" fullWidth sx={{ mt: 3, py: 1.5 }}
                  disabled={cart.length === 0 || isCreatingSale || !currentBranch}
                  onClick={handleCompleteSale}>
                  {isCreatingSale ? 'Processing...' : 'Complete Sale'}
                </Button>
              ) : (
                <Button variant="contained" color="secondary" startIcon={<PrintIcon />} fullWidth sx={{ mt: 3, py: 1.5 }} onClick={() => setPrintOpen(true)}>
                  Print Invoice
                </Button>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* Customer picker modal */}
      <CustomerSearchModal
        open={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onSelect={(c) => { setCustomer(c); setIsCustomerModalOpen(false); }}
      />

      {/* Face dialog */}
      <FaceCaptureDialog open={faceOpen} onClose={() => setFaceOpen(false)} onCapture={handleFaceCapture} title="Look at the camera" />

      {/* Print dialog */}
      <InvoicePrintDialog
        open={printOpen}
        onClose={() => {}}
        onPrinted={handlePrinted}
        invoiceNumber={lastInvoice?.invoice_number}
        branch={currentBranch}
        customer={customer}
        items={cart}
        totals={totals}
        paymentMethod={paymentMethod}
        frozen={frozen}
      />

      {/* Customer history */}
      <CustomerHistoryDialog open={historyOpen} onClose={() => setHistoryOpen(false)} params={historyParams} />
    </>
  );
};

export default POSPage;





















// import React, { useMemo, useState } from 'react';
// import {
//   Box,
//   Typography,
//   Grid,
//   Paper,
//   TextField,
//   Autocomplete,
//   CircularProgress,
//   Divider,
//   Button,
//   IconButton,
//   Chip,
//   FormControl,
//   InputLabel,
//   Select,
//   MenuItem,
//   Stack,
//   Table,
//   TableHead,
//   TableRow,
//   TableCell,
//   TableBody,
//   Tooltip,
// } from '@mui/material';
// import {
//   Add,
//   Remove,
//   Delete,
//   PersonSearch,
//   Face as FaceIcon,
//   History as HistoryIcon,
//   Print as PrintIcon,
//   Lock as LockIcon,
// } from '@mui/icons-material';
// import { useQuery, useMutation, useQueryClient } from 'react-query';
// import { useDebounce } from 'use-debounce';
// import toast from 'react-hot-toast';

// import api from '../services/api';
// import { useAuth } from '../contexts/AuthContext';
// import CustomerSearchModal from '../components/CustomerSearchModal';
// import FaceCaptureDialog from '../components/FaceCaptureDialog';
// import InvoicePrintDialog from '../components/InvoicePrintDialog';
// import CustomerHistoryDialog from '../components/CustomerHistoryDialog';

// // --- small helpers ---
// const fmtMoney = (n) => `₹${Number(n || 0).toFixed(2)}`;
// const fmtExpiry = (isoDate) => {
//   if (!isoDate) return '—';
//   const d = new Date(isoDate);
//   if (Number.isNaN(d.getTime())) return '—';
//   const mm = String(d.getMonth() + 1).padStart(2, '0');
//   const yy = String(d.getFullYear()).slice(-2);
//   return `${mm}/${yy}`;
// };
// const sixMonthsAgoISO = () => {
//   const d = new Date();
//   d.setMonth(d.getMonth() - 6);
//   return d.toISOString().slice(0, 10);
// };
// const todayISO = () => new Date().toISOString().slice(0, 10);

// // ---- permission helpers ----
// const normalizeRoleName = (r) => String(r || '').toLowerCase().replace(/\s+/g, '_');
// const getUserRoleNames = (user) => {
//   const names = [];
//   if (user?.role) {
//     if (typeof user.role === 'string') names.push(user.role);
//     else if (typeof user.role === 'object' && (user.role.name || user.role.title)) names.push(user.role.name || user.role.title);
//   }
//   if (Array.isArray(user?.roles)) {
//     user.roles.forEach((rr) => {
//       if (typeof rr === 'string') names.push(rr);
//       else if (rr?.name || rr?.title) names.push(rr.name || rr.title);
//     });
//   }
//   return names.map(normalizeRoleName);
// };
// const isElevated = (user) => {
//   const roleNames = getUserRoleNames(user);
//   if (roleNames.some((r) => ['super_admin', 'admin', 'manager', 'system_admin', 'sa'].includes(r))) return true;
//   if (user?.is_admin || user?.isAdmin || user?.isManager) return true;
//   return false;
// };
// const extractPermissionStrings = (maybePerms) => {
//   if (!maybePerms) return [];
//   if (Array.isArray(maybePerms)) {
//     return maybePerms
//       .map((p) => {
//         if (typeof p === 'string') return p;
//         if (typeof p === 'number') return `id:${p}`; // numeric id fallback
//         if (p && typeof p === 'object') return p.key || p.slug || p.name || p.code || p.permission || p.description || '';
//         return '';
//       })
//       .filter(Boolean)
//       .map((s) => s.toLowerCase());
//   }
//   // object map case
//   return Object.values(maybePerms)
//     .filter(Boolean)
//     .map((v) => String(v).toLowerCase());
// };
// const hasPermission = (user, ...candidates) => {
//   if (isElevated(user)) return true; // Admin/Manager override
//   const allStrings = [
//     ...extractPermissionStrings(user?.permissions),
//     ...extractPermissionStrings(user?.granted_permissions),
//     ...extractPermissionStrings(user?.permission_names),
//     ...extractPermissionStrings(user?.scopes),
//     ...extractPermissionStrings(user?.claims),
//   ];
//   const bag = new Set(allStrings);
//   return candidates.some((c) => bag.has(String(c).toLowerCase()));
// };

// const POSPage = () => {
//   const { currentBranch, user } = useAuth();
//   const queryClient = useQueryClient(); // ✅ single declaration

//   const [searchTerm, setSearchTerm] = useState('');
//   const [debouncedSearchTerm] = useDebounce(searchTerm, 300);

//   const [cart, setCart] = useState([]);
//   const [customer, setCustomer] = useState(null);
//   const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

//   const [paymentMethod, setPaymentMethod] = useState('cash');
//   const [recognitionLogId, setRecognitionLogId] = useState(null);

//   // face dialog
//   const [faceOpen, setFaceOpen] = useState(false);
//   const [faceBusy, setFaceBusy] = useState(false);

//   // freeze+print after sale
//   const [frozen, setFrozen] = useState(false);
//   const [printOpen, setPrintOpen] = useState(false);
//   const [lastInvoice, setLastInvoice] = useState(null); // { invoice_number, timestamp }

//   // history dialog
//   const [historyOpen, setHistoryOpen] = useState(false);
//   const [historyParams, setHistoryParams] = useState(null);

//   // Permission: discount edit (accept any of these keys)
//   const canEditDiscount = useMemo(
//     () => hasPermission(user, 'sales.discount.edit', 'pos.discount.edit', 'discount.edit'),
//     [user]
//   );

//   // === stock search (per-branch stock) ===
//   const { data: stockData, isLoading: isLoadingStock } = useQuery(
//     ['stockForSale', debouncedSearchTerm, currentBranch?.id],
//     () =>
//       api.getStock({
//         search: debouncedSearchTerm,
//         limit: 15,
//         branch_id: currentBranch?.id,
//       }),
//     {
//       enabled: !!debouncedSearchTerm && !!currentBranch?.id,
//       select: (resp) => resp.data.data || [],
//     }
//   );
//   const options = stockData || [];

//   // number coercion
//   const nf = (x, fallback = 0) => {
//     const n = Number(x);
//     return Number.isFinite(n) ? n : fallback;
//   };

//   const onSelectStock = (_e, row) => {
//     if (!row) return;

//     const price =
//       nf(row.selling_price, NaN) ||
//       nf(row.unit_price, NaN) ||
//       nf(row.price, NaN) ||
//       nf(row.mrp, 0);

//     const mrp = nf(row.mrp, price);
//     const gstPct = nf(row.gst_percentage, NaN) || nf(row.tax_percentage, 12);

//     const stockId = row.stock_id ?? row.id;
//     const existing = cart.find((i) => i.stock_id === stockId);

//     const newItem = {
//       stock_id: stockId,
//       product_id: row.product_id ?? row.variant_id ?? row.id,
//       product_name: row.product_name || row.name || '—',
//       batch_number: row.batch_number || row.batch || 'NA',
//       expiry_date: row.expiry_date || null,

//       mrp,
//       selling_price: price,
//       gst_percentage: gstPct,

//       discount_percentage: 0,
//       quantity: 1,
//       quantity_available: nf(row.quantity_available, 0),
//     };

//     if (existing) {
//       if (existing.quantity + 1 > existing.quantity_available) {
//         toast.error(`Only ${existing.quantity_available} available in this batch`);
//         return;
//       }
//       setCart((prev) =>
//         prev.map((i) =>
//           i.stock_id === stockId ? { ...i, quantity: i.quantity + 1 } : i
//         )
//       );
//     } else {
//       setCart((prev) => [...prev, newItem]);
//     }

//     setSearchTerm('');
//   };

//   const updateQty = (stockId, newQty) => {
//     setCart((prev) => {
//       const item = prev.find((i) => i.stock_id === stockId);
//       if (!item) return prev;
//       if (newQty <= 0) return prev.filter((i) => i.stock_id !== stockId);
//       if (newQty > item.quantity_available) {
//         toast.error(`Only ${item.quantity_available} available in this batch`);
//         return prev;
//       }
//       return prev.map((i) => (i.stock_id === stockId ? { ...i, quantity: newQty } : i));
//     });
//   };

//   const updateDiscount = (stockId, val) => {
//     if (!canEditDiscount) {
//       toast.error('You do not have permission to edit discounts.');
//       return;
//     }
//     const pct = Math.max(0, Math.min(100, nf(val, 0)));
//     setCart((prev) => prev.map((i) => (i.stock_id === stockId ? { ...i, discount_percentage: pct } : i)));
//   };

//   const lineTotal = (i) => {
//     const base = nf(i.selling_price) * nf(i.quantity);
//     const afterDisc = base * (1 - nf(i.discount_percentage) / 100);
//     return afterDisc; // GST calculation displayed only
//   };

//   const totals = useMemo(() => {
//     const totalAmount = cart.reduce((s, i) => s + lineTotal(i), 0);
//     const finalAmount = totalAmount;
//     return { totalAmount, finalAmount };
//   }, [cart]);

//   // === Create Sale ===
//   const { mutate: createSale, isLoading: isCreatingSale } = useMutation(api.createSale, {
//     onSuccess: (response) => {
//       const invoice_number = response?.data?.data?.invoice_number;
//       toast.success(`Sale completed! Invoice: ${invoice_number}`);

//       setFrozen(true);
//       setLastInvoice({ invoice_number, timestamp: new Date().toISOString() });
//       setPrintOpen(true);

//       queryClient.invalidateQueries('dashboardStats');
//       queryClient.invalidateQueries(['stockForSale']);
//     },
//     onError: (err) => {
//       toast.error(err?.response?.data?.message || 'Failed to complete sale.');
//     },
//   });

//   const handleCompleteSale = () => {
//     if (!currentBranch?.id) return toast.error('Please select a branch first.');
//     if (cart.length === 0) return toast.error('Cart is empty.');
//     if (totals.finalAmount <= 0) return toast.error('Total must be greater than 0.');

//     const itemsPayload = cart.map((i) => ({
//       stock_id: i.stock_id,
//       product_id: i.product_id,
//       quantity: i.quantity,
//       selling_price: Number(i.selling_price ?? 0),
//       mrp: Number(i.mrp ?? i.selling_price ?? 0),
//       discount_percentage: Number(i.discount_percentage ?? 0),
//       tax_percentage: Number(i.gst_percentage ?? 12),
//       batch_number: i.batch_number,
//       expiry_date: i.expiry_date,
//     }));

//     createSale({
//       branch_id: currentBranch.id,
//       customer_id: customer?.id || null,
//       items: itemsPayload,
//       payment_method: paymentMethod,
//       total_amount: Number(totals.totalAmount),
//       final_amount: Number(totals.finalAmount),
//       face_recognition_log_id: recognitionLogId || null,
//     });
//   };

//   // === Print handling ===
//   const handlePrinted = () => {
//     setCart([]);
//     setCustomer(null);
//     setPaymentMethod('cash');
//     setFrozen(false);
//     setRecognitionLogId(null);
//     setLastInvoice(null);
//     setPrintOpen(false);
//   };

//   // === Face identify (POS-local) ===
//   const orgId = currentBranch?.org_id || user?.org_id || user?.organization_id || null;
//   const handleFaceCapture = async (imageBase64) => {
//     try {
//       setFaceBusy(true);
//       const { data } = await api.identifyCustomerFace({
//         imageBase64,
//         org_id: orgId,
//         store_id: currentBranch?.id,
//       });
//       if (data?.ok && data.customer) {
//         setCustomer(data.customer);
//         setRecognitionLogId(data.recognition_log_id || null);
//         toast.success(`Matched: ${data.customer.first_name} ${data.customer.last_name}`);
//       } else {
//         setRecognitionLogId(null);
//         toast.error('No face match found');
//       }
//     } catch (e) {
//       console.error(e);
//       toast.error('Face identify failed');
//     } finally {
//       setFaceBusy(false);
//       setFaceOpen(false);
//     }
//   };

//   // === Customer history ===
//   const openCustomerHistory = () => {
//     if (!customer) return toast.error('Select a customer first');
//     setHistoryParams({
//       customer_id: customer.id,
//       from_date: sixMonthsAgoISO(),
//       to_date: todayISO(),
//       branch_id: currentBranch?.id || undefined,
//     });
//     setHistoryOpen(true);
//   };

//   return (
//     <>
//       <Box p={2}>
//         <Grid container spacing={2}>
//           {/* LEFT: product search + cart grid */}
//           <Grid item xs={12} md={8}>
//             <Paper sx={{ p: 2 }}>
//               <Typography variant="h6" gutterBottom>Products</Typography>

//               <Autocomplete
//                 value={null}
//                 onChange={onSelectStock}
//                 inputValue={searchTerm}
//                 onInputChange={(_, v) => setSearchTerm(v)}
//                 options={options}
//                 disableClearable
//                 getOptionLabel={(o) => {
//                   const name = o?.product_name || o?.name || '';
//                   const batch = o?.batch_number || o?.batch || '—';
//                   const mrp = nf(o?.mrp, 0);
//                   const sp = nf(o?.selling_price ?? o?.price ?? o?.unit_price, mrp);
//                   const qty = nf(o?.quantity_available, 0);
//                   const exp = fmtExpiry(o?.expiry_date);
//                   return `${name} | Batch ${batch} | MRP ${fmtMoney(mrp)} | Price ${fmtMoney(sp)} | Exp ${exp} | Avl ${qty}`;
//                 }}
//                 loading={isLoadingStock}
//                 renderInput={(params) => (
//                   <TextField
//                     {...params}
//                     label="Search products by name / code"
//                     disabled={!currentBranch || frozen}
//                     InputProps={{
//                       ...params.InputProps,
//                       endAdornment: (
//                         <>
//                           {isLoadingStock ? <CircularProgress color="inherit" size={20} /> : null}
//                           {params.InputProps.endAdornment}
//                         </>
//                       ),
//                     }}
//                   />
//                 )}
//               />

//               <Divider sx={{ my: 2 }} />

//               <Box sx={{ overflowX: 'auto' }}>
//                 <Table size="small">
//                   <TableHead>
//                     <TableRow>
//                       <TableCell>Product</TableCell>
//                       <TableCell>Batch</TableCell>
//                       <TableCell>Expiry</TableCell>
//                       <TableCell align="right">MRP</TableCell>
//                       <TableCell align="right">Price</TableCell>
//                       <TableCell align="right">Disc %</TableCell>
//                       <TableCell align="right">GST %</TableCell>
//                       <TableCell align="center" sx={{ minWidth: 140 }}>Qty</TableCell>
//                       <TableCell align="right">Line Total</TableCell>
//                       <TableCell align="center">Actions</TableCell>
//                     </TableRow>
//                   </TableHead>
//                   <TableBody>
//                     {cart.map((i) => (
//                       <TableRow key={i.stock_id} hover>
//                         <TableCell>{i.product_name}</TableCell>
//                         <TableCell>{i.batch_number}</TableCell>
//                         <TableCell>{fmtExpiry(i.expiry_date)}</TableCell>
//                         <TableCell align="right">{fmtMoney(i.mrp)}</TableCell>
//                         <TableCell align="right">{fmtMoney(i.selling_price)}</TableCell>

//                         {/* Discount – editable only with permission */}
//                         <TableCell align="right" sx={{ width: 110 }}>
//                           <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end">
//                             <TextField
//                               type="number"
//                               size="small"
//                               value={i.discount_percentage}
//                               onChange={(e) => updateDiscount(i.stock_id, e.target.value)}
//                               inputProps={{ min: 0, max: 100, step: 0.5, style: { textAlign: 'right' } }}
//                               disabled={!canEditDiscount || frozen}
//                               sx={{ width: 80 }}
//                             />
//                             {!canEditDiscount && (
//                               <Tooltip title="You need permission: sales.discount.edit">
//                                 <span><LockIcon fontSize="small" sx={{ color: 'text.disabled' }} /></span>
//                               </Tooltip>
//                             )}
//                           </Stack>
//                         </TableCell>

//                         <TableCell align="right">{nf(i.gst_percentage, 0).toFixed(2)}</TableCell>

//                         <TableCell align="center">
//                           <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
//                             <IconButton
//                               size="small"
//                               onClick={() => updateQty(i.stock_id, i.quantity - 1)}
//                               disabled={frozen}
//                             >
//                               <Remove />
//                             </IconButton>
//                             <Typography>{i.quantity}</Typography>
//                             <IconButton
//                               size="small"
//                               onClick={() => updateQty(i.stock_id, i.quantity + 1)}
//                               disabled={frozen}
//                             >
//                               <Add />
//                             </IconButton>
//                           </Stack>
//                           <Typography variant="caption" sx={{ color: 'text.secondary' }}>
//                             Avl: {i.quantity_available}
//                           </Typography>
//                         </TableCell>

//                         <TableCell align="right">{fmtMoney(lineTotal(i))}</TableCell>

//                         <TableCell align="center">
//                           <Tooltip title="Remove">
//                             <span>
//                               <IconButton
//                                 size="small"
//                                 color="error"
//                                 onClick={() => updateQty(i.stock_id, 0)}
//                                 disabled={frozen}
//                               >
//                                 <Delete />
//                               </IconButton>
//                             </span>
//                           </Tooltip>
//                         </TableCell>
//                       </TableRow>
//                     ))}

//                     {cart.length === 0 && (
//                       <TableRow>
//                         <TableCell colSpan={10} align="center" sx={{ color: 'text.secondary' }}>
//                           Cart is empty. Search products above to add them.
//                         </TableCell>
//                       </TableRow>
//                     )}
//                   </TableBody>
//                 </Table>
//               </Box>
//             </Paper>
//           </Grid>

//           {/* RIGHT: customer + payment + totals */}
//           <Grid item xs={12} md={4}>
//             <Paper sx={{ p: 2 }}>
//               <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
//                 <Typography variant="h6">Customer</Typography>
//                 <Stack direction="row" spacing={1}>
//                   <Button
//                     startIcon={<PersonSearch />}
//                     onClick={() => setIsCustomerModalOpen(true)}
//                     disabled={frozen}
//                   >
//                     {customer ? 'Change' : 'Select'}
//                   </Button>
//                   <Button
//                     startIcon={<FaceIcon />}
//                     variant="outlined"
//                     onClick={() => setFaceOpen(true)}
//                     disabled={faceBusy || frozen}
//                   >
//                     Retrieve by Face
//                   </Button>
//                 </Stack>
//               </Box>

//               {customer ? (
//                 <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
//                   <Chip
//                     label={`${customer.first_name} ${customer.last_name} (${customer.phone})`}
//                     onDelete={frozen ? undefined : () => setCustomer(null)}
//                     color="primary"
//                   />
//                   <Tooltip title="Last 6 months invoices">
//                     <span>
//                       <IconButton
//                         size="small"
//                         color="primary"
//                         onClick={openCustomerHistory}
//                         disabled={!customer}
//                       >
//                         <HistoryIcon />
//                       </IconButton>
//                     </span>
//                   </Tooltip>
//                 </Stack>
//               ) : (
//                 <Typography sx={{ mt: 1, color: 'text.secondary' }}>Walk-in Customer</Typography>
//               )}
//             </Paper>

//             <Paper sx={{ p: 2, mt: 2 }}>
//               <Typography variant="h6">Payment Summary</Typography>

//               <FormControl fullWidth sx={{ mt: 2 }}>
//                 <InputLabel>Payment Method</InputLabel>
//                 <Select
//                   value={paymentMethod}
//                   label="Payment Method"
//                   onChange={(e) => setPaymentMethod(e.target.value)}
//                   disabled={frozen}
//                 >
//                   <MenuItem value="cash">Cash</MenuItem>
//                   <MenuItem value="card">Card</MenuItem>
//                   <MenuItem value="upi">UPI</MenuItem>
//                 </Select>
//               </FormControl>

//               <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
//                 <Typography>Total Amount</Typography>
//                 <Typography>{fmtMoney(totals.totalAmount)}</Typography>
//               </Box>
//               <Divider sx={{ my: 2 }} />
//               <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
//                 <Typography variant="h5">Final Amount</Typography>
//                 <Typography variant="h5">{fmtMoney(totals.finalAmount)}</Typography>
//               </Box>

//               {!frozen ? (
//                 <Button
//                   variant="contained"
//                   fullWidth
//                   sx={{ mt: 3, py: 1.5 }}
//                   disabled={cart.length === 0 || isCreatingSale || !currentBranch}
//                   onClick={handleCompleteSale}
//                 >
//                   {isCreatingSale ? 'Processing...' : 'Complete Sale'}
//                 </Button>
//               ) : (
//                 <Button
//                   variant="contained"
//                   color="secondary"
//                   startIcon={<PrintIcon />}
//                   fullWidth
//                   sx={{ mt: 3, py: 1.5 }}
//                   onClick={() => setPrintOpen(true)}
//                 >
//                   Print Invoice
//                 </Button>
//               )}
//             </Paper>
//           </Grid>
//         </Grid>
//       </Box>

//       {/* Customer picker modal */}
//       <CustomerSearchModal
//         open={isCustomerModalOpen}
//         onClose={() => setIsCustomerModalOpen(false)}
//         onSelect={(c) => {
//           setCustomer(c);
//           setIsCustomerModalOpen(false);
//         }}
//       />

//       {/* Face dialog */}
//       <FaceCaptureDialog
//         open={faceOpen}
//         onClose={() => setFaceOpen(false)}
//         onCapture={handleFaceCapture}
//         title="Look at the camera"
//       />

//       {/* Print dialog (opens automatically after sale) */}
//       <InvoicePrintDialog
//         open={printOpen}
//         onClose={() => {}}
//         onPrinted={handlePrinted}
//         invoiceNumber={lastInvoice?.invoice_number}
//         branch={currentBranch}
//         customer={customer}
//         items={cart}
//         totals={totals}
//         paymentMethod={paymentMethod}
//         frozen={frozen}
//       />

//       {/* Customer last-6-months history */}
//       <CustomerHistoryDialog
//         open={historyOpen}
//         onClose={() => setHistoryOpen(false)}
//         params={historyParams}
//       />
//     </>
//   );
// };

// export default POSPage;
