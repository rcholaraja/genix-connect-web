'use client';

import { useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import dayjs from 'dayjs';
import { getLeaveRequests, updateLeaveStatus, markLeaveRead } from '@/services/leaves';
import { LEAVE_STATUS } from '@/constants';
import { useToast } from '@/components/ui/Toast';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const colors = ['#6C63FF','#4CAF50','#F44336','#FF9800','#2196F3','#9C27B0','#00BCD4','#FF5722'];
  const color = colors[name.charCodeAt(0) % colors.length];
  return <div style={{ width: size, height: size, backgroundColor: color, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: size * 0.38, fontWeight: 700, flexShrink: 0 }}>{name.slice(0, 2).toUpperCase()}</div>;
}

export default function LeaveRequestsPage() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(LEAVE_STATUS.PENDING);
  const [confirmAction, setConfirmAction] = useState<{ req: any; status: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setRequests([]);
    getLeaveRequests(filter)
      .then(data => {
        if (cancelled) return;
        setRequests(data);
        setLoading(false);
        // mark as read in background, don't block render
        data.filter((r: any) => r.teacherRead === false).forEach((r: any) => markLeaveRead(r.id));
      })
      .catch(e => { console.error(e); if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [filter]);

  const handleAction = (req: any, status: string) => setConfirmAction({ req, status });

  const doAction = async () => {
    if (!confirmAction) return;
    const { req, status } = confirmAction;
    setConfirmAction(null);
    try {
      await updateLeaveStatus(req.id, status, '', req.studentId);
      toast(`Leave request ${status === LEAVE_STATUS.APPROVED ? 'approved' : 'rejected'} for ${req.studentName}`, 'success');
      setLoading(true);
      setRequests([]);
      const data = await getLeaveRequests(filter);
      setRequests(data);
      setLoading(false);
    } catch (e) { toast('Failed to update leave request', 'error'); setLoading(false); }
  };

  const STATUS_STYLE: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  };

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-5">Leave Requests</h1>
      <div className="flex gap-2 mb-5">
        {[LEAVE_STATUS.PENDING, LEAVE_STATUS.APPROVED, LEAVE_STATUS.REJECTED].map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`px-4 py-1.5 rounded-full text-sm font-semibold capitalize border-2 transition-colors ${filter === s ? 'border-[#6C63FF] bg-[#6C63FF]/10 text-[#6C63FF]' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>{s}</button>
        ))}
      </div>
      {loading ? <div className="text-center py-16 text-gray-400">Loading...</div> : requests.length === 0 ? (
        <div className="text-center py-16"><p className="text-gray-400 text-lg font-medium">No {filter} requests</p></div>
      ) : (
        <div className="space-y-3">
          {requests.map((req: any) => (
            <div key={req.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar name={req.studentName} />
                  <div>
                    <p className="font-semibold text-gray-800">{req.studentName}</p>
                    <p className="text-sm text-gray-500">{dayjs(req.fromDate).format('D MMM')} – {dayjs(req.toDate).format('D MMM YYYY')}</p>
                  </div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${STATUS_STYLE[req.status]}`}>{req.status}</span>
              </div>
              {req.reason && <p className="text-sm text-gray-600 italic mt-2 pl-12">{req.reason}</p>}
              {req.teacherNote && <p className="text-sm text-gray-500 mt-1 pl-12">Note: {req.teacherNote}</p>}
              {req.status === LEAVE_STATUS.PENDING && (
                <div className="flex gap-2 mt-3 pl-12">
                  <button onClick={() => handleAction(req, LEAVE_STATUS.APPROVED)} className="flex items-center gap-1.5 bg-green-50 text-green-700 border border-green-200 px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-green-100 transition-colors"><Check className="w-4 h-4" /> Approve</button>
                  <button onClick={() => handleAction(req, LEAVE_STATUS.REJECTED)} className="flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-200 px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-red-100 transition-colors"><X className="w-4 h-4" /> Reject</button>
                </div>
              )}
              <p className="text-xs text-gray-400 mt-2 pl-12">Submitted {req.createdAt ? dayjs(req.createdAt).format('D MMM YYYY, h:mm a') : ''}</p>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmAction}
        title={confirmAction?.status === LEAVE_STATUS.APPROVED ? 'Approve Leave' : 'Reject Leave'}
        message={`${confirmAction?.status === LEAVE_STATUS.APPROVED ? 'Approve' : 'Reject'} leave request from ${confirmAction?.req?.studentName}?`}
        confirmLabel={confirmAction?.status === LEAVE_STATUS.APPROVED ? 'Approve' : 'Reject'}
        destructive={confirmAction?.status === LEAVE_STATUS.REJECTED}
        onConfirm={doAction}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
