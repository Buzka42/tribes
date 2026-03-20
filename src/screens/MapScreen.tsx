import React, { useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import Mapbox from '@rnmapbox/maps';

import { useAuth } from '../hooks/useAuth';
import { useEvents, TribeVent } from '../hooks/useEvents';
import { auth } from '../config/firebase';
import { signOut } from 'firebase/auth';
import { Colors, Typography } from '../theme';

Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_KEY || '');

export default function MapScreen() {
  const { user } = useAuth();
  const { events, joinEvent, createEvent } = useEvents();
  
  const [mode, setMode] = useState<'map' | 'wizard_details' | 'wizard_location' | 'event_chat'>('map');
  const [draft, setDraft] = useState({ title: '', interest: '', isPrivate: false, limit: '10', location: null as any, address: '' });
  const [selectedEvent, setSelectedEvent] = useState<TribeVent | null>(null);
  const [dateFilter, setDateFilter] = useState('All');

  const joinedEvents = events.filter(e => e.participants?.includes(user?.uid || ''));

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
        address: draft.address || "Pinned carefully"
      });
      setMode('map');
      setDraft({ title: '', interest: '', isPrivate: false, limit: '10', location: null, address: '' });
      Alert.alert("Tribe Assembled", "Your event is live. 5 🍃 were locked.");
    } catch(err: any) { Alert.alert("Error", err.message); }
  };

  const handleJoin = async () => {
    if(!selectedEvent) return;
    try {
      await joinEvent(selectedEvent.id);
      Alert.alert("Joined", "You've successfully secured a spot. Chat unlocked.");
    } catch(e:any) { Alert.alert("Error", e.message); }
  };

  const renderHUD = () => {
    if (mode !== 'map') return null;
    return (
      <>
        {/* Top Right Settings */}
        <TouchableOpacity style={styles.settingsBtn} onPress={() => signOut(auth)}>
          <Text style={{fontSize: 16}}>⚙️</Text>
        </TouchableOpacity>

        {/* Top Left Base */}
        <View style={styles.topLeft}>
          <View style={styles.balancePill}>
            <Text style={styles.balanceText}>{user?.tokens} 🍃</Text>
          </View>
          <View style={styles.upcomingRow}>
            <TouchableOpacity style={styles.plusBtn} onPress={() => setMode('wizard_details')}>
              <Text style={styles.plusBtnText}>+</Text>
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

        {/* Bottom Filters */}
        <View style={styles.bottomBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
            {['All', 'Today', 'Tomorrow', 'Weekend', 'Next Week'].map(d => (
              <TouchableOpacity key={d} onPress={() => setDateFilter(d)} style={[styles.datePill, dateFilter === d && styles.datePillActive]}>
                <Text style={[styles.datePillText, dateFilter === d && styles.datePillTextActive]}>{d}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.filterBtn}>
            <Text style={styles.filterBtnText}>Filters</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  };

  const renderWizardDetails = () => (
    <View style={styles.glassPanelBottom}>
      <Text style={styles.panelTitle}>Design your tribe's event</Text>
      <TextInput style={styles.input} placeholder="Title (e.g. Morning Run)" placeholderTextColor="#999" value={draft.title} onChangeText={(t) => setDraft({...draft, title: t})} />
      <TextInput style={styles.input} placeholder="Category (e.g. Sports)" placeholderTextColor="#999" value={draft.interest} onChangeText={(t) => setDraft({...draft, interest: t})} />
      <View style={{flexDirection: 'row', gap: 10, justifyContent: 'flex-end'}}>
        <TouchableOpacity style={styles.btnSecondary} onPress={() => setMode('map')}><Text style={styles.btnSecondaryText}>Cancel</Text></TouchableOpacity>
        <TouchableOpacity style={styles.btnPrimary} onPress={() => setMode('wizard_location')}><Text style={styles.btnPrimaryText}>Set Path 📍</Text></TouchableOpacity>
      </View>
    </View>
  );

  const renderWizardLocation = () => (
    <View style={styles.glassPanelTop}>
      <Text style={styles.panelTitleDark}>Drop the pin exactly where</Text>
      <Text style={styles.panelSub}>Tap anywhere on the map to anchor coordinates.</Text>
      {draft.location && (
        <View style={styles.row}>
           <TouchableOpacity style={styles.btnSecondary} onPress={() => setMode('wizard_details')}><Text style={styles.btnSecondaryText}>Back</Text></TouchableOpacity>
           <TouchableOpacity style={styles.btnPrimary} onPress={handleCreate}><Text style={styles.btnPrimaryText}>Lock 5 🍃 & Finalize</Text></TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderEventChat = () => {
    if(!selectedEvent) return null;
    const isJoined = selectedEvent.participants.includes(user?.uid || '');
    const isHost = selectedEvent.creatorId === user?.uid;

    return (
      <View style={styles.glassPanelBottomFull}>
        <View style={styles.chatHeader}>
           <View>
              <Text style={styles.chatTitle}>{selectedEvent.title}</Text>
              <Text style={styles.chatSub}>{selectedEvent.participants.length} / {selectedEvent.participantLimit} Attending</Text>
           </View>
           <TouchableOpacity onPress={() => { setSelectedEvent(null); setMode('map'); }}><Text style={styles.closeIcon}>✖</Text></TouchableOpacity>
        </View>
        
        {!isJoined && !isHost ? (
          <View style={styles.chatLocked}>
            <Text style={styles.chatLockedIco}>💬</Text>
            <Text style={styles.chatLockedTitle}>Tribal Chat is Locked</Text>
            <Text style={styles.chatLockedSub}>Commit 1 🍃 to join the event and open communications with this tribe.</Text>
            <TouchableOpacity style={styles.btnPrimaryFull} onPress={handleJoin}><Text style={styles.btnPrimaryText}>Join Tribe (1 🍃)</Text></TouchableOpacity>
          </View>
        ) : (
          <View style={styles.chatOpen}>
            <ScrollView style={styles.chatScroll}>
               <View style={styles.chatBubble}><Text style={styles.chatText}>Welcome to the tribe! See you there.</Text></View>
            </ScrollView>
            <View style={styles.chatInputRow}>
               <TextInput style={styles.chatInput} placeholder="Send a scroll..." placeholderTextColor="#bbb" />
               <TouchableOpacity style={styles.btnPrimary}><Text style={styles.btnPrimaryText}>Send</Text></TouchableOpacity>
            </View>
          </View>
        )}
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
      {mode === 'wizard_details' && renderWizardDetails()}
      {mode === 'wizard_location' && renderWizardLocation()}
      {mode === 'event_chat' && renderEventChat()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  map: { flex: 1 },
  settingsBtn: { position: 'absolute', top: 50, right: 20, backgroundColor: Colors.glassBg, padding: 12, borderRadius: 50, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, borderWidth: 1, borderColor: Colors.glassBorder, elevation: 5 },
  
  topLeft: { position: 'absolute', top: 50, left: 20 },
  balancePill: { backgroundColor: Colors.glassBg, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, alignSelf: 'flex-start', marginBottom: 12, borderWidth: 1, borderColor: Colors.glassBorder, elevation: 5 },
  balanceText: { fontFamily: Typography.bodyBold, color: Colors.primary, fontSize: 13 },
  upcomingRow: { flexDirection: 'row', alignItems: 'center' },
  plusBtn: { width: 52, height: 52, backgroundColor: Colors.primary, borderRadius: 26, justifyContent: 'center', alignItems: 'center', shadowColor: Colors.primaryDark, shadowOpacity: 0.3, shadowRadius: 15, elevation: 5 },
  plusBtnText: { color: '#fff', fontSize: 30, fontWeight: '300', marginTop: -2 },
  upcomingScroll: { marginLeft: 15, paddingRight: 20, maxWidth: 200 },
  upcomingIcon: { width: 44, height: 44, backgroundColor: Colors.surface, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 10, borderWidth: 1, borderColor: '#eee', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  upcomingInitial: { fontFamily: Typography.bodyBold, color: Colors.text, fontSize: 16 },

  bottomBar: { position: 'absolute', bottom: 50, left: 20, right: 20, flexDirection: 'row', alignItems: 'center' },
  dateScroll: { flex: 1, marginRight: 15 },
  datePill: { backgroundColor: Colors.glassBg, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 24, marginRight: 10, borderWidth: 1, borderColor: Colors.glassBorder, elevation: 5 },
  datePillActive: { backgroundColor: Colors.text, borderColor: Colors.text },
  datePillText: { fontFamily: Typography.bodySemibold, color: Colors.textLight, fontSize: 14 },
  datePillTextActive: { color: '#fff' },
  filterBtn: { backgroundColor: Colors.surface, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5, borderWidth: 1, borderColor: '#eee' },
  filterBtnText: { fontFamily: Typography.bodyBold, color: Colors.text, fontSize: 14 },

  glassPanelBottom: { position: 'absolute', bottom: 50, left: 20, right: 20, backgroundColor: Colors.surface, padding: 25, borderRadius: 30, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 30, elevation: 15, borderWidth: 1, borderColor: '#eee' },
  glassPanelBottomFull: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%', backgroundColor: Colors.surface, padding: 30, borderTopLeftRadius: 36, borderTopRightRadius: 36, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 30, elevation: 20 },
  glassPanelTop: { position: 'absolute', top: 50, left: 20, right: 20, backgroundColor: Colors.text, padding: 25, borderRadius: 24, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, elevation: 15 },
  
  panelTitle: { fontFamily: Typography.heading, fontSize: 26, color: Colors.text, marginBottom: 20 },
  panelTitleDark: { fontFamily: Typography.heading, fontSize: 22, color: '#fff', marginBottom: 5 },
  panelSub: { fontFamily: Typography.body, fontSize: 14, color: '#ccc', marginBottom: 20 },
  input: { fontFamily: Typography.bodySemibold, borderWidth: 1, borderColor: '#E8E8E8', backgroundColor: '#FAFAFA', borderRadius: 16, padding: 18, marginBottom: 15, fontSize: 15, color: Colors.text },
  
  row: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  btnPrimary: { backgroundColor: Colors.primary, paddingHorizontal: 25, paddingVertical: 14, borderRadius: 16, elevation: 2 },
  btnPrimaryFull: { backgroundColor: Colors.primary, paddingVertical: 18, borderRadius: 16, alignItems: 'center', width: '100%', marginTop: 25, elevation: 2 },
  btnPrimaryText: { fontFamily: Typography.bodyBold, color: '#fff', fontSize: 15 },
  btnSecondary: { backgroundColor: 'transparent', paddingHorizontal: 15, paddingVertical: 14 },
  btnSecondaryText: { fontFamily: Typography.bodyBold, color: '#aaa', fontSize: 15 },

  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 18, marginBottom: 15 },
  chatTitle: { fontFamily: Typography.heading, fontSize: 26, color: Colors.text },
  chatSub: { fontFamily: Typography.body, fontSize: 13, color: Colors.textLight, marginTop: 4 },
  closeIcon: { fontSize: 24, color: '#ccc', paddingHorizontal: 5 },
  
  chatLocked: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  chatLockedIco: { fontSize: 45, marginBottom: 20 },
  chatLockedTitle: { fontFamily: Typography.heading, fontSize: 26, color: Colors.text, marginBottom: 12, textAlign: 'center' },
  chatLockedSub: { fontFamily: Typography.body, fontSize: 15, color: Colors.textLight, textAlign: 'center', lineHeight: 22 },

  chatOpen: { flex: 1 },
  chatScroll: { flex: 1 },
  chatBubble: { backgroundColor: '#F3F4F2', padding: 18, borderRadius: 20, alignSelf: 'flex-start', borderBottomLeftRadius: 5 },
  chatText: { fontFamily: Typography.body, color: Colors.text, fontSize: 14 },
  chatInputRow: { flexDirection: 'row', gap: 10, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#eee' },
  chatInput: { flex: 1, fontFamily: Typography.body, backgroundColor: '#FAFAFA', borderRadius: 20, paddingHorizontal: 20, borderWidth: 1, borderColor: '#eee' },

  pinBase: { borderWidth: 2, borderColor: '#fff' },
  pinPublic: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.accent },
  pinPrivate: { width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(94, 113, 83, 0.25)', borderWidth: 1, borderColor: Colors.primary },
  pinDraft: { width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.primary, elevation: 10 },
  pinExternal: { backgroundColor: '#8B9C82' } 
});
