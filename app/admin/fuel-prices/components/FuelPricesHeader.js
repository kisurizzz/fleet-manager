import { Box, Typography } from "@mui/material";

/**
 * Fuel prices page header component
 * @returns {JSX.Element} Page header
 */
export const FuelPricesHeader = () => {
  return (
    <Box mb={3}>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        Fuel Price Management
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Manage global fuel prices for the fleet management system
      </Typography>
    </Box>
  );
};
