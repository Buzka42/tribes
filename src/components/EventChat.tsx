import { format } from 'date-fns';
import React, { useRef, useState } from 'react';
import { styles } from './MapStyles';
import { View, Text, Image, TouchableOpacity, TextInput, ScrollView, Platform, KeyboardAvoidingView, Share } from 'react-native';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography } from '../theme';
import { renderMoons, SPIRIT_ASSETS } from '../utils/assets';
import { notify, confirmDialog } from '../utils/dialogs';
import { useChatMessages } from '../hooks/useChatMessages';
import { useI18n } from '../i18n';

export const EventChat = (props: any) => {
  const { selectedEvent, setSelectedEvent, setMode, user, events, joinEvent, leaveEvent, deleteEvent, finalizeEvent, finalizeChecked, setFinalizeChecked, submitFeedback, feedbackAnswer, setFeedbackAnswer, feedbackSubmitted, setFeedbackSubmitted, getUserFeedback, userFeedbackCache, setUserFeedbackCache, creatorStatsCache, setCreatorStatsCache, participantNamesCache, setParticipantNamesCache, getParticipantNames, tribes, setProfileViewUid, setSelectedTribe, handleJoin, setFormTribeChecked, formTribeChecked, setWizardDraft, setWizardStep } = props;

  const canChat = !!selectedEvent &&
    (selectedEvent.creatorId === user?.uid ||
      selectedEvent.participants?.includes(user?.uid || ""));
  const [chatText, setChatText] = useState('');
  const chatScrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const { t, dateLocale } = useI18n();
  const { messages, sendMessage } = useChatMessages(canChat ? selectedEvent.id : null);

  const handleSend = async () => {
    const text = chatText.trim();
    if (!text || !selectedEvent) return;
    setChatText('');
    try {
      await sendMessage(selectedEvent.id, text, user?.displayName || 'Tribesman');
    } catch (e: any) {
      setChatText(text); // give the draft back so nothing is lost
      notify(t('chat.messageFailed'), e.message);
    }
  };

    if (!selectedEvent) return null;
    const isJoined = selectedEvent.participants.includes(user?.uid || "");
    const isHost = selectedEvent.creatorId === user?.uid;
    const isPastEvent =
      selectedEvent.time && new Date(selectedEvent.time) <= new Date();
    const isFinalized =
      selectedEvent.status === "finalized" ||
      selectedEvent.status === "cancelled";
    const creatorStats = creatorStatsCache[selectedEvent.creatorId] || {
      name: t('common.unknown'),
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
        style={styles.sheetOverlay}
        behavior="padding"
        pointerEvents="box-none"
      >
        <View style={styles.glassWrapperBottomFull}>
        <BlurView
          intensity={90}
          tint="dark"
          style={[styles.glassPanelBottomFull, { paddingBottom: 20 + insets.bottom }]}
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
                      backgroundColor: Colors.goldDim,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: Colors.goldBorder,
                    }}
                  >
                    <Text
                      style={{
                        color: Colors.gold,
                        fontSize: 10,
                        fontFamily: Typography.bodyMedium,
                        letterSpacing: 0.6,
                      }}
                    >
                      {t('chat.privateTribe')}
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
                      {selectedEvent.status === "cancelled" ? t('chat.cancelled') : t('chat.finalized')}
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
                {t('chat.attending', {
                  n: selectedEvent.participants.length,
                  limit: selectedEvent.participantLimit,
                })}{" "}
                •{" "}
                {selectedEvent.time
                  ? format(new Date(selectedEvent.time), t('dates.eventTime'), { locale: dateLocale })
                  : t('chat.tbd')}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
                <Text style={{ fontFamily: Typography.bodySemibold, fontSize: 13, color: Colors.text }}>
                  {t('chat.host')}{" "}
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
                    {creatorStats.name || t('common.unknown')}
                  </Text>
                </TouchableOpacity>
                {creatorStats.ratingCount > 0 ? (
                  <Text style={{ fontSize: 13, marginLeft: 8 }}>
                    {renderMoons(creatorStats.ratingSum, creatorStats.ratingCount)}
                  </Text>
                ) : (
                  <Text style={{ fontFamily: Typography.bodyLight, fontSize: 12, color: Colors.textMuted, marginLeft: 8 }}>
                    {t('chat.newHost')}
                  </Text>
                )}
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
                    backgroundColor: Colors.goldDim,
                    alignSelf: "flex-start",
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: Colors.goldBorder,
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
                    {t('chat.hostedBy', { name: tribeInfo.name })}
                  </Text>
                </TouchableOpacity>
              )}
              {selectedEvent.isPrivate && (isHost || isJoined) && (
                <TouchableOpacity
                  onPress={async () => {
                    if (Platform.OS === 'web') {
                      const link = `${window.location.origin}${window.location.pathname}?joinEvent=${selectedEvent.id}`;
                      try {
                        await navigator.clipboard.writeText(link);
                        notify(t('chat.inviteCopied'));
                      } catch {
                        window.prompt(t('chat.invitePrompt'), link);
                      }
                    } else {
                      try {
                        await Share.share({
                          message: t('chat.inviteShare', { title: selectedEvent.title, id: selectedEvent.id }),
                          title: selectedEvent.title,
                        });
                      } catch { /* user dismissed share sheet */ }
                    }
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
                    {t('chat.copyInvite')}
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
                  const ok = await confirmDialog(
                    t('chat.deleteTitle'),
                    t('chat.deleteBody'),
                    t('chat.deleteConfirm'),
                    true,
                  );
                  if (ok) {
                    try {
                      await deleteEvent(selectedEvent.id);
                      setSelectedEvent(null);
                      setMode("map");
                    } catch (e: any) {
                      notify(t('common.error'), e.message);
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
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 }}>
            <Feather name="map-pin" size={12} color={Colors.gold} />
            <Text
              style={{
                fontFamily: Typography.body,
                fontSize: 13,
                color: Colors.textLight,
                flex: 1,
              }}
              numberOfLines={1}
            >
              {selectedEvent.location.address || t('chat.pinnedOnMap')}
            </Text>
          </View>

          {/* Content Area */}
          {!isJoined && !isHost ? (
            <View style={styles.chatLocked}>
              <View style={styles.chatLockedIconWrap}>
                <Feather name="lock" size={24} color={Colors.gold} />
              </View>
              <Text style={styles.chatLockedTitle}>{t('chat.sealedTitle')}</Text>
              <Text style={styles.chatLockedSub}>
                {t('chat.sealedBodyPrefix')}{" "}
                <Image
                  source={require("../assets/leaf.png")}
                  style={styles.inlineIcon}
                />{" "}
                {t('chat.sealedBodySuffix')}
              </Text>
              <TouchableOpacity
                style={[styles.btnPrimaryFull, isFinalized && { opacity: 0.5 }]}
                disabled={isFinalized}
                onPress={handleJoin}
              >
                <Text style={styles.btnPrimaryText}>
                  {isFinalized ? t('chat.concluded') : t('chat.joinCta')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              <ScrollView
                ref={chatScrollRef}
                style={styles.chatScroll}
                contentContainerStyle={{
                  paddingVertical: 10,
                  paddingBottom: 20,
                }}
                onContentSizeChange={() =>
                  chatScrollRef.current?.scrollToEnd({ animated: true })
                }
              >
                {messages.length === 0 ? (
                  <View style={styles.chatEmptyRow}>
                    <Feather name="wind" size={13} color={Colors.textMuted} />
                    <Text style={styles.chatEmptyText}>
                      {t('chat.emptyChat')}
                    </Text>
                  </View>
                ) : (
                  messages.map((m, i) => {
                    const isOwn = m.senderId === user?.uid;
                    const showSender =
                      !isOwn && (i === 0 || messages[i - 1].senderId !== m.senderId);
                    return (
                      <View
                        key={m.id}
                        style={[styles.msgRow, isOwn ? styles.msgRowOwn : styles.msgRowOther]}
                      >
                        {showSender && (
                          <TouchableOpacity onPress={() => setProfileViewUid(m.senderId)}>
                            <Text style={styles.msgSender}>{m.senderName}</Text>
                          </TouchableOpacity>
                        )}
                        <View
                          style={[
                            styles.msgBubble,
                            isOwn ? styles.msgBubbleOwn : styles.msgBubbleOther,
                          ]}
                        >
                          <Text style={styles.msgText}>{m.text}</Text>
                        </View>
                        <Text style={styles.msgTime}>
                          {m.createdAt ? format(m.createdAt, 'HH:mm') : t('chat.sending')}
                        </Text>
                      </View>
                    );
                  })
                )}
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
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                    <Feather name="zap" size={14} color={Colors.gold} />
                    <Text
                      style={{
                        fontFamily: Typography.heading,
                        fontSize: 16,
                        color: Colors.accent,
                      }}
                    >
                      {t('chat.pastTitle')}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontFamily: Typography.body,
                      fontSize: 13,
                      color: Colors.textLight,
                      marginBottom: 16,
                    }}
                  >
                    {t('chat.pastBody')}
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
                          {t('chat.itHappened')}
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
                          {t('chat.itWasCancelled')}
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
                          {t('chat.tickAttendees')}
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
                                    ? Colors.gold
                                    : Colors.hairlineNeutral,
                                  backgroundColor: finalizeChecked.includes(p)
                                    ? Colors.goldDim
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
                                    color={Colors.gold}
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
                        {formTribeChecked && <Feather name="check" size={14} color={Colors.gold} />}
                      </View>
                      <Text style={{ fontFamily: Typography.bodySemibold, color: Colors.text }}>
                        {t('chat.formTribe')}
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
                        notify(t('chat.finalizedTitle'), t('chat.finalizedBody'));
                      }
                    }}
                  >
                    <Text style={styles.btnPrimaryText}>{t('chat.lockFinalize')}</Text>
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
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                      <Feather name="tag" size={14} color={Colors.gold} />
                      <Text
                        style={{
                          fontFamily: Typography.heading,
                          fontSize: 16,
                          color: Colors.accent,
                        }}
                      >
                        {t('chat.claimTitle')}
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontFamily: Typography.body,
                        fontSize: 13,
                        color: Colors.textLight,
                        marginBottom: 16,
                      }}
                    >
                      {t('chat.claimBody')}
                    </Text>

                    <Text
                      style={{
                        fontFamily: Typography.bodySemibold,
                        color: Colors.textLight,
                        marginBottom: 8,
                      }}
                    >
                      {t('chat.didItHappen')}
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
                          <Text style={{ fontFamily: Typography.bodyBold, color: feedbackAnswer.eventHappened === true ? Colors.gold : Colors.textSecondary }}>{t('common.yes')}</Text>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: feedbackAnswer.eventHappened === false ? Colors.dangerSoft : Colors.bgInput, alignItems: "center", borderWidth: 1, borderColor: feedbackAnswer.eventHappened === false ? Colors.dangerBorder : Colors.hairline }}
                        onPress={() => setFeedbackAnswer({ ...feedbackAnswer, eventHappened: false })}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Feather name="thumbs-down" size={14} color={feedbackAnswer.eventHappened === false ? Colors.danger : Colors.textSecondary} />
                          <Text style={{ fontFamily: Typography.bodyBold, color: feedbackAnswer.eventHappened === false ? Colors.danger : Colors.textSecondary }}>{t('common.no')}</Text>
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
                          {t('chat.rateIt')}
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
                        notify(t('chat.feedbackThanksTitle'), t('chat.feedbackThanksBody'));
                        setSelectedEvent(null);
                        setMode("map");
                      }}
                    >
                      <Text style={styles.btnPrimaryText}>
                        {t('chat.submitClaim')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

              {/* Normal Chat Input */}
              {!isPastEvent && !isFinalized && (
                <View style={styles.chatInputRow}>
                  <TextInput
                    style={styles.chatInput}
                    placeholder={t('chat.messagePlaceholder')}
                    placeholderTextColor={Colors.textPlaceholder}
                    value={chatText}
                    onChangeText={setChatText}
                    onSubmitEditing={handleSend}
                    returnKeyType="send"
                    blurOnSubmit={false}
                    maxLength={1000}
                  />
                  <TouchableOpacity
                    style={[styles.sendBtn, !chatText.trim() && { opacity: 0.4 }]}
                    onPress={handleSend}
                    disabled={!chatText.trim()}
                  >
                    <Feather name="send" size={16} color="#1A2421" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </BlurView>
        </View>
      </KeyboardAvoidingView>
  );
};
