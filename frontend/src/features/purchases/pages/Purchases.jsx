// In frontend/src/pages/Purchases.jsx

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
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  TextField
} from '@mui/material';
import { Add } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';

import { api } from '@shared/api';
import { useAuth } from '@/contexts/AuthContext';
import PurchaseFormModal from '@features/purchases/components/PurchaseFormModal';

const PurchasesPage = () => {
  const { currentBranch } = useAuth(); // 2. Get the currently selected branch
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filters, setFilters] = useState({
    supplier_id: '',
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
    ['purchases', page, rowsPerPage, filters, currentBranch?.id],
    () => {
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        branch_id: currentBranch?.id, // Always pass the current branch ID
      };
      if (filters.supplier_id) params.supplier_id = filters.supplier_id;
      if (filters.search) params.search = filters.search;
      return api.getAllPurchases(params);
    },
    {
      enabled: !!currentBranch, // Only run query if a branch is selected
      keepPreviousData: true,
    }
  );

  const purchases = data?.data?.data || [];
  const totalPurchases = data?.data?.pagination?.total || 0;

  const { mutate: createPurchase, isLoading: isCreating } = useMutation(api.createPurchase, {
    onSuccess: () => {
        toast.success('Purchase entry created successfully!');
        queryClient.invalidateQueries('purchases');
        setIsModalOpen(false);
    },
    onError: (err) => {
        toast.error(err.response?.data?.message || 'Failed to create purchase entry.');
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
    createPurchase(formData);
  };

  const handleViewDetails = (purchaseId) => {
    navigate(`/purchases/${purchaseId}`);
  };

  if (error) {
    return <Alert severity="error">Failed to load purchases. Please try again later.</Alert>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Purchase Entries</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleAddNew}
          disabled={!currentBranch} // Disable button if no branch is selected
        >
          New Purchase Entry
        </Button>
      </Box>

      <Paper sx={{ mb: 2, p: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}><TextField fullWidth name="search" label="Search by Invoice #" value={filters.search} onChange={handleFilterChange} /></Grid>
          <Grid item xs={12} sm={6}><FormControl fullWidth><InputLabel>Supplier</InputLabel><Select name="supplier_id" value={filters.supplier_id} label="Supplier" onChange={handleFilterChange}><MenuItem value=""><em>All</em></MenuItem>{suppliers.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}</Select></FormControl></Grid>
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
                  <TableCell>Invoice #</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Supplier</TableCell>
                  <TableCell>Amount (₹)</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {purchases.map((purchase) => (
                  <TableRow key={purchase.id} hover>
                    <TableCell sx={{ fontWeight: 'bold' }}>{purchase.invoice_number}</TableCell>
                    <TableCell>{new Date(purchase.invoice_date).toLocaleDateString()}</TableCell>
                    <TableCell>{purchase.supplier_name}</TableCell>
                    <TableCell>₹{purchase.net_amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Chip label={purchase.is_posted ? 'Posted' : 'Pending'} color={purchase.is_posted ? 'success' : 'warning'} size="small" />
                    </TableCell>
                    <TableCell align="right">
                      <Button variant="outlined" size="small" onClick={() => handleViewDetails(purchase.id)}>View Details</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          <TablePagination
            rowsPerPageOptions={[10, 25, 50]}
            component="div"
            count={totalPurchases}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </>
      )}

      <PurchaseFormModal
        open={isModalOpen}
        onClose={handleModalClose}
        onSubmit={handleFormSubmit}
        isLoading={isCreating}
      />
    </Box>
  );
};

export default PurchasesPage;





// // In frontend/src/pages/Purchases.jsx

// import React, { useState } from 'react';
// import { useNavigate } from 'react-router-dom'; // 1. Import useNavigate
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
//   Grid,
//   FormControl,
//   InputLabel,
//   Select,
//   MenuItem,
//   Chip,
//   TextField
// } from '@mui/material';
// import { Add } from '@mui/icons-material';
// import { useQuery, useMutation, useQueryClient } from 'react-query';
// import toast from 'react-hot-toast';

// import { api } from '../services/api';
// import PurchaseFormModal from '../components/PurchaseFormModal';

// const PurchasesPage = () => {
//   const [page, setPage] = useState(0);
//   const [rowsPerPage, setRowsPerPage] = useState(10);
//   const [filters, setFilters] = useState({
//     branch_id: '',
//     supplier_id: '',
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

//   // Fetching purchases data
//   const { data, isLoading, error } = useQuery(
//     ['purchases', page, rowsPerPage, filters],
//     () => api.getAllPurchases({
//       page: page + 1,
//       limit: rowsPerPage,
//       ...filters
//     }),
//     {
//       keepPreviousData: true,
//     }
//   );

//   const purchases = data?.data?.data || [];
//   const totalPurchases = data?.data?.pagination?.total || 0;

//   const { mutate: createPurchase, isLoading: isCreating } = useMutation(api.createPurchase, {
//     onSuccess: () => {
//         toast.success('Purchase entry created successfully!');
//         queryClient.invalidateQueries('purchases');
//         setIsModalOpen(false);
//     },
//     onError: (err) => {
//         toast.error(err.response?.data?.message || 'Failed to create purchase entry.');
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
//     createPurchase(formData);
//   };

//   // 3. Update the handler to navigate to the details page
//   const handleViewDetails = (purchaseId) => {
//     navigate(`/purchases/${purchaseId}`);
//   };

//   if (error) {
//     return <Alert severity="error">Failed to load purchases. Please try again later.</Alert>;
//   }

//   return (
//     <Box>
//       <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
//         <Typography variant="h4">Purchase Entries</Typography>
//         <Button
//           variant="contained"
//           startIcon={<Add />}
//           onClick={handleAddNew}
//         >
//           New Purchase Entry
//         </Button>
//       </Box>

//       <Paper sx={{ mb: 2, p: 2 }}>
//         <Grid container spacing={2}>
//           <Grid item xs={12} sm={4}><TextField fullWidth name="search" label="Search by Invoice #" value={filters.search} onChange={handleFilterChange} /></Grid>
//           <Grid item xs={12} sm={4}><FormControl fullWidth><InputLabel>Branch</InputLabel><Select name="branch_id" value={filters.branch_id} label="Branch" onChange={handleFilterChange}><MenuItem value=""><em>All</em></MenuItem>{branches.map(b => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}</Select></FormControl></Grid>
//           <Grid item xs={12} sm={4}><FormControl fullWidth><InputLabel>Supplier</InputLabel><Select name="supplier_id" value={filters.supplier_id} label="Supplier" onChange={handleFilterChange}><MenuItem value=""><em>All</em></MenuItem>{suppliers.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}</Select></FormControl></Grid>
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
//                   <TableCell>Invoice #</TableCell>
//                   <TableCell>Date</TableCell>
//                   <TableCell>Branch</TableCell>
//                   <TableCell>Supplier</TableCell>
//                   <TableCell>Amount (₹)</TableCell>
//                   <TableCell>Status</TableCell>
//                   <TableCell align="right">Actions</TableCell>
//                 </TableRow>
//               </TableHead>
//               <TableBody>
//                 {purchases.map((purchase) => (
//                   <TableRow key={purchase.id} hover>
//                     <TableCell sx={{ fontWeight: 'bold' }}>{purchase.invoice_number}</TableCell>
//                     <TableCell>{new Date(purchase.invoice_date).toLocaleDateString()}</TableCell>
//                     <TableCell>{purchase.branch_name}</TableCell>
//                     <TableCell>{purchase.supplier_name}</TableCell>
//                     <TableCell>₹{purchase.net_amount.toLocaleString()}</TableCell>
//                     <TableCell>
//                       <Chip label={purchase.is_posted ? 'Posted' : 'Pending'} color={purchase.is_posted ? 'success' : 'warning'} size="small" />
//                     </TableCell>
//                     <TableCell align="right">
//                       {/* 4. Connect the handler to the button's onClick event */}
//                       <Button variant="outlined" size="small" onClick={() => handleViewDetails(purchase.id)}>View Details</Button>
//                     </TableCell>
//                   </TableRow>
//                 ))}
//               </TableBody>
//             </Table>
//           </TableContainer>
          
//           <TablePagination
//             rowsPerPageOptions={[10, 25, 50]}
//             component="div"
//             count={totalPurchases}
//             rowsPerPage={rowsPerPage}
//             page={page}
//             onPageChange={handleChangePage}
//             onRowsPerPageChange={handleChangeRowsPerPage}
//           />
//         </>
//       )}

//       <PurchaseFormModal
//         open={isModalOpen}
//         onClose={handleModalClose}
//         onSubmit={handleFormSubmit}
//         isLoading={isCreating}
//       />
//     </Box>
//   );
// };

// export default PurchasesPage;
