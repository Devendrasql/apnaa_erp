// In frontend/src/pages/Reports.jsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab
} from '@mui/material';
import { useQuery, useMutation } from 'react-query';
import { api } from '@shared/api';
import { useAuth } from '@/contexts/AuthContext';

const StatCard = ({ title, value }) => (
    <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
        <Typography color="text.secondary" gutterBottom>{title}</Typography>
        <Typography variant="h5" component="h2">{value}</Typography>
    </Paper>
);

// Daily Sales Report Component
const DailySalesReport = () => {
    const { currentBranch } = useAuth(); // Get the current branch from context
    const [filters, setFilters] = useState({
        date: new Date().toISOString().split('T')[0],
    });

    const { mutate: generateReport, isLoading, error, data: reportData } = useMutation(
        (reportFilters) => api.getDailySalesReport(reportFilters)
    );
    const report = reportData?.data?.data;

    const handleFilterChange = (event) => {
        setFilters(prev => ({ ...prev, [event.target.name]: event.target.value }));
    };

    const handleGenerateReport = () => {
        // Automatically include the current branch ID in the request
        generateReport({ ...filters, branch_id: currentBranch?.id });
    };

    return (
        <Box>
            <Paper sx={{ mb: 3, p: 2 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={8}>
                        <TextField fullWidth name="date" label="Report Date" type="date" value={filters.date} onChange={handleFilterChange} InputLabelProps={{ shrink: true }} />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <Button variant="contained" fullWidth onClick={handleGenerateReport} disabled={isLoading} sx={{ py: 1.8 }}>
                            {isLoading ? <CircularProgress size={24} /> : 'Generate Report'}
                        </Button>
                    </Grid>
                </Grid>
            </Paper>
            {error && <Alert severity="error" sx={{ mb: 2 }}>Failed to generate report.</Alert>}
            {report && (
                <Paper sx={{ p: 3 }}>
                    <Typography variant="h5" gutterBottom>Report for {new Date(report.report_date).toLocaleDateString()}</Typography>
                    <Grid container spacing={3} sx={{ my: 2 }}>
                        <Grid item xs={6} md={3}><StatCard title="Total Revenue" value={`₹${(Number(report.summary?.total_revenue) || 0).toLocaleString()}`} /></Grid>
                        <Grid item xs={6} md={3}><StatCard title="Transactions" value={report.summary?.total_transactions || 0} /></Grid>
                        <Grid item xs={6} md={3}><StatCard title="Items Sold" value={report.summary?.total_items_sold || 0} /></Grid>
                        <Grid item xs={6} md={3}><StatCard title="Avg. Sale Value" value={`₹${(Number(report.summary?.average_sale_value) || 0).toFixed(2)}`} /></Grid>
                    </Grid>
                </Paper>
            )}
        </Box>
    );
};

// Inventory Report Component
const InventoryReport = () => {
    const { currentBranch } = useAuth();
    const [filters, setFilters] = useState({
        report_type: 'all',
    });

    const { mutate: generateReport, isLoading, error, data: reportData } = useMutation(
        (reportFilters) => api.getInventoryReport(reportFilters)
    );
    const reportItems = reportData?.data?.data || [];

    const handleFilterChange = (event) => {
        setFilters(prev => ({ ...prev, [event.target.name]: event.target.value }));
    };
    
    const handleGenerateReport = () => {
        generateReport({ ...filters, branch_id: currentBranch?.id });
    };

    return (
        <Box>
            <Paper sx={{ mb: 3, p: 2 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={8}><FormControl fullWidth><InputLabel>Report Type</InputLabel><Select name="report_type" value={filters.report_type} label="Report Type" onChange={handleFilterChange}><MenuItem value="all">All Stock</MenuItem><MenuItem value="low_stock">Low Stock</MenuItem><MenuItem value="expiring_soon">Expiring Soon</MenuItem></Select></FormControl></Grid>
                    <Grid item xs={12} sm={4}><Button variant="contained" fullWidth onClick={handleGenerateReport} disabled={isLoading} sx={{ py: 1.8 }}>{isLoading ? <CircularProgress size={24} /> : 'Generate Report'}</Button></Grid>
                </Grid>
            </Paper>
            {error && <Alert severity="error" sx={{ mb: 2 }}>Failed to generate report.</Alert>}
            {reportData && (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead><TableRow><TableCell>Product</TableCell><TableCell>Branch</TableCell><TableCell>SKU</TableCell><TableCell align="right">Quantity</TableCell><TableCell>Expiry</TableCell></TableRow></TableHead>
                        <TableBody>
                            {reportItems.map((item) => (
                                <TableRow key={`${item.product_id}-${item.branch_id}`}>
                                    <TableCell>{item.product_name}</TableCell>
                                    <TableCell>{item.branch_name}</TableCell>
                                    <TableCell>{item.sku}</TableCell>
                                    <TableCell align="right">{item.total_quantity || item.current_stock || item.quantity_available}</TableCell>
                                    <TableCell>{item.earliest_expiry || item.expiry_date ? new Date(item.earliest_expiry || item.expiry_date).toLocaleDateString() : 'N/A'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Box>
    );
};

// Product Performance Report Component
const ProductPerformanceReport = () => {
    const { currentBranch } = useAuth();
    const [filters, setFilters] = useState({
        from_date: new Date().toISOString().split('T')[0],
        to_date: new Date().toISOString().split('T')[0],
    });

    const { mutate: generateReport, isLoading, error, data: reportData } = useMutation(
        (reportFilters) => api.getProductPerformanceReport(reportFilters)
    );
    const reportItems = reportData?.data?.data || [];

    const handleFilterChange = (event) => {
        setFilters(prev => ({ ...prev, [event.target.name]: event.target.value }));
    };
    
    const handleGenerateReport = () => {
        generateReport({ ...filters, branch_id: currentBranch?.id });
    };

    return (
        <Box>
            <Paper sx={{ mb: 3, p: 2 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={4}><TextField fullWidth name="from_date" label="From Date" type="date" value={filters.from_date} onChange={handleFilterChange} InputLabelProps={{ shrink: true }} /></Grid>
                    <Grid item xs={12} sm={4}><TextField fullWidth name="to_date" label="To Date" type="date" value={filters.to_date} onChange={handleFilterChange} InputLabelProps={{ shrink: true }} /></Grid>
                    <Grid item xs={12} sm={4}><Button variant="contained" fullWidth onClick={handleGenerateReport} disabled={isLoading} sx={{ py: 1.8 }}>{isLoading ? <CircularProgress size={24} /> : 'Generate Report'}</Button></Grid>
                </Grid>
            </Paper>
            {error && <Alert severity="error" sx={{ mb: 2 }}>Failed to generate report.</Alert>}
            {reportData && (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead><TableRow><TableCell>Product</TableCell><TableCell>SKU</TableCell><TableCell align="right">Qty Sold</TableCell><TableCell align="right">Total Revenue</TableCell><TableCell align="right">Est. Profit</TableCell></TableRow></TableHead>
                        <TableBody>
                            {reportItems.map((item) => (
                                <TableRow key={item.product_id}>
                                    <TableCell>{item.product_name}</TableCell>
                                    <TableCell>{item.sku}</TableCell>
                                    <TableCell align="right">{item.total_quantity_sold}</TableCell>
                                    <TableCell align="right">₹{Number(item.total_revenue).toLocaleString()}</TableCell>
                                    <TableCell align="right" sx={{ color: Number(item.estimated_profit) < 0 ? 'error.main' : 'success.main' }}>
                                        ₹{Number(item.estimated_profit).toLocaleString()}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Box>
    );
};


const ReportsPage = () => {
  const [currentTab, setCurrentTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>Reports</Typography>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={currentTab} onChange={handleTabChange}>
          <Tab label="Daily Sales" />
          <Tab label="Inventory" />
          <Tab label="Product Performance" />
        </Tabs>
      </Box>
      
      {currentTab === 0 && <DailySalesReport />}
      {currentTab === 1 && <InventoryReport />}
      {currentTab === 2 && <ProductPerformanceReport />}
    </Box>
  );
};

export default ReportsPage;





// // In frontend/src/pages/Reports.jsx

// import React, { useState } from 'react';
// import {
//   Box,
//   Typography,
//   Paper,
//   Grid,
//   TextField,
//   Button,
//   FormControl,
//   InputLabel,
//   Select,
//   MenuItem,
//   CircularProgress,
//   Alert,
//   Divider,
//   Table,
//   TableBody,
//   TableCell,
//   TableContainer,
//   TableHead,
//   TableRow,
//   Tabs,
//   Tab
// } from '@mui/material';
// import { useQuery, useMutation } from 'react-query';
// import { api } from '../services/api';

// const StatCard = ({ title, value }) => (
//     <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
//         <Typography color="text.secondary" gutterBottom>{title}</Typography>
//         <Typography variant="h5" component="h2">{value}</Typography>
//     </Paper>
// );

// // Daily Sales Report Component
// const DailySalesReport = () => {
//     const [filters, setFilters] = useState({
//         date: new Date().toISOString().split('T')[0],
//         branch_id: '',
//     });

//     const { data: branchesData } = useQuery('branches', () => api.getBranches());
//     const branches = branchesData?.data?.data || [];

//     const { mutate: generateReport, isLoading, error, data: reportData } = useMutation(
//         (reportFilters) => api.getDailySalesReport(reportFilters)
//     );
//     const report = reportData?.data?.data;

//     const handleFilterChange = (event) => {
//         setFilters(prev => ({ ...prev, [event.target.name]: event.target.value }));
//     };

//     const handleGenerateReport = () => {
//         if (!filters.date) {
//             toast.error("Please select a date for the report.");
//             return;
//         }
//         generateReport(filters);
//     };

//     return (
//         <Box>
//             <Paper sx={{ mb: 3, p: 2 }}>
//                 <Grid container spacing={2} alignItems="center">
//                     <Grid item xs={12} md={4}><TextField fullWidth name="date" label="Report Date" type="date" value={filters.date} onChange={handleFilterChange} InputLabelProps={{ shrink: true }} /></Grid>
//                     <Grid item xs={12} md={4}><FormControl fullWidth><InputLabel>Branch</InputLabel><Select name="branch_id" value={filters.branch_id} label="Branch" onChange={handleFilterChange}><MenuItem value=""><em>All Branches</em></MenuItem>{branches.map((branch) => (<MenuItem key={branch.id} value={branch.id}>{branch.name}</MenuItem>))}</Select></FormControl></Grid>
//                     <Grid item xs={12} md={4}><Button variant="contained" fullWidth onClick={handleGenerateReport} disabled={isLoading} sx={{ py: 1.8 }}>{isLoading ? <CircularProgress size={24} /> : 'Generate Report'}</Button></Grid>
//                 </Grid>
//             </Paper>
//             {error && <Alert severity="error" sx={{ mb: 2 }}>Failed to generate report.</Alert>}
//             {report && (
//                 <Paper sx={{ p: 3 }}>
//                     <Typography variant="h5" gutterBottom>Report for {new Date(report.report_date).toLocaleDateString()}</Typography>
//                     <Grid container spacing={3} sx={{ my: 2 }}>
//                         <Grid item xs={6} md={3}><StatCard title="Total Revenue" value={`₹${(Number(report.summary?.total_revenue) || 0).toLocaleString()}`} /></Grid>
//                         <Grid item xs={6} md={3}><StatCard title="Transactions" value={report.summary?.total_transactions || 0} /></Grid>
//                         <Grid item xs={6} md={3}><StatCard title="Items Sold" value={report.summary?.total_items_sold || 0} /></Grid>
//                         <Grid item xs={6} md={3}><StatCard title="Avg. Sale Value" value={`₹${(Number(report.summary?.average_sale_value) || 0).toFixed(2)}`} /></Grid>
//                     </Grid>
//                 </Paper>
//             )}
//         </Box>
//     );
// };

// // Inventory Report Component (Restored)
// const InventoryReport = () => {
//     const [filters, setFilters] = useState({
//         report_type: 'all',
//         branch_id: '',
//     });

//     const { data: branchesData } = useQuery('branches', () => api.getBranches());
//     const branches = branchesData?.data?.data || [];

//     const { mutate: generateReport, isLoading, error, data: reportData } = useMutation(
//         (reportFilters) => api.getInventoryReport(reportFilters)
//     );
//     const reportItems = reportData?.data?.data || [];

//     const handleFilterChange = (event) => {
//         setFilters(prev => ({ ...prev, [event.target.name]: event.target.value }));
//     };
    
//     const handleGenerateReport = () => {
//         generateReport(filters);
//     };

//     return (
//         <Box>
//             <Paper sx={{ mb: 3, p: 2 }}>
//                 <Grid container spacing={2} alignItems="center">
//                     <Grid item xs={12} md={4}><FormControl fullWidth><InputLabel>Report Type</InputLabel><Select name="report_type" value={filters.report_type} label="Report Type" onChange={handleFilterChange}><MenuItem value="all">All Stock</MenuItem><MenuItem value="low_stock">Low Stock</MenuItem><MenuItem value="expiring_soon">Expiring Soon</MenuItem></Select></FormControl></Grid>
//                     <Grid item xs={12} md={4}><FormControl fullWidth><InputLabel>Branch</InputLabel><Select name="branch_id" value={filters.branch_id} label="Branch" onChange={handleFilterChange}><MenuItem value=""><em>All Branches</em></MenuItem>{branches.map((branch) => (<MenuItem key={branch.id} value={branch.id}>{branch.name}</MenuItem>))}</Select></FormControl></Grid>
//                     <Grid item xs={12} md={4}><Button variant="contained" fullWidth onClick={handleGenerateReport} disabled={isLoading} sx={{ py: 1.8 }}>{isLoading ? <CircularProgress size={24} /> : 'Generate Report'}</Button></Grid>
//                 </Grid>
//             </Paper>
//             {error && <Alert severity="error" sx={{ mb: 2 }}>Failed to generate report.</Alert>}
//             {reportData && (
//                 <TableContainer component={Paper}>
//                     <Table>
//                         <TableHead><TableRow><TableCell>Product</TableCell><TableCell>Branch</TableCell><TableCell>SKU</TableCell><TableCell align="right">Quantity</TableCell><TableCell>Expiry</TableCell></TableRow></TableHead>
//                         <TableBody>
//                             {reportItems.map((item) => (
//                                 <TableRow key={`${item.product_id}-${item.branch_id}`}>
//                                     <TableCell>{item.product_name}</TableCell>
//                                     <TableCell>{item.branch_name}</TableCell>
//                                     <TableCell>{item.sku}</TableCell>
//                                     <TableCell align="right">{item.total_quantity || item.current_stock || item.quantity_available}</TableCell>
//                                     <TableCell>{item.earliest_expiry || item.expiry_date ? new Date(item.earliest_expiry || item.expiry_date).toLocaleDateString() : 'N/A'}</TableCell>
//                                 </TableRow>
//                             ))}
//                         </TableBody>
//                     </Table>
//                 </TableContainer>
//             )}
//         </Box>
//     );
// };

// // Product Performance Report Component
// const ProductPerformanceReport = () => {
//     const [filters, setFilters] = useState({
//         from_date: new Date().toISOString().split('T')[0],
//         to_date: new Date().toISOString().split('T')[0],
//         branch_id: '',
//     });

//     const { data: branchesData } = useQuery('branches', () => api.getBranches());
//     const branches = branchesData?.data?.data || [];

//     const { mutate: generateReport, isLoading, error, data: reportData } = useMutation(
//         (reportFilters) => api.getProductPerformanceReport(reportFilters)
//     );
//     const reportItems = reportData?.data?.data || [];

//     const handleFilterChange = (event) => {
//         setFilters(prev => ({ ...prev, [event.target.name]: event.target.value }));
//     };
    
//     const handleGenerateReport = () => {
//         generateReport(filters);
//     };

//     return (
//         <Box>
//             <Paper sx={{ mb: 3, p: 2 }}>
//                 <Grid container spacing={2} alignItems="center">
//                     <Grid item xs={12} md={3}><TextField fullWidth name="from_date" label="From Date" type="date" value={filters.from_date} onChange={handleFilterChange} InputLabelProps={{ shrink: true }} /></Grid>
//                     <Grid item xs={12} md={3}><TextField fullWidth name="to_date" label="To Date" type="date" value={filters.to_date} onChange={handleFilterChange} InputLabelProps={{ shrink: true }} /></Grid>
//                     <Grid item xs={12} md={3}><FormControl fullWidth><InputLabel>Branch</InputLabel><Select name="branch_id" value={filters.branch_id} label="Branch" onChange={handleFilterChange}><MenuItem value=""><em>All Branches</em></MenuItem>{branches.map((branch) => (<MenuItem key={branch.id} value={branch.id}>{branch.name}</MenuItem>))}</Select></FormControl></Grid>
//                     <Grid item xs={12} md={3}><Button variant="contained" fullWidth onClick={handleGenerateReport} disabled={isLoading} sx={{ py: 1.8 }}>{isLoading ? <CircularProgress size={24} /> : 'Generate Report'}</Button></Grid>
//                 </Grid>
//             </Paper>
//             {error && <Alert severity="error" sx={{ mb: 2 }}>Failed to generate report.</Alert>}
//             {reportData && (
//                 <TableContainer component={Paper}>
//                     <Table>
//                         <TableHead><TableRow><TableCell>Product</TableCell><TableCell>SKU</TableCell><TableCell align="right">Qty Sold</TableCell><TableCell align="right">Total Revenue</TableCell><TableCell align="right">Est. Profit</TableCell></TableRow></TableHead>
//                         <TableBody>
//                             {reportItems.map((item) => (
//                                 <TableRow key={item.product_id}>
//                                     <TableCell>{item.product_name}</TableCell>
//                                     <TableCell>{item.sku}</TableCell>
//                                     <TableCell align="right">{item.total_quantity_sold}</TableCell>
//                                     <TableCell align="right">₹{Number(item.total_revenue).toLocaleString()}</TableCell>
//                                     <TableCell align="right" sx={{ color: Number(item.estimated_profit) < 0 ? 'error.main' : 'success.main' }}>
//                                         ₹{Number(item.estimated_profit).toLocaleString()}
//                                     </TableCell>
//                                 </TableRow>
//                             ))}
//                         </TableBody>
//                     </Table>
//                 </TableContainer>
//             )}
//         </Box>
//     );
// };


// const ReportsPage = () => {
//   const [currentTab, setCurrentTab] = useState(0);

//   const handleTabChange = (event, newValue) => {
//     setCurrentTab(newValue);
//   };

//   return (
//     <Box>
//       <Typography variant="h4" sx={{ mb: 3 }}>Reports</Typography>
//       <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
//         <Tabs value={currentTab} onChange={handleTabChange}>
//           <Tab label="Daily Sales" />
//           <Tab label="Inventory" />
//           <Tab label="Product Performance" />
//         </Tabs>
//       </Box>
      
//       {currentTab === 0 && <DailySalesReport />}
//       {currentTab === 1 && <InventoryReport />}
//       {currentTab === 2 && <ProductPerformanceReport />}
//     </Box>
//   );
// };

// export default ReportsPage;
