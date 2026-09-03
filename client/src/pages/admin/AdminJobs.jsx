import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import JobUploadCard from '../../components/admin/JobUploadCard';
import { useAdminRefresh } from '../../components/admin/AdminRefresh';
import AdminHeader from '../../components/admin/AdminHeader';

function AdminJobs() {
  useDocumentTitle('Corporate Job Upload | Admin');
  const navigate = useNavigate();

  const { RefreshButton, RefreshOverlay } = useAdminRefresh();

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-indigo-100 via-purple-50 to-fuchsia-100 font-sans text-gray-900 flex flex-col text-left">
      {RefreshOverlay}
      
      {/* ── Top Navigation Bar ── */}
      <AdminHeader refreshButton={RefreshButton} />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-5xl mx-auto p-4 md:p-8 space-y-6">
        
        {/* Navigation Bar */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold py-2 px-3.5 sm:px-4 rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <span className="text-sm">←</span> <span>Dashboard</span>
          </button>
        </div>

        {/* Header Section */}
        <div className="border-b border-gray-200 pb-4">
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-gray-900">Corporate Job Portal Upload</h2>
          <p className="text-xs text-gray-500 font-semibold mt-1">Submit job openings and placement opportunities for Super Admin review and publication to students.</p>
        </div>

        {/* Job Upload Form Component */}
        <JobUploadCard role="admin" />
      </main>

      <footer className="w-full text-center py-6 text-xs text-gray-400 font-semibold tracking-wide border-t border-gray-150 bg-white/40 backdrop-blur-md mt-auto z-20">
        Skill Bridge India
      </footer>
    </div>
  );
}

export default AdminJobs;
