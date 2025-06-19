import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  getLatestOdometerReadings,
  calculateServiceAlerts,
} from "../utils/serviceHelpers";

/**
 * Custom hook for managing service alerts
 * @returns {Object} Service alerts data and loading state
 */
export function useServiceAlerts() {
  const [serviceAlerts, setServiceAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /**
   * Fetch service alerts for vehicles
   */
  const fetchServiceAlerts = async () => {
    try {
      setLoading(true);
      setError("");

      // Fetch vehicles with service tracking data
      const vehiclesSnapshot = await getDocs(collection(db, "vehicles"));
      const vehicles = vehiclesSnapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((vehicle) => vehicle.nextServiceDue); // Only vehicles with service tracking

      if (vehicles.length === 0) {
        setServiceAlerts([]);
        return;
      }

      // Get latest odometer readings for all vehicles
      const latestReadings = await getLatestOdometerReadings(vehicles);

      // Calculate service alerts
      const alerts = calculateServiceAlerts(vehicles, latestReadings, 1000); // 1000km warning threshold

      setServiceAlerts(alerts);
    } catch (error) {
      console.error("Error fetching service alerts:", error);
      setError("Failed to load service alerts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServiceAlerts();
  }, []);

  return {
    serviceAlerts,
    loading,
    error,
    refetch: fetchServiceAlerts,
  };
}
