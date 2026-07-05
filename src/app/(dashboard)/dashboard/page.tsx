'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dayjs from 'dayjs';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from 'recharts';
import { Users, CheckCircle, Wallet, FileText, RefreshCw, Gift, Bell, UserPlus, CreditCard, ClipboardList, BookOpen } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getStudents } from '@/services/students';
import { getAttendanceForDate } from '@/services/attendance';
import { getAllStudentFeeStatus, getCurrentMonthFeeId } from '@/services/fees';
import { getLeaveRequests, getUnreadLeaveCount } from '@/services/leaves';
import { getCalendarEvents } from '@/services/calendar';
import { getPushTokens, sendPushNotifications } from '@/services/messages';
import { LEAVE_STATUS, FEE_STATUS } from '@/constants';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function DashboardPage() {
  const { userProfile } = useAuth();
  const router = useRouter();
  const [summary, setSummary] = useState({ totalStudents: 0, presentToday: 0, pendingFees: 0, pendingLeaves: 0, attendanceMarked: false });
  const [unreadLeaves, setUnreadLeaves] = useState(0);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [feeData, setFeeData] = useState({ paid: 0, pending: 0, paidAmount: 0, pendingAmount: 0 });
  const [birthdayStudents, setBirthdayStudents] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [todayHolidayName, setTodayHolidayName] = useState<string | null>(null);

  const EVENT_COLORS: Record<string, string> = { class: '#6C63FF', holiday: '#F44336', test: '#FFC107', special: '#2196F3' };

  const load = useCallback(async (signal?: { cancelled: boolean }) => {
    try {
      setLoading(true);
      const today = dayjs().format('YYYY-MM-DD');
      const todayMMDD = dayjs().format('MM-DD');
      const now = dayjs();

      // Phase 1: minimal reads — students, today attendance, leaves, calendar
      // Does NOT wait for fee status (13 reads) — that runs in background
      const [students, todayAtt, leaves, unread, calEvents] = await Promise.all([
        getStudents(),
        getAttendanceForDate(today),
        getLeaveRequests(LEAVE_STATUS.PENDING),
        getUnreadLeaveCount(),
        getCalendarEvents(now.year(), now.month() + 1),
      ]);

      if (signal?.cancelled) return;

      const presentCount = Object.values(todayAtt).filter((s) => s === 'present').length;
      const birthdays = students.filter((s: any) => s.dob && s.dob.slice(5) === todayMMDD);

      setBirthdayStudents(birthdays);

      // Check if today is Sunday or a calendar holiday
      const isSunday = dayjs().day() === 0;
      const todayHoliday = calEvents.find((e: any) => e.type === 'holiday' && e.date === today);
      setTodayHolidayName(isSunday ? 'Sunday' : todayHoliday ? todayHoliday.title : null);

      // Send birthday push notifications — per-student guard so multiple same-day birthdays all fire
      if (birthdays.length > 0) {
        try {
          // per-student birthday notification guard
          // Check which students haven't been notified today yet
          const sentChecks = await Promise.all(
            birthdays.map((s: any) => getDoc(doc(db, 'config', `birthdayNotif_${today}_${s.id}`)))
          );
          const newBirthdays = birthdays.filter((_: any, i: number) => !sentChecks[i].exists());
          if (newBirthdays.length > 0) {
            // Mark them all as notified
            await Promise.all(newBirthdays.map((s: any) =>
              setDoc(doc(db, 'config', `birthdayNotif_${today}_${s.id}`), { date: today, studentId: s.id })
            ));
            const newIds = newBirthdays.map((s: any) => s.id);
            // Notify birthday students
            const bdayTokens = await getPushTokens(newIds);
            if (bdayTokens.length) await sendPushNotifications(bdayTokens, '🎂 Happy Birthday! 🎉', 'Genix Connect wishes you a very Happy Birthday! 🎊🥳🎈 Have a wonderful day!');
            // Notify other students — simple consistent format
            const otherTokens = await getPushTokens(students.filter((s: any) => !newIds.includes(s.id)).map((s: any) => s.id));
            if (otherTokens.length) {
              const body = newBirthdays.map((s: any) => `Today is ${s.name}'s birthday! 🎂`).join(' ');
              await sendPushNotifications(otherTokens, '🎂 Birthday Today!', body);
            }
            // Notify teacher — same format
            const teacherTokens = await getPushTokens(['teacher']);
            if (teacherTokens.length) {
              const body = newBirthdays.map((s: any) => `Today is ${s.name}'s birthday! 🎂`).join(' ');
              await sendPushNotifications(teacherTokens, `🎂 ${newBirthdays.length === 1 ? '1 Birthday' : `${newBirthdays.length} Birthdays`} Today!`, body);
            }
          }
        } catch (_) {}
      }
      setUnreadLeaves(unread);
      setSummary(prev => ({ ...prev, totalStudents: students.length, presentToday: presentCount, pendingLeaves: leaves.length, attendanceMarked: Object.keys(todayAtt).length > 0 }));
      setUpcomingEvents(calEvents.filter((e: any) => e.date >= today).slice(0, 3));

      const activity: any[] = [];
      const presentStudents = Object.entries(todayAtt).filter(([, v]) => v === 'present');
      if (presentStudents.length > 0) {
        const s = students.find((st: any) => st.id === presentStudents[0][0]);
        if (s) activity.push({ icon: CheckCircle, color: '#4CAF50', text: `${s.name} marked Present`, time: 'Today' });
      }
      if (leaves.length > 0) activity.push({ icon: ClipboardList, color: '#FFC107', text: `${leaves[0].studentName} requested a leave`, time: 'Pending' });
      if (birthdays.length > 0) activity.push({ icon: Gift, color: '#FF5722', text: `${birthdays[0].name}'s birthday today! 🎂`, time: 'Today' });
      if (students.length > 0) activity.push({ icon: UserPlus, color: '#2196F3', text: `${students[students.length - 1].name} is enrolled`, time: 'Student' });
      setRecentActivity(activity.slice(0, 5));

      // Phase 1 done — tiles render NOW
      setLoading(false);
      setRefreshing(false);

      // Phase 2 (background): fee status + weekly chart — don't block tiles
      const [feeStatus] = await Promise.all([
        getAllStudentFeeStatus(getCurrentMonthFeeId()),
      ]);
      if (signal?.cancelled) return;

      const pendingFeeCount = feeStatus.filter((f: any) => f.status !== FEE_STATUS.PAID).length;
      const paidAmount = feeStatus.filter((f: any) => f.status === FEE_STATUS.PAID).reduce((s: number, f: any) => s + (f.feeAmount || 0), 0);
      const pendingAmount = feeStatus.filter((f: any) => f.status !== FEE_STATUS.PAID).reduce((s: number, f: any) => s + (f.feeAmount || 0), 0);
      setSummary(prev => ({ ...prev, pendingFees: pendingFeeCount }));
      setFeeData({ paid: students.length - pendingFeeCount, pending: pendingFeeCount, paidAmount, pendingAmount });

      const paidFees = feeStatus.filter((f: any) => f.status === FEE_STATUS.PAID);
      if (paidFees.length > 0) setRecentActivity(prev => [{ icon: CreditCard, color: '#6C63FF', text: `${paidFees[0].studentName} paid the monthly fee`, time: 'This month' }, ...prev].slice(0, 5));

      // Phase 3 (background): weekly attendance chart
      const holidayDates = new Set(calEvents.filter((e: any) => e.type === 'holiday').map((e: any) => e.date));
      const weekDays = [];
      for (let i = 6; i >= 0; i--) {
        const date = now.subtract(i, 'day');
        if (date.day() === 0) continue;
        weekDays.push(date);
      }
      const weeklyAtts = await Promise.all(weekDays.map(date => {
        const dateStr = date.format('YYYY-MM-DD');
        if ((holidayDates as Set<string>).has(dateStr)) return Promise.resolve(null);
        return getAttendanceForDate(dateStr);
      }));
      if (signal?.cancelled) return;
      const weekly = weekDays.map((date, i) => {
        const dateStr = date.format('YYYY-MM-DD');
        if ((holidayDates as Set<string>).has(dateStr)) return { day: date.format('ddd'), Present: 0, Absent: 0, Leave: 0, Holiday: 1 };
        const att = weeklyAtts[i] as Record<string, string>;
        const vals = Object.values(att);
        return { day: date.format('ddd'), Present: vals.filter(v => v === 'present').length, Absent: vals.filter(v => v === 'absent').length, Leave: vals.filter(v => v === 'leave').length, Holiday: 0 };
      });
      setWeeklyData(weekly);
    } catch (e) {
      console.error('Dashboard load error', e);
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const signal = { cancelled: false };
    load(signal);
    return () => { signal.cancelled = true; };
  }, [load]);

  const handleRefresh = () => { setRefreshing(true); load(); };

  const greeting = () => {
    const h = dayjs().hour();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const PIE_COLORS = ['#4CAF50', '#FFC107'];
  const pieData = [{ name: 'Paid', value: feeData.paid }, { name: 'Pending', value: feeData.pending }];

  const STAT_CARDS = [
    { label: 'Total Students', value: summary.totalStudents, icon: Users, color: '#6C63FF', sub: 'Enrolled students', href: '/students', holiday: null },
    { label: 'Present Today', value: summary.presentToday, icon: CheckCircle, color: '#4CAF50', sub: `Out of ${summary.totalStudents} students`, badge: !todayHolidayName && !summary.attendanceMarked ? 'Not Marked' : null, href: '/attendance', holiday: todayHolidayName },
    { label: 'Pending Fees', value: summary.pendingFees, icon: Wallet, color: '#FFC107', sub: 'This month', href: '/fees', holiday: null },
    { label: 'Leave Requests', value: summary.pendingLeaves, icon: FileText, color: '#2196F3', sub: 'Pending approval', badge: unreadLeaves > 0 ? `${unreadLeaves} unread` : null, href: '/leave-requests', holiday: null },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-2">
        <div>
          <p className="text-gray-500 text-sm">{greeting()},</p>
          <h1 className="text-2xl font-bold text-gray-900">{userProfile?.name ?? 'Teacher'} 👋</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <div className="hidden sm:flex items-center gap-2 bg-[#6C63FF]/10 text-[#6C63FF] px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap">
            📅 {dayjs().format('ddd, D MMM YYYY')}
          </div>
          <button onClick={() => router.push('/leave-requests')} className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Bell className="w-5 h-5 text-gray-500" />
            {unreadLeaves > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{unreadLeaves}</span>
            )}
          </button>
          <button onClick={handleRefresh} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <RefreshCw className={`w-5 h-5 text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Birthday banner */}
      {birthdayStudents.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 mb-6 flex items-center gap-3">
          <Gift className="w-5 h-5 text-amber-500 shrink-0" />
          <p className="font-semibold text-amber-700">
            {birthdayStudents.length === 1
              ? `🎂 Today is ${birthdayStudents[0].name}'s Birthday! 🎉🥳`
              : `🎂 ${birthdayStudents.map((s: any) => `Today is ${s.name}'s Birthday! 🎂`).join(' ')} 🎉🥳`}
          </p>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {STAT_CARDS.map(({ label, value, icon: Icon, color, sub, badge, href, holiday }) => (
          <Link key={label} href={href}
            className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-[#6C63FF]/30 transition-all text-left block">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + '18' }}>
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
              {badge && <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: color + '18', color }}>{badge}</span>}
            </div>
            {holiday ? (
              <>
                <p className="text-xl font-bold mt-1" style={{ color }}>{holiday}</p>
                <p className="text-sm font-medium mt-0.5" style={{ color }}>No Classes</p>
              </>
            ) : (
              <>
                <p className="text-3xl font-bold text-gray-900">{loading ? '0' : value}</p>
                <p className="text-sm font-medium text-gray-600 mt-0.5">{label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
              </>
            )}
          </Link>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
        <div className="col-span-1 md:col-span-3 bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-gray-800">Attendance Overview</h3>
              <p className="text-xs text-gray-400">Mon–Sat this week</p>
            </div>
            <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full font-medium">This Week</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weeklyData} barSize={12}>
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} />
              <Tooltip
                cursor={{ fill: 'transparent' }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const isHoliday = payload.find((p: any) => p.dataKey === 'Holiday' && p.value > 0);
                  if (isHoliday) return (
                    <div style={{ background: 'white', padding: '8px 12px', borderRadius: 8, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
                      <p style={{ fontWeight: 600, color: '#374151' }}>{label}</p>
                      <p style={{ color: '#9CA3AF', fontSize: 13 }}>Holiday</p>
                    </div>
                  );
                  return (
                    <div style={{ background: 'white', padding: '8px 12px', borderRadius: 8, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
                      <p style={{ fontWeight: 600, color: '#374151', marginBottom: 4 }}>{label}</p>
                      {payload.filter((p: any) => p.dataKey !== 'Holiday' && p.value > 0).map((p: any) => (
                        <p key={p.dataKey} style={{ color: p.fill, fontSize: 13 }}>{p.dataKey}: {p.value}</p>
                      ))}
                    </div>
                  );
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} formatter={(value) => value === 'Holiday' ? null : value} />
              <Bar dataKey="Present" fill="#4CAF50" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Absent" fill="#F44336" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Leave" fill="#FFC107" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Holiday" fill="#E8E8E8" radius={[4, 4, 0, 0]} legendType="none" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="col-span-1 md:col-span-2 bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-1">Fee Collection</h3>
          <p className="text-xs text-gray-400 mb-3">{dayjs().format('MMMM YYYY')}</p>
          <div className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} dataKey="value" startAngle={90} endAngle={-270}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <p className="text-2xl font-bold text-gray-800 -mt-2">₹{feeData.paidAmount.toLocaleString('en-IN')}</p>
            <p className="text-xs text-gray-400 mb-3">collected</p>
            <div className="flex gap-4 w-full">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-green-500" /><span className="text-xs text-gray-500">Paid ₹{feeData.paidAmount.toLocaleString('en-IN')}</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-amber-400" /><span className="text-xs text-gray-500">Pending ₹{feeData.pendingAmount.toLocaleString('en-IN')}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom row — Recent Activity + Upcoming Events */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recent Activity */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4">Recent Activity</h3>
          {recentActivity.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">No recent activity</p>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: item.color + '18' }}>
                    <item.icon className="w-4 h-4" style={{ color: item.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate">{item.text}</p>
                    <p className="text-xs text-gray-400">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Events */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800">Upcoming Events</h3>
            <button onClick={() => router.push('/calendar')} className="text-xs text-[#6C63FF] hover:underline">View all →</button>
          </div>
          {upcomingEvents.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">No upcoming events</p>
          ) : (
            <div className="space-y-2">
              {upcomingEvents.map((event: any) => (
                <div key={event.id} className="flex items-center gap-3 p-2 rounded-lg border-l-4" style={{ borderColor: EVENT_COLORS[event.type] ?? '#9CA3AF' }}>
                  <div className="min-w-12 text-center">
                    <p className="text-lg font-bold leading-none" style={{ color: EVENT_COLORS[event.type] ?? '#6B7280' }}>{dayjs(event.date).format('DD')}</p>
                    <p className="text-xs text-gray-400">{dayjs(event.date).format('MMM')}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{event.title}</p>
                    <p className="text-xs text-gray-400">{dayjs(event.date).format('dddd')}</p>
                  </div>
                  <span className="text-xs font-semibold capitalize px-2 py-0.5 rounded-full" style={{ backgroundColor: (EVENT_COLORS[event.type] ?? '#9CA3AF') + '18', color: EVENT_COLORS[event.type] ?? '#6B7280' }}>{event.type}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
