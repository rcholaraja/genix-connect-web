'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import dayjs from 'dayjs';
import { useToast } from '@/components/ui/Toast';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { getAllStudentFeeStatus, getCurrentMonthFeeId, markFeePaid } from '@/services/fees';
import { FEE_STATUS } from '@/constants';

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const colors = ['#6C63FF','#4CAF50','#F44336','#FF9800','#2196F3','#9C27B0','#00BCD4','#FF5722'];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div style={{ width: size, height: size, backgroundColor: color, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: size * 0.38, fontWeight: 700, flexShrink: 0 }}>
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

export default function FeesPage() {
  const { toast } = useToast();
  const [feeList, setFeeList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(getCurrentMonthFeeId());
  const [filter, setFilter] = useState('all');
  const [confirmPay, setConfirmPay] = useState<any>(null);

  useEffect(() => { load(); }, [month]);

  const load = async () => {
    setLoading(true);
    try { setFeeList(await getAllStudentFeeStatus(month)); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleMarkPaid = (item: any) => setConfirmPay(item);

  const doMarkPaid = async () => {
    if (!confirmPay) return;
    try {
      await markFeePaid(confirmPay.studentId, month, confirmPay.feeAmount ?? 0, 'teacher');
      toast(`${confirmPay.studentName}'s fee marked as paid`, 'success');
      load();
    } catch (e) { toast('Failed to mark fee as paid', 'error'); }
    finally { setConfirmPay(null); }
  };

  const prevMonth = dayjs(month + '-01').subtract(1, 'month').format('YYYY-MM');
  const nextMonth = dayjs(month + '-01').add(1, 'month').format('YYYY-MM');
  const isCurrent = month === getCurrentMonthFeeId();

  const paid = feeList.filter(f => f.status === FEE_STATUS.PAID).length;
  const pending = feeList.filter(f => f.status !== FEE_STATUS.PAID).length;
  const paidAmount = feeList.filter(f => f.status === FEE_STATUS.PAID).reduce((s, f) => s + (f.amount || f.feeAmount || 0), 0);
  const pendingAmount = feeList.filter(f => f.status !== FEE_STATUS.PAID).reduce((s, f) => s + (f.feeAmount || 0), 0);

  const filtered = filter === 'paid' ? feeList.filter(f => f.status === FEE_STATUS.PAID) : filter === 'pending' ? feeList.filter(f => f.status !== FEE_STATUS.PAID) : feeList;

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <h1 className="text-2xl font-bold text-gray-900">Fees</h1>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 sm:ml-auto">
          <button onClick={() => setMonth(prevMonth)} className="hover:text-[#6C63FF]"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-sm font-semibold text-gray-800 min-w-28 text-center">{dayjs(month + '-01').format('MMMM YYYY')}</span>
          <button onClick={() => setMonth(nextMonth)} disabled={isCurrent} className="hover:text-[#6C63FF] disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[['Collected', `₹${paidAmount.toLocaleString('en-IN')}`, '#4CAF50'], ['Outstanding', `₹${pendingAmount.toLocaleString('en-IN')}`, '#F44336'], ['Total', `₹${(paidAmount + pendingAmount).toLocaleString('en-IN')}`, '#6C63FF']].map(([label, value, color]) => (
          <div key={String(label)} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className="text-lg md:text-2xl font-bold" style={{ color: String(color) }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[['all', `All ${feeList.length}`, '#6C63FF'], ['paid', `Paid ${paid}`, '#4CAF50'], ['pending', `Pending ${pending}`, '#FFC107']].map(([key, label, color]) => (
          <button key={String(key)} onClick={() => setFilter(String(key))}
            className="px-4 py-1.5 rounded-full text-sm font-semibold border-2 transition-colors"
            style={{ borderColor: filter === key ? String(color) : '#E5E7EB', backgroundColor: filter === key ? String(color) + '15' : 'white', color: filter === key ? String(color) : '#6B7280' }}>
            {label}
          </button>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Student', 'Grade', 'Monthly Fee', 'Status', 'Action'].map(h => (
                <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={5} className="text-center py-12 text-gray-400">Loading...</td></tr> :
              filtered.map((item: any) => (
                <tr key={item.studentId} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3"><div className="flex items-center gap-3"><Avatar name={item.studentName} size={32} /><span className="font-medium text-gray-800 text-sm">{item.studentName}</span></div></td>
                  <td className="px-5 py-3 text-sm text-gray-500">{item.grade}</td>
                  <td className="px-5 py-3 text-sm font-semibold text-gray-800">₹{item.feeAmount ?? 0}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${item.status === FEE_STATUS.PAID ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {item.status === FEE_STATUS.PAID ? 'Paid' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {item.status !== FEE_STATUS.PAID && (
                      <button onClick={() => handleMarkPaid(item)} className="text-xs text-[#6C63FF] border border-[#6C63FF] px-3 py-1 rounded-full hover:bg-[#6C63FF]/5 font-medium transition-colors">
                        Mark Paid
                      </button>
                    )}
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {loading ? <div className="bg-white rounded-xl p-8 text-center text-gray-400">Loading...</div> :
          filtered.map((item: any) => (
            <div key={item.studentId} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <Avatar name={item.studentName} size={36} />
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{item.studentName}</p>
                    <p className="text-xs text-gray-400">{item.grade} · ₹{item.feeAmount ?? 0}/mo</p>
                  </div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${item.status === FEE_STATUS.PAID ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                  {item.status === FEE_STATUS.PAID ? 'Paid' : 'Pending'}
                </span>
              </div>
              {item.status !== FEE_STATUS.PAID && (
                <button onClick={() => handleMarkPaid(item)} className="w-full mt-1 text-xs text-[#6C63FF] border border-[#6C63FF] py-1.5 rounded-lg hover:bg-[#6C63FF]/5 font-medium transition-colors">
                  Mark Paid
                </button>
              )}
            </div>
          ))
        }
      </div>

      <ConfirmDialog
        open={!!confirmPay}
        title="Mark Fee as Paid"
        message={`Mark ${confirmPay?.studentName}'s fee for ${dayjs(month + '-01').format('MMMM YYYY')} as paid?`}
        confirmLabel="Mark Paid"
        onConfirm={doMarkPaid}
        onCancel={() => setConfirmPay(null)}
      />
    </div>
  );
}
