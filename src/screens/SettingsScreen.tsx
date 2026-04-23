import React, { useState } from 'react';
import {
  View, StyleSheet, Text, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, ScrollView, Linking,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { Colors, Typography } from '../theme';
import { Feather } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/AppNavigator';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export default function SettingsScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [dateOfBirth, setDateOfBirth] = useState(user?.dateOfBirth || '');
  const [sex, setSex] = useState(user?.sex || '');
  const [description, setDescription] = useState(user?.description || '');
  const [locationName, setLocationName] = useState(user?.locationName || '');
  const [locationInput, setLocationInput] = useState(user?.locationName || '');
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>({
    lat: user?.homeLocation?.latitude || 0,
    lng: user?.homeLocation?.longitude || 0,
  });
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const searchLocation = async (text: string) => {
    setLocationInput(text);
    if (text.length < 3) return setSuggestions([]);
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(text)}.json?access_token=${process.env.EXPO_PUBLIC_MAPBOX_KEY}&autocomplete=true&types=place,address`
      );
      const data = await res.json();
      setSuggestions(data.features || []);
    } catch (e) {}
  };

  const handleSave = async () => {
    if (!user || !displayName.trim() || !locationName.trim() || !locationCoords) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: displayName.trim(),
        dateOfBirth,
        sex,
        description,
        locationName,
        homeLocation: { latitude: locationCoords.lat, longitude: locationCoords.lng },
      });
      navigation.goBack();
    } catch (e) { console.warn('Failed to update profile', e); }
    finally { setLoading(false); }
  };

  const canSave = !!displayName.trim() && !!locationName.trim() && !loading;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Feather name="arrow-left" size={22} color={Colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Display Name */}
        <Text style={styles.fieldLabel}>DISPLAY NAME</Text>
        <TextInput
          style={styles.input}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Your name"
          placeholderTextColor={Colors.textPlaceholder}
        />

        {/* Date of Birth */}
        <Text style={styles.fieldLabel}>DATE OF BIRTH</Text>
        <TextInput
          style={styles.input}
          value={dateOfBirth}
          onChangeText={setDateOfBirth}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={Colors.textPlaceholder}
        />

        {/* Sex */}
        <Text style={styles.fieldLabel}>IDENTITY</Text>
        <View style={styles.chipRow}>
          {['Male', 'Female', 'Other'].map(s => (
            <TouchableOpacity
              key={s}
              onPress={() => setSex(s)}
              style={[styles.chip, sex === s && styles.chipActive]}
              activeOpacity={0.75}
            >
              <Text style={[styles.chipText, sex === s && styles.chipTextActive]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Bio */}
        <Text style={styles.fieldLabel}>SHORT BIO</Text>
        <TextInput
          style={[styles.input, styles.inputMulti]}
          value={description}
          onChangeText={setDescription}
          placeholder="What drives you? (Max 250 chars)"
          placeholderTextColor={Colors.textPlaceholder}
          multiline
          maxLength={250}
        />

        {/* Home Location */}
        <Text style={styles.fieldLabel}>HOME LOCATION</Text>
        <TextInput
          style={styles.input}
          value={locationInput}
          onChangeText={searchLocation}
          placeholder="City or street address"
          placeholderTextColor={Colors.textPlaceholder}
        />
        {suggestions.length > 0 && (
          <View style={styles.suggestions}>
            {suggestions.map((s, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.suggestionItem, i < suggestions.length - 1 && styles.suggestionBorder]}
                onPress={() => {
                  setLocationCoords({ lat: s.center[1], lng: s.center[0] });
                  setLocationName(s.place_name);
                  setLocationInput(s.place_name);
                  setSuggestions([]);
                }}
              >
                <Text style={styles.suggestionText} numberOfLines={1}>{s.place_name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Divider before save */}
        <View style={styles.hairline} />

        {/* Save */}
        <TouchableOpacity
          style={[styles.btnPrimary, !canSave && styles.btnDisabled]}
          onPress={handleSave}
          disabled={!canSave}
          activeOpacity={0.82}
        >
          <Text style={styles.btnPrimaryText}>
            {loading ? 'Saving…' : 'Save Profile'}
          </Text>
        </TouchableOpacity>

        {/* Map attribution (required by Mapbox ToS) */}
        <View style={[styles.hairline, { marginTop: 32, marginBottom: 0 }]} />
        <Text style={[styles.fieldLabel, { marginTop: 20, marginBottom: 10 }]}>MAP DATA</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4, marginBottom: 8 }}>
          <TouchableOpacity onPress={() => Linking.openURL('https://www.mapbox.com/about/maps/')} activeOpacity={0.7}>
            <Text style={styles.attributionLink}>© Mapbox</Text>
          </TouchableOpacity>
          <Text style={styles.attributionSep}>·</Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://www.openstreetmap.org/copyright')} activeOpacity={0.7}>
            <Text style={styles.attributionLink}>© OpenStreetMap contributors</Text>
          </TouchableOpacity>
          <Text style={styles.attributionSep}>·</Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://apps.mapbox.com/feedback/')} activeOpacity={0.7}>
            <Text style={styles.attributionLink}>Improve this map</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 58 : 40,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: Colors.hairline,
  },
  title: {
    fontFamily: Typography.headline,
    fontSize: 20,
    color: Colors.textPrimary,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },

  scroll: {
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 48,
  },

  // ── Field label ───────────────────────────────────────────────────────────
  fieldLabel: {
    fontFamily: Typography.bodyLight,
    fontSize: 11,
    color: 'rgba(217,160,111,0.65)',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginBottom: 10,
  },

  // ── Inputs ────────────────────────────────────────────────────────────────
  input: {
    fontFamily: Typography.body,
    fontSize: 15,
    color: Colors.textPrimary,
    backgroundColor: Colors.bgInput,
    borderWidth: 1,
    borderColor: Colors.borderInput,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 15,
    marginBottom: 26,
  },
  inputMulti: {
    height: 88,
    textAlignVertical: 'top',
    paddingTop: 15,
  },

  // ── Suggestions ───────────────────────────────────────────────────────────
  suggestions: {
    backgroundColor: Colors.bgElevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.hairline,
    maxHeight: 160,
    overflow: 'hidden',
    marginTop: -20,
    marginBottom: 26,
  },
  suggestionItem: {
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  suggestionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.hairlineNeutral,
  },
  suggestionText: {
    fontFamily: Typography.body,
    fontSize: 13,
    color: Colors.textSecondary,
  },

  // ── Chips ─────────────────────────────────────────────────────────────────
  chipRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 26,
  },
  chip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: Colors.hairlineNeutral,
    alignItems: 'center',
    backgroundColor: Colors.bgInput,
  },
  chipActive: {
    borderColor: Colors.gold,
    backgroundColor: Colors.goldDim,
  },
  chipText: {
    fontFamily: Typography.bodyMedium,
    fontSize: 13,
    color: Colors.textMuted,
  },
  chipTextActive: {
    color: Colors.gold,
  },

  // ── Divider ───────────────────────────────────────────────────────────────
  hairline: {
    height: 1,
    backgroundColor: Colors.hairline,
    marginBottom: 28,
  },

  // ── Save button ───────────────────────────────────────────────────────────
  btnPrimary: {
    backgroundColor: Colors.glassBtnBg,
    borderRadius: 9999,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  btnDisabled: {
    opacity: 0.35,
  },
  btnPrimaryText: {
    fontFamily: Typography.bodyMedium,
    color: Colors.textPrimary,
    fontSize: 15,
    letterSpacing: 0.2,
  },

  // ── Attribution ───────────────────────────────────────────────────────────
  attributionLink: {
    fontFamily: Typography.bodyLight,
    fontSize: 12,
    color: Colors.textMuted,
    textDecorationLine: 'underline',
  },
  attributionSep: {
    fontFamily: Typography.bodyLight,
    fontSize: 12,
    color: Colors.textMuted,
  },
});
