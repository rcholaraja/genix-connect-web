import { collection, doc, getDocs, getDoc, addDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

function serialize(data: any) {
  if (!data || typeof data !== 'object') return data;
  const out: any = {};
  for (const [k, v] of Object.entries(data)) {
    out[k] = (v && typeof (v as any).toDate === 'function') ? (v as any).toDate().toISOString() : v;
  }
  return out;
}

export const getPushTokens = async (studentIds: string[]): Promise<string[]> => {
  const tokens: string[] = [];
  for (const id of studentIds) {
    try {
      const snap = await getDoc(doc(db, 'pushTokens', id));
      const data = snap.exists() ? snap.data() : null;
      if (data?.token) tokens.push(data.token);
    } catch { /* skip */ }
  }
  return tokens;
};

export const sendPushNotifications = async (tokens: string[], title: string, body: string) => {
  if (!tokens.length) return { sent: 0 };
  const messages = tokens.map(to => ({ to, title, body, sound: 'default' }));
  const response = await fetch('/api/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(messages),
  });
  if (!response.ok) throw new Error(`Push API error: ${response.status}`);
  return { sent: tokens.length };
};

export const logMessage = async (data: any) => {
  await addDoc(collection(db, 'notifications'), { ...data, sentAt: serverTimestamp() });
};

export const getMessages = async () => {
  const snap = await getDocs(query(collection(db, 'notifications'), orderBy('sentAt', 'desc')));
  return snap.docs.map(d => ({ id: d.id, ...serialize(d.data()) }));
};
