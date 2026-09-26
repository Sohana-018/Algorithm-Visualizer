import * as d3 from 'd3-hierarchy';

export function getNodeWidth(initialArray: number[], left: number, right: number): number {
  if (left > right) return 30; // Min width for empty partitions
  const slice = initialArray.slice(left, right + 1);
  const maxChars = Math.max(...slice.map(v => String(v).length), 1);
  const cellW = Math.max(28, maxChars * 8.5 + 8);
  const count = right - left + 1;
  return count * cellW + (count - 1) * 4 + 8;
}

export function computeTreeLayout(fullHierarchy: any) {
  const hierarchy = d3.hierarchy(fullHierarchy);
  
  // Custom separation: half-widths of the two nodes + 20px hard minimum gap
  const gap = 30; 
  const separation = (a: any, b: any) => {
    // Add extra space for cousins (different parents) to ensure subtrees don't overlap
    const multiplier = a.parent === b.parent ? 1.1 : 1.5;
    return (a.data.nodeWidth / 2 + b.data.nodeWidth / 2 + gap) * multiplier;
  };
  
  const treeLayout = d3.tree<any>()
    .nodeSize([1, 140]) // y-separation fixed at 140px; x driven by separation fn
    .separation(separation);
    
  const rootData = treeLayout(hierarchy);
  
  const positions = new Map<string, { x: number; y: number }>();
  const widths = new Map<string, number>();
  let minX = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  rootData.descendants().forEach(n => {
    positions.set(n.data.id, { x: n.x, y: n.y });
    widths.set(n.data.id, n.data.nodeWidth);
    const halfWidth = n.data.nodeWidth / 2;
    if (n.x - halfWidth < minX) minX = n.x - halfWidth;
    if (n.x + halfWidth > maxX) maxX = n.x + halfWidth;
    if (n.y > maxY) maxY = n.y;
  });
  
  if (minX === Infinity) { minX = 0; maxX = 0; maxY = 0; }
  
  return { nodePositions: positions, nodeWidths: widths, minX, maxX, maxY };
}
