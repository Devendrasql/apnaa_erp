/**
 * Customers list with CRUD + Face enrollment on Create & Update
 * - Search + pagination
 * - On create, enroll face if captured
 * - On edit, optionally re-enroll if re-captured
 */

import React, { useState } from 'react';
import {
  Box, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TablePagination, CircularProgress, Alert, IconButton, Tooltip,
  TextField, InputAdornment
} from '@mui/material';
import { Add, Edit, Delete, Search } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useDebounce } from 'use-debounce';
import toast from 'react-hot-toast';

import {
  getCustomers,
  createCustomer as apiCreateCustomer,
  updateCustomer as apiUpdateCustomer,
  deleteCustomer as apiDeleteCustomer,
  enrollCustomerFace
} from '@shared/api';
import CustomerFormModal from '@modules/customers/components/CustomerFormModal';

export default function CustomersPage() {
  // table state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 500);

  // modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const queryClient = useQueryClient();

  // fetch customers
  const { data, isLoading, error } = useQuery(
    ['customers', page, rowsPerPage, debouncedSearchTerm],
    () => getCustomers({ page: page + 1, limit: rowsPerPage, search: debouncedSearchTerm }),
    { keepPreviousData: true }
  );

  const customers = data?.data?.data || [];
  const totalCustomers = data?.data?.pagination?.total || 0;

  // create + enroll
  const { mutate: createCustomer, isLoading: isCreating } = useMutation(
    async ({ formData, faceBase64 }) => {
      const res = await apiCreateCustomer(formData);
      const newId = res?.data?.data?.id;
      if (newId && faceBase64) {
        await enrollCustomerFace(newId, { imageBase64: faceBase64 });
      }
      return res;
    },
    {
      onSuccess: () => {
        toast.success('Customer created successfully!');
        queryClient.invalidateQueries('customers');
        setIsModalOpen(false);
      },
      onError: (err) => {
        toast.error(err?.response?.data?.message || 'Failed to create customer.');
      },
    }
  );

  // update + optional re-enroll
  const { mutate: updateCustomer, isLoading: isUpdating } = useMutation(
    async ({ id, data, faceBase64 }) => {
      const res = await apiUpdateCustomer(id, data);
      if (faceBase64) {
        await enrollCustomerFace(id, { imageBase64: faceBase64 });
      }
      return res;
    },
    {
      onSuccess: () => {
        toast.success('Customer updated successfully!');
        queryClient.invalidateQueries('customers');
        setIsModalOpen(false);
      },
      onError: (err) => {
        toast.error(err?.response?.data?.message || 'Failed to update customer.');
      },
    }
  );

  // delete
  const { mutate: deleteCustomer } = useMutation(apiDeleteCustomer, {
    onSuccess: () => {
      toast.success('Customer deleted successfully!');
      queryClient.invalidateQueries('customers');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to delete customer.');
    },
  });

  // handlers
  const handleChangePage = (_e, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); };
  const handleSearchChange = (e) => { setSearchTerm(e.target.value); setPage(0); };

  const handleAddNew = () => { setSelectedCustomer(null); setIsModalOpen(true); };
  const handleEdit = (c) => { setSelectedCustomer(c); setIsModalOpen(true); };
  const handleDelete = (id) => { if (window.confirm('Delete this customer?')) deleteCustomer(id); };
  const handleModalClose = () => { setIsModalOpen(false); setSelectedCustomer(null); };

  const handleFormSubmit = ({ formData, faceBase64 }) => {
    if (selectedCustomer) {
      updateCustomer({ id: selectedCustomer.id, data: formData, faceBase64 });
    } else {
      createCustomer({ formData, faceBase64 });
    }
  };

  return (
    <Box p={2}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">Customers</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={handleAddNew}>Add Customer</Button>
      </Box>

      <Box mb={2}>
        <TextField
          value={searchTerm}
          onChange={handleSearchChange}
          placeholder="Search by name or phone"
          InputProps={{ startAdornment: (<InputAdornment position="start"><Search/></InputAdornment>) }}
          fullWidth
        />
      </Box>

      {isLoading ? (
        <Box textAlign="center" mt={4}><CircularProgress /></Box>
      ) : error ? (
        <Alert severity="error">Failed to load customers.</Alert>
      ) : (
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>First Name</TableCell>
                  <TableCell>Last Name</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {customers.map((c) => (
                  <TableRow key={c.id} hover>
                    <TableCell>{c.first_name}</TableCell>
                    <TableCell>{c.last_name}</TableCell>
                    <TableCell>{c.phone}</TableCell>
                    <TableCell>{c.email || '—'}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit"><IconButton onClick={() => handleEdit(c)}><Edit/></IconButton></Tooltip>
                      <Tooltip title="Delete"><IconButton onClick={() => handleDelete(c.id)}><Delete/></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={totalCustomers}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Paper>
      )}

      <CustomerFormModal
        open={isModalOpen}
        onClose={handleModalClose}
        customer={selectedCustomer}
        onSubmit={handleFormSubmit}
      />

      {(isCreating || isUpdating) && <Box mt={1}><Alert severity="info">Saving…</Alert></Box>}
    </Box>
  );
}





// // src/pages/Customers.jsx
// // -------------------------------------------------------------
// // Customers list with CRUD + face enrollment on CREATE and UPDATE
// // -------------------------------------------------------------

// import React, { useState } from 'react';
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
//   IconButton,
//   Tooltip,
//   TextField,
//   InputAdornment
// } from '@mui/material';
// import { Add, Edit, Delete, Search } from '@mui/icons-material';
// import { useQuery, useMutation, useQueryClient } from 'react-query';
// import { useDebounce } from 'use-debounce';
// import toast from 'react-hot-toast';

// // Keep your existing import path
// import { api } from '../services/api';

// // Modal returns { formData, faceBase64 } on submit
// import CustomerFormModal from '../components/CustomerFormModal';

// const CustomersPage = () => {
//   // -----------------------------
//   // Table state
//   // -----------------------------
//   const [page, setPage] = useState(0);
//   const [rowsPerPage, setRowsPerPage] = useState(10);
//   const [searchTerm, setSearchTerm] = useState('');
//   const [debouncedSearchTerm] = useDebounce(searchTerm, 500);

//   // -----------------------------
//   // Modal state
//   // -----------------------------
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [selectedCustomer, setSelectedCustomer] = useState(null);

//   const queryClient = useQueryClient();

//   // -----------------------------
//   // Fetch list
//   // -----------------------------
//   const { data, isLoading, error } = useQuery(
//     ['customers', page, rowsPerPage, debouncedSearchTerm],
//     () =>
//       api.getCustomers({
//         page: page + 1,
//         limit: rowsPerPage,
//         search: debouncedSearchTerm,
//       }),
//     { keepPreviousData: true }
//   );

//   const customers = data?.data?.data || [];
//   const totalCustomers = data?.data?.pagination?.total || 0;

//   // -----------------------------
//   // CREATE + enroll (works as before)
//   // -----------------------------
//   const { mutate: createCustomer, isLoading: isCreating } = useMutation(
//     async ({ formData, faceBase64 }) => {
//       // 1) create
//       const res = await api.createCustomer(formData);
//       const newId = res?.data?.data?.id;
//       // 2) enroll if we captured a face
//       if (newId && faceBase64) {
//         await api.enrollCustomerFace(newId, { imageBase64: faceBase64 });
//       }
//       return res;
//     },
//     {
//       onSuccess: () => {
//         toast.success('Customer created successfully!');
//         queryClient.invalidateQueries('customers');
//         setIsModalOpen(false);
//       },
//       onError: (err) => {
//         toast.error(err?.response?.data?.message || 'Failed to create customer.');
//       },
//     }
//   );

//   // -----------------------------
//   // UPDATE + enroll (NEW)
//   // -----------------------------
//   const { mutate: updateCustomer, isLoading: isUpdating } = useMutation(
//     async ({ id, data, faceBase64 }) => {
//       // 1) update the customer
//       const res = await api.updateCustomer(id, data);
//       // 2) if user captured a NEW face while editing, enroll it now
//       if (faceBase64) {
//         await api.enrollCustomerFace(id, { imageBase64: faceBase64 });
//       }
//       return res;
//     },
//     {
//       onSuccess: () => {
//         toast.success('Customer updated successfully!');
//         queryClient.invalidateQueries('customers');
//         setIsModalOpen(false);
//       },
//       onError: (err) => {
//         toast.error(err?.response?.data?.message || 'Failed to update customer.');
//       },
//     }
//   );

//   // -----------------------------
//   // DELETE (unchanged)
//   // -----------------------------
//   const { mutate: deleteCustomer } = useMutation(api.deleteCustomer, {
//     onSuccess: () => {
//       toast.success('Customer deleted successfully!');
//       queryClient.invalidateQueries('customers');
//     },
//     onError: (err) => {
//       toast.error(err?.response?.data?.message || 'Failed to delete customer.');
//     }
//   });

//   // -----------------------------
//   // Handlers
//   // -----------------------------
//   const handleChangePage = (event, newPage) => setPage(newPage);

//   const handleChangeRowsPerPage = (event) => {
//     setRowsPerPage(parseInt(event.target.value, 10));
//     setPage(0);
//   };

//   const handleSearchChange = (event) => {
//     setSearchTerm(event.target.value);
//     setPage(0);
//   };

//   const handleAddNew = () => {
//     setSelectedCustomer(null);
//     setIsModalOpen(true);
//   };

//   const handleEdit = (customer) => {
//     setSelectedCustomer(customer);
//     setIsModalOpen(true);
//   };

//   const handleDelete = (id) => {
//     if (window.confirm('Are you sure you want to delete this customer?')) {
//       deleteCustomer(id);
//     }
//   };

//   const handleModalClose = () => {
//     setIsModalOpen(false);
//     setSelectedCustomer(null);
//   };

//   // Modal now passes { formData, faceBase64 }
//   const handleFormSubmit = ({ formData, faceBase64 }) => {
//     if (selectedCustomer) {
//       // <<< IMPORTANT: pass faceBase64 here so UPDATE can enroll too
//       updateCustomer({ id: selectedCustomer.id, data: formData, faceBase64 });
//     } else {
//       createCustomer({ formData, faceBase64 });
//     }
//   };

//   // -----------------------------
//   // Render
//   // -----------------------------
//   if (error) {
//     return <Alert severity="error">Failed to load customers. Please try again later.</Alert>;
//   }

//   return (
//     <Box>
//       {/* Header */}
//       <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
//         <Typography variant="h4">Manage Customers</Typography>
//         <Button variant="contained" startIcon={<Add />} onClick={handleAddNew}>
//           Add New Customer
//         </Button>
//       </Box>

//       {/* Search */}
//       <Paper sx={{ mb: 2, p: 2 }}>
//         <TextField
//           fullWidth
//           placeholder="Search by name or phone number..."
//           value={searchTerm}
//           onChange={handleSearchChange}
//           InputProps={{
//             startAdornment: (
//               <InputAdornment position="start">
//                 <Search />
//               </InputAdornment>
//             ),
//           }}
//         />
//       </Paper>

//       {/* Table */}
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
//                   <TableCell>Name</TableCell>
//                   <TableCell>Phone</TableCell>
//                   <TableCell>Email</TableCell>
//                   <TableCell>City</TableCell>
//                   <TableCell>Status</TableCell>
//                   <TableCell align="right">Actions</TableCell>
//                 </TableRow>
//               </TableHead>
//               <TableBody>
//                 {customers.map((customer) => (
//                   <TableRow key={customer.id} hover>
//                     <TableCell sx={{ fontWeight: 'bold' }}>
//                       {customer.first_name} {customer.last_name}
//                     </TableCell>
//                     <TableCell>{customer.phone}</TableCell>
//                     <TableCell>{customer.email || 'N/A'}</TableCell>
//                     <TableCell>{customer.city || 'N/A'}</TableCell>
//                     <TableCell>
//                       <Typography
//                         sx={{ color: customer.is_active ? 'success.main' : 'error.main', fontWeight: 'bold' }}
//                       >
//                         {customer.is_active ? 'Active' : 'Inactive'}
//                       </Typography>
//                     </TableCell>
//                     <TableCell align="right">
//                       <Tooltip title="Edit">
//                         <IconButton onClick={() => handleEdit(customer)}><Edit /></IconButton>
//                       </Tooltip>
//                       <Tooltip title="Delete">
//                         <IconButton onClick={() => handleDelete(customer.id)} color="error"><Delete /></IconButton>
//                       </Tooltip>
//                     </TableCell>
//                   </TableRow>
//                 ))}
//               </TableBody>
//             </Table>
//           </TableContainer>

//           {/* Pagination */}
//           <TablePagination
//             rowsPerPageOptions={[10, 25, 50]}
//             component="div"
//             count={totalCustomers}
//             rowsPerPage={rowsPerPage}
//             page={page}
//             onPageChange={handleChangePage}
//             onRowsPerPageChange={handleChangeRowsPerPage}
//           />
//         </>
//       )}

//       {/* Modal */}
//       <CustomerFormModal
//         open={isModalOpen}
//         onClose={handleModalClose}
//         onSubmit={handleFormSubmit}
//         customer={selectedCustomer}
//         isLoading={isCreating || isUpdating}
//       />
//     </Box>
//   );
// };

// export default CustomersPage;






// // // In frontend/src/pages/Customers.jsx

// // import React, { useState } from 'react';
// // import {
// //   Box,
// //   Typography,
// //   Button,
// //   Paper,
// //   Table,
// //   TableBody,
// //   TableCell,
// //   TableContainer,
// //   TableHead,
// //   TableRow,
// //   TablePagination,
// //   CircularProgress,
// //   Alert,
// //   IconButton,
// //   Tooltip,
// //   TextField,
// //   InputAdornment
// // } from '@mui/material';
// // import { Add, Edit, Delete, Search } from '@mui/icons-material';
// // import { useQuery, useMutation, useQueryClient } from 'react-query';
// // import { useDebounce } from 'use-debounce';
// // import toast from 'react-hot-toast';

// // import { api } from '../services/api';
// // import CustomerFormModal from '../components/CustomerFormModal'; // Import the modal

// // const CustomersPage = () => {
// //   const [page, setPage] = useState(0);
// //   const [rowsPerPage, setRowsPerPage] = useState(10);
// //   const [searchTerm, setSearchTerm] = useState('');
// //   const [debouncedSearchTerm] = useDebounce(searchTerm, 500);

// //   // State for the modal
// //   const [isModalOpen, setIsModalOpen] = useState(false);
// //   const [selectedCustomer, setSelectedCustomer] = useState(null);

// //   const queryClient = useQueryClient();

// //   // Fetching customers data
// //   const { data, isLoading, error } = useQuery(
// //     ['customers', page, rowsPerPage, debouncedSearchTerm],
// //     () => api.getCustomers({ 
// //       page: page + 1, 
// //       limit: rowsPerPage, 
// //       search: debouncedSearchTerm 
// //     }),
// //     {
// //       keepPreviousData: true,
// //     }
// //   );

// //   const customers = data?.data?.data || [];
// //   const totalCustomers = data?.data?.pagination?.total || 0;

// //   // --- Mutations for CRUD operations ---

// //   const { mutate: createCustomer, isLoading: isCreating } = useMutation(api.createCustomer, {
// //     onSuccess: () => {
// //       toast.success('Customer created successfully!');
// //       queryClient.invalidateQueries('customers');
// //       setIsModalOpen(false);
// //     },
// //     onError: (err) => {
// //       toast.error(err.response?.data?.message || 'Failed to create customer.');
// //     }
// //   });

// //   const { mutate: updateCustomer, isLoading: isUpdating } = useMutation(({ id, data }) => api.updateCustomer(id, data), {
// //     onSuccess: () => {
// //       toast.success('Customer updated successfully!');
// //       queryClient.invalidateQueries('customers');
// //       setIsModalOpen(false);
// //     },
// //     onError: (err) => {
// //       toast.error(err.response?.data?.message || 'Failed to update customer.');
// //     }
// //   });

// //   const { mutate: deleteCustomer } = useMutation(api.deleteCustomer, {
// //     onSuccess: () => {
// //       toast.success('Customer deleted successfully!');
// //       queryClient.invalidateQueries('customers');
// //     },
// //     onError: (err) => {
// //       toast.error(err.response?.data?.message || 'Failed to delete customer.');
// //     }
// //   });

// //   // --- Event Handlers ---

// //   const handleChangePage = (event, newPage) => {
// //     setPage(newPage);
// //   };

// //   const handleChangeRowsPerPage = (event) => {
// //     setRowsPerPage(parseInt(event.target.value, 10));
// //     setPage(0);
// //   };
  
// //   const handleSearchChange = (event) => {
// //     setSearchTerm(event.target.value);
// //     setPage(0);
// //   };

// //   const handleAddNew = () => {
// //     setSelectedCustomer(null);
// //     setIsModalOpen(true);
// //   };

// //   const handleEdit = (customer) => {
// //     setSelectedCustomer(customer);
// //     setIsModalOpen(true);
// //   };

// //   const handleDelete = (id) => {
// //     if (window.confirm('Are you sure you want to delete this customer?')) {
// //       deleteCustomer(id);
// //     }
// //   };

// //   const handleModalClose = () => {
// //     setIsModalOpen(false);
// //     setSelectedCustomer(null);
// //   };

// //   const handleFormSubmit = (formData) => {
// //     if (selectedCustomer) {
// //       updateCustomer({ id: selectedCustomer.id, data: formData });
// //     } else {
// //       createCustomer(formData);
// //     }
// //   };

// //   if (error) {
// //     return <Alert severity="error">Failed to load customers. Please try again later.</Alert>;
// //   }

// //   return (
// //     <Box>
// //       <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
// //         <Typography variant="h4">Manage Customers</Typography>
// //         <Button
// //           variant="contained"
// //           startIcon={<Add />}
// //           onClick={handleAddNew}
// //         >
// //           Add New Customer
// //         </Button>
// //       </Box>

// //       <Paper sx={{ mb: 2, p: 2 }}>
// //         <TextField
// //             fullWidth
// //             placeholder="Search by name or phone number..."
// //             value={searchTerm}
// //             onChange={handleSearchChange}
// //             InputProps={{
// //                 startAdornment: (
// //                     <InputAdornment position="start">
// //                         <Search />
// //                     </InputAdornment>
// //                 ),
// //             }}
// //         />
// //       </Paper>

// //       {isLoading ? (
// //         <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
// //           <CircularProgress />
// //         </Box>
// //       ) : (
// //         <>
// //           <TableContainer component={Paper}>
// //             <Table>
// //               <TableHead>
// //                 <TableRow>
// //                   <TableCell>Name</TableCell>
// //                   <TableCell>Phone</TableCell>
// //                   <TableCell>Email</TableCell>
// //                   <TableCell>City</TableCell>
// //                   <TableCell>Status</TableCell>
// //                   <TableCell align="right">Actions</TableCell>
// //                 </TableRow>
// //               </TableHead>
// //               <TableBody>
// //                 {customers.map((customer) => (
// //                   <TableRow key={customer.id} hover>
// //                     <TableCell sx={{ fontWeight: 'bold' }}>{customer.first_name} {customer.last_name}</TableCell>
// //                     <TableCell>{customer.phone}</TableCell>
// //                     <TableCell>{customer.email || 'N/A'}</TableCell>
// //                     <TableCell>{customer.city || 'N/A'}</TableCell>
// //                     <TableCell>
// //                       <Typography sx={{ color: customer.is_active ? 'success.main' : 'error.main', fontWeight: 'bold' }}>
// //                         {customer.is_active ? 'Active' : 'Inactive'}
// //                       </Typography>
// //                     </TableCell>
// //                     <TableCell align="right">
// //                       <Tooltip title="Edit">
// //                         <IconButton onClick={() => handleEdit(customer)}><Edit /></IconButton>
// //                       </Tooltip>
// //                       <Tooltip title="Delete">
// //                         <IconButton onClick={() => handleDelete(customer.id)} color="error"><Delete /></IconButton>
// //                       </Tooltip>
// //                     </TableCell>
// //                   </TableRow>
// //                 ))}
// //               </TableBody>
// //             </Table>
// //           </TableContainer>
          
// //           <TablePagination
// //             rowsPerPageOptions={[10, 25, 50]}
// //             component="div"
// //             count={totalCustomers}
// //             rowsPerPage={rowsPerPage}
// //             page={page}
// //             onPageChange={handleChangePage}
// //             onRowsPerPageChange={handleChangeRowsPerPage}
// //           />
// //         </>
// //       )}

// //       <CustomerFormModal
// //         open={isModalOpen}
// //         onClose={handleModalClose}
// //         onSubmit={handleFormSubmit}
// //         customer={selectedCustomer}
// //         isLoading={isCreating || isUpdating}
// //       />
// //     </Box>
// //   );
// // };

// // export default CustomersPage;
