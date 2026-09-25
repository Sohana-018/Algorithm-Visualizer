import { BinarySearchStep } from '../types';

export const binarySearchIterativeCode = [
  "function binarySearch(arr, target) {",
  "  let low = 0;",
  "  let high = arr.length - 1;",
  "  while (low <= high) {",
  "    let mid = Math.floor((low + high) / 2);",
  "    if (arr[mid] === target) return mid;",
  "    if (arr[mid] < target) low = mid + 1;",
  "    else high = mid - 1;",
  "  }",
  "  return -1;",
  "}"
];

export const binarySearchRecursiveCode = [
  "function binarySearch(arr, target, low, high) {",
  "  if (low > high) return -1;",
  "  let mid = Math.floor((low + high) / 2);",
  "  if (arr[mid] === target) return mid;",
  "  if (arr[mid] < target) {",
  "    return binarySearch(arr, target, mid + 1, high);",
  "  } else {",
  "    return binarySearch(arr, target, low, mid - 1);",
  "  }",
  "}"
];

export function generateBinarySearchIterativeSteps(initialArray: number[], target: number): BinarySearchStep[] {
  const steps: BinarySearchStep[] = [];
  const arr = [...initialArray].sort((a, b) => a - b);
  
  let low = 0;
  let high = arr.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    steps.push({
      type: 'calc-mid',
      low, high, mid, target,
      description: `mid = Math.floor((${low} + ${high}) / 2) = ${mid}`,
      lines: [4]
    });

    if (arr[mid] === target) {
      steps.push({
        type: 'compare',
        midValue: arr[mid], target, result: 'found',
        description: `arr[${mid}] === ${target} -> Found!`,
        lines: [5]
      });
      break;
    } else if (arr[mid] < target) {
      steps.push({
        type: 'compare',
        midValue: arr[mid], target, result: 'right',
        description: `arr[${mid}] < ${target} -> Search right half.`,
        lines: [6]
      });
      steps.push({
        type: 'eliminate',
        range: [low, mid],
        description: `Eliminating indices ${low} to ${mid}.`,
        lines: [6]
      });
      low = mid + 1;
    } else {
      steps.push({
        type: 'compare',
        midValue: arr[mid], target, result: 'left',
        description: `arr[${mid}] > ${target} -> Search left half.`,
        lines: [7]
      });
      steps.push({
        type: 'eliminate',
        range: [mid, high],
        description: `Eliminating indices ${mid} to ${high}.`,
        lines: [7]
      });
      high = mid - 1;
    }
  }

  if (low > high) {
    steps.push({
      type: 'complete',
      description: `Target ${target} was not found.`,
      lines: [9]
    });
  } else {
    steps.push({
      type: 'complete',
      description: `Binary search complete.`,
      lines: []
    });
  }

  return steps;
}

export function generateBinarySearchRecursiveSteps(initialArray: number[], target: number): BinarySearchStep[] {
  const steps: BinarySearchStep[] = [];
  const arr = [...initialArray].sort((a, b) => a - b);

  let callCounter = 0;

  function search(low: number, high: number, depth: number): number {
    const callId = `call-${callCounter++}`;
    steps.push({
      type: 'push-call',
      callId,
      args: { low, high },
      target,
      depth,
      description: `binarySearch(arr, ${target}, ${low}, ${high})`,
      lines: [0]
    });

    if (low > high) {
      steps.push({
        type: 'pop-call',
        callId,
        returnValue: -1,
        depth,
        description: `low > high. Returning -1.`,
        lines: [1]
      });
      return -1;
    }

    const mid = Math.floor((low + high) / 2);
    steps.push({
      type: 'calc-mid',
      low, high, mid, target,
      depth, callId,
      description: `mid = Math.floor((${low} + ${high}) / 2) = ${mid}`,
      lines: [2]
    });

    if (arr[mid] === target) {
      steps.push({
        type: 'compare',
        midValue: arr[mid], target, result: 'found',
        depth, callId,
        description: `arr[${mid}] === ${target} -> Found!`,
        lines: [3]
      });
      steps.push({
        type: 'pop-call',
        callId,
        returnValue: mid,
        depth,
        description: `Returning ${mid}.`,
        lines: [3]
      });
      return mid;
    } else if (arr[mid] < target) {
      steps.push({
        type: 'compare',
        midValue: arr[mid], target, result: 'right',
        depth, callId,
        description: `arr[${mid}] < ${target} -> Search right half.`,
        lines: [4, 5]
      });
      const res = search(mid + 1, high, depth + 1);
      steps.push({
        type: 'pop-call',
        callId,
        returnValue: res,
        depth,
        description: `Returning result ${res} from right half.`,
        lines: [5]
      });
      return res;
    } else {
      steps.push({
        type: 'compare',
        midValue: arr[mid], target, result: 'left',
        depth, callId,
        description: `arr[${mid}] > ${target} -> Search left half.`,
        lines: [6, 7]
      });
      const res = search(low, mid - 1, depth + 1);
      steps.push({
        type: 'pop-call',
        callId,
        returnValue: res,
        depth,
        description: `Returning result ${res} from left half.`,
        lines: [7]
      });
      return res;
    }
  }

  search(0, arr.length - 1, 0);

  steps.push({
    type: 'complete',
    description: `Binary search complete.`,
  });

  return steps;
}
