import {
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  Box,
  InputAdornment,
} from "@mui/material";
import { Save as SaveIcon } from "@mui/icons-material";

/**
 * Update prices form component
 * @param {Object} props - Component props
 * @param {Object} props.newPrices - New prices form data
 * @param {Function} props.handlePriceChange - Price change handler
 * @param {Function} props.handleUpdatePrices - Update prices handler
 * @param {boolean} props.saving - Whether form is saving
 * @returns {JSX.Element} Update prices form
 */
export const UpdatePricesForm = ({
  newPrices,
  handlePriceChange,
  handleUpdatePrices,
  saving = false,
}) => {
  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Update Fuel Prices
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Petrol Price per Liter"
            name="petrolPrice"
            value={newPrices.petrolPrice}
            onChange={handlePriceChange}
            type="number"
            inputProps={{ step: "0.01", min: "0" }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">KES</InputAdornment>
              ),
            }}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Diesel Price per Liter"
            name="dieselPrice"
            value={newPrices.dieselPrice}
            onChange={handlePriceChange}
            type="number"
            inputProps={{ step: "0.01", min: "0" }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">KES</InputAdornment>
              ),
            }}
          />
        </Grid>
      </Grid>

      <Box mt={3}>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleUpdatePrices}
          disabled={saving}
          size="large"
        >
          {saving ? "Updating..." : "Update Prices"}
        </Button>
      </Box>
    </Paper>
  );
};
