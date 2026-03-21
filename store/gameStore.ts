import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

export interface Level {
  id: number;
  initialGrid: number[][]; // 9x9
  solution: number[][];    // 9x9
  difficulty: Difficulty;
  updatedAt: number;
}

export interface LevelProgress {
  levelId: number;
  completed: boolean;
  bestTime: number; 
  stars?: number;   
}

export interface LevelSaveState {
  grid: number[][];
  notes: number[][][];
  timer: number;
  mistakes: number;
}

export interface SudokuState {
  // --- Core Gameplay State ---
  grid: number[][];
  initialGrid: number[][];
  solution: number[][];
  notes: number[][][];
  
  selectedCell: { row: number; col: number } | null;
  mistakes: number;
  timer: number;
  isPlaying: boolean;
  difficulty: Difficulty;
  isGameOver: boolean;
  
  // --- Progression Meta-Game State ---
  currentLevel: Level | null;
  progress: LevelProgress[];
  maxUnlockedLevel: number;
  lastPlayedLevelId: number | null;
  
  generatedLevels: Level[];
  
  dailyChallengeProgress: Record<string, { completed: boolean; time: number; stars: number }>;
  achievements: string[];
  
  currentDailyLevel: Level | null;
  dailyLevelDate: string | null;
  
  savedStates: Record<string | number, LevelSaveState>;
  
  // --- Settings & Visibility ---
  isMusicEnabled: boolean;
  isHapticsEnabled: boolean;
  showErrors: boolean;
  validatedErrors: { row: number, col: number }[];

  // --- Core Gameplay Actions ---
  selectCell: (row: number, col: number) => void;
  inputValue: (val: number) => void;
  toggleNoteToggleAction: (val: number) => void;
  erase: () => void;
  useHint: () => void;
  tickTimer: () => void;
  validateBoard: () => { isWin: boolean; errorCount: number; isFilled: boolean; };
  toggleShowErrors: () => void;
  resetLevel: () => void;
  
  // --- Progression Actions ---
  loadLevel: (level: Level, savedState?: LevelSaveState) => void;
  completeLevel: (levelId: number, time: number, stars: number) => void;
  completeDailyChallenge: (dateKey: string, time: number, stars: number) => void;
  checkAchievements: () => void;
  addGeneratedLevel: (level: Level) => void;
  purgeCustomLevels: (baseLevelCount: number) => void;
  
  saveCurrentState: () => void; // call when leaving screen
  
  toggleMusicEnabled: () => void;
  toggleHapticsEnabled: () => void;
  hardReset: () => void;
}

export const useGameStore = create<SudokuState>()(
  persist(
    (set, get) => ({
      // initial runtime state
      grid: Array(9).fill(Array(9).fill(0)),
      initialGrid: Array(9).fill(Array(9).fill(0)),
      solution: Array(9).fill(Array(9).fill(0)),
      notes: Array(9).fill(Array(9).fill([])),
      
      selectedCell: null,
      mistakes: 0,
      timer: 0,
      isPlaying: false,
      difficulty: 'easy',
      isGameOver: false,
      
      // meta-game
      currentLevel: null,
      progress: [],
      maxUnlockedLevel: 1,
      lastPlayedLevelId: null,
      generatedLevels: [],
      dailyChallengeProgress: {},
      achievements: [],
      currentDailyLevel: null,
      dailyLevelDate: null,
      savedStates: {},
      
      // settings & visibility
      isMusicEnabled: true,
      isHapticsEnabled: true,
      showErrors: false,
      validatedErrors: [],
      
      selectCell: (row, col) => {
        if (!get().isPlaying) return;
        set({ selectedCell: { row, col } });
      },
      
      inputValue: (val: number) => {
        const { grid, initialGrid, selectedCell, isHapticsEnabled, isPlaying, validatedErrors } = get();
        if (!selectedCell || !isPlaying) return;
        const { row, col } = selectedCell;
        
        if (initialGrid[row][col] !== 0) return; // Cannot edit initial clues
        
        // Remove notes for this cell since we're writing a number
        const newNotes = get().notes.map(r => r.map(c => [...c]));
        newNotes[row][col] = [];
        
        const newGrid = grid.map(r => [...r]);
        newGrid[row][col] = val;
        
        const newValidatedErrors = validatedErrors.filter(e => e.row !== row || e.col !== col);

        if (isHapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        set({ grid: newGrid, notes: newNotes, validatedErrors: newValidatedErrors });
      },
      
      toggleNoteToggleAction: (val: number) => {
         const { notes, selectedCell, initialGrid, grid, isHapticsEnabled, isPlaying } = get();
         if (!selectedCell || !isPlaying) return;
         const { row, col } = selectedCell;
         
         // Can't write notes on filled cells
         if (initialGrid[row][col] !== 0 || grid[row][col] !== 0) return;
         
         const newNotes = notes.map(r => r.map(c => [...c]));
         const cellNotes = newNotes[row][col];
         const index = cellNotes.indexOf(val);
         if (index !== -1) cellNotes.splice(index, 1);
         else cellNotes.push(val);
         
         set({ notes: newNotes });
         if (isHapticsEnabled) Haptics.selectionAsync();
      },
      
      erase: () => {
         const { notes, selectedCell, initialGrid, grid, isPlaying, validatedErrors } = get();
         if (!selectedCell || !isPlaying) return;
         const { row, col } = selectedCell;
         if (initialGrid[row][col] !== 0) return; // cannot erase initial clues
         
         const newGrid = grid.map(r => [...r]);
         newGrid[row][col] = 0;

         const newNotes = notes.map(r => r.map(c => [...c]));
         newNotes[row][col] = [];

         const newValidatedErrors = validatedErrors.filter(e => e.row !== row || e.col !== col);

         set({ grid: newGrid, notes: newNotes, validatedErrors: newValidatedErrors });
      },
      
      useHint: () => {
        const { grid, initialGrid, solution, selectedCell, isHapticsEnabled, isPlaying } = get();
        if (!selectedCell || !isPlaying) return;
        const { row, col } = selectedCell;
        
        if (initialGrid[row][col] !== 0) return;
        if (solution[row][col] === 0) return; // Cannot hint if no solution
        
        const newGrid = grid.map(r => [...r]);
        newGrid[row][col] = solution[row][col];
        
        const newNotes = get().notes.map(r => r.map(c => [...c]));
        newNotes[row][col] = [];
        
        set({ grid: newGrid, notes: newNotes });
      },
      
      tickTimer: () => {
        const { isPlaying, timer } = get();
        if (isPlaying) set({ timer: timer + 1 });
      },

      validateBoard: () => {
        const { grid, solution, isHapticsEnabled } = get();
        let errorCount = 0;
        let isFilled = true;
        const newValidatedErrors: {row: number, col: number}[] = [];

        for (let r = 0; r < 9; r++) {
          for (let c = 0; c < 9; c++) {
            if (grid[r][c] === 0) {
              isFilled = false;
            } else if (solution[r][c] !== 0 && grid[r][c] !== solution[r][c]) {
              errorCount++;
              newValidatedErrors.push({ row: r, col: c });
            }
          }
        }

        const isWin = isFilled && errorCount === 0;

        if (isWin) {
          set({ isGameOver: true, isPlaying: false, showErrors: false, validatedErrors: [] });
          if (isHapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          set({ mistakes: errorCount, validatedErrors: newValidatedErrors });
          if (errorCount > 0) {
             if (isHapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          } else {
             if (isHapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
        }

        return { isWin, errorCount, isFilled };
      },

      toggleShowErrors: () => {
        set((state) => ({ showErrors: !state.showErrors }));
      },

      resetLevel: () => {
        const { initialGrid, isHapticsEnabled } = get();
        const emptyNotes = Array(9).fill(null).map(() => Array(9).fill(null).map(() => []));
        
        if (isHapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        
        set({
          grid: initialGrid.map(r => [...r]),
          notes: emptyNotes,
          validatedErrors: [],
          mistakes: 0,
          timer: 0,
          showErrors: false,
          selectedCell: null
        });
      },
      
      loadLevel: (level, savedState) => {
        const state = get();
        const levelKey = level.id === 999999 && state.dailyLevelDate ? `daily-${state.dailyLevelDate}` : level.id;
        const resolvedSavedState = savedState || state.savedStates[levelKey];

        const emptyNotes = Array(9).fill(null).map(() => Array(9).fill(null).map(() => []));
        
        set({
          currentLevel: level,
          difficulty: level.difficulty,
          grid: resolvedSavedState ? resolvedSavedState.grid.map(r => [...r]) : level.initialGrid.map(r => [...r]),
          initialGrid: level.initialGrid.map(r => [...r]),
          solution: level.solution.map(r => [...r]),
          notes: resolvedSavedState ? resolvedSavedState.notes.map(r => r.map(c => [...c])) : emptyNotes,
          timer: resolvedSavedState ? resolvedSavedState.timer : 0,
          mistakes: resolvedSavedState ? resolvedSavedState.mistakes : 0,
          selectedCell: null,
          isPlaying: true,
          isGameOver: false,
          showErrors: false,
          validatedErrors: [],
          lastPlayedLevelId: level.id >= 900000 ? state.lastPlayedLevelId : level.id,
        });
      },

      saveCurrentState: () => {
        const { currentLevel, dailyLevelDate, savedStates, grid, notes, timer, mistakes, isGameOver } = get();
        if (!currentLevel || isGameOver) return; 
        
        const levelKey = currentLevel.id === 999999 && dailyLevelDate ? `daily-${dailyLevelDate}` : currentLevel.id;
        set({
          savedStates: {
            ...savedStates,
            [levelKey]: { 
              grid: grid.map(r => [...r]),
              notes: notes.map(r => r.map(c => [...c])),
              timer,
              mistakes
            }
          }
        });
      },

      completeLevel: (levelId, time, stars) => {
        const { progress, maxUnlockedLevel, savedStates } = get();
        const existing = progress.find((p) => p.levelId === levelId);
        let updatedProgress: LevelProgress[];
        
        if (existing) {
          updatedProgress = progress.map((p) =>
            p.levelId === levelId
              ? { ...p, completed: true, bestTime: Math.min(p.bestTime, time), stars: Math.max(p.stars || 0, stars) }
              : p
          );
        } else {
          updatedProgress = [...progress, { levelId, completed: true, bestTime: time, stars }];
        }
        
        const newSavedStates = { ...savedStates };
        delete newSavedStates[levelId];

        const isMapLevel = levelId < 900000;
        
        set({
          progress: updatedProgress,
          maxUnlockedLevel: isMapLevel ? Math.max(maxUnlockedLevel, levelId + 1) : maxUnlockedLevel,
          savedStates: newSavedStates,
          isPlaying: false,
        });
        get().checkAchievements();
      },
      
      completeDailyChallenge: (dateKey, time, stars) => {
        const { dailyChallengeProgress, savedStates } = get();
        const existing = dailyChallengeProgress[dateKey];
        const newSavedStates = { ...savedStates };
        delete newSavedStates[`daily-${dateKey}`];
        
        set({
          dailyChallengeProgress: {
            ...dailyChallengeProgress,
            [dateKey]: {
              completed: true,
              time: existing ? Math.min(existing.time, time) : time,
              stars: Math.max(existing?.stars || 0, stars),
            }
          },
          savedStates: newSavedStates,
          isPlaying: false,
        });
        get().checkAchievements();
      },

      checkAchievements: () => {
        const { progress, dailyChallengeProgress, achievements } = get();
        const newAchievements: string[] = [...achievements];
        
        const completedCount = progress.filter(p => p.completed).length;
        const perfectCount = progress.filter(p => p.stars === 3).length; // 3 stars = 0 mistakes
        const dailyCount = Object.values(dailyChallengeProgress).filter(p => p.completed).length;

        if (completedCount >= 5 && !achievements.includes('novice')) newAchievements.push('novice');
        if (completedCount >= 50 && !achievements.includes('expert')) newAchievements.push('expert');
        if (perfectCount >= 10 && !achievements.includes('perfectionist')) newAchievements.push('perfectionist');
        if (dailyCount >= 1 && !achievements.includes('daily_winner')) newAchievements.push('daily_winner');

        if (newAchievements.length !== achievements.length) {
          set({ achievements: newAchievements });
          if (get().isHapticsEnabled) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        }
      },

      addGeneratedLevel: (level) => {
        const { generatedLevels } = get();
        if (!generatedLevels.find((l) => l.id === level.id)) {
          set({ generatedLevels: [...generatedLevels, level] });
        }
      },

      purgeCustomLevels: (baseLevelCount) => {
        const { progress, maxUnlockedLevel } = get();
        const cleanedProgress = progress.filter(p => p.levelId <= baseLevelCount);
        const clampedUnlocked = Math.min(maxUnlockedLevel, baseLevelCount + 1);
        
        set({
          generatedLevels: [],
          progress: cleanedProgress,
          maxUnlockedLevel: clampedUnlocked,
        });
      },

      toggleMusicEnabled: () => set((state) => ({ isMusicEnabled: !state.isMusicEnabled })),
      toggleHapticsEnabled: () => set((state) => ({ isHapticsEnabled: !state.isHapticsEnabled })),

      hardReset: () => set({
        progress: [],
        maxUnlockedLevel: 1,
        lastPlayedLevelId: null,
        generatedLevels: [],
        currentLevel: null,
        dailyChallengeProgress: {},
        savedStates: {},
        achievements: [],
        grid: Array(9).fill(Array(9).fill(0)),
        notes: Array(9).fill(Array(9).fill([])),
        selectedCell: null,
        mistakes: 0,
        timer: 0,
        isPlaying: false,
      }),
    }),
    {
      name: 'sudoku-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        progress: state.progress,
        maxUnlockedLevel: state.maxUnlockedLevel,
        lastPlayedLevelId: state.lastPlayedLevelId,
        generatedLevels: state.generatedLevels,
        dailyChallengeProgress: state.dailyChallengeProgress,
        savedStates: state.savedStates,
        achievements: state.achievements,
        currentDailyLevel: state.currentDailyLevel,
        dailyLevelDate: state.dailyLevelDate,
        isMusicEnabled: state.isMusicEnabled,
        isHapticsEnabled: state.isHapticsEnabled,
      }),
    }
  )
);
