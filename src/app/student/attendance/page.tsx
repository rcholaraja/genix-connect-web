'use client';
import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import dayjs from 'dayjs';
import { useAuth } from '@/context/AuthContext';
import { getStudentAttendance, getAttendanceSummary } from '@/services/attendance';
import { getCalendarEvents } from '@/services/calendar';

const STATUS_COLORS: Record<string, string> = { present: '#4CAF50', absent: '#F44336', leave: '#FFC107' };
const HOLIDAY_BG = '#F0F4FF';
const HOLIDAY_COLOR = '#6C63FF';
const SUNDAY_BG = '#FFF5F5';
const SUNDAY_COLOR = '#FBBF24';
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function StudentAttendancePage() {
  const { userProfile } = useAuth();
  const [month, setMonth] = useState(dayjs());
  const [records, setRecords] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState<any>(null);
  const [holidayDates, setHolidayDates] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile?.id) return;
    setLoading(true);
    Promise.all([
      getStudentAttendance((userProfile as any).id, month.year(), month.month() + 1),
      getAttendanceSummary((userProfile as any).id, month.year(), month.month() + 1),
      getCalendarEvents(month.year(), month.month() + 1),
    ]).then(([recs, summ, calEvents]) => {
      setRecords(recs);
      setSummary(summ);
      setHolidayDates(new Set(calEvents.filter((e: any) => e.type === 'holiday').map((e: any) => e.date)));
    }).catch(console.error).finally(() => setLoading(false));
  }, [month, userProfile?.id]);

  const firstDay = month.startOf('month').day();
  const daysInMonth = month.daysInMonth();
  const pct = summary && summary.total > 0 ? Math.round(summary.present / summary.total * 100) : 0;

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">My Attendance</h1>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
          <button onClick={() => setMonth(month.subtract(1, 'month'))} className="hover:text-[#6C63FF]"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-sm font-semibold text-gray-800 min-w-28 text-center">{month.format('MMM YYYY')}</span>
          <button onClick={() => setMonth(month.add(1, 'month'))} disabled={month.isSame(dayjs(), 'month')} className="hover:text-[#6C63FF] disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[['Present', summary.present, '#4CAF50'], ['Absent', summary.absent, '#F44336'], ['Leave', summary.leave, '#FFC107'], ['%', `${pct}%`, pct >= 75 ? '#4CAF50' : '#F44336']].map(([l, v, c]) => (
            <div key={String(l)} className="bg-white rounded-lg p-3 text-center shadow-sm border border-gray-100 border-t-4" style={{ borderTopColor: String(c) }}>
              <p className="text-xl font-bold" style={{ color: String(c) }}>{v}</p>
              <p className="text-xs text-gray-500 mt-0.5">{l}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        {loading ? <div className="text-center py-8 text-gray-400">Loading...</div> : (
          <>
            <div className="grid grid-cols-7 gap-2 mb-1">
              {DAYS.map(d => <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1.5">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {Array(firstDay).fill(null).map((_, i) => <div key={`e-${i}`} />)}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                const dateStr = `${month.format('YYYY-MM')}-${String(day).padStart(2, '0')}`;
                const status = records[dateStr];
                const isToday = month.date(day).isSame(dayjs(), 'day');
                const isSunday = month.date(day).day() === 0;
                const isHoliday = holidayDates.has(dateStr);

                let bgColor = '#F9FAFB';
                let textColor = isToday ? '#6C63FF' : '#374151';
                let label = '';

                if (isSunday) { bgColor = SUNDAY_BG; textColor = SUNDAY_COLOR; label = 'Off'; }
                else if (isHoliday) { bgColor = HOLIDAY_BG; textColor = HOLIDAY_COLOR; label = 'Hol'; }
                else if (status) { bgColor = STATUS_COLORS[status] + '28'; textColor = STATUS_COLORS[status]; }

                return (
                  <div key={day}
                    className={`h-14 flex flex-col items-center justify-center rounded-lg border border-gray-100 ${isToday ? 'ring-2 ring-[#6C63FF]' : ''}`}
                    style={{ backgroundColor: bgColor }}>
                    <span className="text-sm font-semibold leading-none" style={{ color: textColor }}>{day}</span>
                    {label
                      ? <span className="text-[9px] leading-none mt-1 font-medium" style={{ color: textColor, opacity: 0.75 }}>{label}</span>
                      : status
                        ? <span className="text-[9px] leading-none mt-1 font-bold" style={{ color: textColor }}>{status === 'present' ? 'P' : status === 'absent' ? 'A' : 'L'}</span>
                        : null}
                  </div>
                );
              })}
            </div>
            <div className="flex gap-3 mt-3 justify-center flex-wrap">
              {[['Present', '#4CAF50'], ['Absent', '#F44336'], ['Leave', '#FFC107'], ['Holiday', HOLIDAY_COLOR], ['Sunday', SUNDAY_COLOR]].map(([l, c]) => (
                <div key={l} className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: String(c) + '44', border: `1.5px solid ${c}` }} /><span className="text-[10px] text-gray-500">{l}</span></div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
