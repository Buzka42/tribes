import React, { useState } from 'react';
import { View, Text, StyleSheet, Button, TextInput, Switch, Platform } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type WizardScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Wizard'>;
interface Props { navigation: WizardScreenNavigationProp; }

export default function WizardScreen({ navigation }: Props) {
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [interest, setInterest] = useState('');
  const [limit, setLimit] = useState('10');
  const [isPrivate, setIsPrivate] = useState(false);

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.heading}>1. Event Details</Text>
      <TextInput style={styles.input} placeholder="Event Title (e.g., Midnight Basketball)" placeholderTextColor="#888" value={title} onChangeText={setTitle} />
      <TextInput style={styles.input} placeholder="Interest/Category" placeholderTextColor="#888" value={interest} onChangeText={setInterest} />
      <TextInput style={styles.input} placeholder="Participant Limit" placeholderTextColor="#888" keyboardType="numeric" value={limit} onChangeText={setLimit} />
      <View style={styles.buttonRowSingle}>
        <Button title="Next Step" onPress={() => setStep(2)} />
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.heading}>2. Location, Time & Privacy</Text>
      <View style={styles.mapMock}>
        <Text style={styles.mockText}>{Platform.OS === 'web' ? '[ Web Map Picker Fallback ]' : '[ Native Map Picker ]'}</Text>
        <Text style={styles.mockSub}>Drag pin to exact location</Text>
      </View>
      <View style={styles.row}>
        <View>
          <Text style={styles.rowTitle}>Private Event</Text>
          <Text style={styles.rowDesc}>Only 500m area shown to public</Text>
        </View>
        <Switch value={isPrivate} onValueChange={setIsPrivate} />
      </View>
      <View style={styles.buttonRow}>
        <Button title="Back" onPress={() => setStep(1)} color="gray" />
        <Button title="Next Step" onPress={() => setStep(3)} />
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.heading}>3. Cost Summary</Text>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryText}>Event: <Text style={styles.bold}>{title || 'Untitled'}</Text></Text>
        <Text style={styles.summaryText}>Privacy: <Text style={styles.bold}>{isPrivate ? 'Hidden (Invites Only)' : 'Public'}</Text></Text>
        <Text style={styles.summaryText}>Limit: <Text style={styles.bold}>{limit} people</Text></Text>
        <View style={styles.divider} />
        <Text style={styles.tokenCost}>Cost to host: 5 Tokens 🪙</Text>
        <Text style={styles.tokenDesc}>This anti-flaking cost will be refunded after attendance confirmations via quick survey.</Text>
      </View>
      <View style={styles.buttonRow}>
        <Button title="Back" onPress={() => setStep(2)} color="gray" />
        <Button title="Create Tribes Event!" onPress={() => navigation.goBack()} color="#2089dc" />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fcfcfc', justifyContent: 'center' },
  stepContainer: { flex: 1, justifyContent: 'center', width: '100%', maxWidth: 500, alignSelf: 'center' },
  heading: { fontSize: 28, fontWeight: 'bold', marginBottom: 25, color: '#1a1a1a' },
  input: { borderWidth: 1, borderColor: '#ddd', backgroundColor: '#fff', borderRadius: 10, padding: 15, marginBottom: 15, fontSize: 16 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, padding: 15, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#eee' },
  rowTitle: { fontSize: 16, fontWeight: '600', color: '#333' },
  rowDesc: { fontSize: 12, color: '#666', marginTop: 4 },
  mapMock: { height: 180, backgroundColor: '#e9e9e9', justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderRadius: 10, borderWidth: 1, borderColor: '#ccc', borderStyle: 'dashed' },
  mockText: { fontSize: 16, fontWeight: '600', color: '#555' },
  mockSub: { fontSize: 12, color: '#888', marginTop: 5 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  buttonRowSingle: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
  summaryCard: { backgroundColor: '#fff', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#eee', marginBottom: 25, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  summaryText: { fontSize: 16, marginBottom: 10, color: '#444' },
  bold: { fontWeight: '700', color: '#111' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 15 },
  tokenCost: { fontSize: 18, fontWeight: 'bold', color: '#d4af37', marginBottom: 8, textAlign: 'center' },
  tokenDesc: { fontSize: 13, color: '#777', textAlign: 'center', lineHeight: 18 },
});
