import { useState, useEffect } from "react";
import {
  addDoc,
  collection,
  getDocs,
  query,
  orderBy,
  where,
  updateDoc,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { auth } from "../../../lib/firebase";

/**
 * Custom hook for managing fuel data
 * @returns {Object} Fuel data and operations
 */
export const useFuelData = () => {
  const [fuelRecords, setFuelRecords] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterVehicle, setFilterVehicle] = useState("");
  const [filterDateRange, setFilterDateRange] = useState({
    start: null,
    end: null,
  });

  // Statistics
  const [stats, setStats] = useState({
    totalCost: 0,
    totalLiters: 0,
    averageCostPerLiter: 0,
    monthlyTotal: 0,
  });

  // Global fuel prices
  const [globalPrices, setGlobalPrices] = useState({
    petrolPrice: 0,
    dieselPrice: 0,
    autoPopulate: true,
  });

  /**
   * Fetch global fuel prices
   */
  const fetchGlobalPrices = async () => {
    try {
      const globalSettingsRef = doc(db, "globalSettings", "fuel-prices");
      const globalSettingsSnapshot = await getDoc(globalSettingsRef);

      if (globalSettingsSnapshot.exists()) {
        const data = globalSettingsSnapshot.data();
        setGlobalPrices({
          petrolPrice: data.petrolPrice || 0,
          dieselPrice: data.dieselPrice || 0,
          autoPopulate: true,
        });
      }
    } catch (error) {
      console.error("Error fetching global prices:", error);
    }
  };

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

      // Process fuel records to calculate efficiency
      const fuelList = fuelSnapshot.docs.map((doc) => {
        const data = doc.data();
        const vehicle = vehiclesList.find((v) => v.id === data.vehicleId);
        const date = data.date?.toDate();

        // Safely convert numeric values
        const cost = parseFloat(data.cost) || 0;
        const liters = parseFloat(data.liters) || 0;
        const odometerReading = parseFloat(data.odometerReading) || 0;

        return {
          id: doc.id,
          ...data,
          date: date,
          vehicleName: vehicle
            ? `${vehicle.regNumber} (${vehicle.make} ${vehicle.model})`
            : "Unknown Vehicle",
          formattedDate: date ? format(date, "dd-MM-yyyy") : "N/A",
          cost,
          liters,
          odometerReading,
        };
      });

      // Calculate fuel efficiency and distance traveled
      const processedFuelList = fuelList.map((record, index) => {
        const nextRecord = fuelList[index + 1];
        let distanceSinceLastFuel = 0;
        let fuelEfficiency = null;
        let isPartialEfficiency = false;

        if (nextRecord && record.vehicleId === nextRecord.vehicleId) {
          distanceSinceLastFuel =
            record.odometerReading - nextRecord.odometerReading;
        }

        // Calculate fuel efficiency for full tank records
        if (
          record.isFullTank &&
          record.liters > 0 &&
          distanceSinceLastFuel > 0
        ) {
          fuelEfficiency = distanceSinceLastFuel / record.liters;
        } else if (record.liters > 0 && distanceSinceLastFuel > 0) {
          // Partial efficiency calculation
          fuelEfficiency = distanceSinceLastFuel / record.liters;
          isPartialEfficiency = true;
        }

        return {
          ...record,
          distanceSinceLastFuel,
          fuelEfficiency,
          isPartialEfficiency,
          costPerLiter: record.liters > 0 ? record.cost / record.liters : null,
        };
      });

      setFuelRecords(processedFuelList);
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
   * Add new fuel record
   * @param {Object} fuelData - Fuel record data
   * @returns {Object} Result of the operation
   */
  const addFuelRecord = async (fuelData) => {
    try {
      const recordData = {
        ...fuelData,
        createdAt: new Date(),
      };

      await addDoc(collection(db, "fuelRecords"), recordData);

      // Refresh data
      await fetchData();
      return { success: true };
    } catch (error) {
      console.error("Error adding fuel record:", error);
      return {
        success: false,
        error: "Failed to add fuel record. Please try again.",
      };
    }
  };

  /**
   * Update existing fuel record
   * @param {string} recordId - Record ID to update
   * @param {Object} fuelData - Updated fuel record data
   * @returns {Object} Result of the operation
   */
  const updateFuelRecord = async (recordId, fuelData) => {
    try {
      const recordData = {
        ...fuelData,
        updatedAt: new Date(),
      };

      const recordRef = doc(db, "fuelRecords", recordId);
      await updateDoc(recordRef, recordData);

      // Refresh data
      await fetchData();
      return { success: true };
    } catch (error) {
      console.error("Error updating fuel record:", error);
      return {
        success: false,
        error: "Failed to update fuel record. Please try again.",
      };
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

  // Effects
  useEffect(() => {
    fetchData();
    fetchGlobalPrices();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [fuelRecords, searchTerm, filterVehicle, filterDateRange]);

  useEffect(() => {
    calculateStats();
  }, [filteredRecords]);

  return {
    // Data
    fuelRecords,
    vehicles,
    filteredRecords,
    loading,
    error,
    stats,
    globalPrices,

    // Filter states
    searchTerm,
    setSearchTerm,
    filterVehicle,
    setFilterVehicle,
    filterDateRange,
    setFilterDateRange,

    // Operations
    fetchData,
    fetchGlobalPrices,
    addFuelRecord,
    updateFuelRecord,
    clearFilters,
  };
};
