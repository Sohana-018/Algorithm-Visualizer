import { MergeSortStep } from '../types';

export const mergeSortCode = [
  "function mergeSort(arr, left, right) {",
  "  if (left >= right) return;",
  "  let mid = Math.floor((left + right) / 2);",
  "  // Divide phase",
  "  mergeSort(arr, left, mid);",
  "  mergeSort(arr, mid + 1, right);",
  "  // Merge phase",
  "  merge(arr, left, mid, right);",
  "}"
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
        lines: [8, 9]
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
        lines: [9]
      });
    }

    while (i <= mid) {
      temp.push(arr[i]);
      steps.push({
        type: 'place',
        parentId,
        value: arr[i],
        description: `Placed remaining ${arr[i]} from the left half.`,
        lines: [9]
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
        lines: [9]
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
      lines: [9]
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
      lines: [4, 5, 6, 7]
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
