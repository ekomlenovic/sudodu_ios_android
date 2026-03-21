import { Difficulty } from '../store/gameStore';

/**
 * Validates if it's safe to put `val` in `grid[row][col]`.
 */
function isSafe(grid: number[][], row: number, col: number, val: number): boolean {
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
 * Removes cells to match the requested difficulty.
 */
export function generatePuzzle(difficulty: Difficulty): { grid: number[][], solution: number[][] } {
  const solution = generateSolution();
  const grid = solution.map(r => [...r]);
  
  let attempts = 0;
  switch (difficulty) {
    case 'easy': attempts = 30; break;    // leave ~51
    case 'medium': attempts = 45; break;  // leave ~36
    case 'hard': attempts = 55; break;    // leave ~26
    case 'expert': attempts = 62; break;  // leave ~19
  }
  
  let removed = 0;
  while (removed < attempts) {
    const row = Math.floor(Math.random() * 9);
    const col = Math.floor(Math.random() * 9);
    
    if (grid[row][col] !== 0) {
      // Basic unique check could go here. For now, just remove it to keep it fast and simple
      grid[row][col] = 0;
      removed++;
    }
  }
  
  return { grid, solution };
}
