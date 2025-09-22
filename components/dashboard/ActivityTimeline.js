import React from 'react';
import { cn } from '../../lib/utils/className';

export const ActivityTimeline = ({
  items = [],
  loading = false,
  limit = 10,
  dense = false,
  showTime = true,
  className,
}) => {
  const displayItems = loading
    ? new Array(limit).fill(null).map((_, i) => ({ id: i, loading: true }))
    : items.slice(0, limit);

  return (
    <div className={cn('relative', className)}>
      <div className="space-y-4">
        {displayItems.map((item, idx) => (
          <div key={item.id || idx} className="relative flex items-start group">
            <div className="flex flex-col items-center mr-4">
              <div className={cn(
                'w-3 h-3 rounded-full border-2 border-gray-700 group-hover:border-purple-400 transition-colors',
                item.type === 'post' && 'bg-purple-500',
                item.type === 'comment' && 'bg-blue-500',
                item.type === 'follow' && 'bg-emerald-500',
                item.type === 'like' && 'bg-pink-500',
                item.type === 'share' && 'bg-orange-500',
                item.type === 'system' && 'bg-gray-400',
                item.loading && 'bg-gray-700 animate-pulse'
              )} />
              {idx !== displayItems.length - 1 && (
                <div className="flex-1 w-px bg-gradient-to-b from-gray-700 via-gray-800 to-transparent" />
              )}
            </div>
            <div className={cn('flex-1 pb-4', dense && 'pb-2')}>
              <div className="rounded-xl border border-gray-800 bg-gradient-to-br from-gray-800/70 to-gray-900/70 backdrop-blur-sm p-3 hover:border-gray-700 transition-colors">
                {item.loading ? (
                  <div className="space-y-2">
                    <div className="w-1/2 h-4 bg-gray-700/50 rounded animate-pulse" />
                    <div className="w-full h-3 bg-gray-700/30 rounded animate-pulse" />
                    <div className="w-2/3 h-3 bg-gray-700/30 rounded animate-pulse" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white/5 text-gray-300 border border-white/10">
                          {item.type || 'activity'}
                        </span>
                        {item.actor && (
                          <span className="text-xs text-gray-400">{item.actor}</span>
                        )}
                      </div>
                      {showTime && item.time && (
                        <span className="text-[10px] text-gray-500 font-medium tracking-wide">
                          {item.time}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-200">
                      {item.content || item.message || 'Activity details'}
                    </div>
                    {item.meta && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {Object.entries(item.meta).map(([key, value]) => (
                          <span
                            key={key}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-400 border border-white/5"
                          >
                            {key}: {value}
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      {(!loading && items.length === 0) && (
        <div className="text-center py-6 text-sm text-gray-500">No recent activity</div>
      )}
    </div>
  );
};

export default ActivityTimeline;