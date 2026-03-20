import React from 'react';
import { View, StyleSheet } from 'react-native';
import Mapbox from '@rnmapbox/maps';

interface Props {
  onLocationPick: (lat: number, lng: number) => void;
  selectedLocation?: { lat: number, lng: number } | null;
}

export default function MapPicker({ onLocationPick, selectedLocation }: Props) {
  const handleMapPress = (e: any) => {
    const coords = e.geometry.coordinates; // [lng, lat]
    onLocationPick(coords[1], coords[0]);
  };

  return (
    <View style={styles.container}>
      <Mapbox.MapView style={styles.map} onPress={handleMapPress} logoEnabled={false} attributionEnabled={false}>
        <Mapbox.Camera 
          zoomLevel={selectedLocation ? 14 : 12} 
          centerCoordinate={selectedLocation ? [selectedLocation.lng, selectedLocation.lat] : [19.0238, 50.2649]} 
          animationDuration={1000}
        />
        {selectedLocation && (
          <Mapbox.PointAnnotation
            id="picker"
            coordinate={[selectedLocation.lng, selectedLocation.lat]}
          >
            <View style={styles.pin} />
          </Mapbox.PointAnnotation>
        )}
      </Mapbox.MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, width: '100%' },
  map: { flex: 1 },
  pin: { width: 24, height: 24, backgroundColor: '#e74c3c', borderRadius: 12, borderWidth: 2, borderColor: 'white' }
});
