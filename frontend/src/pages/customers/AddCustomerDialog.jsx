import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Grid, TextField, Button, Switch, FormControlLabel, Stack, Avatar, Typography } from '@mui/material';
import { useForm } from 'react-hook-form';
import FaceCaptureDialog from '../../components/FaceCaptureDialog';
import { useAuth } from '../contexts/AuthContext';

// Helper to get the JWT if you keep it in localStorage (fallback if no prop is given)
const getAuthToken = () => localStorage.getItem('token'); // adjust the key to your app


export default function AddCustomerDialog({ open, onClose, onCreated, orgId, authToken }) {
  const { register, handleSubmit, formState: { errors }, reset } = useForm();
  const [active, setActive] = React.useState(true);
  const [faceOpen, setFaceOpen] = React.useState(false);
  const [capturedFaceB64, setCapturedFaceB64] = React.useState(null);

  const token = authToken || getAuthToken();
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const onCapture = async (b64) => {
    setCapturedFaceB64(b64);
    setFaceOpen(false);
  };

  const clearForm = () => { reset(); setCapturedFaceB64(null); };

  const createCustomer = async (payload) => {
    const res = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ ...payload, is_active: active ? 1 : 0 })
    });
    if (!res.ok) throw new Error('create_failed');
    return await res.json();
  };

  const enrollFace = async (customerId) => {
    if (!capturedFaceB64) return;
    await fetch(`/api/face/customers/${customerId}/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ imageBase64: capturedFaceB64, org_id: orgId })
    });
  };

  const onSubmit = handleSubmit(async (values) => {
    try {
      const created = await createCustomer(values);
      await enrollFace(created.id);
      onCreated?.(created);
      clearForm();
      onClose();
    } catch (e) {
      console.error('Error creating customer', e);
    }
  });

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>Add New Customer</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}><TextField label="First Name" fullWidth required {...register('first_name', { required: true })} /></Grid>
            <Grid item xs={12} md={6}><TextField label="Last Name" fullWidth required {...register('last_name', { required: true })} /></Grid>
            <Grid item xs={12} md={6}><TextField label="Phone" fullWidth required {...register('phone', { required: true })} /></Grid>
            <Grid item xs={12} md={6}><TextField label="Email" type="email" fullWidth {...register('email')} /></Grid>
            <Grid item xs={12}><TextField label="Address" fullWidth multiline {...register('address')} /></Grid>
            <Grid item xs={12} md={4}><TextField label="City" fullWidth {...register('city')} /></Grid>
            <Grid item xs={12} md={4}><TextField label="State" fullWidth {...register('state')} /></Grid>
            <Grid item xs={12} md={4}><TextField label="Pincode" fullWidth {...register('pincode')} /></Grid>

            <Grid item xs={12}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar src={capturedFaceB64 ? `data:image/jpeg;base64,${capturedFaceB64}` : undefined} sx={{ width: 64, height: 64 }} />
                <Button variant="outlined" onClick={() => setFaceOpen(true)}>Capture Face</Button>
                {capturedFaceB64 && <Typography variant="body2">Face captured and will be enrolled</Typography>}
              </Stack>
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel control={<Switch checked={active} onChange={(e) => setActive(e.target.checked)} />} label="Active" />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button onClick={onSubmit} variant="contained">Create Customer</Button>
        </DialogActions>
      </Dialog>

      <FaceCaptureDialog open={faceOpen} onClose={() => setFaceOpen(false)} onCapture={onCapture} title="Look at the camera" />
    </>
  );
}




// import React from 'react';
// import { Dialog, DialogTitle, DialogContent, DialogActions, Grid, TextField, Button, Switch, FormControlLabel, Stack, Avatar, Typography } from '@mui/material';
// import { useForm } from 'react-hook-form';
// import FaceCaptureDialog from '../../components/FaceCaptureDialog';

// // Helper to get the JWT if you keep it in localStorage (fallback if no prop is given)
// const getAuthToken = () => localStorage.getItem('token'); // adjust the key to your app

// export default function AddCustomerDialog({ open, onClose, onCreated, orgId, authToken }) {
//   const { register, handleSubmit, formState: { errors }, reset } = useForm();
//   const [active, setActive] = React.useState(true);
//   const [faceOpen, setFaceOpen] = React.useState(false);
//   const [capturedFaceB64, setCapturedFaceB64] = React.useState(null);

//   const token = authToken || getAuthToken();
//   const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

//   const onCapture = async (b64) => {
//     setCapturedFaceB64(b64);
//     setFaceOpen(false);
//   };

//   const clearForm = () => { reset(); setCapturedFaceB64(null); };

//   const createCustomer = async (payload) => {
//     const res = await fetch('/api/customers', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json', ...authHeaders },
//       body: JSON.stringify({ ...payload, is_active: active ? 1 : 0 })
//     });
//     if (!res.ok) throw new Error('create_failed');
//     return await res.json();
//   };

//   const enrollFace = async (customerId) => {
//     if (!capturedFaceB64) return;
//     await fetch(`/api/face/customers/${customerId}/enroll`, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json', ...authHeaders },
//       body: JSON.stringify({ imageBase64: capturedFaceB64, org_id: orgId })
//     });
//   };

//   const onSubmit = handleSubmit(async (values) => {
//     try {
//       const created = await createCustomer(values);
//       await enrollFace(created.id);
//       onCreated?.(created);
//       clearForm();
//       onClose();
//     } catch (e) {
//       console.error('Error creating customer', e);
//     }
//   });

//   return (
//     <>
//       <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
//         <DialogTitle>Add New Customer</DialogTitle>
//         <DialogContent>
//           <Grid container spacing={2}>
//             <Grid item xs={12} md={6}><TextField label="First Name" fullWidth required {...register('first_name', { required: true })} /></Grid>
//             <Grid item xs={12} md={6}><TextField label="Last Name" fullWidth required {...register('last_name', { required: true })} /></Grid>
//             <Grid item xs={12} md={6}><TextField label="Phone" fullWidth required {...register('phone', { required: true })} /></Grid>
//             <Grid item xs={12} md={6}><TextField label="Email" type="email" fullWidth {...register('email')} /></Grid>
//             <Grid item xs={12}><TextField label="Address" fullWidth multiline {...register('address')} /></Grid>
//             <Grid item xs={12} md={4}><TextField label="City" fullWidth {...register('city')} /></Grid>
//             <Grid item xs={12} md={4}><TextField label="State" fullWidth {...register('state')} /></Grid>
//             <Grid item xs={12} md={4}><TextField label="Pincode" fullWidth {...register('pincode')} /></Grid>

//             <Grid item xs={12}>
//               <Stack direction="row" spacing={2} alignItems="center">
//                 <Avatar src={capturedFaceB64 ? `data:image/jpeg;base64,${capturedFaceB64}` : undefined} sx={{ width: 64, height: 64 }} />
//                 <Button variant="outlined" onClick={() => setFaceOpen(true)}>Capture Face</Button>
//                 {capturedFaceB64 && <Typography variant="body2">Face captured and will be enrolled</Typography>}
//               </Stack>
//             </Grid>

//             <Grid item xs={12}>
//               <FormControlLabel control={<Switch checked={active} onChange={(e) => setActive(e.target.checked)} />} label="Active" />
//             </Grid>
//           </Grid>
//         </DialogContent>
//         <DialogActions>
//           <Button onClick={onClose}>Cancel</Button>
//           <Button onClick={onSubmit} variant="contained">Create Customer</Button>
//         </DialogActions>
//       </Dialog>

//       <FaceCaptureDialog open={faceOpen} onClose={() => setFaceOpen(false)} onCapture={onCapture} title="Look at the camera" />
//     </>
//   );
// }