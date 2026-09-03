import React, { useState } from 'react';
import RandomBlobs from './RandomBlobs';
import logo from '../../assets/logo.png';
import { WifiOff, RotateCw, Brain, CheckCircle2, XCircle, Award, Sparkles, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';

// Import Question Banks across all 6 core subjects
import aptitudeData from '../../data/aptitude.json';
import behaviourData from '../../data/behaviour_and_personality.json';
import commsData from '../../data/communication.json';
import problemData from '../../data/problem_solving.json';
import situationalData from '../../data/situational.json';
import workplaceData from '../../data/workplace_skills.json';

const SUBJECT_BANKS = [
  { name: 'Aptitude', data: aptitudeData, color: 'text-amber-300 bg-amber-500/15 border-amber-500/30' },
  { name: 'Behaviour & Personality', data: behaviourData, color: 'text-purple-300 bg-purple-500/15 border-purple-500/30' },
  { name: 'Communication', data: commsData, color: 'text-blue-300 bg-blue-500/15 border-blue-500/30' },
  { name: 'Problem Solving', data: problemData, color: 'text-cyan-300 bg-cyan-500/15 border-cyan-500/30' },
  { name: 'Situational Judgment', data: situationalData, color: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30' },
  { name: 'Workplace Skills', data: workplaceData, color: 'text-rose-300 bg-rose-500/15 border-rose-500/30' }
];

function getCorrectIndex(item) {
  if (typeof item.ans === 'number') return item.ans;
  if (typeof item.correctIndex === 'number') return item.correctIndex;
  
  const ca = String(item.correctAnswer || item.answer || '').trim();
  if (['A', 'B', 'C', 'D'].includes(ca.toUpperCase())) {
    return ['A', 'B', 'C', 'D'].indexOf(ca.toUpperCase());
  }
  if (['0', '1', '2', '3'].includes(ca)) {
    return parseInt(ca, 10);
  }
  const foundIdx = item.options ? item.options.findIndex(opt => String(opt).trim() === ca) : -1;
  return foundIdx !== -1 ? foundIdx : 0;
}

function generate6SubjectQuiz() {
  return SUBJECT_BANKS.map((subject) => {
    const list = subject.data || [];
    const item = list[Math.floor(Math.random() * list.length)] || {};
    return {
      subject: subject.name,
      badgeColor: subject.color,
      q: item.question || item.q || 'Sample Question',
      options: item.options || ['Option A', 'Option B', 'Option C', 'Option D'],
      ans: getCorrectIndex(item)
    };
  });
}

function OfflinePage({ onRetry, isChecking }) {
  const [quizQuestions, setQuizQuestions] = useState(() => generate6SubjectQuiz());
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [answered, setAnswered] = useState(false);

  const currentItem = quizQuestions[currentQ];

  const handleSelectOption = (index) => {
    if (answered) return;
    setSelectedOption(index);
    setAnswered(true);

    if (index === currentItem.ans) {
      setScore((prev) => prev + 1);
    }

    setTimeout(() => {
      setSelectedOption(null);
      setAnswered(false);
      setCurrentQ((prev) => prev + 1);
    }, 1300);
  };

  const handleRestartQuiz = () => {
    setQuizQuestions(generate6SubjectQuiz());
    setCurrentQ(0);
    setScore(0);
    setSelectedOption(null);
    setAnswered(false);
  };

  const handleManualRetry = async () => {
    if (onRetry) {
      const isBackOnline = await onRetry();
      if (isBackOnline) {
        toast.success('🌐 Connection Restored! Welcome back.');
      } else {
        toast.error('Still offline. Please check your network cables or Wi-Fi.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 text-white flex flex-col items-center justify-center p-4 sm:p-6 overflow-y-auto select-none font-sans">
      {/* Background blobs */}
      <RandomBlobs count={5} zIndex="z-0" />

      <div className="relative z-10 w-full max-w-lg bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-[0_32px_80px_rgba(0,0,0,0.6)] text-center my-auto">
        
        {/* Brand Logo */}
        <div className="flex justify-center mb-6">
          <img src={logo} alt="Skill Bridge India" className="h-10 sm:h-12 object-contain" />
        </div>

        {/* Animated Wifi-Off Badge */}
        <div className="w-20 h-20 rounded-3xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-5 shadow-[0_0_40px_rgba(239,68,68,0.2)] animate-pulse">
          <WifiOff className="w-10 h-10 text-red-400" />
        </div>

        {/* Main Heading */}
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2 text-white">
          You Are Offline
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 font-medium mb-6 leading-relaxed max-w-md mx-auto">
          Your internet connection appears to be offline. Don't worry! Skill Bridge India will automatically restore your session as soon as you reconnect.
        </p>

        {/* Offline Status Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-bold mb-6">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          <span>No Internet Connection</span>
        </div>

        {/* Retry Button */}
        <button
          onClick={handleManualRetry}
          disabled={isChecking}
          className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-extrabold rounded-2xl text-sm tracking-wide transition-all active:scale-95 shadow-xl flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 mb-8"
        >
          <RotateCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
          <span>{isChecking ? 'Checking Connection...' : 'Check Connection & Retry'}</span>
        </button>

        {/* 6-Subject Offline Mini Quiz Section */}
        <div className="pt-6 border-t border-white/10 text-left">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
              <Brain className="w-4 h-4 text-indigo-400" />
              <span>Offline 6-Subject Challenge</span>
            </div>
            <div className="text-xs font-extrabold text-indigo-400 flex items-center gap-1 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Score: {score}/6</span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-4 sm:p-5">
            {currentQ < quizQuestions.length ? (
              <>
                {/* Subject Badge & Progress */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${currentItem.badgeColor}`}>
                    {currentItem.subject}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    Question {currentQ + 1} of 6
                  </span>
                </div>

                <p className="text-xs sm:text-sm font-semibold text-slate-100 mb-4 leading-relaxed">
                  {currentItem.q}
                </p>
                <div className="space-y-2">
                  {currentItem.options.map((opt, idx) => {
                    const isCorrect = idx === currentItem.ans;
                    const isSelected = selectedOption === idx;

                    let btnStyle = "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white";
                    if (answered) {
                      if (isCorrect) {
                        btnStyle = "bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold";
                      } else if (isSelected) {
                        btnStyle = "bg-red-500/20 border-red-500/50 text-red-300 font-bold";
                      }
                    }

                    return (
                      <button
                        key={idx}
                        onClick={() => handleSelectOption(idx)}
                        disabled={answered}
                        className={`w-full p-3 rounded-xl border text-xs sm:text-sm text-left transition-all flex items-center justify-between cursor-pointer ${btnStyle}`}
                      >
                        <span>{opt}</span>
                        {answered && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                        {answered && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Award className="w-6 h-6 text-amber-400" />
                </div>
                <h4 className="text-base font-bold text-white mb-1">6-Subject Challenge Completed!</h4>
                <p className="text-xs text-slate-400 mb-4">You scored {score} out of 6 points across all 6 core subjects.</p>
                <button
                  onClick={handleRestartQuiz}
                  className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-lg flex items-center gap-2 mx-auto"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Play New 6-Subject Quiz</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer info */}
        <p className="text-[11px] text-slate-500 mt-6 font-medium">
          Skill Bridge India · Automated PWA Offline Resilience
        </p>

      </div>
    </div>
  );
}

export default OfflinePage;
