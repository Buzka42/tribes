import React, { useEffect, useState } from 'react';
import {
  View, StyleSheet, Text, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, ScrollView, Linking,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../hooks/useAuth';
import { useI18n, LanguagePreference } from '../i18n';
import { Colors, Typography } from '../theme';
import { Feather } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/AppNavigator';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { INTRO_EVERY_LAUNCH_KEY } from '../utils/introPrefs';

export default function SettingsScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { t, preference, setPreference } = useI18n();

  const [introEveryLaunch, setIntroEveryLaunch] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(INTRO_EVERY_LAUNCH_KEY)
      .then((v) => setIntroEveryLaunch(v === '1'))
      .catch(() => {});
  }, []);
  const setIntroPreference = (value: boolean) => {
    setIntroEveryLaunch(value);
    AsyncStorage.setItem(INTRO_EVERY_LAUNCH_KEY, value ? '1' : '0').catch(() => {});
  };

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [dateOfBirth, setDateOfBirth] = useState(user?.dateOfBirth || '');
  const [sex, setSex] = useState(user?.sex || '');
  const [description, setDescription] = useState(user?.description || '');
  const [locationName, setLocationName] = useState(user?.locationName || '');
  const [locationInput, setLocationInput] = useState(user?.locationName || '');
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(
    user?.homeLocation
      ? { lat: user.homeLocation.latitude, lng: user.homeLocation.longitude }
      : null,
  );
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

  const canSave = !!displayName.trim() && !!locationName.trim() && !!locationCoords && !loading;

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Feather name="arrow-left" size={22} color={Colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('settings.title')}</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Display Name */}
        <Text style={styles.fieldLabel}>{t('setup.displayName')}</Text>
        <TextInput
          style={styles.input}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder={t('settings.namePlaceholder')}
          placeholderTextColor={Colors.textPlaceholder}
        />

        {/* Date of Birth */}
        <Text style={styles.fieldLabel}>{t('setup.dateOfBirth')}</Text>
        <TextInput
          style={styles.input}
          value={dateOfBirth}
          onChangeText={setDateOfBirth}
          placeholder={t('setup.dateOfBirthPlaceholder')}
          placeholderTextColor={Colors.textPlaceholder}
        />

        {/* Sex — stored as English values, displayed translated */}
        <Text style={styles.fieldLabel}>{t('setup.identity')}</Text>
        <View style={styles.chipRow}>
          {(['Male', 'Female', 'Other'] as const).map(s => (
            <TouchableOpacity
              key={s}
              onPress={() => setSex(s)}
              style={[styles.chip, sex === s && styles.chipActive]}
              activeOpacity={0.75}
            >
              <Text style={[styles.chipText, sex === s && styles.chipTextActive]}>
                {{ Male: t('setup.male'), Female: t('setup.female'), Other: t('setup.other') }[s]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Bio */}
        <Text style={styles.fieldLabel}>{t('setup.shortBio')}</Text>
        <TextInput
          style={[styles.input, styles.inputMulti]}
          value={description}
          onChangeText={setDescription}
          placeholder={t('settings.bioPlaceholder')}
          placeholderTextColor={Colors.textPlaceholder}
          multiline
          maxLength={250}
        />

        {/* Home Location */}
        <Text style={styles.fieldLabel}>{t('settings.homeLocation')}</Text>
        <TextInput
          style={styles.input}
          value={locationInput}
          onChangeText={searchLocation}
          placeholder={t('setup.homeBasePlaceholder')}
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

        {/* Language */}
        <Text style={styles.fieldLabel}>{t('settings.language')}</Text>
        <View style={styles.chipRow}>
          {([
            { value: 'auto', label: t('settings.languageAuto') },
            { value: 'en', label: 'English' },
            { value: 'pl', label: 'Polski' },
          ] as { value: LanguagePreference; label: string }[]).map(opt => (
            <TouchableOpacity
              key={opt.value}
              onPress={() => setPreference(opt.value)}
              style={[styles.chip, preference === opt.value && styles.chipActive]}
              activeOpacity={0.75}
            >
              <Text style={[styles.chipText, preference === opt.value && styles.chipTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.languageHint}>{t('settings.languageHint')}</Text>

        {/* Intro */}
        <Text style={styles.fieldLabel}>{t('settings.intro')}</Text>
        <View style={styles.chipRow}>
          {([
            { value: false, label: t('settings.introFirstLaunch') },
            { value: true, label: t('settings.introEveryLaunch') },
          ] as { value: boolean; label: string }[]).map(opt => (
            <TouchableOpacity
              key={String(opt.value)}
              onPress={() => setIntroPreference(opt.value)}
              style={[styles.chip, introEveryLaunch === opt.value && styles.chipActive]}
              activeOpacity={0.75}
            >
              <Text style={[styles.chipText, introEveryLaunch === opt.value && styles.chipTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.languageHint}>{t('settings.introHint')}</Text>

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
            {loading ? t('settings.saving') : t('settings.saveProfile')}
          </Text>
        </TouchableOpacity>

        {/* Map attribution (required by Mapbox ToS) */}
        <View style={[styles.hairline, { marginTop: 32, marginBottom: 0 }]} />
        <Text style={[styles.fieldLabel, { marginTop: 20, marginBottom: 10 }]}>{t('settings.mapData')}</Text>
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
            <Text style={styles.attributionLink}>{t('settings.improveMap')}</Text>
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

  // ── Language ──────────────────────────────────────────────────────────────
  languageHint: {
    fontFamily: Typography.bodyLight,
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: -16,
    marginBottom: 26,
    lineHeight: 17,
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
