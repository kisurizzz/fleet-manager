import {
  Paper,
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Alert,
  Chip,
  Grid,
} from "@mui/material";
import { Warning as WarningIcon } from "@mui/icons-material";
import { useRouter } from "next/navigation";

/**
 * Expiry Alerts Component for displaying insurance and inspection expiry alerts
 * @param {Object} props - Component props
 * @param {Object} props.analytics - Analytics data containing expiring vehicles
 * @returns {JSX.Element} Expiry alerts component
 */
export default function ExpiryAlerts({ analytics }) {
  const router = useRouter();

  return (
    <Grid container spacing={3}>
      {/* Insurance Expiry Alerts */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 3, height: "100%" }}>
          <Box display="flex" alignItems="center" sx={{ mb: 2 }}>
            <WarningIcon sx={{ mr: 1, color: "warning.main" }} />
            <Typography variant="h6" fontWeight="medium">
              Insurance Expiry Alerts
            </Typography>
          </Box>

          {analytics.expiringInsuranceVehicles.length > 0 ? (
            <>
              <Alert 
                severity={analytics.expiringInsuranceVehicles.some(v => v.daysUntilExpiry < 0) ? "error" : "warning"} 
                sx={{ mb: 2 }}
              >
                {analytics.expiringInsuranceVehicles.filter(v => v.daysUntilExpiry < 0).length > 0 && 
                  `${analytics.expiringInsuranceVehicles.filter(v => v.daysUntilExpiry < 0).length} vehicle(s) have expired insurance. `}
                {analytics.expiringInsuranceVehicles.filter(v => v.daysUntilExpiry >= 0).length > 0 && 
                  `${analytics.expiringInsuranceVehicles.filter(v => v.daysUntilExpiry >= 0).length} vehicle(s) have insurance expiring soon.`}
              </Alert>
              <List dense>
                {analytics.expiringInsuranceVehicles
                  .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)
                  .map((vehicle) => (
                    <ListItem key={vehicle.id} disablePadding>
                      <ListItemButton
                        onClick={() => router.push(`/vehicles/${vehicle.id}`)}
                      >
                        <ListItemText
                          primary={`${vehicle.regNumber} - ${vehicle.make} ${vehicle.model}`}
                          secondary={
                            vehicle.daysUntilExpiry < 0
                              ? `Insurance expired ${Math.abs(vehicle.daysUntilExpiry)} days ago`
                              : `Insurance expires in ${vehicle.daysUntilExpiry} days`
                          }
                        />
                        <Chip
                          label={
                            vehicle.daysUntilExpiry < 0
                              ? "EXPIRED"
                              : `${vehicle.daysUntilExpiry} days`
                          }
                          color={
                            vehicle.daysUntilExpiry < 0 
                              ? "error" 
                              : vehicle.daysUntilExpiry <= 7 
                              ? "error" 
                              : "warning"
                          }
                          size="small"
                          sx={{ ml: 1 }}
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
              </List>
            </>
          ) : (
            <Alert severity="success">
              No vehicles with expired or expiring insurance
            </Alert>
          )}
        </Paper>
      </Grid>

      {/* Inspection Expiry Alerts */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 3, height: "100%" }}>
          <Box display="flex" alignItems="center" sx={{ mb: 2 }}>
            <WarningIcon sx={{ mr: 1, color: "warning.main" }} />
            <Typography variant="h6" fontWeight="medium">
              Inspection Expiry Alerts
            </Typography>
          </Box>

          {analytics.expiringInspectionVehicles?.length > 0 ? (
            <>
              <Alert 
                severity={analytics.expiringInspectionVehicles.some(v => v.daysUntilExpiry < 0) ? "error" : "warning"} 
                sx={{ mb: 2 }}
              >
                {analytics.expiringInspectionVehicles.filter(v => v.daysUntilExpiry < 0).length > 0 && 
                  `${analytics.expiringInspectionVehicles.filter(v => v.daysUntilExpiry < 0).length} vehicle(s) have expired inspection. `}
                {analytics.expiringInspectionVehicles.filter(v => v.daysUntilExpiry >= 0).length > 0 && 
                  `${analytics.expiringInspectionVehicles.filter(v => v.daysUntilExpiry >= 0).length} vehicle(s) have inspection expiring soon.`}
              </Alert>
              <List dense>
                {analytics.expiringInspectionVehicles
                  .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)
                  .map((vehicle) => (
                    <ListItem key={vehicle.id} disablePadding>
                      <ListItemButton
                        onClick={() => router.push(`/vehicles/${vehicle.id}`)}
                      >
                        <ListItemText
                          primary={`${vehicle.regNumber} - ${vehicle.make} ${vehicle.model}`}
                          secondary={
                            vehicle.daysUntilExpiry < 0
                              ? `Inspection expired ${Math.abs(vehicle.daysUntilExpiry)} days ago`
                              : `Inspection expires in ${vehicle.daysUntilExpiry} days`
                          }
                        />
                        <Chip
                          label={
                            vehicle.daysUntilExpiry < 0
                              ? "EXPIRED"
                              : `${vehicle.daysUntilExpiry} days`
                          }
                          color={
                            vehicle.daysUntilExpiry < 0 
                              ? "error" 
                              : vehicle.daysUntilExpiry <= 7 
                              ? "error" 
                              : "warning"
                          }
                          size="small"
                          sx={{ ml: 1 }}
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
              </List>
            </>
          ) : (
            <Alert severity="success">
              No vehicles with expired or expiring inspection
            </Alert>
          )}
        </Paper>
      </Grid>
    </Grid>
  );
}
