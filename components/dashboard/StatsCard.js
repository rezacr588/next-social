import React from 'react';
import { cn } from '../../lib/utils/className';

const gradientMap = {
  purple: 'from-purple-500/20 to-fuchsia-500/20 border-purple-500/30',
  blue: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
  green: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30',
  orange: 'from-amber-500/20 to-orange-500/20 border-amber-500/30',
  pink: 'from-pink-500/20 to-rose-500/20 border-pink-500/30',
};

export const StatsCard = ({
  title,
  value,
  change = 0,
  icon = null,
  variant = 'purple',
  tooltip,
  footer,
  loading = false,
}) => {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border backdrop-blur-sm p-5 group',
        'bg-gradient-to-br',
        gradientMap[variant] || gradientMap.purple,
        'transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5'
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <h4 className="text-xs uppercase tracking-wider text-gray-400 font-medium mb-2 flex items-center space-x-2">
            <span>{title}</span>
            {tooltip && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-gray-300">
                {tooltip}
              </span>
            )}
          </h4>
          <div className="flex items-end space-x-3">
            <div className={cn('text-3xl font-extrabold bg-clip-text text-transparent', {
              'bg-gradient-to-r from-purple-200 to-fuchsia-200': variant === 'purple',
              'bg-gradient-to-r from-blue-200 to-cyan-200': variant === 'blue',
              'bg-gradient-to-r from-emerald-200 to-teal-200': variant === 'green',
              'bg-gradient-to-r from-amber-200 to-orange-200': variant === 'orange',
              'bg-gradient-to-r from-pink-200 to-rose-200': variant === 'pink',
            })}>
              {loading ? (
                <span className="inline-block w-12 h-8 bg-white/10 animate-pulse rounded" />
              ) : (
                value
              )}
            </div>
            <div
              className={cn(
                'text-xs font-semibold px-2 py-1 rounded-full flex items-center space-x-1 backdrop-blur-sm border',
                change > 0
                  ? 'text-emerald-300 border-emerald-400/30 bg-emerald-500/10'
                  : change < 0
                  ? 'text-rose-300 border-rose-400/30 bg-rose-500/10'
                  : 'text-gray-300 border-gray-400/20 bg-white/5'
              )}
            >
              {change > 0 && <span>▲</span>}
              {change < 0 && <span>▼</span>}
              <span>{change > 0 ? '+' : ''}{change}%</span>
            </div>
          </div>
        </div>
        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/5 border border-white/10 text-white/70 group-hover:text-white/90 transition-colors">
          {icon || (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9 0 0120.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 15H13a2 2 0 01-2-2V5.512A9.004 9 0 003.055 13 9 9 0 0012 21a9 9 0 008.488-6z" />
            </svg>
          )}
        </div>
      </div>
      {footer && (
        <div className="mt-4 pt-3 border-t border-white/10 text-xs text-gray-400 flex items-center justify-between">
          {footer}
        </div>
      )}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
      </div>
    </div>
  );
};

export default StatsCard;