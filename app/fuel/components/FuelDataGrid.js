import {
  Paper,
  Box,
  Typography,
  IconButton,
  Chip,
  Tooltip,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import {
  LocalGasStation as FuelIcon,
  Edit as EditIcon,
} from "@mui/icons-material";
import { formatKES } from "../../../utils/exportHelpers";

/**
 * Data grid component for fuel records
 * @param {Object} props - Component props
 * @param {Array} props.records - Fuel records to display
 * @param {Function} props.onEditClick - Edit record handler
 * @param {boolean} props.loading - Whether data is loading
 * @returns {JSX.Element} Fuel data grid
 */
export const FuelDataGrid = ({ records, onEditClick, loading = false }) => {
  const columns = [
    {
      field: "formattedDate",
      headerName: "Date",
      width: 120,
      sortable: true,
    },
    {
      field: "vehicleName",
      headerName: "Vehicle",
      width: 250,
      sortable: true,
    },
    {
      field: "liters",
      headerName: "Liters",
      width: 100,
      type: "number",
      valueFormatter: (params) => {
        const value = parseFloat(params.value);
        if (isNaN(value) || value === 0) {
          return "0L";
        }
        return `${value.toFixed(1)}L`;
      },
    },
    {
      field: "cost",
      headerName: "Cost",
      width: 120,
      type: "number",
      valueFormatter: (params) => {
        const value = parseFloat(params.value);
        if (isNaN(value)) {
          return formatKES(0);
        }
        return formatKES(value);
      },
    },
    {
      field: "costPerLiter",
      headerName: "Cost/Liter",
      width: 120,
      type: "number",
      valueGetter: (params) => {
        const row = params.row;
        if (!row || !row.cost || !row.liters || row.liters === 0) {
          return null;
        }
        const cost = parseFloat(row.cost);
        const liters = parseFloat(row.liters);
        if (isNaN(cost) || isNaN(liters) || liters === 0) {
          return null;
        }
        return cost / liters;
      },
      valueFormatter: (params) => {
        const value = parseFloat(params.value);
        if (isNaN(value) || value === 0) {
          return "N/A";
        }
        return formatKES(value);
      },
    },
    {
      field: "fuelEfficiency",
      headerName: "km/L",
      width: 120,
      type: "number",
      valueFormatter: (params) => {
        const value = parseFloat(params.value);
        if (isNaN(value) || value === 0) {
          return "N/A";
        }
        const isPartial = params.row?.isPartialEfficiency || false;
        return `${value.toFixed(1)} km/L${isPartial ? " (partial)" : ""}`;
      },
      renderCell: (params) => {
        const value = parseFloat(params.value);
        if (isNaN(value) || value === 0) {
          return "N/A";
        }
        const isPartial = params.row?.isPartialEfficiency || false;
        return (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography>{`${value.toFixed(1)} km/L`}</Typography>
            {isPartial && (
              <Tooltip title="Partial fueling - efficiency may not reflect full tank performance">
                <Chip
                  label="Partial"
                  size="small"
                  color="warning"
                  variant="outlined"
                />
              </Tooltip>
            )}
          </Box>
        );
      },
    },
    {
      field: "distanceSinceLastFuel",
      headerName: "Distance",
      width: 120,
      type: "number",
      valueFormatter: (params) => {
        const value = parseFloat(params.value);
        if (isNaN(value) || value === 0) {
          return "N/A";
        }
        return `${value.toLocaleString()} km`;
      },
    },
    {
      field: "fillType",
      headerName: "Fill Type",
      width: 100,
      valueFormatter: (value) => {
        if (!value) {
          return "Unknown";
        }
        return value === "full" ? "Full Tank" : "Partial";
      },
      renderCell: (params) => {
        const isFullTank = params.value === "full";
        return (
          <Chip
            label={isFullTank ? "Full Tank" : "Partial"}
            color={isFullTank ? "success" : "default"}
            size="small"
            variant={isFullTank ? "filled" : "outlined"}
          />
        );
      },
    },
    {
      field: "odometerReading",
      headerName: "Odometer",
      width: 120,
      type: "number",
      valueFormatter: (params) => {
        const value = parseFloat(params.value);
        if (isNaN(value) || value === 0) {
          return "N/A";
        }
        return `${value.toLocaleString()} km`;
      },
    },
    {
      field: "station",
      headerName: "Station",
      width: 200,
      sortable: true,
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <IconButton
            size="small"
            onClick={() => onEditClick(params.row)}
            color="primary"
            title="Edit Record"
          >
            <EditIcon />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Paper sx={{ height: 600, width: "100%" }}>
      <DataGrid
        rows={records}
        columns={columns}
        pageSize={25}
        rowsPerPageOptions={[25, 50, 100]}
        disableSelectionOnClick
        density="comfortable"
        loading={loading}
        components={{
          NoRowsOverlay: () => (
            <Box
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              height="100%"
            >
              <FuelIcon sx={{ fontSize: 80, color: "grey.400", mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No fuel records found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Add your first fuel record to get started
              </Typography>
            </Box>
          ),
        }}
      />
    </Paper>
  );
};
