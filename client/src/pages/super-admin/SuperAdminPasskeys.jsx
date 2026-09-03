import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import toast from 'react-hot-toast';
import axios from 'axios';
import supIcon from '../../assets/sup-icon.png';
import { useSupsRefresh } from '../../components/super-admin/SuperAdminRefresh';
import { 
  Key, 
  Copy, 
  ArrowLeft, 
  CheckCircle2, 
  UserCheck, 
  ShieldAlert, 
  Clock 
} from 'lucide-react';

function SuperAdminPasskeys() {
  useDocumentTitle('System Passkeys & Registration Audit | Skill Bridge India');
  const navigate = useNavigate();

  const [activeKey, setActiveKey] = useState('');
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({ totalGenerated: 0, totalUsed: 0, totalActive: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const fetchPasskeys = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get('/api/super-admin/passkeys');
      if (res.data) {
        setActiveKey(res.data.activeKey || '');
        setHistory(res.data.history || []);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      }
    } catch (err) {
      console.error('Fetch passkeys error:', err);
      toast.error('Failed to load system passkey records.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPasskeys();
  }, []);

  const handleCopyKey = (targetKey) => {
    const keyToCopy = (typeof targetKey === 'string' && targetKey) ? targetKey : activeKey;
    if (!keyToCopy) return;
    navigator.clipboard.writeText(keyToCopy);
    setCopied(true);
    toast.success('System Passkey copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const { RefreshButton, RefreshOverlay } = useSupsRefresh(fetchPasskeys);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-indigo-100 via-purple-50 to-fuchsia-100 font-sans text-gray-900 flex flex-col pb-12">
      {RefreshOverlay}
      
      {/* ── Top Header Navigation ── */}
      <header className="w-full bg-white/70 backdrop-blur-xl border-white/50 border-b px-4 md:px-6 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/super-admin/dashboard')}
            className="flex items-center justify-center p-2.5 bg-white hover:bg-gray-100 text-gray-700 rounded-xl transition-all cursor-pointer border border-gray-200 shadow-xs active:scale-95"
            title="Back to Super Admin Dashboard"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/super-admin/dashboard')}>
            <img src={supIcon} alt="Super Admin Tier Icon" className="h-8 w-8 object-contain" />
            <span className="text-lg font-black tracking-widest uppercase text-gray-900">
              Skill Sups
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {RefreshButton}
        </div>
      </header>

      {/* ── Main Content Container ── */}
      <main className="max-w-6xl mx-auto px-4 md:px-8 pt-8 space-y-8 w-full">
        
        {/* Title Banner */}
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 flex items-center gap-3">
            <Key className="w-8 h-8 text-purple-600" />
            Super Admin Registration Passkeys
          </h1>
          <p className="text-xs text-gray-500 font-extrabold mt-1 max-w-2xl leading-relaxed">
            Manage single-use system passkeys for Super Admin self-registration. Passkeys automatically retire and refresh once used to onboard a new Super Admin account.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/80 backdrop-blur-lg border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-wider">Active Passkey</p>
              <h3 className="text-2xl font-black text-emerald-600 mt-1">{stats.totalActive} Active</h3>
            </div>
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-600">
              <CheckCircle2 size={24} />
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-lg border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-wider">Passkeys Used</p>
              <h3 className="text-2xl font-black text-amber-600 mt-1">{stats.totalUsed} Accounts</h3>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-600">
              <UserCheck size={24} />
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-lg border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-wider">Total Generated</p>
              <h3 className="text-2xl font-black text-purple-600 mt-1">{stats.totalGenerated} Keys</h3>
            </div>
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-purple-600">
              <Clock size={24} />
            </div>
          </div>
        </div>

        {/* Active Passkey Hero Card */}
        <div className="bg-white/90 backdrop-blur-xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-3xl p-6 md:p-8 space-y-6 relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-150 pb-5">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                Active System Passkey
              </span>
              <h2 className="text-lg font-bold text-gray-900 mt-2">
                Share with prospective Super Admins
              </h2>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                Share this key with another Super Admin to allow them to register at <code className="text-purple-700 font-mono font-bold bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">/sudo-control-panel</code>.
              </p>
            </div>
          </div>

          {/* Passkey Display Box */}
          <div className="bg-gradient-to-r from-purple-50/90 via-indigo-50/50 to-fuchsia-50/80 border border-purple-200 rounded-2xl p-5 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-3.5 bg-purple-600 text-white rounded-2xl shadow-md">
                <Key size={28} />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-gray-400">Current One-Time System Key</p>
                <span className="text-2xl md:text-3xl font-black tracking-widest font-mono text-purple-900">
                  {isLoading ? 'LOADING...' : (activeKey || 'SUP-KEY-NONE')}
                </span>
              </div>
            </div>

            <button
              onClick={handleCopyKey}
              className={`w-full md:w-auto px-6 py-3.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-95 ${
                copied 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white'
              }`}
            >
              {copied ? (
                <>
                  <CheckCircle2 size={16} /> Copied!
                </>
              ) : (
                <>
                  <Copy size={16} /> Copy System Passkey
                </>
              )}
            </button>
          </div>

          <div className="bg-amber-50/90 border border-amber-200/80 rounded-xl p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
            <ShieldAlert size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed font-medium">
              <strong className="font-bold">Security Rule:</strong> This passkey can only be used <strong>once</strong>. As soon as a user registers with this passkey, it will be automatically retired and a brand new active passkey will be generated. The history record below tracks who registered using which passkey.
            </p>
          </div>
        </div>

        {/* ── Passkey Usage History Audit Table ── */}
        <div className="bg-white/90 backdrop-blur-xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-3xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-150 pb-4">
            <div>
              <h2 className="text-xl font-black text-gray-900 tracking-tight">Passkey Audit History</h2>
              <p className="text-xs text-gray-500 font-medium mt-0.5">Record of generated passkeys, status, and which Super Admin registered with them.</p>
            </div>
            <span className="text-xs text-gray-600 font-extrabold px-3 py-1 bg-gray-100 rounded-lg border border-gray-200">
              {history.length} Total Records
            </span>
          </div>

          <div className="w-full">
            {isLoading ? (
              <div className="py-8 text-center text-gray-400 font-bold text-xs">
                Loading passkey history records...
              </div>
            ) : history.length === 0 ? (
              <div className="py-8 text-center text-gray-400 font-bold text-xs bg-gray-50/50 rounded-2xl">
                No passkey records found in system.
              </div>
            ) : (
              <>
                {/* Desktop View (min-width: 768px) */}
                <div className="hidden md:block overflow-x-auto w-full">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 text-[11px] font-black uppercase tracking-wider text-gray-500 bg-gray-50/70">
                        <th className="py-3.5 px-4 rounded-l-xl">Passkey Code</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4">Created Date</th>
                        <th className="py-3.5 px-4">Used By (User / Email)</th>
                        <th className="py-3.5 px-4 rounded-r-xl">Used Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-150 text-xs">
                      {history.map((record) => (
                        <tr key={record._id || record.key} className="hover:bg-purple-50/40 transition-colors">
                          <td className="py-4 px-4 font-mono font-bold text-purple-900 tracking-wider">
                            <div className="flex items-center gap-2">
                              <span>{record.key}</span>
                              <button
                                type="button"
                                onClick={() => handleCopyKey(record.key)}
                                title="Copy System Passkey"
                                className="px-2 py-1 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-800 font-extrabold text-[10px] transition-all cursor-pointer shadow-xs active:scale-95 flex items-center gap-1 border border-purple-200"
                              >
                                <Copy size={11} />
                                <span>Copy</span>
                              </button>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            {record.isUsed ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-black uppercase">
                                <UserCheck size={12} /> Used
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase shadow-xs">
                                <CheckCircle2 size={12} /> Active Key
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-gray-600 font-medium">
                            {record.createdAt ? new Date(record.createdAt).toLocaleString() : 'N/A'}
                          </td>
                          <td className="py-4 px-4">
                            {record.isUsed ? (
                              <div>
                                <p className="font-bold text-gray-900">{record.usedByName || 'Super Admin'}</p>
                                <p className="text-[11px] text-purple-700 font-mono font-semibold">{record.usedByEmail || 'N/A'}</p>
                              </div>
                            ) : (
                              <span className="text-gray-400 italic">Not used yet</span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-gray-500 font-medium">
                            {record.isUsed && record.usedAt ? new Date(record.usedAt).toLocaleString() : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View (max-width: 767px) */}
                <div className="block md:hidden space-y-3">
                  {history.map((record) => (
                    <div
                      key={record._id || record.key}
                      className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3 shadow-xs"
                    >
                      <div className="flex justify-between items-start gap-2 border-b border-gray-100 pb-2.5">
                        <div>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-600">System Passkey</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-mono font-black text-purple-900 text-sm tracking-wider">{record.key}</span>
                            <button
                              type="button"
                              onClick={() => handleCopyKey(record.key)}
                              title="Copy System Passkey"
                              className="px-2 py-0.5 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-800 font-extrabold text-[10px] transition-all cursor-pointer shadow-xs active:scale-95 flex items-center gap-1 border border-purple-200"
                            >
                              <Copy size={10} />
                              <span>Copy</span>
                            </button>
                          </div>
                        </div>
                        {record.isUsed ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-black uppercase shrink-0">
                            <UserCheck size={10} /> Used
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-black uppercase shrink-0">
                            <CheckCircle2 size={10} /> Active Key
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-2 text-xs">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-extrabold uppercase text-gray-400">Created Date:</span>
                          <span className="font-semibold text-gray-600 font-mono">
                            {record.createdAt ? new Date(record.createdAt).toLocaleString() : 'N/A'}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-extrabold uppercase text-gray-400">Used By:</span>
                          {record.isUsed ? (
                            <div className="mt-0.5">
                              <span className="font-black text-gray-900">{record.usedByName || 'Super Admin'}</span>
                              <span className="text-[11px] text-purple-700 font-mono font-bold block">{record.usedByEmail || 'N/A'}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400 italic font-medium">Not used yet</span>
                          )}
                        </div>
                        {record.isUsed && record.usedAt && (
                          <div className="flex flex-col">
                            <span className="text-[10px] font-extrabold uppercase text-gray-400">Used Date:</span>
                            <span className="font-semibold text-gray-600 font-mono">
                              {new Date(record.usedAt).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

        </div>

      </main>

    </div>
  );
}

export default SuperAdminPasskeys;