'use client';

import { useState, useEffect } from 'react';
import { Bell, Send, CheckCircle, Users, Wallet } from 'lucide-react';
import { getStudents } from '@/services/students';
import { getAllStudentFeeStatus, getCurrentMonthFeeId } from '@/services/fees';
import { getPushTokens, sendPushNotifications, logMessage } from '@/services/messages';
import { FEE_STATUS } from '@/constants';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';

const TEMPLATES = [
  { id: 'cancelled', title: 'Class Cancelled', icon: '🚫', body: 'Tuition is cancelled today. Classes will resume as normal tomorrow.' },
  { id: 'fee', title: 'Fee Reminder', icon: '💰', body: 'This is a reminder that your tuition fee for this month is pending. Kindly pay at the earliest.' },
  { id: 'holiday', title: 'Holiday Notice', icon: '🎉', body: 'There will be no classes tomorrow on account of the holiday. Classes resume the day after.' },
  { id: 'exam', title: 'Exam Reminder', icon: '📝', body: 'Please note that the exam is scheduled for tomorrow. Be prepared and bring all required materials.' },
  { id: 'result', title: 'Results Out', icon: '🏆', body: 'Your exam results are now available. Please check with your teacher for details.' },
];

export default function MessagesPage() {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [recipientType, setRecipientType] = useState('all');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; total: number; noToken: number } | null>(null);
  const [students, setStudents] = useState<any[]>([]);

  useEffect(() => { getStudents().then(setStudents).catch(console.error); }, []);

  const handleTemplate = (t: typeof TEMPLATES[0]) => {
    setMessage(t.body);
    if (!title) setTitle(t.title);
  };

  const getTargets = async () => {
    if (recipientType === 'pending_fees') {
      const feeStatus = await getAllStudentFeeStatus(getCurrentMonthFeeId());
      const pendingIds = new Set(feeStatus.filter((f: any) => f.status !== FEE_STATUS.PAID).map((f: any) => f.studentId));
      return students.filter((s: any) => pendingIds.has(s.id));
    }
    return students;
  };

  const handleSend = async () => {
    if (!title.trim()) { toast('Enter a notification title.', 'error'); return; }
    if (!message.trim()) { toast('Enter a message.', 'error'); return; }
    setSending(true);
    setResult(null);
    try {
      const targets = await getTargets();
      if (targets.length === 0) { toast('No students found for the selected group.', 'info'); return; }

      const tokens = await getPushTokens(targets.map((s: any) => s.id));
      const noToken = targets.length - tokens.length;

      if (tokens.length === 0) {
        toast(`No students have the mobile app installed yet (${targets.length} students selected).`, 'info');
        return;
      }

      await sendPushNotifications(tokens, title, message);

      await logMessage({
        sentBy: userProfile?.name ?? 'Teacher',
        title,
        message,
        channel: 'push',
        recipientType,
        recipientCount: tokens.length,
      });

      setResult({ sent: tokens.length, total: targets.length, noToken });
      toast(`Push notification sent to ${tokens.length} student${tokens.length > 1 ? 's' : ''}!`, 'success');
    } catch (e: any) {
      toast(e.message ?? 'Failed to send. Please try again.', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-5">Push Notifications</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-5">

        {/* Recipient */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Send To</p>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setRecipientType('all')}
              className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-colors ${recipientType === 'all' ? 'border-[#6C63FF] bg-[#6C63FF]/5' : 'border-gray-200 hover:border-gray-300'}`}>
              <Users className="w-5 h-5 shrink-0" style={{ color: recipientType === 'all' ? '#6C63FF' : '#9CA3AF' }} />
              <div className="text-left">
                <p className="text-sm font-semibold" style={{ color: recipientType === 'all' ? '#6C63FF' : '#374151' }}>All Students</p>
                <p className="text-xs text-gray-400">{students.length} students</p>
              </div>
            </button>
            <button onClick={() => setRecipientType('pending_fees')}
              className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-colors ${recipientType === 'pending_fees' ? 'border-[#6C63FF] bg-[#6C63FF]/5' : 'border-gray-200 hover:border-gray-300'}`}>
              <Wallet className="w-5 h-5 shrink-0" style={{ color: recipientType === 'pending_fees' ? '#6C63FF' : '#9CA3AF' }} />
              <div className="text-left">
                <p className="text-sm font-semibold" style={{ color: recipientType === 'pending_fees' ? '#6C63FF' : '#374151' }}>Pending Fee</p>
                <p className="text-xs text-gray-400">Students with due fees</p>
              </div>
            </button>
          </div>
        </div>

        {/* Templates */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Quick Templates</p>
          <div className="flex gap-2 flex-wrap">
            {TEMPLATES.filter(t => recipientType === 'pending_fees' ? t.id === 'fee' : true).map(t => (
              <button key={t.id} onClick={() => handleTemplate(t)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#6C63FF]/40 text-xs font-semibold text-[#6C63FF] hover:bg-[#6C63FF]/5 transition-colors">
                <span>{t.icon}</span>{t.title}
              </button>
            ))}
          </div>
        </div>

        {/* Compose */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Notification Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Fee Reminder"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#6C63FF]" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Message *</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)}
              placeholder="Type your message here..." rows={4}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#6C63FF] resize-none" />
            <p className="text-right text-xs text-gray-400 mt-1">{message.length} chars</p>
          </div>
        </div>

        <button onClick={handleSend} disabled={sending}
          className="w-full py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #6C63FF 50%, #4F46E5 100%)' }}>
          {sending
            ? <><Bell className="w-4 h-4 animate-pulse" /> Sending...</>
            : <><Send className="w-4 h-4" /> Send Push Notification</>}
        </button>
      </div>

      {/* Result card */}
      {result && (
        <div className="mt-4 bg-white rounded-xl border border-green-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <CheckCircle className="w-6 h-6 text-green-500 shrink-0" />
            <p className="font-bold text-green-800">Notification Sent!</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-green-50 rounded-lg p-3">
              <p className="text-2xl font-bold text-green-600">{result.sent}</p>
              <p className="text-xs text-gray-500 mt-0.5">Delivered</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-2xl font-bold text-gray-600">{result.total}</p>
              <p className="text-xs text-gray-500 mt-0.5">Selected</p>
            </div>
            <div className={`rounded-lg p-3 ${result.noToken > 0 ? 'bg-amber-50' : 'bg-gray-50'}`}>
              <p className={`text-2xl font-bold ${result.noToken > 0 ? 'text-amber-500' : 'text-gray-400'}`}>{result.noToken}</p>
              <p className="text-xs text-gray-500 mt-0.5">No app</p>
            </div>
          </div>
          {result.noToken > 0 && (
            <p className="text-xs text-amber-600 mt-3 bg-amber-50 rounded-lg px-3 py-2">
              {result.noToken} student{result.noToken > 1 ? 's have' : ' has'} not installed the Genix Connect mobile app yet.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
