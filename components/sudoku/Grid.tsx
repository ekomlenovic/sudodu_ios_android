import React from 'react';
import { View, StyleSheet, Dimensions, useColorScheme } from 'react-native';
import { useGameStore } from '../../store/gameStore';
import { Cell } from './Cell';
import Animated, { FadeIn } from 'react-native-reanimated';

export const Grid: React.FC = () => {
  const { grid, initialGrid, solution, notes, selectedCell, selectCell, showErrors, validatedErrors } = useGameStore();

  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? {
     border: 'rgba(255,255,255,0.2)',
     shadow: 'rgba(0,0,0,0.5)',
  } : {
     border: 'rgba(0,0,0,0.15)',
     shadow: 'rgba(90,79,224,0.15)',
  };

  const windowWidth = Dimensions.get('window').width;
  // Make cellSize a perfect integer so no pixel snapping layout shifts occur
  const cellSize = Math.floor((windowWidth - 32) / 9);
  const gridWidth = (cellSize * 9) + 4; // Add 4 to account for the left & right 2px borders

  const renderCells = () => {
    const cells = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const val = grid[r][c];
        const isInitial = initialGrid[r][c] !== 0;
        
        const isSelected = selectedCell?.row === r && selectedCell?.col === c;
        const isSameValue = selectedCell && grid[selectedCell.row][selectedCell.col] === val && val !== 0;
        
        const isRelatedRowCol = selectedCell?.row === r || selectedCell?.col === c;
        const isRelatedBlock = selectedCell &&
          Math.floor(r / 3) === Math.floor(selectedCell.row / 3) &&
          Math.floor(c / 3) === Math.floor(selectedCell.col / 3);

        const isRelated = isRelatedRowCol || isRelatedBlock;
        const isError = showErrors && validatedErrors.some(e => e.row === r && e.col === c);

        cells.push(
          <Cell
            key={`${r}-${c}`}
            row={r}
            col={c}
            size={cellSize}
            value={val}
            isInitial={isInitial}
            isSelected={isSelected}
            isRelated={!!isRelated}
            isSameAsSelected={!!isSameValue}
            isError={isError}
            notes={notes[r][c]}
            onPress={() => selectCell(r, c)}
          />
        );
      }
    }
    return cells;
  };

  return (
    <Animated.View entering={FadeIn.delay(300).springify()} style={[
        styles.shadowWrapper,
        { shadowColor: colors.shadow }
    ]}>
        <View style={[
            styles.gridContainer, 
            { 
                width: gridWidth, 
                height: gridWidth, 
                borderColor: colors.border,
            }
        ]}>
          {renderCells()}
        </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  shadowWrapper: {
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 12,
    borderRadius: 16,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: 2,
    borderRadius: 16,
    overflow: 'hidden',
  },
});
