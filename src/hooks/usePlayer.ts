import { useState, useEffect, useRef, useCallback } from 'react';
import { AlgorithmStep } from '../types';

export function usePlayer(steps: AlgorithmStep[], defaultSpeed: number = 1) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(defaultSpeed);
  const timerRef = useRef<number | null>(null);

  // Speed 1x = 500ms, 2x = 250ms, 0.5x = 1000ms
  const baseInterval = 500;
  const currentInterval = baseInterval / speed;

  const play = useCallback(() => {
    setCurrentIndex((prev) => {
      if (prev >= steps.length - 1 && steps.length > 0) {
        return 0; // Auto-restart if already at the end
      }
      return prev;
    });
    setIsPlaying(true);
  }, [steps.length]);
  const pause = useCallback(() => setIsPlaying(false), []);
  
  const reset = useCallback(() => {
    setIsPlaying(false);
    setCurrentIndex(0);
  }, []);

  const stepForward = useCallback(() => {
    setCurrentIndex((prev) => Math.min(prev + 1, Math.max(0, steps.length - 1)));
  }, [steps.length]);

  const stepBackward = useCallback(() => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const jumpTo = useCallback((index: number) => {
    setCurrentIndex(Math.max(0, Math.min(index, steps.length - 1)));
  }, [steps.length]);

  useEffect(() => {
    if (isPlaying) {
      if (currentIndex >= steps.length - 1) {
        setIsPlaying(false);
        return;
      }

      timerRef.current = window.setTimeout(() => {
        stepForward();
      }, currentInterval);
    }

    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [isPlaying, currentIndex, currentInterval, steps.length, stepForward]);

  // Reset if steps change completely
  useEffect(() => {
    setCurrentIndex(0);
    setIsPlaying(false);
  }, [steps]);

  return {
    currentStep: steps[currentIndex] || null,
    currentIndex,
    totalSteps: steps.length,
    progress: steps.length > 1 ? currentIndex / (steps.length - 1) : 0,
    isPlaying,
    speed,
    play,
    pause,
    reset,
    setSpeed,
    stepForward,
    stepBackward,
    jumpTo
  };
}
