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
  const currentArray = useMemo(() => {
    const arr = [...initialArray];
    for (let i = 0; i <= currentIndex; i++) {
      const step = steps[i];
      if (!step) continue;

      if (step.type === 'swap') {
        const [idx1, idx2] = step.indices;
        const temp = arr[idx1];
        arr[idx1] = arr[idx2];
        arr[idx2] = temp;
      } else if (step.type === 'overwrite') {
        arr[step.index] = step.value;
      }
    }
    return arr;
  }, [initialArray, steps, currentIndex]);

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
    <div className="w-full flex items-end justify-center space-x-1 sm:space-x-2 h-64 p-4 rounded-2xl bg-surface/50 backdrop-blur-sm border border-surfaceHighlight relative">
      <AnimatePresence>
        {currentArray.map((val, idx) => {
          const isActive = activeIndices.includes(idx);
          const heightPercent = (val / maxValue) * 100;
          
          return (
            <motion.div
              layout
              key={`${idx}-${val}`}
              initial={{ opacity: 0, scaleY: 0 }}
              animate={{ 
                opacity: 1, 
                scaleY: 1,
              }}
              exit={{ opacity: 0, scaleY: 0 }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 20
              }}
              style={{
                height: `${Math.max(5, heightPercent)}%`,
                transformOrigin: 'bottom'
              }}
              className={cn(
                "w-full max-w-[2.5rem] rounded-t-md relative flex items-start justify-center pt-2 overflow-hidden shadow-[0_0_15px_rgba(0,0,0,0.2)] transition-colors duration-300",
                isActive && isComparing ? "bg-accent-blue shadow-accent-blue/30 shadow-[0_0_20px]" : 
                isActive && isSwapping ? "bg-accent-violet shadow-accent-violet/30 shadow-[0_0_20px]" : 
                "bg-surfaceHighlight"
              )}
            >
              <span className={cn(
                "text-xs font-mono font-medium truncate px-1",
                isActive ? "text-white" : "text-gray-400"
              )}>
                {val}
              </span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
