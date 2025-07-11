import { Box, Typography, Button } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";

/**
 * Page header component for fuel records
 * @param {Object} props - Component props
 * @param {Function} props.onAddClick - Add record button click handler
 * @returns {JSX.Element} Page header
 */
export const FuelPageHeader = ({ onAddClick }) => {
  return (
    <Box
      display="flex"
      justifyContent="space-between"
      alignItems="center"
      mb={3}
    >
      <Box>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          Fuel Records
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Track fuel consumption and costs for your fleet
        </Typography>
      </Box>
      <Button variant="contained" startIcon={<AddIcon />} onClick={onAddClick}>
        Add Fuel Record
      </Button>
    </Box>
  );
};
