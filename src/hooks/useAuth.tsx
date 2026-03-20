import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../config/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
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
    let unsubscribeUser: any = null;

    const unsub = onAuthStateChanged(auth, async (fUser) => {
      setFirebaseUser(fUser);
      if (fUser) {
        const docRef = doc(db, 'users', fUser.uid);
        
        // Listen to realtime updates to catch token changes exactly via DB limits
        unsubscribeUser = onSnapshot(docRef, async (snapshot) => {
          if (snapshot.exists()) {
            setUser(snapshot.data() as User);
          } else {
            const newUser: User = {
              uid: fUser.uid,
              displayName: fUser.email?.split('@')[0] || 'User',
              interests: [],
              tokens: 10,
              createdAt: new Date(),
              isDev: false
            };
            await setDoc(docRef, newUser);
            setUser(newUser);
          }
        });
      } else {
        if (unsubscribeUser) unsubscribeUser();
        setUser(null);
      }
      setLoading(false);
    });
    return () => {
      unsub();
      if (unsubscribeUser) unsubscribeUser();
    };
  }, []);

  return <AuthContext.Provider value={{ user, firebaseUser, loading }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
