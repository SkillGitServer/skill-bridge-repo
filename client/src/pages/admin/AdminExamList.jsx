import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import toast from 'react-hot-toast';
import axios from 'axios';
import { getAuthToken, logoutUser } from '../../utils/auth';
import { useAdminRefresh } from '../../components/admin/AdminRefresh';
import AdminHeader from '../../components/admin/AdminHeader';

function AdminExamList() {
  useDocumentTitle('Exam Roster | Skill Bridge India');
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [selectedExamModal, setSelectedExamModal] = useState(null);

  const fetchExams = async () => {
    try {
      const token = getAuthToken('vault') || localStorage.getItem('auth_token');
      const res = await axios.get('/api/mentor-exams', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const dbExams = (res.data || []).map(exam => ({
        id: exam._id,
        title: exam.title,
        description: exam.description || 'Evaluation of core competencies and technical skills.',
        category: exam.title.includes('React') ? 'Frontend Web' : 
                  exam.title.includes('Aptitude') ? 'Aptitude' : 
                  exam.title.includes('REST') ? 'Backend Dev' : 'General Assessment',
        duration: exam.duration,
        status: exam.isActive ? 'Active' : 'Draft',
        questionsCount: exam.totalQuestions || (exam.questions ? exam.questions.length : 0),
        questions: exam.questions || [],
        date: new Date(exam.createdAt || exam.dateCreated).toLocaleDateString('en-IN', {
          day: '2-digit', month: 'short', year: 'numeric'
        })
      }));

      const list = [...dbExams];
      // Load custom drafts from localStorage
      const localDrafts = localStorage.getItem('mentor_exams_drafts');
      if (localDrafts) {
        try {
          const drafts = JSON.parse(localDrafts);
          drafts.forEach((draft, idx) => {
            if (!list.some(e => e.title === draft.title || e.id === draft._id)) {
              list.unshift({
                id: draft._id || `draft-${idx}`,
                title: draft.title || 'Untitled Assessment',
                description: draft.description || 'Custom mentor exam draft saved locally.',
                category: draft.category || 'General',
                duration: parseInt(draft.duration) || 30,
                status: 'Draft',
                questionsCount: draft.questions ? draft.questions.length : 0,
                questions: draft.questions || [],
                date: 'Saved locally'
              });
            }
          });
        } catch (e) {}
      }

      setExams(list);
    } catch (err) {
      console.error('Failed to fetch exams:', err);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const { RefreshButton, RefreshOverlay } = useAdminRefresh(fetchExams);

  const handlePublishDraft = async (exam) => {
    try {
      const payload = {
        title: exam.title || 'Custom Assessment',
        description: exam.description || 'Evaluation of core competencies.',
        duration: Number(exam.duration) || 15,
        difficulty: exam.difficulty || 'Intermediate',
        isActive: true,
        questions: (exam.questions || []).map(q => ({
          questionText: q.questionText || q.question || '',
          options: q.options || [],
          correctAnswer: Number(q.correctAnswer) || 0,
          explanation: q.explanation || ''
        }))
      };

      const token = getAuthToken('vault') || localStorage.getItem('auth_token');
      const isMongoId = exam.id && !String(exam.id).startsWith('draft-') && !String(exam.id).startsWith('local_');

      if (isMongoId) {
        // Update existing draft document in MongoDB to Active in-place
        await axios.put(`/api/mentor-exams/${exam.id}`, payload, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
      } else {
        // Create new active exam in MongoDB
        await axios.post('/api/mentor-exams', payload, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
      }

      // Remove from local drafts if present in localStorage
      const localDrafts = localStorage.getItem('mentor_exams_drafts');
      if (localDrafts) {
        try {
          let drafts = JSON.parse(localDrafts);
          drafts = drafts.filter(d => (d._id || d.id || `draft-0`) !== exam.id && d.title !== exam.title);
          localStorage.setItem('mentor_exams_drafts', JSON.stringify(drafts));
        } catch (e) {}
      }

      toast.success(`"${exam.title}" published to platform successfully!`);
      fetchExams();
    } catch (err) {
      console.error('Error publishing draft:', err);
      toast.error('Failed to publish draft. Please check server connection.');
    }
  };

  const [examToDelete, setExamToDelete] = useState(null);

  const handleDeleteExam = (exam) => {
    setExamToDelete(exam);
  };

  const confirmDeleteExam = async () => {
    if (!examToDelete) return;
    const exam = examToDelete;
    setExamToDelete(null);

    if (exam.status === 'Draft' || exam.id.toString().startsWith('draft-') || exam.id.toString().startsWith('local_')) {
      try {
        const localDrafts = localStorage.getItem('mentor_exams_drafts');
        if (localDrafts) {
          let drafts = JSON.parse(localDrafts);
          drafts = drafts.filter(d => (d._id || d.id || `draft-0`) !== exam.id);
          localStorage.setItem('mentor_exams_drafts', JSON.stringify(drafts));
        }
        toast.success('Local draft deleted.');
        fetchExams();
      } catch (e) {
        console.error(e);
      }
      return;
    }

    // Delete published exam from MongoDB database
    try {
      const token = getAuthToken('vault') || localStorage.getItem('auth_token');
      await axios.delete(`/api/mentor-exams/${exam.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      toast.success('Assessment deleted from database successfully!');
      fetchExams();
    } catch (err) {
      console.error('Error deleting exam:', err);
      toast.error('Failed to delete assessment from database.');
    }
  };

  const handleLogout = () => {
    logoutUser('admin', navigate);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Active':
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs px-2.5 py-1 rounded-full font-bold">● Active</span>;
      case 'Draft':
        return <span className="bg-amber-100 text-amber-800 border border-amber-300 text-xs px-2.5 py-1 rounded-full font-bold">✍️ Local Draft</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 border border-gray-300 text-xs px-2.5 py-1 rounded-full font-bold">Archived</span>;
    }
  };

  return (
    <div className="bg-transparent min-h-screen font-sans text-gray-900 w-full flex flex-col text-left">
      {RefreshOverlay}
      <AdminHeader refreshButton={RefreshButton} />

      {/* ── Main content area ── */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-6 md:p-8 space-y-6">
        
        {/* Navigation Bar & Create Action Button */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold py-2 px-3.5 sm:px-4 rounded-xl text-xs transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <span className="text-sm">←</span> <span>Dashboard</span>
          </button>

          <button
            onClick={() => navigate('/admin/exam-generator', { state: { fromExams: true } })}
            className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-2 px-3 sm:px-4 rounded-xl text-xs tracking-wider uppercase transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <span>➕</span>
            <span className="hidden sm:inline">Create New Exam</span>
            <span className="sm:hidden">Create Exam</span>
          </button>
        </div>

        {/* Header Title */}
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Published & Draft Assessments</h1>
          <p className="text-xs text-gray-400 mt-1">Review active, draft, and expired evaluations created for your student pool</p>
        </div>

        {/* Exam Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exams.map((exam) => (
            <div 
              key={exam.id} 
              className="bg-white/80 backdrop-blur-lg border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-3xl p-6 shadow-md hover:shadow-lg transition-shadow duration-200 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider bg-gray-50 border border-gray-150 px-2 py-0.5 rounded text-gray-500">
                    {exam.category}
                  </span>
                  
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold border uppercase tracking-wider ${getStatusBadge(exam.status)}`}>
                    {exam.status}
                  </span>
                </div>

                <h3 className="text-base font-extrabold text-gray-900 tracking-tight leading-snug line-clamp-2">
                  {exam.title}
                </h3>
              </div>

              <div className="border-t border-gray-100 pt-4 flex justify-between items-center text-xs text-gray-500 font-semibold">
                <span className="flex items-center gap-1">
                  ⏱️ {exam.duration} mins
                </span>
                <span className="flex items-center gap-1">
                  ❓ {exam.questionsCount} Questions
                </span>
              </div>

              <div className="pt-2 space-y-2 border-t border-gray-100/60">
                <div className="grid grid-cols-2 gap-2 w-full">
                  <button
                    onClick={() => setSelectedExamModal(exam)}
                    className="bg-gray-900 hover:bg-black text-white font-extrabold py-2.5 px-3 rounded-xl text-xs transition-all shadow-xs cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 w-full"
                  >
                    <span>👁️</span> <span>Details</span>
                  </button>
                  
                  <button
                    onClick={() => navigate('/admin/exam-generator', { state: { fromExams: true, draftToEdit: exam } })}
                    className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 font-extrabold py-2.5 px-3 rounded-xl text-xs transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 w-full"
                    title="Edit assessment questions and details"
                  >
                    <span>✏️</span> <span>Edit</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 w-full pt-0.5">
                  {exam.status === 'Draft' || exam.status === 'Closed' ? (
                    <button
                      onClick={() => handlePublishDraft(exam)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 px-3 rounded-xl text-xs transition-all shadow-xs cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 w-full"
                      title="Publish this assessment live to assigned students"
                    >
                      <span>🚀</span> <span>Publish</span>
                    </button>
                  ) : (
                    <div className="flex items-center justify-center bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider rounded-xl border border-emerald-200 px-2 py-2.5">
                      ✓ Live Active
                    </div>
                  )}

                  <button
                    onClick={() => handleDeleteExam(exam)}
                    className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200/80 font-extrabold py-2.5 px-3 rounded-xl text-xs transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 w-full"
                    title="Delete assessment"
                  >
                    <span>🗑️</span> <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

      </main>

      {/* ── Assessment Details & Questions Modal ── */}
      {selectedExamModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white/95 backdrop-blur-xl border border-white/80 shadow-[0_20px_60px_rgba(0,0,0,0.3)] rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden text-left animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-start gap-4 bg-gray-50/50">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-gray-200 text-gray-700 px-2.5 py-0.5 rounded-md font-mono">
                    {selectedExamModal.category}
                  </span>
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md ${
                    selectedExamModal.status === 'Active' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}>
                    {selectedExamModal.status}
                  </span>
                </div>
                <h2 className="text-xl font-black text-gray-900 tracking-tight leading-snug">
                  {selectedExamModal.title}
                </h2>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  {selectedExamModal.description || 'Evaluation of candidate knowledge and core problem-solving aptitude.'}
                </p>
              </div>

              <button
                onClick={() => setSelectedExamModal(null)}
                className="w-9 h-9 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold flex items-center justify-center text-sm transition-all cursor-pointer shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Quick Metadata Bar */}
            <div className="px-6 py-3 bg-gray-100/60 border-b border-gray-100 flex items-center justify-between text-xs font-extrabold text-gray-600">
              <span className="flex items-center gap-1.5">
                ⏱️ Duration: <strong className="text-gray-900">{selectedExamModal.duration} Mins</strong>
              </span>
              <span className="flex items-center gap-1.5">
                ❓ Total Questions: <strong className="text-gray-900">{selectedExamModal.questionsCount}</strong>
              </span>
              <span className="flex items-center gap-1.5 hidden sm:flex">
                📅 Created: <strong className="text-gray-900">{selectedExamModal.date}</strong>
              </span>
            </div>

            {/* Questions Roster */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4 max-h-[60vh]">
              {!selectedExamModal.questions || selectedExamModal.questions.length === 0 ? (
                <div className="text-center py-12 text-gray-400 font-extrabold text-xs bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                  <p className="text-2xl mb-2">📋</p>
                  <p>No questions detailed in this custom assessment.</p>
                </div>
              ) : (
                selectedExamModal.questions.map((q, idx) => (
                  <div 
                    key={idx}
                    className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-xs space-y-3"
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="font-mono text-xs font-black text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-lg shrink-0">
                        #{idx + 1}
                      </span>
                      <h4 className="text-xs font-extrabold text-gray-900 leading-relaxed pt-0.5">
                        {q.questionText || q.question}
                      </h4>
                    </div>

                    {q.options && q.options.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {q.options.map((opt, i) => {
                          const isCorrect = i === q.correctAnswer;
                          return (
                            <div
                              key={i}
                              className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-semibold ${
                                isCorrect
                                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300 font-extrabold shadow-2xs'
                                  : 'bg-gray-50/60 text-gray-700 border-gray-200'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className={`font-mono text-[10px] font-black px-1.5 py-0.5 rounded ${
                                  isCorrect ? 'bg-emerald-200 text-emerald-950' : 'bg-gray-200 text-gray-600'
                                }`}>
                                  {String.fromCharCode(65 + i)}
                                </span>
                                <span>{opt}</span>
                              </div>
                              {isCorrect && (
                                <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded-md">
                                  ✓ Correct Option
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {q.explanation && (
                      <div className="text-[11px] text-amber-800 bg-amber-50/70 border border-amber-200 p-2.5 rounded-xl italic leading-relaxed">
                        💡 <strong>Explanation:</strong> {q.explanation}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
              <span className="text-xs text-gray-400 font-bold font-mono">
                Skill Bridge India Assessment Vault
              </span>
              <button
                onClick={() => setSelectedExamModal(null)}
                className="bg-black hover:bg-gray-900 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs transition-all shadow-sm cursor-pointer active:scale-95"
              >
                Close Window
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── Amber Confirmation Modal for Delete ── */}
      {examToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-amber-50/95 backdrop-blur-xl border border-amber-300 shadow-[0_20px_50px_rgba(245,158,11,0.25)] rounded-3xl max-w-md w-full p-6 text-center space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-14 h-14 bg-amber-100 border border-amber-300 text-amber-600 rounded-2xl flex items-center justify-center text-2xl mx-auto shadow-inner">
              ⚠️
            </div>
            
            <div>
              <h3 className="text-lg font-black text-amber-950 tracking-tight">Delete Assessment?</h3>
              <p className="text-xs text-amber-900/80 mt-1.5 leading-relaxed font-semibold">
                Are you sure you want to delete <strong className="text-amber-950 font-black">"{examToDelete.title}"</strong>? This will permanently remove it from the platform.
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setExamToDelete(null)}
                className="flex-1 bg-white hover:bg-amber-100/60 text-amber-900 border border-amber-200 font-extrabold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteExam}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-black py-2.5 px-4 rounded-xl text-xs transition-all shadow-sm cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
              >
                <span>🗑️</span> <span>Confirm Delete</span>
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

export default AdminExamList;
