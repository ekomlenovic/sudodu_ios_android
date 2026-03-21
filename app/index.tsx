import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, useColorScheme, Modal, Switch, Animated as RNAnimated, Easing, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeInUp, withTiming, useAnimatedStyle, useSharedValue, withRepeat, withSequence } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { haptics } from '@/utils/haptics';
import { useAudio } from '@/context/AudioProvider';
import { useTranslation } from 'react-i18next';
import i18n, { changeLanguage } from '@/utils/i18n';
import { RFValue } from '@/utils/responsive';
import { BlurView } from 'expo-blur';
import { generatePuzzle } from '@/utils/sudoku';
import { useGameStore, Difficulty, BASE_LEVEL_COUNT, Level } from '@/store/gameStore';
import baseLevelsData from '@/utils/baseLevels.json';

const MASTER_BASE_LEVELS = baseLevelsData as Level[];

const { width, height } = Dimensions.get('window');

// Abstract shapes for background
const BackgroundShapes = () => {
    return (
      <View style={StyleSheet.absoluteFillObject}>
         <View style={[styles.blob, { top: -100, right: -100, backgroundColor: 'rgba(90, 79, 224, 0.4)' }]} />
         <View style={[styles.blob, { top: height * 0.4, left: -150, backgroundColor: 'rgba(239, 68, 68, 0.3)', width: 350, height: 350 }]} />
         <View style={[styles.blob, { bottom: -50, right: -50, backgroundColor: 'rgba(16, 185, 129, 0.3)', width: 250, height: 250 }]} />
         <BlurView intensity={80} style={StyleSheet.absoluteFillObject} tint="default" />
      </View>
    );
};

export default function HomeScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  const { progress, dailyChallengeProgress, maxUnlockedLevel, lastPlayedLevelId, loadLevel, generatedLevels, addGeneratedLevel, isHapticsEnabled, toggleHapticsEnabled, currentLevel } = useGameStore();
  const { toggleMusic, isPlaying: isMusicEnabled } = useAudio();

  const [isSettingsVisible, setSettingsVisible] = useState(false);
  const [canResume, setCanResume] = useState(false);

  useEffect(() => {
    const targetId = (lastPlayedLevelId && lastPlayedLevelId < 900000) ? lastPlayedLevelId : maxUnlockedLevel;
    if (targetId) setCanResume(true);
  }, [lastPlayedLevelId, maxUnlockedLevel]);

  const colors = isDark 
    ? { bg: '#0F0F1A', text: '#FFFFFF', sub: '#8E8EA0', accent: '#6C63FF', card: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)' }
    : { bg: '#F0F0F8', text: '#1A1A2E', sub: '#6B6B80', accent: '#5A4FE0', card: 'rgba(255,255,255,0.7)', border: 'rgba(0,0,0,0.05)' };

  const getDifficultyForLevel = (levelId: number): Difficulty => {
    if (levelId <= 5) return 'easy';
    if (levelId <= 15) return 'medium';
    if (levelId <= 30) return 'hard';
    return 'expert';
  };

  const handlePlay = () => {
    haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const targetId = (lastPlayedLevelId && lastPlayedLevelId < 900000) ? lastPlayedLevelId : maxUnlockedLevel;
    
    let levelData = targetId <= BASE_LEVEL_COUNT 
      ? MASTER_BASE_LEVELS.find(l => l.id === targetId)
      : generatedLevels.find(l => l.id === targetId);

    if (!levelData) {
      // If it's a map level > 50 that was somehow lost/not generated, we can't play it
      // but it shouldn't happen with the current logic.
      if (targetId <= BASE_LEVEL_COUNT) {
         Alert.alert("Error", "Base level data not found.");
         return;
      }
      
      // Fallback for safety (though handleLevelPress in Map is the primary entry point)
      const difficulty = getDifficultyForLevel(targetId);
      const { grid, solution } = generatePuzzle(difficulty);
      levelData = { id: targetId, difficulty, initialGrid: grid, solution, updatedAt: Date.now() };
      addGeneratedLevel(levelData);
    }
    
    loadLevel(levelData);
    router.push(`/game?levelId=${targetId}`);
  };

  const today = new Date();
  const dateStr = `${today.getFullYear()}-${(today.getMonth()+1).toString().padStart(2,'0')}-${today.getDate().toString().padStart(2,'0')}`;
  const isDailyCompleted = !!dailyChallengeProgress[dateStr]?.completed;

  const scaleValue = useSharedValue(1);
  const pulseStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scaleValue.value }]
    };
  });

  useEffect(() => {
    scaleValue.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1500 }),
        withTiming(1, { duration: 1500 })
      ),
      -1,
      true
    );
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <BackgroundShapes />
      
      <View style={styles.content}>
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Sudoku</Text>
            <Text style={[styles.subtitle, { color: colors.accent }]}>The Ultimate Puzzle</Text>
        </Animated.View>

        <View style={styles.menuContainer}>
          <Animated.View entering={FadeInUp.delay(200).springify()} style={pulseStyle}>
            <Pressable 
                style={({pressed}) => [styles.playButton, { transform: [{ scale: pressed ? 0.95 : 1 }] }]} 
                onPress={handlePlay}
            >
                <LinearGradient
                    colors={['#8E2DE2', '#4A00E0']}
                    style={styles.gradientBg}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                >
                    <Text style={styles.playText}>
                        {canResume ? 'RESUME PLAY' : 'START PLAYING'}
                    </Text>
                    {canResume && currentLevel && <Text style={styles.playSubtext}>Level {currentLevel.id}</Text>}
                </LinearGradient>
            </Pressable>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(300).springify()}>
              <Pressable 
                  style={({pressed}) => [styles.menuButton, { backgroundColor: colors.card, borderColor: colors.border, transform: [{ scale: pressed ? 0.96 : 1 }] }]} 
                  onPress={() => { haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/map'); }}
              >
                  <Text style={[styles.menuButtonText, { color: colors.text }]}>World Map</Text>
                  <Text style={[styles.iconText]}>🗺️</Text>
              </Pressable>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(400).springify()}>
              <Pressable 
                  style={({pressed}) => [styles.menuButton, { backgroundColor: colors.card, borderColor: colors.border, transform: [{ scale: pressed ? 0.96 : 1 }] }, isDailyCompleted && { opacity: 0.6 }]} 
                  onPress={() => { 
                      haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      router.push(`/game?levelId=daily&date=${dateStr}`);
                  }}
              >
                  <Text style={[styles.menuButtonText, { color: colors.text }]}>{isDailyCompleted ? 'Daily Completed!' : 'Daily Challenge'}</Text>
                  <Text style={[styles.iconText]}>{isDailyCompleted ? '✅' : '🔥'}</Text>
              </Pressable>
          </Animated.View>
        </View>
      </View>

      <Pressable onPress={() => setSettingsVisible(true)} style={styles.settingsBtn}>
         <View style={[styles.settingsIcon, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={{ fontSize: 24 }}>⚙️</Text>
         </View>
      </Pressable>

      {/* Basic Settings Modal */}
      <Modal visible={isSettingsVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
           <View style={[styles.modalContent, { backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF' }]}>
             <Text style={[styles.modalTitle, { color: colors.text }]}>{t('home.options')}</Text>
             
             <View style={styles.settingRow}>
                <View>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>{t('map.background_music')}</Text>
                </View>
                <Switch value={isMusicEnabled} onValueChange={toggleMusic} trackColor={{ false: '#767577', true: colors.accent }} />
             </View>

             <View style={styles.settingRow}>
                <View>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>{t('map.haptic_feedback')}</Text>
                </View>
                <Switch value={isHapticsEnabled} onValueChange={() => { toggleHapticsEnabled(); haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} trackColor={{ false: '#767577', true: colors.accent }} />
             </View>

             <Pressable style={[styles.closeButton, { backgroundColor: colors.accent }]} onPress={() => setSettingsVisible(false)}>
               <Text style={styles.closeButtonText}>Done</Text>
             </Pressable>
           </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  blob: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 60,
  },
  title: {
    fontSize: 54,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 4,
    textTransform: 'uppercase',
    marginTop: -8,
  },
  menuContainer: {
    gap: 16,
  },
  playButton: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#4A00E0',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
    marginBottom: 16,
  },
  gradientBg: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playText: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 1,
  },
  playSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  menuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1,
  },
  menuButtonText: {
    fontSize: 18,
    fontWeight: '700',
  },
  iconText: {
    fontSize: 24,
  },
  settingsBtn: {
    position: 'absolute',
    top: 60,
    right: 24,
  },
  settingsIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 32, paddingBottom: 48, shadowColor: '#000', shadowOffset: { width:0, height:-2 }, shadowOpacity: 0.1, shadowRadius: 10 },
  modalTitle: { fontSize: 24, fontWeight: '800', marginBottom: 24 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(150,150,150,0.2)' },
  settingLabel: { fontSize: 18, fontWeight: '600' },
  closeButton: { padding: 16, alignItems: 'center', borderRadius: 16, marginTop: 32 },
  closeButtonText: { color: 'white', fontWeight: 'bold', fontSize: 18 }
});
