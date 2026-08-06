import { useEffect, useState, Dispatch, SetStateAction } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile } from '../components/AuthSystem';

const STORAGE_KEY = 'educonnect_user';

/**
 * Tracks the logged-in user. A small localStorage cache avoids a login-screen
 * flash on first paint, but `onAuthStateChanged` is the source of truth: it
 * reconciles the cache against the real Firebase session on every load and
 * whenever the user signs in/out, instead of trusting an unverified local blob.
 */
export function useAuthUser(): [UserProfile | null, Dispatch<SetStateAction<UserProfile | null>>] {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setCurrentUser(null);
        try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
        return;
      }

      try {
        const profileSnap = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (!profileSnap.exists()) return;

        const data = profileSnap.data();
        const profile: UserProfile = {
          matricula: data.matricula,
          name: data.name,
          role: data.role === 'professor' ? 'professor' : 'aluno',
          subject: data.subject,
          email: data.email,
          createdAt: data.createdAt,
        };
        setCurrentUser(profile);
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(profile)); } catch (e) {}
      } catch (e) {
        console.error('Erro ao restaurar sessão do usuário:', e);
      }
    });

    return () => unsubscribe();
  }, []);

  return [currentUser, setCurrentUser];
}
