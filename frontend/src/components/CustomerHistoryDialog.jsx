import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Table, TableHead, TableRow, TableCell, TableBody, Typography
} from '@mui/material';
import { useQuery } from 'react-query';
import api from '../services/api';
import { IconButton, Tooltip } from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';

const fmt = (n) => `₹${Number(n || 0).toFixed(2)}`;

export default function CustomerHistoryDialog({ open, onClose, params }) {
  const { data, isLoading, error } = useQuery(
    ['salesHistory', params],
    () => api.getSales({
      page: 1,
      limit: 100,
      customer_id: params?.customer_id,
      from_date: params?.from_date,
      to_date: params?.to_date,
      branch_id: params?.branch_id,
    }),
    { enabled: open && !!params?.customer_id }
  );

  const rows = data?.data?.data || [];

  const handlePrint = (saleId) => {
    window.open(`/invoice/${saleId}?print=1`, '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Last 6 Months Invoices</DialogTitle>
      <DialogContent dividers>
        {isLoading ? (
          <Typography>Loading…</Typography>
        ) : error ? (
          <Typography color="error">Failed to load history</Typography>
        ) : rows.length === 0 ? (
          <Typography>No invoices for this period.</Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Invoice #</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell>{new Date(r.sale_date).toLocaleString()}</TableCell>
                  <TableCell>{r.invoice_number}</TableCell>
                  <TableCell align="right">{fmt(r.final_amount)}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Print invoice">
                      <IconButton size="small" onClick={() => handlePrint(r.id)}>
                        <PrintIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}








// import React from 'react';
// import {
//   Dialog, DialogTitle, DialogContent, DialogActions,
//   Button, Table, TableHead, TableRow, TableCell, TableBody, Typography
// } from '@mui/material';
// import { useQuery } from 'react-query';
// import api from '../services/api';
// import { IconButton, Tooltip } from '@mui/material';
// import PrintIcon from '@mui/icons-material/Print';

// const fmt = (n) => `₹${Number(n || 0).toFixed(2)}`;

// export default function CustomerHistoryDialog({ open, onClose, params }) {
//   const { data, isLoading, error } = useQuery(
//     ['salesHistory', params],
//     () => api.getSales({
//       page: 1,
//       limit: 100,
//       customer_id: params?.customer_id,
//       from_date: params?.from_date,
//       to_date: params?.to_date,
//       branch_id: params?.branch_id,
//     }),
//     { enabled: open && !!params?.customer_id }
//   );

//   const rows = data?.data?.data || [];

//   const handlePrint = (id) => {
//     window.open(`/invoice/${id}?print=1`, '_blank', 'noopener,noreferrer');
//   };

//   return (
//     <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
//       <DialogTitle>Last 6 Months Invoices</DialogTitle>
//       <DialogContent dividers>
//         {isLoading ? (
//           <Typography>Loading…</Typography>
//         ) : error ? (
//           <Typography color="error">Failed to load history</Typography>
//         ) : rows.length === 0 ? (
//           <Typography>No invoices for this period.</Typography>
//         ) : (
//           <Table size="small">
//             <TableHead>
//               <TableRow>
//                 <TableCell>Date</TableCell>
//                 <TableCell>Invoice #</TableCell>
//                 <TableCell align="right">Amount</TableCell>
//                 <TableCell align="right">Actions</TableCell>
//               </TableRow>
//             </TableHead>
//             <TableBody>
//               {rows.map((r) => (
//                 <TableRow key={r.id} hover>
//                   <TableCell>{new Date(r.sale_date).toLocaleString()}</TableCell>
//                   <TableCell>{r.invoice_number}</TableCell>
//                   <TableCell align="right">{fmt(r.final_amount)}</TableCell>
//                   <TableCell align="right">
//                     <Tooltip title="Print invoice">
//                       <IconButton size="small" onClick={() => handlePrint(r.id)}>
//                         <PrintIcon />
//                       </IconButton>
//                     </Tooltip>
//                   </TableCell>
//                 </TableRow>
//               ))}
//             </TableBody>
//           </Table>
//         )}
//       </DialogContent>
//       <DialogActions>
//         <Button onClick={onClose}>Close</Button>
//       </DialogActions>
//     </Dialog>
//   );
// }
