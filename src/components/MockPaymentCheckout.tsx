import { useState } from 'react';
import {
  AlertCircle,
  Building2,
  CreditCard,
  Loader2,
  Lock,
  Smartphone,
} from 'lucide-react';
import { PaymentDetails, PaymentMethod } from '../types/flighthub';
import { generatePaymentReference } from '../utils/flightEngine';

interface MockPaymentCheckoutProps {
  totalAmount: number;
  passengerCount: number;
  farePerPassenger: number;
  defaultHolderName: string;
  onBack: () => void;
  onPaymentSuccess: (payment: PaymentDetails) => void;
}

const NETBANKING_BANKS = [
  'HDFC Bank',
  'ICICI Bank',
  'State Bank of India',
  'Axis Bank',
  'Kotak Mahindra Bank',
];

function formatCardNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export function MockPaymentCheckout({
  totalAmount,
  passengerCount,
  farePerPassenger,
  defaultHolderName,
  onBack,
  onPaymentSuccess,
}: MockPaymentCheckoutProps) {
  const [method, setMethod] = useState<PaymentMethod>('Card');
  const [cardHolder, setCardHolder] = useState(defaultHolderName);
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [expiry, setExpiry] = useState('08/29');
  const [cvv, setCvv] = useState('842');

  const [upiId, setUpiId] = useState('traveler@okaxis');
  const [selectedBank, setSelectedBank] = useState(NETBANKING_BANKS[0]);

  const [simulateDecline, setSimulateDecline] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const validatePayment = (): string | null => {
    if (method === 'Card') {
      if (!cardHolder.trim()) return 'Enter the cardholder name.';
      const digits = cardNumber.replace(/\D/g, '');
      if (digits.length < 12) return 'Enter a valid 16-digit card number.';
      if (!/^\d{2}\/\d{2}$/.test(expiry)) return 'Enter expiry as MM/YY.';
      if (cvv.replace(/\D/g, '').length < 3) return 'Enter a 3-digit CVV.';
    } else if (method === 'UPI') {
      if (!upiId.trim() || !upiId.includes('@')) {
        return 'Enter a valid UPI ID (e.g. name@okaxis).';
      }
    } else if (method === 'NetBanking') {
      if (!selectedBank) return 'Select a bank to continue.';
    }
    return null;
  };

  const handlePaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validatePayment();
    if (err) {
      setPaymentError(err);
      return;
    }

    setPaymentError(null);
    setProcessing(true);

    setTimeout(() => {
      if (simulateDecline) {
        setProcessing(false);
        setPaymentError(
          'Mock transaction declined by issuing bank. Uncheck "Simulate declined payment" or try another payment method.'
        );
        return;
      }

      const digits = cardNumber.replace(/\D/g, '');
      const accountMasked =
        method === 'Card'
          ? `•••• ${digits.slice(-4) || '4242'}`
          : method === 'UPI'
            ? upiId.trim()
            : selectedBank;

      onPaymentSuccess({
        method,
        referenceId: generatePaymentReference(),
        accountMasked,
        status: 'Paid',
        paidAt: new Date().toISOString(),
      });
    }, 950);
  };

  return (
    <form
      onSubmit={handlePaySubmit}
      className="bg-[#18181B] border border-zinc-800 rounded-xl p-6 space-y-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
            <Lock className="w-3.5 h-3.5 text-[#E50914]" />
            <span>FlightHub Lmtd Mock Payment Gateway</span>
          </div>
          <h2 className="font-display text-lg font-bold text-white mt-1">
            Complete Payment
          </h2>
        </div>

        <div className="text-right">
          <div className="text-xs text-zinc-400">
            {passengerCount} × Rs.{farePerPassenger.toLocaleString('en-IN')}
          </div>
          <div className="font-mono text-xl font-bold text-white tabular-nums">
            Rs.{totalAmount.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Method Selector */}
      <div className="grid grid-cols-3 gap-2 p-1 bg-[#111114] border border-zinc-800 rounded-lg">
        {(
          [
            { id: 'Card', label: 'Card', icon: CreditCard },
            { id: 'UPI', label: 'UPI', icon: Smartphone },
            { id: 'NetBanking', label: 'NetBanking', icon: Building2 },
          ] as const
        ).map((item) => {
          const Icon = item.icon;
          const active = method === item.id;
          return (
            <button
              key={item.id}
              type="button"
              disabled={processing}
              onClick={() => {
                setMethod(item.id);
                setPaymentError(null);
              }}
              className={`py-2 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                active
                  ? 'bg-[#E50914] text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {paymentError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 px-4 py-3 text-xs text-red-200 bg-red-950/50 border border-red-900/70 rounded-lg"
        >
          <AlertCircle className="w-4 h-4 text-[#E50914] shrink-0 mt-0.5" />
          <span>{paymentError}</span>
        </div>
      )}

      {/* Card Fields */}
      {method === 'Card' && (
        <div className="space-y-4">
          <div>
            <label
              htmlFor="mock-card-holder"
              className="block text-xs font-medium text-zinc-300 mb-1.5"
            >
              Cardholder Name
            </label>
            <input
              id="mock-card-holder"
              type="text"
              disabled={processing}
              value={cardHolder}
              onChange={(e) => setCardHolder(e.target.value)}
              placeholder="Name on card"
              className="w-full px-3.5 py-2.5 text-sm bg-[#111114] border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#E50914] focus:ring-2 focus:ring-[#E50914]/25"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="mock-card-number"
                className="block text-xs font-medium text-zinc-300"
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
                className="text-xs text-zinc-400 hover:text-white underline underline-offset-4"
              >
                Fill demo Visa
              </button>
            </div>
            <input
              id="mock-card-number"
              type="text"
              inputMode="numeric"
              disabled={processing}
              value={cardNumber}
              onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
              placeholder="4242 4242 4242 4242"
              className="w-full px-3.5 py-2.5 text-sm font-mono bg-[#111114] border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#E50914] focus:ring-2 focus:ring-[#E50914]/25 tabular-nums"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="mock-card-exp"
                className="block text-xs font-medium text-zinc-300 mb-1.5"
              >
                Expiry (MM/YY)
              </label>
              <input
                id="mock-card-exp"
                type="text"
                inputMode="numeric"
                disabled={processing}
                value={expiry}
                onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                placeholder="MM/YY"
                className="w-full px-3.5 py-2.5 text-sm font-mono bg-[#111114] border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-[#E50914] focus:ring-2 focus:ring-[#E50914]/25 tabular-nums"
              />
            </div>

            <div>
              <label
                htmlFor="mock-card-cvv"
                className="block text-xs font-medium text-zinc-300 mb-1.5"
              >
                CVV
              </label>
              <input
                id="mock-card-cvv"
                type="password"
                maxLength={4}
                inputMode="numeric"
                disabled={processing}
                value={cvv}
                onChange={(e) =>
                  setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))
                }
                placeholder="842"
                className="w-full px-3.5 py-2.5 text-sm font-mono bg-[#111114] border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-[#E50914] focus:ring-2 focus:ring-[#E50914]/25 tabular-nums"
              />
            </div>
          </div>
        </div>
      )}

      {/* UPI Fields */}
      {method === 'UPI' && (
        <div className="space-y-3">
          <div>
            <label
              htmlFor="mock-upi-id"
              className="block text-xs font-medium text-zinc-300 mb-1.5"
            >
              UPI Virtual Payment Address
            </label>
            <input
              id="mock-upi-id"
              type="text"
              disabled={processing}
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="name@okaxis"
              className="w-full px-3.5 py-2.5 text-sm font-mono bg-[#111114] border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-[#E50914] focus:ring-2 focus:ring-[#E50914]/25"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
            <span>Demo IDs:</span>
            {['traveler@okaxis', 'fly@ybl', 'jetset@oksbi'].map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => setUpiId(sample)}
                className="font-mono text-zinc-300 hover:text-white underline underline-offset-4"
              >
                {sample}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* NetBanking Fields */}
      {method === 'NetBanking' && (
        <div>
          <label
            htmlFor="mock-bank"
            className="block text-xs font-medium text-zinc-300 mb-1.5"
          >
            Select Issuing Bank
          </label>
          <select
            id="mock-bank"
            disabled={processing}
            value={selectedBank}
            onChange={(e) => setSelectedBank(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm bg-[#111114] border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-[#E50914] focus:ring-2 focus:ring-[#E50914]/25"
          >
            {NETBANKING_BANKS.map((bank) => (
              <option key={bank} value={bank}>
                {bank}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Sandbox Decline Toggle */}
      <div className="pt-3 border-t border-zinc-800 flex items-center justify-between gap-4">
        <label className="inline-flex items-center gap-2 text-xs text-zinc-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={simulateDecline}
            disabled={processing}
            onChange={(e) => {
              setSimulateDecline(e.target.checked);
              setPaymentError(null);
            }}
            className="rounded border-zinc-700 bg-[#111114] accent-[#E50914]"
          />
          <span>Simulate declined payment</span>
        </label>

        <span className="text-xs text-zinc-500">No real charge is made</span>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <button
          type="button"
          disabled={processing}
          onClick={onBack}
          className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-zinc-300 bg-[#111114] border border-zinc-700 hover:bg-zinc-800 rounded-lg transition-colors whitespace-nowrap disabled:opacity-50"
        >
          Back to Details
        </button>

        <button
          type="submit"
          disabled={processing}
          className="w-full sm:flex-1 py-2.5 px-5 text-sm font-semibold text-white bg-[#E50914] hover:bg-[#F40612] rounded-lg transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-70"
        >
          {processing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span>Authorizing Payment...</span>
            </>
          ) : (
            <span>
              Pay Rs.{totalAmount.toLocaleString('en-IN')} & Issue Tickets
            </span>
          )}
        </button>
      </div>
    </form>
  );
}
