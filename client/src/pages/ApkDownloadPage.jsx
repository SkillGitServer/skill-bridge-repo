import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { 
  Download, 
  Smartphone, 
  Check, 
  Copy, 
  ArrowLeft, 
  ShieldCheck, 
  Zap, 
  Info, 
  Apple, 
  Share2, 
  PlusSquare, 
  Monitor, 
  ExternalLink, 
  X 
} from 'lucide-react';
import toast from 'react-hot-toast';
import logo from '/logo.png';
import stuIcon from '/stu-icon.png';
import admIcon from '/adm-icon.png';
import supIcon from '/sup-icon.png';

// Standard Android robot icon
function AndroidIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993.0001.5511-.4483.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993 0 .5511-.4483.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.4116 13.8533 8.125 12 8.125c-1.8533 0-3.5902.2866-5.1368.8247L4.8409 5.4467a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.7844h24c-.3432-4.1255-2.6889-7.5977-6.1185-9.463"/>
    </svg>
  );
}

// Standard Windows 4-pane grid icon
function WindowsIcon({ className = "w-3.5 h-3.5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4h-13.051M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-13.051-1.802"/>
    </svg>
  );
}

const APPS_DATA = {
  spark: {
    id: 'spark',
    name: 'Spark App (APK)',
    subtitle: 'Student & Candidate Portal',
    portal: 'Student Portal',
    portalUrl: '/login',
    manifest: '/manifest-student.json',
    filename: 'Skill-Bridge-Spark.apk',
    path: '/downloads/Spark.apk',
    icon: stuIcon,
    badgeColor: 'bg-blue-100 text-blue-700 border-blue-200',
    buttonColor: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/25',
    description: 'Access practice exams, track assessment results, view leaderboards, apply for corporate jobs, and review AI resume analysis directly from your Android device.',
    version: 'v1.0.4',
    size: '18.4 MB',
    updated: 'August 2026'
  },
  vault: {
    id: 'vault',
    name: 'Vault App (APK)',
    subtitle: 'Mentor & Administrator Portal',
    portal: 'Mentor Portal',
    portalUrl: '/admin/auth?access=admin_launch_2026&pwa=admin',
    manifest: '/manifest-admin.json',
    filename: 'Skill-Bridge-Vault.apk',
    path: '/downloads/Vault.apk',
    icon: admIcon,
    badgeColor: 'bg-purple-100 text-purple-700 border-purple-200',
    buttonColor: 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-purple-500/25',
    description: 'Manage candidate batches, generate custom AI exams, review student resume submissions, post job openings, and track live student performance analytics.',
    version: 'v1.0.4',
    size: '21.2 MB',
    updated: 'August 2026'
  },
  supss: {
    id: 'supss',
    name: 'SUPSS App (APK)',
    subtitle: 'Super Admin Operations Center',
    portal: 'Super Admin Portal',
    portalUrl: '/sudo-control-panel',
    manifest: '/manifest-superadmin.json',
    filename: 'Skill-Bridge-SUPSS.apk',
    path: '/downloads/Supss.apk',
    icon: supIcon,
    badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    buttonColor: 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-500/25',
    description: 'Complete system oversight, mentor approval workflows, database backups, killswitch controls, and live platform analytics for Super Administrators.',
    version: 'v1.0.4',
    size: '24.8 MB',
    updated: 'August 2026'
  }
};

export default function ApkDownloadPage() {
  const { appId } = useParams();
  const [searchParams] = useSearchParams();
  const queryApp = searchParams.get('app');

  const targetAppId = (appId || queryApp || '').toLowerCase().trim();
  const selectedApp = APPS_DATA[targetAppId] || null;

  const [copied, setCopied] = useState(false);
  const [downloadStarted, setDownloadStarted] = useState(false);

  // Modal state for PWA guidance (Windows / Apple)
  const [activeModal, setActiveModal] = useState(null); // { type: 'windows' | 'apple', app: object }

  // Captured browser PWA beforeinstallprompt event
  const [deferredPrompt, setDeferredPrompt] = useState(() => {
    return typeof window !== 'undefined' ? window.deferredPrompt || null : null;
  });

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (typeof window !== 'undefined') {
        window.deferredPrompt = e;
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    const titleName = selectedApp ? selectedApp.name : 'Download APK Packages';
    document.title = `${titleName} | Skill Bridge India`;
  }, [selectedApp]);

  const handleCopyPageLink = () => {
    const currentUrl = window.location.href;
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    toast.success('Sharable link copied to clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadClick = (app) => {
    setDownloadStarted(true);
    toast.success(`Starting download for ${app.name}...`);
    setTimeout(() => setDownloadStarted(false), 4000);
  };

  // Windows PWA Install Trigger
  const handleWindowsInstall = async (app) => {
    // Dynamically point manifest to target app
    const manifestLink = document.querySelector('link[rel="manifest"]');
    if (manifestLink && app.manifest) {
      manifestLink.href = app.manifest;
    }

    const promptObj = deferredPrompt || (typeof window !== 'undefined' ? window.deferredPrompt : null);

    if (promptObj) {
      try {
        await promptObj.prompt();
        const choice = await promptObj.userChoice;
        if (choice && choice.outcome === 'accepted') {
          toast.success(`${app.name} is installing on your Windows device!`);
          setDeferredPrompt(null);
          if (typeof window !== 'undefined') window.deferredPrompt = null;
          return;
        }
      } catch (err) {
        console.warn('Install prompt error:', err);
      }
    }

    // If deferredPrompt is unavailable (already installed or unsupported), show guided Windows modal
    setActiveModal({ type: 'windows', app });
  };

  // Apple iOS / macOS Install Trigger
  const handleAppleInstall = async (app) => {
    const isIOS = typeof navigator !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
    const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

    const promptObj = deferredPrompt || (typeof window !== 'undefined' ? window.deferredPrompt : null);

    // If on macOS desktop with Chrome/Edge supporting programmatic install
    if (isMac && !isIOS && promptObj) {
      try {
        const manifestLink = document.querySelector('link[rel="manifest"]');
        if (manifestLink && app.manifest) {
          manifestLink.href = app.manifest;
        }
        await promptObj.prompt();
        const choice = await promptObj.userChoice;
        if (choice && choice.outcome === 'accepted') {
          toast.success(`${app.name} is installing on macOS!`);
          setDeferredPrompt(null);
          if (typeof window !== 'undefined') window.deferredPrompt = null;
          return;
        }
      } catch (err) {
        console.warn('Install prompt error:', err);
      }
    }

    // On iOS Safari / iPadOS or Safari Mac, open clean Apple guide modal
    setActiveModal({ type: 'apple', app });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-gray-100 flex flex-col justify-between font-sans relative overflow-hidden select-none">
      {/* Dynamic Background Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-indigo-900/20 via-purple-900/10 to-transparent blur-3xl pointer-events-none"></div>

      {/* Header */}
      <header className="w-full max-w-6xl mx-auto px-4 py-6 flex items-center justify-between z-10">
        <Link to="/" className="flex items-center gap-3 group">
          <img src={logo} alt="Skill Bridge India Logo" className="h-9 w-auto object-contain group-hover:scale-105 transition-transform" />
          <div>
            <h1 className="text-sm font-black tracking-wider uppercase text-white">Skill Bridge India</h1>
            <p className="text-[10px] text-gray-400 font-medium">Official Android App Distribution</p>
          </div>
        </Link>
        <button
          onClick={handleCopyPageLink}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-xs font-bold text-gray-200 transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
          <span>{copied ? 'Link Copied' : 'Share Link'}</span>
        </button>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-4xl mx-auto px-4 py-8 flex-1 flex flex-col justify-center items-center text-center z-10">
        {selectedApp ? (
          /* Single Dedicated App Download View */
          <div className="w-full max-w-xl bg-slate-900/90 backdrop-blur-2xl border border-slate-800/80 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-3xl p-6 sm:p-10 flex flex-col items-center relative animate-in fade-in zoom-in-95 duration-300">
            {/* Top Security & Version Badges */}
            <div className="flex items-center gap-2 mb-6">
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${selectedApp.badgeColor}`}>
                {selectedApp.portal}
              </span>
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-800 border border-slate-700 text-gray-300">
                {selectedApp.version}
              </span>
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Verified APK
              </span>
            </div>

            {/* App Icon */}
            <div className="relative mb-6 group">
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl p-2.5 bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700/80 shadow-2xl flex items-center justify-center relative overflow-hidden group-hover:scale-105 transition-transform duration-300">
                <img
                  src={selectedApp.icon}
                  alt={selectedApp.name}
                  className="w-full h-full object-contain drop-shadow-md rounded-2xl"
                />
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-emerald-500 border-4 border-slate-900 flex items-center justify-center text-slate-950 shadow-md">
                <Zap className="w-4 h-4 fill-current" />
              </div>
            </div>

            {/* App Title & Subtitle */}
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-1">
              {selectedApp.name}
            </h2>
            <p className="text-xs sm:text-sm font-semibold text-gray-400 mb-4">
              {selectedApp.subtitle}
            </p>

            {/* App Description */}
            <p className="text-xs text-gray-300 leading-relaxed max-w-md mb-6 bg-slate-950/40 border border-slate-800/60 rounded-2xl p-4 text-left">
              {selectedApp.description}
            </p>

            {/* File Info Meta Pills */}
            <div className="grid grid-cols-3 gap-3 w-full mb-8">
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 text-center">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">File Size</span>
                <span className="text-xs font-black text-white">{selectedApp.size}</span>
              </div>
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 text-center">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Platform</span>
                <span className="text-xs font-black text-white">Multi-OS</span>
              </div>
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 text-center">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Build Date</span>
                <span className="text-xs font-black text-white">{selectedApp.updated}</span>
              </div>
            </div>

            {/* Multi-Platform Action Buttons */}
            <div className="w-full space-y-2.5 mb-6">
              {/* Primary Android Button */}
              <a
                href={selectedApp.path}
                download={selectedApp.filename}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleDownloadClick(selectedApp)}
                className={`w-full py-3.5 px-6 rounded-2xl font-black text-sm text-white tracking-wider uppercase flex items-center justify-center gap-2.5 transition-all duration-200 cursor-pointer shadow-lg active:scale-95 ${selectedApp.buttonColor}`}
              >
                <AndroidIcon className="w-5 h-5 fill-current" />
                <span>{downloadStarted ? 'Downloading Package...' : 'Android (APK)'}</span>
              </a>

              {/* Windows & Apple Secondary PWA Row */}
              <div className="grid grid-cols-2 gap-2.5 w-full">
                <button
                  type="button"
                  onClick={() => handleWindowsInstall(selectedApp)}
                  className="w-full py-2.5 px-3 rounded-xl font-bold text-xs bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700/80 hover:border-slate-500 text-slate-200 hover:text-white flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  <WindowsIcon className="w-4 h-4 fill-current text-sky-400" />
                  <span>Windows</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAppleInstall(selectedApp)}
                  className="w-full py-2.5 px-3 rounded-xl font-bold text-xs bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700/80 hover:border-slate-500 text-slate-200 hover:text-white flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  <Apple className="w-4 h-4 text-slate-300" />
                  <span>iOS / Mac</span>
                </button>
              </div>
            </div>

            {/* Back to All Apps Catalog */}
            <Link
              to="/download/app"
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 transition-colors font-bold py-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to All Applications
            </Link>

            {/* Easy 4-Step Installation Guide */}
            <div className="mt-8 pt-6 border-t border-slate-800/80 w-full text-left">
              <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-indigo-400" /> Quick Installation Steps
              </h4>
              <ol className="text-xs text-gray-400 space-y-2 font-medium pl-4 list-decimal">
                <li><strong className="text-white">Android:</strong> Tap <strong className="text-indigo-300">Android (APK)</strong> above to download the <code className="text-indigo-300 font-mono">{selectedApp.filename}</code> package, then tap install.</li>
                <li><strong className="text-white">Windows:</strong> Tap <strong className="text-sky-300">Windows</strong> to install instantly as a desktop Progressive Web App via Chrome or Edge.</li>
                <li><strong className="text-white">iOS / Mac:</strong> Tap <strong className="text-slate-200">iOS / Mac</strong> and select <strong className="text-white">"Add to Home Screen"</strong> in Safari.</li>
              </ol>
            </div>
          </div>
        ) : (
          /* Multi-App Catalog View if no specific app specified */
          <div className="w-full space-y-8 animate-in fade-in zoom-in-95 duration-300">
            <div>
              <span className="px-3.5 py-1.5 rounded-full bg-indigo-950/80 border border-indigo-800/60 text-xs font-extrabold text-indigo-400 uppercase tracking-widest inline-block mb-3">
                Official Multi-Platform Packages
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                Skill Bridge India Mobile & Desktop Apps
              </h2>
              <p className="text-sm text-gray-400 mt-2 max-w-lg mx-auto">
                Download and install the official applications for Students, Mentors, and Super Administrators across Android, Windows, and Apple devices.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Object.values(APPS_DATA).map((app) => (
                <div
                  key={app.id}
                  className="bg-slate-900/90 border border-slate-800/80 shadow-xl rounded-3xl p-6 flex flex-col justify-between items-center text-center hover:border-slate-700 transition-all hover:scale-[1.02] group"
                >
                  <div className="w-20 h-20 rounded-2xl p-2 bg-slate-800 border border-slate-700 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                    <img src={app.icon} alt={app.name} className="w-full h-full object-contain rounded-xl" />
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border mb-2 ${app.badgeColor}`}>
                    {app.portal}
                  </span>

                  <h3 className="text-lg font-black text-white mb-1">{app.name}</h3>
                  <p className="text-xs text-gray-400 mb-6 leading-relaxed line-clamp-2">{app.subtitle}</p>

                  {/* Multi-Platform Installation Cluster */}
                  <div className="w-full space-y-2 mt-auto">
                    {/* Button 1: Android (APK) with Accent Colors & Download Logic */}
                    <a
                      href={app.path}
                      download={app.filename}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => handleDownloadClick(app)}
                      className={`w-full py-2.5 px-4 rounded-xl font-extrabold text-xs text-white uppercase flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md active:scale-95 ${app.buttonColor}`}
                      title={`Download ${app.name} APK for Android`}
                    >
                      <AndroidIcon className="w-4 h-4 fill-current shrink-0" />
                      <span>Android (APK)</span>
                    </a>

                    {/* Secondary 2-Column Grid: Windows & Apple Buttons */}
                    <div className="grid grid-cols-2 gap-2 w-full">
                      {/* Button 2: Windows */}
                      <button
                        type="button"
                        onClick={() => handleWindowsInstall(app)}
                        className="w-full py-2 px-2.5 rounded-xl font-bold text-xs bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700/80 hover:border-slate-500 text-slate-200 hover:text-white flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95"
                        title={`Install ${app.name} on Windows (PWA)`}
                      >
                        <WindowsIcon className="w-3.5 h-3.5 fill-current shrink-0 text-sky-400" />
                        <span>Windows</span>
                      </button>

                      {/* Button 3: Apple (iOS / Mac) */}
                      <button
                        type="button"
                        onClick={() => handleAppleInstall(app)}
                        className="w-full py-2 px-2.5 rounded-xl font-bold text-xs bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700/80 hover:border-slate-500 text-slate-200 hover:text-white flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95"
                        title={`Install ${app.name} on iOS / Mac`}
                      >
                        <Apple className="w-3.5 h-3.5 shrink-0 text-slate-300" />
                        <span>iOS / Mac</span>
                      </button>
                    </div>

                    {/* Preserved View Custom Page Button */}
                    <Link
                      to={`/download/${app.id}`}
                      className="w-full py-2 px-4 rounded-xl font-bold text-xs bg-slate-800/80 hover:bg-slate-800 text-gray-300 hover:text-white flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Smartphone className="w-3.5 h-3.5" /> View Custom Page
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ── Guided PWA Installation Modal (Windows & Apple) ── */}
      {activeModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl relative text-left">
            {/* Modal Close Button */}
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3.5 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 p-1.5 flex items-center justify-center shrink-0">
                <img src={activeModal.app.icon} alt={activeModal.app.name} className="w-full h-full object-contain rounded-xl" />
              </div>
              <div>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${activeModal.app.badgeColor}`}>
                  {activeModal.app.portal}
                </span>
                <h3 className="text-base font-extrabold text-white mt-1">
                  Install {activeModal.app.name.replace(' (APK)', '')}
                </h3>
              </div>
            </div>

            {/* Modal Body: Tailored Instructions */}
            {activeModal.type === 'apple' ? (
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300">
                  <p className="font-semibold text-white mb-1 flex items-center gap-1.5">
                    <Apple className="w-4 h-4 text-slate-200" /> Apple iOS & Safari Installation
                  </p>
                  <p className="text-slate-400">
                    Apple restricts programmatic installation prompts. Follow these 3 easy steps to add this app to your Home Screen:
                  </p>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/40 border border-slate-700/60">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-400/30 flex items-center justify-center shrink-0 mt-0.5">
                      <Share2 className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">1. Tap the Share Icon</p>
                      <p className="text-[11px] text-slate-400">Tap the Share icon at the bottom of Safari (or top on iPad).</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/40 border border-slate-700/60">
                    <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-400/30 flex items-center justify-center shrink-0 mt-0.5">
                      <PlusSquare className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">2. Select "Add to Home Screen"</p>
                      <p className="text-[11px] text-slate-400">Scroll down in the share sheet and tap <strong>Add to Home Screen</strong>.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/40 border border-slate-700/60">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">3. Tap "Add" to Launch</p>
                      <p className="text-[11px] text-slate-400">Tap Add in the top-right corner. The app will launch in standalone mode!</p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <a
                    href={activeModal.app.portalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
                  >
                    <span>Open {activeModal.app.portal}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
                  >
                    Got It
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300">
                  <p className="font-semibold text-white mb-1 flex items-center gap-1.5">
                    <WindowsIcon className="w-4 h-4 text-sky-400 fill-current" /> Windows Desktop Installation
                  </p>
                  <p className="text-slate-400">
                    Install {activeModal.app.name.replace(' (APK)', '')} as a native desktop application in Google Chrome or Microsoft Edge:
                  </p>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/40 border border-slate-700/60">
                    <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-400/30 flex items-center justify-center shrink-0 mt-0.5">
                      <Monitor className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">1. Open in Chrome or Edge</p>
                      <p className="text-[11px] text-slate-400">Launch Microsoft Edge or Google Chrome on your Windows PC.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/40 border border-slate-700/60">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-400/30 flex items-center justify-center shrink-0 mt-0.5">
                      <Download className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">2. Click the App Install Icon (⊕)</p>
                      <p className="text-[11px] text-slate-400">Look at the right side of the browser URL address bar and click <strong>Install App</strong>.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/40 border border-slate-700/60">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">3. Or via Browser Menu (...)</p>
                      <p className="text-[11px] text-slate-400">Click <strong>Menu (...) &rarr; Apps &rarr; Install this site as an app</strong>.</p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <a
                    href={activeModal.app.portalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
                  >
                    <span>Launch {activeModal.app.portal}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
                  >
                    Got It
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto px-4 py-6 border-t border-slate-800/60 text-center text-xs text-gray-500 z-10 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p>© 2026 Skill Bridge India. All rights reserved.</p>
        <div className="flex items-center gap-4 text-[11px] font-bold text-gray-400">
          <Link to="/" className="hover:text-white transition-colors">Home Portal</Link>
          <span>•</span>
          <Link to="/about" className="hover:text-white transition-colors">About Us</Link>
          <span>•</span>
          <Link to="/contact" className="hover:text-white transition-colors">Support</Link>
        </div>
      </footer>
    </div>
  );
}
