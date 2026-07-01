'use client';
import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { getMessages } from '@/services/messages';

export default function AnnouncementsPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { getMessages().then(setMessages).catch(console.error).finally(() => setLoading(false)); }, []);

  const CHANNEL_COLORS: Record<string, string> = { push: '#6C63FF', whatsapp: '#25D366', sms: '#FF9500' };

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-5">Announcements</h1>
      {loading ? <p className="text-gray-400">Loading...</p> : messages.length === 0 ? (
        <div className="text-center py-16"><p className="text-gray-400 text-lg">No announcements yet.</p></div>
      ) : (
        <div className="space-y-3">
          {messages.map((msg: any) => (
            <div key={msg.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full capitalize" style={{ backgroundColor: (CHANNEL_COLORS[msg.channel] ?? '#9CA3AF') + '20', color: CHANNEL_COLORS[msg.channel] ?? '#6B7280' }}>{msg.channel}</span>
                <span className="text-xs text-gray-400">{msg.sentAt ? dayjs(msg.sentAt).format('D MMM YYYY, h:mm a') : ''}</span>
              </div>
              <p className="text-gray-800 text-sm leading-relaxed">{msg.message}</p>
              {msg.sentBy && <p className="text-xs text-gray-400 mt-2">— {msg.sentBy}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
