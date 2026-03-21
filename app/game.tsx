import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, SafeAreaView, Alert, useColorScheme } from 'react-native';
import { useGameStore } from '../store/gameStore';
import { Grid } from '../components/sudoku/Grid';
import { Numpad } from '../components/sudoku/Numpad';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { generatePuzzle } from '../utils/sudoku';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';

export default function GameScreen() {
  const router = useRouter();
  const { levelId, date } = useLocalSearchParams<{ levelId?: string, date?: string }>();
  const isDark = useColorScheme() === 'dark';
  
  const { 
    timer, 
    mistakes, 
    tickTimer,
    isGameOver,
    saveCurrentState,
    completeLevel,
    completeDailyChallenge,
    currentLevel,
    dailyLevelDate,
    difficulty,
    validateBoard,
    resetLevel
  } = useGameStore();

  const [isNotesMode, setIsNotesMode] = useState(false);

  useEffect(() => {
    if (levelId === 'daily' && date) {
      if (!currentLevel || currentLevel.id !== 999999) {
        const { grid, solution } = generatePuzzle('hard');
        const dailyLevel = {
           id: 999999,
           difficulty: 'hard' as const,
           initialGrid: grid,
           solution,
           updatedAt: Date.now()
        };
        useGameStore.setState({ dailyLevelDate: date });
        useGameStore.getState().loadLevel(dailyLevel);
      }
    }
  }, [levelId, date]);

  useEffect(() => {
    return () => {
      useGameStore.getState().saveCurrentState();
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      tickTimer();
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isGameOver) {
      if (currentLevel) {
        // Calculate stars based on mistakes: 0 = 3 stars, 1 = 2 stars, 2+ = 1 star
        let stars = 3;
        if (mistakes === 1) stars = 2;
        else if (mistakes >= 2) stars = 1;
        
        if (currentLevel.id === 999999 && dailyLevelDate) {
           completeDailyChallenge(dailyLevelDate, timer, stars);
        } else {
           completeLevel(currentLevel.id, timer, stars);
        }
      }

      Alert.alert(
        "Level Complete!",
        `Time: ${formatTime(timer)}\nMistakes: ${mistakes}`,
        [
          { text: "Awesome!", onPress: () => router.back() }
        ]
      );
    }
  }, [isGameOver]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleValidate = () => {
    const { isWin, errorCount, isFilled } = validateBoard();
    if (!isWin) {
      if (!isFilled && errorCount === 0) {
        Alert.alert("Looking Good!", "There are no mistakes currently on the board, but the grid isn't full yet.");
      } else {
        Alert.alert("Mistakes Found", `There are currently ${errorCount} incorrect numbers on the board.`);
      }
    }
  };

  const colors = isDark 
    ? { bg: '#0F0F1A', text: '#FFFFFF', sub: '#8E8EA0', accent: '#6C63FF', error: '#EF4444' }
    : { bg: '#F5F5FA', text: '#1A1A2E', sub: '#6B6B80', accent: '#5A4FE0', error: '#EF4444' };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <Animated.View entering={FadeInDown.delay(100).springify()} style={[styles.header, { backgroundColor: isDark ? 'rgba(15,15,26,0.85)' : 'rgba(245,245,250,0.85)' }]}>
        <BlurView intensity={20} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={15}>
          <Text style={[styles.backText, { color: colors.sub }]}>← Back</Text>
        </Pressable>
        <View style={{ alignItems: 'center' }}>
            <Text style={[styles.title, { color: colors.text }]}>
               {currentLevel?.id === 999999 ? 'Daily Challenge' : `Level ${currentLevel?.id || ''}`}
            </Text>
            <Text style={[styles.subtitle, { color: colors.accent }]}>
               {difficulty.toUpperCase()}
            </Text>
        </View>
        <Pressable 
            onPress={() => {
                Alert.alert("Reset Level", "Are you sure you want to clear your entire board and restart the timer?", [
                    {text: "Cancel", style: "cancel"},
                    {text: "Reset", style: "destructive", onPress: resetLevel}
                ]);
            }} 
            style={{ width: 60, alignItems: 'center' }} 
            hitSlop={15}
        >
          <Text style={[styles.backText, { color: colors.error }]}>Reset</Text>
        </Pressable>
      </Animated.View>

      <View style={{ flex: 1 }}>
        <Animated.View entering={FadeInUp.delay(200).springify()} style={styles.statsRow}>
          <View style={styles.statBubble}>
             <Text style={[styles.statValue, { color: colors.text }]}>{formatTime(timer)}</Text>
          </View>
          
          <Pressable 
            style={({pressed}) => [styles.smallValidateBtn, { backgroundColor: colors.accent, transform: [{ scale: pressed ? 0.95 : 1 }] }]}
            onPress={handleValidate}
          >
            <Text style={styles.smallValidateText}>✓ CHECK</Text>
          </Pressable>

          {mistakes > 0 && (
             <View style={[styles.statBubble, { backgroundColor: 'transparent', paddingHorizontal: 10 }]}>
                 <Text style={[styles.statValue, { color: colors.error, fontSize: 16 }]}>{mistakes} ⚠️</Text>
             </View>
          )}
        </Animated.View>

        <View style={styles.gridWrapper}>
          <Grid />
        </View>

        <Animated.View entering={FadeInUp.delay(400).springify()} style={styles.numpadWrapper}>
          <Numpad isNotesMode={isNotesMode} toggleNotesMode={() => setIsNotesMode(!isNotesMode)} />
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 50,
    paddingBottom: 16,
    zIndex: 10,
  },
  backBtn: { width: 60 },
  backText: { fontSize: 16, fontWeight: '700' },
  title: { fontSize: 20, fontWeight: '900' },
  subtitle: { fontSize: 12, fontWeight: '800', letterSpacing: 1, marginTop: 2 },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    gap: 16,
  },
  statBubble: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  smallValidateBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallValidateText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  gridWrapper: {
    alignItems: 'center',
    marginTop: 32,
    zIndex: 1,
  },
  numpadWrapper: {
    marginTop: 'auto',
    marginBottom: 16,
    paddingBottom: 24,
  },
});
