import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import dayjs from 'dayjs';

function serialize(data: any) {
  if (!data || typeof data !== 'object') return data;
  const out: any = {};
  for (const [k, v] of Object.entries(data)) {
    out[k] = (v && typeof (v as any).toDate === 'function') ? (v as any).toDate().toISOString() : v;
  }
  return out;
}

export const getCalendarEvents = async (year: number, month: number) => {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const end = dayjs(`${year}-${String(month).padStart(2, '0')}-01`).add(1, 'month').format('YYYY-MM-DD');
  const snap = await getDocs(query(collection(db, 'calendar'), where('date', '>=', start), where('date', '<', end), orderBy('date')));
  return snap.docs.map(d => ({ id: d.id, ...serialize(d.data()) }));
};

export const addCalendarEvent = async (data: any) => {
  return await addDoc(collection(db, 'calendar'), { ...data, createdAt: serverTimestamp() });
};

export const deleteCalendarEvent = async (id: string) => {
  await deleteDoc(doc(db, 'calendar', id));
};
