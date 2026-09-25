import type { KnapsackStep } from '../types';

export interface KnapsackItem {
  weight: number;
  value: number;
}

export const knapsackCode = [
  "function knapsackBranchAndBound(items, capacity) {",
  "  items.sort((a, b) => (b.value/b.weight) - (a.value/a.weight));",
  "  let maxProfit = 0;",
  "  let queue = [{ level: -1, profit: 0, weight: 0, bound: 0 }];",
  "  ",
  "  while (queue.length > 0) {",
  "    let u = queue.shift();",
  "    if (u.level === items.length - 1) continue;",
  "    ",
  "    // Include next item",
  "    let v1 = { level: u.level + 1, weight: u.weight + items[u.level+1].weight, profit: u.profit + items[u.level+1].value };",
  "    if (v1.weight <= capacity && v1.profit > maxProfit) maxProfit = v1.profit;",
  "    v1.bound = bound(v1, items, capacity);",
  "    if (v1.bound > maxProfit) queue.push(v1);",
  "    ",
  "    // Exclude next item",
  "    let v2 = { level: u.level + 1, weight: u.weight, profit: u.profit };",
  "    v2.bound = bound(v2, items, capacity);",
  "    if (v2.bound > maxProfit) queue.push(v2);",
  "  }",
  "  return maxProfit;",
  "}"
];

export function generateKnapsackSteps(items: KnapsackItem[], capacity: number): KnapsackStep[] {
  const steps: KnapsackStep[] = [];
  
  // Sort items by value/weight ratio descending
  const sortedItems = [...items].map((item, index) => ({...item, originalIndex: index}))
    .sort((a, b) => (b.value / b.weight) - (a.value / a.weight));
    
  let maxProfit = 0;
  let bestNodeId = '';
  
  function getBound(level: number, weight: number, profit: number): number {
    if (weight >= capacity) return 0;
    
    let boundValue = profit;
    let j = level + 1;
    let totalWeight = weight;
    
    while (j < sortedItems.length && totalWeight + sortedItems[j].weight <= capacity) {
      totalWeight += sortedItems[j].weight;
      boundValue += sortedItems[j].value;
      j++;
    }
    
    if (j < sortedItems.length) {
      boundValue += (capacity - totalWeight) * (sortedItems[j].value / sortedItems[j].weight);
    }
    
    return boundValue;
  }

  let nodeIdCounter = 0;
  const generateId = () => `n${nodeIdCounter++}`;
  
  const rootId = generateId();
  const rootBound = getBound(-1, 0, 0);
  
  steps.push({
    type: 'createNode',
    id: rootId,
    parentId: null,
    level: -1,
    weight: 0,
    value: 0,
    bound: rootBound,
    isInclude: null,
    description: `Root node created. Initial bound is ${rootBound.toFixed(2)}`,
    lines: [3, 4]
  });
  
  interface NodeData {
    id: string;
    level: number;
    profit: number;
    weight: number;
    bound: number;
  }
  
  const queue: NodeData[] = [{ id: rootId, level: -1, profit: 0, weight: 0, bound: rootBound }];
  
  while (queue.length > 0) {
    const u = queue.shift()!;
    
    if (u.level === sortedItems.length - 1) continue;
    
    const nextItem = sortedItems[u.level + 1];
    
    // Branch 1: Include item
    const v1Weight = u.weight + nextItem.weight;
    const v1Profit = u.profit + nextItem.value;
    const v1Id = generateId();
    
    const v1Bound = getBound(u.level + 1, v1Weight, v1Profit);
    
    steps.push({
      type: 'createNode',
      id: v1Id,
      parentId: u.id,
      level: u.level + 1,
      weight: v1Weight,
      value: v1Profit,
      bound: v1Bound,
      isInclude: true,
      description: `Consider including item ${nextItem.originalIndex} (Weight: ${nextItem.weight}, Value: ${nextItem.value}). Bound: ${v1Bound.toFixed(2)}`,
      lines: [9, 11]
    });
    
    if (v1Weight <= capacity && v1Profit > maxProfit) {
      maxProfit = v1Profit;
      bestNodeId = v1Id;
      steps.push({
        type: 'updateBest',
        bestValue: maxProfit,
        bestNodeId: v1Id,
        description: `New best solution found! Value: ${maxProfit}`,
        lines: [10]
      });
    }
    
    if (v1Bound > maxProfit && v1Weight <= capacity) {
      queue.push({ id: v1Id, level: u.level + 1, profit: v1Profit, weight: v1Weight, bound: v1Bound });
    } else {
      const reason = v1Weight > capacity ? "Exceeds capacity" : "Bound <= max profit";
      steps.push({
        type: 'prune',
        id: v1Id,
        reason,
        description: `Pruning node because: ${reason}`,
        lines: [12]
      });
    }
    
    // Branch 2: Exclude item
    const v2Weight = u.weight;
    const v2Profit = u.profit;
    const v2Id = generateId();
    
    const v2Bound = getBound(u.level + 1, v2Weight, v2Profit);
    
    steps.push({
      type: 'createNode',
      id: v2Id,
      parentId: u.id,
      level: u.level + 1,
      weight: v2Weight,
      value: v2Profit,
      bound: v2Bound,
      isInclude: false,
      description: `Consider excluding item ${nextItem.originalIndex}. Bound: ${v2Bound.toFixed(2)}`,
      lines: [15, 16]
    });
    
    if (v2Bound > maxProfit) {
      queue.push({ id: v2Id, level: u.level + 1, profit: v2Profit, weight: v2Weight, bound: v2Bound });
    } else {
      steps.push({
        type: 'prune',
        id: v2Id,
        reason: "Bound <= max profit",
        description: `Pruning node because: Bound <= max profit`,
        lines: [17]
      });
    }
  }
  
  steps.push({
    type: 'complete',
    description: `Branch and bound complete. Best value found: ${maxProfit}`,
    lines: [19]
  });
  
  return steps;
}
