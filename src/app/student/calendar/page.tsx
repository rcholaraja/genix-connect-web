'use client';
import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { getCalendarEvents } from '@/services/calendar';
import { ChevronLeft, ChevronRight, PartyPopper, FlaskConical, BookOpen, Star, CalendarDays } from 'lucide-react';

const EVENT_COLORS: Record<string, string> = { class: '#6C63FF', holiday: '#F44336', test: '#FFC107', special: '#2196F3' };
const EVENT_ICONS: Record<string, any> = { holiday: PartyPopper, test: FlaskConical, class: BookOpen, special: Star };
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function StudentCalendarPage() {
  const [month, setMonth] = useState(dayjs());
  const [events, setEvents] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));

  useEffect(() => {
    getCalendarEvents(month.year(), month.month() + 1)
      .then(setEvents)
      .catch(console.error);
  }, [month]);

  const firstDay = month.startOf('month').day();
  const daysInMonth = month.daysInMonth();
  const eventsByDate: Record<string, any[]> = {};
  events.forEach(e => { if (!eventsByDate[e.date]) eventsByDate[e.date] = []; eventsByDate[e.date].push(e); });
  const calDays = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const selectedEvents = events.filter(e => e.date === selectedDate);
  const allMonthItems = [...events].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-5">Calendar</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        <div className="col-span-1 md:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setMonth(month.subtract(1, 'month'))} className="p-1 hover:bg-gray-100 rounded"><ChevronLeft className="w-5 h-5" /></button>
            <h3 className="font-bold text-gray-800">{month.format('MMMM YYYY')}</h3>
            <button onClick={() => setMonth(month.add(1, 'month'))} className="p-1 hover:bg-gray-100 rounded"><ChevronRight className="w-5 h-5" /></button>
          </div>
          <div className="grid grid-cols-7 gap-1.5 mb-1">{DAYS.map(d => <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1.5">{d}</div>)}</div>
          <div className="grid grid-cols-7 gap-1.5">
            {calDays.map((day, idx) => {
              if (!day) return <div key={`e-${idx}`} />;
              const dateStr = month.date(day).format('YYYY-MM-DD');
              const dayEvents = eventsByDate[dateStr] || [];
              const isToday = dateStr === dayjs().format('YYYY-MM-DD');
              const isSelected = dateStr === selectedDate;
              const isSunday = month.date(day).day() === 0;
              const icons = dayEvents.slice(0, 3).map(e => ({ type: e.type }));
              return (
                <button key={dateStr} onClick={() => setSelectedDate(dateStr)}
                  className={`aspect-square relative rounded-lg text-sm font-medium transition-all border ${isSelected || isToday ? 'text-white border-transparent shadow-md' : isSunday ? 'border-amber-100 bg-amber-50/60 text-amber-400' : 'border-gray-100 bg-gray-50/50 hover:border-[#6C63FF]/30 hover:bg-[#6C63FF]/5 text-gray-700'}`}
                  style={isSelected || isToday ? { background: 'linear-gradient(135deg, #8B5CF6 0%, #6C63FF 50%, #4F46E5 100%)' } : undefined}>
                  <span className="absolute inset-0 flex items-center justify-center font-semibold">{day}</span>
                  {icons.length > 0 && (
                    <div className="absolute bottom-1 right-1 flex gap-0.5">
                      {icons.map((e, i) => {
                        const Icon = EVENT_ICONS[e.type] ?? CalendarDays;
                        return <Icon key={i} className="w-2.5 h-2.5" style={{ color: (isSelected || isToday) ? 'rgba(255,255,255,0.85)' : EVENT_COLORS[e.type] }} />;
                      })}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          <div className="flex gap-4 mt-4 justify-center flex-wrap">
            {['holiday', 'test', 'class', 'special'].map(t => {
              const Icon = EVENT_ICONS[t];
              return (
                <div key={t} className="flex items-center gap-1.5">
                  <Icon className="w-3 h-3" style={{ color: EVENT_COLORS[t] }} />
                  <span className="text-xs text-gray-500 capitalize">{t}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 overflow-y-auto">
          <h3 className="font-bold text-gray-800 mb-1">{dayjs(selectedDate).format('ddd, D MMM')}</h3>
          <p className="text-xs text-gray-400 mb-4">{selectedEvents.length === 0 ? 'No events' : `${selectedEvents.length} event(s)`}</p>
          <div className="space-y-3">
            {selectedEvents.map(event => (
              <div key={event.id} className="border-l-4 pl-3 py-1" style={{ borderColor: EVENT_COLORS[event.type] ?? '#9CA3AF' }}>
                <p className="font-semibold text-gray-800 text-sm">{event.title}</p>
                {event.description && <p className="text-xs text-gray-400 mt-0.5">{event.description}</p>}
                <span className="text-xs capitalize px-2 py-0.5 rounded-full font-medium mt-1 inline-block" style={{ backgroundColor: (EVENT_COLORS[event.type] ?? '#9CA3AF') + '20', color: EVENT_COLORS[event.type] ?? '#6B7280' }}>{event.type}</span>
              </div>
            ))}
          </div>

          {allMonthItems.length > 0 && (
            <div className="mt-5 border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">All This Month</p>
              <div className="space-y-2">
                {allMonthItems.map(item => {
                  const Icon = EVENT_ICONS[item.type] ?? CalendarDays;
                  return (
                    <div key={item.id} className="flex items-center gap-2 text-sm">
                      <Icon className="w-3 h-3 shrink-0" style={{ color: EVENT_COLORS[item.type] }} />
                      <span className="text-gray-500 text-xs">{dayjs(item.date).format('D MMM')}</span>
                      <span className="text-gray-800 truncate">{item.title}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
