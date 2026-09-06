import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import toast from 'react-hot-toast';
import axios from 'axios';
import StudentUpgradeForm from '../../components/student/StudentUpgradeForm';
import { getAuthToken } from '../../utils/auth';

// Import all 6 multiple-choice question JSON files
import aptitudeData from '../../data/aptitude.json';
import behaviourData from '../../data/behaviour_and_personality.json';
import communicationData from '../../data/communication.json';
import problemSolvingData from '../../data/problem_solving.json';
import situationalData from '../../data/situational.json';
import workplaceSkillsData from '../../data/workplace_skills.json';

// Combine all datasets for the combined exam bank
const combinedData = [
  ...aptitudeData,
  ...behaviourData,
  ...communicationData,
  ...problemSolvingData,
  ...situationalData,
  ...workplaceSkillsData,
];

// Category mapping object linking the parameter to the arrays
const categoryMap = {
  aptitude: aptitudeData,
  behaviour: behaviourData,
  communication: communicationData,
  problem_solving: problemSolvingData,
  situational: situationalData,
  workplace_skills: workplaceSkillsData,
  combined: combinedData,
};

// Premium display names for categories
const categoryNames = {
  aptitude: 'Aptitude & Logical Reasoning',
  behaviour: 'Behaviour & Personality',
  communication: 'Communication Skills',
  problem_solving: 'Problem Solving & Critical Thinking',
  situational: 'Situational Judgement',
  workplace_skills: 'Workplace Skills & Professionalism',
  combined: 'Combined Comprehensive Exam',
};

// Icons associated with each category
const categoryIcons = {
  aptitude: '🧠',
  behaviour: '🤝',
  communication: '💬',
  problem_solving: '🧩',
  situational: '🎯',
  workplace_skills: '💼',
  combined: '⚡',
};

// Shuffling helper using Fisher-Yates algorithm
const shuffleAndPick = (arr, count) => {
  if (!arr || arr.length === 0) return [];
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
};

// Helper to get a stable unique ID for any question item
const getQuestionId = (q) => {
  if (!q) return '';
  if (q.id) return String(q.id);
  const qStr = q.question || q.questionText || '';
  let hash = 0;
  for (let i = 0; i < qStr.length; i++) {
    hash = ((hash << 5) - hash) + qStr.charCodeAt(i);
    hash |= 0;
  }
  return `q_${Math.abs(hash)}`;
};

// Smart question selection to maximize dataset utilization and eliminate repetition per student
const smartSelectQuestions = (arr, count, categoryKey = 'combined', studentEmail = 'guest') => {
  if (!arr || arr.length === 0) return [];
  if (arr.length <= count) return shuffleAndPick(arr, count);

  const cleanEmail = (studentEmail || 'guest').toLowerCase().trim();
  const storageKey = `seen_questions_${cleanEmail}_${categoryKey}`;
  
  let seenSet = new Set();
  try {
    const rawSeen = localStorage.getItem(storageKey);
    if (rawSeen) {
      const parsed = JSON.parse(rawSeen);
      if (Array.isArray(parsed)) {
        seenSet = new Set(parsed);
      }
    }
  } catch (e) {
    seenSet = new Set();
  }

  // Filter questions into unseen vs seen pools
  const unseenPool = [];
  const seenPool = [];

  arr.forEach((q) => {
    const qId = getQuestionId(q);
    if (seenSet.has(qId)) {
      seenPool.push(q);
    } else {
      unseenPool.push(q);
    }
  });

  let selected = [];

  if (unseenPool.length >= count) {
    // Unseen questions are available to fulfill the test
    selected = shuffleAndPick(unseenPool, count);
  } else {
    // Question pool cycle exhausted: pick all remaining unseen questions & fill remainder from shuffled seen pool
    const shuffledUnseen = shuffleAndPick(unseenPool, unseenPool.length);
    const needed = count - shuffledUnseen.length;
    const shuffledSeen = shuffleAndPick(seenPool, needed);
    selected = [...shuffledUnseen, ...shuffledSeen];
    
    // Clear history to restart rotation cycle
    seenSet.clear();
  }

  // Record selected question IDs into localStorage
  selected.forEach((q) => {
    const qId = getQuestionId(q);
    seenSet.add(qId);
  });

  try {
    localStorage.setItem(storageKey, JSON.stringify(Array.from(seenSet)));
  } catch (e) {
    // Ignore localStorage storage quota errors
  }

  return selected;
};

// Answer verification helper to robustly check correctness
const checkAnswerCorrectness = (optionText, optionIdx, correctAnswer) => {
  if (correctAnswer === undefined || correctAnswer === null) return false;
  
  // If correctAnswer is a number index (like 0-3), check match directly
  if (typeof correctAnswer === 'number') {
    return optionIdx === correctAnswer;
  }

  const trimmedAns = String(correctAnswer).trim();
  const trimmedOpt = String(optionText).trim();

  // 1. Direct match
  if (trimmedOpt === trimmedAns) return true;

  // 2. Single letter match ('A', 'B', 'C', 'D')
  if (/^[A-D]$/i.test(trimmedAns)) {
    const letterIdx = ['A', 'B', 'C', 'D'].indexOf(trimmedAns.toUpperCase());
    return letterIdx === optionIdx;
  }

  // 3. Clean prefixes, symbols, and compare alphanumerics
  const clean = (str) => {
    return str
      .replace(/^[A-D][\.\)\s-]+\s*/i, '') // Remove prefixes like "A. ", "B) "
      .replace(/\s+/g, '')                // Remove whitespaces
      .replace(/₹/g, '')                  // Remove currency symbols
      .replace(/[^a-zA-Z0-9]/g, '')       // Keep alphanumeric only
      .toLowerCase();
  };

  const cleanOpt = clean(trimmedOpt);
  const cleanAns = clean(trimmedAns);

  if (cleanOpt === cleanAns) return true;
  if (cleanOpt && cleanAns && (cleanOpt.includes(cleanAns) || cleanAns.includes(cleanOpt))) return true;

  return false;
};

// Format seconds to MM:SS
const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

function StudentExam() {
  const { category = 'combined' } = useParams();
  const navigate = useNavigate();

  const isMentorExam = category.startsWith('mentor-');
  const [mentorExam, setMentorExam] = useState(null);
  const [loadingMentor, setLoadingMentor] = useState(false);

  // Retrieve current category display name and icon
  const currentCategoryName = isMentorExam 
    ? (mentorExam ? mentorExam.title : 'Mentor Assigned Exam')
    : (categoryNames[category] || categoryNames.combined);
  const currentCategoryIcon = isMentorExam ? '📋' : (categoryIcons[category] || categoryIcons.combined);

  useDocumentTitle(`${currentCategoryName} Exam | Skill Bridge India`);

  const [isConfigured, setIsConfigured] = useState(false);
  const [questionSize, setQuestionSize] = useState(20);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showUpgradeForm, setShowUpgradeForm] = useState(false);

  // Marathi translation states
  const [translatedContent, setTranslatedContent] = useState(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationLanguage, setTranslationLanguage] = useState('en'); // 'en' | 'mr'

  useEffect(() => {
    const checkUpgradeStatus = async () => {
      try {
        const token = getAuthToken('spark');
        if (!token) return;
        const res = await axios.get('/api/student/profile', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data) {
          setIsUnlocked(res.data.isUnlocked || false);
        }
      } catch (err) {
        console.error('Failed to load profile for exam upgrade check:', err);
      }
    };
    checkUpgradeStatus();
  }, []);

  // Set question size options (Max capped at 50)
  const rawData = isMentorExam ? [] : (categoryMap[category] || categoryMap.combined);
  const totalQuestions = rawData.length;

  let sizeOptions = [20, 30, 40, 50].filter((s) => s <= totalQuestions);
  if (sizeOptions.length === 0 && totalQuestions < 20) {
    if (totalQuestions > 10) sizeOptions.push(10);
  }
  const maxCap = Math.min(50, totalQuestions);
  if (!sizeOptions.includes(maxCap)) {
    sizeOptions.push(maxCap);
  }
  sizeOptions.sort((a, b) => a - b);

  const currentStudentEmail = localStorage.getItem('auth_email') || localStorage.getItem('student_email') || 'guest';
  const activeSessionKey = `active_exam_session_${currentStudentEmail.toLowerCase().trim()}_${category}`;

  // Load mentor exam, restore saved active session, or reset config on category change
  useEffect(() => {
    // Prevent post-exam re-entry for completed mentor exams
    if (isMentorExam) {
      const examId = category.replace('mentor-', '');
      if (localStorage.getItem(`completed_mentor_exam_${examId}`) === 'true') {
        toast.error('You have already completed this mentor exam.');
        navigate('/student/dashboard');
        return;
      }
    }

    // Try restoring active mid-exam session from sessionStorage (e.g., hard refresh Ctrl+R)
    try {
      const savedSession = sessionStorage.getItem(activeSessionKey);
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        if (parsed && parsed.isConfigured && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
          setQuestions(parsed.questions);
          setCurrentIndex(parsed.currentIndex || 0);
          setUserAnswers(parsed.userAnswers || Array(parsed.questions.length).fill(null));
          setTimeLeft(parsed.timeLeft > 0 ? parsed.timeLeft : 60);
          setIsConfigured(true);
          setIsCompleted(false);
          return; // Resumed active exam session successfully!
        }
      }
    } catch (e) {
      console.error('Error restoring active exam session:', e);
    }

    setIsConfigured(false);
    setQuestions([]);
    setIsCompleted(false);
    setShowExitConfirm(false);
    setCurrentIndex(0);
    setUserAnswers([]);
    setTranslatedContent(null);
    setTranslationLanguage('en');

    if (isMentorExam) {
      const fetchMentorExam = async () => {
        setLoadingMentor(true);
        try {
          const examId = category.replace('mentor-', '');
          const token = getAuthToken('spark');
          const res = await axios.get(`/api/mentor-exams/${examId}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
          if (res.data) {
            if (localStorage.getItem(`completed_mentor_exam_${res.data._id}`) === 'true') {
              toast.error('You have already completed this mentor exam.');
              navigate('/student/dashboard');
              return;
            }

            setMentorExam(res.data);
            setQuestions(res.data.questions);
            setUserAnswers(Array(res.data.questions.length).fill(null));
            setTimeLeft((res.data.duration || 15) * 60);
            setIsConfigured(true);
          } else {
            toast.error('No active mentor exam found.');
            navigate('/student/dashboard');
          }
        } catch (err) {
          console.error('Failed to load mentor exam:', err);
          const errMsg = err.response && err.response.data && err.response.data.error
            ? err.response.data.error
            : 'Failed to load mentor exam.';
          toast.error(errMsg);
          navigate('/student/dashboard');
        } finally {
          setLoadingMentor(false);
        }
      };
      fetchMentorExam();
    } else {
      // Auto-check if an active published mentor exam exists across platform
      const checkActiveMentorExam = async () => {
        try {
          const token = getAuthToken('spark');
          const res = await axios.get('/api/mentor-exams/active', {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          }).catch(() => null);

          if (res?.data && res.data._id && res.data.isActive) {
            const userEmailClean = currentStudentEmail.toLowerCase().trim();
            if (res.data.attemptedBy && Array.isArray(res.data.attemptedBy) && res.data.attemptedBy.map(e => String(e).toLowerCase().trim()).includes(userEmailClean)) {
              return;
            }

            setMentorExam(res.data);
            setQuestions(res.data.questions);
            setUserAnswers(Array(res.data.questions.length).fill(null));
            setTimeLeft((res.data.duration || 15) * 60);
            setIsConfigured(true);
            return;
          }
        } catch (e) {}

        if (category !== 'combined') {
          setQuestionSize(10);
        } else {
          // Pick dynamic default size for default/combined exams
          const availableData = categoryMap[category] || categoryMap.combined;
          const totalQs = availableData.length;
          const baseSizes = [20, 30, 40, 50].filter((s) => s <= totalQs);

          if (baseSizes.length === 0) {
            setQuestionSize(Math.min(50, totalQs));
          } else {
            setQuestionSize(baseSizes.includes(20) ? 20 : baseSizes[0]);
          }
        }
      };
      checkActiveMentorExam();
    }
  }, [category, activeSessionKey, isMentorExam, navigate, currentStudentEmail]);

  // Mid-Exam State Persistence: Sync progress to sessionStorage on every answer/tick
  useEffect(() => {
    if (isConfigured && !isCompleted && questions.length > 0) {
      try {
        const sessionPayload = {
          category,
          questions,
          currentIndex,
          userAnswers,
          timeLeft,
          isConfigured: true,
          timestamp: Date.now()
        };
        sessionStorage.setItem(activeSessionKey, JSON.stringify(sessionPayload));
      } catch (e) {
        console.error('Error syncing exam session state:', e);
      }
    }
  }, [isConfigured, isCompleted, questions, currentIndex, userAnswers, timeLeft, activeSessionKey, category]);

  // Prevent navigation and warn candidate during active exam session
  useEffect(() => {
    if (!isConfigured || isCompleted || questions.length === 0) return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "You have an active exam in progress. Reloading or navigating away will preserve your state, but timer will continue ticking.";
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isConfigured, isCompleted, questions]);

  // Countdown timer hook
  useEffect(() => {
    if (!isConfigured || isCompleted || questions.length === 0) return;

    if (timeLeft <= 0) {
      setIsCompleted(true);
      submitExamResult();
      toast.error('Time is up! Exam has been submitted.');
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isCompleted, isConfigured, questions]);

  // Handle starting exam with configured size
  const handleStartExam = () => {
    const finalSize = parseInt(questionSize, 10);

    if (!isUnlocked && (category !== 'combined' || finalSize > 10)) {
      toast.error('🔒 Upgrade Required: Subject-wise exams & 50-question full assessments are locked for free accounts. Please upgrade your profile!');
      setShowUpgradeForm(true);
      return;
    }

    const sEmail = localStorage.getItem('auth_email') || localStorage.getItem('student_email') || 'student@careerbridge.in';
    const selectedQuestions = isMentorExam 
      ? shuffleAndPick(questions, finalSize)
      : smartSelectQuestions(rawData, finalSize, category, sEmail);

    if (selectedQuestions.length === 0) {
      toast.error('Failed to load exam data.');
      navigate('/student/dashboard');
      return;
    }

    setQuestions(selectedQuestions);
    setCurrentIndex(0);
    setUserAnswers(Array(finalSize).fill(null));
    setIsCompleted(false);
    setTimeLeft(finalSize * 60); // 1 minute per question
    setIsConfigured(true);
  };

  const handleResetToConfig = () => {
    try {
      sessionStorage.removeItem(activeSessionKey);
    } catch (e) {}

    if (isMentorExam) {
      // Reload mentor exam directly
      navigate('/student/dashboard');
    } else {
      setIsConfigured(false);
      setQuestions([]);
      setIsCompleted(false);
      setCurrentIndex(0);
      setUserAnswers([]);
      setTranslatedContent(null);
      setTranslationLanguage('en');
    }
  };

  const buildQuestionsDetailedPayload = () => {
    const isMentor = Boolean(isMentorExam);
    return questions.map((q, idx) => {
      const uAns = userAnswers[idx];
      let userText = 'Not Answered / Skipped';
      const isAttempted = uAns !== null && uAns !== undefined;

      if (isAttempted) {
        if (typeof uAns === 'object' && uAns.text) {
          userText = uAns.text;
        } else if (typeof uAns === 'number' && q.options && q.options[uAns]) {
          const optPrefix = ['A', 'B', 'C', 'D', 'E', 'F'][uAns] || `${uAns + 1}`;
          userText = `${optPrefix}. ${q.options[uAns]}`;
        } else {
          userText = String(uAns);
        }
      }

      const uIdx = isAttempted ? (typeof uAns === 'object' ? uAns.index : (typeof uAns === 'number' ? uAns : -1)) : -1;
      const isCorrect = isAttempted && checkAnswerCorrectness(userText, uIdx, q.correctAnswer || q.answer);

      let correctText = 'N/A';
      const cAnsRaw = q.correctAnswer !== undefined ? q.correctAnswer : (q.correct !== undefined ? q.correct : q.answer);

      if (q.options && Array.isArray(q.options)) {
        if (typeof cAnsRaw === 'number' && q.options[cAnsRaw]) {
          const optPrefix = ['A', 'B', 'C', 'D', 'E', 'F'][cAnsRaw] || `${cAnsRaw + 1}`;
          const optVal = String(q.options[cAnsRaw]);
          correctText = /^[A-F][\.\)\s]/i.test(optVal.trim()) ? optVal : `${optPrefix}. ${optVal}`;
        } else if (typeof cAnsRaw === 'string' && /^[A-F]$/i.test(cAnsRaw.trim())) {
          const letterIdx = ['A', 'B', 'C', 'D', 'E', 'F'].indexOf(cAnsRaw.trim().toUpperCase());
          if (letterIdx !== -1 && q.options[letterIdx]) {
            const optVal = String(q.options[letterIdx]);
            correctText = /^[A-F][\.\)\s]/i.test(optVal.trim()) ? optVal : `${cAnsRaw.trim().toUpperCase()}. ${optVal}`;
          } else {
            correctText = String(cAnsRaw);
          }
        } else {
          correctText = String(cAnsRaw || q.options[0]);
        }
      } else {
        correctText = String(cAnsRaw || 'N/A');
      }

      // Point Scoring:
      // Standard: Correct +2, Wrong -2, Unattempted -1
      // Mentor:   Correct +5, Wrong -10, Unattempted -5
      let qPoints = 0;
      if (isCorrect) {
        qPoints = isMentor ? 5 : 2;
      } else if (isAttempted) {
        qPoints = isMentor ? -10 : -2;
      } else {
        qPoints = isMentor ? -5 : -1;
      }

      return {
        questionText: q.question || q.questionText || `Question ${idx + 1}`,
        userAnswer: userText,
        correctAnswer: correctText,
        explanation: q.explanation || q.rationale || 'Detailed conceptual evaluation and core competencies applied.',
        isCorrect: isCorrect,
        points: qPoints,
        options: q.options || []
      };
    });
  };

  const submitExamResult = async () => {
    try {
      const finalScore = calculateScore();
      const scorePct = Math.round((finalScore / questions.length) * 100);
      const status = scorePct >= 50 ? 'Pass' : 'Fail';

      const sEmail = localStorage.getItem('auth_email') || localStorage.getItem('student_email') || 'aniket@careerbridge.in';
      const sName = localStorage.getItem('auth_name') || localStorage.getItem('student_name') || 'Student';

      await axios.post('/api/results', {
        studentName: sName,
        studentEmail: sEmail,
        examTitle: currentCategoryName,
        score: scorePct,
        totalQuestions: questions.length,
        correctAnswers: finalScore,
        status: status,
        isMentorExam: Boolean(isMentorExam),
        questionsDetailed: buildQuestionsDetailedPayload()
      });

      if (mentorExam && mentorExam._id) {
        const rawDate = mentorExam.updatedAt || mentorExam.createdAt || mentorExam.dateCreated;
        const ver = rawDate ? new Date(rawDate).getTime().toString() : '1';
        localStorage.setItem(`completed_mentor_exam_${mentorExam._id}_${ver}`, 'true');
      } else if (category && category.startsWith('mentor-')) {
        const mId = category.replace('mentor-', '');
        localStorage.setItem(`completed_mentor_exam_${mId}`, 'true');
      }

      try {
        sessionStorage.removeItem(activeSessionKey);
      } catch (e) {}
    } catch (err) {
      console.error('Failed to save exam result to server:', err);
    }
  };

  const submitExamResultWithExitPenalty = async () => {
    try {
      const finalScore = calculateScore();
      const scorePct = Math.round((finalScore / questions.length) * 100);

      const sEmail = localStorage.getItem('auth_email') || localStorage.getItem('student_email') || 'aniket@careerbridge.in';
      const sName = localStorage.getItem('auth_name') || localStorage.getItem('student_name') || 'Student';

      await axios.post('/api/results', {
        studentName: sName,
        studentEmail: sEmail,
        examTitle: `${currentCategoryName} (Terminated)`,
        score: scorePct,
        totalQuestions: questions.length,
        correctAnswers: finalScore,
        status: 'Fail',
        isMentorExam: Boolean(isMentorExam),
        questionsDetailed: buildQuestionsDetailedPayload()
      });

      if (mentorExam && mentorExam._id) {
        const rawDate = mentorExam.updatedAt || mentorExam.createdAt || mentorExam.dateCreated;
        const ver = rawDate ? new Date(rawDate).getTime().toString() : '1';
        localStorage.setItem(`completed_mentor_exam_${mentorExam._id}_${ver}`, 'true');
      } else if (category && category.startsWith('mentor-')) {
        const mId = category.replace('mentor-', '');
        localStorage.setItem(`completed_mentor_exam_${mId}`, 'true');
      }
    } catch (err) {
      console.error('Failed to submit exit penalty result:', err);
    }
  };

  const handleConfirmExit = async () => {
    try {
      if (isConfigured && !isCompleted) {
        await submitExamResult();
      }
    } catch (err) {
      console.error('Error submitting exam exit:', err);
    } finally {
      setIsCompleted(true);
      setShowExitConfirm(false);
      toast.success('Session ended. Score card generated!');
    }
  };

  const handleExit = () => {
    if (isConfigured && !isCompleted) {
      setShowExitConfirm(true);
    } else {
      navigate('/student/dashboard');
    }
  };

  if (showUpgradeForm) {
    return (
      <StudentUpgradeForm 
        onBack={() => setShowUpgradeForm(false)} 
        showBack={true} 
        trialTimeRemaining={86400}
      />
    );
  }

  if (loadingMentor) {
    return (
      <div className="min-h-screen bg-[#111111] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-400 text-sm font-bold tracking-wide">Fetching Mentor Custom Exam...</p>
        </div>
      </div>
    );
  }

  if (isConfigured && questions.length === 0) {
    return (
      <div className="min-h-screen bg-[#111111] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-400 text-sm font-bold tracking-wide">Preparing Exam...</p>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const selectedIndex = isConfigured ? userAnswers[currentIndex] : null;
  const hasAnswered = selectedIndex !== null;

  // Handle option click
  const handleSelectOption = (idx) => {
    if (hasAnswered) return;
    const newAnswers = [...userAnswers];
    newAnswers[currentIndex] = idx;
    setUserAnswers(newAnswers);
  };

  // Dynamic English-to-Marathi Translation Handler
  const handleToggleTranslation = async () => {
    if (translationLanguage === 'mr') {
      setTranslationLanguage('en');
      return;
    }

    if (translatedContent) {
      setTranslationLanguage('mr');
      return;
    }

    setIsTranslating(true);
    try {
      const qText = currentQuestion.question || currentQuestion.questionText || '';
      const opts = currentQuestion.options || [];
      const expl = currentQuestion.explanation || 'Sourced from Skill Bridge India exam database.';

      const textsToTranslate = [qText, ...opts, expl];
      const promises = textsToTranslate.map(async (text) => {
        if (!text) return '';
        try {
          const res = await axios.get(`https://api.mymemory.translated.net/get`, {
            params: {
              q: text,
              langpair: 'en|mr'
            }
          });
          return res.data?.responseData?.translatedText || text;
        } catch (err) {
          console.error('Translation error for segment:', text, err);
          return text;
        }
      });

      const translatedResults = await Promise.all(promises);
      setTranslatedContent({
        question: translatedResults[0],
        options: translatedResults.slice(1, 1 + opts.length),
        explanation: translatedResults[1 + opts.length]
      });
      setTranslationLanguage('mr');
    } catch (err) {
      console.error('Translation failed:', err);
      toast.error('Failed to translate question. Please try again.');
    } finally {
      setIsTranslating(false);
    }
  };

  // Navigate to next question
  const handleNext = () => {
    setTranslatedContent(null);
    setTranslationLanguage('en');
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsCompleted(true);
      submitExamResult();
    }
  };

  // Calculate score
  const calculateScore = () => {
    return userAnswers.reduce((acc, ansIndex, qIndex) => {
      if (ansIndex === null) return acc;
      const q = questions[qIndex];
      const isCorr = checkAnswerCorrectness(q.options[ansIndex], ansIndex, q.correctAnswer);
      return acc + (isCorr ? 1 : 0);
    }, 0);
  };

  // Calculate detailed performance metrics and net points
  const calculateDetailedMetrics = () => {
    let correctCount = 0;
    let wrongCount = 0;
    let unattemptedCount = 0;

    questions.forEach((q, idx) => {
      const uAns = userAnswers[idx];
      const isAttempted = uAns !== null && uAns !== undefined;

      if (!isAttempted) {
        unattemptedCount += 1;
      } else {
        let userText = '';
        if (typeof uAns === 'object' && uAns.text) {
          userText = uAns.text;
        } else if (typeof uAns === 'number' && q.options && q.options[uAns]) {
          const optPrefix = ['A', 'B', 'C', 'D', 'E', 'F'][uAns] || `${uAns + 1}`;
          userText = `${optPrefix}. ${q.options[uAns]}`;
        } else {
          userText = String(uAns);
        }
        const uIdx = typeof uAns === 'object' ? uAns.index : (typeof uAns === 'number' ? uAns : -1);
        const isCorr = checkAnswerCorrectness(userText, uIdx, q.correctAnswer || q.answer);
        if (isCorr) {
          correctCount += 1;
        } else {
          wrongCount += 1;
        }
      }
    });

    const isMentor = Boolean(isMentorExam);
    const correctPts = isMentor ? 5 : 2;
    const wrongPts = isMentor ? -10 : -2;
    const unattemptedPts = isMentor ? -5 : -1;

    const netPoints = (correctCount * correctPts) + (wrongCount * wrongPts) + (unattemptedCount * unattemptedPts);

    return {
      correctCount,
      wrongCount,
      unattemptedCount,
      netPoints,
      isMentor
    };
  };

  const score = calculateScore();
  const progressPct = isConfigured ? ((currentIndex + 1) / questions.length) * 100 : 0;

  // Determine urgency classes for the timer watch
  const isUrgent = timeLeft < 60; // < 1 minute
  const isWarning = timeLeft < 180; // < 3 minutes

  let timerStyle = "bg-[#111111]/90 text-white border-zinc-800 shadow-lg";
  let timerDotColor = "bg-emerald-500";

  if (isUrgent) {
    timerStyle = "bg-rose-950/90 text-rose-300 border-rose-800 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse";
    timerDotColor = "bg-rose-500";
  } else if (isWarning) {
    timerStyle = "bg-amber-950/90 text-amber-300 border-amber-800 shadow-[0_0_15px_rgba(245,158,11,0.2)]";
    timerDotColor = "bg-amber-500";
  }

  return (
    <div translate="no" className="notranslate min-h-screen flex flex-col bg-gray-50 font-sans w-full select-none relative">
      
      {/* ── Floating Timer Watch ── */}
      {isConfigured && !isCompleted && (
        <div className={`fixed top-4 right-4 md:top-8 md:right-8 z-[99] flex items-center gap-2.5 px-4 py-2.5 border rounded-full font-mono text-sm md:text-base font-extrabold tracking-wider backdrop-blur-md transition-all duration-300 ${timerStyle}`}>
          <span className="relative flex h-2.5 w-2.5">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${timerDotColor}`}></span>
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${timerDotColor}`}></span>
          </span>
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 md:w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{formatTime(timeLeft)}</span>
        </div>
      )}

      {/* ── Left Sidebar (Dark) — Matches Dashboard and Profile ── */}
      <div className="w-full text-white px-6 md:px-8 relative overflow-hidden flex-shrink-0 flex flex-col z-10 bg-[#0a0a0a] pt-6 pb-16">
        
        {/* Decorative background glow */}
        <div className="absolute top-28 left-12 w-64 h-64 bg-orange-500/10 rounded-full blur-[80px] pointer-events-none z-0 animate-float" />

        <div className="relative z-10 flex flex-col h-full w-full">
          
          {/* Header Row with Back button */}
          <div className="flex items-center justify-center relative w-full mb-8 md:mb-10">
            {!isConfigured && (
              <Link
                to="/student/dashboard"
                className="absolute left-0 p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors text-white"
                aria-label="Exit Exam"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
            )}
            <h2 className="text-xl font-bold text-white tracking-wide">Exam Mode</h2>
          </div>

          {/* Category Info Stack */}
          <div className="flex flex-col items-center text-center md:mt-4">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-orange-400 to-yellow-300 border-4 border-gray-850 flex items-center justify-center text-white text-3xl shadow-xl mb-4">
              {currentCategoryIcon}
            </div>
            <h2 className="text-xl font-extrabold tracking-tight leading-snug">{currentCategoryName}</h2>
            <p className="text-xs text-gray-400 mt-2 font-semibold bg-gray-800 px-3 py-1 rounded-full inline-block">
              {category === 'combined' ? 'Comprehensive Assessment' : 'Module Assessment'}
            </p>
          </div>

          {/* Exam Guidelines Notice */}
          <div className="mt-8 bg-[#1a1a1a] rounded-2xl p-4 border border-gray-800 text-left shadow-lg">
            <p className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <span>📋</span> Guidelines
            </p>
            <ul className="text-[11px] text-gray-400 space-y-1.5 list-inside list-disc">
              <li>Automatic randomized question selection.</li>
              <li>Immediate correctness feedback.</li>
              <li>Allowed 1 minute per question.</li>
            </ul>
          </div>

          {/* Exit Button — pinned to bottom on desktop (Only during active exam) */}
          {isConfigured && !isCompleted && (
            <div className="hidden md:block md:mt-auto w-full">
              <button
                onClick={handleExit}
                className="w-full bg-red-650/10 hover:bg-red-650/20 text-red-400 font-extrabold py-4 rounded-2xl border border-red-900/30 transition-colors flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                Quit Practice Session 🚪
              </button>
            </div>
          )}

        </div>
      </div>

      {/* ── Right Content Area (Light) — Matches Dashboard and Profile ── */}
      <main className="relative z-20 -mt-10 bg-gray-50 rounded-t-[2.5rem] pt-8 px-4 md:px-8 lg:px-12 w-full flex-1 flex flex-col justify-between">
        
        {!isConfigured ? (
          /* Configuration Setup Screen */
          <div className="space-y-6 max-w-lg mx-auto w-full flex-grow flex flex-col justify-center items-center py-12">
            <div className="bg-white rounded-3xl shadow-[12px_12px_32px_rgba(0,0,0,0.08)] border border-gray-100/80 p-8 md:p-10 w-full text-left animate-scale-in">
              <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-2xl">
                  ⚙️
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Configure Practice Session</h3>
                  <p className="text-xs text-gray-400 font-semibold">Select session parameters before starting</p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Info Block */}
                <div className="bg-orange-50/50 border border-orange-100/80 rounded-2xl p-4 text-xs font-semibold text-orange-800 leading-relaxed">
                  🚀 Preparing a customized exam from the <strong>{currentCategoryName}</strong> bank. {category === 'combined' ? `Total database pool size is ${totalQuestions} questions.` : 'This exam contains 10 questions.'}
                </div>

                {/* Size Selector for Combined Assessment only */}
                {category === 'combined' ? (
                  <div>
                    <label className="block text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-3">
                      Number of Questions
                    </label>
                    <div className="flex flex-wrap gap-2.5">
                      {sizeOptions.map((opt) => {
                        const isSelected = questionSize === opt;
                        return (
                          <button
                            key={opt}
                            onClick={() => setQuestionSize(opt)}
                            className={`px-5 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all border ${
                              isSelected
                                ? 'bg-black text-white border-black shadow-md cursor-pointer'
                                : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                            }`}
                          >
                            {opt} Qs
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {/* Note about starting the exam */}
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-xs font-semibold text-amber-800 flex items-start gap-2.5 shadow-sm leading-relaxed">
                  <span className="text-base shrink-0">⚠️</span>
                  <div>
                    <strong className="block text-amber-950 font-bold mb-0.5">Note on Exam Navigation</strong>
                    Once you start, you cannot navigate back. Exiting or leaving the active exam session will submit your progress and subtract points.
                  </div>
                </div>

                {/* Start Button */}
                <button
                  onClick={handleStartExam}
                  className="w-full py-4 rounded-xl bg-black hover:bg-gray-900 text-white font-extrabold text-sm transition-all duration-200 shadow-md active:scale-95 cursor-pointer mt-4"
                >
                  Start Exam 🚀
                </button>
              </div>
            </div>
          </div>
        ) : isCompleted ? (
          /* ── Upgraded Premium Score Card View ── */
          <div className="space-y-6 max-w-2xl mx-auto w-full flex-grow flex flex-col justify-center items-center py-8 md:py-12 animate-scale-in">
            {(() => {
              const totalQs = questions.length || 1;
              const { correctCount, wrongCount, unattemptedCount, netPoints } = calculateDetailedMetrics();
              const scorePct = Math.round((correctCount / totalQs) * 100);
              const isHigh = scorePct >= 50;

              const theme = isHigh ? {
                cardBg: "bg-gradient-to-br from-[#062c1d] via-[#091a13] to-black border-2 border-emerald-400/60 shadow-[0_0_60px_rgba(16,185,129,0.35)]",
                badgeBg: "bg-emerald-400/20 text-emerald-300 border-emerald-400/50",
                accentGlow: "bg-emerald-500/20",
                scoreGradient: "from-emerald-300 via-teal-200 to-yellow-300",
                statusText: scorePct >= 90 ? "Outstanding Mastery! 🌟" : scorePct >= 75 ? "Great Performance! 🏆" : "Passing Grade Achieved! 👍",
                statusBadge: "bg-gradient-to-r from-emerald-400 to-teal-400 text-black",
                icon: "🏆"
              } : {
                cardBg: "bg-gradient-to-br from-[#3b0a0a] via-[#1a0505] to-black border-2 border-rose-500/60 shadow-[0_0_60px_rgba(239,68,68,0.35)]",
                badgeBg: "bg-rose-500/20 text-rose-300 border-rose-500/50",
                accentGlow: "bg-rose-500/20",
                scoreGradient: "from-rose-400 via-orange-300 to-amber-400",
                statusText: "Needs Practice & Review 💪",
                statusBadge: "bg-gradient-to-r from-rose-500 to-orange-500 text-white",
                icon: "🎯"
              };

              const formattedNetPoints = netPoints > 0 ? `+${netPoints}` : `${netPoints}`;
              const isPositiveNet = netPoints >= 0;

              return (
                <div className="w-full space-y-6">
                  {/* Main Metallic Card Container */}
                  <div className={`rounded-3xl relative overflow-hidden p-6 md:p-10 text-center text-white ${theme.cardBg} transition-all duration-500 group`}>
                    
                    {/* Ambient Background Glow Effects */}
                    <div className={`absolute top-0 right-0 w-48 h-48 rounded-full blur-[50px] pointer-events-none animate-float ${theme.accentGlow}`} />
                    <div className={`absolute bottom-0 left-0 w-36 h-36 rounded-full blur-[40px] pointer-events-none animate-float delay-300 ${theme.accentGlow}`} />

                    <div className="relative z-10 flex flex-col items-center">
                      
                      {/* Top Badges */}
                      <div className="flex items-center gap-2 mb-4 flex-wrap justify-center">
                        <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border text-xs font-black uppercase tracking-widest shadow-xs ${theme.badgeBg}`}>
                          <span>{theme.icon}</span> PRACTICE COMPLETED
                        </span>
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider shadow-sm border border-white/20 ${theme.statusBadge}`}>
                          {scorePct}% ACCURACY
                        </span>
                        <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider shadow-md border ${
                          isPositiveNet 
                            ? 'bg-gradient-to-r from-emerald-400 to-teal-400 text-black border-emerald-300' 
                            : 'bg-gradient-to-r from-rose-600 to-red-600 text-white border-rose-400'
                        }`}>
                          ⚡ NET POINTS: {formattedNetPoints} PTS
                        </span>
                      </div>

                      <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-snug mb-1">
                        {currentCategoryName}
                      </h2>
                      <p className="text-xs md:text-sm text-gray-300 font-medium mb-6">
                        Final Session Results & Point Breakdown
                      </p>

                      {/* Massive Centered Score Container */}
                      <div className="my-2 p-6 md:p-8 rounded-3xl bg-black/60 border border-white/10 backdrop-blur-md w-full max-w-md shadow-2xl flex flex-col items-center justify-center relative">
                        <div className="flex items-baseline justify-center gap-1">
                          <span className={`text-6xl md:text-7xl font-black bg-gradient-to-r ${theme.scoreGradient} bg-clip-text text-transparent drop-shadow-lg`}>
                            {correctCount}
                          </span>
                          <span className="text-3xl md:text-4xl text-gray-400 font-bold">
                            /{totalQs}
                          </span>
                        </div>
                        <p className="text-sm md:text-base font-extrabold text-white mt-3 tracking-wide">
                          {theme.statusText}
                        </p>

                        {/* Net Point Highlight Banner */}
                        <div className={`mt-4 px-4 py-1.5 rounded-full border text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                          isPositiveNet 
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        }`}>
                          <span>{isPositiveNet ? '📈' : '📉'}</span>
                          <span>Net Point Impact: <strong>{formattedNetPoints} Points</strong></span>
                        </div>
                      </div>

                      {/* Stat Pills Grid: Correct, Wrong, Unattempted */}
                      <div className="grid grid-cols-3 gap-3 w-full max-w-md mt-6">
                        <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-3.5 backdrop-blur-xs text-center">
                          <p className="text-[10px] uppercase font-black tracking-wider text-emerald-400">CORRECT</p>
                          <p className="text-lg font-black text-emerald-300 mt-0.5">{correctCount}</p>
                        </div>
                        <div className="bg-rose-950/40 border border-rose-500/30 rounded-2xl p-3.5 backdrop-blur-xs text-center">
                          <p className="text-[10px] uppercase font-black tracking-wider text-rose-400">WRONG</p>
                          <p className="text-lg font-black text-rose-300 mt-0.5">{wrongCount}</p>
                        </div>
                        <div className="bg-amber-950/40 border border-amber-500/30 rounded-2xl p-3.5 backdrop-blur-xs text-center">
                          <p className="text-[10px] uppercase font-black tracking-wider text-amber-400">UNATTEMPTED</p>
                          <p className="text-lg font-black text-amber-300 mt-0.5">{unattemptedCount}</p>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Action Buttons Directly Beneath */}
                  <div className="flex flex-col sm:flex-row gap-3.5 w-full">
                    <button
                      onClick={() => navigate('/student/dashboard')}
                      className="flex-1 py-4 px-6 rounded-2xl bg-black hover:bg-gray-900 text-white font-black text-sm uppercase tracking-wider transition-all shadow-lg active:scale-95 cursor-pointer border border-gray-800 text-center"
                    >
                      Return to Dashboard 🏠
                    </button>
                    {(!isMentorExam && !mentorExam?._id) && (
                      <button
                        onClick={handleResetToConfig}
                        className="flex-1 py-4 px-6 rounded-2xl bg-white hover:bg-gray-100 text-gray-900 font-black text-sm uppercase tracking-wider border-2 border-gray-200 transition-all shadow-md active:scale-95 cursor-pointer text-center"
                      >
                        Try Another Set 🔄
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        ) : (
          /* Active Question Flow */
          <div className="max-w-3xl mx-auto w-full flex-grow flex flex-col justify-between pt-6 md:pt-0">
            
            {/* Header progress bar */}
            <div className="w-full mb-8">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-extrabold text-gray-400 uppercase tracking-widest">
                  Progress
                </span>
                <span className="text-xs font-black text-gray-900 font-mono">
                  {currentIndex + 1} of {questions.length}
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-black rounded-full transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            {/* Question Card — Matches White Card Layout */}
            <div className="bg-white rounded-3xl shadow-[12px_12px_32px_rgba(0,0,0,0.08)] border border-gray-100/80 p-6 md:p-8 text-left flex-grow flex flex-col justify-between mb-8">
              
              <div className="w-full">
                {/* Question badge & Translation */}
                <div className="flex flex-wrap justify-between items-center gap-2 mb-5">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 border border-orange-100 text-[10px] font-extrabold tracking-wider uppercase text-orange-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
                    Question {currentIndex + 1}
                  </span>

                  <button
                    onClick={handleToggleTranslation}
                    disabled={isTranslating}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-150 text-[10px] font-extrabold tracking-wider uppercase text-indigo-700 hover:bg-indigo-100 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <span>🌐</span>
                    {isTranslating ? 'Translating...' : translationLanguage === 'en' ? 'Translate to Marathi / मराठीत भाषांतर करा' : 'Translate to English / इंग्रजीत भाषांतर करा'}
                  </button>
                </div>

                {/* Question Text */}
                <h3 className="text-lg md:text-xl font-extrabold text-gray-900 mb-6 leading-relaxed">
                  {translationLanguage === 'mr' && translatedContent ? translatedContent.question : (currentQuestion.question || currentQuestion.questionText)}
                </h3>

                {/* 4 Options Grid */}
                <div className="flex flex-col gap-3">
                  {currentQuestion.options.map((opt, idx) => {
                    const isSelected = selectedIndex === idx;
                    const isCorr = checkAnswerCorrectness(opt, idx, currentQuestion.correctAnswer);

                    // Normal state style
                    let btnClass = "bg-gray-50 hover:bg-gray-100 border-gray-200/80 text-gray-700 hover:border-gray-450";
                    let badgeClass = "bg-gray-200 text-gray-500";

                    // Answered state style
                    if (hasAnswered) {
                      if (isSelected) {
                        if (isCorr) {
                          btnClass = "bg-emerald-50 border-emerald-500 text-emerald-800 font-bold shadow-sm";
                          badgeClass = "bg-emerald-500 text-white font-black";
                        } else {
                          btnClass = "bg-rose-50 border-rose-500 text-rose-800 font-bold shadow-sm";
                          badgeClass = "bg-rose-500 text-white font-black";
                        }
                      } else if (isCorr) {
                        // Highlight correct one as dashed green
                        btnClass = "bg-emerald-50/50 border-dashed border-emerald-500/40 text-emerald-700/80 font-bold";
                        badgeClass = "bg-emerald-500/20 text-emerald-600 font-extrabold";
                      } else {
                        btnClass = "opacity-45 cursor-not-allowed border-gray-100 text-gray-400";
                        badgeClass = "bg-gray-100 text-gray-300";
                      }
                    }

                    return (
                      <button
                        key={idx}
                        disabled={hasAnswered}
                        onClick={() => handleSelectOption(idx)}
                        className={`w-full text-left rounded-2xl p-4 md:p-5 text-sm md:text-base border-2 transition-all duration-200 flex items-center relative focus:outline-none ${btnClass}`}
                      >
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black mr-4 flex-shrink-0 transition-colors ${badgeClass}`}>
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span className="flex-1 pr-6 leading-relaxed font-semibold">
                          {translationLanguage === 'mr' && translatedContent ? translatedContent.options[idx] : opt}
                        </span>

                        {hasAnswered && isSelected && (
                          <span className="absolute right-5">
                            {isCorr ? (
                              <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            )}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Explanation Section */}
              {hasAnswered && (
                <div className="mt-6 p-5 rounded-2xl bg-indigo-50/50 border border-indigo-100/50 animate-fade-in text-left">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full border border-indigo-200/30">
                      Explanation
                    </span>
                    <span className="text-gray-400 text-xs font-semibold">
                      {checkAnswerCorrectness(currentQuestion.options[selectedIndex], selectedIndex, currentQuestion.correctAnswer) ? "Correct Answer" : "Incorrect Answer"}
                    </span>
                  </div>
                  <p className="text-xs md:text-sm text-gray-600 leading-relaxed font-medium">
                    {translationLanguage === 'mr' && translatedContent ? translatedContent.explanation : (currentQuestion.explanation || "Sourced from Skill Bridge India exam database.")}
                  </p>
                </div>
              )}

            </div>

            {/* Footer Navigation Bar */}
            <div className="flex flex-wrap justify-between items-center gap-3 bg-white border border-gray-100 rounded-3xl p-4 shadow-sm">
              <button
                onClick={() => setShowExitConfirm(true)}
                className="px-4 py-3 sm:px-5 sm:py-3.5 rounded-xl font-extrabold text-xs uppercase tracking-wider text-gray-400 hover:text-black bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Quit Practice Session 🚪
              </button>

              <div className="flex items-center gap-2.5">
                {!hasAnswered && (
                  <button
                    onClick={handleNext}
                    className="px-5 py-3 sm:px-6 sm:py-3.5 rounded-xl font-extrabold text-xs uppercase tracking-wider text-amber-900 bg-amber-100/90 hover:bg-amber-200 border border-amber-300/80 transition-all active:scale-95 cursor-pointer shadow-xs"
                    title="Leave this question unattempted and move to next"
                  >
                    {currentIndex < questions.length - 1 ? 'Skip Question ⏭️' : 'Skip & Finish ✓'}
                  </button>
                )}

                {hasAnswered && (
                  <button
                    onClick={handleNext}
                    className="px-6 py-3 sm:px-8 sm:py-3.5 rounded-xl font-extrabold text-xs uppercase tracking-widest text-white bg-black hover:bg-gray-900 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-sm"
                  >
                    {currentIndex < questions.length - 1 ? 'Next Question →' : 'Finish Exam ✓'}
                  </button>
                )}
              </div>
            </div>

          </div>
        )}



      </main>

      {/* ── Custom Styled Exit Confirmation Modal ── */}
      {showExitConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0" onClick={() => setShowExitConfirm(false)} />
          <div className="bg-white w-full max-w-md rounded-[32px] p-8 space-y-6 shadow-2xl border border-gray-100 relative z-10 animate-scale-in text-center">
            <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto text-3xl">
              ⚠️
            </div>
            <div className="space-y-3 text-left">
              <h3 className="text-xl font-extrabold text-gray-900 tracking-tight text-center">End Practice Session?</h3>
              
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs font-semibold text-amber-900 flex items-start gap-2.5 shadow-sm leading-relaxed">
                <span className="text-base shrink-0">⏱️</span>
                <div>
                  <strong className="block text-amber-950 font-bold mb-0.5">End Session Confirmation</strong>
                  Are you sure you want to end this session early? Your progress will be saved and your score card will be generated for questions attempted so far.
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-extrabold py-4 rounded-2xl text-sm transition-all cursor-pointer"
              >
                Keep Practicing
              </button>
              <button
                onClick={handleConfirmExit}
                className="flex-1 bg-black hover:bg-gray-900 text-white font-extrabold py-4 rounded-2xl text-sm transition-all shadow-md cursor-pointer"
              >
                Yes, End Session
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="w-full text-center py-6 text-xs text-gray-400 font-semibold tracking-wide border-t border-gray-150 bg-white/40 backdrop-blur-md mt-auto z-20">
        Skill Bridge India
      </footer>
    </div>
  );
}

export default StudentExam;
