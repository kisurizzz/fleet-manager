import { Card, CardContent, Typography, Box } from "@mui/material";
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
} from "@mui/icons-material";

/**
 * Enhanced Analytics Card Component
 * @param {Object} props - Component props
 * @param {string} props.title - Card title
 * @param {string|number} props.value - Main value to display
 * @param {string} props.subtitle - Optional subtitle
 * @param {JSX.Element} props.icon - Icon to display
 * @param {string} props.color - Color theme (primary, secondary, etc.)
 * @param {Object} props.trend - Trend information with direction and text
 * @param {Function} props.onClick - Click handler
 * @returns {JSX.Element} Analytics card component
 */
export default function AnalyticsCard({
  title,
  value,
  subtitle,
  icon,
  color = "primary",
  trend,
  onClick,
}) {
  return (
    <Card
      sx={{ height: "100%", cursor: onClick ? "pointer" : "default" }}
      onClick={onClick}
    >
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="text.secondary" gutterBottom variant="h6">
              {title}
            </Typography>
            <Typography variant="h4" component="div" fontWeight="bold">
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
            {trend && (
              <Box display="flex" alignItems="center" mt={1}>
                {trend.direction === "up" ? (
                  <TrendingUpIcon color="success" fontSize="small" />
                ) : trend.direction === "down" ? (
                  <TrendingDownIcon color="error" fontSize="small" />
                ) : null}
                <Typography
                  variant="caption"
                  color={
                    trend.direction === "up"
                      ? "success.main"
                      : trend.direction === "down"
                      ? "error.main"
                      : "text.secondary"
                  }
                  sx={{ ml: 0.5 }}
                >
                  {trend.text}
                </Typography>
              </Box>
            )}
          </Box>
          <Box
            sx={{
              backgroundColor: `${color}.main`,
              color: "white",
              borderRadius: "50%",
              width: 56,
              height: 56,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
