import { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TransformWrapper, TransformComponent, useControls } from 'react-zoom-pan-pinch';
import type { KnapsackStep } from '../types';
import * as d3 from 'd3-hierarchy';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ZoomIn, ZoomOut, Maximize, PackageOpen } from 'lucide-react';

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
  stepsKey?: number;
}

interface TreeControlsProps {
  nodeCount: number;
  isFullscreen: boolean;
  fitScale: number;
  latestNodeId: string;
  isManualZoom: boolean;
  setIsManualZoom: (val: boolean) => void;
  stepsKey: number;
}

// ─── tree controls ────────────────────────────────────────────────────────────
function TreeControls({ nodeCount, isFullscreen, fitScale, latestNodeId, isManualZoom, setIsManualZoom, stepsKey }: TreeControlsProps) {
  const { zoomIn, zoomOut, zoomToElement } = useControls();

  useEffect(() => {
    if (isManualZoom) return;
    const timer = setTimeout(() => {
      const MIN_SCALE = 0.55;
      if (fitScale < MIN_SCALE && latestNodeId) {
        try { zoomToElement(`node-${latestNodeId}`, 0.7, 400); }
        catch (_) { zoomToElement('tree-bounds', fitScale, 400); }
      } else {
        zoomToElement('tree-bounds', fitScale, 400);
      }
    }, 250);
    return () => clearTimeout(timer);
  // stepsKey ensures this fires even when nodeCount doesn't change (e.g. mode switch with 1 node → 1 node)
  }, [nodeCount, isFullscreen, fitScale, latestNodeId, zoomToElement, isManualZoom, stepsKey]);

  return (
    <div className="absolute top-4 right-4 z-20 flex space-x-2 bg-black/60 p-1.5 rounded-xl border border-white/10 backdrop-blur-md shadow-xl">
      <button onClick={() => { setIsManualZoom(true); zoomOut(0.2); }} className="p-2 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white transition-colors" title="Zoom Out"><ZoomOut className="w-5 h-5"/></button>
      <button onClick={() => { setIsManualZoom(false); zoomToElement('tree-bounds', fitScale, 400); }} className="p-2 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white transition-colors" title="Fit to Screen"><Maximize className="w-5 h-5"/></button>
      <button onClick={() => { setIsManualZoom(true); zoomIn(0.2); }} className="p-2 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white transition-colors" title="Zoom In"><ZoomIn className="w-5 h-5"/></button>
    </div>
  );
}

// ─── bezier path helper ───────────────────────────────────────────────────────
function bezierPath(sx: number, sy: number, tx: number, ty: number): string {
  const cy = (sy + ty) / 2;
  return `M${sx},${sy} C${sx},${cy} ${tx},${cy} ${tx},${ty}`;
}

// ─── main component ───────────────────────────────────────────────────────────
export function KnapsackView({ steps, currentIndex, capacity, isFullscreen = false, stepsKey = 0 }: KnapsackViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 800, h: 500 });
  const [isManualZoom, setIsManualZoom] = useState(false);

  // Reset auto-fit on every mode/input change (stepsKey increments)
  useEffect(() => {
    setIsManualZoom(false);
  }, [stepsKey]);

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

  // ── build tree state from steps ───────────────────────────────────────────
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
          id: step.id, parentId: step.parentId, level: step.level,
          weight: step.weight, value: step.value, bound: step.bound,
          isInclude: step.isInclude, status: 'active', children: []
        });
        count++;
        lastMod = step.id;
      } else if (step.type === 'prune') {
        const node = nodes.get(step.id);
        if (node) { node.status = 'pruned'; node.pruneReason = step.reason; }
        lastMod = step.id;
      } else if (step.type === 'updateBest') {
        currentBest = step.bestValue;
        if (currentBestNode && nodes.has(currentBestNode)) nodes.get(currentBestNode)!.status = 'active';
        currentBestNode = step.bestNodeId;
        const node = nodes.get(step.bestNodeId);
        if (node) node.status = 'best';
        lastMod = step.bestNodeId;
      }
    }

    let rootNode: TreeNode | null = null;
    nodes.forEach(node => {
      if (node.parentId === null) { rootNode = node; }
      else {
        const parent = nodes.get(node.parentId);
        if (parent) { if (!parent.children) parent.children = []; parent.children.push(node); }
      }
    });

    return { root: rootNode, bestValue: currentBest, nodeCount: count, maxBound: maxB, latestNodeId: lastMod };
  }, [steps, currentIndex]);

  // ── d3 layout ─────────────────────────────────────────────────────────────
  const { nodes: layoutNodes, links: layoutLinks, minX, maxX, maxY } = useMemo(() => {
    if (!root) return { nodes: [], links: [], minX: 0, maxX: 0, maxY: 0 };
    const hierarchy = d3.hierarchy<TreeNode>(root as TreeNode);
    const treeLayout = d3.tree<TreeNode>().nodeSize([170, 130]);
    const rootData = treeLayout(hierarchy);
    const nodes = rootData.descendants();
    const links = rootData.links();
    let mnX = Infinity, mxX = -Infinity, mxY = -Infinity;
    nodes.forEach(n => {
      if (n.x < mnX) mnX = n.x;
      if (n.x > mxX) mxX = n.x;
      if (n.y > mxY) mxY = n.y;
    });
    if (mnX === Infinity) { mnX = 0; mxX = 0; mxY = 0; }
    return { nodes, links, minX: mnX, maxX: mxX, maxY: mxY };
  }, [root]);

  const paddingX = 160;
  const paddingY = 110;
  const svgWidth  = Math.max(containerSize.w, (maxX - minX) + paddingX * 2);
  const svgHeight = Math.max(containerSize.h, maxY + paddingY * 2);
  const fitScale  = Math.min(containerSize.w / svgWidth, containerSize.h / svgHeight) * 0.85;

  // ── edge color helpers (solid, no gradient IDs needed) ────────────────────
  const getEdgeColor = useCallback((isPruned: boolean, isInclude: boolean | null) => {
    if (isPruned) return 'rgba(55,65,81,0.4)';
    if (isInclude) return 'rgba(16,185,129,0.85)';
    return 'rgba(239,68,68,0.85)';
  }, []);

  // Empty-state guard
  const isEmpty = steps.length === 0;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full rounded-2xl border border-surfaceHighlight overflow-hidden",
        isFullscreen ? "h-full" : "h-[500px]"
      )}
    >
      {/* ── Background ────────────────────────────────────────────────────── */}
      <div className="absolute inset-0 bg-[#080C16] z-0" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_30%,rgba(139,92,246,0.06)_0%,transparent_70%)] z-0 pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.12] z-0 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.35) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#080C16] to-transparent z-0 pointer-events-none" />

      {/* ── Empty state ───────────────────────────────────────────────────── */}
      {isEmpty && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 text-gray-500">
          <PackageOpen className="w-10 h-10 opacity-40" />
          <p className="text-sm font-medium">Add at least one item and press Play to begin.</p>
        </div>
      )}

      {/* ── Best Value HUD ────────────────────────────────────────────────── */}
      {!isEmpty && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div className="bg-black/75 backdrop-blur-xl px-7 py-3 rounded-2xl border border-accent-green/25
                          shadow-[0_8px_32px_rgba(16,185,129,0.18),inset_0_1px_0_rgba(255,255,255,0.06)]
                          flex items-center gap-4">
            <span className="text-gray-400 text-sm font-medium tracking-wide">Best Value</span>
            <div className="h-4 w-px bg-white/15" />
            <motion.span
              key={bestValue}
              initial={{ scale: 1.6, color: '#f59e0b' }}
              animate={{ scale: 1,   color: '#10b981' }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="font-black text-2xl text-accent-green drop-shadow-[0_0_14px_rgba(16,185,129,0.55)]"
            >
              ${bestValue.toFixed(2)}
            </motion.span>
            <div className="h-4 w-px bg-white/15" />
            <span className="text-gray-500 text-xs font-mono">Cap: {capacity}</span>
          </div>
        </div>
      )}

      {/* ── Pan/Zoom Wrapper ──────────────────────────────────────────────── */}
      <TransformWrapper
        initialScale={1} minScale={0.05} maxScale={4} centerOnInit
        wheel={{ step: 0.1 }} limitToBounds={false}
        onPanningStart={() => setIsManualZoom(true)}
        onWheelStart={()   => setIsManualZoom(true)}
        onPinchStart={()   => setIsManualZoom(true)}
      >
        <TreeControls
          nodeCount={nodeCount} isFullscreen={isFullscreen} fitScale={fitScale}
          latestNodeId={latestNodeId} isManualZoom={isManualZoom} setIsManualZoom={setIsManualZoom}
          stepsKey={stepsKey}
        />

        <TransformComponent wrapperClass="w-full h-full cursor-grab active:cursor-grabbing z-10 relative">
          <svg width={svgWidth} height={svgHeight} className="origin-center overflow-visible">
            <defs>
              {/* ── Node fill gradients ─────────────────────────────── */}
              <radialGradient id="ng-best" cx="40%" cy="35%" r="70%">
                <stop offset="0%"   stopColor="#fbbf24" stopOpacity="0.55" />
                <stop offset="50%"  stopColor="#f59e0b" stopOpacity="0.20" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.08" />
              </radialGradient>
              <radialGradient id="ng-active" cx="40%" cy="35%" r="70%">
                <stop offset="0%"   stopColor="#a78bfa" stopOpacity="0.50" />
                <stop offset="60%"  stopColor="#7c3aed" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0.05" />
              </radialGradient>
              <radialGradient id="ng-root" cx="40%" cy="35%" r="70%">
                <stop offset="0%"   stopColor="#60a5fa" stopOpacity="0.50" />
                <stop offset="70%"  stopColor="#1d4ed8" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#0f172a" stopOpacity="0.05" />
              </radialGradient>
              <radialGradient id="ng-pruned" cx="50%" cy="50%" r="60%">
                <stop offset="0%"   stopColor="#374151" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#111827" stopOpacity="0.5" />
              </radialGradient>

              {/* ── Glow filters ────────────────────────────────────── */}
              <filter id="bloom-best" x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur1" />
                <feGaussianBlur in="SourceGraphic" stdDeviation="5"  result="blur2" />
                <feMerge>
                  <feMergeNode in="blur1" />
                  <feMergeNode in="blur2" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="bloom-active" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="bloom-root" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="f-pruned" x="-10%" y="-10%" width="120%" height="120%">
                <feColorMatrix type="saturate" values="0.05" />
              </filter>
            </defs>

            {/* Invisible rect for zoomToElement("tree-bounds") */}
            <rect id="tree-bounds" x={0} y={0} width={svgWidth} height={svgHeight} fill="transparent" pointerEvents="none" />

            {/* ── Tree group (centred) ─────────────────────────────────── */}
            <g transform={`translate(${-minX + (svgWidth - (maxX - minX)) / 2}, ${paddingY})`}>

              {/* ── Edges ─────────────────────────────────────────────── */}
              <AnimatePresence>
                {layoutLinks.map(link => {
                  const src = link.source, tgt = link.target;
                  const isPruned = tgt.data.status === 'pruned';
                  const isBestPath = tgt.data.status === 'best' || src.data.status === 'best';
                  const edgeColor = getEdgeColor(isPruned, tgt.data.isInclude);
                  const d = bezierPath(src.x, src.y, tgt.x, tgt.y);
                  const mx = (src.x + tgt.x) / 2;
                  const my = (src.y + tgt.y) / 2;

                  return (
                    <g key={`${src.data.id}-${tgt.data.id}`}>
                      {/* Glow under-stroke */}
                      <motion.path
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: isPruned ? 0.04 : isBestPath ? 0.45 : 0.15 }}
                        transition={{ duration: 0.45, ease: 'easeOut' }}
                        d={d} fill="none"
                        stroke={edgeColor}
                        strokeWidth={isBestPath ? 14 : 9}
                        style={{ filter: 'blur(5px)' }}
                      />
                      {/* Core stroke */}
                      <motion.path
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: isPruned ? 0.18 : 1 }}
                        transition={{ duration: 0.45, ease: 'easeOut' }}
                        d={d} fill="none"
                        stroke={edgeColor}
                        strokeWidth={isBestPath ? 2.5 : isPruned ? 1 : 1.8}
                        strokeDasharray={tgt.data.isInclude === false && !isPruned ? '5 4' : undefined}
                      />

                      {/* INC / EXC badge at midpoint — use motion.g (not motion.foreignObject) for scale */}
                      {!isPruned && (
                        <motion.g
                          initial={{ opacity: 0, scale: 0.6 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.25, delay: 0.3 }}
                          style={{ transformOrigin: `${mx}px ${my}px` }}
                        >
                          <foreignObject x={mx - 18} y={my - 9} width={36} height={18} className="overflow-visible pointer-events-none">
                            <div className="flex justify-center">
                              <span className={cn(
                                "text-[8px] font-black tracking-widest px-1.5 py-0.5 rounded-full border leading-none",
                                tgt.data.isInclude
                                  ? "bg-accent-green/15 border-accent-green/40 text-accent-green shadow-[0_0_6px_rgba(16,185,129,0.4)]"
                                  : "bg-accent-red/15 border-accent-red/40 text-accent-red"
                              )}>
                                {tgt.data.isInclude ? 'IN' : 'EX'}
                              </span>
                            </div>
                          </foreignObject>
                        </motion.g>
                      )}
                    </g>
                  );
                })}
              </AnimatePresence>

              {/* ── Nodes ─────────────────────────────────────────────── */}
              <AnimatePresence>
                {layoutNodes.map(node => {
                  const data = node.data;
                  const isPruned = data.status === 'pruned';
                  const isBest   = data.status === 'best';
                  const isRoot   = data.level === -1;

                  const baseR = isRoot ? 17 : Math.max(10, 13 + Math.round((data.bound / maxBound) * 10));

                  let fillGrad   = 'url(#ng-active)';
                  let strokeCol  = 'rgba(139,92,246,0.85)';
                  let strokeW    = 1.8;
                  let glowFilter = 'url(#bloom-active)';
                  let nodeOpacity = 1;

                  if (isRoot) {
                    fillGrad = 'url(#ng-root)'; strokeCol = 'rgba(96,165,250,0.9)'; glowFilter = 'url(#bloom-root)'; strokeW = 1.8;
                  } else if (isBest) {
                    fillGrad = 'url(#ng-best)'; strokeCol = 'rgba(251,191,36,0.95)'; glowFilter = 'url(#bloom-best)'; strokeW = 2.5;
                  } else if (isPruned) {
                    fillGrad = 'url(#ng-pruned)'; strokeCol = 'rgba(55,65,81,0.5)'; glowFilter = 'url(#f-pruned)'; strokeW = 1; nodeOpacity = 0.22;
                  }

                  const boundColor = isPruned ? '#4b5563' : isBest ? '#fbbf24' : '#a78bfa';
                  const wvColor    = isPruned ? '#374151' : '#94a3b8';
                  const cardW = 112, cardH = isPruned ? 52 : 46;

                  return (
                    <motion.g
                      id={`node-${data.id}`}
                      key={data.id}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ x: node.x, y: node.y, scale: 1, opacity: nodeOpacity }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
                    >
                      {/* Outer glow ring */}
                      {(isBest || (!isPruned && !isRoot)) && (
                        <circle
                          r={baseR + (isBest ? 6 : 4)}
                          fill="none"
                          stroke={isBest ? 'rgba(251,191,36,0.18)' : 'rgba(139,92,246,0.12)'}
                          strokeWidth={isBest ? 8 : 6}
                        />
                      )}

                      {/* Node circle */}
                      <circle
                        r={baseR}
                        fill={fillGrad}
                        stroke={strokeCol}
                        strokeWidth={strokeW}
                        filter={glowFilter}
                      />

                      {/* INC/EXC pill above node */}
                      {!isRoot && (
                        <foreignObject x={-22} y={-baseR - 22} width={44} height={18} className="overflow-visible pointer-events-none">
                          <div className="flex justify-center">
                            <span className={cn(
                              "text-[8px] font-black tracking-widest px-1.5 py-0.5 rounded-full border leading-none",
                              isPruned
                                ? "bg-gray-800/50 border-gray-700/40 text-gray-600"
                                : data.isInclude
                                ? "bg-accent-green/10 border-accent-green/30 text-accent-green"
                                : "bg-accent-red/10 border-accent-red/30 text-accent-red"
                            )}>
                              {data.isInclude ? 'INC' : 'EXC'} {data.level}
                            </span>
                          </div>
                        </foreignObject>
                      )}

                      {/* Info card below node */}
                      <foreignObject
                        x={-cardW / 2} y={baseR + 7}
                        width={cardW} height={cardH}
                        className="overflow-visible pointer-events-none"
                      >
                        <div
                          className={cn(
                            "flex flex-col items-center justify-center text-center rounded-xl px-2 py-1.5 border backdrop-blur-sm",
                            isBest
                              ? "bg-amber-950/60 border-amber-500/30 shadow-[0_2px_12px_rgba(245,158,11,0.25)]"
                              : isPruned
                              ? "bg-gray-900/40 border-gray-700/20"
                              : "bg-[#0d1321]/80 border-violet-500/15 shadow-[0_2px_10px_rgba(0,0,0,0.5)]"
                          )}
                        >
                          {/* Bound — primary emphasis */}
                          <div
                            className="font-black text-[11px] leading-tight tracking-wide"
                            style={{ color: boundColor, textShadow: isPruned ? 'none' : `0 0 8px ${boundColor}55` }}
                          >
                            B: ${data.bound.toFixed(1)}
                          </div>

                          {/* W / V — secondary */}
                          <div className="text-[9px] font-medium mt-0.5 leading-tight" style={{ color: wvColor }}>
                            W:&nbsp;
                            <span style={{ color: data.weight > capacity ? '#f87171' : wvColor, fontWeight: data.weight > capacity ? 700 : 500 }}>
                              {data.weight}
                            </span>
                            &nbsp;·&nbsp;V:&nbsp;{data.value}
                          </div>

                          {/* Prune reason */}
                          {isPruned && data.pruneReason && (
                            <div className="text-[8px] font-bold mt-0.5 uppercase tracking-wider text-accent-red">
                              ✕ {data.pruneReason}
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
