import { useEffect, useState } from 'react';
import { db, auth } from '../config/firebase';
import {
  collection, addDoc, onSnapshot, query, orderBy, limitToLast, serverTimestamp,
} from 'firebase/firestore';

export interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  /** null while the server timestamp is still pending (local echo) */
  createdAt: Date | null;
}

const MAX_MESSAGE_LENGTH = 1000;

/**
 * Live chat for one event, stored at events/{eventId}/messages.
 * Pass null to skip subscribing (chat locked, tutorial dummy, no event).
 */
export function useChatMessages(eventId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(!!eventId);

  useEffect(() => {
    if (!eventId || eventId === 'tutorial-dummy') {
      setMessages([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(
      collection(db, 'events', eventId, 'messages'),
      orderBy('createdAt', 'asc'),
      limitToLast(100),
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setMessages(snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            text: data.text || '',
            senderId: data.senderId || '',
            senderName: data.senderName || 'Tribesman',
            createdAt: data.createdAt?.toDate?.() ?? null,
          };
        }));
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsubscribe;
  }, [eventId]);

  const sendMessage = async (eventIdToSend: string, text: string, senderName: string) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not logged in');
    const trimmed = text.trim().slice(0, MAX_MESSAGE_LENGTH);
    if (!trimmed) return;
    await addDoc(collection(db, 'events', eventIdToSend, 'messages'), {
      text: trimmed,
      senderId: user.uid,
      senderName,
      createdAt: serverTimestamp(),
    });
  };

  return { messages, loading, sendMessage };
}
