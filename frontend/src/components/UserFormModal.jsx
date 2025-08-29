// In frontend/src/components/UserFormModal.jsx

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
  MenuItem,
  CircularProgress,
  Box,
  Autocomplete,
  Chip
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { useQuery } from 'react-query';
import { api } from '../services/api';
import toast from 'react-hot-toast';

const UserFormModal = ({ open, onClose, onSubmit, user, isLoading }) => {
  const { control, handleSubmit, reset, setValue } = useForm({
    defaultValues: {
      first_name: '',
      last_name: '',
      username: '',
      email: '',
      password: '',
      phone: '',
      role_id: '', // Use role_id to match the new schema
      default_branch_id: '',
      accessible_branches: [],
      is_active: true,
    }
  });

  // Fetch data for dropdowns
  const { data: branchesData } = useQuery('branches', () => api.getBranches());
  const { data: rolesData } = useQuery('roles', () => api.getAllRoles()); // Fetch roles from the new endpoint
  
  const branches = branchesData?.data?.data || [];
  const roles = rolesData?.data?.data || [];

  useEffect(() => {
    if (open) {
      if (user) {
        // When editing, fetch the user's full details, including their branch access list
        api.getUserById(user.id).then(response => {
            const fullUser = response.data.data;
            setValue('first_name', fullUser.first_name);
            setValue('last_name', fullUser.last_name);
            setValue('username', fullUser.username);
            setValue('email', fullUser.email);
            setValue('phone', fullUser.phone || '');
            setValue('role_id', fullUser.role_id);
            setValue('default_branch_id', fullUser.default_branch_id || '');
            setValue('is_active', !!fullUser.is_active);
            setValue('password', '');
            
            // Correctly populate the multi-select with the full branch objects
            const accessible = branches.filter(b => fullUser.accessible_branch_ids.includes(b.id));
            setValue('accessible_branches', accessible);
        });
      } else {
        // Reset the form for a new user
        reset({
            first_name: '', last_name: '', username: '', email: '', password: '', 
            phone: '', role_id: '', default_branch_id: '', accessible_branches: [], is_active: true
        });
      }
    }
  }, [user, open, setValue, reset, branches]);

  const handleFormSubmit = (data) => {
    const submissionData = {
      ...data,
      // Send the array of branch IDs to the backend
      accessible_branch_ids: data.accessible_branches.map(b => b.id)
    };
    delete submissionData.accessible_branches; // Clean up the object before submission

    if (user && !data.password) {
      delete submissionData.password;
    }
    onSubmit(submissionData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{user ? 'Edit User' : 'Add New User'}</DialogTitle>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}><Controller name="first_name" control={control} rules={{ required: 'First name is required' }} render={({ field, fieldState }) => (<TextField {...field} label="First Name" fullWidth required error={!!fieldState.error} helperText={fieldState.error?.message} />)} /></Grid>
            <Grid item xs={12} sm={6}><Controller name="last_name" control={control} rules={{ required: 'Last name is required' }} render={({ field, fieldState }) => (<TextField {...field} label="Last Name" fullWidth required error={!!fieldState.error} helperText={fieldState.error?.message} />)} /></Grid>
            <Grid item xs={12} sm={6}><Controller name="username" control={control} rules={{ required: 'Username is required' }} render={({ field, fieldState }) => (<TextField {...field} label="Username" fullWidth required error={!!fieldState.error} helperText={fieldState.error?.message} />)} /></Grid>
            <Grid item xs={12} sm={6}><Controller name="email" control={control} rules={{ required: 'Email is required' }} render={({ field, fieldState }) => (<TextField {...field} label="Email" type="email" fullWidth required error={!!fieldState.error} helperText={fieldState.error?.message} />)} /></Grid>
            <Grid item xs={12} sm={6}><Controller name="password" control={control} rules={{ required: !user }} render={({ field, fieldState }) => (<TextField {...field} label="Password" type="password" fullWidth required={!user} helperText={user ? "Leave blank to keep current password" : ""} error={!!fieldState.error} />)} /></Grid>
            <Grid item xs={12} sm={6}><Controller name="phone" control={control} render={({ field }) => (<TextField {...field} label="Phone" fullWidth />)} /></Grid>
            <Grid item xs={12} sm={6}>
              <Controller name="role_id" control={control} rules={{ required: 'Role is required' }} render={({ field, fieldState }) => (
                <TextField {...field} select label="Role" fullWidth required error={!!fieldState.error} helperText={fieldState.error?.message}>
                  {roles.map((role) => (<MenuItem key={role.id} value={role.id}>{role.name}</MenuItem>))}
                </TextField>
              )} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller name="default_branch_id" control={control} render={({ field }) => (
                <TextField {...field} select label="Default Branch" fullWidth>
                    <MenuItem value=""><em>None</em></MenuItem>
                    {branches.map((branch) => (<MenuItem key={branch.id} value={branch.id}>{branch.name}</MenuItem>))}
                </TextField>
              )} />
            </Grid>
            <Grid item xs={12}>
              <Controller
                name="accessible_branches"
                control={control}
                rules={{ validate: value => value.length > 0 || 'At least one branch must be assigned' }}
                render={({ field, fieldState }) => (
                  <Autocomplete
                    multiple
                    options={branches}
                    getOptionLabel={(option) => option.name}
                    value={field.value}
                    onChange={(e, newValue) => field.onChange(newValue)}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => {
                        const { key, ...tagProps } = getTagProps({ index });
                        return <Chip key={key} variant="outlined" label={option.name} {...tagProps} />;
                      })
                    }
                    renderInput={(params) => (
                      <TextField 
                        {...params} 
                        label="Accessible Branches" 
                        placeholder="Select branches" 
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                      />
                    )}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12}>
                <Controller name="is_active" control={control} render={({ field }) => (<FormControlLabel control={<Switch {...field} checked={!!field.value} />} label="User is Active" />)} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={isLoading}>
            {isLoading ? 'Saving...' : (user ? 'Save Changes' : 'Create User')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default UserFormModal;






// // In frontend/src/components/UserFormModal.jsx

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
//   FormControlLabel,
//   MenuItem,
//   CircularProgress,
//   Box
// } from '@mui/material';
// import { useForm, Controller } from 'react-hook-form';
// import { useQuery } from 'react-query';
// import { api } from '../services/api';

// // FIX: Added 'super_admin' to the list of roles
// const userRoles = ['super_admin', 'admin', 'manager', 'pharmacist', 'staff'];

// const UserFormModal = ({ open, onClose, onSubmit, user, isLoading }) => {
//   const { control, handleSubmit, reset, setValue } = useForm({
//     defaultValues: {
//       first_name: '',
//       last_name: '',
//       username: '',
//       email: '',
//       password: '',
//       phone: '',
//       role: 'staff',
//       branch_id: '',
//       is_active: true,
//     }
//   });

//   // Fetch branches for the dropdown
//   const { data: branchesData, isLoading: isLoadingBranches } = useQuery('branches', () => api.getBranches());
//   const branches = branchesData?.data?.data || [];

//   useEffect(() => {
//     // Reset form when opening for a new user, or populate for an existing one
//     if (open) {
//       if (user) {
//         setValue('first_name', user.first_name);
//         setValue('last_name', user.last_name);
//         setValue('username', user.username);
//         setValue('email', user.email);
//         setValue('phone', user.phone || '');
//         setValue('role', user.role);
//         setValue('branch_id', user.branch_id || '');
//         setValue('is_active', !!user.is_active);
//         setValue('password', ''); // Password should not be pre-filled
//       } else {
//         reset();
//       }
//     }
//   }, [user, open, setValue, reset]);

//   const handleFormSubmit = (data) => {
//     // Don't submit an empty password field during an update
//     if (user && !data.password) {
//       delete data.password;
//     }
//     onSubmit(data);
//   };

//   return (
//     <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
//       <DialogTitle>{user ? 'Edit User' : 'Add New User'}</DialogTitle>
//       <form onSubmit={handleSubmit(handleFormSubmit)}>
//         <DialogContent>
//           <Grid container spacing={2} sx={{ mt: 1 }}>
//             <Grid item xs={12} sm={6}>
//               <Controller name="first_name" control={control} rules={{ required: 'First name is required' }} render={({ field, fieldState }) => (<TextField {...field} label="First Name" fullWidth required error={!!fieldState.error} helperText={fieldState.error?.message} />)} />
//             </Grid>
//             <Grid item xs={12} sm={6}>
//               <Controller name="last_name" control={control} rules={{ required: 'Last name is required' }} render={({ field, fieldState }) => (<TextField {...field} label="Last Name" fullWidth required error={!!fieldState.error} helperText={fieldState.error?.message} />)} />
//             </Grid>
//             <Grid item xs={12} sm={6}>
//               <Controller name="username" control={control} rules={{ required: 'Username is required' }} render={({ field, fieldState }) => (<TextField {...field} label="Username" fullWidth required error={!!fieldState.error} helperText={fieldState.error?.message} />)} />
//             </Grid>
//             <Grid item xs={12} sm={6}>
//               <Controller name="email" control={control} rules={{ required: 'Email is required', pattern: { value: /^\S+@\S+$/i, message: 'Invalid email format' } }} render={({ field, fieldState }) => (<TextField {...field} label="Email" type="email" fullWidth required error={!!fieldState.error} helperText={fieldState.error?.message} />)} />
//             </Grid>
//             <Grid item xs={12} sm={6}>
//               <Controller name="password" control={control} rules={{ required: !user }} render={({ field, fieldState }) => (<TextField {...field} label="Password" type="password" fullWidth required={!user} helperText={user ? "Leave blank to keep current password" : fieldState.error?.message} error={!!fieldState.error} />)} />
//             </Grid>
//             <Grid item xs={12} sm={6}>
//               <Controller name="phone" control={control} render={({ field }) => (<TextField {...field} label="Phone" fullWidth />)} />
//             </Grid>
//             <Grid item xs={12} sm={6}>
//               <Controller name="role" control={control} rules={{ required: true }} render={({ field }) => (
//                 <TextField {...field} select label="Role" fullWidth required>
//                   {userRoles.map((role) => (<MenuItem key={role} value={role} sx={{textTransform: 'capitalize'}}>{role.replace('_', ' ')}</MenuItem>))}
//                 </TextField>
//               )} />
//             </Grid>
//             <Grid item xs={12} sm={6}>
//               <Controller name="branch_id" control={control} render={({ field }) => (
//                 <TextField {...field} select label="Branch (Optional)" fullWidth disabled={isLoadingBranches}>
//                     {isLoadingBranches ? <Box sx={{display: 'flex', justifyContent: 'center'}}><CircularProgress size={24}/></Box> : branches.map((branch) => (<MenuItem key={branch.id} value={branch.id}>{branch.name}</MenuItem>))}
//                 </TextField>
//               )} />
//             </Grid>
//             <Grid item xs={12}>
//                 <Controller name="is_active" control={control} render={({ field }) => (<FormControlLabel control={<Switch {...field} checked={!!field.value} />} label="User is Active" />)} />
//             </Grid>
//           </Grid>
//         </DialogContent>
//         <DialogActions>
//           <Button onClick={onClose} disabled={isLoading}>Cancel</Button>
//           <Button type="submit" variant="contained" disabled={isLoading}>
//             {isLoading ? 'Saving...' : (user ? 'Save Changes' : 'Create User')}
//           </Button>
//         </DialogActions>
//       </form>
//     </Dialog>
//   );
// };

// export default UserFormModal;
