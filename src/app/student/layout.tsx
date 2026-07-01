import Sidebar from '@/components/layout/StudentSidebar';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F8F9FF] flex">
      <Sidebar />
      <main className="flex-1 md:ml-64 pt-14 md:pt-0 min-h-screen w-0">
        {children}
      </main>
    </div>
  );
}
