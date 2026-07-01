import { collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, query, orderBy, where, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

function serialize(data: any) {
  if (!data || typeof data !== 'object') return data;
  const out: any = {};
  for (const [k, v] of Object.entries(data)) {
    out[k] = (v && typeof (v as any).toDate === 'function') ? (v as any).toDate().toISOString() : v;
  }
  return out;
}

export const getStudents = async () => {
  const snap = await getDocs(query(collection(db, 'students'), orderBy('name')));
  return snap.docs.map(d => ({ id: d.id, ...serialize(d.data()) }));
};

export const getStudent = async (id: string) => {
  const snap = await getDoc(doc(db, 'students', id));
  return snap.exists() ? { id: snap.id, ...serialize(snap.data()) } : null;
};

export const addStudent = async (data: any) => {
  return await addDoc(collection(db, 'students'), { ...data, createdAt: serverTimestamp() });
};

export const updateStudent = async (id: string, data: any) => {
  await updateDoc(doc(db, 'students', id), { ...data, updatedAt: serverTimestamp() });
};

export const deleteStudent = async (id: string) => {
  await deleteDoc(doc(db, 'students', id));
};
