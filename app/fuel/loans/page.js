"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  IconButton,
  Menu,
  MenuItem,
  Chip,
} from "@mui/material";
import {
  Add as AddIcon,
  MoreVert as MoreIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as PaidIcon,
} from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../../lib/firebase";
import ProtectedRoute from "../../../components/ProtectedRoute";
import DashboardLayout from "../../../components/DashboardLayout";
import { format } from "date-fns";
import { formatKES } from "../../../utils/exportHelpers";

// Helper function to safely format dates
const safeFormatDate = (date) => {
  if (!date) return "N/A";
  try {
    return format(date, "dd MMM yyyy");
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Invalid Date";
  }
};

// Dynamically import the page content to avoid hydration issues
const FuelCreditContent = () => {
  const [mounted, setMounted] = useState(false);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [formData, setFormData] = useState({
    amount: "",
    date: new Date(),
    paymentDate: new Date(),
    notes: "",
  });

  useEffect(() => {
    setMounted(true);
    fetchLoans();
  }, []);

  const fetchLoans = async () => {
    try {
      setLoading(true);
      setError("");

      const loansQuery = query(
        collection(db, "fuelLoans"),
        orderBy("date", "desc")
      );
      const snapshot = await getDocs(loansQuery);
      const loansList = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          date: data.date?.toDate(),
          paymentDate: data.paymentDate?.toDate(),
        };
      });

      setLoans(loansList);
    } catch (error) {
      console.error("Error fetching loans:", error);
      setError("Failed to load loans. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (loan = null) => {
    if (loan) {
      setFormData({
        amount: loan.amount.toString(),
        date: loan.date || new Date(),
        paymentDate: loan.paymentDate || new Date(),
        notes: loan.notes || "",
      });
      setSelectedLoan(loan);
    } else {
      setFormData({
        amount: "",
        date: new Date(),
        paymentDate: new Date(),
        notes: "",
      });
      setSelectedLoan(null);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedLoan(null);
    setFormData({
      amount: "",
      date: new Date(),
      paymentDate: new Date(),
      notes: "",
    });
  };

  const handleMenuOpen = (event, loan) => {
    setAnchorEl(event.currentTarget);
    setSelectedLoan(loan);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedLoan(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const loanData = {
        amount: parseFloat(formData.amount),
        date: Timestamp.fromDate(formData.date),
        paymentDate: Timestamp.fromDate(formData.paymentDate),
        station: "Shell Woodvale Grove",
        status: "paid",
        notes: formData.notes,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      if (selectedLoan) {
        await updateDoc(doc(db, "fuelLoans", selectedLoan.id), {
          ...loanData,
          updatedAt: Timestamp.now(),
        });
      } else {
        await addDoc(collection(db, "fuelLoans"), loanData);
      }

      handleCloseDialog();
      fetchLoans();
    } catch (error) {
      console.error("Error saving loan:", error);
      setError("Failed to save loan. Please try again.");
    }
  };

  const handleDelete = async () => {
    if (!selectedLoan) return;

    if (!confirm("Are you sure you want to delete this credit record?")) {
      return;
    }

    try {
      await deleteDoc(doc(db, "fuelLoans", selectedLoan.id));
      handleMenuClose();
      fetchLoans();
    } catch (error) {
      console.error("Error deleting loan:", error);
      setError("Failed to delete loan. Please try again.");
    }
  };

  if (!mounted) {
    return null;
  }

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        {/* Header */}
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={3}
        >
          <Box>
            <Typography variant="h4" gutterBottom fontWeight="bold">
              Fuel Credit History
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Track fuel credit transactions from Shell Woodvale Grove
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Record Credit
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Total Credits Recorded
                </Typography>
                <Typography variant="h4" component="div">
                  {loans.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Total Amount
                </Typography>
                <Typography variant="h4" component="div">
                  {formatKES(loans.reduce((sum, loan) => sum + loan.amount, 0))}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Loans List */}
        <Paper sx={{ p: 2 }}>
          <Grid container spacing={2}>
            {loans.map((loan) => (
              <Grid item xs={12} key={loan.id}>
                <Card>
                  <CardContent>
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Box>
                        <Typography variant="h6" gutterBottom>
                          {formatKES(loan.amount)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Loan Date: {safeFormatDate(loan.date)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Paid On: {safeFormatDate(loan.paymentDate)}
                        </Typography>
                        {loan.notes && (
                          <Typography variant="body2" color="text.secondary">
                            Notes: {loan.notes}
                          </Typography>
                        )}
                      </Box>
                      <Box display="flex" alignItems="center">
                        <Chip
                          icon={<PaidIcon />}
                          label="Paid"
                          color="success"
                          sx={{ mr: 1 }}
                        />
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuOpen(e, loan)}
                        >
                          <MoreIcon />
                        </IconButton>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>

        {/* Add/Edit Dialog */}
        <Dialog
          open={openDialog}
          onClose={handleCloseDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            {selectedLoan ? "Edit Credit Record" : "Record New Credit"}
          </DialogTitle>
          <DialogContent>
            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Amount"
                    type="number"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                    required
                    InputProps={{
                      startAdornment: "KES ",
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DatePicker
                    label="Loan Date"
                    value={formData.date}
                    onChange={(date) => setFormData({ ...formData, date })}
                    renderInput={(params) => (
                      <TextField {...params} fullWidth required />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DatePicker
                    label="Payment Date"
                    value={formData.paymentDate}
                    onChange={(date) =>
                      setFormData({ ...formData, paymentDate: date })
                    }
                    renderInput={(params) => (
                      <TextField {...params} fullWidth required />
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Notes"
                    multiline
                    rows={3}
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    placeholder="Optional notes about the credit"
                  />
                </Grid>
              </Grid>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSubmit} variant="contained">
              {selectedLoan ? "Update" : "Record"} Credit
            </Button>
          </DialogActions>
        </Dialog>

        {/* Actions Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem
            onClick={() => {
              handleOpenDialog(selectedLoan);
              handleMenuClose();
            }}
          >
            <EditIcon sx={{ mr: 1 }} fontSize="small" />
            Edit
          </MenuItem>
          <MenuItem onClick={handleDelete}>
            <DeleteIcon sx={{ mr: 1 }} fontSize="small" />
            Delete
          </MenuItem>
        </Menu>
      </Box>
    </LocalizationProvider>
  );
};

// Wrap the page component with dynamic import and no SSR
const FuelCreditPage = () => {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <FuelCreditContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default dynamic(() => Promise.resolve(FuelCreditPage), {
  ssr: false,
});
