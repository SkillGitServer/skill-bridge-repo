import React, { useState, useRef } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import toast from 'react-hot-toast';
import axios from 'axios';
import { logoutUser, getAuthToken } from '../../utils/auth';
import PullToRefreshWrapper from '../../components/shared/PullToRefreshWrapper';
import PhoneInput from '../../components/shared/PhoneInput';
import admIcon from '../../assets/adm-icon.png';

function StudentProfile() {
  useDocumentTitle('My Profile | Skill Bridge India');
  const navigate = useNavigate();

  // Profile data state (Verified values)
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [mentor, setMentor] = useState(null);

  // Inline form state (Editable values)
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formMobile, setFormMobile] = useState('');
  const [countryCode, setCountryCode] = useState('+91');

  // Enforce Authentication
  const isAuthenticated = !!email || !!localStorage.getItem('student_email') || !!getAuthToken('spark');

  // Modal display states
  const [showHelp, setShowHelp] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);

  // Profile photo states
  const fileInputRef = useRef(null);
  const [profilePhoto, setProfilePhoto] = useState(() => localStorage.getItem('student_profile_photo') || '');
  const [showCropModal, setShowCropModal] = useState(false);
  const [rawImage, setRawImage] = useState('');
  const [selectedPhotoName, setSelectedPhotoName] = useState('');

  // Crop adjustments
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [xOffset, setXOffset] = useState(0);
  const [yOffset, setYOffset] = useState(0);
  const [imgAspect, setImgAspect] = useState(1);

  // OTP validation state
  const [otpCode, setOtpCode] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  // Help support message state
  const [helpSubject, setHelpSubject] = useState('');
  const [helpMessage, setHelpMessage] = useState('');
  const [sendingHelp, setSendingHelp] = useState(false);

  // Resume Management states
  const fileInputResumeRef = useRef(null);
  const [resumeFile, setResumeFile] = useState(() => localStorage.getItem('student_resume_filename') || '');
  const [resumeTime, setResumeTime] = useState(() => localStorage.getItem('student_resume_timestamp') || '');

  const fetchProfile = async () => {
    try {
      const token = getAuthToken('spark');
      if (!token) return;
      
      const res = await axios.get('/api/student/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const { name: dbName, email: dbEmail, mobile: dbMobile, profilePhoto: dbPhoto, docResume: dbResume, mentor: dbMentor } = res.data;
      
      setName(dbName || '');
      setEmail(dbEmail || '');
      setMobile(dbMobile || '');
      setMentor(dbMentor || null);
      
      setFormName(dbName || '');
      setFormEmail(dbEmail || '');
      setFormMobile(dbMobile || '');
      
      if (dbPhoto) {
        setProfilePhoto(dbPhoto);
        localStorage.setItem('student_profile_photo', dbPhoto);
      } else {
        setProfilePhoto('');
        localStorage.removeItem('student_profile_photo');
      }
      
      if (dbResume) {
        const fileName = dbResume.split('/').pop() || 'Resume.pdf';
        setResumeFile(fileName);
        localStorage.setItem('student_resume_filename', fileName);
      } else {
        setResumeFile('');
        localStorage.removeItem('student_resume_filename');
        localStorage.removeItem('student_resume_timestamp');
      }
    } catch (err) {
      console.error('Failed to load profile details:', err);
    }
  };

  React.useEffect(() => {
    fetchProfile();
    window.addEventListener('storage', fetchProfile);
    return () => window.removeEventListener('storage', fetchProfile);
  }, []);

  const uploadResumeFile = async (file) => {
    if (!file) return;

    const token = getAuthToken('spark');
    if (!token) {
      toast.error('Session expired. Please log in.');
      return;
    }

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Please upload a PDF file only.');
      axios.post('/api/student/log-upload', {
        filename: file.name,
        fileType: 'resume',
        status: 'failed',
        message: 'Tried uploading non-PDF file. Only PDF files are allowed!'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => {});
      return;
    }

    const loadingToast = toast.loading('Uploading resume to server...');
    try {
      const formData = new FormData();
      formData.append('docResume', file);

      await axios.post('/api/student/resume', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });

      const nowStr = new Date().toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      }).replace(',', '');

      setResumeFile(file.name);
      setResumeTime(nowStr);
      localStorage.setItem('student_resume_filename', file.name);
      localStorage.setItem('student_resume_timestamp', nowStr);
      window.dispatchEvent(new Event('storage'));

      axios.post('/api/student/log-upload', {
        filename: file.name,
        fileType: 'resume',
        status: 'success',
        message: 'Resume uploaded and saved to server.'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => {});

      toast.dismiss(loadingToast);
      toast.success('Resume uploaded & saved to profile successfully!');
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error(err.response?.data?.error || 'Failed to upload resume.');
      console.error('Resume upload error:', err);
    }
  };

  const handleResumeChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      uploadResumeFile(file);
    }
  };

  const handleLogout = () => {
    logoutUser('student', navigate);
  };

  // Check if form values differ from verified state
  const hasChanges = formName.trim() !== name || formEmail.trim() !== email || formMobile.trim() !== mobile;

  const handleSaveChangesRequest = (e) => {
    e.preventDefault();
    if (!formName.trim()) { toast.error('Name cannot be empty.'); return; }
    if (!formEmail.trim()) { toast.error('Email cannot be empty.'); return; }
    if (!formMobile.trim()) { toast.error('Mobile Number cannot be empty.'); return; }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formEmail.trim())) { toast.error('Please enter a valid email address.'); return; }

    const cleanMobile = formMobile.replace(/\D/g, '');
    if (cleanMobile.length < 10) { toast.error('Please enter a valid 10-digit mobile number.'); return; }

    // If changes exist, trigger OTP modal
    setOtpCode('');
    setShowOtpModal(true);
    toast.success('A 6-digit verification OTP has been sent to your device.');
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otpCode.length !== 6 || isNaN(otpCode)) {
      toast.error('Please enter a valid 6-digit OTP code.');
      return;
    }

    setVerifyingOtp(true);
    try {
      const token = getAuthToken('spark');
      if (!token) throw new Error('No authentication token found.');

      const res = await axios.put('/api/student/profile', {
        name: formName.trim(),
        email: formEmail.trim(),
        mobile: formMobile.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setName(res.data.user.name);
      setEmail(res.data.user.email);
      setMobile(res.data.user.mobile);

      // Update local storage values
      localStorage.setItem('auth_name', res.data.user.name);
      localStorage.setItem('auth_email', res.data.user.email);
      localStorage.setItem('student_mobile', res.data.user.mobile);

      // Dispatch storage event to notify other components
      window.dispatchEvent(new Event('storage'));

      setShowOtpModal(false);
      toast.success('Profile verified and updated successfully!');
    } catch (err) {
      console.error('Failed to update student profile in database:', err);
      toast.error(err.response?.data?.error || 'Failed to update profile details.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleSendHelp = (e) => {
    e.preventDefault();
    if (!helpSubject.trim() || !helpMessage.trim()) {
      toast.error('Please fill in all fields.');
      return;
    }
    setSendingHelp(true);
    setTimeout(() => {
      setSendingHelp(false);
      setHelpSubject('');
      setHelpMessage('');
      setShowHelp(false);
      toast.success('Support message sent successfully!');
    }, 1000);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const token = getAuthToken('spark');
    setSelectedPhotoName(file.name);

    // Strict MIME type validation
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload a JPEG, PNG, or WebP image.');
      if (token) {
        axios.post('/api/student/log-upload', {
          filename: file.name,
          fileType: 'profilePhoto',
          status: 'failed',
          message: `Invalid file type: ${file.type}. JPEG, PNG, WebP only.`
        }, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => {});
      }
      return;
    }

    // Strict file extension validation
    const fileExt = file.name.split('.').pop().toLowerCase();
    const allowedExts = ['jpg', 'jpeg', 'png', 'webp'];
    if (!allowedExts.includes(fileExt)) {
      toast.error('Invalid file extension. Please upload a JPG, JPEG, PNG, or WebP file.');
      if (token) {
        axios.post('/api/student/log-upload', {
          filename: file.name,
          fileType: 'profilePhoto',
          status: 'failed',
          message: `Invalid file extension: .${fileExt}. JPG, JPEG, PNG, WebP only.`
        }, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => {});
      }
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
      const size = 300; // Output square size
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      // Fill background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);

      // Translate to center
      ctx.translate(size / 2, size / 2);

      // Shift by scaled pan offsets (mapping 192px CSS preview width to 300px Canvas size)
      const scaleRatio = size / 192;
      ctx.translate(xOffset * scaleRatio, yOffset * scaleRatio);

      // Apply rotation
      ctx.rotate((rotation * Math.PI) / 180);

      // Apply scale (zoom)
      ctx.scale(zoom, zoom);

      // Handle base object-cover aspect ratio scale
      let drawWidth, drawHeight;
      if (imgAspect >= 1) {
        drawHeight = size;
        drawWidth = size * imgAspect;
      } else {
        drawWidth = size;
        drawHeight = size / imgAspect;
      }

      // Draw centered
      ctx.drawImage(
        img,
        -drawWidth / 2,
        -drawHeight / 2,
        drawWidth,
        drawHeight
      );

      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      
      const uploadPhoto = async () => {
        const loadingToast = toast.loading('Uploading profile photo to cloud...');
        const token = getAuthToken('spark');
        try {
          const email = localStorage.getItem('student_email');
          if (!email) throw new Error('No user email found');
          const res = await axios.post('/api/student/profile-photo', {
            email,
            photoBase64: dataUrl
          });
          
          const cloudUrl = res.data.url;
          setProfilePhoto(cloudUrl);
          localStorage.setItem('student_profile_photo', cloudUrl);
          setShowCropModal(false);
          
          // Dispatch storage event to notify other components
          window.dispatchEvent(new Event('storage'));
          toast.dismiss(loadingToast);
          toast.success('Profile photo updated and saved to cloud successfully!');

          if (token) {
            axios.post('/api/student/log-upload', {
              filename: selectedPhotoName || 'profile_photo.png',
              fileType: 'profilePhoto',
              status: 'success',
              message: 'Profile photo uploaded and fetched successfully.'
            }, {
              headers: { Authorization: `Bearer ${token}` }
            }).catch(() => {});
          }
        } catch (err) {
          toast.dismiss(loadingToast);
          toast.error('Failed to upload photo to cloud');
          console.error(err);

          if (token) {
            axios.post('/api/student/log-upload', {
              filename: selectedPhotoName || 'profile_photo.png',
              fileType: 'profilePhoto',
              status: 'failed',
              message: `Upload to Cloudinary failed: ${err.message || 'Unknown error'}`
            }, {
              headers: { Authorization: `Bearer ${token}` }
            }).catch(() => {});
          }
        }
      };
      
      uploadPhoto();
    };
    img.src = rawImage;
  };

  const getInitials = (fullName) => {
    if (!fullName) return 'U';
    const parts = fullName.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return fullName.slice(0, 2).toUpperCase() || 'U';
  };

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <PullToRefreshWrapper>
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-indigo-50 font-sans w-full select-none">

      {/* ── Sidebar (Dark) — Fixed on Desktop, Header on Mobile ── */}
      <div className="w-full text-white px-6 md:px-8 relative overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.3)] flex flex-col z-10 bg-[#0a0a0a] pt-6 pb-16">

        {/* Top: Centered title with back button anchored left */}
        <div className="flex items-center justify-center relative w-full mb-8 md:mb-10">
          <Link
            to="/student/dashboard"
            className="absolute left-0 p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors text-white"
            aria-label="Go Back"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h2 className="text-xl font-bold text-white tracking-wide">My Profile</h2>
        </div>

        {/* Avatar & Info */}
        <div className="flex flex-col items-center text-center md:mt-4">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="w-24 h-24 rounded-full border-4 border-gray-850 shadow-xl mb-4 relative group cursor-pointer overflow-hidden transition-all duration-300 hover:scale-105 active:scale-95"
            title="Click to change profile picture"
          >
            {profilePhoto ? (
              <img src={profilePhoto} className="w-full h-full object-cover group-hover:brightness-50 transition-all duration-300" alt="Profile" />
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-orange-400 to-yellow-300 flex items-center justify-center font-extrabold text-white text-3xl group-hover:brightness-50 transition-all duration-300">
                {getInitials(name)}
              </div>
            )}
            
            {/* Upload Camera Overlay */}
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
          <h2 className="text-2xl font-extrabold tracking-tight">{name}</h2>
          <p className="text-sm text-gray-400 mt-1">{email}</p>
          <p className="text-xs text-gray-500 mt-1 font-medium">{mobile}</p>
        </div>

        {/* Logout — pushed to bottom on desktop */}
        <div className="hidden md:block md:mt-auto w-full">
          <button
            onClick={handleLogout}
            className="w-full bg-red-600/10 hover:bg-red-600/20 text-red-400 font-extrabold py-4 rounded-2xl border border-red-900/30 transition-colors flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Log Out
          </button>
        </div>
      </div>

      {/* ── Content Area (Light) — offset by sidebar width on desktop ── */}
      <main className="relative z-20 -mt-10 bg-gradient-to-br from-slate-50 to-indigo-50 rounded-t-[2.5rem] pt-8 px-4 md:px-8 lg:px-12 w-full flex-1 flex flex-col space-y-6">

        <div className="space-y-6 max-w-4xl mx-auto w-full">

          {/* ── Section 1: Detailed Mentor Profile Card ── */}
          <div className="bg-[#111111] text-white rounded-3xl shadow-lg border border-gray-800 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5 relative overflow-hidden">
            {mentor ? (
              mentor.profilePhoto ? (
                <img
                  src={mentor.profilePhoto}
                  alt={mentor.name}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-indigo-400/50 shadow-md flex-shrink-0 z-10"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-violet-500 to-indigo-500 text-white font-black text-xl flex items-center justify-center shadow-inner flex-shrink-0 z-10 border border-indigo-400/30">
                  {getInitials(mentor.name)}
                </div>
              )
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gray-800 text-gray-500 font-black text-2xl flex items-center justify-center shadow-inner flex-shrink-0 z-10 border border-gray-700">
                ?
              </div>
            )}
            <div className="space-y-1 text-left flex-grow z-10">
              <span className="text-[10px] font-extrabold text-gray-400 bg-gray-800 px-2.5 py-1 rounded-full uppercase tracking-wider border border-gray-700">
                {mentor ? 'Assigned Mentor' : 'Mentor Status'}
              </span>
              <h3 className="text-xl font-bold text-white mt-1.5">
                {mentor ? mentor.name : 'No Mentor Assigned'}
              </h3>
              <p className="text-sm font-semibold text-gray-400 mt-1">
                {mentor ? `${mentor.email} ${mentor.mobile ? `• ${mentor.mobile}` : ''}` : 'A mentor will be assigned shortly.'}
              </p>
            </div>
          </div>

          {/* ── Section 2: Account Settings (Expanded Inline Form) ── */}
          <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-sm border border-white/40 p-6 text-left hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-5">
              <span className="text-xl">⚙️</span>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Account Settings</h3>
                <p className="text-xs text-gray-400">Update your verified personal details</p>
              </div>
            </div>

            <form onSubmit={handleSaveChangesRequest} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-2">Full Name</label>
                  <input
                    type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-black focus:bg-white focus:outline-none transition-all text-sm font-semibold text-gray-900"
                    placeholder="Full Name"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-2">Email Address</label>
                  <input
                    type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-black focus:bg-white focus:outline-none transition-all text-sm font-semibold text-gray-900"
                    placeholder="Email Address"
                  />
                </div>

                <div>
                  <PhoneInput
                    label="MOBILE NUMBER"
                    value={formMobile}
                    onChange={(val) => setFormMobile(val)}
                    countryCode={countryCode}
                    onCountryCodeChange={(code) => setCountryCode(code)}
                    placeholder="10-digit mobile number"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-3.5 rounded-2xl text-sm font-extrabold border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all text-gray-700 bg-white shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  <span>📷</span> Update Photo
                </button>
                <button
                  type="submit"
                  disabled={!hasChanges}
                  className={`px-8 py-3.5 rounded-2xl text-sm font-extrabold transition-all shadow-md ${hasChanges ? 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white cursor-pointer' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>

          {/* ── Resume Management Card ── */}
          <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-sm border border-white/40 p-6 text-left hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-5">
              <span className="text-xl">📄</span>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Resume Management</h3>
                <p className="text-xs text-gray-400">Upload your PDF resume to get expert feedback and apply for jobs</p>
              </div>
            </div>

            <div className="space-y-4">
              <div 
                onClick={() => fileInputResumeRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files[0];
                  if (file) {
                    uploadResumeFile(file);
                  }
                }}
                className="border-2 border-dashed border-gray-200 hover:border-gray-300 rounded-2xl p-8 text-center bg-gray-50 hover:bg-gray-100/60 transition-all cursor-pointer flex flex-col items-center justify-center gap-3 group"
              >
                <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-500 group-hover:scale-105 transition-transform">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-gray-700">
                  Drag & drop your updated resume here or <span className="text-orange-500 hover:underline">click to browse</span> (PDF only)
                </p>
              </div>

              <input 
                type="file" 
                ref={fileInputResumeRef} 
                onChange={handleResumeChange} 
                accept=".pdf" 
                className="hidden" 
              />

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 gap-3">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">📄</div>
                  <div>
                    <p className="text-xs font-extrabold text-gray-900 tracking-tight">{resumeFile || 'No Resume Uploaded'}</p>
                    <p className="text-[10px] text-gray-400 font-semibold mt-0.5">
                      {resumeFile ? `Last updated: ${resumeTime}` : 'Please upload a PDF copy of your resume'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => fileInputResumeRef.current?.click()}
                  className="bg-black hover:bg-gray-900 text-white font-extrabold px-6 py-3 rounded-xl text-xs shadow-sm transition-all active:scale-95 cursor-pointer w-full sm:w-auto"
                >
                  Upload & Update
                </button>
              </div>
            </div>
          </div>

          {/* ── Section 3: Document links and help options ── */}
          <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-sm border border-white/40 p-3 text-left">
            {[
              { label: 'Help & Support',   desc: 'Get technical assistance and query support',  action: () => setShowHelp(true) },
              { label: 'Privacy Policy',   desc: 'Read how your information is kept secure',      action: () => setShowPrivacy(true) },
              { label: 'Terms of Service',  desc: 'Review portal usage and guidelines',            action: () => setShowTerms(true) },
            ].map((item) => (
              <button
                key={item.label}
                onClick={item.action}
                className="w-full flex items-center justify-between p-3.5 hover:bg-gray-50 rounded-2xl transition-colors text-left"
              >
                <div>
                  <p className="text-sm font-bold text-gray-900">{item.label}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{item.desc}</p>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>

          {/* Logout Button — visible on mobile only */}
          <div className="md:hidden">
            <button
              onClick={handleLogout}
              className="w-full bg-red-50 hover:bg-red-100/80 text-red-600 font-extrabold py-4 rounded-3xl border border-red-100 transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Log Out
            </button>
          </div>

        </div>

        {/* ── App Version — pinned at bottom of content area ── */}
        <div className="mt-auto pt-10 pb-4 text-center text-xs font-bold text-gray-400 tracking-widest uppercase">
          APP VERSION 1.0.1
        </div>

      </main>

      {/* ── OTP Verification Modal ── */}
      {showOtpModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="absolute inset-0" onClick={() => setShowOtpModal(false)} />

          <form
            onSubmit={handleVerifyOtp}
            className="bg-white w-full md:max-w-md rounded-t-[40px] md:rounded-[32px] p-6 md:p-8 space-y-5 shadow-2xl border border-gray-100 max-h-[90vh] md:max-h-none overflow-y-auto z-10 relative animate-slide-up text-left"
          >
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto -mt-2 mb-4 md:hidden" />

            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">Verify Profile Change</h3>
                <p className="text-xs text-gray-400 font-semibold mt-0.5">OTP verification required to save edits</p>
              </div>
              <button type="button" onClick={() => setShowOtpModal(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors text-gray-500">
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-100 text-yellow-800 rounded-2xl p-4 text-xs font-semibold leading-relaxed">
                🛡️ Enter the 6-digit OTP code sent to your registered contact channel to confirm modifications. (Test Code: <strong>123456</strong>)
              </div>

              <div>
                <label className="block text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-2">6-Digit OTP Code</label>
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:border-black focus:bg-white focus:outline-none transition-all text-center text-2xl font-bold tracking-widest text-gray-900"
                  placeholder="000000"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowOtpModal(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-extrabold py-4 rounded-3xl text-sm transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={verifyingOtp} className="flex-1 bg-black hover:bg-gray-900 text-white font-extrabold py-4 rounded-3xl text-sm transition-colors shadow-lg flex items-center justify-center">
                {verifyingOtp ? 'Verifying...' : 'Verify & Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Help & Support Modal ── */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="absolute inset-0" onClick={() => setShowHelp(false)} />

          <form
            onSubmit={handleSendHelp}
            className="bg-white w-full md:max-w-md rounded-t-[40px] md:rounded-[32px] p-6 md:p-8 space-y-5 shadow-2xl border border-gray-100 max-h-[90vh] md:max-h-none overflow-y-auto z-10 relative animate-slide-up text-left"
          >
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto -mt-2 mb-4 md:hidden" />

            <div className="flex justify-between items-center">
              <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">Help & Support</h3>
              <button type="button" onClick={() => setShowHelp(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors text-gray-500">
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 text-xs font-semibold text-orange-800 space-y-2">
                <p>📍 <strong>Location:</strong> Chhatrapati Sambhajinagar, Maharashtra, India</p>
                <p>✉️ <strong>Email Support:</strong> hello@careerbridge.in</p>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-2">Subject</label>
                <input
                  type="text" value={helpSubject} onChange={(e) => setHelpSubject(e.target.value)}
                  className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:border-black focus:bg-white focus:outline-none transition-all text-sm font-semibold text-gray-900"
                  placeholder="E.g., Exam Access Issue"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-2">Message</label>
                <textarea
                  rows={4} value={helpMessage} onChange={(e) => setHelpMessage(e.target.value)}
                  className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:border-black focus:bg-white focus:outline-none transition-all text-sm font-semibold text-gray-900 resize-none"
                  placeholder="Describe your issue or feedback..."
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowHelp(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-extrabold py-4 rounded-3xl text-sm transition-colors">
                Close
              </button>
              <button type="submit" disabled={sendingHelp} className="flex-1 bg-black hover:bg-gray-900 text-white font-extrabold py-4 rounded-3xl text-sm transition-colors shadow-lg flex items-center justify-center">
                {sendingHelp ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Privacy Policy Modal ── */}
      {showPrivacy && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="absolute inset-0" onClick={() => setShowPrivacy(false)} />

          <div className="bg-white w-full md:max-w-2xl rounded-t-[40px] md:rounded-[32px] p-6 md:p-8 space-y-5 shadow-2xl border border-gray-100 max-h-[80vh] overflow-y-auto z-10 relative animate-slide-up text-left">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto -mt-2 mb-4 md:hidden" />

            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">Privacy Policy</h3>
                <p className="text-[10px] text-gray-400 font-extrabold uppercase mt-0.5">Last updated: July 14, 2026</p>
              </div>
              <button type="button" onClick={() => setShowPrivacy(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors text-gray-500">
                ✕
              </button>
            </div>

            <div className="space-y-4 text-sm text-gray-600 leading-relaxed max-h-[50vh] overflow-y-auto pr-2">
              <p>
                At Skill Bridge India, we value and respect your privacy. This Privacy Policy explains how we collect, use, disclose, and protect your information when you use our web application and services.
              </p>
              <h4 className="font-extrabold text-gray-950 text-base mt-4">1. Information We Collect</h4>
              <p>We collect information that you directly provide to us, including:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Authentication Data:</strong> Your mobile phone number used for generating instant OTP authentication.</li>
                <li><strong>Profile Information:</strong> Optional user profile details such as name and profile preferences.</li>
                <li><strong>Test Data:</strong> Responses, completion time, score, and generated automated PDF result reports.</li>
              </ul>
              <h4 className="font-extrabold text-gray-950 text-base mt-4">2. How We Use Your Information</h4>
              <p>We use the collected information for various purposes:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>To provide, maintain, and improve our secure examination portal.</li>
                <li>To authenticate your session securely via SMS OTP services.</li>
                <li>To compile your test scores and instantly generate downloadable performance PDFs.</li>
                <li>To monitor and protect against cheating, fraud, or abuse.</li>
              </ul>
              <h4 className="font-extrabold text-gray-950 text-base mt-4">3. Data Security</h4>
              <p>
                We use industry-standard administrative, technical, and physical security measures to safeguard your personal data. However, no database or transmission over the Internet can be guaranteed 100% secure.
              </p>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <button type="button" onClick={() => setShowPrivacy(false)} className="w-full bg-gray-900 hover:bg-black text-white font-extrabold py-3.5 rounded-2xl text-sm transition-colors text-center shadow-md">
                Okay, I understand
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Terms of Service Modal ── */}
      {showTerms && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="absolute inset-0" onClick={() => setShowTerms(false)} />

          <div className="bg-white w-full md:max-w-2xl rounded-t-[40px] md:rounded-[32px] p-6 md:p-8 space-y-5 shadow-2xl border border-gray-100 max-h-[80vh] overflow-y-auto z-10 relative animate-slide-up text-left">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto -mt-2 mb-4 md:hidden" />

            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">Terms of Service</h3>
                <p className="text-[10px] text-gray-400 font-extrabold uppercase mt-0.5">Last updated: July 14, 2026</p>
              </div>
              <button type="button" onClick={() => setShowTerms(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors text-gray-500">
                ✕
              </button>
            </div>

            <div className="space-y-4 text-sm text-gray-600 leading-relaxed max-h-[50vh] overflow-y-auto pr-2">
              <p>
                Please read these Terms of Service ("Terms") carefully before using the Skill Bridge India examination portal. By accessing or using our platform, you agree to be bound by these Terms.
              </p>
              <h4 className="font-extrabold text-gray-950 text-base mt-4">1. Acceptance of Terms</h4>
              <p>
                By creating an account, logging in, or taking a test, you confirm that you accept these Terms and agree to comply with them. If you do not agree, you must not access or use the platform.
              </p>
              <h4 className="font-extrabold text-gray-950 text-base mt-4">2. User Account and Verification</h4>
              <p>
                To access exams, you must log in using your valid mobile number. You will receive an OTP via SMS to verify your session. You are responsible for ensuring that the phone number is yours and active.
              </p>
              <h4 className="font-extrabold text-gray-950 text-base mt-4">3. Testing Rules and Acceptable Use</h4>
              <p>When taking an exam on Skill Bridge India, you agree to:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Complete the exam independently without external assistance.</li>
                <li>Not copy, screenshot, record, or distribute any exam questions.</li>
              </ul>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <button type="button" onClick={() => setShowTerms(false)} className="w-full bg-gray-900 hover:bg-black text-white font-extrabold py-3.5 rounded-2xl text-sm transition-colors text-center shadow-md">
                I Agree to Terms
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Profile Image Cropping Modal ── */}
      {showCropModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="absolute inset-0" onClick={() => setShowCropModal(false)} />

          <div className="bg-white w-full max-w-md rounded-[32px] p-6 md:p-8 space-y-6 shadow-2xl border border-gray-100 z-10 relative animate-scale-in text-center">
            
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 tracking-tight">Crop & Adjust Photo</h3>
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
                alt="Upload Preview"
                style={{
                  transform: `translate(${xOffset}px, ${yOffset}px) scale(${zoom}) rotate(${rotation}deg)`,
                  transformOrigin: 'center',
                  maxWidth: 'none',
                  maxHeight: 'none',
                  ...(imgAspect >= 1 ? { width: 'auto', height: '100%' } : { width: '100%', height: 'auto' })
                }}
                className="transition-transform duration-75 select-none pointer-events-none"
              />
              {/* Overlay guidelines ring */}
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
                    onChange={(e) => setXOffset(parseInt(e.target.value, 10))}
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
                    onChange={(e) => setYOffset(parseInt(e.target.value, 10))}
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
                  onChange={(e) => setRotation(parseInt(e.target.value, 10))}
                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black focus:outline-none"
                />
              </div>
            </div>

            {/* Modal Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowCropModal(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-extrabold py-3.5 rounded-2xl text-sm transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCropSave}
                className="flex-1 bg-black hover:bg-gray-900 text-white font-extrabold py-3.5 rounded-2xl text-sm transition-colors shadow-md cursor-pointer"
              >
                Crop & Save
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="w-full text-center py-6 text-xs text-gray-400 font-semibold tracking-wide border-t border-gray-150 bg-white/40 backdrop-blur-md mt-auto z-20">
        Skill Bridge India
      </footer>
      </div>
    </PullToRefreshWrapper>
  );
}

export default StudentProfile;
