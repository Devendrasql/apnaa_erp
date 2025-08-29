import React from 'react';
import { NavLink } from 'react-router-dom';
import { Box, List, ListItemButton, ListItemText, Collapse } from '@mui/material';
import { ExpandLess, ExpandMore } from '@mui/icons-material';
import { useUi } from '@/contexts/UiContext';

function MenuNode({ node, level = 0 }) {
  const [open, setOpen] = React.useState(true);
  const hasChildren = node.children && node.children.length > 0;

  const paddingLeft = 2 + level * 2;

  if (hasChildren) {
    return (
      <>
        <ListItemButton onClick={() => setOpen((o) => !o)} sx={{ pl: paddingLeft }}>
          <ListItemText primary={node.label} />
          {open ? <ExpandLess /> : <ExpandMore />}
        </ListItemButton>
        <Collapse in={open} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {node.children.map((c) => (
              <MenuNode key={c.key} node={c} level={level + 1} />
            ))}
          </List>
        </Collapse>
      </>
    );
  }

  return (
    <NavLink
      to={node.path || '#'}
      style={{ textDecoration: 'none', color: 'inherit' }}
    >
      {({ isActive }) => (
        <ListItemButton selected={isActive} sx={{ pl: paddingLeft }}>
          <ListItemText primary={node.label} />
        </ListItemButton>
      )}
    </NavLink>
  );
}

export default function Sidebar() {
  const { menus } = useUi();

  return (
    <Box sx={{ width: 260, borderRight: '1px solid #eee', height: '100vh', overflowY: 'auto' }}>
      <List dense disablePadding>
        {menus.map((m) => (
          <MenuNode key={m.key} node={m} />
        ))}
      </List>
    </Box>
  );
}
