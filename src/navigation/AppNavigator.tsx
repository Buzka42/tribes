import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MapScreen from '../screens/MapScreen';
import WizardScreen from '../screens/WizardScreen';
import LoginScreen from '../screens/LoginScreen';
import { useAuth } from '../hooks/useAuth';
import { ActivityIndicator, View } from 'react-native';

export type RootStackParamList = {
  Map: undefined;
  Wizard: undefined;
  Login: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { user, firebaseUser, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#d4af37" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {(!user && !firebaseUser) ? (
          <Stack.Screen 
            name="Login" 
            component={LoginScreen} 
            options={{ headerShown: false }}
          />
        ) : (
          <>
            <Stack.Screen 
              name="Map" 
              component={MapScreen} 
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="Wizard" 
              component={WizardScreen} 
              options={{ presentation: 'modal', title: 'Create Event' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
