import { ArrayStep } from '../types';

export const bubbleSortCode = [
  "function bubbleSort(arr) {",
  "  for (let i = 0; i < arr.length - 1; i++) {",
  "    for (let j = 0; j < arr.length - i - 1; j++) {",
  "      if (arr[j] > arr[j+1]) {",
  "        swap(arr, j, j+1);",
  "      }",
  "    }",
  "  }",
  "}"
];

export function generateBubbleSortSteps(initialArray: number[]): ArrayStep[] {
  const steps: ArrayStep[] = [];
  const arr = [...initialArray];
  const n = arr.length;

  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - i - 1; j++) {
      steps.push({
        type: 'compare',
        indices: [j, j + 1],
        description: `Comparing elements at index ${j} (${arr[j]}) and ${j + 1} (${arr[j + 1]}).`,
        lines: [3]
      });

      if (arr[j] > arr[j + 1]) {
        steps.push({
          type: 'swap',
          indices: [j, j + 1],
          description: `Swapping ${arr[j]} and ${arr[j + 1]} since ${arr[j]} > ${arr[j + 1]}.`,
          lines: [4]
        });

        const temp = arr[j];
        arr[j] = arr[j + 1];
        arr[j + 1] = temp;
      }
    }
  }

  steps.push({
    type: 'complete',
    description: 'Bubble sort is complete! The array is now sorted.',
    lines: [8]
  });

  return steps;
}
