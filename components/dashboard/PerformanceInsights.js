import {
  Paper,
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  IconButton,
  Chip,
  Grid,
} from "@mui/material";
import {
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  Visibility as ViewIcon,
} from "@mui/icons-material";
import { useRouter } from "next/navigation";
import { formatKES } from "../../utils/exportHelpers";

/**
 * Performance Insights Component for displaying top performers and cost issues
 * @param {Object} props - Component props
 * @param {Object} props.analytics - Analytics data containing top performers and issues
 * @returns {JSX.Element} Performance insights component
 */
export default function PerformanceInsights({ analytics }) {
  const router = useRouter();

  return (
    <Grid container spacing={3} sx={{ mb: 4 }}>
      {/* Top Performers */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 3, height: "100%" }}>
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            mb={2}
          >
            <Typography variant="h6" fontWeight="medium">
              Most Efficient Vehicles
            </Typography>
            <TrendingUpIcon color="success" />
          </Box>

          {analytics.topPerformers.length > 0 ? (
            <List dense>
              {analytics.topPerformers.map((vehicle, index) => (
                <ListItem
                  key={vehicle.id}
                  button
                  onClick={() =>
                    router.push(`/vehicles/${vehicle.id}/analytics`)
                  }
                >
                  <ListItemIcon>
                    <Chip label={index + 1} size="small" color="success" />
                  </ListItemIcon>
                  <ListItemText
                    primary={`${vehicle.regNumber} - ${vehicle.make} ${vehicle.model}`}
                    secondary={`${vehicle.efficiency.toFixed(
                      1
                    )} km/L efficiency`}
                  />
                  <IconButton size="small">
                    <ViewIcon />
                  </IconButton>
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography color="text.secondary">
              No efficiency data available
            </Typography>
          )}
        </Paper>
      </Grid>

      {/* Cost Issues */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 3, height: "100%" }}>
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            mb={2}
          >
            <Typography variant="h6" fontWeight="medium">
              Highest Operating Costs
            </Typography>
            <WarningIcon color="warning" />
          </Box>

          {analytics.issues.length > 0 ? (
            <List dense>
              {analytics.issues.map((vehicle, index) => (
                <ListItem key={vehicle.id} disablePadding>
                  <ListItemButton
                    onClick={() =>
                      router.push(`/vehicles/${vehicle.id}/analytics`)
                    }
                  >
                    <ListItemText
                      primary={`${vehicle.regNumber} - ${vehicle.make} ${vehicle.model}`}
                      secondary={`${formatKES(
                        vehicle.costPerKm
                      )}/km operating cost`}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography color="text.secondary">
              No cost data available
            </Typography>
          )}
        </Paper>
      </Grid>
    </Grid>
  );
}
