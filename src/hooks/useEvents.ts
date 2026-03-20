import { useState, useEffect, useCallback } from 'react';
import { collection, query, onSnapshot, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Event, LocationData } from '../types';
import { useAuth } from './useAuth';
import { Alert } from 'react-native';

export function useEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const q = query(collection(db, 'events'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Event[] = [];
      snapshot.forEach((docSnap) => {
        data.push({ id: docSnap.id, ...docSnap.data() } as Event);
      });
      setEvents(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching events:", error);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const createEvent = useCallback(async (
    title: string, 
    interest: string, 
    limit: number, 
    isPrivate: boolean, 
    tokenCost: number,
    location: LocationData
  ) => {
    if (!user || user.tokens < tokenCost) {
      Alert.alert("Failed", "You do not have enough tokens.");
      throw new Error("Not enough tokens");
    }

    try {
      // 1. Create the event
      const newEvent = {
        creatorId: user.uid,
        title,
        interest,
        location,
        time: serverTimestamp(),
        isPrivate,
        participantLimit: limit,
        tokenCost,
        isExternal: false
      };
      
      await addDoc(collection(db, 'events'), newEvent);

      // 2. Deduct tokens
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        tokens: user.tokens - tokenCost
      });
      
    } catch (error) {
      console.error("Error creating event:", error);
      throw error;
    }
  }, [user]);

  return { events, loading, createEvent };
}
