import React, { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GraphData } from '../algorithms/graph';
import { GraphStep } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

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

export function GraphView({ graph, setGraph, isEditable, steps = [], currentIndex = 0 }: GraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [drawingEdgeFrom, setDrawingEdgeFrom] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [hasDragged, setHasDragged] = useState(false);

  const { activeNode, visitedNodes, queuedNodes } = useMemo(() => {
    const visited = new Set<string>();
    const queued = new Set<string>();
    let active = null;

    for (let i = 0; i <= currentIndex; i++) {
      const step = steps[i];
      if (!step) continue;
      
      if (step.type === 'visit') {
        visited.add(step.node);
        active = step.node;
        queued.delete(step.node);
      } else if (step.type === 'enqueue') {
        queued.add(step.node);
        active = step.node;
      } else if (step.type === 'dequeue') {
        queued.delete(step.node);
      }
    }
    return { activeNode: active, visitedNodes: visited, queuedNodes: queued };
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

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isEditable) return;
    if (drawingEdgeFrom) {
      setDrawingEdgeFrom(null); // Cancel drawing edge on background click
      return;
    }
    
    // Add new node if clicking on background SVG
    if ((e.target as SVGElement).tagName === 'svg') {
      const rect = containerRef.current!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const idx = graph.nodes.length;
      // A-Z then AA, AB ...
      const newNodeId = idx < 26
        ? String.fromCharCode(65 + idx)
        : String.fromCharCode(65 + Math.floor((idx - 26) / 26)) + String.fromCharCode(65 + (idx - 26) % 26);
      setGraph({
        ...graph,
        nodes: [...graph.nodes, { id: newNodeId, x, y }]
      });
    }
  };

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
          setGraph({
            ...graph,
            edges: [...graph.edges, { source: drawingEdgeFrom, target: nodeId }]
          });
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

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isEditable) return;
    const rect = containerRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (drawingEdgeFrom) {
      setMousePos({ x, y });
    } else if (draggedNode) {
      const dx = e.clientX - dragStartPos.x;
      const dy = e.clientY - dragStartPos.y;
      if (!hasDragged && Math.sqrt(dx * dx + dy * dy) > 3) {
        setHasDragged(true);
      }
      
      if (hasDragged || Math.sqrt(dx * dx + dy * dy) > 3) {
        setGraph({
          ...graph,
          nodes: graph.nodes.map(n => n.id === draggedNode ? { ...n, x, y } : n)
        });
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (draggedNode) {
      if (!hasDragged) {
        // Was just a click, start drawing edge
        setDrawingEdgeFrom(draggedNode);
        const rect = containerRef.current!.getBoundingClientRect();
        setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }
      setDraggedNode(null);
      try { (e.target as Element).releasePointerCapture(e.pointerId); } catch(e){}
    }
  };

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative w-full h-[500px] bg-[#0B0F19] rounded-2xl border overflow-hidden",
        isEditable ? "border-accent-blue/50 cursor-crosshair shadow-[inset_0_0_30px_rgba(59,130,246,0.1)]" : "border-surfaceHighlight cursor-default"
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onContextMenu={e => e.preventDefault()}
    >
      {/* Premium Background: Vignette + Dots */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_0%,transparent_100%)] z-0 pointer-events-none" />
      <div className="absolute inset-0 opacity-20 z-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.3) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

      {isEditable && (
        <div className="absolute top-4 left-4 bg-black/60 text-xs px-4 py-2 rounded-xl text-gray-300 pointer-events-none font-medium backdrop-blur-md border border-white/5 z-20 shadow-lg">
          <span className="text-white">Click</span>: Add Node / Select &nbsp;•&nbsp; 
          <span className="text-white">Drag</span>: Move &nbsp;•&nbsp; 
          <span className="text-white">Click 2 Nodes</span>: Connect &nbsp;•&nbsp; 
          <span className="text-white">Right-Click</span>: Delete
        </div>
      )}

      <svg className="absolute inset-0 w-full h-full z-10" onPointerDown={handlePointerDown}>
        <defs>
          <filter id="bloom-active-node" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="bloom-visited-node" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Render edges */}
        {graph.edges.map(edge => {
          const source = graph.nodes.find(n => n.id === edge.source);
          const target = graph.nodes.find(n => n.id === edge.target);
          if (!source || !target) return null;
          
          const isTraversed = visitedNodes.has(edge.source) && visitedNodes.has(edge.target);
          const strokeColor = isTraversed ? 'rgba(139,92,246,0.6)' : 'rgba(75,85,99,0.4)';
          
          return (
            <g key={`${edge.source}-${edge.target}`} className="pointer-events-none">
              {/* Blurred under-line for bloom effect */}
              <motion.line
                x1={source.x} y1={source.y}
                x2={target.x} y2={target.y}
                stroke={strokeColor}
                strokeWidth={isTraversed ? 8 : 4}
                style={{ filter: 'blur(3px)' }}
                initial={false}
                animate={{
                  stroke: strokeColor,
                  strokeWidth: isTraversed ? 8 : 4,
                  opacity: isTraversed ? 0.6 : 0.2
                }}
                transition={{ duration: 0.4 }}
              />
              {/* Core solid line */}
              <motion.line
                x1={source.x} y1={source.y}
                x2={target.x} y2={target.y}
                stroke={strokeColor}
                strokeWidth={isTraversed ? 3 : 1.5}
                initial={false}
                animate={{
                  stroke: isTraversed ? 'rgba(139,92,246,1)' : 'rgba(107,114,128,0.5)',
                  strokeWidth: isTraversed ? 3 : 1.5
                }}
                transition={{ duration: 0.4 }}
              />
            </g>
          );
        })}

        {/* Temporary drawing edge */}
        {drawingEdgeFrom && (
          <line
            x1={graph.nodes.find(n => n.id === drawingEdgeFrom)?.x || 0}
            y1={graph.nodes.find(n => n.id === drawingEdgeFrom)?.y || 0}
            x2={mousePos.x}
            y2={mousePos.y}
            stroke="rgba(59,130,246,0.8)"
            strokeWidth={2}
            strokeDasharray="4 4"
            className="pointer-events-none"
          />
        )}

        {/* Render nodes */}
        <AnimatePresence>
          {graph.nodes.map(node => {
            const isVisited = visitedNodes.has(node.id);
            const isQueued = queuedNodes.has(node.id);
            const isActive = activeNode === node.id;
            
            // Base radius scales slightly with number of edges (degree)
            const degree = degrees[node.id] || 0;
            const baseRadius = 14 + degree * 1.5;
            const radius = isActive ? baseRadius * 1.2 : baseRadius;
            
            let fill = "rgba(31, 41, 55, 1)";
            let stroke = "rgba(107, 114, 128, 1)";
            let filter = "none";

            if (drawingEdgeFrom === node.id) {
              // Highlight the node being drawn from
              fill = "rgba(59, 130, 246, 0.4)";
              stroke = "rgba(59, 130, 246, 1)";
              filter = "url(#bloom-active-node)";
            } else if (isActive) {
              fill = "rgba(59, 130, 246, 0.2)";
              stroke = "rgba(59, 130, 246, 1)";
              filter = "url(#bloom-active-node)";
            } else if (isVisited) {
              fill = "rgba(139, 92, 246, 0.15)";
              stroke = "rgba(139, 92, 246, 0.8)";
              filter = "url(#bloom-visited-node)";
            } else if (isQueued) {
              fill = "rgba(245, 158, 11, 0.15)";
              stroke = "rgba(245, 158, 11, 0.8)";
            }

            return (
              <motion.g
                key={node.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ 
                  x: node.x, 
                  y: node.y,
                  scale: 1,
                  opacity: 1
                }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <circle
                  data-node-id={node.id}
                  r={radius}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={2}
                  filter={filter}
                  className={isEditable ? "cursor-grab active:cursor-grabbing pointer-events-auto" : "pointer-events-auto"}
                  onPointerDown={(e) => handleNodePointerDown(e, node.id)}
                />
                
                {/* Subtle external label pill */}
                <foreignObject x={-40} y={radius + 4} width={80} height={24} className="overflow-visible pointer-events-none">
                  <div className="flex justify-center">
                    <span className={cn(
                      "text-[11px] font-bold tracking-wide px-2 py-0.5 rounded-full border shadow-sm backdrop-blur-sm",
                      isActive ? "bg-accent-blue/10 border-accent-blue/30 text-accent-blue drop-shadow-[0_0_5px_rgba(59,130,246,0.5)]" :
                      isVisited ? "bg-accent-violet/10 border-accent-violet/30 text-accent-violet" :
                      isQueued ? "bg-accent-amber/10 border-accent-amber/30 text-accent-amber" :
                      "bg-surfaceHighlight/50 border-white/5 text-gray-300"
                    )}>
                      {node.id}
                    </span>
                  </div>
                </foreignObject>
              </motion.g>
            );
          })}
        </AnimatePresence>
      </svg>
    </div>
  );
}
