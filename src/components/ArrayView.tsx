import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrayStep } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ArrayViewProps {
  initialArray: number[];
  steps: ArrayStep[];
  currentIndex: number;
}

export function ArrayView({ initialArray, steps, currentIndex }: ArrayViewProps) {
  const initialArrayWithIds = useMemo(() => {
    return initialArray.map((val, idx) => ({ id: `id-${idx}-${val}-${Math.random()}`, val }));
  }, [initialArray]);

  const { currentArray, minId, liftedId, sortedIds } = useMemo(() => {
    const arr = [...initialArrayWithIds];
    let mId: string | null = null;
    let lId: string | null = null;
    const sIds = new Set<string>();

    for (let i = 0; i <= currentIndex; i++) {
      const step = steps[i];
      if (!step) continue;

      if (step.type === 'swap') {
        const [idx1, idx2] = step.indices;
        const temp = arr[idx1];
        arr[idx1] = arr[idx2];
        arr[idx2] = temp;
      } else if (step.type === 'overwrite') {
        arr[step.index] = { id: `id-overwrite-${i}-${step.value}`, val: step.value };
      } else if (step.type === 'mark-min') {
        mId = arr[step.index].id;
      } else if (step.type === 'mark-sorted') {
        sIds.add(arr[step.index].id);
        mId = null; // Reset min marker when a sorted element is placed
      } else if (step.type === 'lift') {
        lId = arr[step.index].id;
      } else if (step.type === 'shift') {
        // Shift is visually a swap between the element and the "hole" (lifted element)
        const idx1 = step.index;
        const idx2 = step.index + 1;
        const temp = arr[idx1];
        arr[idx1] = arr[idx2];
        arr[idx2] = temp;
      } else if (step.type === 'insert') {
        lId = null; // Drop the lifted element back into place
      }
    }
    return { currentArray: arr, minId: mId, liftedId: lId, sortedIds: sIds };
  }, [initialArrayWithIds, steps, currentIndex]);

  const currentStep = steps[currentIndex];
  let activeIndices: number[] = [];
  let isComparing = false;
  let isSwapping = false;

  if (currentStep) {
    if (currentStep.type === 'compare') {
      activeIndices = currentStep.indices;
      isComparing = true;
    } else if (currentStep.type === 'swap') {
      activeIndices = currentStep.indices;
      isSwapping = true;
    } else if (currentStep.type === 'overwrite') {
      activeIndices = [currentStep.index];
      isSwapping = true;
    } else if (currentStep.type === 'found') {
      activeIndices = [currentStep.index];
    }
  }

  const currentValues = currentArray.map(item => item.val);
  const minValue = Math.min(...currentValues);
  const maxValue = Math.max(...currentValues);
  // Reserve ~20px (≈7%) at the top for labels above the shortest bar.
  // The remaining 80% is split between bars using min-max normalisation.
  const LABEL_RESERVE = 7;   // % kept free at the top for labels
  const MAX_BAR_HEIGHT = 87; // % the tallest bar can grow to
  const MIN_VISIBLE_HEIGHT = 6; // % floor so the shortest bar is always visible

  return (
    <div className="w-full flex items-end justify-center space-x-1 sm:space-x-2 h-72 px-6 pb-6 pt-8 rounded-2xl bg-gradient-to-b from-surface/30 to-surface/80 backdrop-blur-md border border-surfaceHighlight relative overflow-visible shadow-2xl">
      {/* Background Gridlines */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between px-6 py-6 opacity-10">
         {[...Array(5)].map((_, i) => <div key={i} className="w-full h-px bg-white" />)}
      </div>

      <AnimatePresence>
        {currentArray.map((item, idx) => {
          const isActive = activeIndices.includes(idx);
          const heightPercent =
            ((item.val - minValue) / (maxValue - minValue || 1)) * MAX_BAR_HEIGHT +
            MIN_VISIBLE_HEIGHT;
          
          return (
            /* Column wrapper: full height, label above, bar below */
            <motion.div
              layout
              key={item.id}
              className={cn(
                "w-full max-w-[3rem] relative flex flex-col justify-end h-full",
                item.id === liftedId ? "z-20" : "z-10"
              )}
              initial={{ opacity: 0, y: 0 }}
              animate={{ 
                opacity: 1,
                y: item.id === liftedId ? -40 : 0
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {/* Label — always above the bar, never inside it */}
              <div 
                className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-30" 
                style={{ bottom: `calc(${heightPercent}% + 4px)` }}
              >
                {item.id === minId && (
                  <span className="text-[9px] font-bold uppercase tracking-wider text-accent-amber mb-0.5 bg-[#0B0F19]/90 border border-accent-amber/40 px-1.5 py-0.5 rounded backdrop-blur-sm whitespace-nowrap shadow-[0_0_8px_rgba(245,158,11,0.3)]">min</span>
                )}
                {item.id === liftedId && (
                  <span className="text-[9px] font-bold uppercase tracking-wider text-accent-amber mb-0.5 bg-[#0B0F19]/90 border border-accent-amber/40 px-1.5 py-0.5 rounded backdrop-blur-sm whitespace-nowrap shadow-[0_0_8px_rgba(245,158,11,0.3)]">temp</span>
                )}
                <span
                  className={cn(
                    "text-xs font-mono font-bold drop-shadow-md leading-none",
                    isActive || item.id === liftedId || item.id === minId ? "text-white" : "text-gray-400"
                  )}
                >
                  {item.val}
                </span>
              </div>

              {/* Bar */}
              <motion.div
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                exit={{ scaleY: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 25
                }}
                style={{
                  height: `${heightPercent}%`,
                  transformOrigin: 'bottom'
                }}
                className={cn(
                  "w-full rounded-t-lg transition-all duration-200",
                  item.id === liftedId
                    ? "bg-gradient-to-t from-accent-amber/40 to-accent-amber shadow-[0_0_30px_rgba(245,158,11,0.7)] border-t border-l border-r border-accent-amber/60"
                    : item.id === minId
                    ? "bg-gradient-to-t from-accent-amber/20 to-accent-amber/60 shadow-[0_0_20px_rgba(245,158,11,0.4)] border-2 border-accent-amber"
                    : isActive && isComparing
                    ? "bg-gradient-to-t from-accent-blue/30 to-accent-blue shadow-[0_0_20px_rgba(59,130,246,0.6)] border-t border-l border-r border-accent-blue/50"
                    : isActive && isSwapping
                    ? "bg-gradient-to-t from-accent-violet/30 to-accent-violet shadow-[0_0_20px_rgba(139,92,246,0.6)] border-t border-l border-r border-accent-violet/50"
                    : sortedIds.has(item.id)
                    ? "bg-gradient-to-t from-accent-green/10 to-accent-green/30 border-t border-l border-r border-accent-green/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                    : "bg-gradient-to-t from-surfaceHighlight/50 to-surfaceHighlight/80 border-t border-l border-r border-white/5 shadow-lg"
                )}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
