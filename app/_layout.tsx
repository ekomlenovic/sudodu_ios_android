import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AudioProvider } from '@/context/AudioProvider';
import * as Linking from 'expo-linking';
import '@/utils/i18n';

const DARK_BG = '#0F0F1A';
const LIGHT_BG = '#F5F5FA';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  useEffect(() => {
    // Sudoku Deep link handling could go here.
  }, []);

  return (
    <AudioProvider>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: isDark ? DARK_BG : LIGHT_BG }}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: isDark ? DARK_BG : LIGHT_BG },
            animation: 'slide_from_right',
          }}
        />
      </GestureHandlerRootView>
    </AudioProvider>
  );
}
