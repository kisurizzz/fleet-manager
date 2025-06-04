"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActions,
} from "@mui/material";
import {
  Add as AddIcon,
  Search as SearchIcon,
  MoreVert as MoreIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  DirectionsCar as CarIcon,
  Warning as WarningIcon,
  Analytics as AnalyticsIcon,
  Assessment as ReportIcon,
} from "@mui/icons-material";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { deleteObject, ref } from "firebase/storage";
import { db, storage } from "../../lib/firebase";
import ProtectedRoute from "../../components/ProtectedRoute";
import DashboardLayout from "../../components/DashboardLayout";
import { format, isBefore, addDays } from "date-fns";
import { auth } from "../../lib/firebase";

/**
 * Safely format a date that could be a Firebase Timestamp or JavaScript Date
 * @param {any} dateValue - The date value (Timestamp, Date, or other)
 * @param {string} formatString - The format string for date-fns
 * @returns {string} Formatted date string or "Not set"
 */
const safeFormatDate = (dateValue, formatString = "dd-MM-yyyy") => {
  if (!dateValue) return "Not set";

  try {
    // If it's a Firebase Timestamp, use .toDate()
    if (dateValue && typeof dateValue.toDate === "function") {
      return format(dateValue.toDate(), formatString);
    }

    // If it's already a Date object
    if (dateValue instanceof Date) {
      // Check for valid date to avoid hydration issues
      if (isNaN(dateValue.getTime())) {
        return "Not set";
      }
      return format(dateValue, formatString);
    }

    // If it's a string that can be parsed as a date
    if (typeof dateValue === "string") {
      const parsedDate = new Date(dateValue);
      if (!isNaN(parsedDate.getTime())) {
        return format(parsedDate, formatString);
      }
    }

    // If it's a number (timestamp)
    if (typeof dateValue === "number") {
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        return format(date, formatString);
      }
    }

    return "Not set";
  } catch (error) {
    console.warn("Error formatting date:", error, dateValue);
    return "Not set";
  }
};

/**
 * Safely convert date value to Date object for comparison
 * @param {any} dateValue - The date value
 * @returns {Date|null} Date object or null
 */
const safeToDate = (dateValue) => {
  if (!dateValue) return null;

  try {
    // If it's a Firebase Timestamp, use .toDate()
    if (dateValue && typeof dateValue.toDate === "function") {
      return dateValue.toDate();
    }

    // If it's already a Date object
    if (dateValue instanceof Date) {
      return dateValue;
    }

    // If it's a string that can be parsed as a date
    if (typeof dateValue === "string") {
      const parsedDate = new Date(dateValue);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate;
      }
    }

    // If it's a number (timestamp)
    if (typeof dateValue === "number") {
      return new Date(dateValue);
    }

    return null;
  } catch (error) {
    console.warn("Error converting to date:", error, dateValue);
    return null;
  }
};

/**
 * Vehicle card component for displaying vehicle information
 * @param {Object} props - Component props
 * @param {Object} props.vehicle - Vehicle data
 * @param {Function} props.onEdit - Edit handler
 * @param {Function} props.onDelete - Delete handler
 * @param {Function} props.onAnalytics - Analytics handler
 * @param {Function} props.onReports - Reports handler
 * @returns {JSX.Element} Vehicle card
 */
function VehicleCard({ vehicle, onEdit, onDelete, onAnalytics, onReports }) {
  const [anchorEl, setAnchorEl] = useState(null);

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const isInsuranceExpiring =
    vehicle.insuranceExpiry &&
    isBefore(
      safeToDate(vehicle.insuranceExpiry) || new Date(),
      addDays(new Date(), 30)
    );

  const isInspectionExpiring =
    vehicle.inspectionExpiry &&
    isBefore(
      safeToDate(vehicle.inspectionExpiry) || new Date(),
      addDays(new Date(), 30)
    );

  return (
    <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {vehicle.imageUrl ? (
        <CardMedia
          component="img"
          height="200"
          image={vehicle.imageUrl}
          alt={`${vehicle.make} ${vehicle.model}`}
          sx={{ objectFit: "cover" }}
        />
      ) : (
        <Box
          sx={{
            height: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "grey.100",
          }}
        >
          <CarIcon sx={{ fontSize: 60, color: "grey.400" }} />
        </Box>
      )}

      <CardContent sx={{ flexGrow: 1 }}>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="start"
          mb={1}
        >
          <Typography variant="h6" component="div" fontWeight="bold">
            {vehicle.regNumber}
          </Typography>
          <IconButton size="small" onClick={handleMenuOpen}>
            <MoreIcon />
          </IconButton>
        </Box>

        <Typography variant="body2" color="text.secondary" gutterBottom>
          {vehicle.make} {vehicle.model}{" "}
          {vehicle.year ? `(${vehicle.year})` : ""}
        </Typography>

        <Box display="flex" gap={1} mb={2} flexWrap="wrap">
          <Chip label={vehicle.color} size="small" />
          <Chip label={vehicle.station} size="small" variant="outlined" />
        </Box>

        {/* Expiry Warnings */}
        {(isInsuranceExpiring || isInspectionExpiring) && (
          <Box sx={{ mb: 1 }}>
            {isInsuranceExpiring && (
              <Chip
                icon={<WarningIcon />}
                label="Insurance Expiring"
                color="warning"
                size="small"
                sx={{ mr: 1, mb: 1 }}
              />
            )}
            {isInspectionExpiring && (
              <Chip
                icon={<WarningIcon />}
                label="Inspection Expiring"
                color="warning"
                size="small"
                sx={{ mb: 1 }}
              />
            )}
          </Box>
        )}

        <Typography variant="body2" color="text.secondary">
          Insurance: {safeFormatDate(vehicle.insuranceExpiry)}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Inspection: {safeFormatDate(vehicle.inspectionExpiry)}
        </Typography>
      </CardContent>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem
          onClick={() => {
            onEdit(vehicle);
            handleMenuClose();
          }}
        >
          <EditIcon sx={{ mr: 1 }} fontSize="small" />
          Edit
        </MenuItem>
        <MenuItem
          onClick={() => {
            onDelete(vehicle);
            handleMenuClose();
          }}
        >
          <DeleteIcon sx={{ mr: 1 }} fontSize="small" />
          Delete
        </MenuItem>
        <MenuItem
          onClick={() => {
            onAnalytics(vehicle);
            handleMenuClose();
          }}
        >
          <AnalyticsIcon sx={{ mr: 1 }} fontSize="small" />
          Analytics
        </MenuItem>
        <MenuItem
          onClick={() => {
            onReports(vehicle);
            handleMenuClose();
          }}
        >
          <ReportIcon sx={{ mr: 1 }} fontSize="small" />
          Reports
        </MenuItem>
      </Menu>
    </Card>
  );
}

/**
 * Vehicles page component for managing fleet vehicles
 * @returns {JSX.Element} Vehicles page
 */
export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState([]);
  const [filteredVehicles, setFilteredVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");

  const router = useRouter();

  useEffect(() => {
    fetchVehicles();
  }, []);

  useEffect(() => {
    if (!searchTerm) {
      setFilteredVehicles(vehicles);
      return;
    }

    // Filter vehicles based on search term
    const filtered = vehicles.filter(
      (vehicle) =>
        (vehicle.regNumber || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (vehicle.make || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (vehicle.model || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (vehicle.year || "")
          .toString()
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (vehicle.color || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (vehicle.station || "").toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredVehicles(filtered);
  }, [vehicles, searchTerm]);

  /**
   * Fetch all vehicles from Firestore
   */
  const fetchVehicles = async () => {
    try {
      setLoading(true);
      setError("");

      // Debug: Check authentication state
      console.log("🔍 Auth state when fetching vehicles:", {
        currentUser: auth.currentUser,
        uid: auth.currentUser?.uid,
        email: auth.currentUser?.email,
      });

      if (!auth.currentUser) {
        setError("Authentication required. Please log in.");
        return;
      }

      const snapshot = await getDocs(collection(db, "vehicles"));
      const vehiclesList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setVehicles(vehiclesList);
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);

      if (error.code === "permission-denied") {
        setError(
          "Permission denied. Please check your authentication and try again."
        );
      } else {
        setError("Failed to load vehicles. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle vehicle edit
   * @param {Object} vehicle - Vehicle to edit
   */
  const handleEdit = (vehicle) => {
    router.push(`/vehicles/${vehicle.id}`);
  };

  /**
   * Handle vehicle analytics
   * @param {Object} vehicle - Vehicle for analytics
   */
  const handleAnalytics = (vehicle) => {
    router.push(`/vehicles/${vehicle.id}/analytics`);
  };

  /**
   * Handle vehicle reports
   * @param {Object} vehicle - Vehicle for reports
   */
  const handleReports = (vehicle) => {
    router.push(`/vehicles/${vehicle.id}/reports`);
  };

  /**
   * Handle vehicle deletion
   * @param {Object} vehicle - Vehicle to delete
   */
  const handleDelete = async (vehicle) => {
    if (
      !confirm(
        `Are you sure you want to delete vehicle ${vehicle.regNumber}? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      // Delete vehicle image from storage if exists
      if (vehicle.imageUrl) {
        try {
          const imageRef = ref(storage, vehicle.imageUrl);
          await deleteObject(imageRef);
        } catch (imageError) {
          console.warn("Failed to delete vehicle image:", imageError);
        }
      }

      // Delete vehicle document
      await deleteDoc(doc(db, "vehicles", vehicle.id));

      // Update local state
      setVehicles(vehicles.filter((v) => v.id !== vehicle.id));
    } catch (error) {
      console.error("Error deleting vehicle:", error);
      setError("Failed to delete vehicle. Please try again.");
    }
  };

  /**
   * Navigate to add new vehicle page
   */
  const handleAddVehicle = () => {
    router.push("/vehicles/add");
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight="400px"
          >
            <CircularProgress size={60} />
          </Box>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <Box>
          {/* Header */}
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={3}
          >
            <Box>
              <Typography variant="h4" gutterBottom fontWeight="bold">
                Fleet Vehicles
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Manage your fleet vehicles and track important information
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddVehicle}
            >
              Add Vehicle
            </Button>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Search and Filters */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <TextField
              fullWidth
              placeholder="Search vehicles by registration, make, model, year, color, or station..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Paper>

          {/* Vehicles Grid */}
          {filteredVehicles.length > 0 ? (
            <Grid container spacing={3}>
              {filteredVehicles.map((vehicle) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={vehicle.id}>
                  <VehicleCard
                    vehicle={vehicle}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onAnalytics={handleAnalytics}
                    onReports={handleReports}
                  />
                </Grid>
              ))}
            </Grid>
          ) : vehicles.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: "center" }}>
              <CarIcon sx={{ fontSize: 80, color: "grey.400", mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No vehicles in your fleet yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Start by adding your first vehicle to the fleet
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddVehicle}
              >
                Add Your First Vehicle
              </Button>
            </Paper>
          ) : (
            <Paper sx={{ p: 4, textAlign: "center" }}>
              <SearchIcon sx={{ fontSize: 80, color: "grey.400", mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No vehicles match your search
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Try adjusting your search terms or clear the search to see all
                vehicles
              </Typography>
            </Paper>
          )}
        </Box>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
