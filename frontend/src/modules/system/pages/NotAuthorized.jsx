import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export default function NotAuthorized() {
  const navigate = useNavigate();
  return (
    <Box sx={{ p: 4, textAlign: 'center' }}>
      <Typography variant="h4" sx={{ mb: 2 }}>Not Authorized</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        You do not have permission to view this page.
      </Typography>
      <Button variant="contained" onClick={() => navigate(-1)}>Go Back</Button>
    </Box>
  );
}
