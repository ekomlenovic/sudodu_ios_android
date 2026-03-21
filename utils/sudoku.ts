import { Difficulty } from '../store/gameStore';

/**
 * Validates if it's safe to put `val` in `grid[row][col]`.
 */
export function isSafe(grid: number[][], row: number, col: number, val: number): boolean {
  for (let c = 0; c < 9; c++) {
    if (grid[row][c] === val) return false;
  }
  for (let r = 0; r < 9; r++) {
    if (grid[r][col] === val) return false;
  }
  
  const startRow = row - row % 3;
  const startCol = col - col % 3;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (grid[startRow + r][startCol + c] === val) return false;
    }
  }
  return true;
}

/**
 * Fills a Sudoku grid using backtracking.
 */
function fillGrid(grid: number[][]): boolean {
  for (let i = 0; i < 81; i++) {
    const row = Math.floor(i / 9);
    const col = i % 9;
    
    if (grid[row][col] === 0) {
      const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
      
      for (let num of numbers) {
        if (isSafe(grid, row, col, num)) {
          grid[row][col] = num;
          if (fillGrid(grid)) {
            return true;
          }
          grid[row][col] = 0;
        }
      }
      return false;
    }
  }
  return true;
}

/**
 * Generates a complete valid Sudoku 9x9 grid.
 */
export function generateSolution(): number[][] {
  const grid = Array(9).fill(0).map(() => Array(9).fill(0));
  fillGrid(grid);
  return grid;
}

/**
 * Fast backtracking solver that counts total possible solutions.
 * Aborts early if > 1 solution is found to optimize uniqueness checking.
 */
function solveCount(grid: number[][]): number {
  let solutions = 0;
  
  // Find first empty cell
  let row = -1, col = -1, isEmpty = false;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r][c] === 0) {
        row = r;
        col = c;
        isEmpty = true;
        break;
      }
    }
    if (isEmpty) break;
  }
  
  if (!isEmpty) return 1; // Reached end of board -> 1 valid solution found
  
  for (let num = 1; num <= 9; num++) {
    if (isSafe(grid, row, col, num)) {
      grid[row][col] = num;
      solutions += solveCount(grid);
      grid[row][col] = 0;
      if (solutions > 1) return solutions; // Early exit, no need to keep counting
    }
  }
  
  return solutions;
}

/**
 * Removes cells to match the requested difficulty, ensuring exactly ONE unique solution remains.
 */
export function generatePuzzle(difficulty: Difficulty): { grid: number[][], solution: number[][] } {
  const solution = generateSolution();
  const grid = solution.map(r => [...r]);
  
  let targetHoles = 0;
  switch (difficulty) {
    case 'easy': targetHoles = 30; break;
    case 'medium': targetHoles = 40; break;
    case 'hard': targetHoles = 50; break;
    case 'expert': targetHoles = 58; break; 
  }
  
  // Create a randomized sequence of all 81 positions
  let positions = Array.from({ length: 81 }, (_, i) => i).sort(() => Math.random() - 0.5);
  
  let holes = 0;
  for (let pos of positions) {
    if (holes >= targetHoles) break;
    
    const row = Math.floor(pos / 9);
    const col = pos % 9;
    
    if (grid[row][col] !== 0) {
      const backup = grid[row][col];
      grid[row][col] = 0;
      
      // Verify uniqueness
      const gridCopy = grid.map(r => [...r]);
      const numSolutions = solveCount(gridCopy);
      
      if (numSolutions === 1) {
        holes++;
      } else {
        // Digging this hole created ambiguity, revert it
        grid[row][col] = backup;
      }
    }
  }
  
  return { grid, solution };
}
