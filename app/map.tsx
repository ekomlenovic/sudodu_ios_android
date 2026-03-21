import React, { useRef, useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, useColorScheme, Pressable, ScrollView, Dimensions, Modal, ActivityIndicator, Switch, InteractionManager, Alert, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { haptics, Haptics } from '@/utils/haptics';
import { useGameStore, Difficulty } from '@/store/gameStore';
import { useAudio } from '@/context/AudioProvider';
import { generatePuzzle } from '@/utils/sudoku';
import { useTranslation } from 'react-i18next';
import i18n, { changeLanguage } from '@/utils/i18n';
import { RFValue } from '@/utils/responsive';
import Constants from 'expo-constants';

const { width } = Dimensions.get('window');
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Candy crush style path generator
const generatePathPoints = (count: number, screenHeight: number) => {
  const points = [];
  const amplitude = width * 0.25;
  const centerX = width / 2;
  const nodeSpacing = 130;

  const contentHeight = count * nodeSpacing + 150;
  const totalHeight = Math.max(screenHeight * 1.1, contentHeight);

  // Level 1 starts at BOTTOM
  for (let i = 0; i < count; i++) {
    const xOffset = Math.sin(i * 1.5) * amplitude;
    points.push({
      id: i + 1,
      x: centerX + xOffset,
      y: totalHeight - 150 - (i * nodeSpacing),
    });
  }
  return { points, totalHeight };
};

const getDifficultyForLevel = (levelId: number): Difficulty => {
  if (levelId <= 5) return 'easy';
  if (levelId <= 15) return 'medium';
  if (levelId <= 30) return 'hard';
  return 'expert';
};

const getDifficultyColor = (diff: Difficulty) => {
  switch (diff) {
    case 'easy': return '#4CAF50';
    case 'medium': return '#2196F3';
    case 'hard': return '#FF9800';
    case 'expert': return '#F44336';
  }
};

interface LevelNodeProps {
  point: { id: number; x: number; y: number };
  isUnlocked: boolean;
  isCurrent: boolean;
  isPadlockNode: boolean;
  stars: number;
  onPress: (id: number, unlocked: boolean) => void;
  colors: any;
  isDark: boolean;
}

const LevelNode = React.memo(({
  point,
  isUnlocked,
  isCurrent,
  isPadlockNode,
  stars,
  onPress,
  colors,
  isDark
}: LevelNodeProps) => {
  const { t } = useTranslation();
  
  const difficulty = getDifficultyForLevel(point.id);
  
  let nodeColor = colors.locked;
  if (isPadlockNode) {
    nodeColor = colors.locked;
  } else if (isCurrent) {
    nodeColor = '#EF4444'; // Red highlight for current level
  } else if (isUnlocked) {
    nodeColor = getDifficultyColor(difficulty);
  } else {
    nodeColor = colors.locked;
  }

  const nodeOpacity = (isUnlocked || isPadlockNode) ? 1 : 0.4;

  return (
    <Animated.View
      entering={FadeInDown.springify()}
      style={[
        styles.nodeContainer,
        { left: point.x - 40, top: point.y - 40 }
      ]}
    >
      <Pressable
        onPress={() => onPress(point.id, isUnlocked)}
        style={({ pressed }) => [
          styles.circleNode,
          { backgroundColor: nodeColor, borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)', opacity: nodeOpacity },
          isCurrent && { transform: [{ scale: 1.15 }], shadowColor: nodeColor, shadowOpacity: 0.6, shadowRadius: 12, elevation: 12 },
          { transform: [{ scale: pressed && (isUnlocked) ? 0.9 : (isCurrent ? 1.15 : 1) }] }
        ]}
      >
         <View style={[styles.nodeShine, { backgroundColor: isUnlocked ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)' }]} />

        {isPadlockNode || (!isUnlocked && !isCurrent) ? (
          <Text style={[styles.lockedIcon, { color: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)' }]}>🔒</Text>
        ) : (
          <Text style={styles.nodeText}>{point.id}</Text>
        )}
      </Pressable>

      {isUnlocked && !isPadlockNode && (
        <View style={styles.starsContainer}>
          {stars > 0 ? (
            <Text style={styles.starsText}>{'⭐'.repeat(stars)}</Text>
          ) : isCurrent ? (
            <Text style={[styles.currentText, { color: colors.accent }]}>PLAY</Text>
          ) : null}
        </View>
      )}
    </Animated.View>
  );
});

export default function MapScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  const { maxUnlockedLevel, lastPlayedLevelId, progress, isHapticsEnabled, toggleHapticsEnabled, loadLevel, generatedLevels, addGeneratedLevel } = useGameStore();
  const { toggleMusic, isPlaying: isMusicEnabled } = useAudio();
  const scrollViewRef = useRef<ScrollView>(null);

  const [isSettingsVisible, setSettingsVisible] = useState(false);
  const [scrollY, setScrollY] = useState(0); 
  const [isReady, setIsReady] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const colors = isDark
    ? { bg: '#0F0F1A', text: '#FFFFFF', sub: '#8E8EA0', accent: '#6C63FF', locked: '#2A2A35', line: 'rgba(255,255,255,0.1)' }
    : { bg: '#F5F5FA', text: '#1A1A2E', sub: '#6B6B80', accent: '#5A4FE0', locked: '#E0E0E8', line: 'rgba(0,0,0,0.1)' };

  // Always show 10 levels beyond maxUnlockedLevel
  const pathLength = maxUnlockedLevel + 10;
  
  const { points: pathPoints, totalHeight } = useMemo(() => {
    return generatePathPoints(pathLength, SCREEN_HEIGHT);
  }, [pathLength, SCREEN_HEIGHT]);

  const initialY = useMemo(() => {
    const targetId = (lastPlayedLevelId && lastPlayedLevelId < 900000) ? lastPlayedLevelId : maxUnlockedLevel;
    const targetNode = pathPoints.find(p => p.id === targetId);
    if (targetNode) {
      return Math.max(0, targetNode.y - SCREEN_HEIGHT / 2 + 50);
    }
    return Math.max(0, totalHeight - SCREEN_HEIGHT);
  }, [pathPoints, lastPlayedLevelId, maxUnlockedLevel, SCREEN_HEIGHT]);

  useEffect(() => {
    setScrollY(initialY);
    if (isReady) {
      const timer = setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: initialY, animated: false });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [initialY, isReady]);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setIsReady(true);
    });
    return () => task.cancel();
  }, [maxUnlockedLevel]);

  const isVisible = (y: number) => {
    return y >= scrollY - 1200 && y <= scrollY + SCREEN_HEIGHT + 1200;
  };

  const handleLevelPress = async (levelId: number, isUnlocked: boolean) => {
    if (!isUnlocked && levelId !== maxUnlockedLevel) {
      haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    
    haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Check if level already generated
    let levelData = generatedLevels.find(l => l.id === levelId);
    
    if (!levelData) {
      setIsGenerating(true);
      // Let React render the spinner/state first
      await new Promise(res => setTimeout(res, 50)); 
      
      const difficulty = getDifficultyForLevel(levelId);
      const { grid, solution } = generatePuzzle(difficulty);
      levelData = {
        id: levelId,
        difficulty,
        initialGrid: grid,
        solution,
        updatedAt: Date.now()
      };
      addGeneratedLevel(levelData);
      setIsGenerating(false);
    }
    
    loadLevel(levelData);
    router.push(`/game?levelId=${levelId}`);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Animated.View entering={FadeInUp.delay(100).springify()} style={[styles.header, { backgroundColor: isDark ? 'rgba(15,15,26,0.85)' : 'rgba(245,245,250,0.85)' }]}>
        <BlurView intensity={20} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.backText, { color: colors.sub }]}>← Back</Text>
        </Pressable>
        {isGenerating ? <ActivityIndicator color={colors.accent} size="small" /> : <Text style={[styles.headerTitle, { color: colors.text }]}>Sudoku Map</Text>}
        <Pressable onPress={() => setSettingsVisible(true)} style={styles.settingsButton}>
          <Text style={{ fontSize: 24, color: colors.text }}>⚙️</Text>
        </Pressable>
      </Animated.View>

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={{ height: totalHeight }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        decelerationRate={0.9}
        contentOffset={{ x: 0, y: initialY }}
        onScroll={(e) => setScrollY(e.nativeEvent.contentOffset.y)}
      >
        {!isReady ? (
          <View style={{ flex: 1, height: totalHeight }} />
        ) : (
          <>
            {pathPoints.map((point, index) => {
              if (index === pathPoints.length - 1) return null;
              const nextPoint = pathPoints[index + 1];
              if (!isVisible(point.y) && !isVisible(nextPoint.y)) return null;

              const isUnlockedLine = maxUnlockedLevel > point.id;
              const dx = nextPoint.x - point.x;
              const dy = nextPoint.y - point.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              const angle = Math.atan2(dy, dx) * (180 / Math.PI);

              return (
                <View
                  key={`line-${point.id}`}
                  style={{
                    position: 'absolute',
                    left: point.x,
                    top: point.y,
                    width: distance,
                    height: 8,
                    backgroundColor: isUnlockedLine ? colors.accent : colors.line,
                    borderRadius: 4,
                    transform: [
                       { translateX: 0 },
                       { translateY: -4 },
                       { rotate: `${angle}deg` },
                       { translateX: distance / 2 - distance / 2 },
                    ],
                    transformOrigin: 'left',
                    zIndex: 1,
                  }}
                />
              );
            })}

            {pathPoints.map((point, index) => {
              if (!isVisible(point.y)) return null;

              const isPadlockNode = index === pathPoints.length - 1;
              const isUnlocked = point.id <= maxUnlockedLevel;
              const isCurrent = point.id === maxUnlockedLevel;
              const levelProgress = progress.find(p => p.levelId === point.id);
              const stars = levelProgress?.stars || 0;

              return (
                <LevelNode
                  key={`node-${point.id}`}
                  point={point}
                  isUnlocked={isUnlocked}
                  isCurrent={isCurrent}
                  isPadlockNode={isPadlockNode}
                  stars={stars}
                  onPress={handleLevelPress}
                  colors={colors}
                  isDark={isDark}
                />
              );
            })}
          </>
        )}
      </ScrollView>

      {/* Basic Settings Modal */}
      <Modal visible={isSettingsVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
           <View style={[styles.modalContent, { backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF' }]}>
             <Pressable style={styles.closeButton} onPress={() => setSettingsVisible(false)}>
               <Text style={styles.closeButtonText}>Close</Text>
             </Pressable>
           </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 24,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  backButton: { width: 60 },
  backText: { fontSize: 16, fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  nodeContainer: {
    position: 'absolute',
    width: 60,
    height: 80,
    alignItems: 'center',
    zIndex: 10,
  },
  settingsButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleNode: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 8,
    borderWidth: 2,
    overflow: 'hidden',
  },
  nodeShine: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: 2,
    height: '45%',
    borderRadius: 30,
  },
  nodeText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    zIndex: 2,
  },
  lockedIcon: { fontSize: 20, zIndex: 2 },
  starsContainer: {
    marginTop: 4,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starsText: { fontSize: 10, letterSpacing: 1 },
  currentText: { fontSize: 12, fontWeight: '800' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 48 },
  closeButton: { padding: 14, alignSelf: 'center', backgroundColor: '#6C63FF', borderRadius: 8 },
  closeButtonText: { color: 'white', fontWeight: 'bold' }
});
