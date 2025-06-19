"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Divider,
} from "@mui/material";
import { Save as SaveIcon, ArrowBack as BackIcon } from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../../../lib/firebase";
import ProtectedRoute from "../../../../components/ProtectedRoute";
import DashboardLayout from "../../../../components/DashboardLayout";
import { getLatestOdometerReading } from "../../../../utils/serviceHelpers";

// Default amenities list with status options
const DEFAULT_AMENITIES = {
  wifiGadgets: { status: "present", phoneNumbers: "" },
  servietteBox: { status: "present" },
  carMats: { status: "present" },
  chargerHead: { status: "present" },
  chargingCable: { status: "present" },
  coolerBox: { status: "present" },
  umbrellas: { status: "present" },
  kapsSticker: { status: "present" },
  expresswayGadget: { status: "present" },
  stapler: { status: "present" },
  magazine: { status: "present" },
  menu: { status: "present" },
  spareWheel: { status: "present" },
  lifeSaver: { status: "present" },
  fireExtinguisher: { status: "present" },
  firstAidBox: { status: "present" },
  wheelSpanner: { status: "present" },
  jack: { status: "present" },
};

/**
 * Amenity item component for managing individual amenities
 * @param {Object} props - Component props
 * @param {string} props.name - Amenity name
 * @param {string} props.label - Amenity display label
 * @param {Object} props.value - Amenity value object
 * @param {Function} props.onChange - Change handler
 * @returns {JSX.Element} Amenity item
 */
function AmenityItem({ name, label, value, onChange }) {
  const handleStatusChange = (event) => {
    onChange(name, { ...value, status: event.target.value });
  };

  const handlePhoneNumbersChange = (event) => {
    onChange(name, { ...value, phoneNumbers: event.target.value });
  };

  return (
    <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
      <Grid item xs={12} sm={6}>
        <Typography variant="body2">{label}</Typography>
      </Grid>
      <Grid item xs={12} sm={3}>
        <FormControl fullWidth size="small">
          <Select value={value.status} onChange={handleStatusChange}>
            <MenuItem value="present">Present</MenuItem>
            <MenuItem value="missing">Missing</MenuItem>
            <MenuItem value="damaged">Damaged</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      {name === "wifiGadgets" && (
        <Grid item xs={12} sm={3}>
          <TextField
            fullWidth
            size="small"
            placeholder="Phone numbers"
            value={value.phoneNumbers || ""}
            onChange={handlePhoneNumbersChange}
          />
        </Grid>
      )}
    </Grid>
  );
}

/**
 * Edit vehicle page component
 * @returns {JSX.Element} Edit vehicle page
 */
export default function EditVehiclePage() {
  const [formData, setFormData] = useState({
    regNumber: "",
    color: "",
    make: "",
    model: "",
    year: "",
    station: "",
    fuelType: "Petrol",
    insuranceExpiry: null,
    inspectionExpiry: null,
    nextServiceDue: "",
    serviceInterval: "10000",
    currentOdometer: "",
  });
  const [amenities, setAmenities] = useState(DEFAULT_AMENITIES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [latestOdometer, setLatestOdometer] = useState(null);

  const router = useRouter();
  const params = useParams();
  const vehicleId = params.id;

  useEffect(() => {
    if (vehicleId) {
      fetchVehicleData();
    }
  }, [vehicleId]);

  /**
   * Fetch existing vehicle data
   */
  const fetchVehicleData = async () => {
    try {
      setLoading(true);
      setError("");

      const vehicleDoc = await getDoc(doc(db, "vehicles", vehicleId));

      if (!vehicleDoc.exists()) {
        setError("Vehicle not found");
        return;
      }

      const vehicleData = vehicleDoc.data();

      // Get the latest odometer reading from fuel records
      const latestReading = await getLatestOdometerReading(vehicleId);
      setLatestOdometer(latestReading);

      // Convert Firebase timestamps to Date objects
      const insuranceExpiry = vehicleData.insuranceExpiry?.toDate() || null;
      const inspectionExpiry = vehicleData.inspectionExpiry?.toDate() || null;

      setFormData({
        regNumber: vehicleData.regNumber || "",
        color: vehicleData.color || "",
        make: vehicleData.make || "",
        model: vehicleData.model || "",
        year: vehicleData.year || "",
        station: vehicleData.station || "",
        fuelType: vehicleData.fuelType || "Petrol",
        insuranceExpiry: insuranceExpiry,
        inspectionExpiry: inspectionExpiry,
        nextServiceDue: vehicleData.nextServiceDue || "",
        serviceInterval: vehicleData.serviceInterval || "10000",
        currentOdometer: vehicleData.currentOdometer || "",
      });

      // Set amenities or use defaults
      setAmenities(vehicleData.amenities || DEFAULT_AMENITIES);
    } catch (error) {
      console.error("Error fetching vehicle data:", error);
      setError("Failed to load vehicle data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle form field changes
   * @param {Event} event - Input change event
   */
  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /**
   * Handle date field changes
   * @param {string} field - Field name
   * @param {Date} value - Date value
   */
  const handleDateChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  /**
   * Handle amenity changes
   * @param {string} name - Amenity name
   * @param {Object} value - Amenity value
   */
  const handleAmenityChange = (name, value) => {
    setAmenities((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /**
   * Handle form submission
   * @param {Event} event - Form submit event
   */
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (
      !formData.regNumber ||
      !formData.make ||
      !formData.model ||
      !formData.year ||
      !formData.fuelType
    ) {
      setError(
        "Please fill in all required fields (Registration Number, Make, Model, Year, Fuel Type)"
      );
      return;
    }

    setSaving(true);
    setError("");

    try {
      // Prepare update data
      const updateData = {
        ...formData,
        amenities,
        updatedAt: new Date(),
      };

      // Update vehicle document
      await updateDoc(doc(db, "vehicles", vehicleId), updateData);

      // Redirect back to vehicles page with success message
      router.push("/vehicles?updated=true");
    } catch (error) {
      console.error("Error updating vehicle:", error);
      setError("Failed to update vehicle. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  /**
   * Handle back navigation
   */
  const handleBack = () => {
    router.push("/vehicles");
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight="400px"
          >
            <CircularProgress size={60} />
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
          <Box display="flex" alignItems="center" mb={3}>
            <Button
              startIcon={<BackIcon />}
              onClick={handleBack}
              sx={{ mr: 2 }}
            >
              Back to Vehicles
            </Button>
            <Box>
              <Typography variant="h4" gutterBottom fontWeight="bold">
                Edit Vehicle
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Update vehicle information and service tracking
              </Typography>
            </Box>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Latest Odometer Reading Alert */}
          {latestOdometer && (
            <Alert severity="info" sx={{ mb: 3 }}>
              Latest odometer reading from fuel records:{" "}
              <strong>{latestOdometer.toLocaleString()} km</strong>
              <br />
              <small>
                You can use this as reference for setting current odometer or
                service due mileage.
              </small>
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              {/* Basic Information */}
              <Grid item xs={12} md={8}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom fontWeight="medium">
                    Basic Information
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        required
                        fullWidth
                        name="regNumber"
                        label="Registration Number"
                        value={formData.regNumber}
                        onChange={handleInputChange}
                        placeholder="e.g., KCA 123A"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        required
                        fullWidth
                        name="color"
                        label="Color"
                        value={formData.color}
                        onChange={handleInputChange}
                        placeholder="e.g., White"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        required
                        fullWidth
                        name="make"
                        label="Make"
                        value={formData.make}
                        onChange={handleInputChange}
                        placeholder="e.g., Toyota"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        required
                        fullWidth
                        name="model"
                        label="Model"
                        value={formData.model}
                        onChange={handleInputChange}
                        placeholder="e.g., Hiace"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        required
                        fullWidth
                        name="year"
                        label="Year"
                        value={formData.year}
                        onChange={handleInputChange}
                        placeholder="e.g., 2023"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        name="station"
                        label="Station/Location"
                        value={formData.station}
                        onChange={handleInputChange}
                        placeholder="e.g., Nairobi"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth required>
                        <InputLabel>Fuel Type</InputLabel>
                        <Select
                          name="fuelType"
                          value={formData.fuelType}
                          onChange={handleInputChange}
                          label="Fuel Type"
                        >
                          <MenuItem value="Petrol">Petrol</MenuItem>
                          <MenuItem value="Diesel">Diesel</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                </Paper>

                {/* Document Expiry Dates */}
                <Paper sx={{ p: 3, mt: 3 }}>
                  <Typography variant="h6" gutterBottom fontWeight="medium">
                    Document Expiry Dates
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <DatePicker
                        label="Insurance Expiry Date"
                        value={formData.insuranceExpiry}
                        onChange={(value) =>
                          handleDateChange("insuranceExpiry", value)
                        }
                        format="dd-MM-yyyy"
                        renderInput={(params) => (
                          <TextField {...params} fullWidth />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <DatePicker
                        label="Inspection Expiry Date"
                        value={formData.inspectionExpiry}
                        onChange={(value) =>
                          handleDateChange("inspectionExpiry", value)
                        }
                        format="dd-MM-yyyy"
                        renderInput={(params) => (
                          <TextField {...params} fullWidth />
                        )}
                      />
                    </Grid>
                  </Grid>
                </Paper>

                {/* Service Tracking */}
                <Paper sx={{ p: 3, mt: 3 }}>
                  <Typography variant="h6" gutterBottom fontWeight="medium">
                    Service Tracking
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 3 }}
                  >
                    Set up service reminders based on odometer readings. The
                    system will alert you when service is due.
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        name="currentOdometer"
                        label="Current Odometer Reading"
                        type="number"
                        value={formData.currentOdometer}
                        onChange={handleInputChange}
                        placeholder="e.g., 50000"
                        InputProps={{
                          endAdornment: "km",
                        }}
                        helperText={
                          latestOdometer
                            ? `Latest from fuel records: ${latestOdometer.toLocaleString()} km`
                            : "Current mileage of the vehicle"
                        }
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        name="nextServiceDue"
                        label="Next Service Due (km)"
                        type="number"
                        value={formData.nextServiceDue}
                        onChange={handleInputChange}
                        placeholder="e.g., 60000"
                        InputProps={{
                          endAdornment: "km",
                        }}
                        helperText="Odometer reading when next service is due"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        name="serviceInterval"
                        label="Service Interval"
                        type="number"
                        value={formData.serviceInterval}
                        onChange={handleInputChange}
                        placeholder="e.g., 10000"
                        InputProps={{
                          endAdornment: "km",
                        }}
                        helperText="Distance between services (used for auto-calculation)"
                      />
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>

              {/* Service Status Card */}
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom fontWeight="medium">
                    Service Status
                  </Typography>

                  {latestOdometer && formData.nextServiceDue ? (
                    <Card sx={{ mt: 2 }}>
                      <CardContent>
                        <Typography variant="subtitle2" gutterBottom>
                          Current Status
                        </Typography>

                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Current:</strong>{" "}
                          {latestOdometer.toLocaleString()} km
                        </Typography>

                        {formData.nextServiceDue && (
                          <>
                            <Typography variant="body2" sx={{ mb: 1 }}>
                              <strong>Due at:</strong>{" "}
                              {parseInt(
                                formData.nextServiceDue
                              ).toLocaleString()}{" "}
                              km
                            </Typography>

                            <Typography
                              variant="body2"
                              sx={{
                                color:
                                  parseInt(formData.nextServiceDue) -
                                    latestOdometer <=
                                  0
                                    ? "error.main"
                                    : parseInt(formData.nextServiceDue) -
                                        latestOdometer <=
                                      1000
                                    ? "warning.main"
                                    : "success.main",
                                fontWeight: "bold",
                              }}
                            >
                              {parseInt(formData.nextServiceDue) -
                                latestOdometer <=
                              0
                                ? `Overdue by ${Math.abs(
                                    parseInt(formData.nextServiceDue) -
                                      latestOdometer
                                  ).toLocaleString()} km`
                                : `${(
                                    parseInt(formData.nextServiceDue) -
                                    latestOdometer
                                  ).toLocaleString()} km until service`}
                            </Typography>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  ) : (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      {!latestOdometer
                        ? "No fuel records found. Add fuel records to track current mileage."
                        : "Set next service due to see status."}
                    </Alert>
                  )}
                </Paper>

                {/* Amenities */}
                <Paper sx={{ p: 3, mt: 3 }}>
                  <Typography variant="h6" gutterBottom fontWeight="medium">
                    Vehicle Amenities
                  </Typography>

                  {Object.entries(amenities).map(([key, value]) => (
                    <AmenityItem
                      key={key}
                      name={key}
                      label={key
                        .replace(/([A-Z])/g, " $1")
                        .replace(/^./, (str) => str.toUpperCase())}
                      value={value}
                      onChange={handleAmenityChange}
                    />
                  ))}
                </Paper>
              </Grid>
            </Grid>

            {/* Submit Button */}
            <Box sx={{ mt: 4, display: "flex", gap: 2 }}>
              <Button
                type="submit"
                variant="contained"
                size="large"
                startIcon={<SaveIcon />}
                disabled={saving}
                sx={{ minWidth: 150 }}
              >
                {saving ? "Updating..." : "Update Vehicle"}
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={handleBack}
                disabled={saving}
              >
                Cancel
              </Button>
            </Box>
          </form>
        </Box>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
