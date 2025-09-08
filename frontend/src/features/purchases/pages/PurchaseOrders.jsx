// In frontend/src/pages/PurchaseOrders.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  CircularProgress,
  Alert,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip
} from '@mui/material';
import { Add } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';

import { api } from '@shared/api';
import { useAuth } from '@/contexts/AuthContext';
import PurchaseOrderFormModal from '@modules/purchases/components/PurchaseOrderFormModal';

const statusColors = {
  pending: 'warning',
  sent: 'info',
  received: 'success',
  cancelled: 'error',
  partially_received: 'secondary'
};

const PurchaseOrdersPage = () => {
  // const { currentBranch } = useAuth(); // 2. Get the currently selected branch
  const { currentBranch, hasPermission, isElevated } = useAuth(); // ✅ now we read permissions
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filters, setFilters] = useState({
    supplier_id: '',
    status: '',
    search: '',
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Fetch data for filters
  const { data: suppliersData } = useQuery('suppliers', () => api.getSuppliers());
  const suppliers = suppliersData?.data?.data || [];

  // 3. Update the useQuery hook to be branch-aware
  const { data, isLoading, error } = useQuery(
    ['purchaseOrders', page, rowsPerPage, filters, currentBranch?.id],
    () => api.getPurchaseOrders({
      page: page + 1,
      limit: rowsPerPage,
      branch_id: currentBranch?.id, // Always pass the current branch ID
      ...filters
    }),
    {
      enabled: !!currentBranch, // Only run query if a branch is selected
      keepPreviousData: true,
    }
  );

  const purchaseOrders = data?.data?.data || [];
  const totalPOs = data?.data?.pagination?.total || 0;
  
  const { mutate: createPurchaseOrder, isLoading: isCreating } = useMutation(api.createPurchaseOrder, {
    onSuccess: () => {
      toast.success('Purchase Order created successfully!');
      queryClient.invalidateQueries('purchaseOrders');
      setIsModalOpen(false);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to create Purchase Order.');
    }
  });

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setPage(0);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleAddNew = () => {
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const handleFormSubmit = (formData) => {
    // Automatically add the current branch ID to the form data
    createPurchaseOrder({ ...formData, branch_id: currentBranch.id });
  };

  const handleViewDetails = (poId) => {
    navigate(`/purchase-orders/${poId}`);
  };


  if (error) {
    return <Alert severity="error">Failed to load purchase orders. Please try again later.</Alert>;
  }

  // return (
  //   <Box>
  //     <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
  //       <Typography variant="h4">Purchase Orders</Typography>
  //       <Button
  //         variant="contained"
  //         startIcon={<Add />}
  //         onClick={handleAddNew}
  //         disabled={!currentBranch} // Disable button if no branch is selected
  //       >
  //         Create Purchase Order
  //       </Button>
  //     </Box>
    return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Purchase Orders</Typography>

        {(isElevated || hasPermission('procurement.po.create')) && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleAddNew}
            disabled={!currentBranch} // must have branch
          >
            Create Purchase Order
          </Button>
        )}
      </Box>

      <Paper sx={{ mb: 2, p: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}><TextField fullWidth name="search" label="Search by PO #" value={filters.search} onChange={handleFilterChange} /></Grid>
          <Grid item xs={12} sm={4}><FormControl fullWidth><InputLabel>Supplier</InputLabel><Select name="supplier_id" value={filters.supplier_id} label="Supplier" onChange={handleFilterChange}><MenuItem value=""><em>All</em></MenuItem>{suppliers.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}</Select></FormControl></Grid>
          <Grid item xs={12} sm={4}><FormControl fullWidth><InputLabel>Status</InputLabel><Select name="status" value={filters.status} label="Status" onChange={handleFilterChange}><MenuItem value=""><em>All</em></MenuItem><MenuItem value="pending">Pending</MenuItem><MenuItem value="sent">Sent</MenuItem><MenuItem value="received">Received</MenuItem><MenuItem value="cancelled">Cancelled</MenuItem></Select></FormControl></Grid>
        </Grid>
      </Paper>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>PO Number</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Supplier</TableCell>
                  <TableCell>Amount (₹)</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {purchaseOrders.map((po) => (
                  <TableRow key={po.id} hover>
                    <TableCell sx={{ fontWeight: 'bold' }}>{po.po_number}</TableCell>
                    <TableCell>{new Date(po.order_date).toLocaleDateString()}</TableCell>
                    <TableCell>{po.supplier_name}</TableCell>
                    <TableCell>₹{po.final_amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Chip label={po.status} color={statusColors[po.status] || 'default'} size="small" />
                    </TableCell>
                    <TableCell align="right">
                      <Button variant="outlined" size="small" onClick={() => handleViewDetails(po.id)}>View Details</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          <TablePagination
            rowsPerPageOptions={[10, 25, 50]}
            component="div"
            count={totalPOs}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </>
      )}

      <PurchaseOrderFormModal
        open={isModalOpen}
        onClose={handleModalClose}
        onSubmit={handleFormSubmit}
        isLoading={isCreating}
      />
    </Box>
  );
};

export default PurchaseOrdersPage;





// // In frontend/src/pages/PurchaseOrders.jsx

// import React, { useState } from 'react';
// import { useNavigate } from 'react-router-dom'; // 1. Import the useNavigate hook
// import {
//   Box,
//   Typography,
//   Button,
//   Paper,
//   Table,
//   TableBody,
//   TableCell,
//   TableContainer,
//   TableHead,
//   TableRow,
//   TablePagination,
//   CircularProgress,
//   Alert,
//   TextField,
//   Grid,
//   FormControl,
//   InputLabel,
//   Select,
//   MenuItem,
//   Chip
// } from '@mui/material';
// import { Add } from '@mui/icons-material';
// import { useQuery, useMutation, useQueryClient } from 'react-query';
// import toast from 'react-hot-toast';

// import { api } from '@shared/api';
// import PurchaseOrderFormModal from '@modules/purchases/components/PurchaseOrderFormModal';

// const statusColors = {
//   pending: 'warning',
//   sent: 'info',
//   received: 'success',
//   cancelled: 'error',
//   partially_received: 'secondary'
// };

// const PurchaseOrdersPage = () => {
//   const [page, setPage] = useState(0);
//   const [rowsPerPage, setRowsPerPage] = useState(10);
//   const [filters, setFilters] = useState({
//     branch_id: '',
//     supplier_id: '',
//     status: '',
//     search: '',
//   });

//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const queryClient = useQueryClient();
//   const navigate = useNavigate(); // 2. Initialize the navigate function

//   // Fetch data for filters
//   const { data: branchesData } = useQuery('branches', () => api.getBranches());
//   const { data: suppliersData } = useQuery('suppliers', () => api.getSuppliers());
//   const branches = branchesData?.data?.data || [];
//   const suppliers = suppliersData?.data?.data || [];

//   // Fetching purchase orders data
//   const { data, isLoading, error } = useQuery(
//     ['purchaseOrders', page, rowsPerPage, filters],
//     () => api.getPurchaseOrders({
//       page: page + 1,
//       limit: rowsPerPage,
//       ...filters
//     }),
//     {
//       keepPreviousData: true,
//     }
//   );

//   const purchaseOrders = data?.data?.data || [];
//   const totalPOs = data?.data?.pagination?.total || 0;
  
//   const { mutate: createPurchaseOrder, isLoading: isCreating } = useMutation(api.createPurchaseOrder, {
//     onSuccess: () => {
//       toast.success('Purchase Order created successfully!');
//       queryClient.invalidateQueries('purchaseOrders');
//       setIsModalOpen(false);
//     },
//     onError: (err) => {
//       toast.error(err.response?.data?.message || 'Failed to create Purchase Order.');
//     }
//   });

//   const handleFilterChange = (event) => {
//     const { name, value } = event.target;
//     setFilters(prev => ({ ...prev, [name]: value }));
//     setPage(0);
//   };

//   const handleChangePage = (event, newPage) => {
//     setPage(newPage);
//   };

//   const handleChangeRowsPerPage = (event) => {
//     setRowsPerPage(parseInt(event.target.value, 10));
//     setPage(0);
//   };

//   const handleAddNew = () => {
//     setIsModalOpen(true);
//   };

//   const handleModalClose = () => {
//     setIsModalOpen(false);
//   };

//   const handleFormSubmit = (formData) => {
//     createPurchaseOrder(formData);
//   };

//   // 3. Create the handler to navigate to the details page
//   const handleViewDetails = (poId) => {
//     navigate(`/purchase-orders/${poId}`);
//   };


//   if (error) {
//     return <Alert severity="error">Failed to load purchase orders. Please try again later.</Alert>;
//   }

//   return (
//     <Box>
//       <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
//         <Typography variant="h4">Purchase Orders</Typography>
//         <Button
//           variant="contained"
//           startIcon={<Add />}
//           onClick={handleAddNew}
//         >
//           Create Purchase Order
//         </Button>
//       </Box>

//       <Paper sx={{ mb: 2, p: 2 }}>
//         <Grid container spacing={2}>
//           <Grid item xs={12} sm={3}><TextField fullWidth name="search" label="Search by PO #" value={filters.search} onChange={handleFilterChange} /></Grid>
//           <Grid item xs={12} sm={3}><FormControl fullWidth><InputLabel>Branch</InputLabel><Select name="branch_id" value={filters.branch_id} label="Branch" onChange={handleFilterChange}><MenuItem value=""><em>All</em></MenuItem>{branches.map(b => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}</Select></FormControl></Grid>
//           <Grid item xs={12} sm={3}><FormControl fullWidth><InputLabel>Supplier</InputLabel><Select name="supplier_id" value={filters.supplier_id} label="Supplier" onChange={handleFilterChange}><MenuItem value=""><em>All</em></MenuItem>{suppliers.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}</Select></FormControl></Grid>
//           <Grid item xs={12} sm={3}><FormControl fullWidth><InputLabel>Status</InputLabel><Select name="status" value={filters.status} label="Status" onChange={handleFilterChange}><MenuItem value=""><em>All</em></MenuItem><MenuItem value="pending">Pending</MenuItem><MenuItem value="sent">Sent</MenuItem><MenuItem value="received">Received</MenuItem><MenuItem value="cancelled">Cancelled</MenuItem></Select></FormControl></Grid>
//         </Grid>
//       </Paper>

//       {isLoading ? (
//         <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
//       ) : (
//         <>
//           <TableContainer component={Paper}>
//             <Table>
//               <TableHead>
//                 <TableRow>
//                   <TableCell>PO Number</TableCell>
//                   <TableCell>Date</TableCell>
//                   <TableCell>Branch</TableCell>
//                   <TableCell>Supplier</TableCell>
//                   <TableCell>Amount (₹)</TableCell>
//                   <TableCell>Status</TableCell>
//                   <TableCell align="right">Actions</TableCell>
//                 </TableRow>
//               </TableHead>
//               <TableBody>
//                 {purchaseOrders.map((po) => (
//                   <TableRow key={po.id} hover>
//                     <TableCell sx={{ fontWeight: 'bold' }}>{po.po_number}</TableCell>
//                     <TableCell>{new Date(po.order_date).toLocaleDateString()}</TableCell>
//                     <TableCell>{po.branch_name}</TableCell>
//                     <TableCell>{po.supplier_name}</TableCell>
//                     <TableCell>₹{po.final_amount.toLocaleString()}</TableCell>
//                     <TableCell>
//                       <Chip label={po.status} color={statusColors[po.status] || 'default'} size="small" />
//                     </TableCell>
//                     <TableCell align="right">
//                       {/* 4. Connect the handler to the button's onClick event */}
//                       <Button variant="outlined" size="small" onClick={() => handleViewDetails(po.id)}>View Details</Button>
//                     </TableCell>
//                   </TableRow>
//                 ))}
//               </TableBody>
//             </Table>
//           </TableContainer>
          
//           <TablePagination
//             rowsPerPageOptions={[10, 25, 50]}
//             component="div"
//             count={totalPOs}
//             rowsPerPage={rowsPerPage}
//             page={page}
//             onPageChange={handleChangePage}
//             onRowsPerPageChange={handleChangeRowsPerPage}
//           />
//         </>
//       )}

//       <PurchaseOrderFormModal
//         open={isModalOpen}
//         onClose={handleModalClose}
//         onSubmit={handleFormSubmit}
//         isLoading={isCreating}
//       />
//     </Box>
//   );
// };

// export default PurchaseOrdersPage;




