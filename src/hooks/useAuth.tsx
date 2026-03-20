import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, firebaseUser: null, loading: true });

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fUser) => {
      setFirebaseUser(fUser);
      if (fUser) {
        // Fetch or create user in Firestore
        const docRef = doc(db, 'users', fUser.uid);
        try {
          const snapshot = await getDoc(docRef);
          if (snapshot.exists()) {
            setUser(snapshot.data() as User);
          } else {
            const newUser: User = {
              uid: fUser.uid,
              displayName: fUser.email?.split('@')[0] || 'User',
              interests: [],
              tokens: 10,
              createdAt: new Date()
            };
            await setDoc(docRef, newUser);
            setUser(newUser);
          }
        } catch (error) {
           console.error("Firestore user sync error:", error);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  return <AuthContext.Provider value={{ user, firebaseUser, loading }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
