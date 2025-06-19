import {
  Paper,
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
} from "@mui/material";
import {
  LocalGasStation as FuelIcon,
  Assessment as AnalyticsIcon,
  Settings as SettingsIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  CreditCard as CreditIcon,
} from "@mui/icons-material";
import { useRouter } from "next/navigation";
import { formatKES } from "../../utils/exportHelpers";

/**
 * Fuel Overview Component for monthly fuel statistics
 * @param {Object} props - Component props
 * @param {Object} props.monthlyStats - Monthly statistics data
 * @returns {JSX.Element} Fuel overview component
 */
export default function FuelOverview({ monthlyStats }) {
  const router = useRouter();

  return (
    <Grid container spacing={3} sx={{ mb: 4 }}>
      <Grid item xs={12}>
        <Paper sx={{ p: 3 }}>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={3}
          >
            <Typography variant="h5" fontWeight="bold">
              Monthly Fuel Overview
            </Typography>
            <Box display="flex" gap={1}>
              <Button
                variant="contained"
                size="small"
                startIcon={<FuelIcon />}
                onClick={() => router.push("/fuel")}
              >
                Add Record
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<SettingsIcon />}
                onClick={() => router.push("/admin/fuel-prices")}
              >
                Manage Prices
              </Button>
            </Box>
          </Box>

          <Grid container spacing={3}>
            {/* Total Fuel Cost Card */}
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ height: "100%" }}>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <FuelIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6" color="text.secondary">
                      Total Fuel Cost
                    </Typography>
                  </Box>
                  <Typography
                    variant="h4"
                    fontWeight="bold"
                    color="primary.main"
                  >
                    {formatKES(monthlyStats.currentMonth.fuelCost)}
                  </Typography>
                  <Box display="flex" alignItems="center" mt={1}>
                    {monthlyStats.currentMonth.fuelCost >
                    monthlyStats.previousMonth.fuelCost ? (
                      <TrendingUpIcon color="error" fontSize="small" />
                    ) : (
                      <TrendingDownIcon color="success" fontSize="small" />
                    )}
                    <Typography
                      variant="caption"
                      color={
                        monthlyStats.currentMonth.fuelCost >
                        monthlyStats.previousMonth.fuelCost
                          ? "error.main"
                          : "success.main"
                      }
                      sx={{ ml: 0.5 }}
                    >
                      {Math.abs(
                        ((monthlyStats.currentMonth.fuelCost -
                          monthlyStats.previousMonth.fuelCost) /
                          (monthlyStats.previousMonth.fuelCost || 1)) *
                          100
                      ).toFixed(1)}
                      % vs last month
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Petrol Cost Card */}
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ height: "100%" }}>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <FuelIcon color="success" sx={{ mr: 1 }} />
                    <Typography variant="h6" color="text.secondary">
                      Petrol Cost
                    </Typography>
                  </Box>
                  <Typography
                    variant="h4"
                    fontWeight="bold"
                    color="success.main"
                  >
                    {formatKES(monthlyStats.currentMonth.petrolCost || 0)}
                  </Typography>
                  <Chip
                    size="small"
                    label={`${
                      monthlyStats.currentMonth.petrolVehicles || 0
                    } vehicles`}
                    color="success"
                    variant="outlined"
                    sx={{ mt: 1 }}
                  />
                </CardContent>
              </Card>
            </Grid>

            {/* Diesel Cost Card */}
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ height: "100%" }}>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <FuelIcon color="warning" sx={{ mr: 1 }} />
                    <Typography variant="h6" color="text.secondary">
                      Diesel Cost
                    </Typography>
                  </Box>
                  <Typography
                    variant="h4"
                    fontWeight="bold"
                    color="warning.main"
                  >
                    {formatKES(monthlyStats.currentMonth.dieselCost || 0)}
                  </Typography>
                  <Chip
                    size="small"
                    label={`${
                      monthlyStats.currentMonth.dieselVehicles || 0
                    } vehicles`}
                    color="warning"
                    variant="outlined"
                    sx={{ mt: 1 }}
                  />
                </CardContent>
              </Card>
            </Grid>

            {/* Fuel Consumption Card */}
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ height: "100%" }}>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <AnalyticsIcon color="info" sx={{ mr: 1 }} />
                    <Typography variant="h6" color="text.secondary">
                      Total Consumption
                    </Typography>
                  </Box>
                  <Typography variant="h4" fontWeight="bold" color="info.main">
                    {(monthlyStats.currentMonth.totalLiters || 0).toFixed(0)}L
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 1 }}
                  >
                    Avg:{" "}
                    {formatKES(
                      monthlyStats.currentMonth.totalLiters > 0
                        ? monthlyStats.currentMonth.fuelCost /
                            monthlyStats.currentMonth.totalLiters
                        : 0
                    )}
                    /L
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Fuel Cost + Credit Combined Card */}
          <Grid container spacing={3} sx={{ mt: 2 }}>
            <Grid item xs={12} sm={6} md={4}>
              <Card
                sx={{
                  height: "100%",
                  cursor: "pointer",
                  border: 2,
                  borderColor: "secondary.main",
                  "&:hover": {
                    boxShadow: 4,
                    borderColor: "secondary.dark",
                  },
                }}
                onClick={() => router.push("/fuel/loans")}
              >
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <CreditIcon color="secondary" sx={{ mr: 1 }} />
                    <Typography variant="h6" color="text.secondary">
                      Monthly Fuel + Credit
                    </Typography>
                  </Box>
                  <Typography
                    variant="h4"
                    fontWeight="bold"
                    color="secondary.main"
                  >
                    {formatKES(
                      (monthlyStats.currentMonth.fuelCost || 0) +
                        (monthlyStats.currentMonth.creditAmount || 0)
                    )}
                  </Typography>
                  <Box display="flex" alignItems="center" mt={1}>
                    <Box sx={{ mr: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Fuel:{" "}
                        {formatKES(monthlyStats.currentMonth.fuelCost || 0)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Credit:{" "}
                        {formatKES(monthlyStats.currentMonth.creditAmount || 0)}
                      </Typography>
                    </Box>
                    <Box>
                      {(monthlyStats.currentMonth.fuelCost || 0) +
                        (monthlyStats.currentMonth.creditAmount || 0) >
                      (monthlyStats.previousMonth.fuelCost || 0) +
                        (monthlyStats.previousMonth.creditAmount || 0) ? (
                        <TrendingUpIcon color="error" fontSize="small" />
                      ) : (
                        <TrendingDownIcon color="success" fontSize="small" />
                      )}
                      <Typography
                        variant="caption"
                        color={
                          (monthlyStats.currentMonth.fuelCost || 0) +
                            (monthlyStats.currentMonth.creditAmount || 0) >
                          (monthlyStats.previousMonth.fuelCost || 0) +
                            (monthlyStats.previousMonth.creditAmount || 0)
                            ? "error.main"
                            : "success.main"
                        }
                        sx={{ ml: 0.5 }}
                      >
                        {(monthlyStats.previousMonth.fuelCost || 0) +
                          (monthlyStats.previousMonth.creditAmount || 0) >
                        0
                          ? Math.abs(
                              (((monthlyStats.currentMonth.fuelCost || 0) +
                                (monthlyStats.currentMonth.creditAmount || 0) -
                                ((monthlyStats.previousMonth.fuelCost || 0) +
                                  (monthlyStats.previousMonth.creditAmount ||
                                    0))) /
                                ((monthlyStats.previousMonth.fuelCost || 0) +
                                  (monthlyStats.previousMonth.creditAmount ||
                                    0))) *
                                100
                            ).toFixed(1)
                          : "0"}
                        % vs last month
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Monthly Comparison */}
          <Box mt={3} p={2} bgcolor="grey.50" borderRadius={1}>
            <Typography variant="h6" gutterBottom>
              Monthly Comparison
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Current Month
                </Typography>
                <Typography variant="h6" fontWeight="bold">
                  {formatKES(monthlyStats.currentMonth.fuelCost)}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Previous Month
                </Typography>
                <Typography variant="h6" fontWeight="bold">
                  {formatKES(monthlyStats.previousMonth.fuelCost)}
                </Typography>
              </Grid>
            </Grid>
            <Box mt={1}>
              <Typography variant="body2" color="text.secondary">
                Difference:
                <Chip
                  size="small"
                  label={`${formatKES(
                    Math.abs(
                      monthlyStats.currentMonth.fuelCost -
                        monthlyStats.previousMonth.fuelCost
                    )
                  )}`}
                  color={
                    monthlyStats.currentMonth.fuelCost >
                    monthlyStats.previousMonth.fuelCost
                      ? "error"
                      : "success"
                  }
                  variant="outlined"
                  sx={{ ml: 1 }}
                />
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Grid>
    </Grid>
  );
}
