import { MergeSortStep } from '../types';

export const mergeSortCode = [
  // ── mergeSort (lines 0-6) ────────────────────────────────────────────────
  "function mergeSort(arr, left, right) {",           // 0
  "  if (left >= right) return;",                      // 1  base case
  "  let mid = Math.floor((left + right) / 2);",       // 2  find midpoint
  "  mergeSort(arr, left, mid);",                      // 3  recurse left half
  "  mergeSort(arr, mid + 1, right);",                 // 4  recurse right half
  "  merge(arr, left, mid, right);",                   // 5  merge the two halves
  "}",                                                  // 6
  "",                                                   // 7  blank separator
  // ── merge (lines 8-21) ───────────────────────────────────────────────────
  "function merge(left, right) {",                     // 8
  "  let result = [], i = 0, j = 0;",                  // 9
  "  while (i < left.length && j < right.length) {",   // 10  main loop
  "    if (left[i] <= right[j])",                       // 11  compare elements
  "      result.push(left[i++]);",                      // 12  pick from left
  "    else",                                           // 13
  "      result.push(right[j++]);",                     // 14  pick from right
  "  }",                                                // 15
  "  while (i < left.length)",                          // 16  drain remaining left
  "    result.push(left[i++]);",                        // 17
  "  while (j < right.length)",                         // 18  drain remaining right
  "    result.push(right[j++]);",                       // 19
  "  return result;",                                   // 20  done
  "}",                                                  // 21
];

export function generateMergeSortSteps(initialArray: number[]): MergeSortStep[] {
  const steps: MergeSortStep[] = [];
  const arr = [...initialArray];

  function merge(left: number, mid: number, right: number) {
    const parentId = `node-${left}-${right}`;
    const leftChildId = `node-${left}-${mid}`;
    const rightChildId = `node-${mid + 1}-${right}`;

    const temp = [];
    let i = left;
    let j = mid + 1;

    while (i <= mid && j <= right) {
      const leftIdx = i - left;
      const rightIdx = j - (mid + 1);
      const leftVal = arr[i];
      const rightVal = arr[j];
      const pickedFrom = leftVal <= rightVal ? 'left' : 'right';

      steps.push({
        type: 'compare-merge',
        parentId,
        leftChildId,
        rightChildId,
        leftIdx,
        rightIdx,
        leftVal,
        rightVal,
        pickedFrom,
        description: `Merging: Comparing ${leftVal} and ${rightVal}. Picked ${pickedFrom === 'left' ? leftVal : rightVal}.`,
        lines: [10, 11]   // while condition + if compare
      });

      if (leftVal <= rightVal) {
        temp.push(leftVal);
        i++;
      } else {
        temp.push(rightVal);
        j++;
      }

      steps.push({
        type: 'place',
        parentId,
        value: temp[temp.length - 1],
        description: `Placed ${temp[temp.length - 1]} into the merged array.`,
        lines: pickedFrom === 'left' ? [12] : [14]  // which side won
      });
    }

    while (i <= mid) {
      temp.push(arr[i]);
      steps.push({
        type: 'place',
        parentId,
        value: arr[i],
        description: `Placed remaining ${arr[i]} from the left half.`,
        lines: [16, 17]   // drain-left while loop
      });
      i++;
    }

    while (j <= right) {
      temp.push(arr[j]);
      steps.push({
        type: 'place',
        parentId,
        value: arr[j],
        description: `Placed remaining ${arr[j]} from the right half.`,
        lines: [18, 19]   // drain-right while loop
      });
      j++;
    }

    // Write temp back to arr
    for (let k = 0; k < temp.length; k++) {
      arr[left + k] = temp[k];
    }

    steps.push({
      type: 'merge-complete',
      nodeId: parentId,
      mergedArray: [...temp],
      description: `Merge complete for this segment: [${temp.join(', ')}].`,
      lines: [20]   // return result
    });
  }

  function mergeSort(left: number, right: number) {
    if (left >= right) return;
    
    const mid = Math.floor((left + right) / 2);
    
    const parentId = `node-${left}-${right}`;
    const leftChildId = `node-${left}-${mid}`;
    const rightChildId = `node-${mid + 1}-${right}`;
    
    const leftArr = arr.slice(left, mid + 1);
    const rightArr = arr.slice(mid + 1, right + 1);

    steps.push({
      type: 'split',
      parentId,
      leftChildId,
      rightChildId,
      leftArr: [...leftArr],
      rightArr: [...rightArr],
      description: `Splitting array into [${leftArr.join(', ')}] and [${rightArr.join(', ')}]`,
      lines: [2, 3, 4]   // find mid, recurse left, recurse right
    });

    mergeSort(left, mid);
    mergeSort(mid + 1, right);
    merge(left, mid, right);
  }

  // The root split is implicit initially, but we generate from there.
  mergeSort(0, arr.length - 1);

  steps.push({
    type: 'complete',
    description: 'Merge sort is complete! The array is now fully sorted.',
  });

  return steps;
}
