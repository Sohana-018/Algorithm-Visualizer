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

  const currentArray = useMemo(() => {
    const arr = [...initialArrayWithIds];
    for (let i = 0; i <= currentIndex; i++) {
      const step = steps[i];
      if (!step) continue;

      if (step.type === 'swap') {
        const [idx1, idx2] = step.indices;
        const temp = arr[idx1];
        arr[idx1] = arr[idx2];
        arr[idx2] = temp;
      } else if (step.type === 'overwrite') {
        // Find a matching object or create a new one to represent the overwritten value
        arr[step.index] = { id: `id-overwrite-${i}-${step.value}`, val: step.value };
      }
    }
    return arr;
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

  const maxValue = Math.max(...initialArray);

  return (
    <div className="w-full flex items-end justify-center space-x-1 sm:space-x-2 h-72 p-6 rounded-2xl bg-gradient-to-b from-surface/30 to-surface/80 backdrop-blur-md border border-surfaceHighlight relative overflow-hidden shadow-2xl">
      {/* Background Gridlines */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between px-6 py-6 opacity-10">
         {[...Array(5)].map((_, i) => <div key={i} className="w-full h-px bg-white" />)}
      </div>

      <AnimatePresence>
        {currentArray.map((item, idx) => {
          const isActive = activeIndices.includes(idx);
          const heightPercent = (item.val / maxValue) * 100;
          
          return (
            <motion.div
              layout
              key={item.id}
              initial={{ opacity: 0, scaleY: 0 }}
              animate={{ 
                opacity: 1, 
                scaleY: 1,
              }}
              exit={{ opacity: 0, scaleY: 0 }}
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 25
              }}
              style={{
                height: `${Math.max(8, heightPercent)}%`,
                transformOrigin: 'bottom'
              }}
              className={cn(
                "w-full max-w-[3rem] rounded-t-lg relative flex items-start justify-center pt-2.5 overflow-hidden transition-all duration-200 z-10",
                isActive && isComparing ? "bg-gradient-to-t from-accent-blue/30 to-accent-blue shadow-[0_0_20px_rgba(59,130,246,0.6)] border-t border-l border-r border-accent-blue/50" : 
                isActive && isSwapping ? "bg-gradient-to-t from-accent-violet/30 to-accent-violet shadow-[0_0_20px_rgba(139,92,246,0.6)] border-t border-l border-r border-accent-violet/50" : 
                "bg-gradient-to-t from-surfaceHighlight/50 to-surfaceHighlight/80 border-t border-l border-r border-white/5 shadow-lg"
              )}
            >
              <span className={cn(
                "text-xs font-mono font-bold truncate px-1 drop-shadow-md",
                isActive ? "text-white" : "text-gray-400"
              )}>
                {item.val}
              </span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
