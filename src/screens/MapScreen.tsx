import React, { useState, useMemo } from 'react';
import {
  View, StyleSheet, Text, TouchableOpacity, ScrollView,
  TextInput, Alert, Platform, Image, KeyboardAvoidingView, Share,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import Mapbox from '@rnmapbox/maps';
import { BlurView } from 'expo-blur';
import { RootStackParamList } from '../navigation/AppNavigator';

import { useAuth } from '../hooks/useAuth';
import { useEvents, TribeVent } from '../hooks/useEvents';
import { useTribes } from '../hooks/useTribes';
import { Tribe } from '../types';
import { db } from '../config/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { Colors, Typography } from '../theme';
import { SPIRIT_ASSETS } from '../utils/assets';
import { EventChat } from '../components/EventChat';
import { TribePanel } from '../components/TribePanel';
import { CreateTribeWizard } from '../components/CreateTribeWizard';
import { ProfileModal } from '../components/ProfileModal';
import { format, isToday, isTomorrow, isWeekend, addDays, startOfWeek, endOfWeek, addWeeks } from 'date-fns';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { EVENT_CATEGORIES, CategoryGroupId } from '../data/categories';

Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_KEY || '');

// ─── Leaf icon (re-used throughout) ──────────────────────────────────────────
const LEAF = require('../assets/leaf.png');

export default function MapScreen() {
  const { user } = useAuth();
  const { events, joinEvent, createEvent, deleteEvent, finalizeEvent, submitFeedback, getUserFeedback } = useEvents();
  const { tribes, createTribe, applyToTribe, acceptApplicant, rejectApplicant, postAnnouncement, leaveTribe, removeMember, deleteTribe, updateTribe, promoteMember, demoteMember } = useTribes();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // ── Mode & draft state ────────────────────────────────────────────────────
  const [mode, setMode] = useState<'map' | 'wizard_details' | 'wizard_location' | 'event_chat' | 'filters' | 'search_map' | 'tribe_panel' | 'create_tribe_wizard'>('map');
  const [draft, setDraft] = useState({
    title: '', categoryId: '' as CategoryGroupId | '', categorySub: [] as string[],
    isPrivate: false, limit: '10', location: null as any,
    address: '', date: null as Date | null, ageGroup: 'All Ages', gender: 'Anyone',
    tribeId: '', cyclicalRule: '',
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [activeAgeFilters, setActiveAgeFilters] = useState<string[]>([]);
  const [expandedAge, setExpandedAge] = useState(false);
  const [activeGenderFilters, setActiveGenderFilters] = useState<string[]>([]);
  const [expandedGender, setExpandedGender] = useState(false);

  const toggleCategory = (catId: string) => {
    const f = { ...activeFilters };
    if (f[catId]) delete f[catId]; else f[catId] = [];
    setActiveFilters(f);
  };
  const toggleSubFilter = (catId: string, sub: string) => {
    const f = { ...activeFilters };
    if (!f[catId] || f[catId].length === 0) f[catId] = [sub];
    else {
      if (f[catId].includes(sub)) {
        f[catId] = f[catId].filter(s => s !== sub);
        if (f[catId].length === 0) delete f[catId];
      } else f[catId].push(sub);
    }
    setActiveFilters(f);
  };

  const [selectedEvent, setSelectedEvent] = useState<TribeVent | null>(null);
  const [dateFilter, setDateFilter] = useState('30 Days');
  const [tutStep, setTutStep] = useState(-1);
  const [selectedCluster, setSelectedCluster] = useState<{ lat: number; lng: number; events: TribeVent[] } | null>(null);

  // ── Tribe UI state ────────────────────────────────────────────────────────
  const [selectedTribe, setSelectedTribe] = useState<Tribe | null>(null);
  const [showManagement, setShowManagement] = useState(false);
  const [announcementText, setAnnouncementText] = useState('');

  // Tribe Creation Wizard
  const [wizardDraft, setWizardDraft] = useState({
    name: "",
    description: "",
    spiritId: "forest",
    isPrivateTribe: false,
    categoryId: "",
    categorySub: [] as string[],
    fromEventId: "",
    fromAttendees: [] as string[],
  });
  const [wizardStep, setWizardStep] = useState(0);
  const [formTribeChecked, setFormTribeChecked] = useState(false);
  const [profileViewUid, setProfileViewUid] = useState<string | null>(null);
  const [profileViewData, setProfileViewData] = useState<any | null>(null);
  const [hasProcessedInvite, setHasProcessedInvite] = useState(false);

  // Event finalization & feedback
  const [finalizeChecked, setFinalizeChecked] = useState<string[]>([]);
  const [feedbackAnswer, setFeedbackAnswer] = useState<{
    eventHappened?: boolean;
    rating?: number;
  }>({});
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<
    Record<string, boolean>
  >({});
  const [userFeedbackCache, setUserFeedbackCache] = useState<
    Record<string, any | "none">
  >({});
  const [creatorStatsCache, setCreatorStatsCache] = useState<
    Record<string, { ratingSum: number; ratingCount: number; name?: string }>
  >({});
  const [participantNamesCache, setParticipantNamesCache] = useState<Record<string, string>>({});
  const [hasProcessedEventInvite, setHasProcessedEventInvite] = useState(false);
  const [showTribePrompt, setShowTribePrompt] = useState(false);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const scrollRef = React.useRef<ScrollView>(null);
  const cameraRef = React.useRef<any>(null);
  const [scrollX, setScrollX] = useState(0);
  const [currentZoom, setCurrentZoom] = useState(13);

  const [wizardQuery, setWizardQuery] = useState('');
  const [wizardSuggestions, setWizardSuggestions] = useState<any[]>([]);

  const searchWizardLocation = async (text: string) => {
    setWizardQuery(text);
    if (text.length < 3) return setWizardSuggestions([]);
    try {
      const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(text)}.json?access_token=${process.env.EXPO_PUBLIC_MAPBOX_KEY}&autocomplete=true&types=place,address`);
      const data = await res.json();
      setWizardSuggestions(data.features || []);
    } catch (e) {}
  };

  // ── Tutorial dummy event ──────────────────────────────────────────────────
  const dummyEvent: any = {
    id: 'tutorial-dummy',
    title: 'Sunset Hike',
    interest: 'Hiking',
    categoryId: 'outdoor',
    categorySub: ['Hiking'],
    ageGroup: 'All Ages',
    gender: 'Anyone',
    description: 'A simulation event to learn how joining works. Your Leaves will be instantly refunded.',
    location: {
      latitude: Number(user?.homeLocation?.latitude || 50.2649),
      longitude: Number(user?.homeLocation?.longitude || 19.0238),
    },
    creatorId: 'system',
    creatorName: 'The Tribes',
    time: Date.now(),
    participants: [],
    maxParticipants: 10,
  };

  // ── Filtering logic ───────────────────────────────────────────────────────
  let displayFilterEvents = events.filter(e => {
    if (e.status === 'cancelled' || e.status === 'finalized') return false;
    if (e.isPrivate && !e.participants?.includes(user?.uid || '')) return false;
    if (feedbackSubmitted[e.id]) return false;
    return true;
  });
  if (activeAgeFilters.length > 0)
    displayFilterEvents = displayFilterEvents.filter(e => e.ageGroup && activeAgeFilters.includes(e.ageGroup));
  if (activeGenderFilters.length > 0)
    displayFilterEvents = displayFilterEvents.filter(e => e.gender && activeGenderFilters.includes(e.gender));
  if (Object.keys(activeFilters).length > 0) {
    displayFilterEvents = displayFilterEvents.filter(e => {
      if (!e.categoryId) return false;
      const selectedSubs = activeFilters[e.categoryId];
      if (!selectedSubs) return false;
      if (selectedSubs.length === 0) return true;
      const eventSubs = Array.isArray(e.categorySub) ? e.categorySub : (e.categorySub ? [e.categorySub as unknown as string] : []);
      return selectedSubs.some(sub => eventSubs.includes(sub));
    });
  }
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  displayFilterEvents = displayFilterEvents.filter(e => {
    if (!e.time) return false;
    const t = new Date(e.time);
    if (dateFilter === 'All') return t >= todayStart;                  // all future, no upper bound
    if (dateFilter === '30 Days') return t >= todayStart && t <= addDays(todayStart, 30);
    if (dateFilter === 'Today') return isToday(t);
    if (dateFilter === 'Tomorrow') return isTomorrow(t);
    if (dateFilter === 'Weekend') return t >= todayStart && t <= addDays(todayStart, 7) && isWeekend(t);
    if (dateFilter === 'Next Week') {
      const nextWk = addWeeks(todayStart, 1);
      return t >= startOfWeek(nextWk, { weekStartsOn: 1 }) && t <= endOfWeek(nextWk, { weekStartsOn: 1 });
    }
    return true;
  });
  // Stable reference so useMemo in clusteredMarkers only re-runs when content changes
  const displayEvents = useMemo(
    () => (tutStep >= 6 && tutStep <= 7 ? [...displayFilterEvents, dummyEvent] : displayFilterEvents),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [displayFilterEvents.map(e => e.id).join(','), tutStep],
  );
  const joinedEvents = events.filter(e => {
    if (!e.participants?.includes(user?.uid || '')) return false;
    if (e.status === 'cancelled') return false;
    if (e.status === 'finalized') {
      if (e.creatorId === user?.uid) return false;
      if (feedbackSubmitted[e.id]) return false;
      return true;
    }
    return true;
  });
  const userTribes = tribes.filter(t => t.members.includes(user?.uid || ''));

  // ── Zoom-aware clustering ─────────────────────────────────────────────────
  const clusteredMarkers = React.useMemo(() => {
    const RADIUS = 0.004 * Math.pow(2, 13 - currentZoom);
    const used = new Set<string>();
    const clusters: { lat: number; lng: number; events: TribeVent[] }[] = [];
    for (const ev of displayEvents) {
      if (used.has(ev.id)) continue;
      const group: TribeVent[] = [ev];
      used.add(ev.id);
      for (const other of displayEvents) {
        if (used.has(other.id)) continue;
        const d = Math.sqrt(Math.pow(ev.location.latitude - other.location.latitude, 2) + Math.pow(ev.location.longitude - other.location.longitude, 2));
        if (d < RADIUS) { group.push(other); used.add(other.id); }
      }
      const lat = group.reduce((s, e) => s + e.location.latitude, 0) / group.length;
      const lng = group.reduce((s, e) => s + e.location.longitude, 0) / group.length;
      clusters.push({ lat, lng, events: group });
    }
    return clusters;
  }, [displayEvents, currentZoom]);

  const handleScroll = (event: any) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    setScrollX(contentOffset.x);
    setCanScrollLeft(contentOffset.x > 5);
    setCanScrollRight(contentOffset.x + layoutMeasurement.width < contentSize.width - 5);
  };

  React.useEffect(() => {
    if (!user) return;
    if (user.hasSeenTutorial) return;
    setTutStep(0);
  }, [user?.uid, user?.hasSeenTutorial]);

  // ── Profile fetch ─────────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!profileViewUid) { setProfileViewData(null); return; }
    getDoc(doc(db, 'users', profileViewUid)).then(snap => {
      if (snap.exists()) setProfileViewData({ id: profileViewUid, ...snap.data() });
    }).catch(() => {});
  }, [profileViewUid]);

  // ── Creator stats + feedback + participant names ───────────────────────────
  React.useEffect(() => {
    if (!selectedEvent || selectedEvent.id === 'tutorial-dummy') return;
    if (!creatorStatsCache[selectedEvent.creatorId]) {
      getDoc(doc(db, 'users', selectedEvent.creatorId)).then(snap => {
        if (snap.exists()) {
          const d = snap.data();
          setCreatorStatsCache(prev => ({
            ...prev,
            [selectedEvent.creatorId]: { name: d.displayName || 'Unknown', ratingSum: d.ratingSum || 0, ratingCount: d.ratingCount || 0 },
          }));
        }
      }).catch(() => {});
    }
    if (userFeedbackCache[selectedEvent.id] === undefined) {
      getUserFeedback(selectedEvent.id).then(fb => {
        setUserFeedbackCache(prev => ({ ...prev, [selectedEvent.id]: fb || 'none' }));
      }).catch(() => {});
    }
    setFinalizeChecked(selectedEvent.participants?.filter(p => p !== selectedEvent.creatorId) || []);
    setFeedbackAnswer({});
    (selectedEvent.participants || []).forEach(uid => {
      if (!participantNamesCache[uid]) {
        getDoc(doc(db, 'users', uid)).then(snap => {
          if (snap.exists()) {
            const d = snap.data();
            setParticipantNamesCache(prev => ({ ...prev, [uid]: d.displayName || uid.substring(0, 8) }));
          }
        }).catch(() => {});
      }
    });
  }, [selectedEvent?.id]);

  const markTutorialSeen = async () => {
    if (!user) return;
    setTutStep(-1);
    try { await updateDoc(doc(db, 'users', user.uid), { hasSeenTutorial: true }); } catch (e) {}
  };

  const handleMapPress = (e: any) => {
    if (mode === 'wizard_location') {
      const coords = e.geometry.coordinates;
      setDraft({ ...draft, location: { lat: coords[1], lng: coords[0] } });
    }
  };

  const handleCreate = async () => {
    try {
      if (!draft.title || !draft.categoryId || (draft.categoryId !== 'time_limited' && draft.categorySub.length === 0) || !draft.location || !draft.date)
        return Alert.alert('Incomplete', 'Title, category, subcategory, date and location are all required.');
      await createEvent(draft.title, draft.categoryId, draft.categorySub, parseInt(draft.limit) || 10, draft.isPrivate, 5, {
        latitude: draft.location.lat, longitude: draft.location.lng, address: draft.address || 'Pinned on map',
      }, draft.date, draft.ageGroup, draft.gender, draft.tribeId || undefined, draft.cyclicalRule || undefined);
      setMode('map');
      setDraft({ title: '', categoryId: '', categorySub: [], isPrivate: false, limit: '10', location: null, address: '', date: null, ageGroup: 'All Ages', gender: 'Anyone', tribeId: '', cyclicalRule: '' });
      Alert.alert('Gathering Created', 'Your event is live. 5 Leaves were staked.');
    } catch (err: any) { Alert.alert('Error', err.message); }
  };

  const handleJoin = async () => {
    if (!selectedEvent || !user) return;
    if (selectedEvent.id === 'tutorial-dummy') {
      const done = () => { setSelectedEvent(null); setMode('map'); setTutStep(-1); markTutorialSeen(); };
      if (Platform.OS === 'web') {
        window.alert("You've joined your first event! Your 1 Leaf has been refunded since this is a simulation. Welcome to The Tribes.");
        done();
      } else {
        Alert.alert("You're In!", "Successfully joined. Your 1 Leaf has been refunded — this is a practice event. Welcome to The Tribes!", [{ text: 'Let\'s go', onPress: done }]);
      }
      return;
    }
    if (user.tokens < 1) { Alert.alert('Out of Leaves', 'You need at least 1 Leaf to join. Wait for refunds from past events.'); return; }
    try {
      await joinEvent(selectedEvent.id);
      Alert.alert('Joined', "You've secured your spot. Chat is now unlocked.");
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  // ── Bonfire glow helpers ──────────────────────────────────────────────────
  const getBonfireIntensity = (eventTime: any): number => {
    if (!eventTime) return 0.3;
    const hoursUntil = (new Date(eventTime).getTime() - Date.now()) / 3600000;
    if (hoursUntil < 0) return 1;
    if (hoursUntil >= 24) return 0.15;
    return 1 - hoursUntil / 24;
  };

  // ── Dev Tools ─────────────────────────────────────────────────────────────
  const renderDevTools = () => {
    if (!user?.isDev) return null;
    return (
      <View style={styles.devPanel}>
        <Text style={styles.devTitle}>DEV</Text>
        {[
          { label: '[TUT]', onPress: () => setTutStep(1) },
          { label: '[+100L]', onPress: async () => { const { doc: d, updateDoc: u, increment } = await import('firebase/firestore'); await u(d(db, 'users', user.uid), { tokens: increment(100) }); } },
          { label: '[CLR]', onPress: async () => { const { collection, query, where, getDocs, deleteDoc } = await import('firebase/firestore'); const q = query(collection(db, 'events'), where('creatorId', '==', user.uid)); const snaps = await getDocs(q); snaps.forEach(s => deleteDoc(s.ref)); } },
          { label: '[PIN]', onPress: () => { setDraft({ ...draft, title: 'Dev Dummy', categoryId: 'outdoor', categorySub: ['Hiking'], location: { lat: 50.2649, lng: 19.0238 }, date: new Date() }); setMode('wizard_location'); } },
        ].map(({ label, onPress }) => (
          <TouchableOpacity key={label} style={styles.devBtn} onPress={onPress}>
            <Text style={styles.devBtnText}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // ── Tribe Management Overlay ──────────────────────────────────────────────
  const renderManagementOverlay = () => {
    if (!selectedTribe) return null;
    const isChief = selectedTribe.creatorId === user?.uid;
    const isLeader = isChief || (selectedTribe.leaders || []).includes(user?.uid || '');
    return (
      <KeyboardAvoidingView style={StyleSheet.absoluteFill as any} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity
          style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' } as any}
          activeOpacity={1}
          onPress={() => setShowManagement(false)}
        />
        <View style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          backgroundColor: Colors.bgElevated,
          borderTopLeftRadius: 28, borderTopRightRadius: 28,
          borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1,
          borderColor: Colors.glassCardBorder,
          padding: 24, paddingBottom: 44, maxHeight: '82%',
        }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.goldDim, borderWidth: 1, borderColor: Colors.goldBorder, justifyContent: 'center', alignItems: 'center' }}>
                <Feather name={isChief ? 'award' : 'shield'} size={16} color={Colors.gold} />
              </View>
              <View>
                <Text style={{ fontFamily: Typography.headline, fontSize: 19, color: Colors.textPrimary, letterSpacing: -0.2 }}>
                  {isChief ? 'Chief Dashboard' : 'Council'}
                </Text>
                <Text style={{ fontFamily: Typography.bodyLight, fontSize: 11, color: Colors.textMuted, marginTop: 1 }}>
                  {isChief ? 'Full command of the tribe' : 'Leader privileges'}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setShowManagement(false)} style={{ padding: 6 }}>
              <Feather name="x" size={22} color="rgba(255,255,255,0.45)" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Pending applicants */}
            {selectedTribe.pendingApplicants.length > 0 && (
              <View style={{ marginBottom: 18, backgroundColor: Colors.glassCardBg, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: Colors.glassCardBorder }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <Feather name="user-check" size={13} color={Colors.gold} />
                  <Text style={{ fontFamily: Typography.bodyLight, fontSize: 11, color: Colors.gold, letterSpacing: 1.4, textTransform: 'uppercase' }}>
                    {selectedTribe.pendingApplicants.length} Pending {selectedTribe.pendingApplicants.length === 1 ? 'Application' : 'Applications'}
                  </Text>
                </View>
                {selectedTribe.pendingApplicants.map((appUid: string) => (
                  <View key={appUid} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', padding: 13, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }}>
                    <TouchableOpacity onPress={() => setProfileViewUid(appUid)}>
                      <Text style={{ fontSize: 14, fontFamily: Typography.bodyMedium, color: Colors.textPrimary }}>
                        {selectedTribe.memberNames?.[appUid] || `Wanderer ${appUid.substring(0, 6)}`}
                      </Text>
                    </TouchableOpacity>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity
                        onPress={async () => { try { await rejectApplicant(selectedTribe.id, appUid); Alert.alert('', 'Application rejected.'); } catch { Alert.alert('Error', 'Failed to reject.'); } }}
                        style={{ backgroundColor: Colors.dangerSoft, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9999, borderWidth: 1, borderColor: Colors.dangerBorder }}>
                        <Text style={{ fontFamily: Typography.bodyMedium, color: Colors.danger, fontSize: 12 }}>Reject</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={async () => { try { await acceptApplicant(selectedTribe.id, appUid); Alert.alert('', 'Initiated into the tribe.'); } catch { Alert.alert('Error', 'Failed to accept.'); } }}
                        style={{ backgroundColor: Colors.goldDim, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9999, borderWidth: 1, borderColor: Colors.goldBorder }}>
                        <Text style={{ fontFamily: Typography.bodyMedium, color: Colors.gold, fontSize: 12 }}>Accept</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Broadcast signal */}
            <View style={{ backgroundColor: Colors.glassCardBg, padding: 16, borderRadius: 16, marginBottom: 18, borderWidth: 1, borderColor: Colors.glassCardBorder }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Feather name="radio" size={13} color={Colors.gold} />
                <Text style={{ fontFamily: Typography.bodyLight, fontSize: 11, color: Colors.gold, letterSpacing: 1.4, textTransform: 'uppercase' }}>Broadcast Signal</Text>
              </View>
              <TextInput
                style={{ backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12, padding: 14, fontSize: 14, fontFamily: Typography.body, textAlignVertical: 'top', height: 90, color: '#fff', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
                placeholder="Write an announcement to your tribe…"
                placeholderTextColor="rgba(255,255,255,0.28)"
                multiline
                value={announcementText}
                onChangeText={setAnnouncementText}
              />
              <TouchableOpacity
                onPress={async () => {
                  if (!announcementText.trim()) return;
                  await postAnnouncement(selectedTribe.id, announcementText);
                  setAnnouncementText('');
                  setShowManagement(false);
                }}
                style={{ backgroundColor: Colors.glassBtnBg, height: 56, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', marginTop: 10, borderWidth: 1, borderColor: Colors.gold }}>
                <Text style={{ color: '#fff', fontFamily: Typography.bodyBold, fontSize: 14 }}>Send Announcement</Text>
              </TouchableOpacity>
            </View>

            {/* Members */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Feather name="users" size={13} color={Colors.gold} />
              <Text style={{ fontFamily: Typography.bodyLight, fontSize: 11, color: Colors.gold, letterSpacing: 1.4, textTransform: 'uppercase' }}>
                Members ({selectedTribe.members.length})
              </Text>
            </View>
            <View style={{ backgroundColor: Colors.glassCardBg, borderRadius: 16, overflow: 'hidden', marginBottom: 18, borderWidth: 1, borderColor: Colors.glassCardBorder }}>
              {selectedTribe.members.map((mUid: string, idx: number) => {
                const mIsLeader = selectedTribe.creatorId === mUid || (selectedTribe.leaders || []).includes(mUid);
                const mIsChief = selectedTribe.creatorId === mUid;
                return (
                  <View key={mUid} style={{ flexDirection: 'row', alignItems: 'center', padding: 13, borderBottomWidth: idx === selectedTribe.members.length - 1 ? 0 : 1, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: mIsChief ? Colors.goldDim : mIsLeader ? 'rgba(122,143,160,0.20)' : Colors.glassCardBg, borderWidth: 1, borderColor: mIsChief ? Colors.goldBorder : mIsLeader ? 'rgba(122,143,160,0.45)' : Colors.glassCardBorder, justifyContent: 'center', alignItems: 'center', marginRight: 11 }}>
                      <Text style={{ fontFamily: Typography.bodyMedium, color: mIsChief ? Colors.gold : mIsLeader ? '#7A8FA0' : Colors.textSecondary, fontSize: 12 }}>
                        {selectedTribe.memberNames[mUid]?.charAt(0) || '?'}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <TouchableOpacity onPress={() => setProfileViewUid(mUid)}>
                        <Text style={{ fontFamily: Typography.bodySemibold, color: '#fff', fontSize: 13, textDecorationLine: 'underline' }}>
                          {selectedTribe.memberNames[mUid] || 'Unknown'}
                        </Text>
                      </TouchableOpacity>
                      {mIsChief ? (
                        <Text style={{ fontFamily: Typography.bodyLight, fontSize: 10, color: Colors.gold, letterSpacing: 0.8 }}>Chief</Text>
                      ) : mIsLeader ? (
                        <Text style={{ fontFamily: Typography.bodyLight, fontSize: 10, color: '#7A8FA0', letterSpacing: 0.8 }}>Leader</Text>
                      ) : null}
                    </View>
                    <View style={{ flexDirection: 'row', gap: 4 }}>
                      {isChief && !mIsChief && (
                        <TouchableOpacity onPress={() => { mIsLeader ? demoteMember(selectedTribe.id, mUid) : promoteMember(selectedTribe.id, mUid); }} style={{ padding: 7 }}>
                          <Feather name={mIsLeader ? 'shield-off' : 'shield'} size={16} color={mIsLeader ? Colors.textMuted : Colors.gold} />
                        </TouchableOpacity>
                      )}
                      {!mIsChief && (isChief || (isLeader && !mIsLeader)) && (
                        <TouchableOpacity
                          onPress={() => Alert.alert('Remove Member', `Remove ${selectedTribe.memberNames[mUid]}?`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => removeMember(selectedTribe.id, mUid) }])}
                          style={{ padding: 7 }}>
                          <Feather name="user-x" size={16} color={Colors.danger} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Dissolve tribe */}
            {isChief && (
              <TouchableOpacity
                onPress={() => Alert.alert('DANGER', 'Permanently dissolve the tribe?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Dissolve', style: 'destructive', onPress: () => { deleteTribe(selectedTribe.id); setSelectedTribe(null); setShowManagement(false); } },
                ])}
                style={{ backgroundColor: Colors.dangerSoft, height: 56, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.dangerBorder }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Feather name="alert-triangle" size={15} color={Colors.danger} />
                  <Text style={{ fontFamily: Typography.bodyBold, color: Colors.danger }}>Dissolve Tribe</Text>
                </View>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    );
  };

  // ── HUD ───────────────────────────────────────────────────────────────────
  const renderHUD = () => {
    if (mode !== 'map') return null;
    const activeFilterCount = Object.keys(activeFilters).length + activeAgeFilters.length + activeGenderFilters.length;
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {/* Settings */}
        <TouchableOpacity style={styles.hudBtnTopRight} onPress={() => navigation.navigate('Settings')}>
          <BlurView intensity={60} tint="dark" style={styles.hudBlurBtn}>
            <Feather name="settings" size={17} color="rgba(255,255,255,0.7)" />
          </BlurView>
        </TouchableOpacity>

        {/* Locate */}
        <TouchableOpacity style={[styles.hudBtnTopRight, { top: 112 }]} onPress={() => {
          if (user?.homeLocation) {
            cameraRef.current?.setCamera({ centerCoordinate: [user.homeLocation.longitude, user.homeLocation.latitude], zoomLevel: 12.5, animationDuration: 1000 });
          }
        }}>
          <BlurView intensity={60} tint="dark" style={styles.hudBlurBtn}>
            <Feather name="navigation" size={17} color="rgba(255,255,255,0.7)" />
          </BlurView>
        </TouchableOpacity>

        {/* Search */}
        <TouchableOpacity style={[styles.hudBtnTopRight, { top: 168 }]} onPress={() => setMode('search_map')}>
          <BlurView intensity={60} tint="dark" style={styles.hudBlurBtn}>
            <Feather name="search" size={17} color="rgba(255,255,255,0.7)" />
          </BlurView>
        </TouchableOpacity>

        {/* Top-left: balance + tribe + create */}
        <View style={styles.topLeft} pointerEvents="box-none">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            {/* Token balance */}
            <BlurView intensity={60} tint="dark" style={styles.balancePill}>
              <Text style={styles.balanceText}>{user?.tokens ?? 0}</Text>
              <Image source={LEAF} style={styles.balanceLeaf} />
            </BlurView>
            {/* Per-tribe spirit avatar buttons */}
            {userTribes.map(usrTribe => (
              <TouchableOpacity key={usrTribe.id} onPress={() => { setSelectedTribe(usrTribe); setMode('tribe_panel'); }}
                style={{ backgroundColor: Colors.glassBtnBg, borderRadius: 20, width: 40, height: 40, justifyContent: 'center', alignItems: 'center', shadowColor: Colors.gold, shadowOpacity: 0.45, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 5 }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, overflow: 'hidden', alignItems: 'center' }}>
                  <Image source={SPIRIT_ASSETS[usrTribe.spiritId || 'forest']} style={{ width: 130, height: 130, resizeMode: 'contain', marginTop: 2 }} />
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Create + joined events */}
          <View style={styles.upcomingRow}>
            <TouchableOpacity style={styles.plusBtn} onPress={() => setMode('wizard_details')}>
              <Feather name="plus" size={26} color={Colors.textPrimary} />
            </TouchableOpacity>
            {joinedEvents.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.upcomingScroll}>
                {joinedEvents.map(e => (
                  <TouchableOpacity key={e.id} style={styles.upcomingIcon} onPress={() => { setSelectedEvent(e); setMode('event_chat'); }}>
                    <Text style={styles.upcomingInitial}>{e.title.charAt(0).toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>

        {/* Bottom bar */}
        <View style={styles.bottomBar} pointerEvents="box-none">
          <BlurView intensity={55} tint="dark" style={styles.dateSlider}>
            {canScrollLeft && (
              <TouchableOpacity style={styles.sliderArrow} onPress={() => scrollRef.current?.scrollTo({ x: Math.max(0, scrollX - 150), animated: true })}>
                <Feather name="chevron-left" size={16} color={Colors.textPrimary} />
              </TouchableOpacity>
            )}
            <ScrollView ref={scrollRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 10 }} onScroll={handleScroll} scrollEventThrottle={16}>
              {['30 Days', 'Today', 'Tomorrow', 'Weekend', 'Next Week', 'All'].map(d => (
                <TouchableOpacity key={d} onPress={() => setDateFilter(d)} style={[styles.datePill, dateFilter === d && styles.datePillActive]}>
                  <Text style={[styles.datePillText, dateFilter === d && styles.datePillTextActive]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {canScrollRight && (
              <TouchableOpacity style={[styles.sliderArrow, { right: 0, left: undefined }]} onPress={() => scrollRef.current?.scrollTo({ x: scrollX + 150, animated: true })}>
                <Feather name="chevron-right" size={16} color={Colors.textPrimary} />
              </TouchableOpacity>
            )}
          </BlurView>

          <TouchableOpacity onPress={() => setMode('filters')}>
            <BlurView intensity={55} tint="dark" style={[styles.filterPill, activeFilterCount > 0 && styles.filterPillActive]}>
              <Feather name="sliders" size={14} color={activeFilterCount > 0 ? '#1A2421' : 'rgba(255,255,255,0.65)'} />
              {activeFilterCount > 0 && <Text style={styles.filterPillCount}>{activeFilterCount}</Text>}
            </BlurView>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ── Map Search overlay ────────────────────────────────────────────────────
  const renderMapSearch = () => {
    if (mode !== 'search_map') return null;
    return (
      <View style={{ position: 'absolute', top: 50, left: 16, right: 16, zIndex: 1000 }}>
        <BlurView intensity={85} tint="dark" style={{ borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: Colors.hairline }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 }}>
            <Feather name="search" size={16} color={Colors.textMuted} style={{ marginRight: 10 }} />
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0, paddingVertical: 12, backgroundColor: 'transparent', borderWidth: 0 }]}
              placeholder="City, neighborhood…"
              placeholderTextColor={Colors.textPlaceholder}
              autoFocus
              value={wizardQuery}
              onChangeText={searchWizardLocation}
            />
            <TouchableOpacity onPress={() => { setMode('map'); setWizardQuery(''); setWizardSuggestions([]); }} style={{ padding: 8 }}>
              <Feather name="x" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
          {wizardSuggestions.length > 0 && (
            <View style={{ borderTopWidth: 1, borderTopColor: Colors.hairlineNeutral }}>
              {wizardSuggestions.slice(0, 4).map((feat, i) => (
                <TouchableOpacity key={i} style={{ paddingHorizontal: 20, paddingVertical: 13, borderBottomWidth: i < 3 ? 1 : 0, borderBottomColor: Colors.hairlineNeutral }}
                  onPress={() => {
                    const [lng, lat] = feat.center;
                    cameraRef.current?.setCamera({ centerCoordinate: [lng, lat], zoomLevel: 12.5, animationDuration: 1000 });
                    setMode('map'); setWizardQuery(''); setWizardSuggestions([]);
                  }}>
                  <Text style={styles.suggestionText} numberOfLines={1}>{feat.place_name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </BlurView>
      </View>
    );
  };

  // ── Wizard: Details ───────────────────────────────────────────────────────
  const renderWizardDetails = () => (
    <KeyboardAvoidingView style={styles.bottomSheet} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.sheetHandle} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sheetTitle, { marginTop: 4, marginBottom: 20 }]}>Design your Gathering</Text>

        <TextInput style={styles.input} placeholder="Event title" placeholderTextColor={Colors.textPlaceholder} value={draft.title} onChangeText={t => setDraft({ ...draft, title: t })} />

        {/* Categories */}
        <Text style={styles.fieldLabel}>CATEGORY</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
          {EVENT_CATEGORIES.map(cat => (
            <TouchableOpacity key={cat.id} style={[styles.catChip, draft.categoryId === cat.id && { backgroundColor: cat.color + '28', borderColor: cat.color + '70' }]} onPress={() => setDraft({ ...draft, categoryId: cat.id as CategoryGroupId, categorySub: [] })}>
              <Feather name={cat.icon} size={13} color={draft.categoryId === cat.id ? cat.color : Colors.textMuted} />
              <Text style={[styles.catChipText, draft.categoryId === cat.id && { color: cat.color }]}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Subcategories */}
        {draft.categoryId && EVENT_CATEGORIES.find(c => c.id === draft.categoryId)?.subgroups.length ? (
          <>
            <Text style={styles.fieldLabel}>SUBCATEGORIES</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
              {EVENT_CATEGORIES.find(c => c.id === draft.categoryId)?.subgroups.map(sub => {
                const catColor = EVENT_CATEGORIES.find(c => c.id === draft.categoryId)?.color || Colors.gold;
                const isActive = draft.categorySub.includes(sub);
                return (
                  <TouchableOpacity key={sub} style={[styles.subChip, isActive && { backgroundColor: catColor + '25', borderColor: catColor + '60' }]}
                    onPress={() => {
                      const subs = draft.categorySub;
                      if (subs.includes(sub)) setDraft({ ...draft, categorySub: subs.filter(s => s !== sub) });
                      else if (subs.length < 5) setDraft({ ...draft, categorySub: [...subs, sub] });
                      else { if (Platform.OS === 'web') window.alert('Max 5 subcategories.'); else Alert.alert('Limit', 'You can select up to 5 subcategories.'); }
                    }}>
                    <Text style={[styles.subChipText, isActive && { color: catColor }]}>{sub}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </>
        ) : null}

        {/* Age group */}
        <Text style={styles.fieldLabel}>AGE GROUP</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
          {['All Ages', 'Under 18', '18-25', '26-35', '36-45', '45+'].map(age => (
            <TouchableOpacity key={age} style={[styles.subChip, draft.ageGroup === age && { backgroundColor: Colors.goldDim, borderColor: Colors.goldBorder }]} onPress={() => setDraft({ ...draft, ageGroup: age })}>
              <Text style={[styles.subChipText, draft.ageGroup === age && { color: Colors.gold }]}>{age}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Gender */}
        <Text style={styles.fieldLabel}>TARGET GENDER</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
          {['Anyone', 'Male', 'Female', 'LGBTQIA+'].map(gender => (
            <TouchableOpacity key={gender} style={[styles.subChip, draft.gender === gender && { backgroundColor: Colors.goldDim, borderColor: Colors.goldBorder }]} onPress={() => setDraft({ ...draft, gender })}>
              <Text style={[styles.subChipText, draft.gender === gender && { color: Colors.gold }]}>{gender}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Date picker */}
        <Text style={styles.fieldLabel}>DATE & TIME</Text>
        <TouchableOpacity style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }]} onPress={() => setShowDatePicker(true)}>
          <Text style={{ fontFamily: Typography.body, fontSize: 15, color: draft.date ? Colors.textPrimary : Colors.textPlaceholder }}>
            {draft.date ? format(draft.date, 'MMM d, yyyy · h:mm a') : 'Select date and time'}
          </Text>
          <Feather name="calendar" size={15} color={Colors.gold} />
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker value={draft.date || new Date()} mode="date" display="default" minimumDate={new Date()}
            onChange={(event, d) => { setShowDatePicker(Platform.OS === 'ios'); if (d) { setDraft({ ...draft, date: d }); if (Platform.OS === 'android') setShowTimePicker(true); } }} />
        )}
        {showTimePicker && (
          <DateTimePicker value={draft.date || new Date()} mode="time" display="default"
            onChange={(event, d) => { setShowTimePicker(Platform.OS === 'ios'); if (d) setDraft({ ...draft, date: d }); }} />
        )}

        {/* Location search */}
        <Text style={styles.fieldLabel}>LOCATION</Text>
        <TextInput style={styles.input} placeholder="City or street" placeholderTextColor={Colors.textPlaceholder} value={wizardQuery} onChangeText={searchWizardLocation} />
        {wizardSuggestions.length > 0 && (
          <View style={styles.suggestions}>
            {wizardSuggestions.map((s, i) => (
              <TouchableOpacity key={i} style={[styles.suggestionItem, i < wizardSuggestions.length - 1 && { borderBottomWidth: 1, borderBottomColor: Colors.hairlineNeutral }]}
                onPress={() => { setDraft({ ...draft, location: { lat: s.center[1], lng: s.center[0] }, address: s.place_name }); setWizardSuggestions([]); setWizardQuery(s.place_name); }}>
                <Text style={styles.suggestionText} numberOfLines={1}>{s.place_name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Frequency */}
        <Text style={styles.fieldLabel}>FREQUENCY</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
          {['once', 'weekly', 'monthly'].map(rule => {
            const isActive = draft.cyclicalRule === rule || (rule === 'once' && !draft.cyclicalRule);
            return (
              <TouchableOpacity key={rule} style={[styles.subChip, isActive && { backgroundColor: Colors.goldDim, borderColor: Colors.goldBorder }]} onPress={() => setDraft({ ...draft, cyclicalRule: rule === 'once' ? '' : rule })}>
                <Text style={[styles.subChipText, isActive && { color: Colors.gold }]}>{rule === 'once' ? 'One-time' : rule.charAt(0).toUpperCase() + rule.slice(1)}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </ScrollView>

      {/* Sticky actions */}
      <View style={styles.sheetActions}>
        <TouchableOpacity style={[styles.btnSecondary, { flex: 1 }]} onPress={() => setMode('map')}>
          <Text style={styles.btnSecondaryText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btnPrimary, { flex: 2 }]} onPress={() => {
          if (draft.location) cameraRef.current?.setCamera({ centerCoordinate: [draft.location.lng, draft.location.lat], zoomLevel: 14, animationDuration: 1000 });
          setMode('wizard_location');
        }}>
          <Text style={styles.btnPrimaryText}>Set Location</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  // ── Wizard: Pin Location ──────────────────────────────────────────────────
  const renderWizardLocation = () => (
    <View style={{ position: 'absolute', top: 50, left: 16, right: 16 }}>
      <View style={{ backgroundColor: 'rgba(26,36,33,0.94)', borderRadius: 20, padding: 22, borderWidth: 1, borderColor: Colors.hairline }}>
        <Text style={styles.sheetTitle}>Drop the Pin</Text>
        <Text style={styles.sheetSub}>Tap anywhere on the map to set the exact location.</Text>
        {draft.location && (
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
            <TouchableOpacity style={[styles.btnSecondary, { flex: 1 }]} onPress={() => setMode('wizard_details')}>
              <Text style={styles.btnSecondaryText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btnPrimary, { flex: 2 }]} onPress={handleCreate}>
              <Text style={styles.btnPrimaryText}>Stake 5</Text>
              <Image source={LEAF} style={[styles.btnLeafInline]} />
              <Text style={styles.btnPrimaryText}>& Finalize</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );

  // ── Event Chat ────────────────────────────────────────────────────────────
  const renderEventChat = () => {
    if (!selectedEvent) return null;
    const isJoined = selectedEvent.participants.includes(user?.uid || '');
    const isHost = selectedEvent.creatorId === user?.uid;
    return (
      <View style={styles.bottomSheetFull}>
        {/* Header */}
        <View style={styles.chatHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.chatTitle} numberOfLines={1}>{selectedEvent.title}</Text>
            <Text style={styles.chatSub}>{selectedEvent.participants.length} / {selectedEvent.participantLimit} attending · {selectedEvent.time ? format(new Date(selectedEvent.time), 'MMM d, h:mm a') : 'TBD'}</Text>
          </View>
          {isHost && (
            <TouchableOpacity onPress={async () => {
              if (selectedEvent.id === 'tutorial-dummy') { setSelectedEvent(null); setMode('map'); return; }
              const del = async () => { try { await deleteEvent(selectedEvent.id); setSelectedEvent(null); setMode('map'); Alert.alert('Removed', 'Event deleted. 5 Leaves refunded.'); } catch (e: any) { Alert.alert('Error', e.message); } };
              if (Platform.OS === 'web') { if (window.confirm('Cancel this event?')) del(); }
              else Alert.alert('Delete Event', 'Cancel this event?', [{ text: 'No' }, { text: 'Yes', style: 'destructive', onPress: del }]);
            }} style={{ padding: 8, marginRight: 4 }}>
              <Feather name="trash-2" size={17} color={Colors.danger} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => { setSelectedEvent(null); setMode('map'); }} style={{ padding: 8 }}>
            <Feather name="x" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Location line */}
        <View style={styles.chatLocRow}>
          <Feather name="map-pin" size={11} color={Colors.gold} />
          <Text style={styles.chatLoc} numberOfLines={1}>{selectedEvent.location.address || 'Precise location pinned on map'}</Text>
        </View>

        {/* Locked / open */}
        {!isJoined && !isHost ? (
          <View style={styles.chatLocked}>
            <View style={styles.lockIconWrap}>
              <Feather name="lock" size={26} color={Colors.gold} />
            </View>
            <Text style={styles.chatLockedTitle}>Tribal Chat is Sealed</Text>
            <Text style={styles.chatLockedSub}>Commit 1 Leaf to join this gathering.</Text>
            <TouchableOpacity style={styles.btnPrimaryFull} onPress={handleJoin}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.btnPrimaryFullText}>Join · 1</Text>
                <Image source={LEAF} style={styles.btnLeafDark} />
              </View>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.chatOpen}>
            <ScrollView style={styles.chatScroll} contentContainerStyle={{ paddingVertical: 12, paddingBottom: 20 }}>
              <View style={styles.chatBubble}>
                <Text style={styles.chatBubbleText}>Welcome to the gathering. See you there.</Text>
              </View>
            </ScrollView>
            <View style={styles.chatInputRow}>
              <TextInput style={styles.chatInput} placeholder="Send a message…" placeholderTextColor={Colors.textPlaceholder} />
              <TouchableOpacity style={styles.sendBtn}>
                <Feather name="send" size={15} color="#1A2421" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  // ── Filters ───────────────────────────────────────────────────────────────
  const renderFilters = () => (
    <View style={styles.bottomSheetFull}>
      <View style={[styles.chatHeader, { paddingBottom: 0 }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sheetTitle}>Filter Gatherings</Text>
          <Text style={styles.sheetSub}>Refine the map to your vibe.</Text>
        </View>
        <TouchableOpacity onPress={() => setMode('map')} style={{ padding: 8 }}>
          <Feather name="x" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
        {EVENT_CATEGORIES.map(cat => {
          const isActive = activeFilters[cat.id] !== undefined;
          const isExpanded = expandedCat === cat.id;
          return (
            <View key={cat.id} style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity
                  style={[styles.filterChip, isActive && { borderColor: cat.color + '80', backgroundColor: cat.color + '14' }]}
                  onPress={() => toggleCategory(cat.id)}
                >
                  <Feather name={cat.icon} size={17} color={isActive ? cat.color : Colors.textMuted} />
                  <Text style={[styles.filterChipText, isActive && { color: cat.color }]}>
                    {cat.label}{isActive && activeFilters[cat.id]?.length > 0 ? `  ${activeFilters[cat.id].length}` : ''}
                  </Text>
                </TouchableOpacity>
                {cat.subgroups.length > 0 && (
                  <TouchableOpacity style={styles.expandBtn} onPress={() => setExpandedCat(isExpanded ? null : cat.id)}>
                    <Feather name={isExpanded ? 'chevron-up' : 'chevron-down'} size={17} color={Colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
              {isExpanded && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10, paddingLeft: 8 }}>
                  {cat.subgroups.map(sub => {
                    const isSubActive = isActive && (activeFilters[cat.id].length === 0 || activeFilters[cat.id].includes(sub));
                    return (
                      <TouchableOpacity key={sub} style={[styles.subChip, isSubActive && { backgroundColor: cat.color + '22', borderColor: cat.color + '60' }]} onPress={() => toggleSubFilter(cat.id, sub)}>
                        <Text style={[styles.subChipText, isSubActive && { color: cat.color }]}>{sub}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}

        {/* Age */}
        <View style={{ marginBottom: 8, marginTop: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity style={[styles.filterChip, activeAgeFilters.length > 0 && { borderColor: Colors.goldBorder, backgroundColor: Colors.goldDim }]}
              onPress={() => { if (activeAgeFilters.length > 0) setActiveAgeFilters([]); else setExpandedAge(!expandedAge); }}>
              <Feather name="users" size={17} color={activeAgeFilters.length > 0 ? Colors.gold : Colors.textMuted} />
              <Text style={[styles.filterChipText, activeAgeFilters.length > 0 && { color: Colors.gold }]}>
                Age Group{activeAgeFilters.length > 0 ? `  ${activeAgeFilters.length}` : ''}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.expandBtn} onPress={() => setExpandedAge(!expandedAge)}>
              <Feather name={expandedAge ? 'chevron-up' : 'chevron-down'} size={17} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
          {expandedAge && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10, paddingLeft: 8 }}>
              {['All Ages', 'Under 18', '18-25', '26-35', '36-45', '45+'].map(age => (
                <TouchableOpacity key={age} style={[styles.subChip, activeAgeFilters.includes(age) && { backgroundColor: Colors.goldDim, borderColor: Colors.goldBorder }]}
                  onPress={() => activeAgeFilters.includes(age) ? setActiveAgeFilters(activeAgeFilters.filter(a => a !== age)) : setActiveAgeFilters([...activeAgeFilters, age])}>
                  <Text style={[styles.subChipText, activeAgeFilters.includes(age) && { color: Colors.gold }]}>{age}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Gender */}
        <View style={{ marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity style={[styles.filterChip, activeGenderFilters.length > 0 && { borderColor: Colors.goldBorder, backgroundColor: Colors.goldDim }]}
              onPress={() => { if (activeGenderFilters.length > 0) setActiveGenderFilters([]); else setExpandedGender(!expandedGender); }}>
              <Feather name="heart" size={17} color={activeGenderFilters.length > 0 ? Colors.gold : Colors.textMuted} />
              <Text style={[styles.filterChipText, activeGenderFilters.length > 0 && { color: Colors.gold }]}>
                Gender{activeGenderFilters.length > 0 ? `  ${activeGenderFilters.length}` : ''}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.expandBtn} onPress={() => setExpandedGender(!expandedGender)}>
              <Feather name={expandedGender ? 'chevron-up' : 'chevron-down'} size={17} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
          {expandedGender && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10, paddingLeft: 8 }}>
              {['Anyone', 'Male', 'Female', 'LGBTQIA+'].map(gender => (
                <TouchableOpacity key={gender} style={[styles.subChip, activeGenderFilters.includes(gender) && { backgroundColor: Colors.goldDim, borderColor: Colors.goldBorder }]}
                  onPress={() => activeGenderFilters.includes(gender) ? setActiveGenderFilters(activeGenderFilters.filter(a => a !== gender)) : setActiveGenderFilters([...activeGenderFilters, gender])}>
                  <Text style={[styles.subChipText, activeGenderFilters.includes(gender) && { color: Colors.gold }]}>{gender}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );

  // ── Tutorial ──────────────────────────────────────────────────────────────
  const renderTutorial = () => {
    const TutCard = ({ children, style }: any) => (
      <View style={[styles.tutCard, style]}>{children}</View>
    );
    const NextBtn = ({ onPress }: any) => (
      <TouchableOpacity style={[styles.btnPrimary, { alignSelf: 'flex-end', height: 44, paddingHorizontal: 20 }]} onPress={onPress}>
        <Text style={styles.btnPrimaryText}>Next</Text>
      </TouchableOpacity>
    );
    switch (tutStep) {
      case 0:
        return (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.78)', justifyContent: 'center', alignItems: 'center', zIndex: 9999, paddingHorizontal: 36 }]}>
            <Text style={[styles.sheetTitle, { fontSize: 32, textAlign: 'center', marginBottom: 14 }]}>Welcome to The Tribes</Text>
            <Text style={[styles.sheetSub, { textAlign: 'center', marginBottom: 36, fontSize: 16, lineHeight: 26 }]}>Discover local gatherings, build community, and find your people. Quick tour?</Text>
            <TouchableOpacity style={[styles.btnPrimaryFull, { width: 200 }]} onPress={() => setTutStep(1)}>
              <Text style={styles.btnPrimaryFullText}>Start Tour</Text>
            </TouchableOpacity>
          </View>
        );
      case 1:
        return (
          <View style={[StyleSheet.absoluteFill, { pointerEvents: 'box-none', zIndex: 9999 }]}>
            <TutCard style={{ position: 'absolute', top: 118, left: 20, maxWidth: 250 }}>
              <Feather name="arrow-up" size={24} color={Colors.gold} style={{ position: 'absolute', top: -22, left: 22 }} />
              <Text style={styles.tutTitle}>1. Your Leaves</Text>
              <Text style={styles.tutBody}>Leaves are your currency. Use them to join and create events. You get 5 free every day.</Text>
              <NextBtn onPress={() => setTutStep(2)} />
            </TutCard>
          </View>
        );
      case 2:
        return (
          <View style={[StyleSheet.absoluteFill, { pointerEvents: 'box-none', zIndex: 9999 }]}>
            <TutCard style={{ position: 'absolute', top: 110, right: 20, maxWidth: 250 }}>
              <Feather name="arrow-up" size={24} color={Colors.gold} style={{ position: 'absolute', top: -22, right: 18 }} />
              <Text style={styles.tutTitle}>2. Settings</Text>
              <Text style={styles.tutBody}>Update your profile, preferences, and home location from here.</Text>
              <NextBtn onPress={() => setTutStep(3)} />
            </TutCard>
          </View>
        );
      case 3:
        return (
          <View style={[StyleSheet.absoluteFill, { pointerEvents: 'box-none', zIndex: 9999 }]}>
            <TutCard style={{ position: 'absolute', top: 220, right: 20, maxWidth: 250 }}>
              <Feather name="arrow-up" size={24} color={Colors.gold} style={{ position: 'absolute', top: -22, right: 18 }} />
              <Text style={styles.tutTitle}>3. Navigate</Text>
              <Text style={styles.tutBody}>Centre the map on your home location, or search to fly anywhere in the world.</Text>
              <NextBtn onPress={() => setTutStep(4)} />
            </TutCard>
          </View>
        );
      case 4:
        return (
          <View style={[StyleSheet.absoluteFill, { pointerEvents: 'box-none', zIndex: 9999 }]}>
            <TutCard style={{ position: 'absolute', bottom: 120, right: 20, maxWidth: 250 }}>
              <Feather name="arrow-down" size={24} color={Colors.gold} style={{ position: 'absolute', bottom: -22, right: 26 }} />
              <Text style={styles.tutTitle}>4. Find Your Vibe</Text>
              <Text style={styles.tutBody}>Use the filter to discover events by category, age group, or gender.</Text>
              <NextBtn onPress={() => setTutStep(5)} />
            </TutCard>
          </View>
        );
      case 5:
        return (
          <View style={{ position: 'absolute', top: 200, left: 20, zIndex: 9999 }}>
            <TutCard style={{ maxWidth: 260 }}>
              <Feather name="arrow-up" size={24} color={Colors.gold} style={{ position: 'absolute', top: -22, left: 16 }} />
              <Text style={styles.tutTitle}>5. Create an Event</Text>
              <Text style={styles.tutBody}>Tap the gold + button to host your own gathering and assemble a tribe.</Text>
              <NextBtn onPress={() => setTutStep(6)} />
            </TutCard>
          </View>
        );
      case 6:
        return (
          <View style={{ position: 'absolute', top: 100, left: '50%', transform: [{ translateX: -150 }], zIndex: 9999 }}>
            <TutCard style={{ width: 300 }}>
              <Text style={styles.tutTitle}>6. Tribal Fires</Text>
              <Text style={styles.tutBody}>Active events appear as bonfire pins. Tap the test pin at the map centre to practice.</Text>
              <TouchableOpacity onPress={markTutorialSeen} style={{ alignSelf: 'center', paddingVertical: 6 }}>
                <Text style={{ fontFamily: Typography.bodyLight, color: Colors.textMuted, fontSize: 13 }}>Skip tutorial</Text>
              </TouchableOpacity>
            </TutCard>
            <Feather name="arrow-down" size={24} color={Colors.gold} style={{ alignSelf: 'center', marginTop: 4 }} />
          </View>
        );
      case 7:
        return (
          <View style={{ position: 'absolute', top: 120, left: '50%', transform: [{ translateX: -150 }], width: 300, zIndex: 9999 }} pointerEvents="none">
            <TutCard>
              <Text style={styles.tutTitle}>7. Join a Tribe</Text>
              <Text style={styles.tutBody}>This is a sealed Tribal Chat. Commit 1 Leaf to unlock the conversation and join the event.</Text>
            </TutCard>
            <Feather name="arrow-down" size={24} color={Colors.gold} style={{ alignSelf: 'center', marginTop: 4 }} />
          </View>
        );
      default: return null;
    }
  };

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <Mapbox.MapView
        style={styles.map}
        logoEnabled={false}
        attributionEnabled={false}
        onPress={handleMapPress}
        styleURL="mapbox://styles/tribes024/cmnr95i12000x01sc6y2845lo"
        onCameraChanged={(e: any) => { const z = e?.properties?.zoomLevel; if (z !== undefined) setCurrentZoom(z); }}
      >
        <Mapbox.Camera
          ref={cameraRef}
          zoomLevel={13}
          centerCoordinate={[user?.homeLocation?.longitude || 19.0238, user?.homeLocation?.latitude || 50.2649]}
        />

        {/* Event markers */}
        {clusteredMarkers.map((cluster) => {
          const maxIntensity = Math.max(...cluster.events.map(e => getBonfireIntensity(e.time)));
          const isSingle = cluster.events.length === 1;
          const iconSize = isSingle ? (28 + maxIntensity * 12) : (36 + maxIntensity * 10);
          const clusterKey = cluster.events.map(e => e.id).sort().join('-').substring(0, 64);
          return (
            <Mapbox.PointAnnotation key={clusterKey} id={clusterKey} coordinate={[cluster.lng, cluster.lat]}
              onSelected={() => {
                if (isSingle) {
                  const ev = cluster.events[0];
                  if (mode === 'map' || tutStep === 6) {
                    setSelectedEvent(ev as any); setMode('event_chat'); setSelectedCluster(null);
                    if (tutStep === 6 && ev.id === 'tutorial-dummy') setTutStep(7);
                  }
                } else {
                  setSelectedCluster(selectedCluster?.lat === cluster.lat ? null : cluster);
                }
              }}>
              <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                <Image source={require('../assets/bonfire.png')} style={{
                  width: iconSize, height: iconSize, resizeMode: 'contain',
                  shadowColor: `rgb(255, ${Math.round(160 - maxIntensity * 120)}, 0)`,
                  shadowOpacity: 0.3 + maxIntensity * 0.6,
                  shadowRadius: 4 + maxIntensity * 12,
                  shadowOffset: { width: 0, height: 0 },
                }} />
                {!isSingle && (
                  <View style={styles.clusterBadge}>
                    <Text style={styles.clusterBadgeText}>{cluster.events.length}</Text>
                  </View>
                )}
              </View>
            </Mapbox.PointAnnotation>
          );
        })}

        {/* Cluster popup */}
        {selectedCluster && (
          <Mapbox.PointAnnotation id="cluster-popup" coordinate={[selectedCluster.lng, selectedCluster.lat]}>
            <View style={styles.clusterPopup}>
              {selectedCluster.events.map((ev, i) => {
                const cat = EVENT_CATEGORIES.find(c => c.id === ev.categoryId);
                return (
                  <TouchableOpacity key={ev.id} onPress={() => { setSelectedEvent(ev as any); setMode('event_chat'); setSelectedCluster(null); }}
                    style={[styles.clusterPopupItem, i < selectedCluster.events.length - 1 && { borderBottomWidth: 1, borderBottomColor: Colors.hairlineNeutral }]}>
                    <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: cat?.color || Colors.gold, marginRight: 8 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.clusterPopupTitle} numberOfLines={1}>{ev.title}</Text>
                      <Text style={styles.clusterPopupTime}>{ev.time ? format(new Date(ev.time), 'MMM d, HH:mm') : ''}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Mapbox.PointAnnotation>
        )}

        {/* Draft location pin */}
        {mode === 'wizard_location' && draft.location && (
          <Mapbox.PointAnnotation id="draft_pin" coordinate={[draft.location.lng, draft.location.lat]}>
            <View style={styles.pinDraft} />
          </Mapbox.PointAnnotation>
        )}
      </Mapbox.MapView>

      {renderHUD()}
      {renderDevTools()}
      {mode === 'wizard_details' && renderWizardDetails()}
      {mode === 'wizard_location' && renderWizardLocation()}
      {mode === 'event_chat' && <EventChat selectedEvent={selectedEvent} setSelectedEvent={setSelectedEvent} setMode={setMode} user={user} events={events} joinEvent={joinEvent} deleteEvent={deleteEvent} finalizeEvent={finalizeEvent} finalizeChecked={finalizeChecked} setFinalizeChecked={setFinalizeChecked} submitFeedback={submitFeedback} feedbackAnswer={feedbackAnswer} setFeedbackAnswer={setFeedbackAnswer} feedbackSubmitted={feedbackSubmitted} setFeedbackSubmitted={setFeedbackSubmitted} getUserFeedback={getUserFeedback} userFeedbackCache={userFeedbackCache} setUserFeedbackCache={setUserFeedbackCache} creatorStatsCache={creatorStatsCache} setCreatorStatsCache={setCreatorStatsCache} participantNamesCache={participantNamesCache} setParticipantNamesCache={setParticipantNamesCache} tribes={tribes} setProfileViewUid={setProfileViewUid} setSelectedTribe={setSelectedTribe} handleJoin={handleJoin} setFormTribeChecked={setFormTribeChecked} formTribeChecked={formTribeChecked} setWizardDraft={setWizardDraft} setWizardStep={setWizardStep} />}
      {mode === 'filters' && renderFilters()}
      {mode === 'tribe_panel' && <TribePanel selectedTribe={selectedTribe} setSelectedTribe={setSelectedTribe} user={user} applyToTribe={applyToTribe} leaveTribe={leaveTribe} showManagement={showManagement} setShowManagement={setShowManagement} announcementText={announcementText} setAnnouncementText={setAnnouncementText} postAnnouncement={postAnnouncement} acceptApplicant={acceptApplicant} rejectApplicant={rejectApplicant} removeMember={removeMember} deleteTribe={deleteTribe} updateTribe={updateTribe} promoteMember={promoteMember} demoteMember={demoteMember} events={events} setMode={setMode} setSelectedEvent={setSelectedEvent} setDraft={setDraft} draft={draft} setProfileViewUid={setProfileViewUid} renderManagementOverlay={renderManagementOverlay} />}
      {mode === 'create_tribe_wizard' && <CreateTribeWizard wizardDraft={wizardDraft} setWizardDraft={setWizardDraft} wizardStep={wizardStep} setWizardStep={setWizardStep} createTribe={createTribe} setMode={setMode} user={user} formTribeChecked={formTribeChecked} setFormTribeChecked={setFormTribeChecked} />}
      {profileViewUid && <ProfileModal profileViewData={profileViewData} profileViewUid={profileViewUid} setProfileViewUid={setProfileViewUid} setProfileViewData={setProfileViewData} />}
      {renderMapSearch()}
      {renderTutorial()}
    </View>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  map: { flex: 1 },

  // ── HUD floating elements ─────────────────────────────────────────────────
  hudBtnTopRight: { position: 'absolute', top: 52, right: 18 },
  hudBlurBtn: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },

  topLeft: { position: 'absolute', top: 52, left: 18 },
  balancePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 9999,
    overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(217,160,111,0.28)',
  },
  balanceText: { fontFamily: Typography.bodyMedium, color: Colors.textPrimary, fontSize: 14 },
  balanceLeaf: { width: 15, height: 15, resizeMode: 'contain' },

  upcomingRow: { flexDirection: 'row', alignItems: 'center' },
  plusBtn: {
    width: 52, height: 52, backgroundColor: Colors.glassBtnBg, borderRadius: 26,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: Colors.gold, shadowOpacity: 0.55, shadowRadius: 10, shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  upcomingScroll: { marginLeft: 10, maxWidth: 200 },
  upcomingIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.glassBtnBg, justifyContent: 'center', alignItems: 'center',
    marginRight: 8,
    shadowColor: Colors.gold, shadowOpacity: 0.45, shadowRadius: 8, shadowOffset: { width: 0, height: 0 },
    elevation: 5,
  },
  upcomingInitial: { fontFamily: Typography.bodyMedium, color: Colors.textPrimary, fontSize: 14 },

  // Bottom bar
  bottomBar: {
    position: 'absolute', bottom: 50, left: 18, right: 18,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  dateSlider: {
    flex: 1, borderRadius: 9999, paddingVertical: 3, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)',
    flexDirection: 'row', alignItems: 'center',
  },
  sliderArrow: {
    position: 'absolute', left: 0, zIndex: 10,
    padding: 6,
  },
  datePill: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 9999 },
  datePillActive: { backgroundColor: Colors.gold },
  datePillText: { fontFamily: Typography.bodyMedium, color: 'rgba(255,255,255,0.45)', fontSize: 12 },
  datePillTextActive: { color: '#1A2421', fontFamily: Typography.bodyMedium, fontSize: 12 },
  filterPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 13,
    borderRadius: 9999, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)',
  },
  filterPillActive: { backgroundColor: Colors.gold, borderColor: 'rgba(255,220,175,0.3)' },
  filterPillCount: { fontFamily: Typography.bodyMedium, color: '#1A2421', fontSize: 12 },

  // ── Dev panel ────────────────────────────────────────────────────────────
  devPanel: {
    position: 'absolute', right: 8, top: '50%', transform: [{ translateY: -90 }],
    backgroundColor: 'rgba(35, 15, 15, 0.9)', padding: 10, borderRadius: 12, zIndex: 1000,
    borderWidth: 1, borderColor: 'rgba(255,80,80,0.2)',
  },
  devTitle: { fontFamily: Typography.bodyMedium, color: 'rgba(255,100,100,0.8)', fontSize: 9, marginBottom: 6, textAlign: 'center', letterSpacing: 1 },
  devBtn: { backgroundColor: 'rgba(255,255,255,0.07)', paddingHorizontal: 6, paddingVertical: 5, borderRadius: 7, marginBottom: 4 },
  devBtnText: { fontFamily: Typography.body, color: 'rgba(255,120,120,0.9)', fontSize: 9, textAlign: 'center' },

  // ── Dark sheet base ───────────────────────────────────────────────────────
  bottomSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: '74%',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    backgroundColor: Colors.bg, overflow: 'hidden',
  },
  bottomSheetFull: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: '65%',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    backgroundColor: Colors.bg, padding: 24, overflow: 'hidden',
  },
  sheetHandle: {
    width: 36, height: 3, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignSelf: 'center', marginTop: 10, marginBottom: 6,
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 58 : 40,
    paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.hairline,
    gap: 8,
  },
  sheetTitle: {
    fontFamily: Typography.headline, fontSize: 22, color: Colors.textPrimary,
  },
  sheetSub: {
    fontFamily: Typography.bodyLight, fontSize: 13, color: Colors.textSecondary,
    marginTop: 4, lineHeight: 20,
  },
  sheetActions: {
    flexDirection: 'row', gap: 10, padding: 16, paddingBottom: 30,
    borderTopWidth: 1, borderTopColor: Colors.hairline,
  },
  backIconBtn: {
    width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center',
  },

  // ── Tab bar ──────────────────────────────────────────────────────────────
  tabBar: {
    flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.hairline,
    backgroundColor: Colors.bg,
  },
  tab: {
    flex: 1, paddingVertical: 14, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: Colors.gold },
  tabText: { fontFamily: Typography.bodyMedium, fontSize: 13, color: Colors.textMuted },
  tabTextActive: { color: Colors.gold },

  // ── Buttons — Dark Copper Glassmorphism standard ──────────────────────────
  // All primary action buttons: 56px height, dark glass, copper border
  btnPrimary: {
    backgroundColor: Colors.glassBtnBg, borderRadius: 9999,
    height: 56, paddingHorizontal: 24,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1, borderColor: Colors.gold,
  },
  btnPrimaryText: { fontFamily: Typography.bodyMedium, color: Colors.textPrimary, fontSize: 15, letterSpacing: 0.2 },
  btnPrimaryFull: {
    backgroundColor: Colors.glassBtnBg, borderRadius: 9999,
    height: 56, width: '100%',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.gold,
    flexDirection: 'row', gap: 6,
  },
  btnPrimaryFullText: { fontFamily: Typography.bodyMedium, color: Colors.textPrimary, fontSize: 15, letterSpacing: 0.2 },
  btnSecondary: {
    borderRadius: 9999, height: 56, paddingHorizontal: 20,
    borderWidth: 1, borderColor: Colors.hairlineNeutral,
    alignItems: 'center', justifyContent: 'center',
  },
  btnSecondaryText: { fontFamily: Typography.bodyMedium, color: Colors.textSecondary, fontSize: 15 },
  btnDangerFull: {
    borderRadius: 9999, height: 56, width: '100%',
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6,
    borderWidth: 1, borderColor: Colors.dangerBorder,
    backgroundColor: Colors.dangerSoft,
  },
  btnDangerFullText: { fontFamily: Typography.bodyMedium, color: Colors.danger, fontSize: 15 },
  btnLeafInline: { width: 14, height: 14, resizeMode: 'contain' },
  btnLeafDark: { width: 16, height: 16, resizeMode: 'contain' },

  // ── Hairline ──────────────────────────────────────────────────────────────
  hairline: { height: 1, backgroundColor: Colors.hairline, marginVertical: 8 },

  // ── Field label ───────────────────────────────────────────────────────────
  fieldLabel: {
    fontFamily: Typography.bodyLight, fontSize: 11,
    color: 'rgba(217,160,111,0.6)', letterSpacing: 1.6,
    textTransform: 'uppercase', marginBottom: 10, marginTop: 4,
  },

  // ── Inputs ────────────────────────────────────────────────────────────────
  input: {
    fontFamily: Typography.body, fontSize: 15, color: Colors.textPrimary,
    backgroundColor: Colors.bgInput, borderWidth: 1, borderColor: Colors.borderInput,
    borderRadius: 14, paddingHorizontal: 18, paddingVertical: 15, marginBottom: 16,
  },
  suggestions: {
    backgroundColor: Colors.bgElevated, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.hairline,
    maxHeight: 150, overflow: 'hidden', marginTop: -10, marginBottom: 16,
  },
  suggestionItem: { paddingHorizontal: 18, paddingVertical: 13 },
  suggestionText: { fontFamily: Typography.body, fontSize: 13, color: Colors.textSecondary },

  // ── Category chips (wizard + create tribe) ────────────────────────────────
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9999,
    borderWidth: 1, borderColor: Colors.hairlineNeutral,
    backgroundColor: Colors.bgInput,
  },
  catChipText: { fontFamily: Typography.bodyMedium, fontSize: 13, color: Colors.textMuted },
  subChip: {
    paddingHorizontal: 13, paddingVertical: 7, borderRadius: 9999,
    borderWidth: 1, borderColor: Colors.hairlineNeutral,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  subChipText: { fontFamily: Typography.body, fontSize: 12, color: Colors.textSecondary },

  // ── Filter chips ──────────────────────────────────────────────────────────
  filterChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 13, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.hairlineNeutral,
    backgroundColor: Colors.bgInput, marginRight: 10,
  },
  filterChipText: { fontFamily: Typography.bodyMedium, fontSize: 13, color: Colors.textMuted },
  expandBtn: {
    width: 44, height: 44, justifyContent: 'center', alignItems: 'center',
    backgroundColor: Colors.bgInput, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.hairlineNeutral,
  },

  // ── Event chat ────────────────────────────────────────────────────────────
  chatHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: Colors.hairline, marginBottom: 10,
  },
  chatTitle: { fontFamily: Typography.headline, fontSize: 20, color: Colors.textPrimary, lineHeight: 26 },
  chatSub: { fontFamily: Typography.bodyLight, fontSize: 12, color: Colors.gold, marginTop: 3 },
  chatLocRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: Colors.hairline, marginBottom: 14 },
  chatLoc: { fontFamily: Typography.bodyLight, fontSize: 13, color: Colors.textSecondary, flex: 1 },
  chatLocked: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  lockIconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.goldDim, borderWidth: 1, borderColor: Colors.goldBorder,
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  chatLockedTitle: { fontFamily: Typography.headline, fontSize: 22, color: Colors.textPrimary, marginBottom: 10, textAlign: 'center' },
  chatLockedSub: { fontFamily: Typography.body, fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  chatOpen: { flex: 1 },
  chatScroll: { flex: 1 },
  chatBubble: {
    backgroundColor: 'rgba(255,255,255,0.06)', padding: 16, borderRadius: 16,
    alignSelf: 'flex-start', borderBottomLeftRadius: 4, maxWidth: '85%',
  },
  chatBubbleText: { fontFamily: Typography.body, color: Colors.textPrimary, fontSize: 14, lineHeight: 20 },
  chatInputRow: {
    flexDirection: 'row', gap: 10, paddingTop: 14, alignItems: 'center',
    borderTopWidth: 1, borderTopColor: Colors.hairline,
  },
  chatInput: {
    flex: 1, fontFamily: Typography.body, fontSize: 14, color: Colors.textPrimary,
    backgroundColor: Colors.bgInput, borderRadius: 9999, paddingHorizontal: 18, paddingVertical: 12,
    borderWidth: 1, borderColor: Colors.hairlineNeutral,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.gold,
    justifyContent: 'center', alignItems: 'center',
  },

  // ── Tribe panel components ────────────────────────────────────────────────
  treeContainer: {
    backgroundColor: Colors.glassCardBg, borderRadius: 20, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.glassCardBorder, marginBottom: 20,
  },
  treeInfo: { padding: 16, alignItems: 'center', borderTopWidth: 1, borderTopColor: Colors.hairline },
  tribeMemberCount: { fontFamily: Typography.headline, fontSize: 17, color: Colors.gold, marginBottom: 6 },
  tribeDescription: { fontFamily: Typography.bodyLight, color: Colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 21 },
  sectionTitle: { fontFamily: Typography.headline, fontSize: 15, color: Colors.textPrimary, marginBottom: 2, letterSpacing: 0.2 },
  emptyText: { fontFamily: Typography.bodyLight, color: Colors.textMuted, fontSize: 14, marginTop: 8 },
  announcementItem: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.hairlineNeutral },
  announcementText: { fontFamily: Typography.body, color: Colors.textPrimary, fontSize: 14, lineHeight: 22 },
  announcementMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  announcementAuthor: { fontFamily: Typography.bodyMedium, fontSize: 12, color: Colors.gold },
  announcementTime: { fontFamily: Typography.bodyLight, fontSize: 12, color: Colors.textMuted },
  createEventCard: { backgroundColor: Colors.glassCardBg, borderRadius: 18, padding: 20, borderWidth: 1, borderColor: Colors.glassCardBorder, marginBottom: 28 },
  createEventSub: { fontFamily: Typography.bodyLight, color: Colors.textSecondary, fontSize: 14, marginTop: 6, lineHeight: 20 },
  tribeEventItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.hairlineNeutral,
  },
  tribeEventTitle: { fontFamily: Typography.bodyMedium, fontSize: 15, color: Colors.textPrimary },
  tribeEventTime: { fontFamily: Typography.bodyLight, fontSize: 13, color: Colors.textSecondary, marginTop: 3 },
  cycleBadge: { backgroundColor: Colors.goldDim, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: Colors.goldBorder },
  cycleBadgeText: { fontFamily: Typography.bodyMedium, fontSize: 10, color: Colors.gold, letterSpacing: 0.5 },
  badgeGold: { backgroundColor: Colors.goldDim, borderRadius: 9999, width: 22, height: 22, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.goldBorder },
  badgeGoldText: { fontFamily: Typography.bodyMedium, fontSize: 11, color: Colors.gold },
  applicantRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.hairlineNeutral,
  },
  applicantName: { fontFamily: Typography.bodyMedium, color: Colors.textPrimary, fontSize: 14 },
  rejectBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: Colors.dangerBorder, justifyContent: 'center', alignItems: 'center' },
  acceptBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: Colors.goldBorder, justifyContent: 'center', alignItems: 'center' },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  memberAvatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  memberName: { fontFamily: Typography.bodyMedium, color: Colors.textPrimary, fontSize: 14 },
  memberRole: { fontFamily: Typography.bodyLight, fontSize: 11, marginTop: 2, letterSpacing: 0.3 },
  memberActionBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  tribeListItem: {
    flexDirection: 'row', alignItems: 'center', padding: 18,
    marginBottom: 12, borderRadius: 18,
    backgroundColor: Colors.glassCardBg,
    borderWidth: 1, borderColor: Colors.glassCardBorder,
  },
  tribeListName: { fontFamily: Typography.headline, fontSize: 17, color: Colors.textPrimary, marginBottom: 5 },
  tribeListDesc: { fontFamily: Typography.bodyLight, fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
  tribeListMeta: { fontFamily: Typography.bodyLight, fontSize: 12, color: Colors.gold, marginTop: 6, letterSpacing: 0.3 },
  joinedBadge: { backgroundColor: Colors.goldDim, borderRadius: 9999, paddingHorizontal: 9, paddingVertical: 3, borderWidth: 1, borderColor: Colors.goldBorder },
  joinedBadgeText: { fontFamily: Typography.bodyMedium, fontSize: 10, color: Colors.gold, letterSpacing: 0.4 },

  // ── Tutorial ──────────────────────────────────────────────────────────────
  tutCard: {
    backgroundColor: '#1A2421', padding: 20, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.hairline,
    shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 20, elevation: 15,
  },
  tutTitle: { fontFamily: Typography.bodyMedium, fontSize: 15, color: Colors.textPrimary, marginBottom: 8 },
  tutBody: { fontFamily: Typography.body, fontSize: 13, color: Colors.textSecondary, lineHeight: 20, marginBottom: 14 },

  // ── Map markers ───────────────────────────────────────────────────────────
  clusterBadge: {
    position: 'absolute', top: -5, right: -8, backgroundColor: Colors.gold,
    borderRadius: 10, minWidth: 20, height: 20,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#fff', paddingHorizontal: 3,
  },
  clusterBadgeText: { color: '#1A2421', fontSize: 11, fontFamily: Typography.bodyMedium },
  clusterPopup: {
    marginTop: 32, backgroundColor: '#1A2421', borderRadius: 14, padding: 8,
    minWidth: 200, maxWidth: 260,
    borderWidth: 1, borderColor: Colors.hairline,
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 20, elevation: 10,
  },
  clusterPopupItem: { flexDirection: 'row', alignItems: 'center', padding: 8 },
  clusterPopupTitle: { fontFamily: Typography.bodyMedium, fontSize: 13, color: Colors.textPrimary },
  clusterPopupTime: { fontFamily: Typography.bodyLight, fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  pinDraft: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.gold, borderWidth: 3, borderColor: 'rgba(255,255,255,0.85)',
    elevation: 10,
  },
});
