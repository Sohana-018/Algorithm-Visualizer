import { ArrayStep } from '../types';

export const insertionSortCode = [
  "function insertionSort(arr) {",
  "  const n = arr.length;",
  "  for (let i = 1; i < n; i++) {",
  "    let key = arr[i];",
  "    let j = i - 1;",
  "    ",
  "    while (j >= 0 && arr[j] > key) {",
  "      arr[j + 1] = arr[j];",
  "      j--;",
  "    }",
  "    ",
  "    arr[j + 1] = key;",
  "  }",
  "  return arr;",
  "}"
];

export function generateInsertionSortSteps(initialArray: number[]): ArrayStep[] {
  const steps: ArrayStep[] = [];
  const arr = [...initialArray];
  const n = arr.length;

  for (let i = 1; i < n; i++) {
    let key = arr[i];
    
    steps.push({
      type: 'lift',
      index: i,
      description: `Lifting element at index ${i} (value ${key}) to find its correct position.`,
      lines: [4, 5]
    });

    let j = i - 1;

    while (j >= 0) {
      steps.push({
        type: 'compare',
        indices: [j, j + 1], // The hole is at j+1, we compare j with the held key
        description: `Comparing held value (${key}) with element at index ${j} (${arr[j]}).`,
        lines: [7]
      });

      if (arr[j] > key) {
        steps.push({
          type: 'shift',
          index: j,
          description: `Element ${arr[j]} is greater than ${key}, shifting it to the right.`,
          lines: [8, 9]
        });
        
        // Actually perform the shift in our array to keep it in sync with ArrayView's swap behavior
        arr[j + 1] = arr[j];
        // The hole is now logically at j
        j--;
      } else {
        break;
      }
    }

    // Place the key
    arr[j + 1] = key;
    steps.push({
      type: 'insert',
      index: j + 1,
      value: key,
      description: `Inserting held value (${key}) at its correct position ${j + 1}.`,
      lines: [12]
    });
  }

  steps.push({
    type: 'complete',
    description: 'Insertion Sort complete.',
    lines: [14]
  });

  return steps;
}
