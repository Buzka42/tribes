import { format } from 'date-fns';
import React, { useState } from 'react';
import { styles } from './MapStyles';
import { View, Text, Image, TouchableOpacity, StyleSheet, TextInput, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { BlurView } from 'expo-blur';
import { Feather, FontAwesome, Ionicons } from '@expo/vector-icons';
import { Colors, Typography } from '../theme';
import { renderMoons, SPIRIT_ASSETS } from '../utils/assets';

export const EventChat = (props: any) => {
  const { selectedEvent, setSelectedEvent, setMode, user, events, joinEvent, leaveEvent, deleteEvent, finalizeEvent, finalizeChecked, setFinalizeChecked, submitFeedback, feedbackAnswer, setFeedbackAnswer, feedbackSubmitted, setFeedbackSubmitted, getUserFeedback, userFeedbackCache, setUserFeedbackCache, creatorStatsCache, setCreatorStatsCache, participantNamesCache, setParticipantNamesCache, getParticipantNames, tribes, setProfileViewUid, setSelectedTribe, handleJoin, setFormTribeChecked, formTribeChecked, setWizardDraft, setWizardStep } = props;
  
    if (!selectedEvent) return null;
    const isJoined = selectedEvent.participants.includes(user?.uid || "");
    const isHost = selectedEvent.creatorId === user?.uid;
    const isPastEvent =
      selectedEvent.time && new Date(selectedEvent.time) <= new Date();
    const isFinalized =
      selectedEvent.status === "finalized" ||
      selectedEvent.status === "cancelled";
    const creatorStats = creatorStatsCache[selectedEvent.creatorId] || {
      name: "Unknown",
      ratingSum: 0,
      ratingCount: 0,
    };
    const myFeedback = userFeedbackCache[selectedEvent.id];
    const isPrivateTribe = selectedEvent.isTribePrivate;
    const tribeInfo = selectedEvent.tribeId
      ? tribes.find((t: any) => t.id === selectedEvent.tribeId)
      : null;

    return (
      <KeyboardAvoidingView
        style={styles.glassWrapperBottomFull}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <BlurView
          intensity={90}
          tint="dark"
          style={styles.glassPanelBottomFull}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              marginBottom: 16,
            }}
          >
            <View style={{ flex: 1 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 6,
                  flexWrap: "wrap",
                  gap: 6,
                }}
              >
                <Text
                  style={{
                    fontFamily: Typography.heading,
                    fontSize: 24,
                    color: Colors.text,
                    marginRight: 6,
                  }}
                  numberOfLines={1}
                >
                  {selectedEvent.title}
                </Text>
                {isPrivateTribe && (
                  <View
                    style={{
                      backgroundColor: "rgba(0,0,0,0.8)",
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 12,
                    }}
                  >
                    <Text
                      style={{
                        color: "#fff",
                        fontSize: 10,
                        fontWeight: "bold",
                      }}
                    >
                      PRIVATE TRIBE
                    </Text>
                  </View>
                )}
                {isFinalized && (
                  <View
                    style={{
                      backgroundColor:
                        selectedEvent.status === "cancelled"
                          ? Colors.danger
                          : Colors.primary,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 12,
                    }}
                  >
                    <Text
                      style={{
                        color: "#fff",
                        fontSize: 10,
                        fontWeight: "bold",
                      }}
                    >
                      {selectedEvent.status?.toUpperCase() || ""}
                    </Text>
                  </View>
                )}
              </View>
              <Text
                style={{
                  fontFamily: Typography.body,
                  fontSize: 13,
                  color: Colors.textLight,
                }}
              >
                {selectedEvent.participants.length} /{" "}
                {selectedEvent.participantLimit} Attending •{" "}
                {selectedEvent.time
                  ? format(new Date(selectedEvent.time), "MMM d, h:mm a")
                  : "TBD"}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
                <Text style={{ fontFamily: Typography.bodySemibold, fontSize: 13, color: Colors.text }}>
                  Host:{" "}
                </Text>
                <TouchableOpacity onPress={() => setProfileViewUid(selectedEvent.creatorId)}>
                  <Text
                    style={{
                      fontFamily: Typography.bodySemibold,
                      fontSize: 13,
                      color: Colors.text,
                      textDecorationLine: "underline",
                    }}
                  >
                    {creatorStats.name || "Unknown"}
                  </Text>
                </TouchableOpacity>
                <Text style={{ fontSize: 13, marginLeft: 8 }}>
                  {renderMoons(creatorStats.ratingSum, creatorStats.ratingCount)}
                </Text>
              </View>
              {tribeInfo && !isPrivateTribe && (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedTribe(tribeInfo);
                    setMode("map");
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginTop: 8,
                    backgroundColor: "rgba(140,179,105,0.15)",
                    alignSelf: "flex-start",
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: "rgba(140,179,105,0.3)",
                  }}
                >
                  <Image
                    source={SPIRIT_ASSETS[tribeInfo.spiritId || "forest"]}
                    style={{ width: 16, height: 16, marginRight: 6 }}
                  />
                  <Text
                    style={{
                      fontSize: 12,
                      color: Colors.gold,
                      fontFamily: Typography.bodySemibold,
                    }}
                  >
                    Hosted by {tribeInfo.name}
                  </Text>
                </TouchableOpacity>
              )}
              {selectedEvent.isPrivate && (isHost || isJoined) && (
                <TouchableOpacity
                  onPress={() => {
                    const link = `${window.location.origin}${window.location.pathname}?joinEvent=${selectedEvent.id}`;
                    navigator.clipboard?.writeText(link).then(() => {
                      window.alert("Invite link copied!");
                    }).catch(() => {
                      window.prompt("Copy this invite link:", link);
                    });
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    marginTop: 8,
                    backgroundColor: Colors.goldDim,
                    alignSelf: "flex-start",
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: Colors.goldBorder,
                  }}
                >
                  <Feather name="link" size={12} color={Colors.gold} />
                  <Text style={{ fontSize: 12, color: Colors.gold, fontFamily: Typography.bodySemibold }}>
                    Copy Invite Link
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            {isHost && !isFinalized && !isPastEvent && (
              <TouchableOpacity
                onPress={async () => {
                  if (selectedEvent.id === "tutorial-dummy") {
                    setSelectedEvent(null);
                    setMode("map");
                    return;
                  }
                  if (
                    window.confirm(
                      "Are you sure you want to cancel this event? 5 leaves will be refunded.",
                    )
                  ) {
                    try {
                      await deleteEvent(selectedEvent.id);
                      setSelectedEvent(null);
                      setMode("map");
                    } catch (e: any) {
                      alert("Error: " + e.message);
                    }
                  }
                }}
                style={{ padding: 8 }}
              >
                <Feather name="trash-2" size={20} color={Colors.danger} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => {
                setSelectedEvent(null);
                setMode("map");
              }}
              style={{ padding: 8 }}
            >
              <Feather name="x" size={22} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <Text
            style={{
              fontFamily: Typography.body,
              fontSize: 13,
              color: Colors.textLight,
              marginBottom: 12,
            }}
            numberOfLines={1}
          >
            📍 {selectedEvent.location.address || "Precise map location pinned"}
          </Text>

          {/* Content Area */}
          {!isJoined && !isHost ? (
            <View style={styles.chatLocked}>
              <Text style={styles.chatLockedIco}>💬</Text>
              <Text style={styles.chatLockedTitle}>Tribal Chat is Locked</Text>
              <Text style={styles.chatLockedSub}>
                Commit 1{" "}
                <Image
                  source={require("../assets/leaf.png")}
                  style={styles.inlineIcon}
                />{" "}
                to join this gathering.
              </Text>
              <TouchableOpacity
                style={[styles.btnPrimaryFull, isFinalized && { opacity: 0.5 }]}
                disabled={isFinalized}
                onPress={handleJoin}
              >
                <Text style={styles.btnPrimaryText}>
                  {isFinalized ? "Event Concluded" : "Join · 1 Leaf"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              <ScrollView
                style={styles.chatScroll}
                contentContainerStyle={{
                  paddingVertical: 10,
                  paddingBottom: 20,
                }}
              >
                <View style={styles.chatBubble}>
                  <Text style={styles.chatText}>
                    Welcome to the tribe! See you there.
                  </Text>
                </View>
              </ScrollView>

              {/* Finalize Mode for Host */}
              {isHost && isPastEvent && !isFinalized && (
                <View
                  style={{
                    backgroundColor: Colors.bgElevated,
                    borderRadius: 16,
                    padding: 16,
                    shadowColor: "#000",
                    shadowOpacity: 0.05,
                    shadowRadius: 10,
                    marginTop: 10,
                    borderWidth: 1,
                    borderColor: Colors.accent,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: Typography.heading,
                      fontSize: 16,
                      color: Colors.accent,
                      marginBottom: 8,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                      <Feather name="zap" size={14} color={Colors.gold} />
                      The Event Has Passed
                    </View>
                  </Text>
                  <Text
                    style={{
                      fontFamily: Typography.body,
                      fontSize: 13,
                      color: Colors.textLight,
                      marginBottom: 16,
                    }}
                  >
                    Mark who attended. You will receive your 5 leaves back if
                    you confirm it happened.
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 16,
                    }}
                  >
                    <TouchableOpacity
                      style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: feedbackAnswer.eventHappened === true ? Colors.goldDim : Colors.bgInput, alignItems: "center", borderWidth: 1, borderColor: feedbackAnswer.eventHappened === true ? Colors.goldBorder : Colors.hairline }}
                      onPress={() => setFeedbackAnswer({ ...feedbackAnswer, eventHappened: true })}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Feather name="thumbs-up" size={14} color={feedbackAnswer.eventHappened === true ? Colors.gold : Colors.textSecondary} />
                        <Text style={{ fontFamily: Typography.bodyBold, color: feedbackAnswer.eventHappened === true ? Colors.gold : Colors.textSecondary }}>
                          It Happened
                        </Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: feedbackAnswer.eventHappened === false ? Colors.dangerSoft : Colors.bgInput, alignItems: "center", borderWidth: 1, borderColor: feedbackAnswer.eventHappened === false ? Colors.dangerBorder : Colors.hairline }}
                      onPress={() => setFeedbackAnswer({ ...feedbackAnswer, eventHappened: false })}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Feather name="thumbs-down" size={14} color={feedbackAnswer.eventHappened === false ? Colors.danger : Colors.textSecondary} />
                        <Text style={{ fontFamily: Typography.bodyBold, color: feedbackAnswer.eventHappened === false ? Colors.danger : Colors.textSecondary }}>
                          Cancelled
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                  {feedbackAnswer.eventHappened &&
                    selectedEvent.participants.length > 1 && (
                      <View style={{ marginBottom: 16 }}>
                        <Text
                          style={{
                            fontFamily: Typography.bodySemibold,
                            color: Colors.textSecondary,
                            marginBottom: 8,
                          }}
                        >
                          Tick who showed up:
                        </Text>
                        {selectedEvent.participants
                          .filter((p: any) => p !== user.uid)
                          .map((p: any) => (
                            <TouchableOpacity
                              key={p}
                              onPress={() => {
                                setFinalizeChecked((prev: any) =>
                                  prev.includes(p)
                                    ? prev.filter((x: any) => x !== p)
                                    : [...prev, p],
                                );
                              }}
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                marginBottom: 8,
                              }}
                            >
                              <View
                                style={{
                                  width: 24,
                                  height: 24,
                                  borderRadius: 12,
                                  borderWidth: 2,
                                  borderColor: finalizeChecked.includes(p)
                                    ? Colors.primary
                                    : "#ddd",
                                  backgroundColor: finalizeChecked.includes(p)
                                    ? Colors.primary
                                    : "transparent",
                                  marginRight: 10,
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                {finalizeChecked.includes(p) && (
                                  <Feather
                                    name="check"
                                    size={14}
                                    color="#fff"
                                  />
                                )}
                              </View>
                              <Text
                                style={{
                                  fontFamily: Typography.body,
                                  color: Colors.textSecondary,
                                }}
                              >
                                {participantNamesCache[p] || p.substring(0, 8) + "…"}
                              </Text>
                            </TouchableOpacity>
                          ))}
                      </View>
                    )}
                  {feedbackAnswer.eventHappened && !selectedEvent.tribeId && (
                    <TouchableOpacity
                      onPress={() => setFormTribeChecked(!formTribeChecked)}
                      style={{ flexDirection: "row", alignItems: "center", marginBottom: 15 }}
                    >
                      <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: formTribeChecked ? Colors.gold : Colors.hairline, backgroundColor: formTribeChecked ? Colors.goldDim : "transparent", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                        {formTribeChecked && <Feather name="check" size={14} color="#fff" />}
                      </View>
                      <Text style={{ fontFamily: Typography.bodySemibold, color: Colors.text }}>
                        Form a permanent Tribe from these attendees
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    disabled={feedbackAnswer.eventHappened === undefined}
                    style={[
                      styles.btnPrimaryFull,
                      {
                        opacity:
                          feedbackAnswer.eventHappened !== undefined ? 1 : 0.5,
                        marginTop: 0,
                      },
                    ]}
                    onPress={async () => {
                      await finalizeEvent(
                        selectedEvent.id,
                        finalizeChecked,
                        feedbackAnswer.eventHappened!,
                      );
                      if (
                        feedbackAnswer.eventHappened &&
                        !selectedEvent.tribeId &&
                        formTribeChecked
                      ) {
                        setWizardDraft((prev: any) => ({
                          ...prev,
                          fromEventId: selectedEvent.id,
                          fromAttendees: [user.uid, ...finalizeChecked],
                        }));
                        setMode("create_tribe_wizard");
                        setWizardStep(1);
                      } else {
                        setSelectedEvent(null);
                        setMode("map");
                        alert("Event Finalized! Leaves refunded.");
                      }
                    }}
                  >
                    <Text style={styles.btnPrimaryText}>Lock & Finalize</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Feedback Mode for Participant */}
              {!isHost &&
                isJoined &&
                (isFinalized || isPastEvent) &&
                myFeedback === "none" &&
                !feedbackSubmitted[selectedEvent.id] && (
                  <View
                    style={{
                      backgroundColor: Colors.bgElevated,
                      borderRadius: 16,
                      padding: 16,
                      shadowColor: "#000",
                      shadowOpacity: 0.05,
                      shadowRadius: 10,
                      marginTop: 10,
                      borderWidth: 1,
                      borderColor: Colors.accent,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: Typography.heading,
                        fontSize: 16,
                        color: Colors.accent,
                        marginBottom: 8,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                        <Feather name="tag" size={14} color={Colors.gold} />
                        Claim Your Leaf Back
                      </View>
                    </Text>
                    <Text
                      style={{
                        fontFamily: Typography.body,
                        fontSize: 13,
                        color: Colors.textLight,
                        marginBottom: 16,
                      }}
                    >
                      Fill out this quick survey to immediately get your 1 leaf
                      back.
                    </Text>

                    <Text
                      style={{
                        fontFamily: Typography.bodySemibold,
                        color: Colors.textLight,
                        marginBottom: 8,
                      }}
                    >
                      Did the event actually happen?
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                        marginBottom: 16,
                      }}
                    >
                      <TouchableOpacity
                        style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: feedbackAnswer.eventHappened === true ? Colors.goldDim : Colors.bgInput, alignItems: "center", borderWidth: 1, borderColor: feedbackAnswer.eventHappened === true ? Colors.goldBorder : Colors.hairline }}
                        onPress={() => setFeedbackAnswer({ ...feedbackAnswer, eventHappened: true })}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Feather name="thumbs-up" size={14} color={feedbackAnswer.eventHappened === true ? Colors.gold : Colors.textSecondary} />
                          <Text style={{ fontFamily: Typography.bodyBold, color: feedbackAnswer.eventHappened === true ? Colors.gold : Colors.textSecondary }}>Yes</Text>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: feedbackAnswer.eventHappened === false ? Colors.dangerSoft : Colors.bgInput, alignItems: "center", borderWidth: 1, borderColor: feedbackAnswer.eventHappened === false ? Colors.dangerBorder : Colors.hairline }}
                        onPress={() => setFeedbackAnswer({ ...feedbackAnswer, eventHappened: false })}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Feather name="thumbs-down" size={14} color={feedbackAnswer.eventHappened === false ? Colors.danger : Colors.textSecondary} />
                          <Text style={{ fontFamily: Typography.bodyBold, color: feedbackAnswer.eventHappened === false ? Colors.danger : Colors.textSecondary }}>No</Text>
                        </View>
                      </TouchableOpacity>
                    </View>

                    {feedbackAnswer.eventHappened && (
                      <>
                        <Text
                          style={{
                            fontFamily: Typography.bodySemibold,
                            color: Colors.textLight,
                            marginBottom: 8,
                          }}
                        >
                          How would you rate the experience?
                        </Text>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                          {["🌑", "🌒", "🌓", "🌔", "🌕"].map((moon, index) => {
                            const ratingValue = index + 1;
                            const isSelected = feedbackAnswer.rating === ratingValue;
                            return (
                              <TouchableOpacity
                                key={ratingValue}
                                style={{
                                  padding: 10,
                                  borderRadius: 24,
                                  backgroundColor: isSelected ? Colors.goldDim : Colors.bgInput,
                                  borderWidth: 1,
                                  borderColor: isSelected ? Colors.goldBorder : Colors.hairline,
                                  alignItems: "center",
                                  justifyContent: "center",
                                  width: 48,
                                  height: 48
                                }}
                                onPress={() => setFeedbackAnswer({ ...feedbackAnswer, rating: ratingValue })}
                              >
                                <Text style={{ fontSize: 20 }}>{moon}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </>
                    )}

                    <TouchableOpacity
                      disabled={
                        feedbackAnswer.eventHappened === undefined ||
                        (feedbackAnswer.eventHappened &&
                          feedbackAnswer.rating === undefined)
                      }
                      style={[
                        styles.btnPrimaryFull,
                        {
                          opacity:
                            feedbackAnswer.eventHappened !== undefined &&
                            (!feedbackAnswer.eventHappened ||
                              feedbackAnswer.rating !== undefined)
                              ? 1
                              : 0.5,
                          marginTop: 0,
                        },
                      ]}
                      onPress={async () => {
                        await submitFeedback(
                          selectedEvent.id,
                          feedbackAnswer.eventHappened!,
                          feedbackAnswer.rating || 0
                        );
                        setFeedbackSubmitted((prev: any) => ({
                          ...prev,
                          [selectedEvent.id]: true,
                        }));
                        alert("Feedback submitted. 1 leaf refunded!");
                        setSelectedEvent(null);
                        setMode("map");
                      }}
                    >
                      <Text style={styles.btnPrimaryText}>
                        Submit & Claim Leaf
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

              {/* Normal Chat Input */}
              {!isPastEvent && !isFinalized && (
                <View style={styles.chatInputRow}>
                  <TextInput
                    style={styles.chatInput}
                    placeholder="Send a scroll..."
                    placeholderTextColor="#bbb"
                  />
                  <TouchableOpacity style={styles.btnPrimary}>
                    <Text style={styles.btnPrimaryText}>Send</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </BlurView>
      </KeyboardAvoidingView>
  );
};
