import React from 'react';
import { View, StyleSheet, Text, Button } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../hooks/useAuth';
import { auth } from '../config/firebase';
import { signOut } from 'firebase/auth';

type MapScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Map'>;
interface Props { navigation: MapScreenNavigationProp; }

export default function MapScreen({ navigation }: Props) {
  const { user } = useAuth();
  
  return (
    <View style={styles.container}>
      <View style={styles.webPlaceholder}>
        <Text style={styles.webPlaceholderText}>[ Mapbox Native Container ]</Text>
        <Text>Map UI is disabled on web. Please use Android/iOS for map.</Text>
      </View>
      <View style={styles.overlay}>
        <Text style={styles.title}>Welcome, {user?.displayName}</Text>
        <Text style={styles.tokens}>Balance: {user?.tokens} 🪙</Text>
        <View style={styles.buttonRow}>
          <Button title="Create Event" onPress={() => navigation.navigate('Wizard')} />
          <Button title="Sign Out" onPress={() => signOut(auth)} color="red" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: { position: 'absolute', top: 50, alignSelf: 'center', backgroundColor: 'white', padding: 15, borderRadius: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 5, textAlign: 'center' },
  tokens: { fontSize: 16, color: '#d4af37', fontWeight: 'bold', textAlign: 'center', marginBottom: 15 },
  buttonRow: { flexDirection: 'row', gap: 10 },
  webPlaceholder: { flex: 1, backgroundColor: '#e1e1e1', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#c1c1c1', borderStyle: 'dashed' },
  webPlaceholderText: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 8 }
});
