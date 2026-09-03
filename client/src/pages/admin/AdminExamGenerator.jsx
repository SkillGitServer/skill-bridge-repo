import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import toast from 'react-hot-toast';
import axios from 'axios';
import { useAdminRefresh } from '../../components/admin/AdminRefresh';
import AdminHeader from '../../components/admin/AdminHeader';
import { getAuthToken } from '../../utils/auth';

// Import local JSON mock data
import aptitudeData from '../../data/aptitude.json';
import problemSolvingData from '../../data/problem_solving.json';
import communicationData from '../../data/communication.json';
import behaviourData from '../../data/behaviour_and_personality.json';
import situationalData from '../../data/situational.json';
import workplaceSkillsData from '../../data/workplace_skills.json';

const questionBanks = {
  aptitude: aptitudeData,
  problem_solving: problemSolvingData,
  communication: communicationData,
  behaviour: behaviourData,
  situational: situationalData,
  workplace_skills: workplaceSkillsData,
};

const categories = [
  { key: 'aptitude', name: 'Aptitude' },
  { key: 'problem_solving', name: 'Problem Solving' },
  { key: 'communication', name: 'Communication' },
  { key: 'behaviour', name: 'Behaviour & Personality' },
  { key: 'situational', name: 'Situational Judgment' },
  { key: 'workplace_skills', name: 'Workplace Skills' },
];

function AdminExamGenerator() {
  useDocumentTitle('Exam Generator | Skill Bridge India');
  const navigate = useNavigate();
  const location = useLocation();

  const adminName = localStorage.getItem('admin_name') || 'Amit Sharma';

  // Tabs: 'custom' or 'bank'
  const [activeTab, setActiveTab] = useState('custom');

  // Form state for custom question
  const [customQuestionText, setCustomQuestionText] = useState('');
  const [optA, setOptA] = useState('');
  const [optB, setOptB] = useState('');
  const [optC, setOptC] = useState('');
  const [optD, setOptD] = useState('');
  const [correctOption, setCorrectOption] = useState('0'); // index 0-3
  const [explanation, setExplanation] = useState('');

  // Question bank category, search, and pagination state (1 question at a time)
  const [selectedCategory, setSelectedCategory] = useState('aptitude');
  const [searchQuery, setSearchQuery] = useState('');
  const [bankPage, setBankPage] = useState(1);
  const QUESTIONS_PER_PAGE = 1;

  // Track expanded draft question row
  const [expandedDraftId, setExpandedDraftId] = useState(null);

  useEffect(() => {
    setBankPage(1);
  }, [selectedCategory, searchQuery]);

  // Draft exam parameters
  const [editingExamId, setEditingExamId] = useState(null);
  const [examTitle, setExamTitle] = useState('Custom Assessment');
  const [examDesc, setExamDesc] = useState('Evaluation of core competencies.');
  const [examDuration, setExamDuration] = useState(15);
  const [examDifficulty, setExamDifficulty] = useState('Intermediate');
  const [draftQuestions, setDraftQuestions] = useState([]);

  // Load draft data if passed via location state
  useEffect(() => {
    if (location.state?.draftToEdit) {
      const draft = location.state.draftToEdit;
      setEditingExamId(draft.id || draft._id || null);
      if (draft.title) setExamTitle(draft.title);
      if (draft.description) setExamDesc(draft.description);
      if (draft.duration) setExamDuration(Number(draft.duration) || 15);
      if (draft.difficulty) setExamDifficulty(draft.difficulty);
      if (draft.questions && draft.questions.length > 0) {
        setDraftQuestions(draft.questions.map((q, idx) => ({
          id: q.id || q._id || `q_${idx}_${Date.now()}`,
          questionText: q.questionText || q.question || '',
          options: q.options || [],
          correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
          explanation: q.explanation || ''
        })));
      }
      toast.success(`Loaded "${draft.title || 'Draft'}" for editing!`);
    }
  }, [location.state]);

  // Sidebar components helper
  const sidebarLinks = [
    { label: 'Overview', path: '/admin/dashboard', icon: '📊' },
    { label: 'Exam Generator', path: '/admin/exam-generator', icon: '📝' },
    { label: 'Profile', path: '/admin/profile', icon: '👤' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('admin_status');
    localStorage.removeItem('pending_admin_email');
    localStorage.removeItem('pending_admin_name');
    toast.success('Logged out successfully.');
    navigate('/admin/auth');
  };

  // Add custom question to draft
  const handleAddCustomQuestion = (e) => {
    e.preventDefault();
    if (!customQuestionText.trim()) {
      toast.error('Question text cannot be empty.');
      return;
    }
    if (!optA.trim() || !optB.trim() || !optC.trim() || !optD.trim()) {
      toast.error('All 4 options must be filled.');
      return;
    }

    const newQuestion = {
      id: 'custom_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      questionText: customQuestionText.trim(),
      options: [optA.trim(), optB.trim(), optC.trim(), optD.trim()],
      correctAnswer: parseInt(correctOption),
      explanation: explanation.trim() || 'No explanation provided.'
    };

    setDraftQuestions([...draftQuestions, newQuestion]);
    toast.success('Custom question added to draft!');

    // Reset custom form
    setCustomQuestionText('');
    setOptA('');
    setOptB('');
    setOptC('');
    setOptD('');
    setCorrectOption('0');
    setExplanation('');
  };

  // Add banked question to draft
  const handleAddBankQuestion = (question) => {
    // Check if already in draft
    if (draftQuestions.some(q => q.id === question.id)) {
      toast.error('This question is already in the draft.');
      return;
    }

    // Determine correct answer index
    let correctIdx = 0;
    if (typeof question.correctAnswer === 'number') {
      correctIdx = question.correctAnswer;
    } else if (['A', 'B', 'C', 'D'].includes(question.correctAnswer)) {
      correctIdx = ['A', 'B', 'C', 'D'].indexOf(question.correctAnswer);
    } else if (question.options.includes(question.correctAnswer)) {
      correctIdx = question.options.indexOf(question.correctAnswer);
    } else if (question.correctAnswer && question.correctAnswer.startsWith('A.')) {
      correctIdx = 1; // fallback
    }

    const formatted = {
      id: question.id,
      questionText: question.question,
      options: question.options,
      correctAnswer: correctIdx,
      explanation: question.explanation || 'Sourced from Question Bank.'
    };

    setDraftQuestions([...draftQuestions, formatted]);
    toast.success('Question added to draft!');
  };

  // Remove question from draft
  const handleRemoveQuestion = (id) => {
    setDraftQuestions(draftQuestions.filter(q => q.id !== id));
    toast.success('Question removed.');
  };

  // Edit question in draft (loads into custom question form)
  const handleEditQuestionInDraft = (q) => {
    setActiveTab('custom');
    setCustomQuestionText(q.questionText || q.question || '');
    if (q.options && q.options.length >= 4) {
      setOptA(q.options[0] || '');
      setOptB(q.options[1] || '');
      setOptC(q.options[2] || '');
      setOptD(q.options[3] || '');
    }
    setCorrectOption(String(q.correctAnswer || 0));
    setExplanation(q.explanation || '');

    setDraftQuestions(draftQuestions.filter(item => item.id !== q.id));
    toast.success('Question loaded into Custom Editor for modification!');
  };

  // Publish Draft / Existing Exam
  const handlePublishExam = async () => {
    if (!examTitle.trim()) {
      toast.error('Please enter an exam title.');
      return;
    }
    if (!examDesc.trim()) {
      toast.error('Please enter an exam description.');
      return;
    }
    if (draftQuestions.length === 0) {
      toast.error('Please add at least one question to the draft.');
      return;
    }

    const payload = {
      title: examTitle.trim(),
      description: examDesc.trim(),
      duration: Number(examDuration),
      difficulty: examDifficulty,
      isActive: true,
      questions: draftQuestions.map(q => ({
        questionText: q.questionText || q.question || '',
        options: q.options || [],
        correctAnswer: Number(q.correctAnswer) || 0,
        explanation: q.explanation || ''
      }))
    };

    const loadingToast = toast.loading('Publishing assessment...');

    try {
      const token = getAuthToken('vault') || localStorage.getItem('auth_token');
      const isMongoId = editingExamId && !String(editingExamId).startsWith('draft-') && !String(editingExamId).startsWith('local_');

      if (isMongoId) {
        await axios.put(`/api/mentor-exams/${editingExamId}`, payload, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
      } else {
        await axios.post('/api/mentor-exams', payload, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
      }

      toast.dismiss(loadingToast);

      // Clean local working draft if editing a local draft
      if (editingExamId) {
        const localDrafts = localStorage.getItem('mentor_exams_drafts');
        if (localDrafts) {
          try {
            let drafts = JSON.parse(localDrafts);
            drafts = drafts.filter(d => (d._id || d.id) !== editingExamId);
            localStorage.setItem('mentor_exams_drafts', JSON.stringify(drafts));
          } catch(e) {}
        }
      }

      toast.success('Assessment published successfully!');
      navigate('/admin/exams');
    } catch (err) {
      toast.dismiss(loadingToast);
      console.error('Publish exam error:', err);

      const fallbackExam = {
        _id: editingExamId || ('local_' + Date.now()),
        ...payload,
        isActive: true,
        dateCreated: new Date().toISOString()
      };
      
      const localDrafts = localStorage.getItem('mentor_exams_drafts');
      let draftsList = [];
      if (localDrafts) {
        try { draftsList = JSON.parse(localDrafts); } catch(e) {}
      }
      draftsList = draftsList.filter(d => (d._id || d.id) !== editingExamId);
      draftsList.push(fallbackExam);
      localStorage.setItem('mentor_exams_drafts', JSON.stringify(draftsList));
      
      toast.success('Assessment saved locally as backup!');
      navigate('/admin/exams');
    }
  };

  // Save as Draft (New or Existing Exam)
  const handleSaveDraft = async () => {
    if (!examTitle.trim()) {
      toast.error('Please enter an exam title to save draft.');
      return;
    }
    if (draftQuestions.length === 0) {
      toast.error('Please add at least one question to save draft.');
      return;
    }

    const payload = {
      title: examTitle.trim(),
      description: examDesc.trim() || 'Custom mentor exam draft.',
      duration: Number(examDuration) || 15,
      difficulty: examDifficulty || 'Intermediate',
      isActive: false,
      questions: draftQuestions.map(q => ({
        questionText: q.questionText || q.question || '',
        options: q.options || [],
        correctAnswer: Number(q.correctAnswer) || 0,
        explanation: q.explanation || ''
      }))
    };

    const loadingToast = toast.loading('Saving draft assessment...');

    try {
      const token = getAuthToken('vault') || localStorage.getItem('auth_token');
      const isMongoId = editingExamId && !String(editingExamId).startsWith('draft-') && !String(editingExamId).startsWith('local_');

      if (isMongoId) {
        await axios.put(`/api/mentor-exams/${editingExamId}`, payload, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
      } else {
        await axios.post('/api/mentor-exams', payload, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
      }

      toast.dismiss(loadingToast);
      toast.success('Assessment saved as Draft successfully!');
      navigate('/admin/exams');
    } catch (err) {
      toast.dismiss(loadingToast);
      console.error('Save draft error:', err);

      const fallbackExam = {
        _id: editingExamId || ('draft_' + Date.now()),
        ...payload,
        status: 'Draft',
        dateCreated: new Date().toISOString()
      };
      
      const localDrafts = localStorage.getItem('mentor_exams_drafts');
      let draftsList = [];
      if (localDrafts) {
        try { draftsList = JSON.parse(localDrafts); } catch(e) {}
      }
      draftsList = draftsList.filter(d => (d._id || d.id) !== editingExamId);
      draftsList.push(fallbackExam);
      localStorage.setItem('mentor_exams_drafts', JSON.stringify(draftsList));
      
      toast.success('Assessment saved to local drafts!');
      navigate('/admin/exams');
    }
  };

  // Filter bank questions based on search (1 question at a time view)
  const currentBank = questionBanks[selectedCategory] || [];
  const allFilteredBank = currentBank.filter(q =>
    q.question.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = allFilteredBank.length;
  const currentQuestion = allFilteredBank[bankPage - 1] || null;

  const { RefreshButton, RefreshOverlay } = useAdminRefresh();

  const isFromExams = Boolean(location.state?.fromExams || location.state?.draftToEdit);
  const backDestination = isFromExams ? '/admin/exams' : '/admin/dashboard';
  const backLabel = isFromExams ? 'Published & Draft Assessments' : 'Dashboard';

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
            onClick={() => navigate(backDestination)}
            className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-900 font-extrabold py-2 px-3.5 sm:px-4 rounded-xl text-xs transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <span className="text-sm">←</span> <span>{backLabel}</span>
          </button>
          {isFromExams && (
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-600 font-bold py-2 px-3 rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
            >
              Dashboard
            </button>
          )}
        </div>

        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Exam Generator</h1>
          <p className="text-xs text-gray-400 mt-1">Build and publish active assessments for your students</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            
            {/* Left/Middle Column (Tab content forms) */}
            <div className="xl:col-span-2 space-y-6 text-left">
              
              {/* Tab Selector Buttons */}
              <div className="bg-white p-1.5 rounded-2xl border border-gray-200 flex gap-1 shadow-sm">
                <button
                  onClick={() => setActiveTab('custom')}
                  className={`flex-1 py-3 px-4 rounded-xl text-xs font-extrabold tracking-wider transition-all flex items-center justify-center gap-2 ${
                    activeTab === 'custom'
                      ? 'bg-gray-900 text-white shadow-sm'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                  }`}
                >
                  <span>✏️</span> Create Custom Question
                </button>
                <button
                  onClick={() => setActiveTab('bank')}
                  className={`flex-1 py-3 px-4 rounded-xl text-xs font-extrabold tracking-wider transition-all flex items-center justify-center gap-2 ${
                    activeTab === 'bank'
                      ? 'bg-gray-900 text-white shadow-sm'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                  }`}
                >
                  <span>📚</span> Select from Question Bank
                </button>
              </div>

              {/* Tab 1: Custom Question Form */}
              {activeTab === 'custom' && (
                <div className="bg-white/80 backdrop-blur-lg border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-3xl p-6">
                  <h2 className="text-base font-extrabold text-gray-900 mb-5 flex items-center gap-2">
                    <span>📝</span> Question Design Form
                  </h2>

                  <form onSubmit={handleAddCustomQuestion} className="space-y-4">
                    <div>
                      <label className="block text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-2">Question Text</label>
                      <textarea
                        rows={3}
                        value={customQuestionText}
                        onChange={(e) => setCustomQuestionText(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-black focus:bg-white focus:outline-none transition-all text-sm font-semibold"
                        placeholder="Type the question content here..."
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-2">Option A</label>
                        <input
                          type="text"
                          value={optA}
                          onChange={(e) => setOptA(e.target.value)}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-black focus:bg-white focus:outline-none transition-all text-sm font-semibold"
                          placeholder="Option A value"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-2">Option B</label>
                        <input
                          type="text"
                          value={optB}
                          onChange={(e) => setOptB(e.target.value)}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-black focus:bg-white focus:outline-none transition-all text-sm font-semibold"
                          placeholder="Option B value"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-2">Option C</label>
                        <input
                          type="text"
                          value={optC}
                          onChange={(e) => setOptC(e.target.value)}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-black focus:bg-white focus:outline-none transition-all text-sm font-semibold"
                          placeholder="Option C value"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-2">Option D</label>
                        <input
                          type="text"
                          value={optD}
                          onChange={(e) => setOptD(e.target.value)}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-black focus:bg-white focus:outline-none transition-all text-sm font-semibold"
                          placeholder="Option D value"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                      <div className="md:col-span-1">
                        <label className="block text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-2">Correct Answer</label>
                        <select
                          value={correctOption}
                          onChange={(e) => setCorrectOption(e.target.value)}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-black focus:bg-white focus:outline-none transition-all text-sm font-semibold"
                        >
                          <option value="0">Option A</option>
                          <option value="1">Option B</option>
                          <option value="2">Option C</option>
                          <option value="3">Option D</option>
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-2">Explanation (Optional)</label>
                        <input
                          type="text"
                          value={explanation}
                          onChange={(e) => setExplanation(e.target.value)}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-black focus:bg-white focus:outline-none transition-all text-sm font-semibold"
                          placeholder="Explain correct option..."
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-black hover:bg-gray-900 text-white font-extrabold py-3.5 rounded-xl text-sm shadow-sm transition-all active:scale-95 mt-4"
                    >
                      ➕ Add to Exam
                    </button>
                  </form>
                </div>
              )}

              {/* Tab 2: Question Bank Explorer (1 Question at a time) */}
              {activeTab === 'bank' && (
                <div className="bg-white/80 backdrop-blur-lg border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-3xl p-6 flex flex-col min-h-[520px]">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                      <span>📚</span> Question Bank Explorer
                    </h2>
                    <span className="text-xs font-black text-blue-600 bg-blue-50 border border-blue-100 rounded-full px-3 py-1">
                      1 Question View
                    </span>
                  </div>

                  {/* Filter controls */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                    <div>
                      <label className="block text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-2">Category / Subject</label>
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-black focus:bg-white focus:outline-none transition-all text-sm font-bold text-gray-700 cursor-pointer"
                      >
                        {categories.map(cat => (
                          <option key={cat.key} value={cat.key}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-2">Search Questions</label>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-black focus:bg-white focus:outline-none transition-all text-sm font-semibold"
                        placeholder="Filter by keywords..."
                      />
                    </div>
                  </div>

                  {/* Single Question Display Area */}
                  <div className="flex-1 flex flex-col justify-between border border-gray-100 rounded-2xl p-5 bg-gray-50/50 shadow-inner min-h-[280px]">
                    {!currentQuestion ? (
                      <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 p-8">
                        <p className="text-3xl mb-2">🔍</p>
                        <p className="font-bold text-sm text-gray-700">No questions found</p>
                        <p className="text-xs text-gray-400 mt-1">Try tweaking your search keywords or category</p>
                      </div>
                    ) : (
                      (() => {
                        const isAdded = draftQuestions.some(q => q.id === currentQuestion.id);
                        return (
                          <div className="flex flex-col h-full justify-between space-y-4">
                            <div className="space-y-4 text-left">
                              <div className="flex items-center justify-between gap-2 border-b border-gray-200/60 pb-3">
                                <span className="text-[11px] font-black text-gray-500 uppercase tracking-wider bg-white px-3 py-1 rounded-lg border border-gray-200 shadow-2xs">
                                  {currentQuestion.category || selectedCategory}
                                </span>
                                <span className="text-xs font-extrabold text-gray-400 font-mono">
                                  #{bankPage} of {totalPages}
                                </span>
                              </div>

                              <h3 className="text-sm md:text-base font-extrabold text-gray-900 leading-relaxed">
                                {currentQuestion.question}
                              </h3>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                                {currentQuestion.options.map((opt, i) => (
                                  <div
                                    key={i}
                                    className="flex items-start gap-2.5 p-3 rounded-xl bg-white border border-gray-200 text-xs font-semibold text-gray-800 shadow-2xs"
                                  >
                                    <span className="font-black text-blue-600 shrink-0 bg-blue-50 px-2 py-0.5 rounded-md">
                                      {String.fromCharCode(65 + i)}
                                    </span>
                                    <span className="leading-snug">{opt}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Add to Exam Action */}
                            <div className="pt-3 flex justify-end">
                              <button
                                type="button"
                                onClick={() => handleAddBankQuestion(currentQuestion)}
                                disabled={isAdded}
                                className={`w-full sm:w-auto py-3 px-6 rounded-xl text-xs font-black tracking-wide transition-all shadow-sm shrink-0 border cursor-pointer ${
                                  isAdded
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 cursor-default'
                                    : 'bg-black text-white hover:bg-gray-900 border-black active:scale-95'
                                }`}
                              >
                                {isAdded ? '✓ Added to Exam Draft' : '➕ Add Question to Draft'}
                              </button>
                            </div>
                          </div>
                        );
                      })()
                    )}
                  </div>

                  {/* Single Question Navigation Bar */}
                  {allFilteredBank.length > 0 && (
                    <div className="flex items-center justify-between gap-2 pt-4 mt-4 border-t border-gray-100 text-xs">
                      <button
                        type="button"
                        onClick={() => setBankPage(p => Math.max(1, p - 1))}
                        disabled={bankPage === 1}
                        className="px-4 py-2 bg-white border border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
                      >
                        <span>←</span> Previous
                      </button>

                      <div className="flex items-center gap-2">
                        <span className="font-black text-gray-800 bg-gray-100 border border-gray-200/80 rounded-xl px-3 py-1.5 font-mono">
                          {bankPage} / {totalPages}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setBankPage(p => Math.min(totalPages, p + 1))}
                        disabled={bankPage >= totalPages}
                        className="px-4 py-2 bg-white border border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
                      >
                        Next <span>→</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Right Column: Draft details & config */}
            <div className="space-y-6 text-left">
              
              {/* Draft Configuration */}
              <div className="bg-white/80 backdrop-blur-lg border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-3xl p-6 flex flex-col">
                <h2 className="text-base font-extrabold text-gray-900 mb-5 flex items-center gap-2">
                  <span>⚙️</span> Exam Specifications
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-2">Exam Title</label>
                    <input
                      type="text"
                      value={examTitle}
                      onChange={(e) => setExamTitle(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-black focus:bg-white focus:outline-none transition-all text-sm font-extrabold text-gray-800"
                      placeholder="Title of this Assessment"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-2">Description</label>
                    <textarea
                      rows={2}
                      value={examDesc}
                      onChange={(e) => setExamDesc(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-black focus:bg-white focus:outline-none transition-all text-sm font-semibold"
                      placeholder="Brief evaluation description..."
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-2">Duration (Minutes)</label>
                      <input
                        type="number"
                        min={5}
                        max={180}
                        value={examDuration}
                        onChange={(e) => setExamDuration(parseInt(e.target.value) || 15)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-black focus:bg-white focus:outline-none transition-all text-sm font-extrabold text-gray-800"
                        placeholder="Duration"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-2">Difficulty</label>
                      <select
                        value={examDifficulty}
                        onChange={(e) => setExamDifficulty(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-black focus:bg-white focus:outline-none transition-all text-sm font-extrabold text-gray-800 cursor-pointer"
                      >
                        <option value="Beginner">Beginner</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Advanced">Advanced</option>
                        <option value="Expert">Expert</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Current Draft List */}
              <div className="bg-white/80 backdrop-blur-lg border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-3xl p-6 flex flex-col min-h-[500px] justify-between">
                <div>
                  <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-4">
                    <div>
                      <h2 className="text-base font-extrabold text-gray-900">Current Exam Draft</h2>
                      <p className="text-xs text-gray-400 mt-0.5">{draftQuestions.length} Questions Drafted</p>
                    </div>
                    <span className="text-xs font-black text-gray-600 bg-gray-100 rounded-full px-3 py-1 font-mono">
                      {examDuration} MINS
                    </span>
                  </div>

                  {/* Draft questions list with expandable rows */}
                  <div className="overflow-y-auto space-y-3 pr-1 bg-gray-50/50 border border-gray-100 rounded-2xl p-3 min-h-[300px] max-h-[480px]">
                  {draftQuestions.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 p-6">
                      <p className="text-xl mb-1.5">📝</p>
                      <p className="font-bold text-xs">No questions added yet</p>
                      <p className="text-[10px] mt-0.5">Use custom form or question bank to build your exam</p>
                    </div>
                  ) : (
                    draftQuestions.map((q, idx) => {
                      const isExpanded = expandedDraftId === q.id;
                      return (
                        <div 
                          key={q.id}
                          className="bg-white/90 backdrop-blur-lg border border-gray-200/80 shadow-2xs rounded-2xl p-3.5 transition-all hover:border-gray-300"
                        >
                          {/* Header Row (Click to toggle expand) */}
                          <div className="flex justify-between items-center gap-2">
                            <div 
                              className="flex-1 min-w-0 text-left cursor-pointer select-none"
                              onClick={() => setExpandedDraftId(isExpanded ? null : q.id)}
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[10px] font-black text-gray-400 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-md">
                                  #{idx + 1}
                                </span>
                                <span className="text-[10px] font-extrabold text-blue-600">
                                  {isExpanded ? 'Hide Details ▲' : 'View Details ▼'}
                                </span>
                              </div>
                              <p className="text-xs font-bold text-gray-900 truncate mt-1">
                                {q.questionText}
                              </p>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleEditQuestionInDraft(q)}
                                className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100 flex items-center justify-center text-xs font-bold active:scale-95 transition-all cursor-pointer"
                                title="Edit question text and options"
                              >
                                ✏️
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveQuestion(q.id)}
                                className="w-7 h-7 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 border border-red-100 flex items-center justify-center text-xs font-bold active:scale-95 transition-all cursor-pointer"
                                title="Remove question from draft"
                              >
                                ✕
                              </button>
                            </div>
                          </div>

                          {/* Expanded Details Body */}
                          {isExpanded && (
                            <div className="mt-3 pt-3 border-t border-gray-100 space-y-3 text-left animate-in fade-in duration-150">
                              <p className="text-xs font-bold text-gray-900 leading-relaxed">
                                {q.questionText}
                              </p>

                              {q.options && q.options.length > 0 && (
                                <div className="grid grid-cols-1 gap-1.5 text-xs">
                                  {q.options.map((opt, i) => {
                                    const isCorrect = i === q.correctAnswer;
                                    return (
                                      <div
                                        key={i}
                                        className={`p-2 rounded-xl border flex items-center justify-between text-xs font-semibold ${
                                          isCorrect
                                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-bold'
                                            : 'bg-gray-50 text-gray-700 border-gray-200'
                                        }`}
                                      >
                                        <div className="flex items-center gap-2">
                                          <span className={`font-mono text-[10px] font-black px-1.5 py-0.5 rounded ${isCorrect ? 'bg-emerald-200 text-emerald-900' : 'bg-gray-200 text-gray-600'}`}>
                                            {String.fromCharCode(65 + i)}
                                          </span>
                                          <span>{opt}</span>
                                        </div>
                                        {isCorrect && <span className="text-xs font-black text-emerald-600">✓ Correct</span>}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {q.explanation && (
                                <p className="text-[11px] text-gray-500 bg-amber-50/60 border border-amber-200/60 p-2.5 rounded-xl italic">
                                  💡 {q.explanation}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
                </div>

                {/* Action Buttons: Save as Draft & Publish Assessment */}
                <div className="pt-4 mt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={draftQuestions.length === 0}
                    className={`w-full sm:w-1/2 py-3.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all flex items-center justify-center gap-2 border ${
                      draftQuestions.length > 0
                        ? 'bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-300 cursor-pointer active:scale-95'
                        : 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
                    }`}
                  >
                    💾 Save as Draft
                  </button>

                  <button
                    type="button"
                    onClick={handlePublishExam}
                    disabled={draftQuestions.length === 0}
                    className={`w-full sm:w-1/2 py-3.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 ${
                      draftQuestions.length > 0 
                        ? 'bg-black text-white hover:bg-gray-900 cursor-pointer active:scale-95' 
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200/50'
                    }`}
                  >
                    🚀 Publish Assessment
                  </button>
                </div>
              </div>

            </div>

          </div>
        </main>

        <footer className="w-full text-center py-6 text-xs text-gray-400 font-semibold tracking-wide border-t border-gray-150 bg-white/40 backdrop-blur-md mt-auto z-20">
          Skill Bridge India
        </footer>
    </div>
  );
}

export default AdminExamGenerator;
