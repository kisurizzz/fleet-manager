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
  Chip,
  Grid,
  Card,
  CardContent,
  FormControlLabel,
  Checkbox,
  IconButton,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import {
  Add as AddIcon,
  LocalGasStation as FuelIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  GetApp as ExportIcon,
  Edit as EditIcon,
} from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import {
  addDoc,
  collection,
  getDocs,
  query,
  orderBy,
  where,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import ProtectedRoute from "../../components/ProtectedRoute";
import DashboardLayout from "../../components/DashboardLayout";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { formatKES } from "../../utils/exportHelpers";
import { auth } from "../../lib/firebase";

/**
 * Fuel records page component
 * @returns {JSX.Element} Fuel records page
 */
export default function FuelRecordsPage() {
  const [fuelRecords, setFuelRecords] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterVehicle, setFilterVehicle] = useState("");
  const [filterDateRange, setFilterDateRange] = useState({
    start: null,
    end: null,
  });

  // New fuel record form data
  const [formData, setFormData] = useState({
    vehicleId: "",
    date: null,
    liters: "",
    cost: "",
    station: "",
    odometerReading: "",
    kmTraveled: "",
    fuelType: "Petrol",
    isFullTank: true,
    fillType: "full",
    receiptImage: "",
    notes: "",
    createdBy: auth.currentUser?.uid || "",
  });

  // Statistics
  const [stats, setStats] = useState({
    totalCost: 0,
    totalLiters: 0,
    averageCostPerLiter: 0,
    monthlyTotal: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [fuelRecords, searchTerm, filterVehicle, filterDateRange]);

  useEffect(() => {
    calculateStats();
  }, [filteredRecords]);

  // Set default date after hydration to avoid SSR mismatch
  useEffect(() => {
    if (formData.date === null && !editMode) {
      setFormData((prev) => ({
        ...prev,
        date: new Date(),
      }));
    }
  }, [formData.date, editMode]);

  /**
   * Fetch fuel records and vehicles data
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

      // Fetch fuel records
      const fuelSnapshot = await getDocs(
        query(collection(db, "fuelRecords"), orderBy("date", "desc"))
      );

      const fuelList = fuelSnapshot.docs.map((doc) => {
        const data = doc.data();
        const vehicle = vehiclesList.find((v) => v.id === data.vehicleId);
        const date = data.date?.toDate();

        return {
          id: doc.id,
          ...data,
          date: date,
          vehicleName: vehicle
            ? `${vehicle.regNumber} (${vehicle.make} ${vehicle.model})`
            : "Unknown Vehicle",
          formattedDate: date ? format(date, "dd-MM-yyyy") : "N/A",
          cost: Number(data.cost || 0),
          liters: Number(data.liters || 0),
          odometerReading: Number(data.odometerReading || 0),
          kmTraveled: Number(data.kmTraveled || 0),
          fuelEfficiency: Number(data.fuelEfficiency || 0),
        };
      });

      setFuelRecords(fuelList);
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Failed to load fuel records. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Apply search and filter criteria
   */
  const applyFilters = () => {
    let filtered = [...fuelRecords];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (record) =>
          record.vehicleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          record.station.toLowerCase().includes(searchTerm.toLowerCase())
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
    const totalLiters = filteredRecords.reduce(
      (sum, record) => sum + (record.liters || 0),
      0
    );
    const averageCostPerLiter = totalLiters > 0 ? totalCost / totalLiters : 0;

    // Calculate current month total
    const currentMonth = new Date();
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    const monthlyRecords = fuelRecords.filter((record) => {
      const recordDate = record.date;
      return recordDate >= monthStart && recordDate <= monthEnd;
    });

    const monthlyTotal = monthlyRecords.reduce(
      (sum, record) => sum + (record.cost || 0),
      0
    );

    setStats({
      totalCost,
      totalLiters,
      averageCostPerLiter,
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
   * Calculate fuel efficiency when liters and km traveled are available
   */
  const calculateFuelEfficiency = () => {
    const liters = parseFloat(formData.liters);
    const km = parseFloat(formData.kmTraveled);

    // Only calculate efficiency for full tank records with valid data
    if (formData.isFullTank && liters > 0 && km > 0) {
      return (km / liters).toFixed(2);
    }
    return null;
  };

  /**
   * Handle checkbox change for isFullTank
   */
  const handleFullTankChange = (event) => {
    const isFullTank = event.target.checked;
    setFormData((prev) => ({
      ...prev,
      isFullTank,
      fillType: isFullTank ? "full" : "partial",
    }));
  };

  /**
   * Handle form submission
   * @param {Event} event - Form submit event
   */
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.vehicleId || !formData.liters || !formData.cost) {
      setError("Please fill in all required fields");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const fuelEfficiency = calculateFuelEfficiency();

      const fuelData = {
        vehicleId: formData.vehicleId,
        date: formData.date,
        liters: parseFloat(formData.liters),
        cost: parseFloat(formData.cost),
        station: formData.station,
        odometerReading: formData.odometerReading
          ? parseFloat(formData.odometerReading)
          : null,
        kmTraveled: formData.kmTraveled
          ? parseFloat(formData.kmTraveled)
          : null,
        fuelEfficiency: fuelEfficiency ? parseFloat(fuelEfficiency) : null,
        fuelType: formData.fuelType,
        isFullTank: formData.isFullTank,
        fillType: formData.fillType,
        receiptImage: formData.receiptImage,
        notes: formData.notes,
        createdBy: formData.createdBy || auth.currentUser?.uid || "",
      };

      if (editMode && editingRecord) {
        // Update existing record
        fuelData.updatedAt = new Date();
        await updateDoc(doc(db, "fuelRecords", editingRecord.id), fuelData);
      } else {
        // Add new record
        fuelData.createdAt = new Date();
        await addDoc(collection(db, "fuelRecords"), fuelData);
      }

      // Reset form and close dialog
      resetForm();

      // Refresh data
      await fetchData();
    } catch (error) {
      console.error(
        `Error ${editMode ? "updating" : "adding"} fuel record:`,
        error
      );
      setError(
        `Failed to ${
          editMode ? "update" : "add"
        } fuel record. Please try again.`
      );
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

  /**
   * Handle edit button click
   */
  const handleEditRecord = (record) => {
    setEditMode(true);
    setEditingRecord(record);

    // Populate form with existing data
    setFormData({
      vehicleId: record.vehicleId || "",
      date: record.date || null,
      liters: record.liters || "",
      cost: record.cost || "",
      station: record.station || "",
      odometerReading: record.odometerReading || "",
      kmTraveled: record.kmTraveled || "",
      fuelType: record.fuelType || "Petrol",
      isFullTank: record.fillType === "full",
      fillType: record.fillType || "full",
      receiptImage: record.receiptImage || "",
      notes: record.notes || "",
      createdBy: record.createdBy || auth.currentUser?.uid || "",
    });

    setDialogOpen(true);
  };

  /**
   * Reset form and dialog state
   */
  const resetForm = () => {
    setFormData({
      vehicleId: "",
      date: null,
      liters: "",
      cost: "",
      station: "",
      odometerReading: "",
      kmTraveled: "",
      fuelType: "Petrol",
      isFullTank: true,
      fillType: "full",
      receiptImage: "",
      notes: "",
      createdBy: auth.currentUser?.uid || "",
    });
    setEditMode(false);
    setEditingRecord(null);
    setDialogOpen(false);
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
      field: "liters",
      headerName: "Liters",
      width: 100,
      type: "number",
      valueFormatter: (value) => {
        if (value === undefined || value === null) {
          return "0L";
        }
        return `${Number(value).toFixed(1)}L`;
      },
    },
    {
      field: "cost",
      headerName: "Cost",
      width: 120,
      type: "number",
      valueFormatter: (value) => {
        if (value === undefined || value === null) {
          return formatKES(0);
        }
        return formatKES(Number(value));
      },
    },
    {
      field: "costPerLiter",
      headerName: "Cost/Liter",
      width: 120,
      type: "number",
      valueGetter: (params) => {
        const row = params.row;
        if (!row || !row.cost || !row.liters || row.liters === 0) {
          return 0;
        }
        return Number(row.cost) / Number(row.liters);
      },
      valueFormatter: (value) => {
        if (value === undefined || value === null || value === 0) {
          return "N/A";
        }
        return formatKES(Number(value));
      },
    },
    {
      field: "fuelEfficiency",
      headerName: "km/L",
      width: 100,
      type: "number",
      valueFormatter: (value) => {
        if (value === undefined || value === null || value === 0) {
          return "N/A";
        }
        return `${Number(value).toFixed(1)} km/L`;
      },
    },
    {
      field: "fillType",
      headerName: "Fill Type",
      width: 100,
      valueFormatter: (value) => {
        if (!value) {
          return "Unknown";
        }
        return value === "full" ? "Full Tank" : "Partial";
      },
      renderCell: (params) => {
        const isFullTank = params.value === "full";
        return (
          <Chip
            label={isFullTank ? "Full Tank" : "Partial"}
            color={isFullTank ? "success" : "default"}
            size="small"
            variant={isFullTank ? "filled" : "outlined"}
          />
        );
      },
    },
    {
      field: "odometerReading",
      headerName: "Odometer",
      width: 120,
      type: "number",
      valueFormatter: (value) => {
        if (value === undefined || value === null || value === 0) {
          return "N/A";
        }
        return `${Number(value).toLocaleString()} km`;
      },
    },
    {
      field: "station",
      headerName: "Station",
      width: 200,
      sortable: true,
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <IconButton
            size="small"
            onClick={() => handleEditRecord(params.row)}
            color="primary"
            title="Edit Record"
          >
            <EditIcon />
          </IconButton>
        </Box>
      ),
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
                Fuel Records
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Track fuel consumption and costs for your fleet
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                resetForm();
                setDialogOpen(true);
              }}
            >
              Add Fuel Record
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
                    <FuelIcon color="primary" sx={{ fontSize: 40 }} />
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
                        Total Liters
                      </Typography>
                      <Typography variant="h5" fontWeight="bold">
                        {stats.totalLiters.toFixed(1)}L
                      </Typography>
                    </Box>
                    <FuelIcon color="success" sx={{ fontSize: 40 }} />
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
                        Avg Cost/Liter
                      </Typography>
                      <Typography variant="h5" fontWeight="bold">
                        {formatKES(stats.averageCostPerLiter)}
                      </Typography>
                    </Box>
                    <FuelIcon color="warning" sx={{ fontSize: 40 }} />
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
                    <FuelIcon color="error" sx={{ fontSize: 40 }} />
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
                  placeholder="Search by vehicle or station..."
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
                    <FuelIcon sx={{ fontSize: 80, color: "grey.400", mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">
                      No fuel records found
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Add your first fuel record to get started
                    </Typography>
                  </Box>
                ),
              }}
            />
          </Paper>

          {/* Add Fuel Record Dialog */}
          <Dialog
            open={dialogOpen}
            onClose={() => setDialogOpen(false)}
            maxWidth="md"
            fullWidth
          >
            <DialogTitle>
              {editMode ? "Edit Fuel Record" : "Add Fuel Record"}
            </DialogTitle>
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
                  <Grid item xs={12} sm={6}>
                    <DatePicker
                      label="Date"
                      value={formData.date}
                      onChange={handleDateChange}
                      renderInput={(params) => (
                        <TextField {...params} fullWidth required />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Fuel Type</InputLabel>
                      <Select
                        name="fuelType"
                        value={formData.fuelType}
                        onChange={handleInputChange}
                        label="Fuel Type"
                      >
                        <MenuItem value="Petrol">Petrol</MenuItem>
                        <MenuItem value="Diesel">Diesel</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      required
                      name="liters"
                      label="Liters"
                      type="number"
                      value={formData.liters}
                      onChange={handleInputChange}
                      inputProps={{ min: 0, step: 0.01 }}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">L</InputAdornment>
                        ),
                      }}
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
                      name="odometerReading"
                      label="Odometer Reading"
                      type="number"
                      value={formData.odometerReading}
                      onChange={handleInputChange}
                      inputProps={{ min: 0 }}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">km</InputAdornment>
                        ),
                      }}
                      helperText="Current odometer reading"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      name="kmTraveled"
                      label="Distance Traveled"
                      type="number"
                      value={formData.kmTraveled}
                      onChange={handleInputChange}
                      inputProps={{ min: 0 }}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">km</InputAdornment>
                        ),
                      }}
                      helperText="Distance since last fuel-up"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.isFullTank}
                          onChange={handleFullTankChange}
                          name="isFullTank"
                          color="primary"
                        />
                      }
                      label="Full Tank"
                    />
                    <Typography
                      variant="caption"
                      display="block"
                      color="text.secondary"
                    >
                      Check this box if you filled the tank completely.
                      Efficiency is only calculated for full tank records.
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      name="station"
                      label="Gas Station"
                      value={formData.station}
                      onChange={handleInputChange}
                      placeholder="e.g., Shell, Total, Kenol"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      name="notes"
                      label="Notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      placeholder="Additional notes (optional)"
                      multiline
                      rows={2}
                    />
                  </Grid>
                  {formData.isFullTank &&
                    formData.liters &&
                    formData.kmTraveled &&
                    calculateFuelEfficiency() && (
                      <Grid item xs={12}>
                        <Alert severity="success">
                          <Typography variant="body2">
                            <strong>Calculated Fuel Efficiency:</strong>{" "}
                            {calculateFuelEfficiency()} km/L
                          </Typography>
                          <Typography variant="caption" display="block">
                            Efficiency calculated for full tank record
                          </Typography>
                        </Alert>
                      </Grid>
                    )}
                  {!formData.isFullTank &&
                    formData.liters &&
                    formData.kmTraveled && (
                      <Grid item xs={12}>
                        <Alert severity="info">
                          <Typography variant="body2">
                            Partial fill detected - efficiency will not be
                            calculated
                          </Typography>
                          <Typography variant="caption" display="block">
                            Check "Full Tank" for accurate efficiency
                            calculation
                          </Typography>
                        </Alert>
                      </Grid>
                    )}
                </Grid>
              </DialogContent>
              <DialogActions>
                <Button onClick={resetForm} disabled={saving}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={saving}
                  startIcon={
                    saving ? (
                      <CircularProgress size={20} />
                    ) : editMode ? (
                      <EditIcon />
                    ) : (
                      <AddIcon />
                    )
                  }
                >
                  {saving
                    ? editMode
                      ? "Updating..."
                      : "Adding..."
                    : editMode
                    ? "Update Record"
                    : "Add Record"}
                </Button>
              </DialogActions>
            </form>
          </Dialog>
        </Box>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
