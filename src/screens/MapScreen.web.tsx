import React from 'react';
import { View, StyleSheet, Text, Button } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../hooks/useAuth';
import { useEvents } from '../hooks/useEvents';
import { auth } from '../config/firebase';
import { signOut } from 'firebase/auth';

// True Mapbox Web SDK implementation specifically mapped to MapScreen.web.tsx
import Map, { Marker } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

type MapScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Map'>;
interface Props { navigation: MapScreenNavigationProp; }

export default function MapScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { events } = useEvents();
  
  return (
    <View style={styles.container}>
      <Map
        initialViewState={{ longitude: 19.0238, latitude: 50.2649, zoom: 12 }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        mapboxAccessToken={process.env.EXPO_PUBLIC_MAPBOX_KEY}
      >
        {events.map(ev => (
          <Marker 
            key={ev.id} 
            longitude={ev.location.longitude} 
            latitude={ev.location.latitude}
            anchor="center"
          >
            <View style={[
              styles.pinBase, 
              ev.isPrivate ? styles.pinPrivate : styles.pinPublic,
              ev.isExternal && styles.pinExternal
            ]} />
          </Marker>
        ))}
      </Map>

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
  filterIcon: { position: 'absolute', top: 50, right: 20 },
  bottomSlider: { position: 'absolute', bottom: 40, left: 20, right: 20, backgroundColor: 'white', padding: 15, borderRadius: 20, opacity: 0.95, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, elevation: 10 },
  sliderText: { textAlign: 'center', fontSize: 14, fontWeight: 'bold' },
  pinBase: { borderWidth: 2, borderColor: 'white' },
  pinPublic: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#e74c3c' },
  pinPrivate: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(52, 152, 219, 0.4)', borderWidth: 1, borderColor: '#3498db' },
  pinExternal: { backgroundColor: '#9b59b6' } 
});
