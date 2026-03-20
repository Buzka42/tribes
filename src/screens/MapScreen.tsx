import React, { useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Alert } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../hooks/useAuth';
import { useEvents, TribeVent } from '../hooks/useEvents';
import { auth } from '../config/firebase';
import { signOut } from 'firebase/auth';
import EventModal from '../components/EventModal';
import { Colors, Typography } from '../theme';

type MapScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Map'>;
interface Props { navigation: MapScreenNavigationProp; }

Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_KEY || '');

export default function MapScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { events, joinEvent } = useEvents();
  const [selectedEvent, setSelectedEvent] = useState<TribeVent | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  const handleJoin = async (eventId: string) => {
    setIsJoining(true);
    try {
      if ((user?.tokens || 0) < 1) {
        Alert.alert("Out of Leaves", "You need at least 1 🍃 to join.");
        return;
      }
      await joinEvent(eventId);
      Alert.alert("Joined!", "You are now officially part of this tribe's event.");
      setSelectedEvent(null);
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <View style={styles.container}>
      <Mapbox.MapView style={styles.map} logoEnabled={false} attributionEnabled={false}>
        <Mapbox.Camera zoomLevel={13} centerCoordinate={[19.0238, 50.2649]} />
        
        {events.map(event => (
          <Mapbox.PointAnnotation
            key={event.id}
            id={event.id}
            coordinate={[event.location.longitude, event.location.latitude]}
            onSelected={() => setSelectedEvent(event)}
          >
            <View style={[
              styles.pinBase, 
              event.isPrivate ? styles.pinPrivate : styles.pinPublic,
              event.isExternal && styles.pinExternal
            ]} />
          </Mapbox.PointAnnotation>
        ))}
      </Mapbox.MapView>

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
  map: { flex: 1 },
  overlayTop: { position: 'absolute', top: 55, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerGlass: { backgroundColor: Colors.glassBg, padding: 18, borderRadius: 24, borderWidth: 1, borderColor: Colors.glassBorder, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  title: { fontFamily: Typography.heading, fontSize: 18, color: Colors.text, marginBottom: 2 },
  tokens: { fontFamily: Typography.body, fontSize: 14, color: Colors.primary },
  logoutBtn: { backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 15, paddingVertical: 12, borderRadius: 20, borderWidth: 1, borderColor: '#eee' },
  logoutText: { fontFamily: Typography.bodySemibold, color: Colors.danger, fontSize: 12 },
  
  fabFilters: { position: 'absolute', top: 140, right: 20, backgroundColor: Colors.surface, paddingHorizontal: 15, paddingVertical: 12, borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10, elevation: 5 },
  fabText: { fontFamily: Typography.bodySemibold, color: Colors.text },

  fabCreate: { position: 'absolute', bottom: 50, alignSelf: 'center', backgroundColor: Colors.primary, paddingHorizontal: 35, paddingVertical: 20, borderRadius: 40, shadowColor: Colors.primaryDark, shadowOpacity: 0.35, shadowRadius: 15, elevation: 12, borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)' },
  fabCreateText: { fontFamily: Typography.bodyBold, color: '#fff', fontSize: 16, letterSpacing: 0.8 },

  pinBase: { borderWidth: 2, borderColor: '#fff' },
  pinPublic: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.accent },
  pinPrivate: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(94, 113, 83, 0.25)', borderWidth: 1, borderColor: Colors.primary },
  pinExternal: { backgroundColor: '#8B9C82' } 
});
