// In frontend/src/pages/Inventory.jsx

import React, { useState, useEffect } from 'react';
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
  InputAdornment,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Tooltip,
  IconButton
} from '@mui/material';
import { Add, Search, Tune } from '@mui/icons-material';
import { useQueryClient } from 'react-query';
import { useDebounce } from 'use-debounce';
import toast from 'react-hot-toast';

import { api } from '@shared/api'; 
import { useInventory, useAddStock, useAdjustStock } from '@modules/inventory/hooks';
import { useAuth } from '@/contexts/AuthContext';
import AddStockFormModal from '@modules/inventory/components/AddStockFormModal';
import StockAdjustmentModal from '@modules/inventory/components/StockAdjustmentModal';

const InventoryPage = () => {
  const { currentBranch } = useAuth(); // 2. Get the currently selected branch
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    low_stock: false,
    expiring_soon: false,
  });
  const [debouncedSearchTerm] = useDebounce(searchTerm, 500);

  const [isAddStockModalOpen, setIsAddStockModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedStockItem, setSelectedStockItem] = useState(null);

  const queryClient = useQueryClient();

  // 3. Update the useQuery hook
  const { data, isLoading, error } = useInventory({
    page: page + 1,
    limit: rowsPerPage,
    search: debouncedSearchTerm,
    branch_id: currentBranch?.id,
    ...filters,
  });

  const stockItems = data?.data || [];
  const totalStockItems = data?.pagination?.total || 0;

  const addStockMutation = useAddStock();

  const adjustStockMutation = useAdjustStock();

  const handleFilterChange = (event) => {
    const { name, checked } = event.target;
    setFilters(prev => ({ ...prev, [name]: checked }));
    setPage(0);
  };
  
  const handleChangePage = (event, newPage) => { setPage(newPage); };
  const handleChangeRowsPerPage = (event) => { setRowsPerPage(parseInt(event.target.value, 10)); setPage(0); };
  const handleSearchChange = (event) => { setSearchTerm(event.target.value); setPage(0); };

  const handleOpenAddStockModal = () => { setIsAddStockModalOpen(true); };
  const handleCloseAddStockModal = () => { setIsAddStockModalOpen(false); };
  const handleAddStockSubmit = (formData) => {
    addStockMutation.mutate(formData, {
      onSuccess: () => {
        toast.success('Stock added successfully!');
        queryClient.invalidateQueries(['inventory']);
        setIsAddStockModalOpen(false);
      },
      onError: (err) => toast.error(err?.response?.data?.message || 'Failed to add stock.'),
    });
  };

  const handleOpenAdjustModal = (stockItem) => {
    setSelectedStockItem(stockItem);
    setIsAdjustModalOpen(true);
  };
  const handleCloseAdjustModal = () => {
    setIsAdjustModalOpen(false);
    setSelectedStockItem(null);
  };
  const handleAdjustStockSubmit = (formData) => {
    adjustStockMutation.mutate(formData, {
      onSuccess: () => {
        toast.success('Stock adjusted successfully!');
        queryClient.invalidateQueries(['inventory']);
        setIsAdjustModalOpen(false);
      },
      onError: (err) => toast.error(err?.response?.data?.message || 'Failed to adjust stock.'),
    });
  };


  if (error) {
    return <Alert severity="error">Failed to load inventory. Please try again later.</Alert>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Inventory Management</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleOpenAddStockModal}
        >
          Add Stock
        </Button>
      </Box>

      <Paper sx={{ mb: 2, p: 2 }}>
        <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={8}>
                <TextField fullWidth placeholder="Search by product name, SKU, or batch..." value={searchTerm} onChange={handleSearchChange} InputProps={{ startAdornment: (<InputAdornment position="start"><Search /></InputAdornment>),}}/></Grid>
            <Grid item xs={12} md={4}>
                <FormGroup sx={{flexDirection: 'row'}}><FormControlLabel control={<Checkbox name="low_stock" checked={filters.low_stock} onChange={handleFilterChange} />} label="Low Stock" /><FormControlLabel control={<Checkbox name="expiring_soon" checked={filters.expiring_soon} onChange={handleFilterChange} />} label="Expiring Soon" /></FormGroup></Grid>
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
                  <TableCell>Product Name</TableCell>
                  <TableCell>Batch #</TableCell>
                  <TableCell>Expiry Date</TableCell>
                  <TableCell>Quantity</TableCell>
                  <TableCell>Selling Price</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {stockItems.length > 0 ? stockItems.map((item) => (
                  <TableRow key={item.stock_id} hover>
                    <TableCell sx={{ fontWeight: 'bold' }}>{item.product_name}</TableCell>
                    <TableCell>{item.batch_number}</TableCell>
                    <TableCell sx={{ color: item.days_to_expire <= 30 ? 'error.main' : 'inherit' }}>{new Date(item.expiry_date).toLocaleDateString()} ({item.days_to_expire} days)</TableCell>
                    <TableCell sx={{ color: item.quantity_available <= item.reorder_level ? 'warning.main' : 'inherit', fontWeight: 'bold' }}>{item.quantity_available}</TableCell>
                    <TableCell>₹{item.selling_price}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Adjust Stock">
                        <IconButton onClick={() => handleOpenAdjustModal(item)}>
                          <Tune />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                )) : (
                    <TableRow><TableCell colSpan={6} align="center"><Typography sx={{ p: 4 }}>No inventory data found for {currentBranch?.name}.</Typography></TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          
          <TablePagination
            rowsPerPageOptions={[10, 25, 50]}
            component="div"
            count={totalStockItems}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </>
      )}

      <AddStockFormModal
        open={isAddStockModalOpen}
        onClose={handleCloseAddStockModal}
        onSubmit={handleAddStockSubmit}
        isLoading={addStockMutation.isLoading}
      />

      <StockAdjustmentModal
        open={isAdjustModalOpen}
        onClose={handleCloseAdjustModal}
        onSubmit={handleAdjustStockSubmit}
        stockItem={selectedStockItem}
        isLoading={adjustStockMutation.isLoading}
      />
    </Box>
  );
};

export { default } from '@/features/inventory/pages/Inventory';





// // In frontend/src/pages/Inventory.jsx

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
//   TextField,
//   InputAdornment,
//   Grid,
//   FormControl,
//   InputLabel,
//   Select,
//   MenuItem,
//   FormGroup,
//   FormControlLabel,
//   Checkbox,
//   Tooltip,
//   IconButton
// } from '@mui/material';
// import { Add, Search, Tune } from '@mui/icons-material'; // Tune icon for Adjust
// import { useQuery, useMutation, useQueryClient } from 'react-query';
// import { useDebounce } from 'use-debounce';
// import toast from 'react-hot-toast';

// import { api } from '../services/api'; 
// import AddStockFormModal from '../components/AddStockFormModal';
// import StockAdjustmentModal from '../components/StockAdjustmentModal'; // 1. Import the new modal

// const InventoryPage = () => {
//   const [page, setPage] = useState(0);
//   const [rowsPerPage, setRowsPerPage] = useState(10);
//   const [searchTerm, setSearchTerm] = useState('');
//   const [filters, setFilters] = useState({
//     branch_id: '',
//     low_stock: false,
//     expiring_soon: false,
//   });
//   const [debouncedSearchTerm] = useDebounce(searchTerm, 500);

//   // 2. Add state for both modals
//   const [isAddStockModalOpen, setIsAddStockModalOpen] = useState(false);
//   const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
//   const [selectedStockItem, setSelectedStockItem] = useState(null);

//   const queryClient = useQueryClient();

//   // Fetch data for filters
//   const { data: branchesData } = useQuery('branches', () => api.getBranches());
//   const branches = branchesData?.data?.data || [];

//   // Fetching stock data
//   const { data, isLoading, error } = useQuery(
//     ['inventoryStock', page, rowsPerPage, debouncedSearchTerm, filters],
//     () => api.getStock({ 
//       page: page + 1, 
//       limit: rowsPerPage, 
//       search: debouncedSearchTerm,
//       ...filters
//     }),
//     {
//       keepPreviousData: true,
//     }
//   );

//   const stockItems = data?.data?.data || [];
//   const totalStockItems = data?.data?.pagination?.total || 0;

//   // 3. Add mutations for stock actions
//   const { mutate: addStock, isLoading: isAddingStock } = useMutation(api.addStock, {
//     onSuccess: () => {
//       toast.success('Stock added successfully!');
//       queryClient.invalidateQueries('inventoryStock');
//       setIsAddStockModalOpen(false);
//     },
//     onError: (err) => {
//       toast.error(err.response?.data?.message || 'Failed to add stock.');
//     }
//   });

//   const { mutate: adjustStock, isLoading: isAdjustingStock } = useMutation(api.adjustStock, {
//     onSuccess: () => {
//       toast.success('Stock adjusted successfully!');
//       queryClient.invalidateQueries('inventoryStock');
//       setIsAdjustModalOpen(false);
//     },
//     onError: (err) => {
//       toast.error(err.response?.data?.message || 'Failed to adjust stock.');
//     }
//   });


//   // --- Event Handlers ---
  
//   const handleFilterChange = (event) => {
//     const { name, value, type, checked } = event.target;
//     setFilters(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
//     setPage(0);
//   };
  
//   const handleChangePage = (event, newPage) => { setPage(newPage); };
//   const handleChangeRowsPerPage = (event) => { setRowsPerPage(parseInt(event.target.value, 10)); setPage(0); };
//   const handleSearchChange = (event) => { setSearchTerm(event.target.value); setPage(0); };

//   const handleOpenAddStockModal = () => { setIsAddStockModalOpen(true); };
//   const handleCloseAddStockModal = () => { setIsAddStockModalOpen(false); };
//   const handleAddStockSubmit = (formData) => { addStock(formData); };

//   const handleOpenAdjustModal = (stockItem) => {
//     setSelectedStockItem(stockItem);
//     setIsAdjustModalOpen(true);
//   };
//   const handleCloseAdjustModal = () => {
//     setIsAdjustModalOpen(false);
//     setSelectedStockItem(null);
//   };
//   const handleAdjustStockSubmit = (formData) => {
//     adjustStock(formData);
//   };


//   if (error) {
//     return <Alert severity="error">Failed to load inventory. Please try again later.</Alert>;
//   }

//   return (
//     <Box>
//       <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
//         <Typography variant="h4">Inventory Management</Typography>
//         <Button
//           variant="contained"
//           startIcon={<Add />}
//           onClick={handleOpenAddStockModal}
//         >
//           Add Stock
//         </Button>
//       </Box>

//       <Paper sx={{ mb: 2, p: 2 }}>
//         <Grid container spacing={2} alignItems="center">
//             <Grid item xs={12} md={5}><TextField fullWidth placeholder="Search by product name, SKU, or batch..." value={searchTerm} onChange={handleSearchChange} InputProps={{ startAdornment: (<InputAdornment position="start"><Search /></InputAdornment>),}}/></Grid>
//             <Grid item xs={12} md={3}><FormControl fullWidth><InputLabel>Branch</InputLabel><Select name="branch_id" value={filters.branch_id} label="Branch" onChange={handleFilterChange}><MenuItem value=""><em>All Branches</em></MenuItem>{branches.map((branch) => (<MenuItem key={branch.id} value={branch.id}>{branch.name}</MenuItem>))}</Select></FormControl></Grid>
//             <Grid item xs={12} md={4}><FormGroup sx={{flexDirection: 'row'}}><FormControlLabel control={<Checkbox name="low_stock" checked={filters.low_stock} onChange={handleFilterChange} />} label="Low Stock" /><FormControlLabel control={<Checkbox name="expiring_soon" checked={filters.expiring_soon} onChange={handleFilterChange} />} label="Expiring Soon" /></FormGroup></Grid>
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
//                   <TableCell>Product Name</TableCell>
//                   <TableCell>Branch</TableCell>
//                   <TableCell>Batch #</TableCell>
//                   <TableCell>Expiry Date</TableCell>
//                   <TableCell>Quantity</TableCell>
//                   <TableCell>Selling Price</TableCell>
//                   <TableCell align="right">Actions</TableCell>
//                 </TableRow>
//               </TableHead>
//               <TableBody>
//                 {stockItems.length > 0 ? stockItems.map((item) => (
//                   <TableRow key={item.stock_id} hover>
//                     <TableCell sx={{ fontWeight: 'bold' }}>{item.product_name}</TableCell>
//                     <TableCell>{item.branch_name}</TableCell>
//                     <TableCell>{item.batch_number}</TableCell>
//                     <TableCell sx={{ color: item.days_to_expire <= 30 ? 'error.main' : 'inherit' }}>{new Date(item.expiry_date).toLocaleDateString()} ({item.days_to_expire} days)</TableCell>
//                     <TableCell sx={{ color: item.quantity_available <= item.reorder_level ? 'warning.main' : 'inherit', fontWeight: 'bold' }}>{item.quantity_available}</TableCell>
//                     <TableCell>₹{item.selling_price}</TableCell>
//                     <TableCell align="right">
//                       <Tooltip title="Adjust Stock">
//                         <IconButton onClick={() => handleOpenAdjustModal(item)}>
//                           <Tune />
//                         </IconButton>
//                       </Tooltip>
//                     </TableCell>
//                   </TableRow>
//                 )) : (
//                     <TableRow><TableCell colSpan={7} align="center"><Typography sx={{ p: 4 }}>No inventory data found. Click "Add Stock" to begin.</Typography></TableCell></TableRow>
//                 )}
//               </TableBody>
//             </Table>
//           </TableContainer>
          
//           <TablePagination
//             rowsPerPageOptions={[10, 25, 50]}
//             component="div"
//             count={totalStockItems}
//             rowsPerPage={rowsPerPage}
//             page={page}
//             onPageChange={handleChangePage}
//             onRowsPerPageChange={handleChangeRowsPerPage}
//           />
//         </>
//       )}

//       <AddStockFormModal
//         open={isAddStockModalOpen}
//         onClose={handleCloseAddStockModal}
//         onSubmit={handleAddStockSubmit}
//         isLoading={isAddingStock}
//       />

//       <StockAdjustmentModal
//         open={isAdjustModalOpen}
//         onClose={handleCloseAdjustModal}
//         onSubmit={handleAdjustStockSubmit}
//         stockItem={selectedStockItem}
//         isLoading={isAdjustingStock}
//       />
//     </Box>
//   );
// };

// export default InventoryPage;
