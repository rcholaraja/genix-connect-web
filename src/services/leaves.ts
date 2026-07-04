import { collection, doc, getDocs, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { LEAVE_STATUS } from '@/constants';
import { getPushTokens, sendPushNotifications } from '@/services/messages';

function serialize(data: any) {
  if (!data || typeof data !== 'object') return data;
  const out: any = {};
  for (const [k, v] of Object.entries(data)) {
    out[k] = (v && typeof (v as any).toDate === 'function') ? (v as any).toDate().toISOString() : v;
  }
  return out;
}

const sortByCreatedAt = (a: any, b: any) => {
  const ta = a.createdAt ?? '';
  const tb = b.createdAt ?? '';
  return tb > ta ? 1 : -1;
};

export const getLeaveRequests = async (status?: string) => {
  const snap = await getDocs(collection(db, 'leaveRequests'));
  const all = snap.docs.map(d => ({ id: d.id, ...serialize(d.data()) })).sort(sortByCreatedAt);
  return status ? all.filter((r: any) => r.status === status) : all;
};

export const getStudentLeaveRequests = async (studentId: string) => {
  const snap = await getDocs(collection(db, 'leaveRequests'));
  return snap.docs.map(d => ({ id: d.id, ...serialize(d.data()) })).filter((r: any) => r.studentId === studentId).sort(sortByCreatedAt);
};

export const getUnreadLeaveCount = async () => {
  const snap = await getDocs(collection(db, 'leaveRequests'));
  return snap.docs.filter(d => d.data().teacherRead === false).length;
};

export const updateLeaveStatus = async (requestId: string, status: string, teacherNote = '', studentId?: string) => {
  await updateDoc(doc(db, 'leaveRequests', requestId), {
    status, teacherNote, reviewedAt: serverTimestamp(), teacherRead: true,
  });
  // Notify student on their mobile app
  if (studentId) {
    try {
      const tokens = await getPushTokens([studentId]);
      if (tokens.length) {
        const label = status === LEAVE_STATUS.APPROVED ? 'Approved ✓' : 'Rejected ✗';
        await sendPushNotifications(
          tokens,
          `Leave Request ${label}`,
          teacherNote ? `Teacher note: ${teacherNote}` : `Your leave request has been ${status}.`
        );
      }
    } catch (_) {}
  }
};

export const markLeaveRead = async (requestId: string) => {
  await updateDoc(doc(db, 'leaveRequests', requestId), { teacherRead: true });
};

export const submitLeaveRequest = async (studentId: string, studentName: string, fromDate: string, toDate: string, reason: string) => {
  const result = await addDoc(collection(db, 'leaveRequests'), {
    studentId, studentName, fromDate, toDate, reason,
    status: LEAVE_STATUS.PENDING, createdAt: serverTimestamp(), teacherRead: false,
  });
  // Notify teacher on their mobile app
  try {
    const tokens = await getPushTokens(['teacher']);
    if (tokens.length) {
      await sendPushNotifications(
        tokens,
        'New Leave Request',
        `${studentName} applied for leave (${fromDate} to ${toDate})`
      );
    }
  } catch (_) {}
  return result;
};
