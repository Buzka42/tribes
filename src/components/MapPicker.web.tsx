import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Map, { Marker, MapMouseEvent } from 'react-map-gl/mapbox';

interface Props {
  onLocationPick: (lat: number, lng: number) => void;
}

export default function MapPicker({ onLocationPick }: Props) {
  const [marker, setMarker] = useState<{lat: number, lng: number} | null>(null);

  const handleMapClick = (e: MapMouseEvent) => {
    const lng = e.lngLat.lng;
    const lat = e.lngLat.lat;
    setMarker({ lat, lng });
    onLocationPick(lat, lng);
  };

  return (
    <View style={styles.container}>
      <Map
        initialViewState={{ longitude: 19.0238, latitude: 50.2649, zoom: 12 }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        mapboxAccessToken={process.env.EXPO_PUBLIC_MAPBOX_KEY}
        onClick={handleMapClick}
      >
        {marker && (
          <Marker longitude={marker.lng} latitude={marker.lat} anchor="center">
            <View style={styles.pin} />
          </Marker>
        )}
      </Map>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { height: 180, width: '100%', borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#ccc' },
  pin: { width: 24, height: 24, backgroundColor: '#e74c3c', borderRadius: 12, borderWidth: 2, borderColor: 'white' }
});
