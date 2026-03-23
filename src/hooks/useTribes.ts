import { useState, useEffect } from 'react';
import { db, auth } from '../config/firebase';
import { collection, addDoc, onSnapshot, query, doc, updateDoc, arrayUnion, arrayRemove, deleteDoc, getDoc } from 'firebase/firestore';
import { Tribe, Announcement } from '../types';

export function useTribes() {
  const [tribes, setTribes] = useState<Tribe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'tribes'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => {
        const raw = d.data();
        return {
          id: d.id,
          ...raw,
          createdAt: raw.createdAt?.toDate?.() || new Date(raw.createdAt),
          announcements: (raw.announcements || []).map((a: any) => ({
            ...a,
            createdAt: a.createdAt?.toDate?.() || new Date(a.createdAt),
          })),
        } as Tribe;
      });
      setTribes(data);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const createTribe = async (name: string, description: string, categoryId: string, location?: any) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not logged in');
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const displayName = userDoc.data()?.displayName || user.email?.split('@')[0] || 'User';

    await addDoc(collection(db, 'tribes'), {
      name,
      description,
      categoryId,
      creatorId: user.uid,
      creatorName: displayName,
      members: [user.uid],
      memberNames: { [user.uid]: displayName },
      pendingApplicants: [],
      announcements: [],
      location: location || null,
      createdAt: new Date(),
      isPublic: true,
    });
  };

  const applyToTribe = async (tribeId: string) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not logged in');
    const tribeRef = doc(db, 'tribes', tribeId);
    await updateDoc(tribeRef, {
      pendingApplicants: arrayUnion(user.uid),
    });
  };

  const acceptApplicant = async (tribeId: string, applicantUid: string) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not logged in');
    const tribeRef = doc(db, 'tribes', tribeId);
    const tribeSnap = await getDoc(tribeRef);
    if (!tribeSnap.exists()) throw new Error('Tribe not found');
    if (tribeSnap.data().creatorId !== user.uid) throw new Error('Not authorized');

    // Get applicant display name
    const applicantDoc = await getDoc(doc(db, 'users', applicantUid));
    const applicantName = applicantDoc.data()?.displayName || 'User';

    await updateDoc(tribeRef, {
      members: arrayUnion(applicantUid),
      pendingApplicants: arrayRemove(applicantUid),
      [`memberNames.${applicantUid}`]: applicantName,
    });
  };

  const rejectApplicant = async (tribeId: string, applicantUid: string) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not logged in');
    const tribeRef = doc(db, 'tribes', tribeId);
    await updateDoc(tribeRef, {
      pendingApplicants: arrayRemove(applicantUid),
    });
  };

  const postAnnouncement = async (tribeId: string, text: string) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not logged in');
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const displayName = userDoc.data()?.displayName || 'User';

    const announcement: Announcement = {
      text,
      authorId: user.uid,
      authorName: displayName,
      createdAt: new Date(),
    };

    const tribeRef = doc(db, 'tribes', tribeId);
    await updateDoc(tribeRef, {
      announcements: arrayUnion(announcement),
    });
  };

  const leaveTribe = async (tribeId: string) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not logged in');
    const tribeRef = doc(db, 'tribes', tribeId);
    await updateDoc(tribeRef, {
      members: arrayRemove(user.uid),
    });
  };

  const deleteTribe = async (tribeId: string) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not logged in');
    const tribeRef = doc(db, 'tribes', tribeId);
    const tribeSnap = await getDoc(tribeRef);
    if (!tribeSnap.exists()) return;
    if (tribeSnap.data().creatorId !== user.uid) throw new Error('Not authorized');
    await deleteDoc(tribeRef);
  };

  return { tribes, loading, createTribe, applyToTribe, acceptApplicant, rejectApplicant, postAnnouncement, leaveTribe, deleteTribe };
}
