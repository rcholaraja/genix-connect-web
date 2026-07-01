'use client';
import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { useAuth } from '@/context/AuthContext';
import { getStudentFees, getCurrentMonthFeeId } from '@/services/fees';
import { FEE_STATUS } from '@/constants';
import UpiPaymentModal from '@/components/ui/UpiPaymentModal';

export default function StudentFeesPage() {
  const { userProfile } = useAuth();
  const [fees, setFees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPayModal, setShowPayModal] = useState(false);

  const loadFees = () => {
    if (!userProfile?.id) return;
    setLoading(true);
    getStudentFees((userProfile as any).id).then(setFees).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { loadFees(); }, [userProfile?.id]);

  const currentFee = fees.find(f => f.id === getCurrentMonthFeeId());
  const isPending = !currentFee || currentFee.status !== FEE_STATUS.PAID;
  const feeAmount = (userProfile as any)?.feeAmount ?? 0;

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-5">My Fees</h1>

      <div className={`rounded-xl p-5 mb-5 border-2 ${isPending ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
        <p className="text-sm text-gray-500 mb-1">{dayjs().format('MMMM YYYY')} Fee</p>
        <p className={`text-3xl font-bold ${isPending ? 'text-red-500' : 'text-green-600'}`}>{isPending ? 'Due' : 'Paid ✓'}</p>
        {feeAmount > 0 && <p className="text-gray-600 mt-1">₹{feeAmount.toLocaleString('en-IN')}</p>}
        {isPending && feeAmount > 0 && (
          <button
            onClick={() => setShowPayModal(true)}
            className="mt-3 text-white px-5 py-2 rounded-lg text-sm font-medium transition-opacity"
            style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #6C63FF 50%, #4F46E5 100%)' }}
          >
            Pay via UPI
          </button>
        )}
      </div>

      <h2 className="font-bold text-gray-800 mb-3">Fee History</h2>
      {loading ? <p className="text-gray-400">Loading...</p> : fees.length === 0 ? <p className="text-gray-400">No fee records yet.</p> : (
        <div className="space-y-2">
          {fees.map(fee => (
            <div key={fee.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800">{dayjs(fee.id + '-01').format('MMMM YYYY')}</p>
                {fee.paidDate && <p className="text-xs text-gray-400">Paid {dayjs(fee.paidDate).format('D MMM')}</p>}
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${fee.status === FEE_STATUS.PAID ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                {fee.status === FEE_STATUS.PAID ? 'Paid' : 'Pending'}
              </span>
            </div>
          ))}
        </div>
      )}

      {showPayModal && (
        <UpiPaymentModal
          studentId={(userProfile as any).id}
          studentName={userProfile?.name ?? 'Student'}
          feeAmount={feeAmount}
          onClose={() => setShowPayModal(false)}
          onPaid={loadFees}
        />
      )}
    </div>
  );
}
