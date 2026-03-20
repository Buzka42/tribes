import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform } from 'react-native';
import { TribeVent } from '../hooks/useEvents';
import { Colors, Typography } from '../theme';
import { format } from 'date-fns';

interface Props {
  event: TribeVent | null;
  onClose: () => void;
  onJoin: (eventId: string) => void;
  currentUserId?: string;
  isJoining?: boolean;
}

export default function EventModal({ event, onClose, onJoin, currentUserId, isJoining }: Props) {
  if (!event) return null;

  const isHost = event.creatorId === currentUserId;
  const hasJoined = event.participants?.includes(currentUserId || '');
  const isExternal = event.isExternal;

  return (
    <Modal visible={!!event} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.card}>
          <Text style={styles.interestTag}>{event.interest.toUpperCase()}</Text>
          <Text style={styles.title}>{event.title}</Text>
          
          <View style={styles.detailsBox}>
             <Text style={styles.detailText}>🗓️ {format(event.time, 'MMM do, yyyy - h:mm a')}</Text>
             <Text style={styles.detailText}>📍 {event.location.address || "Precise Map Location Pinned"}</Text>
             <Text style={styles.detailText}>👥 {event.participants?.length || 1} / {event.participantLimit} members attending</Text>
             <Text style={styles.detailText}>🔒 {event.isPrivate ? "Private Zone (500m fuzzy radius)" : "Public Verification"}</Text>
          </View>
          
          <Text style={styles.desc}>Join the tribe and meet amazing people pursuing the same passions. {isExternal ? "This is a free external public event beautifully fetched by AI." : "The 1 🍃 cost guarantees commitment and high-quality genuine groups, 100% refundable upon attendance."}</Text>

          <View style={styles.actionRow}>
            {isExternal ? (
              <TouchableOpacity style={styles.btnExternal} onPress={onClose}>
                <Text style={styles.btnText}>Open Externally 🌍</Text>
              </TouchableOpacity>
            ) : isHost ? (
              <View style={styles.hostBadge}>
                <Text style={styles.hostBadgeText}>You are Host 👑</Text>
              </View>
            ) : hasJoined ? (
              <View style={styles.joinedBadge}>
                <Text style={styles.joinedBadgeText}>You have joined! 🎉</Text>
              </View>
            ) : (
              <TouchableOpacity style={[styles.btnPrimary, isJoining && {opacity: 0.6}]} disabled={isJoining} onPress={() => onJoin(event.id)}>
                <Text style={styles.btnText}>{isJoining ? "Joining..." : "Join for 1 🍃"}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.btnSecondary} onPress={onClose}>
               <Text style={styles.btnSecondaryText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(44, 58, 41, 0.4)', justifyContent: 'flex-end' },
  card: { backgroundColor: Colors.background, padding: 25, borderTopLeftRadius: 36, borderTopRightRadius: 36, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 30, elevation: 20 },
  interestTag: { fontFamily: Typography.bodyBold, fontSize: 12, color: Colors.accent, letterSpacing: 1.5, marginBottom: 8 },
  title: { fontFamily: Typography.heading, fontSize: 32, color: Colors.text, marginBottom: 20 },
  detailsBox: { backgroundColor: '#fff', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#F0EFEA', marginBottom: 20, gap: 12 },
  detailText: { fontFamily: Typography.body, fontSize: 14, color: Colors.textLight },
  desc: { fontFamily: Typography.body, fontSize: 14, color: Colors.text, lineHeight: 22, marginBottom: 30, opacity: 0.85 },
  actionRow: { flexDirection: 'row', gap: 12 },
  hostBadge: { flex: 1, backgroundColor: '#E8E8E8', justifyContent: 'center', alignItems: 'center', borderRadius: 18 },
  hostBadgeText: { fontFamily: Typography.bodyBold, color: '#888' },
  joinedBadge: { flex: 1, backgroundColor: '#D4E6D4', justifyContent: 'center', alignItems: 'center', borderRadius: 18 },
  joinedBadgeText: { fontFamily: Typography.bodyBold, color: Colors.primaryDark },
  btnPrimary: { flex: 1, backgroundColor: Colors.primary, paddingVertical: 18, borderRadius: 18, alignItems: 'center', shadowColor: Colors.primary, shadowOpacity: 0.35, shadowRadius: 15, elevation: 5 },
  btnExternal: { flex: 1, backgroundColor: '#9b59b6', paddingVertical: 18, borderRadius: 18, alignItems: 'center' },
  btnText: { fontFamily: Typography.bodyBold, color: '#fff', fontSize: 16 },
  btnSecondary: { paddingHorizontal: 25, paddingVertical: 18, backgroundColor: '#EBEBEB', borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  btnSecondaryText: { fontFamily: Typography.bodySemibold, color: Colors.text, fontSize: 16 }
});
