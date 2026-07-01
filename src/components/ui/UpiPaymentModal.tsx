'use client';
import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, CheckCircle, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import dayjs from 'dayjs';
import { markFeePaid, getCurrentMonthFeeId } from '@/services/fees';

const TEACHER_UPI = 'saravanapriyacs@oksbi';
const TEACHER_NAME = 'Genix Connect';

function buildUpiUrl(scheme: string, amount: string, note: string) {
  const params = `?pa=${encodeURIComponent(TEACHER_UPI)}&pn=${encodeURIComponent(TEACHER_NAME)}&am=${parseFloat(amount).toFixed(2)}&cu=INR&tn=${encodeURIComponent(note)}`;
  return scheme + params;
}

const APPS = [
  { id: 'gpay', label: 'Google Pay', logo: '/gpay.png', scheme: 'tez://upi/pay' },
  { id: 'phonepe', label: 'PhonePe', logo: '/phonepe.png', scheme: 'phonepe://pay' },
];

interface Props {
  studentId: string;
  studentName: string;
  feeAmount: number;
  onClose: () => void;
  onPaid: () => void;
}

export default function UpiPaymentModal({ studentId, studentName, feeAmount, onClose, onPaid }: Props) {
  const month = getCurrentMonthFeeId();
  const [note] = useState(`${studentName} tuition fee`);
  const [selectedApp, setSelectedApp] = useState<typeof APPS[0] | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [success, setSuccess] = useState(false);

  const amount = String(feeAmount);

  const handleAppClick = (app: typeof APPS[0]) => {
    setSelectedApp(app);
    // Attempt deep link — works on mobile, silently fails on desktop (QR is the fallback)
    try {
      const url = buildUpiUrl(app.scheme, amount, note);
      const a = document.createElement('a');
      a.href = url;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch { /* ignore on desktop */ }
  };

  const handleConfirmPaid = async () => {
    setConfirming(true);
    try {
      await markFeePaid(studentId, month, feeAmount, 'student-upi');
      setSuccess(true);
      setTimeout(() => { onPaid(); onClose(); }, 1800);
    } catch {
      alert('Failed to record payment. Please inform your teacher.');
    } finally {
      setConfirming(false);
    }
  };

  const upiQrUrl = buildUpiUrl('upi://pay', amount, note);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          {selectedApp ? (
            <button onClick={() => setSelectedApp(null)} className="flex items-center gap-1.5 text-sm text-[#6C63FF] font-medium">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          ) : (
            <h2 className="font-bold text-gray-900 text-lg">Pay Fee</h2>
          )}
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
          {success ? (
            <div className="flex flex-col items-center py-8 gap-3">
              <CheckCircle className="w-16 h-16 text-green-500" />
              <p className="font-bold text-gray-900 text-lg">Payment Recorded!</p>
              <p className="text-gray-500 text-sm text-center">Your teacher has been notified.</p>
            </div>

          ) : selectedApp ? (
            /* ── QR screen for selected app ── */
            <>
              <div className="rounded-xl p-4 text-center text-white" style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #6C63FF 50%, #4F46E5 100%)' }}>
                <p className="text-white/70 text-sm mb-1">Amount Due</p>
                <p className="text-4xl font-bold">₹{feeAmount.toLocaleString('en-IN')}</p>
                <p className="text-white/70 text-sm mt-1">{dayjs(month + '-01').format('MMMM YYYY')}</p>
              </div>

              <div className="flex flex-col items-center gap-3 p-5 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <Image src={selectedApp.logo} alt={selectedApp.label} width={28} height={28} className="object-contain" />
                  <span className="font-semibold text-gray-800">Pay via {selectedApp.label}</span>
                </div>
                <QRCodeSVG value={upiQrUrl} size={190} />
                <p className="text-xs text-gray-500 text-center">Open {selectedApp.label} → Scan QR to pay</p>
                <p className="text-xs font-medium text-[#6C63FF]">{TEACHER_UPI}</p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">
                <p className="text-xs text-amber-700 text-center">
                  On mobile? {selectedApp.label} may have opened automatically. Complete payment there, then tap confirm below.
                </p>
              </div>

              <button
                onClick={handleConfirmPaid}
                disabled={confirming}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-semibold transition-opacity disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #4CAF50 0%, #43A047 100%)' }}
              >
                <CheckCircle className="w-5 h-5" />
                {confirming ? 'Recording...' : 'I have paid — Confirm'}
              </button>
              <p className="text-xs text-gray-400 text-center">
                Tap confirm only after your payment is successful.
              </p>
            </>

          ) : (
            /* ── App selection screen ── */
            <>
              <div className="rounded-xl p-4 text-center text-white" style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #6C63FF 50%, #4F46E5 100%)' }}>
                <p className="text-white/70 text-sm mb-1">Amount Due</p>
                <p className="text-4xl font-bold">₹{feeAmount.toLocaleString('en-IN')}</p>
                <p className="text-white/70 text-sm mt-1">{dayjs(month + '-01').format('MMMM YYYY')}</p>
                <p className="text-white/50 text-xs mt-2">Pay to: {TEACHER_NAME} · {TEACHER_UPI}</p>
              </div>

              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Choose Payment App</p>
              <div className="grid grid-cols-2 gap-3">
                {APPS.map(app => (
                  <button
                    key={app.id}
                    onClick={() => handleAppClick(app)}
                    className="flex flex-col items-center gap-2.5 p-5 rounded-xl border-2 border-gray-200 hover:border-[#6C63FF] hover:bg-[#6C63FF]/5 transition-all active:scale-95"
                  >
                    <Image src={app.logo} alt={app.label} width={52} height={52} className="object-contain" />
                    <span className="text-sm font-semibold text-gray-700">{app.label}</span>
                  </button>
                ))}
              </div>

              <p className="text-xs text-gray-400 text-center">
                Select an app to get the QR code and payment link
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
