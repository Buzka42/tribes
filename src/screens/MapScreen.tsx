import React from 'react';
import { View, StyleSheet, Text, Button, Platform } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type MapScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Map'>;

interface Props {
  navigation: MapScreenNavigationProp;
}

if (Platform.OS !== 'web') {
  Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_KEY || '');
}

export default function MapScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      {Platform.OS === 'web' ? (
        <View style={styles.webPlaceholder}>
          <Text style={styles.webPlaceholderText}>[ Mapbox Native Container ]</Text>
          <Text>Map UI is disabled on web. Please use Android/iOS for map.</Text>
        </View>
      ) : (
        <Mapbox.MapView style={styles.map} logoEnabled={false} attributionEnabled={false}>
          <Mapbox.Camera
            zoomLevel={12}
            centerCoordinate={[19.0238, 50.2649]} // Katowice, Poland
          />
        </Mapbox.MapView>
      )}
      <View style={styles.overlay}>
        <Text style={styles.title}>Tribes Map</Text>
        <Button title="Create Event" onPress={() => navigation.navigate('Wizard')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 50,
    alignSelf: 'center',
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  webPlaceholder: {
    flex: 1,
    backgroundColor: '#e1e1e1',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#c1c1c1',
    borderStyle: 'dashed',
  },
  webPlaceholderText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  }
});
