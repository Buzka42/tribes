import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Platform, KeyboardAvoidingView } from 'react-native';
import { auth } from '../config/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { Colors, Typography } from '../theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const handleAuth = async () => {
    setErrorMsg('');
    if (!email || !password) {
      setErrorMsg("Please fill in all details to proceed.");
      return;
    }
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) {
      let friendlyError = error.message;
      if (error.code === 'auth/invalid-credential') friendlyError = "Incorrect password or email.";
      if (error.code === 'auth/user-not-found') friendlyError = "Account not found. Please switch to Sign Up!";
      if (error.code === 'auth/wrong-password') friendlyError = "Incorrect password, please try again.";
      if (error.code === 'auth/email-already-in-use') friendlyError = "Account already exists. Please switch to Sign In!";
      if (error.code === 'auth/too-many-requests') friendlyError = "Too many failed attempts. Try again later.";
      setErrorMsg(friendlyError);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setErrorMsg('');
    setLoading(true);
    try {
      if (Platform.OS === 'web') {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
      } else {
        setErrorMsg("Native App Google Sign-In pending official App Client IDs.");
      }
    } catch (error: any) {
      let friendlyError = error.message;
      if (error.code === 'auth/popup-closed-by-user') friendlyError = "Google login popup was closed.";
      setErrorMsg(friendlyError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Tribes 🍃</Text>
        <Text style={styles.subtitle}>{isLogin ? 'Log in to reconnect with your tribe.' : 'Join a vibrant outdoor community.'}</Text>
        
        {errorMsg ? (
          <View style={styles.errorBox}>
             <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}
        
        <TextInput 
          style={styles.input} 
          placeholder="Email Address" 
          placeholderTextColor={Colors.textLight} 
          value={email} 
          onChangeText={setEmail} 
          autoCapitalize="none" 
          keyboardType="email-address" 
        />
        <TextInput 
          style={styles.input} 
          placeholder="Secret Password" 
          placeholderTextColor={Colors.textLight} 
          value={password} 
          onChangeText={setPassword} 
          secureTextEntry 
        />
        
        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginVertical: 20 }} />
        ) : (
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.btnPrimary} onPress={handleAuth}>
              <Text style={styles.btnPrimaryText}>{isLogin ? "Sign In" : "Sign Up & Get 10 🍃"}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.btnGoogle} onPress={handleGoogleAuth}>
              <Text style={styles.btnGoogleText}>Continue lightly with Google</Text>
            </TouchableOpacity>
          </View>
        )}
        
        <TouchableOpacity style={styles.switchBtn} onPress={() => { setIsLogin(!isLogin); setErrorMsg(''); }}>
          <Text style={styles.switchBtnText}>
            {isLogin ? "Looking for a new tribe? Sign Up" : "Already a member? Sign In"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', backgroundColor: Colors.background, padding: 20 },
  card: { backgroundColor: Colors.surface, padding: 35, borderRadius: 32, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 30, elevation: 12, borderWidth: 1, borderColor: 'rgba(0,0,0,0.02)' },
  title: { fontFamily: Typography.heading, fontSize: 50, textAlign: 'center', marginBottom: 10, color: Colors.text },
  subtitle: { fontFamily: Typography.body, fontSize: 16, textAlign: 'center', marginBottom: 35, color: Colors.textLight },
  
  errorBox: { backgroundColor: 'rgba(163, 83, 83, 0.1)', padding: 15, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(163, 83, 83, 0.3)' },
  errorText: { fontFamily: Typography.bodySemibold, color: Colors.danger, textAlign: 'center', fontSize: 14 },
  
  input: { fontFamily: Typography.body, borderWidth: 1, borderColor: '#F0EFEA', backgroundColor: '#FAFAFA', padding: 18, marginBottom: 15, borderRadius: 16, fontSize: 16, color: Colors.text },
  buttonContainer: { marginTop: 5, marginBottom: 25, gap: 15 },
  btnPrimary: { backgroundColor: Colors.primary, paddingVertical: 18, borderRadius: 16, alignItems: 'center', shadowColor: Colors.primary, shadowOpacity: 0.25, shadowRadius: 15, elevation: 5 },
  btnPrimaryText: { fontFamily: Typography.bodyBold, color: '#fff', fontSize: 16 },
  btnGoogle: { backgroundColor: '#fff', paddingVertical: 18, borderRadius: 16, borderWidth: 1, borderColor: '#F0EFEA', alignItems: 'center' },
  btnGoogleText: { fontFamily: Typography.bodySemibold, color: Colors.text, fontSize: 16 },
  switchBtn: { alignItems: 'center', marginTop: 10 },
  switchBtnText: { fontFamily: Typography.bodySemibold, color: Colors.textLight, fontSize: 14 }
});
