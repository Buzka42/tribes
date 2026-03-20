import React from 'react';
import { View, StyleSheet, Text, Button } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../hooks/useAuth';
import { auth } from '../config/firebase';
import { signOut } from 'firebase/auth';

type MapScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Map'>;
interface Props { navigation: MapScreenNavigationProp; }

Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_KEY || '');

export default function MapScreen({ navigation }: Props) {
  const { user } = useAuth();

  return (
    <View style={styles.container}>
      <Mapbox.MapView style={styles.map} logoEnabled={false} attributionEnabled={false}>
        <Mapbox.Camera zoomLevel={12} centerCoordinate={[19.0238, 50.2649]} />
      </Mapbox.MapView>
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
  map: { flex: 1 },
  overlay: { position: 'absolute', top: 50, alignSelf: 'center', backgroundColor: 'white', padding: 15, borderRadius: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 5, textAlign: 'center' },
  tokens: { fontSize: 16, color: '#d4af37', fontWeight: 'bold', textAlign: 'center', marginBottom: 15 },
  buttonRow: { flexDirection: 'row', gap: 10 }
});
