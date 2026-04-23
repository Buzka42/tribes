import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { db } from '../config/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Colors, Typography } from '../theme';

export default function SetupProfileScreen() {
  const { user } = useAuth();
  const [name, setName] = useState(
    user?.displayName && user.displayName !== 'User' ? user.displayName : ''
  );
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [sex, setSex] = useState('');
  const [description, setDescription] = useState('');
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [selectedLoc, setSelectedLoc] = useState<any>(null);

  const searchLocation = async (text: string) => {
    setQuery(text);
    if (text.length < 3) return setSuggestions([]);
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(text)}.json?access_token=${process.env.EXPO_PUBLIC_MAPBOX_KEY}&autocomplete=true&types=place,address`
      );
      const data = await res.json();
      setSuggestions(data.features || []);
    } catch (e) {}
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
        homeLocation: selectedLoc
          ? { longitude: selectedLoc.center[0], latitude: selectedLoc.center[1] }
          : user?.homeLocation || null,
      });
    } catch (e) { console.log(e); }
  };

  const canContinue = !!name && (!!selectedLoc || !!user?.locationName);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.title}>Manifest Your Presence</Text>
        <Text style={styles.subtitle}>Let the tribe know who you are and where you roam.</Text>

        {/* Display Name */}
        <Text style={styles.fieldLabel}>DISPLAY NAME</Text>
        <TextInput
          style={styles.input}
          placeholder="First name (recommended)"
          placeholderTextColor={Colors.textPlaceholder}
          value={name}
          onChangeText={setName}
        />

        {/* Home Base */}
        <Text style={styles.fieldLabel}>HOME BASE</Text>
        <TextInput
          style={styles.input}
          placeholder="City or street address"
          placeholderTextColor={Colors.textPlaceholder}
          value={selectedLoc ? selectedLoc.place_name : query}
          onChangeText={(v) => { setSelectedLoc(null); searchLocation(v); }}
        />
        {!selectedLoc && suggestions.length > 0 && (
          <View style={styles.suggestions}>
            {suggestions.map((s, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.suggestionItem, i < suggestions.length - 1 && styles.suggestionBorder]}
                onPress={() => { setSelectedLoc(s); setSuggestions([]); }}
              >
                <Text style={styles.suggestionText} numberOfLines={1}>{s.place_name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Date of Birth */}
        <Text style={styles.fieldLabel}>DATE OF BIRTH</Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={Colors.textPlaceholder}
          value={dateOfBirth}
          onChangeText={setDateOfBirth}
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
          placeholder="What drives you? (Optional, max 250 chars)"
          placeholderTextColor={Colors.textPlaceholder}
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={250}
        />
        {description.length > 0 && (
          <Text style={styles.charCount}>{description.length} / 250</Text>
        )}

        {/* CTA */}
        <TouchableOpacity
          style={[styles.btnPrimary, !canContinue && styles.btnDisabled]}
          disabled={!canContinue}
          onPress={handleFinish}
          activeOpacity={0.82}
        >
          <Text style={styles.btnPrimaryText}>Enter The Tribes</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 72,
    paddingBottom: 48,
  },

  // ── Header ─────────────────────────────────────────────────────────────────
  title: {
    fontFamily: Typography.headline,
    fontSize: 30,
    color: Colors.textPrimary,
    marginBottom: 10,
    letterSpacing: -0.3,
    lineHeight: 40,
  },
  subtitle: {
    fontFamily: Typography.bodyLight,
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 40,
    lineHeight: 22,
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
    height: 90,
    textAlignVertical: 'top',
    paddingTop: 15,
    marginBottom: 6,
  },
  charCount: {
    fontFamily: Typography.bodyLight,
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'right',
    marginBottom: 26,
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

  // ── Sex chips ─────────────────────────────────────────────────────────────
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

  // ── CTA ───────────────────────────────────────────────────────────────────
  btnPrimary: {
    backgroundColor: Colors.glassBtnBg,
    borderRadius: 9999,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
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
});
