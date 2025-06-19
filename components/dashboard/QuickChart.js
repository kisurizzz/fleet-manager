import { Typography, Paper, Box } from "@mui/material";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { Bar, Line, Doughnut } from "react-chartjs-2";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  ChartTooltip,
  Legend,
  ArcElement
);

/**
 * Quick Chart Component for dashboard visualizations
 * @param {Object} props - Component props
 * @param {string} props.title - Chart title
 * @param {Object} props.data - Chart data object
 * @param {string} props.type - Chart type (bar, line, doughnut)
 * @param {number} props.height - Chart height in pixels
 * @returns {JSX.Element} Chart component
 */
export default function QuickChart({
  title,
  data,
  type = "bar",
  height = 200,
}) {
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
    },
    scales:
      type !== "doughnut"
        ? {
            x: {
              display: false,
            },
            y: {
              display: false,
            },
          }
        : undefined,
  };

  const renderChart = () => {
    switch (type) {
      case "bar":
        return <Bar data={data} options={chartOptions} />;
      case "line":
        return <Line data={data} options={chartOptions} />;
      case "doughnut":
        return <Doughnut data={data} options={chartOptions} />;
      default:
        return <Bar data={data} options={chartOptions} />;
    }
  };

  return (
    <Paper sx={{ p: 2, height: height + 60 }}>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <Box sx={{ height: height }}>{renderChart()}</Box>
    </Paper>
  );
}
