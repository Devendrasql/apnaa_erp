// In frontend/src/features/categories/components/CategoryFormModal.jsx

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
  CircularProgress
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { useQuery } from 'react-query';
import { api } from '@shared/api';

const CategoryFormModal = ({ open, onClose, onSubmit, category, isLoading }) => {
  const { control, handleSubmit, reset, setValue } = useForm({
    defaultValues: {
      name: '',
      description: '',
      parent_id: '',
      is_active: true,
    }
  });

  // Fetch other categories to be used as a parent
  const { data: categoriesData, isLoading: isLoadingCategories } = useQuery(
    'categories', 
    () => api.getCategories()
  );
  const parentCategories = categoriesData?.data?.data || [];

  useEffect(() => {
    if (open) {
      if (category) {
        // Populate form for editing
        setValue('name', category.name);
        setValue('description', category.description || '');
        setValue('parent_id', category.parent_id || '');
        setValue('is_active', !!category.is_active);
      } else {
        // Reset to default for creating
        reset();
      }
    }
  }, [category, open, setValue, reset]);

  const handleFormSubmit = (data) => {
    onSubmit(data);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{category ? 'Edit Category' : 'Add New Category'}</DialogTitle>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Controller
                name="name"
                control={control}
                rules={{ required: 'Category name is required' }}
                render={({ field, fieldState }) => (
                  <TextField {...field} label="Category Name" fullWidth required autoFocus error={!!fieldState.error} helperText={fieldState.error?.message} />
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <TextField {...field} label="Description" fullWidth multiline rows={3} />
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <Controller
                name="parent_id"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label="Parent Category (Optional)"
                    fullWidth
                    disabled={isLoadingCategories}
                  >
                    <MenuItem value=""><em>None</em></MenuItem>
                    {parentCategories.map((cat) => (
                      // Prevent a category from being its own parent
                      cat.id !== category?.id && <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>
            <Grid item xs={12}>
                <Controller
                    name="is_active"
                    control={control}
                    render={({ field }) => (
                        <FormControlLabel
                            control={<Switch {...field} checked={!!field.value} />}
                            label="Active"
                        />
                    )}
                />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={isLoading}>
            {isLoading ? 'Saving...' : (category ? 'Save Changes' : 'Create Category')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default CategoryFormModal;

