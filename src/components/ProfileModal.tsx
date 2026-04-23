import React, { useState } from 'react';
import { styles } from './MapStyles';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { Colors, Typography } from '../theme';
import { renderMoons } from '../utils/assets';

export const ProfileModal = (props: any) => {
  const { profileViewData, profileViewUid, setProfileViewUid, setProfileViewData } = props;
  
    if (!profileViewUid) return null;
    return (
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", zIndex: 9999 }]}>
        <BlurView intensity={90} tint="dark" style={{ width: 320, padding: 24, borderRadius: 24, backgroundColor: Colors.bg, alignItems: "center", borderWidth: 1, borderColor: Colors.hairline }}>
          <TouchableOpacity style={{ position: "absolute", top: 15, right: 15, zIndex: 10000 }} onPress={() => { setProfileViewUid(null); setProfileViewData(null); }}>
            <Feather name="x" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>
          {profileViewData ? (
            <>
              <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.bgElevated, borderWidth: 1, borderColor: Colors.goldBorder, justifyContent: "center", alignItems: "center", marginBottom: 16 }}>
                <Text style={{ fontSize: 32, fontFamily: Typography.headline, color: Colors.gold }}>{String(profileViewData.displayName || "?").charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={{ fontFamily: Typography.headline, fontSize: 22, color: Colors.textPrimary, marginBottom: 16 }}>{String(profileViewData.displayName || "Unknown")}</Text>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 16, flexWrap: "wrap", justifyContent: "center" }}>
                {profileViewData.dateOfBirth && !isNaN(new Date(String(profileViewData.dateOfBirth)).getTime()) ? (
                  <View style={{ backgroundColor: Colors.bgInput, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: Colors.hairline }}>
                    <Text style={{ fontFamily: Typography.bodyBold, fontSize: 12, color: Colors.textSecondary }}>{Math.floor((Date.now() - new Date(String(profileViewData.dateOfBirth)).getTime()) / 31557600000)} yrs</Text>
                  </View>
                ) : null}
                {profileViewData.sex ? (
                  <View style={{ backgroundColor: Colors.bgInput, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: Colors.hairline }}>
                    <Text style={{ fontFamily: Typography.bodyBold, fontSize: 12, color: Colors.textSecondary }}>{String(profileViewData.sex)}</Text>
                  </View>
                ) : null}
              </View>
              {profileViewData.description ? (
                <Text style={{ fontFamily: Typography.body, fontSize: 14, color: Colors.textSecondary, textAlign: "center", marginBottom: 20 }}>
                  "{String(profileViewData.description)}"
                </Text>
              ) : null}
              <View style={{ flexDirection: "row", gap: 20, borderTopWidth: 1, borderTopColor: Colors.hairline, paddingTop: 16, width: "100%", justifyContent: "center", alignItems: "center" }}>
                <View style={{ alignItems: "center" }}>
                  <Text style={{ fontSize: 13, fontFamily: Typography.bodySemibold, color: Colors.textSecondary }}>Host Rating</Text>
                  <Text style={{ fontSize: 20, marginTop: 4 }}>
                    {renderMoons(profileViewData.ratingSum || 0, profileViewData.ratingCount || 0)}
                  </Text>
                </View>
              </View>
            </>
          ) : (
            <ActivityIndicator color={Colors.gold} size="large" style={{ marginVertical: 40 }} />
          )}
        </BlurView>
      </View>
    );
  
};
