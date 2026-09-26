import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayer } from './hooks/usePlayer';
import { ArrayView } from './components/ArrayView';
import { MergeSortView } from './components/MergeSortView';
import { BinarySearchView } from './components/BinarySearchView';
import { GraphView } from './components/GraphView';
import { NQueensView } from './components/NQueensView';
import { Controls } from './components/Controls';
import { CodePanel } from './components/CodePanel';
import { ComplexityPanel, type ComplexityInfo } from './components/ComplexityPanel';
import { generateBubbleSortSteps, bubbleSortCode } from './algorithms/bubbleSort';
import { generateMergeSortSteps, mergeSortCode } from './algorithms/mergeSort';
import { generateBinarySearchIterativeSteps, generateBinarySearchRecursiveSteps, binarySearchIterativeCode, binarySearchRecursiveCode } from './algorithms/binarySearch';
import { generateBfsSteps, generateDfsSteps, bfsCode, dfsCode } from './algorithms/graph';
import { generateNQueensSteps, nQueensCode } from './algorithms/nqueens';
import { generateSelectionSortSteps, selectionSortCode } from './algorithms/selectionSort';
import { generateInsertionSortSteps, insertionSortCode } from './algorithms/insertionSort';
import { generateActivitySelectionSteps, activitySelectionCode } from './algorithms/activitySelection';
import { ActivitySelectionView } from './components/ActivitySelectionView';
import { Maximize2, X, Activity, GitMerge, Search, GitCommit, GitPullRequest, Menu, ChevronDown, ChevronUp, Crown } from 'lucide-react';
import type { AlgorithmType, ActivityData } from './types';
import type { GraphData } from './algorithms/graph';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const generateRandomArray = (length = 12, max = 50) => {
  return Array.from({ length }, () => Math.floor(Math.random() * max) + 5);
};

const initialGraph: GraphData = {
  nodes: [
    { id: 'A', x: 150, y: 50 }, { id: 'B', x: 50, y: 150 }, { id: 'C', x: 250, y: 150 },
    { id: 'D', x: 100, y: 250 }, { id: 'E', x: 200, y: 250 }
  ],
  edges: [
    { source: 'A', target: 'B' }, { source: 'A', target: 'C' },
    { source: 'B', target: 'D' }, { source: 'C', target: 'E' }
  ]
};


const defaultActivities: ActivityData[] = [
  { id: '1', label: 'A', start: 1, end: 4 },
  { id: '2', label: 'B', start: 3, end: 5 },
  { id: '3', label: 'C', start: 0, end: 6 },
  { id: '4', label: 'D', start: 5, end: 7 },
  { id: '5', label: 'E', start: 3, end: 9 },
  { id: '6', label: 'F', start: 5, end: 9 },
  { id: '7', label: 'G', start: 8, end: 11 },
];
const algorithms = [
  { 
    id: 'bubble', name: 'Bubble Sort', type: 'array', icon: Activity, complexity: 'O(n²)', code: bubbleSortCode,
    info: { best: "Ω(n)", average: "Θ(n²)", worst: "O(n²)", space: "O(1)", explanation: "Best case: array already sorted (Ω(n)) — Worst case: array reverse sorted (O(n²))" }
  },
  { 
    id: 'merge', name: 'Merge Sort', type: 'array', icon: GitMerge, complexity: 'O(n log n)', code: mergeSortCode,
    info: { best: "Ω(n log n)", average: "Θ(n log n)", worst: "O(n log n)", space: "O(n)", explanation: "Always recursively splits and merges, resulting in O(n log n) across all cases." }
  },

  { 
    id: 'selection', name: 'Selection Sort', type: 'array', icon: Activity, complexity: 'O(n²)', code: selectionSortCode,
    info: { best: "Ω(n²)", average: "Θ(n²)", worst: "O(n²)", space: "O(1)", explanation: "Always scans the remaining unsorted portion to find the minimum. Does NOT benefit from an already-sorted array." }
  },
  { 
    id: 'insertion', name: 'Insertion Sort', type: 'array', icon: Activity, complexity: 'O(n²)', code: insertionSortCode,
    info: { best: "Ω(n)", average: "Θ(n²)", worst: "O(n²)", space: "O(1)", explanation: "Builds sorted array one element at a time. Best case: already sorted (O(n)). Worst case: reverse sorted." }
  },
  { 
    id: 'binarySearch', name: 'Binary Search', type: 'array', icon: Search, complexity: 'O(log n)', code: binarySearchIterativeCode,
    info: { best: "Ω(1)", average: "Θ(log n)", worst: "O(log n)", space: "O(1)", explanation: "Best case: target is the middle element (Ω(1)) — Worst case: target is at the ends or missing (O(log n))." }
  },
  { 
    id: 'bfs', name: 'Breadth-First Search', type: 'graph', icon: GitCommit, complexity: 'O(V + E)', code: bfsCode,
    info: { best: "Ω(V + E)", average: "Θ(V + E)", worst: "O(V + E)", space: "O(V)", explanation: "Visits every vertex and edge once. Space O(V) for queue." }
  },
  { 
    id: 'dfs', name: 'Depth-First Search', type: 'graph', icon: GitPullRequest, complexity: 'O(V + E)', code: dfsCode,
    info: { best: "Ω(V + E)", average: "Θ(V + E)", worst: "O(V + E)", space: "O(V)", explanation: "Explores each vertex and edge once deep into paths before backtracking. Space O(V) for call stack." }
  },

  {
    id: 'nqueens', name: 'N-Queens', type: 'backtracking', icon: Crown, complexity: 'O(N!)', code: nQueensCode,
    info: { best: "Ω(N)", average: "Better than O(N!)", worst: "O(N!)", space: "O(N)", explanation: "N-Queens uses backtracking to prune invalid branches early — as soon as a queen placement creates a conflict, that entire branch is abandoned without exploring further, drastically reducing the search space compared to checking every possible arrangement." }
  },
  {
    id: 'activitySelection', name: 'Activity Selection', type: 'greedy', icon: Crown, complexity: 'O(n log n)', code: activitySelectionCode,
    info: { best: "Ω(n log n)", average: "Θ(n log n)", worst: "O(n log n)", space: "O(1)", explanation: "Always picking the activity that finishes earliest leaves the most room for future activities — this greedy choice is provably optimal here." }
  },
];

function App() {
  const [activeAlgoId, setActiveAlgoId] = useState<AlgorithmType>('bubble');
  const [binarySearchMode, setBinarySearchMode] = useState<'iterative' | 'recursive'>('iterative');

  
  let activeAlgo = algorithms.find(a => a.id === activeAlgoId)!;
  if (activeAlgoId === 'binarySearch') {
    activeAlgo = {
      ...activeAlgo,
      code: binarySearchMode === 'iterative' ? binarySearchIterativeCode : binarySearchRecursiveCode,
      info: {
        ...activeAlgo.info,
        space: binarySearchMode === 'iterative' ? "O(1)" : "O(log n)",
        explanation: binarySearchMode === 'iterative' 
          ? activeAlgo.info.explanation + " Space O(1) for iterative variables." 
          : activeAlgo.info.explanation + " Space O(log n) for recursive call stack."
      }
    };
  }


  
  // State for Arrays
  const [array, setArray] = useState(() => generateRandomArray());
  const [customArrayInput, setCustomArrayInput] = useState("");
  const [arrayError, setArrayError] = useState("");
  const [binarySearchTarget, setBinarySearchTarget] = useState<number | null>(null);
  
  // State for Graphs
  const [graph, setGraph] = useState<GraphData>(initialGraph);
  const [startNodeId, setStartNodeId] = useState('A');


  // State for N-Queens
  const [nQueensSize, setNQueensSize] = useState<number>(8);
  const [nQueensFindAll, setNQueensFindAll] = useState<boolean>(false);
  const [nQueensSolutionIndex, setNQueensSolutionIndex] = useState<number>(0);

  // State for Activity Selection
  const [activities, setActivities] = useState<ActivityData[]>(defaultActivities);
  
  // UI State
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFullscreenControls, setShowFullscreenControls] = useState(true);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'complexity' | 'code'>('complexity');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleCustomArraySubmit = () => {
    if (!customArrayInput.trim()) return;
    const parts = customArrayInput.split(',').map(s => s.trim());
    const nums = parts.map(p => Number(p));
    
    if (nums.some(isNaN) || nums.length === 0) {
      setArrayError("Invalid input. Use comma-separated numbers (e.g. 5, 2, 9).");
      return;
    }
    if (nums.length > 50) {
      setArrayError("Too many numbers. Keep it under 50.");
      return;
    }
    
    setArrayError("");
    setArray(nums);
    setBinarySearchTarget(nums[Math.floor(Math.random() * nums.length)]);
    setCustomArrayInput("");
  };

  const steps = useMemo(() => {
    switch (activeAlgoId) {
      case 'bubble': return generateBubbleSortSteps(array);
      case 'selection': return generateSelectionSortSteps(array);
      case 'insertion': return generateInsertionSortSteps(array);
      case 'merge': return generateMergeSortSteps(array);
      case 'activitySelection': return generateActivitySelectionSteps(activities);
      case 'binarySearch': {
        const sorted = [...array].sort((a, b) => a - b);
        const target = binarySearchTarget ?? (sorted[Math.floor(Math.random() * sorted.length)] || sorted[0]);
        return binarySearchMode === 'iterative' 
          ? generateBinarySearchIterativeSteps(sorted, target)
          : generateBinarySearchRecursiveSteps(sorted, target);
      }
      case 'bfs': return generateBfsSteps(graph, startNodeId);
      case 'dfs': return generateDfsSteps(graph, startNodeId);

      case 'nqueens': return generateNQueensSteps(nQueensSize, nQueensFindAll);
      default: return [];
    }
  }, [activeAlgoId, array, graph, startNodeId, binarySearchMode, binarySearchTarget, nQueensSize, nQueensFindAll]);
  
  const player = usePlayer(steps, 1);


  const nQueensTotalSolutions = useMemo(() => {
    return activeAlgo.id === 'nqueens' ? steps.filter((s: any) => s.type === 'solution-found').length : 0;
  }, [activeAlgo.id, steps]);



  const handleShuffleArray = () => {
    setArrayError("");
    setArray(generateRandomArray());
  };



  const isGraph = activeAlgo.type === 'graph';
  const isMergeSort = activeAlgo.id === 'merge';
  const isBinarySearch = activeAlgo.id === 'binarySearch';
  const isNQueens = activeAlgo.id === 'nqueens';
  const isActivitySelection = activeAlgo.id === 'activitySelection';
  const isArray = activeAlgo.type === 'array' && !isMergeSort && !isBinarySearch;

  let n = 0;
  if (isArray) n = array.length;
  if (isGraph) n = graph.nodes.length;
  if (isNQueens) n = nQueensSize;
  if (isActivitySelection) n = activities.length;

  return (
    <div className="min-h-screen flex bg-[#0B0F19] relative overflow-hidden text-white font-sans selection:bg-accent-blue/30">
      
      {/* Animated floating background orbs */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="orb-1 absolute top-[-10%] left-[20%] w-[500px] h-[500px] rounded-full bg-accent-blue/5 blur-[100px]" />
        <div className="orb-2 absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-accent-violet/5 blur-[100px]" />
        <div className="orb-3 absolute top-[50%] left-[-10%] w-[300px] h-[300px] rounded-full bg-accent-amber/3 blur-[80px]" />
      </div>
      {/* --- DESKTOP LEFT SIDEBAR --- */}
      <aside className="hidden lg:flex flex-col w-[80px] hover:w-[260px] transition-all duration-300 border-r border-surfaceHighlight/50 bg-surface/30 backdrop-blur-xl z-50 h-screen sticky top-0 group py-6 overflow-hidden flex-shrink-0">
        <div className="flex items-center px-6 mb-10 whitespace-nowrap">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-accent-blue to-accent-violet flex items-center justify-center font-bold text-white shadow-lg shrink-0">
            A
          </div>
          <span className="ml-4 text-lg font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-accent-blue via-accent-violet to-accent-amber opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            Algorithm Visualizer
          </span>
        </div>
        
        <nav className="flex flex-col space-y-2 px-3 w-full">
          {algorithms.map(algo => {
            const Icon = algo.icon;
            const isActive = activeAlgoId === algo.id;
            return (
              <button
                key={algo.id}
                onClick={() => {
                  setActiveAlgoId(algo.id as AlgorithmType);
                  setIsFullscreen(false);
                }}
                className={cn(
                  "flex items-center w-full px-3 py-3 rounded-xl transition-all duration-200 group/btn relative overflow-hidden",
                  isActive ? "bg-accent-blue/10 text-accent-blue" : "hover:bg-surfaceHighlight/40 text-gray-400 hover:text-gray-200"
                )}
              >
                {isActive && (
                  <div className="sidebar-active-glow absolute left-0 top-0 bottom-0 w-1 bg-accent-blue rounded-r" />
                )}
                <Icon className={cn("w-6 h-6 shrink-0", isActive && "drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]")} />
                <span className="ml-4 text-sm font-semibold tracking-wide opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                  {algo.name}
                </span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <div className="flex-1 flex flex-col min-h-screen relative overflow-y-auto overflow-x-hidden">
        {/* Background decorations removed — orbs are in the fixed layer */}

        <div className="flex-1 p-4 sm:p-6 lg:p-8 w-full max-w-[1500px] mx-auto z-10">
          
          {/* MOBILE HEADER & DROPDOWN */}
          <header className="lg:hidden flex flex-col mb-6 z-30 relative">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-accent-blue to-accent-violet flex items-center justify-center font-bold text-white shadow-lg shrink-0 mr-3">
                  A
                </div>
                <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-accent-blue via-accent-violet to-accent-amber">
                  Algorithm Visualizer
                </h1>
              </div>
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 bg-surfaceHighlight/30 rounded-lg border border-surfaceHighlight text-white"
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>

            {isMobileMenuOpen && (
              <div className="absolute top-14 left-0 w-full bg-surface/95 backdrop-blur-xl border border-surfaceHighlight rounded-xl shadow-2xl p-2 z-50 flex flex-col space-y-1 animate-in slide-in-from-top-2">
                {algorithms.map(algo => {
                  const Icon = algo.icon;
                  return (
                    <button
                      key={algo.id}
                      onClick={() => {
                        setActiveAlgoId(algo.id as AlgorithmType);
                        setIsFullscreen(false);
                        setIsMobileMenuOpen(false);
                      }}
                      className={cn(
                        "flex items-center w-full px-4 py-3 rounded-lg text-sm font-semibold transition-colors",
                        activeAlgoId === algo.id ? "bg-accent-blue/10 text-accent-blue" : "text-gray-300 hover:bg-surfaceHighlight/50"
                      )}
                    >
                      <Icon className="w-5 h-5 mr-3" />
                      {algo.name}
                    </button>
                  );
                })}
              </div>
            )}
          </header>

          {/* MAIN GRID LAYOUT */}
          <main className="w-full grid grid-cols-1 lg:grid-cols-[2fr_1fr] xl:grid-cols-[2.5fr_1fr] gap-6">
            
            {/* LEFT COLUMN: VISUALIZER */}
            <div className="space-y-6">
              <div className="w-full p-6 bg-surface/60 border border-surfaceHighlight/80 rounded-3xl backdrop-blur-xl shadow-2xl flex flex-col">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
                  <div className="flex items-center space-x-4">
                    <h2 className="font-display text-3xl font-bold tracking-tight text-white drop-shadow-md">{activeAlgo.name}</h2>
                    <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold border flex items-center space-x-2 ${
                      isGraph ? 'bg-accent-violet/10 text-accent-violet border-accent-violet/20' : 
                      'bg-accent-blue/10 text-accent-blue border-accent-blue/20'
                    }`}>
                      <span>{activeAlgo.type.toUpperCase()}</span>
                    </span>
                    
                    {isMergeSort && (
                      <button 
                        onClick={() => setIsFullscreen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-accent-blue/20 to-accent-violet/20 hover:from-accent-blue/30 hover:to-accent-violet/30 border border-accent-blue/30 hover:border-accent-blue/60 rounded-lg text-xs font-bold text-accent-blue transition-all duration-200 shadow-[0_0_10px_rgba(59,130,246,0.15)] hover:shadow-[0_0_16px_rgba(59,130,246,0.35)] ml-2 group"
                        title="Open Fullscreen"
                      >
                        <Maximize2 className="w-3.5 h-3.5 transition-transform group-hover:scale-110" />
                        <span>EXPAND</span>
                      </button>
                    )}

                  </div>
                  {isNQueens && (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-black/20 px-4 py-3 rounded-xl border border-white/5">
                      <div className="flex items-center space-x-2 border-b sm:border-b-0 sm:border-r border-white/10 pb-3 sm:pb-0 sm:pr-4 w-full sm:w-auto">
                        <button
                          onClick={() => { setNQueensFindAll(false); player.reset(); setNQueensSolutionIndex(0); }}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex-1 sm:flex-none",
                            !nQueensFindAll 
                              ? "bg-accent-blue/20 text-accent-blue border border-accent-blue/30 shadow-[0_0_10px_rgba(59,130,246,0.2)]" 
                              : "bg-surfaceHighlight/30 text-gray-400 hover:bg-surfaceHighlight/50 border border-transparent"
                          )}
                        >
                          First Solution
                        </button>
                        <button
                          onClick={() => { setNQueensFindAll(true); player.reset(); setNQueensSolutionIndex(0); }}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex-1 sm:flex-none",
                            nQueensFindAll 
                              ? "bg-accent-blue/20 text-accent-blue border border-accent-blue/30 shadow-[0_0_10px_rgba(59,130,246,0.2)]" 
                              : "bg-surfaceHighlight/30 text-gray-400 hover:bg-surfaceHighlight/50 border border-transparent"
                          )}
                        >
                          All Solutions
                        </button>
                      </div>

                      <div className="flex items-center space-x-3 w-full sm:w-auto">
                        <span className="font-display text-sm font-bold text-gray-300 whitespace-nowrap">Board Size (N): {nQueensSize}</span>
                        <input 
                          type="range" 
                          min="4" 
                          max="10" 
                          value={nQueensSize}
                          onChange={(e) => {
                            setNQueensSize(parseInt(e.target.value));
                            player.reset();
                            setNQueensSolutionIndex(0);
                          }}
                          disabled={player.isPlaying}
                          className="w-full sm:w-32 accent-accent-blue"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {isActivitySelection && (
                  <div className="mb-6 flex flex-col gap-3 bg-black/20 p-4 rounded-xl border border-white/5">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-2">
                      <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Activity Inputs</span>
                      <button
                        onClick={() => {
                          const newId = Math.random().toString(36).substr(2, 9);
                          const nextLabel = String.fromCharCode(65 + (activities.length % 26)); // A, B, C...
                          setActivities([...activities, { id: newId, label: nextLabel, start: 0, end: 1 }]);
                          player.reset();
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-green/20 hover:bg-accent-green/30 border border-accent-green/30 text-accent-green rounded-lg text-xs font-bold transition-all shadow-[0_0_10px_rgba(16,185,129,0.2)] hover:shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                      >
                        + Add Activity
                      </button>
                    </div>
                    
                    <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                      {activities.map((act, idx) => (
                        <div key={act.id} className="flex items-center gap-3 bg-surfaceHighlight/30 p-2.5 rounded-lg border border-white/5 hover:border-white/10 transition-colors">
                          <input
                            type="text"
                            value={act.label}
                            onChange={(e) => {
                              const newActs = [...activities];
                              newActs[idx].label = e.target.value;
                              setActivities(newActs);
                              player.reset();
                            }}
                            className="w-12 bg-surface border border-surfaceHighlight rounded px-2 py-1 text-sm font-bold text-white focus:outline-none focus:border-accent-blue"
                            placeholder="Name"
                          />
                          
                          <div className="flex items-center gap-1.5 ml-auto">
                            <span className="text-xs font-mono text-gray-500">START:</span>
                            <input
                              type="number"
                              value={act.start}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                const newActs = [...activities];
                                newActs[idx].start = val;
                                setActivities(newActs);
                                player.reset();
                              }}
                              className="w-16 bg-surface border border-surfaceHighlight rounded px-2 py-1 text-sm font-mono text-white focus:outline-none focus:border-accent-blue"
                            />
                          </div>
                          
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-mono text-gray-500">END:</span>
                            <input
                              type="number"
                              value={act.end}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                const newActs = [...activities];
                                newActs[idx].end = Math.max(newActs[idx].start + 1, val);
                                setActivities(newActs);
                                player.reset();
                              }}
                              className="w-16 bg-surface border border-surfaceHighlight rounded px-2 py-1 text-sm font-mono text-white focus:outline-none focus:border-accent-blue"
                            />
                          </div>

                          <button
                            onClick={() => {
                              if (activities.length > 1) {
                                setActivities(activities.filter(a => a.id !== act.id));
                                player.reset();
                              }
                            }}
                            disabled={activities.length <= 1}
                            className="p-1.5 ml-2 text-gray-500 hover:bg-accent-red/20 hover:text-accent-red rounded-md disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-500 transition-all group"
                            title="Delete Activity"
                          >
                            <X className="w-4 h-4 transition-transform group-hover:rotate-90" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Custom Inputs */}
                {(isArray || isMergeSort || isBinarySearch) && (
                  <div className="mb-6 flex flex-col gap-3 bg-black/20 p-3 rounded-xl border border-white/5">
                    {/* Top Row: Modes (if any) */}
                    {isBinarySearch && (
                      <div className="flex items-center space-x-2 pb-3 mb-1 border-b border-white/10">
                        <span className="text-sm font-bold text-gray-400 mr-2">Mode:</span>
                        <button
                          onClick={() => setBinarySearchMode('iterative')}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-sm font-semibold transition-all",
                            binarySearchMode === 'iterative' 
                              ? "bg-accent-blue/20 text-accent-blue border border-accent-blue/30 shadow-[0_0_10px_rgba(59,130,246,0.2)]" 
                              : "bg-surfaceHighlight/30 text-gray-400 hover:bg-surfaceHighlight/50 border border-transparent"
                          )}
                        >
                          Iterative
                        </button>
                        <button
                          onClick={() => setBinarySearchMode('recursive')}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-sm font-semibold transition-all",
                            binarySearchMode === 'recursive' 
                              ? "bg-accent-blue/20 text-accent-blue border border-accent-blue/30 shadow-[0_0_10px_rgba(59,130,246,0.2)]" 
                              : "bg-surfaceHighlight/30 text-gray-400 hover:bg-surfaceHighlight/50 border border-transparent"
                          )}
                        >
                          Recursive
                        </button>
                      </div>
                    )}
                    
                    {/* Bottom Row: Inputs */}
                    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                      <div className="flex-1 w-full relative flex gap-2">
                        <input
                          type="text"
                          placeholder="e.g. 5, 2, 9, 1, 7"
                          value={customArrayInput}
                          onChange={(e) => setCustomArrayInput(e.target.value)}
                          disabled={player.isPlaying}
                          className="w-full bg-surface border border-surfaceHighlight rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-blue disabled:opacity-50"
                        />
                        {isBinarySearch && (
                          <input
                            type="text"
                            placeholder="Target"
                            value={binarySearchTarget ?? ''}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9-]/g, '');
                              setBinarySearchTarget(val === '' ? null : Number(val));
                            }}
                            disabled={player.isPlaying}
                            className="w-24 bg-surface border border-surfaceHighlight rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-blue disabled:opacity-50 text-center"
                            title="Target to search for"
                          />
                        )}
                        {arrayError && <p className="absolute -bottom-5 left-1 text-[10px] text-accent-red font-semibold">{arrayError}</p>}
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button 
                          onClick={handleCustomArraySubmit}
                          disabled={player.isPlaying}
                          className="btn-shimmer px-4 py-2 bg-gradient-to-r from-accent-blue/20 to-accent-blue/10 hover:from-accent-blue/30 hover:to-accent-blue/20 text-accent-blue border border-accent-blue/30 hover:border-accent-blue/60 rounded-lg text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed w-full sm:w-auto shadow-[0_0_10px_rgba(59,130,246,0.1)] hover:shadow-[0_0_16px_rgba(59,130,246,0.3)]"
                        >
                          Set Array
                        </button>
                        <button 
                          onClick={handleShuffleArray}
                          disabled={player.isPlaying}
                          className="btn-shimmer px-4 py-2 bg-surfaceHighlight/50 hover:bg-surfaceHighlight border border-white/10 hover:border-white/25 rounded-lg text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed text-gray-200 hover:text-white w-full sm:w-auto whitespace-nowrap"
                        >
                          Randomize
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
                {isBinarySearch && (
                  <div className="mb-4 text-xs font-medium text-accent-amber bg-accent-amber/10 border border-accent-amber/20 px-3 py-1.5 rounded-lg inline-block self-start">
                    Note: Array is automatically sorted before running Binary Search.
                  </div>
                )}
                
                {/* Visualizer Canvas */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeAlgoId}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                    className="flex-1 mb-8 flex flex-col justify-center min-h-[300px]"
                  >
                    {isArray && (
                      <ArrayView 
                        initialArray={array}
                        steps={steps as any}
                        currentIndex={player.currentIndex}
                      />
                    )}
                    {isActivitySelection && (
                      <ActivitySelectionView
                        activities={activities}
                        steps={steps as any}
                        currentIndex={player.currentIndex}
                      />
                    )}
                    {isMergeSort && !isFullscreen && (
                      <MergeSortView
                        initialArray={array}
                        steps={steps as any}
                        currentIndex={player.currentIndex}
                        isFullscreen={false}
                      />
                    )}

                    {isBinarySearch && (
                      <BinarySearchView
                        initialArray={[...array].sort((a,b)=>a-b)}
                        steps={steps as any}
                        currentIndex={player.currentIndex}
                        mode={binarySearchMode}
                      />
                    )}
                    {isGraph && (
                      <GraphView
                        graph={graph}
                        setGraph={setGraph}
                        isEditable={!player.isPlaying && player.currentIndex === 0}
                        steps={steps as any}
                        currentIndex={player.currentIndex}
                      />
                    )}

                    {isMergeSort && isFullscreen && (
                      <div className="flex flex-col items-center justify-center h-[500px] border border-surfaceHighlight/50 rounded-2xl bg-black/20 text-gray-400 text-sm">
                        <Maximize2 className="w-8 h-8 mb-3 opacity-50" />
                        Merge Sort Tree is currently open in fullscreen mode.
                      </div>
                    )}

                    {isNQueens && (
                      <NQueensView 
                        n={nQueensSize}
                        steps={steps as any}
                        currentIndex={player.currentIndex}
                        activeSolutionIndex={nQueensFindAll ? nQueensSolutionIndex : undefined}
                      />
                    )}
                  </motion.div>
                </AnimatePresence>
                
                {/* Persistent Live Action Banner */}
                <div className="w-full mb-6 p-5 bg-gradient-to-r from-surfaceHighlight/50 to-transparent border-l-4 border-accent-blue rounded-r-2xl shadow-lg">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="ticker-dot inline-block w-2 h-2 rounded-full bg-accent-blue" />
                    <h3 className="font-display text-[11px] text-accent-blue font-bold uppercase tracking-widest">Live Action</h3>
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={`${player.currentIndex}-${player.currentStep?.description}`}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                      className="text-base md:text-lg font-display text-gray-100 min-h-[1.75rem]"
                    >
                      {player.currentStep?.description || "Ready to start the algorithm."}
                    </motion.p>
                  </AnimatePresence>

                  {isNQueens && player.currentIndex === steps.length - 1 && nQueensFindAll && nQueensTotalSolutions > 1 && (
                    <div className="mt-4 flex items-center justify-between bg-black/30 p-2.5 rounded-xl border border-white/10 max-w-sm">
                      <button 
                        onClick={() => setNQueensSolutionIndex(Math.max(0, nQueensSolutionIndex - 1))}
                        disabled={nQueensSolutionIndex === 0}
                        className="px-4 py-1.5 bg-surfaceHighlight hover:bg-gray-600 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                      >
                        Prev
                      </button>
                      <span className="font-display text-xs font-bold text-gray-300 tracking-wide">
                        Solution {nQueensSolutionIndex + 1} of {nQueensTotalSolutions}
                      </span>
                      <button 
                        onClick={() => setNQueensSolutionIndex(Math.min(nQueensTotalSolutions - 1, nQueensSolutionIndex + 1))}
                        disabled={nQueensSolutionIndex === nQueensTotalSolutions - 1}
                        className="px-4 py-1.5 bg-surfaceHighlight hover:bg-gray-600 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
                {!isFullscreen && (
                  <Controls 
                    isPlaying={player.isPlaying}
                    progress={player.progress}
                    speed={player.speed}
                    totalSteps={player.totalSteps}
                    currentIndex={player.currentIndex}
                    onPlay={player.play}
                    onPause={player.pause}
                    onReset={player.reset}
                    onSpeedChange={player.setSpeed}
                    onStepForward={player.stepForward}
                    onStepBackward={player.stepBackward}
                    onJumpTo={player.jumpTo}
                  />
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: TABS & LIVE ACTION */}
            <div className="space-y-6 flex flex-col lg:sticky lg:top-8 lg:self-start overflow-y-auto max-h-[calc(100vh-4rem)] pb-12">
              
              <div className="flex flex-col space-y-4">
                {/* Tab Navigation */}
                <div className="flex space-x-2 bg-surface/40 p-1.5 rounded-xl border border-surfaceHighlight backdrop-blur-md w-full max-w-[400px]">
                  <button 
                    onClick={() => setActiveSidebarTab('complexity')}
                    className={`flex-1 py-2 rounded-lg text-[11px] uppercase tracking-wider font-bold transition-all duration-300 ${
                      activeSidebarTab === 'complexity' 
                        ? 'bg-surfaceHighlight text-white shadow-md border border-gray-600/50' 
                        : 'text-gray-400 hover:text-gray-200 hover:bg-surfaceHighlight/30 border border-transparent'
                    }`}
                  >
                    Complexity
                  </button>
                  <button 
                    onClick={() => setActiveSidebarTab('code')}
                    className={`flex-1 py-2 rounded-lg text-[11px] uppercase tracking-wider font-bold transition-all duration-300 ${
                      activeSidebarTab === 'code' 
                        ? 'bg-surfaceHighlight text-white shadow-md border border-gray-600/50' 
                        : 'text-gray-400 hover:text-gray-200 hover:bg-surfaceHighlight/30 border border-transparent'
                    }`}
                  >
                    Algorithm Code
                  </button>
                </div>

                {/* Tab Content */}
                <div className="w-full">
                  {activeSidebarTab === 'complexity' && (
                    <ComplexityPanel 
                      info={activeAlgo.info}
                      steps={steps as any}
                      currentIndex={player.currentIndex}
                      n={n}
                    />
                  )}
                  {activeSidebarTab === 'code' && (
                    <CodePanel 
                      code={activeAlgo.code} 
                      activeLines={player.currentStep?.lines} 
                    />
                  )}
                </div>
              </div>

            </div>
          </main>
        </div>
      </div>

      {/* FULLSCREEN OVERLAY FOR MERGESORT */}
      {isFullscreen && isMergeSort && (
        <div className="fixed inset-0 z-50 bg-[#0B0F19] flex flex-col animate-in fade-in duration-200">
          <div className="flex justify-between items-center p-4 border-b border-surfaceHighlight/50 bg-surface/80 backdrop-blur-md shadow-lg z-10">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-bold tracking-tight text-white">
                Merge Sort Recursion Tree
              </h2>
              <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold border bg-accent-green/10 text-accent-green border-accent-green/20">
                FULLSCREEN
              </span>
            </div>
            <button 
              onClick={() => setIsFullscreen(false)} 
              className="group flex items-center gap-2 px-4 py-2 bg-accent-red/10 hover:bg-accent-red/20 border border-accent-red/30 hover:border-accent-red/60 text-accent-red rounded-xl transition-all duration-200 font-semibold text-sm shadow-[0_0_10px_rgba(239,68,68,0.1)] hover:shadow-[0_0_20px_rgba(239,68,68,0.3)]"
            >
              <X className="w-4 h-4 transition-transform group-hover:rotate-90 duration-200" />
              <span>Close</span>
            </button>
          </div>
          
          <div className="flex-1 overflow-hidden relative">

            {isMergeSort && (
              <MergeSortView
                initialArray={array}
                steps={steps as any}
                currentIndex={player.currentIndex}
                isFullscreen={true}
              />
            )}
            
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-4xl z-30 drop-shadow-2xl flex flex-col items-center">
              <button
                onClick={() => setShowFullscreenControls(!showFullscreenControls)}
                className="mb-4 px-4 py-2 bg-[#0B0F19]/80 hover:bg-[#0B0F19] text-gray-300 hover:text-white border border-surfaceHighlight/50 rounded-full backdrop-blur-md text-xs font-bold transition-all shadow-lg flex items-center space-x-2"
              >
                {showFullscreenControls ? (
                  <><span>Hide Controls</span><ChevronDown className="w-4 h-4" /></>
                ) : (
                  <><span>Show Controls</span><ChevronUp className="w-4 h-4" /></>
                )}
              </button>
              
              <AnimatePresence>
                {showFullscreenControls && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className="w-full bg-[#0B0F19]/80 backdrop-blur-2xl p-4 rounded-3xl border border-surfaceHighlight/50 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                  >
                    <Controls 
                      isPlaying={player.isPlaying}
                      progress={player.progress}
                      speed={player.speed}
                      totalSteps={player.totalSteps}
                      currentIndex={player.currentIndex}
                      onPlay={player.play}
                      onPause={player.pause}
                      onReset={player.reset}
                      onSpeedChange={player.setSpeed}
                      onStepForward={player.stepForward}
                      onStepBackward={player.stepBackward}
                      onJumpTo={player.jumpTo}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
