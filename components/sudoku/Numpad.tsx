import React from 'react';
import { View, Pressable, Text, StyleSheet, Dimensions, useColorScheme, Alert } from 'react-native';
import { useGameStore } from '../../store/gameStore';

export const Numpad: React.FC<{ isNotesMode: boolean; toggleNotesMode: () => void }> = ({
  isNotesMode,
  toggleNotesMode,
}) => {
  const { inputValue, toggleNoteToggleAction, erase, useHint, validateBoard, showErrors, toggleShowErrors } = useGameStore();
  const isDark = useColorScheme() === 'dark';

  const colors = isDark ? {
    btnBg: '#2A2A35',
    btnText: '#FFFFFF',
    accent: '#6C63FF',
    subBg: '#1A1A2E',
    subText: '#8E8EA0',
    danger: 'rgba(239, 68, 68, 0.2)',
    dangerText: '#EF4444'
  } : {
    btnBg: '#FFFFFF',
    btnText: '#1A1A2E',
    accent: '#5A4FE0',
    subBg: '#F0F0F8',
    subText: '#6B6B80',
    danger: 'rgba(239, 68, 68, 0.1)',
    dangerText: '#EF4444'
  };

  const handleNumberPress = (n: number) => {
    if (isNotesMode) toggleNoteToggleAction(n);
    else inputValue(n);
  };

  return (
    <View style={styles.container}>
      <View style={styles.actionsRow}>
        <Pressable 
            style={({pressed}) => [styles.actionBtn, { backgroundColor: colors.danger, transform: [{ scale: pressed ? 0.9 : 1 }] }]} 
            onPress={erase}
        >
          <Text style={[styles.actionText, { color: colors.dangerText }]}>Erase</Text>
        </Pressable>
        <Pressable 
            style={({pressed}) => [
                styles.actionBtn, 
                { backgroundColor: isNotesMode ? colors.accent : colors.subBg, transform: [{ scale: pressed ? 0.9 : 1 }] }
            ]} 
            onPress={toggleNotesMode}
        >
          <Text style={[styles.actionText, { color: isNotesMode ? '#FFF' : colors.subText }]}>Notes</Text>
        </Pressable>
        <Pressable 
            style={({pressed}) => [styles.actionBtn, { backgroundColor: showErrors ? colors.accent : colors.subBg, transform: [{ scale: pressed ? 0.9 : 1 }] }]} 
            onPress={toggleShowErrors}
        >
          <Text style={[styles.actionText, { color: showErrors ? '#FFF' : colors.subText }]}>👁️ Err</Text>
        </Pressable>
        <Pressable 
            style={({pressed}) => [styles.actionBtn, { backgroundColor: colors.subBg, transform: [{ scale: pressed ? 0.9 : 1 }] }]} 
            onPress={useHint}
        >
          <Text style={[styles.actionText, { color: colors.subText }]}>Hint</Text>
        </Pressable>
      </View>

      <View style={styles.numbersRow}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <Pressable 
            key={n} 
            style={({pressed}) => [
                styles.numBtn, 
                { 
                    backgroundColor: colors.btnBg, 
                    shadowColor: isDark ? '#000' : colors.accent,
                    transform: [{ scale: pressed ? 0.9 : 1 }] 
                }
            ]} 
            onPress={() => handleNumberPress(n)}
          >
            <Text style={[styles.numText, { color: isNotesMode ? colors.subText : colors.accent, fontSize: isNotesMode ? 20 : 28 }]}>{n}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
};

const { width } = Dimensions.get('window');
const numBtnSize = (width - 48) / 5.5; // Distribute tightly

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
    width: '100%',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  actionBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 99,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  numbersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    width: '100%',
    marginBottom: 24,
  },
  numBtn: {
    width: numBtnSize,
    height: numBtnSize,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: numBtnSize / 2,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 8,
  },
  numText: {
    fontWeight: '800',
  },
});
