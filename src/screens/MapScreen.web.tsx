import React, { useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView, TextInput, Alert, Image, Platform } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { RootStackParamList } from '../navigation/AppNavigator';

import { useAuth } from '../hooks/useAuth';
import { useEvents, TribeVent } from '../hooks/useEvents';
import { useTribes } from '../hooks/useTribes';
import { Tribe } from '../types';
import { auth, db } from '../config/firebase';
import { signOut } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { Colors, Typography } from '../theme';
import { format, isToday, isTomorrow, isWeekend, addDays, startOfWeek, endOfWeek, addWeeks } from 'date-fns';
import { Feather } from '@expo/vector-icons';
import { EVENT_CATEGORIES, CategoryGroupId } from '../data/categories';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Map, { Marker, Layer, Source, MapMouseEvent } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import Svg, { Path, Circle, Text as SvgText, G } from 'react-native-svg';

export default function MapScreen() {
  const { user } = useAuth();
  const { events, joinEvent, createEvent, deleteEvent } = useEvents();
  const { tribes, createTribe, applyToTribe, acceptApplicant, rejectApplicant, postAnnouncement, leaveTribe } = useTribes();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  
  const [mode, setMode] = useState<'map' | 'wizard_details' | 'wizard_location' | 'event_chat' | 'filters' | 'search_map' | 'tribe_panel'>('map');
  const [draft, setDraft] = useState({ title: '', categoryId: '' as CategoryGroupId | '', categorySub: [] as string[], isPrivate: false, limit: '10', location: null as any, address: '', date: null as Date | null, ageGroup: 'All Ages', gender: 'Anyone' });
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [activeAgeFilters, setActiveAgeFilters] = useState<string[]>([]);
  const [expandedAge, setExpandedAge] = useState(false);
  const [activeGenderFilters, setActiveGenderFilters] = useState<string[]>([]);
  const [expandedGender, setExpandedGender] = useState(false);

  const toggleCategory = (catId: string) => {
    const newFilters = {...activeFilters};
    if (newFilters[catId]) delete newFilters[catId];
    else newFilters[catId] = [];
    setActiveFilters(newFilters);
  };

  const toggleSubFilter = (catId: string, sub: string) => {
    const newFilters = {...activeFilters};
    if (!newFilters[catId] || newFilters[catId].length === 0) newFilters[catId] = [sub];
    else {
      if (newFilters[catId].includes(sub)) {
        newFilters[catId] = newFilters[catId].filter(s => s !== sub);
        if (newFilters[catId].length === 0) delete newFilters[catId];
      } else newFilters[catId].push(sub);
    }
    setActiveFilters(newFilters);
  };
  const [selectedEvent, setSelectedEvent] = useState<TribeVent | null>(null);
  const [dateFilter, setDateFilter] = useState('30 Days');
  const [tutStep, setTutStep] = useState(-1);
  const [selectedCluster, setSelectedCluster] = useState<{lat: number, lng: number, events: TribeVent[]} | null>(null);

  // Tribes UI State
  const [tribeTab, setTribeTab] = useState<'my_tribes' | 'create_tribe'>('my_tribes');
  const [selectedTribe, setSelectedTribe] = useState<Tribe | null>(null);
  const [tribeDraft, setTribeDraft] = useState({ name: '', description: '', categoryId: '' });
  const [announcementText, setAnnouncementText] = useState('');

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const scrollRef = React.useRef<ScrollView>(null);
  const mapRef = React.useRef<any>(null);
  const [scrollX, setScrollX] = useState(0);
  const [currentZoom, setCurrentZoom] = useState(12.5);

  const [wizardQuery, setWizardQuery] = useState('');
  const [wizardSuggestions, setWizardSuggestions] = useState<any[]>([]);

  const searchWizardLocation = async (text: string) => {
    setWizardQuery(text);
    if(text.length < 3) return setWizardSuggestions([]);
    try {
      const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(text)}.json?access_token=${process.env.EXPO_PUBLIC_MAPBOX_KEY}&autocomplete=true&types=place,address`);
      const data = await res.json();
      setWizardSuggestions(data.features || []);
    } catch(e) {}
  };

  const dummyEvent: any = {
    id: 'tutorial-dummy',
    title: 'Sunset Hike 🌄',
    interest: 'Hiking',
    categoryId: 'outdoor',
    categorySub: ['Hiking'],
    ageGroup: 'All Ages',
    gender: 'Anyone',
    description: 'A simulation event to learn how joining works. Your Leaves will be instantly refunded since this is a test!',
    location: { 
      latitude: Number(user?.homeLocation?.latitude || 50.2649), 
      longitude: Number(user?.homeLocation?.longitude || 19.0238)
    },
    creatorId: 'system',
    creatorName: 'The Tribes',
    time: Date.now(),
    participants: [],
    maxParticipants: 10
  };

  let displayFilterEvents = events;
  if (activeAgeFilters.length > 0) {
    displayFilterEvents = displayFilterEvents.filter(e => e.ageGroup && activeAgeFilters.includes(e.ageGroup));
  }
  if (activeGenderFilters.length > 0) {
    displayFilterEvents = displayFilterEvents.filter(e => e.gender && activeGenderFilters.includes(e.gender));
  }
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
  
  const todayStart = new Date();
  todayStart.setHours(0,0,0,0);

  if (dateFilter !== 'All') {
    displayFilterEvents = displayFilterEvents.filter(e => {
      if (!e.time) return false;
      const t = new Date(e.time);
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
  }
  let displayEvents = displayFilterEvents;
  if (tutStep >= 6 && tutStep <= 7) displayEvents = [...displayEvents, dummyEvent];
  const joinedEvents = events.filter(e => e.participants?.includes(user?.uid || ''));

  // --- CLUSTERING (zoom-aware) ---
  const clusteredMarkers = React.useMemo(() => {
    const RADIUS = 0.004 * Math.pow(2, 13 - currentZoom); // scales with zoom
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
    // User exists but hasn't seen tutorial => show welcome
    setTutStep(0);
  }, [user?.uid, user?.hasSeenTutorial]);

  const markTutorialSeen = async () => {
    if (!user) return;
    setTutStep(-1);
    try {
      await updateDoc(doc(db, 'users', user.uid), { hasSeenTutorial: true });
    } catch (e) { console.error('TUTORIAL MARK ERROR:', e); }
  };

  const handleMapClick = (e: MapMouseEvent) => {
    if (mode === 'wizard_location') {
      setDraft({ ...draft, location: { lat: e.lngLat.lat, lng: e.lngLat.lng } });
    }
  };

  const handleCreate = async () => {
    try {
      if (!draft.title || !draft.categoryId || (draft.categoryId !== 'time_limited' && draft.categorySub.length === 0) || !draft.location || !draft.date) return window.alert("Incomplete\n\nMake sure title, category, subcategory, date and location are set.");
      await createEvent(draft.title, draft.categoryId, draft.categorySub, parseInt(draft.limit) || 10, draft.isPrivate, 5, {
        latitude: draft.location.lat,
        longitude: draft.location.lng,
        address: draft.address || "Pinned carefully on Map"
      }, draft.date, draft.ageGroup);
      setMode('map');
      setDraft({ title: '', categoryId: '', categorySub: [], isPrivate: false, limit: '10', location: null, address: '', date: null, ageGroup: 'All Ages', gender: 'Anyone' });
      Alert.alert("Tribe Assembled", "Your event is live. 5 Leaves were locked.");
    } catch(err: any) { Alert.alert("Error", err.message); }
  };

  const handleJoin = async () => {
    if (!selectedEvent || !user) return;
    if (selectedEvent.id === 'tutorial-dummy') {
      if (Platform.OS === 'web') {
        window.alert('Congratulations! 🌟\n\nYou successfully joined your first event! Since this is a test simulation, your 1 Leaf 🍃 has been instantly refunded. Welcome to The Tribes!');
        setSelectedEvent(null);
        setMode('map');
        setTutStep(-1);
        markTutorialSeen();
      } else {
        Alert.alert(
          'Congratulations! 🌟', 
          'You successfully joined your first event! Since this is a test simulation, your 1 Leaf 🍃 has been instantly refunded. Welcome to The Tribes!',
          [{ text: 'Awesome!', onPress: () => {
            setSelectedEvent(null);
            setMode('map');
            setTutStep(-1);
          }}]
        );
      }
      return;
    }
    if (user.tokens < 1) {
      Alert.alert('Out of Leaves! 🍂', 'You need at least 1 leaf to join. Wait for refunds from past events.');
      return;
    }
    try {
      await joinEvent(selectedEvent.id);
      Alert.alert("Joined", "You've secured your spot. Chat is now unlocked!");
    } catch(e:any) { Alert.alert("Error", e.message); }
  }

  // --- COMPONENT RENDERS ---

  const renderDevTools = () => {
    if (!user?.isDev) return null;
    return (
      <View style={styles.devPanel}>
        <Text style={styles.devTitle}>DEV TOOLS</Text>
        <TouchableOpacity style={styles.devBtn} onPress={() => setTutStep(1)}>
           <Text style={styles.devBtnText}>[TUT]</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.devBtn} onPress={async () => {
          const { doc, updateDoc, increment } = await import('firebase/firestore');
          await updateDoc(doc(db, 'users', user.uid), { tokens: increment(100) });
        }}>
           <Text style={styles.devBtnText}>[+100 🍃]</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.devBtn} onPress={async () => {
          const { collection, query, where, getDocs, deleteDoc } = await import('firebase/firestore');
          const q = query(collection(db, 'events'), where('creatorId', '==', user.uid));
          const snaps = await getDocs(q);
          snaps.forEach(s => deleteDoc(s.ref));
        }}>
           <Text style={styles.devBtnText}>[CLR]</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.devBtn} onPress={() => {
           setDraft({...draft, title: "Dev Dummy Event", categoryId: 'outdoor', categorySub: ["Hiking"], location: {lat: 50.2649, lng: 19.0238}, date: new Date()});
           setMode('wizard_location');
        }}>
           <Text style={styles.devBtnText}>[PIN]</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderTreeSVG = (tribe: Tribe) => {
    const memberCount = tribe.members.length;
    return (
      <View style={{ height: 200, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 10 }}>
        <Svg width="300" height="200" viewBox="0 0 300 200">
          {/* Main Trunk */}
          <Path d="M150 200 Q150 150 150 80" stroke="#8B6914" strokeWidth={6 + Math.min(memberCount, 10)} fill="none" />
          
          {/* Branches and Leaves dynamically based on members */}
          {tribe.members.map((uid, index) => {
            if (index === 0) return null; // Creator is the trunk base
            const isLeft = index % 2 !== 0; // Alternate left/right
            const level = Math.floor((index - 1) / 2); // 0, 0, 1, 1, 2, 2
            const startY = 160 - level * 30; // Sprout higher up
            const endX = isLeft ? 150 - 40 - level * 10 : 150 + 40 + level * 10;
            const endY = startY - 30 - (index % 3) * 10; // Randomize height slightly
            const cpX = isLeft ? 150 - 20 : 150 + 20; // Control point
            const name = tribe.memberNames[uid] || 'User';

            return (
              <G key={uid}>
                {/* Branch */}
                <Path d={`M150 ${startY} Q ${cpX} ${startY - 10} ${endX} ${endY}`} stroke="#6B4E0A" strokeWidth={3} fill="none" />
                {/* Leaf Background */}
                <Circle cx={endX} cy={endY} r={12} fill={Colors.primary} />
                <Circle cx={endX} cy={endY} r={10} fill="#8cb369" />
                {/* Username label */}
                <SvgText x={endX} y={endY + 22} fontSize="10" fill="#333" textAnchor="middle" fontWeight="bold">
                  {name.substring(0, 8)}
                </SvgText>
              </G>
            );
          })}
          {/* Top Canopy (Chief) */}
          <Circle cx="150" cy="75" r="18" fill={Colors.primary} />
          <SvgText x="150" y="50" fontSize="12" fill="#555" textAnchor="middle" fontWeight="bold">
            👑 {tribe.creatorName}
          </SvgText>
        </Svg>
      </View>
    );
  };

  const renderTribePanel = () => {
    if (selectedTribe) {
      const isChief = selectedTribe.creatorId === user?.uid;
      const isMember = selectedTribe.members.includes(user?.uid || '');
      const hasApplied = selectedTribe.pendingApplicants.includes(user?.uid || '');

      return (
        <View style={StyleSheet.absoluteFill}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => { setSelectedTribe(null); setMode('map'); }} />
          <BlurView intensity={90} tint="light" style={styles.glassWrapperBottomFull}>
            <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 15}}>
              <TouchableOpacity onPress={() => setSelectedTribe(null)} style={{marginRight: 15}}><Feather name="arrow-left" size={24} color={Colors.text} /></TouchableOpacity>
              <Text style={[styles.panelTitle, {marginBottom: 0}]}>{selectedTribe.name}</Text>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20 }}>
              {/* Tree VISUALIZATION */}
              <View style={{ backgroundColor: '#f0f5ee', borderRadius: 20, marginBottom: 20, overflow: 'hidden' }}>
                {renderTreeSVG(selectedTribe)}
                <View style={{ padding: 12, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.7)' }}>
                  <Text style={{ fontFamily: Typography.bodySemibold, color: Colors.primaryDark }}>{selectedTribe.members.length} Tribesmen</Text>
                  <Text style={{ fontFamily: Typography.body, color: '#666', fontSize: 13, textAlign: 'center', marginTop: 4 }}>{selectedTribe.description}</Text>
                </View>
              </View>

              {/* Announcements Feed */}
              <Text style={{ fontFamily: Typography.heading, fontSize: 18, marginBottom: 12 }}>Announcements</Text>
              {selectedTribe.announcements.length === 0 ? (
                <Text style={{ color: '#999', fontStyle: 'italic', marginBottom: 20 }}>No signs of smoke yet.</Text>
              ) : (
                <View style={{ marginBottom: 20 }}>
                  {selectedTribe.announcements.slice().reverse().map((ann, i) => (
                    <View key={i} style={{ backgroundColor: '#fff', padding: 12, borderRadius: 12, marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 }}>
                      <Text style={{ fontFamily: Typography.body, color: Colors.text }}>{ann.text}</Text>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                        <Text style={{ fontSize: 11, color: '#888', fontWeight: 'bold' }}>{ann.authorName}</Text>
                        <Text style={{ fontSize: 11, color: '#bbb' }}>{format(ann.createdAt, 'MMM d, HH:mm')}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Actions */}
              {!isMember && !hasApplied && (
                <TouchableOpacity style={[styles.btnPrimaryFull, {marginTop: 0}]} onPress={async () => {
                  await applyToTribe(selectedTribe.id);
                  Alert.alert("Applied", "Your smoke signal was sent to the chief!");
                  setSelectedTribe(null);
                }}>
                  <Text style={styles.btnPrimaryText}>Apply to Tribe</Text>
                </TouchableOpacity>
              )}
              {!isMember && hasApplied && (
                <View style={[styles.btnPrimaryFull, { backgroundColor: '#ccc', marginTop: 0 }]}>
                  <Text style={styles.btnPrimaryText}>Application Pending...</Text>
                </View>
              )}
              {isMember && !isChief && (
                <TouchableOpacity style={[styles.btnPrimaryFull, { backgroundColor: '#ff4d4f', marginTop: 0 }]} onPress={async () => {
                  Alert.alert("Leave Tribe", "Are you sure?", [
                    {text: "Cancel", style: 'cancel'},
                    {text: "Leave", style: 'destructive', onPress: async () => { await leaveTribe(selectedTribe.id); setSelectedTribe(null); setMode('map'); }}
                  ]);
                }}>
                  <Text style={styles.btnPrimaryText}>Leave Tribe</Text>
                </TouchableOpacity>
              )}

              {/* Chief Dashboard */}
              {isChief && (
                <View style={{ marginTop: 10, padding: 16, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' }}>
                  <Text style={{ fontFamily: Typography.heading, fontSize: 16, marginBottom: 12 }}>👑 Chief Dashboard</Text>
                  
                  {selectedTribe.pendingApplicants.length > 0 && (
                    <View style={{ marginBottom: 16 }}>
                      <Text style={{ fontWeight: 'bold', marginBottom: 8, color: '#e67e22' }}>{selectedTribe.pendingApplicants.length} Pending Applications</Text>
                      {selectedTribe.pendingApplicants.map(appUid => (
                        <View key={appUid} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f9f9f9', padding: 8, borderRadius: 8, marginBottom: 4 }}>
                          <Text style={{ fontSize: 13 }}>UID: {appUid.substring(0,5)}...</Text>
                          <View style={{ flexDirection: 'row', gap: 6 }}>
                            <TouchableOpacity onPress={() => rejectApplicant(selectedTribe.id, appUid)} style={{ backgroundColor: '#ff4d4f', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 }}>
                              <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>Reject</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => acceptApplicant(selectedTribe.id, appUid)} style={{ backgroundColor: Colors.primary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 }}>
                              <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>Accept</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
                    <TextInput 
                      style={{ flex: 1, backgroundColor: '#f5f5f5', borderRadius: 8, padding: 10, fontSize: 14 }} 
                      placeholder="Post a smoke signal..." 
                      value={announcementText} onChangeText={setAnnouncementText}
                    />
                    <TouchableOpacity onPress={async () => {
                      if (!announcementText.trim()) return;
                      await postAnnouncement(selectedTribe.id, announcementText);
                      setAnnouncementText('');
                    }} style={{ backgroundColor: Colors.primary, padding: 10, borderRadius: 8 }}>
                      <Feather name="send" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>
          </BlurView>
        </View>
      );
    }

    // List & Create Tabs
    return (
      <View style={StyleSheet.absoluteFill}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setMode('map')} />
        <BlurView intensity={90} tint="light" style={styles.glassWrapperBottomFull}>
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.1)' }}>
            <TouchableOpacity style={{ flex: 1, padding: 15, alignItems: 'center', borderBottomWidth: tribeTab === 'my_tribes' ? 2 : 0, borderBottomColor: Colors.primary }} onPress={() => setTribeTab('my_tribes')}>
              <Text style={{ fontFamily: Typography.heading, color: tribeTab === 'my_tribes' ? Colors.primary : '#888' }}>Find Tribes</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ flex: 1, padding: 15, alignItems: 'center', borderBottomWidth: tribeTab === 'create_tribe' ? 2 : 0, borderBottomColor: Colors.primary }} onPress={() => setTribeTab('create_tribe')}>
              <Text style={{ fontFamily: Typography.heading, color: tribeTab === 'create_tribe' ? Colors.primary : '#888' }}>Create</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20 }}>
            {tribeTab === 'my_tribes' ? (
              <View>
                {tribes.length === 0 ? (
                  <Text style={{ color: '#999', textAlign: 'center', marginTop: 40, fontFamily: Typography.body }}>No tribes exist yet. Be the first chief!</Text>
                ) : (
                  tribes.map(t => (
                    <TouchableOpacity key={t.id} onPress={() => setSelectedTribe(t)} style={{ 
                      backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8,
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'
                    }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: Typography.bodySemibold, fontSize: 16, color: Colors.text }}>{t.name}</Text>
                        <Text style={{ fontFamily: Typography.body, fontSize: 13, color: '#666', marginTop: 4 }} numberOfLines={2}>{t.description}</Text>
                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                          <Text style={{ fontSize: 12, color: Colors.primaryDark, fontWeight: 'bold' }}>{t.members.length} members</Text>
                          {t.members.includes(user?.uid || '') && <Text style={{ fontSize: 12, color: '#e67e22', fontWeight: 'bold' }}>Joined</Text>}
                        </View>
                      </View>
                      <Feather name="chevron-right" size={20} color="#ccc" />
                    </TouchableOpacity>
                  ))
                )}
              </View>
            ) : (
              <View style={{padding: 20}}>
                <Text style={styles.wizardCatText}>Tribe Name</Text>
                <TextInput style={styles.input} placeholder="e.g. Weekend Warriors" value={tribeDraft.name} onChangeText={t => setTribeDraft({...tribeDraft, name: t})} />
                
                <Text style={styles.wizardCatText}>Description</Text>
                <TextInput style={[styles.input, { height: 80 }]} multiline placeholder="What is this tribe about?" value={tribeDraft.description} onChangeText={t => setTribeDraft({...tribeDraft, description: t})} />
                
                <Text style={styles.wizardCatText}>Main Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20, marginTop: 10 }}>
                  {EVENT_CATEGORIES.map(cat => (
                    <TouchableOpacity key={cat.id} onPress={() => setTribeDraft({...tribeDraft, categoryId: cat.id})} style={{
                      paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, marginRight: 8,
                      backgroundColor: tribeDraft.categoryId === cat.id ? cat.color : '#f0f0f0'
                    }}>
                      <Text style={{ color: tribeDraft.categoryId === cat.id ? '#fff' : '#666', fontWeight: 'bold' }}>{cat.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <TouchableOpacity style={[styles.btnPrimaryFull, { opacity: tribeDraft.name && tribeDraft.categoryId ? 1 : 0.5 }]} 
                  disabled={!tribeDraft.name || !tribeDraft.categoryId}
                  onPress={async () => {
                    await createTribe(tribeDraft.name, tribeDraft.description, tribeDraft.categoryId);
                    Alert.alert("Success", "Tribe created!");
                    setTribeTab('my_tribes');
                    setTribeDraft({name: '', description: '', categoryId: ''});
                  }}
                >
                  <Text style={styles.btnPrimaryText}>Plant the Seed (Create)</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </BlurView>
      </View>
    );
  };

  const renderHUD = () => {
    if (mode !== 'map') return null;
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <TouchableOpacity style={styles.settingsBtn} onPress={() => navigation.navigate('Settings')}>
          <BlurView intensity={65} tint="light" style={styles.iconWrapper}>
            <Text style={{fontSize: 16}}>⚙️</Text>
          </BlurView>
        </TouchableOpacity>

        <TouchableOpacity style={styles.locateBtn} onPress={() => {
          if (user?.homeLocation && mapRef.current) {
             mapRef.current.flyTo({
               center: [user.homeLocation.longitude, user.homeLocation.latitude],
               zoom: 12.5,
               duration: 1000
             });
          }
        }}>
          <BlurView intensity={65} tint="light" style={styles.iconWrapper}>
            <Feather name="navigation" size={18} color={Colors.text} />
          </BlurView>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.locateBtn, {top: 170}]} onPress={() => {
          setMode('search_map');
        }}>
          <BlurView intensity={65} tint="light" style={[styles.iconWrapper]}>
            <Feather name="search" size={18} color={Colors.text} />
          </BlurView>
        </TouchableOpacity>

        <View style={styles.topLeft} pointerEvents="box-none">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <BlurView intensity={70} tint="light" style={styles.balancePill}>
              <Text style={styles.balanceText}>{user?.tokens} <Image source={require('../assets/leaf.png')} style={styles.inlineIcon} /></Text>
            </BlurView>
            <TouchableOpacity onPress={() => setMode('tribe_panel')} style={{
              backgroundColor: 'rgba(255,255,255,0.7)', padding: 8, borderRadius: 20,
              flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10
            }}>
              <Text style={{ fontSize: 16 }}>🌳</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.upcomingRow}>
            <TouchableOpacity style={styles.plusBtn} onPress={() => setMode('wizard_details')}>
              <Feather name="plus" size={28} color="#fff" />
            </TouchableOpacity>
            
            {joinedEvents.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.upcomingScroll}>
                {joinedEvents.map(e => (
                  <TouchableOpacity key={e.id} style={styles.upcomingIcon} onPress={() => { setSelectedEvent(e); setMode('event_chat'); }}>
                    <Text style={styles.upcomingInitial}>{e.title.charAt(0)}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>

        <View style={styles.bottomBar} pointerEvents="box-none">
          <BlurView intensity={60} tint="light" style={styles.dateSliderContainer}>
            {canScrollLeft && (
              <TouchableOpacity style={styles.scrollIndicatorLeft} onPress={() => scrollRef.current?.scrollTo({ x: Math.max(0, scrollX - 150), animated: true })}>
                <Feather name="chevron-left" size={16} color={Colors.primaryDark} />
              </TouchableOpacity>
            )}
            <ScrollView 
               ref={scrollRef}
               horizontal showsHorizontalScrollIndicator={false} 
               contentContainerStyle={{paddingHorizontal: 12}}
               onScroll={handleScroll}
               scrollEventThrottle={16}
            >
              {['30 Days', 'Today', 'Tomorrow', 'Weekend', 'Next Week', 'All'].map(d => (
                <TouchableOpacity key={d} onPress={() => setDateFilter(d)} style={[styles.datePill, dateFilter === d && styles.datePillActive]}>
                  <Text style={[styles.datePillText, dateFilter === d && styles.datePillTextActive]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {canScrollRight && (
              <TouchableOpacity style={styles.scrollIndicatorRight} onPress={() => scrollRef.current?.scrollTo({ x: scrollX + 150, animated: true })}>
                <Feather name="chevron-right" size={16} color={Colors.primaryDark} />
              </TouchableOpacity>
            )}
          </BlurView>

          <TouchableOpacity style={styles.filterBtn} onPress={() => setMode('filters')}>
            <BlurView intensity={70} tint="light" style={[styles.filterBtnWrapper, Object.keys(activeFilters).length + activeAgeFilters.length + activeGenderFilters.length > 0 && {backgroundColor: Colors.primary, borderColor: Colors.primary}]}>
              <Text style={[styles.filterBtnText, Object.keys(activeFilters).length + activeAgeFilters.length + activeGenderFilters.length > 0 && {color: '#fff'}]}>Filters {Object.keys(activeFilters).length + activeAgeFilters.length + activeGenderFilters.length > 0 ? `(${Object.keys(activeFilters).length + activeAgeFilters.length + activeGenderFilters.length})` : '☰'}</Text>
            </BlurView>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderMapSearch = () => {
    if (mode !== 'search_map') return null;
    return (
      <View style={{position: 'absolute', top: 50, left: 20, right: 20, zIndex: 1000}}>
        <BlurView intensity={90} tint="light" style={{padding: 15, borderRadius: 24, overflow: 'hidden'}}>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <TextInput 
              style={[styles.input, {flex: 1, marginBottom: 0, paddingVertical: 12, marginRight: 10}]} 
              placeholder="Search city, neighborhood..." 
              placeholderTextColor="#999" 
              autoFocus
              value={wizardQuery} 
              onChangeText={searchWizardLocation} 
            />
            <TouchableOpacity onPress={() => {setMode('map'); setWizardQuery(''); setWizardSuggestions([]);}} style={{padding: 8}}>
              <Feather name="x" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
          {wizardSuggestions.length > 0 && (
            <View style={{marginTop: 10}}>
              {wizardSuggestions.slice(0, 4).map((feat, i) => (
                <TouchableOpacity 
                  key={i} 
                  style={{paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)'}}
                  onPress={() => {
                     const [lng, lat] = feat.center;
                     if (mapRef.current) {
                       mapRef.current.flyTo({
                         center: [lng, lat],
                         zoom: 12.5,
                         duration: 1000
                       });
                     }
                     setMode('map');
                     setWizardQuery('');
                     setWizardSuggestions([]);
                  }}
                >
                  <Text style={{fontFamily: Typography.bodySemibold, fontSize: 14}}>{feat.place_name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </BlurView>
      </View>
    );
  };

  const renderWizardDetails = () => (
    <View style={styles.glassWrapperBottom}>
      <BlurView intensity={85} tint="light" style={styles.glassPanelBottom}>
        <Text style={styles.panelTitle}>Design your tribe's event</Text>
        <TextInput style={styles.input} placeholder="Title (e.g. Morning Run)" placeholderTextColor="#999" value={draft.title} onChangeText={(t) => setDraft({...draft, title: t})} />
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: draft.categoryId ? 10 : 20}}>
          {EVENT_CATEGORIES.map(cat => (
             <TouchableOpacity key={cat.id} style={[styles.wizardCat, draft.categoryId === cat.id && {backgroundColor: cat.color, borderColor: cat.color}]} onPress={() => setDraft({...draft, categoryId: cat.id as CategoryGroupId, categorySub: []})}>
               <Feather name={cat.icon} size={14} color={draft.categoryId === cat.id ? '#fff' : Colors.text} />
               <Text style={[styles.wizardCatText, draft.categoryId === cat.id && {color: '#fff'}]}>{cat.label}</Text>
             </TouchableOpacity>
          ))}
        </ScrollView>
        {draft.categoryId && EVENT_CATEGORIES.find(c => c.id === draft.categoryId)?.subgroups.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 20}}>
             {EVENT_CATEGORIES.find(c => c.id === draft.categoryId)?.subgroups.map(sub => {
                const catColor = EVENT_CATEGORIES.find(ce => ce.id === draft.categoryId)?.color || Colors.primary;
                const isActive = draft.categorySub.includes(sub);
                return (
                  <TouchableOpacity 
                    key={sub} 
                    style={[styles.wizardSubCat, isActive && {backgroundColor: catColor}]} 
                    onPress={() => {
                        const subs = draft.categorySub;
                        if (subs.includes(sub)) {
                            setDraft({...draft, categorySub: subs.filter(s => s !== sub)});
                        } else {
                            if (subs.length < 5) {
                                setDraft({...draft, categorySub: [...subs, sub]});
                            } else {
                                if (Platform.OS === 'web') window.alert('You can select up to 5 subcategories.');
                                else Alert.alert('Limit Reached', 'You can select up to 5 subcategories.');
                            }
                        }
                    }}
                  >
                    <Text style={[styles.wizardSubCatText, isActive && {color: '#fff'}]}>{sub}</Text>
                  </TouchableOpacity>
                );
             })}
          </ScrollView>
        ) : null}

        <Text style={{fontFamily: Typography.bodySemibold, color: Colors.text, marginBottom: 5, marginTop: draft.categoryId ? 0 : 20, alignSelf: 'flex-start', marginLeft: '4%'}}>Target Age Group (Optional)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 20}}>
           {['All Ages', 'Under 18', '18-25', '26-35', '36-45', '45+'].map(age => (
              <TouchableOpacity key={age} style={[styles.wizardSubCat, draft.ageGroup === age && {backgroundColor: Colors.primary, borderColor: Colors.primary}]} onPress={() => setDraft({...draft, ageGroup: age})}>
                <Text style={[styles.wizardSubCatText, draft.ageGroup === age && {color: '#fff'}]}>{age}</Text>
              </TouchableOpacity>
           ))}
        </ScrollView>

        <Text style={{fontFamily: Typography.bodySemibold, color: Colors.text, marginBottom: 5, marginTop: 10, alignSelf: 'flex-start', marginLeft: '4%'}}>Target Gender (Optional)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 20}}>
           {['Anyone', 'Male', 'Female', 'LGBTQIA+'].map(gender => (
              <TouchableOpacity key={gender} style={[styles.wizardSubCat, draft.gender === gender && {backgroundColor: Colors.primary, borderColor: Colors.primary}]} onPress={() => setDraft({...draft, gender})}>
                <Text style={[styles.wizardSubCatText, draft.gender === gender && {color: '#fff'}]}>{gender}</Text>
              </TouchableOpacity>
           ))}
        </ScrollView>

        {/* @ts-ignore */}
        <input
          type="datetime-local"
          value={draft.date ? format(draft.date, "yyyy-MM-dd'T'HH:mm") : ''}
          onChange={(e: any) => setDraft({...draft, date: new Date(e.target.value)})}
          style={{
            width: '92%', 
            padding: '16px', 
            borderRadius: '16px', 
            border: '1px solid rgba(255,255,255,0.8)', 
            backgroundColor: 'rgba(255,255,255,0.8)', 
            fontFamily: Typography.body,
            fontSize: '15px', 
            color: Colors.text, 
            marginBottom: '15px', 
            alignSelf: 'center',
            boxSizing: 'border-box'
          }}
        />

        <TextInput style={styles.input} placeholder="Location Base (City/Street)" placeholderTextColor="#999" value={wizardQuery} onChangeText={searchWizardLocation} />
        {wizardSuggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            {wizardSuggestions.map((s, i) => (
              <TouchableOpacity key={i} style={styles.suggestionItem} onPress={() => { 
                setDraft({...draft, location: { lat: s.center[1], lng: s.center[0] }, address: s.place_name}); 
                setWizardSuggestions([]); 
                setWizardQuery(s.place_name); 
              }}>
                <Text style={styles.suggestionText}>{s.place_name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.row}>
          <TouchableOpacity style={styles.btnSecondary} onPress={() => setMode('map')}><Text style={styles.btnSecondaryText}>Cancel</Text></TouchableOpacity>
          <TouchableOpacity style={styles.btnPrimary} onPress={() => {
             if (draft.location) mapRef.current?.flyTo({center: [draft.location.lng, draft.location.lat], zoom: 14});
             setMode('wizard_location');
          }}><Text style={styles.btnPrimaryText}>Set Path 📍</Text></TouchableOpacity>
        </View>
      </BlurView>
    </View>
  );

  const renderWizardLocation = () => (
    <View style={styles.glassWrapperTop}>
      <BlurView intensity={90} tint="dark" style={styles.glassPanelTop}>
        <Text style={styles.panelTitleDark}>Drop the exact pin</Text>
        <Text style={styles.panelSubDark}>Tap anywhere on the map to anchor coordinates.</Text>
        {draft.location && (
          <View style={styles.row}>
             <TouchableOpacity style={styles.btnSecondary} onPress={() => setMode('wizard_details')}><Text style={styles.btnSecondaryTextDark}>Back</Text></TouchableOpacity>
             <TouchableOpacity style={styles.btnPrimary} onPress={handleCreate}><Text style={styles.btnPrimaryText}>Lock 5 <Image source={require('../assets/leaf.png')} style={styles.inlineIcon} tintColor="#fff" /> & Finalize</Text></TouchableOpacity>
          </View>
        )}
      </BlurView>
    </View>
  );

  const renderEventChat = () => {
    if(!selectedEvent) return null;
    const isJoined = selectedEvent.participants.includes(user?.uid || '');
    const isHost = selectedEvent.creatorId === user?.uid;

    return (
      <View style={styles.glassWrapperBottomFull}>
        <BlurView intensity={90} tint="light" style={styles.glassPanelBottomFull}>
          <View style={styles.chatHeader}>
             <View style={{flex: 1}}>
                <Text style={styles.chatTitle} numberOfLines={1}>{selectedEvent.title}</Text>
                <Text style={styles.chatSub}>{selectedEvent.participants.length} / {selectedEvent.participantLimit} Attending • {selectedEvent.time ? format(new Date(selectedEvent.time), 'MMM d, h:mm a') : 'TBD'}</Text>
             </View>
             {isHost && (
               <TouchableOpacity onPress={async () => {
                 if (selectedEvent.id === 'tutorial-dummy') {
                   setSelectedEvent(null); setMode('map'); return;
                 }
                 if (Platform.OS === 'web') {
                   if (window.confirm('Are you sure you want to cancel this event?')) {
                     try {
                       await deleteEvent(selectedEvent.id);
                       setSelectedEvent(null); setMode('map');
                       window.alert('The event was removed and 5 leaves have been refunded.');
                     } catch (e: any) { window.alert('Error: ' + e.message); }
                   }
                 } else {
                   Alert.alert('Delete Event', 'Are you sure you want to cancel this event?', [
                     { text: 'No' },
                     { text: 'Yes, Cancel', style: 'destructive', onPress: async () => {
                         try {
                           await deleteEvent(selectedEvent.id);
                           setSelectedEvent(null); setMode('map');
                           Alert.alert('Event Deleted', 'The event was removed and 5 leaves have been refunded.');
                         } catch (e: any) { Alert.alert('Error', e.message); }
                     }}
                   ]);
                 }
               }} style={{padding: 8, marginRight: 5}}>
                 <Feather name="trash-2" size={18} color="rgba(200, 50, 50, 0.8)" />
               </TouchableOpacity>
             )}
             <TouchableOpacity onPress={() => { setSelectedEvent(null); setMode('map'); }}><Text style={styles.closeIcon}>✖</Text></TouchableOpacity>
          </View>
          
          <Text style={styles.chatLoc} numberOfLines={1}>📍 {selectedEvent.location.address || "Precise map location pinned"}</Text>
          
          {!isJoined && !isHost ? (
            <View style={styles.chatLocked}>
              <Text style={styles.chatLockedIco}>💬</Text>
              <Text style={styles.chatLockedTitle}>Tribal Chat is Locked</Text>
              <Text style={styles.chatLockedSub}>Commit 1 <Image source={require('../assets/leaf.png')} style={styles.inlineIcon} /> to join the event and open communications with this tribe.</Text>
              <TouchableOpacity style={styles.btnPrimaryFull} onPress={handleJoin}><Text style={styles.btnPrimaryText}>Join Tribe (1 <Image source={require('../assets/leaf.png')} style={styles.inlineIcon} tintColor="#fff" />)</Text></TouchableOpacity>
            </View>
          ) : (
            <View style={styles.chatOpen}>
              <ScrollView style={styles.chatScroll} contentContainerStyle={{paddingVertical: 10, paddingBottom: 25}}>
                 <View style={styles.chatBubble}><Text style={styles.chatText}>Welcome to the tribe! See you there.</Text></View>
              </ScrollView>
              <View style={styles.chatInputRow}>
                 <TextInput style={styles.chatInput} placeholder="Send a scroll..." placeholderTextColor="#bbb" />
                 <TouchableOpacity style={styles.btnPrimary}><Text style={styles.btnPrimaryText}>Send</Text></TouchableOpacity>
              </View>
            </View>
          )}
        </BlurView>
      </View>
    );
  };

  const renderFilters = () => (
    <View style={styles.glassWrapperBottomFull}>
      <BlurView intensity={90} tint="light" style={styles.glassPanelBottomFull}>
        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5}}>
          <Text style={styles.panelTitle}>Filter Events</Text>
          <TouchableOpacity onPress={() => setMode('map')} style={{padding: 5}}><Feather name="x" size={24} color={Colors.text} /></TouchableOpacity>
        </View>
        <Text style={{fontFamily: Typography.body, color: Colors.textLight, marginBottom: 15}}>Select categories to show on map. Deselect all to view everything.</Text>
        <ScrollView contentContainerStyle={{paddingBottom: 40}}>
           {EVENT_CATEGORIES.map(cat => {
             const isCatActive = activeFilters[cat.id] !== undefined;
             const isExpanded = expandedCat === cat.id;
             return (
               <View key={cat.id} style={{marginBottom: 10}}>
                 <View style={{flexDirection: 'row', alignItems: 'center'}}>
                   <TouchableOpacity 
                     style={[styles.filterCard, {flex: 1, marginRight: 10}, isCatActive && [styles.filterCardActive, {backgroundColor: cat.color, borderColor: cat.color}]]}
                     onPress={() => toggleCategory(cat.id)}
                   >
                     <Feather name={cat.icon} size={20} color={isCatActive ? '#fff' : cat.color} />
                     <Text style={[styles.filterCardText, isCatActive ? {color: '#fff'} : {color: Colors.text}]}>{cat.label} {isCatActive && activeFilters[cat.id].length > 0 ? `(${activeFilters[cat.id].length})` : ''}</Text>
                   </TouchableOpacity>
                   {cat.subgroups.length > 0 && (
                     <TouchableOpacity 
                       style={{padding: 15, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 16}} 
                       onPress={() => setExpandedCat(isExpanded ? null : cat.id)}
                     >
                       <Feather name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color={Colors.text} />
                     </TouchableOpacity>
                   )}
                 </View>
                 {isExpanded && cat.subgroups.length > 0 && (
                   <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10, paddingLeft: 10}}>
                     {cat.subgroups.map(sub => {
                       const isSubActive = isCatActive && (activeFilters[cat.id].length === 0 || activeFilters[cat.id].includes(sub));
                       return (
                         <TouchableOpacity 
                           key={sub}
                           style={[styles.wizardSubCat, isSubActive && {backgroundColor: cat.color, borderColor: cat.color, shadowOpacity: 0.2}]}
                           onPress={() => toggleSubFilter(cat.id, sub)}
                         >
                           <Text style={[styles.wizardSubCatText, isSubActive && {color: '#fff'}]}>{sub}</Text>
                         </TouchableOpacity>
                       )
                     })}
                   </View>
                 )}
               </View>
             );
           })}

               <View style={{marginBottom: 10}}>
                 <View style={{flexDirection: 'row', alignItems: 'center'}}>
                   <TouchableOpacity 
                     style={[styles.filterCard, {flex: 1, marginRight: 10}, activeAgeFilters.length > 0 && [styles.filterCardActive, {backgroundColor: '#00BCD4', borderColor: '#00BCD4'}]]}
                     onPress={() => {
                        if (activeAgeFilters.length > 0) setActiveAgeFilters([]);
                        else setExpandedAge(!expandedAge);
                     }}
                   >
                     <Feather name="users" size={20} color={activeAgeFilters.length > 0 ? '#fff' : '#00BCD4'} />
                     <Text style={[styles.filterCardText, activeAgeFilters.length > 0 ? {color: '#fff'} : {color: Colors.text}]}>Age Group {activeAgeFilters.length > 0 ? `(${activeAgeFilters.length})` : ''}</Text>
                   </TouchableOpacity>
                   <TouchableOpacity 
                     style={{padding: 15, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 16}} 
                     onPress={() => setExpandedAge(!expandedAge)}
                   >
                     <Feather name={expandedAge ? "chevron-up" : "chevron-down"} size={20} color={Colors.text} />
                   </TouchableOpacity>
                 </View>
                 {expandedAge && (
                   <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10, paddingLeft: 10}}>
                     {['All Ages', 'Under 18', '18-25', '26-35', '36-45', '45+'].map(age => {
                       const isSubActive = activeAgeFilters.includes(age);
                       return (
                         <TouchableOpacity 
                           key={age}
                           style={[styles.wizardSubCat, isSubActive && {backgroundColor: '#00BCD4', borderColor: '#00BCD4'}]}
                           onPress={() => {
                             if (isSubActive) setActiveAgeFilters(activeAgeFilters.filter(a => a !== age));
                             else setActiveAgeFilters([...activeAgeFilters, age]);
                           }}
                         >
                           <Text style={[styles.wizardSubCatText, isSubActive && {color: '#fff'}]}>{age}</Text>
                         </TouchableOpacity>
                       )
                     })}
                   </View>
                 )}
               </View>

               <View style={{marginBottom: 10}}>
                 <View style={{flexDirection: 'row', alignItems: 'center'}}>
                   <TouchableOpacity 
                     style={[styles.filterCard, {flex: 1, marginRight: 10}, activeGenderFilters.length > 0 && [styles.filterCardActive, {backgroundColor: '#FF9800', borderColor: '#FF9800'}]]}
                     onPress={() => {
                        if (activeGenderFilters.length > 0) setActiveGenderFilters([]);
                        else setExpandedGender(!expandedGender);
                     }}
                   >
                     <Feather name="heart" size={20} color={activeGenderFilters.length > 0 ? '#fff' : '#FF9800'} />
                     <Text style={[styles.filterCardText, activeGenderFilters.length > 0 ? {color: '#fff'} : {color: Colors.text}]}>Target Gender {activeGenderFilters.length > 0 ? `(${activeGenderFilters.length})` : ''}</Text>
                   </TouchableOpacity>
                   <TouchableOpacity 
                     style={{padding: 15, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 16}} 
                     onPress={() => setExpandedGender(!expandedGender)}
                   >
                     <Feather name={expandedGender ? "chevron-up" : "chevron-down"} size={20} color={Colors.text} />
                   </TouchableOpacity>
                 </View>
                 {expandedGender && (
                   <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10, paddingLeft: 10}}>
                     {['Anyone', 'Male', 'Female', 'LGBTQIA+'].map(gender => {
                       const isSubActive = activeGenderFilters.includes(gender);
                       return (
                         <TouchableOpacity 
                           key={gender}
                           style={[styles.wizardSubCat, isSubActive && {backgroundColor: '#FF9800', borderColor: '#FF9800'}]}
                           onPress={() => {
                             if (isSubActive) setActiveGenderFilters(activeGenderFilters.filter(a => a !== gender));
                             else setActiveGenderFilters([...activeGenderFilters, gender]);
                           }}
                         >
                           <Text style={[styles.wizardSubCatText, isSubActive && {color: '#fff'}]}>{gender}</Text>
                         </TouchableOpacity>
                       )
                     })}
                   </View>
                 )}
               </View>
        </ScrollView>
      </BlurView>
    </View>
  );

  const renderTutorial = () => {
    switch(tutStep) {
      case 0:
        return (
          <View style={[StyleSheet.absoluteFill, {backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 9999}]}>
            <Text style={{fontFamily: Typography.heading, color: '#fff', fontSize: 28, marginBottom: 15}}>Welcome to The Tribes</Text>
            <Text style={{fontFamily: Typography.body, color: '#fff', fontSize: 16, textAlign: 'center', paddingHorizontal: 30, marginBottom: 30, lineHeight: 24}}>Discover local events, meet new people, and assemble your tribe. Let's take a quick tour!</Text>
            <TouchableOpacity style={styles.btnPrimary} onPress={() => setTutStep(1)}><Text style={styles.btnPrimaryText}>Start Tour</Text></TouchableOpacity>
          </View>
        );
      case 1:
        return (
          <View style={[StyleSheet.absoluteFill, {pointerEvents: 'box-none', zIndex: 9999}]}>
            <View style={{position: 'absolute', top: 100, left: 20, backgroundColor: '#fff', padding: 20, borderRadius: 20, width: 260, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 15}} pointerEvents="auto">
               <Feather name="arrow-up" size={30} color={Colors.primary} style={{position: 'absolute', top: -25, left: 25}} />
               <Text style={{fontFamily: Typography.bodySemibold, marginBottom: 10}}>1. Your Leaves</Text>
               <Text style={{fontFamily: Typography.body, color: '#666', marginBottom: 15}}>Leaves are your currency. Use them to join and create events. You get 5 free every day!</Text>
               <TouchableOpacity style={[styles.btnPrimary, {alignSelf: 'flex-end', paddingVertical: 10}]} onPress={() => setTutStep(2)}><Text style={styles.btnPrimaryText}>Next</Text></TouchableOpacity>
            </View>
          </View>
        );
      case 2:
        return (
          <View style={[StyleSheet.absoluteFill, {pointerEvents: 'box-none', zIndex: 9999}]}>
            <View style={{position: 'absolute', top: 105, right: 20, backgroundColor: '#fff', padding: 20, borderRadius: 20, width: 260, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 15}} pointerEvents="auto">
               <Feather name="arrow-up" size={30} color={Colors.primary} style={{position: 'absolute', top: -25, right: 5}} />
               <Text style={{fontFamily: Typography.bodySemibold, marginBottom: 10}}>2. Settings</Text>
               <Text style={{fontFamily: Typography.body, color: '#666', marginBottom: 15}}>Tap here to update your profile, tags, and adjust app preferences.</Text>
               <TouchableOpacity style={[styles.btnPrimary, {alignSelf: 'flex-end', paddingVertical: 10}]} onPress={() => setTutStep(3)}><Text style={styles.btnPrimaryText}>Next</Text></TouchableOpacity>
            </View>
          </View>
        );
      case 3:
        return (
          <View style={[StyleSheet.absoluteFill, {pointerEvents: 'box-none', zIndex: 9999}]}>
            <View style={{position: 'absolute', top: 165, right: 20, backgroundColor: '#fff', padding: 20, borderRadius: 20, width: 260, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 15}} pointerEvents="auto">
               <Feather name="arrow-up" size={30} color={Colors.primary} style={{position: 'absolute', top: -25, right: 5}} />
               <Text style={{fontFamily: Typography.bodySemibold, marginBottom: 10}}>3. Global Navigation</Text>
               <Text style={{fontFamily: Typography.body, color: '#666', marginBottom: 15}}>Center the map to your home or search to instantly fly to any location worldwide.</Text>
               <TouchableOpacity style={[styles.btnPrimary, {alignSelf: 'flex-end', paddingVertical: 10}]} onPress={() => setTutStep(4)}><Text style={styles.btnPrimaryText}>Next</Text></TouchableOpacity>
            </View>
          </View>
        );
      case 4:
        return (
          <View style={[StyleSheet.absoluteFill, {pointerEvents: 'box-none', zIndex: 9999}]}>
            <View style={{position: 'absolute', bottom: 110, right: 20, backgroundColor: '#fff', padding: 20, borderRadius: 20, width: 260, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 15}} pointerEvents="auto">
               <Feather name="arrow-down" size={30} color={Colors.primary} style={{position: 'absolute', bottom: -25, right: 10}} />
               <Text style={{fontFamily: Typography.bodySemibold, marginBottom: 10}}>4. Find Your Vibe</Text>
               <Text style={{fontFamily: Typography.body, color: '#666', marginBottom: 15}}>Use filters to discover specific events based on category, age, or gender.</Text>
               <TouchableOpacity style={[styles.btnPrimary, {alignSelf: 'flex-end', paddingVertical: 10}]} onPress={() => setTutStep(5)}><Text style={styles.btnPrimaryText}>Next</Text></TouchableOpacity>
            </View>
          </View>
        );
      case 5:
        return (
          <View style={{position: 'absolute', top: 180, left: 20, backgroundColor: '#fff', padding: 20, borderRadius: 20, width: 260, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 15, zIndex: 9999}}>
             <Feather name="arrow-up" size={30} color={Colors.primary} style={{position: 'absolute', top: -25, left: 14}} />
             <Text style={{fontFamily: Typography.bodySemibold, marginBottom: 10}}>5. Create an Event</Text>
             <Text style={{fontFamily: Typography.body, color: '#666', marginBottom: 15}}>Ready to host? Tap the + icon to assemble a tribe right at the map's center crosshair!</Text>
             <TouchableOpacity style={[styles.btnPrimary, {alignSelf: 'flex-end', paddingVertical: 10}]} onPress={() => setTutStep(6)}><Text style={styles.btnPrimaryText}>Next</Text></TouchableOpacity>
          </View>
        );
      case 6:
        return (
          <View style={{position: 'absolute', top: 100, left: '50%', transform: [{translateX: -150}], backgroundColor: '#fff', padding: 20, borderRadius: 20, width: 300, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 15, zIndex: 9999}}>
             <Text style={{fontFamily: Typography.bodySemibold, marginBottom: 10}}>6. Tribal Fires</Text>
             <Text style={{fontFamily: Typography.body, color: '#666', marginBottom: 10}}>Active events show up as pins. Let's practice! Tap the test pin exactly at the center of the map.</Text>
             <TouchableOpacity onPress={() => markTutorialSeen()} style={{alignSelf: 'center', paddingVertical: 5, marginBottom: 5}}>
                <Text style={{color: Colors.textLight, fontFamily: Typography.bodyBold}}>Skip Tutorial</Text>
             </TouchableOpacity>
             <Feather name="arrow-down" size={30} color={Colors.primary} style={{alignSelf: 'center', position: 'absolute', bottom: -30}} />
          </View>
        );
      case 7:
        return (
          <View style={{position: 'absolute', top: 120, left: '50%', transform: [{translateX: -150}], backgroundColor: '#fff', padding: 20, borderRadius: 20, width: 300, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 15, zIndex: 9999}} pointerEvents="none">
             <Text style={{fontFamily: Typography.bodySemibold, marginBottom: 10}}>7. Joining a Tribe</Text>
             <Text style={{fontFamily: Typography.body, color: '#666', marginBottom: 15}}>This is a locked Tribal Chat. It stays secure until you commit 1 Leaf to join the event. Go ahead, tap the "Join Tribe" button below!</Text>
             <Feather name="arrow-down" size={30} color={Colors.primary} style={{alignSelf: 'center', marginTop: 10}} />
          </View>
        );
      default:
        return null;
    }
  };


  // Bonfire intensity: 0 = distant (>24h), 1 = happening NOW
  const getBonfireIntensity = (eventTime: any): number => {
    if (!eventTime) return 0.3;
    const now = Date.now();
    const t = new Date(eventTime).getTime();
    const hoursUntil = (t - now) / (1000 * 60 * 60);
    if (hoursUntil < 0) return 1;
    if (hoursUntil >= 24) return 0.15;
    return 1 - (hoursUntil / 24);
  };

  const getBonfireStyle = (intensity: number) => {
    const glowRadius = 2 + intensity * 10;
    const glowOpacity = 0.3 + intensity * 0.5;
    const g = Math.round(200 - intensity * 130);
    return {
      justifyContent: 'center' as const, alignItems: 'center' as const,
      backgroundColor: 'transparent',
      shadowColor: `rgb(255, ${Math.round(g * 0.5)}, 0)`,
      shadowOpacity: glowOpacity, shadowRadius: glowRadius,
      shadowOffset: { width: 0, height: 0 },
      elevation: Math.round(2 + intensity * 8),
    };
  };

  return (
    <View style={styles.container}>
      <Map
        ref={mapRef}
        initialViewState={{ longitude: user?.homeLocation?.longitude || 19.0238, latitude: user?.homeLocation?.latitude || 50.2649, zoom: 12.5 }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/light-v11"
        mapboxAccessToken={process.env.EXPO_PUBLIC_MAPBOX_KEY}
        onClick={handleMapClick}
        onZoom={(e: any) => setCurrentZoom(e.viewState.zoom)}
      >
        {clusteredMarkers.map((cluster, ci) => {
          // Hottest event in cluster determines bonfire intensity
          const maxIntensity = Math.max(...cluster.events.map(e => getBonfireIntensity(e.time)));
          const isSingle = cluster.events.length === 1;
          const iconSize = isSingle ? (28 + maxIntensity * 12) : (36 + maxIntensity * 10);
          return (
          <Marker 
            key={`c-${ci}`} longitude={cluster.lng} latitude={cluster.lat} anchor="center"
            onClick={(e: any) => {
              e.originalEvent?.stopPropagation();
              if (isSingle) {
                const ev = cluster.events[0];
                if (mode === 'map' || tutStep === 6) {
                  setSelectedEvent(ev as any);
                  setMode('event_chat');
                  setSelectedCluster(null);
                  if (tutStep === 6 && ev.id === 'tutorial-dummy') setTutStep(7);
                }
              } else {
                setSelectedCluster(selectedCluster?.lat === cluster.lat ? null : cluster);
              }
            }}>
            <div style={{ position: 'relative', cursor: 'pointer' }}>
              <img
                src={require('../assets/bonfire.png')}
                style={{
                  width: iconSize,
                  height: iconSize,
                  objectFit: 'contain',
                  display: 'block',
                  filter: `drop-shadow(0 0 ${Math.round(4 + maxIntensity * 14)}px rgba(255, ${Math.round(160 - maxIntensity * 120)}, 0, ${0.3 + maxIntensity * 0.7}))`,
                }}
              />
              {!isSingle && (
                <div style={{
                  position: 'absolute', top: -6, right: -8,
                  backgroundColor: '#FF5722', color: '#fff',
                  borderRadius: 10, minWidth: 20, height: 20,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, border: '2px solid #fff',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                  paddingInline: 4,
                }}>
                  {cluster.events.length}
                </div>
              )}
            </div>
          </Marker>
          );
        })}

        {/* Cluster popup */}
        {selectedCluster && (
          <Marker longitude={selectedCluster.lng} latitude={selectedCluster.lat} anchor="top" offset={[0, 8]}>
            <div style={{
              background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)',
              borderRadius: 14, padding: 8, minWidth: 200, maxWidth: 260,
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)', border: '1px solid rgba(0,0,0,0.06)',
            }}>
              {selectedCluster.events.map((ev, i) => {
                const cat = EVENT_CATEGORIES.find(c => c.id === ev.categoryId);
                const timeStr = ev.time ? format(new Date(ev.time), 'MMM d, HH:mm') : '';
                return (
                  <div key={ev.id}
                    onClick={() => { setSelectedEvent(ev as any); setMode('event_chat'); setSelectedCluster(null); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '7px 8px', cursor: 'pointer', borderRadius: 10,
                      borderBottom: i < selectedCluster.events.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.04)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: cat?.color || '#999', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</div>
                      <div style={{ fontSize: 11, color: '#888' }}>{timeStr}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Marker>
        )}
        {mode === 'wizard_location' && draft.location && (
          <Marker longitude={draft.location.lng} latitude={draft.location.lat} anchor="center">
            <View style={[styles.pinBase, styles.pinDraft]} />
          </Marker>
        )}
      </Map>

      {renderHUD()}
      {renderDevTools()}
      {mode === 'wizard_details' && renderWizardDetails()}
      {mode === 'wizard_location' && renderWizardLocation()}
      {mode === 'event_chat' && renderEventChat()}
      {mode === 'filters' && renderFilters()}
      {mode === 'tribe_panel' && renderTribePanel()}
      {renderMapSearch()}
      {renderTutorial()}
    </View>
  );
}

// ---------------- STYLES ---------------- //
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  settingsBtn: { position: 'absolute', top: 35, right: 20 },
  locateBtn: { position: 'absolute', top: 95, right: 20 },
  iconWrapper: { padding: 12, borderRadius: 25, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  inlineIcon: { width: 17, height: 17, resizeMode: 'contain', marginHorizontal: 2, transform: [{ translateY: 3 }] },
  
  devPanel: { position: 'absolute', right: 10, top: '50%', transform: [{ translateY: -100 }], backgroundColor: 'rgba(200, 50, 50, 0.85)', padding: 12, borderRadius: 12, zIndex: 1000, elevation: 1000, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10 },
  devTitle: { fontFamily: Typography.heading, color: '#fff', fontSize: 10, marginBottom: 6, textAlign: 'center', letterSpacing: 1 },
  devBtn: { backgroundColor: '#fff', paddingHorizontal: 6, paddingVertical: 6, borderRadius: 8, marginBottom: 5, elevation: 2 },
  devBtnText: { fontFamily: Typography.bodyBold, color: 'rgba(200, 50, 50, 1)', fontSize: 9, textAlign: 'center' },

  topLeft: { position: 'absolute', top: 35, left: 20 },
  balancePill: { overflow: 'hidden', width: 54, height: 54, borderRadius: 27, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', justifyContent: 'center', alignItems: 'center' },
  balanceText: { fontFamily: Typography.bodyBold, color: Colors.primaryDark, fontSize: 13, textAlign: 'center' },
  
  upcomingRow: { flexDirection: 'row', alignItems: 'center' },
  plusBtn: { width: 54, height: 54, backgroundColor: Colors.primary, borderRadius: 27, justifyContent: 'center', alignItems: 'center', shadowColor: Colors.primaryDark, shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 6 },
  upcomingScroll: { marginLeft: 12, maxWidth: 220 },
  upcomingIcon: { width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 10, borderWidth: 1, borderColor: '#eee', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  upcomingInitial: { fontFamily: Typography.bodyBold, color: Colors.text, fontSize: 15 },

  bottomBar: { position: 'absolute', bottom: 35, left: 20, right: 20, flexDirection: 'row', alignItems: 'center' },
  dateSliderContainer: { flex: 1, marginRight: 15, borderRadius: 24, paddingVertical: 4, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', flexDirection: 'row', alignItems: 'center' },
  scrollIndicatorLeft: { position: 'absolute', left: 4, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.9)', padding: 4, borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 3, elevation: 3 },
  scrollIndicatorRight: { position: 'absolute', right: 4, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.9)', padding: 4, borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 3, elevation: 3 },
  datePill: { backgroundColor: 'transparent', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 18, marginRight: 6 },
  datePillActive: { backgroundColor: 'rgba(255,255,255,0.95)', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  datePillText: { fontFamily: Typography.bodySemibold, color: Colors.textLight, fontSize: 13 },
  datePillTextActive: { color: Colors.text },

  filterBtn: { borderRadius: 24, overflow: 'hidden' },
  filterBtnWrapper: { paddingHorizontal: 18, paddingVertical: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },
  filterBtnText: { fontFamily: Typography.bodyBold, color: Colors.text, fontSize: 13 },

  wizardCat: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#ddd', marginRight: 8, backgroundColor: '#fff' },
  wizardCatText: { fontFamily: Typography.bodyBold, fontSize: 13, color: Colors.text, marginLeft: 6 },
  wizardSubCat: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.5)', marginRight: 8 },
  wizardSubCatActive: { backgroundColor: 'rgba(255,255,255,0.95)', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  wizardSubCatText: { fontFamily: Typography.bodySemibold, fontSize: 13, color: Colors.primaryDark },
  
  filterGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 15 },
  filterCard: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, borderWidth: 1, borderColor: '#eee', backgroundColor: 'rgba(255,255,255,0.8)', width: '48%' },
  filterCardActive: { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  filterCardText: { fontFamily: Typography.bodyBold, fontSize: 14, marginLeft: 8 },

  glassWrapperBottom: { position: 'absolute', bottom: 35, left: 20, right: 20, borderRadius: 30, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 25 },
  glassWrapperBottomFull: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%', borderTopLeftRadius: 36, borderTopRightRadius: 36, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 30 },
  glassWrapperTop: { position: 'absolute', top: 40, left: 20, right: 20, borderRadius: 24, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20 },
  
  glassPanelBottom: { padding: 25, backgroundColor: 'rgba(255, 255, 255, 0.5)' },
  glassPanelBottomFull: { padding: 30, backgroundColor: 'rgba(255, 255, 255, 0.6)', flex: 1 },
  glassPanelTop: { padding: 25, backgroundColor: 'rgba(44, 58, 41, 0.7)' },
  
  panelTitle: { fontFamily: Typography.heading, fontSize: 26, color: Colors.text, marginBottom: 20 },
  panelTitleDark: { fontFamily: Typography.heading, fontSize: 22, color: '#fff', marginBottom: 5 },
  panelSubDark: { fontFamily: Typography.body, fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 20 },
  input: { fontFamily: Typography.body, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 16, padding: 16, marginBottom: 15, fontSize: 15, color: Colors.text },
  suggestionsContainer: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#eee', maxHeight: 120, overflow: 'hidden', marginTop: -5, marginBottom: 15 },
  suggestionItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  suggestionText: { fontFamily: Typography.body, fontSize: 13, color: Colors.text },
  
  row: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  btnPrimary: { backgroundColor: Colors.primary, paddingHorizontal: 22, paddingVertical: 14, borderRadius: 16 },
  btnPrimaryFull: { backgroundColor: Colors.primary, paddingVertical: 18, borderRadius: 16, alignItems: 'center', width: '100%', marginTop: 20 },
  btnPrimaryText: { fontFamily: Typography.bodyBold, color: '#fff', fontSize: 15 },
  btnSecondary: { backgroundColor: 'transparent', paddingHorizontal: 15, paddingVertical: 14 },
  btnSecondaryText: { fontFamily: Typography.bodyBold, color: '#999', fontSize: 15 },
  btnSecondaryTextDark: { fontFamily: Typography.bodyBold, color: 'rgba(255,255,255,0.7)', fontSize: 15 },

  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  chatTitle: { fontFamily: Typography.heading, fontSize: 22, color: Colors.text },
  chatSub: { fontFamily: Typography.body, fontSize: 12, color: Colors.primary, marginTop: 4 },
  closeIcon: { fontSize: 20, color: '#aaa', paddingHorizontal: 5 },
  chatLoc: { fontFamily: Typography.bodySemibold, fontSize: 13, color: Colors.textLight, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)', marginBottom: 15 },
  
  chatLocked: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  chatLockedIco: { fontSize: 45, marginBottom: 15 },
  chatLockedTitle: { fontFamily: Typography.heading, fontSize: 24, color: Colors.text, marginBottom: 10, textAlign: 'center' },
  chatLockedSub: { fontFamily: Typography.body, fontSize: 15, color: Colors.textLight, textAlign: 'center', lineHeight: 22 },

  chatOpen: { flex: 1 },
  chatScroll: { flex: 1 },
  chatBubble: { backgroundColor: '#F3F4F2', padding: 18, borderRadius: 20, alignSelf: 'flex-start', borderBottomLeftRadius: 5 },
  chatText: { fontFamily: Typography.body, color: Colors.text, fontSize: 14 },
  chatInputRow: { flexDirection: 'row', gap: 10, paddingTop: 15, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
  chatInput: { flex: 1, fontFamily: Typography.body, backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 20, paddingHorizontal: 20, borderWidth: 1, borderColor: '#eee' },

  pinBase: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.primary, borderWidth: 2, borderColor: '#fff', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 5 },
  pinPublic: { width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.accent },
  pinPrivate: { width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(94, 113, 83, 0.25)', borderWidth: 1, borderColor: Colors.primary },
  pinDraft: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.primary, elevation: 10, borderWidth: 3, borderColor: '#fff' },
  pinExternal: { backgroundColor: '#8B9C82' } 
});
