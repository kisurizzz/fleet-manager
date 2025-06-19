"use client";

import {
  Box,
  Grid,
  CircularProgress,
  Alert,
  Button,
  Typography,
} from "@mui/material";
import {
  DirectionsCar as VehiclesIcon,
  Build as MaintenanceIcon,
  AttachMoney as MoneyIcon,
  Assessment as AnalyticsIcon,
  GetApp as ExportIcon,
} from "@mui/icons-material";
import ProtectedRoute from "../../components/ProtectedRoute";
import DashboardLayout from "../../components/DashboardLayout";
import AnalyticsCard from "../../components/dashboard/AnalyticsCard";
import QuickChart from "../../components/dashboard/QuickChart";
import ServiceAlerts from "../../components/dashboard/ServiceAlerts";
import FuelOverview from "../../components/dashboard/FuelOverview";
import PerformanceInsights from "../../components/dashboard/PerformanceInsights";
import ExpiryAlerts from "../../components/dashboard/ExpiryAlerts";
import RecentActivities from "../../components/dashboard/RecentActivities";
import QuickActions from "../../components/dashboard/QuickActions";
import { format, startOfMonth } from "date-fns";
import { formatKES } from "../../utils/exportHelpers";
import { useRouter } from "next/navigation";
import { useDashboardData } from "../../hooks/useDashboardData";
import { useMonthlyStats } from "../../hooks/useMonthlyStats";
import { useServiceAlerts } from "../../hooks/useServiceAlerts";

// Helper functions moved to utils or components

// Client-side only wrapper component
function ClientDashboard() {
  const router = useRouter();

  // Use custom hooks for data management
  const { loading, error, stats, analytics, chartData, recentActivities } =
    useDashboardData();
  const { monthlyStats } = useMonthlyStats();
  const { serviceAlerts, loading: loadingServiceAlerts } = useServiceAlerts();

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

      {/* Fuel Cost Overview Section */}
      <FuelOverview monthlyStats={monthlyStats} />

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

      {/* Service Alerts Section */}
      <ServiceAlerts
        serviceAlerts={serviceAlerts}
        loading={loadingServiceAlerts}
      />

      {/* Performance Insights */}
      <PerformanceInsights analytics={analytics} />

      {/* Alerts and Recent Activities */}
      <ExpiryAlerts analytics={analytics} />

      <Box sx={{ mb: 4 }}>
        <RecentActivities recentActivities={recentActivities} />
      </Box>

      {/* Quick Actions */}
      <QuickActions />
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
