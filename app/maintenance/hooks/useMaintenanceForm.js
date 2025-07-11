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
  useEffect(() => {
    if (formData.date === null) {
      setFormData((prev) => ({
        ...prev,
        date: new Date(),
      }));
    }
  }, [formData.date]);

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
      // If it's a service, also update the service schedule checkbox
      ...(name === "isService" && { updateServiceSchedule: checked }),
    }));
  };

  /**
   * Populate form with existing data for editing
   * @param {Object} record - Maintenance record to edit
   */
  const populateForm = (record) => {
    setFormData({
      id: record.id,
      vehicleId: record.vehicleId,
      date: record.date,
      description: record.description,
      cost: record.cost.toString(),
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
    return {
      vehicleId: formData.vehicleId,
      date: formData.date,
      description: formData.description.trim(),
      cost: parseFloat(formData.cost),
      serviceProvider: formData.serviceProvider.trim(),
      notes: formData.notes.trim(),
      isService: formData.isService,
      updateServiceSchedule: formData.updateServiceSchedule,
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
