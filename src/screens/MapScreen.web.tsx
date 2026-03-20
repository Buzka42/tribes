import React, { useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../hooks/useAuth';
import { useEvents, TribeVent } from '../hooks/useEvents';
import { auth } from '../config/firebase';
import { signOut } from 'firebase/auth';
import EventModal from '../components/EventModal';
import { Colors, Typography } from '../theme';

import Map, { Marker } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

type MapScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Map'>;
interface Props { navigation: MapScreenNavigationProp; }

export default function MapScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { events, joinEvent } = useEvents();
  const [selectedEvent, setSelectedEvent] = useState<TribeVent | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  const handleJoin = async (eventId: string) => {
    setIsJoining(true);
    try {
      if ((user?.tokens || 0) < 1) {
        Alert.alert("Out of Leaves", "You need at least 1 🍃 to conditionally join this tribe.");
        return;
      }
      await joinEvent(eventId);
      Alert.alert("Joined!", "You are now officially part of this tribe's event. Your token has been dedicated as commitment.");
      setSelectedEvent(null);
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <View style={styles.container}>
      <Map
        initialViewState={{ longitude: 19.0238, latitude: 50.2649, zoom: 12.5 }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/light-v11"
        mapboxAccessToken={process.env.EXPO_PUBLIC_MAPBOX_KEY}
      >
        {events.map(ev => (
          <Marker 
            key={ev.id} 
            longitude={ev.location.longitude} 
            latitude={ev.location.latitude}
            anchor="center"
            onClick={e => {
              e.originalEvent.stopPropagation();
              setSelectedEvent(ev);
            }}
          >
            <View style={[
              styles.pinBase, 
              ev.isPrivate ? styles.pinPrivate : styles.pinPublic,
              ev.isExternal && styles.pinExternal
            ]} />
          </Marker>
        ))}
      </Map>

      <View style={styles.overlayTop}>
        <View style={styles.headerGlass}>
          <Text style={styles.title}>Welcome, {user?.displayName?.split(' ')[0] || "Traveler"}</Text>
          <Text style={styles.tokens}>Balance: <Text style={{fontFamily: Typography.bodyBold}}>{user?.tokens} 🍃</Text></Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={() => signOut(auth)}>
          <Text style={styles.logoutText}>Leave</Text>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity style={styles.fabFilters} onPress={() => {}}>
        <Text style={styles.fabText}>⚙ Filters</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.fabCreate} onPress={() => navigation.navigate('Wizard')}>
        <Text style={styles.fabCreateText}>+ Host Event</Text>
      </TouchableOpacity>

      <EventModal 
        event={selectedEvent} 
        onClose={() => setSelectedEvent(null)} 
        onJoin={handleJoin}
        currentUserId={user?.uid}
        isJoining={isJoining}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  overlayTop: { position: 'absolute', top: 35, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerGlass: { backgroundColor: Colors.glassBg, padding: 18, borderRadius: 24, borderWidth: 1, borderColor: Colors.glassBorder, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 20, elevation: 12 },
  title: { fontFamily: Typography.heading, fontSize: 22, color: Colors.text, marginBottom: 4 },
  tokens: { fontFamily: Typography.body, fontSize: 15, color: Colors.primary },
  logoutBtn: { backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24, borderWidth: 1, borderColor: '#EBEBEB', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  logoutText: { fontFamily: Typography.bodySemibold, color: Colors.danger, fontSize: 13 },
  
  fabFilters: { position: 'absolute', top: 135, right: 20, backgroundColor: Colors.surface, paddingHorizontal: 18, paddingVertical: 14, borderRadius: 24, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 15, elevation: 5 },
  fabText: { fontFamily: Typography.bodySemibold, color: Colors.text },

  fabCreate: { position: 'absolute', bottom: 45, alignSelf: 'center', backgroundColor: Colors.primary, paddingHorizontal: 40, paddingVertical: 22, borderRadius: 40, shadowColor: Colors.primaryDark, shadowOpacity: 0.35, shadowRadius: 20, elevation: 15 },
  fabCreateText: { fontFamily: Typography.bodyBold, color: '#fff', fontSize: 16, letterSpacing: 1 },

  pinBase: { borderWidth: 2, borderColor: '#fff' },
  pinPublic: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.accent },
  pinPrivate: { width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(94, 113, 83, 0.25)', borderWidth: 1, borderColor: Colors.primary },
  pinExternal: { backgroundColor: '#8B9C82' } 
});
