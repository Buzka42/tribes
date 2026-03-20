import React, { useState } from 'react';
import { View, Text, StyleSheet, Button, TextInput, Switch, Alert, TouchableOpacity } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useEvents } from '../hooks/useEvents';
import MapPicker from '../components/MapPicker';

type WizardScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Wizard'>;
interface Props { navigation: WizardScreenNavigationProp; }

export default function WizardScreen({ navigation }: Props) {
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [interest, setInterest] = useState('');
  const [limit, setLimit] = useState('10');
  const [isPrivate, setIsPrivate] = useState(false);
  
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [addressText, setAddressText] = useState('');
  const [resolvedAddress, setResolvedAddress] = useState('');
  
  const { createEvent } = useEvents();

  const handleCreateEvent = async () => {
    try {
      if (!title || !interest) {
        Alert.alert("Missing Fields", "Please provide title and interest.");
        return;
      }
      if (!location) {
        Alert.alert("Missing Location", "Please select a location for the event.");
        return;
      }
      await createEvent(title, interest, parseInt(limit) || 10, isPrivate, 5, {
        latitude: location.lat,
        longitude: location.lng,
        address: resolvedAddress || "Pinned via UI"
      });
      navigation.goBack();
    } catch (e) {
      console.log('Error creating event', e);
    }
  };

  const searchAddress = async () => {
    if (!addressText.trim()) return;
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(addressText)}.json?access_token=${process.env.EXPO_PUBLIC_MAPBOX_KEY}&limit=1`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        setLocation({ lat, lng });
        setResolvedAddress(data.features[0].place_name);
      } else {
        Alert.alert("Not Found", "We couldn't find coordinates for this address.");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Could not fetch geolocation.");
    }
  };

  const renderStep1 = () => (
    <View style={styles.contentPadding}>
      <Text style={styles.heading}>1. Event Details</Text>
      <TextInput style={styles.input} placeholder="Event Title (e.g., Midnight Basketball)" placeholderTextColor="#888" value={title} onChangeText={setTitle} />
      <TextInput style={styles.input} placeholder="Interest/Category" placeholderTextColor="#888" value={interest} onChangeText={setInterest} />
      <TextInput style={styles.input} placeholder="Participant Limit" placeholderTextColor="#888" keyboardType="numeric" value={limit} onChangeText={setLimit} />
      <View style={styles.buttonRowSingle}>
        <Button title="Next Step" onPress={() => setStep(2)} color="#111" />
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepFullscreen}>
      <MapPicker 
        selectedLocation={location}
        onLocationPick={(lat, lng) => {
           setLocation({lat, lng}); 
           setResolvedAddress("Selected via map pin");
        }} 
      />
      
      <View style={styles.overlayTop}>
        <TextInput 
          style={styles.searchBar} 
          placeholder="Type City, Address or Place..." 
          value={addressText} 
          onChangeText={setAddressText}
          onSubmitEditing={searchAddress}
        />
        <TouchableOpacity style={styles.searchBtn} onPress={searchAddress}>
          <Text style={styles.searchBtnText}>Search</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.overlayBottom}>
        <View style={styles.rowInline}>
          <View>
            <Text style={styles.rowTitle}>Private Event</Text>
            <Text style={styles.rowDesc}>Show 500m area instead of exact pin</Text>
          </View>
          <Switch value={isPrivate} onValueChange={setIsPrivate} />
        </View>
        <View style={styles.buttonRowSplit}>
          <Button title="Back" onPress={() => setStep(1)} color="gray" />
          <Button title="Next Step" onPress={() => {
            if(!location) { Alert.alert("Hold on", "Please choose a location or search for one!"); return; }
            setStep(3);
          }} color="#111" />
        </View>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.contentPadding}>
      <Text style={styles.heading}>3. Cost Summary</Text>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryText}>Event: <Text style={styles.bold}>{title || 'Untitled'}</Text></Text>
        <Text style={styles.summaryText}>Privacy: <Text style={styles.bold}>{isPrivate ? 'Hidden (Invites Only)' : 'Public'}</Text></Text>
        <Text style={styles.summaryText}>Limit: <Text style={styles.bold}>{limit} people</Text></Text>
        <Text style={styles.summaryText}>Location: <Text style={styles.bold}>{resolvedAddress}</Text></Text>
        <View style={styles.divider} />
        <Text style={styles.tokenCost}>Cost to host: 5 Tokens 🪙</Text>
        <Text style={styles.tokenDesc}>This anti-flaking cost will be refunded after attendance confirmations via quick survey.</Text>
      </View>
      <View style={styles.buttonRowSplit}>
        <Button title="Back" onPress={() => setStep(2)} color="gray" />
        <Button title="Create Tribes Event!" onPress={handleCreateEvent} color="#d4af37" />
      </View>
    </View>
  );

  return (
    <View style={[styles.container, step === 2 && styles.containerFullscreen]}>
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fcfcfc' },
  containerFullscreen: { padding: 0 },
  contentPadding: { flex: 1, justifyContent: 'center', padding: 20, maxWidth: 500, alignSelf: 'center', width: '100%' },
  stepFullscreen: { flex: 1, width: '100%', position: 'relative' },
  
  heading: { fontSize: 28, fontWeight: 'bold', marginBottom: 25, color: '#1a1a1a' },
  input: { borderWidth: 1, borderColor: '#ddd', backgroundColor: '#fff', borderRadius: 10, padding: 15, marginBottom: 15, fontSize: 16 },
  
  overlayTop: { position: 'absolute', top: 20, left: 15, right: 15, flexDirection: 'row', gap: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 2 }, shadowRadius: 5, elevation: 5 },
  searchBar: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 8, fontSize: 16, borderWidth: 1, borderColor: '#eee' },
  searchBtn: { backgroundColor: '#d4af37', justifyContent: 'center', paddingHorizontal: 15, borderRadius: 8 },
  searchBtnText: { color: '#fff', fontWeight: 'bold' },

  overlayBottom: { position: 'absolute', bottom: 20, left: 15, right: 15, backgroundColor: 'rgba(255,255,255,0.95)', padding: 15, borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.2, shadowOffset: { width: 0, height: -2 }, shadowRadius: 10, elevation: 8 },
  rowInline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#ddd', paddingBottom: 15 },
  rowTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  rowDesc: { fontSize: 12, color: '#666', marginTop: 2 },

  buttonRowSingle: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
  buttonRowSplit: { flexDirection: 'row', justifyContent: 'space-between' },

  summaryCard: { backgroundColor: '#fff', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#eee', marginBottom: 25, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  summaryText: { fontSize: 16, marginBottom: 10, color: '#444' },
  bold: { fontWeight: '700', color: '#111' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 15 },
  tokenCost: { fontSize: 18, fontWeight: 'bold', color: '#d4af37', marginBottom: 8, textAlign: 'center' },
  tokenDesc: { fontSize: 13, color: '#777', textAlign: 'center', lineHeight: 18 },
});
