import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NQueensStep } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Crown } from 'lucide-react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface NQueensViewProps {
  n: number;
  steps: NQueensStep[];
  currentIndex: number;
  activeSolutionIndex?: number;
}

export function NQueensView({ n, steps, currentIndex, activeSolutionIndex }: NQueensViewProps) {
  const { placedQueens, activeCell, status, conflictWith, foundSolutions } = useMemo(() => {
    let placedQueens: {row: number, col: number}[] = [];
    let foundSolutions: {row: number, col: number}[][] = [];
    let activeCell: {row: number, col: number} | null = null;
    let status: 'trying' | 'safe' | 'conflict' | 'backtracking' | 'solved' | 'idle' = 'idle';
    let conflictWith: {row: number, col: number} | null = null;

    for (let i = 0; i <= currentIndex; i++) {
      const step = steps[i];
      if (!step) continue;
      
      if (step.type === 'try-place') {
        activeCell = { row: step.row, col: step.col };
        status = 'trying';
        conflictWith = null;
      } else if (step.type === 'place-safe') {
        activeCell = { row: step.row, col: step.col };
        status = 'safe';
        placedQueens = step.placedQueens;
        conflictWith = null;
      } else if (step.type === 'conflict') {
        activeCell = { row: step.row, col: step.col };
        status = 'conflict';
        conflictWith = step.conflictsWith;
      } else if (step.type === 'backtrack') {
        activeCell = { row: step.row, col: step.col };
        status = 'backtracking';
        conflictWith = null;
        placedQueens = placedQueens.filter(q => !(q.row === step.row && q.col === step.col));
      } else if (step.type === 'solution-found') {
        status = 'solved';
        activeCell = null;
        conflictWith = null;
        foundSolutions.push(step.queens);
        placedQueens = step.queens;
      } else if (step.type === 'complete') {
        status = 'idle';
        activeCell = null;
        conflictWith = null;
        // Keep the active solution visible if it exists
        if (foundSolutions.length > 0) {
          const idx = activeSolutionIndex !== undefined ? Math.min(activeSolutionIndex, foundSolutions.length - 1) : foundSolutions.length - 1;
          placedQueens = foundSolutions[Math.max(0, idx)];
        } else {
          placedQueens = [];
        }
      }
    }

    return { placedQueens, activeCell, status, conflictWith, foundSolutions };
  }, [steps, currentIndex, activeSolutionIndex]);

  const getCellCenter = (row: number, col: number) => {
    return {
      x: `${(col + 0.5) * (100 / n)}%`,
      y: `${(row + 0.5) * (100 / n)}%`
    };
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4">
      
      {/* Top Banner (Solution Found) */}
      <div className="h-14 w-full flex items-center justify-center mb-4">
        <AnimatePresence>
          {status === 'solved' && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="px-6 py-2 rounded-xl bg-accent-green/20 border border-accent-green text-accent-green font-bold shadow-[0_0_20px_rgba(34,197,94,0.3)] backdrop-blur-md"
            >
              Solution {foundSolutions.length} Found!
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Chessboard Container */}
      <div className="relative w-full max-w-[500px] aspect-square rounded-xl border-4 border-surfaceHighlight overflow-hidden shadow-2xl bg-surface/50">
        
        {/* SVG Overlay for Lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-20 overflow-visible">
          <AnimatePresence>
            {status === 'conflict' && activeCell && conflictWith && (
              <motion.line
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                x1={getCellCenter(activeCell.row, activeCell.col).x}
                y1={getCellCenter(activeCell.row, activeCell.col).y}
                x2={getCellCenter(conflictWith.row, conflictWith.col).x}
                y2={getCellCenter(conflictWith.row, conflictWith.col).y}
                stroke="#EF4444"
                strokeWidth="4"
                strokeDasharray="8 8"
                className="drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]"
              />
            )}
            
            {status === 'safe' && activeCell && (
              // Faint threat lines from newly placed queen to all previously placed queens
              placedQueens.filter(q => !(q.row === activeCell.row && q.col === activeCell.col)).map((q, idx) => (
                <motion.line
                  key={`safe-${q.row}-${q.col}`}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.3 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  x1={getCellCenter(activeCell.row, activeCell.col).x}
                  y1={getCellCenter(activeCell.row, activeCell.col).y}
                  x2={getCellCenter(q.row, q.col).x}
                  y2={getCellCenter(q.row, q.col).y}
                  stroke="#10B981"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
              ))
            )}
          </AnimatePresence>
        </svg>

        {/* Grid */}
        <div 
          className="absolute inset-0 grid w-full h-full z-10"
          style={{ 
            gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${n}, minmax(0, 1fr))`
          }}
        >
          {Array.from({ length: n * n }).map((_, idx) => {
            const row = Math.floor(idx / n);
            const col = idx % n;
            const isDark = (row + col) % 2 === 1;
            
            const isPlaced = placedQueens.some(q => q.row === row && q.col === col);
            
            const isActive = activeCell?.row === row && activeCell?.col === col;
            const isConflictSource = conflictWith?.row === row && conflictWith?.col === col;
            
            // Cell Background
            let bgClass = isDark ? "bg-[#1A2235]" : "bg-[#252F48]"; // Base Navy/Charcoal board
            if (isActive) {
              if (status === 'trying') bgClass = "bg-accent-amber/40";
              else if (status === 'conflict') bgClass = "bg-accent-red/40";
              else if (status === 'safe') bgClass = "bg-accent-green/40";
              else if (status === 'backtracking') bgClass = "bg-gray-500/40";
            }
            if (isConflictSource) bgClass = "bg-accent-red/30";
            if (status === 'solved' && isPlaced) bgClass = "bg-accent-green/20"; // Success glow on all queens

            return (
              <div 
                key={`${row}-${col}`}
                className={cn(
                  "w-full h-full relative flex items-center justify-center transition-colors duration-300",
                  bgClass
                )}
              >
                <AnimatePresence mode="popLayout">
                  {isPlaced && (
                    <motion.div
                      initial={{ scale: 2, opacity: 0, y: -20 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 0, opacity: 0, y: -20 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      className={cn(
                        "text-white z-20 drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]",
                        status === 'solved' ? "text-accent-green drop-shadow-[0_0_15px_rgba(34,197,94,0.6)]" : ""
                      )}
                    >
                      <Crown className="w-6 h-6 sm:w-8 sm:h-8" />
                    </motion.div>
                  )}
                  {isActive && status === 'trying' && !isPlaced && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 0.4, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-accent-amber"
                    >
                      <Crown className="w-6 h-6 sm:w-8 sm:h-8" />
                    </motion.div>
                  )}
                  {isActive && status === 'conflict' && !isPlaced && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 0.7, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-accent-red drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]"
                    >
                      <Crown className="w-6 h-6 sm:w-8 sm:h-8" />
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {isActive && status === 'backtracking' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/80 px-2 py-0.5 rounded text-[10px] text-gray-300 font-bold tracking-wider z-50 border border-white/10"
                  >
                    BACKTRACK
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
