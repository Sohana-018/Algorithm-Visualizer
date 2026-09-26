import { useMemo, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TransformWrapper, TransformComponent, useControls } from 'react-zoom-pan-pinch';
import type { MergeSortStep } from '../types';
import * as d3 from 'd3-hierarchy';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface TreeNode {
  id: string;
  parentId: string | null;
  array: number[];
  mergedArray: number[];
  status: 'waiting' | 'splitting' | 'merging' | 'done';
  isCollapsed: boolean;
  children?: TreeNode[];
}

interface ActiveCompare {
  parentId: string;
  leftChildId: string;
  rightChildId: string;
  leftIdx: number;
  rightIdx: number;
  winner: 'left' | 'right';
}

interface MergeSortViewProps {
  initialArray: number[];
  steps: MergeSortStep[];
  currentIndex: number;
  isFullscreen?: boolean;
}

interface TreeControlsProps {
  fitScale: number;
  isManualZoom: boolean;
  setIsManualZoom: (val: boolean) => void;
}

function TreeControls({ fitScale, isManualZoom, setIsManualZoom }: TreeControlsProps) {
  const { zoomIn, zoomOut, zoomToElement } = useControls();

  useEffect(() => {
    if (isManualZoom) return;

    const timer = setTimeout(() => {
      zoomToElement('tree-bounds', fitScale, 400); 
    }, 150);
    return () => clearTimeout(timer);
  }, [fitScale, zoomToElement, isManualZoom]);

  return (
    <div className="absolute top-4 right-4 z-20 flex space-x-2 bg-black/60 p-1.5 rounded-xl border border-white/10 backdrop-blur-md shadow-xl">
      <button onClick={() => { setIsManualZoom(true); zoomOut(0.2); }} className="p-2 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white transition-colors" title="Zoom Out">
        <ZoomOut className="w-5 h-5"/>
      </button>
      <button onClick={() => { setIsManualZoom(false); zoomToElement('tree-bounds', fitScale, 400); }} className="p-2 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white transition-colors" title="Fit to Screen">
        <Maximize className="w-5 h-5"/>
      </button>
      <button onClick={() => { setIsManualZoom(true); zoomIn(0.2); }} className="p-2 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white transition-colors" title="Zoom In">
        <ZoomIn className="w-5 h-5"/>
      </button>
    </div>
  );
}

export function MergeSortView({ initialArray, steps, currentIndex, isFullscreen = false }: MergeSortViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 800, h: 500 });
  const [isManualZoom, setIsManualZoom] = useState(false);

  useEffect(() => {
    if (currentIndex === 0) setIsManualZoom(false);
  }, [currentIndex]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({ w: entry.contentRect.width, h: entry.contentRect.height });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isFullscreen]);

  const { root, activeCompare, currentNodes } = useMemo(() => {
    const nodes = new Map<string, TreeNode>();
    const rootId = `node-0-${initialArray.length - 1}`;
    nodes.set(rootId, {
      id: rootId,
      parentId: null,
      array: [...initialArray],
      mergedArray: [],
      status: 'waiting',
      isCollapsed: false,
      children: []
    });

    let compare: ActiveCompare | null = null;

    for (let i = 0; i <= currentIndex; i++) {
      const step = steps[i];
      if (!step) continue;

      if (step.type === 'split') {
        const parent = nodes.get(step.parentId);
        if (parent) {
          parent.status = 'splitting';
          const leftNode: TreeNode = {
            id: step.leftChildId,
            parentId: step.parentId,
            array: step.leftArr,
            mergedArray: [],
            status: 'waiting',
            isCollapsed: false,
            children: []
          };
          const rightNode: TreeNode = {
            id: step.rightChildId,
            parentId: step.parentId,
            array: step.rightArr,
            mergedArray: [],
            status: 'waiting',
            isCollapsed: false,
            children: []
          };
          nodes.set(step.leftChildId, leftNode);
          nodes.set(step.rightChildId, rightNode);
          parent.children = [leftNode, rightNode];
        }
      } else if (step.type === 'compare-merge') {
        const parent = nodes.get(step.parentId);
        if (parent) parent.status = 'merging';
        compare = {
          parentId: step.parentId,
          leftChildId: step.leftChildId,
          rightChildId: step.rightChildId,
          leftIdx: step.leftIdx,
          rightIdx: step.rightIdx,
          winner: step.pickedFrom
        };
      } else if (step.type === 'place') {
        const parent = nodes.get(step.parentId);
        if (parent) {
          parent.mergedArray.push(step.value);
        }
      } else if (step.type === 'merge-complete') {
        const parent = nodes.get(step.nodeId);
        if (parent) {
          parent.status = 'done';
          parent.isCollapsed = true;
          // When collapsed, we do NOT clear the children array structurally, 
          // we just use isCollapsed to hide them visually.
        }
        compare = null;
      }
    }

    return { root: nodes.get(rootId), activeCompare: compare, currentNodes: Array.from(nodes.values()) };
  }, [steps, currentIndex, initialArray]);

  // Compute the rendered pixel width of a node card, accounting for:
  //   - each cell: 28px (w-7) + 4px gap
  //   - negative numbers are wider; add ~7px per '-' character in the label
  //   - a hard minimum of 36px per cell so single-digit negatives always fit
  const getNodeWidth = useMemo(() => {
    return (left: number, right: number): number => {
      const slice = initialArray.slice(left, right + 1);
      const maxChars = Math.max(...slice.map(v => String(v).length), 1);
      // cell width = max-chars * ~8.5px (monospace) + 8px padding, floored at 28px
      const cellW = Math.max(28, maxChars * 8.5 + 8);
      const count = right - left + 1;
      // total = cells + (count-1)*4px gap + 4px outer padding each side
      return count * cellW + (count - 1) * 4 + 8;
    };
  }, [initialArray]);

  const { nodePositions, nodeWidths, minX, maxX, maxY } = useMemo(() => {
    function buildHierarchy(left: number, right: number) {
      const id = `node-${left}-${right}`;
      const nodeWidth = getNodeWidth(left, right);
      const node = { id, left, right, arrayLength: right - left + 1, nodeWidth, children: [] as any[] };
      if (left < right) {
        const mid = Math.floor((left + right) / 2);
        node.children.push(buildHierarchy(left, mid));
        node.children.push(buildHierarchy(mid + 1, right));
      } else {
        delete (node as any).children;
      }
      return node;
    }

    const fullHierarchy = buildHierarchy(0, initialArray.length - 1);
    const hierarchy = d3.hierarchy(fullHierarchy);

    // Custom separation: half-widths of the two nodes + 20px hard minimum gap
    const separation = (a: any, b: any) => {
      const gap = 20; // px minimum gap between any two siblings
      return (a.data.nodeWidth / 2 + b.data.nodeWidth / 2 + gap);
    };

    const treeLayout = d3.tree<any>()
      .nodeSize([1, 140])        // y-separation fixed at 140px; x driven by separation fn
      .separation(separation);  // override default unit separation with our pixel-aware one

    const rootData = treeLayout(hierarchy);

    const positions = new Map<string, { x: number; y: number }>();
    const widths = new Map<string, number>();
    let mnX = Infinity, mxX = -Infinity, mxY = -Infinity;

    rootData.descendants().forEach(n => {
      positions.set(n.data.id, { x: n.x, y: n.y });
      widths.set(n.data.id, n.data.nodeWidth);
      const halfWidth = n.data.nodeWidth / 2;
      if (n.x - halfWidth < mnX) mnX = n.x - halfWidth;
      if (n.x + halfWidth > mxX) mxX = n.x + halfWidth;
      if (n.y > mxY) mxY = n.y;
    });

    if (mnX === Infinity) { mnX = 0; mxX = 0; mxY = 0; }
    return { nodePositions: positions, nodeWidths: widths, minX: mnX, maxX: mxX, maxY: mxY };
  }, [initialArray, getNodeWidth]);

  const paddingX = 100;
  const paddingY = 80;
  
  const svgWidth = Math.max(containerSize.w, (maxX - minX) + paddingX * 2);
  const svgHeight = Math.max(containerSize.h, maxY + paddingY * 2);
  const fitScale = Math.min(containerSize.w / svgWidth, containerSize.h / svgHeight) * 0.9;

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative w-full rounded-2xl border border-surfaceHighlight overflow-hidden",
        isFullscreen ? "h-full" : "h-[500px]"
      )}
    >
      <div className="absolute inset-0 bg-[#0B0F19] z-0" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_0%,transparent_100%)] z-0 pointer-events-none" />
      <div className="absolute inset-0 opacity-20 z-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.3) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

      <TransformWrapper
        initialScale={1}
        minScale={0.1}
        maxScale={4}
        centerOnInit
        wheel={{ step: 0.1 }}
        limitToBounds={false}
        onPanningStart={() => setIsManualZoom(true)}
        onWheelStart={() => setIsManualZoom(true)}
        onPinchStart={() => setIsManualZoom(true)}
      >
        <TreeControls fitScale={fitScale} isManualZoom={isManualZoom} setIsManualZoom={setIsManualZoom} />
        
        <TransformComponent wrapperClass="w-full h-full cursor-grab active:cursor-grabbing z-10 relative">
          <svg 
            width={svgWidth} 
            height={svgHeight} 
            className="origin-center overflow-visible"
          >
            <defs>
              <filter id="bloom-active" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <rect 
              id="tree-bounds"
              x={0} 
              y={0} 
              width={svgWidth} 
              height={svgHeight} 
              fill="transparent" 
              pointerEvents="none" 
            />

            <g transform={`translate(${-minX + (svgWidth - (maxX - minX)) / 2}, ${paddingY})`}>
              <AnimatePresence>
                {currentNodes.map(node => {
                  if (!node.children || node.children.length === 0 || node.isCollapsed) return null;
                  
                  const sourcePos = nodePositions.get(node.id)!;
                  const strokeColor = node.status === 'merging' ? '#8b5cf6' : 'rgba(255, 255, 255, 0.15)';

                  return node.children.map(child => {
                    const targetPos = nodePositions.get(child.id)!;
                    return (
                      <motion.path
                        key={`${node.id}-${child.id}`}
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4 }}
                        d={`M${sourcePos.x},${sourcePos.y + 16} C${sourcePos.x},${(sourcePos.y + targetPos.y) / 2} ${targetPos.x},${(sourcePos.y + targetPos.y) / 2} ${targetPos.x},${targetPos.y - 16}`}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={2}
                      />
                    );
                  });
                })}
              </AnimatePresence>

              <AnimatePresence>
                {currentNodes.map((data) => {
                  const pos = nodePositions.get(data.id);
                  if (!pos) return null; // Fallback
                  
                  // If the parent is collapsed, this child conceptually merged up into it.
                  // We get its parent's position to animate it sliding up before it disappears!
                  let renderPos = pos;
                  let shouldExit = false;
                  if (data.parentId) {
                    const parentData = currentNodes.find(n => n.id === data.parentId);
                    if (parentData?.isCollapsed) {
                      const parentPos = nodePositions.get(data.parentId);
                      if (parentPos) {
                        renderPos = parentPos;
                      }
                      shouldExit = true; // This child is now hidden because its parent is collapsed
                    }
                  }
                  
                  // Exit the children node smoothly if their parent just completed its merge
                  if (shouldExit) return null; 

                  const w = nodeWidths.get(data.id) ?? data.array.length * 32;
                  // Per-cell width based on widest value in this node (accounts for '-' sign)
                  const maxChars = Math.max(...data.array.map(v => String(v).length), 1);
                  const cellW = Math.max(28, maxChars * 8.5 + 8);
                  
                  // Compute the slots to display for this node
                  let displayArray: (number | null)[] = [];
                  
                  if (data.status === 'waiting' || data.status === 'splitting') {
                    displayArray = [...data.array];
                  } else if (data.status === 'merging') {
                    // Start with empty slots, fill with merged array
                    displayArray = Array(data.array.length).fill(null);
                    data.mergedArray.forEach((val, i) => displayArray[i] = val);
                  } else if (data.status === 'done') {
                    displayArray = [...data.mergedArray];
                  }

                  return (
                    <motion.g
                      id={data.id}
                      key={data.id}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ x: renderPos.x, y: renderPos.y, scale: 1, opacity: data.status === 'splitting' ? 0.6 : 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    >
                      <foreignObject x={-w / 2} y={-18} width={w} height={36} className="overflow-visible pointer-events-none">
                        <div className="flex w-full justify-center space-x-[4px]">
                          {displayArray.map((val, idx) => {
                            // Determine styling for individual cells
                            let isCompared = false;
                            let isWinner = false;
                            
                            if (activeCompare) {
                              if (data.id === activeCompare.leftChildId && idx === activeCompare.leftIdx) {
                                isCompared = true;
                                if (activeCompare.winner === 'left') isWinner = true;
                              }
                              if (data.id === activeCompare.rightChildId && idx === activeCompare.rightIdx) {
                                isCompared = true;
                                if (activeCompare.winner === 'right') isWinner = true;
                              }
                            }

                            const isMerged = data.status === 'merging' && val !== null;
                            const isDone = data.status === 'done';

                            return (
                              <div 
                                key={idx}
                                className={cn(
                                  "flex items-center justify-center text-[12px] font-bold rounded-md border transition-all duration-300",
                                  val === null ? "bg-surface/30 border-dashed border-gray-600/50 text-transparent" : 
                                  isWinner ? "bg-gradient-to-t from-accent-amber/40 to-accent-amber/20 border-accent-amber text-accent-amber shadow-[0_0_12px_rgba(245,158,11,0.6)] z-10 scale-110" :
                                  isCompared ? "bg-gradient-to-t from-accent-blue/40 to-accent-blue/20 border-accent-blue text-accent-blue shadow-[0_0_8px_rgba(59,130,246,0.5)] z-10" :
                                  isMerged ? "bg-gradient-to-b from-accent-green/40 to-accent-green/10 border-accent-green/50 text-accent-green shadow-[0_0_10px_rgba(16,185,129,0.3)]" :
                                  isDone ? "bg-gradient-to-b from-surfaceHighlight to-surface border-gray-500/50 text-gray-200 shadow-md" :
                                  "bg-gradient-to-b from-surfaceHighlight/50 to-surface/50 border-gray-600/30 text-gray-400"
                                )}
                                style={{ width: cellW, height: cellW, flexShrink: 0 }}
                              >
                                {val !== null ? val : ''}
                              </div>
                            );
                          })}
                        </div>
                      </foreignObject>
                    </motion.g>
                  );
                })}
              </AnimatePresence>
            </g>
          </svg>
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
}
