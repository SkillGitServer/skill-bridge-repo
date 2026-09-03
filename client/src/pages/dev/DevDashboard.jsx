import React from 'react';
import axios from 'axios';
import { ShieldAlert, ShieldCheck, LayoutTemplate, Key } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useSiteLock } from '../../context/SiteLockContext';

function DevDashboard() {
  useDocumentTitle("Dev Dashboard | System Control");
  const [userStats, setUserStats] = React.useState({ students: 0, admins: 0, superAdmins: 0 });

  const { 
    isSiteBlocked, 
    toggleSiteLock, 
    isDevToolsBlocked, 
    toggleDevToolsBlocker,
    isKeyboardLockActive,
    toggleKeyboardLock
  } = useSiteLock();
  
  React.useEffect(() => {
    const devPrefix = import.meta.env.VITE_DEV_ROUTE_PREFIX || 'secure-dev-portal-x97';
    window.history.replaceState(null, '', `/${devPrefix}/dashboard`);

    // Fetch actual live database state on mount
    axios.get('/api/system/settings').then(res => {
      if (res.data) {
        if (typeof res.data.isSiteLocked === 'boolean') {
          toggleSiteLock(res.data.isSiteLocked);
        }
        if (typeof res.data.isDevToolsBlocked === 'boolean') {
          toggleDevToolsBlocker(res.data.isDevToolsBlocked);
        }
        if (typeof res.data.isKeyboardLockActive === 'boolean') {
          toggleKeyboardLock(res.data.isKeyboardLockActive);
        }
      }
    }).catch(err => {
      console.warn('Failed to fetch live settings in DevDashboard:', err);
    });

    // Fetch live platform user count statistics
    try {
      axios.get('/api/system/user-stats').then(res => {
        if (res.data && res.data.data) {
          setUserStats({
            students: res.data.data.students || 0,
            upgradedStudents: res.data.data.upgradedStudents || 0,
            allStudents: res.data.data.allStudents || 0,
            admins: res.data.data.admins || 0,
            superAdmins: res.data.data.superAdmins || 0
          });
        }
      }).catch(err => {
        console.warn('Failed to fetch user stats in DevDashboard:', err);
      });
    } catch (e) {}
  }, []);

  return (
    <div className={`min-h-screen w-full relative flex flex-col items-center justify-center p-6 transition-colors duration-500 ${isSiteBlocked ? 'bg-red-50' : 'bg-gray-50'}`}>
      
      {/* Dynamic Background Elements */}
      <div className={`absolute top-0 left-0 w-full h-96 transition-all duration-700 ${isSiteBlocked ? 'bg-red-900/10' : 'bg-blue-900/5'} rounded-b-[100%] blur-3xl pointer-events-none`}></div>
      
      {/* Dev Dashboard Card */}
      <div className={`relative z-10 w-full max-w-xl bg-white/80 backdrop-blur-lg border ${isSiteBlocked ? 'border-red-500 shadow-[0_0_40px_rgba(239,68,68,0.3)]' : 'border-white/50 shadow-2xl'} rounded-2xl p-8 transition-all duration-300 space-y-6`}>
        
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
              Dev Control Panel
            </h1>
            <p className="text-sm font-bold uppercase tracking-wider text-gray-500 mt-1">
              Tier 4 • Root Access & Security Locks
            </p>
          </div>
        </div>

        {/* ── Live Platform User Statistics Card ── */}
        <div className="bg-gradient-to-br from-slate-900 via-gray-900 to-slate-950 text-white rounded-2xl p-6 shadow-xl border border-gray-800 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-800/80 pb-3">
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-orange-400">
                Live Platform User Statistics
              </h2>
              <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                Real-time MongoDB account distribution across portals
              </p>
            </div>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 backdrop-blur-sm hover:border-blue-500/40 transition-colors">
              <span className="text-xl mb-1 block">🎓</span>
              <p className="text-2xl font-black text-white">{userStats.students}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400 mt-1">
                {userStats.upgradedStudents > 0 ? 'Upgraded Students' : 'Total Students'}
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-3 backdrop-blur-sm hover:border-purple-500/40 transition-colors">
              <span className="text-xl mb-1 block">🛡️</span>
              <p className="text-2xl font-black text-white">{userStats.admins}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-purple-400 mt-1">Admins</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-3 backdrop-blur-sm hover:border-amber-500/40 transition-colors">
              <span className="text-xl mb-1 block">👑</span>
              <p className="text-2xl font-black text-white">{userStats.superAdmins}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mt-1">Super Admins</p>
            </div>
          </div>
        </div>

        {/* System Status Card */}
        <div className={`rounded-xl p-5 border transition-colors ${isSiteBlocked ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-full ${isSiteBlocked ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
              {isSiteBlocked ? <ShieldAlert className="w-7 h-7" /> : <ShieldCheck className="w-7 h-7" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Site Maintenance Status</h2>
              <p className={`text-xs font-bold ${isSiteBlocked ? 'text-red-600' : 'text-green-600'}`}>
                {isSiteBlocked ? 'LOCKED DOWN (Maintenance Mode Active)' : 'ACTIVE (Fully Operational)'}
              </p>
            </div>
          </div>
        </div>

        {/* ── Control 1: Site Lockdown Switch ── */}
        <div className="space-y-3 pt-2 border-t border-gray-200/60">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-extrabold text-gray-900">Site Lockdown Killswitch</h3>
              <p className="text-xs text-gray-500">Block or unblock incoming traffic to student and admin portals.</p>
            </div>
            <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${isSiteBlocked ? 'bg-red-100 text-red-700 border-red-300' : 'bg-green-100 text-green-700 border-green-300'}`}>
              {isSiteBlocked ? 'Locked' : 'Unlocked'}
            </span>
          </div>
          
          <button
            onClick={() => toggleSiteLock(!isSiteBlocked)}
            className={`w-full py-3.5 rounded-xl font-black text-sm tracking-wider uppercase transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg cursor-pointer ${
              isSiteBlocked 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
          >
            {isSiteBlocked ? 'Disable Site Lockdown' : 'Enable Site Lockdown'}
          </button>
        </div>

        {/* ── Control 2: DevTools & Anti-Inspect Security Lock ── */}
        <div className="space-y-3 pt-4 border-t border-gray-200/60">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-extrabold text-gray-900">DevTools & Anti-Inspect Lock</h3>
              <p className="text-xs text-gray-500">Disable browser developer tools, right-click, and F12/Ctrl+Shift+I inspect shortcuts.</p>
            </div>
            <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${isDevToolsBlocked ? 'bg-purple-100 text-purple-700 border-purple-300' : 'bg-gray-100 text-gray-600 border-gray-300'}`}>
              {isDevToolsBlocked ? 'DevTools Blocked' : 'Dev Mode Allowed'}
            </span>
          </div>

          <button
            onClick={() => toggleDevToolsBlocker(!isDevToolsBlocked)}
            className={`w-full py-3.5 rounded-xl font-black text-sm tracking-wider uppercase transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg cursor-pointer ${
              isDevToolsBlocked 
                ? 'bg-gray-800 hover:bg-black text-white' 
                : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white'
            }`}
          >
            {isDevToolsBlocked ? 'Turn OFF DevTools Blocker (Allow Dev Mode)' : 'Turn ON DevTools Blocker (Block Inspect & F12)'}
          </button>
        </div>

        {/* ── Control: Advanced Keyboard Shortcut Blocker ── */}
        <div className="space-y-3 pt-4 border-t border-gray-200/60">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-extrabold text-gray-900">Advanced Keyboard Shortcut Blocker</h3>
              <p className="text-xs text-gray-500">Disable dangerous shortcuts like Ctrl+S, Ctrl+P, Ctrl+R, and F12 across the application (Allows Ctrl+Shift+R).</p>
            </div>
            <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${isKeyboardLockActive ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-gray-100 text-gray-600 border-gray-300'}`}>
              {isKeyboardLockActive ? 'Keyboard Locked' : 'Shortcuts Allowed'}
            </span>
          </div>

          <button
            onClick={() => toggleKeyboardLock(!isKeyboardLockActive)}
            className={`w-full py-3.5 rounded-xl font-black text-sm tracking-wider uppercase transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg cursor-pointer ${
              isKeyboardLockActive 
                ? 'bg-amber-700 hover:bg-amber-800 text-white' 
                : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white'
            }`}
          >
            {isKeyboardLockActive ? 'Turn OFF Keyboard Shortcut Blocker' : 'Turn ON Keyboard Shortcut Blocker'}
          </button>
        </div>

        {/* ── Control 3: Quick Access to Landing Page Editor ── */}
        <div className="space-y-3 pt-4 border-t border-gray-200/60">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-extrabold text-gray-900">WYSIWYG Landing Page Editor</h3>
              <p className="text-xs text-gray-500">Live visual editor to edit hero text, marketing copy, and page sections.</p>
            </div>
            <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 border border-blue-300">
              Live Editor
            </span>
          </div>

          <Link
            to="/super-admin/landing-editor"
            className="w-full py-3.5 rounded-xl font-black text-sm tracking-wider uppercase transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg cursor-pointer bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
          >
            <LayoutTemplate className="w-4 h-4" />
            Launch Landing Page Visual Editor
          </Link>
        </div>

        {/* ── Control 4: Quick Access to System Passkeys ── */}
        <div className="space-y-3 pt-4 border-t border-gray-200/60">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-extrabold text-gray-900">System Registration Passkeys</h3>
              <p className="text-xs text-gray-500">Manage active passkeys and registration audit logs for Super Admins.</p>
            </div>
            <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
              Audit Logs
            </span>
          </div>

          <Link
            to="/super-admin/passkeys"
            className="w-full py-3.5 rounded-xl font-black text-sm tracking-wider uppercase transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg cursor-pointer bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
          >
            <Key className="w-4 h-4" />
            Manage System Passkeys & Audit Logs
          </Link>
        </div>

      </div>
    </div>
  );
}

export default DevDashboard;
