import { Paper, Box, Typography, Button, Grid, Alert } from "@mui/material";
import { Build as MaintenanceIcon } from "@mui/icons-material";
import { useRouter } from "next/navigation";

/**
 * Service Alerts Component for displaying vehicle service reminders
 * @param {Object} props - Component props
 * @param {Array} props.serviceAlerts - Array of service alert objects
 * @param {boolean} props.loading - Loading state
 * @returns {JSX.Element} Service alerts component
 */
export default function ServiceAlerts({ serviceAlerts, loading }) {
  const router = useRouter();

  return (
    <Paper sx={{ p: 3, mb: 4 }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h5" fontWeight="bold">
          Service Alerts
        </Typography>
        <Button
          variant="outlined"
          size="small"
          startIcon={<MaintenanceIcon />}
          onClick={() => router.push("/maintenance")}
        >
          Record Service
        </Button>
      </Box>

      {loading ? (
        <Alert severity="info">Loading service alerts...</Alert>
      ) : serviceAlerts.length === 0 ? (
        <Alert severity="success">
          All vehicles are up to date with their service schedules!
        </Alert>
      ) : (
        <Grid container spacing={2}>
          {serviceAlerts.map((alert, index) => (
            <Grid item xs={12} md={6} key={index}>
              <Alert
                severity={alert.severity}
                sx={{
                  cursor: "pointer",
                  "&:hover": {
                    boxShadow: 2,
                  },
                }}
                onClick={() => router.push(`/vehicles/${alert.vehicleId}`)}
              >
                <Box>
                  <Typography variant="subtitle2" fontWeight="bold">
                    {alert.vehicleName}
                  </Typography>
                  <Typography variant="body2">
                    {alert.type === "overdue"
                      ? `Service overdue by ${Math.abs(
                          alert.kmUntilService
                        ).toLocaleString()} km`
                      : `Service due in ${alert.kmUntilService.toLocaleString()} km`}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Current: {alert.currentOdometer.toLocaleString()} km | Due
                    at: {alert.nextServiceDue.toLocaleString()} km
                  </Typography>
                </Box>
              </Alert>
            </Grid>
          ))}
        </Grid>
      )}
    </Paper>
  );
}
