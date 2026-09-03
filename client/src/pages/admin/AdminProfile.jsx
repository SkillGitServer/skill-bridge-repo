import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import toast from 'react-hot-toast';
import axios from 'axios';
import { logoutUser, getAuthToken } from '../../utils/auth';
import { useAdminRefresh } from '../../components/admin/AdminRefresh';
import AdminHeader from '../../components/admin/AdminHeader';
import PhoneInput from '../../components/shared/PhoneInput';

function AdminProfile() {
  useDocumentTitle('Admin Profile | Skill Bridge India');
  const navigate = useNavigate();
  const location = useLocation();

  // Settings states loaded from localStorage
  const [name, setName] = useState(() => localStorage.getItem('admin_name') || 'Amit Sharma');
  const [email, setEmail] = useState(() => localStorage.getItem('admin_email') || 'amit.sharma@careerbridge.in');
  const [mobile, setMobile] = useState(() => localStorage.getItem('admin_mobile') || '+91 98765 43210');
  const [institute, setInstitute] = useState(() => localStorage.getItem('admin_institute') || 'Chhatrapati Sambhajinagar Branch');

  // Referral keys state
  const [currentKey, setCurrentKey] = useState(() => {
    const code = localStorage.getItem('admin_referral_code');
    return (code && code !== 'CB-ADMIN-001' && code !== 'REF-CB2025') ? code : '';
  });
  const [currentKeyStatus, setCurrentKeyStatus] = useState(() => localStorage.getItem('admin_referral_code_status') || "Active");
  const [pastKeys, setPastKeys] = useState(() => {
    const stored = localStorage.getItem('admin_past_referral_keys_v2');
    if (!stored) return [];
    try {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed.filter(k => k.code !== 'CB-ADMIN-001' && k.code !== 'REF-CB2025') : [];
    } catch (e) {
      return [];
    }
  });
  const [showPastKeys, setShowPastKeys] = useState(false);

  // Input states
  const [formName, setFormName] = useState(name);
  const [formMobile, setFormMobile] = useState(mobile);
  const [countryCode, setCountryCode] = useState('+91');
  const [formEmail, setFormEmail] = useState(email);
  const [formInstitute, setFormInstitute] = useState(institute);
  const [formReferralCode, setFormReferralCode] = useState(currentKey);

  // Password fields
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Profile photo states
  const fileInputRef = useRef(null);
  const [profilePhoto, setProfilePhoto] = useState(() => localStorage.getItem('admin_profile_photo') || '');
  const [showCropModal, setShowCropModal] = useState(false);
  const [rawImage, setRawImage] = useState('');

  // Crop adjustments
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [xOffset, setXOffset] = useState(0);
  const [yOffset, setYOffset] = useState(0);
  const [imgAspect, setImgAspect] = useState(1);

  // Sync input values when localStorage changes or loads
  useEffect(() => {
    setFormName(name);
    setFormEmail(email);
    setFormMobile(mobile);
    setFormInstitute(institute);
    setFormReferralCode(currentKey);
  }, [name, email, mobile, institute, currentKey]);

  useEffect(() => {
    const fetchAdminProfile = async () => {
      try {
        const token = getAuthToken('vault');
        if (!token) return;
        const res = await axios.get('/api/admin/profile', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const { name: dbName, email: dbEmail, mobile: dbMobile, referralCode: dbCode, referralKeysHistory: dbHistory, state: dbState, city: dbCity, profilePhoto: dbPhoto } = res.data;
        setName(dbName || '');
        setEmail(dbEmail || '');
        setMobile(dbMobile || '');
        if (dbPhoto) {
          setProfilePhoto(dbPhoto);
          localStorage.setItem('admin_profile_photo', dbPhoto);
        }
        const inst = `${dbCity || ''} ${dbState || ''} Branch`.trim().replace(/^Branch$/, '');
        setInstitute(inst || 'Chhatrapati Sambhajinagar Branch');
        setCurrentKey(dbCode || '');
        setCurrentKeyStatus(dbCode ? 'Active' : 'Deactivated');
        setFormName(dbName || '');
        setFormEmail(dbEmail || '');
        setFormMobile(dbMobile || '');
        setFormInstitute(inst || 'Chhatrapati Sambhajinagar Branch');
        setFormReferralCode(dbCode || '');

        if (Array.isArray(dbHistory)) {
          const past = dbHistory.filter(k => k.code !== dbCode);
          setPastKeys(past);
        }

        localStorage.setItem('admin_name', dbName || '');
        localStorage.setItem('admin_email', dbEmail || '');
        localStorage.setItem('admin_mobile', dbMobile || '');
        localStorage.setItem('admin_institute', inst || '');
        localStorage.setItem('admin_referral_code', dbCode || '');
      } catch (err) {
        console.error('Failed to fetch DB admin profile:', err);
      }
    };
    fetchAdminProfile();
  }, []);

  const { RefreshButton, RefreshOverlay } = useAdminRefresh(async () => {
    const token = getAuthToken('vault');
    if (!token) return;
    const res = await axios.get('/api/admin/profile', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const { name: dbName, email: dbEmail, mobile: dbMobile, referralCode: dbCode, referralKeysHistory: dbHistory, state: dbState, city: dbCity } = res.data;
    setName(dbName || '');
    setEmail(dbEmail || '');
    setMobile(dbMobile || '');
    const inst = `${dbCity || ''} ${dbState || ''} Branch`.trim().replace(/^Branch$/, '');
    setInstitute(inst || 'Chhatrapati Sambhajinagar Branch');
    setCurrentKey(dbCode || '');
    setCurrentKeyStatus(dbCode ? 'Active' : 'Deactivated');
    setFormName(dbName || '');
    setFormEmail(dbEmail || '');
    setFormMobile(dbMobile || '');
    setFormInstitute(inst || 'Chhatrapati Sambhajinagar Branch');
    setFormReferralCode(dbCode || '');
    if (Array.isArray(dbHistory)) {
      setPastKeys(dbHistory.filter(k => k.code !== dbCode));
    }
  });

  const handleLogout = () => {
    logoutUser('admin', navigate);
  };

  const copyReferralCode = () => {
    if (!currentKey) return;
    navigator.clipboard.writeText(currentKey);
    toast.success('Referral code copied to clipboard!');
  };

  // Toggle current referral key status (Active <-> Deactivated)
  const handleToggleKeyStatus = async () => {
    if (!currentKey) return;
    const nextStatus = currentKeyStatus === "Active" ? "Deactivated" : "Active";
    const loadingToast = toast.loading(`Setting referral key status to ${nextStatus}...`);
    try {
      const token = getAuthToken('vault');
      const updatedPast = pastKeys.map(k => ({ ...k, status: 'Deactivated' }));
      const newHistory = [
        { code: currentKey, status: nextStatus, createdAt: new Date() },
        ...updatedPast
      ];

      await axios.put('/api/admin/profile', {
        referralCode: nextStatus === 'Active' ? currentKey : '',
        referralKeysHistory: newHistory
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setCurrentKeyStatus(nextStatus);
      if (nextStatus === 'Deactivated') {
        setPastKeys([{ code: currentKey, status: 'Deactivated' }, ...pastKeys.filter(k => k.code !== currentKey)]);
      }
      localStorage.setItem('admin_referral_code_status', nextStatus);
      toast.dismiss(loadingToast);
      toast.success(`Referral key is now ${nextStatus.toLowerCase()}.`);
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error(err.response?.data?.error || 'Failed to toggle referral key status.');
    }
  };

  // Activate a past key — automatically deactivates current key so only 1 active key exists
  const togglePastKeyStatus = async (codeToActivate) => {
    const loadingToast = toast.loading(`Activating key ${codeToActivate}...`);
    try {
      const token = getAuthToken('vault');
      // All existing keys become Deactivated, target key becomes Active
      let allKeys = [
        { code: currentKey, status: 'Deactivated' },
        ...pastKeys.map(k => ({ ...k, status: 'Deactivated' }))
      ].filter(k => Boolean(k.code));

      // Remove duplicate of codeToActivate
      allKeys = allKeys.filter(k => k.code !== codeToActivate);
      allKeys.unshift({ code: codeToActivate, status: 'Active', createdAt: new Date() });

      await axios.put('/api/admin/profile', {
        referralCode: codeToActivate,
        referralKeysHistory: allKeys
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setCurrentKey(codeToActivate);
      setCurrentKeyStatus('Active');
      setFormReferralCode(codeToActivate);
      setPastKeys(allKeys.filter(k => k.code !== codeToActivate));

      localStorage.setItem('admin_referral_code', codeToActivate);
      localStorage.setItem('admin_referral_code_status', 'Active');

      toast.dismiss(loadingToast);
      toast.success(`Activated key ${codeToActivate}. All other keys deactivated.`);
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error(err.response?.data?.error || 'Failed to activate key.');
    }
  };

  // Generate new referral key — automatically deactivates current key
  const handleGenerateNewKey = async () => {
    const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
    const nextKey = `SKILL-HUB-${randomChars}`;
    const loadingToast = toast.loading('Generating and saving new active key...');
    try {
      const token = getAuthToken('vault');
      const oldKeys = [
        ...(currentKey ? [{ code: currentKey, status: 'Deactivated' }] : []),
        ...pastKeys.map(k => ({ ...k, status: 'Deactivated' }))
      ].filter(k => Boolean(k.code));

      const newHistory = [
        { code: nextKey, status: 'Active', createdAt: new Date() },
        ...oldKeys
      ];

      await axios.put('/api/admin/profile', {
        referralCode: nextKey,
        referralKeysHistory: newHistory
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setPastKeys(oldKeys);
      setCurrentKey(nextKey);
      setCurrentKeyStatus("Active");
      setFormReferralCode(nextKey);

      localStorage.setItem('admin_referral_code', nextKey);
      localStorage.setItem('admin_referral_code_status', "Active");

      toast.dismiss(loadingToast);
      toast.success("Generated & activated new key: " + nextKey + ". Previous keys deactivated.");
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error(err.response?.data?.error || 'Failed to generate new key.');
    }
  };

  // Check changes
  const hasChanges =
    formName !== name ||
    formEmail !== email ||
    formMobile !== mobile ||
    formInstitute !== institute ||
    formReferralCode !== currentKey;

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!formName.trim()) { toast.error('Name cannot be empty.'); return; }
    if (!formEmail.trim()) { toast.error('Email cannot be empty.'); return; }
    if (!formMobile.trim()) { toast.error('Mobile number cannot be empty.'); return; }
    const cleanMobile = formMobile.replace(/\D/g, '');
    if (cleanMobile.length < 10) {
      toast.error('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!formInstitute.trim()) { toast.error('Institute name cannot be empty.'); return; }
    if (!formReferralCode.trim()) { toast.error('Referral code cannot be empty.'); return; }

    const loadingToast = toast.loading('Saving profile changes...');
    try {
      const token = getAuthToken('vault');
      await axios.put('/api/admin/profile', {
        name: formName.trim(),
        email: formEmail.trim(),
        mobile: formMobile.trim(),
        referralCode: formReferralCode.trim(),
        institute: formInstitute.trim(),
        profilePhoto: profilePhoto || ''
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setName(formName.trim());
      setEmail(formEmail.trim());
      setMobile(formMobile.trim());
      setInstitute(formInstitute.trim());
      setCurrentKey(formReferralCode.trim());

      localStorage.setItem('admin_name', formName.trim());
      localStorage.setItem('admin_email', formEmail.trim());
      localStorage.setItem('admin_mobile', formMobile.trim());
      localStorage.setItem('admin_institute', formInstitute.trim());
      localStorage.setItem('admin_referral_code', formReferralCode.trim());

      toast.dismiss(loadingToast);
      toast.success('Admin details updated successfully!');
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error(err.response?.data?.error || 'Failed to update profile.');
    }
  };

  const handleUpdatePassword = (e) => {
    e.preventDefault();
    if (!oldPassword) { toast.error('Please enter your current password.'); return; }
    if (!newPassword) { toast.error('Please enter your new password.'); return; }
    if (newPassword.length < 8) { toast.error('New password must be at least 8 characters.'); return; }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match.'); return; }

    // Mock API update
    toast.success('Password changed successfully!');
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload a JPEG, PNG, or WebP image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        setRawImage(reader.result);
        setImgAspect(img.width / img.height);
        setZoom(1);
        setRotation(0);
        setXOffset(0);
        setYOffset(0);
        setShowCropModal(true);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const handleCropSave = () => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = 300;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
      ctx.translate(size / 2, size / 2);

      const scaleRatio = size / 192;
      ctx.translate(xOffset * scaleRatio, yOffset * scaleRatio);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(zoom, zoom);

      let drawWidth, drawHeight;
      if (imgAspect >= 1) {
        drawHeight = size;
        drawWidth = size * imgAspect;
      } else {
        drawWidth = size;
        drawHeight = size / imgAspect;
      }

      ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setProfilePhoto(dataUrl);
      localStorage.setItem('admin_profile_photo', dataUrl);
      setShowCropModal(false);

      // Persist Admin profile photo to database so assigned students can see it
      try {
        const token = getAuthToken('vault');
        if (token) {
          axios.put('/api/admin/profile', { profilePhoto: dataUrl }, {
            headers: { Authorization: `Bearer ${token}` }
          }).catch(err => console.error('Failed to sync admin profile photo to DB:', err));

          axios.post('/api/student/log-upload', {
            filename: 'admin_profile_photo.jpg',
            fileType: 'Profile Photo',
            status: 'success',
            message: `Admin (${name}) updated profile photo.`
          }, {
            headers: { Authorization: `Bearer ${token}` }
          }).catch(() => {});
        }
      } catch (e) {}

      toast.success('Profile photo updated successfully!');
    };
    img.src = rawImage;
  };

  const getInitials = (fullName) => {
    return fullName.trim().split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Sidebar components helper
  const sidebarLinks = [
    { label: 'Overview', path: '/admin/dashboard', icon: '📊' },
    { label: 'Exam Generator', path: '/admin/exam-generator', icon: '📝' },
    { label: 'Profile', path: '/admin/profile', icon: '👤' },
  ];

  return (
    <div className="bg-transparent min-h-screen font-sans text-gray-900 w-full flex flex-col text-left">
      {RefreshOverlay}
      
      {/* ── Top Navigation Bar ── */}
      <AdminHeader refreshButton={RefreshButton} />
      
      {/* ── Main Content Area ── */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-6 md:p-8 space-y-6">
        
        {/* Navigation Bar */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold py-2 px-3.5 sm:px-4 rounded-xl text-xs transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <span className="text-sm">←</span> <span>Dashboard</span>
          </button>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Admin Profile</h1>
            <p className="text-xs text-gray-400 mt-1">Manage portal credentials, referral assets, and settings</p>
          </div>
          <div className="flex items-center gap-3 font-bold text-sm bg-white border border-gray-200 rounded-xl px-4 py-2 text-gray-750 shadow-xs self-start md:self-auto">
            <span>Admin ID:</span>
            <span className="text-gray-900 font-extrabold font-mono text-xs">#CBA-2026</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
            
            {/* Left Card: Avatar and Details Card */}
            <div className="md:col-span-1 space-y-6">
              <div className="bg-white/80 backdrop-blur-lg border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-3xl p-6 text-center flex flex-col items-center">
                
                {/* Profile Photo Upload click-wrapper */}
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-28 h-28 rounded-full border-4 border-gray-100 shadow-md mb-5 relative group cursor-pointer overflow-hidden transition-all duration-300 hover:scale-105"
                  title="Change avatar photo"
                >
                  {profilePhoto ? (
                    <img src={profilePhoto} className="w-full h-full object-cover group-hover:brightness-50 transition-all duration-300" alt="Admin Profile" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-gray-900 to-gray-700 flex items-center justify-center font-extrabold text-white text-3xl group-hover:brightness-50 transition-all duration-300">
                      {getInitials(name)}
                    </div>
                  )}
                  {/* Upload overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/40">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/jpeg, image/png, image/webp"
                    className="hidden"
                  />
                </div>

                <h3 className="text-lg font-extrabold text-gray-900">{name}</h3>
                <p className="text-xs text-gray-400 font-semibold mt-0.5">{email}</p>

                <div className="mt-6 pt-6 border-t border-gray-100 w-full text-left space-y-4">
                  <div>
                    <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">Branch Administrator</span>
                    <span className="text-sm font-bold text-gray-800 block mt-0.5">
                      {institute.replace(/^Branch Administrator\s*(-->)?\s*/i, '').trim() || 'Chhatrapati Sambhajinagar'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">Institute Role</span>
                    <span className="text-sm font-bold text-gray-800 block mt-0.5">Lead Mentor / Branch Administrator</span>
                  </div>
                </div>

              </div>

              {/* Referral code card */}
              <div className="bg-white/80 backdrop-blur-lg border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-3xl p-6 text-left space-y-4">
                <div>
                  <h3 className="text-sm font-extrabold text-gray-900 mb-1">Referral Link Asset</h3>
                  <p className="text-xs text-gray-400">Share this referral code with students to associate them with your branch account.</p>
                </div>

                <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl flex items-center justify-between font-mono font-extrabold text-lg text-emerald-600 tracking-wide select-all">
                  <div className="flex flex-col items-start gap-1">
                    <span>{currentKey}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${currentKeyStatus === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {currentKeyStatus}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button 
                      type="button"
                      onClick={handleToggleKeyStatus}
                      className={`px-2 py-1.5 rounded-xl transition-all active:scale-95 cursor-pointer text-[10px] font-bold border ${currentKeyStatus === 'Active' ? 'bg-red-50 text-red-600 border-red-150 hover:bg-red-100/50' : 'bg-green-50 text-green-600 border-green-150 hover:bg-green-100/50'}`}
                      title={currentKeyStatus === 'Active' ? "Deactivate current key" : "Activate current key"}
                    >
                      {currentKeyStatus === 'Active' ? "Deactivate" : "Activate"}
                    </button>
                    <button 
                      type="button"
                      onClick={copyReferralCode}
                      className="p-2 hover:bg-gray-200/50 rounded-xl transition-all active:scale-95 cursor-pointer shrink-0 text-sm border border-gray-200 bg-white"
                      title="Copy referral code"
                    >
                      📋 Copy
                    </button>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleGenerateNewKey}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-2 px-3 rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
                  >
                    🔄 Generate Key
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPastKeys(!showPastKeys)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-extrabold py-2 px-3 rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    {showPastKeys ? "Hide Keys" : "👁️ View Past Keys"}
                  </button>
                </div>

                {showPastKeys && (
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                    <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Past Referral Keys</p>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {pastKeys.map((keyObj, index) => (
                        <div key={index} className="flex items-center justify-between p-2.5 bg-gray-50/50 border border-gray-100 rounded-lg text-xs font-mono font-bold text-gray-600">
                          <div className="flex flex-col gap-0.5">
                            <span>{keyObj.code}</span>
                            <span className={`w-fit px-1.5 py-0.2 rounded-full text-[8px] font-extrabold uppercase tracking-wider ${keyObj.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {keyObj.status}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => togglePastKeyStatus(keyObj.code)}
                            className={`px-2.5 py-1 rounded-md border text-[10px] font-extrabold transition-all cursor-pointer ${
                              keyObj.status === 'Active'
                                ? 'bg-red-50 hover:bg-red-100 border-red-200 text-red-600'
                                : 'bg-green-50 hover:bg-green-100 border-green-200 text-green-600'
                            }`}
                          >
                            {keyObj.status === 'Active' ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Card: Settings form tabs */}
            <div className="md:col-span-2 space-y-6 text-left">
              
              {/* Account details modification */}
              <div className="bg-white/80 backdrop-blur-lg border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-3xl p-6">
                <h3 className="text-base font-extrabold text-gray-900 mb-5 pb-3 border-b border-gray-100 flex items-center gap-2">
                  <span>⚙️</span> Edit Profile Details
                </h3>

                <form onSubmit={handleSaveProfile} className="space-y-4">
                  {/* Inline profile photo trigger */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50 border border-gray-200 rounded-2xl p-4">
                    <div className="space-y-1">
                      <h4 className="text-xs font-extrabold text-gray-700 uppercase tracking-wider">Profile Photo Asset</h4>
                      <p className="text-[11px] text-gray-400 font-semibold leading-relaxed">Customize your public headshot displayed across the mentor platform.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-extrabold py-2 px-4 rounded-xl text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95"
                    >
                      📸 Edit Photo
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-2">Administrator Name</label>
                      <input
                        type="text"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-black focus:bg-white focus:outline-none transition-all text-sm font-semibold"
                        placeholder="Administrator Name"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-2">Work Email Address</label>
                      <input
                        type="email"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-black focus:bg-white focus:outline-none transition-all text-sm font-semibold"
                        placeholder="Work Email"
                        required
                      />
                    </div>
                  </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <PhoneInput
                        label="MOBILE NUMBER"
                        value={formMobile}
                        onChange={(val) => setFormMobile(val)}
                        countryCode={countryCode}
                        onCountryCodeChange={(code) => setCountryCode(code)}
                        placeholder="10-digit mobile number"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-2">Assigned Institute / Branch</label>
                      <input
                        type="text"
                        value={formInstitute}
                        onChange={(e) => setFormInstitute(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-black focus:bg-white focus:outline-none transition-all text-sm font-semibold"
                        placeholder="Institute / Branch Name"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-2">Custom Referral Code</label>
                      <input
                        type="text"
                        value={formReferralCode}
                        onChange={(e) => setFormReferralCode(e.target.value.toUpperCase())}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-black focus:bg-white focus:outline-none transition-all text-sm font-extrabold font-mono tracking-wider text-emerald-600"
                        placeholder="E.g., REF-CB2026"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-3">
                    <button
                      type="submit"
                      disabled={!hasChanges}
                      className={`px-8 py-3.5 rounded-2xl text-sm font-extrabold transition-all shadow-sm ${
                        hasChanges 
                          ? 'bg-black text-white hover:bg-gray-900 cursor-pointer active:scale-95' 
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200/50'
                      }`}
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>

              {/* Password update section */}
              <div className="bg-white/80 backdrop-blur-lg border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-3xl p-6">
                <h3 className="text-base font-extrabold text-gray-900 mb-5 pb-3 border-b border-gray-100 flex items-center gap-2">
                  <span>🔒</span> Update Account Password
                </h3>

                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-2">Current Password</label>
                    <input
                      type="password"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-black focus:bg-white focus:outline-none transition-all text-sm font-semibold"
                      placeholder="••••••••"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-2">New Password</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-black focus:bg-white focus:outline-none transition-all text-sm font-semibold"
                        placeholder="Min. 8 characters"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-2">Confirm New Password</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-black focus:bg-white focus:outline-none transition-all text-sm font-semibold"
                        placeholder="Confirm password"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-3">
                    <button
                      type="submit"
                      className="px-8 py-3.5 bg-black hover:bg-gray-900 text-white font-extrabold rounded-2xl text-sm shadow-sm transition-all active:scale-95 cursor-pointer"
                    >
                      Update Password
                    </button>
                  </div>
                </form>
              </div>

            </div>

          </div>
        </main>

        <footer className="w-full text-center py-6 text-xs text-gray-400 font-semibold tracking-wide border-t border-gray-150 bg-white/40 backdrop-blur-md mt-auto z-20">
          Skill Bridge India
        </footer>

      {/* ── Photo Cropping Modal (Ported from StudentProfile) ── */}
      {showCropModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="absolute inset-0" onClick={() => setShowCropModal(false)} />

          <div className="bg-white w-full max-w-md rounded-[32px] p-6 md:p-8 space-y-6 shadow-2xl border border-gray-100 z-10 relative animate-scale-in text-center">
            
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <div className="text-left">
                <h3 className="text-lg font-bold text-gray-900 tracking-tight">Crop & Adjust Avatar</h3>
                <p className="text-xs text-gray-400 font-semibold">Fine tune your profile picture</p>
              </div>
              <button 
                type="button" 
                onClick={() => setShowCropModal(false)} 
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors text-gray-500 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Circular Preview Area */}
            <div className="relative w-48 h-48 rounded-full border-2 border-gray-200 bg-gray-50 overflow-hidden mx-auto shadow-inner flex items-center justify-center">
              <img
                src={rawImage}
                alt="Avatar Preview"
                style={{
                  transform: `translate(${xOffset}px, ${yOffset}px) scale(${zoom}) rotate(${rotation}deg)`,
                  transformOrigin: 'center',
                  maxWidth: 'none',
                  maxHeight: 'none',
                  ...(imgAspect >= 1 ? { width: 'auto', height: '100%' } : { width: '100%', height: 'auto' })
                }}
                className="transition-transform duration-75 select-none pointer-events-none"
              />
              <div className="absolute inset-0 rounded-full border border-black/10 pointer-events-none" />
            </div>

            {/* Crop Control Sliders */}
            <div className="space-y-4 text-left bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
              <div>
                <div className="flex justify-between text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
                  <span>Zoom</span>
                  <span>{Math.round(zoom * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
                    <span>Move X</span>
                    <span>{xOffset}px</span>
                  </div>
                  <input
                    type="range"
                    min="-150"
                    max="150"
                    step="1"
                    value={xOffset}
                    onChange={(e) => setXOffset(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black focus:outline-none"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
                    <span>Move Y</span>
                    <span>{yOffset}px</span>
                  </div>
                  <input
                    type="range"
                    min="-150"
                    max="150"
                    step="1"
                    value={yOffset}
                    onChange={(e) => setYOffset(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
                  <span>Rotate</span>
                  <span>{rotation}°</span>
                </div>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="1"
                  value={rotation}
                  onChange={(e) => setRotation(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                type="button" 
                onClick={() => setShowCropModal(false)} 
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-extrabold py-3.5 rounded-2xl text-xs transition-colors"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleCropSave} 
                className="flex-1 bg-black hover:bg-gray-900 text-white font-extrabold py-3.5 rounded-2xl text-xs transition-colors shadow-md"
              >
                Save Photo
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default AdminProfile;
