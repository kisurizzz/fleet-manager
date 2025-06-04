"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Button,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  DirectionsCar as VehiclesIcon,
  LocalGasStation as FuelIcon,
  Build as MaintenanceIcon,
  AttachMoney as MoneyIcon,
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Assessment as AnalyticsIcon,
  Speed as EfficiencyIcon,
  Visibility as ViewIcon,
  GetApp as ExportIcon,
  History as HistoryIcon,
} from "@mui/icons-material";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import ProtectedRoute from "../../components/ProtectedRoute";
import DashboardLayout from "../../components/DashboardLayout";
import {
  format,
  isAfter,
  addDays,
  startOfMonth,
  subMonths,
  endOfMonth,
  differenceInDays,
} from "date-fns";
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
 * Enhanced Analytics Card Component
 */
function AnalyticsCard({
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
            <Typography color="text.secondary" gutterBottom variant="h6">
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
              borderRadius: "50%",
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
 * Quick Chart Component
 */
function QuickChart({ title, data, type = "bar", height = 200 }) {
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
    },
    scales:
      type !== "doughnut"
        ? {
            x: {
              display: false,
            },
            y: {
              display: false,
            },
          }
        : undefined,
  };

  return (
    <Paper sx={{ p: 2, height: height + 60 }}>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <Box sx={{ height: height }}>
        {type === "bar" && <Bar data={data} options={chartOptions} />}
        {type === "line" && <Line data={data} options={chartOptions} />}
        {type === "doughnut" && <Doughnut data={data} options={chartOptions} />}
      </Box>
    </Paper>
  );
}

// Client-side only wrapper component
function ClientDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalVehicles: 0,
    totalFuelCost: 0,
    totalMaintenanceCost: 0,
    expiringInsurance: 0,
    expiringInspection: 0,
    previousMonthFuelCost: 0,
  });
  const [analytics, setAnalytics] = useState({
    fleetEfficiency: 0,
    totalDistance: 0,
    averageCostPerKm: 0,
    fuelEfficiencyTrend: "stable",
    costTrend: "stable",
    topPerformers: [],
    issues: [],
    expiringInsuranceVehicles: [],
    expiringInspectionVehicles: [],
  });
  const [chartData, setChartData] = useState({
    monthlyFuel: null,
    efficiency: null,
    costBreakdown: null,
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDashboardData();
  }, []);

  /**
   * Fetch enhanced dashboard statistics and analytics
   */
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError("");

      // Fetch vehicles
      const vehiclesSnapshot = await getDocs(collection(db, "vehicles"));
      const vehicles = vehiclesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Calculate date ranges for analytics
      const today = new Date();
      const currentMonth = startOfMonth(today);
      const threeMonthsAgo = startOfMonth(subMonths(today, 3));
      const lastMonth = startOfMonth(subMonths(today, 1));
      const thirtyDaysFromNow = addDays(today, 30);

      // Count expiring documents
      const expiringInsuranceVehicles = vehicles
        .filter((vehicle) => {
          if (!vehicle.insuranceExpiry) return false;
          const expiryDate = vehicle.insuranceExpiry.toDate();
          return (
            isAfter(expiryDate, today) &&
            !isAfter(expiryDate, thirtyDaysFromNow)
          );
        })
        .map((vehicle) => ({
          ...vehicle,
          daysUntilExpiry: differenceInDays(
            vehicle.insuranceExpiry.toDate(),
            today
          ),
        }));

      const expiringInspectionVehicles = vehicles
        .filter((vehicle) => {
          if (!vehicle.inspectionExpiry) return false;
          const expiryDate = vehicle.inspectionExpiry.toDate();
          return (
            isAfter(expiryDate, today) &&
            !isAfter(expiryDate, thirtyDaysFromNow)
          );
        })
        .map((vehicle) => ({
          ...vehicle,
          daysUntilExpiry: differenceInDays(
            vehicle.inspectionExpiry.toDate(),
            today
          ),
        }));

      const expiringInsurance = expiringInsuranceVehicles.length;
      const expiringInspection = expiringInspectionVehicles.length;

      // Fetch comprehensive fuel data
      const fuelSnapshot = await getDocs(
        query(
          collection(db, "fuelRecords"),
          where("date", ">=", Timestamp.fromDate(threeMonthsAgo)),
          orderBy("date", "desc")
        )
      );

      const allFuelRecords = fuelSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate(),
      }));

      // Fetch comprehensive maintenance data
      const maintenanceSnapshot = await getDocs(
        query(
          collection(db, "maintenanceRecords"),
          where("date", ">=", Timestamp.fromDate(threeMonthsAgo)),
          orderBy("date", "desc")
        )
      );

      const allMaintenanceRecords = maintenanceSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate(),
      }));

      // Calculate current month costs
      const currentMonthFuel = allFuelRecords.filter(
        (record) => record.date >= currentMonth
      );
      const currentMonthMaintenance = allMaintenanceRecords.filter(
        (record) => record.date >= currentMonth
      );

      const totalFuelCost = currentMonthFuel.reduce(
        (sum, record) => sum + (record.cost || 0),
        0
      );
      const totalMaintenanceCost = currentMonthMaintenance.reduce(
        (sum, record) => sum + (record.cost || 0),
        0
      );

      // Calculate previous month costs
      const previousMonthFuel = allFuelRecords.filter(
        (record) => record.date >= lastMonth && record.date < currentMonth
      );
      const previousMonthFuelCost = previousMonthFuel.reduce(
        (sum, record) => sum + (record.cost || 0),
        0
      );

      // Calculate fleet analytics
      const fleetAnalytics = calculateVehicleAnalytics(
        allFuelRecords,
        allMaintenanceRecords
      );

      // Analyze per-vehicle performance
      const vehiclePerformance = vehicles.map((vehicle) => {
        const vehicleFuel = allFuelRecords.filter(
          (record) => record.vehicleId === vehicle.id
        );
        const vehicleMaintenance = allMaintenanceRecords.filter(
          (record) => record.vehicleId === vehicle.id
        );
        const vehicleStats = calculateVehicleAnalytics(
          vehicleFuel,
          vehicleMaintenance
        );

        return {
          ...vehicle,
          efficiency: vehicleStats.averageEfficiency,
          totalCost: vehicleStats.totalOperatingCost,
          costPerKm: vehicleStats.costPerKm,
          fuelRecords: vehicleFuel.length,
        };
      });

      // Identify top performers and issues
      const topPerformers = vehiclePerformance
        .filter((v) => v.efficiency > 0)
        .sort((a, b) => b.efficiency - a.efficiency)
        .slice(0, 3);

      const costIssues = vehiclePerformance
        .filter((v) => v.costPerKm > 0)
        .sort((a, b) => b.costPerKm - a.costPerKm)
        .slice(0, 3);

      // Calculate trends
      const lastMonthFuel = allFuelRecords.filter(
        (record) => record.date >= lastMonth && record.date < currentMonth
      );

      const currentMonthEfficiency =
        currentMonthFuel.length > 0
          ? currentMonthFuel.reduce(
              (sum, record) => sum + (record.fuelEfficiency || 0),
              0
            ) / currentMonthFuel.length
          : 0;

      const lastMonthEfficiency =
        lastMonthFuel.length > 0
          ? lastMonthFuel.reduce(
              (sum, record) => sum + (record.fuelEfficiency || 0),
              0
            ) / lastMonthFuel.length
          : 0;

      const efficiencyTrend =
        currentMonthEfficiency > lastMonthEfficiency
          ? "improving"
          : currentMonthEfficiency < lastMonthEfficiency
          ? "declining"
          : "stable";

      // Prepare chart data
      const monthlyFuelData = prepareMonthlyFuelData(allFuelRecords);
      const efficiencyData = prepareEfficiencyData(allFuelRecords);
      const costBreakdownData = prepareCostBreakdownData(
        totalFuelCost,
        totalMaintenanceCost
      );

      // Get recent activities
      const activities = await getRecentActivities(
        vehicles,
        allFuelRecords,
        allMaintenanceRecords
      );

      setStats({
        totalVehicles: vehicles.length,
        totalFuelCost,
        totalMaintenanceCost,
        expiringInsurance,
        expiringInspection,
        previousMonthFuelCost,
      });

      setAnalytics({
        fleetEfficiency: fleetAnalytics.averageEfficiency,
        totalDistance: fleetAnalytics.totalDistance,
        averageCostPerKm: fleetAnalytics.costPerKm,
        fuelEfficiencyTrend: efficiencyTrend,
        costTrend: "stable",
        topPerformers,
        issues: costIssues,
        expiringInsuranceVehicles,
        expiringInspectionVehicles,
      });

      setChartData({
        monthlyFuel: monthlyFuelData,
        efficiency: efficiencyData,
        costBreakdown: costBreakdownData,
      });

      setRecentActivities(activities);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setError("Failed to load dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Prepare monthly fuel consumption chart data
   */
  const prepareMonthlyFuelData = (fuelRecords) => {
    const monthlyData = {};

    fuelRecords.forEach((record) => {
      const monthKey = format(record.date, "MMM yyyy");
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { liters: 0, cost: 0 };
      }
      monthlyData[monthKey].liters += record.liters || 0;
      monthlyData[monthKey].cost += record.cost || 0;
    });

    const labels = Object.keys(monthlyData).slice(-3);
    const data = labels.map((month) => monthlyData[month].cost);

    return {
      labels,
      datasets: [
        {
          label: "Monthly Fuel Cost",
          data,
          backgroundColor: "rgba(54, 162, 235, 0.8)",
          borderColor: "rgba(54, 162, 235, 1)",
          borderWidth: 1,
        },
      ],
    };
  };

  /**
   * Prepare efficiency trend chart data
   */
  const prepareEfficiencyData = (fuelRecords) => {
    const weeklyData = {};

    fuelRecords
      .filter((record) => record.fuelEfficiency > 0)
      .forEach((record) => {
        const weekKey = format(record.date, "MMM dd");
        if (!weeklyData[weekKey]) {
          weeklyData[weekKey] = { total: 0, count: 0 };
        }
        weeklyData[weekKey].total += record.fuelEfficiency;
        weeklyData[weekKey].count += 1;
      });

    const labels = Object.keys(weeklyData).slice(-7);
    const data = labels.map((week) =>
      weeklyData[week].count > 0
        ? weeklyData[week].total / weeklyData[week].count
        : 0
    );

    return {
      labels,
      datasets: [
        {
          label: "Efficiency (km/L)",
          data,
          borderColor: "rgba(75, 192, 192, 1)",
          backgroundColor: "rgba(75, 192, 192, 0.2)",
          tension: 0.1,
        },
      ],
    };
  };

  /**
   * Prepare cost breakdown chart data
   */
  const prepareCostBreakdownData = (fuelCost, maintenanceCost) => {
    const total = fuelCost + maintenanceCost;

    return {
      labels: ["Fuel", "Maintenance"],
      datasets: [
        {
          data:
            total > 0
              ? [
                  ((fuelCost / total) * 100).toFixed(1),
                  ((maintenanceCost / total) * 100).toFixed(1),
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
  };

  /**
   * Get recent activities
   */
  const getRecentActivities = async (
    vehicles,
    fuelRecords,
    maintenanceRecords
  ) => {
    const activities = [];

    // Add recent fuel records
    fuelRecords.slice(0, 3).forEach((record) => {
      const vehicle = vehicles.find((v) => v.id === record.vehicleId);
      activities.push({
        title: "Fuel Record Added",
        description: `${record.liters}L fuel added to ${
          vehicle?.regNumber || "Unknown Vehicle"
        } - ${formatKES(record.cost)}`,
        date: record.createdAt?.toDate() || record.date,
      });
    });

    // Add recent maintenance records
    maintenanceRecords.slice(0, 3).forEach((record) => {
      const vehicle = vehicles.find((v) => v.id === record.vehicleId);
      activities.push({
        title: "Maintenance Record Added",
        description: `${record.description} for ${
          vehicle?.regNumber || "Unknown Vehicle"
        } - ${formatKES(record.cost)}`,
        date: record.createdAt?.toDate() || record.date,
      });
    });

    // Sort activities by date and return top 5
    return activities.sort((a, b) => b.date - a.date).slice(0, 5);
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
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
            Dashboard Overview
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Quick overview of your fleet status and key metrics
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<AnalyticsIcon />}
            onClick={() => router.push("/analytics")}
          >
            View Analytics
          </Button>
          <Button
            variant="outlined"
            startIcon={<ExportIcon />}
            onClick={() => router.push("/reports")}
          >
            Export Data
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Primary Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <AnalyticsCard
            title="Total Vehicles"
            value={stats.totalVehicles}
            subtitle="Active fleet size"
            icon={<VehiclesIcon />}
            color="primary"
            onClick={() => router.push("/vehicles")}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <AnalyticsCard
            title="Monthly Fuel Cost"
            value={formatKES(stats.totalFuelCost)}
            subtitle="Current month"
            icon={<FuelIcon />}
            color="success"
            trend={{
              direction:
                stats.totalFuelCost < stats.previousMonthFuelCost
                  ? "down"
                  : "up",
              text: `vs last month`,
            }}
            onClick={() => router.push("/fuel")}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <AnalyticsCard
            title="Previous Month"
            value={formatKES(stats.previousMonthFuelCost)}
            subtitle="Total fuel cost"
            icon={<FuelIcon />}
            color="info"
            onClick={() => router.push("/fuel")}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <AnalyticsCard
            title="Operating Cost"
            value={formatKES(stats.totalFuelCost + stats.totalMaintenanceCost)}
            subtitle={`${formatKES(analytics.averageCostPerKm)}/km`}
            icon={<MoneyIcon />}
            color="warning"
            onClick={() => router.push("/reports")}
          />
        </Grid>
      </Grid>

      {/* Charts Section */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          {chartData.monthlyFuel && (
            <QuickChart
              title="Monthly Fuel Costs"
              data={chartData.monthlyFuel}
              type="bar"
            />
          )}
        </Grid>
        <Grid item xs={12} md={4}>
          {chartData.efficiency && (
            <QuickChart
              title="Efficiency Trend"
              data={chartData.efficiency}
              type="line"
            />
          )}
        </Grid>
        <Grid item xs={12} md={4}>
          {chartData.costBreakdown && (
            <QuickChart
              title="Cost Breakdown"
              data={chartData.costBreakdown}
              type="doughnut"
            />
          )}
        </Grid>
      </Grid>

      {/* Performance Insights */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Top Performers */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: "100%" }}>
            <Box
              display="flex"
              alignItems="center"
              justifyContent="between"
              mb={2}
            >
              <Typography variant="h6" fontWeight="medium">
                Most Efficient Vehicles
              </Typography>
              <TrendingUpIcon color="success" />
            </Box>

            {analytics.topPerformers.length > 0 ? (
              <List dense>
                {analytics.topPerformers.map((vehicle, index) => (
                  <ListItem
                    key={vehicle.id}
                    button
                    onClick={() =>
                      router.push(`/vehicles/${vehicle.id}/analytics`)
                    }
                  >
                    <ListItemIcon>
                      <Chip label={index + 1} size="small" color="success" />
                    </ListItemIcon>
                    <ListItemText
                      primary={`${vehicle.regNumber} - ${vehicle.make} ${vehicle.model}`}
                      secondary={`${vehicle.efficiency.toFixed(
                        1
                      )} km/L efficiency`}
                    />
                    <IconButton size="small">
                      <ViewIcon />
                    </IconButton>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography color="text.secondary">
                No efficiency data available
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Cost Issues */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: "100%" }}>
            <Box
              display="flex"
              alignItems="center"
              justifyContent="between"
              mb={2}
            >
              <Typography variant="h6" fontWeight="medium">
                Highest Operating Costs
              </Typography>
              <WarningIcon color="warning" />
            </Box>

            {analytics.issues.length > 0 ? (
              <List dense>
                {analytics.issues.map((vehicle, index) => (
                  <ListItem key={vehicle.id} disablePadding>
                    <ListItemButton
                      onClick={() =>
                        router.push(`/vehicles/${vehicle.id}/analytics`)
                      }
                    >
                      <ListItemText
                        primary={`${vehicle.regNumber} - ${vehicle.make} ${vehicle.model}`}
                        secondary={`${formatKES(
                          vehicle.costPerKm
                        )}/km operating cost`}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography color="text.secondary">
                No cost data available
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Alerts and Recent Activities */}
      <Grid container spacing={3}>
        {/* Expiry Alerts */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: "100%" }}>
            <Box display="flex" alignItems="center" sx={{ mb: 2 }}>
              <WarningIcon sx={{ mr: 1, color: "warning.main" }} />
              <Typography variant="h6" fontWeight="medium">
                Insurance Expiry Alerts
              </Typography>
            </Box>

            {analytics.expiringInsuranceVehicles.length > 0 ? (
              <>
                <Alert severity="warning" sx={{ mb: 2 }}>
                  {analytics.expiringInsuranceVehicles.length} vehicle(s) have
                  insurance expiring soon
                </Alert>
                <List dense>
                  {analytics.expiringInsuranceVehicles
                    .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)
                    .map((vehicle) => (
                      <ListItem key={vehicle.id} disablePadding>
                        <ListItemButton
                          onClick={() => router.push(`/vehicles/${vehicle.id}`)}
                        >
                          <ListItemText
                            primary={`${vehicle.regNumber} - ${vehicle.make} ${vehicle.model}`}
                            secondary={`Insurance expires in ${vehicle.daysUntilExpiry} days`}
                          />
                          <Chip
                            label={`${vehicle.daysUntilExpiry} days`}
                            color={
                              vehicle.daysUntilExpiry <= 7 ? "error" : "warning"
                            }
                            size="small"
                            sx={{ ml: 1 }}
                          />
                        </ListItemButton>
                      </ListItem>
                    ))}
                </List>
              </>
            ) : (
              <Alert severity="success">
                No vehicles with expiring insurance in the next 30 days
              </Alert>
            )}
          </Paper>
        </Grid>

        {/* Inspection Expiry Alerts */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: "100%" }}>
            <Box display="flex" alignItems="center" sx={{ mb: 2 }}>
              <WarningIcon sx={{ mr: 1, color: "warning.main" }} />
              <Typography variant="h6" fontWeight="medium">
                Inspection Expiry Alerts
              </Typography>
            </Box>

            {analytics.expiringInspectionVehicles?.length > 0 ? (
              <>
                <Alert severity="warning" sx={{ mb: 2 }}>
                  {analytics.expiringInspectionVehicles.length} vehicle(s) have
                  inspection expiring soon
                </Alert>
                <List dense>
                  {analytics.expiringInspectionVehicles
                    .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)
                    .map((vehicle) => (
                      <ListItem key={vehicle.id} disablePadding>
                        <ListItemButton
                          onClick={() => router.push(`/vehicles/${vehicle.id}`)}
                        >
                          <ListItemText
                            primary={`${vehicle.regNumber} - ${vehicle.make} ${vehicle.model}`}
                            secondary={`Inspection expires in ${vehicle.daysUntilExpiry} days`}
                          />
                          <Chip
                            label={`${vehicle.daysUntilExpiry} days`}
                            color={
                              vehicle.daysUntilExpiry <= 7 ? "error" : "warning"
                            }
                            size="small"
                            sx={{ ml: 1 }}
                          />
                        </ListItemButton>
                      </ListItem>
                    ))}
                </List>
              </>
            ) : (
              <Alert severity="success">
                No vehicles with expiring inspection in the next 30 days
              </Alert>
            )}
          </Paper>
        </Grid>

        {/* Recent Activities */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: "100%" }}>
            <Box display="flex" alignItems="center" sx={{ mb: 2 }}>
              <HistoryIcon sx={{ mr: 1, color: "info.main" }} />
              <Typography variant="h6" fontWeight="medium">
                Recent Activities
              </Typography>
            </Box>

            {recentActivities.length > 0 ? (
              <List dense>
                {recentActivities.map((activity, index) => (
                  <ListItem key={index} disablePadding>
                    <ListItemButton
                      onClick={() =>
                        router.push(`/vehicles/${activity.vehicleId}`)
                      }
                    >
                      <ListItemText
                        primary={activity.description}
                        secondary={format(activity.date, "MMM dd, yyyy")}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography color="text.secondary">
                No recent activities
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

// Main dashboard page component
export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <ClientDashboard />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
