'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import { useAuth } from '@/context/AuthContext';
import { getAttendanceSummary } from '@/services/attendance';
import { getFeeRecord, getCurrentMonthFeeId } from '@/services/fees';
import { getStudentLeaveRequests } from '@/services/leaves';
import { getCalendarEvents } from '@/services/calendar';
import { getStudents } from '@/services/students';
import { FEE_STATUS, LEAVE_STATUS } from '@/constants';
import { Calendar, Wallet, FileText, Megaphone, Gift } from 'lucide-react';

export default function StudentHomePage() {
  const { userProfile } = useAuth();
  const router = useRouter();
  const [attSummary, setAttSummary] = useState<any>(null);
  const [feeStatus, setFeeStatus] = useState<string | null>(null);
  const [pendingLeaves, setPendingLeaves] = useState(0);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [classmateBirthdays, setClassmateBirthdays] = useState<any[]>([]);
  const [isMyBirthday, setIsMyBirthday] = useState(false);
  const now = dayjs();

  useEffect(() => {
    if (!userProfile?.id) return;
    const load = async () => {
      try {
        const todayMMDD = now.format('MM-DD');
        getAttendanceSummary((userProfile as any).id, now.year(), now.month() + 1).then(setAttSummary).catch(() => {});
        const [fee, leaves, allStudents] = await Promise.all([
          getFeeRecord((userProfile as any).id, getCurrentMonthFeeId()),
          getStudentLeaveRequests((userProfile as any).id),
          getStudents(),
        ]);
        setFeeStatus(fee?.status ?? FEE_STATUS.PENDING);
        setPendingLeaves(leaves.filter((r: any) => r.status === LEAVE_STATUS.PENDING).length);
        const myDob = (userProfile as any)?.dob;
        setIsMyBirthday(!!myDob && myDob.slice(5) === todayMMDD);
        setClassmateBirthdays(allStudents.filter((s: any) => s.id !== (userProfile as any).id && s.dob && s.dob.slice(5) === todayMMDD));
        const events = await getCalendarEvents(now.year(), now.month() + 1);
        setUpcomingEvents(events.filter((e: any) => e.date >= now.format('YYYY-MM-DD')).slice(0, 3));
      } catch (e) { console.error(e); }
    };
    load();
  }, [userProfile?.id]);

  const attPct = attSummary && attSummary.total > 0 ? Math.round(attSummary.present / attSummary.total * 100) : null;
  const EVENT_COLORS: Record<string, string> = { class: '#6C63FF', holiday: '#F44336', test: '#FFC107', special: '#2196F3' };

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-gray-500 text-sm">Welcome back,</p>
          <h1 className="text-2xl font-bold text-gray-900">{userProfile?.name ?? 'Student'} 👋</h1>
          <div className="flex items-center gap-3 mt-1">
            {(userProfile as any)?.grade && <span className="bg-[#6C63FF]/10 text-[#6C63FF] text-xs font-semibold px-3 py-1 rounded-full">{(userProfile as any).grade}</span>}
            <span className="text-gray-400 text-sm">{now.format('ddd, D MMM YYYY')}</span>
          </div>
        </div>
      </div>

      {isMyBirthday && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 mb-5 text-center">
          <p className="text-3xl mb-1">🎂 🎉 🥳 🎊 🎈</p>
          <p className="font-bold text-amber-700 text-lg">Happy Birthday!</p>
          <p className="text-amber-600 text-sm">Genix Connect wishes you a wonderful day!</p>
        </div>
      )}

      {!isMyBirthday && classmateBirthdays.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5 flex items-center gap-3">
          <Gift className="w-5 h-5 text-amber-500 shrink-0" />
          <div>
            <p className="font-semibold text-amber-700 text-sm">Birthday Today!</p>
            {classmateBirthdays.map((s: any) => <p key={s.id} className="text-amber-600 text-xs">Today is {s.name}'s birthday! 🎂</p>)}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-6">
        <button onClick={() => router.push('/student/attendance')} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow text-left">
          <div className="w-10 h-10 bg-[#6C63FF]/10 rounded-lg flex items-center justify-center mb-3"><Calendar className="w-5 h-5 text-[#6C63FF]" /></div>
          <p className="text-3xl font-bold" style={{ color: attPct != null && attPct < 75 ? '#F44336' : '#4CAF50' }}>{attPct != null ? `${attPct}%` : '—'}</p>
          <p className="text-sm font-medium text-gray-600 mt-0.5">Attendance</p>
          {attSummary && <p className="text-xs text-gray-400">{attSummary.present}P · {attSummary.absent}A · {attSummary.leave}L</p>}
        </button>
        <button onClick={() => router.push('/student/fees')} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow text-left">
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center mb-3"><Wallet className="w-5 h-5 text-amber-500" /></div>
          <p className={`text-2xl font-bold ${feeStatus === FEE_STATUS.PAID ? 'text-green-600' : 'text-red-500'}`}>{feeStatus === FEE_STATUS.PAID ? 'Paid ✓' : 'Due'}</p>
          <p className="text-sm font-medium text-gray-600 mt-0.5">Fee Status</p>
          <p className="text-xs text-gray-400">{now.format('MMMM YYYY')}</p>
        </button>
        <button onClick={() => router.push('/student/leave')} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow text-left">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3"><FileText className="w-5 h-5 text-blue-500" /></div>
          <p className="text-3xl font-bold text-blue-500">{pendingLeaves}</p>
          <p className="text-sm font-medium text-gray-600 mt-0.5">Leave</p>
          <p className="text-xs text-gray-400">{pendingLeaves === 0 ? 'No pending' : `${pendingLeaves} pending`}</p>
        </button>
        <button onClick={() => router.push('/student/announcements')} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow text-left">
          <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center mb-3"><Megaphone className="w-5 h-5 text-pink-500" /></div>
          <p className="text-3xl font-bold text-pink-500">✓</p>
          <p className="text-sm font-medium text-gray-600 mt-0.5">Announcements</p>
          <p className="text-xs text-gray-400">All read</p>
        </button>
      </div>

      {upcomingEvents.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-3">Upcoming Events</h2>
          <div className="space-y-2">
            {upcomingEvents.map((event: any) => (
              <div key={event.id} className="bg-white rounded-xl p-3 shadow-sm border-l-4 flex items-center justify-between" style={{ borderColor: EVENT_COLORS[event.type] ?? '#9CA3AF' }}>
                <div>
                  <p className="text-xs text-gray-400">{dayjs(event.date).format('ddd, D MMM')}</p>
                  <p className="font-medium text-gray-800 text-sm">{event.title}</p>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full capitalize" style={{ backgroundColor: (EVENT_COLORS[event.type] ?? '#9CA3AF') + '20', color: EVENT_COLORS[event.type] ?? '#6B7280' }}>{event.type}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
