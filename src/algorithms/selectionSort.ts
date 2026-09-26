import { ArrayStep } from '../types';

export const selectionSortCode = [
  "function selectionSort(arr) {",
  "  const n = arr.length;",
  "  for (let i = 0; i < n - 1; i++) {",
  "    let minIdx = i;",
  "    for (let j = i + 1; j < n; j++) {",
  "      if (arr[j] < arr[minIdx]) {",
  "        minIdx = j;",
  "      }",
  "    }",
  "    if (minIdx !== i) {",
  "      let temp = arr[i];",
  "      arr[i] = arr[minIdx];",
  "      arr[minIdx] = temp;",
  "    }",
  "  }",
  "  return arr;",
  "}"
];

export function generateSelectionSortSteps(initialArray: number[]): ArrayStep[] {
  const steps: ArrayStep[] = [];
  const arr = [...initialArray];
  const n = arr.length;

  for (let i = 0; i < n - 1; i++) {
    let minIdx = i;
    steps.push({
      type: 'mark-min',
      index: minIdx,
      description: `Assuming minimum is at index ${minIdx} (value ${arr[minIdx]}).`,
      lines: [3, 4]
    });

    for (let j = i + 1; j < n; j++) {
      steps.push({
        type: 'compare',
        indices: [minIdx, j],
        description: `Comparing current minimum (${arr[minIdx]}) with element at index ${j} (${arr[j]}).`,
        lines: [6]
      });

      if (arr[j] < arr[minIdx]) {
        minIdx = j;
        steps.push({
          type: 'mark-min',
          index: minIdx,
          description: `Found new minimum at index ${minIdx} (value ${arr[minIdx]}).`,
          lines: [7]
        });
      }
    }

    if (minIdx !== i) {
      steps.push({
        type: 'swap',
        indices: [i, minIdx],
        description: `Swapping element at index ${i} (${arr[i]}) with minimum found (${arr[minIdx]}).`,
        lines: [10, 11, 12, 13]
      });
      const temp = arr[i];
      arr[i] = arr[minIdx];
      arr[minIdx] = temp;
    } else {
      steps.push({
        type: 'compare', // Just to highlight briefly
        indices: [i, i],
        description: `Minimum is already at correct position ${i}.`,
        lines: [10]
      });
    }

    steps.push({
      type: 'mark-sorted',
      index: i,
      description: `Element at index ${i} is now sorted.`,
      lines: [15] // roughly end of loop
    });
  }

  // The last element is automatically in place.
  if (n > 0) {
    steps.push({
      type: 'mark-sorted',
      index: n - 1,
      description: `Last element at index ${n - 1} is in place.`,
      lines: [16]
    });
  }

  steps.push({
    type: 'complete',
    description: 'Selection Sort complete.',
    lines: [17]
  });

  return steps;
}
