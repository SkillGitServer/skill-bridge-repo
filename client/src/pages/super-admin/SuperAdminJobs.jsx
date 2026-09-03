import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import toast from 'react-hot-toast';
import supIcon from '../../assets/sup-icon.png';
import PublishedJobsList from '../../components/super-admin/PublishedJobsList';
import PreviousOpeningsList from '../../components/super-admin/PreviousOpeningsList';
import JobUploadCard from '../../components/admin/JobUploadCard';
import PendingJobQueue from '../../components/super-admin/PendingJobQueue';
import { logoutUser } from '../../utils/auth';
import { useSupsRefresh } from '../../components/super-admin/SuperAdminRefresh';

function SuperAdminJobs() {
  useDocumentTitle('Job Management | Super Admin');
  const navigate = useNavigate();

  const handleLogout = () => {
    logoutUser('superadmin', navigate);
  };

  const handleRefreshAllJobs = async () => {
    window.dispatchEvent(new Event('job_queue_updated'));
  };

  const { RefreshButton, RefreshOverlay } = useSupsRefresh(handleRefreshAllJobs);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-indigo-100 via-purple-50 to-fuchsia-100 font-sans text-gray-900 flex flex-col text-left">
      {RefreshOverlay}
      
      {/* Top Header */}
      <header className="w-full bg-white/70 backdrop-blur-xl border-white/50 border-b px-4 md:px-6 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/super-admin/dashboard')}>
          <img src={supIcon} alt="Super Admin Tier Icon" className="h-8 w-8 object-contain" />
          <span className="text-lg font-black tracking-widest uppercase text-gray-900">
            Skill Sups
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {RefreshButton}
          <button
            onClick={handleLogout}
            title="Logout"
            aria-label="Logout"
            className="p-2.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-xl transition-all cursor-pointer shadow-xs hover:scale-105 active:scale-95 flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-red-600">
              <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
              <line x1="12" y1="2" x2="12" y2="12" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 space-y-6">
        
        {/* Navigation Bar */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/super-admin/dashboard')}
            className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold py-2 px-3.5 sm:px-4 rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <span className="text-sm">←</span> <span>Dashboard</span>
          </button>
        </div>

        {/* Header Section */}
        <div className="border-b border-gray-200 pb-4">
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-gray-900">Job Management & Review Center</h2>
          <p className="text-xs text-gray-500 font-semibold mt-1">Post corporate job openings directly, track student applications, or review pending submissions from platform Admins.</p>
        </div>

        {/* Published Active Jobs Queue with Applicants Tracking */}
        <PublishedJobsList />

        {/* Pending Approval Queue */}
        <PendingJobQueue />

        {/* Job Posting Component (Direct Live Mode) */}
        <JobUploadCard role="super-admin" />

        {/* Previous Openings & Archived Jobs History Banner at the very bottom */}
        <PreviousOpeningsList />
      </main>

      <footer className="w-full text-center py-6 text-xs text-gray-400 font-semibold tracking-wide border-t border-gray-150 bg-white/40 backdrop-blur-md mt-auto z-20">
        Skill Bridge India
      </footer>
    </div>
  );
}

export default SuperAdminJobs;