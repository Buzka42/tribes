import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type WizardScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Wizard'>;

interface Props {
  navigation: WizardScreenNavigationProp;
}

export default function WizardScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Event Wizard</Text>
      <Text>Step 1: Interest/Title/Limit</Text>
      <Text>Step 2: Mapbox Location/Time/Privacy toggle</Text>
      <Text>Step 3: Token Cost Summary</Text>
      <Button title="Close Wizard" onPress={() => navigation.goBack()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
});
