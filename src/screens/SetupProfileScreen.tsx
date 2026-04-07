import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { db } from '../config/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Colors, Typography } from '../theme';
import { BlurView } from 'expo-blur';

export default function SetupProfileScreen() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.displayName && user.displayName !== 'User' ? user.displayName : '');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [sex, setSex] = useState('');
  const [description, setDescription] = useState('');
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [selectedLoc, setSelectedLoc] = useState<any>(null);

  const searchLocation = async (text: string) => {
    setQuery(text);
    if(text.length < 3) return setSuggestions([]);
    try {
      const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(text)}.json?access_token=${process.env.EXPO_PUBLIC_MAPBOX_KEY}&autocomplete=true&types=place,address`);
      const data = await res.json();
      setSuggestions(data.features || []);
    } catch(e) {}
  };

  const handleFinish = async () => {
    if (!name || (!selectedLoc && !user?.locationName)) return;
    try {
      await updateDoc(doc(db, 'users', user!.uid), {
        displayName: name,
        dateOfBirth,
        sex,
        description,
        locationName: selectedLoc ? selectedLoc.place_name : user?.locationName,
        homeLocation: selectedLoc ? {
           longitude: selectedLoc.center[0],
           latitude: selectedLoc.center[1]
        } : user?.homeLocation || null
      });
    } catch(e) {
      console.log(e);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <BlurView intensity={80} tint="light" style={styles.glassCard}>
        <Text style={styles.title}>Manifest Your Presence</Text>
        <Text style={styles.subtitle}>Let the tribe know who you are and where you roam.</Text>
        
        <Text style={styles.label}>Display Name</Text>
        <TextInput 
          style={styles.input} 
          placeholder="First Name (Recommended)" 
          placeholderTextColor="#999"
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>Home Base (City or Address)</Text>
        <TextInput 
          style={styles.input} 
          placeholder="e.g. Warsaw, Zlota 44" 
          placeholderTextColor="#999"
          value={selectedLoc ? selectedLoc.place_name : query}
          onChangeText={(v) => { setSelectedLoc(null); searchLocation(v); }}
        />
        
        {!selectedLoc && suggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            {suggestions.map((s, i) => (
              <TouchableOpacity key={i} style={styles.suggestionItem} onPress={() => { setSelectedLoc(s); setSuggestions([]); }}>
                <Text style={styles.suggestionText}>{s.place_name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        
        <Text style={styles.label}>Date of Birth</Text>
        <TextInput 
          style={styles.input} 
          placeholder="YYYY-MM-DD" 
          placeholderTextColor="#999"
          value={dateOfBirth}
          onChangeText={setDateOfBirth}
        />

        <Text style={styles.label}>Sex</Text>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
          {['Male', 'Female', 'Other'].map(s => (
            <TouchableOpacity 
              key={s} 
              onPress={() => setSex(s)}
              style={[styles.chip, sex === s && styles.chipActive]}
            >
              <Text style={sex === s ? styles.chipTextActive : styles.chipText}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Short Bio (Optional)</Text>
        <TextInput 
          style={[styles.input, { height: 80 }]} 
          placeholder="What drives you? (Max 250 chars)" 
          placeholderTextColor="#999"
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={250}
        />

        <TouchableOpacity 
          style={[styles.btnPrimary, (!name || !selectedLoc) && styles.btnDisabled]} 
          disabled={!name || !selectedLoc}
          onPress={handleFinish}
        >
          <Text style={styles.btnPrimaryText}>Enter The Tribes</Text>
        </TouchableOpacity>
      </BlurView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center', padding: 20 },
  glassCard: { width: '100%', maxWidth: 450, padding: 30, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.7)', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  title: { fontFamily: Typography.heading, fontSize: 26, color: Colors.text, marginBottom: 8 },
  subtitle: { fontFamily: Typography.body, fontSize: 14, color: Colors.textLight, marginBottom: 25 },
  label: { fontFamily: Typography.bodyBold, fontSize: 13, color: Colors.primaryDark, marginBottom: 8 },
  input: { backgroundColor: 'rgba(255,255,255,0.9)', borderWidth: 1, borderColor: '#ddd', borderRadius: 16, padding: 16, fontSize: 15, fontFamily: Typography.body, marginBottom: 20, color: Colors.text },
  suggestionsContainer: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#eee', maxHeight: 150, overflow: 'hidden', marginTop: -15, marginBottom: 20 },
  suggestionItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  suggestionText: { fontFamily: Typography.body, fontSize: 13, color: Colors.text },
  btnPrimary: { backgroundColor: Colors.primary, paddingVertical: 18, borderRadius: 16, alignItems: 'center', marginTop: 10 },
  btnDisabled: { backgroundColor: '#ccc' },
  btnPrimaryText: { fontFamily: Typography.bodyBold, color: '#fff', fontSize: 16 },
  chip: { flex: 1, paddingVertical: 12, borderWidth: 1, borderColor: '#ddd', borderRadius: 12, alignItems: 'center', backgroundColor: '#fff' },
  chipActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '20' },
  chipText: { fontFamily: Typography.bodyBold, color: '#666' },
  chipTextActive: { fontFamily: Typography.bodyBold, color: Colors.primary }
});
