import { useMemo, useEffect, useRef, useState } from 'react';
import { Activity, Cpu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AlgorithmStep } from '../types';

export interface ComplexityInfo {
  best: string;
  average: string;
  worst: string;
  space: string;
  explanation: string;
}

interface ComplexityPanelProps {
  info: ComplexityInfo;
  steps: AlgorithmStep[];
  currentIndex: number;
  n: number;
}

/** Animates a number from its previous value to a new value */
function AnimatedNumber({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(value);
  const [bumping, setBumping] = useState(false);
  const prevRef = useRef(value);

  useEffect(() => {
    if (value === prevRef.current) return;
    prevRef.current = value;
    setBumping(true);
    setDisplayValue(value);
    const t = setTimeout(() => setBumping(false), 300);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <span className={bumping ? 'stat-bump inline-block' : 'inline-block'}>
      {displayValue}
    </span>
  );
}

export function ComplexityPanel({ info, steps, currentIndex, n }: ComplexityPanelProps) {
  const { comparisons, swaps, visited, createdNodes, prunedNodes } = useMemo(() => {
    let comps = 0, swps = 0, vis = 0, created = 0, pruned = 0;
    for (let i = 0; i <= currentIndex; i++) {
      const step = steps[i];
      if (!step) continue;
      if (step.type === 'compare') comps++;
      if (step.type === 'swap') swps++;
      if (step.type === 'visit') vis++;
      if (step.type === 'createNode') created++;
      if (step.type === 'prune') pruned++;
    }
    return { comparisons: comps, swaps: swps, visited: vis, createdNodes: created, prunedNodes: pruned };
  }, [steps, currentIndex]);

  const progress = steps.length > 0 ? (currentIndex / Math.max(1, steps.length - 1)) * 100 : 0;
  const isComplete = currentIndex >= steps.length - 1 && steps.length > 0;

  let analysis = null;
  if (isComplete) {
    if (comparisons > 0) {
      analysis = `For n=${n}, you did ${comparisons} comparisons.`;
      if (info.worst.includes('n²')) {
        analysis += ` Theoretical worst case is ~n² = ${n*n}.`;
      } else if (info.worst.includes('log n')) {
        const log = Math.ceil(Math.log2(n));
        analysis += ` Theoretical worst case is ~n log n = ${Math.ceil(n * log)} (approx).`;
      }
    } else if (visited > 0) {
      analysis = `For |V|=n=${n}, you visited ${visited} nodes.`;
    } else if (createdNodes > 0) {
      analysis = `For n=${n} items, ${createdNodes} nodes were explored out of theoretical max ${Math.pow(2, n + 1) - 1}.`;
      if (prunedNodes > 0) {
        analysis += ` Pruned ${prunedNodes} branches, saving lots of computation.`;
      }
    }
  }

  const complexityRows = [
    { label: 'Best Case', value: info.best, color: 'text-accent-green', bg: 'from-accent-green/10 to-transparent', barColor: 'bg-accent-green' },
    { label: 'Average', value: info.average, color: 'text-accent-amber', bg: 'from-accent-amber/10 to-transparent', barColor: 'bg-accent-amber' },
    { label: 'Worst Case', value: info.worst, color: 'text-accent-red', bg: 'from-accent-red/10 to-transparent', barColor: 'bg-accent-red' },
    { label: 'Space', value: info.space, color: 'text-accent-blue', bg: 'from-accent-blue/10 to-transparent', barColor: 'bg-accent-blue' },
  ];

  return (
    <div className="w-full bg-surface/60 rounded-2xl border border-surfaceHighlight/80 overflow-hidden shadow-xl backdrop-blur-md p-5">
      <div className="flex items-center space-x-3 text-gray-100 font-semibold tracking-wide mb-4 border-b border-surfaceHighlight/30 pb-3">
        <Activity className="w-5 h-5 text-accent-green" />
        <span>Complexity &amp; Live Analysis</span>
      </div>

      {/* Complexity Cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {complexityRows.map(({ label, value, color, bg, barColor }) => (
          <div
            key={label}
            className={`bg-gradient-to-br ${bg} rounded-xl p-3 border border-white/5 relative overflow-hidden`}
          >
            <div className="text-gray-500 text-[10px] mb-1 font-bold uppercase tracking-wider">{label}</div>
            <div className={`font-mono font-bold text-sm ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Overall progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1.5">
          <span>Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full h-1.5 bg-surfaceHighlight rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-accent-blue to-accent-violet rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </div>
      </div>

      <p className="text-gray-400 text-xs italic mb-5 leading-relaxed">
        {info.explanation}
      </p>

      <div className="border-t border-surfaceHighlight/40 pt-4">
        <div className="flex items-center space-x-2 text-gray-200 text-sm font-semibold mb-3">
          <Cpu className="w-4 h-4 text-accent-violet" />
          <span>Live Stats (Current Run)</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatBadge label="Steps" value={currentIndex + 1} />
          {comparisons > 0 && <StatBadge label="Compares" value={comparisons} />}
          {swaps > 0 && <StatBadge label="Swaps" value={swaps} />}
          {visited > 0 && <StatBadge label="Nodes Visited" value={visited} />}
          {createdNodes > 0 && <StatBadge label="Nodes Explored" value={createdNodes} />}
          {prunedNodes > 0 && <StatBadge label="Branches Pruned" value={prunedNodes} />}
        </div>
      </div>

      <AnimatePresence>
        {isComplete && analysis && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="mt-4 p-3 bg-accent-blue/10 border border-accent-blue/20 rounded-xl"
          >
            <p className="text-sm text-blue-200 font-medium">
              <span className="font-bold">Analysis: </span>
              {analysis}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatBadge({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center space-x-2 bg-surfaceHighlight/50 px-2 py-1 rounded-md border border-white/5">
      <span className="text-[11px] text-gray-400 font-medium">{label}:</span>
      <span className="text-xs font-mono font-bold text-white">
        <AnimatedNumber value={value} />
      </span>
    </div>
  );
}
