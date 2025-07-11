import { Box, CircularProgress } from "@mui/material";

/**
 * Fuel prices loading component
 * @returns {JSX.Element} Loading display
 */
export const FuelPricesLoading = () => {
  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="400px"
    >
      <CircularProgress />
    </Box>
  );
};
