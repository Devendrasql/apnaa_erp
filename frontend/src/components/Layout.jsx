// components/Layout.jsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Drawer, AppBar, Toolbar, List, Typography, Divider, ListItem,
  ListItemButton, ListItemIcon, ListItemText, IconButton, Menu, MenuItem,
  Avatar, Button, CssBaseline, ListSubheader, Tooltip, useMediaQuery
} from '@mui/material';
import { createTheme, ThemeProvider, alpha } from '@mui/material/styles';

import {
  Menu as MenuIcon,
  Dashboard,
  PointOfSale,
  People,
  Assessment,
  Logout,
  AccountCircle,
  Storefront,
  LocalShipping,
  ManageAccounts,
  Category,
  Payment,
  SwapHoriz as InventoryTwoTone,
  Settings,
  ExpandLess,
  ExpandMore,
  Business,
  ShoppingCartCheckout,
  ArrowDropDown,
  AdminPanelSettings,
  Inventory2 as ProductsIcon,
  Scale as UomIcon,
  Medication as DosageIcon,
  Storage as RackIcon,
  Percent as DiscountIcon,
  Brightness4,
  Brightness7,
  ShoppingCart
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// ----------------- Constants & Tokens -----------------
const TOKENS = {
  light: {
    primary: '#1a73e8',
    appbar:  '#1a73e8',
    appbarText: '#ffffff',
    bgDefault: '#f1f3f4',
    bgPaper:   '#ffffff',
    drawerBg:  '#ffffff',
    text:  '#202124',
    muted: '#5f6368',
    hover:    '#f1f3f4',
    selected: '#e8f0fe',
    border:   '#e0e3e7',
  },
  dark: {
    primary: '#8ab4f8',
    appbar:  '#1f2937',
    appbarText: '#e8eaed',
    bgDefault: '#13171c',
    bgPaper:   '#0f141a',
    drawerBg:  '#0f141a',
    text:  '#e8eaed',
    muted: '#9aa0a6',
    hover:    'rgba(255,255,255,0.06)',
    selected: 'rgba(138,180,248,0.18)',
    border:   'rgba(255,255,255,0.12)',
  },
};

const DRAWER_EXPANDED = 272;
const DRAWER_COLLAPSED = 72;

const STORAGE_KEYS = {
  theme: 'apnaaerp-theme-mode',
  collapsed: 'apnaaerp-drawer-collapsed',
  masters: 'apnaaerp-masters-open',
  pmasters: 'apnaaerp-product-masters-open',
};

// ----------------- Nav Definitions -----------------
const PRIMARY = [
  { key: 'dashboard', label: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
  { key: 'pos',       label: 'POS',       icon: <PointOfSale />, path: '/pos' },
  { key: 'sales',     label: 'Sales',     icon: <Assessment />, path: '/sales' },
  { key: 'purchases', label: 'Purchases', icon: <ShoppingCartCheckout />, path: '/purchases' },
  { key: 'payments',  label: 'Payments',  icon: <Payment />, path: '/payments' },
  { key: 'inventory', label: 'Inventory', icon: <ShoppingCart />, path: '/inventory' },
  { key: 'stock-transfers', label: 'Stock Transfers', icon: <InventoryTwoTone />, path: '/stock-transfers' },
  { key: 'reports',   label: 'Reports',   icon: <Assessment />, path: '/reports' },
];

const MASTERS = [
  { key: 'branches',   label: 'Branches',     icon: <Storefront />, path: '/branches' },
  { key: 'customers',  label: 'Customers',    icon: <People />,     path: '/customers' },
  { key: 'suppliers',  label: 'Suppliers',    icon: <LocalShipping />, path: '/suppliers' },
  { key: 'users',      label: 'Manage Users', icon: <ManageAccounts />, path: '/users' },
  { key: 'roles',      label: 'Manage Roles', icon: <AdminPanelSettings />, path: '/roles' },
  { key: 'settings',   label: 'Settings',     icon: <Settings />,   path: '/settings' },
];

const PRODUCT_MASTERS = [
  { key: 'products',       label: 'All Products',      icon: <ProductsIcon fontSize="small" />, path: '/products' },
  { key: 'categories',     label: 'Categories',        icon: <Category fontSize="small" />,     path: '/categories' },
  { key: 'manufacturers',  label: 'Manufacturers',     icon: <Storefront fontSize="small" />,   path: '/manufacturers' },
  { key: 'uom',            label: 'UOM',               icon: <UomIcon fontSize="small" />,      path: '/uom' },
  { key: 'dosage-forms',   label: 'Dosage Forms',      icon: <DosageIcon fontSize="small" />,   path: '/dosage-forms' },
  { key: 'racks',          label: 'Racks',             icon: <RackIcon fontSize="small" />,     path: '/racks' },
  { key: 'std-discounts',  label: 'Standard Discounts',icon: <DiscountIcon fontSize="small" />, path: '/std-discounts' },
];

// =====================================================

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, accessibleBranches, currentBranch, switchBranch } = useAuth();

  // ----------------- Menus -----------------
  const [userMenuEl, setUserMenuEl] = useState(null);
  const [branchMenuEl, setBranchMenuEl] = useState(null);

  // ----------------- Persisted UI States -----------------
  // theme
  const initialMode = () => {
    if (typeof window === 'undefined') return 'light';
    const saved = localStorage.getItem(STORAGE_KEYS.theme);
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };
  const [mode, setMode] = useState(initialMode);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.theme, mode); }, [mode]);
  const isDark = mode === 'dark';

  // drawer collapsed
  const initialCollapsed = () => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(STORAGE_KEYS.collapsed) === 'true';
  };
  const [navCollapsed, setNavCollapsed] = useState(initialCollapsed);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.collapsed, String(navCollapsed)); }, [navCollapsed]);

  // masters panels
  const initialMasters = () => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(STORAGE_KEYS.masters) === 'true';
  };
  const initialPMasters = () => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(STORAGE_KEYS.pmasters) === 'true';
  };
  const [mastersOpen, setMastersOpen] = useState(initialMasters);
  const [productMastersOpen, setProductMastersOpen] = useState(initialPMasters);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.masters, String(mastersOpen)); }, [mastersOpen]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.pmasters, String(productMastersOpen)); }, [productMastersOpen]);

  // ----------------- Theme -----------------
  const theme = useMemo(() => {
    const k = isDark ? TOKENS.dark : TOKENS.light;
    return createTheme({
      palette: {
        mode,
        primary: { main: k.primary },
        background: { default: k.bgDefault, paper: k.bgPaper },
        text: { primary: k.text, secondary: k.muted },
        divider: k.border,
      },
      shape: { borderRadius: 10 },
      components: {
        MuiCssBaseline: { styleOverrides: { body: { backgroundColor: k.bgDefault } } },
        MuiAppBar: { styleOverrides: { root: { backgroundColor: k.appbar, color: k.appbarText, backgroundImage: 'none' } } },
        MuiDrawer: { styleOverrides: { paper: { backgroundColor: k.drawerBg } } },
        // Compact density
        MuiListItem: { styleOverrides: { root: { paddingTop: 4, paddingBottom: 4 } } },
        MuiListItemIcon: { styleOverrides: { root: { minWidth: 32 } } },
        MuiListItemButton: {
          defaultProps: { dense: true },
          styleOverrides: { root: { borderRadius: 8, minHeight: 36, paddingTop: 6, paddingBottom: 6 } },
        },
        MuiMenuItem: { defaultProps: { dense: true } },
        MuiButton: { defaultProps: { size: 'small' } },
        MuiIconButton: { defaultProps: { size: 'small' } },
      },
      typography: {
        fontFamily: `"Inter","Roboto","Helvetica Neue",Arial,"Noto Sans",sans-serif`,
        h6: { fontWeight: 700, letterSpacing: 0.2 },
      },
    });
  }, [mode, isDark]);
  const k = isDark ? TOKENS.dark : TOKENS.light;

  // ----------------- Responsive -----------------
  const isDesktop = useMediaQuery(theme.breakpoints.up('sm'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const navWidth = isDesktop ? (navCollapsed ? DRAWER_COLLAPSED : DRAWER_EXPANDED) : 0;

  // ----------------- Auto-open by route (only opens; never forces close) -----------------
  useEffect(() => {
    const p = location.pathname;
    const inMasters = [
      '/branches','/customers','/suppliers','/users','/roles','/settings',
      '/products','/categories','/manufacturers','/uom','/dosage-forms','/racks','/std-discounts'
    ].some((x) => p.startsWith(x));
    const inPM = [
      '/products','/categories','/manufacturers','/uom','/dosage-forms','/racks','/std-discounts'
    ].some((x) => p.startsWith(x));

    if (inMasters && !mastersOpen) setMastersOpen(true);
    if (inPM && !productMastersOpen) setProductMastersOpen(true);
    // keep user choice otherwise
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // ----------------- Helpers -----------------
  const isActive = (path) => location.pathname.startsWith(path);

  const navItemSx = (active) => (th) => ({
    mx: navCollapsed ? 0.5 : 1,
    my: 0.25,
    px: navCollapsed ? 0.75 : 1.25,
    borderRadius: 1,
    minHeight: 34,
    '& .MuiListItemIcon-root': {
      color: active ? th.palette.primary.main : k.muted,
      minWidth: 32,
      justifyContent: 'center',
    },
    color: k.text,
    ...(active
      ? { backgroundColor: k.selected, '&:hover': { backgroundColor: k.selected } }
      : { '&:hover': { backgroundColor: k.hover } }),
    transition: 'background-color .12s ease, padding .12s ease, margin .12s ease',
  });

  const labelSx = {
    opacity: navCollapsed ? 0 : 1,
    width: navCollapsed ? 0 : 'auto',
    ml: navCollapsed ? 0 : 0.5,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    transition: 'opacity .12s ease, width .12s ease, margin .12s ease',
  };

  const subheadSx = {
    px: navCollapsed ? 0 : 2,
    py: navCollapsed ? 0.5 : 1,
    lineHeight: 1,
    color: k.muted,
    fontWeight: 700,
    letterSpacing: 0.5,
    display: navCollapsed ? 'none' : 'block',
  };

  // ----------------- Title -----------------
  const pageTitle =
    [
      ['/dashboard', 'Dashboard'],
      ['/pos', 'POS'],
      ['/sales', 'Sales'],
      ['/purchases', 'Purchases'],
      ['/purchase-orders', 'Purchase Orders'],
      ['/inventory', 'Inventory'],
      ['/stock-transfers', 'Stock Transfers'],
      ['/payments', 'Payments'],
      ['/reports', 'Reports'],
      ['/branches', 'Branches'],
      ['/products', 'Products'],
      ['/categories', 'Categories'],
      ['/customers', 'Customers'],
      ['/suppliers', 'Suppliers'],
      ['/users', 'Manage Users'],
      ['/roles', 'Manage Roles'],
      ['/settings', 'Settings'],
      ['/brands', 'Brands'],
      ['/uom', 'UOM'],
      ['/dosage-forms', 'Dosage Forms'],
      ['/racks', 'Racks'],
      ['/std-discounts', 'Standard Discounts'],
      ['/manufacturers', 'Manufacturers'],
    ].find(([p]) => isActive(p))?.[1] || 'Dashboard';

  // ----------------- Handlers -----------------
  const handleUserMenuOpen   = (e) => setUserMenuEl(e.currentTarget);
  const handleUserMenuClose  = () => setUserMenuEl(null);
  const handleLogout         = () => { logout(); handleUserMenuClose(); navigate('/login'); };
  const handleProfile        = () => { navigate('/profile'); handleUserMenuClose(); };
  const handleBranchMenuOpen = (e) => setBranchMenuEl(e.currentTarget);
  const handleBranchMenuClose= () => setBranchMenuEl(null);
  const handleBranchSelect   = (b) => { switchBranch(b); handleBranchMenuClose(); };

  const toggleDrawerCollapsed = () => setNavCollapsed((v) => !v);
  const openMobileDrawer = () => setMobileOpen(true);
  const closeMobileDrawer = () => setMobileOpen(false);

  const onMastersToggle = () => { if (navCollapsed) setNavCollapsed(false); setMastersOpen((v) => !v); };
  const onPMToggle      = () => { if (navCollapsed) setNavCollapsed(false); setProductMastersOpen((v) => !v); };



  // Keyboard Shortcuts: G,M,P,D and quick nav: 1(dashboard), 2(pos), 3(purchases)
useEffect(() => {
  const onKey = (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = (e.target && e.target.tagName) || '';
    if (['INPUT','TEXTAREA','SELECT'].includes(tag) || e.isComposing) return;

    const k = e.key.toLowerCase();

    // ---- Quick navigation (numbers) ----
    if (k === '1') { // Dashboard
      navigate('/dashboard');
      if (!isDesktop) setMobileOpen(false);
      e.preventDefault();
      return;
    }
    if (k === '2') { // POS
      navigate('/pos');
      if (!isDesktop) setMobileOpen(false);
      e.preventDefault();
      return;
    }
    if (k === '3') { // Purchases
      navigate('/purchases');
      if (!isDesktop) setMobileOpen(false);
      e.preventDefault();
      return;
    }

    // ---- Layout / theme toggles ----
    if (k === 'g') {                         // collapse/expand drawer
      if (isDesktop) {
        setNavCollapsed((prev) => {
          const next = !prev;
          localStorage.setItem('apnaaerp-drawer-collapsed', String(next));
          return next;
        });
      } else {
        setMobileOpen((prev) => !prev);
      }
      return;
    }

    if (k === 'm') {                         // Masters
      if (navCollapsed) setNavCollapsed(false);
      setMastersOpen((prev) => {
        const next = !prev;
        localStorage.setItem('apnaaerp-masters-open', String(next));
        return next;
      });
      return;
    }

    if (k === 'p') {                         // Product Masters
      if (navCollapsed) setNavCollapsed(false);
      setProductMastersOpen((prev) => {
        const next = !prev;
        localStorage.setItem('apnaaerp-product-masters-open', String(next));
        return next;
      });
      return;
    }

    if (k === 'd') {                         // Dark mode
      setMode((prev) => {
        const next = prev === 'dark' ? 'light' : 'dark';
        localStorage.setItem('apnaaerp-theme-mode', next);
        return next;
      });
    }
  };

  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}, [isDesktop, navCollapsed, navigate]);

  // // ----------------- Keyboard Shortcuts -----------------
  // useEffect(() => {
  //   const onKey = (e) => {
  //     if (e.metaKey || e.ctrlKey || e.altKey) return;
  //     const tag = (e.target && e.target.tagName) || '';
  //     if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;

  //     const k = e.key.toLowerCase();
  //     if (k === 'g') {
  //       if (isDesktop) {
  //         setNavCollapsed((prev) => {
  //           const next = !prev;
  //           localStorage.setItem(STORAGE_KEYS.collapsed, String(next));
  //           return next;
  //         });
  //       } else {
  //         setMobileOpen((prev) => !prev);
  //       }
  //     } else if (k === 'm') {
  //       if (navCollapsed) setNavCollapsed(false);
  //       setMastersOpen((prev) => {
  //         const next = !prev;
  //         localStorage.setItem(STORAGE_KEYS.masters, String(next));
  //         return next;
  //       });
  //     } else if (k === 'p') {
  //       if (navCollapsed) setNavCollapsed(false);
  //       setProductMastersOpen((prev) => {
  //         const next = !prev;
  //         localStorage.setItem(STORAGE_KEYS.pmasters, String(next));
  //         return next;
  //       });
  //     } else if (k === 'd') {
  //       setMode((prev) => {
  //         const next = prev === 'dark' ? 'light' : 'dark';
  //         localStorage.setItem(STORAGE_KEYS.theme, next);
  //         return next;
  //       });
  //     }
  //   };
  //   window.addEventListener('keydown', onKey);
  //   return () => window.removeEventListener('keydown', onKey);
  // }, [isDesktop, navCollapsed]);

  // ----------------- Drawer Content (Hamburger lives here) -----------------
  const DrawerContent = (
    <Box sx={{ height: '100%', bgcolor: k.drawerBg, display: 'flex', flexDirection: 'column' }}>
      <Toolbar sx={{ px: navCollapsed ? 1 : 2, gap: 1 }}>
        <Tooltip title={navCollapsed ? 'Expand menu' : 'Collapse menu'} placement="right">
          <IconButton size="small" onClick={toggleDrawerCollapsed}>
            <MenuIcon />
          </IconButton>
        </Tooltip>
        <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 800, color: k.text, ...labelSx }}>
          Apnaa-ERP
        </Typography>
      </Toolbar>
      <Divider sx={{ borderColor: k.border }} />

      <List dense subheader={<ListSubheader disableSticky sx={subheadSx}>MAIN</ListSubheader>} sx={{ pt: 0.5 }}>
        {PRIMARY.map((it) => {
          const node = (
            <ListItemButton
              sx={navItemSx(isActive(it.path))}
              selected={isActive(it.path)}
              onClick={() => {
                navigate(it.path);
                if (!isDesktop) closeMobileDrawer();
              }}
            >
              <ListItemIcon>{it.icon}</ListItemIcon>
              <ListItemText primary={it.label} sx={labelSx} />
            </ListItemButton>
          );
          return (
            <ListItem key={it.key} disablePadding>
              {navCollapsed ? <Tooltip title={it.label} placement="right">{node}</Tooltip> : node}
            </ListItem>
          );
        })}
      </List>

      <List subheader={<ListSubheader disableSticky sx={subheadSx}>MASTERS</ListSubheader>} sx={{ pt: 0 }}>
        <ListItem disablePadding>
          {navCollapsed ? (
            <Tooltip title="Masters" placement="right">
              <ListItemButton sx={navItemSx(mastersOpen)} onClick={onMastersToggle}>
                <ListItemIcon><Business /></ListItemIcon>
                <ListItemText primary="Masters" sx={labelSx} />
              </ListItemButton>
            </Tooltip>
          ) : (
            <ListItemButton sx={navItemSx(mastersOpen)} onClick={onMastersToggle}>
              <ListItemIcon><Business /></ListItemIcon>
              <ListItemText primary="Masters" sx={labelSx} />
              {!navCollapsed && (mastersOpen ? <ExpandLess /> : <ExpandMore />)}
            </ListItemButton>
          )}
        </ListItem>

        {mastersOpen && (
          <List dense disablePadding sx={{ mt: 0.25 }}>
            {MASTERS.map((row) => {
              const node = (
                <ListItemButton
                  sx={navItemSx(isActive(row.path))}
                  selected={isActive(row.path)}
                  onClick={() => navigate(row.path)}
                >
                  <ListItemIcon>
                    <Box sx={{ color: isActive(row.path) ? theme.palette.primary.main : k.muted }}>
                      {row.icon}
                    </Box>
                  </ListItemIcon>
                  <ListItemText primary={row.label} sx={labelSx} />
                </ListItemButton>
              );
              return (
                <ListItem key={row.key} disablePadding>
                  {navCollapsed ? <Tooltip title={row.label} placement="right">{node}</Tooltip> : node}
                </ListItem>
              );
            })}

            {/* Product Masters */}
            <ListItem disablePadding>
              {navCollapsed ? (
                <Tooltip title="Product Masters" placement="right">
                  <ListItemButton sx={navItemSx(productMastersOpen)} onClick={onPMToggle}>
                    <ListItemIcon><ProductsIcon /></ListItemIcon>
                    <ListItemText primary="Product Masters" sx={labelSx} />
                  </ListItemButton>
                </Tooltip>
              ) : (
                <ListItemButton sx={navItemSx(productMastersOpen)} onClick={onPMToggle}>
                  <ListItemIcon><ProductsIcon /></ListItemIcon>
                  <ListItemText primary="Product Masters" sx={labelSx} />
                  {!navCollapsed && (productMastersOpen ? <ExpandLess /> : <ExpandMore />)}
                </ListItemButton>
              )}
            </ListItem>

            {productMastersOpen && (
              <List dense disablePadding sx={{ mt: 0.25 }}>
                {PRODUCT_MASTERS.map((row) => {
                  const node = (
                    <ListItemButton
                      sx={navItemSx(isActive(row.path))}
                      selected={isActive(row.path)}
                      onClick={() => navigate(row.path)}
                    >
                      <ListItemIcon>
                        <Box sx={{ color: isActive(row.path) ? theme.palette.primary.main : k.muted }}>
                          {row.icon}
                        </Box>
                      </ListItemIcon>
                      <ListItemText primary={row.label} sx={labelSx} />
                    </ListItemButton>
                  );
                  return (
                    <ListItem key={row.key} disablePadding>
                      {navCollapsed ? <Tooltip title={row.label} placement="right">{node}</Tooltip> : node}
                    </ListItem>
                  );
                })}
              </List>
            )}
          </List>
        )}
      </List>
    </Box>
  );

  // ----------------- Render -----------------
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex' }}>
        {/* AppBar (no hamburger here) */}
        <AppBar
          position="fixed"
          elevation={1}
          sx={{
            width: { sm: `calc(100% - ${navWidth}px)` },
            ml:   { sm: `${navWidth}px` },
            color: TOKENS[mode].appbarText,
            bgcolor: TOKENS[mode].appbar,
            transition: (th) => th.transitions.create(['width','margin'], { duration: th.transitions.duration.shorter }),
          }}
        >
          <Toolbar>
            {/* Mobile-only button to open the drawer (since hamburger is inside drawer header) */}
            <Box sx={{ display: { xs: 'block', sm: 'none' }, mr: 1 }}>
              <IconButton color="inherit" edge="start" onClick={openMobileDrawer}>
                <MenuIcon />
              </IconButton>
            </Box>

            <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
              {pageTitle}{currentBranch ? ` (${currentBranch.name})` : ''}
            </Typography>

            {accessibleBranches && accessibleBranches.length > 1 && (
              <>
                <Button
                  color="inherit"
                  onClick={handleBranchMenuOpen}
                  endIcon={<ArrowDropDown />}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    mr: 1,
                    bgcolor: alpha('#fff', 0.12),
                    '&:hover': { bgcolor: alpha('#fff', 0.2) },
                  }}
                >
                  {currentBranch ? currentBranch.name : 'Select Branch'}
                </Button>
                <Menu anchorEl={branchMenuEl} open={Boolean(branchMenuEl)} onClose={handleBranchMenuClose}>
                  {accessibleBranches.map((b) => (
                    <MenuItem key={b.id} onClick={() => handleBranchSelect(b)} selected={currentBranch?.id === b.id}>
                      {b.name}
                    </MenuItem>
                  ))}
                </Menu>
              </>
            )}

            <IconButton color="inherit" onClick={() => setMode(isDark ? 'light' : 'dark')} sx={{ mr: 1 }}>
              {isDark ? <Brightness7 /> : <Brightness4 />}
            </IconButton>

            <IconButton size="large" onClick={handleUserMenuOpen} color="inherit">
              <Avatar sx={{ width: 32, height: 32, bgcolor: alpha('#ffffff', 0.2), color: '#fff' }}>
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </Avatar>
            </IconButton>
            <Menu anchorEl={userMenuEl} open={Boolean(userMenuEl)} onClose={handleUserMenuClose}>
              <MenuItem onClick={handleProfile}><AccountCircle sx={{ mr: 2 }} />Profile</MenuItem>
              <MenuItem onClick={handleLogout}><Logout sx={{ mr: 2 }} />Logout</MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>

        {/* Drawer */}
        <Box component="nav" sx={{ width: { sm: navWidth }, flexShrink: { sm: 0 } }}>
          {/* Mobile temporary */}
          {!isDesktop && (
            <Drawer
              variant="temporary"
              open={mobileOpen}
              onClose={closeMobileDrawer}
              ModalProps={{ keepMounted: true }}
              PaperProps={{
                sx: {
                  boxSizing: 'border-box',
                  width: DRAWER_EXPANDED,
                  bgcolor: k.drawerBg,
                  borderRight: `1px solid ${k.border}`,
                },
              }}
            >
              {DrawerContent}
            </Drawer>
          )}

          {/* Desktop permanent (mini) */}
          {isDesktop && (
            <Drawer
              variant="permanent"
              open
              PaperProps={{
                sx: {
                  boxSizing: 'border-box',
                  overflowX: 'hidden',
                  width: navCollapsed ? DRAWER_COLLAPSED : DRAWER_EXPANDED,
                  transition: (th) => th.transitions.create('width', { duration: th.transitions.duration.shorter }),
                  bgcolor: k.drawerBg,
                  borderRight: `1px solid ${k.border}`,
                  boxShadow: 'none',
                },
              }}
            >
              {DrawerContent}
            </Drawer>
          )}
        </Box>

        {/* Main content (no width/margin calc; flex handles layout, so no gap) */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            flexBasis: 0,
            pt: 3,
            pr: 0.5,
            pb: 3,
            pl: 0.5,
            minHeight: '100vh',
            bgcolor: TOKENS[mode].bgDefault,
            transition: (th) =>
              th.transitions.create(['width','margin'], { duration: th.transitions.duration.shorter }),
          }}
        >
          {/* Spacer under AppBar without side gutters */}
          <Box sx={{ height: { xs: 56, sm: 64 } }} />
          {children}
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default Layout;





























// // components/Layout.jsx
// import React, { useEffect, useMemo, useState } from 'react';
// import {
//   Box, Drawer, AppBar, Toolbar, List, Typography, Divider, ListItem,
//   ListItemButton, ListItemIcon, ListItemText, IconButton, Menu, MenuItem,
//   Avatar, Button, CssBaseline, ListSubheader, Tooltip, useMediaQuery
// } from '@mui/material';
// import { createTheme, ThemeProvider, alpha } from '@mui/material/styles';

// import {
//   Menu as MenuIcon,
//   Dashboard,
//   PointOfSale,
//   People,
//   Assessment,
//   Logout,
//   AccountCircle,
//   Storefront,
//   LocalShipping,
//   ManageAccounts,
//   Category,
//   Payment,
//   SwapHoriz as InventoryTwoTone,
//   Settings,
//   ExpandLess,
//   ExpandMore,
//   Business,
//   ShoppingCartCheckout,
//   ArrowDropDown,
//   AdminPanelSettings,
//   Inventory2 as ProductsIcon,
//   Scale as UomIcon,
//   Medication as DosageIcon,
//   Storage as RackIcon,
//   Percent as DiscountIcon,
//   Brightness4,
//   Brightness7,
//   ShoppingCart
// } from '@mui/icons-material';
// import { useNavigate, useLocation } from 'react-router-dom';
// import { useAuth } from '../contexts/AuthContext';

// // Gmail-like palette
// const TOKENS = {
//   light: {
//     primary: '#1a73e8',
//     appbar: '#1a73e8',
//     appbarText: '#ffffff',
//     bgDefault: '#f1f3f4',
//     bgPaper: '#ffffff',
//     drawerBg: '#ffffff',
//     text: '#202124',
//     muted: '#5f6368',
//     hover: '#f1f3f4',
//     selected: '#e8f0fe',
//     border: '#e0e3e7',
//   },
//   dark: {
//     primary: '#8ab4f8',
//     appbar: '#1f2937',
//     appbarText: '#e8eaed',
//     bgDefault: '#13171c',
//     bgPaper: '#0f141a',
//     drawerBg: '#0f141a',
//     text: '#e8eaed',
//     muted: '#9aa0a6',
//     hover: 'rgba(255,255,255,0.06)',
//     selected: 'rgba(138,180,248,0.18)',
//     border: 'rgba(255,255,255,0.12)',
//   },
// };

// const DRAWER_EXPANDED = 272;
// const DRAWER_COLLAPSED = 72;

// // NAV
// const PRIMARY = [
//   { key: 'dashboard', label: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
//   { key: 'pos', label: 'POS', icon: <PointOfSale />, path: '/pos' },
//   { key: 'sales', label: 'Sales', icon: <Assessment />, path: '/sales' },
//   { key: 'purchases', label: 'Purchases', icon: <ShoppingCartCheckout />, path: '/purchases' },
//   { key: 'payments', label: 'Payments', icon: <Payment />, path: '/payments' },
//   { key: 'inventory', label: 'Inventory', icon: <ShoppingCart />, path: '/inventory' },
//   { key: 'stock-transfers', label: 'Stock Transfers', icon: <InventoryTwoTone />, path: '/stock-transfers' },
//   { key: 'reports', label: 'Reports', icon: <Assessment />, path: '/reports' },
// ];

// const MASTERS = [
//   { key: 'branches', label: 'Branches', icon: <Storefront />, path: '/branches' },
//   { key: 'customers', label: 'Customers', icon: <People />, path: '/customers' },
//   { key: 'suppliers', label: 'Suppliers', icon: <LocalShipping />, path: '/suppliers' },
//   { key: 'users', label: 'Manage Users', icon: <ManageAccounts />, path: '/users' },
//   { key: 'roles', label: 'Manage Roles', icon: <AdminPanelSettings />, path: '/roles' },
//   { key: 'settings', label: 'Settings', icon: <Settings />, path: '/settings' },
// ];

// const PRODUCT_MASTERS = [
//   { key: 'products', label: 'All Products', icon: <ProductsIcon fontSize="small" />, path: '/products' },
//   { key: 'categories', label: 'Categories', icon: <Category fontSize="small" />, path: '/categories' },
//   { key: 'manufacturers', label: 'Manufacturers', icon: <Storefront fontSize="small" />, path: '/manufacturers' },
//   { key: 'uom', label: 'UOM', icon: <UomIcon fontSize="small" />, path: '/uom' },
//   { key: 'dosage-forms', label: 'Dosage Forms', icon: <DosageIcon fontSize="small" />, path: '/dosage-forms' },
//   { key: 'racks', label: 'Racks', icon: <RackIcon fontSize="small" />, path: '/racks' },
//   { key: 'std-discounts', label: 'Standard Discounts', icon: <DiscountIcon fontSize="small" />, path: '/std-discounts' },
// ];

// const Layout = ({ children }) => {
//   const navigate = useNavigate();
//   const location = useLocation();
//   const { user, logout, accessibleBranches, currentBranch, switchBranch } = useAuth();

//   // user / branch menus
//   const [userMenuEl, setUserMenuEl] = useState(null);
//   const [branchMenuEl, setBranchMenuEl] = useState(null);

//   // collapses
//   const [mastersOpen, setMastersOpen] = useState(false);
//   const [productMastersOpen, setProductMastersOpen] = useState(false);

//   // dark mode persistence
//   const initialMode = () => {
//     const saved = typeof window !== 'undefined' ? localStorage.getItem('apnaaerp-theme-mode') : null;
//     if (saved === 'dark' || saved === 'light') return saved;
//     if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
//     return 'light';
//   };
//   const [mode, setMode] = useState(initialMode);
//   useEffect(() => { localStorage.setItem('apnaaerp-theme-mode', mode); }, [mode]);
//   const isDark = mode === 'dark';

//   // theme
//   const theme = useMemo(() => {
//     const k = isDark ? TOKENS.dark : TOKENS.light;
//     return createTheme({
//       palette: {
//         mode,
//         primary: { main: k.primary },
//         background: { default: k.bgDefault, paper: k.bgPaper },
//         text: { primary: k.text, secondary: k.muted },
//         divider: k.border,
//       },
//       shape: { borderRadius: 10 },
//       components: {
//         MuiCssBaseline: { styleOverrides: { body: { backgroundColor: k.bgDefault } } },
//         MuiAppBar: { styleOverrides: { root: { backgroundColor: k.appbar, color: k.appbarText, backgroundImage: 'none' } } },
//         MuiDrawer: { styleOverrides: { paper: { backgroundColor: k.drawerBg } } },
//         MuiListItemButton: { styleOverrides: { root: { borderRadius: 8 } } },
//       },
//       typography: {
//         fontFamily: `"Inter","Roboto","Helvetica Neue",Arial,"Noto Sans",sans-serif`,
//         h6: { fontWeight: 700, letterSpacing: 0.2 },
//       },
//     });
//   }, [mode, isDark]);
//   const k = isDark ? TOKENS.dark : TOKENS.light;

//   // responsive + mini variant
//   const isDesktop = useMediaQuery(theme.breakpoints.up('sm'));

//   // drawer collapsed persistence
//   const initialCollapsed = () => {
//     const saved = typeof window !== 'undefined' ? localStorage.getItem('apnaaerp-drawer-collapsed') : null;
//     return saved === 'true'; // default expanded if null
//   };
//   const [navCollapsed, setNavCollapsed] = useState(initialCollapsed);
//   useEffect(() => {
//     localStorage.setItem('apnaaerp-drawer-collapsed', String(navCollapsed));
//   }, [navCollapsed]);

//   // mobile drawer (overlay)
//   const [mobileOpen, setMobileOpen] = useState(false);
//   const navWidth = isDesktop ? (navCollapsed ? DRAWER_COLLAPSED : DRAWER_EXPANDED) : 0;

//   // auto open sections for current route
//   useEffect(() => {
//     const p = location.pathname;
//     const inMasters = ['/branches', '/customers', '/suppliers', '/users', '/roles', '/settings',
//       '/products', '/categories', '/manufacturers', '/uom', '/dosage-forms', '/racks', '/std-discounts']
//       .some((x) => p.startsWith(x));
//     const inPM = ['/products', '/categories', '/manufacturers', '/uom', '/dosage-forms', '/racks', '/std-discounts']
//       .some((x) => p.startsWith(x));
//     setMastersOpen(inMasters);
//     setProductMastersOpen(inPM);
//   }, [location.pathname]);

//   // helpers
//   const isActive = (path) => location.pathname.startsWith(path);

//   const navItemSx = (active) => (th) => ({
//     mx: navCollapsed ? 0.5 : 1,
//     my: 0.25,
//     px: navCollapsed ? 0.75 : 1.25,
//     borderRadius: 1,
//     minHeight: 40,
//     '& .MuiListItemIcon-root': {
//       color: active ? th.palette.primary.main : k.muted,
//       minWidth: 36,
//       justifyContent: 'center',
//     },
//     color: k.text,
//     ...(active
//       ? { backgroundColor: k.selected, '&:hover': { backgroundColor: k.selected } }
//       : { '&:hover': { backgroundColor: k.hover } }),
//     transition: 'background-color .12s ease, padding .12s ease, margin .12s ease',
//   });

//   const labelSx = {
//     opacity: navCollapsed ? 0 : 1,
//     width: navCollapsed ? 0 : 'auto',
//     ml: navCollapsed ? 0 : 0.5,
//     whiteSpace: 'nowrap',
//     overflow: 'hidden',
//     transition: 'opacity .12s ease, width .12s ease, margin .12s ease',
//   };

//   const subheadSx = {
//     px: navCollapsed ? 0 : 2,
//     py: navCollapsed ? 0.5 : 1,
//     lineHeight: 1,
//     color: k.muted,
//     fontWeight: 700,
//     letterSpacing: 0.5,
//     display: navCollapsed ? 'none' : 'block', // hide section headers when collapsed
//   };

//   // TITLE
//   const pageTitle =
//     [
//       ['/dashboard', 'Dashboard'],
//       ['/pos', 'POS'],
//       ['/sales', 'Sales'],
//       ['/purchases', 'Purchases'],
//       ['/purchase-orders', 'Purchase Orders'],
//       ['/inventory', 'Inventory'],
//       ['/stock-transfers', 'Stock Transfers'],
//       ['/payments', 'Payments'],
//       ['/reports', 'Reports'],
//       ['/branches', 'Branches'],
//       ['/products', 'Products'],
//       ['/categories', 'Categories'],
//       ['/customers', 'Customers'],
//       ['/suppliers', 'Suppliers'],
//       ['/users', 'Manage Users'],
//       ['/roles', 'Manage Roles'],
//       ['/settings', 'Settings'],
//       ['/brands', 'Brands'],
//       ['/uom', 'UOM'],
//       ['/dosage-forms', 'Dosage Forms'],
//       ['/racks', 'Racks'],
//       ['/std-discounts', 'Standard Discounts'],
//       ['/manufacturers', 'Manufacturers'],
//     ].find(([p]) => isActive(p))?.[1] || 'Dashboard';

//   // handlers
//   const handleUserMenuOpen = (e) => setUserMenuEl(e.currentTarget);
//   const handleUserMenuClose = () => setUserMenuEl(null);
//   const handleLogout = () => { logout(); handleUserMenuClose(); navigate('/login'); };
//   const handleProfile = () => { navigate('/profile'); handleUserMenuClose(); };
//   const handleBranchMenuOpen = (e) => setBranchMenuEl(e.currentTarget);
//   const handleBranchMenuClose = () => setBranchMenuEl(null);
//   const handleBranchSelect = (b) => { switchBranch(b); handleBranchMenuClose(); };

//   const toggleDrawerCollapsed = () => setNavCollapsed((v) => !v);
//   const openMobileDrawer = () => setMobileOpen(true);
//   const closeMobileDrawer = () => setMobileOpen(false);

//   const onMastersToggle = () => { if (navCollapsed) setNavCollapsed(false); setMastersOpen((v) => !v); };
//   const onPMToggle = () => { if (navCollapsed) setNavCollapsed(false); setProductMastersOpen((v) => !v); };

//   // Drawer content — HAMBURGER LIVES HERE (menu bar), not in AppBar
//   const DrawerContent = (
//     <Box sx={{ height: '100%', bgcolor: k.drawerBg, display: 'flex', flexDirection: 'column' }}>
//       <Toolbar sx={{ px: navCollapsed ? 1 : 2, gap: 1 }}>
//         <Tooltip title={navCollapsed ? 'Expand menu' : 'Collapse menu'} placement="right">
//           <IconButton size="small" onClick={toggleDrawerCollapsed}>
//             <MenuIcon />
//           </IconButton>
//         </Tooltip>
//         <Typography
//           variant="h6"
//           noWrap
//           component="div"
//           sx={{ fontWeight: 800, color: k.text, ...labelSx }}
//         >
//           Apnaa-ERP
//         </Typography>
//       </Toolbar>
//       <Divider sx={{ borderColor: k.border }} />

//       {/* MAIN */}
//       <List subheader={<ListSubheader disableSticky sx={subheadSx}>MAIN</ListSubheader>} sx={{ pt: 0.5 }}>
//         {PRIMARY.map((it) => {
//           const node = (
//             <ListItemButton
//               sx={navItemSx(isActive(it.path))}
//               selected={isActive(it.path)}
//               onClick={() => {
//                 navigate(it.path);
//                 if (!isDesktop) closeMobileDrawer();
//               }}
//             >
//               <ListItemIcon>{it.icon}</ListItemIcon>
//               <ListItemText primary={it.label} sx={labelSx} />
//             </ListItemButton>
//           );
//           return (
//             <ListItem key={it.key} disablePadding>
//               {navCollapsed ? <Tooltip title={it.label} placement="right">{node}</Tooltip> : node}
//             </ListItem>
//           );
//         })}
//       </List>

//       {/* MASTERS */}
//       <List subheader={<ListSubheader disableSticky sx={subheadSx}>MASTERS</ListSubheader>} sx={{ pt: 0 }}>
//         <ListItem disablePadding>
//           {navCollapsed ? (
//             <Tooltip title="Masters" placement="right">
//               <ListItemButton sx={navItemSx(mastersOpen)} onClick={onMastersToggle}>
//                 <ListItemIcon><Business /></ListItemIcon>
//                 <ListItemText primary="Masters" sx={labelSx} />
//               </ListItemButton>
//             </Tooltip>
//           ) : (
//             <ListItemButton sx={navItemSx(mastersOpen)} onClick={onMastersToggle}>
//               <ListItemIcon><Business /></ListItemIcon>
//               <ListItemText primary="Masters" sx={labelSx} />
//               {!navCollapsed && (mastersOpen ? <ExpandLess /> : <ExpandMore />)}
//             </ListItemButton>
//           )}
//         </ListItem>

//         {/* Children flush (no hierarchy gap) */}
//         {mastersOpen && (
//           <List dense disablePadding sx={{ mt: 0.25 }}>
//             {MASTERS.map((row) => {
//               const node = (
//                 <ListItemButton
//                   sx={navItemSx(isActive(row.path))}
//                   selected={isActive(row.path)}
//                   onClick={() => navigate(row.path)}
//                 >
//                   <ListItemIcon>
//                     <Box sx={{ color: isActive(row.path) ? theme.palette.primary.main : k.muted }}>
//                       {row.icon}
//                     </Box>
//                   </ListItemIcon>
//                   <ListItemText primary={row.label} sx={labelSx} />
//                 </ListItemButton>
//               );
//               return (
//                 <ListItem key={row.key} disablePadding>
//                   {navCollapsed ? <Tooltip title={row.label} placement="right">{node}</Tooltip> : node}
//                 </ListItem>
//               );
//             })}

//             {/* Product Masters */}
//             <ListItem disablePadding>
//               {navCollapsed ? (
//                 <Tooltip title="Product Masters" placement="right">
//                   <ListItemButton sx={navItemSx(productMastersOpen)} onClick={onPMToggle}>
//                     <ListItemIcon><ProductsIcon /></ListItemIcon>
//                     <ListItemText primary="Product Masters" sx={labelSx} />
//                   </ListItemButton>
//                 </Tooltip>
//               ) : (
//                 <ListItemButton sx={navItemSx(productMastersOpen)} onClick={onPMToggle}>
//                   <ListItemIcon><ProductsIcon /></ListItemIcon>
//                   <ListItemText primary="Product Masters" sx={labelSx} />
//                   {!navCollapsed && (productMastersOpen ? <ExpandLess /> : <ExpandMore />)}
//                 </ListItemButton>
//               )}
//             </ListItem>

//             {productMastersOpen && (
//               <List dense disablePadding sx={{ mt: 0.25 }}>
//                 {PRODUCT_MASTERS.map((row) => {
//                   const node = (
//                     <ListItemButton
//                       sx={navItemSx(isActive(row.path))}
//                       selected={isActive(row.path)}
//                       onClick={() => navigate(row.path)}
//                     >
//                       <ListItemIcon>
//                         <Box sx={{ color: isActive(row.path) ? theme.palette.primary.main : k.muted }}>
//                           {row.icon}
//                         </Box>
//                       </ListItemIcon>
//                       <ListItemText primary={row.label} sx={labelSx} />
//                     </ListItemButton>
//                   );
//                   return (
//                     <ListItem key={row.key} disablePadding>
//                       {navCollapsed ? <Tooltip title={row.label} placement="right">{node}</Tooltip> : node}
//                     </ListItem>
//                   );
//                 })}
//               </List>
//             )}
//           </List>
//         )}
//       </List>
//     </Box>
//   );

//   return (
//     <ThemeProvider theme={theme}>
//       <CssBaseline />
//       <Box sx={{ display: 'flex' }}>
//         {/* AppBar — NO hamburger here (you asked for the single burger on the menu bar) */}
//         <AppBar
//           position="fixed"
//           elevation={1}
//           sx={{
//             width: { sm: `calc(100% - ${isDesktop ? (navCollapsed ? DRAWER_COLLAPSED : DRAWER_EXPANDED) : 0}px)` },
//             ml: { sm: `${isDesktop ? (navCollapsed ? DRAWER_COLLAPSED : DRAWER_EXPANDED) : 0}px` },
//             color: TOKENS[mode].appbarText,
//             bgcolor: TOKENS[mode].appbar,
//             transition: (th) => th.transitions.create(['width', 'margin'], { duration: th.transitions.duration.shorter }),
//           }}
//         >
//           <Toolbar>
//             {/* Mobile-only: small “open menu” button (since hamburger lives inside the drawer) */}
//             <Box sx={{ display: { xs: 'block', sm: 'none' }, mr: 1 }}>
//               <IconButton color="inherit" edge="start" onClick={openMobileDrawer}>
//                 <MenuIcon />
//               </IconButton>
//             </Box>

//             <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
//               {pageTitle}{currentBranch ? ` (${currentBranch.name})` : ''}
//             </Typography>

//             {/* Branch switcher */}
//             {accessibleBranches && accessibleBranches.length > 1 && (
//               <>
//                 <Button
//                   color="inherit"
//                   onClick={handleBranchMenuOpen}
//                   endIcon={<ArrowDropDown />}
//                   sx={{
//                     textTransform: 'none',
//                     fontWeight: 600,
//                     mr: 1,
//                     bgcolor: alpha('#fff', 0.12),
//                     '&:hover': { bgcolor: alpha('#fff', 0.2) },
//                   }}
//                 >
//                   {currentBranch ? currentBranch.name : 'Select Branch'}
//                 </Button>
//                 <Menu anchorEl={branchMenuEl} open={Boolean(branchMenuEl)} onClose={handleBranchMenuClose}>
//                   {accessibleBranches.map((b) => (
//                     <MenuItem key={b.id} onClick={() => handleBranchSelect(b)} selected={currentBranch?.id === b.id}>
//                       {b.name}
//                     </MenuItem>
//                   ))}
//                 </Menu>
//               </>
//             )}

//             {/* Dark mode toggle */}
//             <IconButton color="inherit" onClick={() => setMode(isDark ? 'light' : 'dark')} sx={{ mr: 1 }}>
//               {isDark ? <Brightness7 /> : <Brightness4 />}
//             </IconButton>

//             {/* User menu */}
//             <IconButton size="large" onClick={handleUserMenuOpen} color="inherit">
//               <Avatar sx={{ width: 32, height: 32, bgcolor: alpha('#ffffff', 0.2), color: '#fff' }}>
//                 {user?.first_name?.[0]}{user?.last_name?.[0]}
//               </Avatar>
//             </IconButton>
//             <Menu anchorEl={userMenuEl} open={Boolean(userMenuEl)} onClose={handleUserMenuClose}>
//               <MenuItem onClick={handleProfile}><AccountCircle sx={{ mr: 2 }} />Profile</MenuItem>
//               <MenuItem onClick={handleLogout}><Logout sx={{ mr: 2 }} />Logout</MenuItem>
//             </Menu>
//           </Toolbar>
//         </AppBar>

//         {/* Drawer */}
//         <Box
//           component="nav"
//           sx={{
//             width: { sm: isDesktop ? (navCollapsed ? DRAWER_COLLAPSED : DRAWER_EXPANDED) : 0 },
//             flexShrink: { sm: 0 },
//           }}
//         >
//           {/* Mobile temporary */}
//           {!isDesktop && (
//             <Drawer
//               variant="temporary"
//               open={mobileOpen}
//               onClose={closeMobileDrawer}
//               ModalProps={{ keepMounted: true }}
//               PaperProps={{
//                 sx: {
//                   boxSizing: 'border-box',
//                   width: DRAWER_EXPANDED,
//                   bgcolor: k.drawerBg,
//                   borderRight: `1px solid ${k.border}`,
//                 },
//               }}
//             >
//               {DrawerContent}
//             </Drawer>
//           )}

//           {/* Desktop permanent (mini) */}
//           {isDesktop && (
//             <Drawer
//               variant="permanent"
//               open
//               PaperProps={{
//                 sx: {
//                   boxSizing: 'border-box',
//                   overflowX: 'hidden',
//                   width: navCollapsed ? DRAWER_COLLAPSED : DRAWER_EXPANDED,
//                   transition: (th) =>
//                     th.transitions.create('width', { duration: th.transitions.duration.shorter }),
//                   bgcolor: k.drawerBg,
//                   // subtle divider (also ensures no “blank gap” look in dark mode)
//                   borderRight: `1px solid ${k.border}`,
//                   boxShadow: 'none',
//                 },
//               }}
//             >
//               {DrawerContent}
//             </Drawer>
//           )}
//         </Box>

//         {/* Main content */}
//         {/* <Box
//           component="main"
//           sx={{
//             flexGrow: 1,
//             p: 3,
//             width: { sm: `calc(100% - ${isDesktop ? (navCollapsed ? DRAWER_COLLAPSED : DRAWER_EXPANDED) : 0}px)` },
//             ml:   { sm: `${isDesktop ? (navCollapsed ? DRAWER_COLLAPSED : DRAWER_EXPANDED) : 0}px` },
//             minHeight: '100vh',
//             bgcolor: TOKENS[mode].bgDefault,
//             // ensure there is never a visual seam/gap
//             borderLeft: `1px solid ${k.border}`,
//             borderLeftColor: 'transparent', // visually seamless; keep for layout consistency
//             transition: (th) => th.transitions.create(['width','margin'], { duration: th.transitions.duration.shorter }),
//           }}
//         >
//           <Toolbar />
//           {children}
//         </Box> */}
//         {/* Main content */}
//         <Box
//           component="main"
//           sx={{
//             flexGrow: 1,           // fill remaining space next to the drawer
//             flexBasis: 0,          // avoid shrink quirks
//             pt: 3,
//             pr: 0.5,
//             pb: 3,
//             pl: 0.5,                 // no left padding
//             minHeight: '100vh',
//             bgcolor: TOKENS[mode].bgDefault,
//             transition: (th) =>
//               th.transitions.create(['width', 'margin'], { duration: th.transitions.duration.shorter }),
//           }}
//         >
//           {/* spacer under AppBar (no side gutters) */}
//           <Box sx={{ height: { xs: 56, sm: 64 } }} />
//           {children}
//         </Box>

//       </Box>
//     </ThemeProvider>
//   );
// };

// export default Layout;









// // // components/Layout.jsx
// // import React, { useEffect, useMemo, useState } from 'react';
// // import {
// //   Box, Drawer, AppBar, Toolbar, List, Typography, Divider, ListItem,
// //   ListItemButton, ListItemIcon, ListItemText, IconButton, Menu, MenuItem,
// //   Avatar, Collapse, Button, CssBaseline
// // } from '@mui/material';
// // import { createTheme, ThemeProvider, alpha } from '@mui/material/styles';

// // import {
// //   Menu as MenuIcon,
// //   Dashboard,
// //   ShoppingCart,
// //   PointOfSale,
// //   People,
// //   Assessment,
// //   Logout,
// //   AccountCircle,
// //   Storefront,
// //   LocalShipping,
// //   ReceiptLong,
// //   ManageAccounts,
// //   Category,
// //   Payment,
// //   SwapHoriz as InventoryTwoTone,
// //   Settings,
// //   ExpandLess,
// //   ExpandMore,
// //   Business,
// //   ShoppingCartCheckout,
// //   ArrowDropDown,
// //   AdminPanelSettings,
// //   Inventory2 as ProductsIcon,
// //   Scale as UomIcon,
// //   Medication as DosageIcon,
// //   Storage as RackIcon,
// //   Percent as DiscountIcon,
// //   Brightness4,
// //   Brightness7
// // } from '@mui/icons-material';
// // import { useNavigate, useLocation } from 'react-router-dom';
// // import { useAuth } from '../contexts/AuthContext';

// // // ---- Enterprise color system (balanced, not too light, not too dark)
// // const TOKENS = {
// //   light: {
// //     primary: '#2F6DB8',             // AppBar / accents
// //     primaryContrast: '#FFFFFF',
// //     secondary: '#0E9AA7',
// //     bgDefault: '#F3F5F9',
// //     bgPaper: '#FFFFFF',
// //     drawerBg: '#F4F6FA',            // LIGHT drawer, per your feedback
// //     drawerText: '#111827',
// //     drawerMuted: '#6B7280',
// //     activeFill: '#E6F0FF',
// //     activeBorder: '#2F6DB8',
// //     hoverFill: '#EDF2FA',
// //     panelBg: '#EFF2F7',             // Masters panel background
// //   },
// //   dark: {
// //     primary: '#78A6FF',
// //     primaryContrast: '#0C1220',
// //     secondary: '#47D3DF',
// //     bgDefault: '#0B1020',
// //     bgPaper: '#0E1526',
// //     drawerBg: '#111826',            // Softer than before
// //     drawerText: '#E5E7EB',
// //     drawerMuted: '#9CA3AF',
// //     activeFill: 'rgba(120,166,255,0.15)',
// //     activeBorder: '#78A6FF',
// //     hoverFill: 'rgba(255,255,255,0.06)',
// //     panelBg: 'rgba(255,255,255,0.04)',
// //   },
// // };

// // const drawerWidth = 240;

// // const Layout = ({ children }) => {
// //   const navigate = useNavigate();
// //   const location = useLocation();
// //   const { user, logout, accessibleBranches, currentBranch, switchBranch } = useAuth();

// //   const [mobileOpen, setMobileOpen] = useState(false);
// //   const [anchorEl, setAnchorEl] = useState(null);
// //   const [mastersOpen, setMastersOpen] = useState(false);
// //   const [productMastersOpen, setProductMastersOpen] = useState(false); // default CLOSED (fix)
// //   const [branchMenuAnchorEl, setBranchMenuAnchorEl] = useState(null);

// //   // ---- Dark mode: initialize from localStorage OR system preference; persist reliably
// //   const initialMode = () => {
// //     const saved = typeof window !== 'undefined' ? localStorage.getItem('apnaaerp-theme-mode') : null;
// //     if (saved === 'dark' || saved === 'light') return saved;
// //     // fallback: system preference
// //     if (typeof window !== 'undefined' && window.matchMedia &&
// //         window.matchMedia('(prefers-color-scheme: dark)').matches) {
// //       return 'dark';
// //     }
// //     return 'light';
// //   };
// //   const [mode, setMode] = useState(initialMode);
// //   useEffect(() => {
// //     localStorage.setItem('apnaaerp-theme-mode', mode);
// //   }, [mode]);
// //   const isDark = mode === 'dark';

// //   const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
// //   const handleMenu = (e) => setAnchorEl(e.currentTarget);
// //   const handleClose = () => setAnchorEl(null);
// //   const handleLogout = () => { logout(); handleClose(); navigate('/login'); };
// //   const handleProfile = () => { navigate('/profile'); handleClose(); };

// //   const handleBranchMenuOpen = (e) => setBranchMenuAnchorEl(e.currentTarget);
// //   const handleBranchMenuClose = () => setBranchMenuAnchorEl(null);
// //   const handleBranchSelect = (branch) => { switchBranch(branch); handleBranchMenuClose(); };

// //   const isActive = (path) => location.pathname.startsWith(path);

// //   const pageTitle =
// //     [
// //       ['/dashboard', 'Dashboard'],
// //       ['/pos', 'POS'],
// //       ['/sales', 'Sales'],
// //       ['/purchases', 'Purchases'],
// //       ['/purchase-orders', 'Purchase Orders'],
// //       ['/inventory', 'Inventory'],
// //       ['/stock-transfers', 'Stock Transfers'],
// //       ['/payments', 'Payments'],
// //       ['/reports', 'Reports'],
// //       ['/branches', 'Branches'],
// //       ['/products', 'Products'],
// //       ['/categories', 'Categories'],
// //       ['/customers', 'Customers'],
// //       ['/suppliers', 'Suppliers'],
// //       ['/users', 'Manage Users'],
// //       ['/roles', 'Manage Roles'],
// //       ['/settings', 'Settings'],
// //       ['/brands', 'Brands'],
// //       ['/uom', 'UOM'],
// //       ['/dosage-forms', 'Dosage Forms'],
// //       ['/racks', 'Racks'],
// //       ['/std-discounts', 'Standard Discounts'],
// //       ['/manufacturers', 'Manufacturers'],
// //     ].find(([p]) => isActive(p))?.[1] || 'Dashboard';

// //   // ---- Theme
// //   const theme = useMemo(() => {
// //     const t = isDark ? TOKENS.dark : TOKENS.light;
// //     return createTheme({
// //       palette: {
// //         mode,
// //         primary: { main: t.primary, contrastText: t.primaryContrast },
// //         secondary: { main: t.secondary },
// //         background: { default: t.bgDefault, paper: t.bgPaper },
// //         text: {
// //           primary: isDark ? '#E8EEF6' : '#0E1526',
// //           secondary: isDark ? alpha('#E8EEF6', 0.7) : '#384152',
// //         },
// //         divider: isDark ? alpha('#FFFFFF', 0.1) : alpha('#000', 0.08),
// //       },
// //       shape: { borderRadius: 10 },
// //       components: {
// //         MuiCssBaseline: {
// //           styleOverrides: {
// //             body: { backgroundColor: t.bgDefault },
// //           },
// //         },
// //         MuiAppBar: {
// //           styleOverrides: {
// //             root: {
// //               backgroundImage: 'none',
// //               backgroundColor: isDark ? '#1E2A48' : '#2F6DB8', // readable, not too dark
// //             },
// //           },
// //         },
// //         MuiDrawer: {
// //           styleOverrides: {
// //             paper: {
// //               backgroundColor: t.drawerBg,
// //               color: t.drawerText,
// //               borderRight: `1px solid ${isDark ? alpha('#fff', 0.06) : alpha('#000', 0.06)}`,
// //             },
// //           },
// //         },
// //         MuiListItemButton: {
// //           styleOverrides: {
// //             root: { borderRadius: 8 },
// //           },
// //         },
// //         MuiMenu: { styleOverrides: { paper: { borderRadius: 12 } } },
// //         MuiButton: { styleOverrides: { root: { borderRadius: 10 } } },
// //       },
// //       typography: {
// //         fontFamily:
// //           `"Inter", "Roboto", "Helvetica Neue", Arial, "Noto Sans", sans-serif`,
// //         h6: { fontWeight: 700, letterSpacing: 0.2 },
// //       },
// //     });
// //   }, [mode, isDark]);

// //   // ---- Styles (respect theme + your feedback)
// //   const t = isDark ? TOKENS.dark : TOKENS.light;

// //   const hoverSx = {
// //     borderRadius: 1,
// //     mx: 1,
// //     px: 1.25,
// //     '&:hover': {
// //       backgroundColor: t.hoverFill,
// //     },
// //     transition: 'all .15s ease',
// //   };

// //   const drawerItemSx = (active = false) => ({
// //     ...hoverSx,
// //     my: 0.25,
// //     '& .MuiListItemIcon-root': {
// //       color: active ? t.primary : t.drawerMuted,
// //       minWidth: 36,
// //     },
// //     color: active ? (isDark ? '#FFFFFF' : '#0F172A') : t.drawerText,
// //     ...(active && {
// //       backgroundColor: t.activeFill,
// //       borderLeft: `3px solid ${t.activeBorder}`,
// //     }),
// //   });

// //   // ---- Drawer
// //   const drawer = (
// //     <div>
// //       <Toolbar sx={{ px: 2 }}>
// //         <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 800 }}>
// //           Apnaa-ERP
// //         </Typography>
// //       </Toolbar>
// //       <Divider />

// //       <List sx={{ pt: 0.5 }}>
// //         {/* Dashboard */}
// //         <ListItem disablePadding>
// //           <ListItemButton
// //             sx={drawerItemSx(isActive('/dashboard'))}
// //             selected={isActive('/dashboard')}
// //             onClick={() => navigate('/dashboard')}
// //           >
// //             <ListItemIcon><Dashboard /></ListItemIcon>
// //             <ListItemText primary="Dashboard" />
// //           </ListItemButton>
// //         </ListItem>

// //         {/* POS */}
// //         <ListItem disablePadding>
// //           <ListItemButton sx={drawerItemSx(isActive('/pos'))} onClick={() => navigate('/pos')}>
// //             <ListItemIcon><PointOfSale /></ListItemIcon>
// //             <ListItemText primary="POS" />
// //           </ListItemButton>
// //         </ListItem>

// //         {/* Sales */}
// //         <ListItem disablePadding>
// //           <ListItemButton sx={drawerItemSx(isActive('/sales'))} onClick={() => navigate('/sales')}>
// //             <ListItemIcon><Assessment /></ListItemIcon>
// //             <ListItemText primary="Sales" />
// //           </ListItemButton>
// //         </ListItem>

// //         {/* Purchases */}
// //         <ListItem disablePadding>
// //           <ListItemButton sx={drawerItemSx(isActive('/purchases'))} onClick={() => navigate('/purchases')}>
// //             <ListItemIcon><ShoppingCartCheckout /></ListItemIcon>
// //             <ListItemText primary="Purchases" />
// //           </ListItemButton>
// //         </ListItem>

// //         {/* Purchase Orders */}
// //         <ListItem disablePadding>
// //           <ListItemButton sx={drawerItemSx(isActive('/purchase-orders'))} onClick={() => navigate('/purchase-orders')}>
// //             <ListItemIcon><ReceiptLong /></ListItemIcon>
// //             <ListItemText primary="Purchase Orders" />
// //           </ListItemButton>
// //         </ListItem>

// //         {/* Inventory */}
// //         <ListItem disablePadding>
// //           <ListItemButton sx={drawerItemSx(isActive('/inventory'))} onClick={() => navigate('/inventory')}>
// //             <ListItemIcon><ShoppingCart /></ListItemIcon>
// //             <ListItemText primary="Inventory" />
// //           </ListItemButton>
// //         </ListItem>

// //         {/* Stock Transfers */}
// //         <ListItem disablePadding>
// //           <ListItemButton sx={drawerItemSx(isActive('/stock-transfers'))} onClick={() => navigate('/stock-transfers')}>
// //             <ListItemIcon><InventoryTwoTone /></ListItemIcon>
// //             <ListItemText primary="Stock Transfers" />
// //           </ListItemButton>
// //         </ListItem>

// //         {/* Payments */}
// //         <ListItem disablePadding>
// //           <ListItemButton sx={drawerItemSx(isActive('/payments'))} onClick={() => navigate('/payments')}>
// //             <ListItemIcon><Payment /></ListItemIcon>
// //             <ListItemText primary="Payments" />
// //           </ListItemButton>
// //         </ListItem>

// //         {/* Reports */}
// //         <ListItem disablePadding>
// //           <ListItemButton sx={drawerItemSx(isActive('/reports'))} onClick={() => navigate('/reports')}>
// //             <ListItemIcon><Assessment /></ListItemIcon>
// //             <ListItemText primary="Reports" />
// //           </ListItemButton>
// //         </ListItem>

// //         {/* Masters (collapsible, distinct panel; Product Masters does NOT auto-open) */}
// //         <Box sx={{ mt: 0.5, mx: 1, borderRadius: 1 }}>
// //           <ListItemButton
// //             sx={{
// //               ...drawerItemSx(false),
// //               borderRadius: 1,
// //             }}
// //             onClick={() => setMastersOpen((v) => !v)}
// //           >
// //             <ListItemIcon><Business /></ListItemIcon>
// //             <ListItemText
// //               primary="Masters"
// //               primaryTypographyProps={{ fontWeight: 700 }}
// //             />
// //             {mastersOpen ? <ExpandLess /> : <ExpandMore />}
// //           </ListItemButton>

// //           <Collapse in={mastersOpen} timeout="auto" unmountOnExit>
// //             <Box
// //               sx={{
// //                 mt: 0.75,
// //                 mx: 1,
// //                 mb: 0.75,
// //                 p: 1,
// //                 borderRadius: 1.25,
// //                 bgcolor: t.panelBg,
// //                 borderLeft: `3px solid ${t.activeBorder}`,
// //               }}
// //             >
// //               <List component="div" disablePadding dense>
// //                 <ListItemButton sx={{ ...hoverSx, pl: 2 }} onClick={() => navigate('/branches')}>
// //                   <ListItemIcon sx={{ color: t.drawerMuted }}><Storefront /></ListItemIcon>
// //                   <ListItemText primary="Branches" />
// //                 </ListItemButton>

// //                 <ListItemButton sx={{ ...hoverSx, pl: 2 }} onClick={() => navigate('/customers')}>
// //                   <ListItemIcon sx={{ color: t.drawerMuted }}><People /></ListItemIcon>
// //                   <ListItemText primary="Customers" />
// //                 </ListItemButton>

// //                 <ListItemButton sx={{ ...hoverSx, pl: 2 }} onClick={() => navigate('/suppliers')}>
// //                   <ListItemIcon sx={{ color: t.drawerMuted }}><LocalShipping /></ListItemIcon>
// //                   <ListItemText primary="Suppliers" />
// //                 </ListItemButton>

// //                 <ListItemButton sx={{ ...hoverSx, pl: 2 }} onClick={() => navigate('/users')}>
// //                   <ListItemIcon sx={{ color: t.drawerMuted }}><ManageAccounts /></ListItemIcon>
// //                   <ListItemText primary="Manage Users" />
// //                 </ListItemButton>

// //                 <ListItemButton sx={{ ...hoverSx, pl: 2 }} onClick={() => navigate('/roles')}>
// //                   <ListItemIcon sx={{ color: t.drawerMuted }}><AdminPanelSettings /></ListItemIcon>
// //                   <ListItemText primary="Manage Roles" />
// //                 </ListItemButton>

// //                 <ListItemButton sx={{ ...hoverSx, pl: 2 }} onClick={() => navigate('/settings')}>
// //                   <ListItemIcon sx={{ color: t.drawerMuted }}><Settings /></ListItemIcon>
// //                   <ListItemText primary="Settings" />
// //                 </ListItemButton>

// //                 {/* Product Masters (nested, toggles independently; default closed) */}
// //                 <ListItemButton
// //                   sx={{ ...hoverSx, pl: 2 }}
// //                   onClick={() => setProductMastersOpen(v => !v)}
// //                 >
// //                   <ListItemIcon sx={{ color: t.drawerMuted }}><ProductsIcon /></ListItemIcon>
// //                   <ListItemText primary="Product Masters" />
// //                   {productMastersOpen ? <ExpandLess /> : <ExpandMore />}
// //                 </ListItemButton>

// //                 <Collapse in={productMastersOpen} timeout="auto" unmountOnExit>
// //                   <List component="div" disablePadding dense sx={{ ml: 1 }}>
// //                     <ListItemButton sx={{ ...hoverSx, pl: 3 }} onClick={() => navigate('/products')}>
// //                       <ListItemIcon sx={{ color: t.drawerMuted }}><ProductsIcon fontSize="small" /></ListItemIcon>
// //                       <ListItemText primary="All Products" />
// //                     </ListItemButton>

// //                     <ListItemButton sx={{ ...hoverSx, pl: 3 }} onClick={() => navigate('/categories')}>
// //                       <ListItemIcon sx={{ color: t.drawerMuted }}><Category fontSize="small" /></ListItemIcon>
// //                       <ListItemText primary="Categories" />
// //                     </ListItemButton>

// //                     <ListItemButton sx={{ ...hoverSx, pl: 3 }} onClick={() => navigate('/manufacturers')}>
// //                       <ListItemIcon sx={{ color: t.drawerMuted }}><Storefront fontSize="small" /></ListItemIcon>
// //                       <ListItemText primary="Manufacturers" />
// //                     </ListItemButton>

// //                     <ListItemButton sx={{ ...hoverSx, pl: 3 }} onClick={() => navigate('/uom')}>
// //                       <ListItemIcon sx={{ color: t.drawerMuted }}><UomIcon fontSize="small" /></ListItemIcon>
// //                       <ListItemText primary="UOM" />
// //                     </ListItemButton>

// //                     <ListItemButton sx={{ ...hoverSx, pl: 3 }} onClick={() => navigate('/dosage-forms')}>
// //                       <ListItemIcon sx={{ color: t.drawerMuted }}><DosageIcon fontSize="small" /></ListItemIcon>
// //                       <ListItemText primary="Dosage Forms" />
// //                     </ListItemButton>

// //                     <ListItemButton sx={{ ...hoverSx, pl: 3 }} onClick={() => navigate('/racks')}>
// //                       <ListItemIcon sx={{ color: t.drawerMuted }}><RackIcon fontSize="small" /></ListItemIcon>
// //                       <ListItemText primary="Racks" />
// //                     </ListItemButton>

// //                     <ListItemButton sx={{ ...hoverSx, pl: 3 }} onClick={() => navigate('/std-discounts')}>
// //                       <ListItemIcon sx={{ color: t.drawerMuted }}><DiscountIcon fontSize="small" /></ListItemIcon>
// //                       <ListItemText primary="Standard Discounts" />
// //                     </ListItemButton>
// //                   </List>
// //                 </Collapse>
// //               </List>
// //             </Box>
// //           </Collapse>
// //         </Box>
// //       </List>
// //     </div>
// //   );

// //   return (
// //     <ThemeProvider theme={theme}>
// //       <CssBaseline />
// //       <Box sx={{ display: 'flex', bgcolor: theme.palette.background.default }}>
// //         <AppBar
// //           position="fixed"
// //           elevation={2}
// //           color="primary"
// //           sx={{
// //             width: { sm: `calc(100% - ${drawerWidth}px)` },
// //             ml: { sm: `${drawerWidth}px` },
// //           }}
// //         >
// //           <Toolbar>
// //             <IconButton color="inherit" edge="start" onClick={handleDrawerToggle} sx={{ mr: 2, display: { sm: 'none' } }}>
// //               <MenuIcon />
// //             </IconButton>

// //             {/* Force title to be white and readable on AppBar */}
// //             <Typography
// //               variant="h6"
// //               noWrap
// //               component="div"
// //               sx={{ flexGrow: 1, color: theme.palette.primary.contrastText }}
// //             >
// //               {pageTitle}{currentBranch ? ` (${currentBranch.name})` : ''}
// //             </Typography>

// //             {/* Branch Switcher */}
// //             {accessibleBranches && accessibleBranches.length > 1 && (
// //               <Box sx={{ mr: 1.5 }}>
// //                 <Button
// //                   color="inherit"
// //                   onClick={handleBranchMenuOpen}
// //                   endIcon={<ArrowDropDown />}
// //                   sx={{
// //                     textTransform: 'none',
// //                     fontWeight: 600,
// //                     bgcolor: alpha(theme.palette.common.white, 0.12),
// //                     '&:hover': { bgcolor: alpha(theme.palette.common.white, 0.2) },
// //                   }}
// //                 >
// //                   {currentBranch ? currentBranch.name : 'Select Branch'}
// //                 </Button>
// //                 <Menu anchorEl={branchMenuAnchorEl} open={Boolean(branchMenuAnchorEl)} onClose={handleBranchMenuClose}>
// //                   {accessibleBranches.map((branch) => (
// //                     <MenuItem
// //                       key={branch.id}
// //                       onClick={() => handleBranchSelect(branch)}
// //                       selected={currentBranch?.id === branch.id}
// //                     >
// //                       {branch.name}
// //                     </MenuItem>
// //                   ))}
// //                 </Menu>
// //               </Box>
// //             )}

// //             {/* Dark mode switch (persists, no reload loss) */}
// //             <IconButton
// //               color="inherit"
// //               onClick={() => setMode(isDark ? 'light' : 'dark')}
// //               sx={{ mr: 1 }}
// //               aria-label="Toggle dark mode"
// //               title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
// //             >
// //               {isDark ? <Brightness7 /> : <Brightness4 />}
// //             </IconButton>

// //             {/* User menu */}
// //             <Box>
// //               <IconButton size="large" onClick={handleMenu} color="inherit">
// //                 <Avatar sx={{ width: 32, height: 32, bgcolor: alpha('#ffffff', 0.2), color: '#fff' }}>
// //                   {user?.first_name?.[0]}{user?.last_name?.[0]}
// //                 </Avatar>
// //               </IconButton>
// //               <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
// //                 <MenuItem onClick={handleProfile}><AccountCircle sx={{ mr: 2 }} />Profile</MenuItem>
// //                 <MenuItem onClick={handleLogout}><Logout sx={{ mr: 2 }} />Logout</MenuItem>
// //               </Menu>
// //             </Box>
// //           </Toolbar>
// //         </AppBar>

// //         {/* Drawers */}
// //         <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
// //           <Drawer
// //             variant="temporary"
// //             open={mobileOpen}
// //             onClose={handleDrawerToggle}
// //             ModalProps={{ keepMounted: true }}
// //             sx={{
// //               display: { xs: 'block', sm: 'none' },
// //               '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
// //             }}
// //           >
// //             {drawer}
// //           </Drawer>
// //           <Drawer
// //             variant="permanent"
// //             sx={{
// //               display: { xs: 'none', sm: 'block' },
// //               '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
// //             }}
// //             open
// //           >
// //             {drawer}
// //           </Drawer>
// //         </Box>

// //         {/* Main content */}
// //         <Box
// //           component="main"
// //           sx={{
// //             flexGrow: 1,
// //             p: 3,
// //             width: { sm: `calc(100% - ${drawerWidth}px)` },
// //             minHeight: '100vh',
// //           }}
// //         >
// //           <Toolbar />
// //           {children}
// //         </Box>
// //       </Box>
// //     </ThemeProvider>
// //   );
// // };

// // export default Layout;












// // // components/Layout.jsx
// // import React, { useState } from 'react';
// // import {
// //   Box, Drawer, AppBar, Toolbar, List, Typography, Divider, ListItem,
// //   ListItemButton, ListItemIcon, ListItemText, IconButton, Menu, MenuItem,
// //   Avatar, Collapse, Button
// // } from '@mui/material';
// // import {
// //   Menu as MenuIcon,
// //   Dashboard,
// //   Inventory,
// //   ShoppingCart,
// //   PointOfSale,
// //   People,
// //   Assessment,
// //   Logout,
// //   AccountCircle,
// //   Storefront,
// //   LocalShipping,
// //   ReceiptLong,
// //   ManageAccounts,
// //   Category,
// //   Payment,
// //   SwapHoriz as InventoryTwoTone,
// //   Settings,
// //   ExpandLess,
// //   ExpandMore,
// //   Business,
// //   ShoppingCartCheckout,
// //   ArrowDropDown,
// //   AdminPanelSettings,
// //   Inventory2 as ProductsIcon,
// //   Scale as UomIcon,
// //   Medication as DosageIcon,
// //   Storage as RackIcon,
// //   Percent as DiscountIcon,
// //   LocalOffer as BrandIcon,
// // } from '@mui/icons-material';
// // import { useNavigate, useLocation } from 'react-router-dom';
// // import { useAuth } from '../contexts/AuthContext';

// // const drawerWidth = 240;

// // // small helper for hover polish
// // const hoverSx = {
// //   borderRadius: 1,
// //   mx: 1,
// //   '&:hover': {
// //     backgroundColor: (t) =>
// //       t.palette.mode === 'light' ? 'rgba(25, 118, 210, 0.3)' : 'rgba(144,202,249,.12)',
// //     transform: 'translateX(2px)',
// //   },
// //   transition: 'all .15s ease',
// // };

// // const Layout = ({ children }) => {
// //   const [mobileOpen, setMobileOpen] = useState(false);
// //   const [anchorEl, setAnchorEl] = useState(null);
// //   const [mastersOpen, setMastersOpen] = useState(false);
// //   const [productMastersOpen, setProductMastersOpen] = useState(true); // nested submenu
// //   const [branchMenuAnchorEl, setBranchMenuAnchorEl] = useState(null);

// //   const navigate = useNavigate();
// //   const location = useLocation();
// //   const { user, logout, accessibleBranches, currentBranch, switchBranch } = useAuth();

// //   const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
// //   const handleMenu = (e) => setAnchorEl(e.currentTarget);
// //   const handleClose = () => setAnchorEl(null);
// //   const handleLogout = () => { logout(); handleClose(); navigate('/login'); };
// //   const handleProfile = () => { navigate('/profile'); handleClose(); };

// //   const handleBranchMenuOpen = (e) => setBranchMenuAnchorEl(e.currentTarget);
// //   const handleBranchMenuClose = () => setBranchMenuAnchorEl(null);
// //   const handleBranchSelect = (branch) => { switchBranch(branch); handleBranchMenuClose(); };

// //   const isActive = (path) => location.pathname.startsWith(path);

// //   const pageTitle =
// //     [
// //       ['/dashboard', 'Dashboard'],
// //       ['/pos', 'POS'],
// //       ['/sales', 'Sales'],
// //       ['/purchases', 'Purchases'],
// //       ['/purchase-orders', 'Purchase Orders'],
// //       ['/inventory', 'Inventory'],
// //       ['/stock-transfers', 'Stock Transfers'],
// //       ['/payments', 'Payments'],
// //       ['/reports', 'Reports'],
// //       ['/branches', 'Branches'],
// //       ['/products', 'Products'],
// //       ['/categories', 'Categories'],
// //       ['/customers', 'Customers'],
// //       ['/suppliers', 'Suppliers'],
// //       ['/users', 'Manage Users'],
// //       ['/roles', 'Manage Roles'],
// //       ['/settings', 'Settings'],
// //       ['/brands', 'Brands'],
// //       ['/uom', 'UOM'],
// //       ['/dosage-forms', 'Dosage Forms'],
// //       ['/racks', 'Racks'],
// //       ['/std-discounts', 'Standard Discounts'],
// //     ].find(([p]) => isActive(p))?.[1] || 'Dashboard';

// //   const drawer = (
// //     <div>
// //       <Toolbar>
// //         <Typography variant="h6" noWrap component="div">
// //           Apnaa-ERP
// //         </Typography>
// //       </Toolbar>
// //       <Divider />
// //       <List>
// //         {/* Dashboard */}
// //         <ListItem disablePadding>
// //           <ListItemButton sx={hoverSx} selected={isActive('/dashboard')} onClick={() => navigate('/dashboard')}>
// //             <ListItemIcon><Dashboard /></ListItemIcon>
// //             <ListItemText primary="Dashboard" />
// //           </ListItemButton>
// //         </ListItem>

// //         {/* POS */}
// //         <ListItem disablePadding>
// //           <ListItemButton sx={hoverSx} selected={isActive('/pos')} onClick={() => navigate('/pos')}>
// //             <ListItemIcon><PointOfSale /></ListItemIcon>
// //             <ListItemText primary="POS" />
// //           </ListItemButton>
// //         </ListItem>

// //         {/* Sales */}
// //         <ListItem disablePadding>
// //           <ListItemButton sx={hoverSx} selected={isActive('/sales')} onClick={() => navigate('/sales')}>
// //             <ListItemIcon><Assessment /></ListItemIcon>
// //             <ListItemText primary="Sales" />
// //           </ListItemButton>
// //         </ListItem>

// //         {/* Purchases */}
// //         <ListItem disablePadding>
// //           <ListItemButton sx={hoverSx} selected={isActive('/purchases')} onClick={() => navigate('/purchases')}>
// //             <ListItemIcon><ShoppingCartCheckout /></ListItemIcon>
// //             <ListItemText primary="Purchases" />
// //           </ListItemButton>
// //         </ListItem>

// //         {/* Purchase Orders */}
// //         <ListItem disablePadding>
// //           <ListItemButton sx={hoverSx} selected={isActive('/purchase-orders')} onClick={() => navigate('/purchase-orders')}>
// //             <ListItemIcon><ReceiptLong /></ListItemIcon>
// //             <ListItemText primary="Purchase Orders" />
// //           </ListItemButton>
// //         </ListItem>

// //         {/* Inventory */}
// //         <ListItem disablePadding>
// //           <ListItemButton sx={hoverSx} selected={isActive('/inventory')} onClick={() => navigate('/inventory')}>
// //             <ListItemIcon><ShoppingCart /></ListItemIcon>
// //             <ListItemText primary="Inventory" />
// //           </ListItemButton>
// //         </ListItem>

// //         {/* Stock Transfers */}
// //         <ListItem disablePadding>
// //           <ListItemButton sx={hoverSx} selected={isActive('/stock-transfers')} onClick={() => navigate('/stock-transfers')}>
// //             <ListItemIcon><InventoryTwoTone /></ListItemIcon>
// //             <ListItemText primary="Stock Transfers" />
// //           </ListItemButton>
// //         </ListItem>

// //         {/* Payments */}
// //         <ListItem disablePadding>
// //           <ListItemButton sx={hoverSx} selected={isActive('/payments')} onClick={() => navigate('/payments')}>
// //             <ListItemIcon><Payment /></ListItemIcon>
// //             <ListItemText primary="Payments" />
// //           </ListItemButton>
// //         </ListItem>

// //         {/* Reports */}
// //         <ListItem disablePadding>
// //           <ListItemButton sx={hoverSx} selected={isActive('/reports')} onClick={() => navigate('/reports')}>
// //             <ListItemIcon><Assessment /></ListItemIcon>
// //             <ListItemText primary="Reports" />
// //           </ListItemButton>
// //         </ListItem>

// //         {/* Masters (collapsible) */}
// //         <ListItemButton sx={hoverSx} onClick={() => setMastersOpen(!mastersOpen)}>
// //           <ListItemIcon><Business /></ListItemIcon>
// //           <ListItemText primary="Masters" />
// //           {mastersOpen ? <ExpandLess /> : <ExpandMore />}
// //         </ListItemButton>
// //         <Collapse in={mastersOpen} timeout="auto" unmountOnExit>
// //           <List component="div" disablePadding>

// //             {/* Branches */}
// //             <ListItemButton sx={{ ...hoverSx, pl: 4 }} selected={isActive('/branches')} onClick={() => navigate('/branches')}>
// //               <ListItemIcon><Storefront /></ListItemIcon>
// //               <ListItemText primary="Branches" />
// //             </ListItemButton>

// //             {/* Customers */}
// //             <ListItemButton sx={{ ...hoverSx, pl: 4 }} selected={isActive('/customers')} onClick={() => navigate('/customers')}>
// //               <ListItemIcon><People /></ListItemIcon>
// //               <ListItemText primary="Customers" />
// //             </ListItemButton>

// //             {/* Suppliers */}
// //             <ListItemButton sx={{ ...hoverSx, pl: 4 }} selected={isActive('/suppliers')} onClick={() => navigate('/suppliers')}>
// //               <ListItemIcon><LocalShipping /></ListItemIcon>
// //               <ListItemText primary="Suppliers" />
// //             </ListItemButton>

// //             {/* Users */}
// //             <ListItemButton sx={{ ...hoverSx, pl: 4 }} selected={isActive('/users')} onClick={() => navigate('/users')}>
// //               <ListItemIcon><ManageAccounts /></ListItemIcon>
// //               <ListItemText primary="Manage Users" />
// //             </ListItemButton>

// //             {/* Roles */}
// //             <ListItemButton sx={{ ...hoverSx, pl: 4 }} selected={isActive('/roles')} onClick={() => navigate('/roles')}>
// //               <ListItemIcon><AdminPanelSettings /></ListItemIcon>
// //               <ListItemText primary="Manage Roles" />
// //             </ListItemButton>

// //             {/* Settings */}
// //             <ListItemButton sx={{ ...hoverSx, pl: 4 }} selected={isActive('/settings')} onClick={() => navigate('/settings')}>
// //               <ListItemIcon><Settings /></ListItemIcon>
// //               <ListItemText primary="Settings" />
// //             </ListItemButton>

// //             {/* --- Product Masters (nested) --- */}
// //             <ListItemButton sx={{ ...hoverSx, pl: 4 }} onClick={() => setProductMastersOpen(v => !v)}>
// //               <ListItemIcon><ProductsIcon /></ListItemIcon>
// //               <ListItemText primary="Product Masters" />
// //               {productMastersOpen ? <ExpandLess /> : <ExpandMore />}
// //             </ListItemButton>
// //             <Collapse in={productMastersOpen} timeout="auto" unmountOnExit>
// //               <List component="div" disablePadding>
// //                 <ListItemButton sx={{ ...hoverSx, pl: 6 }} selected={isActive('/products')} onClick={() => navigate('/products')}>
// //                   <ListItemIcon><ProductsIcon fontSize="small" /></ListItemIcon>
// //                   <ListItemText primary="All Products" />
// //                 </ListItemButton>
// //                 <ListItemButton sx={{ ...hoverSx, pl: 6 }} selected={isActive('/categories')} onClick={() => navigate('/categories')}>
// //                   <ListItemIcon><Category fontSize="small" /></ListItemIcon>
// //                   <ListItemText primary="Categories" />
// //                 </ListItemButton>

// //                 <ListItemButton sx={{ ...hoverSx, pl: 6 }} selected={isActive('/manufacturers')} onClick={() => navigate('/manufacturers')}>
// //                   <ListItemIcon><Storefront fontSize="small" /></ListItemIcon>
// //                   <ListItemText primary="Manufacturers" />
// //                 </ListItemButton>

// //                 <ListItemButton sx={{ ...hoverSx, pl: 6 }} selected={isActive('/uom')} onClick={() => navigate('/uom')}>
// //                   <ListItemIcon><UomIcon fontSize="small" /></ListItemIcon>
// //                   <ListItemText primary="UOM" />
// //                 </ListItemButton>
// //                 <ListItemButton sx={{ ...hoverSx, pl: 6 }} selected={isActive('/dosage-forms')} onClick={() => navigate('/dosage-forms')}>
// //                   <ListItemIcon><DosageIcon fontSize="small" /></ListItemIcon>
// //                   <ListItemText primary="Dosage Forms" />
// //                 </ListItemButton>
// //                 <ListItemButton sx={{ ...hoverSx, pl: 6 }} selected={isActive('/racks')} onClick={() => navigate('/racks')}>
// //                   <ListItemIcon><RackIcon fontSize="small" /></ListItemIcon>
// //                   <ListItemText primary="Racks" />
// //                 </ListItemButton>
// //                 <ListItemButton sx={{ ...hoverSx, pl: 6 }} selected={isActive('/std-discounts')} onClick={() => navigate('/std-discounts')}>
// //                   <ListItemIcon><DiscountIcon fontSize="small" /></ListItemIcon>
// //                   <ListItemText primary="Standard Discounts" />
// //                 </ListItemButton>
// //               </List>
// //             </Collapse>
// //           </List>
// //         </Collapse>
// //       </List>
// //     </div>
// //   );

// //   return (
// //     <Box sx={{ display: 'flex' }}>
// //       <AppBar
// //         position="fixed"
// //         sx={{
// //           width: { sm: `calc(100% - ${drawerWidth}px)` },
// //           ml: { sm: `${drawerWidth}px` },
// //         }}
// //       >
// //         <Toolbar>
// //           <IconButton color="inherit" edge="start" onClick={handleDrawerToggle} sx={{ mr: 2, display: { sm: 'none' } }}>
// //             <MenuIcon />
// //           </IconButton>

// //           <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
// //             {pageTitle}
// //           </Typography>

// //           {/* Branch Switcher */}
// //           {accessibleBranches && accessibleBranches.length > 1 && (
// //             <Box sx={{ mr: 2 }}>
// //               <Button color="inherit" onClick={handleBranchMenuOpen} endIcon={<ArrowDropDown />}>
// //                 {currentBranch ? currentBranch.name : 'Select Branch'}
// //               </Button>
// //               <Menu anchorEl={branchMenuAnchorEl} open={Boolean(branchMenuAnchorEl)} onClose={handleBranchMenuClose}>
// //                 {accessibleBranches.map((branch) => (
// //                   <MenuItem
// //                     key={branch.id}
// //                     onClick={() => handleBranchSelect(branch)}
// //                     selected={currentBranch?.id === branch.id}
// //                   >
// //                     {branch.name}
// //                   </MenuItem>
// //                 ))}
// //               </Menu>
// //             </Box>
// //           )}

// //           {/* User menu */}
// //           <Box>
// //             <IconButton size="large" onClick={handleMenu} color="inherit">
// //               <Avatar sx={{ width: 32, height: 32 }}>
// //                 {user?.first_name?.[0]}{user?.last_name?.[0]}
// //               </Avatar>
// //             </IconButton>
// //             <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
// //               <MenuItem onClick={handleProfile}><AccountCircle sx={{ mr: 2 }} />Profile</MenuItem>
// //               <MenuItem onClick={handleLogout}><Logout sx={{ mr: 2 }} />Logout</MenuItem>
// //             </Menu>
// //           </Box>
// //         </Toolbar>
// //       </AppBar>

// //       {/* Drawers */}
// //       <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
// //         <Drawer
// //           variant="temporary"
// //           open={mobileOpen}
// //           onClose={handleDrawerToggle}
// //           ModalProps={{ keepMounted: true }}
// //           sx={{
// //             display: { xs: 'block', sm: 'none' },
// //             '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
// //           }}
// //         >
// //           {drawer}
// //         </Drawer>
// //         <Drawer
// //           variant="permanent"
// //           sx={{
// //             display: { xs: 'none', sm: 'block' },
// //             '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
// //           }}
// //           open
// //         >
// //           {drawer}
// //         </Drawer>
// //       </Box>

// //       {/* Main content */}
// //       <Box component="main" sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${drawerWidth}px)` } }}>
// //         <Toolbar />
// //         {children}
// //       </Box>
// //     </Box>
// //   );
// // };

// // export default Layout;
