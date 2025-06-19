import { Grid, Card, Typography } from "@mui/material";
import {
  LocalGasStation as FuelIcon,
  Build as MaintenanceIcon,
  Assessment as AnalyticsIcon,
} from "@mui/icons-material";
import { useRouter } from "next/navigation";

/**
 * Quick Actions Component for dashboard navigation shortcuts
 * @returns {JSX.Element} Quick actions component
 */
export default function QuickActions() {
  const router = useRouter();

  const actions = [
    {
      title: "Record Fuel",
      icon: <FuelIcon sx={{ fontSize: 40, color: "primary.main", mb: 2 }} />,
      path: "/fuel",
    },
    {
      title: "Record Maintenance",
      icon: (
        <MaintenanceIcon sx={{ fontSize: 40, color: "primary.main", mb: 2 }} />
      ),
      path: "/maintenance",
    },
    {
      title: "View Reports",
      icon: (
        <AnalyticsIcon sx={{ fontSize: 40, color: "primary.main", mb: 2 }} />
      ),
      path: "/reports",
    },
  ];

  return (
    <Grid container spacing={3} sx={{ mb: 6 }}>
      {actions.map((action, index) => (
        <Grid item xs={12} md={4} key={index}>
          <Card
            sx={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              p: 3,
              cursor: "pointer",
              "&:hover": {
                backgroundColor: "action.hover",
                transform: "translateY(-2px)",
                transition: "all 0.3s ease-in-out",
                boxShadow: 4,
              },
            }}
            onClick={() => router.push(action.path)}
          >
            {action.icon}
            <Typography variant="h6" align="center">
              {action.title}
            </Typography>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
