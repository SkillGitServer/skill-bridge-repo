import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import axios from 'axios';
import { getAuthToken } from '../../utils/auth';

const PALETTE_THEMES = [
  {
    name: 'Pink',
    cardBg: 'bg-pink-50/90',
    border: 'border-2 border-pink-300',
    shadow: 'shadow-lg shadow-pink-100/50',
    badgeBg: 'bg-pink-100/90',
    badgeText: 'text-pink-800',
    badgeBorder: 'border-pink-300',
    iconBg: 'bg-pink-100/90 text-pink-700',
    dot: 'bg-pink-500',
    valueText: 'text-pink-950'
  },
  {
    name: 'Blue',
    cardBg: 'bg-blue-50/90',
    border: 'border-2 border-blue-300',
    shadow: 'shadow-lg shadow-blue-100/50',
    badgeBg: 'bg-blue-100/90',
    badgeText: 'text-blue-800',
    badgeBorder: 'border-blue-300',
    iconBg: 'bg-blue-100/90 text-blue-700',
    dot: 'bg-blue-500',
    valueText: 'text-blue-950'
  },
  {
    name: 'Purple',
    cardBg: 'bg-purple-50/90',
    border: 'border-2 border-purple-300',
    shadow: 'shadow-lg shadow-purple-100/50',
    badgeBg: 'bg-purple-100/90',
    badgeText: 'text-purple-800',
    badgeBorder: 'border-purple-300',
    iconBg: 'bg-purple-100/90 text-purple-700',
    dot: 'bg-purple-500',
    valueText: 'text-purple-950'
  },
  {
    name: 'Orange',
    cardBg: 'bg-orange-50/90',
    border: 'border-2 border-orange-300',
    shadow: 'shadow-lg shadow-orange-100/50',
    badgeBg: 'bg-orange-100/90',
    badgeText: 'text-orange-800',
    badgeBorder: 'border-orange-300',
    iconBg: 'bg-orange-100/90 text-orange-700',
    dot: 'bg-orange-500',
    valueText: 'text-orange-950'
  },
  {
    name: 'Teal',
    cardBg: 'bg-teal-50/90',
    border: 'border-2 border-teal-300',
    shadow: 'shadow-lg shadow-teal-100/50',
    badgeBg: 'bg-teal-100/90',
    badgeText: 'text-teal-800',
    badgeBorder: 'border-teal-300',
    iconBg: 'bg-teal-100/90 text-teal-700',
    dot: 'bg-teal-500',
    valueText: 'text-teal-950'
  },
  {
    name: 'Emerald',
    cardBg: 'bg-emerald-50/90',
    border: 'border-2 border-emerald-300',
    shadow: 'shadow-lg shadow-emerald-100/50',
    badgeBg: 'bg-emerald-100/90',
    badgeText: 'text-emerald-800',
    badgeBorder: 'border-emerald-300',
    iconBg: 'bg-emerald-100/90 text-emerald-700',
    dot: 'bg-emerald-500',
    valueText: 'text-emerald-950'
  },
  {
    name: 'Rose',
    cardBg: 'bg-rose-50/90',
    border: 'border-2 border-rose-300',
    shadow: 'shadow-lg shadow-rose-100/50',
    badgeBg: 'bg-rose-100/90',
    badgeText: 'text-rose-800',
    badgeBorder: 'border-rose-300',
    iconBg: 'bg-rose-100/90 text-rose-700',
    dot: 'bg-rose-500',
    valueText: 'text-rose-950'
  },
  {
    name: 'Amber',
    cardBg: 'bg-amber-50/90',
    border: 'border-2 border-amber-300',
    shadow: 'shadow-lg shadow-amber-100/50',
    badgeBg: 'bg-amber-100/90',
    badgeText: 'text-amber-800',
    badgeBorder: 'border-amber-300',
    iconBg: 'bg-amber-100/90 text-amber-700',
    dot: 'bg-amber-500',
    valueText: 'text-amber-950'
  }
];

function AdminOverview() {
  const navigate = useNavigate();
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false);
  const [notifyRecipient, setNotifyRecipient] = useState('All Students');
  const [notifyType, setNotifyType] = useState('General Info');
  const [notifyMessage, setNotifyMessage] = useState('');
  const [recipientSearch, setRecipientSearch] = useState('');

  // Loaded from API
  // Stale-While-Revalidate Client Caching for KPI metrics
  const getInitialStatsCache = () => {
    try {
      const cached = sessionStorage.getItem('admin_dashboard_stats_cache');
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return null;
  };

  const [studentsList, setStudentsList] = useState([]);
  const [reportsData, setReportsData] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState('All Subjects');
  const [analyticsMode, setAnalyticsMode] = useState('standard'); // 'standard' | 'mentor'
  const [customExamSearchQuery, setCustomExamSearchQuery] = useState('');
  const [isCustomDropdownOpen, setIsCustomDropdownOpen] = useState(false);
  const [stats, setStats] = useState(() => getInitialStatsCache() || {
    activeStudents: 0,
    totalStudents: 0,
    totalExams: 0,
    averageScore: '0%',
    pendingReviews: 0
  });

  const token = getAuthToken('vault');
  const referralCode = localStorage.getItem('admin_referral_code') || '';
  const adminName = localStorage.getItem('admin_name') || 'Admin';

  // Retention & Activity Feed
  const [activitiesList, setActivitiesList] = useState([]);
  const [retentionSettings, setRetentionSettings] = useState({
    communicationsRetention: '7d'
  });
  const [isUpdatingRetention, setIsUpdatingRetention] = useState(false);
  const [isCleaningNow, setIsCleaningNow] = useState(false);
  const [respondedExamIds, setRespondedExamIds] = useState(new Set());
  const [currentRespondingExamId, setCurrentRespondingExamId] = useState(null);
  const [insightsRetention, setInsightsRetention] = useState('7d');
  const [isCleaningInsightsNow, setIsCleaningInsightsNow] = useState(false);

  // Viewed states for KPI cards (restores white background once admin opens/views card)
  const [viewedActiveStudents, setViewedActiveStudents] = useState(() => {
    return Number(sessionStorage.getItem('viewed_active_students_count') || 0);
  });
  const [viewedExamsCount, setViewedExamsCount] = useState(() => {
    return Number(sessionStorage.getItem('viewed_total_exams_count') || 0);
  });
  const [viewedAvgScore, setViewedAvgScore] = useState(() => {
    return sessionStorage.getItem('viewed_avg_score') || '';
  });
  const [viewedPendingReviews, setViewedPendingReviews] = useState(() => {
    return Number(sessionStorage.getItem('viewed_pending_reviews_count') || 0);
  });

  const fetchCommunications = async () => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get('/api/admin/communications', { headers });
      if (res.data && Array.isArray(res.data.communications)) {
        setActivitiesList(res.data.communications);
      }
    } catch (err) {
      console.error('Failed to fetch communications:', err);
    }
  };

  const fetchRetentionSettings = async () => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get('/api/admin/settings/retention', { headers });
      if (res.data) {
        setRetentionSettings({
          communicationsRetention: res.data.communicationsRetention || '7d'
        });
      }
    } catch (err) {
      console.error('Failed to fetch retention settings:', err);
    }
  };

  const handleUpdateRetention = async (newRetention) => {
    try {
      setIsUpdatingRetention(true);
      setRetentionSettings({ communicationsRetention: newRetention });
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.post(
        '/api/admin/settings/retention',
        { communicationsRetention: newRetention },
        { headers }
      );
      toast.success('Auto-delete retention updated & database cleaned successfully!');
      fetchCommunications();
    } catch (err) {
      console.error('Failed to update retention:', err);
      toast.error('Failed to update retention setting.');
    } finally {
      setIsUpdatingRetention(false);
    }
  };

  const handleManualCleanup = async () => {
    try {
      setIsCleaningNow(true);
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.post(
        '/api/admin/cleanup-logs-now',
        {},
        { headers }
      );
      const report = res.data.report || {};
      toast.success(`Data Cleaned! Deleted ${report.communicationsDeleted || 0} Communications.`);
      fetchCommunications();
    } catch (err) {
      console.error('Failed to run manual cleanup:', err);
      toast.error('Failed to execute manual cleanup.');
    } finally {
      setIsCleaningNow(false);
    }
  };

  const handleManualInsightsCleanup = async () => {
    try {
      setIsCleaningInsightsNow(true);
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.post(
        '/api/admin/clear-failed-insights',
        { retention: insightsRetention },
        { headers }
      );
      toast.success(res.data.message || 'Failed insights records cleaned successfully!');
      const reportsRes = await axios.get('/api/admin/reports', { headers }).catch(() => null);
      if (reportsRes && reportsRes.data) setReportsData(reportsRes.data);
    } catch (err) {
      console.error('Failed insights cleanup error:', err);
      toast.error('Failed to clean insights records.');
    } finally {
      setIsCleaningInsightsNow(false);
    }
  };

  const handleDeleteSingleAlert = async (alertId) => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.delete(`/api/admin/exam-results/${alertId}`, { headers });
      toast.success('Exam alert record deleted successfully!');
      if (reportsData) {
        setReportsData(prev => ({
          ...prev,
          failedStudentAlerts: (prev?.failedStudentAlerts || []).filter(a => a.id !== alertId)
        }));
      }
    } catch (err) {
      console.error('Delete single alert error:', err);
      toast.error('Failed to delete exam alert record.');
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const [statsRes, studentsRes, reportsRes] = await Promise.all([
          axios.get('/api/admin/stats', { headers }),
          axios.get('/api/admin/students', { headers }),
          axios.get('/api/admin/reports', { headers }).catch(() => ({ data: null }))
        ]);
        if (statsRes.data) {
          setStats(statsRes.data);
          try {
            sessionStorage.setItem('admin_dashboard_stats_cache', JSON.stringify(statsRes.data));
          } catch (e) {}
        }
        setStudentsList(studentsRes.data.students || []);
        if (reportsRes && reportsRes.data) {
          setReportsData(reportsRes.data);
        }
      } catch (err) {
        console.error('Failed to load admin overview data:', err);
      }
    };
    fetchData();
    fetchCommunications();
    fetchRetentionSettings();
  }, [token]);

  const handleSendNotification = async () => {
    if (!notifyMessage.trim()) {
      toast.error('Please enter a notification message.');
      return;
    }

    let recipientLabel = 'All Registered Students';
    if (notifyRecipient !== 'All Students') {
      const found = studentsList.find(s => s.email === notifyRecipient);
      if (found) {
        recipientLabel = `${found.name} (${found.email})`;
      }
    }

    const loadingToast = toast.loading(`Delivering message to ${recipientLabel}...`);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.post(
        '/api/admin/send-notification',
        {
          recipient: notifyRecipient,
          type: notifyType,
          message: notifyMessage,
          examResultId: currentRespondingExamId
        },
        { headers }
      );

      toast.dismiss(loadingToast);
      toast.success(res.data.message || `Message delivered successfully to ${recipientLabel}!`);
      if (currentRespondingExamId) {
        setRespondedExamIds(prev => new Set([...prev, currentRespondingExamId]));
      }
      closeNotifyModal();
      fetchCommunications();
    } catch (err) {
      toast.dismiss(loadingToast);
      console.error('Failed to send notification:', err);
      toast.error(err.response?.data?.error || 'Failed to deliver message to student(s).');
    }
  };

  const closeNotifyModal = () => {
    setNotifyMessage('');
    setRecipientSearch('');
    setCurrentRespondingExamId(null);
    setIsNotifyModalOpen(false);
  };

  const handleRespondToFailedStudent = (alertItem) => {
    setNotifyRecipient(alertItem.studentEmail);
    setNotifyType('Academic Guidance');
    setNotifyMessage(alertItem.defaultResponseMsg || `Hi ${alertItem.studentName}, we noticed your recent score in ${alertItem.examTitle} (${alertItem.score}%). Don't worry! Reach out to us for mentor guidance or review the preparation modules.`);
    setCurrentRespondingExamId(alertItem.id);
    setIsNotifyModalOpen(true);
  };

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const activeStudents = stats?.activeStudents || 0;
  const totalStudents = stats?.totalStudents || 0;
  const totalExams = stats?.totalExams || 0;
  const averageScore = stats?.averageScore || '0%';
  const pendingReviews = stats?.pendingReviews || 0;

  const subjectsMap = reportsData?.performanceAnalytics?.subjects || {};
  const availableSubjects = Object.keys(subjectsMap);

  const ALL_FIXED_STANDARD_SUBJECTS = [
    'All Subjects',
    'Aptitude & Reasoning',
    'Problem Solving & Logic',
    'Communication & Verbal',
    'Behaviour & Personality',
    'Situational Judgment',
    'Workplace & Professional Skills'
  ];

  const STANDARD_SUBJECT_NAMES = [
    'All Subjects',
    'Aptitude & Reasoning',
    'Problem Solving & Logic',
    'Communication & Verbal',
    'Behaviour & Personality',
    'Situational Judgment',
    'Workplace & Professional Skills',
    'Aptitude',
    'Problem Solving',
    'Communication',
    'Behaviour',
    'Situational',
    'Workplace'
  ];

  const isStandardSubject = (subj) => {
    if (!subj) return true;
    return STANDARD_SUBJECT_NAMES.some(s => s.toLowerCase() === subj.toLowerCase().trim());
  };

  const standardSubjectsList = ALL_FIXED_STANDARD_SUBJECTS;

  const customSubjectsList = availableSubjects.filter(s => !isStandardSubject(s));

  const filteredCustomExams = customSubjectsList.filter(s => {
    if (!customExamSearchQuery.trim()) return true;
    return s.toLowerCase().includes(customExamSearchQuery.toLowerCase().trim());
  });

  const currentAnalytics = subjectsMap[selectedSubject] || {
    pass: 0,
    fail: 0,
    total: 0,
    passRate: 0,
    failRate: 0
  };

  const totalEvaluated = Number(currentAnalytics.pass || 0) + Number(currentAnalytics.fail || 0);
  const passPercentage = totalEvaluated > 0 ? Math.round((Number(currentAnalytics.pass || 0) / totalEvaluated) * 100) : 0;
  const failPercentage = totalEvaluated > 0 ? (100 - passPercentage) : 0;

  const failedAlerts = reportsData?.failedStudentAlerts || [];

  // Randomize & assign distinct colorful themes to top KPI cards ONCE on page load/mount
  const cardThemes = useMemo(() => {
    const shuffled = [...PALETTE_THEMES];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, []);

  return (
    <div className="w-full space-y-6 text-left">
      
      {/* ── Section 1: Header & Quick Actions ── */}
      <div className="bg-white/80 backdrop-blur-lg border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-3xl p-6 shadow-md hover:shadow-lg transition-shadow duration-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Welcome back, {adminName}</h2>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1">{formattedDate}</p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-[10px] font-extrabold text-emerald-700 tracking-wider uppercase">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Branch Active
          </span>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-row gap-3 sm:gap-4 mt-6">
          <button
            onClick={() => navigate('/admin/exam-generator')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3 px-3 sm:px-6 rounded-2xl text-xs tracking-wider uppercase shadow-sm transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer flex-1"
          >
            <span>➕</span>
            <span className="hidden sm:inline">Create Exam</span>
            <span className="sm:hidden">Create</span>
          </button>
          
          <button
            onClick={() => setIsShareModalOpen(true)}
            className="bg-white hover:bg-gray-50 text-gray-755 border border-gray-200 font-extrabold py-3 px-3 sm:px-6 rounded-2xl text-xs tracking-wider uppercase transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer flex-1"
          >
            <span>✉️</span>
            <span className="hidden sm:inline">Invite Student</span>
            <span className="sm:hidden">Invite</span>
          </button>
          
          <button
            onClick={() => navigate('/admin/reports')}
            className="bg-white hover:bg-gray-50 text-gray-755 border border-gray-200 font-extrabold py-3 px-3 sm:px-6 rounded-2xl text-xs tracking-wider uppercase transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer flex-1"
          >
            <span>📊</span>
            <span className="hidden sm:inline">View Reports</span>
            <span className="sm:hidden">Reports</span>
          </button>

          <button
            onClick={() => setIsNotifyModalOpen(true)}
            className="bg-white hover:bg-gray-50 text-gray-755 border border-gray-200 font-extrabold py-3 px-3 sm:px-6 rounded-2xl text-xs tracking-wider uppercase transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer flex-1"
          >
            <span>🔔</span>
            <span className="hidden sm:inline">Send Notification</span>
            <span className="sm:hidden">Notify</span>
          </button>
        </div>
      </div>

      {/* ── Section 2: High-Level KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {(() => {
          const isNewStudentDoc = pendingReviews > 0 && pendingReviews > viewedPendingReviews;
          const isNewStudentEnrolled = activeStudents > 0 && activeStudents > viewedActiveStudents;
          const isNewExamPublished = totalExams > 0 && totalExams > viewedExamsCount;
          const isNewAvgScoreUpdate = averageScore !== '0%' && averageScore !== viewedAvgScore;

          const kpiCards = [
            { 
              key: 'active_students',
              title: 'Active Students', 
              value: activeStudents, 
              change: `${totalStudents - activeStudents} deactivated`, 
              color: 'text-gray-900', 
              icon: '👥', 
              path: '/admin/students',
              hasNotification: isNewStudentEnrolled,
              badgeText: 'New Enrolled Student',
              onView: () => {
                sessionStorage.setItem('viewed_active_students_count', activeStudents.toString());
                setViewedActiveStudents(activeStudents);
              }
            },
            { 
              key: 'total_exams',
              title: 'Total Exams Published', 
              value: totalExams, 
              change: '0 drafts in queue', 
              color: 'text-gray-900', 
              icon: '📝', 
              path: '/admin/exams',
              hasNotification: isNewExamPublished,
              badgeText: 'New Exam Active',
              onView: () => {
                sessionStorage.setItem('viewed_total_exams_count', totalExams.toString());
                setViewedExamsCount(totalExams);
              }
            },
            { 
              key: 'avg_score',
              title: 'Average Exam Score', 
              value: averageScore, 
              change: averageScore === '0%' ? 'Not enough data' : 'Overall average', 
              color: averageScore === '0%' ? 'text-gray-900' : 'text-emerald-600', 
              icon: '📈', 
              path: '/admin/reports',
              hasNotification: isNewAvgScoreUpdate,
              badgeText: 'New Score Update',
              onView: () => {
                sessionStorage.setItem('viewed_avg_score', averageScore);
                setViewedAvgScore(averageScore);
              }
            },
            { 
              key: 'student_docs',
              title: 'Student Docs', 
              value: isNewStudentDoc ? 'New Document Uploaded' : 'No New Docs', 
              change: isNewStudentDoc ? `${pendingReviews - viewedPendingReviews} document(s) pending review` : 'All documents up to date', 
              color: isNewStudentDoc ? 'text-emerald-700 font-extrabold' : 'text-gray-900', 
              icon: '📂', 
              path: '/admin/reviews',
              hasNotification: isNewStudentDoc,
              badgeText: `New Doc Uploaded (${pendingReviews - viewedPendingReviews})`,
              onView: () => {
                sessionStorage.setItem('viewed_pending_reviews_count', pendingReviews.toString());
                setViewedPendingReviews(pendingReviews);
              }
            },
            { 
              key: 'corporate_jobs',
              title: 'Corporate Job Upload', 
              value: 'Upload Openings', 
              change: 'Submit jobs for student portal', 
              color: 'text-indigo-600', 
              icon: '💼', 
              path: '/admin/jobs',
              hasNotification: false,
              badgeText: '',
              onView: () => {}
            },
          ];

          return kpiCards.map((card, idx) => {
            const theme = cardThemes[idx % cardThemes.length];

            return (
              <div
                key={idx}
                onClick={() => {
                  card.onView();
                  navigate(card.path);
                }}
                className={`${
                  card.hasNotification
                    ? `${theme.cardBg} ${theme.border} ${theme.shadow}`
                    : 'bg-white/80 backdrop-blur-lg border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)]'
                } rounded-2xl p-5 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between relative cursor-pointer`}
              >
                {card.hasNotification && (
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${theme.badgeBg} ${theme.badgeText} border ${theme.badgeBorder} text-[10px] font-black uppercase tracking-wider mb-3 self-start animate-pulse`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${theme.dot}`} />
                    {card.badgeText}
                  </span>
                )}

                <span className={`absolute top-5 right-5 w-8 h-8 rounded-xl ${card.hasNotification ? `${theme.iconBg} border ${theme.badgeBorder}` : 'bg-gray-100 border border-gray-200'} flex items-center justify-center text-sm shadow-2xs`}>
                  {card.icon}
                </span>

                <div>
                  <span className="text-xs font-extrabold text-gray-500 uppercase tracking-wider block">
                    {card.title}
                  </span>
                  <h3 className={`text-xl font-black tracking-tight mt-2.5 ${card.hasNotification ? theme.valueText : card.color}`}>
                    {card.value}
                  </h3>
                </div>

                <p className="text-[10px] text-gray-400 font-semibold mt-4 flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${card.hasNotification ? theme.dot : 'bg-gray-300'}`} />
                  {card.change}
                </p>
              </div>
            );
          });
        })()}
      </div>

      {/* ── Section 3: Split View (Performance, Feed & Insights) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        
        {/* Column 1: Performance Analytics */}
        <div className={`rounded-xl p-5 hover:shadow-lg transition-all duration-300 flex flex-col justify-between h-[420px] relative ${
          analyticsMode === 'mentor'
            ? 'bg-gradient-to-br from-yellow-500/10 via-amber-500/15 to-yellow-600/10 border-2 border-yellow-500/60 shadow-[0_0_20px_rgba(234,179,8,0.2)] text-amber-950'
            : 'bg-white/80 backdrop-blur-lg border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)]'
        }`}>
          {/* Card Header & Dual-Mode Toggle */}
          <div className="space-y-2.5 border-b border-gray-200/60 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-gray-900 leading-tight">Performance Analytics</h3>
                <p className="text-xs text-gray-400 mt-0.5">Evaluation modules & student outcomes</p>
              </div>

              {/* Mode Toggle Buttons */}
              <div className="flex bg-gray-100/80 p-1 rounded-xl border border-gray-200 shadow-2xs gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setAnalyticsMode('standard');
                    setSelectedSubject('All Subjects');
                  }}
                  className={`py-1 px-2.5 text-[10px] font-black rounded-lg uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                    analyticsMode === 'standard'
                      ? 'bg-white text-gray-900 shadow-sm border border-gray-200/60'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  📚 Standard
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAnalyticsMode('mentor');
                    if (customSubjectsList.length > 0) {
                      setSelectedSubject(customSubjectsList[0]);
                    }
                  }}
                  className={`py-1 px-2.5 text-[10px] font-black rounded-lg uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                    analyticsMode === 'mentor'
                      ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-sm'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  👑 Custom
                </button>
              </div>
            </div>

            {/* Selection Controls */}
            {analyticsMode === 'standard' ? (
              /* Standard Subjects Dropdown */
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full text-xs font-bold bg-white text-gray-800 border border-gray-200 rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-2xs cursor-pointer truncate"
              >
                {standardSubjectsList.map(subj => (
                  <option key={subj} value={subj}>{subj}</option>
                ))}
              </select>
            ) : (
              /* Custom Assessments Search & Dropdown */
              <div className="relative w-full">
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={customExamSearchQuery}
                    onChange={(e) => {
                      setCustomExamSearchQuery(e.target.value);
                      setIsCustomDropdownOpen(true);
                    }}
                    onFocus={() => setIsCustomDropdownOpen(true)}
                    placeholder="🔍 Search custom assessments..."
                    className="w-full bg-white/90 border border-amber-300/80 rounded-xl px-3 py-1.5 text-xs font-bold text-amber-950 placeholder-amber-700/50 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setIsCustomDropdownOpen(!isCustomDropdownOpen)}
                    className="px-2.5 py-1.5 bg-amber-400 hover:bg-amber-500 text-black font-black text-xs rounded-xl border border-amber-500 cursor-pointer shadow-2xs shrink-0"
                    title="Toggle dropdown list"
                  >
                    ▼
                  </button>
                </div>

                {/* Custom Exam Dropdown Options */}
                {isCustomDropdownOpen && (
                  <div className="absolute top-full left-0 w-full mt-1 bg-white border border-amber-300 rounded-xl shadow-xl max-h-44 overflow-y-auto z-50 divide-y divide-amber-100">
                    {filteredCustomExams.length === 0 ? (
                      <div className="p-3 text-xs font-bold text-amber-800 text-center">
                        No matching custom assessments
                      </div>
                    ) : (
                      filteredCustomExams.map(examName => (
                        <button
                          key={examName}
                          type="button"
                          onClick={() => {
                            setSelectedSubject(examName);
                            setIsCustomDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs font-extrabold transition-colors flex items-center justify-between cursor-pointer ${
                            selectedSubject === examName
                              ? 'bg-amber-100 text-amber-950 font-black'
                              : 'hover:bg-amber-50 text-gray-800'
                          }`}
                        >
                          <span className="truncate flex items-center gap-1.5">
                            <span>✨</span> <span>{examName}</span>
                          </span>
                          {selectedSubject === examName && (
                            <span className="text-[10px] text-amber-700 font-black shrink-0">✓ Active</span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tug of War Dynamic Pass/Fail Progress Bar & Details */}
          <div className="flex-1 flex flex-col justify-center space-y-4 py-2">
            
            {/* Pass/Fail Rate Labels */}
            <div className="flex justify-between items-center text-xs font-black">
              <span className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
                <span className="w-2 h-2 rounded-full bg-emerald-500 block animate-pulse" /> Pass Rate ({passPercentage}%)
              </span>
              <span className="flex items-center gap-1.5 text-red-700 bg-red-50 px-2 py-1 rounded-lg border border-red-100">
                <span className="w-2 h-2 rounded-full bg-red-500 block animate-pulse" /> Fail Rate ({failPercentage}%)
              </span>
            </div>

            {/* Tug of War Unified Track */}
            <div className="space-y-2">
              {currentAnalytics.total === 0 ? (
                /* Empty state: neutral gray track */
                <div className="w-full h-3 rounded-full overflow-hidden flex bg-gray-100 border border-gray-200">
                  <div className="bg-gray-300 w-full h-full" />
                </div>
              ) : (
                /* Dynamic Tug of War Track (Pass left, Fail right = 100%) */
                <div className="flex w-full h-3 rounded-full overflow-hidden border border-gray-200 shadow-inner bg-gray-100">
                  <div 
                    style={{ width: `${passPercentage}%` }} 
                    className="bg-emerald-500 h-full transition-all duration-500" 
                    title={`Passed: ${currentAnalytics.pass} candidates (${passPercentage}%)`}
                  />
                  <div 
                    style={{ width: `${failPercentage}%` }} 
                    className="bg-red-500 h-full transition-all duration-500" 
                    title={`Failed: ${currentAnalytics.fail} candidates (${failPercentage}%)`}
                  />
                </div>
              )}
            </div>

            {/* Count Metrics Breakdown */}
            <div className="grid grid-cols-2 gap-3 pt-1 text-center">
              <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-2.5">
                <span className="text-base font-black text-emerald-700 block">{currentAnalytics.pass}</span>
                <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider">Passed Exams</span>
              </div>
              <div className="bg-red-50/60 border border-red-100 rounded-xl p-2.5">
                <span className="text-base font-black text-red-700 block">{currentAnalytics.fail}</span>
                <span className="text-[10px] font-extrabold text-red-800 uppercase tracking-wider">Failed Exams</span>
              </div>
            </div>

            {currentAnalytics.total === 0 && (
              <p className="text-[11px] font-bold text-gray-400 text-center italic">
                No exam submissions recorded for {selectedSubject} yet.
              </p>
            )}

          </div>

          {/* Footer Metadata */}
          <div className="border-t border-gray-200/60 pt-2.5 flex items-center justify-between text-[11px] font-semibold">
            <span>Subject: <strong className="text-gray-900 font-extrabold truncate max-w-[140px] inline-block align-bottom">{selectedSubject}</strong></span>
            <span>Evaluated: <strong className="text-indigo-600 font-black">{currentAnalytics.total}</strong></span>
          </div>

        </div>

        {/* Column 2: Recent Activity Feed */}
        <div className="bg-white/80 backdrop-blur-lg border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-xl p-6 hover:shadow-lg transition-shadow duration-200 flex flex-col h-[400px]">
          <div className="flex flex-col gap-2.5 mb-2">
            <div>
              <h3 className="text-base font-extrabold text-gray-900">Recent Activity Feed</h3>
              <p className="text-xs text-gray-400 mt-0.5">Real-time portal updates & communications</p>
            </div>

            {/* Retention & Manual Cleanup Box (stacked below title area) */}
            <div className="flex items-center justify-between gap-1.5 bg-gradient-to-r from-red-500/10 via-rose-500/10 to-pink-500/10 backdrop-blur-md border border-red-200/80 p-1.5 rounded-2xl shadow-xs w-full">
              <div className="flex items-center gap-1.5">
                <span className="text-xs px-2 py-1.5 bg-white border border-red-100 rounded-xl shadow-2xs shrink-0" title="Retention & Cleanup">🚫</span>

                <select
                  value={retentionSettings.communicationsRetention}
                  onChange={(e) => handleUpdateRetention(e.target.value)}
                  disabled={isUpdatingRetention}
                  className="text-xs font-bold bg-white text-gray-900 border border-gray-300 rounded-xl px-2 py-1.5 focus:ring-2 focus:ring-red-500 focus:border-red-500 shadow-2xs cursor-pointer outline-none hover:border-red-300 transition-all"
                >
                  <option value="1d">1 Day</option>
                  <option value="3d">3 Days</option>
                  <option value="7d">7 Days</option>
                  <option value="30d">1 Month</option>
                  <option value="never">Never</option>
                </select>
              </div>

              <button
                onClick={handleManualCleanup}
                disabled={isCleaningNow}
                className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-[11px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1 shrink-0 disabled:opacity-50"
                title="Immediately delete expired records from database"
              >
                {isCleaningNow ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete</span>
                )}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 mt-4 pr-1 scrollbar-thin">
            {activitiesList.length === 0 ? (
              <div className="text-center text-xs text-gray-400 font-bold py-8">No recent activity found.</div>
            ) : (
              activitiesList.map((item) => (
                <div key={item.id} className="p-3 bg-white/90 border border-gray-100 rounded-xl shadow-xs text-left hover:border-blue-200 transition-colors">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-extrabold text-gray-900">{item.sender?.name || 'Admin'}</span>
                    <span className="text-[9px] font-mono text-gray-400">{item.timestamp}</span>
                  </div>
                  <p className="text-xs text-gray-700 font-medium line-clamp-2">{item.message}</p>
                  <div className="flex justify-between items-center mt-1.5 text-[10px] text-gray-400 font-semibold">
                    <span>To: {item.recipient?.name || 'Student'}</span>
                    <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded font-extrabold text-[9px]">{item.type}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 3: Actionable Student Insights */}
        <div className="bg-white/80 backdrop-blur-lg border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-xl p-6 hover:shadow-lg transition-shadow duration-200 flex flex-col h-[400px]">
          <div className="flex flex-col gap-2.5 mb-1">
            {/* Card Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-gray-900 leading-tight">Actionable Student Insights</h3>
                <p className="text-xs text-gray-400 mt-0.5">Failed Exam Alerts & Support Triggers</p>
              </div>
              {failedAlerts.length > 0 ? (
                <span className="px-2.5 py-1 bg-red-100 text-red-800 border border-red-200 text-[10px] font-black rounded-full uppercase tracking-wider animate-pulse">
                  ⚠️ {failedAlerts.length} Failed
                </span>
              ) : (
                <span className="text-lg" title="AI Sparks">✨</span>
              )}
            </div>

            {/* Retention & Manual Cleanup Box (stacked below title area) */}
            <div className="flex items-center justify-between gap-1.5 bg-gradient-to-r from-red-500/10 via-rose-500/10 to-pink-500/10 backdrop-blur-md border border-red-200/80 p-1.5 rounded-2xl shadow-xs w-full">
              <div className="flex items-center gap-1.5">
                <span className="text-xs px-2 py-1.5 bg-white border border-red-100 rounded-xl shadow-2xs shrink-0" title="Retention & Cleanup">🚫</span>

                <select
                  value={insightsRetention}
                  onChange={(e) => setInsightsRetention(e.target.value)}
                  className="text-xs font-bold bg-white text-gray-900 border border-gray-300 rounded-xl px-2 py-1.5 focus:ring-2 focus:ring-red-500 focus:border-red-500 shadow-2xs cursor-pointer outline-none hover:border-red-300 transition-all"
                >
                  <option value="1d">1 Day</option>
                  <option value="3d">3 Days</option>
                  <option value="7d">7 Days</option>
                  <option value="30d">1 Month</option>
                  <option value="responded">Responded Only</option>
                  <option value="all">All Records</option>
                </select>
              </div>

              <button
                onClick={handleManualInsightsCleanup}
                disabled={isCleaningInsightsNow}
                className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-[11px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1 shrink-0 disabled:opacity-50"
                title="Immediately delete alert records from database"
              >
                {isCleaningInsightsNow ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete</span>
                )}
              </button>
            </div>
          </div>

          {/* List of Failed Student Alerts */}
          <div className="flex-1 overflow-y-auto space-y-3 mt-3 pr-1 scrollbar-thin">
            {failedAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-2 text-center">
                <span className="text-3xl">🎉</span>
                <p className="text-xs font-black text-emerald-700">All Candidates Performing Well!</p>
                <p className="text-[11px] font-semibold text-gray-400 max-w-[200px]">No failed exam scores recorded for your assigned candidates.</p>
              </div>
            ) : (
              failedAlerts.map((alertItem, idx) => {
                const isAlertResponded = alertItem.isResponded || respondedExamIds.has(alertItem.id);
                const isGolden = Boolean(alertItem.isMentorExam);

                return (
                  <div 
                    key={alertItem.id || idx} 
                    className={`p-3 border rounded-2xl shadow-xs space-y-2 text-left transition-all ${
                      isGolden
                        ? 'bg-gradient-to-r from-yellow-500/10 via-amber-500/15 to-yellow-600/20 border-2 border-yellow-500/60 shadow-[0_0_12px_rgba(234,179,8,0.18)] text-amber-950'
                        : isAlertResponded 
                          ? 'bg-emerald-50/40 border-emerald-200/80' 
                          : 'bg-red-50/50 border-red-200/70 hover:border-red-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${
                          isGolden ? 'bg-amber-500 shadow-xs' : isAlertResponded ? 'bg-emerald-500' : 'bg-red-600 animate-ping'
                        }`} />
                        <h4 className="text-xs font-black text-gray-900 truncate flex items-center gap-1">
                          <span>{isGolden ? '✨' : ''}</span>
                          <span>{alertItem.studentName}</span>
                        </h4>

                        {isGolden && (
                          <span className="text-[9px] font-black uppercase tracking-wider bg-yellow-400 text-black px-2 py-0.5 rounded-full border border-yellow-500 shadow-2xs shrink-0 flex items-center gap-0.5">
                            <span>✨</span> <span>GOLDEN</span>
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1 shrink-0">
                        {isAlertResponded ? (
                          <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0 flex items-center gap-1">
                            ✅ Responded
                          </span>
                        ) : (
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0 border ${
                            isGolden ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-red-100 text-red-800 border-red-200'
                          }`}>
                            Score: {alertItem.score}%
                          </span>
                        )}

                        <button
                          onClick={() => handleDeleteSingleAlert(alertItem.id)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors text-xs rounded hover:bg-red-50"
                          title="Delete alert record"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    <div className={`text-[11px] font-bold leading-snug ${isGolden ? 'text-amber-900' : 'text-gray-600'}`}>
                      <span>Subject: </span>
                      <strong className={`font-extrabold ${isGolden ? 'text-amber-950' : 'text-gray-900'}`}>{alertItem.examTitle}</strong>
                    </div>

                    <div className={`flex items-center justify-between pt-1 border-t text-[10px] ${isGolden ? 'border-amber-200/60' : 'border-gray-150'}`}>
                      <span className={isGolden ? 'text-amber-800/80 font-bold' : 'text-gray-400 font-semibold'}>{alertItem.date}</span>
                      
                      {isAlertResponded ? (
                        <span className="px-2.5 py-1 bg-emerald-100/80 text-emerald-800 font-black rounded-lg text-[10px] border border-emerald-200/60 flex items-center gap-1">
                          <span>✅</span> <span>Support Sent</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => handleRespondToFailedStudent(alertItem)}
                          className={`px-3 py-1 text-white font-extrabold rounded-lg shadow-2xs transition-all active:scale-95 flex items-center gap-1 cursor-pointer ${
                            isGolden 
                              ? 'bg-amber-600 hover:bg-amber-700' 
                              : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700'
                          }`}
                        >
                          <span>💬</span> <span>Respond / Send Support</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* ── Share Modal ── */}
      {isShareModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl relative border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setIsShareModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-full hover:bg-gray-50 text-lg font-bold"
              aria-label="Close modal"
            >
              ✕
            </button>

            <h3 className="text-lg font-extrabold text-gray-900 mb-2">Invite Students</h3>
            <p className="text-xs text-gray-500 mb-4">Share your unique referral link:</p>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 flex items-center justify-between gap-3 mb-6 select-all font-mono text-xs text-gray-700">
              <span className="truncate">{typeof window !== 'undefined' ? window.location.origin : ''}/register?ref={referralCode}</span>
              <button
                onClick={() => {
                  const refLink = `${window.location.origin}/register?ref=${referralCode}`;
                  navigator.clipboard.writeText(refLink);
                  toast.success('Referral link copied!');
                }}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors shrink-0 cursor-pointer"
              >
                Copy
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  const refLink = `${window.location.origin}/register?ref=${referralCode}`;
                  navigator.clipboard.writeText(refLink);
                  toast.success('Copied link successfully!');
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3 px-4 rounded-xl text-xs tracking-wider uppercase transition-colors cursor-pointer"
              >
                Copy Link
              </button>
              <button
                onClick={() => {
                  const refLink = encodeURIComponent(`${window.location.origin}/register?ref=${referralCode}`);
                  window.open(`https://api.whatsapp.com/send?text=Register%20on%20Skill%20Bridge%20India%20using%20my%20link:%20${refLink}`, '_blank');
                }}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 px-4 rounded-xl text-xs tracking-wider uppercase transition-colors cursor-pointer"
              >
                WhatsApp
              </button>
              <button
                onClick={() => {
                  const refLink = encodeURIComponent(`${window.location.origin}/register?ref=${referralCode}`);
                  window.location.href = `mailto:?subject=Skill%20Bridge%20India%20Invitation&body=Join%20the%20platform%20using%20my%20referral%20link:%20${refLink}`;
                }}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-extrabold py-3 px-4 rounded-xl text-xs tracking-wider uppercase transition-colors cursor-pointer"
              >
                Email
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Notification Modal ── */}
      {isNotifyModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl relative border border-gray-100 animate-in fade-in zoom-in-95 duration-150 text-left">
            <button
              onClick={closeNotifyModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-full hover:bg-gray-50 text-lg font-bold"
              aria-label="Close modal"
            >
              ✕
            </button>

            <h3 className="text-lg font-extrabold text-gray-900 mb-2">Send Notification to Students</h3>
            <p className="text-xs text-gray-500 mb-4">Draft a notification alert that will appear on student dashboard panels.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Recipient</label>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="🔍 Filter recipients by name or email..."
                    value={recipientSearch}
                    onChange={(e) => setRecipientSearch(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-blue-500"
                  />
                  <select
                    value={notifyRecipient}
                    onChange={(e) => setNotifyRecipient(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-blue-500"
                  >
                    <option value="All Students">All Students (Broadcasting)</option>
                    {studentsList
                      .filter(stud => 
                        stud.name.toLowerCase().includes(recipientSearch.toLowerCase()) ||
                        stud.email.toLowerCase().includes(recipientSearch.toLowerCase())
                      )
                      .map((stud) => (
                        <option key={stud.id || stud.email} value={stud.email}>
                          {stud.name} ({stud.email})
                        </option>
                      ))
                    }
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Notification Type</label>
                <select
                  value={notifyType}
                  onChange={(e) => setNotifyType(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-blue-500"
                >
                  <option value="General Info">General Info</option>
                  <option value="Action Required">Action Required</option>
                  <option value="Study Recommendation">Study Recommendation</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Message</label>
                <textarea
                  rows={4}
                  value={notifyMessage}
                  onChange={(e) => setNotifyMessage(e.target.value)}
                  placeholder="Type your message here..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={closeNotifyModal}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs tracking-wider uppercase transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendNotification}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs tracking-wider uppercase transition-colors shadow-xs"
                >
                  Send Message
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default AdminOverview;
