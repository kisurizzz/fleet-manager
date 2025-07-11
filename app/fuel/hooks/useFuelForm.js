import { useState, useEffect } from "react";
import { auth } from "../../../lib/firebase";

/**
 * Custom hook for managing fuel form state
 * @param {boolean} isEdit - Whether this is for editing an existing record
 * @returns {Object} Form state and handlers
 */
export const useFuelForm = (isEdit = false) => {
  const [formData, setFormData] = useState({
    vehicleId: "",
    date: null,
    liters: "",
    cost: "",
    station: "Shell Woodvale Groove",
    odometerReading: "",
    kmTraveled: "",
    fuelType: "Petrol",
    isFullTank: true,
    fillType: "full",
    receiptImage: "",
    notes: "",
    createdBy: auth.currentUser?.uid || "",
  });

  const [errors, setErrors] = useState({});
  const [isValid, setIsValid] = useState(false);

  // Set default date after hydration to avoid SSR mismatch
  useEffect(() => {
    if (formData.date === null && !isEdit) {
      setFormData((prev) => ({
        ...prev,
        date: new Date(),
      }));
    }
  }, [formData.date, isEdit]);

  /**
   * Handle form input changes
   * @param {Event} event - Input change event
   */
  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /**
   * Handle date change
   * @param {Date} value - Selected date
   */
  const handleDateChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      date: value,
    }));
  };

  /**
   * Handle checkbox changes
   * @param {Event} event - Checkbox change event
   */
  const handleCheckboxChange = (event) => {
    const { name, checked } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: checked,
      fillType:
        name === "isFullTank" ? (checked ? "full" : "partial") : prev.fillType,
    }));
  };

  /**
   * Calculate fuel efficiency
   * @returns {string|null} Fuel efficiency string or null
   */
  const calculateFuelEfficiency = () => {
    if (!formData.isFullTank || !formData.liters || !formData.kmTraveled) {
      return null;
    }

    const liters = parseFloat(formData.liters);
    const kmTraveled = parseFloat(formData.kmTraveled);

    if (liters <= 0 || kmTraveled <= 0) {
      return null;
    }

    const efficiency = kmTraveled / liters;
    return efficiency.toFixed(1);
  };

  /**
   * Auto-calculate liters based on cost and fuel price
   * @param {number} cost - Cost in KES
   * @param {string} fuelType - Fuel type (Petrol/Diesel)
   * @param {Object} globalPrices - Global fuel prices
   * @returns {number} Calculated liters
   */
  const calculateLitersFromCost = (cost, fuelType, globalPrices) => {
    if (!cost || !fuelType || !globalPrices) return 0;

    const price =
      fuelType === "Diesel"
        ? globalPrices.dieselPrice
        : globalPrices.petrolPrice;
    if (!price || price <= 0) return 0;

    return parseFloat(cost) / price;
  };

  /**
   * Populate form with existing data for editing
   * @param {Object} record - Fuel record to edit
   */
  const populateForm = (record) => {
    setFormData({
      id: record.id,
      vehicleId: record.vehicleId,
      date: record.date,
      liters: record.liters?.toString() || "",
      cost: record.cost?.toString() || "",
      station: record.station || "Shell Woodvale Groove",
      odometerReading: record.odometerReading?.toString() || "",
      kmTraveled: record.kmTraveled?.toString() || "",
      fuelType: record.fuelType || "Petrol",
      isFullTank: record.isFullTank || true,
      fillType: record.fillType || "full",
      receiptImage: record.receiptImage || "",
      notes: record.notes || "",
      createdBy: record.createdBy || auth.currentUser?.uid || "",
    });
  };

  /**
   * Reset form to initial state
   */
  const resetForm = () => {
    setFormData({
      vehicleId: "",
      date: new Date(),
      liters: "",
      cost: "",
      station: "Shell Woodvale Groove",
      odometerReading: "",
      kmTraveled: "",
      fuelType: "Petrol",
      isFullTank: true,
      fillType: "full",
      receiptImage: "",
      notes: "",
      createdBy: auth.currentUser?.uid || "",
    });
    setErrors({});
  };

  /**
   * Validate form data
   * @returns {boolean} Whether form is valid
   */
  const validateForm = () => {
    const newErrors = {};

    if (!formData.vehicleId) {
      newErrors.vehicleId = "Vehicle is required";
    }

    if (!formData.date) {
      newErrors.date = "Date is required";
    }

    if (!formData.cost || parseFloat(formData.cost) <= 0) {
      newErrors.cost = "Valid cost is required";
    }

    if (!formData.liters || parseFloat(formData.liters) <= 0) {
      newErrors.liters = "Valid liters is required";
    }

    if (!formData.station?.trim()) {
      newErrors.station = "Gas station is required";
    }

    setErrors(newErrors);
    const valid = Object.keys(newErrors).length === 0;
    setIsValid(valid);
    return valid;
  };

  /**
   * Get form data for submission
   * @returns {Object} Formatted form data
   */
  const getFormData = () => {
    return {
      vehicleId: formData.vehicleId,
      date: formData.date,
      liters: parseFloat(formData.liters),
      cost: parseFloat(formData.cost),
      station: formData.station.trim(),
      odometerReading: formData.odometerReading
        ? parseFloat(formData.odometerReading)
        : null,
      kmTraveled: formData.kmTraveled ? parseFloat(formData.kmTraveled) : null,
      fuelType: formData.fuelType,
      isFullTank: formData.isFullTank,
      fillType: formData.fillType,
      receiptImage: formData.receiptImage.trim(),
      notes: formData.notes.trim(),
    };
  };

  return {
    formData,
    errors,
    isValid,
    handleInputChange,
    handleDateChange,
    handleCheckboxChange,
    calculateFuelEfficiency,
    calculateLitersFromCost,
    populateForm,
    resetForm,
    validateForm,
    getFormData,
  };
};
