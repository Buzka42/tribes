import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Platform, KeyboardAvoidingView } from 'react-native';
import { auth } from '../config/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { Colors, Typography } from '../theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert("Hold on", "Please fill in all details to join the tribe.");
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
      Alert.alert("Authentication Failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    try {
      if (Platform.OS === 'web') {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
      } else {
        Alert.alert("Google Sign-In", "Native integration officially pending specific App Client IDs.");
      }
    } catch (error: any) {
      Alert.alert("Google Auth Failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Tribes 🍃</Text>
        <Text style={styles.subtitle}>{isLogin ? 'Log in to reconnect with your tribe.' : 'Join a vibrant outdoor community.'}</Text>
        
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
        
        <TouchableOpacity style={styles.switchBtn} onPress={() => setIsLogin(!isLogin)}>
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
  subtitle: { fontFamily: Typography.body, fontSize: 16, textAlign: 'center', marginBottom: 40, color: Colors.textLight },
  input: { fontFamily: Typography.body, borderWidth: 1, borderColor: '#F0EFEA', backgroundColor: '#FAFAFA', padding: 18, marginBottom: 15, borderRadius: 16, fontSize: 16, color: Colors.text },
  buttonContainer: { marginTop: 10, marginBottom: 25, gap: 15 },
  btnPrimary: { backgroundColor: Colors.primary, paddingVertical: 18, borderRadius: 16, alignItems: 'center', shadowColor: Colors.primary, shadowOpacity: 0.25, shadowRadius: 15, elevation: 5 },
  btnPrimaryText: { fontFamily: Typography.bodyBold, color: '#fff', fontSize: 16 },
  btnGoogle: { backgroundColor: '#fff', paddingVertical: 18, borderRadius: 16, borderWidth: 1, borderColor: '#F0EFEA', alignItems: 'center' },
  btnGoogleText: { fontFamily: Typography.bodySemibold, color: Colors.text, fontSize: 16 },
  switchBtn: { alignItems: 'center', marginTop: 10 },
  switchBtnText: { fontFamily: Typography.bodySemibold, color: Colors.textLight, fontSize: 14 }
});
