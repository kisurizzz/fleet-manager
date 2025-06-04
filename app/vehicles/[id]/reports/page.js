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
  Card,
  CardContent,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Chip,
  IconButton,
} from "@mui/material";
import {
  ArrowBack as BackIcon,
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  Assessment as ReportIcon,
} from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../../../lib/firebase";
import ProtectedRoute from "../../../../components/ProtectedRoute";
import DashboardLayout from "../../../../components/DashboardLayout";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { formatKES } from "../../../../utils/exportHelpers";
import jsPDF from "jspdf";
import "jspdf-autotable";

/**
 * Vehicle Reports Page Component
 */
export default function VehicleReportsPage({ params }) {
  const router = useRouter();
  const vehicleId = use(params).id;

  // State management
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [reportConfig, setReportConfig] = useState({
    type: "monthly",
    format: "pdf",
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date()),
    includeFuel: true,
    includeMaintenance: true,
    includeAnalytics: true,
    includeCharts: false,
  });
  const [generatedReports, setGeneratedReports] = useState([]);

  useEffect(() => {
    if (vehicleId) {
      fetchVehicleData();
      loadPreviousReports();
    }
  }, [vehicleId]);

  /**
   * Fetch vehicle data
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
      setVehicle({ id: vehicleDoc.id, ...vehicleDoc.data() });
    } catch (error) {
      console.error("Error fetching vehicle:", error);
      setError("Failed to load vehicle data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load previous reports (simulated - would be stored in database)
   */
  const loadPreviousReports = () => {
    // Simulated previous reports
    setGeneratedReports([
      {
        id: 1,
        name: "Monthly Report - November 2024",
        type: "monthly",
        format: "pdf",
        generatedAt: new Date("2024-11-30"),
        size: "245 KB",
      },
      {
        id: 2,
        name: "Quarterly Report - Q3 2024",
        type: "quarterly",
        format: "excel",
        generatedAt: new Date("2024-10-01"),
        size: "156 KB",
      },
    ]);
  };

  /**
   * Handle form input changes
   */
  const handleConfigChange = (field, value) => {
    setReportConfig((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  /**
   * Fetch data for report generation
   */
  const fetchReportData = async () => {
    const startDate = reportConfig.startDate;
    const endDate = reportConfig.endDate;

    // Fetch fuel records
    const fuelQuery = query(
      collection(db, "fuelRecords"),
      where("vehicleId", "==", vehicleId),
      where("date", ">=", Timestamp.fromDate(startDate)),
      where("date", "<=", Timestamp.fromDate(endDate)),
      orderBy("date", "desc")
    );

    const fuelSnapshot = await getDocs(fuelQuery);
    const fuelRecords = fuelSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate(),
    }));

    // Fetch maintenance records
    const maintenanceQuery = query(
      collection(db, "maintenanceRecords"),
      where("vehicleId", "==", vehicleId),
      where("date", ">=", Timestamp.fromDate(startDate)),
      where("date", "<=", Timestamp.fromDate(endDate)),
      orderBy("date", "desc")
    );

    const maintenanceSnapshot = await getDocs(maintenanceQuery);
    const maintenanceRecords = maintenanceSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate(),
    }));

    return { fuelRecords, maintenanceRecords };
  };

  /**
   * Calculate analytics for report
   */
  const calculateReportAnalytics = (fuelRecords, maintenanceRecords) => {
    const totalFuelCost = fuelRecords.reduce(
      (sum, record) => sum + (record.cost || 0),
      0
    );
    const totalLiters = fuelRecords.reduce(
      (sum, record) => sum + (record.liters || 0),
      0
    );
    const totalMaintenanceCost = maintenanceRecords.reduce(
      (sum, record) => sum + (record.cost || 0),
      0
    );

    const recordsWithDistance = fuelRecords.filter(
      (record) => record.kmTraveled
    );
    const totalDistance = recordsWithDistance.reduce(
      (sum, record) => sum + (record.kmTraveled || 0),
      0
    );

    const recordsWithEfficiency = fuelRecords.filter(
      (record) => record.fuelEfficiency
    );
    const averageEfficiency =
      recordsWithEfficiency.length > 0
        ? recordsWithEfficiency.reduce(
            (sum, record) => sum + (record.fuelEfficiency || 0),
            0
          ) / recordsWithEfficiency.length
        : 0;

    const costPerKm =
      totalDistance > 0
        ? (totalFuelCost + totalMaintenanceCost) / totalDistance
        : 0;

    return {
      totalFuelCost,
      totalLiters,
      totalMaintenanceCost,
      totalDistance,
      averageEfficiency,
      costPerKm,
      fuelUps: fuelRecords.length,
      maintenanceCount: maintenanceRecords.length,
    };
  };

  /**
   * Generate PDF report
   */
  const generatePDFReport = async (data) => {
    const { fuelRecords, maintenanceRecords } = data;
    const analytics = calculateReportAnalytics(fuelRecords, maintenanceRecords);

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;

    // Header
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Vehicle Report", margin, 30);

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Vehicle: ${vehicle.regNumber} (${vehicle.make} ${vehicle.model})`,
      margin,
      45
    );
    doc.text(
      `Report Period: ${format(
        reportConfig.startDate,
        "dd-MM-yyyy"
      )} - ${format(reportConfig.endDate, "dd-MM-yyyy")}`,
      margin,
      55
    );
    doc.text(
      `Generated: ${format(new Date(), "dd-MM-yyyy HH:mm")}`,
      margin,
      65
    );

    // Executive Summary
    let yPosition = 85;
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Executive Summary", margin, yPosition);

    yPosition += 15;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    const summaryData = [
      [`Total Distance Traveled`, `${analytics.totalDistance.toFixed(0)} km`],
      [`Total Fuel Consumed`, `${analytics.totalLiters.toFixed(1)} liters`],
      [`Total Fuel Cost`, `${formatKES(analytics.totalFuelCost)}`],
      [
        `Average Fuel Efficiency`,
        `${analytics.averageEfficiency.toFixed(1)} km/L`,
      ],
      [`Number of Fuel-ups`, `${analytics.fuelUps}`],
      [
        `Total Maintenance Cost`,
        `${formatKES(analytics.totalMaintenanceCost)}`,
      ],
      [`Number of Services`, `${analytics.maintenanceCount}`],
      [`Cost per Kilometer`, `${formatKES(analytics.costPerKm)}`],
    ];

    doc.autoTable({
      startY: yPosition,
      head: [["Metric", "Value"]],
      body: summaryData,
      theme: "grid",
      headStyles: { fillColor: [41, 128, 185] },
      margin: { left: margin, right: margin },
    });

    yPosition = doc.lastAutoTable.finalY + 20;

    // Fuel Records
    if (reportConfig.includeFuel && fuelRecords.length > 0) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Fuel Consumption Details", margin, yPosition);

      yPosition += 10;
      const fuelData = fuelRecords.map((record) => [
        format(record.date, "dd-MM-yyyy"),
        `${record.liters?.toFixed(1)}L`,
        formatKES(record.cost),
        record.fuelEfficiency ? `${record.fuelEfficiency} km/L` : "N/A",
        record.station || "N/A",
      ]);

      doc.autoTable({
        startY: yPosition,
        head: [["Date", "Liters", "Cost", "Efficiency", "Station"]],
        body: fuelData,
        theme: "striped",
        headStyles: { fillColor: [52, 152, 219] },
        margin: { left: margin, right: margin },
      });

      yPosition = doc.lastAutoTable.finalY + 15;
    }

    // Maintenance Records
    if (reportConfig.includeMaintenance && maintenanceRecords.length > 0) {
      // Check if we need a new page
      if (yPosition > doc.internal.pageSize.height - 100) {
        doc.addPage();
        yPosition = 30;
      }

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Maintenance Summary", margin, yPosition);

      yPosition += 10;
      const maintenanceData = maintenanceRecords.map((record) => [
        format(record.date, "dd-MM-yyyy"),
        record.description || "N/A",
        formatKES(record.cost),
        record.serviceProvider || "N/A",
      ]);

      doc.autoTable({
        startY: yPosition,
        head: [["Date", "Description", "Cost", "Provider"]],
        body: maintenanceData,
        theme: "striped",
        headStyles: { fillColor: [231, 76, 60] },
        margin: { left: margin, right: margin },
      });
    }

    // Save PDF
    const fileName = `${vehicle.regNumber}_Report_${format(
      new Date(),
      "dd-MM-yyyy"
    )}.pdf`;
    doc.save(fileName);

    return fileName;
  };

  /**
   * Generate Excel report
   */
  const generateExcelReport = async (data) => {
    const { fuelRecords, maintenanceRecords } = data;
    const analytics = calculateReportAnalytics(fuelRecords, maintenanceRecords);

    // Create CSV content for Excel compatibility
    let csvContent = "data:text/csv;charset=utf-8,";

    // Executive Summary
    csvContent += "VEHICLE REPORT\n";
    csvContent += `Vehicle:,${vehicle.regNumber} (${vehicle.make} ${vehicle.model})\n`;
    csvContent += `Period:,${format(
      reportConfig.startDate,
      "dd-MM-yyyy"
    )} - ${format(reportConfig.endDate, "dd-MM-yyyy")}\n`;
    csvContent += `Generated:,${format(new Date(), "dd-MM-yyyy HH:mm")}\n\n`;

    csvContent += "EXECUTIVE SUMMARY\n";
    csvContent += "Metric,Value\n";
    csvContent += `Total Distance Traveled,${analytics.totalDistance.toFixed(
      0
    )} km\n`;
    csvContent += `Total Fuel Consumed,${analytics.totalLiters.toFixed(
      1
    )} liters\n`;
    csvContent += `Total Fuel Cost,${formatKES(analytics.totalFuelCost)}\n`;
    csvContent += `Average Fuel Efficiency,${analytics.averageEfficiency.toFixed(
      1
    )} km/L\n`;
    csvContent += `Number of Fuel-ups,${analytics.fuelUps}\n`;
    csvContent += `Total Maintenance Cost,${formatKES(
      analytics.totalMaintenanceCost
    )}\n`;
    csvContent += `Number of Services,${analytics.maintenanceCount}\n`;
    csvContent += `Cost per Kilometer,${formatKES(analytics.costPerKm)}\n\n`;

    // Fuel Records
    if (reportConfig.includeFuel && fuelRecords.length > 0) {
      csvContent += "FUEL RECORDS\n";
      csvContent += "Date,Liters,Cost,Efficiency,Station,Notes\n";
      fuelRecords.forEach((record) => {
        csvContent += `${format(record.date, "dd-MM-yyyy")},`;
        csvContent += `${record.liters?.toFixed(1)}L,`;
        csvContent += `${formatKES(record.cost)},`;
        csvContent += `${
          record.fuelEfficiency ? record.fuelEfficiency + " km/L" : "N/A"
        },`;
        csvContent += `${record.station || "N/A"},`;
        csvContent += `${record.notes || "N/A"}\n`;
      });
      csvContent += "\n";
    }

    // Maintenance Records
    if (reportConfig.includeMaintenance && maintenanceRecords.length > 0) {
      csvContent += "MAINTENANCE RECORDS\n";
      csvContent += "Date,Description,Cost,Service Provider\n";
      maintenanceRecords.forEach((record) => {
        csvContent += `${format(record.date, "dd-MM-yyyy")},`;
        csvContent += `"${record.description || "N/A"}",`;
        csvContent += `${formatKES(record.cost)},`;
        csvContent += `${record.serviceProvider || "N/A"}\n`;
      });
    }

    // Create download
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `${vehicle.regNumber}_Report_${format(new Date(), "yyyy-MM-dd")}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return `${vehicle.regNumber}_Report_${format(
      new Date(),
      "yyyy-MM-dd"
    )}.csv`;
  };

  /**
   * Generate report based on configuration
   */
  const handleGenerateReport = async () => {
    try {
      setGenerating(true);
      setError("");

      // Fetch data
      const data = await fetchReportData();

      let fileName;
      if (reportConfig.format === "pdf") {
        fileName = await generatePDFReport(data);
      } else {
        fileName = await generateExcelReport(data);
      }

      // Add to generated reports list
      const newReport = {
        id: Date.now(),
        name: `${reportConfig.type} Report - ${format(new Date(), "MMM yyyy")}`,
        type: reportConfig.type,
        format: reportConfig.format,
        generatedAt: new Date(),
        size: "Processing...",
        fileName,
      };

      setGeneratedReports((prev) => [newReport, ...prev]);
    } catch (error) {
      console.error("Error generating report:", error);
      setError("Failed to generate report. Please try again.");
    } finally {
      setGenerating(false);
    }
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
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={3}
          >
            <Box display="flex" alignItems="center" gap={2}>
              <IconButton onClick={() => router.back()}>
                <BackIcon />
              </IconButton>
              <Box>
                <Typography variant="h4" fontWeight="bold">
                  {vehicle?.regNumber} Reports
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Generate and manage vehicle reports
                </Typography>
              </Box>
            </Box>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Grid container spacing={3}>
            {/* Report Configuration */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom fontWeight="medium">
                  Generate New Report
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Report Type</InputLabel>
                      <Select
                        value={reportConfig.type}
                        onChange={(e) =>
                          handleConfigChange("type", e.target.value)
                        }
                        label="Report Type"
                      >
                        <MenuItem value="monthly">Monthly Report</MenuItem>
                        <MenuItem value="quarterly">Quarterly Report</MenuItem>
                        <MenuItem value="yearly">Yearly Report</MenuItem>
                        <MenuItem value="custom">Custom Range</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Format</InputLabel>
                      <Select
                        value={reportConfig.format}
                        onChange={(e) =>
                          handleConfigChange("format", e.target.value)
                        }
                        label="Format"
                      >
                        <MenuItem value="pdf">PDF Report</MenuItem>
                        <MenuItem value="excel">Excel/CSV</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <DatePicker
                      label="Start Date"
                      value={reportConfig.startDate}
                      onChange={(value) =>
                        handleConfigChange("startDate", value)
                      }
                      format="dd-MM-yyyy"
                      renderInput={(params) => (
                        <TextField {...params} fullWidth />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <DatePicker
                      label="End Date"
                      value={reportConfig.endDate}
                      onChange={(value) => handleConfigChange("endDate", value)}
                      format="dd-MM-yyyy"
                      renderInput={(params) => (
                        <TextField {...params} fullWidth />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom>
                      Include in Report:
                    </Typography>
                    <Box display="flex" gap={1} flexWrap="wrap">
                      <Chip
                        label="Fuel Records"
                        color={reportConfig.includeFuel ? "primary" : "default"}
                        onClick={() =>
                          handleConfigChange(
                            "includeFuel",
                            !reportConfig.includeFuel
                          )
                        }
                        variant={
                          reportConfig.includeFuel ? "filled" : "outlined"
                        }
                      />
                      <Chip
                        label="Maintenance"
                        color={
                          reportConfig.includeMaintenance
                            ? "primary"
                            : "default"
                        }
                        onClick={() =>
                          handleConfigChange(
                            "includeMaintenance",
                            !reportConfig.includeMaintenance
                          )
                        }
                        variant={
                          reportConfig.includeMaintenance
                            ? "filled"
                            : "outlined"
                        }
                      />
                      <Chip
                        label="Analytics"
                        color={
                          reportConfig.includeAnalytics ? "primary" : "default"
                        }
                        onClick={() =>
                          handleConfigChange(
                            "includeAnalytics",
                            !reportConfig.includeAnalytics
                          )
                        }
                        variant={
                          reportConfig.includeAnalytics ? "filled" : "outlined"
                        }
                      />
                    </Box>
                  </Grid>

                  <Grid item xs={12}>
                    <Button
                      variant="contained"
                      onClick={handleGenerateReport}
                      disabled={generating}
                      startIcon={
                        generating ? (
                          <CircularProgress size={20} />
                        ) : (
                          <ReportIcon />
                        )
                      }
                      fullWidth
                    >
                      {generating ? "Generating..." : "Generate Report"}
                    </Button>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* Previous Reports */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom fontWeight="medium">
                  Generated Reports
                </Typography>

                {generatedReports.length === 0 ? (
                  <Box
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                    py={4}
                  >
                    <ReportIcon
                      sx={{ fontSize: 60, color: "grey.400", mb: 2 }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      No reports generated yet
                    </Typography>
                  </Box>
                ) : (
                  <List>
                    {generatedReports.map((report, index) => (
                      <div key={report.id}>
                        <ListItem
                          secondaryAction={
                            <Box display="flex" gap={1}>
                              <IconButton size="small" color="primary">
                                <ViewIcon />
                              </IconButton>
                              <IconButton size="small" color="success">
                                <DownloadIcon />
                              </IconButton>
                              <IconButton size="small" color="error">
                                <DeleteIcon />
                              </IconButton>
                            </Box>
                          }
                        >
                          <ListItemIcon>
                            {report.format === "pdf" ? (
                              <PdfIcon />
                            ) : (
                              <ExcelIcon />
                            )}
                          </ListItemIcon>
                          <ListItemText
                            primary={report.name}
                            secondary={
                              <Box>
                                <Typography variant="caption" display="block">
                                  Generated:{" "}
                                  {format(
                                    report.generatedAt,
                                    "dd-MM-yyyy HH:mm"
                                  )}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  Size: {report.size}
                                </Typography>
                              </Box>
                            }
                          />
                        </ListItem>
                        {index < generatedReports.length - 1 && <Divider />}
                      </div>
                    ))}
                  </List>
                )}
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
