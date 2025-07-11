import {
  Paper,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  InputAdornment,
} from "@mui/material";
import { Search as SearchIcon } from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

/**
 * Filters component for maintenance records
 * @param {Object} props - Component props
 * @param {Array} props.vehicles - List of vehicles
 * @param {string} props.searchTerm - Search term
 * @param {Function} props.setSearchTerm - Set search term function
 * @param {string} props.filterVehicle - Selected vehicle filter
 * @param {Function} props.setFilterVehicle - Set vehicle filter function
 * @param {Object} props.filterDateRange - Date range filter
 * @param {Function} props.setFilterDateRange - Set date range function
 * @param {Function} props.clearFilters - Clear all filters function
 * @returns {JSX.Element} Filters component
 */
export const MaintenanceFilters = ({
  vehicles,
  searchTerm,
  setSearchTerm,
  filterVehicle,
  setFilterVehicle,
  filterDateRange,
  setFilterDateRange,
  clearFilters,
}) => {
  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            placeholder="Search by vehicle, description, or service provider..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <FormControl fullWidth>
            <InputLabel>Filter by Vehicle</InputLabel>
            <Select
              value={filterVehicle}
              onChange={(e) => setFilterVehicle(e.target.value)}
              label="Filter by Vehicle"
            >
              <MenuItem value="">All Vehicles</MenuItem>
              {vehicles.map((vehicle) => (
                <MenuItem key={vehicle.id} value={vehicle.id}>
                  {vehicle.regNumber} ({vehicle.make} {vehicle.model})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={2}>
          <DatePicker
            label="From Date"
            value={filterDateRange.start}
            onChange={(value) =>
              setFilterDateRange((prev) => ({ ...prev, start: value }))
            }
            format="dd-MM-yyyy"
            renderInput={(params) => <TextField {...params} fullWidth />}
          />
        </Grid>
        <Grid item xs={12} md={2}>
          <DatePicker
            label="To Date"
            value={filterDateRange.end}
            onChange={(value) =>
              setFilterDateRange((prev) => ({ ...prev, end: value }))
            }
            format="dd-MM-yyyy"
            renderInput={(params) => <TextField {...params} fullWidth />}
          />
        </Grid>
        <Grid item xs={12} md={1}>
          <Button variant="outlined" onClick={clearFilters} fullWidth>
            Clear
          </Button>
        </Grid>
      </Grid>
    </Paper>
  );
};
