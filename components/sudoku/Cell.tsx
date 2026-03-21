import React, { useEffect } from 'react';
import { Pressable, Text, StyleSheet, View, useColorScheme } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, interpolateColor } from 'react-native-reanimated';

interface CellProps {
  row: number;
  col: number;
  size: number;
  value: number;
  isInitial: boolean;
  isSelected: boolean;
  isRelated: boolean;
  isSameAsSelected: boolean;
  isError: boolean;
  notes: number[];
  onPress: () => void;
}

export const Cell: React.FC<CellProps> = ({
  row,
  col,
  size,
  value,
  isInitial,
  isSelected,
  isRelated,
  isSameAsSelected,
  isError,
  notes,
  onPress,
}) => {
  const isDark = useColorScheme() === 'dark';

  const isRightEdge = (col + 1) % 3 === 0 && col !== 8;
  const isBottomEdge = (row + 1) % 3 === 0 && row !== 8;

  const colors = isDark ? {
    bg: '#1A1A2E',
    related: '#252542',
    sameVal: '#3A3A60',
    selected: '#5A4FE0',
    textInitial: '#FFFFFF',
    textUser: '#8A84FF',
    textError: '#EF4444',
    border: 'rgba(255,255,255,0.08)',
    thickBorder: 'rgba(255,255,255,0.3)',
    note: '#8E8EA0'
  } : {
    bg: '#FFFFFF',
    related: '#F0F0F8',
    sameVal: '#E0E0F0',
    selected: '#5A4FE0',
    textInitial: '#1A1A2E',
    textUser: '#5A4FE0',
    textError: '#EF4444',
    border: 'rgba(0,0,0,0.06)',
    thickBorder: 'rgba(0,0,0,0.2)',
    note: '#6B6B80'
  };

  // Determine state value for animation (0: base, 1: related, 2: sameVal, 3: selected)
  let stateVal = 0;
  if (isSelected) stateVal = 3;
  else if (isSameAsSelected) stateVal = 2;
  else if (isRelated) stateVal = 1;

  const animState = useSharedValue(stateVal);

  useEffect(() => {
    animState.value = withTiming(stateVal, { duration: 250 });
  }, [stateVal]);

  const animatedBgStyle = useAnimatedStyle(() => {
    const bg = interpolateColor(
      animState.value,
      [0, 1, 2, 3],
      [colors.bg, colors.related, colors.sameVal, colors.selected]
    );
    return { backgroundColor: bg };
  });

  let textColor = isError ? colors.textError : (isInitial ? colors.textInitial : colors.textUser);
  if (isSelected) textColor = '#FFFFFF';

  return (
    <Pressable onPress={onPress} style={[styles.cellWrapper, { width: size, height: size }, isRightEdge && { borderRightWidth: 2, borderRightColor: colors.thickBorder }, isBottomEdge && { borderBottomWidth: 2, borderBottomColor: colors.thickBorder }, { borderColor: colors.border }]}>
      <Animated.View style={[StyleSheet.absoluteFill, animatedBgStyle]} />
      
      {value !== 0 ? (
        <Text style={[styles.text, { color: textColor, fontWeight: isInitial ? '800' : '600' }]}>
          {value}
        </Text>
      ) : (
        <View style={styles.notesContainer}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <Text key={n} style={[styles.noteText, { color: isSelected ? 'rgba(255,255,255,0.7)' : colors.note }]}>
              {notes.includes(n) ? n : ' '}
            </Text>
          ))}
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  cellWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  text: {
    fontSize: 24,
    zIndex: 2,
  },
  notesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    height: '100%',
    padding: 2,
    zIndex: 2,
  },
  noteText: {
    width: '33.33%',
    height: '33.33%',
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
  },
});
