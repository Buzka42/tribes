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

  const createTribe = async (
    name: string, description: string, categoryId: string,
    spiritId: string = 'forest', isPrivateTribe: boolean = false,
    initialMembers: string[] = [],
    categorySub: string[] = []
  ) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not logged in');
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const displayName = userDoc.data()?.displayName || user.email?.split('@')[0] || 'User';

    const allMembers = Array.from(new Set([user.uid, ...initialMembers]));
    const memberNames: Record<string, string> = { [user.uid]: displayName };
    // Fetch names for initial members
    for (const uid of initialMembers) {
      if (uid !== user.uid) {
        const mDoc = await getDoc(doc(db, 'users', uid));
        memberNames[uid] = mDoc.data()?.displayName || 'Tribesman';
      }
    }

    await addDoc(collection(db, 'tribes'), {
      name,
      description,
      categoryId,
      categorySub,
      creatorId: user.uid,
      creatorName: displayName,
      members: allMembers,
      memberNames,
      pendingApplicants: [],
      announcements: [],
      location: null,
      leaders: [user.uid],
      createdAt: new Date(),
      isPublic: true,
      spiritId,
      isPrivateTribe,
    });
  };

  const applyToTribe = async (tribeId: string) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not logged in');
    
    // Fetch their display name to populate UI
    const uDoc = await getDoc(doc(db, 'users', user.uid));
    const displayName = uDoc.data()?.displayName || 'Applicant';

    const tribeRef = doc(db, 'tribes', tribeId);
    await updateDoc(tribeRef, {
      pendingApplicants: arrayUnion(user.uid),
      [`memberNames.${user.uid}`]: displayName
    });
  };

  const acceptApplicant = async (tribeId: string, applicantUid: string) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not logged in');
    const tribeRef = doc(db, 'tribes', tribeId);
    const tribeSnap = await getDoc(tribeRef);
    if (!tribeSnap.exists()) throw new Error('Tribe not found');
    const data = tribeSnap.data() as Tribe;
    const isLeader = data.creatorId === user.uid || (data.leaders || []).includes(user.uid);
    if (!isLeader) throw new Error('Not authorized');

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
    const tribeSnap = await getDoc(tribeRef);
    if (!tribeSnap.exists()) throw new Error('Tribe not found');
    const data = tribeSnap.data() as Tribe;
    const isLeader = data.creatorId === user.uid || (data.leaders || []).includes(user.uid);
    if (!isLeader) throw new Error('Not authorized');

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
    const tribeSnap = await getDoc(tribeRef);
    if (!tribeSnap.exists()) throw new Error('Tribe not found');
    const data = tribeSnap.data() as Tribe;
    const isLeader = data.creatorId === user.uid || (data.leaders || []).includes(user.uid);
    if (!isLeader) throw new Error('Not authorized');

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

  const removeMember = async (tribeId: string, memberUid: string) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not logged in');
    const tribeRef = doc(db, 'tribes', tribeId);
    const tribeSnap = await getDoc(tribeRef);
    if (!tribeSnap.exists()) throw new Error('Tribe not found');
    const data = tribeSnap.data() as Tribe;
    const isLeader = data.creatorId === user.uid || (data.leaders || []).includes(user.uid);
    if (!isLeader) throw new Error('Not authorized');

    // Only creator can remove other leaders
    const isTargetLeader = (data.leaders || []).includes(memberUid);
    if (isTargetLeader && data.creatorId !== user.uid) {
      throw new Error('Only the Chief can remove other leaders');
    }

    await updateDoc(tribeRef, {
      members: arrayRemove(memberUid),
      leaders: arrayRemove(memberUid), // cleanup if they were leader
      [`memberNames.${memberUid}`]: null // effectively remove from lookup
    });
  };

  const updateTribe = async (tribeId: string, updates: Partial<Tribe>) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not logged in');
    const tribeRef = doc(db, 'tribes', tribeId);
    const tribeSnap = await getDoc(tribeRef);
    if (!tribeSnap.exists()) throw new Error('Tribe not found');
    const data = tribeSnap.data() as Tribe;
    const isLeader = data.creatorId === user.uid || (data.leaders || []).includes(user.uid);
    if (!isLeader) throw new Error('Not authorized');

    await updateDoc(tribeRef, updates);
  };

  const promoteMember = async (tribeId: string, memberUid: string) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not logged in');
    const tribeRef = doc(db, 'tribes', tribeId);
    const tribeSnap = await getDoc(tribeRef);
    if (!tribeSnap.exists()) throw new Error('Tribe not found');
    const data = tribeSnap.data() as Tribe;
    // Only the Chief (creator) can promote to leader
    if (data.creatorId !== user.uid) throw new Error('Only the Chief can promote members');

    await updateDoc(tribeRef, {
      leaders: arrayUnion(memberUid)
    });
  };

  const demoteMember = async (tribeId: string, memberUid: string) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not logged in');
    const tribeRef = doc(db, 'tribes', tribeId);
    const tribeSnap = await getDoc(tribeRef);
    if (!tribeSnap.exists()) throw new Error('Tribe not found');
    const data = tribeSnap.data() as Tribe;
    // Only the Chief (creator) can demote leaders
    if (data.creatorId !== user.uid) throw new Error('Only the Chief can demote leaders');

    await updateDoc(tribeRef, {
      leaders: arrayRemove(memberUid)
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

  return { tribes, loading, createTribe, applyToTribe, acceptApplicant, rejectApplicant, postAnnouncement, leaveTribe, removeMember, updateTribe, deleteTribe, promoteMember, demoteMember };
}
