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
  CreditCard as CreditIcon,
  Settings as SettingsIcon,
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

// Helper function to safely format dates
const safeFormatDate = (date) => {
  if (!date) return "N/A";
  try {
    // Handle Firestore Timestamp
    if (date.toDate) {
      return format(date.toDate(), "dd MMM yyyy");
    }
    // Handle JavaScript Date
    if (date instanceof Date) {
      return format(date, "dd MMM yyyy");
    }
    // Handle string date
    if (typeof date === "string") {
      return format(new Date(date), "dd MMM yyyy");
    }
    return "Invalid Date";
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Invalid Date";
  }
};

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
  const [monthlyStats, setMonthlyStats] = useState({
    currentMonth: {
      fuelCost: 0,
      creditAmount: 0,
      maintenanceCost: 0,
    },
    previousMonth: {
      fuelCost: 0,
      creditAmount: 0,
      maintenanceCost: 0,
    },
  });

  useEffect(() => {
    fetchDashboardData();
    fetchMonthlyStats();
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
   * Fetch monthly statistics
   */
  const fetchMonthlyStats = async () => {
    try {
      setLoading(true);
      setError("");

      const now = new Date();
      const currentMonthStart = startOfMonth(now);
      const currentMonthEnd = endOfMonth(now);
      const previousMonthStart = startOfMonth(subMonths(now, 1));
      const previousMonthEnd = endOfMonth(subMonths(now, 1));

      // Fetch fuel records for both months
      const fuelQuery = query(
        collection(db, "fuelRecords"),
        where("date", ">=", Timestamp.fromDate(currentMonthStart)),
        where("date", "<=", Timestamp.fromDate(currentMonthEnd))
      );
      const fuelSnapshot = await getDocs(fuelQuery);

      // Calculate current month breakdown
      let currentMonthFuelCost = 0;
      let currentMonthPetrolCost = 0;
      let currentMonthDieselCost = 0;
      let currentMonthTotalLiters = 0;
      const currentPetrolVehicles = new Set();
      const currentDieselVehicles = new Set();

      fuelSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        const cost = data.cost || 0;
        const liters = data.liters || 0;
        const fuelType = data.fuelType || "Petrol";

        currentMonthFuelCost += cost;
        currentMonthTotalLiters += liters;

        if (fuelType === "Diesel") {
          currentMonthDieselCost += cost;
          currentDieselVehicles.add(data.vehicleId);
        } else {
          currentMonthPetrolCost += cost;
          currentPetrolVehicles.add(data.vehicleId);
        }
      });

      const prevFuelQuery = query(
        collection(db, "fuelRecords"),
        where("date", ">=", Timestamp.fromDate(previousMonthStart)),
        where("date", "<=", Timestamp.fromDate(previousMonthEnd))
      );
      const prevFuelSnapshot = await getDocs(prevFuelQuery);
      const previousMonthFuelCost = prevFuelSnapshot.docs.reduce(
        (sum, doc) => sum + (doc.data().cost || 0),
        0
      );

      // Fetch maintenance records for both months
      const maintenanceQuery = query(
        collection(db, "maintenanceRecords"),
        where("date", ">=", Timestamp.fromDate(currentMonthStart)),
        where("date", "<=", Timestamp.fromDate(currentMonthEnd))
      );
      const maintenanceSnapshot = await getDocs(maintenanceQuery);
      const currentMonthMaintenanceCost = maintenanceSnapshot.docs.reduce(
        (sum, doc) => sum + (doc.data().cost || 0),
        0
      );

      const prevMaintenanceQuery = query(
        collection(db, "maintenanceRecords"),
        where("date", ">=", Timestamp.fromDate(previousMonthStart)),
        where("date", "<=", Timestamp.fromDate(previousMonthEnd))
      );
      const prevMaintenanceSnapshot = await getDocs(prevMaintenanceQuery);
      const previousMonthMaintenanceCost = prevMaintenanceSnapshot.docs.reduce(
        (sum, doc) => sum + (doc.data().cost || 0),
        0
      );

      // Fetch credit records for both months
      const creditQuery = query(
        collection(db, "fuelLoans"),
        where("date", ">=", Timestamp.fromDate(currentMonthStart)),
        where("date", "<=", Timestamp.fromDate(currentMonthEnd))
      );
      const creditSnapshot = await getDocs(creditQuery);
      const currentMonthCreditAmount = creditSnapshot.docs.reduce(
        (sum, doc) => sum + (doc.data().amount || 0),
        0
      );

      const prevCreditQuery = query(
        collection(db, "fuelLoans"),
        where("date", ">=", Timestamp.fromDate(previousMonthStart)),
        where("date", "<=", Timestamp.fromDate(previousMonthEnd))
      );
      const prevCreditSnapshot = await getDocs(prevCreditQuery);
      const previousMonthCreditAmount = prevCreditSnapshot.docs.reduce(
        (sum, doc) => sum + (doc.data().amount || 0),
        0
      );

      setMonthlyStats({
        currentMonth: {
          fuelCost: currentMonthFuelCost,
          petrolCost: currentMonthPetrolCost,
          dieselCost: currentMonthDieselCost,
          totalLiters: currentMonthTotalLiters,
          petrolVehicles: currentPetrolVehicles.size,
          dieselVehicles: currentDieselVehicles.size,
          creditAmount: currentMonthCreditAmount,
          maintenanceCost: currentMonthMaintenanceCost,
        },
        previousMonth: {
          fuelCost: previousMonthFuelCost,
          creditAmount: previousMonthCreditAmount,
          maintenanceCost: previousMonthMaintenanceCost,
        },
      });
    } catch (error) {
      console.error("Error fetching monthly stats:", error);
      setError("Failed to load monthly statistics. Please try again.");
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

      {/* Fuel Cost Overview Section */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              mb={3}
            >
              <Typography variant="h5" fontWeight="bold">
                Monthly Fuel Overview
              </Typography>
              <Box display="flex" gap={1}>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<FuelIcon />}
                  onClick={() => router.push("/fuel")}
                >
                  Add Record
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<SettingsIcon />}
                  onClick={() => router.push("/admin/fuel-prices")}
                >
                  Manage Prices
                </Button>
              </Box>
            </Box>

            <Grid container spacing={3}>
              {/* Total Fuel Cost Card */}
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ height: "100%" }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={2}>
                      <FuelIcon color="primary" sx={{ mr: 1 }} />
                      <Typography variant="h6" color="text.secondary">
                        Total Fuel Cost
                      </Typography>
                    </Box>
                    <Typography
                      variant="h4"
                      fontWeight="bold"
                      color="primary.main"
                    >
                      {formatKES(monthlyStats.currentMonth.fuelCost)}
                    </Typography>
                    <Box display="flex" alignItems="center" mt={1}>
                      {monthlyStats.currentMonth.fuelCost >
                      monthlyStats.previousMonth.fuelCost ? (
                        <TrendingUpIcon color="error" fontSize="small" />
                      ) : (
                        <TrendingDownIcon color="success" fontSize="small" />
                      )}
                      <Typography
                        variant="caption"
                        color={
                          monthlyStats.currentMonth.fuelCost >
                          monthlyStats.previousMonth.fuelCost
                            ? "error.main"
                            : "success.main"
                        }
                        sx={{ ml: 0.5 }}
                      >
                        {Math.abs(
                          ((monthlyStats.currentMonth.fuelCost -
                            monthlyStats.previousMonth.fuelCost) /
                            monthlyStats.previousMonth.fuelCost) *
                            100
                        ).toFixed(1)}
                        % vs last month
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Petrol Cost Card */}
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ height: "100%" }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={2}>
                      <FuelIcon color="success" sx={{ mr: 1 }} />
                      <Typography variant="h6" color="text.secondary">
                        Petrol Cost
                      </Typography>
                    </Box>
                    <Typography
                      variant="h4"
                      fontWeight="bold"
                      color="success.main"
                    >
                      {formatKES(monthlyStats.currentMonth.petrolCost || 0)}
                    </Typography>
                    <Chip
                      size="small"
                      label={`${
                        monthlyStats.currentMonth.petrolVehicles || 0
                      } vehicles`}
                      color="success"
                      variant="outlined"
                      sx={{ mt: 1 }}
                    />
                  </CardContent>
                </Card>
              </Grid>

              {/* Diesel Cost Card */}
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ height: "100%" }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={2}>
                      <FuelIcon color="warning" sx={{ mr: 1 }} />
                      <Typography variant="h6" color="text.secondary">
                        Diesel Cost
                      </Typography>
                    </Box>
                    <Typography
                      variant="h4"
                      fontWeight="bold"
                      color="warning.main"
                    >
                      {formatKES(monthlyStats.currentMonth.dieselCost || 0)}
                    </Typography>
                    <Chip
                      size="small"
                      label={`${
                        monthlyStats.currentMonth.dieselVehicles || 0
                      } vehicles`}
                      color="warning"
                      variant="outlined"
                      sx={{ mt: 1 }}
                    />
                  </CardContent>
                </Card>
              </Grid>

              {/* Fuel Consumption Card */}
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ height: "100%" }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={2}>
                      <AnalyticsIcon color="info" sx={{ mr: 1 }} />
                      <Typography variant="h6" color="text.secondary">
                        Total Consumption
                      </Typography>
                    </Box>
                    <Typography
                      variant="h4"
                      fontWeight="bold"
                      color="info.main"
                    >
                      {(monthlyStats.currentMonth.totalLiters || 0).toFixed(0)}L
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 1 }}
                    >
                      Avg:{" "}
                      {formatKES(
                        monthlyStats.currentMonth.totalLiters > 0
                          ? monthlyStats.currentMonth.fuelCost /
                              monthlyStats.currentMonth.totalLiters
                          : 0
                      )}
                      /L
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Monthly Comparison */}
            <Box mt={3} p={2} bgcolor="grey.50" borderRadius={1}>
              <Typography variant="h6" gutterBottom>
                Monthly Comparison
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Current Month
                  </Typography>
                  <Typography variant="h6" fontWeight="bold">
                    {formatKES(monthlyStats.currentMonth.fuelCost)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Previous Month
                  </Typography>
                  <Typography variant="h6" fontWeight="bold">
                    {formatKES(monthlyStats.previousMonth.fuelCost)}
                  </Typography>
                </Grid>
              </Grid>
              <Box mt={1}>
                <Typography variant="body2" color="text.secondary">
                  Difference:
                  <Chip
                    size="small"
                    label={`${formatKES(
                      Math.abs(
                        monthlyStats.currentMonth.fuelCost -
                          monthlyStats.previousMonth.fuelCost
                      )
                    )}`}
                    color={
                      monthlyStats.currentMonth.fuelCost >
                      monthlyStats.previousMonth.fuelCost
                        ? "error"
                        : "success"
                    }
                    variant="outlined"
                    sx={{ ml: 1 }}
                  />
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Primary Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <AnalyticsCard
            title="Total Vehicles"
            value={stats.totalVehicles}
            subtitle="Active fleet size"
            icon={<VehiclesIcon />}
            color="primary"
            onClick={() => router.push("/vehicles")}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <AnalyticsCard
            title="Monthly Maintenance"
            value={formatKES(monthlyStats.currentMonth.maintenanceCost)}
            subtitle={format(startOfMonth(new Date()), "MMMM yyyy")}
            icon={<MaintenanceIcon />}
            color="error"
            trend={{
              direction:
                monthlyStats.currentMonth.maintenanceCost >
                monthlyStats.previousMonth.maintenanceCost
                  ? "up"
                  : "down",
              text: `${Math.abs(
                ((monthlyStats.currentMonth.maintenanceCost -
                  monthlyStats.previousMonth.maintenanceCost) /
                  monthlyStats.previousMonth.maintenanceCost) *
                  100
              ).toFixed(1)}% vs last month`,
            }}
            onClick={() => router.push("/maintenance")}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <AnalyticsCard
            title="Total Monthly Cost"
            value={formatKES(
              monthlyStats.currentMonth.fuelCost +
                monthlyStats.currentMonth.creditAmount
            )}
            icon={<MoneyIcon />}
            color="primary"
            trend={{
              direction:
                monthlyStats.currentMonth.fuelCost +
                  monthlyStats.currentMonth.creditAmount >
                monthlyStats.previousMonth.fuelCost +
                  monthlyStats.previousMonth.creditAmount
                  ? "up"
                  : "down",
              text: `${Math.abs(
                ((monthlyStats.currentMonth.fuelCost +
                  monthlyStats.currentMonth.creditAmount -
                  (monthlyStats.previousMonth.fuelCost +
                    monthlyStats.previousMonth.creditAmount)) /
                  (monthlyStats.previousMonth.fuelCost +
                    monthlyStats.previousMonth.creditAmount)) *
                  100
              ).toFixed(1)}% from last month`,
            }}
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
                        primary={activity.title}
                        secondary={activity.description}
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

      {/* Quick Actions */}
      <Grid container spacing={3} sx={{ mb: 6 }}>
        <Grid item xs={12} md={4}>
          <Card
            sx={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              p: 3,
              cursor: "pointer",
              "&:hover": {
                backgroundColor: "action.hover",
              },
            }}
            onClick={() => router.push("/fuel/records")}
          >
            <FuelIcon sx={{ fontSize: 40, color: "primary.main", mb: 2 }} />
            <Typography variant="h6" align="center">
              Record Fuel
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card
            sx={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              p: 3,
              cursor: "pointer",
              "&:hover": {
                backgroundColor: "action.hover",
              },
            }}
            onClick={() => router.push("/maintenance")}
          >
            <MaintenanceIcon
              sx={{ fontSize: 40, color: "primary.main", mb: 2 }}
            />
            <Typography variant="h6" align="center">
              Record Maintenance
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card
            sx={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              p: 3,
              cursor: "pointer",
              "&:hover": {
                backgroundColor: "action.hover",
              },
            }}
            onClick={() => router.push("/reports")}
          >
            <AnalyticsIcon
              sx={{ fontSize: 40, color: "primary.main", mb: 2 }}
            />
            <Typography variant="h6" align="center">
              View Reports
            </Typography>
          </Card>
        </Grid>
      </Grid>

      <Typography
        variant="h5"
        sx={{
          mb: 3,
          fontWeight: "bold",
          color: "text.primary",
        }}
      >
        Monthly Overview
      </Typography>

      {/* Monthly Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 6 }}>
        <Grid item xs={12} md={6}>
          <Card
            elevation={2}
            sx={{
              height: "100%",
              background: "linear-gradient(145deg, #ffffff 0%, #f5f5f5 100%)",
              "&:hover": {
                boxShadow: 6,
                transform: "translateY(-2px)",
                transition: "all 0.3s ease-in-out",
              },
            }}
          >
            <CardContent>
              <Typography
                variant="h6"
                gutterBottom
                sx={{
                  color: "primary.main",
                  fontWeight: "bold",
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                Current Month Total
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Box>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 0.5,
                    }}
                  >
                    <MoneyIcon color="primary" />
                    <Typography variant="subtitle2" color="text.secondary">
                      Total Expenses
                    </Typography>
                  </Box>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: "bold",
                      color: "text.primary",
                      pl: 4,
                    }}
                  >
                    {formatKES(
                      monthlyStats.currentMonth.fuelCost +
                        monthlyStats.currentMonth.creditAmount
                    )}
                  </Typography>
                </Box>
                <Box sx={{ pl: 4 }}>
                  <Typography variant="caption" color="text.secondary">
                    Including fuel costs and credit transactions
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card
            elevation={2}
            sx={{
              height: "100%",
              background: "linear-gradient(145deg, #ffffff 0%, #f5f5f5 100%)",
              "&:hover": {
                boxShadow: 6,
                transform: "translateY(-2px)",
                transition: "all 0.3s ease-in-out",
              },
            }}
          >
            <CardContent>
              <Typography
                variant="h6"
                gutterBottom
                sx={{
                  color: "primary.main",
                  fontWeight: "bold",
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                Previous Month Total
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Box>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 0.5,
                    }}
                  >
                    <MoneyIcon color="primary" />
                    <Typography variant="subtitle2" color="text.secondary">
                      Total Expenses
                    </Typography>
                  </Box>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: "bold",
                      color: "text.primary",
                      pl: 4,
                    }}
                  >
                    {formatKES(
                      monthlyStats.previousMonth.fuelCost +
                        monthlyStats.previousMonth.creditAmount
                    )}
                  </Typography>
                </Box>
                <Box sx={{ pl: 4 }}>
                  <Typography variant="caption" color="text.secondary">
                    Including fuel costs and credit transactions
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Activities */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom fontWeight="bold">
          Recent Activities
        </Typography>
        <Paper sx={{ p: 2 }}>
          <Grid container spacing={2}>
            {recentActivities.map((activity, index) => (
              <Grid item xs={12} key={index}>
                <Card>
                  <CardContent>
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Box>
                        <Typography variant="h6" gutterBottom>
                          {activity.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {activity.description}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {safeFormatDate(activity.date)}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      </Box>
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
