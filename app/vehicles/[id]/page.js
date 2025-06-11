"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
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
  CardHeader,
  Divider,
  Tabs,
  Tab,
} from "@mui/material";
import {
  CloudUpload as UploadIcon,
  Save as SaveIcon,
  ArrowBack as BackIcon,
  Edit as EditIcon,
  Cancel as CancelIcon,
  Analytics as AnalyticsIcon,
  Assessment as ReportIcon,
} from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { db, storage } from "../../../lib/firebase";
import ProtectedRoute from "../../../components/ProtectedRoute";
import DashboardLayout from "../../../components/DashboardLayout";
import { format } from "date-fns";
import { auth } from "../../../lib/firebase";

/**
 * Safely format a date that could be a Firebase Timestamp or JavaScript Date
 * @param {any} dateValue - The date value (Timestamp, Date, or other)
 * @param {string} formatString - The format string for date-fns
 * @returns {string} Formatted date string or "Unknown"
 */
const safeFormatDate = (dateValue, formatString = "dd-MM-yyyy HH:mm") => {
  if (!dateValue) return "Unknown";

  try {
    // If it's a Firebase Timestamp, use .toDate()
    if (dateValue && typeof dateValue.toDate === "function") {
      return format(dateValue.toDate(), formatString);
    }

    // If it's already a Date object
    if (dateValue instanceof Date) {
      // Check for valid date to avoid hydration issues
      if (isNaN(dateValue.getTime())) {
        return "Unknown";
      }
      return format(dateValue, formatString);
    }

    // If it's a string that can be parsed as a date
    if (typeof dateValue === "string") {
      const parsedDate = new Date(dateValue);
      if (!isNaN(parsedDate.getTime())) {
        return format(parsedDate, formatString);
      }
    }

    // If it's a number (timestamp)
    if (typeof dateValue === "number") {
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        return format(date, formatString);
      }
    }

    return "Unknown";
  } catch (error) {
    console.warn("Error formatting date:", error, dateValue);
    return "Unknown";
  }
};

/**
 * Safely convert a date-like object to a Date object
 * @param {any} dateValue - The date value (Timestamp, Date, or other)
 * @returns {Date} Safe Date object or null
 */
const safeToDate = (dateValue) => {
  if (!dateValue) return null;

  try {
    // If it's a Firebase Timestamp, use .toDate()
    if (dateValue && typeof dateValue.toDate === "function") {
      return dateValue.toDate();
    }

    // If it's already a Date object
    if (dateValue instanceof Date) {
      return dateValue;
    }

    // If it's a string that can be parsed as a date
    if (typeof dateValue === "string") {
      const parsedDate = new Date(dateValue);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate;
      }
    }

    // If it's a number (timestamp)
    if (typeof dateValue === "number") {
      return new Date(dateValue);
    }

    return null;
  } catch (error) {
    console.warn("Error converting date:", error, dateValue);
    return null;
  }
};

/**
 * Amenity item component for editing amenities
 * @param {Object} props - Component props
 * @param {string} props.name - Amenity name
 * @param {string} props.label - Amenity display label
 * @param {Object} props.value - Amenity value object
 * @param {Function} props.onChange - Change handler
 * @param {boolean} props.readOnly - Read only mode
 * @returns {JSX.Element} Amenity item
 */
function AmenityItem({ name, label, value, onChange, readOnly = false }) {
  const handleStatusChange = (event) => {
    if (!readOnly) {
      onChange(name, { ...value, status: event.target.value });
    }
  };

  const handlePhoneNumbersChange = (event) => {
    if (!readOnly) {
      onChange(name, { ...value, phoneNumbers: event.target.value });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "present":
        return "success";
      case "missing":
        return "error";
      case "damaged":
        return "warning";
      default:
        return "default";
    }
  };

  return (
    <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
      <Grid item xs={12} sm={6}>
        <Typography variant="body2">{label}</Typography>
      </Grid>
      <Grid item xs={12} sm={3}>
        <FormControl fullWidth size="small">
          <Select
            value={value?.status || "present"}
            onChange={handleStatusChange}
            disabled={readOnly}
            color={getStatusColor(value?.status)}
          >
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
            value={value?.phoneNumbers || ""}
            onChange={handlePhoneNumbersChange}
            disabled={readOnly}
          />
        </Grid>
      )}
    </Grid>
  );
}

/**
 * Tab panel component
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child content
 * @param {number} props.value - Current tab value
 * @param {number} props.index - Tab index
 * @returns {JSX.Element} Tab panel
 */
function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`vehicle-tabpanel-${index}`}
      aria-labelledby={`vehicle-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

/**
 * Vehicle detail page component
 * @param {Object} props - Component props
 * @param {Object} props.params - Route parameters
 * @returns {JSX.Element} Vehicle detail page
 */
export default function VehicleDetailPage({ params }) {
  const [vehicle, setVehicle] = useState(null);
  const [formData, setFormData] = useState({});
  const [amenities, setAmenities] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState(0);

  const router = useRouter();
  const { id } = params;

  useEffect(() => {
    if (id) {
      fetchVehicle();
    }
  }, [id]);

  /**
   * Fetch vehicle data from Firestore
   */
  const fetchVehicle = async () => {
    try {
      setLoading(true);
      setError("");

      // Debug: Check authentication state
      console.log("🔍 Auth state when fetching vehicle:", {
        currentUser: auth.currentUser,
        uid: auth.currentUser?.uid,
        email: auth.currentUser?.email,
      });

      if (!auth.currentUser) {
        setError("Authentication required. Please log in.");
        return;
      }

      const vehicleDoc = await getDoc(doc(db, "vehicles", id));

      if (!vehicleDoc.exists()) {
        setError("Vehicle not found");
        return;
      }

      const vehicleData = { id: vehicleDoc.id, ...vehicleDoc.data() };
      setVehicle(vehicleData);

      // Initialize form data
      setFormData({
        regNumber: vehicleData.regNumber || "",
        color: vehicleData.color || "",
        make: vehicleData.make || "",
        model: vehicleData.model || "",
        year: vehicleData.year || "",
        station: vehicleData.station || "",
        fuelType: vehicleData.fuelType || "Petrol",
        insuranceExpiry: safeToDate(vehicleData.insuranceExpiry),
        inspectionExpiry: safeToDate(vehicleData.inspectionExpiry),
      });

      setAmenities(vehicleData.amenities || {});
    } catch (error) {
      console.error("Error fetching vehicle:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);

      if (error.code === "permission-denied") {
        setError(
          "Permission denied. Please check your authentication and try again."
        );
      } else {
        setError("Failed to load vehicle data. Please try again.");
      }
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
   * Handle image selection
   * @param {Event} event - File input change event
   */
  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Check file size (limit to 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("Image file size must be less than 5MB");
        return;
      }

      // Check file type
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
      ];
      if (!allowedTypes.includes(file.type)) {
        setError(
          "Please select a valid image file (JPEG, PNG, or WebP). HEIC files are not supported."
        );
        return;
      }

      setSelectedImage(file);
      setError(""); // Clear any previous errors
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
    }
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
   * Upload image to Firebase Storage
   * @returns {Promise<string>} Download URL
   */
  const uploadImage = async () => {
    if (!selectedImage) return null;

    try {
      // Check if user is authenticated
      if (!auth.currentUser) {
        throw new Error("User not authenticated");
      }

      const timestamp = Date.now();
      // Convert file name to avoid special characters
      const sanitizedFileName = selectedImage.name
        .replace(/[^a-zA-Z0-9.-]/g, "_")
        .toLowerCase();
      const fileName = `vehicles/${timestamp}_${sanitizedFileName}`;

      console.log("🔍 Upload details:", {
        fileName,
        fileSize: selectedImage.size,
        fileType: selectedImage.type,
        currentUser: auth.currentUser?.uid,
        bucketName: storage.app.options.storageBucket,
      });

      // Check file size (limit to 5MB)
      if (selectedImage.size > 5 * 1024 * 1024) {
        throw new Error("File size too large. Maximum size is 5MB.");
      }

      // Validate file type
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
      ];
      if (!allowedTypes.includes(selectedImage.type)) {
        throw new Error("Invalid file type. Please use JPEG, PNG, or WebP.");
      }

      const storageRef = ref(storage, fileName);
      console.log("📤 Starting upload to:", storageRef.toString());

      // Upload with metadata
      const metadata = {
        contentType: selectedImage.type,
        customMetadata: {
          uploadedBy: auth.currentUser.uid,
          uploadedAt: new Date().toISOString(),
        },
      };

      console.log("Uploading with metadata:", metadata);
      const snapshot = await uploadBytes(storageRef, selectedImage, metadata);
      console.log("✅ Upload successful, getting download URL...");

      const downloadURL = await getDownloadURL(snapshot.ref);
      console.log("✅ Download URL obtained:", downloadURL);
      return downloadURL;
    } catch (error) {
      console.error("❌ Upload error details:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      console.error("Full error object:", error);

      // Handle specific error types
      if (error.code === "storage/unauthorized") {
        throw new Error(
          "Authentication required. Please log in and try again."
        );
      } else if (error.code === "storage/quota-exceeded") {
        throw new Error("Storage quota exceeded. Please contact support.");
      } else if (error.code === "storage/retry-limit-exceeded") {
        throw new Error(
          "Upload failed due to network issues or server problems. Please check your internet connection and try again in a few minutes."
        );
      } else if (error.code === "storage/canceled") {
        throw new Error("Upload was canceled.");
      } else if (error.code === "storage/invalid-format") {
        throw new Error("Invalid file format. Please use JPEG, PNG, or WebP.");
      } else if (error.message.includes("CORS")) {
        throw new Error(
          "Upload blocked by security settings. Please try again or contact support."
        );
      } else {
        throw new Error(`Upload failed: ${error.message}`);
      }
    }
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
      !formData.year
    ) {
      setError(
        "Please fill in all required fields (Registration Number, Make, Model, Year)"
      );
      return;
    }

    setSaving(true);
    setError("");

    try {
      let imageUrl = vehicle.imageUrl;

      // Upload new image if selected
      if (selectedImage) {
        // Image upload is temporarily disabled
        console.log("Image upload is disabled - skipping image upload");
        /*
        try {
          // Delete old image if exists
          if (vehicle.imageUrl) {
            try {
              const oldImageRef = ref(storage, vehicle.imageUrl);
              await deleteObject(oldImageRef);
            } catch (imageError) {
              console.warn("Failed to delete old image:", imageError);
            }
          }

          imageUrl = await uploadImage();
        } catch (uploadError) {
          console.error("Image upload failed:", uploadError);
          
          // Ask user if they want to continue without the image
          const continueWithoutImage = confirm(
            `Image upload failed: ${uploadError.message}\n\nWould you like to save the vehicle information without updating the image?`
          );
          
          if (!continueWithoutImage) {
            throw new Error("Save canceled by user due to image upload failure.");
          }
          
          // Continue with existing image URL
          console.log("Continuing save without image update...");
        }
        */
      }

      // Prepare updated vehicle data
      const updatedData = {
        ...formData,
        imageUrl: imageUrl || "",
        amenities,
        updatedAt: new Date(),
      };

      // Update vehicle in Firestore
      await updateDoc(doc(db, "vehicles", id), updatedData);

      // Update local state
      setVehicle((prev) => ({ ...prev, ...updatedData }));
      setIsEditing(false);
      setSelectedImage(null);
      setImagePreview(null);

      // Show success message
      console.log("✅ Vehicle updated successfully");
    } catch (error) {
      console.error("Error updating vehicle:", error);
      setError(`Failed to update vehicle: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  /**
   * Cancel editing mode
   */
  const handleCancelEdit = () => {
    setIsEditing(false);
    setSelectedImage(null);
    setImagePreview(null);

    // Reset form data to original values
    setFormData({
      regNumber: vehicle.regNumber || "",
      color: vehicle.color || "",
      make: vehicle.make || "",
      model: vehicle.model || "",
      year: vehicle.year || "",
      station: vehicle.station || "",
      insuranceExpiry: safeToDate(vehicle.insuranceExpiry),
      inspectionExpiry: safeToDate(vehicle.inspectionExpiry),
    });

    setAmenities(vehicle.amenities || {});
    setError("");
  };

  /**
   * Handle back navigation
   */
  const handleBack = () => {
    router.push("/vehicles");
  };

  /**
   * Handle tab change
   * @param {Event} event - Tab change event
   * @param {number} newValue - New tab value
   */
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
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

  if (error && !vehicle) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
          <Button startIcon={<BackIcon />} onClick={handleBack}>
            Back to Vehicles
          </Button>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <Box>
          {/* Header */}
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={3}
          >
            <Box display="flex" alignItems="center">
              <Button
                startIcon={<BackIcon />}
                onClick={handleBack}
                sx={{ mr: 2 }}
              >
                Back to Vehicles
              </Button>
              <Box>
                <Typography variant="h4" gutterBottom fontWeight="bold">
                  {vehicle?.regNumber}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {vehicle?.make} {vehicle?.model}{" "}
                  {vehicle?.year ? `(${vehicle.year})` : ""} • {vehicle?.color}
                </Typography>
              </Box>
            </Box>

            <Box display="flex" gap={1} alignItems="center">
              {/* Analytics and Reports Navigation */}
              <Button
                variant="outlined"
                startIcon={<AnalyticsIcon />}
                onClick={() =>
                  router.push(`/vehicles/${vehicle?.id}/analytics`)
                }
                sx={{ mr: 1 }}
              >
                Analytics
              </Button>
              <Button
                variant="outlined"
                startIcon={<ReportIcon />}
                onClick={() => router.push(`/vehicles/${vehicle?.id}/reports`)}
                sx={{ mr: 2 }}
              >
                Reports
              </Button>

              {!isEditing ? (
                <Button
                  variant="contained"
                  startIcon={<EditIcon />}
                  onClick={() => setIsEditing(true)}
                >
                  Edit Vehicle
                </Button>
              ) : (
                <Box display="flex" gap={1}>
                  <Button
                    variant="outlined"
                    startIcon={<CancelIcon />}
                    onClick={handleCancelEdit}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={
                      saving ? <CircularProgress size={20} /> : <SaveIcon />
                    }
                    onClick={handleSubmit}
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </Box>
              )}
            </Box>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Tabs */}
          <Paper sx={{ mb: 3 }}>
            <Tabs value={activeTab} onChange={handleTabChange}>
              <Tab label="Basic Information" />
              <Tab label="Amenities" />
            </Tabs>
          </Paper>

          <form onSubmit={handleSubmit}>
            {/* Basic Information Tab */}
            <TabPanel value={activeTab} index={0}>
              <Grid container spacing={3}>
                {/* Vehicle Information */}
                <Grid item xs={12} md={8}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom fontWeight="medium">
                      Vehicle Information
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
                          disabled={!isEditing}
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
                          disabled={!isEditing}
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
                          disabled={!isEditing}
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
                          disabled={!isEditing}
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
                          disabled={!isEditing}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          name="station"
                          label="Station/Location"
                          value={formData.station}
                          onChange={handleInputChange}
                          disabled={!isEditing}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth required disabled={!isEditing}>
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

                  {/* Expiry Dates */}
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
                          disabled={!isEditing}
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
                          disabled={!isEditing}
                          format="dd-MM-yyyy"
                          renderInput={(params) => (
                            <TextField {...params} fullWidth />
                          )}
                        />
                      </Grid>
                    </Grid>
                  </Paper>

                  {/* Timestamps */}
                  <Paper sx={{ p: 3, mt: 3 }}>
                    <Typography variant="h6" gutterBottom fontWeight="medium">
                      Record Information
                    </Typography>

                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">
                          Created: {safeFormatDate(vehicle?.createdAt)}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">
                          Last Updated: {safeFormatDate(vehicle?.updatedAt)}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>

                {/* Image */}
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom fontWeight="medium">
                      Vehicle Image
                    </Typography>

                    {/* Temporarily disabled image upload */}
                    {false && isEditing && (
                      <>
                        <input
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          style={{ display: "none" }}
                          id="image-upload"
                          type="file"
                          onChange={handleImageChange}
                        />
                        <label htmlFor="image-upload">
                          <Button
                            variant="outlined"
                            component="span"
                            startIcon={<UploadIcon />}
                            fullWidth
                            sx={{ mb: 2 }}
                          >
                            Upload New Image
                          </Button>
                        </label>

                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ mb: 2, display: "block" }}
                        >
                          Supported formats: JPEG, PNG, WebP (max 5MB)
                        </Typography>
                      </>
                    )}

                    {isEditing && (
                      <Typography
                        variant="body2"
                        color="warning.main"
                        sx={{
                          mb: 2,
                          p: 1,
                          bgcolor: "warning.50",
                          borderRadius: 1,
                        }}
                      >
                        ⚠️ Image upload is temporarily disabled
                      </Typography>
                    )}

                    {(imagePreview || vehicle?.imageUrl) && (
                      <Box
                        component="img"
                        src={imagePreview || vehicle?.imageUrl}
                        alt="Vehicle"
                        sx={{
                          width: "100%",
                          height: 250,
                          objectFit: "cover",
                          borderRadius: 1,
                          border: "1px solid",
                          borderColor: "divider",
                        }}
                      />
                    )}

                    {!vehicle?.imageUrl && !imagePreview && (
                      <Box
                        sx={{
                          width: "100%",
                          height: 250,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          bgcolor: "grey.100",
                          borderRadius: 1,
                          border: "1px solid",
                          borderColor: "divider",
                        }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          No image available
                        </Typography>
                      </Box>
                    )}
                  </Paper>
                </Grid>
              </Grid>
            </TabPanel>

            {/* Amenities Tab */}
            <TabPanel value={activeTab} index={1}>
              <Card>
                <CardHeader title="Vehicle Amenities" />
                <Divider />
                <CardContent>
                  <Grid container spacing={2}>
                    {Object.entries({
                      wifiGadgets: "WiFi Gadgets",
                      servietteBox: "Serviette Box",
                      carMats: "Car Mats",
                      chargerHead: "Charger Head",
                      chargingCable: "Charging Cable",
                      coolerBox: "Cooler Box",
                      umbrellas: "Umbrellas",
                      kapsSticker: "KAPS Sticker",
                      expresswayGadget: "Expressway Gadget",
                      stapler: "Stapler",
                      magazine: "Magazine",
                      menu: "Menu",
                      spareWheel: "Spare Wheel",
                      lifeSaver: "Life Saver",
                      fireExtinguisher: "Fire Extinguisher",
                      firstAidBox: "First Aid Box",
                      wheelSpanner: "Wheel Spanner",
                      jack: "Jack",
                    }).map(([key, label]) => (
                      <AmenityItem
                        key={key}
                        name={key}
                        label={label}
                        value={amenities[key] || { status: "present" }}
                        onChange={handleAmenityChange}
                        readOnly={!isEditing}
                      />
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            </TabPanel>
          </form>
        </Box>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
