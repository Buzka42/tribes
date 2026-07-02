import React from 'react';
import { styles } from './MapStyles';
import { View, Text, Image, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { Colors, Typography } from '../theme';
import { SPIRIT_ASSETS, SPIRIT_LABELS } from '../utils/assets';
import { EVENT_CATEGORIES } from '../data/categories';
import { notify } from '../utils/dialogs';
import { useI18n } from '../i18n';

export const CreateTribeWizard = (props: any) => {
  const { wizardDraft, setWizardDraft, wizardStep, setWizardStep, createTribe, setMode, user, formTribeChecked, setFormTribeChecked } = props;
  const insets = useSafeAreaInsets();
  const { t, tValue } = useI18n();

    return (
      <KeyboardAvoidingView
        style={styles.sheetOverlay}
        behavior="padding"
        pointerEvents="box-none"
      >
        <View style={styles.glassWrapperBottomFull}>
        <BlurView
          intensity={95}
          tint="dark"
          style={[styles.glassPanelBottomFull, { paddingBottom: 20 + insets.bottom }]}
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
                  {t('createTribe.title')}
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
                {t('createTribe.intro')}
              </Text>

              <Text
                style={{
                  fontFamily: Typography.bodyBold,
                  fontSize: 13,
                  color: Colors.text,
                  marginBottom: 6,
                }}
              >
                {t('createTribe.name')}
              </Text>
              <TextInput
                style={styles.input}
                placeholder={t('createTribe.namePlaceholder')}
                placeholderTextColor={Colors.textPlaceholder}
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
                {t('createTribe.description')}
              </Text>
              <TextInput
                style={[styles.input, { height: 80 }]}
                multiline
                placeholder={t('createTribe.descriptionPlaceholder')}
                placeholderTextColor={Colors.textPlaceholder}
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
                {t('createTribe.category')}
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
                          ? cat.color + "28"
                          : Colors.bgInput,
                      borderWidth: 1,
                      borderColor:
                        wizardDraft.categoryId === cat.id
                          ? cat.color + "70"
                          : Colors.hairlineNeutral,
                    }}
                  >
                    <Text
                      style={{
                        color:
                          wizardDraft.categoryId === cat.id
                            ? cat.color
                            : Colors.textSecondary,
                        fontFamily: Typography.bodyMedium,
                        fontSize: 13,
                      }}
                    >
                      {tValue('categories', cat.id)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {wizardDraft.categoryId && (EVENT_CATEGORIES.find(c => c.id === wizardDraft.categoryId)?.subgroups || []).length > 0 && (
                <>
                  <Text style={{ fontFamily: Typography.bodyBold, fontSize: 13, color: Colors.text, marginBottom: 6 }}>
                    {t('createTribe.interests')}
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
                        <Text style={wizardDraft.categorySub?.includes(sub) ? styles.wizardSubCatText : { fontFamily: Typography.bodySemibold, fontSize: 13, color: Colors.textLight } }>{tValue('subgroups', sub)}</Text>
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
                <Text style={styles.btnPrimaryText}>{t('createTribe.nextSpirit')}</Text>
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
                  {t('createTribe.spiritTitle')}
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
                {t('createTribe.spiritHint')}
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
                {Object.keys(SPIRIT_LABELS).map((key) => (
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
                          ? Colors.goldDim
                          : Colors.bgInput,
                      borderRadius: 20,
                      borderWidth: 1,
                      borderColor:
                        wizardDraft.spiritId === key
                          ? Colors.gold
                          : Colors.hairlineNeutral,
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
                        color:
                          wizardDraft.spiritId === key
                            ? Colors.gold
                            : Colors.textSecondary,
                      }}
                    >
                      {tValue('spirits', key)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.btnPrimaryFull}
                onPress={() => setWizardStep(3)}
              >
                <Text style={styles.btnPrimaryText}>
                  {t('createTribe.nextPrivacy')}
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
                  {t('createTribe.finalStep')}
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
                    color: Colors.textPrimary,
                    marginBottom: 10,
                  }}
                >
                  {t('createTribe.privacy')}
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
                      ? Colors.goldDim
                      : "transparent",
                    borderWidth: 1,
                    borderColor: !wizardDraft.isPrivateTribe
                      ? Colors.goldBorder
                      : "transparent",
                  }}
                >
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      borderWidth: 2,
                      borderColor: Colors.goldBorder,
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
                      {t('createTribe.publicTribe')}
                    </Text>
                    <Text
                      style={{
                        fontFamily: Typography.body,
                        fontSize: 12,
                        color: Colors.textLight,
                      }}
                    >
                      {t('createTribe.publicHint')}
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
                      ? Colors.goldDim
                      : "transparent",
                    borderWidth: 1,
                    borderColor: wizardDraft.isPrivateTribe
                      ? Colors.goldBorder
                      : "transparent",
                  }}
                >
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      borderWidth: 2,
                      borderColor: Colors.goldBorder,
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
                      {t('createTribe.privateTribe')}
                    </Text>
                    <Text
                      style={{
                        fontFamily: Typography.body,
                        fontSize: 12,
                        color: Colors.textLight,
                      }}
                    >
                      {t('createTribe.privateHint')}
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
                  {t('createTribe.seedHint')}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.btnPrimaryFull}
                onPress={async () => {
                  try {
                    await createTribe(
                      wizardDraft.name,
                      wizardDraft.description,
                      wizardDraft.categoryId,
                      wizardDraft.spiritId,
                      wizardDraft.isPrivateTribe,
                      wizardDraft.fromAttendees,
                      wizardDraft.categorySub
                    );
                  } catch (e: any) {
                    notify(t('common.error'), e.message);
                    return;
                  }
                  notify(t('createTribe.plantedTitle'), t('createTribe.plantedBody'));
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
                  <Text style={styles.btnPrimaryText}>{t('createTribe.plant')}</Text>
                  <Image
                    source={require('../assets/leaf.png')}
                    style={{ width: 15, height: 15, resizeMode: 'contain' }}
                  />
                </View>
              </TouchableOpacity>
            </View>
          )}
        </BlurView>
        </View>
      </KeyboardAvoidingView>
    );
};
