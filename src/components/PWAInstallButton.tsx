import React, { useState } from 'react';
import { Check, Copy, Download, Share, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'sidebar' | 'header';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'sidebar',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopiedUrl(true);
      window.setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      // Clipboard fallback unavailable in restricted contexts
    }
  };

  const handlePrimaryClick = () => {
    if (isInstallable) {
      void install();
      return;
    }
    setShowGuideModal(true);
  };

  const buttonLabel = isInstallable
    ? 'Install App'
    : isIOS
      ? variant === 'header'
        ? 'Install'
        : 'Install on iPhone'
      : variant === 'header'
        ? 'Get App'
        : 'Get Phone App';

  return (
    <>
      {variant === 'header' ? (
        <button
          type="button"
          onClick={handlePrimaryClick}
          className="px-3 py-2 text-xs font-semibold text-white bg-[#004D98] hover:bg-[#1C6DD0] border border-[#1C6DD0]/70 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          {isInstallable ? (
            <Download className="w-3.5 h-3.5 text-[#EDBB00] shrink-0" />
          ) : (
            <Smartphone className="w-3.5 h-3.5 text-[#EDBB00] shrink-0" />
          )}
          <span>{buttonLabel}</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handlePrimaryClick}
          className="w-full py-2 px-3 text-xs font-semibold text-white bg-gradient-to-r from-[#004D98] to-[#A50044] hover:from-[#1C6DD0] hover:to-[#BE0A54] border border-[#1C6DD0]/60 rounded-lg transition-all inline-flex items-center justify-center gap-2 whitespace-nowrap"
        >
          {isInstallable ? (
            <Download className="w-3.5 h-3.5 text-[#EDBB00] shrink-0" />
          ) : (
            <Smartphone className="w-3.5 h-3.5 text-[#EDBB00] shrink-0" />
          )}
          <span>{buttonLabel}</span>
        </button>
      )}

      {showGuideModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-guide-title"
        >
          <div className="w-full max-w-md bg-[#0D1526] border border-[#1E2E4E] rounded-2xl iso-depth p-6 space-y-5 text-left">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <img
                  src="/pwa-192x192.png"
                  alt="FlightHub Lmtd app icon"
                  className="w-12 h-12 rounded-xl border border-[#1E2E4E] shrink-0"
                />
                <div>
                  <h3
                    id="pwa-install-guide-title"
                    className="text-base font-bold text-white"
                  >
                    {isIOS
                      ? 'Install on iPhone / iPad'
                      : 'Download FlightHub on Your Phone'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Runs offline as a full-screen home screen app
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                aria-label="Close installation guide"
                className="p-1.5 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <ol className="space-y-2.5 text-sm text-slate-200 bg-[#070B14] border border-[#1E2E4E] rounded-xl p-4">
                <li className="flex items-start gap-2.5">
                  <span className="font-mono text-xs font-bold text-[#EDBB00] pt-0.5">
                    01
                  </span>
                  <span>
                    Tap the{' '}
                    <span className="inline-flex items-center gap-1 font-semibold text-white">
                      <Share className="w-3.5 h-3.5 text-[#60A5FA]" /> Share
                    </span>{' '}
                    button in Safari&apos;s toolbar.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="font-mono text-xs font-bold text-[#EDBB00] pt-0.5">
                    02
                  </span>
                  <span>
                    Scroll down and tap{' '}
                    <strong className="text-white">Add to Home Screen</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="font-mono text-xs font-bold text-[#EDBB00] pt-0.5">
                    03
                  </span>
                  <span>
                    Tap <strong className="text-white">Add</strong> to launch
                    FlightHub directly from your home screen.
                  </span>
                </li>
              </ol>
            ) : (
              <div className="space-y-3 text-xs text-slate-300 bg-[#070B14] border border-[#1E2E4E] rounded-xl p-4">
                <div>
                  <p className="font-semibold text-[#60A5FA] uppercase tracking-wider mb-1">
                    Android (Chrome / Edge)
                  </p>
                  <p>
                    Open this app URL in Chrome on Android, tap the{' '}
                    <strong className="text-white">⋮</strong> menu (or the{' '}
                    <strong className="text-white">Install App</strong> button),
                    and select <strong className="text-white">Install app</strong>.
                  </p>
                </div>
                <div className="border-t border-[#1E2E4E] pt-3">
                  <p className="font-semibold text-[#FF4D88] uppercase tracking-wider mb-1">
                    iPhone / iPad (Safari)
                  </p>
                  <p>
                    Open in Safari, tap{' '}
                    <strong className="text-white">Share</strong>, then tap{' '}
                    <strong className="text-white">Add to Home Screen</strong>.
                  </p>
                </div>
                <div className="border-t border-[#1E2E4E] pt-3 text-slate-400">
                  Note: Publish via AI Studio <strong className="text-slate-200">Share</strong> first so the phone URL doesn&apos;t return 404, and sign in with Google to sync purchases across devices.
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleCopyUrl}
                className="flex-1 py-2.5 px-3 text-xs font-semibold text-white bg-[#004D98] hover:bg-[#1C6DD0] rounded-lg transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap"
              >
                {copiedUrl ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#EDBB00]" />
                    <span>Link Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy App Link</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="py-2.5 px-4 text-xs font-semibold text-slate-300 hover:text-white bg-[#121D33] border border-[#1E2E4E] rounded-lg transition-colors whitespace-nowrap"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
