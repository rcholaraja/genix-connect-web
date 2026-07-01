'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, CheckCheck } from 'lucide-react';
import dayjs from 'dayjs';
import { useToast } from '@/components/ui/Toast';
import { getStudents } from '@/services/students';
import { getAttendanceForDate, saveAttendance } from '@/services/attendance';
import { getLeaveRequests } from '@/services/leaves';
import { getCalendarEvents } from '@/services/calendar';
import { ATTENDANCE_STATUS, LEAVE_STATUS } from '@/constants';

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const colors = ['#6C63FF','#4CAF50','#F44336','#FF9800','#2196F3','#9C27B0','#00BCD4','#FF5722'];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div style={{ width: size, height: size, backgroundColor: color, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: size * 0.38, fontWeight: 700, flexShrink: 0 }}>
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  present: { bg: 'bg-green-100', text: 'text-green-700', label: 'Present' },
  absent: { bg: 'bg-red-100', text: 'text-red-700', label: 'Absent' },
  leave: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Leave' },
};

export default function AttendancePage() {
  const { toast } = useToast();
  const [date, setDate] = useState(dayjs());
  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [filter, setFilter] = useState('All');
  const [isHoliday, setIsHoliday] = useState(false);

  const load = useCallback(async (d: dayjs.Dayjs) => {
    setLoading(true);
    setSaved(false);
    try {
      const dateStr = d.format('YYYY-MM-DD');
      const isSunday = d.day() === 0;
      const calEvents = await getCalendarEvents(d.year(), d.month() + 1);
      const isCalHoliday = calEvents.some((e: any) => e.type === 'holiday' && e.date === dateStr);
      setIsHoliday(isSunday || isCalHoliday);
      if (isSunday || isCalHoliday) { setStudents([]); setLoading(false); return; }

      const [studs, att, leaves] = await Promise.all([
        getStudents(),
        getAttendanceForDate(dateStr),
        getLeaveRequests(),
      ]);
      setStudents(studs);
      const approvedLeaveIds = new Set(
        leaves.filter((l: any) => l.status === LEAVE_STATUS.APPROVED && dateStr >= l.fromDate && dateStr <= l.toDate)
          .map((l: any) => l.studentId)
      );
      const initial: Record<string, string> = {};
      studs.forEach((s: any) => {
        if (att[s.id]) initial[s.id] = att[s.id];
        else if (approvedLeaveIds.has(s.id)) initial[s.id] = ATTENDANCE_STATUS.LEAVE;
        else initial[s.id] = ATTENDANCE_STATUS.PRESENT;
      });
      setAttendance(initial);
      if (Object.keys(att).length > 0) setSaved(true);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(date); }, [date]);

  const toggle = (id: string) => {
    setAttendance(prev => {
      const curr = prev[id];
      const next = curr === 'present' ? 'absent' : curr === 'absent' ? 'leave' : 'present';
      return { ...prev, [id]: next };
    });
  };

  const markAllPresent = () => {
    const all: Record<string, string> = {};
    students.forEach((s: any) => all[s.id] = ATTENDANCE_STATUS.PRESENT);
    setAttendance(all);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const records = students.map((s: any) => ({ studentId: s.id, status: attendance[s.id] ?? ATTENDANCE_STATUS.PRESENT }));
      await saveAttendance(date.format('YYYY-MM-DD'), records);
      setSaved(true);
      toast(`Attendance saved for ${date.format('ddd, D MMM YYYY')}`, 'success');
    } catch (e) { toast('Failed to save attendance.', 'error'); }
    finally { setSaving(false); }
  };

  const counts = { present: 0, absent: 0, leave: 0 };
  students.forEach((s: any) => { const st = attendance[s.id]; if (st === 'present') counts.present++; else if (st === 'absent') counts.absent++; else if (st === 'leave') counts.leave++; });

  const displayStudents = filter === 'All' ? students : students.filter((s: any) => attendance[s.id] === filter.toLowerCase());
  const isToday = date.isSame(dayjs(), 'day');

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
        <div className="flex items-center gap-2 sm:ml-auto">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
            <button onClick={() => setDate(date.subtract(1, 'day'))} className="hover:text-[#6C63FF] transition-colors"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-xs sm:text-sm font-semibold text-gray-800 text-center whitespace-nowrap">{date.format('ddd, D MMM YYYY')}</span>
            <button onClick={() => setDate(date.add(1, 'day'))} disabled={isToday} className="hover:text-[#6C63FF] disabled:opacity-30 transition-colors"><ChevronRight className="w-4 h-4" /></button>
          </div>
          {!isToday && <button onClick={() => setDate(dayjs())} className="text-sm text-[#6C63FF] border border-[#6C63FF] px-3 py-2 rounded-lg hover:bg-[#6C63FF]/5 whitespace-nowrap">Today</button>}
        </div>
      </div>

      {saved && !isHoliday && <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 mb-4 text-green-700 text-sm flex items-center gap-2"><CheckCheck className="w-4 h-4" /> Attendance already saved. You can still make changes.</div>}

      {isHoliday ? (
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <p className="text-6xl mb-4">🎉</p>
            <h2 className="text-2xl font-bold text-gray-700 mb-2">Holiday</h2>
            <p className="text-gray-400">{date.day() === 0 ? 'Sunday — no classes' : 'This day is marked as a holiday in the calendar.'}</p>
          </div>
        </div>
      ) : (
        <>
          {/* Summary + filter */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {[['All', students.length, '#6C63FF'], ['Present', counts.present, '#4CAF50'], ['Absent', counts.absent, '#F44336'], ['Leave', counts.leave, '#FFC107']].map(([label, count, color]) => (
              <button key={String(label)} onClick={() => setFilter(String(label))}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-colors"
                style={{ borderColor: filter === label ? String(color) : '#E5E7EB', backgroundColor: filter === label ? String(color) + '15' : 'white', color: filter === label ? String(color) : '#6B7280' }}>
                {label} {count}
              </button>
            ))}
            <button onClick={markAllPresent} className="ml-auto flex items-center gap-1.5 text-xs text-[#6C63FF] font-medium hover:underline">
              <CheckCheck className="w-3.5 h-3.5" /> All Present
            </button>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-4">
            {loading ? <div className="flex items-center justify-center h-48 text-gray-400">Loading...</div> : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Student', 'Grade', 'Status', 'Toggle'].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayStudents.map((s: any) => {
                    const status = attendance[s.id] ?? 'present';
                    const sc = STATUS_COLORS[status];
                    return (
                      <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-5 py-3"><div className="flex items-center gap-3"><Avatar name={s.name} size={32} /><span className="font-medium text-gray-800 text-sm">{s.name}</span></div></td>
                        <td className="px-5 py-3 text-sm text-gray-500">{s.grade}</td>
                        <td className="px-5 py-3"><span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${sc.bg} ${sc.text}`}>{sc.label}</span></td>
                        <td className="px-5 py-3">
                          <div className="flex gap-1">
                            {(['present', 'absent', 'leave'] as const).map(st => (
                              <button key={st} onClick={() => setAttendance(prev => ({ ...prev, [s.id]: st }))}
                                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors capitalize ${attendance[s.id] === st ? STATUS_COLORS[st].bg + ' ' + STATUS_COLORS[st].text + ' border-transparent' : 'border-gray-200 text-gray-400 hover:border-gray-300'}`}>
                                {st}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2 mb-4">
            {loading ? <div className="bg-white rounded-xl p-8 text-center text-gray-400">Loading...</div> :
              displayStudents.map((s: any) => {
                const status = attendance[s.id] ?? 'present';
                const sc = STATUS_COLORS[status];
                return (
                  <div key={s.id} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Avatar name={s.name} size={32} />
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">{s.name}</p>
                          <p className="text-xs text-gray-400">{s.grade}</p>
                        </div>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${sc.bg} ${sc.text}`}>{sc.label}</span>
                    </div>
                    <div className="flex gap-2">
                      {(['present', 'absent', 'leave'] as const).map(st => (
                        <button key={st} onClick={() => setAttendance(prev => ({ ...prev, [s.id]: st }))}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors capitalize ${attendance[s.id] === st ? STATUS_COLORS[st].bg + ' ' + STATUS_COLORS[st].text + ' border-transparent' : 'border-gray-200 text-gray-400'}`}>
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })
            }
          </div>

          {/* Save bar */}
          <div className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm">
            <span className="text-xs sm:text-sm text-gray-500">{date.format('ddd, D MMM YYYY')}</span>
            <button onClick={handleSave} disabled={saving} className="text-white px-5 py-2 rounded-lg font-medium text-sm disabled:opacity-60 transition-opacity" style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #6C63FF 50%, #4F46E5 100%)' }}>
              {saving ? 'Saving...' : 'Save Attendance'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
