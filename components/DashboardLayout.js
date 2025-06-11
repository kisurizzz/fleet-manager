"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Tooltip,
} from "@mui/material";
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  DirectionsCar as VehiclesIcon,
  LocalGasStation as FuelIcon,
  Build as MaintenanceIcon,
  Assessment as ReportsIcon,
  AccountCircle as AccountIcon,
  Logout as LogoutIcon,
  Analytics as AnalyticsIcon,
  Money as MoneyIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";
import { useAuth } from "../app/contexts/AuthContext";

const drawerWidth = 240;

const navigationItems = [
  { title: "Dashboard", icon: <DashboardIcon />, path: "/dashboard" },
  { title: "Analytics", icon: <AnalyticsIcon />, path: "/analytics" },
  { title: "Vehicles", icon: <VehiclesIcon />, path: "/vehicles" },
  { title: "Fuel Records", icon: <FuelIcon />, path: "/fuel" },
  { title: "Fuel Credit", icon: <MoneyIcon />, path: "/fuel/loans" },
  { title: "Maintenance", icon: <MaintenanceIcon />, path: "/maintenance" },
  { title: "Reports", icon: <ReportsIcon />, path: "/reports" },
  { title: "Fuel Prices", icon: <SettingsIcon />, path: "/admin/fuel-prices" },
];

/**
 * Dashboard layout component with sidebar navigation and top bar
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render in main content area
 * @returns {JSX.Element} Dashboard layout
 */
export default function DashboardLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  /**
   * Toggle mobile drawer
   */
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  /**
   * Handle account menu open
   * @param {Event} event - Click event
   */
  const handleAccountMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  /**
   * Handle account menu close
   */
  const handleAccountMenuClose = () => {
    setAnchorEl(null);
  };

  /**
   * Handle user logout
   */
  const handleLogout = async () => {
    try {
      await signOut();
      router.replace("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
    handleAccountMenuClose();
  };

  /**
   * Navigate to specified path
   * @param {string} path - Navigation path
   */
  const navigateTo = (path) => {
    router.push(path);
    setMobileOpen(false);
  };

  /**
   * Drawer content component
   */
  const drawer = (
    <div>
      <Toolbar>
        <Typography
          variant="h6"
          noWrap
          component="div"
          sx={{ fontWeight: "bold" }}
        >
          Belbin Fleet
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {navigationItems.map((item) => (
          <ListItem key={item.title} disablePadding>
            <ListItemButton
              onClick={() => navigateTo(item.path)}
              selected={pathname === item.path}
              sx={{
                "&.Mui-selected": {
                  backgroundColor: "primary.main",
                  color: "white",
                  "&:hover": {
                    backgroundColor: "primary.dark",
                  },
                  "& .MuiListItemIcon-root": {
                    color: "white",
                  },
                },
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.title} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: "flex" }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: "none" } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Fleet Management System
          </Typography>

          <Tooltip title="Account settings">
            <IconButton
              onClick={handleAccountMenuOpen}
              sx={{ ml: 2 }}
              color="inherit"
            >
              <Avatar sx={{ width: 32, height: 32, bgcolor: "secondary.main" }}>
                {user?.email?.charAt(0).toUpperCase()}
              </Avatar>
            </IconButton>
          </Tooltip>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleAccountMenuClose}
            onClick={handleAccountMenuClose}
            transformOrigin={{ horizontal: "right", vertical: "top" }}
            anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
          >
            <MenuItem>
              <ListItemIcon>
                <AccountIcon fontSize="small" />
              </ListItemIcon>
              {user?.email}
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: "block", sm: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", sm: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: 8,
          minHeight: "calc(100vh - 64px)",
          bgcolor: "background.default",
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
