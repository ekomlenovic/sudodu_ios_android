import React from 'react';
import { View, Text, StyleSheet, Pressable, SafeAreaView, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { useTranslation } from 'react-i18next';

export default function TutorialScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  const colors = isDark 
    ? { bg: '#0F0F1A', text: '#FFFFFF', sub: '#8E8EA0', accent: '#6C63FF' }
    : { bg: '#F5F5FA', text: '#1A1A2E', sub: '#6B6B80', accent: '#5A4FE0' };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { backgroundColor: isDark ? 'rgba(15,15,26,0.85)' : 'rgba(245,245,250,0.85)' }]}>
        <BlurView intensity={20} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.backText, { color: colors.sub }]}>← Back</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>How to Play</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.accent }]}>Sudoku Rules</Text>
        <View style={{ marginTop: 24, gap: 16 }}>
          <Text style={[styles.body, { color: colors.text }]}>1. Each row must contain the numbers 1-9 without repeating.</Text>
          <Text style={[styles.body, { color: colors.text }]}>2. Each column must contain the numbers 1-9 without repeating.</Text>
          <Text style={[styles.body, { color: colors.text }]}>3. Each 3x3 block must contain the numbers 1-9 without repeating.</Text>
          <Text style={[styles.body, { color: colors.sub }]}>Tap a cell and choose a number to fill it. You can use the Notes features to mark possibilities. Three mistakes, and you lose!</Text>
        </View>

        <Pressable style={[styles.btn, { backgroundColor: colors.accent }]} onPress={() => router.back()}>
          <Text style={styles.btnText}>Got it!</Text>
        </Pressable>
      </View>
    </SafeAreaView>
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
    top: 0, left: 0, right: 0,
    zIndex: 100,
  },
  backButton: { width: 60 },
  backText: { fontSize: 16, fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  content: {
    paddingTop: 140,
    paddingHorizontal: 32,
    alignItems: 'center'
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  body: {
    fontSize: 18,
    lineHeight: 26,
    textAlign: 'center'
  },
  btn: {
    marginTop: 48,
    paddingVertical: 16,
    paddingHorizontal: 64,
    borderRadius: 16,
  },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 18 }
});
