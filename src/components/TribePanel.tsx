import { format } from 'date-fns';
import React, { useState } from 'react';
import { styles } from './MapStyles';
import { View, Text, Image, TouchableOpacity, StyleSheet, TextInput, ScrollView, Platform, Alert, Share } from 'react-native';
import { BlurView } from 'expo-blur';
import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography } from '../theme';
import { SPIRIT_ASSETS, renderMoons } from '../utils/assets';

export const TribePanel = (props: any) => {
  const { selectedTribe, setSelectedTribe, user, applyToTribe, leaveTribe, showManagement, setShowManagement, announcementText, setAnnouncementText, postAnnouncement, acceptApplicant, rejectApplicant, removeMember, deleteTribe, updateTribe, promoteMember, demoteMember, events, setMode, setSelectedEvent, setDraft, draft, setProfileViewUid, renderManagementOverlay } = props;
  
    if (!selectedTribe) return null;
    const isChief = selectedTribe.creatorId === user?.uid;
    const isLeader =
      isChief || (selectedTribe.leaders || []).includes(user?.uid || "");
    const isMember = selectedTribe.members.includes(user?.uid || "");
    const hasApplied = selectedTribe.pendingApplicants.includes(
      user?.uid || "",
    );
    const tribeEvents = events
      .filter((e: any) => e.tribeId === selectedTribe.id)
      .sort((a: any, b: any) => a.time.getTime() - b.time.getTime());
    const spiritKey = (selectedTribe.spiritId || "forest") as string;

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Dark forest backdrop */}
        <View
          style={
            {
              ...StyleSheet.absoluteFillObject,
              backgroundColor: "rgba(14, 22, 12, 0.98)",
            } as any
          }
        />

        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingTop: 50,
            paddingBottom: 16,
            borderBottomWidth: 1,
            borderBottomColor: "rgba(255,255,255,0.06)",
          }}
        >
          <TouchableOpacity
            onPress={() => {
              setSelectedTribe(null);
              setShowManagement(false);
              setMode("map");
            }}
            style={{ padding: 10, marginRight: 6 }}
          >
            <Feather
              name="arrow-left"
              size={24}
              color="rgba(255,255,255,0.8)"
            />
          </TouchableOpacity>
          <Text
            style={{
              fontFamily: Typography.heading,
              fontSize: 22,
              color: "#fff",
              flex: 1,
            }}
            numberOfLines={1}
          >
            {selectedTribe.name}
          </Text>
          {isLeader && (
            <TouchableOpacity
              onPress={() => setShowManagement(true)}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: Colors.goldDim,
                borderWidth: 1,
                borderColor: Colors.goldBorder,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Feather name="shield" size={18} color={Colors.gold} />
            </TouchableOpacity>
          )}
        </View>

        {/* Spirit + Bonfire Hero */}
        <View
          style={{
            marginHorizontal: 16,
            marginTop: 16,
            marginBottom: 6,
            backgroundColor: Colors.glassCardBg,
            borderRadius: 24,
            flexDirection: "row",
            alignItems: "stretch",
            borderWidth: 1,
            borderColor: Colors.glassCardBorder,
            overflow: "hidden",
            minHeight: 180,
          }}
        >
          {/* Left panel: spirit + campfire, fixed size */}
          <View style={{ width: 200, height: 180, position: "relative" }}>
            {/* Spirit: bottom-aligned, contain preserves ratio — shorter spirits leave space above */}
            <Image
              source={SPIRIT_ASSETS[spiritKey] || SPIRIT_ASSETS.forest}
              style={{ position: "absolute", bottom: 0, left: 0, width: 130, height: 170, resizeMode: "contain" } as any}
            />
            {/* Campfire: centered between spirit and text edge */}
            <Image
              source={require("../assets/bonfire.png")}
              style={
                {
                  position: "absolute",
                  bottom: 10,
                  right: 10,
                  width: 70,
                  height: 70,
                  resizeMode: "contain",
                  overflow: "visible",
                  filter: "drop-shadow(0 0 14px rgba(255,140,0,0.8))",
                } as any
              }
            />
          </View>
          <View style={{ flex: 1, padding: 18, justifyContent: "center" }}>
            <Text
              style={{
                fontFamily: Typography.headline,
                fontSize: 19,
                color: Colors.textPrimary,
                marginBottom: 6,
                letterSpacing: -0.2,
              }}
              numberOfLines={1}
            >
              {selectedTribe.name}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 }}>
              <Feather name="users" size={11} color={Colors.gold} />
              <Text
                style={{
                  fontFamily: Typography.bodyLight,
                  fontSize: 11,
                  color: Colors.gold,
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                }}
              >
                {selectedTribe.members.length} Tribesmen
              </Text>
            </View>
            <Text
              style={{
                fontFamily: Typography.bodyLight,
                color: Colors.textSecondary,
                fontSize: 12,
                lineHeight: 17,
              }}
              numberOfLines={3}
            >
              {selectedTribe.description}
            </Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>
          {/* Member Actions */}
          {!isMember && !hasApplied && (
            <TouchableOpacity
              style={{
                backgroundColor: Colors.glassBtnBg,
                height: 56,
                borderRadius: 9999,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
                borderWidth: 1,
                borderColor: Colors.gold,
              }}
              onPress={async () => {
                await applyToTribe(selectedTribe.id);
                if (Platform.OS === 'web') {
                  if (typeof window !== 'undefined') window.alert("Your smoke signal was sent to the chief!");
                } else {
                  Alert.alert('', 'Your smoke signal was sent to the chief!');
                }
              }}
            >
              <Text style={{ fontFamily: Typography.bodyBold, color: Colors.textPrimary, fontSize: 15, letterSpacing: 0.2 }}>
                Apply to Join
              </Text>
            </TouchableOpacity>
          )}
          {!isMember && hasApplied && (
            <View
              style={{
                backgroundColor: "rgba(255,255,255,0.07)",
                paddingVertical: 15,
                borderRadius: 16,
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  fontFamily: Typography.bodyBold,
                  color: "rgba(255,255,255,0.4)",
                  fontSize: 15,
                }}
              >
                Application Pending…
              </Text>
            </View>
          )}
          {isMember && (
            <TouchableOpacity
              style={{
                backgroundColor: Colors.glassBtnBg,
                height: 56,
                borderRadius: 9999,
                alignItems: "center",
                marginBottom: 12,
                flexDirection: "row",
                justifyContent: "center",
                gap: 8,
                borderWidth: 1,
                borderColor: Colors.gold,
              }}
              onPress={async () => {
                if (Platform.OS === 'web') {
                  try {
                    const l = `${window.location.origin}/?invite=${selectedTribe.id}`;
                    await navigator.clipboard.writeText(l);
                    if (typeof window !== 'undefined') window.alert("Invite link copied to clipboard!");
                  } catch {
                    if (typeof window !== 'undefined') window.alert("Failed to copy link");
                  }
                } else {
                  try {
                    await Share.share({
                      message: `Join my tribe "${selectedTribe.name}" on Tribes! Code: ${selectedTribe.id}`,
                      title: `Join ${selectedTribe.name}`,
                    });
                  } catch { /* user dismissed share sheet */ }
                }
              }}
            >
              <Feather name="link" size={16} color={Colors.textPrimary} />
              <Text style={{ fontFamily: Typography.bodyBold, color: Colors.textPrimary, fontSize: 15, letterSpacing: 0.2 }}>
                Copy Invite Link
              </Text>
            </TouchableOpacity>
          )}
          {isMember && !isChief && (
            <TouchableOpacity
              style={{
                backgroundColor: Colors.dangerSoft,
                height: 56,
                borderRadius: 9999,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
                borderWidth: 1,
                borderColor: Colors.dangerBorder,
              }}
              onPress={() =>
                Alert.alert("Leave Tribe", "Are you sure?", [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Leave",
                    style: "destructive",
                    onPress: async () => {
                      await leaveTribe(selectedTribe.id);
                      setSelectedTribe(null);
                    },
                  },
                ])
              }
            >
              <Text style={{ fontFamily: Typography.bodyBold, color: Colors.danger, fontSize: 15 }}>
                Leave Tribe
              </Text>
            </TouchableOpacity>
          )}

          {/* Campfire — Announcements */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 10, marginTop: 8, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: Colors.hairline }}>
            <View style={{ width: 3, height: 18, borderRadius: 2, backgroundColor: Colors.gold }} />
            <Feather name="zap" size={14} color={Colors.gold} />
            <Text
              style={{
                fontFamily: Typography.headline,
                fontSize: 15,
                color: Colors.textPrimary,
                letterSpacing: 0.2,
              }}
            >
              Campfire
            </Text>
          </View>
          {selectedTribe.announcements.length === 0 ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20, paddingVertical: 6 }}>
              <Feather name="wind" size={13} color={Colors.textMuted} />
              <Text
                style={{
                  fontFamily: Typography.bodyLight,
                  fontStyle: "italic",
                  color: Colors.textMuted,
                  fontSize: 13,
                }}
              >
                No signals from the fire yet.
              </Text>
            </View>
          ) : (
            <View style={{ marginBottom: 20 }}>
              {selectedTribe.announcements
                .slice()
                .reverse()
                .map((ann: any, i: any) => (
                  <View
                    key={i}
                    style={{
                      backgroundColor: Colors.glassCardBg,
                      padding: 14,
                      borderRadius: 14,
                      marginBottom: 8,
                      borderWidth: 1,
                      borderColor: Colors.glassCardBorder,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: Typography.body,
                        color: "rgba(255,255,255,0.82)",
                        fontSize: 14,
                        lineHeight: 21,
                      }}
                    >
                      {ann.text}
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        marginTop: 8,
                        paddingTop: 8,
                        borderTopWidth: 1,
                        borderTopColor: "rgba(255,255,255,0.06)",
                      }}
                    >
                      <TouchableOpacity onPress={() => setProfileViewUid(ann.authorId)}>
                        <Text
                          style={{
                            fontFamily: Typography.bodyMedium,
                            fontSize: 11,
                            color: Colors.gold,
                            letterSpacing: 0.3,
                          }}
                        >
                          {ann.authorName}
                        </Text>
                      </TouchableOpacity>
                      <Text
                        style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}
                      >
                        {format(ann.createdAt, "MMM d, HH:mm")}
                      </Text>
                    </View>
                  </View>
                ))}
            </View>
          )}

          {/* Gatherings — Events */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
              paddingBottom: 10,
              borderBottomWidth: 1,
              borderBottomColor: Colors.hairline,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
              <View style={{ width: 3, height: 18, borderRadius: 2, backgroundColor: Colors.gold }} />
              <Feather name="calendar" size={14} color={Colors.gold} />
              <Text
                style={{
                  fontFamily: Typography.headline,
                  fontSize: 15,
                  color: Colors.textPrimary,
                  letterSpacing: 0.2,
                }}
              >
                Gatherings
              </Text>
            </View>
            {isLeader && (
              <TouchableOpacity
                onPress={() => {
                  setDraft({
                    ...draft,
                    tribeId: selectedTribe.id,
                    categoryId: selectedTribe.categoryId as any,
                  });
                  setMode("wizard_details");
                }}
                style={{
                  backgroundColor: Colors.glassBtnBg,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 9999,
                  borderWidth: 1,
                  borderColor: Colors.gold,
                }}
              >
                <Text
                  style={{
                    fontFamily: Typography.bodyMedium,
                    color: Colors.gold,
                    fontSize: 12,
                    letterSpacing: 0.2,
                  }}
                >
                  + New
                </Text>
              </TouchableOpacity>
            )}
          </View>
          {tribeEvents.length === 0 ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20, paddingVertical: 6 }}>
              <Feather name="moon" size={13} color={Colors.textMuted} />
              <Text
                style={{
                  fontFamily: Typography.bodyLight,
                  fontStyle: "italic",
                  color: Colors.textMuted,
                  fontSize: 13,
                }}
              >
                The land is still. No gatherings planned.
              </Text>
            </View>
          ) : (
            tribeEvents.map((e: any) => (
              <TouchableOpacity
                key={e.id}
                onPress={() => {
                  setSelectedEvent(e);
                  setMode("event_chat");
                }}
                style={{
                  backgroundColor: Colors.glassCardBg,
                  padding: 14,
                  borderRadius: 14,
                  marginBottom: 10,
                  borderWidth: 1,
                  borderColor: Colors.glassCardBorder,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: Typography.heading,
                      fontSize: 14,
                      color: "#fff",
                      flex: 1,
                    }}
                  >
                    {e.title}
                  </Text>
                  {e.cyclicalRule && (
                    <View
                      style={{
                        backgroundColor: Colors.goldDim,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 9999,
                        borderWidth: 1,
                        borderColor: Colors.goldBorder,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: Typography.bodyLight,
                          color: Colors.gold,
                          fontSize: 10,
                          letterSpacing: 0.8,
                        }}
                      >
                        {e.cyclicalRule.toUpperCase()}
                      </Text>
                    </View>
                  )}
                  {e.status === "finalized" && (
                    <View
                      style={{
                        backgroundColor: Colors.glassCardBg,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 9999,
                        marginLeft: 4,
                        borderWidth: 1,
                        borderColor: Colors.hairlineNeutral,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: Typography.bodyLight,
                          color: Colors.textMuted,
                          fontSize: 10,
                          letterSpacing: 0.8,
                        }}
                      >
                        DONE
                      </Text>
                    </View>
                  )}
                </View>
                <Text
                  style={{
                    color: Colors.textSecondary,
                    marginTop: 5,
                    fontFamily: Typography.bodyLight,
                    fontSize: 12,
                  }}
                >
                  {format(e.time, "EEEE, MMM d · h:mm a")}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        {/* Management overlay (leader only) */}
        {showManagement && renderManagementOverlay()}
      </View>
    );
};
