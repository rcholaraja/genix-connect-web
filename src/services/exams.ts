import { collection, doc, getDocs, addDoc, setDoc, deleteDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

function serialize(data: any) {
  if (!data || typeof data !== 'object') return data;
  const out: any = {};
  for (const [k, v] of Object.entries(data)) {
    out[k] = (v && typeof (v as any).toDate === 'function') ? (v as any).toDate().toISOString() : v;
  }
  return out;
}

export const getExams = async () => {
  const snap = await getDocs(collection(db, 'exams'));
  return snap.docs.map(d => ({ id: d.id, ...serialize(d.data()) })).sort((a: any, b: any) => a.date > b.date ? -1 : 1);
};

export const addExam = async (data: any) => {
  const examRef = await addDoc(collection(db, 'exams'), { ...data, totalMarks: Number(data.totalMarks), createdAt: serverTimestamp() });
  // Auto-create a linked test event in calendar
  const title = data.subject ? `${data.title} (${data.subject})` : data.title;
  await addDoc(collection(db, 'calendar'), {
    date: data.date,
    type: 'test',
    title,
    description: data.grade ? `Grade: ${data.grade} · ${data.totalMarks} marks` : `${data.totalMarks} marks`,
    examId: examRef.id,
    createdAt: serverTimestamp(),
  });
  return examRef;
};

export const deleteExam = async (id: string) => {
  // Remove linked calendar event(s)
  const calSnap = await getDocs(query(collection(db, 'calendar'), where('examId', '==', id)));
  await Promise.all(calSnap.docs.map(d => deleteDoc(d.ref)));
  await deleteDoc(doc(db, 'exams', id));
};

export const getExamScores = async (examId: string) => {
  const snap = await getDocs(collection(db, 'exams', examId, 'scores'));
  return snap.docs.map(d => ({ studentId: d.id, ...serialize(d.data()) }));
};

export const saveScore = async (examId: string, studentId: string, marks: string, studentName: string) => {
  await setDoc(doc(db, 'exams', examId, 'scores', studentId), { marks: Number(marks), studentName, updatedAt: serverTimestamp() });
};
