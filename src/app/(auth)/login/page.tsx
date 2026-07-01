'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { BarChart3, BellRing, Wallet } from 'lucide-react';
import AppLogo from '@/components/ui/AppLogo';

const INDIAN_PHONE_RE = /^[6-9]\d{9}$/;

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [role, setRole] = useState<'teacher' | 'student'>('teacher');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { sendOtp, verifyOtp, user, userRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) return;
    if (userRole === 'teacher') router.replace('/dashboard');
    else if (userRole === 'student') router.replace('/student/home');
    else if (userRole === 'not_registered') setError('Your number is not registered. Contact your teacher.');
  }, [user, userRole]);

  const handleSendOtp = async () => {
    setError('');
    if (!INDIAN_PHONE_RE.test(phone.trim())) {
      setError('Enter a valid 10-digit Indian mobile number.');
      return;
    }
    setLoading(true);
    try {
      await sendOtp(`+91${phone.trim()}`);
      setStep('otp');
    } catch (e: any) {
      if (e.message?.includes('too-many-requests')) {
        setError('Too many attempts. Please wait a few minutes and try again.');
      } else {
        setError(e.message ?? 'Failed to send OTP. Try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError('');
    if (otp.length !== 6) { setError('Enter the 6-digit OTP.'); return; }
    setLoading(true);
    try {
      await verifyOtp(otp);
      // Navigation handled by root page via onAuthStateChanged
    } catch (e: any) {
      console.error('verifyOtp error:', e?.code, e?.message);
      setError(e?.message ?? 'Incorrect OTP. Please try again.');
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* reCAPTCHA container — must always be in DOM */}
      <div id="recaptcha-container" style={{ position: 'absolute', bottom: 0, right: 0 }} />
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[60%] flex-col justify-between p-12" style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #6C63FF 50%, #4F46E5 100%)' }}>
        <div className="w-fit">
          <div className="flex items-center" style={{ marginLeft: '-10px' }}>
            <AppLogo size={80} />
            <span className="text-white font-bold text-6xl leading-none" style={{ marginLeft: '-14px' }}>enix Connect</span>
          </div>
          <span className="text-white/70 text-lg block mt-1 text-right">Connecting Teachers & Students</span>
        </div>

        <div className="space-y-10">
          <div className="space-y-4">
            {[
              { icon: BarChart3, text: 'Real-time attendance tracking', sub: 'Mark and monitor attendance the moment class begins.' },
              { icon: Wallet, text: 'Instant fee management', sub: 'Collect, track, and reconcile fees without the paperwork.' },
              { icon: BellRing, text: 'Push notifications', sub: 'Keep students and parents informed automatically.' },
            ].map(({ icon: Icon, text, sub }) => (
              <div key={text} className="flex items-start gap-4">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
                  <Icon className="text-white w-5 h-5" />
                </div>
                <div>
                  <p className="text-white font-semibold">{text}</p>
                  <p className="text-white/70 text-sm">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-white/60 text-sm">Trusted by tuition centres across India</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <img src="/favicon-icon.png" alt="Genix Connect" width={32} height={32} style={{ width: 32, height: 32, objectFit: 'contain' }} />
            <span className="text-[#6C63FF] font-bold text-lg">Genix Connect</span>
          </div>

          <h2 className="text-3xl font-bold text-gray-900 mb-1">Welcome Back</h2>
          <p className="text-gray-500 mb-8">Login to your account</p>

          {step === 'phone' ? (
            <div className="space-y-5">
              {/* Role selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">I am a</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['teacher', 'student'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setRole(r)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                        role === r
                          ? 'border-[#6C63FF] bg-[#6C63FF]/5 text-[#6C63FF]'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-2xl">{r === 'teacher' ? '👩‍🏫' : '👨‍🎓'}</span>
                      <span className="font-medium capitalize">{r}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Phone input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                <div className="flex border-2 border-gray-200 rounded-xl overflow-hidden focus-within:border-[#6C63FF] transition-colors">
                  <div className="flex items-center px-4 bg-gray-50 border-r border-gray-200">
                    <span className="text-sm font-medium text-gray-600">🇮🇳 +91</span>
                  </div>
                  <input
                    type="tel"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
                    placeholder="98765 43210"
                    className="flex-1 px-4 py-3 outline-none text-gray-900 bg-white"
                  />
                </div>
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <button
                onClick={handleSendOtp}
                disabled={loading}
                className="w-full text-white font-semibold py-3.5 rounded-xl transition-opacity disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #6C63FF 50%, #4F46E5 100%)' }}
              >
                {loading ? 'Sending...' : 'Send OTP'}
              </button>
              <p className="text-center text-gray-400 text-sm">We'll send a 6-digit OTP to your number</p>
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Enter OTP</label>
                <p className="text-gray-400 text-sm mb-3">Sent to +91 {phone}</p>
                <input
                  type="number"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.slice(0, 6))}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerifyOtp()}
                  placeholder="• • • • • •"
                  autoFocus
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-center text-2xl font-bold tracking-[0.5em] outline-none focus:border-[#6C63FF] transition-colors"
                />
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <button
                onClick={handleVerifyOtp}
                disabled={loading || otp.length !== 6}
                className="w-full text-white font-semibold py-3.5 rounded-xl transition-opacity disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #6C63FF 50%, #4F46E5 100%)' }}
              >
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>
              <button
                onClick={() => { setStep('phone'); setOtp(''); setError(''); }}
                className="w-full text-[#6C63FF] text-sm font-medium hover:underline"
              >
                ← Change number
              </button>
            </div>
          )}

          <p className="text-center text-gray-400 text-xs mt-8">
            By continuing you agree to our{' '}
            <a href="#" className="text-[#6C63FF] hover:underline">Privacy Policy</a>
          </p>
          <p className="text-center text-gray-300 text-xs mt-4">© 2026 Genix Connect. All rights reserved.</p>
          <p className="text-center text-gray-300 text-xs mt-1">
            Protected by reCAPTCHA —{' '}
            <a href="https://policies.google.com/privacy" className="hover:underline">Privacy</a> &{' '}
            <a href="https://policies.google.com/terms" className="hover:underline">Terms</a>
          </p>
        </div>
      </div>
    </div>
  );
}
