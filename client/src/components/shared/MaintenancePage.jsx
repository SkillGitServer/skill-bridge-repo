import React from 'react';
import { ShieldAlert } from 'lucide-react';

function MaintenancePage({ blockReason }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-primaryBlue text-cleanWhite px-4 py-8 select-none">
      <div className="max-w-md w-full text-center space-y-6 p-8 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 shadow-2xl">
        
        {/* Shield Icon / Badge */}
        <div className="inline-flex items-center justify-center p-4 rounded-full bg-successGreen/15 text-successGreen border border-successGreen/35 animate-pulse">
          <ShieldAlert size={48} />
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-cleanWhite">
            System Blocked
          </h1>
          <p className="text-sm font-medium uppercase tracking-wider text-successGreen">
            Under Scheduled Maintenance
          </p>
        </div>

        {/* Divider */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        {/* Custom block message */}
        <div className="space-y-2">
          <p className="text-sm text-gray-400 font-semibold uppercase">Reason for Block:</p>
          <div className="p-4 rounded-lg bg-black/20 border border-white/5 text-gray-200 text-sm leading-relaxed text-left break-words">
            {blockReason || 'The application is temporarily undergoing maintenance. Please check back later.'}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MaintenancePage;
