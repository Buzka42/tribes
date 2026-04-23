import React, { useState } from 'react';
import { styles } from './MapStyles';
import { View, Text, Image, TouchableOpacity, StyleSheet, TextInput, ScrollView, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { Colors, Typography } from '../theme';
import { SPIRIT_ASSETS, SPIRIT_LABELS } from '../utils/assets';
import { EVENT_CATEGORIES } from '../data/categories';

export const CreateTribeWizard = (props: any) => {
  const { wizardDraft, setWizardDraft, wizardStep, setWizardStep, createTribe, setMode, user, formTribeChecked, setFormTribeChecked } = props;
  
    return (
      <View style={styles.glassWrapperBottomFull}>
        <BlurView
          intensity={95}
          tint="dark"
          style={styles.glassPanelBottomFull}
        >
          {wizardStep === 1 && (
            <View style={{ flex: 1 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 20,
                }}
              >
                <Text
                  style={{
                    fontFamily: Typography.heading,
                    fontSize: 24,
                    color: Colors.text,
                    flex: 1,
                  }}
                >
                  Form a Tribe
                </Text>
                <TouchableOpacity onPress={() => setMode("map")}>
                  <Feather name="x" size={24} color={Colors.text} />
                </TouchableOpacity>
              </View>
              <Text
                style={{
                  fontFamily: Typography.body,
                  color: Colors.textLight,
                  marginBottom: 20,
                  fontSize: 13,
                  lineHeight: 18,
                }}
              >
                You successfully hosted an event! Now you have the right to form
                a permanent Tribe with the attendees.
              </Text>

              <Text
                style={{
                  fontFamily: Typography.bodyBold,
                  fontSize: 13,
                  color: Colors.text,
                  marginBottom: 6,
                }}
              >
                Tribe Name
              </Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Weekend Warriors"
                value={wizardDraft.name}
                onChangeText={(t) =>
                  setWizardDraft({ ...wizardDraft, name: t })
                }
              />

              <Text
                style={{
                  fontFamily: Typography.bodyBold,
                  fontSize: 13,
                  color: Colors.text,
                  marginBottom: 6,
                }}
              >
                Description
              </Text>
              <TextInput
                style={[styles.input, { height: 80 }]}
                multiline
                placeholder="What is this tribe about?"
                value={wizardDraft.description}
                onChangeText={(t) =>
                  setWizardDraft({ ...wizardDraft, description: t })
                }
              />

              <Text
                style={{
                  fontFamily: Typography.bodyBold,
                  fontSize: 13,
                  color: Colors.text,
                  marginBottom: 6,
                }}
              >
                Main Interest Category
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 20 }}
              >
                {EVENT_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() =>
                      setWizardDraft({ ...wizardDraft, categoryId: cat.id, categorySub: [] })
                    }
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 20,
                      marginRight: 8,
                      backgroundColor:
                        wizardDraft.categoryId === cat.id
                          ? cat.color
                          : "rgba(255,255,255,0.7)",
                      borderWidth: 1,
                      borderColor:
                        wizardDraft.categoryId === cat.id ? cat.color : "#ccc",
                    }}
                  >
                    <Text
                      style={{
                        color:
                          wizardDraft.categoryId === cat.id ? "#fff" : "#666",
                        fontWeight: "bold",
                        fontSize: 13,
                      }}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {wizardDraft.categoryId && (EVENT_CATEGORIES.find(c => c.id === wizardDraft.categoryId)?.subgroups || []).length > 0 && (
                <>
                  <Text style={{ fontFamily: Typography.bodyBold, fontSize: 13, color: Colors.text, marginBottom: 6 }}>
                    Specific Interests (Optional)
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                    {EVENT_CATEGORIES.find(c => c.id === wizardDraft.categoryId)?.subgroups.map(sub => (
                      <TouchableOpacity
                        key={sub}
                        onPress={() => {
                          const subs = wizardDraft.categorySub || [];
                          if (subs.includes(sub)) {
                              setWizardDraft({...wizardDraft, categorySub: subs.filter((s: any) => s !== sub)});
                          } else {
                              setWizardDraft({...wizardDraft, categorySub: [...subs, sub]});
                          }
                        }}
                        style={[
                          styles.wizardSubCat,
                          wizardDraft.categorySub?.includes(sub) && styles.wizardSubCatActive
                        ]}
                      >
                        <Text style={wizardDraft.categorySub?.includes(sub) ? styles.wizardSubCatText : { fontFamily: Typography.bodySemibold, fontSize: 13, color: Colors.textLight } }>{sub}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}

              <TouchableOpacity
                disabled={!wizardDraft.name || !wizardDraft.categoryId}
                style={[
                  styles.btnPrimaryFull,
                  {
                    opacity:
                      wizardDraft.name && wizardDraft.categoryId ? 1 : 0.5,
                  },
                ]}
                onPress={() => setWizardStep(2)}
              >
                <Text style={styles.btnPrimaryText}>Next: Choose a Spirit</Text>
              </TouchableOpacity>
            </View>
          )}

          {wizardStep === 2 && (
            <View style={{ flex: 1 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 20,
                }}
              >
                <TouchableOpacity
                  onPress={() => setWizardStep(1)}
                  style={{ padding: 5, marginRight: 8 }}
                >
                  <Feather name="arrow-left" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text
                  style={{
                    fontFamily: Typography.heading,
                    fontSize: 24,
                    color: Colors.text,
                    flex: 1,
                  }}
                >
                  Choose a Spirit
                </Text>
              </View>
              <Text
                style={{
                  fontFamily: Typography.body,
                  color: Colors.textLight,
                  marginBottom: 20,
                  fontSize: 13,
                  lineHeight: 18,
                }}
              >
                The spirit acts as an emblem for your tribe. It will represent
                your group on the map.
              </Text>

              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 12,
                  justifyContent: "center",
                  marginBottom: 20,
                }}
              >
                {Object.keys(SPIRIT_ASSETS).map((key) => (
                  <TouchableOpacity
                    key={key}
                    onPress={() =>
                      setWizardDraft({ ...wizardDraft, spiritId: key })
                    }
                    style={{
                      width: "30%",
                      aspectRatio: 1,
                      backgroundColor:
                        wizardDraft.spiritId === key
                          ? "rgba(140,179,105,0.2)"
                          : "rgba(255,255,255,0.6)",
                      borderRadius: 20,
                      borderWidth: 2,
                      borderColor:
                        wizardDraft.spiritId === key
                          ? Colors.primary
                          : "transparent",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 10,
                    }}
                  >
                    <Image
                      source={SPIRIT_ASSETS[key]}
                      style={{
                        width: "80%",
                        height: "80%",
                        resizeMode: "contain",
                        marginBottom: 4,
                      }}
                    />
                    <Text
                      style={{
                        fontSize: 10,
                        fontFamily: Typography.bodyBold,
                        color: Colors.text,
                      }}
                    >
                      {SPIRIT_LABELS[key]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.btnPrimaryFull}
                onPress={() => setWizardStep(3)}
              >
                <Text style={styles.btnPrimaryText}>
                  Next: Privacy & Review
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {wizardStep === 3 && (
            <View style={{ flex: 1 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 20,
                }}
              >
                <TouchableOpacity
                  onPress={() => setWizardStep(2)}
                  style={{ padding: 5, marginRight: 8 }}
                >
                  <Feather name="arrow-left" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text
                  style={{
                    fontFamily: Typography.heading,
                    fontSize: 24,
                    color: Colors.text,
                    flex: 1,
                  }}
                >
                  Final Step
                </Text>
              </View>

              <View
                style={{
                  backgroundColor: Colors.bgElevated,
                  padding: 20,
                  borderRadius: 20,
                  marginBottom: 20,
                  borderWidth: 1,
                  borderColor: Colors.hairline,
                }}
              >
                <Text
                  style={{
                    fontFamily: Typography.bodyBold,
                    fontSize: 16,
                    marginBottom: 10,
                  }}
                >
                  Privacy Settings
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    setWizardDraft({ ...wizardDraft, isPrivateTribe: false })
                  }
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 12,
                    padding: 10,
                    borderRadius: 12,
                    backgroundColor: !wizardDraft.isPrivateTribe
                      ? "rgba(140,179,105,0.1)"
                      : "transparent",
                    borderWidth: 1,
                    borderColor: !wizardDraft.isPrivateTribe
                      ? Colors.primary
                      : "transparent",
                  }}
                >
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      borderWidth: 2,
                      borderColor: Colors.primary,
                      marginRight: 10,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {!wizardDraft.isPrivateTribe && (
                      <View
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: 6,
                          backgroundColor: Colors.gold,
                        }}
                      />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontFamily: Typography.bodyBold,
                        color: Colors.text,
                      }}
                    >
                      Public Tribe
                    </Text>
                    <Text
                      style={{
                        fontFamily: Typography.body,
                        fontSize: 12,
                        color: Colors.textLight,
                      }}
                    >
                      Anyone can see your events tagged with this tribe.
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    setWizardDraft({ ...wizardDraft, isPrivateTribe: true })
                  }
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 10,
                    borderRadius: 12,
                    backgroundColor: wizardDraft.isPrivateTribe
                      ? "rgba(140,179,105,0.1)"
                      : "transparent",
                    borderWidth: 1,
                    borderColor: wizardDraft.isPrivateTribe
                      ? Colors.primary
                      : "transparent",
                  }}
                >
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      borderWidth: 2,
                      borderColor: Colors.primary,
                      marginRight: 10,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {wizardDraft.isPrivateTribe && (
                      <View
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: 6,
                          backgroundColor: Colors.gold,
                        }}
                      />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontFamily: Typography.bodyBold,
                        color: Colors.text,
                      }}
                    >
                      Private Tribe
                    </Text>
                    <Text
                      style={{
                        fontFamily: Typography.body,
                        fontSize: 12,
                        color: Colors.textLight,
                      }}
                    >
                      Your tribe name and badge will be hidden from public
                      events. Invitation only.
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={{ alignItems: "center", marginBottom: 20 }}>
                <Text
                  style={{
                    fontFamily: Typography.body,
                    color: Colors.textLight,
                    textAlign: "center",
                  }}
                >
                  By planting this seed, you invite the attendees of your last
                  event to join your new tribe immediately.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.btnPrimaryFull}
                onPress={async () => {
                  await createTribe(
                    wizardDraft.name,
                    wizardDraft.description,
                    wizardDraft.categoryId,
                    wizardDraft.spiritId,
                    wizardDraft.isPrivateTribe,
                    wizardDraft.fromAttendees,
                    wizardDraft.categorySub
                  );
                  alert("Tribe has been planted! Welcome, Chief.");
                  setMode("map");
                  setWizardStep(0);
                  setWizardDraft({
                    name: "",
                    description: "",
                    spiritId: "forest",
                    isPrivateTribe: false,
                    categoryId: "",
                    categorySub: [],
                    fromEventId: "",
                    fromAttendees: [],
                  });
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                  <Text style={styles.btnPrimaryText}>Found the Tribe</Text>
                  <Feather name="anchor" size={14} color="rgba(255,255,255,0.9)" />
                </View>
              </TouchableOpacity>
            </View>
          )}
        </BlurView>
      </View>
    );
  
};
