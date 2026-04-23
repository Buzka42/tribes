import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/hooks/useAuth';
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

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1A2421' }}>
        <ActivityIndicator size="large" color="#D9A06F" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
