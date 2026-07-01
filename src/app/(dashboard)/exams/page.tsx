'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import dayjs from 'dayjs';
import { getExams, addExam, deleteExam, getExamScores, saveScore } from '@/services/exams';
import { getStudents } from '@/services/students';
import { useToast } from '@/components/ui/Toast';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

const GRADES = ['Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','Grade 10','Grade 11','Grade 12'];

function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const colors = ['#6C63FF','#4CAF50','#F44336','#FF9800','#2196F3','#9C27B0','#00BCD4','#FF5722'];
  const color = colors[name.charCodeAt(0) % colors.length];
  return <div style={{ width: size, height: size, backgroundColor: color, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: size * 0.38, fontWeight: 700, flexShrink: 0 }}>{name.slice(0, 2).toUpperCase()}</div>;
}

export default function ExamsPage() {
  const { toast } = useToast();
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedExam, setSelectedExam] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [confirmDeleteExam, setConfirmDeleteExam] = useState<any>(null);
  const [form, setForm] = useState({ title: '', subject: '', date: dayjs().format('YYYY-MM-DD'), totalMarks: '100', grade: '' });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try { setExams(await getExams()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleAddExam = async () => {
    if (!form.title.trim()) { toast('Enter exam title.', 'error'); return; }
    try { await addExam(form); setShowForm(false); setForm({ title: '', subject: '', date: dayjs().format('YYYY-MM-DD'), totalMarks: '100', grade: '' }); load(); toast('Exam added', 'success'); }
    catch (e) { toast('Failed to add exam.', 'error'); }
  };

  const handleOpenScores = async (exam: any) => {
    setSelectedExam(exam);
    try {
      const [studs, existingScores] = await Promise.all([getStudents(), getExamScores(exam.id)]);
      const filtered = exam.grade ? studs.filter((s: any) => s.grade === exam.grade) : studs;
      setStudents(filtered);
      const scoreMap: Record<string, string> = {};
      existingScores.forEach((s: any) => { scoreMap[s.studentId] = String(s.marks); });
      setScores(scoreMap);
    } catch (e) { console.error(e); }
  };

  const handleSaveScores = async () => {
    setSaving(true);
    try {
      await Promise.all(students.map(s => { const marks = scores[s.id]; if (marks !== undefined && marks !== '') return saveScore(selectedExam.id, s.id, marks, s.name); }).filter(Boolean));
      toast('Scores saved successfully.', 'success');
      setSelectedExam(null);
    } catch (e) { toast('Failed to save scores.', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = (exam: any) => setConfirmDeleteExam(exam);

  const doDeleteExam = async () => {
    if (!confirmDeleteExam) return;
    try { await deleteExam(confirmDeleteExam.id); toast('Exam deleted', 'success'); load(); }
    catch (e) { toast('Failed to delete exam', 'error'); }
    finally { setConfirmDeleteExam(null); }
  };

  if (selectedExam) return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <button onClick={() => setSelectedExam(null)} className="text-[#6C63FF] text-sm font-medium hover:underline mb-1">← Back to Exams</button>
          <h1 className="text-2xl font-bold text-gray-900">{selectedExam.title}</h1>
          <p className="text-gray-500 text-sm">{dayjs(selectedExam.date).format('D MMM YYYY')} · Total: {selectedExam.totalMarks} marks {selectedExam.grade ? `· ${selectedExam.grade}` : '· All grades'}</p>
        </div>
        {students.length > 0 && <button onClick={handleSaveScores} disabled={saving} className="text-white px-5 py-2 rounded-lg font-medium text-sm disabled:opacity-60 transition-opacity" style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #6C63FF 50%, #4F46E5 100%)' }}>{saving ? 'Saving...' : 'Save Scores'}</button>}
      </div>
      {students.length === 0 ? <div className="text-center py-16 text-gray-400">No students found for this exam's grade.</div> : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>{['Student', 'Grade', 'Marks', 'Out of', '%'].map(h => <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>)}</tr>
            </thead>
            <tbody>
              {students.map((s: any) => {
                const marks = scores[s.id];
                const pct = marks && selectedExam.totalMarks ? Math.round(Number(marks) / selectedExam.totalMarks * 100) : null;
                return (
                  <tr key={s.id} className="border-b border-gray-50">
                    <td className="px-5 py-3"><div className="flex items-center gap-3"><Avatar name={s.name} /><span className="font-medium text-gray-800 text-sm">{s.name}</span></div></td>
                    <td className="px-5 py-3 text-sm text-gray-500">{s.grade}</td>
                    <td className="px-5 py-3"><input type="number" value={marks ?? ''} onChange={e => setScores(sc => ({ ...sc, [s.id]: e.target.value }))} placeholder="—" max={selectedExam.totalMarks} className="w-20 border-2 border-[#6C63FF]/30 focus:border-[#6C63FF] rounded-lg px-3 py-1.5 text-sm font-bold text-center focus:outline-none" /></td>
                    <td className="px-5 py-3 text-sm text-gray-500">/{selectedExam.totalMarks}</td>
                    <td className="px-5 py-3">{pct !== null && <span className={`text-sm font-bold ${pct >= 35 ? 'text-green-600' : 'text-red-500'}`}>{pct}%</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-gray-900">Exams & Scores</h1>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 text-white px-4 py-2 rounded-lg text-sm font-medium transition-opacity" style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #6C63FF 50%, #4F46E5 100%)' }}><Plus className="w-4 h-4" /> Add Exam</button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-5">
          <h3 className="font-bold text-gray-800 mb-4">Add Exam</h3>
          <div className="grid grid-cols-2 gap-4">
            {[['Exam Title *', 'title', 'e.g. Unit Test 1'], ['Subject', 'subject', 'e.g. Mathematics'], ['Total Marks', 'totalMarks', '100', 'number']].map(([label, key, placeholder, type]) => (
              <div key={String(key)}>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</label>
                <input type={String(type || 'text')} placeholder={String(placeholder)} value={(form as any)[String(key)]} onChange={e => setForm(f => ({ ...f, [String(key)]: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#6C63FF]" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Date</label>
              <input type="date" value={form.date} min={dayjs().format('YYYY-MM-DD')} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#6C63FF]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Grade (optional)</label>
              <select value={form.grade} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#6C63FF]">
                <option value="">All grades</option>
                {GRADES.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleAddExam} className="text-white px-5 py-2 rounded-lg text-sm font-medium transition-opacity" style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #6C63FF 50%, #4F46E5 100%)' }}>Add Exam</button>
            <button onClick={() => setShowForm(false)} className="border border-gray-200 px-5 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}

      {loading ? <div className="text-center py-16 text-gray-400">Loading...</div> : exams.length === 0 ? (
        <div className="text-center py-16"><p className="text-gray-400 text-lg font-medium">No exams yet</p><p className="text-gray-300 text-sm mt-1">Click + Add Exam to get started</p></div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {exams.map((exam: any) => (
            <div key={exam.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center justify-between hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleOpenScores(exam)}>
              <div>
                <p className="font-bold text-gray-800">{exam.title}</p>
                <p className="text-sm text-gray-500 mt-0.5">{exam.subject ? `${exam.subject} · ` : ''}{dayjs(exam.date).format('D MMM YYYY')} · {exam.grade || 'All grades'} · {exam.totalMarks} marks</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-[#6C63FF] font-medium">Enter Scores →</span>
                <button onClick={e => { e.stopPropagation(); handleDelete(exam); }} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDeleteExam}
        title="Delete Exam"
        message={`Delete "${confirmDeleteExam?.title}"? All scores will be permanently lost.`}
        confirmLabel="Delete"
        destructive
        onConfirm={doDeleteExam}
        onCancel={() => setConfirmDeleteExam(null)}
      />
    </div>
  );
}
