import { useState, useEffect } from 'react';
import { db, auth } from '../config/firebase';
import { collection, addDoc, onSnapshot, query, doc, updateDoc, increment, arrayUnion, deleteDoc, getDoc } from 'firebase/firestore';

export interface TribeVent {
  id: string;
  creatorId: string;
  title: string;
  interest: string;
  categoryId?: string;
  categorySub?: string[];
  ageGroup?: string;
  participantLimit: number;
  isPrivate: boolean;
  tokenCost: number;
  location: { latitude: number; longitude: number; address?: string };
  time: Date;
  participants: string[];
  isExternal?: boolean;
  externalUrl?: string;
}

export function useEvents() {
  const [events, setEvents] = useState<TribeVent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'events'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          ...d,
          time: d.time?.toDate?.() || new Date(d.time), // Handles Timestamp and exact strings
        } as TribeVent;
      });
      setEvents(data);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const createEvent = async (title: string, categoryId: string, categorySub: string[], participantLimit: number, isPrivate: boolean, tokenCost: number, location: any, date: Date, ageGroup: string = 'All Ages') => {
    const user = auth.currentUser;
    if (!user) throw new Error("Not logged in");

    // Deduct 5 Leaves (Tokens) from Creator upfront
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, {
      tokens: increment(-5) // Host pays exactly 5 🍃
    });

    await addDoc(collection(db, 'events'), {
      creatorId: user.uid,
      title,
      interest: categorySub.length > 0 ? categorySub[0] : categoryId, // backward compatibility
      categoryId,
      categorySub,
      ageGroup,
      participantLimit,
      isPrivate,
      tokenCost,
      location,
      time: date,
      participants: [user.uid], // Creator participates natively
      isExternal: false
    });
  };

  const joinEvent = async (eventId: string) => {
    const user = auth.currentUser;
    if (!user) throw new Error("Not logged in");

    // Deduct strictly 1 Token from Joiner
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, {
      tokens: increment(-1) // Joining costs 1 🍃
    });

    // Add exactly to participants database
    const eventRef = doc(db, 'events', eventId);
    await updateDoc(eventRef, {
      participants: arrayUnion(user.uid)
    });
  };

  const deleteEvent = async (eventId: string) => {
    const user = auth.currentUser;
    if (!user) throw new Error("Not logged in");

    const eventRef = doc(db, 'events', eventId);
    const evSnap = await getDoc(eventRef);
    if (!evSnap.exists()) return;
    
    const evData = evSnap.data();
    if (evData.creatorId !== user.uid) throw new Error("Not authorized");

    await deleteDoc(eventRef);
    
    // Refund creator 5 leaves
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, { tokens: increment(5) });

    // Refund participants 1 leaf
    const participants = evData.participants || [];
    for (const p of participants) {
      if (p !== user.uid) {
        const pRef = doc(db, 'users', p);
        updateDoc(pRef, { tokens: increment(1) }).catch(e => console.log('Refund err', e));
      }
    }
  };

  return { events, loading, createEvent, joinEvent, deleteEvent };
}
