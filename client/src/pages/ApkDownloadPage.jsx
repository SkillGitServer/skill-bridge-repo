import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { Download, Smartphone, Check, Copy, ArrowLeft, ShieldCheck, Zap, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import logo from '/logo.png';
import stuIcon from '/stu-icon.png';
import admIcon from '/adm-icon.png';
import supIcon from '/sup-icon.png';

const APPS_DATA = {
  spark: {
    id: 'spark',
    name: 'Spark App (APK)',
    subtitle: 'Student & Candidate Portal',
    portal: 'Student Portal',
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
    filename: 'Skill-Bridge-SUPSS.apk',
    path: '/downloads/Supss.apk',
    icon: supIcon,
    badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    description: 'Complete system oversight, mentor approval workflows, database backups, killswitch controls, and live platform analytics for Super Administrators.',
    buttonColor: 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-500/25',
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
                <span className="text-xs font-black text-white">Android 8+</span>
              </div>
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 text-center">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Build Date</span>
                <span className="text-xs font-black text-white">{selectedApp.updated}</span>
              </div>
            </div>

            {/* Primary Action Button */}
            <a
              href={selectedApp.path}
              download={selectedApp.filename}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleDownloadClick(selectedApp)}
              className={`w-full py-4 px-6 rounded-2xl font-black text-sm text-white tracking-wider uppercase flex items-center justify-center gap-3 transition-all duration-200 cursor-pointer shadow-lg active:scale-95 ${selectedApp.buttonColor}`}
            >
              <Download className="w-5 h-5 animate-bounce" />
              <span>{downloadStarted ? 'Downloading Package...' : 'INSTALL / DOWNLOAD APK'}</span>
            </a>

            {/* Copy Sharable Link Action */}
            <button
              onClick={handleCopyPageLink}
              className="mt-3 text-xs text-gray-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer py-1"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Link Copied to Clipboard!' : 'Copy Direct Sharable App Link'}</span>
            </button>

            {/* Easy 4-Step Installation Guide */}
            <div className="mt-8 pt-6 border-t border-slate-800/80 w-full text-left">
              <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-indigo-400" /> Quick Installation Steps
              </h4>
              <ol className="text-xs text-gray-400 space-y-2 font-medium pl-4 list-decimal">
                <li>Tap <strong className="text-white">INSTALL / DOWNLOAD APK</strong> above to get the <code className="text-indigo-300 font-mono">{selectedApp.filename}</code> package.</li>
                <li>Open the downloaded file from your browser downloads or Notification Bar.</li>
                <li>If prompted, enable <strong className="text-white font-bold">"Allow installation from this source"</strong> in Settings.</li>
                <li>Tap <strong className="text-emerald-400">Install</strong> and launch the app!</li>
              </ol>
            </div>
          </div>
        ) : (
          /* Multi-App Catalog View if no specific app specified */
          <div className="w-full space-y-8 animate-in fade-in zoom-in-95 duration-300">
            <div>
              <span className="px-3.5 py-1.5 rounded-full bg-indigo-950/80 border border-indigo-800/60 text-xs font-extrabold text-indigo-400 uppercase tracking-widest inline-block mb-3">
                Official Android Packages
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                Skill Bridge India Mobile Apps
              </h2>
              <p className="text-sm text-gray-400 mt-2 max-w-lg mx-auto">
                Download and install the official Android applications for Students, Mentors, and Super Administrators.
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

                  <div className="w-full space-y-2 mt-auto">
                    <a
                      href={app.path}
                      download={app.filename}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => handleDownloadClick(app)}
                      className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs text-white uppercase flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md ${app.buttonColor}`}
                    >
                      <Download className="w-4 h-4" /> Download APK
                    </a>
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
