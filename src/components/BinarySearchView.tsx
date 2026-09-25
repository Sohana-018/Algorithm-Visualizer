import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BinarySearchStep } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ChevronDown, ArrowDown } from 'lucide-react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface BinarySearchViewProps {
  initialArray: number[];
  steps: BinarySearchStep[];
  currentIndex: number;
  mode: 'iterative' | 'recursive';
}

function IterativeView({ initialArray, steps, currentIndex }: Omit<BinarySearchViewProps, 'mode'>) {
  const { low, high, mid, activeRange, foundIndex, calculationText } = useMemo(() => {
    let low = 0;
    let high = initialArray.length - 1;
    let mid = -1;
    let target = -1;
    let calculationText = '';
    let activeRange: [number, number] = [0, initialArray.length - 1];
    let foundIndex = -1;

    for (let i = 0; i <= currentIndex; i++) {
      const step = steps[i];
      if (!step) continue;
      if (step.type === 'calc-mid') {
        low = step.low;
        high = step.high;
        mid = step.mid;
        target = step.target;
        calculationText = step.description;
        activeRange = [low, high];
      } else if (step.type === 'compare') {
        if (step.result === 'found') {
          foundIndex = mid;
        }
        calculationText = step.description;
      } else if (step.type === 'eliminate') {
        // activeRange is effectively updated on the NEXT calc-mid, but visually we can dim it now if we want.
        // Actually, let's keep activeRange tied to calc-mid to keep it simple, but we can update it early.
        if (step.range[0] === low) {
          activeRange = [step.range[1] + 1, high];
        } else {
          activeRange = [low, step.range[0] - 1];
        }
      }
    }
    return { low, high, mid, activeRange, foundIndex, calculationText };
  }, [steps, currentIndex, initialArray]);

  const maxVal = Math.max(...initialArray, 1);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center space-y-12">
      {/* Calculation display */}
      <div className="h-12 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {calculationText && (
            <motion.div
              key={calculationText}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="px-6 py-3 rounded-xl bg-surfaceHighlight/50 border border-white/10 text-lg font-mono text-white shadow-xl backdrop-blur-sm"
            >
              {calculationText}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Array bars */}
      <div className="relative flex items-end justify-center space-x-2 h-64 w-full px-8">
        {initialArray.map((value, idx) => {
          const isEliminated = idx < activeRange[0] || idx > activeRange[1];
          const isMid = idx === mid;
          const isFound = idx === foundIndex;
          const isLow = idx === low && !isEliminated;
          const isHigh = idx === high && !isEliminated;
          
          const heightPct = (value / maxVal) * 100;

          return (
            <div key={idx} className="relative flex flex-col items-center group">
              {/* Pointers */}
              <div className="absolute -top-12 flex flex-col items-center justify-end h-10 w-full space-y-1">
                {(isLow || isMid || isHigh) && !isEliminated && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center"
                  >
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-wider",
                      isMid ? "text-accent-blue" : isLow ? "text-accent-violet" : "text-accent-amber"
                    )}>
                      {isMid ? 'mid' : isLow && isHigh ? 'L/H' : isLow ? 'low' : 'high'}
                    </span>
                    <ArrowDown className={cn(
                      "w-3 h-3",
                      isMid ? "text-accent-blue" : isLow ? "text-accent-violet" : "text-accent-amber"
                    )} />
                  </motion.div>
                )}
              </div>

              {/* Bar */}
              <motion.div
                layout
                className={cn(
                  "w-12 rounded-t-lg transition-all duration-300 relative flex flex-col justify-end overflow-hidden border-t border-l border-r",
                  isFound ? "bg-gradient-to-t from-accent-green/40 to-accent-green shadow-[0_0_20px_rgba(34,197,94,0.6)] border-accent-green/50" :
                  isMid ? "bg-gradient-to-t from-accent-blue/40 to-accent-blue shadow-[0_0_20px_rgba(59,130,246,0.6)] border-accent-blue/50" :
                  isEliminated ? "bg-surfaceHighlight/20 border-white/5 opacity-30 grayscale" :
                  "bg-gradient-to-t from-surfaceHighlight/50 to-surfaceHighlight/80 border-white/10 shadow-lg"
                )}
                style={{ height: `${Math.max(heightPct, 10)}%` }}
              >
                <div className="w-full text-center pb-2 text-xs font-bold text-white/90">
                  {value}
                </div>
              </motion.div>
              
              {/* Index */}
              <div className="mt-2 text-[10px] text-gray-500 font-mono">
                {idx}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface CallFrame {
  callId: string;
  depth: number;
  low: number;
  high: number;
  target: number;
  mid?: number;
  compareResult?: 'found' | 'left' | 'right';
  isReturning?: boolean;
  returnValue?: number;
}

function RecursiveView({ initialArray, steps, currentIndex }: Omit<BinarySearchViewProps, 'mode'>) {
  const { stack, finalResult, isComplete } = useMemo(() => {
    const stack: CallFrame[] = [];
    let finalResult: number | undefined = undefined;
    let isComplete = false;
    
    for (let i = 0; i <= currentIndex; i++) {
      const step = steps[i];
      if (!step) continue;
      
      if (step.type === 'push-call') {
        stack.push({
          callId: step.callId,
          depth: step.depth,
          low: step.args.low,
          high: step.args.high,
          target: step.target
        });
      } else if (step.type === 'pop-call') {
        if (i === currentIndex) {
          // If this is the active step, keep it on stack but mark it as returning
          const frame = stack[stack.length - 1];
          if (frame) {
            frame.isReturning = true;
            frame.returnValue = step.returnValue;
          }
        } else {
          // Past pop-call steps are physically removed
          if (stack.length === 1) {
            finalResult = step.returnValue;
          }
          stack.pop();
        }
      } else if (step.type === 'calc-mid') {
        const frame = stack.find(f => f.callId === step.callId);
        if (frame) frame.mid = step.mid;
      } else if (step.type === 'compare') {
        const frame = stack.find(f => f.callId === step.callId);
        if (frame) frame.compareResult = step.result;
      } else if (step.type === 'complete') {
        if (i === currentIndex) {
          isComplete = true;
        }
      }
    }
    return { stack, finalResult, isComplete };
  }, [steps, currentIndex]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-end pb-8">
      {/* Final Banner */}
      <AnimatePresence>
        {isComplete && stack.length === 0 && finalResult !== undefined && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className={cn(
              "absolute top-1/3 px-8 py-4 rounded-2xl border text-xl font-bold shadow-2xl backdrop-blur-md",
              finalResult !== -1 
                ? "bg-accent-green/20 border-accent-green text-accent-green shadow-[0_0_30px_rgba(34,197,94,0.4)]" 
                : "bg-accent-red/20 border-accent-red text-accent-red shadow-[0_0_30px_rgba(239,68,68,0.4)]"
            )}
          >
            {finalResult !== -1 
              ? `Search complete — found at index ${finalResult}!` 
              : `Search complete — not found.`}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col-reverse items-center justify-start w-full max-w-2xl gap-4">
        <AnimatePresence mode="popLayout">
          {stack.map((frame, idx) => {
            const isTop = idx === stack.length - 1;
            const slice = initialArray.slice(frame.low, frame.high + 1);
            
            const isBaseCaseFound = frame.compareResult === 'found';
            const isBaseCaseNotFound = frame.low > frame.high;
            
            return (
              <motion.div
                key={frame.callId}
                initial={{ opacity: 0, y: -80, scale: 0.9 }}
                animate={{ 
                  opacity: isTop ? 1 : 0.4, 
                  y: 0, 
                  scale: isTop ? 1 : 0.92,
                  filter: isTop ? 'blur(0px)' : 'blur(2px)'
                }}
                exit={{ opacity: 0, y: -80, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                className={cn(
                  "w-full rounded-2xl border p-5 shadow-xl backdrop-blur-md relative",
                  frame.isReturning && isBaseCaseFound ? "bg-accent-green/10 border-accent-green shadow-[0_0_25px_rgba(34,197,94,0.4)] z-50" :
                  frame.isReturning && isBaseCaseNotFound ? "bg-accent-red/10 border-accent-red shadow-[0_0_25px_rgba(239,68,68,0.4)] z-50" :
                  frame.isReturning ? "bg-accent-blue/10 border-accent-blue shadow-[0_0_25px_rgba(59,130,246,0.4)] z-50" :
                  isTop ? "bg-surface/80 border-accent-blue/40 z-40" : "bg-surface/30 border-surfaceHighlight/50 z-30"
                )}
                style={{ zIndex: stack.length - idx }}
              >
                {/* Arrow pointing down when returning */}
                {frame.isReturning && stack.length > 1 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 25 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4, repeat: Infinity, repeatType: "reverse" }}
                    className="absolute -bottom-8 left-1/2 -translate-x-1/2 z-50 text-accent-blue pointer-events-none"
                  >
                    <ArrowDown className="w-8 h-8 drop-shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                  </motion.div>
                )}

                {/* Header */}
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center space-x-2 text-sm font-mono text-gray-200">
                    <span className="text-accent-violet font-bold">binarySearch</span>
                    <span className="opacity-70">(arr, target={frame.target}, low={frame.low}, high={frame.high})</span>
                  </div>
                  <div className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-gray-300">
                    DEPTH {frame.depth}
                  </div>
                </div>

                {/* Body */}
                <div className="flex flex-col gap-4">
                  {/* Status / Calculation */}
                  <div className="h-8 flex items-center text-sm font-mono">
                    {frame.isReturning ? (
                      <span className={cn(
                        "font-bold text-lg flex items-center space-x-2",
                        frame.returnValue !== -1 ? "text-accent-green" : "text-accent-red"
                      )}>
                        <span>&rarr;</span>
                        <span>returns {frame.returnValue !== -1 ? `index ${frame.returnValue}` : "not found (-1)"}</span>
                      </span>
                    ) : frame.compareResult === 'found' ? (
                      <span className="text-accent-green font-bold">Found target at index {frame.mid}!</span>
                    ) : frame.compareResult === 'left' ? (
                      <span className="text-accent-amber">arr[{frame.mid}] &gt; {frame.target} &rarr; Return search left</span>
                    ) : frame.compareResult === 'right' ? (
                      <span className="text-accent-amber">arr[{frame.mid}] &lt; {frame.target} &rarr; Return search right</span>
                    ) : frame.mid !== undefined ? (
                      <span className="text-gray-300">mid = ({frame.low} + {frame.high}) / 2 = <span className="text-accent-blue font-bold">{frame.mid}</span></span>
                    ) : frame.low > frame.high ? (
                      <span className="text-accent-red font-bold">low &gt; high &rarr; Base case hit (not found)</span>
                    ) : (
                      <span className="text-gray-500 animate-pulse">Calculating...</span>
                    )}
                  </div>

                  {/* Mini Array View */}
                  <div className="flex items-center space-x-1.5 p-3 rounded-xl bg-black/50 border border-white/5 overflow-x-auto">
                    {frame.low <= frame.high ? (
                      slice.map((val, i) => {
                        const actualIdx = frame.low + i;
                        const isMid = actualIdx === frame.mid;
                        const isFound = isMid && frame.compareResult === 'found';
                        
                        return (
                          <div 
                            key={actualIdx} 
                            className={cn(
                              "w-10 h-10 shrink-0 rounded-lg flex items-center justify-center text-sm font-bold border-2 transition-colors",
                              isFound ? "bg-accent-green/20 border-accent-green text-accent-green shadow-[0_0_12px_rgba(34,197,94,0.5)]" :
                              isMid ? "bg-accent-blue/20 border-accent-blue text-accent-blue shadow-[0_0_12px_rgba(59,130,246,0.5)]" :
                              "bg-surfaceHighlight/50 border-gray-600/30 text-gray-300"
                            )}
                          >
                            {val}
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-sm text-gray-500 font-mono py-1 px-2">Empty subarray [ ]</div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        
        {stack.length === 0 && !isComplete && (
          <div className="text-sm text-gray-500 font-mono h-32 flex items-center opacity-50">
            Awaiting recursion...
          </div>
        )}
      </div>
    </div>
  );
}

export function BinarySearchView(props: BinarySearchViewProps) {
  if (props.mode === 'iterative') {
    return <IterativeView {...props} />;
  }
  return <RecursiveView {...props} />;
}
