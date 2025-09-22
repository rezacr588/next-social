import React from 'react';
import { cn } from '../../lib/utils/className';

export const MetricGrid = ({
  metrics = [],
  columns = 4,
  loading = false,
  className,
}) => {
  const displayMetrics = loading
    ? new Array(columns * 2).fill(null).map((_, i) => ({ id: i, loading: true }))
    : metrics;

  return (
    <div
      className={cn(
        'grid gap-5',
        columns === 1 && 'grid-cols-1',
        columns === 2 && 'grid-cols-1 sm:grid-cols-2',
        columns === 3 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        columns === 4 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
        columns === 5 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-5',
        className
      )}
    >
      {displayMetrics.map((metric, idx) => (
        <div
          key={metric.id || idx}
          className={cn(
            'relative rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-800/60 to-gray-900/60',
            'backdrop-blur-sm p-4 group overflow-hidden hover:border-gray-700 transition-colors'
          )}
        >
          {metric.loading ? (
            <div className="space-y-4">
              <div className="w-2/3 h-4 bg-gray-700/50 rounded animate-pulse" />
              <div className="space-y-2">
                <div className="w-1/4 h-3 bg-gray-700/30 rounded animate-pulse" />
                <div className="w-1/2 h-3 bg-gray-700/30 rounded animate-pulse" />
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-sm font-medium text-gray-300 flex items-center space-x-2">
                    <span>{metric.label}</span>
                    {metric.trend && (
                      <span
                        className={cn(
                          'text-[10px] px-1.5 py-0.5 rounded-full font-semibold tracking-wide',
                          metric.trend > 0
                            ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                            : metric.trend < 0
                            ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                            : 'bg-white/5 text-gray-300 border border-white/5'
                        )}
                      >
                        {metric.trend > 0 ? '+' : ''}{metric.trend}%
                      </span>
                    )}
                  </div>
                  <div className="mt-2">
                    <div className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">
                      {metric.value}
                    </div>
                  </div>
                </div>
                {metric.icon && (
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 border border-white/10 text-white/70 group-hover:text-white/90 transition-colors">
                    {metric.icon}
                  </div>
                )}
              </div>
              {metric.description && (
                <div className="text-xs text-gray-400 leading-relaxed">
                  {metric.description}
                </div>
              )}
              {metric.sparkline && (
                <div className="mt-4 h-12 flex items-end space-x-1">
                  {metric.sparkline.map((val, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t bg-gradient-to-t from-purple-500/10 to-purple-500/50"
                      style={{ height: `${val}%` }}
                    />
                  ))}
                </div>
              )}
              {metric.footer && (
                <div className="mt-4 pt-3 border-t border-gray-800 text-[10px] text-gray-500 flex items-center justify-between">
                  {metric.footer}
                </div>
              )}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-purple-500/10 blur-2xl" />
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
};

export default MetricGrid;