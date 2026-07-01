'use client';
import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { getDoc, doc, getDocs, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

function serialize(data: any) {
  if (!data || typeof data !== 'object') return data;
  const out: any = {};
  for (const [k, v] of Object.entries(data)) {
    out[k] = (v && typeof (v as any).toDate === 'function') ? (v as any).toDate().toISOString() : v;
  }
  return out;
}

export default function StudentScoresPage() {
  const { userProfile } = useAuth();
  const [scores, setScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const studentId = (userProfile as any)?.id;
    if (!studentId) return;
    const load = async () => {
      try {
        // Fetch all exams, then fetch only THIS student's score doc per exam (1 read each)
        const examsSnap = await getDocs(collection(db, 'exams'));
        const exams = examsSnap.docs.map(d => ({ id: d.id, ...serialize(d.data()) }));
        const results = await Promise.all(exams.map(async (exam: any) => {
          const scoreSnap = await getDoc(doc(db, 'exams', exam.id, 'scores', studentId));
          if (!scoreSnap.exists()) return null;
          return { exam, marks: scoreSnap.data().marks };
        }));
        setScores(results.filter(Boolean).sort((a: any, b: any) => a.exam.date > b.exam.date ? -1 : 1));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [(userProfile as any)?.id]);

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-5">My Scores</h1>
      {loading ? <p className="text-gray-400">Loading...</p> : scores.length === 0 ? <div className="text-center py-16"><p className="text-gray-400">No exam scores yet.</p></div> : (
        <div className="space-y-3">
          {scores.map(({ exam, marks }: any) => {
            const pct = Math.round(marks / exam.totalMarks * 100);
            return (
              <div key={exam.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-gray-800">{exam.title}</p>
                    <p className="text-sm text-gray-400">{exam.subject ? `${exam.subject} · ` : ''}{dayjs(exam.date).format('D MMM YYYY')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold" style={{ color: pct >= 35 ? '#4CAF50' : '#F44336' }}>{marks}/{exam.totalMarks}</p>
                    <p className="text-sm font-semibold" style={{ color: pct >= 35 ? '#4CAF50' : '#F44336' }}>{pct}%</p>
                  </div>
                </div>
                <div className="mt-3 bg-gray-100 rounded-full h-2"><div className="h-2 rounded-full" style={{ width: `${pct}%`, backgroundColor: pct >= 35 ? '#4CAF50' : '#F44336' }} /></div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
