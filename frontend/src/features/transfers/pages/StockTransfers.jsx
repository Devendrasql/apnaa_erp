// In frontend/src/pages/StockTransfers.jsx

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
  Chip
} from '@mui/material';
import { Add } from '@mui/icons-material';
import { useQueryClient } from 'react-query';
import toast from 'react-hot-toast';

import { api } from '@shared/api'; 
import { useAuth } from '@/contexts/AuthContext';
import { useTransfers, useCreateTransfer } from '@features/transfers/hooks';
import StockTransferFormModal from '@features/transfers/components/StockTransferFormModal';

const statusColors = {
  pending: 'warning',
  in_transit: 'info',
  received: 'success',
  cancelled: 'error',
};

const StockTransfersPage = () => {
  const { currentBranch } = useAuth(); // 2. Get the currently selected branch
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filters, setFilters] = useState({
    status: '',
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // 3. Update the useQuery hook to be branch-aware
  const { data, isLoading, error } = useTransfers({
    page: page + 1,
    limit: rowsPerPage,
    branch_id: currentBranch?.id,
    ...filters,
  });

  const transfers = data?.data?.data || [];
  const totalTransfers = data?.data?.pagination?.total || 0;
  
  const createTransferMutation = useCreateTransfer();

  const handleFilterChange = (event) => {
    setFilters(prev => ({ ...prev, [event.target.name]: event.target.value }));
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
    createTransferMutation.mutate(formData, {
      onSuccess: () => {
        toast.success('Stock Transfer request created successfully!');
        queryClient.invalidateQueries(['transfers']);
        setIsModalOpen(false);
      },
      onError: (err) => toast.error(err?.response?.data?.message || 'Failed to create transfer.'),
    });
  };

  const handleViewDetails = (transferId) => {
    navigate(`/stock-transfers/${transferId}`);
  };

  if (error) {
    return <Alert severity="error">Failed to load stock transfers. Please try again later.</Alert>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Stock Transfers</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleAddNew}
          disabled={!currentBranch} // Disable button if no branch is selected
        >
          Create Transfer
        </Button>
      </Box>

      <Paper sx={{ mb: 2, p: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={12}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select name="status" value={filters.status} label="Status" onChange={handleFilterChange}>
                <MenuItem value=""><em>All</em></MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="in_transit">In Transit</MenuItem>
                <MenuItem value="received">Received</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>
          </Grid>
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
                  <TableCell>Transfer #</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>From Branch</TableCell>
                  <TableCell>To Branch</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transfers.map((transfer) => (
                  <TableRow key={transfer.id} hover>
                    <TableCell sx={{ fontWeight: 'bold' }}>{transfer.transfer_number}</TableCell>
                    <TableCell>{new Date(transfer.transfer_date).toLocaleDateString()}</TableCell>
                    <TableCell>{transfer.from_branch_name}</TableCell>
                    <TableCell>{transfer.to_branch_name}</TableCell>
                    <TableCell>
                      <Chip label={transfer.status.replace('_', ' ')} color={statusColors[transfer.status] || 'default'} size="small" sx={{textTransform: 'capitalize'}} />
                    </TableCell>
                    <TableCell align="right">
                      <Button variant="outlined" size="small" onClick={() => handleViewDetails(transfer.id)}>View Details</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          <TablePagination
            rowsPerPageOptions={[10, 25, 50]}
            component="div"
            count={totalTransfers}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </>
      )}

        <StockTransferFormModal
          open={isModalOpen}
          onClose={handleModalClose}
          onSubmit={handleFormSubmit}
          isLoading={createTransferMutation.isLoading}
        />
    </Box>
  );
};

export default StockTransfersPage;





// // In frontend/src/pages/StockTransfers.jsx

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

// import { api } from '../services/api'; 
// import StockTransferFormModal from '../components/StockTransferFormModal';

// const statusColors = {
//   pending: 'warning',
//   in_transit: 'info',
//   received: 'success',
//   cancelled: 'error',
// };

// const StockTransfersPage = () => {
//   const [page, setPage] = useState(0);
//   const [rowsPerPage, setRowsPerPage] = useState(10);
//   const [filters, setFilters] = useState({
//     from_branch_id: '',
//     to_branch_id: '',
//     status: '',
//   });

//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const queryClient = useQueryClient();
//   const navigate = useNavigate(); // 2. Initialize the navigate function

//   // Fetch data for filters
//   const { data: branchesData } = useQuery('branches', () => api.getBranches());
//   const branches = branchesData?.data?.data || [];

//   // Fetching stock transfers data
//   const { data, isLoading, error } = useQuery(
//     ['stockTransfers', page, rowsPerPage, filters],
//     () => api.getStockTransfers({ 
//       page: page + 1, 
//       limit: rowsPerPage, 
//       ...filters 
//     }),
//     {
//       keepPreviousData: true,
//     }
//   );

//   const transfers = data?.data?.data || [];
//   const totalTransfers = data?.data?.pagination?.total || 0;
  
//   const { mutate: createStockTransfer, isLoading: isCreating } = useMutation(api.createStockTransfer, {
//     onSuccess: () => {
//       toast.success('Stock Transfer request created successfully!');
//       queryClient.invalidateQueries('stockTransfers');
//       setIsModalOpen(false);
//     },
//     onError: (err) => {
//       toast.error(err.response?.data?.message || 'Failed to create transfer.');
//     }
//   });

//   const handleFilterChange = (event) => {
//     setFilters(prev => ({ ...prev, [event.target.name]: event.target.value }));
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
//     createStockTransfer(formData);
//   };

//   // 3. Create the handler to navigate to the details page
//   const handleViewDetails = (transferId) => {
//     navigate(`/stock-transfers/${transferId}`);
//   };


//   if (error) {
//     return <Alert severity="error">Failed to load stock transfers. Please try again later.</Alert>;
//   }

//   return (
//     <Box>
//       <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
//         <Typography variant="h4">Stock Transfers</Typography>
//         <Button
//           variant="contained"
//           startIcon={<Add />}
//           onClick={handleAddNew}
//         >
//           Create Transfer
//         </Button>
//       </Box>

//       <Paper sx={{ mb: 2, p: 2 }}>
//         <Grid container spacing={2}>
//           <Grid item xs={12} sm={4}><FormControl fullWidth><InputLabel>From Branch</InputLabel><Select name="from_branch_id" value={filters.from_branch_id} label="From Branch" onChange={handleFilterChange}><MenuItem value=""><em>All</em></MenuItem>{branches.map(b => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}</Select></FormControl></Grid>
//           <Grid item xs={12} sm={4}><FormControl fullWidth><InputLabel>To Branch</InputLabel><Select name="to_branch_id" value={filters.to_branch_id} label="To Branch" onChange={handleFilterChange}><MenuItem value=""><em>All</em></MenuItem>{branches.map(b => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}</Select></FormControl></Grid>
//           <Grid item xs={12} sm={4}><FormControl fullWidth><InputLabel>Status</InputLabel><Select name="status" value={filters.status} label="Status" onChange={handleFilterChange}><MenuItem value=""><em>All</em></MenuItem><MenuItem value="pending">Pending</MenuItem><MenuItem value="in_transit">In Transit</MenuItem><MenuItem value="received">Received</MenuItem><MenuItem value="cancelled">Cancelled</MenuItem></Select></FormControl></Grid>
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
//                   <TableCell>Transfer #</TableCell>
//                   <TableCell>Date</TableCell>
//                   <TableCell>From Branch</TableCell>
//                   <TableCell>To Branch</TableCell>
//                   <TableCell>Status</TableCell>
//                   <TableCell align="right">Actions</TableCell>
//                 </TableRow>
//               </TableHead>
//               <TableBody>
//                 {transfers.map((transfer) => (
//                   <TableRow key={transfer.id} hover>
//                     <TableCell sx={{ fontWeight: 'bold' }}>{transfer.transfer_number}</TableCell>
//                     <TableCell>{new Date(transfer.transfer_date).toLocaleDateString()}</TableCell>
//                     <TableCell>{transfer.from_branch_name}</TableCell>
//                     <TableCell>{transfer.to_branch_name}</TableCell>
//                     <TableCell>
//                       <Chip label={transfer.status.replace('_', ' ')} color={statusColors[transfer.status] || 'default'} size="small" sx={{textTransform: 'capitalize'}} />
//                     </TableCell>
//                     <TableCell align="right">
//                       {/* 4. Connect the handler to the button's onClick event */}
//                       <Button variant="outlined" size="small" onClick={() => handleViewDetails(transfer.id)}>View Details</Button>
//                     </TableCell>
//                   </TableRow>
//                 ))}
//               </TableBody>
//             </Table>
//           </TableContainer>
          
//           <TablePagination
//             rowsPerPageOptions={[10, 25, 50]}
//             component="div"
//             count={totalTransfers}
//             rowsPerPage={rowsPerPage}
//             page={page}
//             onPageChange={handleChangePage}
//             onRowsPerPageChange={handleChangeRowsPerPage}
//           />
//         </>
//       )}

//       <StockTransferFormModal
//         open={isModalOpen}
//         onClose={handleModalClose}
//         onSubmit={handleFormSubmit}
//         isLoading={isCreating}
//       />
//     </Box>
//   );
// };

// export default StockTransfersPage;
