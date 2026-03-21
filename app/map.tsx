import React, { useRef, useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, useColorScheme, Pressable, ScrollView, Dimensions, Modal, ActivityIndicator, Switch, InteractionManager, Alert, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { haptics, Haptics } from '@/utils/haptics';
import { useGameStore, Difficulty, BASE_LEVEL_COUNT, Level } from '@/store/gameStore';
import { useAudio } from '@/context/AudioProvider';
import { generatePuzzle } from '@/utils/sudoku';
import { useTranslation } from 'react-i18next';
import i18n, { changeLanguage } from '@/utils/i18n';
import { RFValue } from '@/utils/responsive';
import Constants from 'expo-constants';
import baseLevelsData from '@/utils/baseLevels.json';

const MASTER_BASE_LEVELS = baseLevelsData as Level[];

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

const getDifficultyForBaseLevel = (levelId: number): Difficulty => {
  if (levelId <= 5) return 'easy';
  if (levelId <= 10) return 'medium';
  if (levelId <= 15) return 'hard';
  return 'expert';
};

const getDifficultyColor = (diff: Difficulty) => {
  switch (diff) {
    case 'easy': return '#4CAF50';
    case 'medium': return '#2196F3';
    case 'hard': return '#FF9800';
    case 'expert': return '#F44336';
    default: return '#2196F3';
  }
};

interface LevelNodeProps {
  point: { id: number; x: number; y: number };
  isUnlocked: boolean;
  isCurrent: boolean;
  isPadlockNode: boolean;
  isGeneratorNode: boolean;
  stars: number;
  difficulty: Difficulty;
  onPress: (id: number, unlocked: boolean, isGen: boolean) => void;
  colors: any;
  isDark: boolean;
}

const LevelNode = React.memo(({
  point,
  isUnlocked,
  isCurrent,
  isPadlockNode,
  isGeneratorNode,
  stars,
  difficulty,
  onPress,
  colors,
  isDark
}: LevelNodeProps) => {
  const { t } = useTranslation();
  
  let nodeColor = colors.locked;
  if (isGeneratorNode) {
    nodeColor = colors.accent;
  } else if (isPadlockNode) {
    nodeColor = colors.locked;
  } else if (isCurrent) {
    nodeColor = '#EF4444'; // Red highlight for current level
  } else if (isUnlocked) {
    nodeColor = getDifficultyColor(difficulty);
  } else {
    nodeColor = colors.locked;
  }

  const nodeOpacity = (isUnlocked || isPadlockNode || isGeneratorNode) ? 1 : 0.4;

  return (
    <Animated.View
      entering={FadeInDown.springify()}
      style={[
        styles.nodeContainer,
        { left: point.x - 40, top: point.y - 40 }
      ]}
    >
      <Pressable
        onPress={() => onPress(point.id, isUnlocked, isGeneratorNode)}
        style={({ pressed }) => [
          styles.circleNode,
          { backgroundColor: nodeColor, borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)', opacity: nodeOpacity },
          (isCurrent || isGeneratorNode) && { transform: [{ scale: 1.15 }], shadowColor: nodeColor, shadowOpacity: 0.6, shadowRadius: 12, elevation: 12 },
          { transform: [{ scale: pressed && (isUnlocked || isGeneratorNode) ? 0.9 : ((isCurrent || isGeneratorNode) ? 1.15 : 1) }] }
        ]}
      >
         <View style={[styles.nodeShine, { backgroundColor: (isUnlocked || isGeneratorNode) ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)' }]} />

        {isGeneratorNode ? (
          <Text style={styles.nodeText}>➕</Text>
        ) : isPadlockNode || (!isUnlocked && !isCurrent) ? (
          <Text style={[styles.lockedIcon, { color: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)' }]}>🔒</Text>
        ) : (
          <Text style={styles.nodeText}>{point.id}</Text>
        )}
      </Pressable>

      {(isUnlocked && !isPadlockNode && !isGeneratorNode) && (
        <View style={styles.starsContainer}>
          {stars > 0 ? (
            <Text style={styles.starsText}>{'⭐'.repeat(stars)}</Text>
          ) : isCurrent ? (
             <Text style={[styles.currentText, { color: colors.accent }]}>PLAY</Text>
          ) : null}
        </View>
      )}
      {isGeneratorNode && (
        <View style={styles.starsContainer}>
           <Text style={[styles.currentText, { color: colors.accent, letterSpacing: 1 }]}>NEW</Text>
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

  const store = useGameStore();
  const { maxUnlockedLevel, lastPlayedLevelId, progress, loadLevel, generatedLevels, generatePack, isHapticsEnabled, toggleHapticsEnabled, softReset, hardReset } = store;
  const { toggleMusic, isPlaying: isMusicEnabled } = useAudio();
  const scrollViewRef = useRef<ScrollView>(null);

  const [isSettingsVisible, setSettingsVisible] = useState(false);
  const [isGeneratorModalVisible, setGeneratorModalVisible] = useState(false);
  const [selectedDiff, setSelectedDiff] = useState<Difficulty>('medium');
  const [selectedCount, setSelectedCount] = useState<number>(10);
  
  const [scrollY, setScrollY] = useState(0); 
  const [isReady, setIsReady] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const colors = isDark
    ? { bg: '#0F0F1A', text: '#FFFFFF', sub: '#8E8EA0', accent: '#6C63FF', locked: '#2A2A35', line: 'rgba(255,255,255,0.1)' }
    : { bg: '#F5F5FA', text: '#1A1A2E', sub: '#6B6B80', accent: '#5A4FE0', locked: '#E0E0E8', line: 'rgba(0,0,0,0.1)' };

  // Always show the 50 base levels + any generated levels + 1 generator node
  const pathLength = BASE_LEVEL_COUNT + generatedLevels.length + 1;
  
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
      // Auto-generate level 1 if completely empty
      if (generatedLevels.length === 0) {
        setIsGenerating(true);
        generatePack('easy', 1).then(() => setIsGenerating(false));
      }
    });
    return () => task.cancel();
  }, [maxUnlockedLevel, generatedLevels.length]);

  const isVisible = (y: number) => {
    return y >= scrollY - 1200 && y <= scrollY + SCREEN_HEIGHT + 1200;
  };

  const handleLevelPress = async (levelId: number, isUnlocked: boolean, isGenNode: boolean) => {
    if (isGenNode) {
        haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        setGeneratorModalVisible(true);
        return;
    }

    if (!isUnlocked && levelId !== maxUnlockedLevel && levelId <= BASE_LEVEL_COUNT) {
      haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    
    haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    let levelData = levelId <= BASE_LEVEL_COUNT
       ? MASTER_BASE_LEVELS.find(l => l.id === levelId)
       : generatedLevels.find(l => l.id === levelId);
       
    if (!levelData) {
       Alert.alert("Error", "Level data not found.");
       return;
    }
    
    loadLevel(levelData);
    router.push(`/game?levelId=${levelId}`);
  };

  const handleGenerate = async () => {
     setIsGenerating(true);
     await generatePack(selectedDiff, selectedCount);
     setIsGenerating(false);
     setGeneratorModalVisible(false);
     haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
     
     // Scroll up a bit so they see the new nodes
     scrollViewRef.current?.scrollTo({ y: scrollY - 200, animated: true });
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

              const isGeneratorNode = index === pathPoints.length - 1;
              const isPadlockNode = false; 
              // All levels are now accessible at all times as requested
              const isUnlocked = true;
              const isCurrent = point.id === Math.max(1, maxUnlockedLevel);
              const levelProgress = progress.find(p => p.levelId === point.id);
              const stars = levelProgress?.stars || 0;
              
              const diffFromStore = point.id <= BASE_LEVEL_COUNT 
                 ? MASTER_BASE_LEVELS.find(l => l.id === point.id)?.difficulty || 'easy'
                 : generatedLevels.find(l => l.id === point.id)?.difficulty || 'easy';

              return (
                <LevelNode
                  key={`node-${point.id}`}
                  point={point}
                  isUnlocked={isUnlocked}
                  isCurrent={isCurrent}
                  isPadlockNode={isPadlockNode}
                  isGeneratorNode={isGeneratorNode}
                  stars={stars}
                  difficulty={diffFromStore}
                  onPress={handleLevelPress}
                  colors={colors}
                  isDark={isDark}
                />
              );
            })}
          </>
        )}
      </ScrollView>

      {/* Generator Modal */}
      <Modal visible={isGeneratorModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
           <View style={[styles.modalContent, { backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF', alignItems: 'flex-start' }]}>
             <Text style={[styles.headerTitle, { color: colors.text, marginBottom: 24 }]}>Generate Levels</Text>
             
             <Text style={[styles.generatorLabel, { color: colors.sub }]}>DIFFICULTY</Text>
             <View style={styles.chipRow}>
               {(['easy', 'medium', 'hard', 'expert'] as Difficulty[]).map(diff => (
                 <Pressable key={diff} onPress={() => setSelectedDiff(diff)} style={[styles.chip, selectedDiff === diff && { backgroundColor: getDifficultyColor(diff), borderColor: getDifficultyColor(diff) }]}>
                    <Text style={[styles.chipText, { color: selectedDiff === diff ? '#FFF' : colors.sub }]}>{diff.toUpperCase()}</Text>
                 </Pressable>
               ))}
             </View>

             <Text style={[styles.generatorLabel, { color: colors.sub, marginTop: 24 }]}>AMOUNT</Text>
             <View style={styles.chipRow}>
               {[5, 10, 20].map(count => (
                 <Pressable key={count} onPress={() => setSelectedCount(count)} style={[styles.chip, selectedCount === count && { backgroundColor: colors.accent, borderColor: colors.accent }]}>
                    <Text style={[styles.chipText, { color: selectedCount === count ? '#FFF' : colors.sub }]}>{count} Levels</Text>
                 </Pressable>
               ))}
             </View>

             <View style={{ marginTop: 40, flexDirection: 'row', gap: 16, width: '100%' }}>
               <Pressable style={[styles.genButton, { backgroundColor: 'transparent', borderWidth: 2, borderColor: colors.locked, flex: 1 }]} onPress={() => setGeneratorModalVisible(false)} disabled={isGenerating}>
                 <Text style={[styles.genButtonText, { color: colors.text }]}>Cancel</Text>
               </Pressable>
               <Pressable style={[styles.genButton, { backgroundColor: colors.accent, flex: 2 }]} onPress={handleGenerate} disabled={isGenerating}>
                 {isGenerating ? <ActivityIndicator color="#FFF" /> : <Text style={styles.genButtonText}>Generate</Text>}
               </Pressable>
             </View>
           </View>
        </View>
      </Modal>

      {/* Settings Modal */}
      <Modal visible={isSettingsVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
           <View style={[styles.modalContent, { backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF', alignItems: 'flex-start' }]}>
             <Text style={[styles.headerTitle, { color: colors.text, marginBottom: 24 }]}>Settings</Text>
             
             <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, width: '100%' }}>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>Music</Text>
                <Switch value={isMusicEnabled} onValueChange={toggleMusic} trackColor={{ false: colors.locked, true: colors.accent }} />
             </View>

             <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, width: '100%' }}>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>Haptics/Vibration</Text>
                <Switch value={isHapticsEnabled} onValueChange={toggleHapticsEnabled} trackColor={{ false: colors.locked, true: colors.accent }} />
             </View>

             <Pressable 
                style={({pressed}) => [styles.closeButton, { backgroundColor: '#EF4444', marginBottom: 12, width: '100%', flexDirection: 'row', justifyContent: 'center', opacity: pressed ? 0.8 : 1 }]} 
                onPress={() => {
                  Alert.alert("Delete Generated Levels", "This will delete all your custom generated levels, keeping your main progress safe.", [
                    { text: "Cancel", style: "cancel" },
                    { text: "Delete", style: "destructive", onPress: () => {
                       softReset();
                       setSettingsVisible(false);
                       haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                    }}
                  ]);
                }}
             >
                <Text style={[styles.closeButtonText, { color: '#FFF' }]}>🗑️ Delete Custom Levels</Text>
             </Pressable>

             <Pressable 
                style={({pressed}) => [styles.closeButton, { backgroundColor: '#B91C1C', marginBottom: 16, width: '100%', flexDirection: 'row', justifyContent: 'center', opacity: pressed ? 0.8 : 1 }]} 
                onPress={() => {
                  Alert.alert("HARD RESET", "Are you sure? This will delete ALL generated levels and reset your entire progression to zero.", [
                    { text: "Cancel", style: "cancel" },
                    { text: "HARD RESET", style: "destructive", onPress: () => {
                       hardReset();
                       setSettingsVisible(false);
                       haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                    }}
                  ]);
                }}
             >
                <Text style={[styles.closeButtonText, { color: '#FFF' }]}>⚠️ Hard Reset Game</Text>
             </Pressable>

             <Pressable style={({pressed}) => [styles.closeButton, { backgroundColor: colors.locked, width: '100%', opacity: pressed ? 0.8 : 1, paddingVertical: 18 }]} onPress={() => setSettingsVisible(false)}>
               <Text style={[styles.closeButtonText, { color: colors.text }]}>Close Settings</Text>
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
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 32, paddingBottom: 48 },
  closeButton: { padding: 14, alignSelf: 'center', backgroundColor: '#6C63FF', borderRadius: 8 },
  closeButtonText: { color: 'white', fontWeight: 'bold' },
  generatorLabel: { fontSize: 13, fontWeight: '800', letterSpacing: 1, marginBottom: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  chip: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, borderWidth: 2, borderColor: '#E0E0E8' },
  chipText: { fontSize: 13, fontWeight: '800' },
  genButton: { paddingVertical: 16, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  genButtonText: { color: 'white', fontSize: 16, fontWeight: '900', letterSpacing: 1 }
});
