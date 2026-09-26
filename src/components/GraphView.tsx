import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GraphData } from '../algorithms/graph';
import { GraphStep } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { HelpCircle } from 'lucide-react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface GraphViewProps {
  graph: GraphData;
  setGraph: (g: GraphData) => void;
  isEditable: boolean;
  steps?: GraphStep[];
  currentIndex?: number;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Transform a client-space point into SVG/graph-space given current pan+zoom */
function toGraphCoords(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  tx: number,
  ty: number,
  scale: number
) {
  return {
    x: (clientX - rect.left - tx) / scale,
    y: (clientY - rect.top  - ty) / scale,
  };
}

const NODE_PADDING = 60; // px padding around bounding box when auto-fitting
const MIN_SCALE    = 0.15;
const MAX_SCALE    = 4;

// ─── component ────────────────────────────────────────────────────────────────

export function GraphView({ graph, setGraph, isEditable, steps = [], currentIndex = 0 }: GraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef       = useRef<SVGSVGElement>(null);

  // ── pan / zoom state ──────────────────────────────────────────────────────
  const [tx, setTx]           = useState(0);
  const [ty, setTy]           = useState(0);
  const [scale, setScale]     = useState(1);
  const [isManualPan, setIsManualPan] = useState(false);

  // ── editor interaction state ───────────────────────────────────────────────
  const [draggedNode, setDraggedNode]     = useState<string | null>(null);
  const [drawingEdgeFrom, setDrawingEdgeFrom] = useState<string | null>(null);
  const [mousePos, setMousePos]           = useState({ x: 0, y: 0 });
  const [dragStartPos, setDragStartPos]   = useState({ x: 0, y: 0 });
  const [hasDragged, setHasDragged]       = useState(false);
  const [isPanning, setIsPanning]         = useState(false);
  const [panStart, setPanStart]           = useState({ x: 0, y: 0, tx: 0, ty: 0 });

  // ── instructions tooltip ───────────────────────────────────────────────────
  const [showHelp, setShowHelp] = useState(false);

  // ── container size ─────────────────────────────────────────────────────────
  const [containerSize, setContainerSize] = useState({ w: 800, h: 500 });
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        setContainerSize({ w: e.contentRect.width, h: e.contentRect.height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── auto-fit: center all nodes whenever they change (unless user panned) ───
  const autoFit = useCallback(() => {
    if (graph.nodes.length === 0) {
      setTx(0); setTy(0); setScale(1);
      return;
    }
    const { w, h } = containerSize;
    const xs = graph.nodes.map(n => n.x);
    const ys = graph.nodes.map(n => n.y);
    const minX = Math.min(...xs) - NODE_PADDING;
    const minY = Math.min(...ys) - NODE_PADDING;
    const maxX = Math.max(...xs) + NODE_PADDING;
    const maxY = Math.max(...ys) + NODE_PADDING;
    const bw = maxX - minX;
    const bh = maxY - minY;
    const s = Math.min(w / bw, h / bh, 1.5); // never zoom in more than 1.5×
    const clampedS = Math.max(MIN_SCALE, Math.min(MAX_SCALE, s));
    setScale(clampedS);
    setTx(w / 2 - (minX + bw / 2) * clampedS);
    setTy(h / 2 - (minY + bh / 2) * clampedS);
  }, [graph.nodes, containerSize]);

  useEffect(() => {
    if (!isManualPan) autoFit();
  }, [graph.nodes.length, containerSize, isManualPan, autoFit]);

  // reset manual pan flag and re-fit when graph resets (0 → nodes appear)
  const prevNodeCount = useRef(graph.nodes.length);
  useEffect(() => {
    if (prevNodeCount.current > 0 && graph.nodes.length === 0) {
      setIsManualPan(false);
    }
    prevNodeCount.current = graph.nodes.length;
  }, [graph.nodes.length]);

  // ── traversal state ────────────────────────────────────────────────────────
  const { activeNode, visitedNodes, queuedNodes, traversalOrder, isComplete } = useMemo(() => {
    const visited = new Set<string>();
    const queued  = new Set<string>();
    let active: string | null = null;
    let traversalOrder: string[] = [];
    let isComplete = false;

    for (let i = 0; i <= currentIndex; i++) {
      const step = steps[i];
      if (!step) continue;
      if (step.type === 'visit')    { visited.add(step.node); active = step.node; queued.delete(step.node); }
      else if (step.type === 'enqueue') { queued.add(step.node); active = step.node; }
      else if (step.type === 'dequeue') { queued.delete(step.node); }
      else if (step.type === 'complete') { traversalOrder = step.traversalOrder; isComplete = true; }
    }
    return { activeNode: active, visitedNodes: visited, queuedNodes: queued, traversalOrder, isComplete };
  }, [steps, currentIndex]);

  const degrees = useMemo(() => {
    const deg: Record<string, number> = {};
    graph.nodes.forEach(n => deg[n.id] = 0);
    graph.edges.forEach(e => {
      if (deg[e.source] !== undefined) deg[e.source]++;
      if (deg[e.target] !== undefined) deg[e.target]++;
    });
    return deg;
  }, [graph]);

  // ── wheel zoom ─────────────────────────────────────────────────────────────
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = containerRef.current!.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const delta  = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(prev => {
      const next = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev * delta));
      setTx(t => mouseX - (mouseX - t) * (next / prev));
      setTy(t => mouseY - (mouseY - t) * (next / prev));
      return next;
    });
    setIsManualPan(true);
  }, []);

  // ── SVG background pointer events (add node / pan) ─────────────────────────
  const handleSvgPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isEditable) return;
    if (drawingEdgeFrom) { setDrawingEdgeFrom(null); return; }
    if ((e.target as SVGElement).tagName !== 'svg') return;

    if (e.button === 0) {
      // We'll decide on pointer-up whether this was a click (add node) or a drag (pan)
      setPanStart({ x: e.clientX, y: e.clientY, tx, ty });
      setIsPanning(true);
      setHasDragged(false);
      (e.target as Element).setPointerCapture(e.pointerId);
    }
  };

  const handleSvgPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = containerRef.current!.getBoundingClientRect();

    if (drawingEdgeFrom) {
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      return;
    }

    if (draggedNode) {
      const dx = e.clientX - dragStartPos.x;
      const dy = e.clientY - dragStartPos.y;
      if (!hasDragged && Math.hypot(dx, dy) > 3) setHasDragged(true);
      if (hasDragged || Math.hypot(dx, dy) > 3) {
        const g = toGraphCoords(e.clientX, e.clientY, rect, tx, ty, scale);
        setGraph({ ...graph, nodes: graph.nodes.map(n => n.id === draggedNode ? { ...n, ...g } : n) });
      }
      return;
    }

    if (isPanning) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      if (!hasDragged && Math.hypot(dx, dy) > 4) {
        setHasDragged(true);
        setIsManualPan(true);
      }
      if (hasDragged) {
        setTx(panStart.tx + dx);
        setTy(panStart.ty + dy);
      }
    }
  };

  const handleSvgPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (draggedNode) {
      if (!hasDragged) {
        const rect = containerRef.current!.getBoundingClientRect();
        setDrawingEdgeFrom(draggedNode);
        setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }
      setDraggedNode(null);
      try { (e.target as Element).releasePointerCapture(e.pointerId); } catch(_) {}
      return;
    }

    if (isPanning) {
      setIsPanning(false);
      if (!hasDragged && isEditable) {
        // It was a click on the background → add a new node
        const rect = containerRef.current!.getBoundingClientRect();
        const g = toGraphCoords(e.clientX, e.clientY, rect, tx, ty, scale);
        const idx = graph.nodes.length;
        const newNodeId = idx < 26
          ? String.fromCharCode(65 + idx)
          : String.fromCharCode(65 + Math.floor((idx - 26) / 26)) + String.fromCharCode(65 + (idx - 26) % 26);
        setGraph({ ...graph, nodes: [...graph.nodes, { id: newNodeId, x: g.x, y: g.y }] });
      }
      try { (e.target as Element).releasePointerCapture(e.pointerId); } catch(_) {}
    }
  };

  // ── node interaction ───────────────────────────────────────────────────────
  const handleNodePointerDown = (e: React.PointerEvent, nodeId: string) => {
    if (!isEditable) return;
    e.stopPropagation();

    if (drawingEdgeFrom) {
      if (drawingEdgeFrom !== nodeId) {
        const edgeExists = graph.edges.some(
          edge => (edge.source === drawingEdgeFrom && edge.target === nodeId) ||
                  (edge.target === drawingEdgeFrom && edge.source === nodeId)
        );
        if (!edgeExists) {
          setGraph({ ...graph, edges: [...graph.edges, { source: drawingEdgeFrom, target: nodeId }] });
        }
      }
      setDrawingEdgeFrom(null);
      return;
    }

    if (e.button === 2 || e.ctrlKey) {
      setGraph({
        nodes: graph.nodes.filter(n => n.id !== nodeId),
        edges: graph.edges.filter(edge => edge.source !== nodeId && edge.target !== nodeId)
      });
    } else {
      setDraggedNode(nodeId);
      setDragStartPos({ x: e.clientX, y: e.clientY });
      setHasDragged(false);
      (e.target as Element).setPointerCapture(e.pointerId);
    }
  };

  // ── derived values for temporary edge line ─────────────────────────────────
  const drawingFromNode = graph.nodes.find(n => n.id === drawingEdgeFrom);
  // The temp line is in SVG client coords; convert node graph coords → screen coords
  const edgeLineX1 = drawingFromNode ? drawingFromNode.x * scale + tx : 0;
  const edgeLineY1 = drawingFromNode ? drawingFromNode.y * scale + ty : 0;

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full h-[500px] bg-[#0B0F19] rounded-2xl border overflow-hidden select-none",
        isEditable
          ? "border-accent-blue/50 cursor-crosshair shadow-[inset_0_0_30px_rgba(59,130,246,0.1)]"
          : "border-surfaceHighlight cursor-default"
      )}
      onContextMenu={e => e.preventDefault()}
    >
      {/* Premium Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_0%,transparent_100%)] z-0 pointer-events-none" />
      <div className="absolute inset-0 opacity-20 z-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.3) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

      {/* ── Collapsible instructions icon (top-right, never overlaps graph) ── */}
      {isEditable && (
        <div className="absolute top-3 right-3 z-30">
          <div className="relative">
            <button
              className="w-7 h-7 flex items-center justify-center rounded-full bg-black/60 border border-white/10 text-gray-400 hover:text-white hover:border-white/30 transition-colors backdrop-blur-md shadow-lg"
              onMouseEnter={() => setShowHelp(true)}
              onMouseLeave={() => setShowHelp(false)}
              onClick={() => setShowHelp(v => !v)}
              title="Controls"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
            <AnimatePresence>
              {showHelp && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full right-0 mt-2 w-64 bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl px-4 py-3 text-xs text-gray-300 shadow-2xl pointer-events-none z-40"
                >
                  <p className="font-semibold text-white mb-1.5">Graph Controls</p>
                  <ul className="space-y-1">
                    <li><span className="text-white font-medium">Click canvas</span> — add node</li>
                    <li><span className="text-white font-medium">Drag canvas</span> — pan view</li>
                    <li><span className="text-white font-medium">Scroll</span> — zoom in / out</li>
                    <li><span className="text-white font-medium">Click node</span> — start edge</li>
                    <li><span className="text-white font-medium">Click 2nd node</span> — connect</li>
                    <li><span className="text-white font-medium">Drag node</span> — move it</li>
                    <li><span className="text-white font-medium">Right-click node</span> — delete</li>
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* ── Main SVG canvas ─────────────────────────────────────────────── */}
      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full z-10"
        onPointerDown={handleSvgPointerDown}
        onPointerMove={handleSvgPointerMove}
        onPointerUp={handleSvgPointerUp}
        onWheel={handleWheel}
      >
        <defs>
          <filter id="bloom-active-node" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="bloom-visited-node" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* ── Temporary edge-drawing line (in screen space, outside transform) */}
        {drawingEdgeFrom && drawingFromNode && (
          <line
            x1={edgeLineX1} y1={edgeLineY1}
            x2={mousePos.x}  y2={mousePos.y}
            stroke="rgba(59,130,246,0.8)"
            strokeWidth={2}
            strokeDasharray="4 4"
            className="pointer-events-none"
          />
        )}

        {/* ── Everything inside the pan/zoom transform ─────────────────── */}
        <g transform={`translate(${tx},${ty}) scale(${scale})`}>

          {/* Edges */}
          {graph.edges.map(edge => {
            const source = graph.nodes.find(n => n.id === edge.source);
            const target = graph.nodes.find(n => n.id === edge.target);
            if (!source || !target) return null;
            const isTraversed = visitedNodes.has(edge.source) && visitedNodes.has(edge.target);
            const strokeColor = isTraversed ? 'rgba(139,92,246,0.6)' : 'rgba(75,85,99,0.4)';

            return (
              <g key={`${edge.source}-${edge.target}`} className="pointer-events-none">
                <motion.line
                  x1={source.x} y1={source.y} x2={target.x} y2={target.y}
                  stroke={strokeColor}
                  strokeWidth={isTraversed ? 8 : 4}
                  style={{ filter: 'blur(3px)' }}
                  initial={false}
                  animate={{ stroke: strokeColor, strokeWidth: isTraversed ? 8 : 4, opacity: isTraversed ? 0.6 : 0.2 }}
                  transition={{ duration: 0.4 }}
                />
                <motion.line
                  x1={source.x} y1={source.y} x2={target.x} y2={target.y}
                  strokeWidth={isTraversed ? 3 : 1.5}
                  initial={false}
                  animate={{ stroke: isTraversed ? 'rgba(139,92,246,1)' : 'rgba(107,114,128,0.5)', strokeWidth: isTraversed ? 3 : 1.5 }}
                  transition={{ duration: 0.4 }}
                />
              </g>
            );
          })}

          {/* Nodes */}
          <AnimatePresence>
            {graph.nodes.map(node => {
              const isVisited = visitedNodes.has(node.id);
              const isQueued  = queuedNodes.has(node.id);
              const isActive  = activeNode === node.id;
              const degree    = degrees[node.id] || 0;
              const baseRadius = 14 + degree * 1.5;
              const radius     = isActive ? baseRadius * 1.2 : baseRadius;

              let fill   = 'rgba(31,41,55,1)';
              let stroke = 'rgba(107,114,128,1)';
              let filter = 'none';

              if (drawingEdgeFrom === node.id) {
                fill = 'rgba(59,130,246,0.4)'; stroke = 'rgba(59,130,246,1)'; filter = 'url(#bloom-active-node)';
              } else if (isActive) {
                fill = 'rgba(59,130,246,0.2)'; stroke = 'rgba(59,130,246,1)'; filter = 'url(#bloom-active-node)';
              } else if (isVisited) {
                fill = 'rgba(139,92,246,0.15)'; stroke = 'rgba(139,92,246,0.8)'; filter = 'url(#bloom-visited-node)';
              } else if (isQueued) {
                fill = 'rgba(245,158,11,0.15)'; stroke = 'rgba(245,158,11,0.8)';
              }

              return (
                <motion.g
                  key={node.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ x: node.x, y: node.y, scale: 1, opacity: 1 }}
                  exit={{ opacity: 0, scale: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  <circle
                    r={radius}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={2}
                    filter={filter}
                    className={isEditable ? 'cursor-grab active:cursor-grabbing pointer-events-auto' : 'pointer-events-auto'}
                    onPointerDown={e => handleNodePointerDown(e, node.id)}
                  />
                  <foreignObject x={-40} y={radius + 4} width={80} height={24} className="overflow-visible pointer-events-none">
                    <div className="flex justify-center">
                      <span className={cn(
                        'text-[11px] font-bold tracking-wide px-2 py-0.5 rounded-full border shadow-sm backdrop-blur-sm',
                        isActive   ? 'bg-accent-blue/10 border-accent-blue/30 text-accent-blue drop-shadow-[0_0_5px_rgba(59,130,246,0.5)]'  :
                        isVisited  ? 'bg-accent-violet/10 border-accent-violet/30 text-accent-violet' :
                        isQueued   ? 'bg-accent-amber/10 border-accent-amber/30 text-accent-amber'    :
                                     'bg-surfaceHighlight/50 border-white/5 text-gray-300'
                      )}>
                        {node.id}
                      </span>
                    </div>
                  </foreignObject>
                </motion.g>
              );
            })}
          </AnimatePresence>
        </g>
      </svg>

      {/* ── Traversal Order Banner ────────────────────────────────────────── */}
      <AnimatePresence>
        {isComplete && traversalOrder.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="absolute bottom-4 left-4 right-4 z-20 pointer-events-none"
          >
            <div className="bg-black/70 backdrop-blur-xl border border-accent-green/40 rounded-2xl px-5 py-4 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
              <div className="flex items-center gap-2 mb-2.5">
                <div className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-accent-green">Traversal Complete</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {traversalOrder.map((nodeId, i) => (
                  <React.Fragment key={i}>
                    <motion.span
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05, type: 'spring', stiffness: 400, damping: 20 }}
                      className="px-2.5 py-1 rounded-lg bg-accent-violet/20 border border-accent-violet/40 text-accent-violet text-sm font-bold shadow-[0_0_8px_rgba(139,92,246,0.3)]"
                    >
                      {nodeId}
                    </motion.span>
                    {i < traversalOrder.length - 1 && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.05 + 0.03 }}
                        className="text-gray-500 text-sm font-bold select-none"
                      >
                        →
                      </motion.span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
