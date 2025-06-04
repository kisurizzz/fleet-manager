"use client";

import { useState } from "react";
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
  FormControlLabel,
  FormGroup,
  Checkbox,
  Card,
  CardContent,
  CardHeader,
  Divider,
} from "@mui/material";
import {
  CloudUpload as UploadIcon,
  Save as SaveIcon,
  ArrowBack as BackIcon,
} from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { addDoc, collection } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../../lib/firebase";
import ProtectedRoute from "../../../components/ProtectedRoute";
import DashboardLayout from "../../../components/DashboardLayout";

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
 * Add vehicle page component
 * @returns {JSX.Element} Add vehicle page
 */
export default function AddVehiclePage() {
  const [formData, setFormData] = useState({
    regNumber: "",
    color: "",
    make: "",
    model: "",
    year: "",
    station: "",
    insuranceExpiry: null,
    inspectionExpiry: null,
  });
  const [amenities, setAmenities] = useState(DEFAULT_AMENITIES);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const router = useRouter();

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
      const timestamp = Date.now();
      // Convert file name to avoid special characters
      const sanitizedFileName = selectedImage.name
        .replace(/[^a-zA-Z0-9.-]/g, "_")
        .toLowerCase();
      const fileName = `vehicles/${timestamp}_${sanitizedFileName}`;
      const storageRef = ref(storage, fileName);

      console.log("Uploading image:", fileName);
      const snapshot = await uploadBytes(storageRef, selectedImage);
      const downloadURL = await getDownloadURL(snapshot.ref);
      console.log("Upload successful:", downloadURL);
      return downloadURL;
    } catch (error) {
      console.error("Upload error details:", error);

      // Handle specific error types
      if (error.code === "storage/unauthorized") {
        throw new Error(
          "Authentication required. Please log in and try again."
        );
      } else if (error.code === "storage/quota-exceeded") {
        throw new Error("Storage quota exceeded. Please contact support.");
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

    setLoading(true);
    setError("");

    try {
      // Upload image if selected (disabled for now)
      // const imageUrl = await uploadImage();
      const imageUrl = ""; // Image upload disabled

      // Prepare vehicle data
      const vehicleData = {
        ...formData,
        imageUrl: imageUrl || "",
        amenities,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Add vehicle to Firestore
      await addDoc(collection(db, "vehicles"), vehicleData);

      // Redirect to vehicles page
      router.push("/vehicles");
    } catch (error) {
      console.error("Error adding vehicle:", error);
      setError("Failed to add vehicle. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle back navigation
   */
  const handleBack = () => {
    router.push("/vehicles");
  };

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
                Add New Vehicle
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Register a new vehicle in your fleet
              </Typography>
            </Box>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
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
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        name="station"
                        label="Station/Location"
                        value={formData.station}
                        onChange={handleInputChange}
                        placeholder="e.g., Nairobi"
                      />
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
              </Grid>

              {/* Image Upload */}
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom fontWeight="medium">
                    Vehicle Image
                  </Typography>

                  {/* Temporarily disabled image upload */}
                  {false && (
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
                          Upload Image
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

                  <Typography
                    variant="body2"
                    color="warning.main"
                    sx={{ mb: 2, p: 1, bgcolor: "warning.50", borderRadius: 1 }}
                  >
                    ⚠️ Image upload is temporarily disabled
                  </Typography>

                  {imagePreview ? (
                    <Box
                      component="img"
                      src={imagePreview}
                      alt="Vehicle preview"
                      sx={{
                        width: "100%",
                        height: 200,
                        objectFit: "cover",
                        borderRadius: 1,
                        border: "1px solid",
                        borderColor: "divider",
                      }}
                    />
                  ) : (
                    <Box
                      sx={{
                        width: "100%",
                        height: 200,
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
                        No image
                      </Typography>
                    </Box>
                  )}
                </Paper>
              </Grid>

              {/* Amenities */}
              <Grid item xs={12}>
                <Card>
                  <CardHeader title="Vehicle Amenities" />
                  <Divider />
                  <CardContent>
                    <Grid container spacing={2}>
                      <AmenityItem
                        name="wifiGadgets"
                        label="WiFi Gadgets"
                        value={amenities.wifiGadgets}
                        onChange={handleAmenityChange}
                      />
                      <AmenityItem
                        name="servietteBox"
                        label="Serviette Box"
                        value={amenities.servietteBox}
                        onChange={handleAmenityChange}
                      />
                      <AmenityItem
                        name="carMats"
                        label="Car Mats"
                        value={amenities.carMats}
                        onChange={handleAmenityChange}
                      />
                      <AmenityItem
                        name="chargerHead"
                        label="Charger Head"
                        value={amenities.chargerHead}
                        onChange={handleAmenityChange}
                      />
                      <AmenityItem
                        name="chargingCable"
                        label="Charging Cable"
                        value={amenities.chargingCable}
                        onChange={handleAmenityChange}
                      />
                      <AmenityItem
                        name="coolerBox"
                        label="Cooler Box"
                        value={amenities.coolerBox}
                        onChange={handleAmenityChange}
                      />
                      <AmenityItem
                        name="umbrellas"
                        label="Umbrellas"
                        value={amenities.umbrellas}
                        onChange={handleAmenityChange}
                      />
                      <AmenityItem
                        name="kapsSticker"
                        label="KAPS Sticker"
                        value={amenities.kapsSticker}
                        onChange={handleAmenityChange}
                      />
                      <AmenityItem
                        name="expresswayGadget"
                        label="Expressway Gadget"
                        value={amenities.expresswayGadget}
                        onChange={handleAmenityChange}
                      />
                      <AmenityItem
                        name="stapler"
                        label="Stapler"
                        value={amenities.stapler}
                        onChange={handleAmenityChange}
                      />
                      <AmenityItem
                        name="magazine"
                        label="Magazine"
                        value={amenities.magazine}
                        onChange={handleAmenityChange}
                      />
                      <AmenityItem
                        name="menu"
                        label="Menu"
                        value={amenities.menu}
                        onChange={handleAmenityChange}
                      />
                      <AmenityItem
                        name="spareWheel"
                        label="Spare Wheel"
                        value={amenities.spareWheel}
                        onChange={handleAmenityChange}
                      />
                      <AmenityItem
                        name="lifeSaver"
                        label="Life Saver"
                        value={amenities.lifeSaver}
                        onChange={handleAmenityChange}
                      />
                      <AmenityItem
                        name="fireExtinguisher"
                        label="Fire Extinguisher"
                        value={amenities.fireExtinguisher}
                        onChange={handleAmenityChange}
                      />
                      <AmenityItem
                        name="firstAidBox"
                        label="First Aid Box"
                        value={amenities.firstAidBox}
                        onChange={handleAmenityChange}
                      />
                      <AmenityItem
                        name="wheelSpanner"
                        label="Wheel Spanner"
                        value={amenities.wheelSpanner}
                        onChange={handleAmenityChange}
                      />
                      <AmenityItem
                        name="jack"
                        label="Jack"
                        value={amenities.jack}
                        onChange={handleAmenityChange}
                      />
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* Submit Button */}
              <Grid item xs={12}>
                <Box display="flex" justifyContent="flex-end" gap={2}>
                  <Button
                    variant="outlined"
                    onClick={handleBack}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={
                      loading ? <CircularProgress size={20} /> : <SaveIcon />
                    }
                    disabled={loading}
                  >
                    {loading ? "Adding Vehicle..." : "Add Vehicle"}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </Box>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
