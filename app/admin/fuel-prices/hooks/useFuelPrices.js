import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db, auth } from "../../../../lib/firebase";

/**
 * Custom hook for managing fuel prices
 * @returns {Object} Fuel price data and operations
 */
export const useFuelPrices = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Current fuel prices
  const [currentPrices, setCurrentPrices] = useState({
    petrolPrice: 0,
    dieselPrice: 0,
    lastUpdated: null,
    updatedBy: "",
    priceHistory: [],
  });

  // Form data for new prices
  const [newPrices, setNewPrices] = useState({
    petrolPrice: "",
    dieselPrice: "",
  });

  /**
   * Fetch current fuel prices from Firestore
   */
  const fetchFuelPrices = async () => {
    try {
      setLoading(true);
      setError("");

      const docRef = doc(db, "globalSettings", "fuel-prices");
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setCurrentPrices(data);
        setNewPrices({
          petrolPrice: data.petrolPrice?.toString() || "",
          dieselPrice: data.dieselPrice?.toString() || "",
        });
      } else {
        // Initialize with default values
        const defaultPrices = {
          petrolPrice: 174.63,
          dieselPrice: 164.8,
          lastUpdated: new Date(),
          updatedBy: auth.currentUser?.email || "system",
          priceHistory: [],
        };
        await setDoc(docRef, defaultPrices);
        setCurrentPrices(defaultPrices);
        setNewPrices({
          petrolPrice: defaultPrices.petrolPrice.toString(),
          dieselPrice: defaultPrices.dieselPrice.toString(),
        });
      }
    } catch (error) {
      console.error("Error fetching fuel prices:", error);
      setError("Failed to fetch fuel prices: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle input changes for new prices
   */
  const handlePriceChange = (event) => {
    const { name, value } = event.target;
    setNewPrices((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /**
   * Update fuel prices
   */
  const updateFuelPrices = async () => {
    if (!newPrices.petrolPrice || !newPrices.dieselPrice) {
      setError("Please enter both petrol and diesel prices");
      return false;
    }

    const petrolPrice = parseFloat(newPrices.petrolPrice);
    const dieselPrice = parseFloat(newPrices.dieselPrice);

    if (petrolPrice <= 0 || dieselPrice <= 0) {
      setError("Prices must be greater than 0");
      return false;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const docRef = doc(db, "globalSettings", "fuel-prices");

      // Add current prices to history
      const newHistoryEntry = {
        date: new Date(),
        petrolPrice: currentPrices.petrolPrice,
        dieselPrice: currentPrices.dieselPrice,
        updatedBy: currentPrices.updatedBy,
      };

      const updatedData = {
        petrolPrice,
        dieselPrice,
        lastUpdated: new Date(),
        updatedBy: auth.currentUser?.email || "admin",
        priceHistory: [
          newHistoryEntry,
          ...(currentPrices.priceHistory || []),
        ].slice(0, 20), // Keep last 20 entries
      };

      await updateDoc(docRef, updatedData);
      setCurrentPrices(updatedData);
      setSuccess("Fuel prices updated successfully!");
      return true;
    } catch (error) {
      console.error("Error updating prices:", error);
      setError("Failed to update prices: " + error.message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  /**
   * Clear success message
   */
  const clearSuccess = () => {
    setSuccess("");
  };

  /**
   * Clear error message
   */
  const clearError = () => {
    setError("");
  };

  // Effects
  useEffect(() => {
    fetchFuelPrices();
  }, []);

  return {
    // Data
    currentPrices,
    newPrices,
    loading,
    saving,
    error,
    success,

    // Operations
    fetchFuelPrices,
    handlePriceChange,
    updateFuelPrices,
    clearSuccess,
    clearError,
  };
};
