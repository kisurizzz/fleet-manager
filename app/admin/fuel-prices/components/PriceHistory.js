import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import { History as HistoryIcon } from "@mui/icons-material";
import { format } from "date-fns";
import { formatKES } from "../../../../utils/exportHelpers";

/**
 * Price history component
 * @param {Object} props - Component props
 * @param {Array} props.priceHistory - Price history data
 * @returns {JSX.Element} Price history display
 */
export const PriceHistory = ({ priceHistory }) => {
  const formatDate = (date) => {
    const dateObj = date.toDate ? date.toDate() : date;
    return format(dateObj, "dd MMM yyyy HH:mm");
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        <HistoryIcon sx={{ mr: 1, verticalAlign: "middle" }} />
        Price History
      </Typography>

      {priceHistory && priceHistory.length > 0 ? (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <strong>Date</strong>
                </TableCell>
                <TableCell align="right">
                  <strong>Petrol</strong>
                </TableCell>
                <TableCell align="right">
                  <strong>Diesel</strong>
                </TableCell>
                <TableCell>
                  <strong>Updated By</strong>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {priceHistory.slice(0, 15).map((entry, index) => (
                <TableRow key={index}>
                  <TableCell>{formatDate(entry.date)}</TableCell>
                  <TableCell align="right">
                    {formatKES(entry.petrolPrice)}
                  </TableCell>
                  <TableCell align="right">
                    {formatKES(entry.dieselPrice)}
                  </TableCell>
                  <TableCell>{entry.updatedBy}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Typography color="text.secondary">
          No price history available yet.
        </Typography>
      )}
    </Paper>
  );
};
