import { Grid, Card, CardContent, Box, Typography } from "@mui/material";
import { Build as MaintenanceIcon } from "@mui/icons-material";
import { formatKES } from "../../../utils/exportHelpers";

/**
 * Statistics cards component for maintenance records
 * @param {Object} stats - Statistics object
 * @returns {JSX.Element} Statistics cards
 */
export const StatisticsCards = ({ stats }) => {
  const statCards = [
    {
      title: "Total Cost (Filtered)",
      value: formatKES(stats.totalCost),
      icon: <MaintenanceIcon color="primary" sx={{ fontSize: 40 }} />,
    },
    {
      title: "Records Count",
      value: stats.recordCount,
      icon: <MaintenanceIcon color="success" sx={{ fontSize: 40 }} />,
    },
    {
      title: "Average Cost",
      value: formatKES(stats.averageCost),
      icon: <MaintenanceIcon color="warning" sx={{ fontSize: 40 }} />,
    },
    {
      title: "This Month",
      value: formatKES(stats.monthlyTotal),
      icon: <MaintenanceIcon color="error" sx={{ fontSize: 40 }} />,
    },
  ];

  return (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      {statCards.map((card, index) => (
        <Grid item xs={12} sm={6} md={3} key={index}>
          <Card>
            <CardContent>
              <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
              >
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    {card.title}
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {card.value}
                  </Typography>
                </Box>
                {card.icon}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};
