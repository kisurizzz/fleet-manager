import { format } from "date-fns";

/**
 * Format currency in Kenya Shillings (KES)
 * @param {number} amount - The amount to format
 * @returns {string} Formatted currency string
 */
export const formatKES = (amount) => {
  return `KES ${Number(amount).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

/**
 * Export data to CSV format
 * @param {Array} data - Array of objects to export
 * @param {string} filename - Name of the file (without extension)
 * @param {Array} headers - Optional custom headers array
 */
export const exportToCSV = (data, filename, headers = null) => {
  if (!data || data.length === 0) {
    console.warn("No data to export");
    return;
  }

  try {
    // Use custom headers or extract from first object
    const csvHeaders = headers || Object.keys(data[0]);

    // Create header row
    const headerRow = csvHeaders.join(",");

    // Create data rows
    const dataRows = data.map((row) =>
      csvHeaders
        .map((header) => {
          const value = row[header];
          // Handle values that contain commas, quotes, or newlines
          if (
            typeof value === "string" &&
            (value.includes(",") || value.includes('"') || value.includes("\n"))
          ) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value ?? "";
        })
        .join(",")
    );

    // Combine header and data
    const csvContent = [headerRow, ...dataRows].join("\n");

    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `${filename}_${format(new Date(), "yyyy-MM-dd_HH-mm")}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error exporting CSV:", error);
    throw new Error("Failed to export CSV file");
  }
};

/**
 * Export data to JSON format
 * @param {Array|Object} data - Data to export
 * @param {string} filename - Name of the file (without extension)
 */
export const exportToJSON = (data, filename) => {
  if (!data) {
    console.warn("No data to export");
    return;
  }

  try {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], {
      type: "application/json;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `${filename}_${format(new Date(), "yyyy-MM-dd_HH-mm")}.json`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error exporting JSON:", error);
    throw new Error("Failed to export JSON file");
  }
};

/**
 * Format financial data for export
 * @param {Array} data - Array of financial records
 * @param {string} type - Type of report ('fuel', 'maintenance', 'combined')
 */
export const formatFinancialDataForExport = (data, type = "combined") => {
  return data.map((record) => ({
    Date: record.date ? format(new Date(record.date), "dd-MM-yyyy") : "",
    Vehicle: record.vehicleName || record.vehicle || "",
    Type: record.type || type,
    Description: record.description || "",
    Cost: record.cost ? parseFloat(record.cost).toFixed(2) : "0.00",
    ...(record.liters && { Liters: parseFloat(record.liters).toFixed(1) }),
    ...(record.station && { Station: record.station }),
    ...(record.serviceProvider && {
      "Service Provider": record.serviceProvider,
    }),
  }));
};

/**
 * Format vehicle analytics for export
 * @param {Array} vehicleData - Array of vehicle analytics data
 */
export const formatVehicleAnalyticsForExport = (vehicleData) => {
  return vehicleData.map((vehicle) => ({
    "Registration Number": vehicle.regNumber || "",
    Make: vehicle.make || "",
    Model: vehicle.model || "",
    Year: vehicle.year || "",
    "Total Cost": vehicle.totalCost
      ? parseFloat(vehicle.totalCost).toFixed(2)
      : "0.00",
    "Fuel Cost": vehicle.fuelCost
      ? parseFloat(vehicle.fuelCost).toFixed(2)
      : "0.00",
    "Maintenance Cost": vehicle.maintenanceCost
      ? parseFloat(vehicle.maintenanceCost).toFixed(2)
      : "0.00",
    "Fuel Consumed (L)": vehicle.liters
      ? parseFloat(vehicle.liters).toFixed(1)
      : "0.0",
    "Average Fuel Cost per Liter": vehicle.averageFuelCost
      ? parseFloat(vehicle.averageFuelCost).toFixed(2)
      : "0.00",
    "Fuel Records": vehicle.fuelRecords || 0,
    "Maintenance Records": vehicle.maintenanceRecords || 0,
  }));
};

/**
 * Format monthly trends for export
 * @param {Array} monthlyData - Array of monthly analytics data
 */
export const formatMonthlyTrendsForExport = (monthlyData) => {
  return monthlyData.map((month) => ({
    Month: month.month || "",
    "Fuel Cost": month.fuelCost
      ? parseFloat(month.fuelCost).toFixed(2)
      : "0.00",
    "Maintenance Cost": month.maintenanceCost
      ? parseFloat(month.maintenanceCost).toFixed(2)
      : "0.00",
    "Total Cost": month.totalCost
      ? parseFloat(month.totalCost).toFixed(2)
      : "0.00",
    "Fuel Consumed (L)": month.liters
      ? parseFloat(month.liters).toFixed(1)
      : "0.0",
    "Fuel Records": month.fuelRecords || 0,
    "Maintenance Records": month.maintenanceRecords || 0,
  }));
};

/**
 * Generate comprehensive fleet report
 * @param {Object} analytics - Complete analytics object
 * @param {Object} dateRange - Date range for the report
 */
export const generateFleetReport = (analytics, dateRange) => {
  const reportData = {
    reportInfo: {
      generatedAt: format(new Date(), "dd-MM-yyyy HH:mm:ss"),
      period: {
        from: format(dateRange.start, "dd-MM-yyyy"),
        to: format(dateRange.end, "dd-MM-yyyy"),
      },
    },
    overview: analytics.overview,
    monthlyTrends: formatMonthlyTrendsForExport(analytics.monthly),
    vehicleBreakdown: formatVehicleAnalyticsForExport(
      analytics.vehicleBreakdown
    ),
    topExpenses: formatFinancialDataForExport(analytics.topExpenses),
  };

  return reportData;
};
