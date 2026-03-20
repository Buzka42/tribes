import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Switch, Alert, TouchableOpacity } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useEvents } from '../hooks/useEvents';
import MapPicker from '../components/MapPicker';
import { Colors, Typography } from '../theme';

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
      if (!title || !interest) return Alert.alert("Missing Fields", "Please outline a title and interest.");
      if (!location) return Alert.alert("Missing Location", "Please select a location for the event on the map.");
      
      await createEvent(title, interest, parseInt(limit) || 10, isPrivate, 5, {
        latitude: location.lat,
        longitude: location.lng,
        address: resolvedAddress || "Pinned visually via map wizard"
      });
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error creating event', e.message);
    }
  };

  const searchAddress = async () => {
    if (!addressText.trim()) return;
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(addressText)}.json?access_token=${process.env.EXPO_PUBLIC_MAPBOX_KEY}&limit=1`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.features?.length > 0) {
        setLocation({ lat: data.features[0].center[1], lng: data.features[0].center[0] });
        setResolvedAddress(data.features[0].place_name);
      } else {
        Alert.alert("Not Found", "We couldn't lock coordinates for this exact spot.");
      }
    } catch (error) {
      Alert.alert("Error", "Could not fetch geolocation from satellites.");
    }
  };

  const renderStep1 = () => (
    <View style={styles.contentPadding}>
      <Text style={styles.heading}>Organize an Event.</Text>
      <Text style={styles.subHeading}>Assemble your tribe in three simple steps.</Text>

      <Text style={styles.label}>Event Title</Text>
      <TextInput style={styles.input} placeholder="e.g., Midnight Basketball" placeholderTextColor={Colors.textLight} value={title} onChangeText={setTitle} />
      
      <Text style={styles.label}>Category & Passion</Text>
      <TextInput style={styles.input} placeholder="e.g., Sports, Art, Chess" placeholderTextColor={Colors.textLight} value={interest} onChangeText={setInterest} />
      
      <Text style={styles.label}>Maximum Capacity</Text>
      <TextInput style={styles.input} placeholder="Strict limits build deeper tribes" placeholderTextColor={Colors.textLight} keyboardType="numeric" value={limit} onChangeText={setLimit} />
      
      <View style={styles.buttonRowSingle}>
        <TouchableOpacity style={styles.btnPrimary} onPress={() => setStep(2)}>
          <Text style={styles.btnPrimaryText}>Set Location</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepFullscreen}>
      <MapPicker 
        selectedLocation={location}
        onLocationPick={(lat, lng) => {
           setLocation({lat, lng}); 
           setResolvedAddress("Selected precision via map pin");
        }} 
      />
      
      <View style={styles.overlayTop}>
        <TextInput 
          style={styles.searchBar} 
          placeholder="Type City, Plaza or Address..." 
          placeholderTextColor={Colors.textLight}
          value={addressText} 
          onChangeText={setAddressText}
          onSubmitEditing={searchAddress}
        />
        <TouchableOpacity style={styles.searchBtn} onPress={searchAddress}>
          <Text style={styles.searchBtnText}>Locate</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.overlayBottom}>
        <View style={styles.rowInline}>
          <View>
            <Text style={styles.rowTitle}>Private Event</Text>
            <Text style={styles.rowDesc}>Camouflage with 500m fuzzy radius instead of exact street</Text>
          </View>
          <Switch value={isPrivate} onValueChange={setIsPrivate} trackColor={{ true: Colors.primary }} />
        </View>
        <View style={styles.buttonRowSplit}>
          <TouchableOpacity style={styles.btnSecondary} onPress={() => setStep(1)}>
            <Text style={styles.btnSecondaryText}>Go Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnPrimaryCompact} onPress={() => {
            if(!location) { Alert.alert("Hold on", "Please choose a location or search for one!"); return; }
            setStep(3);
          }}>
            <Text style={styles.btnPrimaryText}>Finalize</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.contentPadding}>
      <Text style={styles.heading}>Tribal Commitment.</Text>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>{title || 'Untitled Gathering'}</Text>
        <Text style={styles.summaryTag}>{interest.toUpperCase()}</Text>
        
        <View style={styles.divider} />
        
        <Text style={styles.summaryText}>Visibility: <Text style={styles.bold}>{isPrivate ? 'Hidden (Invites Only)' : 'Public'}</Text></Text>
        <Text style={styles.summaryText}>Capacity: <Text style={styles.bold}>{limit} people max</Text></Text>
        <Text style={styles.summaryText}>Location: <Text style={styles.bold}>{resolvedAddress}</Text></Text>
        
        <View style={styles.commitmentBox}>
           <Text style={styles.tokenCost}>Hosting secures 5 🍃</Text>
           <Text style={styles.tokenDesc}>This anti-flaking cost will be 80% refunded automatically after attendance confirmations via quick survey.</Text>
        </View>
      </View>

      <View style={styles.buttonRowSplit}>
        <TouchableOpacity style={styles.btnSecondary} onPress={() => setStep(2)}>
           <Text style={styles.btnSecondaryText}>Change Location</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnPrimaryCompact} onPress={handleCreateEvent}>
           <Text style={styles.btnPrimaryText}>Create Event</Text>
        </TouchableOpacity>
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
  container: { flex: 1, backgroundColor: Colors.background },
  containerFullscreen: { padding: 0 },
  contentPadding: { flex: 1, justifyContent: 'center', padding: 25, maxWidth: 600, alignSelf: 'center', width: '100%' },
  stepFullscreen: { flex: 1, width: '100%', position: 'relative' },
  
  heading: { fontFamily: Typography.heading, fontSize: 36, color: Colors.text, marginBottom: 5 },
  subHeading: { fontFamily: Typography.body, fontSize: 16, color: Colors.textLight, marginBottom: 35 },
  label: { fontFamily: Typography.bodySemibold, color: Colors.text, marginBottom: 8, fontSize: 14, marginLeft: 5 },
  input: { fontFamily: Typography.body, borderWidth: 1, borderColor: '#E8E8E8', backgroundColor: '#FAFAFA', borderRadius: 16, padding: 18, marginBottom: 25, fontSize: 16, color: Colors.text },
  
  overlayTop: { position: 'absolute', top: 30, left: 15, right: 15, flexDirection: 'row', gap: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 8 },
  searchBar: { flex: 1, fontFamily: Typography.body, backgroundColor: Colors.surface, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 16, fontSize: 15, borderWidth: 1, borderColor: '#F0EFEA' },
  searchBtn: { backgroundColor: Colors.primary, justifyContent: 'center', paddingHorizontal: 20, borderRadius: 16, shadowColor: Colors.primaryDark, shadowOpacity: 0.2, shadowRadius: 10 },
  searchBtnText: { fontFamily: Typography.bodyBold, color: '#fff' },

  overlayBottom: { position: 'absolute', bottom: 30, left: 20, right: 20, backgroundColor: Colors.glassBg, padding: 25, borderRadius: 24, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 30, elevation: 12, borderWidth: 1, borderColor: Colors.glassBorder },
  rowInline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 25, borderBottomWidth: 1, borderBottomColor: '#F0EFEA', paddingBottom: 20 },
  rowTitle: { fontFamily: Typography.bodyBold, fontSize: 16, color: Colors.text },
  rowDesc: { fontFamily: Typography.body, fontSize: 12, color: Colors.textLight, marginTop: 4 },

  buttonRowSingle: { alignItems: 'flex-end', marginTop: 15 },
  buttonRowSplit: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  btnPrimary: { backgroundColor: Colors.primary, paddingHorizontal: 40, paddingVertical: 18, borderRadius: 16, shadowColor: Colors.primary, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  btnPrimaryCompact: { backgroundColor: Colors.primary, paddingHorizontal: 35, paddingVertical: 15, borderRadius: 16, shadowColor: Colors.primary, shadowOpacity: 0.25, shadowRadius: 10, elevation: 5 },
  btnPrimaryText: { fontFamily: Typography.bodyBold, color: '#fff', fontSize: 16 },
  btnSecondary: { paddingHorizontal: 25, paddingVertical: 15, backgroundColor: '#E8E8E8', borderRadius: 16 },
  btnSecondaryText: { fontFamily: Typography.bodySemibold, color: Colors.text, fontSize: 15 },

  summaryCard: { backgroundColor: Colors.surface, padding: 30, borderRadius: 24, borderWidth: 1, borderColor: '#F0EFEA', marginBottom: 35, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 20, elevation: 8 },
  summaryTitle: { fontFamily: Typography.heading, fontSize: 24, color: Colors.text, marginBottom: 5 },
  summaryTag: { fontFamily: Typography.bodyBold, fontSize: 12, color: Colors.accent, letterSpacing: 1.5 },
  summaryText: { fontFamily: Typography.body, fontSize: 15, marginBottom: 15, color: Colors.textLight },
  bold: { fontFamily: Typography.bodySemibold, color: Colors.text },
  divider: { height: 1, backgroundColor: '#F0EFEA', marginVertical: 20 },
  commitmentBox: { backgroundColor: 'rgba(225, 203, 172, 0.15)', padding: 20, borderRadius: 16, marginTop: 10, borderWidth: 1, borderColor: 'rgba(215, 185, 140, 0.3)' },
  tokenCost: { fontFamily: Typography.bodyBold, fontSize: 16, color: Colors.accent, marginBottom: 8, textAlign: 'center' },
  tokenDesc: { fontFamily: Typography.body, fontSize: 13, color: Colors.textLight, textAlign: 'center', lineHeight: 20 },
});
