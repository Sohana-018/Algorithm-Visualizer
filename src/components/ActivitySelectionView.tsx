import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ActivityData, ActivitySelectionStep } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ActivitySelectionViewProps {
  activities: ActivityData[];
  steps: ActivitySelectionStep[];
  currentIndex: number;
}

export function ActivitySelectionView({ activities, steps, currentIndex }: ActivitySelectionViewProps) {
  const state = useMemo(() => {
    let isSorted = false;
    const statuses = new Map<string, 'waiting' | 'considering' | 'selected' | 'rejected'>();
    let lastEndTime: number | null = null;
    let currentConflict: { rejectedId: string; conflictId: string } | null = null;
    let finalCount: number | null = null;
    let finalSelectedIds: string[] | null = null;

    activities.forEach(a => statuses.set(a.id, 'waiting'));

    for (let i = 0; i <= currentIndex; i++) {
      const step = steps[i];
      if (!step) continue;

      if (step.type === 'sort-by-end-time') {
        isSorted = true;
      } else if (step.type === 'consider') {
        // Clear previous 'considering' or 'conflict'
        for (const [id, status] of statuses.entries()) {
          if (status === 'considering') statuses.set(id, 'waiting'); // Shouldn't happen if we select/reject
        }
        currentConflict = null;
        statuses.set(step.activityId, 'considering');
      } else if (step.type === 'select') {
        statuses.set(step.activityId, 'selected');
        lastEndTime = step.lastEndTime;
        currentConflict = null;
      } else if (step.type === 'reject') {
        statuses.set(step.activityId, 'rejected');
        currentConflict = { rejectedId: step.activityId, conflictId: step.conflictsWith };
      } else if (step.type === 'complete') {
        currentConflict = null;
        finalCount = step.count;
        finalSelectedIds = step.selectedIds;
      }
    }

    const displayActivities = isSorted 
      ? [...activities].sort((a, b) => a.end - b.end)
      : [...activities];

    // Compute lanes for Gantt chart row-packing
    const activityLanes = new Map<string, number>();
    const lanes: number[] = [];
    
    displayActivities.forEach(activity => {
      let placed = false;
      for (let i = 0; i < lanes.length; i++) {
        if (activity.start >= lanes[i]) {
          activityLanes.set(activity.id, i);
          lanes[i] = activity.end;
          placed = true;
          break;
        }
      }
      if (!placed) {
        activityLanes.set(activity.id, lanes.length);
        lanes.push(activity.end);
      }
    });

    return { displayActivities, statuses, lastEndTime, currentConflict, finalCount, finalSelectedIds, activityLanes, numLanes: Math.max(1, lanes.length) };
  }, [activities, steps, currentIndex]);

  const { displayActivities, statuses, lastEndTime, currentConflict, finalCount, finalSelectedIds, activityLanes, numLanes } = state;

  const minStart = Math.min(...activities.map(a => a.start), 0);
  const maxEnd = Math.max(...activities.map(a => a.end), 10);
  const timeSpan = maxEnd - minStart;
  
  // Calculate percentage positions
  const getLeft = (time: number) => `${((time - minStart) / timeSpan) * 100}%`;
  const getWidth = (start: number, end: number) => `${((end - start) / timeSpan) * 100}%`;

  // Create timeline ticks
  const ticks = [];
  for (let t = minStart; t <= maxEnd; t++) {
    ticks.push(t);
  }

  return (
    <div className="w-full h-full p-8 flex flex-col items-center">
      
      <div className="w-full max-w-4xl bg-surface/50 p-6 rounded-2xl border border-surfaceHighlight mb-6 shadow-lg relative">
        <h3 className="text-sm font-bold text-gray-400 mb-6 uppercase tracking-wider text-center">Activity Timeline</h3>
        
        {/* Timeline Axis */}
        <div className="relative h-8 border-b border-surfaceHighlight/50 mb-8 w-full">
          {ticks.map(t => (
            <div key={t} className="absolute h-full flex flex-col items-center justify-end" style={{ left: getLeft(t), transform: 'translateX(-50%)' }}>
              <span className="text-xs font-mono text-gray-500 mb-1">{t}</span>
              <div className="w-px h-2 bg-surfaceHighlight"></div>
            </div>
          ))}
        </div>

        {/* Last Selected End Time Indicator */}
        {lastEndTime !== null && (
          <div 
            className="absolute top-[80px] bottom-0 w-px bg-accent-green/50 z-0 transition-all duration-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
            style={{ left: getLeft(lastEndTime) }}
          >
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-accent-green/20 text-accent-green text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap border border-accent-green/30">
              Last End: {lastEndTime}
            </div>
          </div>
        )}

        {/* Activities */}
        <div 
          className="relative w-full overflow-y-auto custom-scrollbar pr-2 mt-4 transition-all duration-500" 
          style={{ height: `${numLanes * 40}px`, maxHeight: '360px' }}
        >
          <AnimatePresence mode="popLayout">
            {displayActivities.map((activity) => {
              const status = statuses.get(activity.id);
              const laneIndex = activityLanes.get(activity.id) || 0;
              
              const isConsidering = status === 'considering';
              const isSelected = status === 'selected';
              const isRejected = status === 'rejected';
              
              const isConflictSource = currentConflict?.conflictId === activity.id;
              const isConflictTarget = currentConflict?.rejectedId === activity.id;

              return (
                <motion.div
                  key={activity.id}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ 
                    opacity: 1, 
                    scale: 1, 
                    y: laneIndex * 40
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  className="absolute h-8"
                  style={{ 
                    left: getLeft(activity.start), 
                    width: getWidth(activity.start, activity.end) 
                  }}
                >
                  <div 
                    className={cn(
                      "absolute inset-0 rounded-lg flex items-center justify-center border transition-all duration-300 overflow-hidden",
                      isSelected ? "bg-accent-green/20 border-accent-green shadow-[0_0_15px_rgba(16,185,129,0.3)] z-20" :
                      isRejected ? "bg-accent-red/20 border-accent-red/50 text-gray-500 opacity-60" :
                      isConsidering ? "bg-accent-blue/30 border-accent-blue shadow-[0_0_15px_rgba(59,130,246,0.5)] z-20 scale-105" :
                      isConflictSource ? "bg-accent-green/30 border-accent-red shadow-[0_0_15px_rgba(239,68,68,0.5)] z-20" :
                      "bg-surfaceHighlight/50 border-white/10 text-gray-300"
                    )}
                  >
                    <span className={cn(
                      "font-mono text-xs font-bold whitespace-nowrap px-2",
                      isSelected ? "text-accent-green" : 
                      isConsidering ? "text-accent-blue" :
                      isConflictSource ? "text-accent-red" : ""
                    )}>
                      {activity.label}
                    </span>
                    
                    {isConflictTarget && (
                      <div className="absolute inset-0 bg-accent-red/10 animate-pulse"></div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {finalCount !== null && finalSelectedIds !== null && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-accent-green/10 border border-accent-green/30 px-6 py-3 rounded-2xl text-accent-green font-bold shadow-[0_0_20px_rgba(16,185,129,0.2)] flex flex-col items-center gap-1"
        >
          <span>Selected {finalCount} of {activities.length} activities</span>
          {finalSelectedIds.length > 0 && (
            <span className="text-sm font-normal text-accent-green/80">
              ({finalSelectedIds.map(id => activities.find(a => a.id === id)?.label).join(', ')})
            </span>
          )}
        </motion.div>
      )}
    </div>
  );
}
