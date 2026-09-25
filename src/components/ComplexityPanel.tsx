import { useMemo } from 'react';
import { Activity, Clock, Cpu } from 'lucide-react';
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

export function ComplexityPanel({ info, steps, currentIndex, n }: ComplexityPanelProps) {
  // Compute live stats
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

  const isComplete = currentIndex >= steps.length - 1 && steps.length > 0;

  // Post-run analysis string
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

  return (
    <div className="w-full bg-surface/60 rounded-2xl border border-surfaceHighlight/80 overflow-hidden shadow-xl backdrop-blur-md p-5">
      <div className="flex items-center space-x-3 text-gray-100 font-semibold tracking-wide mb-4 border-b border-surfaceHighlight/30 pb-3">
        <Activity className="w-5 h-5 text-accent-green" />
        <span>Complexity & Live Analysis</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
        <div className="bg-black/30 rounded-lg p-3 border border-white/5">
          <div className="text-gray-500 text-[10px] mb-1 font-bold uppercase tracking-wider">Best Case</div>
          <div className="font-mono text-accent-green text-xs">{info.best}</div>
        </div>
        <div className="bg-black/30 rounded-lg p-3 border border-white/5">
          <div className="text-gray-500 text-[10px] mb-1 font-bold uppercase tracking-wider">Average</div>
          <div className="font-mono text-accent-amber text-xs">{info.average}</div>
        </div>
        <div className="bg-black/30 rounded-lg p-3 border border-white/5">
          <div className="text-gray-500 text-[10px] mb-1 font-bold uppercase tracking-wider">Worst Case</div>
          <div className="font-mono text-accent-red text-xs">{info.worst}</div>
        </div>
        <div className="bg-black/30 rounded-lg p-3 border border-white/5">
          <div className="text-gray-500 text-[10px] mb-1 font-bold uppercase tracking-wider">Space</div>
          <div className="font-mono text-accent-blue text-xs">{info.space}</div>
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

      {isComplete && analysis && (
        <div className="mt-4 p-3 bg-accent-blue/10 border border-accent-blue/20 rounded-lg animate-in fade-in zoom-in duration-300">
          <p className="text-sm text-blue-200 font-medium">
            <span className="font-bold">Analysis: </span>
            {analysis}
          </p>
        </div>
      )}
    </div>
  );
}

function StatBadge({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center space-x-2 bg-surfaceHighlight/50 px-2 py-1 rounded-md border border-white/5">
      <span className="text-[11px] text-gray-400 font-medium">{label}:</span>
      <span className="text-xs font-mono font-bold text-white">{value}</span>
    </div>
  );
}
