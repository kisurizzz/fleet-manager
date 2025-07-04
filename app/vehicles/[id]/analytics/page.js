"use client";

import { useState, useEffect, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Typography,
  Paper,
  TextField,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Chip,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  LocalGasStation as FuelIcon,
  Build as MaintenanceIcon,
  Speed as SpeedIcon,
  AttachMoney as MoneyIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  ArrowBack as BackIcon,
  PictureAsPdf as PdfIcon,
  GetApp as ExportIcon,
  Visibility as ViewIcon,
  FilterList as FilterIcon,
} from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../../../lib/firebase";
import ProtectedRoute from "../../../../components/ProtectedRoute";
import DashboardLayout from "../../../../components/DashboardLayout";
import {
  format,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfDay,
  endOfDay,
} from "date-fns";
import { formatKES } from "../../../../utils/exportHelpers";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";
import {
  calculateVehicleAnalytics,
  groupFuelRecordsByMonth,
  analyzeFuelEfficiency,
  generateFuelConsumptionChartData,
  generateEfficiencyTrendData,
  analyzeMaintenancePatterns,
  analyzeCostOptimization,
  calculateDistanceBetweenFueling,
} from "../../../../utils/analyticsHelpers";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  ChartTooltip,
  Legend
);

/**
 * Tab panel component
 */
function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`analytics-tabpanel-${index}`}
      aria-labelledby={`analytics-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

/**
 * Safely format numeric values with default fallback
 */
const safeToFixed = (value, decimals = 2, fallback = 0) => {
  if (value === null || value === undefined || isNaN(value)) {
    return fallback.toFixed(decimals);
  }
  return Number(value).toFixed(decimals);
};

/**
 * Safely get numeric value with fallback
 */
const safeNumber = (value, fallback = 0) => {
  if (value === null || value === undefined || isNaN(value)) {
    return fallback;
  }
  return Number(value);
};

/**
 * Vehicle Analytics Page Component
 */
export default function VehicleAnalyticsPage({ params }) {
  const router = useRouter();
  const vehicleId = params.id;

  // State management
  const [vehicle, setVehicle] = useState(null);
  const [fuelRecords, setFuelRecords] = useState([]);
  const [processedFuelRecords, setProcessedFuelRecords] = useState([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState(0);
  const [dateRange, setDateRange] = useState({
    start: startOfMonth(new Date()),
    end: new Date(),
  });
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [analytics, setAnalytics] = useState({
    totalLiters: 0,
    totalFuelCost: 0,
    averageEfficiency: 0,
    fuelUps: 0,
    totalDistance: 0,
    totalMaintenanceCost: 0,
    maintenanceCount: 0,
    costPerKm: 0,
    previousMonthCost: 0,
    currentMonthCost: 0,
    averageDistanceBetweenFueling: 0,
    fullTankCount: 0,
    partialFillCount: 0,
    incompleteRecordsCount: 0,
  });

  // Pagination state
  const [fuelPage, setFuelPage] = useState(0);
  const [fuelRowsPerPage, setFuelRowsPerPage] = useState(10);
  const [maintenancePage, setMaintenancePage] = useState(0);
  const [maintenanceRowsPerPage, setMaintenanceRowsPerPage] = useState(10);

  /**
   * Fetch vehicle data and analytics
   */
  const fetchVehicleData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      // Fetch vehicle details
      const vehicleDoc = await getDoc(doc(db, "vehicles", vehicleId));
      if (!vehicleDoc.exists()) {
        setError("Vehicle not found");
        return;
      }
      setVehicle({ id: vehicleDoc.id, ...vehicleDoc.data() });

      // Fetch fuel records for date range
      const fuelQuery = query(
        collection(db, "fuelRecords"),
        where("vehicleId", "==", vehicleId),
        where("date", ">=", Timestamp.fromDate(startOfDay(dateRange.start))),
        where("date", "<=", Timestamp.fromDate(endOfDay(dateRange.end))),
        orderBy("date", "desc")
      );

      const fuelSnapshot = await getDocs(fuelQuery);
      const fuelData = fuelSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          date: data.date?.toDate(),
        };
      });

      setFuelRecords(fuelData);

      // Fetch maintenance records for date range
      const maintenanceQuery = query(
        collection(db, "maintenanceRecords"),
        where("vehicleId", "==", vehicleId),
        where("date", ">=", Timestamp.fromDate(startOfDay(dateRange.start))),
        where("date", "<=", Timestamp.fromDate(endOfDay(dateRange.end))),
        orderBy("date", "desc")
      );

      const maintenanceSnapshot = await getDocs(maintenanceQuery);
      const maintenanceData = maintenanceSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate(),
      }));
      setMaintenanceRecords(maintenanceData);

      // Calculate analytics
      calculateAnalytics(fuelData, maintenanceData);
    } catch (error) {
      console.error("Error fetching vehicle data:", error);
      setError("Failed to load vehicle analytics. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [vehicleId, dateRange]);

  useEffect(() => {
    if (vehicleId) {
      fetchVehicleData();
    }
  }, [vehicleId, fetchVehicleData]);

  /**
   * Calculate analytics from fuel and maintenance data
   */
  const calculateAnalytics = (fuel, maintenance) => {
    // Use the comprehensive analytics helper
    const basicAnalytics = calculateVehicleAnalytics(fuel, maintenance);

    // Calculate monthly costs
    const currentDate = new Date();
    const currentMonthStart = startOfMonth(currentDate);
    const previousMonthStart = startOfMonth(subMonths(currentDate, 1));
    const previousMonthEnd = endOfMonth(subMonths(currentDate, 1));

    const currentMonthRecords = fuel.filter(
      (record) => record.date >= currentMonthStart
    );
    const previousMonthRecords = fuel.filter(
      (record) =>
        record.date >= previousMonthStart && record.date <= previousMonthEnd
    );

    const currentMonthCost = currentMonthRecords.reduce(
      (sum, record) => sum + (record.cost || 0),
      0
    );
    const previousMonthCost = previousMonthRecords.reduce(
      (sum, record) => sum + (record.cost || 0),
      0
    );

    // Add efficiency analysis
    const efficiencyAnalysis = analyzeFuelEfficiency(fuel);

    // Add maintenance analysis
    const currentOdometer =
      vehicle?.currentOdometer ||
      (fuel.length > 0
        ? Math.max(...fuel.map((f) => f.odometerReading || 0))
        : 0);

    const maintenanceAnalysis = analyzeMaintenancePatterns(
      maintenance,
      currentOdometer
    );

    // Add cost optimization analysis
    const costAnalysis = analyzeCostOptimization(
      basicAnalytics,
      fuel,
      maintenance
    );

    // Calculate distances between fueling
    const recordsWithDistance = calculateDistanceBetweenFueling(fuel);
    const totalDistance = recordsWithDistance.reduce(
      (sum, record) => sum + (record.distanceSinceLastFuel || 0),
      0
    );
    const averageDistanceBetweenFueling =
      fuel.length > 1 ? totalDistance / (fuel.length - 1) : 0;

    // Debug: Log some sample records to understand the data
    console.log("Sample fuel records:", fuel.slice(0, 3));
    console.log(
      "Processed records with distance:",
      recordsWithDistance.slice(0, 3)
    );
    console.log(
      "Records with efficiency:",
      recordsWithDistance.filter((r) => r.fuelEfficiency)
    );

    // Store processed records for table display
    setProcessedFuelRecords(recordsWithDistance);

    const finalAnalytics = {
      ...basicAnalytics,
      efficiencyTrend: efficiencyAnalysis.trend,
      isEfficiencyImproving: efficiencyAnalysis.isImproving,
      bestEfficiency: efficiencyAnalysis.bestEfficiency,
      worstEfficiency: efficiencyAnalysis.worstEfficiency,
      efficiencyRecommendations: efficiencyAnalysis.recommendations,
      nextServiceDue: maintenanceAnalysis.nextServiceDue,
      nextServiceKm: maintenanceAnalysis.nextServiceKm,
      kmUntilService: maintenanceAnalysis.kmUntilService,
      averageKmInterval: maintenanceAnalysis.averageKmInterval,
      overdueServices: maintenanceAnalysis.overdueServices,
      maintenanceRecommendations: maintenanceAnalysis.recommendations,
      costBreakdown: {
        fuelPercentage: costAnalysis.fuelCostPercentage,
        maintenancePercentage: costAnalysis.maintenanceCostPercentage,
      },
      stationAnalysis: costAnalysis.stationAnalysis,
      costRecommendations: costAnalysis.recommendations,
      averageDistanceBetweenFueling: Number(
        averageDistanceBetweenFueling.toFixed(0)
      ),
      previousMonthCost: Number(previousMonthCost.toFixed(2)),
      currentMonthCost: Number(currentMonthCost.toFixed(2)),
    };

    setAnalytics(finalAnalytics);
  };

  /**
   * Generate chart data for fuel consumption
   */
  const getFuelConsumptionChartData = () => {
    const monthlyData = groupFuelRecordsByMonth(fuelRecords);
    return generateFuelConsumptionChartData(monthlyData);
  };

  /**
   * Generate chart data for efficiency trend
   */
  const getEfficiencyTrendData = () => {
    return generateEfficiencyTrendData(fuelRecords);
  };

  /**
   * Handle date range change
   */
  const handleDateRangeChange = (field) => (date) => {
    setDateRange((prev) => ({
      ...prev,
      [field]: date,
    }));
  };

  /**
   * Reset date range to current month
   */
  const resetDateRange = () => {
    setDateRange({
      start: startOfMonth(new Date()),
      end: new Date(),
    });
  };

  /**
   * Handle tab change
   */
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  /**
   * Export data to PDF
   */
  const handleExportPDF = () => {
    // TODO: Implement PDF export functionality
    console.log("Exporting to PDF...");
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

  if (error) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <Alert severity="error">{error}</Alert>
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
            <Box display="flex" alignItems="center" gap={2}>
              <IconButton onClick={() => router.back()}>
                <BackIcon />
              </IconButton>
              <Box>
                <Typography variant="h4" fontWeight="bold">
                  {vehicle?.regNumber} Analytics
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {vehicle?.make} {vehicle?.model} ({vehicle?.year})
                </Typography>
              </Box>
            </Box>
            <Box display="flex" gap={2}>
              <Button
                variant="outlined"
                startIcon={<FilterIcon />}
                onClick={() => setShowDateFilter(!showDateFilter)}
              >
                Filter by Date
              </Button>
              <Button
                variant="outlined"
                startIcon={<PdfIcon />}
                onClick={handleExportPDF}
              >
                Export Report
              </Button>
            </Box>
          </Box>

          {/* Date Range Filter */}
          {showDateFilter && (
            <Paper sx={{ p: 2, mb: 3 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={4}>
                  <DatePicker
                    label="Start Date"
                    value={dateRange.start}
                    onChange={handleDateRangeChange("start")}
                    renderInput={(params) => (
                      <TextField {...params} fullWidth />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <DatePicker
                    label="End Date"
                    value={dateRange.end}
                    onChange={handleDateRangeChange("end")}
                    renderInput={(params) => (
                      <TextField {...params} fullWidth />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box display="flex" gap={2}>
                    <Button
                      variant="contained"
                      onClick={fetchVehicleData}
                      fullWidth
                    >
                      Apply Filter
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={resetDateRange}
                      fullWidth
                    >
                      Reset
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          )}

          {/* KPI Cards */}
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
                        Total Fuel Cost
                      </Typography>
                      <Typography variant="h5" fontWeight="bold">
                        {formatKES(safeNumber(analytics.totalFuelCost))}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {safeNumber(analytics.fuelUps)} fuel-ups
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
                        Current Month
                      </Typography>
                      <Typography variant="h5" fontWeight="bold">
                        {formatKES(safeNumber(analytics.currentMonthCost))}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {format(startOfMonth(new Date()), "MMMM yyyy")}
                      </Typography>
                    </Box>
                    <MoneyIcon color="primary" sx={{ fontSize: 40 }} />
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
                        Previous Month
                      </Typography>
                      <Typography variant="h5" fontWeight="bold">
                        {formatKES(safeNumber(analytics.previousMonthCost))}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {format(subMonths(new Date(), 1), "MMMM yyyy")}
                      </Typography>
                    </Box>
                    <MoneyIcon color="primary" sx={{ fontSize: 40 }} />
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
                        Total Distance
                      </Typography>
                      <Typography variant="h5" fontWeight="bold">
                        {safeNumber(analytics.totalDistance)} km
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Avg.{" "}
                        {safeNumber(analytics.averageDistanceBetweenFueling)} km
                        between fueling
                      </Typography>
                    </Box>
                    <SpeedIcon color="primary" sx={{ fontSize: 40 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Analytics Cards */}
          <Grid container spacing={3} mb={4}>
            {/* Fuel Efficiency Card */}
            <Grid item xs={12} md={6} lg={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <SpeedIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">Fuel Efficiency</Typography>
                  </Box>
                  <Typography variant="h4" gutterBottom>
                    {safeToFixed(analytics.averageEfficiency, 1)} km/L
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    {analytics.isEfficiencyImproving ? (
                      <TrendingUpIcon color="success" />
                    ) : (
                      <TrendingDownIcon color="error" />
                    )}
                    <Typography
                      variant="body2"
                      color={
                        analytics.isEfficiencyImproving
                          ? "success.main"
                          : "error.main"
                      }
                    >
                      {analytics.efficiencyTrend === "improving"
                        ? "Improving"
                        : analytics.efficiencyTrend === "declining"
                        ? "Declining"
                        : "Stable"}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" mt={1}>
                    Best: {safeToFixed(analytics.bestEfficiency, 1)} km/L
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Worst: {safeToFixed(analytics.worstEfficiency, 1)} km/L
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6} lg={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <MaintenanceIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">Maintenance</Typography>
                  </Box>
                  <Typography variant="h4" gutterBottom>
                    {safeNumber(analytics.maintenanceCount)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mt={1}>
                    Total Cost:{" "}
                    {formatKES(safeNumber(analytics.totalMaintenanceCost))}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6} lg={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <MoneyIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">Cost Per km</Typography>
                  </Box>
                  <Typography variant="h4" gutterBottom>
                    {formatKES(safeNumber(analytics.costPerKm))}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6} lg={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <MoneyIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">Total Fuel Cost</Typography>
                  </Box>
                  <Typography variant="h4" gutterBottom>
                    {formatKES(safeNumber(analytics.totalFuelCost))}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Charts Section */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Monthly Fuel Consumption
                </Typography>
                <Box sx={{ height: 300 }}>
                  <Bar
                    data={getFuelConsumptionChartData()}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          type: "linear",
                          display: true,
                          position: "left",
                          title: {
                            display: true,
                            text: "Liters",
                          },
                        },
                        y1: {
                          type: "linear",
                          display: true,
                          position: "right",
                          title: {
                            display: true,
                            text: "Cost (KES)",
                          },
                          grid: {
                            drawOnChartArea: false,
                          },
                        },
                      },
                    }}
                  />
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Fuel Efficiency Trend
                </Typography>
                <Box sx={{ height: 300 }}>
                  <Line
                    data={getEfficiencyTrendData()}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          title: {
                            display: true,
                            text: "km/L",
                          },
                        },
                      },
                    }}
                  />
                </Box>
              </Paper>
            </Grid>
          </Grid>

          {/* Insights and Recommendations */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Performance Insights
                </Typography>

                {analytics.efficiencyRecommendations &&
                  analytics.efficiencyRecommendations.length > 0 && (
                    <Box mb={2}>
                      <Typography
                        variant="subtitle2"
                        gutterBottom
                        color="primary"
                      >
                        Fuel Efficiency
                      </Typography>
                      {analytics.efficiencyRecommendations.map((rec, index) => (
                        <Typography
                          key={index}
                          variant="body2"
                          color="text.secondary"
                          sx={{ mb: 1 }}
                        >
                          • {rec}
                        </Typography>
                      ))}
                    </Box>
                  )}

                {analytics.maintenanceRecommendations &&
                  analytics.maintenanceRecommendations.length > 0 && (
                    <Box mb={2}>
                      <Typography
                        variant="subtitle2"
                        gutterBottom
                        color="warning.main"
                      >
                        Maintenance
                      </Typography>
                      {analytics.maintenanceRecommendations.map(
                        (rec, index) => (
                          <Typography
                            key={index}
                            variant="body2"
                            color="text.secondary"
                            sx={{ mb: 1 }}
                          >
                            • {rec}
                          </Typography>
                        )
                      )}
                    </Box>
                  )}

                {analytics.nextServiceDue && (
                  <Box mt={2} p={2} bgcolor="warning.50" borderRadius={1}>
                    <Typography variant="subtitle2" color="warning.main">
                      Next Service Due
                    </Typography>
                    <Typography variant="body2">
                      {analytics.nextServiceKm
                        ? `At ${analytics.nextServiceKm.toLocaleString()} km`
                        : "N/A"}
                      {analytics.kmUntilService !== undefined &&
                        analytics.kmUntilService !== null &&
                        analytics.kmUntilService >= 0 && (
                          <span>
                            {" "}
                            ({analytics.kmUntilService.toLocaleString()} km
                            remaining)
                          </span>
                        )}
                    </Typography>
                    {analytics.nextServiceDue && (
                      <Typography variant="caption" color="text.secondary">
                        Estimated date:{" "}
                        {format(analytics.nextServiceDue, "dd-MM-yyyy")}
                      </Typography>
                    )}
                  </Box>
                )}
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Cost Analysis
                </Typography>

                <Box display="flex" justifyContent="space-between" mb={2}>
                  <Typography variant="body2">Fuel Costs</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {analytics.costBreakdown?.fuelPercentage || 0}%
                  </Typography>
                </Box>

                <Box display="flex" justifyContent="space-between" mb={2}>
                  <Typography variant="body2">Maintenance Costs</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {analytics.costBreakdown?.maintenancePercentage || 0}%
                  </Typography>
                </Box>

                {analytics.costRecommendations &&
                  analytics.costRecommendations.length > 0 && (
                    <Box mt={2}>
                      <Typography
                        variant="subtitle2"
                        gutterBottom
                        color="success.main"
                      >
                        Cost Optimization
                      </Typography>
                      {analytics.costRecommendations.map((rec, index) => (
                        <Typography
                          key={index}
                          variant="body2"
                          color="text.secondary"
                          sx={{ mb: 1 }}
                        >
                          • {rec}
                        </Typography>
                      ))}
                    </Box>
                  )}

                {analytics.stationAnalysis &&
                  analytics.stationAnalysis.length > 0 && (
                    <Box mt={2}>
                      <Typography variant="subtitle2" gutterBottom>
                        Station Efficiency
                      </Typography>
                      {analytics.stationAnalysis
                        .slice(0, 3)
                        .map((station, index) => (
                          <Box
                            key={index}
                            display="flex"
                            justifyContent="space-between"
                          >
                            <Typography variant="body2">
                              {station.station}
                            </Typography>
                            <Typography variant="body2">
                              {formatKES(station.avgCostPerLiter)}/L
                            </Typography>
                          </Box>
                        ))}
                    </Box>
                  )}
              </Paper>
            </Grid>
          </Grid>

          {/* Fuel Efficiency Summary */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Fuel Efficiency Summary
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="primary" fontWeight="bold">
                    {safeNumber(analytics.averageEfficiency, 0).toFixed(2)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Average Efficiency (km/L)
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Full tank records only
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box textAlign="center">
                  <Typography
                    variant="h4"
                    color="success.main"
                    fontWeight="bold"
                  >
                    {safeNumber(analytics.bestEfficiency, 0).toFixed(2)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Best Efficiency (km/L)
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Full tank records only
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box textAlign="center">
                  <Typography
                    variant="h4"
                    color="warning.main"
                    fontWeight="bold"
                  >
                    {safeNumber(analytics.worstEfficiency, 0).toFixed(2)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Worst Efficiency (km/L)
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Full tank records only
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="info.main" fontWeight="bold">
                    {analytics.fullTankCount || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Full Tank Records
                  </Typography>
                  {analytics.partialFillCount > 0 && (
                    <Typography variant="caption" color="warning.main">
                      {analytics.partialFillCount} partial fills excluded
                    </Typography>
                  )}
                </Box>
              </Grid>
            </Grid>

            {/* Data Quality Information */}
            <Box mt={3}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Data Quality Summary
                    </Typography>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">
                        Total Fuel Records:
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {analytics.fuelUps || 0}
                      </Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">
                        Full Tank Records:
                      </Typography>
                      <Typography
                        variant="body2"
                        fontWeight="bold"
                        color="success.main"
                      >
                        {analytics.fullTankCount || 0}
                      </Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">
                        Partial Fill Records:
                      </Typography>
                      <Typography
                        variant="body2"
                        fontWeight="bold"
                        color="warning.main"
                      >
                        {analytics.partialFillCount || 0}
                      </Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2">
                        Incomplete Records:
                      </Typography>
                      <Typography
                        variant="body2"
                        fontWeight="bold"
                        color="error.main"
                      >
                        {analytics.incompleteRecordsCount || 0}
                      </Typography>
                    </Box>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Efficiency Calculation
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 1 }}
                    >
                      • Only full tank records are used for efficiency
                      calculations
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 1 }}
                    >
                      • Partial fills are excluded to ensure accurate results
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 1 }}
                    >
                      • Records missing odometer readings are marked as
                      incomplete
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      • Efficiency = Distance (km) ÷ Liters consumed
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Box>

            {/* Warnings */}
            {(analytics.incompleteRecordsCount > 0 ||
              analytics.partialFillCount > 0) && (
              <Box mt={2}>
                {analytics.incompleteRecordsCount > 0 && (
                  <Alert severity="warning" sx={{ mb: 1 }}>
                    ⚠️ {analytics.incompleteRecordsCount} fuel record(s) are
                    missing odometer readings and cannot be used for efficiency
                    calculations. Please update these records with odometer
                    readings for accurate efficiency tracking.
                  </Alert>
                )}
                {analytics.partialFillCount > 0 && (
                  <Alert severity="info">
                    ℹ️ {analytics.partialFillCount} partial fill record(s) are
                    excluded from efficiency calculations to ensure accurate
                    results. Only full tank records are used for efficiency
                    analysis.
                  </Alert>
                )}
              </Box>
            )}
          </Paper>

          {/* Tabs for detailed data */}
          <Paper sx={{ mb: 3 }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              aria-label="vehicle analytics tabs"
              variant="fullWidth"
            >
              <Tab label="Fuel History" />
              <Tab label="Maintenance History" />
            </Tabs>
          </Paper>

          {/* Fuel History Tab */}
          <TabPanel value={activeTab} index={0}>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell align="right">Liters</TableCell>
                    <TableCell align="right">Cost</TableCell>
                    <TableCell align="right">Efficiency (km/L)</TableCell>
                    <TableCell align="right">Odometer</TableCell>
                    <TableCell align="right">Distance</TableCell>
                    <TableCell>Station</TableCell>
                    <TableCell>Fill Type</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Notes</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {processedFuelRecords
                    .slice(
                      fuelPage * fuelRowsPerPage,
                      fuelPage * fuelRowsPerPage + fuelRowsPerPage
                    )
                    .map((record) => {
                      // Debug: Log individual record data
                      console.log("Table record:", {
                        id: record.id,
                        date: record.date,
                        liters: record.liters,
                        odometerReading: record.odometerReading,
                        distanceSinceLastFuel: record.distanceSinceLastFuel,
                        fuelEfficiency: record.fuelEfficiency,
                        isPartialFill: record.isPartialFill,
                        isIncomplete: record.isIncomplete,
                        efficiencyStatus: record.efficiencyStatus,
                        isFullTank: record.isFullTank,
                        fillType: record.fillType,
                      });

                      return (
                        <TableRow key={record.id}>
                          <TableCell>
                            {format(record.date, "dd-MM-yyyy")}
                          </TableCell>
                          <TableCell align="right">
                            {record.liters?.toFixed(1)}L
                          </TableCell>
                          <TableCell align="right">
                            {formatKES(record.cost)}
                          </TableCell>
                          <TableCell align="right">
                            {record.fuelEfficiency ? (
                              <Typography variant="body2" fontWeight="bold">
                                {record.fuelEfficiency.toFixed(2)} km/L
                              </Typography>
                            ) : (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                N/A
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="right">
                            {record.odometerReading
                              ? `${record.odometerReading.toLocaleString()} km`
                              : "N/A"}
                          </TableCell>
                          <TableCell align="right">
                            {record.distanceSinceLastFuel !== null ? (
                              `${record.distanceSinceLastFuel.toLocaleString()} km`
                            ) : (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                N/A
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>{record.station || "N/A"}</TableCell>
                          <TableCell>
                            {record.isPartialFill ? (
                              <Chip
                                label="Partial"
                                size="small"
                                color="warning"
                                variant="outlined"
                              />
                            ) : (
                              <Chip
                                label="Full Tank"
                                size="small"
                                color="success"
                                variant="filled"
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            {record.isIncomplete ? (
                              <Chip
                                label="Incomplete"
                                size="small"
                                color="error"
                                variant="outlined"
                              />
                            ) : record.isPartialFill ? (
                              <Chip
                                label="Partial Fill"
                                size="small"
                                color="warning"
                                variant="outlined"
                              />
                            ) : (
                              <Chip
                                label="Complete"
                                size="small"
                                color="success"
                                variant="outlined"
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            {record.notes ? (
                              <Tooltip title={record.notes}>
                                <Chip
                                  label="View"
                                  size="small"
                                  variant="outlined"
                                />
                              </Tooltip>
                            ) : (
                              "N/A"
                            )}
                          </TableCell>
                          <TableCell align="center">
                            <IconButton size="small">
                              <ViewIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
              <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={processedFuelRecords.length}
                rowsPerPage={fuelRowsPerPage}
                page={fuelPage}
                onPageChange={(event, newPage) => setFuelPage(newPage)}
                onRowsPerPageChange={(event) => {
                  setFuelRowsPerPage(parseInt(event.target.value, 10));
                  setFuelPage(0);
                }}
              />
            </TableContainer>
          </TabPanel>

          {/* Maintenance History Tab */}
          <TabPanel value={activeTab} index={1}>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell align="right">Cost</TableCell>
                    <TableCell>Service Provider</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {maintenanceRecords
                    .slice(
                      maintenancePage * maintenanceRowsPerPage,
                      maintenancePage * maintenanceRowsPerPage +
                        maintenanceRowsPerPage
                    )
                    .map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          {format(record.date, "dd-MM-yyyy")}
                        </TableCell>
                        <TableCell>{record.description}</TableCell>
                        <TableCell align="right">
                          {formatKES(record.cost)}
                        </TableCell>
                        <TableCell>{record.serviceProvider || "N/A"}</TableCell>
                        <TableCell align="center">
                          <IconButton size="small">
                            <ViewIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
              <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={maintenanceRecords.length}
                rowsPerPage={maintenanceRowsPerPage}
                page={maintenancePage}
                onPageChange={(event, newPage) => setMaintenancePage(newPage)}
                onRowsPerPageChange={(event) => {
                  setMaintenanceRowsPerPage(parseInt(event.target.value, 10));
                  setMaintenancePage(0);
                }}
              />
            </TableContainer>
          </TabPanel>
        </Box>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
