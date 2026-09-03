import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import toast from 'react-hot-toast';
import axios from 'axios';
import { getAuthToken, logoutUser } from '../../utils/auth';
import { useSupsRefresh } from '../../components/super-admin/SuperAdminRefresh';

function SuperAdminPublishedExams() {
  useDocumentTitle('Published Exams | Super Admin');
  const navigate = useNavigate();

  const [exams, setExams] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAdmin, setSelectedAdmin] = useState('');
  const [activeModalUser, setActiveModalUser] = useState(null);

  const fetchExams = async () => {
    try {
      const token = getAuthToken('supss') || localStorage.getItem('auth_token');
      const res = await axios.get('/api/super-admin/mentor-exams', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = Array.isArray(res.data) ? res.data : (res.data.data || []);
      const mapped = data.map(exam => ({
        id: exam._id,
        title: exam.title,
        admin: (exam.createdBy && exam.createdBy.name) ? exam.createdBy.name : 'Platform Mentor',
        adminEmail: (exam.createdBy && exam.createdBy.email) ? exam.createdBy.email : 'admin@skillbridge.in',
        adminMobile: (exam.createdBy && exam.createdBy.mobile) ? exam.createdBy.mobile : '+91 98765 43210',
        totalQuestions: exam.totalQuestions || (exam.questions ? exam.questions.length : 0),
        difficulty: exam.difficulty || 'Intermediate',
        datePublished: new Date(exam.dateCreated || exam.createdAt).toLocaleDateString('en-IN', {
          day: '2-digit', month: 'short', year: 'numeric'
        }),
        status: exam.isActive ? 'Active' : 'Closed'
      }));
      setExams(mapped);
    } catch (err) {
      console.error('Error fetching global published exams:', err);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const handleLogout = () => {
    logoutUser('superadmin', navigate);
  };

  const { RefreshButton, RefreshOverlay } = useSupsRefresh(fetchExams);

  const uniqueAdmins = [...new Set(exams.map(e => e.admin).filter(Boolean))];

  const filteredExams = exams.filter(exam => {
    const matchesSearch = 
      exam.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      exam.admin?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAdmin = selectedAdmin === '' || exam.admin === selectedAdmin;
    
    return matchesSearch && matchesAdmin;
  });

  const handleOpenMentorModal = (exam) => {
    setActiveModalUser({
      name: exam.admin || 'Platform Mentor',
      email: exam.adminEmail || 'admin@skillbridge.in',
      mobile: exam.adminMobile || '+91 98765 43210',
      role: 'Mentor / Admin',
      status: 'Active'
    });
  };

  const getLargeAvatar = (user) => {
    const initials = user.name ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U';
    return (
      <div className="w-16 h-16 rounded-full border flex items-center justify-center text-xl font-black shadow-sm bg-blue-50 text-blue-755 border-blue-200">
        {initials}
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-indigo-100 via-purple-50 to-fuchsia-100 font-sans text-gray-900 flex flex-col overflow-x-hidden">
      {RefreshOverlay}
      
      {/* Top Header */}
      <header className="w-full bg-white/70 backdrop-blur-xl border-white/50 border-b px-4 md:px-6 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-2.5">
          <span className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)] animate-pulse"></span>
          <span 
            className="text-lg font-black tracking-widest uppercase cursor-pointer text-gray-900"
            onClick={() => navigate('/super-admin/dashboard')}
          >
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
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-3 text-left">
          <button
            onClick={() => navigate('/super-admin/dashboard')}
            className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold py-2 px-3.5 sm:px-4 rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <span className="text-sm">←</span> <span>Dashboard</span>
          </button>
        </div>

        {/* Header Title */}
        <div className="text-left">
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Mentor Published Exams</h1>
          <p className="text-xs text-gray-500 mt-1">Audit and review all examination modules published by active platform mentors.</p>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-col md:flex-row gap-3 bg-white/80 backdrop-blur-lg border border-white/50 shadow-[0_4px_20px_rgb(0,0,0,0.05)] rounded-2xl p-4">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input 
              type="text" 
              placeholder="Search exams by title or mentor name..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>
          <select 
            value={selectedAdmin} 
            onChange={(e) => setSelectedAdmin(e.target.value)}
            className="w-full md:w-56 px-3 py-2 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="">All Mentors</option>
            {uniqueAdmins.map(admin => (
              <option key={admin} value={admin}>{admin}</option>
            ))}
          </select>
        </div>

        {/* Table Queue */}
        <div className="bg-white/80 backdrop-blur-lg border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-2xl overflow-hidden w-full text-left shadow-sm">
          {/* Desktop View (min-width: 768px) */}
          <div className="hidden md:block overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-[10px] md:text-xs uppercase font-extrabold tracking-wider border-b border-gray-200">
                  <th className="px-6 py-4">Exam ID & Title</th>
                  <th className="px-6 py-4">Published By</th>
                  <th className="px-6 py-4">Questions</th>
                  <th className="px-6 py-4">Difficulty</th>
                  <th className="px-6 py-4">Date Published</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredExams.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400 font-bold text-sm">
                      No exams found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredExams.map((exam) => (
                    <tr
                      key={exam.id}
                      className="border-t border-gray-150 hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="font-bold text-xs text-gray-900">{exam.title}</div>
                        <div className="text-[10px] text-gray-400 font-semibold mt-0.5 font-mono">{exam.id}</div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleOpenMentorModal(exam)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm animate-fade-in"
                          title={`Click to view ${exam.admin}'s profile`}
                        >
                          👤 {exam.admin}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-gray-600 font-mono">
                        {exam.totalQuestions}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide border ${
                          exam.difficulty === 'Beginner' ? 'bg-green-50 text-green-700 border-green-200' :
                          exam.difficulty === 'Advanced' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                          exam.difficulty === 'Expert' ? 'bg-red-50 text-red-700 border-red-200' :
                          'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {exam.difficulty}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-gray-500">
                        {exam.datePublished}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-[9px] font-extrabold uppercase tracking-wide ${
                          exam.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {exam.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile View (max-width: 767px) */}
          <div className="block md:hidden p-3 space-y-3">
            {filteredExams.length === 0 ? (
              <div className="p-8 text-center text-gray-400 font-bold text-xs bg-white rounded-xl">
                No exams found matching your filters.
              </div>
            ) : (
              filteredExams.map((exam) => (
                <div key={exam.id} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3 shadow-xs">
                  <div className="flex justify-between items-start gap-2 border-b border-gray-100 pb-2.5">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-600">Published Exam</span>
                      <h4 className="text-sm font-black text-gray-900 leading-tight">{exam.title}</h4>
                      <div className="text-[9px] text-gray-400 font-mono mt-0.5">{exam.id}</div>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[9px] font-extrabold uppercase tracking-wide shrink-0 ${
                      exam.status === 'Active'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {exam.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2 text-xs">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-extrabold uppercase text-gray-400">Published By:</span>
                      <div className="mt-1">
                        <button
                          onClick={() => handleOpenMentorModal(exam)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold transition-all cursor-pointer"
                        >
                          👤 {exam.admin}
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-extrabold uppercase text-gray-400">Total Questions & Difficulty:</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-bold text-gray-800 font-mono">{exam.totalQuestions} Questions</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-extrabold uppercase border ${
                          exam.difficulty === 'Beginner' ? 'bg-green-50 text-green-700 border-green-200' :
                          exam.difficulty === 'Advanced' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                          exam.difficulty === 'Expert' ? 'bg-red-50 text-red-700 border-red-200' :
                          'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {exam.difficulty}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-extrabold uppercase text-gray-400">Date Published:</span>
                      <span className="font-semibold text-gray-600 font-mono">{exam.datePublished}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* User Info Detail Modal */}
      {activeModalUser && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white/90 backdrop-blur-xl border border-white/50 rounded-2xl p-6 max-w-sm w-full text-center shadow-xl animate-in fade-in zoom-in duration-150 relative">
            <button
              onClick={() => setActiveModalUser(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-extrabold text-sm cursor-pointer p-1"
            >
              ✕
            </button>
            <div className="flex justify-center mb-4 mt-2">
              {getLargeAvatar(activeModalUser)}
            </div>
            <h3 className="text-base font-black text-gray-900 leading-tight">{activeModalUser.name}</h3>
            <div className="mt-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide border bg-blue-50 text-blue-755 border-blue-200">
                {activeModalUser.role}
              </span>
            </div>
            <div className="mt-6 space-y-3.5 border-t border-gray-100 pt-4 text-left text-xs">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 font-extrabold uppercase tracking-wider text-[9px]">Email</span>
                <a href={`mailto:${activeModalUser.email}`} className="text-gray-700 font-bold hover:underline font-mono">
                  {activeModalUser.email}
                </a>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 font-extrabold uppercase tracking-wider text-[9px]">Contact</span>
                <span className="text-gray-700 font-semibold font-mono">
                  {activeModalUser.mobile}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 font-extrabold uppercase tracking-wider text-[9px]">Status</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full border text-[8px] font-extrabold uppercase tracking-wide bg-emerald-55 text-emerald-700 border-emerald-205">
                  {activeModalUser.status}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SuperAdminPublishedExams;