import { useMemo, useState } from 'react';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  CreditCard,
  Loader2,
  Plane,
  ShieldCheck,
  Smartphone,
  Wallet,
  X,
} from 'lucide-react';
import { PaymentDetails, PaymentMethod } from '../types/flighthub';
import {
  generateRazorpayOrderId,
  generateRazorpayPaymentId,
} from '../utils/flightEngine';

interface RazorpayCheckoutModalProps {
  isOpen: boolean;
  totalAmount: number;
  passengerCount: number;
  routeLabel: string;
  airlineName: string;
  defaultHolderName: string;
  onClose: () => void;
  onPaymentSuccess: (payment: PaymentDetails) => void;
  onPaymentAttempt?: (attempt: {
    status: 'authorized' | 'declined';
    method: PaymentMethod;
    amount: number;
    orderId: string;
    referenceId?: string;
  }) => void;
}

const NETBANKING_BANKS = [
  'HDFC Bank',
  'ICICI Bank',
  'State Bank of India',
  'Axis Bank',
  'Kotak Mahindra',
  'Yes Bank',
];

const WALLETS = ['Amazon Pay', 'PhonePe Wallet', 'Paytm', 'Freecharge'];

function formatCardNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export function RazorpayCheckoutModal({
  isOpen,
  totalAmount,
  passengerCount,
  routeLabel,
  airlineName,
  defaultHolderName,
  onClose,
  onPaymentSuccess,
  onPaymentAttempt,
}: RazorpayCheckoutModalProps) {
  const orderId = useMemo(() => generateRazorpayOrderId(), []);
  const [method, setMethod] = useState<PaymentMethod>('UPI');
  const [contact, setContact] = useState('+91 98765 43210');
  const [email, setEmail] = useState('passenger@flighthub.in');

  // UPI
  const [upiId, setUpiId] = useState('traveler@okaxis');

  // Card
  const [cardHolder, setCardHolder] = useState(
    defaultHolderName || 'Aarav Mehta'
  );
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [expiry, setExpiry] = useState('08/29');
  const [cvv, setCvv] = useState('842');

  // NetBanking & Wallet
  const [selectedBank, setSelectedBank] = useState(NETBANKING_BANKS[0]);
  const [selectedWallet, setSelectedWallet] = useState(WALLETS[0]);

  // Checkout stages: form -> otp -> processing -> success
  const [stage, setStage] = useState<'form' | 'otp' | 'processing' | 'success'>(
    'form'
  );
  const [otp, setOtp] = useState('482910');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [issuedPaymentId, setIssuedPaymentId] = useState<string | null>(null);

  if (!isOpen) return null;

  const validateMethodInputs = (): string | null => {
    if (!contact.trim() || contact.trim().length < 8) {
      return 'Enter a valid phone number for booking receipt.';
    }
    if (!email.trim() || !email.includes('@')) {
      return 'Enter a valid email address.';
    }

    if (method === 'UPI') {
      if (!upiId.trim() || !upiId.includes('@')) {
        return 'Enter a valid UPI ID (e.g. name@okaxis).';
      }
    } else if (method === 'Card') {
      if (!cardHolder.trim()) return 'Enter cardholder name.';
      const digits = cardNumber.replace(/\D/g, '');
      if (digits.length < 12) return 'Enter a valid 16-digit card number.';
      if (!/^\d{2}\/\d{2}$/.test(expiry)) return 'Enter expiry as MM/YY.';
      if (cvv.replace(/\D/g, '').length < 3) return 'Enter a 3-digit CVV.';
    }
    return null;
  };

  const handleProceedToAuth = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateMethodInputs();
    if (err) {
      setErrorMsg(err);
      return;
    }
    setErrorMsg(null);
    setStage('otp');
  };

  const handleCompletePayment = (simulateDecline = false) => {
    setErrorMsg(null);
    setStage('processing');

    setTimeout(() => {
      if (simulateDecline) {
        setStage('form');
        setErrorMsg(
          'Razorpay Mock Bank Error: Transaction declined by issuer. Retry or select another payment method.'
        );
        onPaymentAttempt?.({
          status: 'declined',
          method,
          amount: totalAmount,
          orderId,
        });
        return;
      }

      const paymentId = generateRazorpayPaymentId();
      setIssuedPaymentId(paymentId);
      setStage('success');
      onPaymentAttempt?.({
        status: 'authorized',
        method,
        amount: totalAmount,
        orderId,
        referenceId: paymentId,
      });

      const digits = cardNumber.replace(/\D/g, '');
      const accountMasked =
        method === 'Card'
          ? `•••• ${digits.slice(-4) || '4242'}`
          : method === 'UPI'
            ? upiId.trim()
            : method === 'NetBanking'
              ? selectedBank
              : selectedWallet;

      setTimeout(() => {
        onPaymentSuccess({
          gateway: 'Razorpay',
          method,
          referenceId: paymentId,
          orderId,
          accountMasked,
          contact: contact.trim(),
          email: email.trim(),
          status: 'Paid',
          paidAt: new Date().toISOString(),
        });
      }, 900);
    }, 950);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Razorpay Mock Checkout"
    >
      <div className="w-full max-w-2xl bg-[#11131A] border border-zinc-700 rounded-2xl overflow-hidden shadow-2xl text-zinc-100">
        {/* Razorpay-style Top Merchant Banner */}
        <div className="bg-[#0C244E] px-6 py-4 flex items-center justify-between gap-4 border-b border-blue-900/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-[#E50914] flex items-center justify-center shrink-0">
              <Plane className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-display text-base font-bold text-white truncate">
                  FlightHub Lmtd
                </span>
                <span className="text-[11px] font-medium text-blue-200 whitespace-nowrap">
                  · Razorpay Trusted
                </span>
              </div>
              <div className="text-xs text-blue-200/80 font-mono truncate">
                {routeLabel} · {airlineName} · {passengerCount}{' '}
                {passengerCount === 1 ? 'pax' : 'pax'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right">
              <div className="text-[11px] text-blue-200/80 font-mono">
                {orderId}
              </div>
              <div className="font-mono text-lg font-bold text-white tabular-nums">
                Rs.{totalAmount.toLocaleString('en-IN')}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={stage === 'processing' || stage === 'success'}
              aria-label="Close Razorpay checkout"
              className="p-1.5 text-blue-200 hover:text-white rounded-lg hover:bg-white/10 transition-colors disabled:opacity-40"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Contact & Email Strip */}
        <div className="px-6 py-3 bg-[#161923] border-b border-zinc-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 shrink-0">Phone:</span>
            <input
              type="text"
              value={contact}
              disabled={stage !== 'form'}
              onChange={(e) => setContact(e.target.value)}
              className="w-full bg-transparent text-zinc-100 font-mono focus:outline-none border-b border-transparent focus:border-blue-500 py-0.5"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 shrink-0">Email:</span>
            <input
              type="email"
              value={email}
              disabled={stage !== 'form'}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent text-zinc-100 focus:outline-none border-b border-transparent focus:border-blue-500 py-0.5"
            />
          </div>
        </div>

        {stage === 'processing' && (
          <div className="px-6 py-16 text-center space-y-3">
            <Loader2 className="w-10 h-10 text-blue-400 animate-spin mx-auto" />
            <div className="font-display text-base font-semibold text-white">
              Communicating with Razorpay Gateway
            </div>
            <p className="text-xs text-zinc-400">
              Verifying payment authorization for Rs.
              {totalAmount.toLocaleString('en-IN')}...
            </p>
          </div>
        )}

        {stage === 'success' && (
          <div className="px-6 py-16 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <div className="font-display text-lg font-bold text-white">
              Payment Successful
            </div>
            <p className="text-xs font-mono text-emerald-400">
              {issuedPaymentId} · Rs.{totalAmount.toLocaleString('en-IN')} Paid
            </p>
            <p className="text-xs text-zinc-400">
              Issuing boarding passes and allocating seats...
            </p>
          </div>
        )}

        {stage === 'otp' && (
          <div className="p-6 space-y-5">
            <div className="bg-[#181C28] border border-zinc-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-blue-400 font-semibold">
                    Razorpay Sandbox 2FA Verification
                  </div>
                  <h3 className="text-base font-bold text-white mt-0.5">
                    Authorize Rs.{totalAmount.toLocaleString('en-IN')} via{' '}
                    {method}
                  </h3>
                </div>
                <ShieldCheck className="w-6 h-6 text-blue-400 shrink-0" />
              </div>

              <div>
                <label
                  htmlFor="rzp-otp"
                  className="block text-xs font-medium text-zinc-300 mb-1.5"
                >
                  Enter Simulated 6-Digit Bank OTP
                </label>
                <input
                  id="rzp-otp"
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                  className="w-full px-3.5 py-2.5 text-sm font-mono tracking-widest bg-[#11131A] border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
                <p className="mt-1.5 text-[11px] text-zinc-400">
                  Demo OTP pre-filled. Choose Approve or Simulate Failure below.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStage('form')}
                className="px-4 py-2 text-xs font-medium text-zinc-300 bg-[#181C28] border border-zinc-700 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                Back
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => handleCompletePayment(true)}
                  className="px-4 py-2 text-xs font-semibold text-red-300 border border-red-900/70 bg-red-950/30 hover:bg-red-900/50 rounded-lg transition-colors whitespace-nowrap"
                >
                  Simulate Bank Failure
                </button>
                <button
                  type="button"
                  onClick={() => handleCompletePayment(false)}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors whitespace-nowrap"
                >
                  Approve & Pay Rs.{totalAmount.toLocaleString('en-IN')}
                </button>
              </div>
            </div>
          </div>
        )}

        {stage === 'form' && (
          <form onSubmit={handleProceedToAuth}>
            <div className="grid grid-cols-1 md:grid-cols-12">
              {/* Method Sidebar */}
              <div className="md:col-span-4 bg-[#161923] border-b md:border-b-0 md:border-r border-zinc-800 p-3 space-y-1">
                <div className="px-2.5 py-1.5 text-[11px] font-semibold text-zinc-400">
                  Payment Options
                </div>
                {(
                  [
                    {
                      id: 'UPI',
                      label: 'UPI / QR',
                      sub: 'GPay, PhonePe, Paytm',
                      icon: Smartphone,
                    },
                    {
                      id: 'Card',
                      label: 'Cards',
                      sub: 'Visa, Mastercard, RuPay',
                      icon: CreditCard,
                    },
                    {
                      id: 'NetBanking',
                      label: 'Netbanking',
                      sub: 'All Indian banks',
                      icon: Building2,
                    },
                    {
                      id: 'Wallet',
                      label: 'Wallets',
                      sub: 'Amazon Pay & more',
                      icon: Wallet,
                    },
                  ] as const
                ).map((item) => {
                  const Icon = item.icon;
                  const active = method === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setMethod(item.id);
                        setErrorMsg(null);
                      }}
                      className={`w-full text-left px-3 py-2.5 rounded-lg flex items-start gap-2.5 transition-colors ${
                        active
                          ? 'bg-blue-600/15 border border-blue-500/50 text-white'
                          : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200 border border-transparent'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 mt-0.5 shrink-0 ${
                          active ? 'text-blue-400' : ''
                        }`}
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold">
                          {item.label}
                        </div>
                        <div className="text-[11px] text-zinc-500 truncate">
                          {item.sub}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Method Details */}
              <div className="md:col-span-8 p-6 space-y-4">
                {errorMsg && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 px-3.5 py-2.5 text-xs text-red-200 bg-red-950/50 border border-red-900/70 rounded-lg"
                  >
                    <AlertCircle className="w-4 h-4 text-[#E50914] shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {method === 'UPI' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-3.5 bg-[#181C28] border border-zinc-800 rounded-xl">
                      {/* Crisp Geometric Mock QR SVG */}
                      <svg
                        viewBox="0 0 64 64"
                        className="w-16 h-16 bg-white p-1.5 rounded-lg shrink-0"
                        aria-hidden="true"
                      >
                        <rect x="4" y="4" width="18" height="18" fill="#0F172A" />
                        <rect x="8" y="8" width="10" height="10" fill="#FFFFFF" />
                        <rect x="11" y="11" width="4" height="4" fill="#0F172A" />
                        <rect x="42" y="4" width="18" height="18" fill="#0F172A" />
                        <rect x="46" y="8" width="10" height="10" fill="#FFFFFF" />
                        <rect x="49" y="11" width="4" height="4" fill="#0F172A" />
                        <rect x="4" y="42" width="18" height="18" fill="#0F172A" />
                        <rect x="8" y="46" width="10" height="10" fill="#FFFFFF" />
                        <rect x="11" y="49" width="4" height="4" fill="#0F172A" />
                        <rect x="28" y="8" width="6" height="6" fill="#0F172A" />
                        <rect x="28" y="20" width="8" height="8" fill="#0F172A" />
                        <rect x="28" y="34" width="6" height="12" fill="#0F172A" />
                        <rect x="40" y="30" width="10" height="6" fill="#0F172A" />
                        <rect x="42" y="44" width="16" height="6" fill="#0F172A" />
                        <rect x="30" y="52" width="12" height="8" fill="#0F172A" />
                      </svg>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white">
                          Scan QR with any UPI App
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-1">
                          Instant verification with Google Pay, PhonePe, Paytm,
                          or BHIM.
                        </p>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="rzp-upi"
                        className="block text-xs font-medium text-zinc-300 mb-1.5"
                      >
                        Or enter UPI ID / VPA
                      </label>
                      <input
                        id="rzp-upi"
                        type="text"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        placeholder="traveler@okaxis"
                        className="w-full px-3.5 py-2.5 text-sm font-mono bg-[#181C28] border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}

                {method === 'Card' && (
                  <div className="space-y-3.5">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label
                          htmlFor="rzp-card-num"
                          className="text-xs font-medium text-zinc-300"
                        >
                          Card Number
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setCardNumber('4242 4242 4242 4242');
                            setExpiry('08/29');
                            setCvv('842');
                          }}
                          className="text-[11px] text-blue-400 hover:text-blue-300 underline underline-offset-4"
                        >
                          Use test Visa
                        </button>
                      </div>
                      <input
                        id="rzp-card-num"
                        type="text"
                        inputMode="numeric"
                        value={cardNumber}
                        onChange={(e) =>
                          setCardNumber(formatCardNumber(e.target.value))
                        }
                        className="w-full px-3.5 py-2.5 text-sm font-mono bg-[#181C28] border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-blue-500 tabular-nums"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor="rzp-exp"
                          className="block text-xs font-medium text-zinc-300 mb-1"
                        >
                          Expiry
                        </label>
                        <input
                          id="rzp-exp"
                          type="text"
                          value={expiry}
                          onChange={(e) =>
                            setExpiry(formatExpiry(e.target.value))
                          }
                          className="w-full px-3.5 py-2 text-sm font-mono bg-[#181C28] border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-blue-500 tabular-nums"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="rzp-cvv"
                          className="block text-xs font-medium text-zinc-300 mb-1"
                        >
                          CVV
                        </label>
                        <input
                          id="rzp-cvv"
                          type="password"
                          maxLength={4}
                          value={cvv}
                          onChange={(e) =>
                            setCvv(
                              e.target.value.replace(/\D/g, '').slice(0, 4)
                            )
                          }
                          className="w-full px-3.5 py-2 text-sm font-mono bg-[#181C28] border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-blue-500 tabular-nums"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="rzp-holder"
                        className="block text-xs font-medium text-zinc-300 mb-1"
                      >
                        Cardholder Name
                      </label>
                      <input
                        id="rzp-holder"
                        type="text"
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm bg-[#181C28] border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}

                {method === 'NetBanking' && (
                  <div className="grid grid-cols-2 gap-2.5">
                    {NETBANKING_BANKS.map((bank) => (
                      <button
                        key={bank}
                        type="button"
                        onClick={() => setSelectedBank(bank)}
                        className={`p-3 rounded-lg border text-left text-xs font-medium transition-colors ${
                          selectedBank === bank
                            ? 'border-blue-500 bg-blue-600/15 text-white'
                            : 'border-zinc-800 bg-[#181C28] text-zinc-300 hover:border-zinc-700'
                        }`}
                      >
                        {bank}
                      </button>
                    ))}
                  </div>
                )}

                {method === 'Wallet' && (
                  <div className="grid grid-cols-2 gap-2.5">
                    {WALLETS.map((w) => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => setSelectedWallet(w)}
                        className={`p-3 rounded-lg border text-left text-xs font-medium transition-colors ${
                          selectedWallet === w
                            ? 'border-blue-500 bg-blue-600/15 text-white'
                            : 'border-zinc-800 bg-[#181C28] text-zinc-300 hover:border-zinc-700'
                        }`}
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                )}

                <div className="pt-3 border-t border-zinc-800 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                    <span>Secured by Razorpay Mock</span>
                  </div>

                  <button
                    type="submit"
                    className="px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors whitespace-nowrap"
                  >
                    Pay Rs.{totalAmount.toLocaleString('en-IN')}
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
