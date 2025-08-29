import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Grid, TextField, Button, Stack, Avatar, Typography, Switch, FormControlLabel
} from '@mui/material';
import { useForm } from 'react-hook-form';
import FaceCaptureDialog from './FaceCaptureDialog';
import { buildImageUrl } from '../services/api';

/**
 * Create + Edit customer form
 * - Lets user capture or recapture face
 * - Returns { formData, faceBase64 } to the parent
 */
export default function CustomerFormModal({ open, onClose, customer, onSubmit }) {
  const isEdit = !!customer;

  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    defaultValues: {
      first_name: customer?.first_name || '',
      last_name: customer?.last_name || '',
      phone: customer?.phone || '',
      email: customer?.email || '',
      address: customer?.address || '',
      city: customer?.city || '',
      state: customer?.state || '',
      pincode: customer?.pincode || '',
      is_active: customer?.is_active ? 1 : 0,
    },
  });

  const [faceOpen, setFaceOpen] = React.useState(false);
  const [capturedFaceB64, setCapturedFaceB64] = React.useState(null);

  React.useEffect(() => {
    if (open) {
      reset({
        first_name: customer?.first_name || '',
        last_name: customer?.last_name || '',
        phone: customer?.phone || '',
        email: customer?.email || '',
        address: customer?.address || '',
        city: customer?.city || '',
        state: customer?.state || '',
        pincode: customer?.pincode || '',
        is_active: customer?.is_active ? 1 : 0,
      });
      setCapturedFaceB64(null);
    }
  }, [open, customer, reset]);

  const onCapture = async (b64) => {
    setCapturedFaceB64(b64);
    setFaceOpen(false);
  };

  const submitWrapper = handleSubmit(async (values) => {
    const payload = { formData: values, faceBase64: capturedFaceB64 };
    onSubmit?.(payload);
  });

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>{isEdit ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField label="First Name" fullWidth required
                         {...register('first_name', { required: true })}
                         error={!!errors.first_name}/>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="Last Name" fullWidth required
                         {...register('last_name', { required: true })}
                         error={!!errors.last_name}/>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="Phone" fullWidth required
                         {...register('phone', { required: true })}
                         error={!!errors.phone}/>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="Email" type="email" fullWidth {...register('email')}/>
            </Grid>
            <Grid item xs={12}>
              <TextField label="Address" fullWidth multiline {...register('address')}/>
            </Grid>
            <Grid item xs={12} md={4}><TextField label="City" fullWidth {...register('city')}/></Grid>
            <Grid item xs={12} md={4}><TextField label="State" fullWidth {...register('state')}/></Grid>
            <Grid item xs={12} md={4}><TextField label="Pincode" fullWidth {...register('pincode')}/></Grid>

            <Grid item xs={12}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar
                  src={
                    capturedFaceB64
                      ? `data:image/jpeg;base64,${capturedFaceB64}`
                      : (customer?.face_image_url ? buildImageUrl(customer.face_image_url) : undefined)
                  }
                  alt={`${customer?.first_name || ''} ${customer?.last_name || ''}`.trim()}
                  sx={{ width: 64, height: 64 }}
                />
                <Button variant="outlined" onClick={() => setFaceOpen(true)}>
                  {capturedFaceB64 ? 'Re-capture' : (isEdit ? 'Re-capture' : 'Capture Face')}
                </Button>
                {capturedFaceB64
                  ? <Typography variant="body2">Face captured and will be enrolled on save</Typography>
                  : <Typography variant="body2" color="text.secondary">
                      {customer?.face_image_url ? 'Face image on file' : 'No face image yet'}
                    </Typography>}
              </Stack>
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel control={<Switch defaultChecked={!!(customer?.is_active ?? 1)} {...register('is_active')}/>}
                                label="Active"/>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button onClick={submitWrapper} variant="contained">{isEdit ? 'Save' : 'Create Customer'}</Button>
        </DialogActions>
      </Dialog>

      <FaceCaptureDialog open={faceOpen} onClose={() => setFaceOpen(false)} onCapture={onCapture} title="Look at the camera"/>
    </>
  );
}






// // frontend/src/components/CustomerFormModal.jsx
// // -------------------------------------------------------------
// // Customer form modal with Capture Face support.
// // On submit, it returns BOTH the form data and the captured face:
// //    onSubmit({ formData: <fields>, faceBase64: <optional base64> })
// // Your parent (Customers.jsx) should then:
// //   1) create the customer
// //   2) if faceBase64 exists, call POST /api/face/customers/:id/enroll
// // -------------------------------------------------------------

// import React, { useEffect, useState, useRef } from 'react';
// import {
//   Dialog,
//   DialogTitle,
//   DialogContent,
//   DialogActions,
//   TextField,
//   Button,
//   Grid,
//   Switch,
//   FormControlLabel,
//   Stack,
//   Avatar,
//   Typography,
//   Box
// } from '@mui/material';
// import { useForm, Controller } from 'react-hook-form';

// /** Inline webcam dialog so you don't need a separate file */
// function FaceCaptureDialog({ open, title = 'Capture Face', onClose, onCapture }) {
//   const videoRef = useRef(null);

//   useEffect(() => {
//     let stream;
//     const start = async () => {
//       if (!open) return;
//       try {
//         stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
//         if (videoRef.current) {
//           videoRef.current.srcObject = stream;
//           await videoRef.current.play();
//         }
//       } catch (e) {
//         console.error('Camera error', e);
//       }
//     };
//     start();
//     return () => {
//       if (stream) stream.getTracks().forEach((t) => t.stop());
//     };
//   }, [open]);

//   const capture = async () => {
//     const v = videoRef.current;
//     if (!v) return;
//     const canvas = document.createElement('canvas');
//     canvas.width = v.videoWidth;
//     canvas.height = v.videoHeight;
//     const ctx = canvas.getContext('2d');
//     ctx.drawImage(v, 0, 0);
//     // Base64 JPEG without the "data:image/jpeg;base64," prefix
//     const base64 = canvas.toDataURL('image/jpeg', 0.92).split(',')[1];
//     onCapture(base64);
//   };

//   return (
//     <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
//       <DialogTitle>{title}</DialogTitle>
//       <DialogContent>
//         <Box sx={{ display: 'grid', placeItems: 'center', p: 1 }}>
//           <video ref={videoRef} playsInline muted style={{ width: '100%', borderRadius: 12 }} />
//         </Box>
//       </DialogContent>
//       <DialogActions>
//         <Button onClick={onClose}>Cancel</Button>
//         <Button variant="contained" onClick={capture}>Use This Frame</Button>
//       </DialogActions>
//     </Dialog>
//   );
// }

// const CustomerFormModal = ({ open, onClose, onSubmit, customer, isLoading }) => {
//   const { control, handleSubmit, reset, setValue } = useForm({
//     defaultValues: {
//       first_name: '',
//       last_name: '',
//       phone: '',
//       email: '',
//       address: '',
//       city: '',
//       state: '',
//       pincode: '',
//       is_active: true,
//     }
//   });

//   // --- NEW: face capture state ---
//   const [faceOpen, setFaceOpen] = useState(false);
//   const [capturedFaceB64, setCapturedFaceB64] = useState(null);

//   // Populate/reset form & clear captured face when opening
//   useEffect(() => {
//     if (!open) return;

//     if (customer) {
//       // Editing existing
//       setValue('first_name', customer.first_name);
//       setValue('last_name', customer.last_name);
//       setValue('phone', customer.phone);
//       setValue('email', customer.email || '');
//       setValue('address', customer.address || '');
//       setValue('city', customer.city || '');
//       setValue('state', customer.state || '');
//       setValue('pincode', customer.pincode || '');
//       setValue('is_active', !!customer.is_active);
//       setCapturedFaceB64(null); // don't reuse an old capture
//     } else {
//       // Creating new
//       reset({
//         first_name: '',
//         last_name: '',
//         phone: '',
//         email: '',
//         address: '',
//         city: '',
//         state: '',
//         pincode: '',
//         is_active: true,
//       });
//       setCapturedFaceB64(null);
//     }
//   }, [customer, open, setValue, reset]);

//   // IMPORTANT: send both formData and face to parent
//   const handleFormSubmit = (data) => {
//     // Parent (Customers.jsx) expects { formData, faceBase64 }
//     onSubmit({ formData: data, faceBase64: capturedFaceB64 });
//   };

//   return (
//     <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
//       <DialogTitle>{customer ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>

//       <form onSubmit={handleSubmit(handleFormSubmit)}>
//         <DialogContent>
//           <Grid container spacing={2} sx={{ mt: 1 }}>
//             {/* Form Fields */}
//             <Grid item xs={12} sm={6}>
//               <Controller
//                 name="first_name"
//                 control={control}
//                 rules={{ required: 'First name is required' }}
//                 render={({ field, fieldState }) => (
//                   <TextField
//                     {...field}
//                     label="First Name"
//                     fullWidth
//                     required
//                     error={!!fieldState.error}
//                     helperText={fieldState.error?.message}
//                   />
//                 )}
//               />
//             </Grid>
//             <Grid item xs={12} sm={6}>
//               <Controller
//                 name="last_name"
//                 control={control}
//                 rules={{ required: 'Last name is required' }}
//                 render={({ field, fieldState }) => (
//                     <TextField
//                       {...field}
//                       label="Last Name"
//                       fullWidth
//                       required
//                       error={!!fieldState.error}
//                       helperText={fieldState.error?.message}
//                     />
//                 )}
//               />
//             </Grid>
//             <Grid item xs={12} sm={6}>
//               <Controller
//                 name="phone"
//                 control={control}
//                 rules={{ required: 'Phone number is required' }}
//                 render={({ field, fieldState }) => (
//                   <TextField
//                     {...field}
//                     label="Phone Number"
//                     fullWidth
//                     required
//                     error={!!fieldState.error}
//                     helperText={fieldState.error?.message}
//                   />
//                 )}
//               />
//             </Grid>
//             <Grid item xs={12} sm={6}>
//               <Controller
//                 name="email"
//                 control={control}
//                 rules={{ pattern: { value: /^\S+@\S+$/i, message: 'Invalid email format' } }}
//                 render={({ field, fieldState }) => (
//                   <TextField
//                     {...field}
//                     label="Email"
//                     type="email"
//                     fullWidth
//                     error={!!fieldState.error}
//                     helperText={fieldState.error?.message}
//                   />
//                 )}
//               />
//             </Grid>
//             <Grid item xs={12}>
//               <Controller
//                 name="address"
//                 control={control}
//                 render={({ field }) => <TextField {...field} label="Address" fullWidth />}
//               />
//             </Grid>
//             <Grid item xs={12} sm={4}>
//               <Controller
//                 name="city"
//                 control={control}
//                 render={({ field }) => <TextField {...field} label="City" fullWidth />}
//               />
//             </Grid>
//             <Grid item xs={12} sm={4}>
//               <Controller
//                 name="state"
//                 control={control}
//                 render={({ field }) => <TextField {...field} label="State" fullWidth />}
//               />
//             </Grid>
//             <Grid item xs={12} sm={4}>
//               <Controller
//                 name="pincode"
//                 control={control}
//                 render={({ field }) => <TextField {...field} label="Pincode" fullWidth />}
//               />
//             </Grid>
//             <Grid item xs={12}>
//               <Controller
//                 name="is_active"
//                 control={control}
//                 render={({ field }) => (
//                   <FormControlLabel control={<Switch {...field} checked={!!field.value} />} label="Active" />
//                 )}
//               />
//             </Grid>

//             {/* Face capture + preview */}
//             <Grid item xs={12}>
//               <Stack direction="row" spacing={2} alignItems="center">
//                 <Avatar
//                   src={capturedFaceB64 ? `data:image/jpeg;base64,${capturedFaceB64}` : undefined}
//                   sx={{ width: 64, height: 64 }}
//                 />
//                 <Button variant="outlined" onClick={() => setFaceOpen(true)}>
//                   Capture Face
//                 </Button>
//                 {capturedFaceB64 && (
//                   <>
//                     <Typography variant="body2">Face captured — will be enrolled after save</Typography>
//                     <Button size="small" onClick={() => setCapturedFaceB64(null)}>Remove</Button>
//                   </>
//                 )}
//               </Stack>
//             </Grid>
//           </Grid>
//         </DialogContent>

//         <DialogActions>
//           <Button onClick={onClose} disabled={isLoading}>Cancel</Button>
//           <Button type="submit" variant="contained" disabled={isLoading}>
//             {isLoading ? 'Saving...' : (customer ? 'Save Changes' : 'Create Customer')}
//           </Button>
//         </DialogActions>
//       </form>

//       {/* Webcam dialog */}
//       <FaceCaptureDialog
//         open={faceOpen}
//         onClose={() => setFaceOpen(false)}
//         onCapture={(b64) => { setCapturedFaceB64(b64); setFaceOpen(false); }}
//         title="Look at the camera"
//       />
//     </Dialog>
//   );
// };

// export default CustomerFormModal;





// // // In frontend/src/components/CustomerFormModal.jsx

// // import React, { useEffect } from 'react';
// // import {
// //   Dialog,
// //   DialogTitle,
// //   DialogContent,
// //   DialogActions,
// //   TextField,
// //   Button,
// //   Grid,
// //   Switch,
// //   FormControlLabel
// // } from '@mui/material';
// // import { useForm, Controller } from 'react-hook-form';

// // const CustomerFormModal = ({ open, onClose, onSubmit, customer, isLoading }) => {
// //   const { control, handleSubmit, reset, setValue } = useForm({
// //     defaultValues: {
// //       first_name: '',
// //       last_name: '',
// //       phone: '',
// //       email: '',
// //       address: '',
// //       city: '',
// //       state: '',
// //       pincode: '',
// //       is_active: true,
// //     }
// //   });

// //   useEffect(() => {
// //     if (open) {
// //       if (customer) {
// //         // Populate form for editing
// //         setValue('first_name', customer.first_name);
// //         setValue('last_name', customer.last_name);
// //         setValue('phone', customer.phone);
// //         setValue('email', customer.email || '');
// //         setValue('address', customer.address || '');
// //         setValue('city', customer.city || '');
// //         setValue('state', customer.state || '');
// //         setValue('pincode', customer.pincode || '');
// //         setValue('is_active', !!customer.is_active);
// //       } else {
// //         // Reset to default for creating
// //         reset({
// //             first_name: '', last_name: '', phone: '', email: '',
// //             address: '', city: '', state: '', pincode: '', is_active: true
// //         });
// //       }
// //     }
// //   }, [customer, open, setValue, reset]);

// //   const handleFormSubmit = (data) => {
// //     onSubmit(data);
// //   };

// //   return (
// //     <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
// //       <DialogTitle>{customer ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
// //       <form onSubmit={handleSubmit(handleFormSubmit)}>
// //         <DialogContent>
// //           <Grid container spacing={2} sx={{ mt: 1 }}>
// //             {/* Form Fields */}
// //             <Grid item xs={12} sm={6}>
// //               <Controller
// //                 name="first_name"
// //                 control={control}
// //                 rules={{ required: 'First name is required' }}
// //                 render={({ field, fieldState }) => (
// //                   <TextField {...field} label="First Name" fullWidth required error={!!fieldState.error} helperText={fieldState.error?.message} />
// //                 )}
// //               />
// //             </Grid>
// //             <Grid item xs={12} sm={6}>
// //               <Controller
// //                 name="last_name"
// //                 control={control}
// //                 rules={{ required: 'Last name is required' }}
// //                 render={({ field, fieldState }) => (
// //                   <TextField {...field} label="Last Name" fullWidth required error={!!fieldState.error} helperText={fieldState.error?.message} />
// //                 )}
// //               />
// //             </Grid>
// //             <Grid item xs={12} sm={6}>
// //               <Controller
// //                 name="phone"
// //                 control={control}
// //                 rules={{ required: 'Phone number is required' }}
// //                 render={({ field, fieldState }) => (
// //                   <TextField {...field} label="Phone Number" fullWidth required error={!!fieldState.error} helperText={fieldState.error?.message} />
// //                 )}
// //               />
// //             </Grid>
// //             <Grid item xs={12} sm={6}>
// //               <Controller
// //                 name="email"
// //                 control={control}
// //                 rules={{ pattern: { value: /^\S+@\S+$/i, message: 'Invalid email format' } }}
// //                 render={({ field, fieldState }) => (
// //                   <TextField {...field} label="Email" type="email" fullWidth error={!!fieldState.error} helperText={fieldState.error?.message} />
// //                 )}
// //               />
// //             </Grid>
// //             <Grid item xs={12}>
// //               <Controller
// //                 name="address"
// //                 control={control}
// //                 render={({ field }) => (
// //                   <TextField {...field} label="Address" fullWidth />
// //                 )}
// //               />
// //             </Grid>
// //             <Grid item xs={12} sm={4}>
// //               <Controller
// //                 name="city"
// //                 control={control}
// //                 render={({ field }) => (
// //                   <TextField {...field} label="City" fullWidth />
// //                 )}
// //               />
// //             </Grid>
// //             <Grid item xs={12} sm={4}>
// //               <Controller
// //                 name="state"
// //                 control={control}
// //                 render={({ field }) => (
// //                   <TextField {...field} label="State" fullWidth />
// //                 )}
// //               />
// //             </Grid>
// //             <Grid item xs={12} sm={4}>
// //               <Controller
// //                 name="pincode"
// //                 control={control}
// //                 render={({ field }) => (
// //                   <TextField {...field} label="Pincode" fullWidth />
// //                 )}
// //               />
// //             </Grid>
// //             <Grid item xs={12}>
// //                 <Controller
// //                     name="is_active"
// //                     control={control}
// //                     render={({ field }) => (
// //                         <FormControlLabel
// //                             control={<Switch {...field} checked={!!field.value} />}
// //                             label="Active"
// //                         />
// //                     )}
// //                 />
// //             </Grid>
// //           </Grid>
// //         </DialogContent>
// //         <DialogActions>
// //           <Button onClick={onClose} disabled={isLoading}>Cancel</Button>
// //           <Button type="submit" variant="contained" disabled={isLoading}>
// //             {isLoading ? 'Saving...' : (customer ? 'Save Changes' : 'Create Customer')}
// //           </Button>
// //         </DialogActions>
// //       </form>
// //     </Dialog>
// //   );
// // };

// // export default CustomerFormModal;
