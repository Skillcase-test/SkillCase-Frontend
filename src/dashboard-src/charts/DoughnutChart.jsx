import React, { useRef, useEffect, useLayoutEffect, useState } from 'react';
import { useThemeProvider } from '../utils/ThemeContext';

import { chartColors } from './ChartjsConfig';
import {
  Chart, DoughnutController, ArcElement, TimeScale, Tooltip,
} from 'chart.js';
import 'chartjs-adapter-moment';

Chart.register(DoughnutController, ArcElement, TimeScale, Tooltip);

function DoughnutChart({
  data,
  width,
  height
}) {

  const [chart, setChart] = useState(null);
  const canvas = useRef(null);
  const legend = useRef(null);
  const { currentTheme } = useThemeProvider();
  const darkMode = currentTheme === 'dark';
  const { tooltipTitleColor, tooltipBodyColor, tooltipBgColor, tooltipBorderColor } = chartColors; 

  useLayoutEffect(() => {
    const ctx = canvas.current;
    if (!ctx?.isConnected || !ctx.parentElement) return;

    // Destroy any existing chart on this canvas first
    const existingChart = Chart.getChart(ctx);
    if (existingChart) {
      existingChart.destroy();
    }

    const newChart = new Chart(ctx, {
      type: 'doughnut',
      data: data,
      options: {
        cutout: '80%',
        layout: {
          padding: 24,
        },
        plugins: {
          legend: {
            display: false,
            labels: {
              generateLabels: function(chart) {
                // Add safety checks
                if (!chart || !chart.data) return [];
                
                const chartData = chart.data;
                if (!chartData.labels || !chartData.datasets || chartData.labels.length === 0 || chartData.datasets.length === 0) {
                  return [];
                }
                
                return chartData.labels.map((label, i) => {
                  const dataset = chartData.datasets[0];
                  const backgroundColor = dataset.backgroundColor?.[i] || '#ccc';
                  return {
                    text: label,
                    fillStyle: backgroundColor,
                    hidden: false,
                    index: i
                  };
                });
              }
            }
          },
          tooltip: {
            titleColor: tooltipTitleColor,
            bodyColor:  tooltipBodyColor,
            backgroundColor:  tooltipBgColor,
            borderColor: tooltipBorderColor,
          },
        },
        interaction: {
          intersect: false,
          mode: 'nearest',
        },
        animation: {
          duration: 500,
        },
        maintainAspectRatio: false,
      },
      plugins: [
        {
          id: 'htmlLegend',
          afterUpdate(c, args, options) {
            const ul = legend.current;
            if (!ul) return;
            
            // Enhanced safety checks
            if (!c || !c.options || !c.options.plugins || !c.options.plugins.legend || !c.options.plugins.legend.labels) {
              return;
            }
            
            // Check if chart data exists
            if (!c.data || !c.data.labels || c.data.labels.length === 0) {
              return;
            }
            
            // Remove old legend items
            while (ul.firstChild) {
              ul.firstChild.remove();
            }
            
            // Generate legend items safely
            try {
              const items = c.options.plugins.legend.labels.generateLabels(c);
              
              if (!items || items.length === 0) return;
              
              items.forEach((item) => {
                const li = document.createElement('li');
                li.style.margin = '4px';
                
                // Button element
                const button = document.createElement('button');
                button.classList.add('btn-xs', 'bg-white', '', 'text-gray-500', '', 'shadow-xs', 'shadow-black/[0.08]', 'rounded-full');
                button.style.opacity = item.hidden ? '.3' : '';
                button.onclick = () => {
                  c.toggleDataVisibility(item.index);
                  c.update();
                };
                
                // Color box
                const box = document.createElement('span');
                box.style.display = 'block';
                box.style.width = '8px';
                box.style.height = '8px';
                box.style.backgroundColor = item.fillStyle;
                box.style.borderRadius = '4px';
                box.style.marginRight = '4px';
                box.style.pointerEvents = 'none';
                
                // Label
                const label = document.createElement('span');
                label.style.display = 'flex';
                label.style.alignItems = 'center';
                const labelText = document.createTextNode(item.text);
                label.appendChild(labelText);
                
                li.appendChild(button);
                button.appendChild(box);
                button.appendChild(label);
                ul.appendChild(li);
              });
            } catch (error) {
              console.warn('Error generating legend:', error);
            }
          },
        },
      ],
    });
    
    setChart(newChart);
    
    return () => {
      if (newChart) {
        newChart.stop();
        newChart.destroy();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  useEffect(() => {
    if (!chart) return;

    if (darkMode) {
      chart.options.plugins.tooltip.titleColor = tooltipTitleColor.dark;
      chart.options.plugins.tooltip.bodyColor = tooltipBodyColor.dark;
      chart.options.plugins.tooltip.backgroundColor = tooltipBgColor.dark;
      chart.options.plugins.tooltip.borderColor = tooltipBorderColor.dark;
    } else {
      chart.options.plugins.tooltip.titleColor = tooltipTitleColor.light;
      chart.options.plugins.tooltip.bodyColor = tooltipBodyColor.light;
      chart.options.plugins.tooltip.backgroundColor = tooltipBgColor.light;
      chart.options.plugins.tooltip.borderColor = tooltipBorderColor.light;
    }
    chart.update('none');
  }, [currentTheme, chart, darkMode, tooltipTitleColor, tooltipBodyColor, tooltipBgColor, tooltipBorderColor]);

  return (
    <div className="grow flex flex-col justify-center">
      <div>
        <canvas ref={canvas} width={width} height={height}></canvas>
      </div>
      <div className="px-5 pt-2 pb-6">
        <ul ref={legend} className="flex flex-wrap justify-center -m-1"></ul>
      </div>
    </div>
  );
}

export default DoughnutChart;
