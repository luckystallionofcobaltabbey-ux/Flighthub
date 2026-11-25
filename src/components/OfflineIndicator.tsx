import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-[#A50044] border border-[#EDBB00]/60 px-3.5 py-2 text-xs font-semibold text-white iso-depth-sm"
    >
      <WifiOff className="w-3.5 h-3.5 text-[#EDBB00] shrink-0" />
      <span>Offline Mode — Cached schedules &amp; bookings active.</span>
    </div>
  );
};
