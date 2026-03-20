import React from 'react';
import { View, StyleSheet, Text, Button } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type MapScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Map'>;

interface Props {
  navigation: MapScreenNavigationProp;
}

Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_KEY || '');

export default function MapScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <Mapbox.MapView style={styles.map} logoEnabled={false} attributionEnabled={false}>
        <Mapbox.Camera
          zoomLevel={12}
          centerCoordinate={[19.0238, 50.2649]} // Katowice, Poland
        />
      </Mapbox.MapView>
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
  },
});
