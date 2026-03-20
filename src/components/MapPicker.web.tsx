import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Map, { Marker, MapMouseEvent } from 'react-map-gl/mapbox';

interface Props {
  onLocationPick: (lat: number, lng: number) => void;
  selectedLocation?: { lat: number, lng: number } | null;
}

export default function MapPicker({ onLocationPick, selectedLocation }: Props) {
  const [viewState, setViewState] = useState({ longitude: 19.0238, latitude: 50.2649, zoom: 12 });

  useEffect(() => {
    if (selectedLocation) {
      setViewState(v => ({ ...v, longitude: selectedLocation.lng, latitude: selectedLocation.lat, zoom: 14 }));
    }
  }, [selectedLocation]);

  const handleMapClick = (e: MapMouseEvent) => {
    const lng = e.lngLat.lng;
    const lat = e.lngLat.lat;
    onLocationPick(lat, lng);
  };

  return (
    <View style={styles.container}>
      <Map
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        mapboxAccessToken={process.env.EXPO_PUBLIC_MAPBOX_KEY}
        onClick={handleMapClick}
      >
        {selectedLocation && (
          <Marker longitude={selectedLocation.lng} latitude={selectedLocation.lat} anchor="center">
            <View style={styles.pin} />
          </Marker>
        )}
      </Map>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, width: '100%' },
  pin: { width: 24, height: 24, backgroundColor: '#e74c3c', borderRadius: 12, borderWidth: 2, borderColor: 'white' }
});
