"use client";

import { useState } from "react";
import { Box, Alert, CircularProgress } from "@mui/material";
import ProtectedRoute from "../../components/ProtectedRoute";
import DashboardLayout from "../../components/DashboardLayout";

// Import custom hooks
import { useMaintenanceData, useMaintenanceForm } from "./hooks";

// Import components
import {
  PageHeader,
  StatisticsCards,
  MaintenanceFilters,
  MaintenanceDataGrid,
  MaintenanceFormDialog,
} from "./components";

/**
 * Maintenance records page component
 * @returns {JSX.Element} Maintenance records page
 */
export default function MaintenanceRecordsPage() {
  // Data management
  const {
    maintenanceRecords,
    vehicles,
    filteredRecords,
    loading,
    error,
    stats,
    searchTerm,
    setSearchTerm,
    filterVehicle,
    setFilterVehicle,
    filterDateRange,
    setFilterDateRange,
    addMaintenanceRecord,
    updateMaintenanceRecord,
    clearFilters,
  } = useMaintenanceData();

  // Form management
  const {
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
  } = useMaintenanceForm();

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  /**
   * Handle add dialog open
   */
  const handleAddClick = () => {
    resetForm();
    setDialogOpen(true);
  };

  /**
   * Handle edit record click
   * @param {Object} record - Maintenance record to edit
   */
  const handleEditClick = (record) => {
    populateForm(record);
    setEditDialogOpen(true);
  };

  /**
   * Handle add form submission
   * @param {Event} event - Form submit event
   */
  const handleAddSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSaving(true);

    try {
      const formData = getFormData();
      const result = await addMaintenanceRecord(
        formData,
        formData.updateServiceSchedule
      );

      if (result.success) {
        setDialogOpen(false);
        resetForm();
      } else {
        // Handle error - you might want to show this in the UI
        console.error(result.error);
      }
    } catch (error) {
      console.error("Error adding maintenance record:", error);
    } finally {
      setSaving(false);
    }
  };

  /**
   * Handle edit form submission
   * @param {Event} event - Form submit event
   */
  const handleEditSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSaving(true);

    try {
      const formData = getFormData();
      const result = await updateMaintenanceRecord(
        formData.id,
        formData,
        formData.updateServiceSchedule
      );

      if (result.success) {
        setEditDialogOpen(false);
        resetForm();
      } else {
        // Handle error - you might want to show this in the UI
        console.error(result.error);
      }
    } catch (error) {
      console.error("Error updating maintenance record:", error);
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
  };

  /**
   * Handle edit dialog close
   */
  const handleEditDialogClose = () => {
    setEditDialogOpen(false);
    resetForm();
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
          <PageHeader onAddClick={handleAddClick} />

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Statistics Cards */}
          <StatisticsCards stats={stats} />

          {/* Filters */}
          <MaintenanceFilters
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
          <MaintenanceDataGrid
            records={filteredRecords}
            onEditClick={handleEditClick}
            loading={loading}
          />

          {/* Add Maintenance Record Dialog */}
          <MaintenanceFormDialog
            open={dialogOpen}
            onClose={handleDialogClose}
            isEdit={false}
            formData={formData}
            handleInputChange={handleInputChange}
            handleDateChange={handleDateChange}
            handleCheckboxChange={handleCheckboxChange}
            handleSubmit={handleAddSubmit}
            vehicles={vehicles}
            saving={saving}
            errors={errors}
          />

          {/* Edit Maintenance Record Dialog */}
          <MaintenanceFormDialog
            open={editDialogOpen}
            onClose={handleEditDialogClose}
            isEdit={true}
            formData={formData}
            handleInputChange={handleInputChange}
            handleDateChange={handleDateChange}
            handleCheckboxChange={handleCheckboxChange}
            handleSubmit={handleEditSubmit}
            vehicles={vehicles}
            saving={saving}
            errors={errors}
          />
        </Box>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
