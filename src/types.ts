export type AlgorithmType = 'bubble' | 'merge' | 'binarySearch' | 'bfs' | 'dfs' | 'knapsack' | 'nqueens';

export type ArrayStep = 
  | { type: 'compare'; indices: [number, number]; description: string; lines?: number[] }
  | { type: 'swap'; indices: [number, number]; description: string; lines?: number[] }
  | { type: 'overwrite'; index: number; value: number; description: string; lines?: number[] }
  | { type: 'found'; index: number; description: string; lines?: number[] }
  | { type: 'complete'; description: string; lines?: number[] };

export type GraphStep = 
  | { type: 'visit'; node: string; description: string; lines?: number[] }
  | { type: 'enqueue'; node: string; description: string; lines?: number[] }
  | { type: 'dequeue'; node: string; description: string; lines?: number[] }
  | { type: 'complete'; description: string; lines?: number[] };

export type KnapsackStep = 
  | { type: 'createNode'; id: string; parentId: string | null; level: number; weight: number; value: number; bound: number; isInclude: boolean | null; description: string; lines?: number[] }
  | { type: 'prune'; id: string; reason: string; description: string; lines?: number[] }
  | { type: 'updateBest'; bestValue: number; bestNodeId: string; description: string; lines?: number[] }
  | { type: 'complete'; description: string; lines?: number[] };

export type MergeSortStep = 
  | { type: 'split'; parentId: string; leftChildId: string; rightChildId: string; leftArr: number[]; rightArr: number[]; description: string; lines?: number[] }
  | { type: 'compare-merge'; parentId: string; leftChildId: string; rightChildId: string; leftIdx: number; rightIdx: number; leftVal: number; rightVal: number; pickedFrom: 'left'|'right'; description: string; lines?: number[] }
  | { type: 'place'; parentId: string; value: number; description: string; lines?: number[] }
  | { type: 'merge-complete'; nodeId: string; mergedArray: number[]; description: string; lines?: number[] }
  | { type: 'complete'; description: string; lines?: number[] };

export type BinarySearchStep = 
  | { type: 'calc-mid'; low: number; high: number; mid: number; target: number; description: string; lines?: number[]; depth?: number; callId?: string }
  | { type: 'compare'; midValue: number; target: number; result: 'found' | 'left' | 'right'; description: string; lines?: number[]; depth?: number; callId?: string }
  | { type: 'eliminate'; range: [number, number]; description: string; lines?: number[]; depth?: number; callId?: string }
  | { type: 'push-call'; callId: string; args: { low: number, high: number }; target: number; description: string; lines?: number[]; depth: number }
  | { type: 'pop-call'; callId: string; returnValue: number; description: string; lines?: number[]; depth: number }
  | { type: 'complete'; description: string; lines?: number[] };

export type NQueensStep = 
  | { type: 'try-place'; row: number; col: number; description: string; lines?: number[] }
  | { type: 'place-safe'; row: number; col: number; placedQueens: {row: number, col: number}[]; description: string; lines?: number[] }
  | { type: 'conflict'; row: number; col: number; conflictsWith: {row: number, col: number}; description: string; lines?: number[] }
  | { type: 'backtrack'; row: number; col: number; description: string; lines?: number[] }
  | { type: 'solution-found'; queens: {row: number, col: number}[]; description: string; lines?: number[] }
  | { type: 'complete'; description: string; lines?: number[] };

export type AlgorithmStep = ArrayStep | GraphStep | KnapsackStep | MergeSortStep | BinarySearchStep | NQueensStep;

export interface AlgorithmVisualizerProps {
  onStep: (step: AlgorithmStep) => void;
}
