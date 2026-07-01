'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  onAuthStateChanged,
  signOut,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  User,
} from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

const TEACHER_PHONE = '+917418761703';
const TEACHER_PHONE_DEV = '+919876543211'; // dev testing only — remove before production

type UserRole = 'teacher' | 'student' | 'not_registered' | null;

interface UserProfile {
  id?: string;
  name: string;
  phone: string;
  grade?: string;
  feeAmount?: number;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  userRole: UserRole;
  userProfile: UserProfile | null;
  loading: boolean;
  isTeacher: boolean;
  isStudent: boolean;
  sendOtp: (phone: string) => Promise<void>;
  verifyOtp: (code: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        await loadUserProfile(firebaseUser);
      } else {
        setUser(null);
        setUserRole(null);
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const loadUserProfile = async (firebaseUser: User) => {
    try {
      if (firebaseUser.phoneNumber === TEACHER_PHONE || firebaseUser.phoneNumber === TEACHER_PHONE_DEV) {
        let teacherName = 'Teacher';
        try {
          const snap = await getDoc(doc(db, 'config', 'teacher'));
          if (snap.exists() && snap.data()?.name) teacherName = snap.data().name;
        } catch (_) {}
        setUserRole('teacher');
        setUserProfile({ name: teacherName, phone: firebaseUser.phoneNumber });
        return;
      }
      const phone = firebaseUser.phoneNumber ?? '';
      const tenDigit = phone.replace(/^\+91/, '');
      const q = query(collection(db, 'students'), where('phone', '==', tenDigit));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const studentDoc = snap.docs[0];
        setUserRole('student');
        setUserProfile({ id: studentDoc.id, ...studentDoc.data() } as UserProfile);
      } else {
        setUserRole('not_registered');
        setUserProfile(null);
      }
    } catch (e) {
      console.error('loadUserProfile error', e);
      setUserRole('not_registered');
    }
  };

  const sendOtp = async (phoneNumber: string) => {
    // Clear any existing reCAPTCHA
    if (recaptchaRef.current) {
      recaptchaRef.current.clear();
      recaptchaRef.current = null;
    }
    recaptchaRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
      callback: () => {},
      'expired-callback': () => {
        recaptchaRef.current = null;
      },
    });
    await recaptchaRef.current.render();
    const result = await signInWithPhoneNumber(auth, phoneNumber, recaptchaRef.current);
    setConfirmationResult(result);
  };

  const verifyOtp = async (code: string) => {
    if (!confirmationResult) throw new Error('No OTP session active. Please request OTP again.');
    const result = await confirmationResult.confirm(code);
    return result;
  };

  const logout = async () => {
    if (recaptchaRef.current) {
      try { recaptchaRef.current.clear(); } catch (_) {}
      recaptchaRef.current = null;
    }
    setConfirmationResult(null);
    await signOut(auth);
  };

  const refreshProfile = async () => {
    if (auth.currentUser) await loadUserProfile(auth.currentUser);
  };

  return (
    <AuthContext.Provider value={{
      user, userRole, userProfile, loading,
      isTeacher: userRole === 'teacher',
      isStudent: userRole === 'student',
      sendOtp, verifyOtp, logout, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
