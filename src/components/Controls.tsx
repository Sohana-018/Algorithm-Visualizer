import React from 'react';
import { Play, Pause, RotateCcw, SkipBack, SkipForward, FastForward } from 'lucide-react';
import { motion } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ControlsProps {
  isPlaying: boolean;
  progress: number;
  speed: number;
  totalSteps: number;
  currentIndex: number;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
  onStepForward: () => void;
  onStepBackward: () => void;
  onJumpTo: (index: number) => void;
}

export function Controls({
  isPlaying,
  progress,
  speed,
  totalSteps,
  currentIndex,
  onPlay,
  onPause,
  onReset,
  onSpeedChange,
  onStepForward,
  onStepBackward,
  onJumpTo
}: ControlsProps) {
  return (
    <div className="w-full bg-surface/80 backdrop-blur-md border border-surfaceHighlight p-4 rounded-2xl flex flex-col space-y-4 shadow-xl">
      {/* Timeline */}
      <div className="flex items-center space-x-3 w-full">
        <span className="text-xs text-gray-500 font-mono w-10 text-right tabular-nums">{currentIndex}</span>
        <div className="relative flex-1 flex items-center">
          {/* Filled progress track */}
          <div 
            className="absolute left-0 h-1 bg-gradient-to-r from-accent-blue to-accent-violet rounded-full pointer-events-none transition-all duration-150 ease-out z-0"
            style={{ width: `${(progress * 100)}%` }}
          />
          <input
            type="range"
            min={0}
            max={Math.max(0, totalSteps - 1)}
            value={currentIndex}
            onChange={(e) => onJumpTo(Number(e.target.value))}
            className="custom-slider relative z-10"
          />
        </div>
        <span className="text-xs text-gray-500 font-mono w-10 tabular-nums">{Math.max(0, totalSteps - 1)}</span>
      </div>

      {/* Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3">

          {/* Reset — subtle icon button */}
          <motion.button 
            onClick={onReset}
            whileTap={{ scale: 0.85, rotate: -30 }}
            whileHover={{ scale: 1.1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 22 }}
            className="p-2.5 rounded-xl bg-surfaceHighlight/30 hover:bg-surfaceHighlight border border-white/5 hover:border-white/20 text-gray-400 hover:text-white transition-colors"
            title="Reset"
          >
            <RotateCcw className="w-4.5 h-4.5" />
          </motion.button>

          {/* Step Back / Play-Pause / Step Forward group */}
          <div className="flex items-center gap-1.5 bg-black/30 p-1.5 rounded-2xl border border-surfaceHighlight/60">
            <motion.button 
              onClick={onStepBackward}
              disabled={currentIndex === 0}
              whileTap={{ scale: 0.88 }}
              whileHover={{ scale: 1.1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 22 }}
              className="p-2 rounded-xl hover:bg-surfaceHighlight disabled:opacity-25 disabled:cursor-not-allowed text-gray-300 hover:text-white transition-colors"
              title="Step Backward"
            >
              <SkipBack className="w-5 h-5" />
            </motion.button>

            {/* Primary Play/Pause */}
            <motion.button 
              onClick={isPlaying ? onPause : onPlay}
              whileTap={{ scale: 0.88 }}
              whileHover={{ scale: 1.08 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
              className={cn(
                "btn-shimmer relative px-6 py-3 rounded-xl font-bold text-sm text-white transition-all duration-300 flex items-center gap-2 shadow-lg",
                isPlaying 
                  ? "bg-gradient-to-r from-accent-violet to-purple-600 shadow-[0_0_24px_rgba(139,92,246,0.5)]" 
                  : "bg-gradient-to-r from-accent-blue to-blue-500 shadow-[0_0_24px_rgba(59,130,246,0.5)]"
              )}
            >
              {isPlaying
                ? <><Pause className="w-4 h-4" /><span>Pause</span></>
                : <><Play className="w-4 h-4 ml-0.5" /><span>Play</span></>
              }
            </motion.button>

            <motion.button 
              onClick={onStepForward}
              disabled={currentIndex >= totalSteps - 1}
              whileTap={{ scale: 0.88 }}
              whileHover={{ scale: 1.1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 22 }}
              className="p-2 rounded-xl hover:bg-surfaceHighlight disabled:opacity-25 disabled:cursor-not-allowed text-gray-300 hover:text-white transition-colors"
              title="Step Forward"
            >
              <SkipForward className="w-5 h-5" />
            </motion.button>
          </div>
        </div>

        {/* Speed Control */}
        <div className="flex items-center space-x-3 bg-black/30 py-2 px-4 rounded-2xl border border-surfaceHighlight/60">
          <FastForward className="w-3.5 h-3.5 text-gray-500" />
          <input
            type="range"
            min="0.5"
            max="4"
            step="0.5"
            value={speed}
            onChange={(e) => onSpeedChange(Number(e.target.value))}
            className="custom-slider w-24"
          />
          <span className="text-xs font-mono font-bold text-gray-300 w-8 tabular-nums">{speed}x</span>
        </div>
      </div>
    </div>
  );
}
