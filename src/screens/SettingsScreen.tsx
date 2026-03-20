import React, { useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { Colors, Typography } from '../theme';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/AppNavigator';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export default function SettingsScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [locationName, setLocationName] = useState(user?.locationName || '');
  const [locationInput, setLocationInput] = useState(user?.locationName || '');
  const [locationCoords, setLocationCoords] = useState<{lat: number, lng: number} | null>({
    lat: user?.homeLocation?.latitude || 0,
    lng: user?.homeLocation?.longitude || 0
  });

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const searchLocation = async (text: string) => {
    setLocationInput(text);
    if(text.length < 3) return setSuggestions([]);
    try {
      const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(text)}.json?access_token=${process.env.EXPO_PUBLIC_MAPBOX_KEY}&autocomplete=true&types=place,address`);
      const data = await res.json();
      setSuggestions(data.features || []);
    } catch(e) {}
  };

  const handleSave = async () => {
    if (!user || !displayName.trim() || !locationName.trim() || !locationCoords) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.id), {
        displayName: displayName.trim(),
        locationName: locationName,
        homeLocation: {
          latitude: locationCoords.lat,
          longitude: locationCoords.lng
        }
      });
      // Updating user context is handled by real-time listener or we just navigate back
      navigation.goBack();
    } catch(e) {
      console.warn("Failed to update profile", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <BlurView intensity={80} tint="light" style={styles.glassPanel}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Feather name="arrow-left" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Settings</Text>
          <View style={{width: 24}} />
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Display Name</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Jane Doe"
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>Home Location</Text>
          <TextInput
            style={styles.input}
            value={locationInput}
            onChangeText={searchLocation}
            placeholder="City or Street Address"
            placeholderTextColor="#999"
          />
          {suggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              {suggestions.map((s, i) => (
                <TouchableOpacity key={i} style={styles.suggestionItem} onPress={() => { 
                  setLocationCoords({ lat: s.center[1], lng: s.center[0] }); 
                  setLocationName(s.place_name);
                  setLocationInput(s.place_name); 
                  setSuggestions([]); 
                }}>
                  <Text style={styles.suggestionText}>{s.place_name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TouchableOpacity 
            style={[styles.btnPrimary, (!displayName.trim() || !locationName.trim() || loading) && styles.btnDisabled]} 
            onPress={handleSave} 
            disabled={!displayName.trim() || !locationName.trim() || loading}
          >
            <Text style={styles.btnPrimaryText}>{loading ? "Saving..." : "Save Profile"}</Text>
          </TouchableOpacity>
        </View>
      </BlurView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center', padding: 20 },
  glassPanel: { width: '100%', maxWidth: 400, borderRadius: 24, padding: 30, backgroundColor: 'rgba(255,255,255,0.7)', overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 30 },
  title: { fontFamily: Typography.heading, fontSize: 24, color: Colors.text },
  backBtn: { padding: 5 },
  form: { gap: 15 },
  label: { fontFamily: Typography.bodyBold, fontSize: 13, color: Colors.text, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { fontFamily: Typography.body, borderWidth: 1, borderColor: '#eee', backgroundColor: '#fff', borderRadius: 16, padding: 16, fontSize: 15, color: Colors.text },
  suggestionsContainer: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#eee', maxHeight: 150, overflow: 'hidden', marginTop: -10 },
  suggestionItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  suggestionText: { fontFamily: Typography.body, fontSize: 13, color: Colors.text },
  btnPrimary: { backgroundColor: Colors.primary, paddingVertical: 18, borderRadius: 100, alignItems: 'center', marginTop: 15 },
  btnDisabled: { opacity: 0.5 },
  btnPrimaryText: { fontFamily: Typography.bodyBold, color: '#fff', fontSize: 16 },
});
