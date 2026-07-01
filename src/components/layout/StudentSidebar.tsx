'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Home, Calendar, Wallet, GraduationCap, FileText, Megaphone, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import AppLogo from '@/components/ui/AppLogo';

const NAV_ITEMS = [
  { label: 'Home', href: '/student/home', icon: Home },
  { label: 'Attendance', href: '/student/attendance', icon: Calendar },
  { label: 'Fees', href: '/student/fees', icon: Wallet },
  { label: 'Scores', href: '/student/scores', icon: GraduationCap },
  { label: 'Leave Request', href: '/student/leave', icon: FileText },
  { label: 'Announcements', href: '/student/announcements', icon: Megaphone },
  { label: 'Calendar', href: '/student/calendar', icon: Calendar },
];

export default function StudentSidebar() {
  const pathname = usePathname();
  const { userProfile, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => { await logout(); router.replace('/login'); };
  const initials = userProfile?.name ? userProfile.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : 'ST';

  const sidebarContent = (
    <aside className="w-64 h-full flex flex-col"
      style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #6C63FF 50%, #4F46E5 100%)' }}>
      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
        <div className="w-fit">
          <div className="flex items-center" style={{ marginLeft: '-3px' }}>
            <AppLogo size={32} />
            <p className="text-white font-bold text-2xl leading-none" style={{ marginLeft: '-5px' }}>enix Connect</p>
          </div>
          <p className="text-white/60 text-[9px] mt-0.5 text-right tracking-wide">Connecting Teachers &amp; Students</p>
        </div>
        <button onClick={() => setOpen(false)} className="md:hidden text-white/70 hover:text-white p-1"><X className="w-5 h-5" /></button>
      </div>
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-bold shrink-0">{initials}</div>
        <div className="min-w-0">
          <p className="font-semibold text-white text-sm truncate">{userProfile?.name ?? 'Student'}</p>
          <span className="text-[10px] bg-white/20 text-white font-medium px-2 py-0.5 rounded-full">{(userProfile as any)?.grade ?? 'Student'}</span>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-3 px-3">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href} onClick={() => setOpen(false)} className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium mb-0.5 transition-colors', active ? 'bg-white text-[#6C63FF]' : 'text-white/80 hover:bg-white/10 hover:text-white')}>
              <Icon className="w-4 h-4 shrink-0" />{label}
            </Link>
          );
        })}
      </nav>
      <div className="px-3 py-4 border-t border-white/10">
        <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white w-full transition-colors">
          <LogOut className="w-4 h-4" />Logout
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 h-14 flex items-center px-4 gap-3"
        style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #6C63FF 50%, #4F46E5 100%)' }}>
        <button onClick={() => setOpen(true)} className="text-white p-1"><Menu className="w-6 h-6" /></button>
        <div className="flex items-center" style={{ marginLeft: '-2px' }}>
          <AppLogo size={28} />
          <p className="text-white font-bold text-xl leading-none" style={{ marginLeft: '-4px' }}>enix Connect</p>
        </div>
      </div>

      {/* Desktop fixed sidebar */}
      <div className="hidden md:block fixed left-0 top-0 h-screen w-64 z-10">
        {sidebarContent}
      </div>

      {/* Mobile overlay */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative w-64 h-full z-50">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
