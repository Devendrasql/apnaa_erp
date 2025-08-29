import React, { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography,
  FormGroup, FormControlLabel, Checkbox, CircularProgress, Divider, TextField, Stack
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { api } from '../services/api';
import toast from 'react-hot-toast';

const AddPermissionInline = ({ onCreated }) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', category: '' });

  const { mutate: createPerm, isLoading } = useMutation(
    () => api.createPermission(form),
    {
      onSuccess: (res) => {
        toast.success('Permission created');
        setOpen(false);
        setForm({ name: '', description: '', category: '' });
        onCreated?.();
      },
      onError: (err) => toast.error(err?.response?.data?.message || 'Failed to create permission'),
    }
  );

  return (
    <>
      <Button variant="outlined" size="small" onClick={() => setOpen(true)}>Add Permission</Button>
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New Permission</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Name (key)" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. pos.discount.edit" />
            <TextField label="Description" value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
            <TextField label="Category" value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. Sales" />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={isLoading}>Cancel</Button>
          <Button variant="contained" onClick={() => createPerm()} disabled={isLoading || !form.name.trim()}>
            {isLoading ? 'Saving...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

const PermissionsFormModal = ({ open, onClose, onSubmit, role, isLoading }) => {
  const { control, handleSubmit, reset, setValue } = useForm({ defaultValues: { permissions: [] } });
  const queryClient = useQueryClient();

  const { data: allPermissions, isLoading: isLoadingPermissions, refetch } = useQuery(
    'allPermissions',
    () => api.getAllPermissions(),
    { enabled: open, select: (r) => r.data.data }
  );

  const { data: roleDetails } = useQuery(
    ['roleDetails', role?.id],
    () => api.getRoleById(role.id),
    {
      enabled: !!role && open,
      select: (r) => r.data.data,
      onSuccess: (data) => setValue('permissions', (data.permissions || []).map(p => Number(p.id))),
    }
  );

  useEffect(() => { if (!open) reset({ permissions: [] }); }, [open, reset]);

  const handleFormSubmit = (data) => {
    const submissionData = {
      name: role.name,
      description: role.description,
      permissions: data.permissions.map((id) => Number(id)),
    };
    onSubmit(submissionData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Manage Permissions for "{role?.name}"</DialogTitle>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Check permissions to assign to this role.
            </Typography>
            {/* Only super_admins can call the backend route; the page is already admin-gated. */}
            <AddPermissionInline onCreated={() => { refetch(); queryClient.invalidateQueries('allPermissions'); }} />
          </Box>

          {isLoadingPermissions ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
          ) : (
            <Controller
              name="permissions"
              control={control}
              render={({ field }) => (
                <Box>
                  {allPermissions && Object.entries(allPermissions).map(([category, perms]) => (
                    <Box key={category} sx={{ mb: 2 }}>
                      <Typography variant="h6" gutterBottom>{category}</Typography>
                      <FormGroup sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
                        {perms.map((permission) => (
                          <FormControlLabel
                            key={permission.id}
                            control={
                              <Checkbox
                                checked={field.value.includes(permission.id)}
                                onChange={(e) => {
                                  const next = e.target.checked
                                    ? [...field.value, permission.id]
                                    : field.value.filter((id) => id !== permission.id);
                                  field.onChange(next);
                                }}
                              />
                            }
                            label={permission.description || permission.name}
                          />
                        ))}
                      </FormGroup>
                      <Divider sx={{ mt: 2 }} />
                    </Box>
                  ))}
                </Box>
              )}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Permissions'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default PermissionsFormModal;



















// // In frontend/src/components/PermissionsFormModal.jsx

// import React, { useEffect } from 'react';
// import {
//   Dialog,
//   DialogTitle,
//   DialogContent,
//   DialogActions,
//   Button,
//   Box,
//   Typography,
//   FormGroup,
//   FormControlLabel,
//   Checkbox,
//   CircularProgress,
//   Alert,
//   Divider
// } from '@mui/material';
// import { useForm, Controller } from 'react-hook-form';
// import { useQuery } from 'react-query';
// import { api } from '../services/api';

// const PermissionsFormModal = ({ open, onClose, onSubmit, role, isLoading }) => {
//   const { control, handleSubmit, reset, setValue } = useForm({
//     defaultValues: {
//       permissions: []
//     }
//   });

//   // Fetch all available permissions from the backend
//   const { data: allPermissions, isLoading: isLoadingPermissions } = useQuery(
//     'allPermissions',
//     () => api.getAllPermissions(),
//     {
//       enabled: open, // Only fetch when the modal is open
//       select: (response) => response.data.data
//     }
//   );

//   // Fetch the specific role's currently assigned permissions
//   const { data: roleDetails } = useQuery(
//     ['roleDetails', role?.id],
//     () => api.getRoleById(role.id),
//     {
//       enabled: !!role && open, // Only fetch if a role is selected and the modal is open
//       select: (response) => response.data.data,
//       onSuccess: (data) => {
//         // When the role's permissions are fetched, set the form's default checked states
//         setValue('permissions', data.permissions || []);
//       }
//     }
//   );
  
//   useEffect(() => {
//     if (!open) {
//       reset({ permissions: [] });
//     }
//   }, [open, reset]);

//   const handleFormSubmit = (data) => {
//     // We need to submit the full role object, including the name and description
//     const submissionData = {
//         name: role.name,
//         description: role.description,
//         permissions: data.permissions.map(p => Number(p)) // Ensure IDs are numbers
//     };
//     onSubmit(submissionData);
//   };

//   return (
//     <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
//       <DialogTitle>Manage Permissions for "{role?.name}"</DialogTitle>
//       <form onSubmit={handleSubmit(handleFormSubmit)}>
//         <DialogContent>
//           {isLoadingPermissions ? (
//             <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
//           ) : (
//             <Controller
//               name="permissions"
//               control={control}
//               render={({ field }) => (
//                 <Box>
//                   {allPermissions && Object.entries(allPermissions).map(([category, perms]) => (
//                     <Box key={category} sx={{ mb: 2 }}>
//                       <Typography variant="h6" gutterBottom>{category}</Typography>
//                       <FormGroup sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
//                         {perms.map((permission) => (
//                           <FormControlLabel
//                             key={permission.id}
//                             control={
//                               <Checkbox
//                                 checked={field.value.includes(permission.id)}
//                                 onChange={(e) => {
//                                   const newPermissions = e.target.checked
//                                     ? [...field.value, permission.id]
//                                     : field.value.filter((id) => id !== permission.id);
//                                   field.onChange(newPermissions);
//                                 }}
//                               />
//                             }
//                             label={permission.description}
//                           />
//                         ))}
//                       </FormGroup>
//                       <Divider sx={{ mt: 2 }} />
//                     </Box>
//                   ))}
//                 </Box>
//               )}
//             />
//           )}
//         </DialogContent>
//         <DialogActions>
//           <Button onClick={onClose} disabled={isLoading}>Cancel</Button>
//           <Button type="submit" variant="contained" disabled={isLoading}>
//             {isLoading ? 'Saving...' : 'Save Permissions'}
//           </Button>
//         </DialogActions>
//       </form>
//     </Dialog>
//   );
// };

// export default PermissionsFormModal;
