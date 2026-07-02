import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Platform, KeyboardAvoidingView, Image, ScrollView,
} from 'react-native';
import { auth } from '../config/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { Colors, Typography } from '../theme';
import { useI18n } from '../i18n';

export default function LoginScreen() {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const handleAuth = async () => {
    setErrorMsg('');
    if (!email || !password) { setErrorMsg(t('login.fillAllFields')); return; }
    setLoading(true);
    try {
      if (isLogin) await signInWithEmailAndPassword(auth, email, password);
      else await createUserWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      let msg = error.message;
      if (error.code === 'auth/invalid-credential') msg = t('login.errInvalidCredential');
      if (error.code === 'auth/user-not-found') msg = t('login.errUserNotFound');
      if (error.code === 'auth/wrong-password') msg = t('login.errWrongPassword');
      if (error.code === 'auth/email-already-in-use') msg = t('login.errEmailInUse');
      if (error.code === 'auth/too-many-requests') msg = t('login.errTooManyRequests');
      setErrorMsg(msg);
    } finally { setLoading(false); }
  };

  const handleGoogleAuth = async () => {
    setErrorMsg('');
    setLoading(true);
    try {
      if (Platform.OS === 'web') {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
      } else {
        setErrorMsg(t('login.googleNativeSoon'));
      }
    } catch (error: any) {
      let msg = error.message;
      if (error.code === 'auth/popup-closed-by-user') msg = t('login.signInCancelled');
      setErrorMsg(msg);
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Wordmark */}
        <View style={styles.wordmarkRow}>
          <Text style={styles.wordmark}>Tribes</Text>
          <Image source={require('../assets/leaf.png')} style={styles.wordmarkLeaf} />
        </View>
        <Text style={styles.tagline}>
          {isLogin ? t('login.taglineReturn') : t('login.taglineFind')}
        </Text>

        {/* Error */}
        {!!errorMsg && (
          <Text style={styles.errorText}>{errorMsg}</Text>
        )}

        {/* Inputs */}
        <View style={styles.fieldGroup}>
          <TextInput
            style={styles.input}
            placeholder={t('login.email')}
            placeholderTextColor={Colors.textPlaceholder}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <View style={styles.fieldDivider} />
          <TextInput
            style={styles.input}
            placeholder={t('login.password')}
            placeholderTextColor={Colors.textPlaceholder}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        {/* Actions */}
        {loading ? (
          <ActivityIndicator size="large" color={Colors.gold} style={{ marginVertical: 28 }} />
        ) : (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.btnPrimary} onPress={handleAuth} activeOpacity={0.82}>
              {isLogin ? (
                <Text style={styles.btnPrimaryText}>{t('login.signIn')}</Text>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.btnPrimaryText}>{t('login.signUpPrefix')}</Text>
                  <Image source={require('../assets/leaf.png')} style={styles.btnLeaf} />
                  <Text style={styles.btnPrimaryText}>{t('login.signUpSuffix')}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnGhost} onPress={handleGoogleAuth} activeOpacity={0.75}>
              <Text style={styles.btnGhostText}>{t('login.google')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Switch mode */}
        <TouchableOpacity
          style={styles.switchRow}
          onPress={() => { setIsLogin(!isLogin); setErrorMsg(''); }}
        >
          <Text style={styles.switchText}>
            {isLogin ? t('login.newHere') : t('login.alreadyMember')}
            {'  '}
            <Text style={styles.switchLink}>{isLogin ? t('login.createAccount') : t('login.signInLink')}</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },

  // ── Wordmark ───────────────────────────────────────────────────────────────
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    gap: 10,
  },
  wordmark: {
    fontFamily: Typography.headline,
    fontSize: 52,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  wordmarkLeaf: {
    width: 34,
    height: 34,
    resizeMode: 'contain',
    marginTop: 6,
  },
  tagline: {
    fontFamily: Typography.bodyLight,
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 48,
    letterSpacing: 0.2,
  },

  // ── Error ─────────────────────────────────────────────────────────────────
  errorText: {
    fontFamily: Typography.body,
    fontSize: 13,
    color: Colors.danger,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },

  // ── Input group ───────────────────────────────────────────────────────────
  fieldGroup: {
    borderRadius: 18,
    backgroundColor: Colors.bgInput,
    borderWidth: 1,
    borderColor: Colors.hairline,
    overflow: 'hidden',
    marginBottom: 20,
  },
  input: {
    fontFamily: Typography.body,
    fontSize: 15,
    color: Colors.textPrimary,
    paddingHorizontal: 22,
    paddingVertical: 18,
  },
  fieldDivider: {
    height: 1,
    backgroundColor: Colors.hairline,
    marginHorizontal: 0,
  },

  // ── Buttons ───────────────────────────────────────────────────────────────
  actions: {
    gap: 13,
    marginBottom: 28,
  },
  btnPrimary: {
    backgroundColor: Colors.glassBtnBg,
    borderRadius: 9999,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  btnPrimaryText: {
    fontFamily: Typography.bodyMedium,
    color: Colors.textPrimary,
    fontSize: 15,
    letterSpacing: 0.2,
  },
  btnLeaf: {
    width: 16,
    height: 16,
    resizeMode: 'contain',
    transform: [{ translateY: 1 }],
  },
  btnGhost: {
    borderRadius: 9999,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.hairlineNeutral,
  },
  btnGhostText: {
    fontFamily: Typography.bodyMedium,
    color: Colors.textSecondary,
    fontSize: 15,
  },

  // ── Switch ────────────────────────────────────────────────────────────────
  switchRow: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  switchText: {
    fontFamily: Typography.bodyLight,
    color: Colors.textMuted,
    fontSize: 14,
  },
  switchLink: {
    fontFamily: Typography.bodyMedium,
    color: Colors.gold,
  },
});
