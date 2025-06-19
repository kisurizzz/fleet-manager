import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  format,
  isAfter,
  addDays,
  startOfMonth,
  subMonths,
  endOfMonth,
  differenceInDays,
} from "date-fns";
import { calculateVehicleAnalytics } from "../utils/analyticsHelpers";

/**
 * Custom hook for dashboard data management
 * @returns {Object} Dashboard data and loading states
 */
export function useDashboardData() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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
    const { formatKES } = await import("../utils/exportHelpers");

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
        expiringInsurance: expiringInsuranceVehicles.length,
        expiringInspection: expiringInspectionVehicles.length,
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

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return {
    loading,
    error,
    stats,
    analytics,
    chartData,
    recentActivities,
    refetch: fetchDashboardData,
  };
}
