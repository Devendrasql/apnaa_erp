// In frontend/src/pages/Users.jsx

import React, { useState } from 'react';
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
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  Chip
} from '@mui/material';
import { Add, Edit, Delete, Search } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useDebounce } from 'use-debounce';
import toast from 'react-hot-toast';

import { api } from '../services/api';
import UserFormModal from '../components/UserFormModal';

const roleColors = {
    'Super Admin': 'error',
    'Admin': 'error',
    'Branch Manager': 'primary',
    'Pharmacist / Sales Staff': 'info',
};

const UsersPage = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 500);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const queryClient = useQueryClient();

  // Fetching users data
  const { data, isLoading, error } = useQuery(
    ['users', page, rowsPerPage, debouncedSearchTerm],
    () => api.getUsers({ 
      page: page + 1, 
      limit: rowsPerPage, 
      search: debouncedSearchTerm 
    }),
    {
      keepPreviousData: true,
    }
  );

  const users = data?.data?.data || [];
  const totalUsers = data?.data?.pagination?.total || 0;

  // Mutations for CRUD operations
  const { mutate: createUser, isLoading: isCreating } = useMutation(api.createUser, {
    onSuccess: () => {
      toast.success('User created successfully!');
      queryClient.invalidateQueries('users');
      setIsModalOpen(false);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to create user.');
    }
  });

  const { mutate: updateUser, isLoading: isUpdating } = useMutation(({ id, data }) => api.updateUser(id, data), {
    onSuccess: () => {
      toast.success('User updated successfully!');
      queryClient.invalidateQueries('users');
      setIsModalOpen(false);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update user.');
    }
  });

  const { mutate: deleteUser } = useMutation(api.deleteUser, {
    onSuccess: () => {
      toast.success('User deleted successfully!');
      queryClient.invalidateQueries('users');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to delete user.');
    }
  });

  // Event Handlers
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

  const handleAddNew = () => {
    setSelectedUser(null);
    setIsModalOpen(true);
  };

  const handleEdit = (user) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      deleteUser(id);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
  };

  const handleFormSubmit = (formData) => {
    if (selectedUser) {
      updateUser({ id: selectedUser.id, data: formData });
    } else {
      createUser(formData);
    }
  };

  if (error) {
    return <Alert severity="error">Failed to load users. Please try again later.</Alert>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Manage Users</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleAddNew}
        >
          Add New User
        </Button>
      </Box>

      <Paper sx={{ mb: 2, p: 2 }}>
        <TextField
            fullWidth
            placeholder="Search by name, username, or email..."
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
                  <TableCell>Name</TableCell>
                  <TableCell>Username</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Default Branch</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell sx={{ fontWeight: 'bold' }}>{user.first_name} {user.last_name}</TableCell>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                        {/* FIX: Use the new 'role_name' property */}
                        <Chip label={user.role_name} color={roleColors[user.role_name] || 'default'} size="small" sx={{textTransform: 'capitalize'}} />
                    </TableCell>
                    <TableCell>{user.branch_name || 'N/A'}</TableCell>
                    <TableCell>
                      <Typography sx={{ color: user.is_active ? 'success.main' : 'error.main', fontWeight: 'bold' }}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton onClick={() => handleEdit(user)}><Edit /></IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton onClick={() => handleDelete(user.id)} color="error"><Delete /></IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          <TablePagination
            rowsPerPageOptions={[10, 25, 50]}
            component="div"
            count={totalUsers}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </>
      )}

      <UserFormModal
        open={isModalOpen}
        onClose={handleModalClose}
        onSubmit={handleFormSubmit}
        user={selectedUser}
        isLoading={isCreating || isUpdating}
      />
    </Box>
  );
};

export default UsersPage;



// // In frontend/src/pages/Users.jsx

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
//   InputAdornment,
//   Chip
// } from '@mui/material';
// import { Add, Edit, Delete, Search } from '@mui/icons-material';
// import { useQuery, useMutation, useQueryClient } from 'react-query';
// import { useDebounce } from 'use-debounce';
// import toast from 'react-hot-toast';

// import { api } from '../services/api';
// import UserFormModal from '../components/UserFormModal'; // 1. Import the modal

// const roleColors = {
//     super_admin: 'error',
//     admin: 'warning',
//     manager: 'primary',
//     pharmacist: 'info',
//     staff: 'success'
// };

// const UsersPage = () => {
//   const [page, setPage] = useState(0);
//   const [rowsPerPage, setRowsPerPage] = useState(10);
//   const [searchTerm, setSearchTerm] = useState('');
//   const [debouncedSearchTerm] = useDebounce(searchTerm, 500);

//   // 2. Add state for the modal
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [selectedUser, setSelectedUser] = useState(null);

//   const queryClient = useQueryClient();

//   // Fetching users data
//   const { data, isLoading, error } = useQuery(
//     ['users', page, rowsPerPage, debouncedSearchTerm],
//     () => api.getUsers({ 
//       page: page + 1, 
//       limit: rowsPerPage, 
//       search: debouncedSearchTerm 
//     }),
//     {
//       keepPreviousData: true,
//     }
//   );

//   const users = data?.data?.data || [];
//   const totalUsers = data?.data?.pagination?.total || 0;

//   // 3. Add mutations for CRUD operations
//   const { mutate: createUser, isLoading: isCreating } = useMutation(api.createUser, {
//     onSuccess: () => {
//       toast.success('User created successfully!');
//       queryClient.invalidateQueries('users');
//       setIsModalOpen(false);
//     },
//     onError: (err) => {
//       toast.error(err.response?.data?.message || 'Failed to create user.');
//     }
//   });

//   const { mutate: updateUser, isLoading: isUpdating } = useMutation(({ id, data }) => api.updateUser(id, data), {
//     onSuccess: () => {
//       toast.success('User updated successfully!');
//       queryClient.invalidateQueries('users');
//       setIsModalOpen(false);
//     },
//     onError: (err) => {
//       toast.error(err.response?.data?.message || 'Failed to update user.');
//     }
//   });

//   const { mutate: deleteUser } = useMutation(api.deleteUser, {
//     onSuccess: () => {
//       toast.success('User deleted successfully!');
//       queryClient.invalidateQueries('users');
//     },
//     onError: (err) => {
//       toast.error(err.response?.data?.message || 'Failed to delete user.');
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

//   const handleAddNew = () => {
//     setSelectedUser(null);
//     setIsModalOpen(true);
//   };

//   const handleEdit = (user) => {
//     setSelectedUser(user);
//     setIsModalOpen(true);
//   };

//   const handleDelete = (id) => {
//     if (window.confirm('Are you sure you want to delete this user?')) {
//       deleteUser(id);
//     }
//   };

//   const handleModalClose = () => {
//     setIsModalOpen(false);
//     setSelectedUser(null);
//   };

//   const handleFormSubmit = (formData) => {
//     if (selectedUser) {
//       updateUser({ id: selectedUser.id, data: formData });
//     } else {
//       createUser(formData);
//     }
//   };

//   if (error) {
//     return <Alert severity="error">Failed to load users. Please try again later.</Alert>;
//   }

//   return (
//     <Box>
//       <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
//         <Typography variant="h4">Manage Users</Typography>
//         <Button
//           variant="contained"
//           startIcon={<Add />}
//           onClick={handleAddNew}
//         >
//           Add New User
//         </Button>
//       </Box>

//       <Paper sx={{ mb: 2, p: 2 }}>
//         <TextField
//             fullWidth
//             placeholder="Search by name, username, or email..."
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
//                   <TableCell>Name</TableCell>
//                   <TableCell>Username</TableCell>
//                   <TableCell>Email</TableCell>
//                   <TableCell>Role</TableCell>
//                   <TableCell>Branch</TableCell>
//                   <TableCell>Status</TableCell>
//                   <TableCell align="right">Actions</TableCell>
//                 </TableRow>
//               </TableHead>
//               <TableBody>
//                 {users.map((user) => (
//                   <TableRow key={user.id} hover>
//                     <TableCell sx={{ fontWeight: 'bold' }}>{user.first_name} {user.last_name}</TableCell>
//                     <TableCell>{user.username}</TableCell>
//                     <TableCell>{user.email}</TableCell>
//                     <TableCell>
//                         <Chip label={user.role.replace('_', ' ')} color={roleColors[user.role] || 'default'} size="small" sx={{textTransform: 'capitalize'}} />
//                     </TableCell>
//                     <TableCell>{user.branch_name || 'N/A'}</TableCell>
//                     <TableCell>
//                       <Typography sx={{ color: user.is_active ? 'success.main' : 'error.main', fontWeight: 'bold' }}>
//                         {user.is_active ? 'Active' : 'Inactive'}
//                       </Typography>
//                     </TableCell>
//                     <TableCell align="right">
//                       <Tooltip title="Edit">
//                         <IconButton onClick={() => handleEdit(user)}><Edit /></IconButton>
//                       </Tooltip>
//                       <Tooltip title="Delete">
//                         <IconButton onClick={() => handleDelete(user.id)} color="error"><Delete /></IconButton>
//                       </Tooltip>
//                     </TableCell>
//                   </TableRow>
//                 ))}
//               </TableBody>
//             </Table>
//           </TableContainer>
          
//           <TablePagination
//             rowsPerPageOptions={[10, 25, 50]}
//             component="div"
//             count={totalUsers}
//             rowsPerPage={rowsPerPage}
//             page={page}
//             onPageChange={handleChangePage}
//             onRowsPerPageChange={handleChangeRowsPerPage}
//           />
//         </>
//       )}

//       {/* 4. Render the modal */}
//       <UserFormModal
//         open={isModalOpen}
//         onClose={handleModalClose}
//         onSubmit={handleFormSubmit}
//         user={selectedUser}
//         isLoading={isCreating || isUpdating}
//       />
//     </Box>
//   );
// };

// export default UsersPage;
