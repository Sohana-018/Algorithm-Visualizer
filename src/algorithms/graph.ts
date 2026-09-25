import { GraphStep } from '../types';

export interface GraphNode {
  id: string;
  x: number;
  y: number;
}

export interface GraphEdge {
  source: string;
  target: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export const bfsCode = [
  "function BFS(graph, startNode) {",
  "  let visited = new Set();",
  "  let queue = [startNode];",
  "  visited.add(startNode);",
  "  ",
  "  while (queue.length > 0) {",
  "    let current = queue.shift();",
  "    visit(current);",
  "    ",
  "    for (let neighbor of getNeighbors(current)) {",
  "      if (!visited.has(neighbor)) {",
  "        visited.add(neighbor);",
  "        queue.push(neighbor);",
  "      }",
  "    }",
  "  }",
  "}"
];

export const dfsCode = [
  "function DFS(node, visited = new Set()) {",
  "  visited.add(node);",
  "  visit(node);",
  "  ",
  "  for (let neighbor of getNeighbors(node)) {",
  "    if (!visited.has(neighbor)) {",
  "      DFS(neighbor, visited);",
  "    }",
  "  }",
  "}"
];

export function generateBfsSteps(graph: GraphData, startNodeId: string): GraphStep[] {
  const steps: GraphStep[] = [];
  const visited = new Set<string>();
  const queue: string[] = [];
  
  // build adjacency list
  const adj = new Map<string, string[]>();
  graph.nodes.forEach(n => adj.set(n.id, []));
  graph.edges.forEach(e => {
    adj.get(e.source)?.push(e.target);
    adj.get(e.target)?.push(e.source);
  });

  queue.push(startNodeId);
  visited.add(startNodeId);
  steps.push({ type: 'enqueue', node: startNodeId, description: `Enqueue starting node ${startNodeId}`, lines: [2, 3] });

  while (queue.length > 0) {
    const current = queue.shift()!;
    steps.push({ type: 'dequeue', node: current, description: `Dequeue node ${current} and visit it`, lines: [6] });
    steps.push({ type: 'visit', node: current, description: `Visiting node ${current}`, lines: [7] });

    const neighbors = adj.get(current) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
        steps.push({ type: 'enqueue', node: neighbor, description: `Found unvisited neighbor ${neighbor}. Enqueueing.`, lines: [11, 12] });
      }
    }
  }

  steps.push({ type: 'complete', description: 'BFS traversal complete!', lines: [17] });
  return steps;
}

export function generateDfsSteps(graph: GraphData, startNodeId: string): GraphStep[] {
  const steps: GraphStep[] = [];
  const visited = new Set<string>();
  
  const adj = new Map<string, string[]>();
  graph.nodes.forEach(n => adj.set(n.id, []));
  graph.edges.forEach(e => {
    adj.get(e.source)?.push(e.target);
    adj.get(e.target)?.push(e.source);
  });

  function dfs(nodeId: string) {
    visited.add(nodeId);
    steps.push({ type: 'visit', node: nodeId, description: `Visiting node ${nodeId}`, lines: [1, 2] });

    const neighbors = adj.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        steps.push({ type: 'enqueue', node: neighbor, description: `Discovered unvisited neighbor ${neighbor} from ${nodeId}. Traversing down.`, lines: [5, 6] });
        dfs(neighbor);
      }
    }
  }

  dfs(startNodeId);
  steps.push({ type: 'complete', description: 'DFS traversal complete!', lines: [10] });
  return steps;
}
