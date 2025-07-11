import { Paper, Box, Typography, IconButton } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import {
  Build as MaintenanceIcon,
  Edit as EditIcon,
} from "@mui/icons-material";
import { formatKES } from "../../../utils/exportHelpers";

/**
 * Data grid component for maintenance records
 * @param {Object} props - Component props
 * @param {Array} props.records - Maintenance records to display
 * @param {Function} props.onEditClick - Edit record handler
 * @param {boolean} props.loading - Whether data is loading
 * @returns {JSX.Element} Maintenance data grid
 */
export const MaintenanceDataGrid = ({
  records,
  onEditClick,
  loading = false,
}) => {
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
      field: "description",
      headerName: "Description",
      width: 300,
      sortable: true,
    },
    {
      field: "cost",
      headerName: "Cost",
      width: 120,
      type: "number",
      valueFormatter: ({ value }) => formatKES(value || 0),
    },
    {
      field: "serviceProvider",
      headerName: "Service Provider",
      width: 200,
      sortable: true,
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 100,
      sortable: false,
      renderCell: (params) => (
        <IconButton
          color="primary"
          onClick={() => onEditClick(params.row)}
          size="small"
        >
          <EditIcon />
        </IconButton>
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
              <MaintenanceIcon
                sx={{ fontSize: 80, color: "grey.400", mb: 2 }}
              />
              <Typography variant="h6" color="text.secondary">
                No maintenance records found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Add your first maintenance record to get started
              </Typography>
            </Box>
          ),
        }}
      />
    </Paper>
  );
};
