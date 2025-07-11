import { Alert } from "@mui/material";

/**
 * Fuel prices alerts component
 * @param {Object} props - Component props
 * @param {string} props.error - Error message
 * @param {string} props.success - Success message
 * @returns {JSX.Element} Alerts display
 */
export const FuelPricesAlerts = ({ error, success }) => {
  return (
    <>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}
    </>
  );
};
