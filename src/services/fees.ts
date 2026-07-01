import { collection, doc, getDocs, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { FEE_STATUS } from '@/constants';
import dayjs from 'dayjs';

function serialize(data: any) {
  if (!data || typeof data !== 'object') return data;
  const out: any = {};
  for (const [k, v] of Object.entries(data)) {
    out[k] = (v && typeof (v as any).toDate === 'function') ? (v as any).toDate().toISOString() : v;
  }
  return out;
}

export const getCurrentMonthFeeId = () => dayjs().format('YYYY-MM');

export const getStudentFees = async (studentId: string) => {
  const snap = await getDocs(collection(db, 'fees', studentId, 'payments'));
  return snap.docs.map(d => ({ id: d.id, ...serialize(d.data()) })).sort((a: any, b: any) => a.id > b.id ? -1 : 1);
};

export const getFeeRecord = async (studentId: string, feeId: string) => {
  const snap = await getDoc(doc(db, 'fees', studentId, 'payments', feeId));
  return snap.exists() ? { id: snap.id, ...serialize(snap.data()) } : null;
};

export const markFeePaid = async (studentId: string, feeId: string, amount: number, collectedBy: string) => {
  await setDoc(doc(db, 'fees', studentId, 'payments', feeId), {
    status: FEE_STATUS.PAID, amount, paidDate: dayjs().format('YYYY-MM-DD'), collectedBy, updatedAt: serverTimestamp(),
  });
};

export const setFeeRecord = async (studentId: string, feeId: string, data: any) => {
  await setDoc(doc(db, 'fees', studentId, 'payments', feeId), { ...data, updatedAt: serverTimestamp() });
};

export const getAllStudentFeeStatus = async (feeId: string) => {
  const studentsSnap = await getDocs(collection(db, 'students'));
  return Promise.all(studentsSnap.docs.map(async studentDoc => {
    const feeSnap = await getDoc(doc(db, 'fees', studentDoc.id, 'payments', feeId));
    return {
      studentId: studentDoc.id,
      studentName: studentDoc.data().name,
      grade: studentDoc.data().grade,
      feeAmount: studentDoc.data().feeAmount,
      ...(feeSnap.exists() ? serialize(feeSnap.data()) : { status: FEE_STATUS.PENDING }),
    };
  }));
};
