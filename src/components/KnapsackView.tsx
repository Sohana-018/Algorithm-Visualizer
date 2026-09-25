import { useMemo, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TransformWrapper, TransformComponent, useControls } from 'react-zoom-pan-pinch';
import type { KnapsackStep } from '../types';
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
  level: number;
  weight: number;
  value: number;
  bound: number;
  isInclude: boolean | null;
  status: 'active' | 'pruned' | 'best';
  pruneReason?: string;
  children?: TreeNode[];
}

interface KnapsackViewProps {
  steps: KnapsackStep[];
  currentIndex: number;
  capacity: number;
  isFullscreen?: boolean;
}

interface TreeControlsProps {
  nodeCount: number;
  isFullscreen: boolean;
  fitScale: number;
  latestNodeId: string;
  isManualZoom: boolean;
  setIsManualZoom: (val: boolean) => void;
}

function TreeControls({ nodeCount, isFullscreen, fitScale, latestNodeId, isManualZoom, setIsManualZoom }: TreeControlsProps) {
  const { zoomIn, zoomOut, zoomToElement } = useControls();

  useEffect(() => {
    if (isManualZoom) return;

    // A slightly longer timeout ensures Framer Motion and Fullscreen transitions finish
    const timer = setTimeout(() => {
      const MIN_SCALE = 0.55;
      
      if (fitScale < MIN_SCALE && latestNodeId) {
        // Tree is too large. Center on the most recently modified node at a readable scale.
        try {
          zoomToElement(`node-${latestNodeId}`, 0.7, 400);
        } catch (e) {
          // Fallback if node not found in DOM yet
          zoomToElement('tree-bounds', fitScale, 400);
        }
      } else {
        // Tree fits comfortably, center the whole tree
        zoomToElement('tree-bounds', fitScale, 400); 
      }
    }, 250);
    
    return () => clearTimeout(timer);
  }, [nodeCount, isFullscreen, fitScale, latestNodeId, zoomToElement, isManualZoom]);

  return (
    <div className="absolute top-4 right-4 z-20 flex space-x-2 bg-black/60 p-1.5 rounded-xl border border-white/10 backdrop-blur-md shadow-xl">
      <button 
        onClick={() => { setIsManualZoom(true); zoomOut(0.2); }} 
        className="p-2 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white transition-colors"
        title="Zoom Out"
      >
        <ZoomOut className="w-5 h-5"/>
      </button>
      <button 
        onClick={() => { setIsManualZoom(false); zoomToElement('tree-bounds', fitScale, 400); }} 
        className="p-2 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white transition-colors" 
        title="Fit to Screen"
      >
        <Maximize className="w-5 h-5"/>
      </button>
      <button 
        onClick={() => { setIsManualZoom(true); zoomIn(0.2); }} 
        className="p-2 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white transition-colors"
        title="Zoom In"
      >
        <ZoomIn className="w-5 h-5"/>
      </button>
    </div>
  );
}

export function KnapsackView({ steps, currentIndex, capacity, isFullscreen = false }: KnapsackViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 800, h: 500 });
  const [isManualZoom, setIsManualZoom] = useState(false);

  useEffect(() => {
    if (currentIndex === 0) setIsManualZoom(false);
  }, [currentIndex]);

  // Dynamically observe the exact container dimensions so auto-fit perfectly matches the real DOM
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({ 
          w: entry.contentRect.width, 
          h: entry.contentRect.height 
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isFullscreen]);

  const { root, bestValue, nodeCount, maxBound, latestNodeId } = useMemo(() => {
    const nodes = new Map<string, TreeNode>();
    let currentBest = 0;
    let currentBestNode = '';
    let count = 0;
    let maxB = 1;
    let lastMod = '';

    for (let i = 0; i <= currentIndex; i++) {
      const step = steps[i];
      if (!step) continue;

      if (step.type === 'createNode') {
        if (step.bound > maxB) maxB = step.bound;
        nodes.set(step.id, {
          id: step.id,
          parentId: step.parentId,
          level: step.level,
          weight: step.weight,
          value: step.value,
          bound: step.bound,
          isInclude: step.isInclude,
          status: 'active',
          children: []
        });
        count++;
        lastMod = step.id;
      } else if (step.type === 'prune') {
        const node = nodes.get(step.id);
        if (node) {
          node.status = 'pruned';
          node.pruneReason = step.reason;
        }
        lastMod = step.id;
      } else if (step.type === 'updateBest') {
        currentBest = step.bestValue;
        if (currentBestNode && nodes.has(currentBestNode)) {
          nodes.get(currentBestNode)!.status = 'active'; 
        }
        currentBestNode = step.bestNodeId;
        const node = nodes.get(step.bestNodeId);
        if (node) {
          node.status = 'best';
        }
        lastMod = step.bestNodeId;
      }
    }

    let rootNode: TreeNode | null = null;
    nodes.forEach(node => {
      if (node.parentId === null) {
        rootNode = node;
      } else {
        const parent = nodes.get(node.parentId);
        if (parent) {
          if (!parent.children) parent.children = [];
          parent.children.push(node);
        }
      }
    });

    return { root: rootNode, bestValue: currentBest, nodeCount: count, maxBound: maxB, latestNodeId: lastMod };
  }, [steps, currentIndex]);

  const { nodes: layoutNodes, links: layoutLinks, minX, maxX, maxY } = useMemo(() => {
    if (!root) return { nodes: [], links: [], minX: 0, maxX: 0, maxY: 0 };

    const hierarchy = d3.hierarchy<TreeNode>(root as TreeNode);
    const treeLayout = d3.tree<TreeNode>().nodeSize([120, 100]); 
    const rootData = treeLayout(hierarchy);
    
    const nodes = rootData.descendants();
    const links = rootData.links();

    let mnX = Infinity, mxX = -Infinity, mxY = -Infinity;
    nodes.forEach(n => {
      if (n.x < mnX) mnX = n.x;
      if (n.x > mxX) mxX = n.x;
      if (n.y > mxY) mxY = n.y;
    });

    if (mnX === Infinity) {
      mnX = 0; mxX = 0; mxY = 0;
    }

    return { nodes, links, minX: mnX, maxX: mxX, maxY: mxY };
  }, [root]);

  const paddingX = 140;
  const paddingY = 100;
  
  // Create an SVG exactly the size of the tree, or at least the container.
  // We use Math.max with containerSize so the pan area feels solid and avoids CSS clipping bugs.
  const svgWidth = Math.max(containerSize.w, (maxX - minX) + paddingX * 2);
  const svgHeight = Math.max(containerSize.h, maxY + paddingY * 2);

  // Compute the scale based on the exact dynamically observed container dimensions
  const fitScale = Math.min(containerSize.w / svgWidth, containerSize.h / svgHeight) * 0.85;

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

      <div className="absolute top-4 left-4 z-20 flex flex-col space-y-2 pointer-events-none">
        <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/5 shadow-lg text-sm pointer-events-auto">
          <span className="text-gray-400">Best Value: </span>
          <motion.span 
            key={bestValue}
            initial={{ scale: 1.5, color: '#f59e0b' }}
            animate={{ scale: 1, color: '#10b981' }}
            className="font-bold text-accent-green inline-block drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]"
          >
            ${bestValue.toFixed(2)}
          </motion.span>
          <span className="text-gray-400 ml-2">/ Cap: {capacity}</span>
        </div>
      </div>

      <TransformWrapper
        initialScale={1}
        minScale={0.05}
        maxScale={4}
        centerOnInit
        wheel={{ step: 0.1 }}
        limitToBounds={false}
        onPanningStart={() => setIsManualZoom(true)}
        onWheelStart={() => setIsManualZoom(true)}
        onPinchStart={() => setIsManualZoom(true)}
      >
        <TreeControls 
          nodeCount={nodeCount} 
          isFullscreen={isFullscreen} 
          fitScale={fitScale} 
          latestNodeId={latestNodeId} 
          isManualZoom={isManualZoom}
          setIsManualZoom={setIsManualZoom}
        />
        
        <TransformComponent wrapperClass="w-full h-full cursor-grab active:cursor-grabbing z-10 relative">
          <svg 
            width={svgWidth} 
            height={svgHeight} 
            // Removed drop-shadow-2xl here! It was causing Safari/Chrome to strictly clip the SVG 
            // bounds, ignoring overflow-visible and causing nodes to disappear mid-card when panning.
            className="origin-center overflow-visible"
          >
            <defs>
              <filter id="bloom-best" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="8" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="bloom-active" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="5" result="blur" />
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

            {/* If svgWidth is expanded to container size, we center the tree mathematically inside it */}
            <g transform={`translate(${-minX + (svgWidth - (maxX - minX)) / 2}, ${paddingY})`}>
              <AnimatePresence>
                {layoutLinks.map((link) => {
                  const source = link.source;
                  const target = link.target;
                  const isPruned = target.data.status === 'pruned';
                  const strokeColor = isPruned ? 'rgba(75,85,99,0.3)' : target.data.isInclude ? 'rgba(16,185,129,0.6)' : 'rgba(239,68,68,0.6)';
                  
                  return (
                    <g key={`${source.data.id}-${target.data.id}`}>
                      <motion.path
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: isPruned ? 0 : 0.4 }}
                        transition={{ duration: 0.4 }}
                        d={`M${source.x},${source.y} C${source.x},${(source.y + target.y) / 2} ${target.x},${(source.y + target.y) / 2} ${target.x},${target.y}`}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={8}
                        style={{ filter: 'blur(4px)' }}
                      />
                      <motion.path
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: isPruned ? 0.4 : 1 }}
                        transition={{ duration: 0.4 }}
                        d={`M${source.x},${source.y} C${source.x},${(source.y + target.y) / 2} ${target.x},${(source.y + target.y) / 2} ${target.x},${target.y}`}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={2}
                        strokeDasharray={target.data.isInclude === false ? "4,4" : "none"}
                      />
                    </g>
                  );
                })}
              </AnimatePresence>

              <AnimatePresence>
                {layoutNodes.map((node) => {
                  const data = node.data;
                  const isPruned = data.status === 'pruned';
                  const isBest = data.status === 'best';
                  const isRoot = data.level === -1;
                  
                  const radius = isRoot ? 16 : 8 + Math.max(0, (data.bound / maxBound) * 12);
                  
                  let fill = "rgba(31, 41, 55, 1)";
                  let stroke = "rgba(107, 114, 128, 1)";
                  let filter = "none";
                  let textColor = "#e5e7eb";

                  if (isBest) {
                    fill = "rgba(16, 185, 129, 0.2)";
                    stroke = "rgba(16, 185, 129, 1)";
                    filter = "url(#bloom-best)";
                  } else if (isPruned) {
                    fill = "rgba(17, 24, 39, 0.8)";
                    stroke = "rgba(55, 65, 81, 1)";
                    textColor = "#6b7280";
                  } else {
                    fill = "rgba(31, 41, 55, 1)";
                    stroke = "rgba(139, 92, 246, 0.8)";
                    filter = "url(#bloom-active)";
                  }

                  return (
                    <motion.g
                      id={`node-${data.id}`}
                      key={data.id}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ 
                        x: node.x, 
                        y: node.y,
                        scale: 1,
                        opacity: isPruned ? 0.6 : 1
                      }}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    >
                      <circle 
                        r={radius}
                        fill={fill}
                        stroke={stroke}
                        strokeWidth={2}
                        filter={filter}
                      />
                      
                      {!isRoot && (
                        <foreignObject x={-40} y={-radius - 24} width={80} height={20} className="overflow-visible pointer-events-none">
                          <div className="flex justify-center">
                            <span className={cn(
                              "text-[9px] font-bold tracking-widest px-2 py-0.5 rounded-full border shadow-sm backdrop-blur-sm",
                              data.isInclude 
                                ? "bg-accent-green/10 border-accent-green/30 text-accent-green" 
                                : "bg-accent-red/10 border-accent-red/30 text-accent-red",
                              isPruned && "opacity-50 line-through"
                            )}>
                              {data.isInclude ? 'INC' : 'EXC'} {data.level}
                            </span>
                          </div>
                        </foreignObject>
                      )}

                      <foreignObject x={-60} y={radius + 8} width={120} height={40} className="overflow-visible pointer-events-none">
                        <div className={cn("flex flex-col items-center justify-center text-center", isPruned && "opacity-50")}>
                          <div className="text-[10px] font-medium" style={{ color: textColor }}>
                            W: <span className={data.weight > capacity ? "text-accent-red font-bold" : "text-gray-300"}>{data.weight}</span> | V: <span className="text-gray-300">${data.value}</span>
                          </div>
                          <div className="text-[10px] text-accent-blue/80 font-bold tracking-wide mt-0.5">
                            B: ${data.bound.toFixed(1)}
                          </div>
                          {isPruned && (
                            <div className="text-[9px] text-accent-red font-bold mt-1 uppercase tracking-wider">
                              {data.pruneReason}
                            </div>
                          )}
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
