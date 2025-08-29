// In frontend/src/pages/Dashboard.jsx

import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  TrendingUp,
  People,
  Inventory2,
  WarningAmber
} from '@mui/icons-material';
import { useQuery } from 'react-query';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext'; // 1. Import useAuth
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const StatCard = ({ title, value, icon, color = 'primary' }) => (
    <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', height: '100%' }}>
        <Box sx={{ color: `${color}.main`, mr: 2, p: 1.5, borderRadius: '50%', backgroundColor: `${color}.lighter`, display: 'flex' }}>
          {icon}
        </Box>
        <Box>
          <Typography color="text.secondary" gutterBottom>{title}</Typography>
          <Typography variant="h5" component="h2">{value}</Typography>
        </Box>
    </Paper>
);

const DashboardPage = () => {
  const { currentBranch } = useAuth(); // 2. Get the currently selected branch from context

  // 3. Update all useQuery hooks to include the branch ID in the query key and the API call
  const { data: statsData, isLoading: isLoadingStats, error: statsError } = useQuery(
    ['dashboardStats', currentBranch?.id], // Query key now depends on the branch
    () => api.getDashboardStats({ branch_id: currentBranch?.id }),
    {
      enabled: !!currentBranch, // Only run the query if a branch is selected
      select: (response) => response.data.data,
    }
  );

  const { data: salesChartData, isLoading: isLoadingChart, error: chartError } = useQuery(
    ['dashboardSalesChart', currentBranch?.id],
    () => api.getSalesOverTime({ branch_id: currentBranch?.id }),
    {
      enabled: !!currentBranch,
      select: (response) => response.data.data,
    }
  );

  const { data: topProducts, isLoading: isLoadingTopProducts, error: topProductsError } = useQuery(
    ['dashboardTopSelling', currentBranch?.id],
    () => api.getTopSellingProducts({ branch_id: currentBranch?.id }),
    {
      enabled: !!currentBranch,
      select: (response) => response.data.data,
    }
  );

  const { data: recentSales, isLoading: isLoadingRecentSales, error: recentSalesError } = useQuery(
    ['dashboardRecentSales', currentBranch?.id],
    () => api.getRecentSales({ branch_id: currentBranch?.id }),
    {
      enabled: !!currentBranch,
      select: (response) => response.data.data,
    }
  );

  const isLoading = isLoadingStats || isLoadingTopProducts || isLoadingRecentSales || isLoadingChart;
  const error = statsError || topProductsError || recentSalesError || chartError;

  if (error) {
    return <Alert severity="error">Failed to load dashboard data: {error.message}</Alert>;
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Dashboard ({currentBranch ? currentBranch.name : 'Loading...'})
      </Typography>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
      ) : (
        <Grid container spacing={3}>
          {/* Stat Cards */}
          <Grid item xs={12} sm={6} md={3}>
            <StatCard title="Today's Sales" value={`₹${(Number(statsData?.todaySales) || 0).toLocaleString()}`} icon={<TrendingUp />} color="success" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard title="Total Products" value={statsData?.totalProducts || 0} icon={<Inventory2 />} color="primary" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard title="Total Customers" value={statsData?.totalCustomers || 0} icon={<People />} color="info" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard title="Low Stock Items" value={statsData?.lowStockCount || 0} icon={<WarningAmber />} color="warning" />
          </Grid>

          {/* Sales Chart */}
          <Grid item xs={12} lg={8}>
            <Paper sx={{ p: 2, height: '400px' }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Last 7 Days Sales</Typography>
              <ResponsiveContainer width="100%" height="90%">
                <BarChart data={salesChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
                  <YAxis />
                  <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                  <Legend />
                  <Bar dataKey="totalSales" fill="#8884d8" name="Total Sales (₹)" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          {/* Top Selling Products */}
          <Grid item xs={12} lg={4}>
            <Paper sx={{ p: 2, height: '400px', overflow: 'auto' }}>
              <Typography variant="h6" sx={{ mb: 1 }}>Top Selling Products</Typography>
              <List>
                {topProducts?.map((product, index) => (
                  <ListItem key={index} disableGutters divider>
                    <ListItemText 
                      primary={product.name} 
                      secondary={`Sold: ${product.totalQuantitySold}`}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>

          {/* Recent Sales */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ mb: 1 }}>Recent Sales</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Invoice #</TableCell>
                      <TableCell>Customer</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell align="right">Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentSales?.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell>{sale.invoice_number}</TableCell>
                        <TableCell>{sale.customer_name || 'Walk-in'}</TableCell>
                        <TableCell>{new Date(sale.sale_date).toLocaleString()}</TableCell>
                        <TableCell align="right">₹{Number(sale.total_amount).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default DashboardPage;





// // In frontend/src/pages/Dashboard.jsx

// import React from 'react';
// import {
//   Box,
//   Typography,
//   Grid,
//   Paper,
//   CircularProgress,
//   Alert,
//   List,
//   ListItem,
//   ListItemText,
//   Table,
//   TableBody,
//   TableCell,
//   TableContainer,
//   TableHead,
//   TableRow,
// } from '@mui/material';
// import {
//   TrendingUp,
//   People,
//   Inventory2,
//   WarningAmber
// } from '@mui/icons-material';
// import { useQuery } from 'react-query';
// import { api } from '../services/api';
// import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// // Reusable component for the main statistic cards
// const StatCard = ({ title, value, icon, color = 'primary' }) => (
//     <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', height: '100%' }}>
//         <Box sx={{ color: `${color}.main`, mr: 2, p: 1.5, borderRadius: '50%', backgroundColor: `${color}.lighter`, display: 'flex' }}>
//           {icon}
//         </Box>
//         <Box>
//           <Typography color="text.secondary" gutterBottom>{title}</Typography>
//           <Typography variant="h5" component="h2">{value}</Typography>
//         </Box>
//     </Paper>
// );

// const DashboardPage = () => {
//   // Fetch the main dashboard statistics
//   const { data: statsData, isLoading: isLoadingStats, error: statsError } = useQuery(
//     'dashboardStats',
//     () => api.getDashboardStats(),
//     {
//       select: (response) => response.data.data,
//     }
//   );

//   // Fetch data for the sales chart
//   const { data: salesChartData, isLoading: isLoadingChart, error: chartError } = useQuery(
//     'dashboardSalesChart',
//     () => api.getSalesOverTime(),
//     {
//       select: (response) => response.data.data,
//     }
//   );

//   // Fetch the data for the top-selling products list
//   const { data: topProducts, isLoading: isLoadingTopProducts, error: topProductsError } = useQuery(
//     'dashboardTopSelling',
//     () => api.getTopSellingProducts(),
//     {
//       select: (response) => response.data.data,
//     }
//   );

//   // Fetch the data for the recent sales list
//   const { data: recentSales, isLoading: isLoadingRecentSales, error: recentSalesError } = useQuery(
//     'dashboardRecentSales',
//     () => api.getRecentSales(),
//     {
//       select: (response) => response.data.data,
//     }
//   );

//   // Combine loading and error states from all queries
//   const isLoading = isLoadingStats || isLoadingTopProducts || isLoadingRecentSales || isLoadingChart;
//   const error = statsError || topProductsError || recentSalesError || chartError;

//   if (error) {
//     return <Alert severity="error">Failed to load dashboard data: {error.message}</Alert>;
//   }

//   return (
//     <Box>
//       <Typography variant="h4" sx={{ mb: 3 }}>Dashboard</Typography>

//       {isLoading ? (
//         <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
//       ) : (
//         <Grid container spacing={3}>
//           {/* Stat Cards */}
//           <Grid item xs={12} sm={6} md={3}>
//             <StatCard title="Today's Sales" value={`₹${(Number(statsData?.todaySales) || 0).toLocaleString()}`} icon={<TrendingUp />} color="success" />
//           </Grid>
//           <Grid item xs={12} sm={6} md={3}>
//             <StatCard title="Total Products" value={statsData?.totalProducts || 0} icon={<Inventory2 />} color="primary" />
//           </Grid>
//           <Grid item xs={12} sm={6} md={3}>
//             <StatCard title="Total Customers" value={statsData?.totalCustomers || 0} icon={<People />} color="info" />
//           </Grid>
//           <Grid item xs={12} sm={6} md={3}>
//             <StatCard title="Low Stock Items" value={statsData?.lowStockCount || 0} icon={<WarningAmber />} color="warning" />
//           </Grid>

//           {/* Sales Chart */}
//           <Grid item xs={12} lg={8}>
//             <Paper sx={{ p: 2, height: '400px' }}>
//               <Typography variant="h6" sx={{ mb: 2 }}>Last 7 Days Sales</Typography>
//               <ResponsiveContainer width="100%" height="90%">
//                 <BarChart data={salesChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
//                   <CartesianGrid strokeDasharray="3 3" />
//                   <XAxis dataKey="date" tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
//                   <YAxis />
//                   <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
//                   <Legend />
//                   <Bar dataKey="totalSales" fill="#8884d8" name="Total Sales (₹)" />
//                 </BarChart>
//               </ResponsiveContainer>
//             </Paper>
//           </Grid>

//           {/* Top Selling Products */}
//           <Grid item xs={12} lg={4}>
//             <Paper sx={{ p: 2, height: '400px', overflow: 'auto' }}>
//               <Typography variant="h6" sx={{ mb: 1 }}>Top Selling Products</Typography>
//               <List>
//                 {topProducts?.map((product, index) => (
//                   <ListItem key={index} disableGutters divider>
//                     <ListItemText 
//                       primary={product.name} 
//                       secondary={`Sold: ${product.totalQuantitySold}`}
//                     />
//                   </ListItem>
//                 ))}
//               </List>
//             </Paper>
//           </Grid>

//           {/* Recent Sales */}
//           <Grid item xs={12}>
//             <Paper sx={{ p: 2 }}>
//               <Typography variant="h6" sx={{ mb: 1 }}>Recent Sales</Typography>
//               <TableContainer>
//                 <Table size="small">
//                   <TableHead>
//                     <TableRow>
//                       <TableCell>Invoice #</TableCell>
//                       <TableCell>Customer</TableCell>
//                       <TableCell>Date</TableCell>
//                       <TableCell align="right">Amount</TableCell>
//                     </TableRow>
//                   </TableHead>
//                   <TableBody>
//                     {recentSales?.map((sale) => (
//                       <TableRow key={sale.id}>
//                         <TableCell>{sale.invoice_number}</TableCell>
//                         <TableCell>{sale.customer_name || 'Walk-in'}</TableCell>
//                         <TableCell>{new Date(sale.sale_date).toLocaleString()}</TableCell>
//                         <TableCell align="right">₹{Number(sale.total_amount).toLocaleString()}</TableCell>
//                       </TableRow>
//                     ))}
//                   </TableBody>
//                 </Table>
//               </TableContainer>
//             </Paper>
//           </Grid>
//         </Grid>
//       )}
//     </Box>
//   );
// };

// export default DashboardPage;