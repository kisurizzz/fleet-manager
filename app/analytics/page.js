"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
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
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
} from "@mui/material";
import {
  Assessment as AnalyticsIcon,
  LocalGasStation as FuelIcon,
  Build as MaintenanceIcon,
  Speed as EfficiencyIcon,
  AttachMoney as MoneyIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Warning as WarningIcon,
  CheckCircle as SuccessIcon,
  GetApp as ExportIcon,
  Visibility as ViewIcon,
  DirectionsCar as VehicleIcon,
  Timeline as TimelineIcon,
  PieChart as PieIcon,
} from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import ProtectedRoute from "../../components/ProtectedRoute";
import DashboardLayout from "../../components/DashboardLayout";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { formatKES } from "../../utils/exportHelpers";
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
  ArcElement,
} from "chart.js";
import { Bar, Line, Doughnut } from "react-chartjs-2";
import { useRouter } from "next/navigation";
import {
  calculateVehicleAnalytics,
  analyzeFuelEfficiency,
  analyzeMaintenancePatterns,
  analyzeCostOptimization,
} from "../../utils/analyticsHelpers";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  ChartTooltip,
  Legend,
  ArcElement
);

/**
 * Analytics KPI Card Component
 */
function AnalyticsKPI({
  title,
  value,
  subtitle,
  icon,
  color = "primary",
  trend,
  onClick,
}) {
  return (
    <Card
      sx={{ height: "100%", cursor: onClick ? "pointer" : "default" }}
      onClick={onClick}
    >
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="text.secondary" gutterBottom variant="subtitle2">
              {title}
            </Typography>
            <Typography variant="h4" component="div" fontWeight="bold">
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
            {trend && (
              <Box display="flex" alignItems="center" mt={1}>
                {trend.direction === "up" ? (
                  <TrendingUpIcon color="success" fontSize="small" />
                ) : trend.direction === "down" ? (
                  <TrendingDownIcon color="error" fontSize="small" />
                ) : null}
                <Typography
                  variant="caption"
                  color={
                    trend.direction === "up"
                      ? "success.main"
                      : trend.direction === "down"
                      ? "error.main"
                      : "text.secondary"
                  }
                  sx={{ ml: 0.5 }}
                >
                  {trend.text}
                </Typography>
              </Box>
            )}
          </Box>
          <Box
            sx={{
              backgroundColor: `${color}.main`,
              color: "white",
              borderRadius: 2,
              width: 56,
              height: 56,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

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
 * Comprehensive Analytics Page Component
 */
export default function AnalyticsPage() {
  const router = useRouter();

  // State management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState(0);
  const [dateRange, setDateRange] = useState({
    start: startOfMonth(subMonths(new Date(), 5)),
    end: endOfMonth(new Date()),
  });
  const [timePeriod, setTimePeriod] = useState("6months");

  // Data states
  const [vehicles, setVehicles] = useState([]);
  const [analytics, setAnalytics] = useState({
    overview: {},
    efficiency: {},
    costs: {},
    trends: {},
    vehicleRankings: [],
    alerts: [],
  });
  const [chartData, setChartData] = useState({
    monthlyTrends: null,
    efficiencyComparison: null,
    costBreakdown: null,
    vehiclePerformance: null,
  });

  useEffect(() => {
    if (timePeriod === "3months") {
      setDateRange({
        start: startOfMonth(subMonths(new Date(), 2)),
        end: endOfMonth(new Date()),
      });
    } else if (timePeriod === "6months") {
      setDateRange({
        start: startOfMonth(subMonths(new Date(), 5)),
        end: endOfMonth(new Date()),
      });
    } else if (timePeriod === "1year") {
      setDateRange({
        start: startOfMonth(subMonths(new Date(), 11)),
        end: endOfMonth(new Date()),
      });
    }
  }, [timePeriod]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange]);

  /**
   * Fetch comprehensive analytics data
   */
  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError("");

      // Fetch vehicles
      const vehiclesSnapshot = await getDocs(collection(db, "vehicles"));
      const vehiclesData = vehiclesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Fetch fuel records for date range
      const fuelQuery = query(
        collection(db, "fuelRecords"),
        where("date", ">=", Timestamp.fromDate(dateRange.start)),
        where("date", "<=", Timestamp.fromDate(dateRange.end)),
        orderBy("date", "desc")
      );

      const fuelSnapshot = await getDocs(fuelQuery);
      const fuelRecords = fuelSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate(),
      }));

      // Fetch maintenance records for date range
      const maintenanceQuery = query(
        collection(db, "maintenanceRecords"),
        where("date", ">=", Timestamp.fromDate(dateRange.start)),
        where("date", "<=", Timestamp.fromDate(dateRange.end)),
        orderBy("date", "desc")
      );

      const maintenanceSnapshot = await getDocs(maintenanceQuery);
      const maintenanceRecords = maintenanceSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate(),
      }));

      // Calculate comprehensive analytics
      const comprehensiveAnalytics = calculateComprehensiveAnalytics(
        vehiclesData,
        fuelRecords,
        maintenanceRecords
      );

      // Prepare chart data
      const charts = prepareChartData(
        fuelRecords,
        maintenanceRecords,
        vehiclesData
      );

      setVehicles(vehiclesData);
      setAnalytics(comprehensiveAnalytics);
      setChartData(charts);
    } catch (error) {
      console.error("Error fetching analytics data:", error);
      setError("Failed to load analytics data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Calculate comprehensive analytics
   */
  const calculateComprehensiveAnalytics = (
    vehicles,
    fuelRecords,
    maintenanceRecords
  ) => {
    // Fleet overview
    const fleetAnalytics = calculateVehicleAnalytics(
      fuelRecords,
      maintenanceRecords
    );

    // Per-vehicle analysis
    const vehicleAnalytics = vehicles.map((vehicle) => {
      const vehicleFuel = fuelRecords.filter(
        (record) => record.vehicleId === vehicle.id
      );
      const vehicleMaintenance = maintenanceRecords.filter(
        (record) => record.vehicleId === vehicle.id
      );
      const stats = calculateVehicleAnalytics(vehicleFuel, vehicleMaintenance);

      return {
        id: vehicle.id,
        regNumber: vehicle.regNumber,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        ...stats,
        fuelUps: vehicleFuel.length,
        maintenanceEvents: vehicleMaintenance.length,
      };
    });

    // Efficiency analysis
    const efficiencyData = analyzeFuelEfficiency(fuelRecords);

    // Cost optimization
    const costData = analyzeCostOptimization(
      fleetAnalytics,
      fuelRecords,
      maintenanceRecords
    );

    // Vehicle rankings
    const topEfficient = vehicleAnalytics
      .filter((v) => v.averageEfficiency > 0)
      .sort((a, b) => b.averageEfficiency - a.averageEfficiency)
      .slice(0, 5);

    const mostCostly = vehicleAnalytics
      .filter((v) => v.costPerKm > 0)
      .sort((a, b) => b.costPerKm - a.costPerKm)
      .slice(0, 5);

    // Generate alerts
    const alerts = generateAlerts(vehicleAnalytics, efficiencyData);

    const result = {
      overview: {
        totalVehicles: vehicles.length,
        activeVehicles: vehicleAnalytics.filter((v) => v.fuelUps > 0).length,
        totalFuelCost: fleetAnalytics.totalFuelCost,
        totalMaintenanceCost: fleetAnalytics.totalMaintenanceCost,
        totalOperatingCost: fleetAnalytics.totalOperatingCost,
        averageEfficiency: fleetAnalytics.averageEfficiency,
        totalDistance: fleetAnalytics.totalDistance,
        costPerKm: fleetAnalytics.costPerKm,
      },
      efficiency: {
        fleetAverage: fleetAnalytics.averageEfficiency,
        bestPerformer: topEfficient[0] || null,
        trend: efficiencyData.trend,
        isImproving: efficiencyData.isImproving,
        recommendations: efficiencyData.recommendations,
      },
      costs: {
        fuelPercentage: costData.fuelCostPercentage,
        maintenancePercentage: costData.maintenanceCostPercentage,
        recommendations: costData.recommendations,
        stationAnalysis: costData.stationAnalysis,
      },
      vehicleRankings: {
        topEfficient,
        mostCostly,
      },
      alerts,
    };

    return result;
  };

  /**
   * Generate alerts based on analytics
   */
  const generateAlerts = (vehicleAnalytics, efficiencyData) => {
    const alerts = [];

    // Efficiency alerts
    if (efficiencyData.trend === "declining") {
      alerts.push({
        type: "warning",
        title: "Declining Fuel Efficiency",
        message:
          "Fleet fuel efficiency has been declining. Review driving patterns and vehicle maintenance.",
        icon: <WarningIcon />,
      });
    }

    // High cost alerts
    const highCostVehicles = vehicleAnalytics.filter((v) => v.costPerKm > 50); // Adjust threshold as needed
    if (highCostVehicles.length > 0) {
      alerts.push({
        type: "error",
        title: "High Operating Costs",
        message: `${highCostVehicles.length} vehicle(s) have unusually high operating costs.`,
        icon: <WarningIcon />,
      });
    }

    // Low activity alerts
    const lowActivityVehicles = vehicleAnalytics.filter((v) => v.fuelUps < 3);
    if (lowActivityVehicles.length > 0) {
      alerts.push({
        type: "info",
        title: "Low Activity Vehicles",
        message: `${lowActivityVehicles.length} vehicle(s) have very low activity. Consider reviewing utilization.`,
        icon: <VehicleIcon />,
      });
    }

    // Positive alerts
    if (efficiencyData.isImproving) {
      alerts.push({
        type: "success",
        title: "Improving Efficiency",
        message: "Fleet fuel efficiency is trending upward. Great job!",
        icon: <SuccessIcon />,
      });
    }

    return alerts;
  };

  /**
   * Prepare chart data
   */
  const prepareChartData = (fuelRecords, maintenanceRecords, vehicles) => {
    // Monthly trends
    const monthlyData = {};

    fuelRecords.forEach((record) => {
      const monthKey = format(record.date, "MMM yyyy");
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          fuel: 0,
          maintenance: 0,
          efficiency: [],
          distance: 0,
        };
      }
      monthlyData[monthKey].fuel += record.cost || 0;
      if (record.fuelEfficiency) {
        monthlyData[monthKey].efficiency.push(record.fuelEfficiency);
      }
      monthlyData[monthKey].distance += record.kmTraveled || 0;
    });

    maintenanceRecords.forEach((record) => {
      const monthKey = format(record.date, "MMM yyyy");
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          fuel: 0,
          maintenance: 0,
          efficiency: [],
          distance: 0,
        };
      }
      monthlyData[monthKey].maintenance += record.cost || 0;
    });

    const monthlyLabels = Object.keys(monthlyData).sort();
    const monthlyTrends = {
      labels: monthlyLabels,
      datasets: [
        {
          label: "Fuel Costs",
          data: monthlyLabels.map((month) => monthlyData[month].fuel),
          backgroundColor: "rgba(54, 162, 235, 0.8)",
          borderColor: "rgba(54, 162, 235, 1)",
          borderWidth: 1,
        },
        {
          label: "Maintenance Costs",
          data: monthlyLabels.map((month) => monthlyData[month].maintenance),
          backgroundColor: "rgba(255, 99, 132, 0.8)",
          borderColor: "rgba(255, 99, 132, 1)",
          borderWidth: 1,
        },
      ],
    };

    // Efficiency comparison by vehicle
    const vehicleEfficiencyData = vehicles
      .map((vehicle) => {
        const vehicleFuel = fuelRecords.filter(
          (record) => record.vehicleId === vehicle.id
        );
        const avgEfficiency =
          vehicleFuel.length > 0
            ? vehicleFuel.reduce(
                (sum, record) => sum + (record.fuelEfficiency || 0),
                0
              ) / vehicleFuel.length
            : 0;
        return {
          vehicle: vehicle.regNumber,
          efficiency: avgEfficiency,
        };
      })
      .filter((v) => v.efficiency > 0)
      .sort((a, b) => b.efficiency - a.efficiency)
      .slice(0, 10);

    const efficiencyComparison = {
      labels: vehicleEfficiencyData.map((v) => v.vehicle),
      datasets: [
        {
          label: "Fuel Efficiency (km/L)",
          data: vehicleEfficiencyData.map((v) => v.efficiency),
          backgroundColor: "rgba(75, 192, 192, 0.8)",
          borderColor: "rgba(75, 192, 192, 1)",
          borderWidth: 1,
        },
      ],
    };

    // Cost breakdown
    const totalFuel = fuelRecords.reduce(
      (sum, record) => sum + (record.cost || 0),
      0
    );
    const totalMaintenance = maintenanceRecords.reduce(
      (sum, record) => sum + (record.cost || 0),
      0
    );
    const total = totalFuel + totalMaintenance;

    const costBreakdown = {
      labels: ["Fuel", "Maintenance"],
      datasets: [
        {
          data:
            total > 0
              ? [
                  ((totalFuel / total) * 100).toFixed(1),
                  ((totalMaintenance / total) * 100).toFixed(1),
                ]
              : [0, 0],
          backgroundColor: [
            "rgba(54, 162, 235, 0.8)",
            "rgba(255, 99, 132, 0.8)",
          ],
          borderColor: ["rgba(54, 162, 235, 1)", "rgba(255, 99, 132, 1)"],
          borderWidth: 1,
        },
      ],
    };

    return {
      monthlyTrends,
      efficiencyComparison,
      costBreakdown,
    };
  };

  /**
   * Handle tab change
   */
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  /**
   * Handle export
   */
  const handleExport = () => {
    router.push("/reports");
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
              <Typography variant="h4" fontWeight="bold" gutterBottom>
                Fleet Analytics Center
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Comprehensive analytics and performance insights for your fleet
              </Typography>
            </Box>
            <Box display="flex" gap={1}>
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>Time Period</InputLabel>
                <Select
                  value={timePeriod}
                  label="Time Period"
                  onChange={(e) => setTimePeriod(e.target.value)}
                >
                  <MenuItem value="3months">Last 3 Months</MenuItem>
                  <MenuItem value="6months">Last 6 Months</MenuItem>
                  <MenuItem value="1year">Last Year</MenuItem>
                </Select>
              </FormControl>
              <Button
                variant="outlined"
                startIcon={<ExportIcon />}
                onClick={handleExport}
              >
                Export
              </Button>
            </Box>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Key Metrics Overview */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <AnalyticsKPI
                title="Total Operating Cost"
                value={formatKES(analytics.overview?.totalOperatingCost || 0)}
                subtitle={`${formatKES(analytics.overview?.costPerKm || 0)}/km`}
                icon={<MoneyIcon />}
                color="error"
                trend={{
                  direction: "stable",
                  text: "Total fleet costs",
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <AnalyticsKPI
                title="Fleet Efficiency"
                value={`${(analytics.overview?.averageEfficiency || 0).toFixed(
                  1
                )} km/L`}
                subtitle="Average across all vehicles"
                icon={<EfficiencyIcon />}
                color="success"
                trend={{
                  direction: analytics.efficiency?.isImproving ? "up" : "down",
                  text: analytics.efficiency?.trend || "stable",
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <AnalyticsKPI
                title="Active Vehicles"
                value={analytics.overview?.activeVehicles || 0}
                subtitle={`of ${analytics.overview?.totalVehicles || 0} total`}
                icon={<VehicleIcon />}
                color="primary"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <AnalyticsKPI
                title="Distance Traveled"
                value={`${(
                  analytics.overview?.totalDistance || 0
                ).toLocaleString()} km`}
                subtitle="Total for period"
                icon={<TimelineIcon />}
                color="info"
              />
            </Grid>
          </Grid>

          {/* Alerts Section */}
          {analytics.alerts && analytics.alerts.length > 0 && (
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Analytics Insights
                  </Typography>
                  <Grid container spacing={2}>
                    {analytics.alerts.map((alert, index) => (
                      <Grid item xs={12} md={6} key={index}>
                        <Alert severity={alert.type} icon={alert.icon}>
                          <Typography variant="subtitle2">
                            {alert.title}
                          </Typography>
                          <Typography variant="body2">
                            {alert.message}
                          </Typography>
                        </Alert>
                      </Grid>
                    ))}
                  </Grid>
                </Paper>
              </Grid>
            </Grid>
          )}

          {/* Charts Section */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 3, height: 400 }}>
                <Typography variant="h6" gutterBottom>
                  Monthly Cost Trends
                </Typography>
                {chartData.monthlyTrends && (
                  <Box sx={{ height: 320 }}>
                    <Bar
                      data={chartData.monthlyTrends}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                          y: {
                            beginAtZero: true,
                            title: {
                              display: true,
                              text: "Cost (KES)",
                            },
                          },
                        },
                      }}
                    />
                  </Box>
                )}
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, height: 400 }}>
                <Typography variant="h6" gutterBottom>
                  Cost Distribution
                </Typography>
                {chartData.costBreakdown && (
                  <Box
                    sx={{
                      height: 320,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Doughnut
                      data={chartData.costBreakdown}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: "bottom",
                          },
                        },
                      }}
                    />
                  </Box>
                )}
              </Paper>
            </Grid>
          </Grid>

          {/* Detailed Analytics Tabs */}
          <Paper sx={{ mb: 3 }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              aria-label="analytics tabs"
              variant="fullWidth"
            >
              <Tab label="Vehicle Performance" icon={<VehicleIcon />} />
              <Tab label="Efficiency Analysis" icon={<EfficiencyIcon />} />
              <Tab label="Cost Analysis" icon={<MoneyIcon />} />
            </Tabs>
          </Paper>

          {/* Vehicle Performance Tab */}
          <TabPanel value={activeTab} index={0}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom color="success.main">
                    Most Efficient Vehicles
                  </Typography>
                  {analytics.vehicleRankings?.topEfficient?.length > 0 ? (
                    <List>
                      {analytics.vehicleRankings.topEfficient.map(
                        (vehicle, index) => (
                          <ListItem
                            key={vehicle.id}
                            button
                            onClick={() =>
                              router.push(`/vehicles/${vehicle.id}/analytics`)
                            }
                          >
                            <ListItemIcon>
                              <Chip
                                label={index + 1}
                                size="small"
                                color="success"
                              />
                            </ListItemIcon>
                            <ListItemText
                              primary={`${vehicle.regNumber} - ${vehicle.make} ${vehicle.model}`}
                              secondary={`${vehicle.averageEfficiency.toFixed(
                                1
                              )} km/L • ${vehicle.fuelUps} fuel-ups`}
                            />
                            <IconButton>
                              <ViewIcon />
                            </IconButton>
                          </ListItem>
                        )
                      )}
                    </List>
                  ) : (
                    <Typography color="text.secondary">
                      No efficiency data available
                    </Typography>
                  )}
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom color="warning.main">
                    Highest Operating Costs
                  </Typography>
                  {analytics.vehicleRankings?.mostCostly?.length > 0 ? (
                    <List>
                      {analytics.vehicleRankings.mostCostly.map(
                        (vehicle, index) => (
                          <ListItem
                            key={vehicle.id}
                            button
                            onClick={() =>
                              router.push(`/vehicles/${vehicle.id}/analytics`)
                            }
                          >
                            <ListItemIcon>
                              <Chip
                                label={index + 1}
                                size="small"
                                color="warning"
                              />
                            </ListItemIcon>
                            <ListItemText
                              primary={`${vehicle.regNumber} - ${vehicle.make} ${vehicle.model}`}
                              secondary={`${formatKES(
                                vehicle.costPerKm
                              )}/km • ${formatKES(
                                vehicle.totalOperatingCost
                              )} total`}
                            />
                            <IconButton>
                              <ViewIcon />
                            </IconButton>
                          </ListItem>
                        )
                      )}
                    </List>
                  ) : (
                    <Typography color="text.secondary">
                      No cost data available
                    </Typography>
                  )}
                </Paper>
              </Grid>
            </Grid>

            {/* Vehicle Efficiency Chart */}
            <Grid container spacing={3} sx={{ mt: 2 }}>
              <Grid item xs={12}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Vehicle Efficiency Comparison
                  </Typography>
                  {chartData.efficiencyComparison && (
                    <Box sx={{ height: 300 }}>
                      <Bar
                        data={chartData.efficiencyComparison}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          scales: {
                            y: {
                              beginAtZero: true,
                              title: {
                                display: true,
                                text: "Fuel Efficiency (km/L)",
                              },
                            },
                          },
                        }}
                      />
                    </Box>
                  )}
                </Paper>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Efficiency Analysis Tab */}
          <TabPanel value={activeTab} index={1}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Efficiency Insights
                  </Typography>
                  <Box mb={2}>
                    <Typography variant="subtitle2" color="primary">
                      Fleet Average:{" "}
                      {(analytics.efficiency?.fleetAverage || 0).toFixed(1)}{" "}
                      km/L
                    </Typography>
                  </Box>
                  <Box mb={2}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Current Trend:{" "}
                      {analytics.efficiency?.trend || "No trend data"}
                    </Typography>
                  </Box>
                  {analytics.efficiency?.bestPerformer && (
                    <Box mb={2}>
                      <Typography variant="subtitle2" color="success.main">
                        Best Performer:{" "}
                        {analytics.efficiency.bestPerformer.regNumber}(
                        {analytics.efficiency.bestPerformer.averageEfficiency.toFixed(
                          1
                        )}{" "}
                        km/L)
                      </Typography>
                    </Box>
                  )}
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Recommendations
                  </Typography>
                  {analytics.efficiency?.recommendations?.length > 0 ? (
                    <List dense>
                      {analytics.efficiency.recommendations.map(
                        (rec, index) => (
                          <ListItem key={index}>
                            <ListItemText primary={`• ${rec}`} />
                          </ListItem>
                        )
                      )}
                    </List>
                  ) : (
                    <Typography color="text.secondary">
                      No specific recommendations at this time
                    </Typography>
                  )}
                </Paper>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Cost Analysis Tab */}
          <TabPanel value={activeTab} index={2}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Cost Breakdown
                  </Typography>
                  <Box display="flex" justifyContent="space-between" mb={2}>
                    <Typography variant="body2">Fuel Costs</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {analytics.costs?.fuelPercentage || 0}%
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" mb={2}>
                    <Typography variant="body2">Maintenance Costs</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {analytics.costs?.maintenancePercentage || 0}%
                    </Typography>
                  </Box>
                  <Divider sx={{ my: 2 }} />
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="subtitle2">
                      Total Operating Cost
                    </Typography>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {formatKES(analytics.overview?.totalOperatingCost || 0)}
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Cost Optimization
                  </Typography>
                  {analytics.costs?.recommendations?.length > 0 ? (
                    <List dense>
                      {analytics.costs.recommendations.map((rec, index) => (
                        <ListItem key={index}>
                          <ListItemText primary={`• ${rec}`} />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography color="text.secondary">
                      No cost optimization recommendations available
                    </Typography>
                  )}
                </Paper>
              </Grid>
            </Grid>
          </TabPanel>
        </Box>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
