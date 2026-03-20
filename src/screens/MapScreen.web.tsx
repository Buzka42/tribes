import React from 'react';
import { View, StyleSheet, Text, Button, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../hooks/useAuth';
import { useEvents } from '../hooks/useEvents';
import { auth } from '../config/firebase';
import { signOut } from 'firebase/auth';

type MapScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Map'>;
interface Props { navigation: MapScreenNavigationProp; }

export default function MapScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { events } = useEvents();
  
  return (
    <View style={styles.container}>
      <View style={styles.webPlaceholder}>
        <Text style={styles.webPlaceholderText}>[ Mapbox Simulated Container ]</Text>
        <Text style={{ marginBottom: 20 }}>Events rendered theoretically on map:</Text>
        <ScrollView style={{ maxHeight: 200, width: '100%', paddingHorizontal: 40 }}>
          {events.map(ev => (
            <View key={ev.id} style={styles.mockPin}>
              <Text style={{fontWeight: 'bold'}}>{ev.title}</Text>
              <Text>Vis: {ev.isPrivate ? 'Approx Region 500m' : 'Exact Pin'}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
      <View style={styles.overlay}>
        <Text style={styles.title}>Welcome, {user?.displayName}</Text>
        <Text style={styles.tokens}>Balance: {user?.tokens} 🪙</Text>
        <View style={styles.buttonRow}>
          <Button title="Create Event" onPress={() => navigation.navigate('Wizard')} />
          <Button title="Sign Out" onPress={() => signOut(auth)} color="red" />
        </View>
      </View>
      
      <View style={styles.filterIcon}>
        <Button title="⚙ Filters" onPress={() => {}} />
      </View>

      <View style={styles.bottomSlider}>
        <Text style={styles.sliderText}>Date Range Slider (Mock UI)</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: { position: 'absolute', top: 50, left: 20, backgroundColor: 'white', padding: 15, borderRadius: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 5, textAlign: 'center' },
  tokens: { fontSize: 16, color: '#d4af37', fontWeight: 'bold', textAlign: 'center', marginBottom: 15 },
  buttonRow: { flexDirection: 'row', gap: 10 },
  webPlaceholder: { flex: 1, backgroundColor: '#e1e1e1', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#c1c1c1', borderStyle: 'dashed' },
  webPlaceholderText: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  mockPin: { backgroundColor: '#fff', padding: 10, marginVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: '#ccc' },
  filterIcon: { position: 'absolute', top: 50, right: 20 },
  bottomSlider: { position: 'absolute', bottom: 40, left: 20, right: 20, backgroundColor: 'white', padding: 15, borderRadius: 20, opacity: 0.95, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, elevation: 10 },
  sliderText: { textAlign: 'center', fontSize: 14, fontWeight: 'bold' }
});
