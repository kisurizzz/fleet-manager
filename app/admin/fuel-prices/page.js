"use client";

import { Box, Grid } from "@mui/material";
import ProtectedRoute from "../../../components/ProtectedRoute";
import DashboardLayout from "../../../components/DashboardLayout";
import { useFuelPrices } from "./hooks";
import {
  FuelPricesHeader,
  FuelPricesAlerts,
  FuelPricesLoading,
  CurrentPricesDisplay,
  UpdatePricesForm,
  PriceHistory,
} from "./components";

export default function FuelPricesAdminPage() {
  const {
    currentPrices,
    newPrices,
    loading,
    saving,
    error,
    success,
    handlePriceChange,
    updateFuelPrices,
  } = useFuelPrices();

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <FuelPricesLoading />
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <Box>
          <FuelPricesHeader />

          <FuelPricesAlerts error={error} success={success} />

          <Grid container spacing={3}>
            {/* Current Prices Display */}
            <Grid item xs={12}>
              <CurrentPricesDisplay currentPrices={currentPrices} />
            </Grid>

            {/* Update Prices Form */}
            <Grid item xs={12}>
              <UpdatePricesForm
                newPrices={newPrices}
                handlePriceChange={handlePriceChange}
                handleUpdatePrices={updateFuelPrices}
                saving={saving}
              />
            </Grid>

            {/* Price History */}
            <Grid item xs={12}>
              <PriceHistory priceHistory={currentPrices.priceHistory} />
            </Grid>
          </Grid>
        </Box>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
