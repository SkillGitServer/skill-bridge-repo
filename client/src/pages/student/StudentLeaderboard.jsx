import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import axios from 'axios';
import toast from 'react-hot-toast';
import { getAuthToken } from '../../utils/auth';
import PullToRefreshWrapper from '../../components/shared/PullToRefreshWrapper';

function StudentLeaderboard() {
  useDocumentTitle('Leaderboard & Point History | Skill Bridge India');
  
  const [activeTab, setActiveTab] = useState('rankings'); // 'rankings' | 'history'
  const [timeframe, setTimeframe] = useState('weekly'); // 'weekly' | 'monthly' | 'yearly'
  const [selectedSubject, setSelectedSubject] = useState('all'); // 'all' | 'aptitude' | 'problem_solving' | etc.
  
  const [leaderboard, setLeaderboard] = useState([]);
  const [pointHistory, setPointHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  const selfEmail = (localStorage.getItem('auth_email') || localStorage.getItem('student_email') || '').toLowerCase().trim();

  const subjectOptions = [
    { key: 'all', label: '🌐 Overall' },
    { key: 'mentor_assessments', label: '👑 Mentor Assessments' },
    { key: 'aptitude', label: '📐 Aptitude' },
    { key: 'problem_solving', label: '🧩 Problem Solving' },
    { key: 'communication', label: '💬 Communication' },
    { key: 'behaviour', label: '🧠 Behaviour' },
    { key: 'situational', label: '⚖️ Situational' },
    { key: 'workplace_skills', label: '💼 Workplace' },
  ];

  const getSubjectDisplayLabel = () => {
    if (selectedSubject === 'all' || selectedSubject === 'overall') {
      return 'Skill Bridge Scholar';
    }
    const found = subjectOptions.find(s => s.key === selectedSubject);
    return found ? `${found.label} Domain` : 'Skill Bridge Scholar';
  };

  // Fetch Leaderboard Rankings based on timeframe & selected subject
  useEffect(() => {
    let active = true;
    async function fetchLeaderboard() {
      setIsLoading(true);
      try {
        const token = getAuthToken('spark');
        const res = await axios.get(`/api/results/leaderboard?timeframe=${timeframe}&subject=${selectedSubject}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (active) {
          setLeaderboard(res.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch leaderboard:', err);
        toast.error('Failed to load leaderboard data.');
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }
    if (activeTab === 'rankings') {
      fetchLeaderboard();
    }
    return () => {
      active = false;
    };
  }, [timeframe, selectedSubject, activeTab]);

  // Fetch My Point History
  useEffect(() => {
    let active = true;
    async function fetchPointHistory() {
      setIsHistoryLoading(true);
      try {
        const token = getAuthToken('spark');
        const res = await axios.get(`/api/results/point-history?email=${encodeURIComponent(selfEmail)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (active) {
          setPointHistory(res.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch point history:', err);
        toast.error('Failed to load point history.');
      } finally {
        if (active) {
          setIsHistoryLoading(false);
        }
      }
    }
    if (activeTab === 'history') {
      fetchPointHistory();
    }
    return () => {
      active = false;
    };
  }, [activeTab, selfEmail]);

  // Map entries to layout tokens
  const medals = ['🥇', '🥈', '🥉'];
  const borders = ['border-yellow-400', 'border-slate-300', 'border-orange-300'];
  const avatarBgs = [
    'bg-yellow-100 text-yellow-700 ring-4 ring-yellow-400',
    'bg-slate-200 text-slate-600 ring-4 ring-slate-300',
    'bg-orange-100 text-orange-700 ring-4 ring-orange-300'
  ];
  const rankColors = ['text-yellow-500', 'text-gray-400', 'text-orange-400'];
  const ptsColors = ['text-yellow-600', 'text-slate-500', 'text-orange-500'];

  const mappedEntries = (Array.isArray(leaderboard) ? leaderboard : []).map((entry, idx) => {
    const name = entry.name || 'Student';
    const initials = name.split(/\s+/).map(n => n ? n[0] : '').join('').substring(0, 2).toUpperCase() || 'ST';
    const entryEmail = (entry.email || '').toLowerCase().trim();
    const isSelf = Boolean(entryEmail && selfEmail && entryEmail === selfEmail);
    
    return {
      rank: idx + 1,
      initials,
      name,
      pts: entry.pts || 0,
      isSelf,
      border: borders[idx] || 'border-gray-200',
      rankColor: rankColors[idx] || 'text-gray-400',
      avatarBg: avatarBgs[idx] || 'bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-600',
      ptsColor: ptsColors[idx] || 'text-gray-600',
      medal: medals[idx] || '🎖️'
    };
  });

  const top3 = mappedEntries.slice(0, 3);
  const standard = mappedEntries.slice(3);

  // Dynamic self metrics for sidebar display
  const selfRecord = mappedEntries.find(item => item.isSelf);
  const selfRank = selfRecord ? selfRecord.rank : '-';
  const selfPoints = selfRecord ? selfRecord.pts : 0;
  const selfMedal = selfRank === 1 ? '🥇' : selfRank === 2 ? '🥈' : selfRank === 3 ? '🥉' : '🎖️';

  return (
    <PullToRefreshWrapper>
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-amber-50 font-sans w-full select-none">

      {/* ── Dark Header Bar ── */}
      <div className="w-full text-white px-6 md:px-8 relative overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.3)] flex flex-col z-10 bg-[#0a0a0a] pt-6 pb-16">

        {/* Decorative glow blobs */}
        <div className="absolute top-20 left-10 w-56 h-56 bg-yellow-500/10 rounded-full blur-[80px] pointer-events-none z-0 animate-float" />
        <div className="absolute bottom-0 right-0 w-40 h-40 bg-orange-500/8 rounded-full blur-[60px] pointer-events-none z-0 animate-float delay-400" />

        <div className="relative z-10 flex flex-col h-full">

          {/* Centered Header with back arrow */}
          <div className="flex items-center justify-center relative w-full mb-6 animate-fade-in-down">
            <Link
              to="/student/dashboard"
              className="absolute left-0 p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors text-white"
              aria-label="Go Back"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h2 className="text-xl font-bold text-white tracking-wide">Leaderboard & Point History</h2>
          </div>

          {/* Top Tab Bar: Rankings vs My Point History */}
          <div className="flex bg-gray-900/80 p-1.5 rounded-2xl max-w-sm mx-auto mb-6 border border-gray-800 backdrop-blur-md shadow-md animate-fade-in w-full">
            <button
              type="button"
              onClick={() => setActiveTab('rankings')}
              className={`flex-1 py-2.5 px-3 text-xs font-black rounded-xl uppercase tracking-wider transition-all duration-200 cursor-pointer text-center ${
                activeTab === 'rankings'
                  ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              🏆 Rankings
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`flex-1 py-2.5 px-3 text-xs font-black rounded-xl uppercase tracking-wider transition-all duration-200 cursor-pointer text-center ${
                activeTab === 'history'
                  ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              ⚡ My Point History
            </button>
          </div>

          {/* Trophy visual */}
          <div className="flex flex-col items-center text-center mb-4 animate-greeting-pop">
            <div className="text-5xl mb-2 animate-float">🏆</div>
            <p className="text-lg font-extrabold text-white tracking-tight">
              {activeTab === 'rankings' ? 'Top Performers' : 'My Assessment Point History'}
            </p>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Skill Bridge India Rank Pool</p>
          </div>

          {/* My Rank badge — desktop only */}
          {activeTab === 'rankings' && (
            <div className="hidden md:flex mt-4 items-center gap-3 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 animate-fade-in-up">
              <div className="text-2xl">{selfMedal}</div>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-yellow-400">Your Current Rank</p>
                <p className="text-white font-extrabold text-lg">#{selfRank} &nbsp;<span className="text-yellow-400">{selfPoints.toLocaleString()} pts</span></p>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Content Area (Light) ── */}
      <main className="relative z-20 -mt-10 bg-gradient-to-br from-slate-50 to-amber-50 rounded-t-[2.5rem] pt-8 px-4 md:px-8 lg:px-12 w-full flex-1 flex flex-col">

        <div className="max-w-3xl mx-auto w-full space-y-4 pb-12">

          {activeTab === 'history' ? (
            /* ── MY POINT HISTORY VIEW ── */
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">Point History Ledger</h3>
                  <p className="text-xs text-gray-400 font-medium mt-0.5">Chronological record of earned exam points</p>
                </div>
                <span className="text-xs font-extrabold text-gray-400 uppercase tracking-widest hidden sm:block">
                  {pointHistory.length} {pointHistory.length === 1 ? 'Attempt' : 'Attempts'}
                </span>
              </div>

              {isHistoryLoading ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-4">
                  <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Loading point history...</p>
                </div>
              ) : pointHistory.length === 0 ? (
                <div className="text-center py-16 bg-white/80 backdrop-blur-md border border-white/60 rounded-3xl p-8 shadow-sm">
                  <span className="text-4xl block mb-3">📜</span>
                  <p className="text-base font-extrabold text-gray-800">No point history recorded yet</p>
                  <p className="text-xs text-gray-400 mt-1 font-bold">Complete assessments to build your point ledger!</p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {pointHistory.map((item, idx) => {
                    const isMentor = item.isMentorExam === true;
                    const pts = item.pointsEarned || 0;
                    const isPos = pts >= 0;

                    const dateStr = item.date ? new Date(item.date).toLocaleDateString('en-IN', {
                      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    }) : 'Recent';

                    return (
                      <div
                        key={item.id || idx}
                        className={`p-4 md:p-5 rounded-3xl transition-all duration-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                          isMentor
                            ? 'bg-gradient-to-r from-yellow-500/10 via-amber-500/15 to-yellow-600/20 border-2 border-yellow-500/60 shadow-[0_0_15px_rgba(234,179,8,0.2)] text-amber-950'
                            : 'bg-white/90 backdrop-blur-md border border-gray-200/80 shadow-xs text-gray-900'
                        }`}
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-extrabold text-sm md:text-base tracking-tight truncate flex items-center gap-1.5">
                              <span>{isMentor ? '✨' : '📝'}</span>
                              <span>{item.examName}</span>
                            </h4>

                            {isMentor && (
                              <span className="text-[10px] font-black uppercase tracking-wider bg-yellow-400 text-black px-2.5 py-0.5 rounded-full border border-yellow-500 shadow-xs flex items-center gap-1">
                                <span>✨</span> <span>GOLDEN ASSESSMENT</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs font-semibold text-gray-500 flex-wrap">
                            <span>📅 {dateStr}</span>
                            <span>🎯 {item.score}% Accuracy ({item.correctAnswers}/{item.totalQuestions})</span>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-2 self-end sm:self-center">
                          <span className={`px-4 py-2 rounded-2xl font-black text-sm uppercase tracking-wider shadow-xs border ${
                            isPos
                              ? 'bg-emerald-500/20 text-emerald-800 border-emerald-500/40'
                              : 'bg-rose-500/20 text-rose-800 border-rose-500/40'
                          }`}>
                            {isPos ? `+${pts}` : `${pts}`} PTS
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* ── RANKINGS VIEW ── */
            <div className="space-y-4 animate-fade-in">
              {/* Section heading */}
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">Rankings</h3>
                  <p className="text-xs text-gray-400 font-medium mt-0.5">Updated after every exam submission</p>
                </div>
                <span className="text-xs font-extrabold text-gray-400 uppercase tracking-widest hidden sm:block">
                  {leaderboard.length} {leaderboard.length === 1 ? 'Student' : 'Students'}
                </span>
              </div>

              {/* Timeframe Selector & Subject Filters */}
              <div className="space-y-3">
                <div className="flex bg-gray-200/60 p-1 rounded-xl w-fit gap-1 border border-gray-300/30">
                  {['weekly', 'monthly', 'yearly'].map((tf) => (
                    <button
                      key={tf}
                      type="button"
                      onClick={() => setTimeframe(tf)}
                      className={`px-4 py-2 text-xs font-extrabold rounded-lg uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                        timeframe === tf
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-500 hover:text-gray-800'
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>

                {/* Subject Filter Pills (Horizontally Scrollable) */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none w-full">
                  {subjectOptions.map((sub) => {
                    const isSel = selectedSubject === sub.key;
                    return (
                      <button
                        key={sub.key}
                        type="button"
                        onClick={() => setSelectedSubject(sub.key)}
                        className={`px-3.5 py-1.5 text-xs font-extrabold rounded-full transition-all duration-200 shrink-0 cursor-pointer border ${
                          isSel
                            ? 'bg-black text-white border-black shadow-sm'
                            : 'bg-white/80 text-gray-600 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {sub.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Rankings List or States ── */}
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-4">
                  <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Loading rankings...</p>
                </div>
              ) : leaderboard.length === 0 ? (
                <div className="text-center py-16 bg-white/80 backdrop-blur-md border border-white/60 rounded-3xl p-8 shadow-sm">
                  <span className="text-4xl block mb-3">📊</span>
                  <p className="text-base font-extrabold text-gray-800">No rankings available yet</p>
                  <p className="text-xs text-gray-400 mt-1 font-bold">Attempt your first exam in this subject to establish your score!</p>
                </div>
              ) : (
                <>
                  {/* ── Top 3 — Special Cards ── */}
                  {top3.map((entry, i) => (
                    <div
                      key={entry.rank}
                      className={`flex items-center gap-4 p-4 rounded-3xl border-2 shadow-md hover:-translate-y-1 hover:shadow-xl transition-all duration-300 animate-fade-in-up bg-white/80 backdrop-blur-md ${
                        entry.rank === 1 ? 'border-yellow-400' : entry.rank === 2 ? 'border-slate-300' : 'border-orange-300'
                      } ${i === 0 ? 'delay-100' : i === 1 ? 'delay-200' : 'delay-300'} ${entry.isSelf ? 'ring-2 ring-indigo-400 ring-offset-2' : ''}`}
                    >
                      {/* Podium Avatar — large */}
                      <div className="relative flex-shrink-0">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center font-extrabold text-lg shadow-lg ${
                          entry.rank === 1 ? 'bg-yellow-100 text-yellow-700 ring-4 ring-yellow-400' :
                          entry.rank === 2 ? 'bg-slate-200 text-slate-600 ring-4 ring-slate-300' :
                          'bg-orange-100 text-orange-700 ring-4 ring-orange-300'
                        }`}>
                          {entry.initials}
                        </div>
                        <span className="absolute -top-1 -right-1 text-xl leading-none">{entry.medal}</span>
                      </div>

                      {/* Name + badge */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-gray-900 text-base truncate">{entry.name}</span>
                          {entry.isSelf && (
                            <span className="text-[10px] font-extrabold bg-indigo-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wide flex-shrink-0">You</span>
                          )}
                        </div>
                        <span className="text-xs text-gray-400 font-semibold">{getSubjectDisplayLabel()}</span>
                      </div>

                      {/* Points */}
                      <div className={`font-extrabold text-xl text-right flex-shrink-0 ${entry.rank === 1 ? 'text-yellow-600' : entry.rank === 2 ? 'text-slate-500' : 'text-orange-500'}`}>
                        {entry.pts.toLocaleString()}
                        <span className="text-xs font-bold ml-1 opacity-60">pts</span>
                      </div>
                    </div>
                  ))}

                  {/* Divider */}
                  {standard.length > 0 && (
                    <div className="flex items-center gap-3 py-1">
                      <div className="flex-grow h-px bg-gray-200" />
                      <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Remaining</span>
                      <div className="flex-grow h-px bg-gray-200" />
                    </div>
                  )}

                  {/* ── Ranks 4+ — Standard Rows ── */}
                  {standard.map((entry, i) => (
                    <div
                      key={entry.rank}
                      className={`flex items-center justify-between bg-white/80 backdrop-blur-md py-3.5 px-5 rounded-full border border-white/60 shadow-sm hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300 animate-fade-in-up delay-${Math.min(i * 100 + 300, 700)} ${entry.isSelf ? 'ring-2 ring-indigo-400 ring-offset-2' : ''}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-extrabold text-gray-500 flex-shrink-0">
                          {entry.rank}
                        </div>
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center font-bold text-indigo-600 text-xs flex-shrink-0">
                          {entry.initials}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-800 text-sm">{entry.name}</span>
                            {entry.isSelf && (
                              <span className="text-[9px] font-extrabold bg-indigo-500 text-white px-1.5 py-0.5 rounded-full uppercase tracking-wide">You</span>
                            )}
                          </div>
                          <span className="block text-[10px] text-gray-400 font-semibold">{getSubjectDisplayLabel()}</span>
                        </div>
                      </div>
                      <div className="font-bold text-gray-500 text-sm">
                        {entry.pts.toLocaleString()}
                        <span className="text-xs ml-1 opacity-60">pts</span>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

        </div>
      </main>

      <footer className="w-full text-center py-6 text-xs text-gray-400 font-semibold tracking-wide border-t border-gray-150 bg-white/40 backdrop-blur-md mt-auto z-20">
        Skill Bridge India
      </footer>
      </div>
    </PullToRefreshWrapper>
  );
}

export default StudentLeaderboard;
