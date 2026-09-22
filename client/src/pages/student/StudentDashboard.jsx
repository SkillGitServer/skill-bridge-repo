import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import stuIcon from '../../assets/stu-icon.png';
import StudentUpgradeForm from '../../components/student/StudentUpgradeForm';
import LanguageSwitcher from '../../components/shared/LanguageSwitcher';
import PullToRefreshWrapper from '../../components/shared/PullToRefreshWrapper';
import { logoutUser, getAuthToken } from '../../utils/auth';
import BridgeAIWidget from '../../components/student/BridgeAIWidget';

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (document.getElementById('razorpay-checkout-script')) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.id = 'razorpay-checkout-script';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/* ── Dynamic greeting ─────────────────────────────────────── */
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return { word: 'Good', label: 'Morning',   emoji: '☀️',  moonMode: false };
  if (h < 17) return { word: 'Good', label: 'Afternoon', emoji: '🌤️', moonMode: false };
  return              { word: 'Good', label: 'Evening',  emoji: '🌙',  moonMode: true  };
}

function SunIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
    </svg>
  );
}
function MoonIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  );
}

/* ── Profile overlay stages: 'idle' | 'falling' | 'flipping' | 'icons' | 'leaving' */
function ProfileTransitionOverlay({ stage, onAction, onClose }) {
  const profileActions = [
    { icon: '👤', label: 'Profile',   bg: 'bg-purple-500', action: 'profile' },
    { icon: '🚪', label: 'Log Out',   bg: 'bg-red-500',    action: 'logout' },
  ];

  const profilePhoto = localStorage.getItem('student_profile_photo');
  const studentEmail = localStorage.getItem('auth_email') || localStorage.getItem('student_email') || '';
  let studentName = 'Student';
  try {
    const storedName = localStorage.getItem('auth_name');
    if (storedName) studentName = storedName;
  } catch (e) {}
  const initials = studentName.split(' ').map(n => n[0]).join('').toUpperCase();

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center animate-overlay-in cursor-pointer"
      style={{ background: 'rgba(10,10,10,0.96)', backdropFilter: 'blur(16px)', perspective: '1000px' }}
      onClick={onClose}
    >
      {/* Inner container to prevent closing when clicking the profile card/buttons */}
      <div 
        className="flex flex-col items-center cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* The central avatar element */}
        <div className="flex flex-col items-center">
          {/* Avatar circle — big, centred */}
          <div className="w-28 h-28 rounded-full border-4 border-white/20 mb-4 overflow-hidden relative shadow-[0_0_60px_rgba(251,146,60,0.4)] flex items-center justify-center">
            {profilePhoto ? (
              <img src={profilePhoto} className="w-full h-full object-cover" alt="Profile" />
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-orange-400 to-yellow-300 flex items-center justify-center font-black text-gray-900 text-4xl">
                {initials}
              </div>
            )}
          </div>
          <p className="text-white font-extrabold text-xl tracking-tight">{studentName}</p>
          <p className="text-gray-400 text-sm mt-1">{studentEmail}</p>
        </div>

        {/* Profile action icons — burst in after flip */}
        {(stage === 'icons' || stage === 'leaving') && (
          <div className="mt-10 grid grid-cols-2 gap-8">
            {profileActions.map((item, i) => (
              <div
                key={item.label}
                className={`flex flex-col items-center cursor-pointer animate-icon-burst`}
                style={{ animationDelay: `${i * 80}ms` }}
                onClick={() => onAction(item.action)}
              >
                <div className={`w-14 h-14 rounded-2xl ${item.bg} flex items-center justify-center text-2xl shadow-lg hover:scale-110 active:scale-95 transition-transform`}>
                  {item.icon}
                </div>
                <span className="text-[10px] font-bold text-gray-400 mt-2 tracking-wide text-center">{item.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StudentDashboard() {
  useDocumentTitle('Student Dashboard | Skill Bridge India');
  const navigate = useNavigate();
  const location = useLocation();
  const greeting = getGreeting();

  // Trial & Subscription State — Default to permanent unlocked access
  const [trialTimeRemaining, setTrialTimeRemaining] = useState(86400);
  const [isTrialActive, setIsTrialActive] = useState(true);
  const [isUnlocked, setIsUnlocked] = useState(true);
  const [isTrialLoading, setIsTrialLoading] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  // Subscription Duration & Expiration State
  const [accessExpiresAt, setAccessExpiresAt] = useState(null);
  const [allocatedDurationMonths, setAllocatedDurationMonths] = useState(6);
  const [isSubscriptionExpired, setIsSubscriptionExpired] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState(null);
  const [assignedUnlockFee, setAssignedUnlockFee] = useState(99);
  const [isRenewing, setIsRenewing] = useState(false);

  const lastExpiresAtRef = useRef(null);

  // Check if opened with upgrade parameter
  useEffect(() => {
    if (location.search.includes('upgrade=true') || location.state?.openUpgrade) {
      setIsUpgradeModalOpen(true);
    }
  }, [location]);

  useEffect(() => {
    let intervalId = null;
    const fetchTrialStatus = async () => {
      try {
        const email = localStorage.getItem('auth_email') || localStorage.getItem('student_email') || '';
        if (!email) { setIsTrialLoading(false); return; }
        const token = getAuthToken('spark');
        const res = await axios.get(`/api/trial/status/${email}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        
        if (res.data.isDeactivated) {
          setIsDeactivated(true);
          if (res.data.assignedAdmin) {
            setDeactivatedAdminInfo(res.data.assignedAdmin);
          }
          setIsTrialLoading(false);
          return;
        } else {
          setIsDeactivated(false);
        }

        if (res.data.accessExpiresAt) {
          setAccessExpiresAt(res.data.accessExpiresAt);
        }
        if (res.data.allocatedDurationMonths) {
          setAllocatedDurationMonths(res.data.allocatedDurationMonths);
        }

        // Always treat all students as unlocked and active with permanent access
        setIsUnlocked(true);
        localStorage.setItem('student_is_unlocked', 'true');
        setIsTrialActive(true);
        setIsSubscriptionExpired(false);
        setIsTrialLoading(false);
      } catch (error) {
        console.error('Failed to load trial status:', error);
        setIsTrialLoading(false);
      }
    };
    fetchTrialStatus();
    intervalId = setInterval(fetchTrialStatus, 15000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (isTrialLoading || isUnlocked || !isTrialActive || trialTimeRemaining <= 0) {
      if (!isTrialLoading && !isUnlocked && trialTimeRemaining <= 0) {
        setIsTrialActive(false);
      }
      return;
    }
    const timer = setInterval(() => {
      setTrialTimeRemaining(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isTrialActive, trialTimeRemaining, isUnlocked, isTrialLoading]);

  const handleExpressRenewal = async () => {
    setIsRenewing(true);
    const loadingToast = toast.loading('Initializing Express Renewal checkout...');
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toast.dismiss(loadingToast);
        toast.error('Failed to load Razorpay payment SDK. Please check internet connection.');
        setIsRenewing(false);
        return;
      }

      const token = getAuthToken('spark');
      const orderRes = await axios.post('/api/payment/create-renewal-order', {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      toast.dismiss(loadingToast);

      if (!orderRes.data.success) {
        toast.error(orderRes.data.error || 'Failed to create renewal order.');
        setIsRenewing(false);
        return;
      }

      const { order_id, key_id, amount, student: studentDetails } = orderRes.data;

      const options = {
        key: key_id,
        amount: Math.round(amount * 100),
        currency: 'INR',
        name: 'Skill Bridge India',
        description: `Express Subscription Renewal (${allocatedDurationMonths} Months)`,
        order_id,
        prefill: {
          name: studentDetails.name,
          email: studentDetails.email,
          contact: studentDetails.mobile
        },
        theme: {
          color: '#F97316'
        },
        handler: async (response) => {
          const verifyToast = toast.loading('Verifying renewal payment...');
          try {
            const verifyRes = await axios.post('/api/payment/verify-renewal', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            }, {
              headers: token ? { Authorization: `Bearer ${token}` } : {}
            });

            toast.dismiss(verifyToast);

            if (verifyRes.data.success) {
              toast.success(`🎉 ${verifyRes.data.message}`, { duration: 4000 });
              setIsSubscriptionExpired(false);
              setTimeout(() => {
                window.location.reload();
              }, 1200);
            } else {
              toast.error(verifyRes.data.error || 'Renewal verification failed.');
            }
          } catch (err) {
            console.error('Renewal verification error:', err);
            toast.dismiss(verifyToast);
            toast.error(err.response?.data?.error || 'Payment verification failed.');
          } finally {
            setIsRenewing(false);
          }
        },
        modal: {
          ondismiss: () => {
            setIsRenewing(false);
            toast.error('Renewal payment window closed.');
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err) {
      console.error('Express renewal failed:', err);
      toast.dismiss(loadingToast);
      toast.error(err.response?.data?.error || 'Express renewal failed.');
      setIsRenewing(false);
    }
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  // Profile transition state
  const [transStage, setTransStage] = useState('idle'); // 'idle' | 'falling' | 'flipping' | 'icons'

  // PWA Install Logic
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if already installed (running in standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (isStandalone) {
      setIsInstallable(false);
      return;
    }

    // Show by default for iOS and development visibility
    // Native beforeinstallprompt doesn't fire on iOS or unconfigured localhost
    setIsInstallable(true);

    // Listen for the actual install prompt (Android/Chrome Desktop)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstallable(false);
      }
      setDeferredPrompt(null);
    } else {
      // Fallback manual instructions for iOS or desktop browsers
      toast('To install, tap your browser menu (or Share) and select "Add to Home Screen".', {
        icon: '📲',
        duration: 6000,
      });
      setIsDismissed(true);
    }
  };

  const studentEmail = localStorage.getItem('student_email');
  const [studentName, setStudentName] = useState(localStorage.getItem('auth_name') || '');
  const [isDeactivated, setIsDeactivated] = useState(false);
  const [deactivatedAdminInfo, setDeactivatedAdminInfo] = useState(null);

  const [studentRank, setStudentRank] = useState(1);
  const [totalStudents, setTotalStudents] = useState(1);
  const [hasUploadedResume, setHasUploadedResume] = useState(false);
  const [assignedMentor, setAssignedMentor] = useState(null);
  const [assignedMentorPhoto, setAssignedMentorPhoto] = useState(() => localStorage.getItem('admin_profile_photo') || '');

  useEffect(() => {
    const fetchStudentProfileAndRank = async () => {
      try {
        const token = getAuthToken('spark');
        if (!token) return;

        // Fetch verified profile details
        const profileRes = await axios.get('/api/student/profile', {
          headers: { Authorization: `Bearer ${token}` }
        }).catch((err) => console.log('Profile endpoint load:', err.message));
        
        if (profileRes && profileRes.data) {
          setStudentName(profileRes.data.name);
          localStorage.setItem('auth_name', profileRes.data.name);
          if (profileRes.data.mentor) {
            setAssignedMentor(profileRes.data.mentor);
            if (profileRes.data.mentor.profilePhoto) {
              setAssignedMentorPhoto(profileRes.data.mentor.profilePhoto);
              localStorage.setItem('admin_profile_photo', profileRes.data.mentor.profilePhoto);
            }
          }
          if (profileRes.data.docResume) {
            setHasUploadedResume(true);
          }
          if (Array.isArray(profileRes.data.notifications)) {
            const cleanList = profileRes.data.notifications.filter(
              n => n.type !== 'Account Activated' && n.type !== 'Account Deactivated' &&
                   n.subject !== 'Account Activated' && n.subject !== 'Account Deactivated'
            );
            setNotifications(cleanList.map(n => ({
              ...n,
              timestamp: n.timestamp ? new Date(n.timestamp).toLocaleDateString('en-IN', {
                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
              }) : 'Just now'
            })));
          }
        }

        // Fetch dynamic leaderboard rank
        const rankRes = await axios.get('/api/results/leaderboard?timeframe=all', {
          headers: { Authorization: `Bearer ${token}` }
        }).catch((err) => console.log('Leaderboard rank load:', err.message));
        
        if (rankRes && rankRes.data) {
          const myEmail = (studentEmail || '').toLowerCase().trim();
          const found = rankRes.data.find(entry => entry.email.toLowerCase().trim() === myEmail);
          
          if (found) {
            setStudentRank(found.rank);
          } else {
            setStudentRank(rankRes.data.length || 1);
          }
          setTotalStudents(rankRes.data.length || 1);
        }
      } catch (err) {
        console.error('Failed to load profile or rank:', err);
      }
    };
    fetchStudentProfileAndRank();
  }, [studentEmail]);

  const adminName = localStorage.getItem('admin_name');
  const adminEmail = localStorage.getItem('admin_email');

  const [mentorExam, setMentorExam] = useState(null);

  const fetchMentorExam = useCallback(async () => {
    try {
      const token = getAuthToken('spark');
      const res = await axios.get('/api/mentor-exams/active', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }).catch(() => null);
      if (res?.data && res.data._id && res.data.isActive) {
        setMentorExam(res.data);
      } else {
        setMentorExam(null);
      }
    } catch (err) {
      setMentorExam(null);
    }
  }, []);

  useEffect(() => {
    fetchMentorExam();
    const interval = setInterval(fetchMentorExam, 2000);
    return () => clearInterval(interval);
  }, [fetchMentorExam]);

  const [activeWidgetIndex, setActiveWidgetIndex] = useState(0);

  const touchStartXRef = useRef(0);
  const touchEndXRef = useRef(0);

  const handleWidgetTouchStart = (e) => {
    touchStartXRef.current = e.targetTouches[0].clientX;
  };

  const handleWidgetTouchMove = (e) => {
    touchEndXRef.current = e.targetTouches[0].clientX;
  };

  const handleWidgetTouchEnd = () => {
    if (!showGoldenExamCard || notifications.length === 0) return;
    const diff = touchStartXRef.current - touchEndXRef.current;
    if (diff > 40) {
      setActiveWidgetIndex(1);
    } else if (diff < -40) {
      setActiveWidgetIndex(0);
    }
  };

  const isExamAttempted = mentorExam && mentorExam._id && (
    localStorage.getItem(`attempted_mentor_exam_${mentorExam._id}`) === 'true' ||
    localStorage.getItem(`completed_mentor_exam_${mentorExam._id}`) === 'true'
  );

  // STRICT RULE: Golden Card ONLY exists if candidate is UPGRADED (isUnlocked === true)
  const showGoldenExamCard = Boolean(
    isUnlocked && mentorExam && mentorExam._id && mentorExam.isActive && !isExamAttempted
  );

  useEffect(() => {
    if (!showGoldenExamCard && activeWidgetIndex !== 0) {
      setActiveWidgetIndex(0);
    }
  }, [showGoldenExamCard, activeWidgetIndex]);

  const handleStartTakeExam = async () => {
    const activeId = mentorExam ? mentorExam._id : null;
    if (activeId) {
      localStorage.setItem(`attempted_mentor_exam_${activeId}`, 'true');
      setMentorExam(null);

      try {
        const token = getAuthToken('spark');
        axios.post(`/api/mentor-exams/${activeId}/start`, {
          studentEmail: localStorage.getItem('auth_email') || localStorage.getItem('student_email')
        }, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        }).catch(() => {});
      } catch (e) {}

      navigate(`/student/exam/mentor-${activeId}`);
      return;
    }

    try {
      const token = getAuthToken('spark');
      const res = await axios.get('/api/mentor-exams/active', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (res?.data && res.data._id && res.data.isActive) {
        const targetId = res.data._id;
        localStorage.setItem(`attempted_mentor_exam_${targetId}`, 'true');
        setMentorExam(null);
        axios.post(`/api/mentor-exams/${targetId}/start`, {}, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        }).catch(() => {});
        navigate(`/student/exam/mentor-${targetId}`);
        return;
      }
    } catch (err) {
      console.error('Error fetching active mentor exam:', err);
    }

    navigate('/student/exam/combined');
  };

  const [notifications, setNotifications] = useState([]);
  const [selectedNotifModal, setSelectedNotifModal] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('student_notifications');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setNotifications(parsed);
        }
      } catch (e) {}
    }
  }, []);

  const handleNotificationClick = async (item) => {
    const targetId = item.id || item._id;

    // 1. Open in-page notification detail modal card
    setSelectedNotifModal(item);

    // 2. Instantly remove notification from local state list
    setNotifications(prev => prev.filter(n => (n.id || n._id) !== targetId));

    // 3. Remove from localStorage if cached
    try {
      const stored = localStorage.getItem('student_notifications');
      if (stored) {
        const parsed = JSON.parse(stored);
        const updated = parsed.filter(n => (n.id || n._id) !== targetId);
        localStorage.setItem('student_notifications', JSON.stringify(updated));
      }
    } catch (e) {}

    // 4. Remove notification from backend database
    try {
      const token = getAuthToken('spark');
      if (token && targetId) {
        await axios.delete(`/api/student/notifications/${targetId}`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => {
          axios.post(`/api/student/notifications/delete/${targetId}`, {}, {
            headers: { Authorization: `Bearer ${token}` }
          });
        });
      }
    } catch (err) {
      console.error('Error removing notification from database:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const token = getAuthToken('spark');
      await axios.post('/api/student/notifications/read-all', {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }).catch(() => {});
    } catch (e) {}

    localStorage.removeItem('student_notifications');
    setNotifications([]);
    toast.success('All messages cleared.');
  };

  // AI Practice Modules
  const aiModules = [
    { id: 'm1', title: 'Aptitude',        key: 'aptitude',         icon: '🧠', color: 'bg-blue-50 text-blue-600',   borderColor: 'border-blue-100' },
    { id: 'm2', title: 'Communication',   key: 'communication',    icon: '💬', color: 'bg-green-50 text-green-600', borderColor: 'border-green-100' },
    { id: 'm3', title: 'Behaviour',       key: 'behaviour',        icon: '🤝', color: 'bg-purple-50 text-purple-600', borderColor: 'border-purple-100' },
    { id: 'm4', title: 'Problem Solving', key: 'problem_solving',  icon: '🧩', color: 'bg-orange-50 text-orange-600', borderColor: 'border-orange-100' },
    { id: 'm5', title: 'Workplace Skills',key: 'workplace_skills', icon: '💼', color: 'bg-teal-50 text-teal-600',   borderColor: 'border-teal-100' },
    { id: 'm6', title: 'Situational',     key: 'situational',      icon: '🎯', color: 'bg-indigo-50 text-indigo-600', borderColor: 'border-indigo-100' },
  ];

  const handleProfileClick = (e) => {
    e.preventDefault();
    setTransStage('falling');
    setTimeout(() => setTransStage('flipping'), 350);
    setTimeout(() => setTransStage('icons'),   850);
  };

  const handleOverlayAction = async (action) => {
    setTransStage('idle');
    if (action === 'profile' || action === 'settings') {
      navigate('/student/profile');
    } else if (action === 'logout') {
      logoutUser('student', navigate);
    }
  };

  const handleCloseOverlay = () => {
    setTransStage('idle');
  };


  if (isUpgradeModalOpen) {
    return (
      <StudentUpgradeForm 
        onBack={() => setIsUpgradeModalOpen(false)} 
        showBack={true} 
        hasUploadedResume={hasUploadedResume}
      />
    );
  }

  return (
    <PullToRefreshWrapper>
      <div className={`min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-blue-50 font-sans w-full select-none ${isDeactivated ? 'pt-12 md:pt-14' : ''}`}>

      {/* ── Deactivation Banner ── */}
      {isDeactivated && (
        <div className="fixed top-0 left-0 right-0 bg-red-600 text-white py-3 px-6 text-center text-xs md:text-sm font-extrabold flex items-center justify-center gap-2 z-[9999] shadow-lg border-b border-red-700">
          <span>⚠️</span>
          <span>
            Your account has been deactivated. Please contact your administrator 
            <strong> {adminName}</strong> (<a href={`mailto:${adminEmail}`} className="underline hover:text-red-100">{adminEmail}</a>) for account activation.
          </span>
        </div>
      )}



      {/* ── Profile Transition Overlay ── */}
      {transStage !== 'idle' && (
        <ProfileTransitionOverlay 
          stage={transStage} 
          onAction={handleOverlayAction} 
          onClose={handleCloseOverlay} 
        />
      )}

      {/* ── Left Sidebar (Dark) ── */}
      <div className="w-full text-white px-6 md:px-8 relative overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.3)] flex flex-col z-10 bg-[#0a0a0a] pt-6 pb-16">

        {/* Animated glow blobs */}
        <div className="absolute top-28 left-12 w-64 h-64 bg-orange-500/10 rounded-full blur-[80px] pointer-events-none z-0 animate-float" />
        <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-yellow-500/5 rounded-full blur-[60px] pointer-events-none z-0 animate-float delay-400" />

        <div className="relative z-10 flex flex-col h-full">

          {/* ── Header Row ── */}
          <div className="flex items-center justify-between w-full mb-6 animate-fade-in-down">

            {/* Left: Dynamic Greeting & Name stacked next to the icon (resembling pasted image) */}
            <div className="flex items-center gap-3 animate-greeting-pop text-left">
              {/* Dynamic Icon */}
              <div className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/10 flex-shrink-0">
                {greeting.moonMode
                  ? <MoonIcon className="w-6 h-6 text-indigo-300 animate-float" />
                  : <SunIcon  className="w-6 h-6 text-yellow-300 animate-spin-slow" />
                }
              </div>
              
              {/* Text Stack */}
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold text-gray-400 tracking-wide">
                  {greeting.word} {greeting.label}
                </span>
                <span className="text-lg font-extrabold text-white tracking-tight leading-tight mt-0.5">
                  {studentName}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <LanguageSwitcher />

              {/* Right: Profile Avatar — triggers cinematic transition */}
              <button
                onClick={handleProfileClick}
              className="w-10 h-10 rounded-full border-2 border-white/20 flex items-center justify-center text-white hover:border-white hover:bg-white/10 active:scale-95 transition-all focus:outline-none relative group overflow-hidden animate-fade-in-right delay-100"
              aria-label="Open Profile"
            >
              {localStorage.getItem('student_profile_photo') ? (
                <img src={localStorage.getItem('student_profile_photo')} className="w-full h-full object-cover" alt="Profile" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-300 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              )}
              {/* Online dot */}
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-[#111111] rounded-full">
                <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-75" />
              </span>
              </button>
            </div>

          </div>

          {/* ── Samsung One UI Style Animated Swipeable Widget Stack ── */}
          <div 
            className="mt-2 animate-scale-in relative select-none"
            onTouchStart={handleWidgetTouchStart}
            onTouchMove={handleWidgetTouchMove}
            onTouchEnd={handleWidgetTouchEnd}
          >
            <div className="relative w-full min-h-[260px] sm:min-h-[220px] overflow-hidden rounded-3xl">
              {/* ── Slide 0: Golden Exam Card (Upgraded Candidates Only) ── */}
              {showGoldenExamCard && (
                <div 
                  className={`w-full h-full min-h-[260px] sm:min-h-[220px] bg-gradient-to-br from-[#3b2a00] via-[#1a1400] to-black border-2 border-amber-400/60 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(245,158,11,0.35)] flex flex-col justify-between p-4 sm:p-5 hover:shadow-[0_0_65px_rgba(245,158,11,0.45)] text-left group transition-all duration-300 ease-in-out ${
                    activeWidgetIndex === 0 
                      ? 'relative z-10 opacity-100 translate-x-0 pointer-events-auto' 
                      : 'absolute inset-0 z-0 opacity-0 -translate-x-full pointer-events-none'
                  }`}
                >
                  {/* Metallic Golden Decorative Glows */}
                  <div className="absolute top-0 right-0 w-44 h-44 bg-gradient-to-bl from-yellow-400/25 to-amber-500/0 rounded-full blur-[45px] pointer-events-none animate-float" />
                  <div className="absolute bottom-0 left-0 w-28 h-28 bg-amber-500/20 rounded-full blur-[35px] pointer-events-none animate-float delay-300" />

                  <div className="relative z-10 flex flex-col justify-between h-full space-y-3">
                    {/* Top Bar: Golden Headline & Total Question Badge */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-amber-400/20 border border-amber-400/50 text-amber-300 text-[10px] sm:text-xs font-black uppercase tracking-wider shadow-xs">
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
                          ✨ NEW EXAM BY MENTOR AVAILABLE
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black text-[10px] sm:text-xs font-black uppercase tracking-wider shadow-sm border border-amber-300">
                          ⚡ Instant +{(mentorExam?.totalQuestions || 1) * 5} Rank Up!
                        </span>
                      </div>

                      <div className="shrink-0 bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-500 text-black font-black text-[10px] sm:text-xs px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-2xl shadow-md border border-amber-300 flex items-center gap-1.5">
                        <span>🏆</span>
                        <span>{mentorExam?.totalQuestions || 1} Question{(mentorExam?.totalQuestions || 1) > 1 ? 's' : ''}</span>
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-lg sm:text-xl font-black text-white tracking-tight leading-snug drop-shadow-md">
                      {mentorExam?.title || 'Mentor Evaluation Assessment'}
                    </h3>

                    {/* Marking Scheme & Description Info */}
                    <div className="bg-black/50 border border-amber-500/40 rounded-2xl p-3.5 sm:p-4 backdrop-blur-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-auto">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="bg-gradient-to-r from-amber-400/25 to-yellow-400/25 text-amber-300 text-[10px] sm:text-[11px] font-black px-2.5 py-1 rounded-lg border border-amber-400/40 shadow-xs">
                            +5 Marks Correct • -10 Wrong • -5 Unattempted
                          </span>
                          <span className="text-gray-300 text-[11px] sm:text-xs font-bold">
                            ⏱️ {mentorExam?.duration || 15} Mins
                          </span>
                        </div>
                        <p className="text-[11px] sm:text-xs text-amber-100/90 font-medium line-clamp-1">
                          {mentorExam?.description || 'Evaluation of core competencies and technical skills.'} • Earn up to +{(mentorExam?.totalQuestions || 1) * 5} Total Marks!
                        </p>
                      </div>

                      <button
                        onClick={handleStartTakeExam}
                        className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:brightness-110 text-black font-black text-[11px] sm:text-xs uppercase tracking-wider py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl shadow-[0_4px_25px_rgba(245,158,11,0.5)] transition-all active:scale-95 cursor-pointer whitespace-nowrap border border-amber-300 shrink-0 self-start sm:self-center hover:scale-[1.02]"
                      >
                        🚀 START EXAM NOW (+{(mentorExam?.totalQuestions || 1) * 5} MARKS)
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Slide 1 / Fallback: Recent Messages Card ── */}
              <div 
                className={`w-full h-full min-h-[260px] sm:min-h-[220px] bg-gradient-to-br from-gray-800 to-black border border-gray-700/50 rounded-3xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.4),0_20px_50px_rgba(249,115,22,0.18)] flex flex-col justify-between p-4 sm:p-5 hover:shadow-[0_0_60px_rgba(0,0,0,0.5),0_20px_60px_rgba(249,115,22,0.28)] text-left transition-all duration-300 ease-in-out ${
                  (!showGoldenExamCard || activeWidgetIndex === 1)
                    ? 'relative z-10 opacity-100 translate-x-0 pointer-events-auto'
                    : 'absolute inset-0 z-0 opacity-0 translate-x-full pointer-events-none'
                }`}
              >
                <div className="absolute top-0 right-0 w-36 h-36 bg-orange-500/20 rounded-full blur-[50px] pointer-events-none animate-float" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-yellow-500/10 rounded-full blur-[40px] pointer-events-none animate-float delay-300" />

                <div className="relative z-10 flex flex-col justify-between h-full">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-[10px] uppercase font-black tracking-[0.25em] text-orange-400">
                        Recent Messages
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">Admin Broadcasts</p>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-colors">
                      <span className="text-xs font-extrabold text-orange-400">📢</span>
                    </div>
                  </div>

                  <div className="overflow-y-auto flex-1 pr-1 space-y-2 text-left z-10 my-auto">
                    {notifications.length > 0 ? (
                      notifications.slice(0, 2).map((item) => (
                        <div 
                          key={item.id || item._id} 
                          onClick={() => handleNotificationClick(item)}
                          className="flex gap-2 p-2 bg-white/5 border border-white/10 hover:border-orange-500/50 hover:bg-white/10 rounded-xl backdrop-blur-xs transition-all cursor-pointer group active:scale-[0.98]"
                          title="Click to view details and open page"
                        >
                          <span className="text-xs shrink-0 group-hover:scale-110 transition-transform">🔔</span>
                          <div className="min-w-0 flex-1">
                            <div className="flex justify-between items-baseline gap-1">
                              <span className="text-[10px] font-extrabold text-orange-400 group-hover:underline truncate">{item.subject || item.type}</span>
                              <span className="text-[8px] text-gray-500 font-mono shrink-0">{item.timestamp}</span>
                            </div>
                            <p className="text-[10px] text-gray-300 font-medium line-clamp-1 mt-0.5">{item.message}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] text-gray-500 font-bold py-2">No messages from administrative mentors.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Samsung One UI Style Pagination Dots ── */}
            {showGoldenExamCard && notifications.length > 0 && (
              <div className="flex items-center justify-center gap-2 mt-3 animate-fade-in">
                <button
                  type="button"
                  onClick={() => setActiveWidgetIndex(0)}
                  aria-label="Golden Exam Card"
                  className={`transition-all duration-300 cursor-pointer ${
                    activeWidgetIndex === 0 
                      ? 'w-6 h-2 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full shadow-[0_0_12px_rgba(245,158,11,0.6)]' 
                      : 'w-2 h-2 bg-gray-600/60 rounded-full hover:bg-gray-400'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setActiveWidgetIndex(1)}
                  aria-label="Recent Messages"
                  className={`transition-all duration-300 cursor-pointer ${
                    activeWidgetIndex === 1 
                      ? 'w-6 h-2 bg-gradient-to-r from-orange-400 to-amber-500 rounded-full shadow-[0_0_12px_rgba(249,115,22,0.6)]' 
                      : 'w-2 h-2 bg-gray-600/60 rounded-full hover:bg-gray-400'
                  }`}
                />
              </div>
            )}

            {((!showGoldenExamCard || activeWidgetIndex === 1) && notifications.some(n => n.unread)) && (
              <div className="mt-4 bg-[#1a1a1a] rounded-2xl p-4 border border-gray-800 text-center shadow-lg animate-fade-in-up">
                <button 
                  onClick={handleMarkAllRead}
                  className="w-full bg-white hover:bg-amber-50 text-black font-extrabold py-3.5 rounded-xl transition-all text-sm shadow-md active:scale-95 cursor-pointer"
                >
                  Mark All As Read
                </button>
              </div>
            )}
          </div>

          {/* Portal label — desktop bottom */}
          <div className="hidden md:block md:mt-auto animate-fade-in-up delay-700">
            <span className="text-xs font-mono font-extrabold text-gray-600 tracking-widest uppercase">
              STUDENT DASHBOARD
            </span>
          </div>

        </div>
      </div>

      {/* ── Main Content Area (Light) ── */}
      <main className="relative z-20 -mt-10 bg-gradient-to-br from-slate-50 to-blue-50 rounded-t-[2.5rem] pt-8 pb-24 px-4 md:px-8 lg:px-12 w-full flex-1 flex flex-col space-y-8">

        <div className="space-y-8">

          {/* ── Primary Action Grid ── */}
          <div className="grid grid-cols-3 gap-4">
            {[
              {
                label: 'Take Exam',
                bg: 'from-indigo-500 to-indigo-600',
                delay: 'delay-100',
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                ),
              },
              {
                label: 'My Results',
                bg: 'from-emerald-500 to-emerald-600',
                delay: 'delay-200',
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                ),
              },
              {
                label: 'Leaderboard',
                bg: 'from-orange-500 to-amber-500',
                delay: 'delay-300',
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                  </svg>
                ),
              },
            ].map((action) => {
              const rank = studentRank;
              const total = totalStudents;
              const isTopNinetyNine = rank <= 99;
              const percentile = total > 1 ? Math.round(((total - rank) / total) * 100) : 100;
              const rankText = total <= 2 
                ? `Rank #${rank} / ${total}` 
                : isTopNinetyNine 
                  ? `Top 99 (#${rank})` 
                  : `Top ${100 - percentile}%`;

              return (
                <button
                  key={action.label}
                  onClick={() => {
                    if (action.label === 'My Results') navigate('/student/results');
                    else if (action.label === 'Take Exam') handleStartTakeExam();
                    else if (action.label === 'Leaderboard') navigate('/student/leaderboard');
                  }}
                  className={`outline-none focus:outline-none focus:ring-0 [-webkit-tap-highlight-color:transparent] select-none text-center animate-fade-in-up ${action.delay} flex flex-col items-center cursor-pointer group`}
                >
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${action.bg} flex items-center justify-center mx-auto mb-2.5 shadow-lg group-hover:scale-110 group-hover:shadow-xl active:scale-95 transition-all duration-200 relative [-webkit-tap-highlight-color:transparent]`}>
                    {action.icon}
                    {action.label === 'Leaderboard' && (
                      <span className="absolute -top-1.5 -right-1.5 bg-orange-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-lg border border-orange-500/20 shadow-md">
                        #{rank}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-center font-bold text-gray-600 tracking-tight block">
                    {action.label}
                  </span>
                  {action.label === 'Leaderboard' && (
                    <span className="text-[9px] font-extrabold text-orange-600 bg-orange-50 border border-orange-100 rounded-full px-2 py-0.5 mt-1.5 inline-block whitespace-nowrap animate-fade-in-up">
                      {rankText}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ── AI Practice Modules ── */}
          <div className="animate-fade-in-up delay-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-extrabold text-gray-900 tracking-tight">AI Practice Modules</h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 mb-8">
              {aiModules.map((mod) => (
                <div
                  key={mod.id}
                  onClick={() => {
                    navigate(`/student/exam/${mod.key}`);
                  }}
                  className={`bg-white/80 backdrop-blur-md rounded-2xl p-3 border ${mod.borderColor} shadow-sm flex flex-col items-center gap-2 cursor-pointer hover:-translate-y-1 hover:shadow-xl transition-all duration-300 active:scale-95 text-center relative overflow-hidden group`}
                >
                  <span className="absolute top-2 right-2 text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded-md shadow-xs">10 Qs</span>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${mod.color}`}>
                    {mod.icon}
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold text-gray-800 leading-tight">{mod.title}</h4>
                    <p className="text-[9px] text-gray-400 mt-0.5">10 Qs</p>
                  </div>
                </div>
              ))}
            </div>
          </div>



          {/* ── Career Tools ── */}
          <div className="animate-fade-in-up delay-400">
            <h3 className="text-base font-extrabold text-gray-900 tracking-tight mb-5">Career Tools</h3>
            <div className="grid grid-cols-2 gap-4">
              <div 
                onClick={() => navigate('/student/resume')}
                className="bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-100 rounded-2xl p-5 flex flex-col justify-between h-36 cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group"
              >
                <div className="w-10 h-10 rounded-xl bg-teal-500/15 flex items-center justify-center text-teal-600 text-xl group-hover:scale-110 transition-transform">📄</div>
                <div>
                  <p className="text-xs font-extrabold text-teal-900">Resume Review</p>
                  <p className="text-[10px] text-teal-600 font-medium mt-0.5">Optimize with expert feedback</p>
                </div>
              </div>

              <div 
                onClick={() => {
                  navigate('/student/jobs');
                }}
                className="bg-gradient-to-br from-amber-50 via-orange-50/60 to-indigo-50/40 border border-amber-200/70 hover:border-indigo-400 rounded-2xl p-5 flex flex-col justify-between h-36 cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500/20 to-amber-500/20 border border-orange-200/60 flex items-center justify-center text-orange-600 text-xl group-hover:scale-110 transition-transform">💼</div>
                  <span className="text-[9px] bg-gradient-to-r from-indigo-50 to-violet-50 text-indigo-700 font-extrabold px-2.5 py-0.5 rounded-full border border-indigo-200/60 shadow-xs">
                    ✨ Verified Matcher
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-black text-slate-900 group-hover:text-indigo-900 transition-colors">Career Matcher</p>
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                    Explore verified corporate roles
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>

      <footer className="w-full text-center py-6 text-xs text-gray-400 font-semibold tracking-wide border-t border-gray-150 bg-white/40 backdrop-blur-md mt-auto z-20">
        Skill Bridge India
      </footer>

      {/* ── Deactivated Account Modal Popup ── */}
      {isDeactivated && (
        <div className="fixed inset-0 z-[99999] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full text-center shadow-2xl border border-red-100 relative animate-scale-up">
            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-4 shadow-inner">
              🚫
            </div>

            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Account Deactivated</h2>
            <p className="text-xs text-gray-500 font-semibold mt-2 leading-relaxed">
              Your candidate account access has been paused by an administrator. Please contact your assigned mentor or administration to reactivate your account.
            </p>

            {/* Admin Contact Information Box */}
            <div className="mt-5 bg-gradient-to-br from-red-50 to-orange-50 border border-red-200/80 rounded-2xl p-4 text-left">
              <span className="text-[10px] font-black uppercase text-red-700 tracking-wider block">Assigned Mentor / Admin</span>
              <h4 className="text-sm font-black text-gray-900 mt-1">
                {deactivatedAdminInfo?.name || adminName || 'Skill Bridge Admin'}
              </h4>
              <p className="text-xs font-mono font-medium text-gray-600 mt-1 flex items-center gap-1.5">
                <span>✉️</span> {deactivatedAdminInfo?.email || adminEmail || 'support@skillbridge.in'}
              </p>
              {(deactivatedAdminInfo?.mobile || localStorage.getItem('admin_mobile')) && (
                <p className="text-xs font-mono font-medium text-gray-600 mt-1 flex items-center gap-1.5">
                  <span>📞</span> {deactivatedAdminInfo?.mobile || localStorage.getItem('admin_mobile')}
                </p>
              )}
            </div>

            <div className="mt-6 flex flex-col gap-2.5">
              {/* Call Admin & Mail Admin Action Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                {(deactivatedAdminInfo?.mobile || localStorage.getItem('admin_mobile')) && (
                  <a
                    href={`tel:${(deactivatedAdminInfo?.mobile || localStorage.getItem('admin_mobile') || '').replace(/[^\d+]/g, '')}`}
                    className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                    title="Call Admin Phone App"
                  >
                    <span>📞 Call Admin</span>
                  </a>
                )}

                <a
                  href={`mailto:${deactivatedAdminInfo?.email || adminEmail || 'support@skillbridge.in'}?subject=Account%20Reactivation%20Request%20-%20${encodeURIComponent(studentEmail || '')}`}
                  className={`py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer ${
                    !(deactivatedAdminInfo?.mobile || localStorage.getItem('admin_mobile')) ? 'col-span-2' : ''
                  }`}
                  title="Mail Admin"
                >
                  <span>✉️ Mail Admin</span>
                </a>
              </div>

              <button
                onClick={() => logoutUser('student', navigate)}
                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-extrabold text-xs rounded-xl transition-all active:scale-95 cursor-pointer"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Admin Notification Detail Modal Card ── */}
      {selectedNotifModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl relative border border-gray-100 text-left animate-in zoom-in-95 duration-200 overflow-hidden">
            
            {/* Background Decorative Glow */}
            <div className="absolute -top-12 -right-12 w-36 h-36 bg-gradient-to-bl from-blue-500/15 to-indigo-500/0 rounded-full blur-2xl pointer-events-none" />

            {/* Close Button */}
            <button
              onClick={() => setSelectedNotifModal(null)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 transition-colors p-2 rounded-full hover:bg-gray-100 text-lg font-black cursor-pointer z-10"
              aria-label="Close notification"
            >
              ✕
            </button>

            {/* Header: Admin Profile Photo & Sender Info */}
            <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
              <div className="relative shrink-0">
                {(selectedNotifModal.senderPhoto || assignedMentorPhoto || localStorage.getItem('admin_profile_photo')) ? (
                  <img
                    src={selectedNotifModal.senderPhoto || assignedMentorPhoto || localStorage.getItem('admin_profile_photo')}
                    alt="Admin Avatar"
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-blue-500/30 shadow-sm"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 border-2 border-blue-400/30 flex items-center justify-center font-black text-xl text-white shadow-sm">
                    {(selectedNotifModal.senderName || selectedNotifModal.sender || adminName || 'Admin').substring(0, 1).toUpperCase()}
                  </div>
                )}
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white" title="Verified Admin" />
              </div>

              <div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-extrabold uppercase tracking-wider border border-blue-100 mb-1">
                  👑 Platform Admin / Mentor
                </span>
                <h3 className="text-lg font-black text-gray-900 leading-tight">
                  {selectedNotifModal.senderName || selectedNotifModal.sender || adminName || 'Platform Administrator'}
                </h3>
                <p className="text-xs text-gray-400 font-mono font-semibold mt-0.5">
                  {selectedNotifModal.timestamp || selectedNotifModal.date || 'Received Recently'}
                </p>
              </div>
            </div>

            {/* Subject / Notification Type Badge */}
            <div className="mt-5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 text-amber-800 text-xs font-black uppercase tracking-wider border border-amber-200/80">
                <span>💬</span> {selectedNotifModal.subject || selectedNotifModal.type || 'Academic Guidance'}
              </span>
            </div>

            {/* Message Body Card */}
            <div className="mt-4 bg-gray-50/80 rounded-2xl p-5 border border-gray-200/70 shadow-inner">
              <p className="text-sm font-semibold text-gray-800 leading-relaxed whitespace-pre-line">
                {selectedNotifModal.message}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-end gap-3 pt-2 border-t border-gray-100">
              {((selectedNotifModal.type && selectedNotifModal.type.toLowerCase().includes('exam')) ||
                (selectedNotifModal.subject && selectedNotifModal.subject.toLowerCase().includes('exam')) ||
                selectedNotifModal.link === '/student/exam') && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedNotifModal(null);
                    handleStartTakeExam();
                  }}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-2.5 px-5 rounded-xl text-xs uppercase tracking-wider shadow-sm transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>📝</span>
                  <span>Take Exam Now</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setSelectedNotifModal(null)}
                className="w-full sm:w-auto bg-gray-900 hover:bg-gray-800 text-white font-extrabold py-2.5 px-6 rounded-xl text-xs uppercase tracking-wider transition-all active:scale-95 cursor-pointer shadow-xs"
              >
                Close Message
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Floating Bridge AI Student Assistant */}
      <BridgeAIWidget
        mentor={assignedMentor}
        mentorExam={mentorExam}
        studentName={studentName}
      />
      </div>
    </PullToRefreshWrapper>
  );
}

export default StudentDashboard;
