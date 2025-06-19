import {
  Paper,
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Grid,
  Card,
  CardContent,
} from "@mui/material";
import { History as HistoryIcon } from "@mui/icons-material";
import { useRouter } from "next/navigation";

// Helper function to safely format dates
const safeFormatDate = (date) => {
  if (!date) return "N/A";
  try {
    // Handle Firestore Timestamp
    if (date.toDate) {
      return new Intl.DateTimeFormat("en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(date.toDate());
    }
    // Handle JavaScript Date
    if (date instanceof Date) {
      return new Intl.DateTimeFormat("en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(date);
    }
    // Handle string date
    if (typeof date === "string") {
      return new Intl.DateTimeFormat("en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(date));
    }
    return "Invalid Date";
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Invalid Date";
  }
};

/**
 * Recent Activities Component for displaying recent fleet activities
 * @param {Object} props - Component props
 * @param {Array} props.recentActivities - Array of recent activity objects
 * @returns {JSX.Element} Recent activities component
 */
export default function RecentActivities({ recentActivities }) {
  const router = useRouter();

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 3, height: "100%" }}>
          <Box display="flex" alignItems="center" sx={{ mb: 2 }}>
            <HistoryIcon sx={{ mr: 1, color: "info.main" }} />
            <Typography variant="h6" fontWeight="medium">
              Recent Activities
            </Typography>
          </Box>

          {recentActivities.length > 0 ? (
            <List dense>
              {recentActivities.map((activity, index) => (
                <ListItem key={index} disablePadding>
                  <ListItemButton
                    onClick={() =>
                      activity.vehicleId &&
                      router.push(`/vehicles/${activity.vehicleId}`)
                    }
                  >
                    <ListItemText
                      primary={activity.title}
                      secondary={activity.description}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography color="text.secondary">No recent activities</Typography>
          )}
        </Paper>
      </Grid>

      {/* Recent Activities Cards */}
      <Grid item xs={12} md={6}>
        <Typography variant="h6" gutterBottom fontWeight="bold">
          Recent Activities
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {recentActivities.slice(0, 5).map((activity, index) => (
            <Card key={index}>
              <CardContent>
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      {activity.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {activity.description}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      {safeFormatDate(activity.date)}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Grid>
    </Grid>
  );
}
