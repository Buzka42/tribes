import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MapScreen from '../screens/MapScreen';
import WizardScreen from '../screens/WizardScreen';

export type RootStackParamList = {
  Map: undefined;
  Wizard: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}
