import { useState, useEffect } from "react";
import { auth } from "../../../lib/firebase";

/**
 * Custom hook for managing maintenance form state
 * @param {boolean} isEdit - Whether this is for editing an existing record
 * @returns {Object} Form state and handlers
 */
export const useMaintenanceForm = (isEdit = false) => {
  const [formData, setFormData] = useState({
    vehicleId: "",
    date: null,
    description: "",
    cost: "",
    serviceProvider: "",
    notes: "",
    isService: false,
    updateServiceSchedule: false,
    createdBy: auth.currentUser?.uid || "",
  });

  const [errors, setErrors] = useState({});
  const [isValid, setIsValid] = useState(false);

  // Set default date after hydration to avoid SSR mismatch
  // Only set default date for new records, not when editing
  useEffect(() => {
    if (formData.date === null && !formData.id) {
      setFormData((prev) => ({
        ...prev,
        date: new Date(),
      }));
    }
  }, [formData.date, formData.id]);

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
    // Use current date if value is null/invalid
    const dateValue =
      value && value instanceof Date && !isNaN(value.getTime())
        ? value
        : new Date();

    setFormData((prev) => ({
      ...prev,
      date: dateValue,
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
      // If it's a service, also update the service schedule checkbox
      ...(name === "isService" && { updateServiceSchedule: checked }),
    }));
  };

  /**
   * Populate form with existing data for editing
   * @param {Object} record - Maintenance record to edit
   */
  const populateForm = (record) => {
    // Ensure date is a valid Date object
    let recordDate = new Date();
    if (record.date) {
      if (record.date instanceof Date) {
        recordDate = record.date;
      } else if (typeof record.date.toDate === "function") {
        recordDate = record.date.toDate();
      } else {
        recordDate = new Date(record.date);
      }
    }

    setFormData({
      id: record.id,
      vehicleId: record.vehicleId || "",
      date: recordDate,
      description: record.description || "",
      cost: record.cost ? record.cost.toString() : "",
      serviceProvider: record.serviceProvider || "",
      notes: record.notes || "",
      isService: record.isService || false,
      updateServiceSchedule: false,
      createdBy: auth.currentUser?.uid || "",
    });
  };

  /**
   * Reset form to initial state
   */
  const resetForm = () => {
    setFormData({
      vehicleId: "",
      date: new Date(),
      description: "",
      cost: "",
      serviceProvider: "",
      notes: "",
      isService: false,
      updateServiceSchedule: false,
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

    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    }

    if (!formData.cost || parseFloat(formData.cost) <= 0) {
      newErrors.cost = "Valid cost is required";
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
    // Ensure date is always valid
    let validDate = formData.date;
    if (
      !validDate ||
      !(validDate instanceof Date) ||
      isNaN(validDate.getTime())
    ) {
      validDate = new Date();
    }

    return {
      id: formData.id, // Include the record ID when editing
      vehicleId: formData.vehicleId || "",
      date: validDate,
      description: (formData.description || "").trim(),
      cost: parseFloat(formData.cost || 0),
      serviceProvider: (formData.serviceProvider || "").trim(),
      notes: (formData.notes || "").trim(),
      isService: formData.isService || false,
      updateServiceSchedule: formData.updateServiceSchedule || false,
    };
  };

  return {
    formData,
    errors,
    isValid,
    handleInputChange,
    handleDateChange,
    handleCheckboxChange,
    populateForm,
    resetForm,
    validateForm,
    getFormData,
  };
};
