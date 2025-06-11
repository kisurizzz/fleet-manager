"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  InputAdornment,
} from "@mui/material";
import {
  LocalGasStation as FuelIcon,
  Save as SaveIcon,
  History as HistoryIcon,
} from "@mui/icons-material";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db, auth } from "../../../lib/firebase";
import ProtectedRoute from "../../../components/ProtectedRoute";
import DashboardLayout from "../../../components/DashboardLayout";
import { format } from "date-fns";
import { formatKES } from "../../../utils/exportHelpers";

export default function FuelPricesAdminPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Current fuel prices
  const [currentPrices, setCurrentPrices] = useState({
    petrolPrice: 0,
    dieselPrice: 0,
    lastUpdated: null,
    updatedBy: "",
    priceHistory: [],
  });

  // Form data for new prices
  const [newPrices, setNewPrices] = useState({
    petrolPrice: "",
    dieselPrice: "",
  });

  useEffect(() => {
    fetchFuelPrices();
  }, []);

  /**
   * Fetch current fuel prices from Firestore
   */
  const fetchFuelPrices = async () => {
    try {
      setLoading(true);
      setError("");

      const docRef = doc(db, "globalSettings", "fuel-prices");
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setCurrentPrices(data);
        setNewPrices({
          petrolPrice: data.petrolPrice?.toString() || "",
          dieselPrice: data.dieselPrice?.toString() || "",
        });
      } else {
        // Initialize with default values
        const defaultPrices = {
          petrolPrice: 174.63,
          dieselPrice: 164.80,
          lastUpdated: new Date(),
          updatedBy: auth.currentUser?.email || "system",
          priceHistory: [],
        };
        await setDoc(docRef, defaultPrices);
        setCurrentPrices(defaultPrices);
        setNewPrices({
          petrolPrice: defaultPrices.petrolPrice.toString(),
          dieselPrice: defaultPrices.dieselPrice.toString(),
        });
      }
    } catch (error) {
      console.error("Error fetching fuel prices:", error);
      setError("Failed to fetch fuel prices: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle input changes for new prices
   */
  const handlePriceChange = (event) => {
    const { name, value } = event.target;
    setNewPrices(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  /**
   * Update fuel prices
   */
  const handleUpdatePrices = async () => {
    if (!newPrices.petrolPrice || !newPrices.dieselPrice) {
      setError("Please enter both petrol and diesel prices");
      return;
    }

    const petrolPrice = parseFloat(newPrices.petrolPrice);
    const dieselPrice = parseFloat(newPrices.dieselPrice);

    if (petrolPrice <= 0 || dieselPrice <= 0) {
      setError("Prices must be greater than 0");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const docRef = doc(db, "globalSettings", "fuel-prices");
      
      // Add current prices to history
      const newHistoryEntry = {
        date: new Date(),
        petrolPrice: currentPrices.petrolPrice,
        dieselPrice: currentPrices.dieselPrice,
        updatedBy: currentPrices.updatedBy,
      };

      const updatedData = {
        petrolPrice,
        dieselPrice,
        lastUpdated: new Date(),
        updatedBy: auth.currentUser?.email || "admin",
        priceHistory: [newHistoryEntry, ...(currentPrices.priceHistory || [])].slice(0, 20), // Keep last 20 entries
      };

      await updateDoc(docRef, updatedData);
      setCurrentPrices(updatedData);
      setSuccess("Fuel prices updated successfully!");
      
    } catch (error) {
      console.error("Error updating prices:", error);
      setError("Failed to update prices: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress />
          </Box>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <Box>
          {/* Header */}
          <Box mb={3}>
            <Typography variant="h4" gutterBottom fontWeight="bold">
              Fuel Price Management
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage global fuel prices for the fleet management system
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 3 }}>
              {success}
            </Alert>
          )}

          <Grid container spacing={3}>
            {/* Current Prices Display */}
            <Grid item xs={12}>
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Current Fuel Prices
                </Typography>
                
                <Grid container spacing={3}>
                  {/* Petrol Price Card */}
                  <Grid item xs={12} md={6}>
                    <Card sx={{ bgcolor: "success.50", border: "1px solid", borderColor: "success.main" }}>
                      <CardContent>
                        <Box display="flex" alignItems="center" mb={2}>
                          <FuelIcon color="success" sx={{ mr: 2, fontSize: 40 }} />
                          <Box>
                            <Typography variant="h6" color="success.main" fontWeight="bold">
                              Petrol
                            </Typography>
                            <Typography variant="h3" fontWeight="bold" color="success.main">
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
                    <Card sx={{ bgcolor: "warning.50", border: "1px solid", borderColor: "warning.main" }}>
                      <CardContent>
                        <Box display="flex" alignItems="center" mb={2}>
                          <FuelIcon color="warning" sx={{ mr: 2, fontSize: 40 }} />
                          <Box>
                            <Typography variant="h6" color="warning.main" fontWeight="bold">
                              Diesel
                            </Typography>
                            <Typography variant="h3" fontWeight="bold" color="warning.main">
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
                    Last updated: {currentPrices.lastUpdated ? 
                      format(currentPrices.lastUpdated.toDate ? currentPrices.lastUpdated.toDate() : currentPrices.lastUpdated, "dd MMM yyyy 'at' HH:mm") 
                      : "Never"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Updated by: {currentPrices.updatedBy}
                  </Typography>
                </Box>
              </Paper>
            </Grid>

            {/* Update Prices Form */}
            <Grid item xs={12}>
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Update Fuel Prices
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Petrol Price per Liter"
                      name="petrolPrice"
                      value={newPrices.petrolPrice}
                      onChange={handlePriceChange}
                      type="number"
                      inputProps={{ step: "0.01", min: "0" }}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">KES</InputAdornment>,
                      }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Diesel Price per Liter"
                      name="dieselPrice"
                      value={newPrices.dieselPrice}
                      onChange={handlePriceChange}
                      type="number"
                      inputProps={{ step: "0.01", min: "0" }}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">KES</InputAdornment>,
                      }}
                    />
                  </Grid>
                </Grid>

                <Box mt={3}>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleUpdatePrices}
                    disabled={saving}
                    size="large"
                  >
                    {saving ? "Updating..." : "Update Prices"}
                  </Button>
                </Box>
              </Paper>
            </Grid>

            {/* Price History */}
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  <HistoryIcon sx={{ mr: 1, verticalAlign: "middle" }} />
                  Price History
                </Typography>
                
                {currentPrices.priceHistory && currentPrices.priceHistory.length > 0 ? (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell><strong>Date</strong></TableCell>
                          <TableCell align="right"><strong>Petrol</strong></TableCell>
                          <TableCell align="right"><strong>Diesel</strong></TableCell>
                          <TableCell><strong>Updated By</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {currentPrices.priceHistory.slice(0, 15).map((entry, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              {format(entry.date.toDate ? entry.date.toDate() : entry.date, "dd MMM yyyy HH:mm")}
                            </TableCell>
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
            </Grid>
          </Grid>
        </Box>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
