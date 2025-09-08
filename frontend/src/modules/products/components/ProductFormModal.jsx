// frontend/src/modules/products/components/ProductFormModal.jsx

import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Grid, TextField,
  Box, IconButton, Typography, Accordion, AccordionSummary, AccordionDetails,
  Autocomplete, CircularProgress, Switch, FormControlLabel, Select, MenuItem, InputLabel
} from '@mui/material';
import { AddCircleOutline, Delete, ExpandMore, Settings } from '@mui/icons-material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import { api } from '@shared/api';
import { useDebounce } from 'use-debounce';

// Managers
import RackManagerModal from '@components/RackManagerModal';
import StdDiscountManagerModal from '@components/StdDiscountManagerModal';

/* ===================== Helpers & Builders ===================== */

const newIngredient = () => ({ name: '', strength_value: '', strength_uom: 'mg', key: Date.now() });
const newVariant = () => ({
  id: null,
  sku: '',
  barcode: '',
  is_active: true,
  dosage_form_id: null,
  strength_label: '',
  pack_qty: '',
  pack_uom_id: null,
  mrp: '',
  default_gst_slab_id: null,
  rack_id: null,        // NEW
  std_disc_id: null,    // NEW
  ingredients: [newIngredient()],
  key: Date.now()
});

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const uomNameById = (uoms, id) => (uoms?.find(u => u.id === id)?.name) || '';
const gstLabelById = (gstSlabs, id) => {
  const g = gstSlabs?.find(s => s.id === id);
  return g ? (g.slab_name || (g.percentage != null ? `${g.percentage}%` : '')) : '';
};

// tiny template: {{field}} or {{field||'-'}}
const renderTemplate = (tpl, ctx) => {
  return String(tpl || '').replace(/\{\{([^}]+)\}\}/g, (_, expr) => {
    const [lhs, rhs] = String(expr).split('||').map(s => s.trim());
    const val = lhs.split('.').reduce((acc, k) => (acc && acc[k] !== undefined ? acc[k] : undefined), ctx);
    return (val !== undefined && val !== null && String(val).trim() !== '')
      ? String(val)
      : (rhs !== undefined ? rhs.replace(/^['"]|['"]$/g, '') : '');
  });
};

const computePharmaStrengthLabel = (ings = []) =>
  ings
    .filter(ing => ing.strength_value && ing.strength_uom)
    .map(ing => `${ing.strength_value}${ing.strength_uom}`)
    .join(' + ');

const computeFmcgDisplayLabel = (variant, lookups, settings) => {
  const safeLookups = lookups || { uoms: [], gstSlabs: [] };
  const tpl = settings?.fmcgVariantTitleTemplate || "{{sku||''}} {{pack_qty}}{{uom}} {{gst}}";
  const ctx = {
    sku: variant.sku || '',
    pack_qty: variant.pack_qty || '',
    uom: uomNameById(safeLookups.uoms, variant.pack_uom_id),
    gst: gstLabelById(safeLookups.gstSlabs, variant.default_gst_slab_id)
  };
  return renderTemplate(tpl, ctx).replace(/\s+/g, ' ').trim();
};

/* ===================== Component ===================== */

export default function ProductFormModal({ open, onClose, product }) {
  const queryClient = useQueryClient();
  const [productType, setProductType] = useState(product?.product_type || 'PHARMA');
  const [variants, setVariants] = useState([]);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // ingredient search
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [debouncedIngredientSearch] = useDebounce(ingredientSearch, 300);

  // managers
  const [openRackMgr, setOpenRackMgr] = useState(false);
  const [openDiscMgr, setOpenDiscMgr] = useState(false);

  // If your app tracks active branch, use that here. For now, 1.
  const currentBranchId = 1;

  const isEditing = Boolean(product?.id);

  /* ---------------- Lookups & Settings ---------------- */

  // If you want branch-filtered lookups:
  // const { data: lookups, isLoading: isLoadingLookups } = useQuery(
  //   ['productLookups', currentBranchId],
  //   () => api.getProductLookups({ params: { branch_id: currentBranchId } }),
  //   { staleTime: 5 * 60 * 1000, select: (res) => res.data.data }
  // );
  
  // const { data: lookups, isLoading: isLoadingLookups } = useQuery(
  //   'productLookups',
  //   api.getProductLookups,
  //   { staleTime: 5 * 60 * 1000, select: (res) => res.data.data }
  // );


  // const currentBranchId = 1; // or from context/store
  const { data: lookups, isLoading: isLoadingLookups } = useQuery(
   ['productLookups', currentBranchId],
   () => api.getProductLookups({ branch_id: currentBranchId }),
   { staleTime: 5 * 60 * 1000, select: (res) => res.data.data }
  );

  const { data: settingsResp } = useQuery('settings', api.getSettings, {
    staleTime: 5 * 60 * 1000,
    select: (res) => res.data?.data || {}
  });
  const settings = settingsResp || {};

  const { data: ingredientOptionsRaw, isLoading: isLoadingIngredients } = useQuery(
    ['ingredients', debouncedIngredientSearch],
    () => api.searchIngredients({ search: debouncedIngredientSearch }),
    {
      enabled: !!debouncedIngredientSearch && debouncedIngredientSearch.length > 1,
      select: (res) => res.data.data || []
    }
  );
  const ingredientOptions = Array.isArray(ingredientOptionsRaw) ? ingredientOptionsRaw : [];

  /* ---------------- Init from product / defaults ---------------- */

  useEffect(() => {
    if (isEditing && product?.variants?.length) {
      const mapped = product.variants.map(v => {
        const ings = (v.ingredients && v.ingredients.length)
          ? v.ingredients.map(i => ({ ...i, key: Math.random() }))
          : [newIngredient()];
        return {
          ...v,
          key: v.id ?? Math.random(),
          sku: v.sku ?? '',
          barcode: v.barcode ?? '',
          rack_id: v.rack_id ?? null,           // map NEW
          std_disc_id: v.std_disc_id ?? null,   // map NEW
          ingredients: ings,
          strength_label: v.strength_label ?? computePharmaStrengthLabel(ings),
          pack_qty: v.pack_qty ?? '',
          pack_uom_id: v.pack_uom_id ?? null,
          mrp: v.mrp ?? '',
          default_gst_slab_id: v.default_gst_slab_id ?? null,
          dosage_form_id: v.dosage_form_id ?? null,
          is_active: v.is_active ?? true
        };
      });
      setVariants(mapped);
      setProductType(product.product_type || 'PHARMA');
    } else {
      setVariants([newVariant()]);
      setProductType('PHARMA');
    }
    setSubmitAttempted(false);
  }, [isEditing, product]);

  /* ---------------- Mutations ---------------- */

  const afterSuccess = () => {
    queryClient.invalidateQueries('products');
    if (isEditing) queryClient.invalidateQueries(['product', product.id]);
    toast.success(isEditing ? 'Product updated successfully!' : 'Product created successfully!');
    onClose();
  };

  const { mutate: createProduct, isLoading: isCreating } = useMutation(api.createProduct, {
    onSuccess: afterSuccess,
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to create product.')
  });

  const { mutate: updateProduct, isLoading: isUpdating } =
    useMutation(({ id, data }) => api.updateProduct(id, data), {
      onSuccess: afterSuccess,
      onError: (err) => toast.error(err?.response?.data?.message || 'Failed to update product.')
    });

  /* ---------------- Formik for master fields ---------------- */

  const formik = useFormik({
    initialValues: {
      name: product?.name || '',
      generic_name: product?.generic_name || '',
      manufacturer_id: product?.manufacturer_id || null,
      category_id: product?.category_id || null,
      brand_id: product?.brand_id || null,
      hsn_code: product?.hsn_code || '',
      is_active: product?.is_active ?? true
    },
    validationSchema: Yup.object({
      name: Yup.string().required('Product name is required'),
      manufacturer_id: Yup.number().nullable().required('Manufacturer is required'),
      category_id: Yup.number().nullable().required('Category is required')
    }),
    enableReinitialize: true,
    onSubmit: () => handleSubmit(),
  });

  /* ---------------- Variant-level validation ---------------- */

  const variantErrors = useMemo(() => {
    if (!submitAttempted) return [];
    return variants.map(v => {
      const errs = {};
      if (productType === 'PHARMA' && !v.dosage_form_id) errs.dosage_form_id = 'Dosage form is required';
      if (!toNum(v.pack_qty) || toNum(v.pack_qty) <= 0) errs.pack_qty = 'Pack Qty must be > 0';
      if (!toNum(v.pack_uom_id)) errs.pack_uom_id = 'Pack UOM is required';
      if (!toNum(v.mrp) || toNum(v.mrp) <= 0) errs.mrp = 'MRP must be > 0';
      if (!toNum(v.default_gst_slab_id)) errs.default_gst_slab_id = 'GST Slab is required';
      if (productType === 'PHARMA') {
        const ings = v.ingredients || [];
        if (ings.length < 1) errs.ingredients = 'At least one composition is required';
        ings.forEach((i, idx) => {
          if (!i.name) errs[`ingredients.${idx}.name`] = 'Name required';
          if (!i.strength_value) errs[`ingredients.${idx}.strength_value`] = 'Strength required';
          if (!i.strength_uom) errs[`ingredients.${idx}.strength_uom`] = 'Unit required';
        });
      }
      return errs;
    });
  }, [submitAttempted, variants, productType]);

  const hasAnyVariantError = useMemo(
    () => variantErrors.some(e => Object.keys(e).length > 0),
    [variantErrors]
  );

  const getVariantError = (vIdx, field) => submitAttempted ? variantErrors[vIdx]?.[field] : '';
  const getIngError = (vIdx, iIdx, field) => submitAttempted ? variantErrors[vIdx]?.[`ingredients.${iIdx}.${field}`] : '';

  /* ---------------- Submit ---------------- */

  const handleSubmit = () => {
    setSubmitAttempted(true);

    const masterInvalid = Object.keys(formik.errors).length > 0 || !formik.values.name;
    if (masterInvalid) {
      toast.error('Please fix the highlighted fields.');
      return;
    }

    if (!variants || variants.length < 1) {
      toast.error('Add at least one variant.');
      return;
    }

    if (productType === 'PHARMA') {
      const totalIngs = variants.reduce((n, v) => n + (v.ingredients?.length || 0), 0);
      if (totalIngs < 1) {
        toast.error('Add at least one composition for Pharma products.');
        return;
      }
    }

    if (hasAnyVariantError) {
      toast.error('Please fix the highlighted variant fields.');
      return;
    }

    const cleanedVariants = variants.map(v => {
      const base = {
        id: v.id ?? null,
        sku: (v.sku || '').trim(),
        barcode: (v.barcode || '').trim(),
        is_active: !!v.is_active,
        pack_qty: toNum(v.pack_qty),
        pack_uom_id: toNum(v.pack_uom_id),
        mrp: toNum(v.mrp),
        default_gst_slab_id: toNum(v.default_gst_slab_id),
        rack_id: v.rack_id ? Number(v.rack_id) : null,           // include NEW
        std_disc_id: v.std_disc_id ? Number(v.std_disc_id) : null // include NEW
      };

      if (productType === 'PHARMA') {
        return {
          ...base,
          dosage_form_id: toNum(v.dosage_form_id),
          strength_label: computePharmaStrengthLabel(v.ingredients),
          ingredients: (v.ingredients || []).map(i => ({
            name: i.name, strength_value: i.strength_value, strength_uom: i.strength_uom
          }))
        };
      } else {
        return {
          ...base,
          dosage_form_id: null,
          strength_label: null,
          ingredients: []
        };
      }
    });

    const payload = {
      master: { ...formik.values, product_type: productType },
      variants: cleanedVariants
    };

    if (isEditing) {
      updateProduct({ id: product.id, data: payload });
    } else {
      createProduct(payload);
    }
  };

  /* ---------------- Change helpers ---------------- */

  const setVariantsWith = (updater) => {
    setVariants(prev => {
      const next = updater(prev);
      return next.map(v => ({
        ...v,
        strength_label: productType === 'PHARMA'
          ? computePharmaStrengthLabel(v.ingredients)
          : v.strength_label
      }));
    });
  };

  const handleVariantChange = (index, field, value) => {
    setVariantsWith(prev => {
      const draft = [...prev];
      draft[index] = { ...draft[index], [field]: value };
      return draft;
    });
  };

  const handleIngredientChange = (vIndex, iIndex, field, value) => {
    setVariantsWith(prev => {
      const draft = [...prev];
      const ings = [...draft[vIndex].ingredients];
      ings[iIndex] = { ...ings[iIndex], [field]: value };
      draft[vIndex] = { ...draft[vIndex], ingredients: ings };
      return draft;
    });
  };

  const addIngredient = (vIndex) => {
    setVariantsWith(prev => {
      const draft = [...prev];
      draft[vIndex] = { ...draft[vIndex], ingredients: [...draft[vIndex].ingredients, newIngredient()] };
      return draft;
    });
  };

  const removeIngredient = (vIndex, iIndex) => {
    setVariantsWith(prev => {
      const draft = [...prev];
      const ings = [...draft[vIndex].ingredients];
      if (ings.length > 1) ings.splice(iIndex, 1);
      draft[vIndex] = { ...draft[vIndex], ingredients: ings };
      return draft;
    });
  };

  const addVariant = () => setVariantsWith(prev => ([...prev, newVariant()]));
  const removeVariant = (index) => setVariantsWith(prev => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));

  const handleProductTypeChange = (type) => {
    setProductType(type);
    setSubmitAttempted(false);
    setVariantsWith(prev => prev.map(v =>
      type === 'GENERAL'
        ? { ...v, dosage_form_id: null, ingredients: [newIngredient()] }
        : v
    ));
  };

  const isSaving = isCreating || isUpdating;

  /* ---------------- UI ---------------- */

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>{isEditing ? 'Edit Product' : 'Add New Product'}</DialogTitle>
      <form onSubmit={formik.handleSubmit}>
        <DialogContent>
          {isLoadingLookups ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant="h6">Master Product Details</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <InputLabel shrink>Product Type</InputLabel>
                      <Select
                        fullWidth
                        value={productType}
                        onChange={(e) => handleProductTypeChange(e.target.value)}
                      >
                        <MenuItem value="PHARMA">Pharma (Medicine)</MenuItem>
                        <MenuItem value="GENERAL">FMCG / General</MenuItem>
                      </Select>
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        name="name"
                        label="Product Name"
                        value={formik.values.name}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={!!(formik.touched.name && formik.errors.name)}
                        helperText={formik.touched.name && formik.errors.name}
                      />
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        name="generic_name"
                        label="Generic Name"
                        value={formik.values.generic_name}
                        onChange={formik.handleChange}
                      />
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <Autocomplete
                        options={lookups?.manufacturers || []}
                        getOptionLabel={(o) => o.name}
                        isOptionEqualToValue={(option, value) => option.id === value?.id}
                        value={(lookups?.manufacturers || []).find(m => m.id === formik.values.manufacturer_id) || null}
                        onChange={(_, v) => formik.setFieldValue('manufacturer_id', v?.id ?? null)}
                        renderInput={(p) => (
                          <TextField
                            {...p}
                            label="Manufacturer"
                            error={!!(formik.touched.manufacturer_id && formik.errors.manufacturer_id)}
                            helperText={formik.touched.manufacturer_id && formik.errors.manufacturer_id}
                          />
                        )}
                      />
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <Autocomplete
                        options={lookups?.categories || []}
                        getOptionLabel={(o) => o.name}
                        isOptionEqualToValue={(option, value) => option.id === value?.id}
                        value={(lookups?.categories || []).find(c => c.id === formik.values.category_id) || null}
                        onChange={(_, v) => formik.setFieldValue('category_id', v?.id ?? null)}
                        renderInput={(p) => (
                          <TextField
                            {...p}
                            label="Category"
                            error={!!(formik.touched.category_id && formik.errors.category_id)}
                            helperText={formik.touched.category_id && formik.errors.category_id}
                          />
                        )}
                      />
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <Autocomplete
                        options={lookups?.brands || []}
                        getOptionLabel={(o) => o.name}
                        isOptionEqualToValue={(option, value) => option.id === value?.id}
                        value={(lookups?.brands || []).find(b => b.id === formik.values.brand_id) || null}
                        onChange={(_, v) => formik.setFieldValue('brand_id', v?.id ?? null)}
                        renderInput={(p) => <TextField {...p} label="Brand" />}
                      />
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        name="hsn_code"
                        label="HSN Code"
                        value={formik.values.hsn_code}
                        onChange={formik.handleChange}
                      />
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>

              <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Product Variants</Typography>

              {variants.map((variant, vIndex) => {
                const headerText = productType === 'PHARMA'
                  ? (variant.strength_label || 'New Variant')
                  : (computeFmcgDisplayLabel(variant, lookups, settings) || 'New Variant');

                return (
                  <Accordion key={variant.key || vIndex} defaultExpanded>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Typography>Variant {vIndex + 1}: {headerText}</Typography>
                      {variants.length > 1 && (
                        <IconButton size="small" sx={{ ml: 'auto' }} onClick={() => removeVariant(vIndex)} aria-label="remove-variant">
                          <Delete color="error" />
                        </IconButton>
                      )}
                    </AccordionSummary>

                    <AccordionDetails>
                      <Grid container spacing={2}>
                        {/* SKU (optional) */}
                        <Grid item xs={12} sm={4}>
                          <TextField
                            fullWidth
                            label="SKU (optional)"
                            value={variant.sku || ''}
                            onChange={(e) => handleVariantChange(vIndex, 'sku', e.target.value)}
                          />
                        </Grid>

                        {/* BARCODE (optional) */}
                        <Grid item xs={12} sm={4}>
                          <TextField
                            fullWidth
                            label="Barcode (optional)"
                            value={variant.barcode || ''}
                            onChange={(e) => handleVariantChange(vIndex, 'barcode', e.target.value)}
                          />
                        </Grid>

                        {productType === 'PHARMA' && (
                          <Grid item xs={12} sm={4}>
                            <Autocomplete
                              options={lookups?.dosageForms || []}
                              getOptionLabel={(o) => o.name}
                              isOptionEqualToValue={(option, value) => option.id === value?.id}
                              value={(lookups?.dosageForms || []).find(df => df.id === variant.dosage_form_id) || null}
                              onChange={(_, v) => handleVariantChange(vIndex, 'dosage_form_id', v?.id ?? null)}
                              renderInput={(p) => (
                                <TextField
                                  {...p}
                                  label="Dosage Form"
                                  error={!!getVariantError(vIndex, 'dosage_form_id')}
                                  helperText={getVariantError(vIndex, 'dosage_form_id')}
                                />
                              )}
                            />
                          </Grid>
                        )}

                        <Grid item xs={12} sm={4}>
                          <TextField
                            fullWidth
                            type="number"
                            label="Pack Quantity"
                            value={variant.pack_qty}
                            onChange={(e) => handleVariantChange(vIndex, 'pack_qty', e.target.value)}
                            inputProps={{ min: 1, step: 1 }}
                            error={!!getVariantError(vIndex, 'pack_qty')}
                            helperText={getVariantError(vIndex, 'pack_qty')}
                          />
                        </Grid>

                        <Grid item xs={12} sm={4}>
                          <Autocomplete
                            options={lookups?.uoms || []}
                            getOptionLabel={(o) => o.name}
                            isOptionEqualToValue={(option, value) => option.id === value?.id}
                            value={(lookups?.uoms || []).find(u => u.id === variant.pack_uom_id) || null}
                            onChange={(_, v) => handleVariantChange(vIndex, 'pack_uom_id', v?.id ?? null)}
                            renderInput={(p) => (
                              <TextField
                                {...p}
                                label="Pack UOM"
                                error={!!getVariantError(vIndex, 'pack_uom_id')}
                                helperText={getVariantError(vIndex, 'pack_uom_id')}
                              />
                            )}
                          />
                        </Grid>

                        <Grid item xs={12} sm={4}>
                          <TextField
                            fullWidth
                            type="number"
                            label="MRP"
                            value={variant.mrp}
                            onChange={(e) => handleVariantChange(vIndex, 'mrp', e.target.value)}
                            inputProps={{ min: 0.01, step: 0.01 }}
                            error={!!getVariantError(vIndex, 'mrp')}
                            helperText={getVariantError(vIndex, 'mrp')}
                          />
                        </Grid>

                        <Grid item xs={12} sm={4}>
                          <Autocomplete
                            options={lookups?.gstSlabs || []}
                            getOptionLabel={(o) => o.slab_name}
                            isOptionEqualToValue={(option, value) => option.id === value?.id}
                            value={(lookups?.gstSlabs || []).find(g => g.id === variant.default_gst_slab_id) || null}
                            onChange={(_, v) => handleVariantChange(vIndex, 'default_gst_slab_id', v?.id ?? null)}
                            renderInput={(p) => (
                              <TextField
                                {...p}
                                label="Default GST"
                                error={!!getVariantError(vIndex, 'default_gst_slab_id')}
                                helperText={getVariantError(vIndex, 'default_gst_slab_id')}
                              />
                            )}
                          />
                        </Grid>

                        {/* Rack (optional) + Manage */}
                        <Grid item xs={12} sm={4}>
                          <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                            Rack (optional)
                            <IconButton
                              size="small"
                              sx={{ ml: 1 }}
                              onClick={() => setOpenRackMgr(true)}
                              title="Manage Racks"
                            >
                              <Settings fontSize="small" />
                            </IconButton>
                          </Typography>
                          <Autocomplete
                            options={(lookups?.racks || []).map(r => ({
                              id: r.id,
                              label: r.rack_name ? `${r.rack_code} — ${r.rack_name}` : r.rack_code
                            }))}
                            getOptionLabel={(o) => o.label || ''}
                            isOptionEqualToValue={(option, value) => option.id === value?.id}
                            value={(lookups?.racks || [])
                              .map(r => ({ id: r.id, label: r.rack_name ? `${r.rack_code} — ${r.rack_name}` : r.rack_code }))
                              .find(x => x.id === variants[vIndex].rack_id) || null}
                            onChange={(_, v) => handleVariantChange(vIndex, 'rack_id', v?.id ?? null)}
                            renderInput={(p) => <TextField {...p} placeholder="Select Rack" />}
                          />
                        </Grid>

                        {/* Standard Discount (optional) + Manage */}
                        <Grid item xs={12} sm={4}>
                          <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                            Standard Discount (optional)
                            <IconButton
                              size="small"
                              sx={{ ml: 1 }}
                              onClick={() => setOpenDiscMgr(true)}
                              title="Manage Standard Discounts"
                            >
                              <Settings fontSize="small" />
                            </IconButton>
                          </Typography>
                          <Autocomplete
                            options={(lookups?.stdDiscounts || []).map(d => ({
                              id: d.id,
                              label: d.name ? `${d.name} (${d.percentage}%)` : `${d.percentage}%`
                            }))}
                            getOptionLabel={(o) => o.label || ''}
                            isOptionEqualToValue={(option, value) => option.id === value?.id}
                            value={(lookups?.stdDiscounts || [])
                              .map(d => ({ id: d.id, label: d.name ? `${d.name} (${d.percentage}%)` : `${d.percentage}%` }))
                              .find(x => x.id === variants[vIndex].std_disc_id) || null}
                            onChange={(_, v) => handleVariantChange(vIndex, 'std_disc_id', v?.id ?? null)}
                            renderInput={(p) => <TextField {...p} placeholder="Select Standard Discount" />}
                          />
                        </Grid>

                        <Grid item xs={12} sm={4}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={!!variant.is_active}
                                onChange={(e) => handleVariantChange(vIndex, 'is_active', e.target.checked)}
                              />
                            }
                            label="Variant Active"
                          />
                        </Grid>

                        {productType === 'PHARMA' && (
                          <>
                            <Grid item xs={12}>
                              <Typography
                                sx={{ mt: 2 }}
                                variant="subtitle1"
                                color={getVariantError(vIndex, 'ingredients') ? 'error' : 'inherit'}
                              >
                                Composition {getVariantError(vIndex, 'ingredients') ? `– ${getVariantError(vIndex, 'ingredients')}` : ''}
                              </Typography>
                            </Grid>

                            {variant.ingredients.map((ing, iIndex) => (
                              <Grid item container xs={12} spacing={2} key={ing.key || `${vIndex}-${iIndex}`} alignItems="center">
                                <Grid item xs={5}>
                                  <Autocomplete
                                    freeSolo
                                    options={ingredientOptions}
                                    inputValue={ing.name}
                                    onInputChange={(_, newValue) => {
                                      handleIngredientChange(vIndex, iIndex, 'name', newValue);
                                      setIngredientSearch(newValue);
                                    }}
                                    renderInput={(params) => (
                                      <TextField
                                        {...params}
                                        label="Ingredient Name"
                                        error={!!getIngError(vIndex, iIndex, 'name')}
                                        helperText={getIngError(vIndex, iIndex, 'name')}
                                        InputProps={{
                                          ...params.InputProps,
                                          endAdornment: (
                                            <>
                                              {isLoadingIngredients ? <CircularProgress color="inherit" size={20} /> : null}
                                              {params.InputProps.endAdornment}
                                            </>
                                          ),
                                        }}
                                      />
                                    )}
                                  />
                                </Grid>

                                <Grid item xs={3}>
                                  <TextField
                                    fullWidth
                                    type="number"
                                    label="Strength Value"
                                    value={ing.strength_value}
                                    onChange={(e) => handleIngredientChange(vIndex, iIndex, 'strength_value', e.target.value)}
                                    error={!!getIngError(vIndex, iIndex, 'strength_value')}
                                    helperText={getIngError(vIndex, iIndex, 'strength_value')}
                                  />
                                </Grid>

                                <Grid item xs={3}>
                                  <TextField
                                    fullWidth
                                    label="Unit (e.g., mg, ml)"
                                    value={ing.strength_uom}
                                    onChange={(e) => handleIngredientChange(vIndex, iIndex, 'strength_uom', e.target.value)}
                                    error={!!getIngError(vIndex, iIndex, 'strength_uom')}
                                    helperText={getIngError(vIndex, iIndex, 'strength_uom')}
                                  />
                                </Grid>

                                <Grid item xs={1}>
                                  {variant.ingredients.length > 1 && (
                                    <IconButton onClick={() => removeIngredient(vIndex, iIndex)} aria-label="remove-ingredient">
                                      <Delete />
                                    </IconButton>
                                  )}
                                </Grid>
                              </Grid>
                            ))}

                            <Grid item xs={12}>
                              <Button onClick={() => addIngredient(vIndex)}>Add Ingredient</Button>
                            </Grid>
                          </>
                        )}
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                );
              })}

              <Button startIcon={<AddCircleOutline />} onClick={addVariant} sx={{ mt: 2 }}>
                Add Another Variant
              </Button>
            </>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSaving}
            onClick={() => setSubmitAttempted(true)}
          >
            {isSaving ? <CircularProgress size={24} /> : 'Save Product'}
          </Button>
        </DialogActions>
      </form>

      {/* Managers (open after clicking the gear next to each field) */}
      <RackManagerModal
        open={openRackMgr}
        onClose={() => {
          setOpenRackMgr(false);
          // refresh lookups so new/edited racks show up immediately 
          queryClient.invalidateQueries(['productLookups', currentBranchId]);

        }}
        branchId={currentBranchId}
      />

      <StdDiscountManagerModal
        open={openDiscMgr}
        onClose={() => {
          setOpenDiscMgr(false);
          // refresh lookups so new/edited discounts show up immediately
          queryClient.invalidateQueries(['productLookups', currentBranchId]);
        }}
        branchId={currentBranchId}
      />
    </Dialog>
  );
}
