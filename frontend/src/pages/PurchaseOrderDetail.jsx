// In frontend/src/pages/PurchaseOrderDetail.jsx

import React from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  Alert,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  TextField
} from '@mui/material';
import { ArrowBack, CheckCircle } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import toast from 'react-hot-toast';
import { api } from '../services/api';

const statusColors = {
    pending: 'warning',
    sent: 'info',
    received: 'success',
    cancelled: 'error',
    partially_received: 'secondary'
};

const PurchaseOrderDetailPage = () => {
  const { id: poId } = useParams();
  const queryClient = useQueryClient();

  const { data: po, isLoading, error } = useQuery(
    ['purchaseOrderDetails', poId],
    () => api.getPurchaseOrderById(poId),
    {
      enabled: !!poId,
      select: (response) => response.data.data,
    }
  );

  const { control, handleSubmit, setValue, watch } = useForm({
      defaultValues: {
          items: []
      }
  });

  const { fields } = useFieldArray({
      control,
      name: "items"
  });

  const watchedItems = watch("items");

  React.useEffect(() => {
    if (po?.items) {
      setValue('items', po.items.map(item => ({
        ...item,
        // Store the original received quantity for display and validation
        quantity_received_from_db: item.quantity_received || 0,
        // This is the new input field for receiving more stock
        quantity_received: '', 
        batch_number: '',
        expiry_date: '',
      })));
    }
  }, [po, setValue]);
  
  const { mutate: receiveStock, isLoading: isReceiving } = useMutation(
    (data) => api.receivePurchaseOrder(poId, data),
    {
        onSuccess: () => {
            toast.success('Stock received successfully!');
            queryClient.invalidateQueries(['purchaseOrderDetails', poId]);
            queryClient.invalidateQueries('purchaseOrders');
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || 'Failed to receive stock.');
        }
    }
  );
  
  const onReceiveSubmit = (data) => {
      const receivedItems = data.items
        .filter(item => {
            const newQty = Number(item.quantity_received);
            const maxReceivable = item.quantity_ordered - item.quantity_received_from_db;
            return newQty > 0 && newQty <= maxReceivable && item.batch_number && item.expiry_date;
        })
        .map(item => ({
            id: item.id, // This is the purchase_order_item ID
            product_id: item.product_id,
            branch_id: po.branch_id,
            supplier_id: po.supplier_id,
            quantity_to_receive: Number(item.quantity_received),
            batch_number: item.batch_number,
            expiry_date: item.expiry_date,
            purchase_price: item.unit_price,
            mrp: item.mrp,
            selling_price: item.selling_price,
        }));

      if (receivedItems.length === 0) {
          toast.error("Please enter a valid quantity, batch #, and expiry for at least one item.");
          return;
      }
      
      // FIX: Send the data with the correct key 'poItems'
      receiveStock({ poItems: receivedItems });
  };

  if (isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  }

  if (error) {
    return <Alert severity="error">Failed to load purchase order details.</Alert>;
  }

  if (!po) {
    return <Typography>No Purchase Order data found.</Typography>;
  }

  return (
    <Box>
      <Button component={RouterLink} to="/purchase-orders" startIcon={<ArrowBack />} sx={{ mb: 2 }}>
        Back to Purchase Orders
      </Button>

      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box>
                <Typography variant="h4" gutterBottom>Purchase Order</Typography>
                <Typography variant="h6" color="primary.main">{po.po_number}</Typography>
            </Box>
            <Chip label={po.status.replace('_', ' ')} color={statusColors[po.status] || 'default'} sx={{textTransform: 'capitalize'}} />
        </Box>
        <Divider sx={{ my: 2 }} />
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}><Typography variant="subtitle2" color="text.secondary">Supplier:</Typography><Typography>{po.supplier_name}</Typography></Grid>
          <Grid item xs={12} md={6}><Typography variant="subtitle2" color="text.secondary">Branch:</Typography><Typography>{po.branch_name}</Typography></Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Receive Stock</Typography>
        <form onSubmit={handleSubmit(onReceiveSubmit)}>
            <TableContainer>
            <Table>
                <TableHead>
                <TableRow>
                    <TableCell sx={{width: '30%'}}>Product</TableCell>
                    <TableCell align="center">Ordered</TableCell>
                    <TableCell align="center">Already Received</TableCell>
                    <TableCell>Receive Qty</TableCell>
                    <TableCell>Batch #</TableCell>
                    <TableCell>Expiry Date</TableCell>
                </TableRow>
                </TableHead>
                <TableBody>
                {fields.map((item, index) => {
                    const isReceiving = watchedItems[index]?.quantity_received > 0;
                    return (
                        <TableRow key={item.id}>
                            <TableCell>{item.product_name} ({item.sku})</TableCell>
                            <TableCell align="center">{item.quantity_ordered}</TableCell>
                            <TableCell align="center">{item.quantity_received_from_db}</TableCell>
                            <TableCell>
                                <Controller name={`items.${index}.quantity_received`} control={control} render={({ field }) => (<TextField {...field} type="number" size="small" sx={{width: '100px'}} inputProps={{ max: item.quantity_ordered - item.quantity_received_from_db, min: 0 }} />)} />
                            </TableCell>
                            <TableCell>
                                <Controller 
                                    name={`items.${index}.batch_number`} 
                                    control={control} 
                                    rules={{ required: isReceiving ? 'Required' : false }}
                                    render={({ field, fieldState }) => (
                                        <TextField {...field} size="small" required={isReceiving} error={!!fieldState.error} helperText={fieldState.error?.message} />
                                    )} 
                                />
                            </TableCell>
                            <TableCell>
                                <Controller 
                                    name={`items.${index}.expiry_date`} 
                                    control={control} 
                                    rules={{ required: isReceiving ? 'Required' : false }}
                                    render={({ field, fieldState }) => (
                                        <TextField {...field} type="date" size="small" InputLabelProps={{ shrink: true }} required={isReceiving} error={!!fieldState.error} helperText={fieldState.error?.message} />
                                    )} 
                                />
                            </TableCell>
                        </TableRow>
                    );
                })}
                </TableBody>
            </Table>
            </TableContainer>
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                <Button type="submit" variant="contained" startIcon={<CheckCircle />} disabled={isReceiving}>
                    {isReceiving ? 'Processing...' : 'Receive Selected Stock'}
                </Button>
            </Box>
        </form>
      </Paper>
    </Box>
  );
};

export default PurchaseOrderDetailPage;





// // In frontend/src/pages/PurchaseOrderDetail.jsx

// import React from 'react';
// import { useParams, Link as RouterLink } from 'react-router-dom';
// import {
//   Box,
//   Typography,
//   Paper,
//   Grid,
//   CircularProgress,
//   Alert,
//   Divider,
//   Table,
//   TableBody,
//   TableCell,
//   TableContainer,
//   TableHead,
//   TableRow,
//   Button,
//   Chip,
//   TextField
// } from '@mui/material';
// import { ArrowBack, CheckCircle } from '@mui/icons-material';
// import { useQuery, useMutation, useQueryClient } from 'react-query';
// import { useForm, Controller, useFieldArray } from 'react-hook-form';
// import toast from 'react-hot-toast';
// import { api } from '../services/api';

// const statusColors = {
//     pending: 'warning',
//     sent: 'info',
//     received: 'success',
//     cancelled: 'error',
//     partially_received: 'secondary'
// };

// const PurchaseOrderDetailPage = () => {
//   const { id: poId } = useParams();
//   const queryClient = useQueryClient();

//   const { data: po, isLoading, error } = useQuery(
//     ['purchaseOrderDetails', poId],
//     () => api.getPurchaseOrderById(poId),
//     {
//       enabled: !!poId,
//       select: (response) => response.data.data,
//     }
//   );

//   const { control, handleSubmit, setValue, watch } = useForm({
//       defaultValues: {
//           items: []
//       }
//   });

//   const { fields } = useFieldArray({
//       control,
//       name: "items"
//   });

//   const watchedItems = watch("items");

//   React.useEffect(() => {
//     if (po?.items) {
//       setValue('items', po.items.map(item => ({
//         ...item,
//         // Store the original received quantity for validation
//         quantity_received_from_db: item.quantity_received || 0,
//         // This is the new input field for receiving more stock
//         quantity_received: '', 
//         batch_number: '',
//         expiry_date: '',
//       })));
//     }
//   }, [po, setValue]);
  
//   const { mutate: receiveStock, isLoading: isReceiving } = useMutation(
//     (data) => api.receivePurchaseOrder(poId, data),
//     {
//         onSuccess: () => {
//             toast.success('Stock received successfully!');
//             queryClient.invalidateQueries(['purchaseOrderDetails', poId]);
//             queryClient.invalidateQueries('purchaseOrders');
//         },
//         onError: (err) => {
//             toast.error(err.response?.data?.message || 'Failed to receive stock.');
//         }
//     }
//   );
  
//   const onReceiveSubmit = (data) => {
//       const receivedItems = data.items
//         .filter(item => {
//             const newQty = Number(item.quantity_received);
//             const maxReceivable = item.quantity_ordered - item.quantity_received_from_db;
//             return newQty > 0 && newQty <= maxReceivable && item.batch_number && item.expiry_date;
//         })
//         .map(item => ({
//             id: item.id, // This is the purchase_order_item ID
//             product_id: item.product_id,
//             branch_id: po.branch_id,
//             supplier_id: po.supplier_id,
//             quantity_to_receive: Number(item.quantity_received), // Use a clear name
//             batch_number: item.batch_number,
//             expiry_date: item.expiry_date,
//             purchase_price: item.unit_price,
//             mrp: item.mrp, // Assuming these are part of the item data
//             selling_price: item.selling_price,
//         }));

//       if (receivedItems.length === 0) {
//           toast.error("Please enter a valid quantity, batch #, and expiry for at least one item.");
//           return;
//       }
      
//       // The backend expects the key to be 'poItems'
//       receiveStock({ poItems: receivedItems });
//   };

//   if (isLoading) {
//     return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
//   }

//   if (error) {
//     return <Alert severity="error">Failed to load purchase order details.</Alert>;
//   }

//   if (!po) {
//     return <Typography>No Purchase Order data found.</Typography>;
//   }

//   return (
//     <Box>
//       <Button component={RouterLink} to="/purchase-orders" startIcon={<ArrowBack />} sx={{ mb: 2 }}>
//         Back to Purchase Orders
//       </Button>

//       <Paper sx={{ p: 3 }}>
//         <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
//             <Box>
//                 <Typography variant="h4" gutterBottom>Purchase Order</Typography>
//                 <Typography variant="h6" color="primary.main">{po.po_number}</Typography>
//             </Box>
//             <Chip label={po.status.replace('_', ' ')} color={statusColors[po.status] || 'default'} sx={{textTransform: 'capitalize'}} />
//         </Box>
//         <Divider sx={{ my: 2 }} />
//         <Grid container spacing={2}>
//           <Grid item xs={12} md={6}><Typography variant="subtitle2" color="text.secondary">Supplier:</Typography><Typography>{po.supplier_name}</Typography></Grid>
//           <Grid item xs={12} md={6}><Typography variant="subtitle2" color="text.secondary">Branch:</Typography><Typography>{po.branch_name}</Typography></Grid>
//         </Grid>
//       </Paper>

//       <Paper sx={{ p: 3, mt: 3 }}>
//         <Typography variant="h6" sx={{ mb: 2 }}>Receive Stock</Typography>
//         <form onSubmit={handleSubmit(onReceiveSubmit)}>
//             <TableContainer>
//             <Table>
//                 <TableHead>
//                 <TableRow>
//                     <TableCell sx={{width: '30%'}}>Product</TableCell>
//                     <TableCell align="center">Ordered</TableCell>
//                     <TableCell align="center">Received</TableCell>
//                     <TableCell>Receive Qty</TableCell>
//                     <TableCell>Batch #</TableCell>
//                     <TableCell>Expiry Date</TableCell>
//                 </TableRow>
//                 </TableHead>
//                 <TableBody>
//                 {fields.map((item, index) => {
//                     const isReceiving = watchedItems[index]?.quantity_received > 0;
//                     return (
//                         <TableRow key={item.id}>
//                             <TableCell>{item.product_name} ({item.sku})</TableCell>
//                             <TableCell align="center">{item.quantity_ordered}</TableCell>
//                             <TableCell align="center">{item.quantity_received_from_db}</TableCell>
//                             <TableCell>
//                                 <Controller name={`items.${index}.quantity_received`} control={control} render={({ field }) => (<TextField {...field} type="number" size="small" sx={{width: '100px'}} inputProps={{ max: item.quantity_ordered - item.quantity_received_from_db, min: 0 }} />)} />
//                             </TableCell>
//                             <TableCell>
//                                 <Controller 
//                                     name={`items.${index}.batch_number`} 
//                                     control={control} 
//                                     rules={{ required: isReceiving ? 'Required' : false }}
//                                     render={({ field, fieldState }) => (
//                                         <TextField {...field} size="small" required={isReceiving} error={!!fieldState.error} helperText={fieldState.error?.message} />
//                                     )} 
//                                 />
//                             </TableCell>
//                             <TableCell>
//                                 <Controller 
//                                     name={`items.${index}.expiry_date`} 
//                                     control={control} 
//                                     rules={{ required: isReceiving ? 'Required' : false }}
//                                     render={({ field, fieldState }) => (
//                                         <TextField {...field} type="date" size="small" InputLabelProps={{ shrink: true }} required={isReceiving} error={!!fieldState.error} helperText={fieldState.error?.message} />
//                                     )} 
//                                 />
//                             </TableCell>
//                         </TableRow>
//                     );
//                 })}
//                 </TableBody>
//             </Table>
//             </TableContainer>
//             <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
//                 <Button type="submit" variant="contained" startIcon={<CheckCircle />} disabled={isReceiving}>
//                     {isReceiving ? 'Processing...' : 'Receive Selected Stock'}
//                 </Button>
//             </Box>
//         </form>
//       </Paper>
//     </Box>
//   );
// };

// export default PurchaseOrderDetailPage;
