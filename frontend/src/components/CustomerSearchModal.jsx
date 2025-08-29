// In frontend/src/components/CustomerSearchModal.jsx

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  CircularProgress,
  Typography,
  Box
} from '@mui/material';
import { useQuery } from 'react-query';
import { useDebounce } from 'use-debounce';
import { api } from '../services/api';

const CustomerSearchModal = ({ open, onClose, onSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);

  const { data: customersData, isLoading } = useQuery(
    ['customersForSale', debouncedSearchTerm],
    () => api.getCustomers({ search: debouncedSearchTerm, limit: 10 }),
    {
      enabled: !!debouncedSearchTerm,
      select: (response) => response.data.data,
    }
  );
  const customers = customersData || [];

  const handleSelectCustomer = (customer) => {
    onSelect(customer);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Select Customer</DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          autoFocus
          margin="dense"
          label="Search by name or phone number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ mt: 1 }}
        />
        <Box sx={{ minHeight: '300px', mt: 2 }}>
          {isLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          )}
          {!isLoading && customers.length > 0 && (
            <List>
              {customers.map((customer) => (
                <ListItemButton key={customer.id} onClick={() => handleSelectCustomer(customer)}>
                  <ListItemText
                    primary={`${customer.first_name} ${customer.last_name}`}
                    secondary={customer.phone}
                  />
                </ListItemButton>
              ))}
            </List>
          )}
          {!isLoading && customers.length === 0 && debouncedSearchTerm && (
            <Typography sx={{ textAlign: 'center', mt: 4, color: 'text.secondary' }}>
              No customers found.
            </Typography>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerSearchModal;
