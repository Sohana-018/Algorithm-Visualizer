import React from 'react';
import { Play, Pause, RotateCcw, SkipBack, SkipForward, FastForward } from 'lucide-react';
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
      <div className="flex items-center space-x-3 w-full group relative">
        <span className="text-xs text-gray-400 font-mono w-10 text-right">{currentIndex}</span>
        <div className="relative flex-1 h-3 bg-gray-800 rounded-full overflow-hidden cursor-pointer shadow-inner">
          <input
            type="range"
            min={0}
            max={Math.max(0, totalSteps - 1)}
            value={currentIndex}
            onChange={(e) => onJumpTo(Number(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          <div 
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-accent-blue to-accent-violet pointer-events-none transition-all duration-150 ease-out"
            style={{ width: `${(progress * 100)}%` }}
          />
        </div>
        <span className="text-xs text-gray-400 font-mono w-10">{Math.max(0, totalSteps - 1)}</span>
      </div>

      {/* Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <button 
            onClick={onReset}
            className="p-2.5 rounded-full hover:bg-surfaceHighlight transition-colors text-gray-400 hover:text-white"
            title="Reset"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
          
          <div className="flex items-center space-x-1 bg-gray-900/50 p-1.5 rounded-full border border-surfaceHighlight/50">
            <button 
              onClick={onStepBackward}
              disabled={currentIndex === 0}
              className="p-2 rounded-full hover:bg-surfaceHighlight transition-colors disabled:opacity-30 text-gray-300 hover:text-white"
              title="Step Backward"
            >
              <SkipBack className="w-5 h-5" />
            </button>
            <button 
              onClick={isPlaying ? onPause : onPlay}
              className={cn(
                "p-3.5 rounded-full transition-all duration-300 shadow-lg transform active:scale-95",
                isPlaying 
                  ? "bg-accent-violet hover:bg-accent-violet/90 shadow-accent-violet/25" 
                  : "bg-accent-blue hover:bg-accent-blue/90 shadow-accent-blue/25"
              )}
            >
              {isPlaying ? <Pause className="w-6 h-6 text-white" /> : <Play className="w-6 h-6 text-white ml-0.5" />}
            </button>
            <button 
              onClick={onStepForward}
              disabled={currentIndex >= totalSteps - 1}
              className="p-2 rounded-full hover:bg-surfaceHighlight transition-colors disabled:opacity-30 text-gray-300 hover:text-white"
              title="Step Forward"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Speed Control */}
        <div className="flex items-center space-x-3 bg-gray-900/50 py-2 px-4 rounded-full border border-surfaceHighlight/50">
          <FastForward className="w-4 h-4 text-gray-400" />
          <input
            type="range"
            min="0.5"
            max="4"
            step="0.5"
            value={speed}
            onChange={(e) => onSpeedChange(Number(e.target.value))}
            className="w-24 accent-accent-blue cursor-pointer"
          />
          <span className="text-xs font-mono text-gray-300 w-8">{speed}x</span>
        </div>
      </div>
    </div>
  );
}
