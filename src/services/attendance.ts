import { collection, doc, getDocs, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ATTENDANCE_STATUS } from '@/constants';

export const getAttendanceForDate = async (dateStr: string) => {
  const snap = await getDocs(collection(db, 'attendance', dateStr, 'records'));
  const map: Record<string, string> = {};
  snap.docs.forEach(d => { map[d.id] = d.data().status; });
  return map;
};

export const saveAttendance = async (dateStr: string, records: { studentId: string; status: string }[]) => {
  await Promise.all(records.map(({ studentId, status }) =>
    setDoc(doc(db, 'attendance', dateStr, 'records', studentId), { status, markedAt: serverTimestamp() })
  ));
};

export const getStudentAttendance = async (studentId: string, year: number, month: number) => {
  const daysInMonth = new Date(year, month, 0).getDate();
  const dates = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  });
  const snaps = await Promise.all(dates.map(d =>
    getDoc(doc(db, 'attendance', d, 'records', studentId)).catch(() => null)
  ));
  const results: Record<string, string> = {};
  snaps.forEach((snap, i) => {
    if (snap?.exists()) results[dates[i]] = snap.data().status;
  });
  return results;
};

export const getAttendanceSummary = async (studentId: string, year: number, month: number) => {
  const records = await getStudentAttendance(studentId, year, month);
  const values = Object.values(records);
  return {
    present: values.filter(v => v === ATTENDANCE_STATUS.PRESENT).length,
    absent: values.filter(v => v === ATTENDANCE_STATUS.ABSENT).length,
    leave: values.filter(v => v === ATTENDANCE_STATUS.LEAVE).length,
    total: values.length,
  };
};

export const getMonthlyAttendanceAllStudents = async (year: number, month: number) => {
  const daysInMonth = new Date(year, month, 0).getDate();
  const dates = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  });
  const summaries: Record<string, any> = {};
  const snaps = await Promise.all(dates.map(d => getDocs(collection(db, 'attendance', d, 'records')).catch(() => null)));
  snaps.forEach(snap => {
    if (!snap) return;
    snap.docs.forEach(d => {
      if (!summaries[d.id]) summaries[d.id] = { present: 0, absent: 0, leave: 0, total: 0 };
      const status = d.data().status;
      summaries[d.id].total++;
      if (status === 'present') summaries[d.id].present++;
      else if (status === 'absent') summaries[d.id].absent++;
      else if (status === 'leave') summaries[d.id].leave++;
    });
  });
  return summaries;
};
