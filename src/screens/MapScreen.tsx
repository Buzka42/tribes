import React, { useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView, TextInput, Alert, Platform, Image } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { BlurView } from 'expo-blur';

import { useAuth } from '../hooks/useAuth';
import { useEvents, TribeVent } from '../hooks/useEvents';
import { auth, db } from '../config/firebase';
import { signOut } from 'firebase/auth';
import { Colors, Typography } from '../theme';
import { format } from 'date-fns';
import { Feather } from '@expo/vector-icons';

Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_KEY || '');

export default function MapScreen() {
  const { user } = useAuth();
  const { events, joinEvent, createEvent } = useEvents();
  
  const [mode, setMode] = useState<'map' | 'wizard_details' | 'wizard_location' | 'event_chat'>('map');
  const [draft, setDraft] = useState({ title: '', interest: '', isPrivate: false, limit: '10', location: null as any, address: '' });
  const [selectedEvent, setSelectedEvent] = useState<TribeVent | null>(null);
  const [dateFilter, setDateFilter] = useState('30 Days');
  const [tutStep, setTutStep] = useState(0);

  const joinedEvents = events.filter(e => e.participants?.includes(user?.uid || ''));

  React.useEffect(() => {
    if (user?.tokens === 10 && joinedEvents.length === 0) setTutStep(1);
  }, [user?.tokens, joinedEvents.length]);

  const handleMapPress = (e: any) => {
    if (mode === 'wizard_location') {
      const coords = e.geometry.coordinates; // [lng, lat]
      setDraft({ ...draft, location: { lat: coords[1], lng: coords[0] } });
    }
  };

  const handleCreate = async () => {
    try {
      if (!draft.title || !draft.interest || !draft.location) return Alert.alert("Incomplete", "Make sure title, category, and location are set.");
      await createEvent(draft.title, draft.interest, parseInt(draft.limit) || 10, draft.isPrivate, 5, {
        latitude: draft.location.lat,
        longitude: draft.location.lng,
        address: draft.address || "Pinned carefully on Map"
      });
      setMode('map');
      setDraft({ title: '', interest: '', isPrivate: false, limit: '10', location: null, address: '' });
      Alert.alert("Tribe Assembled", "Your event is live. 5 Leaves were locked.");
    } catch(err: any) { Alert.alert("Error", err.message); }
  };

  const handleJoin = async () => {
    if(!selectedEvent) return;
    try {
      if ((user?.tokens || 0) < 1) { Alert.alert("Out of Leaves", "You need 1 Leaf to join."); return; }
      await joinEvent(selectedEvent.id);
      Alert.alert("Joined", "You've secured your spot. Chat is now unlocked!");
    } catch(e:any) { Alert.alert("Error", e.message); }
  };

  const renderTutorial = () => {
    if (tutStep === 0) return null;
    return (
      <View style={[StyleSheet.absoluteFill, { zIndex: 9999, elevation: 9999 }]} pointerEvents="box-none">
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(23, 31, 20, 0.7)' }]} />
        
        {tutStep === 1 && (
          <View style={{position: 'absolute', top: 110, left: 20, backgroundColor: Colors.surface, padding: 25, borderRadius: 24, width: '80%', maxWidth: 350, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20}}>
            <Text style={{fontFamily: Typography.heading, fontSize: 24, marginBottom: 8}}>1. The Leaves <Image source={require('../assets/leaf.png')} style={styles.inlineIcon} /></Text>
            <Text style={{fontFamily: Typography.body, fontSize: 14, color: Colors.text, lineHeight: 22, marginVertical: 10}}>This is your balance. You use leaves to host or join events. They keep the tribe accountable!</Text>
            <TouchableOpacity style={styles.btnPrimary} onPress={() => setTutStep(2)}><Text style={styles.btnPrimaryText}>Next</Text></TouchableOpacity>
          </View>
        )}
        
        {tutStep === 2 && (
          <View style={{position: 'absolute', top: 180, left: 20, backgroundColor: Colors.surface, padding: 25, borderRadius: 24, width: '80%', maxWidth: 350, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20}}>
            <Text style={{fontFamily: Typography.heading, fontSize: 24, marginBottom: 8}}>2. Assemble</Text>
            <Text style={{fontFamily: Typography.body, fontSize: 14, color: Colors.text, lineHeight: 22, marginVertical: 10}}>Use this Green button to host. It locks 5 <Image source={require('../assets/leaf.png')} style={styles.inlineIcon} /> to host an event, 80% refunded automatically upon completion.</Text>
            <TouchableOpacity style={styles.btnPrimary} onPress={() => setTutStep(3)}><Text style={styles.btnPrimaryText}>Next</Text></TouchableOpacity>
          </View>
        )}

        {tutStep === 3 && (
          <View style={{position: 'absolute', bottom: 120, left: 20, backgroundColor: Colors.surface, padding: 25, borderRadius: 24, width: '80%', maxWidth: 350, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20}}>
            <Text style={{fontFamily: Typography.heading, fontSize: 24, marginBottom: 8}}>3. Map Filters</Text>
            <Text style={{fontFamily: Typography.body, fontSize: 14, color: Colors.text, lineHeight: 22, marginVertical: 10}}>Slide through these dates or hit Filters to drill down to your perfect outdoor or tech adventure.</Text>
            <TouchableOpacity style={styles.btnPrimary} onPress={() => setTutStep(4)}><Text style={styles.btnPrimaryText}>Next</Text></TouchableOpacity>
          </View>
        )}

        {tutStep === 4 && (
          <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20}}>
            <View style={{backgroundColor: Colors.surface, padding: 35, borderRadius: 24, width: '100%', maxWidth: 400, alignItems: 'center'}}>
              <Text style={{fontFamily: Typography.heading, fontSize: 28, marginBottom: 10}}>Simulation Phase</Text>
              <Text style={{fontFamily: Typography.body, textAlign: 'center', marginBottom: 20, color: Colors.text, lineHeight: 22}}>Let's pretend a "Sunset Hike" just spawned on the map. Joining it will deduct 1 <Image source={require('../assets/leaf.png')} style={styles.inlineIcon} />.</Text>
              <View style={{borderWidth: 1, borderColor: '#eee', padding: 20, borderRadius: 16, width: '100%', marginBottom: 25, backgroundColor: '#FAFAFA'}}>
                 <Text style={{fontFamily: Typography.heading, fontSize: 22}}>Sunset Hike 🌄</Text>
                 <Text style={{fontFamily: Typography.bodyBold, color: Colors.primary, marginTop: 5}}>2 / 10 Attending</Text>
                 <Text style={{fontFamily: Typography.body, color: Colors.textLight, marginTop: 10, lineHeight: 20}}>If you flake, the token is burned 🔥. If you show up, the token is instantly fully refunded!</Text>
              </View>
              <TouchableOpacity style={styles.btnPrimaryFull} onPress={() => { setTutStep(0); Alert.alert('Welcome!', 'You are now ready to use The Tribes.');}}>
                 <Text style={styles.btnPrimaryText}>Got it! Let's start!</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderDevTools = () => {
    if (!user?.isDev) return null;
    return (
      <View style={styles.devPanel}>
        <Text style={styles.devTitle}>DEV TOOLS</Text>
        <TouchableOpacity style={styles.devBtn} onPress={() => setTutStep(1)}>
           <Text style={styles.devBtnText}>[Trigger Onboarding]</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.devBtn} onPress={async () => {
          const { doc, updateDoc, increment } = await import('firebase/firestore');
          await updateDoc(doc(db, 'users', user.uid), { tokens: increment(100) });
        }}>
           <Text style={styles.devBtnText}>[+100 Leaves]</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.devBtn} onPress={async () => {
          const { collection, query, where, getDocs, deleteDoc } = await import('firebase/firestore');
          const q = query(collection(db, 'events'), where('creatorId', '==', user.uid));
          const snaps = await getDocs(q);
          snaps.forEach(s => deleteDoc(s.ref));
          Alert.alert("Purged", `Deleted ${snaps.size} test events.`);
        }}>
           <Text style={styles.devBtnText}>[Purge My Events]</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.devBtn} onPress={() => {
           setDraft({...draft, title: "Dev Dummy Event", interest: "Testing", location: {lat: 50.2649, lng: 19.0238}});
           setMode('wizard_location');
        }}>
           <Text style={styles.devBtnText}>[Spawn Draft Event]</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderHUD = () => {
    if (mode !== 'map') return null;
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <TouchableOpacity style={styles.settingsBtn} onPress={() => signOut(auth)}>
          <BlurView intensity={65} tint="light" style={styles.iconWrapper}>
            <Text style={{fontSize: 16}}>⚙️</Text>
          </BlurView>
        </TouchableOpacity>

        <View style={styles.topLeft} pointerEvents="box-none">
          <BlurView intensity={70} tint="light" style={styles.balancePill}>
            <Text style={styles.balanceText}>{user?.tokens} <Image source={require('../assets/leaf.png')} style={styles.inlineIcon} /></Text>
          </BlurView>
          
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
          <BlurView intensity={65} tint="light" style={styles.dateSliderContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingRight: 20}}>
              {['Today', 'Tomorrow', 'Weekend', 'Next Week', '30 Days', 'All'].map(d => (
                <TouchableOpacity key={d} onPress={() => setDateFilter(d)} style={[styles.datePill, dateFilter === d && styles.datePillActive]}>
                  <Text style={[styles.datePillText, dateFilter === d && styles.datePillTextActive]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.fadeRight} />
          </BlurView>

          <TouchableOpacity style={styles.filterBtn}>
            <BlurView intensity={75} tint="light" style={styles.filterBtnWrapper}>
               <Text style={styles.filterBtnText}>Filters ☰</Text>
            </BlurView>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderWizardDetails = () => (
    <View style={styles.glassWrapperBottom}>
      <BlurView intensity={85} tint="light" style={styles.glassPanelBottom}>
        <Text style={styles.panelTitle}>Design your tribe's event</Text>
        <TextInput style={styles.input} placeholder="Title (e.g. Morning Run)" placeholderTextColor="#888" value={draft.title} onChangeText={(t) => setDraft({...draft, title: t})} />
        <TextInput style={styles.input} placeholder="Category (e.g. Sports)" placeholderTextColor="#888" value={draft.interest} onChangeText={(t) => setDraft({...draft, interest: t})} />
        <View style={styles.row}>
          <TouchableOpacity style={styles.btnSecondary} onPress={() => setMode('map')}><Text style={styles.btnSecondaryText}>Cancel</Text></TouchableOpacity>
          <TouchableOpacity style={styles.btnPrimary} onPress={() => setMode('wizard_location')}><Text style={styles.btnPrimaryText}>Set Path 📍</Text></TouchableOpacity>
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
             <TouchableOpacity style={styles.btnPrimary} onPress={handleCreate}><Text style={styles.btnPrimaryText}>Lock 5 <Image source={require('../assets/leaf.png')} style={[styles.inlineIcon, {tintColor: '#fff'}]} /> & Finalize</Text></TouchableOpacity>
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
                <Text style={styles.chatSub}>{selectedEvent.participants.length} / {selectedEvent.participantLimit} Attending • {format(selectedEvent.time, 'MMM d, h:mm a')}</Text>
             </View>
             <TouchableOpacity onPress={() => { setSelectedEvent(null); setMode('map'); }}><Text style={styles.closeIcon}>✖</Text></TouchableOpacity>
          </View>
          
          <Text style={styles.chatLoc} numberOfLines={1}>📍 {selectedEvent.location.address || "Precise map location pinned"}</Text>
          
          {!isJoined && !isHost ? (
            <View style={styles.chatLocked}>
              <Text style={styles.chatLockedIco}>💬</Text>
              <Text style={styles.chatLockedTitle}>Tribal Chat is Locked</Text>
              <Text style={styles.chatLockedSub}>Commit 1 <Image source={require('../assets/leaf.png')} style={styles.inlineIcon} /> to join the event and open communications with this tribe.</Text>
              <TouchableOpacity style={styles.btnPrimaryFull} onPress={handleJoin}><Text style={styles.btnPrimaryText}>Join Tribe (1 <Image source={require('../assets/leaf.png')} style={[styles.inlineIcon, {tintColor: '#fff'}]} />)</Text></TouchableOpacity>
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

  return (
    <View style={styles.container}>
      <Mapbox.MapView style={styles.map} logoEnabled={false} attributionEnabled={false} onPress={handleMapPress}>
        <Mapbox.Camera zoomLevel={13} centerCoordinate={[19.0238, 50.2649]} />
        
        {events.map(ev => (
          <Mapbox.PointAnnotation
            key={ev.id}
            id={ev.id}
            coordinate={[ev.location.longitude, ev.location.latitude]}
            onSelected={() => {
              if (mode === 'map') {
                setSelectedEvent(ev);
                setMode('event_chat');
              }
            }}
          >
            <View style={[
              styles.pinBase, 
              ev.isPrivate ? styles.pinPrivate : styles.pinPublic,
              ev.isExternal && styles.pinExternal
            ]} />
          </Mapbox.PointAnnotation>
        ))}

        {mode === 'wizard_location' && draft.location && (
          <Mapbox.PointAnnotation
            id="draft_pin"
            coordinate={[draft.location.lng, draft.location.lat]}
          >
            <View style={[styles.pinBase, styles.pinDraft]} />
          </Mapbox.PointAnnotation>
        )}
      </Mapbox.MapView>

      {renderHUD()}
      {renderDevTools()}
      {mode === 'wizard_details' && renderWizardDetails()}
      {mode === 'wizard_location' && renderWizardLocation()}
      {mode === 'event_chat' && renderEventChat()}
      {renderTutorial()}
    </View>
  );
}

// ---------------- STYLES ---------------- //
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  map: { flex: 1 },
  settingsBtn: { position: 'absolute', top: 50, right: 20 },
  iconWrapper: { padding: 12, borderRadius: 25, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  inlineIcon: { width: 17, height: 17, resizeMode: 'contain', marginHorizontal: 2, transform: [{ translateY: 3 }] },

  devPanel: { position: 'absolute', top: 125, right: 20, backgroundColor: 'rgba(200, 50, 50, 0.85)', padding: 18, borderRadius: 16, zIndex: 1000, elevation: 1000, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 15 },
  devTitle: { fontFamily: Typography.heading, color: '#fff', fontSize: 13, marginBottom: 12, textAlign: 'center', letterSpacing: 2 },
  devBtn: { backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, marginBottom: 8, elevation: 5 },
  devBtnText: { fontFamily: Typography.bodyBold, color: 'rgba(200, 50, 50, 1)', fontSize: 11, textAlign: 'center' },
  
  topLeft: { position: 'absolute', top: 50, left: 20 },
  balancePill: { overflow: 'hidden', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', flexDirection: 'row', alignItems: 'center' },
  balanceText: { fontFamily: Typography.bodyBold, color: Colors.primaryDark, fontSize: 13, letterSpacing: 0.5 },
  
  upcomingRow: { flexDirection: 'row', alignItems: 'center' },
  plusBtn: { width: 54, height: 54, backgroundColor: Colors.primary, borderRadius: 27, justifyContent: 'center', alignItems: 'center', shadowColor: Colors.primaryDark, shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 6 },
  upcomingScroll: { marginLeft: 12, maxWidth: 220 },
  upcomingIcon: { width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 10, borderWidth: 1, borderColor: '#eee' },
  upcomingInitial: { fontFamily: Typography.bodyBold, color: Colors.text, fontSize: 15 },

  bottomBar: { position: 'absolute', bottom: 50, left: 20, right: 20, flexDirection: 'row', alignItems: 'center' },
  dateSliderContainer: { flex: 1, marginRight: 15, borderRadius: 24, paddingVertical: 6, paddingHorizontal: 6, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', flexDirection: 'row' },
  datePill: { backgroundColor: 'transparent', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 18, marginRight: 6 },
  datePillActive: { backgroundColor: 'rgba(255,255,255,0.95)' },
  datePillText: { fontFamily: Typography.bodySemibold, color: Colors.textLight, fontSize: 13 },
  datePillTextActive: { color: Colors.text },
  fadeRight: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 30, backgroundColor: 'transparent' },

  filterBtn: { borderRadius: 24, overflow: 'hidden' },
  filterBtnWrapper: { paddingHorizontal: 18, paddingVertical: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },
  filterBtnText: { fontFamily: Typography.bodyBold, color: Colors.text, fontSize: 13 },

  glassWrapperBottom: { position: 'absolute', bottom: 50, left: 20, right: 20, borderRadius: 30, overflow: 'hidden' },
  glassWrapperBottomFull: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%', borderTopLeftRadius: 36, borderTopRightRadius: 36, overflow: 'hidden' },
  glassWrapperTop: { position: 'absolute', top: 50, left: 20, right: 20, borderRadius: 24, overflow: 'hidden' },
  
  glassPanelBottom: { padding: 25, backgroundColor: 'rgba(255, 255, 255, 0.5)' },
  glassPanelBottomFull: { padding: 30, backgroundColor: 'rgba(255, 255, 255, 0.6)', flex: 1 },
  glassPanelTop: { padding: 25, backgroundColor: 'rgba(44, 58, 41, 0.7)' },
  
  panelTitle: { fontFamily: Typography.heading, fontSize: 26, color: Colors.text, marginBottom: 20 },
  panelTitleDark: { fontFamily: Typography.heading, fontSize: 22, color: '#fff', marginBottom: 5 },
  panelSubDark: { fontFamily: Typography.body, fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 20 },
  input: { fontFamily: Typography.body, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 16, padding: 16, marginBottom: 15, fontSize: 15, color: Colors.text },
  
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

  pinBase: { borderWidth: 2, borderColor: '#fff' },
  pinPublic: { width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.accent },
  pinPrivate: { width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(94, 113, 83, 0.25)', borderWidth: 1, borderColor: Colors.primary },
  pinDraft: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.primary, elevation: 10, borderWidth: 3, borderColor: '#fff' },
  pinExternal: { backgroundColor: '#8B9C82' } 
});
