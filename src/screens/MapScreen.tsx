import React from 'react';
import { View, StyleSheet, Text, Button } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../hooks/useAuth';
import { useEvents } from '../hooks/useEvents';
import { auth } from '../config/firebase';
import { signOut } from 'firebase/auth';

type MapScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Map'>;
interface Props { navigation: MapScreenNavigationProp; }

Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_KEY || '');

export default function MapScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { events } = useEvents();

  return (
    <View style={styles.container}>
      <Mapbox.MapView style={styles.map} logoEnabled={false} attributionEnabled={false}>
        <Mapbox.Camera zoomLevel={12} centerCoordinate={[19.0238, 50.2649]} />
        
        {events.map(event => (
          <Mapbox.PointAnnotation
            key={event.id}
            id={event.id}
            coordinate={[event.location.longitude, event.location.latitude]}
          >
            <View style={[
              styles.pinBase, 
              event.isPrivate ? styles.pinPrivate : styles.pinPublic,
              event.isExternal && styles.pinExternal
            ]} />
          </Mapbox.PointAnnotation>
        ))}
      </Mapbox.MapView>

      <View style={styles.overlay}>
        <Text style={styles.title}>Hey, {user?.displayName}</Text>
        <Text style={styles.tokens}>Balance: {user?.tokens} 🪙</Text>
        <View style={styles.buttonRow}>
          <Button title="Create Event" onPress={() => navigation.navigate('Wizard')} />
          <Button title="Logout" onPress={() => signOut(auth)} color="red" />
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
  map: { flex: 1 },
  overlay: { position: 'absolute', top: 50, left: 20, backgroundColor: 'white', padding: 15, borderRadius: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 5, textAlign: 'center' },
  tokens: { fontSize: 16, color: '#d4af37', fontWeight: 'bold', textAlign: 'center', marginBottom: 15 },
  buttonRow: { flexDirection: 'row', gap: 10 },
  filterIcon: { position: 'absolute', top: 50, right: 20 },
  bottomSlider: { position: 'absolute', bottom: 40, left: 20, right: 20, backgroundColor: 'white', padding: 15, borderRadius: 20, opacity: 0.95, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, elevation: 10 },
  sliderText: { textAlign: 'center', fontSize: 14, fontWeight: 'bold' },
  pinBase: { borderWidth: 2, borderColor: 'white' },
  pinPublic: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#e74c3c' },
  pinPrivate: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(52, 152, 219, 0.4)', borderWidth: 1, borderColor: '#3498db' },
  pinExternal: { backgroundColor: '#9b59b6' } // Rule 4: external events have different color
});
