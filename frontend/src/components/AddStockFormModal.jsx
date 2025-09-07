// In frontend/src/components/AddStockFormModal.jsx

import React, { useEffect, useState } from 'react';
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
  Autocomplete
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { useQuery } from 'react-query';
import { useDebounce } from 'use-debounce';
import { api } from '../services/api';
import { useAuth } from '@/contexts/AuthContext';

const AddStockFormModal = ({ open, onClose, onSubmit, isLoading }) => {
  const { currentBranch } = useAuth();
  const { control, handleSubmit, reset, setValue, watch, formState } = useForm({
    mode: 'onChange',
    defaultValues: {
      product_id: null,
      variant_id: null,
      branch_id: '',
      supplier_id: '',
      batch_number: '',
      manufacturing_date: '',
      expiry_date: '',
      quantity: '',
      purchase_price: '',
      mrp: '',
      selling_price: '',
    }
  });

  // Watch the selected product to auto-fill pricing info
  const selectedProduct = watch('product_id');
  const selectedVariant = watch('variant_id');

  // Fetch data for dropdowns
  // Server-side product search (debounced)
  const [productSearch, setProductSearch] = useState('');
  const [debouncedProductSearch] = useDebounce(productSearch, 300);
  const { data: productsData, isLoading: isLoadingProducts } = useQuery(
    ['products-add-stock', debouncedProductSearch],
    () => api.getProducts({ limit: 50, search: debouncedProductSearch }),
    { keepPreviousData: true }
  );
  const { data: branchesData, isLoading: isLoadingBranches } = useQuery('branches', () => api.getBranches());
  const { data: suppliersData, isLoading: isLoadingSuppliers } = useQuery('suppliers', () => api.getSuppliers());

  const products = productsData?.data?.data || [];
  const branches = branchesData?.data?.data || [];
  const suppliers = suppliersData?.data?.data || [];

  // Load product variants when a product is selected
  const [variantOptions, setVariantOptions] = React.useState([]);
  const [variantSearch, setVariantSearch] = useState('');
  useEffect(() => {
    (async () => {
      if (!selectedProduct?.id) {
        setVariantOptions([]);
        setValue('variant_id', null);
        setVariantSearch('');
        return;
      }
      try {
        const res = await api.getProductById(selectedProduct.id);
        const data = res?.data?.data;
        const variants = data?.variants || data?.product?.variants || [];
        setVariantOptions(variants);
        // Auto-select first variant if only one
        if (variants.length === 1) setValue('variant_id', variants[0]);
      } catch {
        setVariantOptions([]);
        setValue('variant_id', null);
      }
    })();
  }, [selectedProduct, setValue]);

  // Auto-fill pricing when a variant is selected (if backend provided mrp)
  useEffect(() => {
    if (selectedVariant) {
      if (selectedVariant.mrp != null) setValue('mrp', selectedVariant.mrp);
      if (selectedVariant.mrp != null && !selectedVariant.selling_price) setValue('selling_price', selectedVariant.mrp);
    }
  }, [selectedVariant, setValue]);

  useEffect(() => {
    if (!open) {
      reset(); // Reset form when modal closes
    }
  }, [open, reset]);

  // Default branch to currentBranch when opening the modal
  useEffect(() => {
    if (open && currentBranch?.id) {
      setValue('branch_id', currentBranch.id);
    }
  }, [open, currentBranch, setValue]);

  const handleFormSubmit = (data) => {
    // Ensure product_id is just the ID
    const submissionData = {
      ...data,
      product_id: data.product_id?.id, // not required by API but keep if needed downstream
      variant_id: data.variant_id?.id || data.variant_id, // required by API
      branch_id: Number(data.branch_id),
      supplier_id: data.supplier_id ? Number(data.supplier_id) : undefined,
      quantity: Number(data.quantity),
      purchase_price: Number(data.purchase_price),
      mrp: Number(data.mrp),
      selling_price: Number(data.selling_price),
      // normalize dates to YYYY-MM-DD
      manufacturing_date: data.manufacturing_date || undefined,
      expiry_date: data.expiry_date,
    };
    onSubmit(submissionData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Add New Stock</DialogTitle>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            
          <Grid item xs={12}>
              <Controller
                name="product_id"
                control={control}
                rules={{ required: 'Product is required' }}
                render={({ field, fieldState }) => (
                  <Autocomplete
                    {...field}
                    options={products}
                    getOptionLabel={(option) => option?.name ? `${option.name}${option.generic_name ? ' — ' + option.generic_name : ''}` : ''}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    loading={isLoadingProducts}
                    onChange={(e, value) => field.onChange(value)}
                    onInputChange={(_, value) => setProductSearch(value)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Select Product"
                        required
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {isLoadingProducts ? <CircularProgress color="inherit" size={20} /> : null}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                  />
                )}
              />
            </Grid>

          {variantOptions.length > 0 && (
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Scan/Enter SKU or Barcode (optional)"
                value={variantSearch}
                onChange={(e) => {
                  const v = e.target.value;
                  setVariantSearch(v);
                  if (!v) return;
                  const lower = v.toString().trim().toLowerCase();
                  const match = variantOptions.find(
                    (opt) =>
                      (opt?.sku && String(opt.sku).toLowerCase() === lower) ||
                      (opt?.barcode && String(opt.barcode).toLowerCase() === lower)
                  );
                  if (match) setValue('variant_id', match);
                }}
                placeholder="e.g. SKU123 or barcode"
                sx={{ mb: 1 }}
              />
              <Controller
                name="variant_id"
                control={control}
                rules={{ required: 'Variant is required' }}
                render={({ field, fieldState }) => (
                  <Autocomplete
                    {...field}
                    options={variantOptions}
                    getOptionLabel={(o) => o?.sku ? `${o.sku}` : (o?.id ? `Variant #${o.id}` : '')}
                    isOptionEqualToValue={(option, value) => option.id === value?.id}
                    onChange={(e, value) => field.onChange(value)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Select Variant"
                        required
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                      />
                    )}
                  />
                )}
              />
            </Grid>
          )}

            <Grid item xs={12} sm={6}>
              <Controller name="branch_id" control={control} rules={{ required: true }} render={({ field }) => (
                <TextField {...field} select label="Branch" fullWidth required disabled={isLoadingBranches}>
                  {branches.map((branch) => (<MenuItem key={branch.id} value={branch.id}>{branch.name}</MenuItem>))}
                </TextField>
              )} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller name="supplier_id" control={control} render={({ field }) => (
                <TextField {...field} select label="Supplier (Optional)" fullWidth disabled={isLoadingSuppliers}>
                  {suppliers.map((supplier) => (<MenuItem key={supplier.id} value={supplier.id}>{supplier.name}</MenuItem>))}
                </TextField>
              )} />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller name="batch_number" control={control} rules={{ required: 'Batch number is required' }} render={({ field, fieldState }) => (<TextField {...field} label="Batch Number" fullWidth required error={!!fieldState.error} helperText={fieldState.error?.message} />)} />
            </Grid>
            <Grid item xs={12} sm={3}>
              <Controller
                name="manufacturing_date"
                control={control}
                rules={{
                  validate: (v) => {
                    if (!v) return true;
                    const m = new Date(v);
                    if (Number.isNaN(m.getTime())) return 'Invalid date';
                    return true;
                  }
                }}
                render={({ field, fieldState }) => (
                  <TextField {...field} label="Mfg. Date" type="date" InputLabelProps={{ shrink: true }} fullWidth error={!!fieldState.error} helperText={fieldState.error?.message || 'Optional'} />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <Controller
                name="expiry_date"
                control={control}
                rules={{
                  required: 'Expiry date is required',
                  validate: (v) => {
                    const e = new Date(v);
                    if (!v || Number.isNaN(e.getTime())) return 'Invalid date';
                    const mfg = watch('manufacturing_date');
                    if (mfg) {
                      const m = new Date(mfg);
                      if (!Number.isNaN(m.getTime()) && e < m) return 'Expiry must be after manufacturing date';
                    }
                    return true;
                  }
                }}
                render={({ field, fieldState }) => (
                  <TextField {...field} label="Expiry Date" type="date" InputLabelProps={{ shrink: true }} fullWidth required error={!!fieldState.error} helperText={fieldState.error?.message} />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={3}>
              <Controller
                name="quantity"
                control={control}
                rules={{ required: true, min: 1 }}
                render={({ field }) => (
                  <TextField {...field} label="Quantity" type="number" inputProps={{ min: 1, step: 1 }} fullWidth required />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <Controller
                name="purchase_price"
                control={control}
                rules={{ required: true, min: 0 }}
                render={({ field }) => (
                  <TextField {...field} label="Purchase Price" type="number" inputProps={{ min: 0, step: 0.01 }} fullWidth required />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <Controller
                name="mrp"
                control={control}
                rules={{ required: true, min: 0 }}
                render={({ field }) => (
                  <TextField {...field} label="MRP" type="number" inputProps={{ min: 0, step: 0.01 }} fullWidth required />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <Controller
                name="selling_price"
                control={control}
                rules={{ required: true, min: 0 }}
                render={({ field }) => (
                  <TextField {...field} label="Selling Price" type="number" inputProps={{ min: 0, step: 0.01 }} fullWidth required />
                )}
              />
            </Grid>

            {/* Preview totals */}
            <Grid item xs={12}>
              {(() => {
                const qty = Number(watch('quantity') || 0);
                const pp = Number(watch('purchase_price') || 0);
                const sp = Number(watch('selling_price') || 0);
                const cost = qty * pp;
                const revenue = qty * sp;
                return (
                  <div style={{ display: 'flex', gap: 24, opacity: 0.85 }}>
                    <span>Est. Cost: {cost.toFixed(2)}</span>
                    <span>Est. Revenue: {revenue.toFixed(2)}</span>
                  </div>
                );
              })()}
            </Grid>

          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={isLoading || !formState.isValid}>
            {isLoading ? 'Saving...' : 'Add Stock'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default AddStockFormModal;
