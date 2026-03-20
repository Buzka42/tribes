import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { auth } from '../config/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields.");
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tribes ⛺</Text>
      <Text style={styles.subtitle}>{isLogin ? 'Welcome Back!' : 'Join the Community'}</Text>
      
      <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#aaa" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#aaa" value={password} onChangeText={setPassword} secureTextEntry />
      
      {loading ? (
        <ActivityIndicator size="large" color="#d4af37" />
      ) : (
        <View style={styles.buttonContainer}>
          <Button title={isLogin ? "Sign In" : "Sign Up"} onPress={handleAuth} color="#333" />
        </View>
      )}
      
      <Button 
        title={isLogin ? "Need an account? Sign Up" : "Already have an account? Sign In"} 
        onPress={() => setIsLogin(!isLogin)} 
        color="gray" 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#fdfdfd' },
  title: { fontSize: 48, fontWeight: 'bold', textAlign: 'center', marginBottom: 5, color: '#111' },
  subtitle: { fontSize: 18, textAlign: 'center', marginBottom: 40, color: '#666' },
  input: { borderWidth: 1, borderColor: '#ccc', backgroundColor: '#fff', padding: 15, marginBottom: 15, borderRadius: 12, fontSize: 16 },
  buttonContainer: { marginBottom: 15 }
});
