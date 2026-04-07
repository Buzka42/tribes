import { useState, useEffect } from 'react';
import { db, auth } from '../config/firebase';
import { collection, addDoc, onSnapshot, query, doc, updateDoc, increment, arrayUnion, deleteDoc, getDoc, setDoc } from 'firebase/firestore';

export interface TribeVent {
  id: string;
  creatorId: string;
  title: string;
  interest: string;
  categoryId?: string;
  categorySub?: string[];
  ageGroup?: string;
  gender?: string;
  participantLimit: number;
  isPrivate: boolean;
  tokenCost: number;
  location: { latitude: number; longitude: number; address?: string };
  time: Date;
  participants: string[];
  isExternal?: boolean;
  externalUrl?: string;
  tribeId?: string;
  cyclicalRule?: string;
  status?: 'active' | 'finalized' | 'cancelled';
  finalizedAttendees?: string[];
  isTribePrivate?: boolean;
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
          time: d.time?.toDate?.() || new Date(d.time),
        } as TribeVent;
      });
      setEvents(data);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const createEvent = async (
    title: string, categoryId: string, categorySub: string[],
    participantLimit: number, isPrivate: boolean, tokenCost: number,
    location: any, date: Date, ageGroup: string = 'All Ages',
    gender: string = 'Anyone', tribeId?: string, cyclicalRule?: string,
    isTribePrivate?: boolean
  ) => {
    const user = auth.currentUser;
    if (!user) throw new Error("Not logged in");
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, { tokens: increment(-5) });
    await addDoc(collection(db, 'events'), {
      creatorId: user.uid,
      title,
      interest: categorySub.length > 0 ? categorySub[0] : categoryId,
      categoryId,
      categorySub,
      ageGroup,
      gender,
      participantLimit,
      isPrivate,
      tokenCost,
      location,
      time: date,
      participants: [user.uid],
      isExternal: false,
      tribeId: tribeId || null,
      cyclicalRule: cyclicalRule || null,
      status: 'active',
      finalizedAttendees: [],
      isTribePrivate: isTribePrivate || false,
    });
  };

  const joinEvent = async (eventId: string) => {
    const user = auth.currentUser;
    if (!user) throw new Error("Not logged in");
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, { tokens: increment(-1) });
    const eventRef = doc(db, 'events', eventId);
    await updateDoc(eventRef, { participants: arrayUnion(user.uid) });
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
    await updateDoc(doc(db, 'users', user.uid), { tokens: increment(5) });
    const participants = evData.participants || [];
    for (const p of participants) {
      if (p !== user.uid) {
        updateDoc(doc(db, 'users', p), { tokens: increment(1) }).catch(() => {});
      }
    }
  };

  const finalizeEvent = async (eventId: string, attendeeUids: string[], happened: boolean) => {
    const user = auth.currentUser;
    if (!user) throw new Error("Not logged in");
    const eventRef = doc(db, 'events', eventId);
    const evSnap = await getDoc(eventRef);
    if (!evSnap.exists()) throw new Error("Event not found");
    const evData = evSnap.data();
    if (evData.creatorId !== user.uid) throw new Error("Not authorized");

    if (!happened) {
      // Cancelled — full immediate refunds
      await updateDoc(eventRef, { status: 'cancelled', finalizedAttendees: [] });
      await updateDoc(doc(db, 'users', user.uid), { tokens: increment(5) });
      const participants: string[] = evData.participants || [];
      for (const p of participants) {
        if (p !== user.uid) {
          updateDoc(doc(db, 'users', p), { tokens: increment(1) }).catch(() => {});
        }
      }
    } else {
      // Happened — participants get their leaf back upon submitting feedback
      await updateDoc(eventRef, { status: 'finalized', finalizedAttendees: attendeeUids });
      // Creator gets their 5 leaves back immediately
      await updateDoc(doc(db, 'users', user.uid), { tokens: increment(5) });
    }
  };

  const submitFeedback = async (eventId: string, eventHappened: boolean, rating: number) => {
    const user = auth.currentUser;
    if (!user) throw new Error("Not logged in");
    const feedbackRef = doc(db, 'event_feedback', `${eventId}_${user.uid}`);
    await setDoc(feedbackRef, {
      eventId,
      userId: user.uid,
      eventHappened,
      rating,
      submittedAt: new Date(),
    });
    // Always refund 1 leaf
    await updateDoc(doc(db, 'users', user.uid), { tokens: increment(1) });
    // Update creator reputation
    const evSnap = await getDoc(doc(db, 'events', eventId));
    if (evSnap.exists()) {
      const creatorId = evSnap.data().creatorId;
      const creatorRef = doc(db, 'users', creatorId);
      if (eventHappened) {
        updateDoc(creatorRef, { 
          ratingSum: increment(rating),
          ratingCount: increment(1)
        }).catch(() => {});
      }
    }
  };

  const getUserFeedback = async (eventId: string): Promise<any | null> => {
    const user = auth.currentUser;
    if (!user) return null;
    const snap = await getDoc(doc(db, 'event_feedback', `${eventId}_${user.uid}`));
    return snap.exists() ? snap.data() : null;
  };

  return { events, loading, createEvent, joinEvent, deleteEvent, finalizeEvent, submitFeedback, getUserFeedback };
}
