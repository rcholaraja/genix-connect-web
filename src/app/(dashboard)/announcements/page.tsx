'use client';
import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { getMessages } from '@/services/messages';
import { Bell, MessageCircle, Phone } from 'lucide-react';

const CHANNEL_COLORS: Record<string, string> = { push: '#6C63FF', whatsapp: '#25D366', sms: '#FF9500' };
const CHANNEL_ICONS: Record<string, any> = { push: Bell, whatsapp: MessageCircle, sms: Phone };

export default function AnnouncementsPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { getMessages().then(setMessages).catch(console.error).finally(() => setLoading(false)); }, []);

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-5">Announcements</h1>
      <p className="text-sm text-gray-400 mb-5">Messages sent to students via Push, WhatsApp, or SMS.</p>

      {loading ? <p className="text-gray-400">Loading...</p> : messages.length === 0 ? (
        <div className="text-center py-16">
          <Bell className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-lg font-medium">No announcements sent yet.</p>
          <p className="text-gray-300 text-sm mt-1">Go to Messages to send your first announcement.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((msg: any) => {
            const color = CHANNEL_COLORS[msg.channel] ?? '#9CA3AF';
            const Icon = CHANNEL_ICONS[msg.channel] ?? Bell;
            return (
              <div key={msg.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + '18' }}>
                      <Icon className="w-4 h-4" style={{ color }} />
                    </div>
                    <span className="text-xs font-semibold capitalize px-2 py-0.5 rounded-full" style={{ backgroundColor: color + '18', color }}>{msg.channel}</span>
                    <span className="text-xs text-gray-400">→ {msg.recipientType === 'pending_fees' ? 'Pending Fee Students' : 'All Students'}</span>
                  </div>
                  <span className="text-xs text-gray-400">{msg.sentAt ? dayjs(msg.sentAt).format('D MMM YYYY, h:mm a') : ''}</span>
                </div>
                <p className="text-gray-800 text-sm leading-relaxed">{msg.message}</p>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-gray-400">Sent by {msg.sentBy}</p>
                  <p className="text-xs text-gray-400">{msg.recipientCount} recipient(s)</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
