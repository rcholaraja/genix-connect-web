'use client';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { ShieldX } from 'lucide-react';

export default function NotRegisteredPage() {
  const { logout } = useAuth();
  const router = useRouter();
  const handleLogout = async () => { await logout(); router.replace('/login'); };

  return (
    <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-sm w-full text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldX className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Not Registered</h2>
        <p className="text-gray-500 text-sm mb-6">Your number is not registered in the system. Please contact your tuition teacher to get registered.</p>
        <button onClick={handleLogout} className="w-full border border-gray-200 text-gray-600 py-2.5 rounded-xl font-medium hover:bg-gray-50">Log Out</button>
      </div>
    </div>
  );
}
