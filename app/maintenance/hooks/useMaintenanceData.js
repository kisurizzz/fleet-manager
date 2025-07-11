import { useState, useEffect } from "react";
import {
  addDoc,
  collection,
  getDocs,
  query,
  orderBy,
  getDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { auth } from "../../../lib/firebase";
import {
  calculateNextServiceDue,
  getLatestOdometerReading,
} from "../../../utils/serviceHelpers";

/**
 * Custom hook for managing maintenance data
 * @returns {Object} Maintenance data and operations
 */
export const useMaintenanceData = () => {
  const [maintenanceRecords, setMaintenanceRecords] = useState([]);
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
    recordCount: 0,
    averageCost: 0,
    monthlyTotal: 0,
  });

  /**
   * Fetch maintenance records and vehicles data
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

      // Fetch maintenance records
      const maintenanceSnapshot = await getDocs(
        query(collection(db, "maintenanceRecords"), orderBy("date", "desc"))
      );

      const maintenanceList = maintenanceSnapshot.docs.map((doc) => {
        const data = doc.data();
        const vehicle = vehiclesList.find((v) => v.id === data.vehicleId);
        return {
          id: doc.id,
          ...data,
          date: data.date?.toDate(),
          vehicleName: vehicle
            ? `${vehicle.regNumber} (${vehicle.make} ${vehicle.model})`
            : "Unknown Vehicle",
          formattedDate: data.date
            ? format(data.date.toDate(), "dd-MM-yyyy")
            : "",
        };
      });

      setMaintenanceRecords(maintenanceList);
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Failed to load maintenance records. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Apply search and filter criteria
   */
  const applyFilters = () => {
    let filtered = [...maintenanceRecords];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (record) =>
          record.vehicleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          record.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          record.serviceProvider
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
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
    const recordCount = filteredRecords.length;
    const averageCost = recordCount > 0 ? totalCost / recordCount : 0;

    // Calculate current month total
    const currentMonth = new Date();
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    const monthlyRecords = maintenanceRecords.filter((record) => {
      const recordDate = record.date;
      return recordDate >= monthStart && recordDate <= monthEnd;
    });

    const monthlyTotal = monthlyRecords.reduce(
      (sum, record) => sum + (record.cost || 0),
      0
    );

    setStats({
      totalCost,
      recordCount,
      averageCost,
      monthlyTotal,
    });
  };

  /**
   * Update service schedule after service completion
   * @param {string} vehicleId - Vehicle ID
   */
  const updateServiceSchedule = async (vehicleId) => {
    try {
      // Get the vehicle's current service interval
      const vehicleRef = doc(db, "vehicles", vehicleId);
      const vehicleDoc = await getDoc(vehicleRef);

      if (!vehicleDoc.exists()) {
        console.warn("Vehicle not found for service schedule update");
        return;
      }

      const vehicleData = vehicleDoc.data();
      const serviceInterval = vehicleData.serviceInterval || 10000;

      // Get the latest odometer reading
      const latestOdometer = await getLatestOdometerReading(vehicleId);

      if (latestOdometer) {
        // Calculate next service due
        const nextServiceDue = calculateNextServiceDue(
          latestOdometer,
          serviceInterval
        );

        // Update the vehicle document
        await updateDoc(vehicleRef, {
          nextServiceDue: nextServiceDue,
          lastServiceOdometer: latestOdometer,
          lastServiceDate: new Date(),
          updatedAt: new Date(),
        });

        console.log(
          `Service schedule updated for vehicle ${vehicleId}: Next service due at ${nextServiceDue}km`
        );
      } else {
        console.warn("No odometer reading found to calculate next service");
      }
    } catch (error) {
      console.error("Error updating service schedule:", error);
    }
  };

  /**
   * Add new maintenance record
   * @param {Object} maintenanceData - Maintenance record data
   * @param {boolean} updateServiceSchedule - Whether to update service schedule
   */
  const addMaintenanceRecord = async (
    maintenanceData,
    updateServiceSchedule = false
  ) => {
    try {
      const recordData = {
        ...maintenanceData,
        createdAt: new Date(),
      };

      await addDoc(collection(db, "maintenanceRecords"), recordData);

      // Update service schedule if this is a service
      if (maintenanceData.isService && updateServiceSchedule) {
        await updateServiceSchedule(maintenanceData.vehicleId);
      }

      // Refresh data
      await fetchData();
      return { success: true };
    } catch (error) {
      console.error("Error adding maintenance record:", error);
      return {
        success: false,
        error: "Failed to add maintenance record. Please try again.",
      };
    }
  };

  /**
   * Update existing maintenance record
   * @param {string} recordId - Record ID to update
   * @param {Object} maintenanceData - Updated maintenance record data
   * @param {boolean} updateServiceSchedule - Whether to update service schedule
   */
  const updateMaintenanceRecord = async (
    recordId,
    maintenanceData,
    updateServiceSchedule = false
  ) => {
    try {
      const recordData = {
        ...maintenanceData,
        updatedAt: new Date(),
      };

      const recordRef = doc(db, "maintenanceRecords", recordId);
      await updateDoc(recordRef, recordData);

      // Update service schedule if this is a service
      if (maintenanceData.isService && updateServiceSchedule) {
        await updateServiceSchedule(maintenanceData.vehicleId);
      }

      // Refresh data
      await fetchData();
      return { success: true };
    } catch (error) {
      console.error("Error updating maintenance record:", error);
      return {
        success: false,
        error: "Failed to update maintenance record. Please try again.",
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
  }, []);

  useEffect(() => {
    applyFilters();
  }, [maintenanceRecords, searchTerm, filterVehicle, filterDateRange]);

  useEffect(() => {
    calculateStats();
  }, [filteredRecords]);

  return {
    // Data
    maintenanceRecords,
    vehicles,
    filteredRecords,
    loading,
    error,
    stats,

    // Filter states
    searchTerm,
    setSearchTerm,
    filterVehicle,
    setFilterVehicle,
    filterDateRange,
    setFilterDateRange,

    // Operations
    fetchData,
    addMaintenanceRecord,
    updateMaintenanceRecord,
    clearFilters,
    updateServiceSchedule,
  };
};
