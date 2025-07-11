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
} from "@mui/material";
import { Add as AddIcon, Edit as EditIcon } from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

/**
 * Maintenance form dialog component
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
 * @param {boolean} props.saving - Whether form is saving
 * @param {Object} props.errors - Form validation errors
 * @returns {JSX.Element} Maintenance form dialog
 */
export const MaintenanceFormDialog = ({
  open,
  onClose,
  isEdit = false,
  formData,
  handleInputChange,
  handleDateChange,
  handleCheckboxChange,
  handleSubmit,
  vehicles,
  saving = false,
  errors = {},
}) => {
  const title = isEdit ? "Edit Maintenance Record" : "Add Maintenance Record";
  const submitText = saving
    ? isEdit
      ? "Saving..."
      : "Adding..."
    : isEdit
    ? "Save Changes"
    : "Add Record";
  const submitIcon = saving ? (
    <CircularProgress size={20} />
  ) : isEdit ? (
    <EditIcon />
  ) : (
    <AddIcon />
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
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
            <Grid item xs={12}>
              <DatePicker
                label="Date"
                value={formData.date}
                onChange={handleDateChange}
                format="dd-MM-yyyy"
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
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                name="description"
                label="Description"
                multiline
                rows={3}
                value={formData.description}
                onChange={handleInputChange}
                placeholder="e.g., Oil change, brake pad replacement, tire rotation..."
                error={!!errors.description}
                helperText={errors.description}
              />
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
                helperText={errors.cost}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="serviceProvider"
                label="Service Provider"
                value={formData.serviceProvider}
                onChange={handleInputChange}
                placeholder="e.g., AA Kenya, Quick Fix Garage"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="isService"
                    checked={formData.isService}
                    onChange={handleCheckboxChange}
                  />
                }
                label="This is a scheduled service (will update service tracking)"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                name="notes"
                label="Notes"
                multiline
                rows={2}
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Additional notes or observations..."
              />
            </Grid>
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
