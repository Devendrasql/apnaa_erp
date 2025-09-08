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
import { api } from '@shared/api';
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
      role_id: '',
      default_branch_id: '',
      accessible_branches: [],
      is_active: true,
    }
  });

  const { data: branchesData } = useQuery('branches', () => api.getBranches());
  const { data: rolesData } = useQuery('roles', () => api.getAllRoles());

  const branches = branchesData?.data?.data || [];
  const roles = rolesData?.data?.data || [];

  useEffect(() => {
    if (open) {
      if (user) {
        api.getUserById(user.id).then((response) => {
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

          const accessible = branches.filter((b) => fullUser.accessible_branch_ids.includes(b.id));
          setValue('accessible_branches', accessible);
        });
      } else {
        reset({
          first_name: '',
          last_name: '',
          username: '',
          email: '',
          password: '',
          phone: '',
          role_id: '',
          default_branch_id: '',
          accessible_branches: [],
          is_active: true,
        });
      }
    }
  }, [user, open, setValue, reset, branches]);

  const handleFormSubmit = (data) => {
    const submissionData = {
      ...data,
      accessible_branch_ids: data.accessible_branches.map((b) => b.id),
    };
    delete submissionData.accessible_branches;
    if (user && !data.password) delete submissionData.password;
    onSubmit(submissionData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{user ? 'Edit User' : 'Add New User'}</DialogTitle>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <Controller name="first_name" control={control} rules={{ required: 'First name is required' }} render={({ field, fieldState }) => (<TextField {...field} label="First Name" fullWidth required error={!!fieldState.error} helperText={fieldState.error?.message} />)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller name="last_name" control={control} rules={{ required: 'Last name is required' }} render={({ field, fieldState }) => (<TextField {...field} label="Last Name" fullWidth required error={!!fieldState.error} helperText={fieldState.error?.message} />)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller name="username" control={control} rules={{ required: 'Username is required' }} render={({ field, fieldState }) => (<TextField {...field} label="Username" fullWidth required error={!!fieldState.error} helperText={fieldState.error?.message} />)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller name="email" control={control} rules={{ required: 'Email is required' }} render={({ field, fieldState }) => (<TextField {...field} label="Email" type="email" fullWidth required error={!!fieldState.error} helperText={fieldState.error?.message} />)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller name="password" control={control} rules={{ required: !user }} render={({ field, fieldState }) => (<TextField {...field} label="Password" type="password" fullWidth required={!user} helperText={user ? 'Leave blank to keep current password' : ''} error={!!fieldState.error} />)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller name="phone" control={control} render={({ field }) => (<TextField {...field} label="Phone" fullWidth />)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller name="role_id" control={control} rules={{ required: 'Role is required' }} render={({ field, fieldState }) => (
                <TextField {...field} select label="Role" fullWidth required error={!!fieldState.error} helperText={fieldState.error?.message}>
                  {roles.map((r) => (
                    <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
                  ))}
                </TextField>
              )} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller name="default_branch_id" control={control} render={({ field, fieldState }) => (
                <TextField {...field} select label="Default Branch (Optional)" fullWidth error={!!fieldState.error} helperText={fieldState.error?.message}>
                  {branches.map((b) => (
                    <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
                  ))}
                </TextField>
              )} />
            </Grid>
            <Grid item xs={12}>
              <Controller
                name="accessible_branches"
                control={control}
                render={({ field }) => (
                  <Autocomplete
                    {...field}
                    multiple
                    options={branches}
                    getOptionLabel={(o) => o.name || ''}
                    onChange={(_e, value) => field.onChange(value)}
                    renderInput={(params) => <TextField {...params} label="Accessible Branches" placeholder="Select branches" />}
                    renderTags={(value, getTagProps) => value.map((option, index) => (<Chip {...getTagProps({ index })} key={option.id} label={option.name} />))}
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
          <Button type="submit" variant="contained" disabled={isLoading}>{isLoading ? 'Saving...' : user ? 'Save Changes' : 'Create User'}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default UserFormModal;
