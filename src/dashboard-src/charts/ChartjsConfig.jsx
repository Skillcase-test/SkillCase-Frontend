// Import Chart.js
import { Chart, Tooltip } from 'chart.js';
// Import Tailwind config

Chart.register(Tooltip);

// Define Chart.js default settings
Chart.defaults.font.family = '"Inter", sans-serif';
Chart.defaults.font.weight = 500;
Chart.defaults.plugins.tooltip.borderWidth = 1;
Chart.defaults.plugins.tooltip.displayColors = false;
Chart.defaults.plugins.tooltip.mode = 'nearest';
Chart.defaults.plugins.tooltip.intersect = false;
Chart.defaults.plugins.tooltip.position = 'nearest';
Chart.defaults.plugins.tooltip.caretSize = 0;
Chart.defaults.plugins.tooltip.caretPadding = 20;
Chart.defaults.plugins.tooltip.cornerRadius = 8;
Chart.defaults.plugins.tooltip.padding = 8;

// Function that generates a gradient for line charts
export const chartAreaGradient = (ctx, chartArea, colorStops) => {
  if (!ctx || !chartArea || !colorStops || colorStops.length === 0) {
    return 'transparent';
  }
  const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
  colorStops.forEach(({ stop, color }) => {
    gradient.addColorStop(stop, color);
  });
  return gradient;
};

// Light theme only - use direct color values
export const chartColors = {
  textColor: '#9ca3af',        // gray-400
  gridColor: '#f3f4f6',        // gray-100
  backdropColor: '#ffffff',    // white
  tooltipTitleColor: '#1f2937', // gray-800
  tooltipBodyColor: '#6b7280',  // gray-500
  tooltipBgColor: '#ffffff',    // white
  tooltipBorderColor: '#e5e7eb', // gray-200
};
