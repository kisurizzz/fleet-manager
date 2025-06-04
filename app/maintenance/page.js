"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import {
  Add as AddIcon,
  Build as MaintenanceIcon,
  Search as SearchIcon,
} from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import {
  addDoc,
  collection,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import ProtectedRoute from "../../components/ProtectedRoute";
import DashboardLayout from "../../components/DashboardLayout";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { formatKES } from "../../utils/exportHelpers";
import { auth } from "../../lib/firebase";

/**
 * Maintenance records page component
 * @returns {JSX.Element} Maintenance records page
 */
export default function MaintenanceRecordsPage() {
  const [maintenanceRecords, setMaintenanceRecords] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterVehicle, setFilterVehicle] = useState("");
  const [filterDateRange, setFilterDateRange] = useState({
    start: null,
    end: null,
  });

  // Form data for new maintenance record
  const [formData, setFormData] = useState({
    vehicleId: "",
    date: null,
    description: "",
    cost: "",
    serviceProvider: "",
    notes: "",
    createdBy: auth.currentUser?.uid || "",
  });

  // Statistics
  const [stats, setStats] = useState({
    totalCost: 0,
    recordCount: 0,
    averageCost: 0,
    monthlyTotal: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [maintenanceRecords, searchTerm, filterVehicle, filterDateRange]);

  useEffect(() => {
    calculateStats();
  }, [filteredRecords]);

  // Set default date after hydration to avoid SSR mismatch
  useEffect(() => {
    if (formData.date === null) {
      setFormData((prev) => ({
        ...prev,
        date: new Date(),
      }));
    }
  }, [formData.date]);

  /**
   * Fetch maintenance records and vehicles data
   */
  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");

      // Fetch vehicles
      const vehiclesSnapshot = await getDocs(collection(db, "vehicles"));
      const vehiclesList = vehiclesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setVehicles(vehiclesList);

      // Fetch maintenance records
      const maintenanceSnapshot = await getDocs(
        query(collection(db, "maintenanceRecords"), orderBy("date", "desc"))
      );

      const maintenanceList = maintenanceSnapshot.docs.map((doc) => {
        const data = doc.data();
        const vehicle = vehiclesList.find((v) => v.id === data.vehicleId);
        return {
          id: doc.id,
          ...data,
          date: data.date?.toDate(),
          vehicleName: vehicle
            ? `${vehicle.regNumber} (${vehicle.make} ${vehicle.model})`
            : "Unknown Vehicle",
          formattedDate: data.date
            ? format(data.date.toDate(), "dd-MM-yyyy")
            : "",
        };
      });

      setMaintenanceRecords(maintenanceList);
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Failed to load maintenance records. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Apply search and filter criteria
   */
  const applyFilters = () => {
    let filtered = [...maintenanceRecords];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (record) =>
          record.vehicleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          record.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          record.serviceProvider
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
      );
    }

    // Vehicle filter
    if (filterVehicle) {
      filtered = filtered.filter(
        (record) => record.vehicleId === filterVehicle
      );
    }

    // Date range filter
    if (filterDateRange.start && filterDateRange.end) {
      filtered = filtered.filter((record) => {
        const recordDate = record.date;
        return (
          recordDate >= filterDateRange.start &&
          recordDate <= filterDateRange.end
        );
      });
    }

    setFilteredRecords(filtered);
  };

  /**
   * Calculate statistics from filtered records
   */
  const calculateStats = () => {
    const totalCost = filteredRecords.reduce(
      (sum, record) => sum + (record.cost || 0),
      0
    );
    const recordCount = filteredRecords.length;
    const averageCost = recordCount > 0 ? totalCost / recordCount : 0;

    // Calculate current month total
    const currentMonth = new Date();
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    const monthlyRecords = maintenanceRecords.filter((record) => {
      const recordDate = record.date;
      return recordDate >= monthStart && recordDate <= monthEnd;
    });

    const monthlyTotal = monthlyRecords.reduce(
      (sum, record) => sum + (record.cost || 0),
      0
    );

    setStats({
      totalCost,
      recordCount,
      averageCost,
      monthlyTotal,
    });
  };

  /**
   * Handle form input changes
   * @param {Event} event - Input change event
   */
  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /**
   * Handle date change
   * @param {Date} value - Selected date
   */
  const handleDateChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      date: value,
    }));
  };

  /**
   * Handle form submission
   * @param {Event} event - Form submit event
   */
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.vehicleId || !formData.description || !formData.cost) {
      setError("Please fill in all required fields");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const maintenanceData = {
        vehicleId: formData.vehicleId,
        date: formData.date,
        description: formData.description,
        cost: parseFloat(formData.cost),
        serviceProvider: formData.serviceProvider,
        createdAt: new Date(),
      };

      await addDoc(collection(db, "maintenanceRecords"), maintenanceData);

      // Reset form and close dialog
      setFormData({
        vehicleId: "",
        date: null,
        description: "",
        cost: "",
        serviceProvider: "",
        notes: "",
        createdBy: auth.currentUser?.uid || "",
      });
      setDialogOpen(false);

      // Refresh data
      await fetchData();
    } catch (error) {
      console.error("Error adding maintenance record:", error);
      setError("Failed to add maintenance record. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  /**
   * Clear all filters
   */
  const clearFilters = () => {
    setSearchTerm("");
    setFilterVehicle("");
    setFilterDateRange({ start: null, end: null });
  };

  // DataGrid columns
  const columns = [
    {
      field: "formattedDate",
      headerName: "Date",
      width: 120,
      sortable: true,
    },
    {
      field: "vehicleName",
      headerName: "Vehicle",
      width: 250,
      sortable: true,
    },
    {
      field: "description",
      headerName: "Description",
      width: 300,
      sortable: true,
    },
    {
      field: "cost",
      headerName: "Cost",
      width: 120,
      type: "number",
      valueFormatter: ({ value }) => formatKES(value || 0),
    },
    {
      field: "serviceProvider",
      headerName: "Service Provider",
      width: 200,
      sortable: true,
    },
  ];

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
                Maintenance Records
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Track vehicle maintenance activities and costs
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setDialogOpen(true)}
            >
              Add Maintenance Record
            </Button>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Statistics Cards */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Box>
                      <Typography color="text.secondary" gutterBottom>
                        Total Cost (Filtered)
                      </Typography>
                      <Typography variant="h5" fontWeight="bold">
                        {formatKES(stats.totalCost)}
                      </Typography>
                    </Box>
                    <MaintenanceIcon color="primary" sx={{ fontSize: 40 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Box>
                      <Typography color="text.secondary" gutterBottom>
                        Records Count
                      </Typography>
                      <Typography variant="h5" fontWeight="bold">
                        {stats.recordCount}
                      </Typography>
                    </Box>
                    <MaintenanceIcon color="success" sx={{ fontSize: 40 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Box>
                      <Typography color="text.secondary" gutterBottom>
                        Average Cost
                      </Typography>
                      <Typography variant="h5" fontWeight="bold">
                        {formatKES(stats.averageCost)}
                      </Typography>
                    </Box>
                    <MaintenanceIcon color="warning" sx={{ fontSize: 40 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Box>
                      <Typography color="text.secondary" gutterBottom>
                        This Month
                      </Typography>
                      <Typography variant="h5" fontWeight="bold">
                        {formatKES(stats.monthlyTotal)}
                      </Typography>
                    </Box>
                    <MaintenanceIcon color="error" sx={{ fontSize: 40 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Filters */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  placeholder="Search by vehicle, description, or service provider..."
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
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Filter by Vehicle</InputLabel>
                  <Select
                    value={filterVehicle}
                    onChange={(e) => setFilterVehicle(e.target.value)}
                    label="Filter by Vehicle"
                  >
                    <MenuItem value="">All Vehicles</MenuItem>
                    {vehicles.map((vehicle) => (
                      <MenuItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.regNumber} ({vehicle.make} {vehicle.model})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <DatePicker
                  label="From Date"
                  value={filterDateRange.start}
                  onChange={(value) =>
                    setFilterDateRange((prev) => ({ ...prev, start: value }))
                  }
                  format="dd-MM-yyyy"
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <DatePicker
                  label="To Date"
                  value={filterDateRange.end}
                  onChange={(value) =>
                    setFilterDateRange((prev) => ({ ...prev, end: value }))
                  }
                  format="dd-MM-yyyy"
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </Grid>
              <Grid item xs={12} md={1}>
                <Button variant="outlined" onClick={clearFilters} fullWidth>
                  Clear
                </Button>
              </Grid>
            </Grid>
          </Paper>

          {/* Data Grid */}
          <Paper sx={{ height: 600, width: "100%" }}>
            <DataGrid
              rows={filteredRecords}
              columns={columns}
              pageSize={25}
              rowsPerPageOptions={[25, 50, 100]}
              disableSelectionOnClick
              density="comfortable"
              loading={loading}
              components={{
                NoRowsOverlay: () => (
                  <Box
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                    justifyContent="center"
                    height="100%"
                  >
                    <MaintenanceIcon
                      sx={{ fontSize: 80, color: "grey.400", mb: 2 }}
                    />
                    <Typography variant="h6" color="text.secondary">
                      No maintenance records found
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Add your first maintenance record to get started
                    </Typography>
                  </Box>
                ),
              }}
            />
          </Paper>

          {/* Add Maintenance Record Dialog */}
          <Dialog
            open={dialogOpen}
            onClose={() => setDialogOpen(false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>Add Maintenance Record</DialogTitle>
            <form onSubmit={handleSubmit}>
              <DialogContent>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <FormControl fullWidth required>
                      <InputLabel>Vehicle</InputLabel>
                      <Select
                        name="vehicleId"
                        value={formData.vehicleId}
                        onChange={handleInputChange}
                        label="Vehicle"
                      >
                        {vehicles.map((vehicle) => (
                          <MenuItem key={vehicle.id} value={vehicle.id}>
                            {vehicle.regNumber} ({vehicle.make} {vehicle.model})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <DatePicker
                      label="Date"
                      value={formData.date}
                      onChange={handleDateChange}
                      format="dd-MM-yyyy"
                      renderInput={(params) => (
                        <TextField {...params} fullWidth required />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      required
                      name="description"
                      label="Description"
                      multiline
                      rows={3}
                      value={formData.description}
                      onChange={handleInputChange}
                      placeholder="e.g., Oil change, brake pad replacement, tire rotation..."
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      required
                      name="cost"
                      label="Cost"
                      type="number"
                      value={formData.cost}
                      onChange={handleInputChange}
                      inputProps={{ min: 0, step: 0.01 }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">KES</InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      name="serviceProvider"
                      label="Service Provider"
                      value={formData.serviceProvider}
                      onChange={handleInputChange}
                      placeholder="e.g., AA Kenya, Quick Fix Garage"
                    />
                  </Grid>
                </Grid>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setDialogOpen(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={saving}
                  startIcon={
                    saving ? <CircularProgress size={20} /> : <AddIcon />
                  }
                >
                  {saving ? "Adding..." : "Add Record"}
                </Button>
              </DialogActions>
            </form>
          </Dialog>
        </Box>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
