import {
  format,
  startOfMonth,
  endOfMonth,
  eachMonthOfInterval,
  parseISO,
} from "date-fns";

/**
 * Calculate kilometers between fueling records with proper efficiency calculation
 * @param {Array} fuelRecords - Array of fuel records sorted by date
 * @returns {Array} Array of records with distance between fueling and efficiency
 */
export const calculateDistanceBetweenFueling = (fuelRecords = []) => {
  if (!fuelRecords.length) return [];

  // Debug: Log input data
  console.log(
    "calculateDistanceBetweenFueling input:",
    fuelRecords.slice(0, 2)
  );

  // Sort records by date to ensure correct order (oldest first for proper calculation)
  const sortedRecords = [...fuelRecords].sort((a, b) => a.date - b.date);

  const result = sortedRecords.map((record, index) => {
    // Ensure we have valid data
    const liters = parseFloat(record.liters) || 0;
    const odometerReading = parseFloat(record.odometerReading) || null;
    const cost = parseFloat(record.cost) || 0;

    // Check if current record is a full tank (handle different field names)
    const isFullTank =
      record.isFullTank === true ||
      record.fillType === "full" ||
      record.isFullTank === "true" ||
      record.fillType === "Full Tank" ||
      // Default to true if no fill type is specified (backward compatibility)
      (record.isFullTank === undefined && record.fillType === undefined);

    // First record - no previous record to calculate distance from
    if (index === 0) {
      console.log("First record:", {
        id: record.id,
        isFullTank,
        fillType: record.fillType,
        isFullTankField: record.isFullTank,
        hasOdometer: !!odometerReading,
        odometerReading,
      });
      return {
        ...record,
        liters,
        odometerReading,
        cost,
        distanceSinceLastFuel: 0,
        fuelEfficiency: null,
        isIncomplete: !odometerReading,
        isPartialFill: !isFullTank,
        efficiencyStatus: !odometerReading ? "incomplete" : "no_previous_data",
      };
    }

    const previousRecord = sortedRecords[index - 1];
    const previousOdometerReading =
      parseFloat(previousRecord.odometerReading) || null;

    // Check if current record has odometer reading
    const hasCurrentOdometer = odometerReading && odometerReading > 0;
    const hasPreviousOdometer =
      previousOdometerReading && previousOdometerReading > 0;

    // Debug: Log record processing
    console.log("Processing record:", {
      id: record.id,
      date: record.date,
      liters,
      odometerReading,
      isFullTank,
      fillType: record.fillType,
      isFullTankField: record.isFullTank,
      hasCurrentOdometer,
      hasPreviousOdometer,
      previousOdometer: previousOdometerReading,
    });

    // If either record is missing odometer reading, mark as incomplete
    if (!hasCurrentOdometer || !hasPreviousOdometer) {
      return {
        ...record,
        liters,
        odometerReading,
        cost,
        distanceSinceLastFuel: null,
        fuelEfficiency: null,
        isIncomplete: true,
        isPartialFill: !isFullTank,
        efficiencyStatus: !hasCurrentOdometer
          ? "missing_current_odometer"
          : "missing_previous_odometer",
      };
    }

    // Calculate distance between fueling
    const distance = odometerReading - previousOdometerReading;

    // Validate distance calculation
    if (distance <= 0) {
      console.log("Invalid distance:", {
        current: odometerReading,
        previous: previousOdometerReading,
        distance,
      });
      return {
        ...record,
        liters,
        odometerReading,
        cost,
        distanceSinceLastFuel: null,
        fuelEfficiency: null,
        isIncomplete: true,
        isPartialFill: !isFullTank,
        efficiencyStatus: "invalid_distance",
      };
    }

    // Calculate efficiency (km/L) - only for full tank records
    let efficiency = null;
    if (isFullTank && liters > 0) {
      efficiency = distance / liters;
      console.log("Calculated efficiency:", {
        distance,
        liters,
        efficiency,
      });
    } else {
      console.log("No efficiency calculated:", {
        isFullTank,
        liters,
        reason: !isFullTank ? "not_full_tank" : "no_liters",
      });
    }

    return {
      ...record,
      liters,
      odometerReading,
      cost,
      distanceSinceLastFuel: distance,
      fuelEfficiency: efficiency,
      isIncomplete: false,
      isPartialFill: !isFullTank,
      efficiencyStatus: isFullTank ? "complete" : "partial_fill",
    };
  });

  // Debug: Log final result
  console.log("calculateDistanceBetweenFueling result:", result.slice(0, 2));
  return result;
};

/**
 * Calculate basic vehicle analytics from fuel and maintenance records
 * @param {Array} fuelRecords - Array of fuel records
 * @param {Array} maintenanceRecords - Array of maintenance records
 * @returns {Object} Analytics object with calculated metrics
 */
export const calculateVehicleAnalytics = (
  fuelRecords = [],
  maintenanceRecords = []
) => {
  // Basic fuel metrics
  const totalLiters = fuelRecords.reduce(
    (sum, record) => sum + (record.liters || 0),
    0
  );
  const totalFuelCost = fuelRecords.reduce((sum, record) => {
    const cost = record.cost || 0;
    return sum + cost;
  }, 0);
  const fuelUps = fuelRecords.length;

  // Calculate distances between fueling with efficiency
  const recordsWithDistance = calculateDistanceBetweenFueling(fuelRecords);

  // Calculate total distance from complete records only
  const completeRecords = recordsWithDistance.filter(
    (record) => !record.isIncomplete
  );
  const totalDistance = completeRecords.reduce(
    (sum, record) => sum + (record.distanceSinceLastFuel || 0),
    0
  );

  // Calculate average distance between fueling (only from complete records)
  const averageDistanceBetweenFueling =
    completeRecords.length > 1
      ? totalDistance / (completeRecords.length - 1)
      : 0;

  // Calculate efficiency metrics from complete FULL TANK records only
  const recordsWithEfficiency = completeRecords.filter(
    (record) =>
      !record.isPartialFill &&
      record.fuelEfficiency &&
      record.fuelEfficiency > 0
  );

  // Calculate average efficiency
  const averageEfficiency =
    recordsWithEfficiency.length > 0
      ? recordsWithEfficiency.reduce(
          (sum, record) => sum + record.fuelEfficiency,
          0
        ) / recordsWithEfficiency.length
      : 0;

  // Calculate best and worst efficiency
  const bestEfficiency =
    recordsWithEfficiency.length > 0
      ? Math.max(...recordsWithEfficiency.map((r) => r.fuelEfficiency))
      : 0;

  const worstEfficiency =
    recordsWithEfficiency.length > 0
      ? Math.min(...recordsWithEfficiency.map((r) => r.fuelEfficiency))
      : 0;

  // Count incomplete and partial fill records
  const incompleteRecords = recordsWithDistance.filter(
    (record) => record.isIncomplete
  );
  const partialFillRecords = recordsWithDistance.filter(
    (record) => record.isPartialFill
  );
  const incompleteCount = incompleteRecords.length;
  const partialFillCount = partialFillRecords.length;
  const fullTankCount =
    recordsWithDistance.length - incompleteCount - partialFillCount;

  // Maintenance metrics
  const totalMaintenanceCost = maintenanceRecords.reduce(
    (sum, record) => sum + (record.cost || 0),
    0
  );
  const maintenanceCount = maintenanceRecords.length;

  // Cost analysis
  const totalOperatingCost = totalFuelCost + totalMaintenanceCost;
  const costPerKm = totalDistance > 0 ? totalOperatingCost / totalDistance : 0;
  const costPerLiter = totalLiters > 0 ? totalFuelCost / totalLiters : 0;

  const result = {
    // Fuel metrics
    totalLiters: Number(totalLiters.toFixed(2)),
    totalFuelCost: Number(totalFuelCost.toFixed(2)),
    fuelUps,
    costPerLiter: Number(costPerLiter.toFixed(2)),

    // Distance and efficiency
    totalDistance: Number(totalDistance.toFixed(0)),
    averageDistanceBetweenFueling: Number(
      averageDistanceBetweenFueling.toFixed(0)
    ),
    averageEfficiency: Number(averageEfficiency.toFixed(2)),
    bestEfficiency: Number(bestEfficiency.toFixed(2)),
    worstEfficiency: Number(worstEfficiency.toFixed(2)),
    completeRecordsCount: completeRecords.length,
    incompleteRecordsCount: incompleteCount,
    fullTankCount: fullTankCount,
    partialFillCount: partialFillCount,

    // Maintenance metrics
    totalMaintenanceCost: Number(totalMaintenanceCost.toFixed(2)),
    maintenanceCount,

    // Overall cost analysis
    totalOperatingCost: Number(totalOperatingCost.toFixed(2)),
    costPerKm: Number(costPerKm.toFixed(2)),
  };

  return result;
};

/**
 * Group fuel records by month for trend analysis
 * @param {Array} fuelRecords - Array of fuel records
 * @returns {Object} Monthly data grouped by year-month
 */
export const groupFuelRecordsByMonth = (fuelRecords = []) => {
  const monthlyData = {};

  // Calculate distances and efficiency for all records
  const recordsWithDistance = calculateDistanceBetweenFueling(fuelRecords);

  recordsWithDistance.forEach((record) => {
    if (!record.date) return;

    const monthKey = format(record.date, "yyyy-MM");
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = {
        month: monthKey,
        totalLiters: 0,
        totalCost: 0,
        fuelUps: 0,
        totalDistance: 0,
        averageEfficiency: 0,
        efficiencyCount: 0,
        completeRecords: 0,
        incompleteRecords: 0,
        fullTankRecords: 0,
        partialFillRecords: 0,
        records: [],
      };
    }

    monthlyData[monthKey].totalLiters += record.liters || 0;
    monthlyData[monthKey].totalCost += record.cost || 0;
    monthlyData[monthKey].fuelUps += 1;

    if (!record.isIncomplete && record.distanceSinceLastFuel) {
      monthlyData[monthKey].totalDistance += record.distanceSinceLastFuel;
      monthlyData[monthKey].completeRecords += 1;

      if (!record.isPartialFill) {
        monthlyData[monthKey].fullTankRecords += 1;
      } else {
        monthlyData[monthKey].partialFillRecords += 1;
      }
    } else {
      monthlyData[monthKey].incompleteRecords += 1;
    }

    if (
      !record.isIncomplete &&
      !record.isPartialFill &&
      record.fuelEfficiency &&
      record.fuelEfficiency > 0
    ) {
      monthlyData[monthKey].averageEfficiency += record.fuelEfficiency;
      monthlyData[monthKey].efficiencyCount += 1;
    }

    monthlyData[monthKey].records.push(record);
  });

  // Calculate average efficiency for each month
  Object.keys(monthlyData).forEach((monthKey) => {
    const data = monthlyData[monthKey];
    if (data.efficiencyCount > 0) {
      data.averageEfficiency = Number(
        (data.averageEfficiency / data.efficiencyCount).toFixed(2)
      );
    }
    data.totalLiters = Number(data.totalLiters.toFixed(2));
    data.totalCost = Number(data.totalCost.toFixed(2));
    data.totalDistance = Number(data.totalDistance.toFixed(0));
  });

  return monthlyData;
};

/**
 * Calculate fuel efficiency trends and identify patterns
 * @param {Array} fuelRecords - Array of fuel records with efficiency data
 * @returns {Object} Efficiency analysis with trends and patterns
 */
export const analyzeFuelEfficiency = (fuelRecords = []) => {
  // Calculate efficiency for each record using the improved function
  const recordsWithEfficiency = calculateDistanceBetweenFueling(fuelRecords)
    .filter(
      (record) =>
        !record.isIncomplete &&
        !record.isPartialFill &&
        record.fuelEfficiency &&
        record.fuelEfficiency > 0
    )
    .sort((a, b) => a.date - b.date);

  if (recordsWithEfficiency.length === 0) {
    return {
      trend: "no-data",
      bestEfficiency: 0,
      worstEfficiency: 0,
      improvementRate: 0,
      isImproving: false,
      recommendations: [
        "Add full tank fuel efficiency data to track performance",
      ],
    };
  }

  const efficiencyValues = recordsWithEfficiency.map(
    (record) => record.fuelEfficiency
  );
  const bestEfficiency = Math.max(...efficiencyValues);
  const worstEfficiency = Math.min(...efficiencyValues);
  const averageEfficiency =
    efficiencyValues.reduce((sum, val) => sum + val, 0) /
    efficiencyValues.length;

  // Calculate trend using linear regression (simplified)
  const recentRecords = recordsWithEfficiency.slice(-6); // Last 6 records
  const oldRecords = recordsWithEfficiency.slice(0, 6); // First 6 records

  const recentAverage =
    recentRecords.reduce((sum, record) => sum + record.fuelEfficiency, 0) /
    recentRecords.length;
  const oldAverage =
    oldRecords.reduce((sum, record) => sum + record.fuelEfficiency, 0) /
    oldRecords.length;

  const improvementRate =
    recentRecords.length > 0 && oldRecords.length > 0
      ? ((recentAverage - oldAverage) / oldAverage) * 100
      : 0;

  const isImproving = improvementRate > 2; // Consider 2% improvement as significant
  const isDecreasing = improvementRate < -2;

  // Generate recommendations
  const recommendations = [];
  if (isDecreasing) {
    recommendations.push(
      "Vehicle efficiency is declining - consider maintenance check"
    );
    recommendations.push("Review driving patterns and fuel quality");
  } else if (isImproving) {
    recommendations.push(
      "Good improvement in fuel efficiency - maintain current practices"
    );
  } else {
    recommendations.push(
      "Efficiency is stable - consider optimization opportunities"
    );
  }

  if (averageEfficiency < 8) {
    recommendations.push("Consider driver training for fuel-efficient driving");
  }

  return {
    trend: isImproving ? "improving" : isDecreasing ? "declining" : "stable",
    bestEfficiency: Number(bestEfficiency.toFixed(2)),
    worstEfficiency: Number(worstEfficiency.toFixed(2)),
    averageEfficiency: Number(averageEfficiency.toFixed(2)),
    improvementRate: Number(improvementRate.toFixed(2)),
    isImproving,
    recommendations,
  };
};

/**
 * Compare vehicle performance against fleet average
 * @param {Object} vehicleAnalytics - Current vehicle analytics
 * @param {Object} fleetAnalytics - Fleet average analytics
 * @returns {Object} Comparison results
 */
export const compareToFleetAverage = (vehicleAnalytics, fleetAnalytics) => {
  if (!fleetAnalytics) {
    return {
      efficiencyVsFleet: 0,
      costPerKmVsFleet: 0,
      fuelCostVsFleet: 0,
      isAboveAverage: false,
      recommendations: ["Fleet data not available for comparison"],
    };
  }

  const efficiencyDiff =
    vehicleAnalytics.averageEfficiency - fleetAnalytics.averageEfficiency;
  const costPerKmDiff = vehicleAnalytics.costPerKm - fleetAnalytics.costPerKm;
  const fuelCostDiff =
    vehicleAnalytics.costPerLiter - fleetAnalytics.costPerLiter;

  const efficiencyPercentage =
    fleetAnalytics.averageEfficiency > 0
      ? (efficiencyDiff / fleetAnalytics.averageEfficiency) * 100
      : 0;

  const costPerKmPercentage =
    fleetAnalytics.costPerKm > 0
      ? (costPerKmDiff / fleetAnalytics.costPerKm) * 100
      : 0;

  const isAboveAverage = efficiencyPercentage > 0 && costPerKmPercentage < 0;

  const recommendations = [];
  if (efficiencyPercentage < -10) {
    recommendations.push(
      "Vehicle efficiency is significantly below fleet average"
    );
    recommendations.push("Schedule maintenance check and driver assessment");
  } else if (efficiencyPercentage > 10) {
    recommendations.push("Excellent efficiency - above fleet average");
  }

  if (costPerKmPercentage > 15) {
    recommendations.push("Operating costs are higher than fleet average");
    recommendations.push(
      "Review maintenance frequency and fuel purchasing practices"
    );
  }

  return {
    efficiencyVsFleet: Number(efficiencyPercentage.toFixed(1)),
    costPerKmVsFleet: Number(costPerKmPercentage.toFixed(1)),
    fuelCostVsFleet: Number(
      ((fuelCostDiff / fleetAnalytics.costPerLiter) * 100).toFixed(1)
    ),
    isAboveAverage,
    recommendations,
  };
};

/**
 * Generate chart data for fuel consumption visualization
 * @param {Object} monthlyData - Monthly grouped fuel data
 * @returns {Object} Chart data ready for Chart.js
 */
export const generateFuelConsumptionChartData = (monthlyData) => {
  const sortedMonths = Object.keys(monthlyData).sort();

  return {
    labels: sortedMonths.map((month) =>
      format(new Date(month + "-01"), "MMM yyyy")
    ),
    datasets: [
      {
        label: "Liters Consumed",
        data: sortedMonths.map((month) => monthlyData[month].totalLiters),
        backgroundColor: "rgba(54, 162, 235, 0.6)",
        borderColor: "rgba(54, 162, 235, 1)",
        borderWidth: 2,
        yAxisID: "y",
      },
      {
        label: "Cost (KES)",
        data: sortedMonths.map((month) => monthlyData[month].totalCost),
        backgroundColor: "rgba(255, 99, 132, 0.6)",
        borderColor: "rgba(255, 99, 132, 1)",
        borderWidth: 2,
        yAxisID: "y1",
      },
    ],
  };
};

/**
 * Generate chart data for fuel efficiency trend
 * @param {Array} fuelRecords - Array of fuel records
 * @returns {Object} Chart data for efficiency trend
 */
export const generateEfficiencyTrendData = (fuelRecords) => {
  const recordsWithEfficiency = calculateDistanceBetweenFueling(fuelRecords)
    .filter(
      (record) =>
        !record.isIncomplete &&
        !record.isPartialFill &&
        record.fuelEfficiency &&
        record.fuelEfficiency > 0
    )
    .sort((a, b) => a.date - b.date);

  if (recordsWithEfficiency.length === 0) {
    return {
      labels: [],
      datasets: [
        {
          label: "Fuel Efficiency (km/L)",
          data: [],
          borderColor: "rgba(75, 192, 192, 1)",
          backgroundColor: "rgba(75, 192, 192, 0.2)",
          tension: 0.1,
          fill: true,
        },
      ],
    };
  }

  return {
    labels: recordsWithEfficiency.map((record) =>
      format(record.date, "MMM dd")
    ),
    datasets: [
      {
        label: "Fuel Efficiency (km/L)",
        data: recordsWithEfficiency.map((record) => record.fuelEfficiency),
        borderColor: "rgba(75, 192, 192, 1)",
        backgroundColor: "rgba(75, 192, 192, 0.2)",
        tension: 0.1,
        fill: true,
      },
    ],
  };
};

/**
 * Calculate maintenance intervals and predict next service based on kilometers
 * @param {Array} maintenanceRecords - Array of maintenance records
 * @param {number} currentOdometer - Current odometer reading in km
 * @returns {Object} Maintenance analysis and predictions
 */
export const analyzeMaintenancePatterns = (
  maintenanceRecords = [],
  currentOdometer = 0
) => {
  if (maintenanceRecords.length === 0) {
    return {
      averageKmInterval: 0,
      nextServiceKm: null,
      nextServiceDue: null,
      kmUntilService: null,
      overdueServices: [],
      recommendations: ["No maintenance records available"],
    };
  }

  // Filter and sort records that have odometer readings
  const recordsWithOdometer = maintenanceRecords
    .filter((record) => record.odometerReading && record.date)
    .sort((a, b) => a.odometerReading - b.odometerReading);

  if (recordsWithOdometer.length === 0) {
    return {
      averageKmInterval: 0,
      nextServiceKm: null,
      nextServiceDue: null,
      kmUntilService: null,
      overdueServices: [],
      recommendations: [
        "Add odometer readings to maintenance records for better predictions",
      ],
    };
  }

  // Calculate average interval between services in kilometers
  const kmIntervals = [];
  for (let i = 1; i < recordsWithOdometer.length; i++) {
    const prevOdometer = recordsWithOdometer[i - 1].odometerReading;
    const currentOdometerReading = recordsWithOdometer[i].odometerReading;
    const kmDiff = currentOdometerReading - prevOdometer;
    if (kmDiff > 0) {
      kmIntervals.push(kmDiff);
    }
  }

  // Use standard service intervals if we don't have enough data
  const averageKmInterval =
    kmIntervals.length > 0
      ? kmIntervals.reduce((sum, interval) => sum + interval, 0) /
        kmIntervals.length
      : 5000; // Default to 5,000 km service interval

  // Get the most recent service
  const lastServiceRecord = recordsWithOdometer[recordsWithOdometer.length - 1];
  const lastServiceOdometer = lastServiceRecord.odometerReading;

  // Predict next service based on average interval
  const nextServiceKm = lastServiceOdometer + averageKmInterval;
  const kmUntilService = Math.max(0, nextServiceKm - currentOdometer);

  // Estimate date for next service (if we have current odometer and can estimate usage)
  let nextServiceDue = null;
  if (currentOdometer > 0 && recordsWithOdometer.length >= 2) {
    // Calculate average km per day from recent records
    const recentRecords = recordsWithOdometer.slice(-3); // Last 3 services
    let totalKmPerDay = 0;
    let validPeriods = 0;

    for (let i = 1; i < recentRecords.length; i++) {
      const prevRecord = recentRecords[i - 1];
      const currentRecord = recentRecords[i];

      const kmDiff = currentRecord.odometerReading - prevRecord.odometerReading;
      const daysDiff = Math.floor(
        (currentRecord.date - prevRecord.date) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff > 0 && kmDiff > 0) {
        totalKmPerDay += kmDiff / daysDiff;
        validPeriods++;
      }
    }

    if (validPeriods > 0) {
      const avgKmPerDay = totalKmPerDay / validPeriods;
      const daysUntilService = Math.ceil(kmUntilService / avgKmPerDay);
      nextServiceDue = new Date(
        Date.now() + daysUntilService * 24 * 60 * 60 * 1000
      );
    }
  }

  // Check for overdue services
  const overdueServices = [];
  if (currentOdometer > nextServiceKm) {
    const kmOverdue = currentOdometer - nextServiceKm;
    overdueServices.push({
      type: "Regular Service",
      kmOverdue,
      scheduledKm: nextServiceKm,
      currentKm: currentOdometer,
    });
  }

  // Generate recommendations
  const recommendations = [];
  if (overdueServices.length > 0) {
    const kmOverdue = overdueServices[0].kmOverdue;
    recommendations.push(
      `Vehicle is ${Math.round(
        kmOverdue
      )} km overdue for service - schedule immediately`
    );
  } else if (kmUntilService <= 500) {
    recommendations.push(
      `Service due in ${Math.round(
        kmUntilService
      )} km - schedule appointment soon`
    );
  } else if (kmUntilService <= 1000) {
    recommendations.push(
      `Service due in ${Math.round(kmUntilService)} km - plan ahead`
    );
  }

  // Add interval-based recommendations
  if (averageKmInterval < 3000) {
    recommendations.push(
      "Service interval seems short - consider extending if appropriate"
    );
  } else if (averageKmInterval > 15000) {
    recommendations.push(
      "Service interval seems long - consider more frequent maintenance"
    );
  }

  return {
    averageKmInterval: Math.round(averageKmInterval),
    nextServiceKm: Math.round(nextServiceKm),
    nextServiceDue,
    kmUntilService: Math.round(kmUntilService),
    overdueServices,
    recommendations,
    totalServices: recordsWithOdometer.length,
    lastServiceKm: lastServiceOdometer,
    currentKm: currentOdometer,
  };
};

/**
 * Calculate cost breakdown and identify cost optimization opportunities
 * @param {Object} analytics - Vehicle analytics data
 * @param {Array} fuelRecords - Fuel records
 * @param {Array} maintenanceRecords - Maintenance records
 * @returns {Object} Cost analysis and optimization suggestions
 */
export const analyzeCostOptimization = (
  analytics,
  fuelRecords = [],
  maintenanceRecords = []
) => {
  const fuelCostPercentage =
    analytics.totalOperatingCost > 0
      ? (analytics.totalFuelCost / analytics.totalOperatingCost) * 100
      : 0;

  const maintenanceCostPercentage =
    analytics.totalOperatingCost > 0
      ? (analytics.totalMaintenanceCost / analytics.totalOperatingCost) * 100
      : 0;

  // Analyze fuel stations for cost optimization
  const stationAnalysis = {};
  fuelRecords.forEach((record) => {
    if (!record.station || !record.cost || !record.liters) return;

    if (!stationAnalysis[record.station]) {
      stationAnalysis[record.station] = {
        totalCost: 0,
        totalLiters: 0,
        visits: 0,
      };
    }

    stationAnalysis[record.station].totalCost += record.cost;
    stationAnalysis[record.station].totalLiters += record.liters;
    stationAnalysis[record.station].visits += 1;
  });

  // Find most cost-effective station
  const stationEfficiency = Object.keys(stationAnalysis)
    .map((station) => ({
      station,
      avgCostPerLiter:
        stationAnalysis[station].totalLiters > 0
          ? stationAnalysis[station].totalCost /
            stationAnalysis[station].totalLiters
          : 0,
      visits: stationAnalysis[station].visits,
    }))
    .sort((a, b) => a.avgCostPerLiter - b.avgCostPerLiter);

  const recommendations = [];

  if (fuelCostPercentage > 80) {
    recommendations.push(
      "Fuel costs are very high - focus on efficiency improvements"
    );
  }

  if (maintenanceCostPercentage > 30) {
    recommendations.push(
      "Maintenance costs are high - review service frequency and quality"
    );
  }

  if (stationEfficiency.length > 1) {
    const cheapest = stationEfficiency[0];
    const mostExpensive = stationEfficiency[stationEfficiency.length - 1];
    const savings = mostExpensive.avgCostPerLiter - cheapest.avgCostPerLiter;

    if (savings > 5) {
      recommendations.push(
        `Consider using ${
          cheapest.station
        } more often - potential savings of KES ${savings.toFixed(2)}/L`
      );
    }
  }

  return {
    fuelCostPercentage: Number(fuelCostPercentage.toFixed(1)),
    maintenanceCostPercentage: Number(maintenanceCostPercentage.toFixed(1)),
    stationAnalysis: stationEfficiency,
    recommendations,
    potentialMonthlySavings: 0, // Would calculate based on usage patterns
  };
};
