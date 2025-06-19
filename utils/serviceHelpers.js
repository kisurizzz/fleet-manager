import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";
import { db } from "../lib/firebase";

/**
 * Get the latest odometer reading for a vehicle from fuel records
 * @param {string} vehicleId - Vehicle ID
 * @returns {Promise<number|null>} Latest odometer reading or null
 */
export const getLatestOdometerReading = async (vehicleId) => {
  try {
    const fuelQuery = query(
      collection(db, "fuelRecords"),
      where("vehicleId", "==", vehicleId),
      where("odometerReading", ">", 0),
      orderBy("odometerReading", "desc"),
      limit(1)
    );

    const snapshot = await getDocs(fuelQuery);

    if (!snapshot.empty) {
      const latestRecord = snapshot.docs[0].data();
      return latestRecord.odometerReading || null;
    }

    return null;
  } catch (error) {
    console.error("Error fetching latest odometer reading:", error);
    return null;
  }
};

/**
 * Get latest odometer readings for all vehicles
 * @param {Array} vehicles - Array of vehicle objects
 * @returns {Promise<Object>} Object with vehicle IDs as keys and latest odometer readings as values
 */
export const getLatestOdometerReadings = async (vehicles) => {
  const readings = {};

  try {
    // Create promises for all vehicles
    const promises = vehicles.map(async (vehicle) => {
      const reading = await getLatestOdometerReading(vehicle.id);
      return { vehicleId: vehicle.id, reading };
    });

    // Wait for all promises to resolve
    const results = await Promise.all(promises);

    // Build the readings object
    results.forEach(({ vehicleId, reading }) => {
      readings[vehicleId] = reading;
    });

    return readings;
  } catch (error) {
    console.error("Error fetching odometer readings:", error);
    return readings;
  }
};

/**
 * Calculate service alerts for vehicles
 * @param {Array} vehicles - Array of vehicle objects
 * @param {Object} latestReadings - Object with latest odometer readings
 * @param {number} warningThreshold - Threshold in km to show warning (default: 1000km)
 * @returns {Array} Array of service alert objects
 */
export const calculateServiceAlerts = (
  vehicles,
  latestReadings,
  warningThreshold = 1000
) => {
  const alerts = [];

  vehicles.forEach((vehicle) => {
    const latestOdometer = latestReadings[vehicle.id];
    const nextServiceDue = vehicle.nextServiceDue;

    if (latestOdometer && nextServiceDue && nextServiceDue > 0) {
      const kmUntilService = nextServiceDue - latestOdometer;

      // Create alert based on different thresholds
      if (kmUntilService <= 0) {
        // Service is overdue
        alerts.push({
          vehicleId: vehicle.id,
          vehicleName: `${vehicle.regNumber} (${vehicle.make} ${vehicle.model})`,
          type: "overdue",
          message: `Service overdue by ${Math.abs(kmUntilService)} km`,
          kmUntilService,
          currentOdometer: latestOdometer,
          nextServiceDue,
          severity: "error",
        });
      } else if (kmUntilService <= warningThreshold) {
        // Service is due soon
        alerts.push({
          vehicleId: vehicle.id,
          vehicleName: `${vehicle.regNumber} (${vehicle.make} ${vehicle.model})`,
          type: "due_soon",
          message: `Service due in ${kmUntilService} km`,
          kmUntilService,
          currentOdometer: latestOdometer,
          nextServiceDue,
          severity: kmUntilService <= warningThreshold / 2 ? "warning" : "info",
        });
      }
    }
  });

  // Sort alerts by urgency (overdue first, then by km until service)
  return alerts.sort((a, b) => {
    if (a.type === "overdue" && b.type !== "overdue") return -1;
    if (b.type === "overdue" && a.type !== "overdue") return 1;
    return a.kmUntilService - b.kmUntilService;
  });
};

/**
 * Update next service due date after service completion
 * @param {number} currentOdometer - Current odometer reading
 * @param {number} serviceInterval - Service interval in km
 * @returns {number} Next service due odometer reading
 */
export const calculateNextServiceDue = (currentOdometer, serviceInterval) => {
  return currentOdometer + serviceInterval;
};

/**
 * Format service alert message for display
 * @param {Object} alert - Service alert object
 * @returns {string} Formatted message
 */
export const formatServiceAlertMessage = (alert) => {
  if (alert.type === "overdue") {
    return `${alert.vehicleName}: Service overdue by ${Math.abs(
      alert.kmUntilService
    ).toLocaleString()} km`;
  } else {
    return `${
      alert.vehicleName
    }: Service due in ${alert.kmUntilService.toLocaleString()} km`;
  }
};

/**
 * Get service alerts grouped by severity
 * @param {Array} alerts - Array of service alerts
 * @returns {Object} Alerts grouped by severity
 */
export const groupAlertsBySeverity = (alerts) => {
  return {
    error: alerts.filter((alert) => alert.severity === "error"),
    warning: alerts.filter((alert) => alert.severity === "warning"),
    info: alerts.filter((alert) => alert.severity === "info"),
  };
};
