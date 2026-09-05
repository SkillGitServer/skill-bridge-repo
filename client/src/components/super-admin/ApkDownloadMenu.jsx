import React, { useState, useRef, useEffect } from 'react';
import { Smartphone, Download, Check, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import stuIcon from '/stu-icon.png';
import admIcon from '/adm-icon.png';
import supIcon from '/sup-icon.png';

export function ApkDownloadMenu() {
  const [isApkMenuOpen, setIsApkMenuOpen] = useState(false);
  const [copiedApp, setCopiedApp] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsApkMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const apkFiles = [
    {
      id: 'spark',
      name: 'Spark App (APK)',
      badge: 'Student Portal',
      filename: 'Skill-Bridge-Spark.apk',
      path: '/downloads/Spark.apk',
      icon: stuIcon,
      color: 'from-blue-500 to-indigo-600'
    },
    {
      id: 'vault',
      name: 'Vault App (APK)',
      badge: 'Mentor Portal',
      filename: 'Skill-Bridge-Vault.apk',
      path: '/downloads/Vault.apk',
      icon: admIcon,
      color: 'from-purple-500 to-pink-600'
    },
    {
      id: 'supss',
      name: 'SUPSS App (APK)',
      badge: 'Super Admin',
      filename: 'Skill-Bridge-SUPSS.apk',
      path: '/downloads/Supss.apk',
      icon: supIcon,
      color: 'from-emerald-500 to-teal-600'
    }
  ];

  const handleCopyLink = (e, apk) => {
    e.preventDefault();
    e.stopPropagation();
    const sharableUrl = `${window.location.origin}/download/${apk.id}`;
    navigator.clipboard.writeText(sharableUrl);
    setCopiedApp(apk.filename);
    toast.success(`Copied sharable download page link for ${apk.name}`);
    setTimeout(() => setCopiedApp(null), 2500);
  };

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        onClick={() => setIsApkMenuOpen(!isApkMenuOpen)}
        title="APK Downloads"
        aria-label="APK Downloads"
        className="p-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-600 rounded-xl transition-all cursor-pointer shadow-xs hover:scale-105 active:scale-95 flex items-center justify-center relative"
      >
        <Smartphone className="w-4 h-4 text-emerald-600" />
        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white animate-pulse"></span>
      </button>

      {isApkMenuOpen && (
        <div className="absolute right-0 mt-2.5 w-72 bg-white/95 backdrop-blur-xl border border-gray-100 shadow-[0_10px_38px_rgba(0,0,0,0.12)] rounded-2xl p-3.5 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2.5 px-1 mb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
                📱
              </div>
              <div>
                <h4 className="text-xs font-black tracking-wider uppercase text-gray-900">APK Packages</h4>
                <p className="text-[10px] text-gray-400 font-medium">Direct Android Builds</p>
              </div>
            </div>
            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
              v1.0.4
            </span>
          </div>

          <div className="space-y-2">
            {apkFiles.map((apk) => (
              <div
                key={apk.filename}
                className="group relative flex items-center justify-between p-2.5 rounded-xl border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/50 transition-all duration-200"
              >
                <a
                  href={apk.path}
                  download={apk.filename}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 flex-1 min-w-0 pr-2 cursor-pointer"
                  onClick={() => {
                    toast.success(`Starting download for ${apk.name}`);
                  }}
                >
                  <div className="w-9 h-9 rounded-xl p-1 bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform overflow-hidden shadow-xs">
                    <img src={apk.icon} alt={apk.name} className="w-full h-full object-contain rounded-lg" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold text-gray-900 truncate group-hover:text-emerald-700 transition-colors">
                      {apk.name}
                    </p>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">
                      {apk.badge}
                    </span>
                  </div>
                </a>

                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={apk.path}
                    download={apk.filename}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`Download ${apk.name}`}
                    className="p-1.5 rounded-lg bg-gray-50 hover:bg-emerald-100 text-gray-600 hover:text-emerald-700 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={(e) => handleCopyLink(e, apk)}
                    title="Copy Custom Download Page Link"
                    className="p-1.5 rounded-lg bg-gray-50 hover:bg-emerald-100 text-gray-600 hover:text-emerald-700 transition-colors cursor-pointer"
                  >
                    {copiedApp === apk.filename ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
export default ApkDownloadMenu;
