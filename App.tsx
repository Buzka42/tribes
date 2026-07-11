import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/hooks/useAuth';
import { LanguageProvider } from './src/i18n';
import { IntroVideo } from './src/components/IntroVideo';
import { INTRO_PLAYED_KEY, INTRO_EVERY_LAUNCH_KEY } from './src/utils/introPrefs';
import { useFonts } from 'expo-font';
import {
  Merriweather_700Bold,
  Merriweather_900Black,
} from '@expo-google-fonts/merriweather';
import {
  Outfit_300Light,
  Outfit_400Regular,
  Outfit_500Medium,
} from '@expo-google-fonts/outfit';
import { ActivityIndicator, View } from 'react-native';

export default function App() {
  const [fontsLoaded] = useFonts({
    Merriweather_700Bold,
    Merriweather_900Black,
    Outfit_300Light,
    Outfit_400Regular,
    Outfit_500Medium,
  });

  // null = still checking AsyncStorage; true/false once resolved.
  const [showIntro, setShowIntro] = useState<boolean | null>(null);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(INTRO_PLAYED_KEY),
      AsyncStorage.getItem(INTRO_EVERY_LAUNCH_KEY),
    ])
      .then(([played, everyLaunch]) => {
        setShowIntro(everyLaunch === '1' || played !== '1');
      })
      .catch(() => setShowIntro(false));
  }, []);

  const dismissIntro = () => {
    setShowIntro(false);
    AsyncStorage.setItem(INTRO_PLAYED_KEY, '1').catch(() => {});
  };

  if (!fontsLoaded || showIntro === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1A2421' }}>
        <ActivityIndicator size="large" color="#D9A06F" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </LanguageProvider>
      {showIntro && <IntroVideo onDone={dismissIntro} />}
    </SafeAreaProvider>
  );
}
