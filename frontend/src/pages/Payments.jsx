// In frontend/src/pages/Payments.jsx

import React, { useState } from 'react';
import {
  Box,
  Typography,
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
  InputAdornment,
  Button
} from '@mui/material';
import { Search, Payment } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useDebounce } from 'use-debounce';
import toast from 'react-hot-toast';

import { api } from '../services/api'; 
import { useAuth } from '../contexts/AuthContext'; // 1. Import useAuth
import PaymentFormModal from '../components/PaymentFormModal';

const PaymentsPage = () => {
  const { currentBranch } = useAuth(); // 2. Get the currently selected branch
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 500);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);

  const queryClient = useQueryClient();

  // 3. Update the useQuery hook to be branch-aware
  const { data, isLoading, error } = useQuery(
    ['outstandingSales', page, rowsPerPage, debouncedSearchTerm, currentBranch?.id],
    () => api.getOutstandingSales({ 
      page: page + 1, 
      limit: rowsPerPage, 
      search: debouncedSearchTerm,
      branch_id: currentBranch?.id // Always pass the current branch ID
    }),
    {
      enabled: !!currentBranch, // Only run query if a branch is selected
      keepPreviousData: true,
    }
  );

  const sales = data?.data?.data || [];
  const totalSales = data?.data?.pagination?.total || 0;

  const { mutate: recordPayment, isLoading: isRecording } = useMutation(api.recordPayment, {
    onSuccess: () => {
      toast.success('Payment recorded successfully!');
      queryClient.invalidateQueries('outstandingSales');
      setIsModalOpen(false);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to record payment.');
    }
  });

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };

  const handleRecordPayment = (sale) => {
    setSelectedSale(sale);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedSale(null);
  };

  const handleFormSubmit = (formData) => {
    recordPayment(formData);
  };

  if (error) {
    return <Alert severity="error">Failed to load outstanding sales. Please try again later.</Alert>;
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>Customer Payments</Typography>

      <Paper sx={{ mb: 2, p: 2 }}>
        <TextField
            fullWidth
            placeholder="Search by Invoice #"
            value={searchTerm}
            onChange={handleSearchChange}
            InputProps={{
                startAdornment: (
                    <InputAdornment position="start">
                        <Search />
                    </InputAdornment>
                ),
            }}
        />
      </Paper>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Invoice #</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Branch</TableCell>
                  <TableCell align="right">Total Amount</TableCell>
                  <TableCell align="right">Amount Paid</TableCell>
                  <TableCell align="right">Balance Due</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sales.map((sale) => (
                  <TableRow key={sale.id} hover>
                    <TableCell sx={{ fontWeight: 'bold' }}>{sale.invoice_number}</TableCell>
                    <TableCell>{sale.customer_name || 'N/A'}</TableCell>
                    <TableCell>{sale.branch_name}</TableCell>
                    <TableCell align="right">₹{Number(sale.final_amount).toLocaleString()}</TableCell>
                    <TableCell align="right">₹{Number(sale.paid_amount).toLocaleString()}</TableCell>
                    <TableCell align="right" sx={{ color: 'error.main', fontWeight: 'bold' }}>
                        ₹{Number(sale.balance_amount).toLocaleString()}
                    </TableCell>
                    <TableCell align="right">
                      <Button 
                        variant="outlined" 
                        size="small" 
                        startIcon={<Payment />}
                        onClick={() => handleRecordPayment(sale)}
                      >
                        Record Payment
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          <TablePagination
            rowsPerPageOptions={[10, 25, 50]}
            component="div"
            count={totalSales}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </>
      )}

      <PaymentFormModal
        open={isModalOpen}
        onClose={handleModalClose}
        onSubmit={handleFormSubmit}
        sale={selectedSale}
        isLoading={isRecording}
      />
    </Box>
  );
};

export default PaymentsPage;





// // In frontend/src/pages/Payments.jsx

// import React, { useState } from 'react';
// import {
//   Box,
//   Typography,
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
//   InputAdornment,
//   Button
// } from '@mui/material';
// import { Search, Payment } from '@mui/icons-material';
// import { useQuery, useMutation, useQueryClient } from 'react-query';
// import { useDebounce } from 'use-debounce';
// import toast from 'react-hot-toast';

// import { api } from '../services/api'; 
// import PaymentFormModal from '../components/PaymentFormModal'; // 1. Import the modal

// const PaymentsPage = () => {
//   const [page, setPage] = useState(0);
//   const [rowsPerPage, setRowsPerPage] = useState(10);
//   const [searchTerm, setSearchTerm] = useState('');
//   const [debouncedSearchTerm] = useDebounce(searchTerm, 500);

//   // 2. Add state for the modal
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [selectedSale, setSelectedSale] = useState(null);

//   const queryClient = useQueryClient();

//   // Fetching outstanding sales data
//   const { data, isLoading, error } = useQuery(
//     ['outstandingSales', page, rowsPerPage, debouncedSearchTerm],
//     () => api.getOutstandingSales({ 
//       page: page + 1, 
//       limit: rowsPerPage, 
//       search: debouncedSearchTerm 
//     }),
//     {
//       keepPreviousData: true,
//     }
//   );

//   const sales = data?.data?.data || [];
//   const totalSales = data?.data?.pagination?.total || 0;

//   // 3. Add mutation for recording a payment
//   const { mutate: recordPayment, isLoading: isRecording } = useMutation(api.recordPayment, {
//     onSuccess: () => {
//       toast.success('Payment recorded successfully!');
//       queryClient.invalidateQueries('outstandingSales'); // Refetch the list
//       setIsModalOpen(false);
//     },
//     onError: (err) => {
//       toast.error(err.response?.data?.message || 'Failed to record payment.');
//     }
//   });


//   // --- Event Handlers ---

//   const handleChangePage = (event, newPage) => {
//     setPage(newPage);
//   };

//   const handleChangeRowsPerPage = (event) => {
//     setRowsPerPage(parseInt(event.target.value, 10));
//     setPage(0);
//   };
  
//   const handleSearchChange = (event) => {
//     setSearchTerm(event.target.value);
//     setPage(0);
//   };

//   const handleRecordPayment = (sale) => {
//     setSelectedSale(sale);
//     setIsModalOpen(true);
//   };

//   const handleModalClose = () => {
//     setIsModalOpen(false);
//     setSelectedSale(null);
//   };

//   const handleFormSubmit = (formData) => {
//     recordPayment(formData);
//   };

//   if (error) {
//     return <Alert severity="error">Failed to load outstanding sales. Please try again later.</Alert>;
//   }

//   return (
//     <Box>
//       <Typography variant="h4" sx={{ mb: 3 }}>Customer Payments</Typography>

//       <Paper sx={{ mb: 2, p: 2 }}>
//         <TextField
//             fullWidth
//             placeholder="Search by Invoice #"
//             value={searchTerm}
//             onChange={handleSearchChange}
//             InputProps={{
//                 startAdornment: (
//                     <InputAdornment position="start">
//                         <Search />
//                     </InputAdornment>
//                 ),
//             }}
//         />
//       </Paper>

//       {isLoading ? (
//         <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
//           <CircularProgress />
//         </Box>
//       ) : (
//         <>
//           <TableContainer component={Paper}>
//             <Table>
//               <TableHead>
//                 <TableRow>
//                   <TableCell>Invoice #</TableCell>
//                   <TableCell>Customer</TableCell>
//                   <TableCell>Branch</TableCell>
//                   <TableCell align="right">Total Amount</TableCell>
//                   <TableCell align="right">Amount Paid</TableCell>
//                   <TableCell align="right">Balance Due</TableCell>
//                   <TableCell align="right">Actions</TableCell>
//                 </TableRow>
//               </TableHead>
//               <TableBody>
//                 {sales.map((sale) => (
//                   <TableRow key={sale.id} hover>
//                     <TableCell sx={{ fontWeight: 'bold' }}>{sale.invoice_number}</TableCell>
//                     <TableCell>{sale.customer_name || 'N/A'}</TableCell>
//                     <TableCell>{sale.branch_name}</TableCell>
//                     <TableCell align="right">₹{Number(sale.final_amount).toLocaleString()}</TableCell>
//                     <TableCell align="right">₹{Number(sale.paid_amount).toLocaleString()}</TableCell>
//                     <TableCell align="right" sx={{ color: 'error.main', fontWeight: 'bold' }}>
//                         ₹{Number(sale.balance_amount).toLocaleString()}
//                     </TableCell>
//                     <TableCell align="right">
//                       <Button 
//                         variant="outlined" 
//                         size="small" 
//                         startIcon={<Payment />}
//                         onClick={() => handleRecordPayment(sale)}
//                       >
//                         Record Payment
//                       </Button>
//                     </TableCell>
//                   </TableRow>
//                 ))}
//               </TableBody>
//             </Table>
//           </TableContainer>
          
//           <TablePagination
//             rowsPerPageOptions={[10, 25, 50]}
//             component="div"
//             count={totalSales}
//             rowsPerPage={rowsPerPage}
//             page={page}
//             onPageChange={handleChangePage}
//             onRowsPerPageChange={handleChangeRowsPerPage}
//           />
//         </>
//       )}

//       {/* 4. Render the modal */}
//       <PaymentFormModal
//         open={isModalOpen}
//         onClose={handleModalClose}
//         onSubmit={handleFormSubmit}
//         sale={selectedSale}
//         isLoading={isRecording}
//       />
//     </Box>
//   );
// };

// export default PaymentsPage;
