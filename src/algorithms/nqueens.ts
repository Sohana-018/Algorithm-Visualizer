import { NQueensStep } from '../types';

export const nQueensCode = [
  "function solveNQueens(n) {",
  "  const solutions = [];",
  "  const board = new Array(n).fill(-1);",
  "  ",
  "  function isValid(row, col) {",
  "    for (let i = 0; i < row; i++) {",
  "      if (board[i] === col || Math.abs(board[i] - col) === Math.abs(i - row)) {",
  "        return false;",
  "      }",
  "    }",
  "    return true;",
  "  }",
  "  ",
  "  function placeQueens(row) {",
  "    if (row === n) {",
  "      solutions.push([...board]);",
  "      return;",
  "    }",
  "    ",
  "    for (let col = 0; col < n; col++) {",
  "      if (isValid(row, col)) {",
  "        board[row] = col;",
  "        placeQueens(row + 1);",
  "      }",
  "    }",
  "  }",
  "  ",
  "  placeQueens(0);",
  "  return solutions;",
  "}"
];

export function generateNQueensSteps(n: number, findAll: boolean = false): NQueensStep[] {
  const steps: NQueensStep[] = [];
  const board = new Array(n).fill(-1);
  const solutions: {row: number, col: number}[][] = [];

  function getPlacedQueens(currentRow: number): {row: number, col: number}[] {
    const q = [];
    for (let i = 0; i < currentRow; i++) {
      if (board[i] !== -1) {
        q.push({ row: i, col: board[i] });
      }
    }
    return q;
  }

  function isValid(row: number, col: number): { valid: boolean, conflict?: {row: number, col: number, type: 'col'|'diag'} } {
    for (let i = 0; i < row; i++) {
      if (board[i] === col) {
        return { valid: false, conflict: { row: i, col: board[i], type: 'col' } };
      }
      if (Math.abs(board[i] - col) === Math.abs(i - row)) {
        return { valid: false, conflict: { row: i, col: board[i], type: 'diag' } };
      }
    }
    return { valid: true };
  }

  function placeQueens(row: number) {
    if (solutions.length >= 1 && !findAll) return; // Stop after first solution if not findAll

    if (row === n) {
      const solution = getPlacedQueens(n);
      solutions.push(solution);
      steps.push({
        type: 'solution-found',
        queens: solution,
        description: `Solution ${solutions.length} found!`,
        lines: [16]
      });
      return;
    }

    for (let col = 0; col < n; col++) {
      steps.push({
        type: 'try-place',
        row,
        col,
        description: `Trying to place queen at row ${row}, col ${col}.`,
        lines: [22]
      });

      const { valid, conflict } = isValid(row, col);

      if (valid) {
        board[row] = col;
        steps.push({
          type: 'place-safe',
          row,
          col,
          placedQueens: getPlacedQueens(row + 1),
          description: `Placement safe. Placing queen at row ${row}, col ${col}.`,
          lines: [23, 24]
        });

        placeQueens(row + 1);

        // Backtrack from this valid placement to try the next column
        board[row] = -1;
        steps.push({
          type: 'backtrack',
          row,
          col,
          description: `Backtracking from row ${row}, col ${col} to find other placements.`,
          lines: [27]
        });
      } else if (conflict) {
        let reason = "";
        if (conflict.type === 'col') {
          reason = `Row ${row}, Col ${col} vs Row ${conflict.row}, Col ${conflict.col} → same column, conflict`;
        } else {
          reason = `Row ${row}, Col ${col} vs Row ${conflict.row}, Col ${conflict.col} → |${row}-${conflict.row}| = |${col}-${conflict.col}| = ${row - conflict.row} → same diagonal, conflict`;
        }
        steps.push({
          type: 'conflict',
          row,
          col,
          conflictsWith: conflict,
          description: reason,
          lines: [6, 7]
        });
      }
    }
  }

  placeQueens(0);

  steps.push({
    type: 'complete',
    description: `N-Queens complete. Found ${solutions.length} solution(s).`,
  });

  return steps;
}
