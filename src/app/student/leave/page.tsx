'use client';
import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { useAuth } from '@/context/AuthContext';
import { getStudentLeaveRequests, submitLeaveRequest } from '@/services/leaves';
import { LEAVE_STATUS } from '@/constants';
import { Plus, X } from 'lucide-react';

export default function StudentLeavePage() {
  const { userProfile } = useAuth();
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const today = dayjs().format('YYYY-MM-DD');
  const [form, setForm] = useState({ fromDate: today, toDate: today, reason: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (userProfile?.id) load(); }, [userProfile?.id]);

  const load = async () => {
    setLoading(true);
    try { setLeaves(await getStudentLeaveRequests((userProfile as any).id)); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (!form.fromDate || !form.toDate || !form.reason.trim()) { setError('Please fill all fields.'); return; }
    if (form.toDate < form.fromDate) { setError('End date must be on or after start date.'); return; }

    // Check for overlapping existing requests
    const overlap = leaves.find((r: any) => {
      if (r.status === LEAVE_STATUS.REJECTED) return false;
      return r.fromDate <= form.toDate && r.toDate >= form.fromDate;
    });
    if (overlap) {
      setError(overlap.status === LEAVE_STATUS.APPROVED
        ? 'An approved leave already exists covering this date range.'
        : 'A pending leave request already exists covering this date range.');
      return;
    }

    setSaving(true);
    try {
      await submitLeaveRequest((userProfile as any).id, userProfile?.name ?? '', form.fromDate, form.toDate, form.reason);
      setShowForm(false); setForm({ fromDate: today, toDate: today, reason: '' }); load();
    } catch (e) { setError('Failed to submit leave request.'); }
    finally { setSaving(false); }
  };

  const STATUS_STYLE: Record<string, string> = { pending: 'bg-amber-100 text-amber-700', approved: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700' };

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-gray-900">Leave Requests</h1>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 text-white px-4 py-2 rounded-lg text-sm font-medium transition-opacity" style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #6C63FF 50%, #4F46E5 100%)' }}><Plus className="w-4 h-4" /> Apply Leave</button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-5">
          <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-gray-800">Apply for Leave</h3><button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button></div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">From Date</label><input type="date" value={form.fromDate} min={today} onChange={e => setForm(f => ({ ...f, fromDate: e.target.value, toDate: e.target.value > f.toDate ? e.target.value : f.toDate }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#6C63FF]" /></div>
            <div><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">To Date</label><input type="date" value={form.toDate} min={form.fromDate} onChange={e => setForm(f => ({ ...f, toDate: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#6C63FF]" /></div>
          </div>
          <div className="mb-4"><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Reason</label><textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Reason for leave..." rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#6C63FF] resize-none" /></div>
          {error && <p className="text-red-500 text-sm mb-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <button onClick={handleSubmit} disabled={saving} className="w-full text-white py-2.5 rounded-lg font-medium disabled:opacity-60 transition-opacity" style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #6C63FF 50%, #4F46E5 100%)' }}>{saving ? 'Submitting...' : 'Submit Request'}</button>
        </div>
      )}

      {loading ? <p className="text-gray-400">Loading...</p> : leaves.length === 0 ? <div className="text-center py-16"><p className="text-gray-400">No leave requests yet.</p></div> : (
        <div className="space-y-3">
          {leaves.map((req: any) => (
            <div key={req.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between mb-2">
                <div><p className="font-semibold text-gray-800">{dayjs(req.fromDate).format('D MMM')} – {dayjs(req.toDate).format('D MMM YYYY')}</p><p className="text-xs text-gray-400 mt-0.5">Submitted {req.createdAt ? dayjs(req.createdAt).format('D MMM YYYY') : ''}</p></div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${STATUS_STYLE[req.status]}`}>{req.status}</span>
              </div>
              <p className="text-sm text-gray-600 italic">{req.reason}</p>
              {req.teacherNote && <p className="text-sm text-gray-500 mt-1">Teacher: {req.teacherNote}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
