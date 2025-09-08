// In frontend/src/components/PurchaseFormModal.jsx

import React, { useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Grid,
  MenuItem,
  CircularProgress,
  Autocomplete,
  Box,
  Typography,
  IconButton,
  Divider
} from '@mui/material';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { useQuery } from 'react-query';
import { Add, Delete } from '@mui/icons-material';
import { api } from '@shared/api';
import toast from 'react-hot-toast';

const PurchaseFormModal = ({ open, onClose, onSubmit, isLoading }) => {
  const { control, handleSubmit, reset, watch, setValue } = useForm({
    defaultValues: {
      invoice_number: '',
      invoice_date: new Date().toISOString().split('T')[0],
      branch_id: '',
      supplier_id: '',
      notes: '',
      items: [{ product_id: null, batch_number: '', expiry_date: '', quantity: 1, free_qty: 0, purchase_price: 0, mrp: 0, scheme_discount_percentage: 0, cash_discount_percentage: 0, gst_percentage: 12 }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items"
  });

  // Fetch data for dropdowns
  const { data: branchesData } = useQuery('branches', () => api.getBranches());
  const { data: suppliersData } = useQuery('suppliers', () => api.getSuppliers());
  const { data: productsData, isLoading: isLoadingProducts } = useQuery('products', () => api.getProducts({ limit: 1000 }));

  const branches = branchesData?.data?.data || [];
  const suppliers = suppliersData?.data?.data || [];
  const products = productsData?.data?.data || [];

  useEffect(() => {
    if (open) {
      reset(); // Always reset to a blank form when opening
    }
  }, [open, reset]);

  const handleFormSubmit = (data) => {
    const submissionData = {
        ...data,
        items: data.items.map(item => ({
            ...item,
            product_id: item.product_id.id,
            quantity: Number(item.quantity),
            free_qty: Number(item.free_qty) || 0,
            purchase_price: Number(item.purchase_price),
            mrp: Number(item.mrp),
            scheme_discount_percentage: Number(item.scheme_discount_percentage) || 0,
            cash_discount_percentage: Number(item.cash_discount_percentage) || 0,
            gst_percentage: Number(item.gst_percentage),
        }))
    };
    onSubmit(submissionData);
  };
  
  const watchedItems = watch('items');
  const totals = watchedItems.reduce((acc, item) => {
      const basePrice = (Number(item.quantity) || 0) * (Number(item.purchase_price) || 0);
      const schemeDiscount = basePrice * ((Number(item.scheme_discount_percentage) || 0) / 100);
      const cashDiscount = (basePrice - schemeDiscount) * ((Number(item.cash_discount_percentage) || 0) / 100);
      const taxableAmount = basePrice - schemeDiscount - cashDiscount;
      const taxOnItem = taxableAmount * ((Number(item.gst_percentage) || 0) / 100);
      
      acc.total_amount += basePrice;
      acc.total_discount += schemeDiscount + cashDiscount;
      acc.total_tax += taxOnItem;
      return acc;
  }, { total_amount: 0, total_discount: 0, total_tax: 0 });

  const netAmount = totals.total_amount - totals.total_discount + totals.total_tax;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
      <DialogTitle>New Purchase Entry</DialogTitle>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1, mb: 2 }}>
            <Grid item xs={12} sm={4}><Controller name="invoice_number" control={control} rules={{ required: true }} render={({ field }) => <TextField {...field} label="Supplier Invoice #" fullWidth required />}/></Grid>
            <Grid item xs={12} sm={4}><Controller name="invoice_date" control={control} rules={{ required: true }} render={({ field }) => <TextField {...field} label="Invoice Date" type="date" fullWidth required InputLabelProps={{ shrink: true }} />}/></Grid>
            <Grid item xs={12} sm={4}><Controller name="branch_id" control={control} rules={{ required: true }} render={({ field }) => <TextField {...field} select label="Branch" fullWidth required><MenuItem value=""><em>Select Branch</em></MenuItem>{branches.map(b => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}</TextField>}/></Grid>
            <Grid item xs={12} sm={4}><Controller name="supplier_id" control={control} rules={{ required: true }} render={({ field }) => <TextField {...field} select label="Supplier" fullWidth required><MenuItem value=""><em>Select Supplier</em></MenuItem>{suppliers.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}</TextField>}/></Grid>
          </Grid>

          <Divider sx={{ my: 2 }}><Typography>Purchase Items</Typography></Divider>

          {fields.map((field, index) => (
            <Grid container spacing={1} key={field.id} sx={{ mb: 2, alignItems: 'center' }}>
              <Grid item xs={12} md={2.5}><Controller name={`items.${index}.product_id`} control={control} rules={{ required: true }} render={({ field: controllerField }) => ( <Autocomplete {...controllerField} options={products} getOptionLabel={(option) => option.name || ''} isOptionEqualToValue={(option, value) => option.id === value.id} loading={isLoadingProducts} onChange={(e, value) => { controllerField.onChange(value); setValue(`items.${index}.purchase_price`, value ? value.purchase_price : 0); setValue(`items.${index}.mrp`, value ? value.mrp : 0); setValue(`items.${index}.gst_percentage`, value ? value.gst_percentage : 12); }} renderInput={(params) => <TextField {...params} label="Product" required />} /> )}/></Grid>
              <Grid item xs={6} md={1}><Controller name={`items.${index}.batch_number`} control={control} rules={{ required: true }} render={({ field }) => <TextField {...field} label="Batch #" fullWidth required />} /></Grid>
              <Grid item xs={6} md={1.5}><Controller name={`items.${index}.expiry_date`} control={control} rules={{ required: true }} render={({ field }) => <TextField {...field} label="Expiry" type="date" fullWidth required InputLabelProps={{ shrink: true }} />} /></Grid>
              <Grid item xs={6} md={0.7}><Controller name={`items.${index}.quantity`} control={control} rules={{ required: true, min: 1 }} render={({ field }) => <TextField {...field} label="Qty" type="number" fullWidth required />} /></Grid>
              <Grid item xs={6} md={0.7}><Controller name={`items.${index}.free_qty`} control={control} render={({ field }) => <TextField {...field} label="Free" type="number" fullWidth />} /></Grid>
              <Grid item xs={6} md={1}><Controller name={`items.${index}.mrp`} control={control} rules={{ required: true, min: 0 }} render={({ field }) => <TextField {...field} label="MRP" type="number" fullWidth required />} /></Grid>
              <Grid item xs={6} md={1.2}><Controller name={`items.${index}.purchase_price`} control={control} rules={{ required: true, min: 0 }} render={({ field }) => <TextField {...field} label="Purchase Price" type="number" fullWidth required />} /></Grid>
              <Grid item xs={6} md={1}><Controller name={`items.${index}.scheme_discount_percentage`} control={control} render={({ field }) => <TextField {...field} label="Scheme %" type="number" fullWidth />} /></Grid>
              <Grid item xs={6} md={1}><Controller name={`items.${index}.cash_discount_percentage`} control={control} render={({ field }) => <TextField {...field} label="Cash Disc %" type="number" fullWidth />} /></Grid>
              <Grid item xs={6} md={1}><Controller name={`items.${index}.gst_percentage`} control={control} rules={{ required: true }} render={({ field }) => <TextField {...field} label="GST %" type="number" fullWidth required />} /></Grid>
              <Grid item xs={12} md={0.4}><IconButton onClick={() => remove(index)} color="error"><Delete /></IconButton></Grid>
            </Grid>
          ))}
          
          <Button startIcon={<Add />} onClick={() => append({ product_id: null, batch_number: '', expiry_date: '', quantity: 1, free_qty: 0, purchase_price: 0, mrp: 0, scheme_discount_percentage: 0, cash_discount_percentage: 0, gst_percentage: 12 })}>
            Add Item
          </Button>

          <Box sx={{mt: 3, display: 'flex', justifyContent: 'flex-end'}}>
              <Box sx={{width: '300px'}}>
                  <Typography variant="body1">Total Amount: ₹{totals.total_amount.toFixed(2)}</Typography>
                  <Typography variant="body1">Total Discount: ₹{totals.total_discount.toFixed(2)}</Typography>
                  <Typography variant="body1">Total Tax: ₹{totals.total_tax.toFixed(2)}</Typography>
                  <Divider sx={{my: 1}}/>
                  <Typography variant="h6">Net Amount: ₹{netAmount.toFixed(2)}</Typography>
              </Box>
          </Box>

        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Create Purchase'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default PurchaseFormModal;
