// In frontend/src/components/SupplierFormModal.jsx

import React, { useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Grid,
  Switch,
  FormControlLabel,
  InputAdornment,
  IconButton,
  CircularProgress
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { useMutation } from 'react-query';
import toast from 'react-hot-toast';
import { Search } from '@mui/icons-material';
import { api } from '@shared/api';

const SupplierFormModal = ({ open, onClose, onSubmit, supplier, isLoading }) => {
  const { control, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: {
      name: '',
      code: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      gst_number: '',
      drug_license: '',
      is_active: true,
    }
  });

  const gstNumberValue = watch('gst_number');

  useEffect(() => {
    if (open) {
      if (supplier) {
        // Populate form for editing
        Object.keys(supplier).forEach(key => {
            if (key === 'is_active') {
                setValue(key, !!supplier[key]);
            } else {
                setValue(key, supplier[key] || '');
            }
        });
      } else {
        // Reset to default for creating
        reset();
      }
    }
  }, [supplier, open, setValue, reset]);

  // Mutation for fetching GST data
  const { mutate: fetchGstDetails, isLoading: isFetchingGst } = useMutation(
    api.getSupplierByGST,
    {
        onSuccess: (response) => {
            const details = response.data.data;
            toast.success('Supplier details fetched successfully!');
            // Auto-fill the form fields
            setValue('name', details.name, { shouldValidate: true });
            setValue('address', details.address, { shouldValidate: true });
            setValue('city', details.city, { shouldValidate: true });
            setValue('state', details.state, { shouldValidate: true });
            setValue('pincode', details.pincode, { shouldValidate: true });
        },
        // FIX: Improved error handling to show a user-friendly toast notification
        onError: (err) => {
            console.error("GST Fetch Error:", err.response?.data || err.message);
            toast.error(err.response?.data?.message || 'Failed to fetch details for this GSTIN.');
        }
    }
  );

  const handleFetchGst = () => {
      if (gstNumberValue) {
          fetchGstDetails(gstNumberValue);
      } else {
          toast.error('Please enter a GST number first.');
      }
  };

  const handleFormSubmit = (data) => {
    onSubmit(data);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{supplier ? 'Edit Supplier' : 'Add New Supplier'}</DialogTitle>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <Controller name="gst_number" control={control} render={({ field }) => (
                <TextField 
                    {...field} 
                    label="GST Number" 
                    fullWidth 
                    InputProps={{
                        endAdornment: (
                            <InputAdornment position="end">
                                <IconButton onClick={handleFetchGst} edge="end" disabled={isFetchingGst}>
                                    {isFetchingGst ? <CircularProgress size={20} /> : <Search />}
                                </IconButton>
                            </InputAdornment>
                        )
                    }}
                />
              )} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller name="name" control={control} rules={{ required: 'Supplier name is required' }} render={({ field, fieldState }) => (<TextField {...field} label="Supplier Name" fullWidth required error={!!fieldState.error} helperText={fieldState.error?.message} />)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller name="code" control={control} rules={{ required: 'Supplier code is required' }} render={({ field, fieldState }) => (<TextField {...field} label="Supplier Code" fullWidth required error={!!fieldState.error} helperText={fieldState.error?.message} />)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller name="contact_person" control={control} render={({ field }) => (<TextField {...field} label="Contact Person" fullWidth />)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller name="phone" control={control} render={({ field }) => (<TextField {...field} label="Phone Number" fullWidth />)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller name="email" control={control} rules={{ pattern: { value: /^\S+@\S+$/i, message: 'Invalid email format' } }} render={({ field, fieldState }) => (<TextField {...field} label="Email" type="email" fullWidth error={!!fieldState.error} helperText={fieldState.error?.message} />)} />
            </Grid>
            <Grid item xs={12}>
              <Controller name="address" control={control} render={({ field }) => (<TextField {...field} label="Address" fullWidth />)} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Controller name="city" control={control} render={({ field }) => (<TextField {...field} label="City" fullWidth />)} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Controller name="state" control={control} render={({ field }) => (<TextField {...field} label="State" fullWidth />)} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Controller name="pincode" control={control} render={({ field }) => (<TextField {...field} label="Pincode" fullWidth />)} />
            </Grid>
            <Grid item xs={12}>
                <Controller name="is_active" control={control} render={({ field }) => (<FormControlLabel control={<Switch {...field} checked={!!field.value} />} label="Active" />)} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={isLoading}>
            {isLoading ? 'Saving...' : (supplier ? 'Save Changes' : 'Create Supplier')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export { default } from '@/features/suppliers/components/SupplierFormModal';





// // In frontend/src/components/SupplierFormModal.jsx

// import React, { useEffect } from 'react';
// import {
//   Dialog,
//   DialogTitle,
//   DialogContent,
//   DialogActions,
//   TextField,
//   Button,
//   Grid,
//   Switch,
//   FormControlLabel
// } from '@mui/material';
// import { useForm, Controller } from 'react-hook-form';

// const SupplierFormModal = ({ open, onClose, onSubmit, supplier, isLoading }) => {
//   const { control, handleSubmit, reset, setValue } = useForm({
//     defaultValues: {
//       name: '',
//       code: '',
//       contact_person: '',
//       email: '',
//       phone: '',
//       address: '',
//       city: '',
//       state: '',
//       pincode: '',
//       gst_number: '',
//       drug_license: '',
//       is_active: true,
//     }
//   });

//   useEffect(() => {
//     if (open) {
//       if (supplier) {
//         // Populate form for editing
//         setValue('name', supplier.name);
//         setValue('code', supplier.code);
//         setValue('contact_person', supplier.contact_person || '');
//         setValue('email', supplier.email || '');
//         setValue('phone', supplier.phone || '');
//         setValue('address', supplier.address || '');
//         setValue('city', supplier.city || '');
//         setValue('state', supplier.state || '');
//         setValue('pincode', supplier.pincode || '');
//         setValue('gst_number', supplier.gst_number || '');
//         setValue('drug_license', supplier.drug_license || '');
//         setValue('is_active', !!supplier.is_active);
//       } else {
//         // Reset to default for creating
//         reset({
//             name: '', code: '', contact_person: '', email: '', phone: '',
//             address: '', city: '', state: '', pincode: '', gst_number: '',
//             drug_license: '', is_active: true
//         });
//       }
//     }
//   }, [supplier, open, setValue, reset]);

//   const handleFormSubmit = (data) => {
//     onSubmit(data);
//   };

//   return (
//     <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
//       <DialogTitle>{supplier ? 'Edit Supplier' : 'Add New Supplier'}</DialogTitle>
//       <form onSubmit={handleSubmit(handleFormSubmit)}>
//         <DialogContent>
//           <Grid container spacing={2} sx={{ mt: 1 }}>
//             {/* Form Fields */}
//             <Grid item xs={12} sm={6}>
//               <Controller
//                 name="name"
//                 control={control}
//                 rules={{ required: 'Supplier name is required' }}
//                 render={({ field, fieldState }) => (
//                   <TextField {...field} label="Supplier Name" fullWidth required error={!!fieldState.error} helperText={fieldState.error?.message} />
//                 )}
//               />
//             </Grid>
//             <Grid item xs={12} sm={6}>
//               <Controller
//                 name="code"
//                 control={control}
//                 rules={{ required: 'Supplier code is required' }}
//                 render={({ field, fieldState }) => (
//                   <TextField {...field} label="Supplier Code" fullWidth required error={!!fieldState.error} helperText={fieldState.error?.message} />
//                 )}
//               />
//             </Grid>
//             <Grid item xs={12} sm={6}>
//               <Controller
//                 name="contact_person"
//                 control={control}
//                 render={({ field }) => (
//                   <TextField {...field} label="Contact Person" fullWidth />
//                 )}
//               />
//             </Grid>
//             <Grid item xs={12} sm={6}>
//               <Controller
//                 name="phone"
//                 control={control}
//                 render={({ field }) => (
//                   <TextField {...field} label="Phone Number" fullWidth />
//                 )}
//               />
//             </Grid>
//             <Grid item xs={12} sm={6}>
//               <Controller
//                 name="email"
//                 control={control}
//                 rules={{ pattern: { value: /^\S+@\S+$/i, message: 'Invalid email format' } }}
//                 render={({ field, fieldState }) => (
//                   <TextField {...field} label="Email" type="email" fullWidth error={!!fieldState.error} helperText={fieldState.error?.message} />
//                 )}
//               />
//             </Grid>
//             <Grid item xs={12} sm={6}>
//                 <Controller
//                     name="gst_number"
//                     control={control}
//                     render={({ field }) => <TextField {...field} label="GST Number" fullWidth />}
//                 />
//             </Grid>
//             <Grid item xs={12}>
//               <Controller
//                 name="address"
//                 control={control}
//                 render={({ field }) => (
//                   <TextField {...field} label="Address" fullWidth />
//                 )}
//               />
//             </Grid>
//             <Grid item xs={12} sm={4}>
//               <Controller
//                 name="city"
//                 control={control}
//                 render={({ field }) => (
//                   <TextField {...field} label="City" fullWidth />
//                 )}
//               />
//             </Grid>
//             <Grid item xs={12} sm={4}>
//               <Controller
//                 name="state"
//                 control={control}
//                 render={({ field }) => (
//                   <TextField {...field} label="State" fullWidth />
//                 )}
//               />
//             </Grid>
//             <Grid item xs={12} sm={4}>
//               <Controller
//                 name="pincode"
//                 control={control}
//                 render={({ field }) => (
//                   <TextField {...field} label="Pincode" fullWidth />
//                 )}
//               />
//             </Grid>
//             <Grid item xs={12}>
//                 <Controller
//                     name="is_active"
//                     control={control}
//                     render={({ field }) => (
//                         <FormControlLabel
//                             control={<Switch {...field} checked={!!field.value} />}
//                             label="Active"
//                         />
//                     )}
//                 />
//             </Grid>
//           </Grid>
//         </DialogContent>
//         <DialogActions>
//           <Button onClick={onClose} disabled={isLoading}>Cancel</Button>
//           <Button type="submit" variant="contained" disabled={isLoading}>
//             {isLoading ? 'Saving...' : (supplier ? 'Save Changes' : 'Create Supplier')}
//           </Button>
//         </DialogActions>
//       </form>
//     </Dialog>
//   );
// };

// export default SupplierFormModal;
