"use client";

import { useState } from "react";
import { Box, Alert, CircularProgress } from "@mui/material";
import ProtectedRoute from "../../components/ProtectedRoute";
import DashboardLayout from "../../components/DashboardLayout";

// Import custom hooks
import { useFuelData, useFuelForm } from "./hooks";

// Import components
import {
  FuelPageHeader,
  FuelStatisticsCards,
  FuelFilters,
  FuelDataGrid,
  FuelFormDialog,
} from "./components";

/**
 * Fuel records page component
 * @returns {JSX.Element} Fuel records page
 */
export default function FuelRecordsPage() {
  // Data management
  const {
    fuelRecords,
    vehicles,
    filteredRecords,
    loading,
    error,
    stats,
    globalPrices,
    searchTerm,
    setSearchTerm,
    filterVehicle,
    setFilterVehicle,
    filterDateRange,
    setFilterDateRange,
    addFuelRecord,
    updateFuelRecord,
    clearFilters,
  } = useFuelData();

  // Form management
  const {
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
  } = useFuelForm();

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  /**
   * Handle add dialog open
   */
  const handleAddClick = () => {
    resetForm();
    setEditMode(false);
    setDialogOpen(true);
  };

  /**
   * Handle edit record click
   * @param {Object} record - Fuel record to edit
   */
  const handleEditClick = (record) => {
    populateForm(record);
    setEditMode(true);
    setDialogOpen(true);
  };

  /**
   * Handle form submission
   * @param {Event} event - Form submit event
   */
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSaving(true);

    try {
      const fuelData = getFormData();
      let result;

      if (editMode) {
        result = await updateFuelRecord(formData.id, fuelData);
      } else {
        result = await addFuelRecord(fuelData);
      }

      if (result.success) {
        setDialogOpen(false);
        resetForm();
        setEditMode(false);
      } else {
        // Handle error - you might want to show this in the UI
        console.error(result.error);
      }
    } catch (error) {
      console.error("Error saving fuel record:", error);
    } finally {
      setSaving(false);
    }
  };

  /**
   * Handle dialog close
   */
  const handleDialogClose = () => {
    setDialogOpen(false);
    resetForm();
    setEditMode(false);
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight="400px"
          >
            <CircularProgress size={60} />
          </Box>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <Box>
          {/* Page Header */}
          <FuelPageHeader onAddClick={handleAddClick} />

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Statistics Cards */}
          <FuelStatisticsCards stats={stats} />

          {/* Filters */}
          <FuelFilters
            vehicles={vehicles}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filterVehicle={filterVehicle}
            setFilterVehicle={setFilterVehicle}
            filterDateRange={filterDateRange}
            setFilterDateRange={setFilterDateRange}
            clearFilters={clearFilters}
          />

          {/* Data Grid */}
          <FuelDataGrid
            records={filteredRecords}
            onEditClick={handleEditClick}
            loading={loading}
          />

          {/* Fuel Form Dialog */}
          <FuelFormDialog
            open={dialogOpen}
            onClose={handleDialogClose}
            isEdit={editMode}
            formData={formData}
            handleInputChange={handleInputChange}
            handleDateChange={handleDateChange}
            handleCheckboxChange={handleCheckboxChange}
            handleSubmit={handleSubmit}
            vehicles={vehicles}
            globalPrices={globalPrices}
            saving={saving}
            errors={errors}
            calculateFuelEfficiency={calculateFuelEfficiency}
          />
        </Box>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
