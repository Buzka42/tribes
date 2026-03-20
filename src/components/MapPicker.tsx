import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Mapbox from '@rnmapbox/maps';

interface Props {
  onLocationPick: (lat: number, lng: number) => void;
}

export default function MapPicker({ onLocationPick }: Props) {
  const [marker, setMarker] = useState<{lat: number, lng: number} | null>(null);

  const handleMapPress = (e: any) => {
    const coords = e.geometry.coordinates; // [lng, lat]
    const lng = coords[0];
    const lat = coords[1];
    setMarker({ lat, lng });
    onLocationPick(lat, lng);
  };

  return (
    <View style={styles.container}>
      <Mapbox.MapView 
        style={styles.map} 
        onPress={handleMapPress}
        logoEnabled={false} 
        attributionEnabled={false}
      >
        <Mapbox.Camera zoomLevel={12} centerCoordinate={[19.0238, 50.2649]} />
        {marker && (
          <Mapbox.PointAnnotation
            id="picker"
            coordinate={[marker.lng, marker.lat]}
          >
            <View style={styles.pin} />
          </Mapbox.PointAnnotation>
        )}
      </Mapbox.MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { height: 180, width: '100%', borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#ccc' },
  map: { flex: 1 },
  pin: { width: 24, height: 24, backgroundColor: '#e74c3c', borderRadius: 12, borderWidth: 2, borderColor: 'white' }
});
