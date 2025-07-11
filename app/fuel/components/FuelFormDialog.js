import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Alert,
  Typography,
} from "@mui/material";
import { Add as AddIcon, Edit as EditIcon } from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { formatKES } from "../../../utils/exportHelpers";

/**
 * Fuel form dialog component
 * @param {Object} props - Component props
 * @param {boolean} props.open - Whether dialog is open
 * @param {Function} props.onClose - Close dialog function
 * @param {boolean} props.isEdit - Whether this is for editing
 * @param {Object} props.formData - Form data
 * @param {Function} props.handleInputChange - Input change handler
 * @param {Function} props.handleDateChange - Date change handler
 * @param {Function} props.handleCheckboxChange - Checkbox change handler
 * @param {Function} props.handleSubmit - Form submit handler
 * @param {Array} props.vehicles - List of vehicles
 * @param {Object} props.globalPrices - Global fuel prices
 * @param {boolean} props.saving - Whether form is saving
 * @param {Object} props.errors - Form validation errors
 * @param {Function} props.calculateFuelEfficiency - Calculate fuel efficiency function
 * @returns {JSX.Element} Fuel form dialog
 */
export const FuelFormDialog = ({
  open,
  onClose,
  isEdit = false,
  formData,
  handleInputChange,
  handleDateChange,
  handleCheckboxChange,
  handleSubmit,
  vehicles,
  globalPrices,
  saving = false,
  errors = {},
  calculateFuelEfficiency,
}) => {
  const title = isEdit ? "Edit Fuel Record" : "Add Fuel Record";
  const submitText = saving
    ? isEdit
      ? "Updating..."
      : "Adding..."
    : isEdit
    ? "Update Record"
    : "Add Record";
  const submitIcon = saving ? (
    <CircularProgress size={20} />
  ) : isEdit ? (
    <EditIcon />
  ) : (
    <AddIcon />
  );

  const currentFuelPrice =
    formData.fuelType === "Diesel"
      ? globalPrices.dieselPrice
      : globalPrices.petrolPrice;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControl fullWidth required error={!!errors.vehicleId}>
                <InputLabel>Vehicle</InputLabel>
                <Select
                  name="vehicleId"
                  value={formData.vehicleId}
                  onChange={handleInputChange}
                  label="Vehicle"
                >
                  {vehicles.map((vehicle) => (
                    <MenuItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.regNumber} ({vehicle.make} {vehicle.model})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <DatePicker
                label="Date"
                value={formData.date}
                onChange={handleDateChange}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    fullWidth
                    required
                    error={!!errors.date}
                    helperText={errors.date}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Fuel Type</InputLabel>
                <Select
                  name="fuelType"
                  value={formData.fuelType}
                  onChange={handleInputChange}
                  label="Fuel Type"
                >
                  <MenuItem value="Petrol">Petrol</MenuItem>
                  <MenuItem value="Diesel">Diesel</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                name="cost"
                label="Cost"
                type="number"
                value={formData.cost}
                onChange={handleInputChange}
                inputProps={{ min: 0, step: 0.01 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">KES</InputAdornment>
                  ),
                }}
                error={!!errors.cost}
                helperText={
                  globalPrices.autoPopulate && formData.fuelType
                    ? `Auto-calculating liters using ${
                        formData.fuelType
                      } price: ${formatKES(currentFuelPrice)}/L`
                    : "Enter the total cost paid"
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                name="liters"
                label="Liters"
                type="number"
                value={formData.liters}
                onChange={handleInputChange}
                inputProps={{ min: 0, step: 0.01 }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">L</InputAdornment>
                  ),
                }}
                error={!!errors.liters}
                helperText="Calculated based on cost and current fuel price"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="odometerReading"
                label="Odometer Reading"
                type="number"
                value={formData.odometerReading}
                onChange={handleInputChange}
                inputProps={{ min: 0 }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">km</InputAdornment>
                  ),
                }}
                helperText="Current odometer reading"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="kmTraveled"
                label="Distance Traveled"
                type="number"
                value={formData.kmTraveled}
                onChange={handleInputChange}
                inputProps={{ min: 0 }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">km</InputAdornment>
                  ),
                }}
                helperText="Distance since last fuel-up"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.isFullTank}
                    onChange={handleCheckboxChange}
                    name="isFullTank"
                    color="primary"
                  />
                }
                label="Full Tank"
              />
              <Typography
                variant="caption"
                display="block"
                color="text.secondary"
              >
                Check this box if you filled the tank completely. Efficiency is
                only calculated for full tank records.
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="station"
                label="Gas Station"
                value={formData.station}
                onChange={handleInputChange}
                placeholder="e.g., Shell, Total, Kenol"
                error={!!errors.station}
                helperText={errors.station}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                name="notes"
                label="Notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Additional notes (optional)"
                multiline
                rows={2}
              />
            </Grid>
            {formData.isFullTank &&
              formData.liters &&
              formData.kmTraveled &&
              calculateFuelEfficiency() && (
                <Grid item xs={12}>
                  <Alert severity="success">
                    <Typography variant="body2">
                      <strong>Calculated Fuel Efficiency:</strong>{" "}
                      {calculateFuelEfficiency()} km/L
                    </Typography>
                    <Typography variant="caption" display="block">
                      Efficiency calculated for full tank record
                    </Typography>
                  </Alert>
                </Grid>
              )}
            {!formData.isFullTank && formData.liters && formData.kmTraveled && (
              <Grid item xs={12}>
                <Alert severity="info">
                  <Typography variant="body2">
                    Partial fill detected - efficiency will not be calculated
                  </Typography>
                  <Typography variant="caption" display="block">
                    Check "Full Tank" for accurate efficiency calculation
                  </Typography>
                </Alert>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={saving}
            startIcon={submitIcon}
          >
            {submitText}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
