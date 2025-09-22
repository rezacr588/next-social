import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { cn } from '../../lib/utils/className';

// Lazy load chart to reduce initial bundle
const DynamicChart = dynamic(
  () => import('react-apexcharts').then(mod => mod.default),
  { ssr: false, loading: () => <div className="h-48 flex items-center justify-center text-xs text-gray-500">Loading chart...</div> }
);

export const EngagementChart = ({
  data = [],
  labels = [],
  title = 'Engagement Over Time',
  height = 280,
  type = 'area',
  loading = false,
  className,
}) => {
  const [mounted, setMounted] = useState(false);
  const [series, setSeries] = useState([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!loading && data.length > 0) {
      setSeries([
        {
          name: 'Engagement',
            data: data,
        },
      ]);
    }
  }, [data, loading]);

  const options = {
    chart: {
      id: 'engagement-chart',
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: { easing: 'easeinout', speed: 600 },
      fontFamily: 'inherit',
      foreColor: '#9CA3AF'
    },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    grid: {
      borderColor: '#1F2937',
      strokeDashArray: 4,
      padding: { left: 12, right: 12, top: 16, bottom: 0 }
    },
    xaxis: {
      categories: labels,
      labels: {
        style: { fontSize: '11px' }
      },
      axisBorder: { color: '#374151' },
      axisTicks: { color: '#374151' }
    },
    yaxis: {
      labels: { style: { fontSize: '11px' } }
    },
    colors: ['#8B5CF6'],
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0.05,
        stops: [0, 90, 100]
      }
    },
    tooltip: {
      theme: 'dark',
      shared: false,
      intersect: true,
      x: { show: true },
      y: { formatter: val => Math.round(val) }
    },
    markers: {
      size: 3,
      strokeWidth: 2,
      strokeColors: '#111827',
      hover: { size: 6 }
    }
  };

  return (
    <div className={cn('relative rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-sm p-4', className)}>
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-medium text-gray-300">{title}</h4>
        <div className="flex items-center space-x-2 text-[10px] font-medium text-gray-500">
          <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/30">Engagement</span>
        </div>
      </div>
      {loading ? (
        <div className="h-[220px] flex items-center justify-center text-xs text-gray-500">Loading data...</div>
      ) : mounted ? (
        <DynamicChart options={options} series={series} type={type} height={height} />
      ) : (
        <div className="h-[220px] flex items-center justify-center text-xs text-gray-500">Preparing chart...</div>
      )}
    </div>
  );
};

export default EngagementChart;