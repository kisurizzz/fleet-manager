import { Paper, Typography, Grid, Card, CardContent, Box } from "@mui/material";
import { LocalGasStation as FuelIcon } from "@mui/icons-material";
import { format } from "date-fns";
import { formatKES } from "../../../../utils/exportHelpers";

/**
 * Current prices display component
 * @param {Object} props - Component props
 * @param {Object} props.currentPrices - Current fuel prices data
 * @returns {JSX.Element} Current prices display
 */
export const CurrentPricesDisplay = ({ currentPrices }) => {
  const formatDate = (date) => {
    if (!date) return "Never";
    const dateObj = date.toDate ? date.toDate() : date;
    return format(dateObj, "dd MMM yyyy 'at' HH:mm");
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Current Fuel Prices
      </Typography>

      <Grid container spacing={3}>
        {/* Petrol Price Card */}
        <Grid item xs={12} md={6}>
          <Card
            sx={{
              bgcolor: "success.50",
              border: "1px solid",
              borderColor: "success.main",
            }}
          >
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <FuelIcon color="success" sx={{ mr: 2, fontSize: 40 }} />
                <Box>
                  <Typography
                    variant="h6"
                    color="success.main"
                    fontWeight="bold"
                  >
                    Petrol
                  </Typography>
                  <Typography
                    variant="h3"
                    fontWeight="bold"
                    color="success.main"
                  >
                    {formatKES(currentPrices.petrolPrice)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    per Liter
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Diesel Price Card */}
        <Grid item xs={12} md={6}>
          <Card
            sx={{
              bgcolor: "warning.50",
              border: "1px solid",
              borderColor: "warning.main",
            }}
          >
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <FuelIcon color="warning" sx={{ mr: 2, fontSize: 40 }} />
                <Box>
                  <Typography
                    variant="h6"
                    color="warning.main"
                    fontWeight="bold"
                  >
                    Diesel
                  </Typography>
                  <Typography
                    variant="h3"
                    fontWeight="bold"
                    color="warning.main"
                  >
                    {formatKES(currentPrices.dieselPrice)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    per Liter
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box mt={2}>
        <Typography variant="body2" color="text.secondary">
          Last updated: {formatDate(currentPrices.lastUpdated)}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Updated by: {currentPrices.updatedBy}
        </Typography>
      </Box>
    </Paper>
  );
};
