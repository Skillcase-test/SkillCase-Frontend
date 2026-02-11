import React, { useRef, useEffect, useState } from "react";
import { useThemeProvider } from "../utils/ThemeContext";
import { chartColors } from "./ChartjsConfig";
import {
  Chart,
  LineController,
  LineElement,
  Filler,
  PointElement,
  LinearScale,
  TimeScale,
  Tooltip,
} from "chart.js";
import "chartjs-adapter-moment";

// Import utilities
import { formatValue } from "../utils/Utils";

Chart.register(
  LineController,
  LineElement,
  Filler,
  PointElement,
  LinearScale,
  TimeScale,
  Tooltip,
);

function LineChartDAU({ data, width, height }) {
  const [chart, setChart] = useState(null);
  const canvas = useRef(null);
  const {
    tooltipBodyColor,
    tooltipBgColor,
    tooltipBorderColor,
    tooltipTitleColor,
  } = chartColors;

  useEffect(() => {
    const ctx = canvas.current;
    // eslint-disable-next-line no-unused-vars
    const newChart = new Chart(ctx, {
      type: "line",
      data: data,
      options: {
        layout: {
          padding: 20,
        },
        scales: {
          y: {
            display: false,
            beginAtZero: true,
          },
          x: {
            type: "time",
            time: {
              unit: "day",
              displayFormats: {
                day: "MMM DD",
              },
              tooltipFormat: "MMM DD", // Fix: No time in tooltip
            },
            display: false,
            grid: {
              display: false,
            },
          },
        },
        plugins: {
          tooltip: {
            callbacks: {
              title: (context) => context[0].label,
              label: (context) =>
                `${context.dataset.label}: ${context.parsed.y}`,
            },
            bodyColor: tooltipBodyColor,
            backgroundColor: tooltipBgColor,
            borderColor: tooltipBorderColor,
            titleColor: "#1f2937", // Fix: Visible dark title, explicit color code for gray-800
            titleFont: {
              weight: "bold",
            },
          },
          legend: {
            display: false,
          },
        },
        interaction: {
          intersect: false,
          mode: "nearest",
        },
        maintainAspectRatio: false,
        resizeDelay: 200,
      },
    });
    setChart(newChart);
    return () => newChart.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]); // Re-render if data changes

  return <canvas ref={canvas} width={width} height={height}></canvas>;
}

export default LineChartDAU;
