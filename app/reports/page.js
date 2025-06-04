"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Divider,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Menu,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from "recharts";
import {
  Assessment as ReportsIcon,
  GetApp as ExportIcon,
  TrendingUp as TrendingUpIcon,
  LocalGasStation as FuelIcon,
  Build as MaintenanceIcon,
  DirectionsCar as VehicleIcon,
  CalendarToday as CalendarIcon,
  CloudDownload as CloudDownloadIcon,
  Description as DescriptionIcon,
  ArrowDropDown as ArrowDropDownIcon,
} from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "../../lib/firebase";
import ProtectedRoute from "../../components/ProtectedRoute";
import DashboardLayout from "../../components/DashboardLayout";
import {
  format,
  startOfMonth,
  endOfMonth,
  subMonths,
  eachMonthOfInterval,
  startOfYear,
  endOfYear,
} from "date-fns";
import {
  exportToCSV,
  exportToJSON,
  formatVehicleAnalyticsForExport,
  formatMonthlyTrendsForExport,
  formatFinancialDataForExport,
  generateFleetReport,
} from "../../utils/exportHelpers";
import { formatKES } from "../../utils/exportHelpers";

/**
 * Reports page component with analytics and data export
 * @returns {JSX.Element} Reports page
 */
export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState(0);
  const [exportMenuAnchor, setExportMenuAnchor] = useState(null);
  const [dateRange, setDateRange] = useState({
    start: startOfYear(new Date()),
    end: endOfYear(new Date()),
  });
  const [reportPeriod, setReportPeriod] = useState("year");

  // Data states
  const [vehicles, setVehicles] = useState([]);
  const [fuelRecords, setFuelRecords] = useState([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState([]);
  const [analytics, setAnalytics] = useState({
    overview: {},
    monthly: [],
    vehicleBreakdown: [],
    trends: {},
    topExpenses: [],
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (
      vehicles.length > 0 &&
      fuelRecords.length > 0 &&
      maintenanceRecords.length > 0
    ) {
      calculateAnalytics();
    }
  }, [vehicles, fuelRecords, maintenanceRecords, dateRange]);

  /**
   * Fetch all data from Firebase
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

      // Fetch fuel records
      const fuelSnapshot = await getDocs(
        query(collection(db, "fuelRecords"), orderBy("date", "desc"))
      );
      const fuelList = fuelSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate(),
      }));

      // Fetch maintenance records
      const maintenanceSnapshot = await getDocs(
        query(collection(db, "maintenanceRecords"), orderBy("date", "desc"))
      );
      const maintenanceList = maintenanceSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate(),
      }));

      setVehicles(vehiclesList);
      setFuelRecords(fuelList);
      setMaintenanceRecords(maintenanceList);
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Failed to load reports data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Calculate comprehensive analytics
   */
  const calculateAnalytics = () => {
    const filteredFuel = fuelRecords.filter(
      (record) => record.date >= dateRange.start && record.date <= dateRange.end
    );
    const filteredMaintenance = maintenanceRecords.filter(
      (record) => record.date >= dateRange.start && record.date <= dateRange.end
    );

    // Overview calculations
    const totalFuelCost = filteredFuel.reduce(
      (sum, record) => sum + (record.cost || 0),
      0
    );
    const totalMaintenanceCost = filteredMaintenance.reduce(
      (sum, record) => sum + (record.cost || 0),
      0
    );
    const totalLiters = filteredFuel.reduce(
      (sum, record) => sum + (record.liters || 0),
      0
    );
    const averageFuelCost = totalLiters > 0 ? totalFuelCost / totalLiters : 0;

    // Monthly breakdown
    const months = eachMonthOfInterval({
      start: dateRange.start,
      end: dateRange.end,
    });
    const monthlyData = months.map((month) => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);

      const monthFuel = filteredFuel.filter(
        (record) => record.date >= monthStart && record.date <= monthEnd
      );
      const monthMaintenance = filteredMaintenance.filter(
        (record) => record.date >= monthStart && record.date <= monthEnd
      );

      const fuelCost = monthFuel.reduce(
        (sum, record) => sum + (record.cost || 0),
        0
      );
      const maintenanceCost = monthMaintenance.reduce(
        (sum, record) => sum + (record.cost || 0),
        0
      );
      const liters = monthFuel.reduce(
        (sum, record) => sum + (record.liters || 0),
        0
      );

      return {
        month: format(month, "MMM yyyy"),
        fuelCost: parseFloat(fuelCost.toFixed(2)),
        maintenanceCost: parseFloat(maintenanceCost.toFixed(2)),
        totalCost: parseFloat((fuelCost + maintenanceCost).toFixed(2)),
        liters: parseFloat(liters.toFixed(1)),
        fuelRecords: monthFuel.length,
        maintenanceRecords: monthMaintenance.length,
      };
    });

    // Vehicle breakdown
    const vehicleData = vehicles
      .map((vehicle) => {
        const vehicleFuel = filteredFuel.filter(
          (record) => record.vehicleId === vehicle.id
        );
        const vehicleMaintenance = filteredMaintenance.filter(
          (record) => record.vehicleId === vehicle.id
        );

        const fuelCost = vehicleFuel.reduce(
          (sum, record) => sum + (record.cost || 0),
          0
        );
        const maintenanceCost = vehicleMaintenance.reduce(
          (sum, record) => sum + (record.cost || 0),
          0
        );
        const liters = vehicleFuel.reduce(
          (sum, record) => sum + (record.liters || 0),
          0
        );

        return {
          id: vehicle.id,
          name: `${vehicle.regNumber} (${vehicle.make} ${vehicle.model})`,
          regNumber: vehicle.regNumber,
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year,
          fuelCost: parseFloat(fuelCost.toFixed(2)),
          maintenanceCost: parseFloat(maintenanceCost.toFixed(2)),
          totalCost: parseFloat((fuelCost + maintenanceCost).toFixed(2)),
          liters: parseFloat(liters.toFixed(1)),
          averageFuelCost:
            liters > 0 ? parseFloat((fuelCost / liters).toFixed(2)) : 0,
          fuelRecords: vehicleFuel.length,
          maintenanceRecords: vehicleMaintenance.length,
        };
      })
      .sort((a, b) => b.totalCost - a.totalCost);

    // Top expenses
    const allExpenses = [
      ...filteredFuel.map((record) => ({
        type: "Fuel",
        date: record.date,
        cost: record.cost,
        description: `Fuel - ${
          vehicles.find((v) => v.id === record.vehicleId)?.regNumber ||
          "Unknown"
        } - ${record.liters}L`,
        vehicle:
          vehicles.find((v) => v.id === record.vehicleId)?.regNumber ||
          "Unknown",
      })),
      ...filteredMaintenance.map((record) => ({
        type: "Maintenance",
        date: record.date,
        cost: record.cost,
        description: `${record.description} - ${
          vehicles.find((v) => v.id === record.vehicleId)?.regNumber ||
          "Unknown"
        }`,
        vehicle:
          vehicles.find((v) => v.id === record.vehicleId)?.regNumber ||
          "Unknown",
      })),
    ]
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 10);

    // Cost distribution for pie chart
    const costDistribution = [
      { name: "Fuel", value: totalFuelCost, color: "#8884d8" },
      { name: "Maintenance", value: totalMaintenanceCost, color: "#82ca9d" },
    ];

    setAnalytics({
      overview: {
        totalCost: totalFuelCost + totalMaintenanceCost,
        totalFuelCost,
        totalMaintenanceCost,
        totalLiters,
        averageFuelCost,
        totalVehicles: vehicles.length,
        activeVehicles: vehicleData.filter(
          (v) => v.fuelRecords > 0 || v.maintenanceRecords > 0
        ).length,
        totalFuelRecords: filteredFuel.length,
        totalMaintenanceRecords: filteredMaintenance.length,
      },
      monthly: monthlyData,
      vehicleBreakdown: vehicleData,
      topExpenses: allExpenses,
      costDistribution,
    });
  };

  /**
   * Export data to CSV
   */
  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) return;

    const headers = Object.keys(data[0]).join(",");
    const csvContent = [
      headers,
      ...data.map((row) =>
        Object.values(row)
          .map((value) =>
            typeof value === "string" && value.includes(",")
              ? `"${value}"`
              : value
          )
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `${filename}_${format(new Date(), "yyyy-MM-dd")}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /**
   * Handle export functions
   */
  const handleExportFleetReport = () => {
    const reportData = generateFleetReport(analytics, dateRange);
    exportToJSON(reportData, "comprehensive_fleet_report");
    setExportMenuAnchor(null);
  };

  const handleExportVehicleBreakdown = () => {
    const formattedData = formatVehicleAnalyticsForExport(
      analytics.vehicleBreakdown
    );
    exportToCSV(formattedData, "vehicle_breakdown");
    setExportMenuAnchor(null);
  };

  const handleExportMonthlyTrends = () => {
    const formattedData = formatMonthlyTrendsForExport(analytics.monthly);
    exportToCSV(formattedData, "monthly_trends");
    setExportMenuAnchor(null);
  };

  const handleExportTopExpenses = () => {
    const formattedData = formatFinancialDataForExport(analytics.topExpenses);
    exportToCSV(formattedData, "top_expenses");
    setExportMenuAnchor(null);
  };

  const handleExportMenuOpen = (event) => {
    setExportMenuAnchor(event.currentTarget);
  };

  const handleExportMenuClose = () => {
    setExportMenuAnchor(null);
  };

  /**
   * Handle date range change
   */
  const handlePeriodChange = (period) => {
    setReportPeriod(period);
    const now = new Date();

    switch (period) {
      case "month":
        setDateRange({
          start: startOfMonth(now),
          end: endOfMonth(now),
        });
        break;
      case "quarter":
        setDateRange({
          start: startOfMonth(subMonths(now, 2)),
          end: endOfMonth(now),
        });
        break;
      case "year":
        setDateRange({
          start: startOfYear(now),
          end: endOfYear(now),
        });
        break;
      default:
        break;
    }
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
                Reports & Analytics
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Comprehensive fleet performance insights and data export
              </Typography>
            </Box>
            <Box display="flex" gap={2}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Period</InputLabel>
                <Select
                  value={reportPeriod}
                  onChange={(e) => handlePeriodChange(e.target.value)}
                  label="Period"
                >
                  <MenuItem value="month">This Month</MenuItem>
                  <MenuItem value="quarter">Last 3 Months</MenuItem>
                  <MenuItem value="year">This Year</MenuItem>
                  <MenuItem value="custom">Custom Range</MenuItem>
                </Select>
              </FormControl>
              <Button
                variant="contained"
                startIcon={<ExportIcon />}
                endIcon={<ArrowDropDownIcon />}
                onClick={handleExportMenuOpen}
              >
                Export Report
              </Button>
            </Box>
          </Box>

          {/* Export Menu */}
          <Menu
            anchorEl={exportMenuAnchor}
            open={Boolean(exportMenuAnchor)}
            onClose={handleExportMenuClose}
            PaperProps={{
              sx: { minWidth: 200 },
            }}
          >
            <MenuItem onClick={handleExportFleetReport}>
              <ListItemIcon>
                <DescriptionIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Complete Report (JSON)"
                secondary="All data with metadata"
              />
            </MenuItem>
            <MenuItem onClick={handleExportVehicleBreakdown}>
              <ListItemIcon>
                <VehicleIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Vehicle Breakdown (CSV)"
                secondary="Per-vehicle analytics"
              />
            </MenuItem>
            <MenuItem onClick={handleExportMonthlyTrends}>
              <ListItemIcon>
                <TrendingUpIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Monthly Trends (CSV)"
                secondary="Time-based analysis"
              />
            </MenuItem>
            <MenuItem onClick={handleExportTopExpenses}>
              <ListItemIcon>
                <CloudDownloadIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Top Expenses (CSV)"
                secondary="Highest cost items"
              />
            </MenuItem>
          </Menu>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Date Range Picker */}
          {reportPeriod === "custom" && (
            <Paper sx={{ p: 2, mb: 3 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item>
                  <Typography variant="subtitle1">
                    Custom Date Range:
                  </Typography>
                </Grid>
                <Grid item>
                  <DatePicker
                    label="From Date"
                    value={dateRange.start}
                    onChange={(value) =>
                      setDateRange((prev) => ({ ...prev, start: value }))
                    }
                    format="dd-MM-yyyy"
                    renderInput={(params) => (
                      <TextField {...params} size="small" />
                    )}
                  />
                </Grid>
                <Grid item>
                  <DatePicker
                    label="To Date"
                    value={dateRange.end}
                    onChange={(value) =>
                      setDateRange((prev) => ({ ...prev, end: value }))
                    }
                    format="dd-MM-yyyy"
                    renderInput={(params) => (
                      <TextField {...params} size="small" />
                    )}
                  />
                </Grid>
              </Grid>
            </Paper>
          )}

          {/* Overview Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
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
                        Total Cost
                      </Typography>
                      <Typography variant="h5" fontWeight="bold">
                        {formatKES(analytics.overview.totalCost || 0)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Fuel + Maintenance
                      </Typography>
                    </Box>
                    <ReportsIcon color="primary" sx={{ fontSize: 40 }} />
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
                        Fuel Cost
                      </Typography>
                      <Typography variant="h5" fontWeight="bold">
                        {formatKES(analytics.overview.totalFuelCost || 0)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {analytics.overview.totalLiters?.toFixed(1) || "0.0"}L
                        consumed
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
                        Maintenance Cost
                      </Typography>
                      <Typography variant="h5" fontWeight="bold">
                        {formatKES(
                          analytics.overview.totalMaintenanceCost || 0
                        )}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {analytics.overview.totalMaintenanceRecords || 0}{" "}
                        records
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
                        Active Vehicles
                      </Typography>
                      <Typography variant="h5" fontWeight="bold">
                        {analytics.overview.activeVehicles || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        of {analytics.overview.totalVehicles || 0} total
                      </Typography>
                    </Box>
                    <VehicleIcon color="info" sx={{ fontSize: 40 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Tabs for different views */}
          <Paper sx={{ mb: 3 }}>
            <Tabs
              value={activeTab}
              onChange={(e, newValue) => setActiveTab(newValue)}
            >
              <Tab label="Monthly Trends" />
              <Tab label="Vehicle Breakdown" />
              <Tab label="Cost Distribution" />
              <Tab label="Top Expenses" />
            </Tabs>
          </Paper>

          {/* Tab Content */}
          {activeTab === 0 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Paper sx={{ p: 3 }}>
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    mb={2}
                  >
                    <Typography variant="h6">Monthly Cost Trends</Typography>
                    <Button
                      variant="outlined"
                      startIcon={<ExportIcon />}
                      onClick={handleExportMonthlyTrends}
                    >
                      Export Monthly Data
                    </Button>
                  </Box>
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={analytics.monthly}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => [formatKES(value), ""]} />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="fuelCost"
                        stackId="1"
                        stroke="#8884d8"
                        fill="#8884d8"
                        name="Fuel Cost"
                      />
                      <Area
                        type="monotone"
                        dataKey="maintenanceCost"
                        stackId="1"
                        stroke="#82ca9d"
                        fill="#82ca9d"
                        name="Maintenance Cost"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Fuel Consumption Trend
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analytics.monthly}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => [formatKES(value), ""]} />
                      <Line
                        type="monotone"
                        dataKey="liters"
                        stroke="#ff7300"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Record Activity
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.monthly}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar
                        dataKey="fuelRecords"
                        fill="#8884d8"
                        name="Fuel Records"
                      />
                      <Bar
                        dataKey="maintenanceRecords"
                        fill="#82ca9d"
                        name="Maintenance Records"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>
            </Grid>
          )}

          {activeTab === 1 && (
            <Paper sx={{ p: 3 }}>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={2}
              >
                <Typography variant="h6">
                  Vehicle Performance Breakdown
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<ExportIcon />}
                  onClick={handleExportVehicleBreakdown}
                >
                  Export Vehicle Data
                </Button>
              </Box>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Vehicle</TableCell>
                      <TableCell align="right">Total Cost</TableCell>
                      <TableCell align="right">Fuel Cost</TableCell>
                      <TableCell align="right">Maintenance Cost</TableCell>
                      <TableCell align="right">Fuel Consumed</TableCell>
                      <TableCell align="right">Avg Fuel Cost/L</TableCell>
                      <TableCell align="center">Records</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {analytics.vehicleBreakdown.map((vehicle) => (
                      <TableRow key={vehicle.id}>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {vehicle.regNumber}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {vehicle.make} {vehicle.model} ({vehicle.year})
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="medium">
                            {formatKES(vehicle.totalCost)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          {formatKES(vehicle.fuelCost)}
                        </TableCell>
                        <TableCell align="right">
                          {formatKES(vehicle.maintenanceCost)}
                        </TableCell>
                        <TableCell align="right">{vehicle.liters}L</TableCell>
                        <TableCell align="right">
                          {formatKES(vehicle.averageFuelCost)}
                        </TableCell>
                        <TableCell align="center">
                          <Box display="flex" gap={1} justifyContent="center">
                            <Chip
                              size="small"
                              label={`F: ${vehicle.fuelRecords}`}
                              color="primary"
                              variant="outlined"
                            />
                            <Chip
                              size="small"
                              label={`M: ${vehicle.maintenanceRecords}`}
                              color="secondary"
                              variant="outlined"
                            />
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}

          {activeTab === 2 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Cost Distribution
                  </Typography>
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <Pie
                        data={analytics.costDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {analytics.costDistribution?.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [formatKES(value), ""]} />
                    </PieChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Vehicle Cost Comparison
                  </Typography>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart
                      data={analytics.vehicleBreakdown.slice(0, 10)}
                      layout="horizontal"
                      margin={{ left: 100 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="regNumber" width={80} />
                      <Tooltip formatter={(value) => [formatKES(value), ""]} />
                      <Legend />
                      <Bar
                        dataKey="fuelCost"
                        stackId="a"
                        fill="#8884d8"
                        name="Fuel"
                      />
                      <Bar
                        dataKey="maintenanceCost"
                        stackId="a"
                        fill="#82ca9d"
                        name="Maintenance"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>
            </Grid>
          )}

          {activeTab === 3 && (
            <Paper sx={{ p: 3 }}>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={2}
              >
                <Typography variant="h6">Top 10 Expenses</Typography>
                <Button
                  variant="outlined"
                  startIcon={<ExportIcon />}
                  onClick={handleExportTopExpenses}
                >
                  Export Expenses
                </Button>
              </Box>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Vehicle</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell align="right">Cost</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {analytics.topExpenses.map((expense, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          {format(expense.date, "dd-MM-yyyy")}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={expense.type}
                            color={
                              expense.type === "Fuel" ? "primary" : "secondary"
                            }
                          />
                        </TableCell>
                        <TableCell>{expense.vehicle}</TableCell>
                        <TableCell>{expense.description}</TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="medium">
                            {formatKES(expense.cost)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}
        </Box>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
