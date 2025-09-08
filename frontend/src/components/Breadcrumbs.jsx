import React from 'react';
import { Breadcrumbs as MUIBreadcrumbs, Link, Typography } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUi } from '@/contexts/UiContext';

export default function Breadcrumbs() {
  const { findTrailByPath } = useUi();
  const location = useLocation();
  const navigate = useNavigate();
  const trail = findTrailByPath(location.pathname) || [];

  if (!trail.length) return null;

  return (
    <MUIBreadcrumbs aria-label="breadcrumb" sx={{ my: 1 }}>
      {trail.map((node, idx) => {
        const isLast = idx === trail.length - 1;
        if (isLast) return <Typography key={node.key || node.path}>{node.label}</Typography>;
        return (
          <Link
            key={node.key || node.path}
            color="inherit"
            underline="hover"
            onClick={() => node.path && navigate(node.path)}
            sx={{ cursor: node.path ? 'pointer' : 'default' }}
          >
            {node.label}
          </Link>
        );
      })}
    </MUIBreadcrumbs>
  );
}

