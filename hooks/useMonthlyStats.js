import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { startOfMonth, subMonths, endOfMonth } from "date-fns";

/**
 * Custom hook for managing monthly statistics
 * @returns {Object} Monthly stats data and loading state
 */
export function useMonthlyStats() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [monthlyStats, setMonthlyStats] = useState({
    currentMonth: {
      fuelCost: 0,
      petrolCost: 0,
      dieselCost: 0,
      totalLiters: 0,
      petrolVehicles: 0,
      dieselVehicles: 0,
      creditAmount: 0,
      maintenanceCost: 0,
    },
    previousMonth: {
      fuelCost: 0,
      creditAmount: 0,
      maintenanceCost: 0,
    },
  });

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

  useEffect(() => {
    fetchMonthlyStats();
  }, []);

  return {
    loading,
    error,
    monthlyStats,
    refetch: fetchMonthlyStats,
  };
}
