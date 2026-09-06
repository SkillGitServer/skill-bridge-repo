import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import toast from 'react-hot-toast';
import axios from 'axios';
import Hero from '../../components/landing/Hero';
import LandingSections from '../../components/landing/LandingSections';
import Navbar from '../../components/shared/Navbar';
import Footer from '../../components/shared/Footer';
import { defaultLandingContent } from '../../constants/landingDefaults';
import { useSupsRefresh } from '../../components/super-admin/SuperAdminRefresh';
import { logoutUser } from '../../utils/auth';

function SuperAdminLandingEditor() {
  useDocumentTitle('WYSIWYG Landing Page Visual Editor | Super Admin');
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deviceMode, setDeviceMode] = useState('desktop'); // 'desktop' | 'mobile'

  const [formData, setFormData] = useState({
    ...defaultLandingContent
  });

  // Synchronous ref to prevent stale state closure on save
  const formDataRef = React.useRef({
    ...defaultLandingContent
  });

  // Fetch current landing content on load
  useEffect(() => {
    const fetchContent = async () => {
      setIsLoading(true);
      try {
        const res = await axios.get('/api/landing-content');
        if (res.data) {
          const merged = { ...defaultLandingContent, ...res.data };
          formDataRef.current = merged;
          setFormData(merged);
        }
      } catch (err) {
        console.error('Failed to load landing content:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchContent();
  }, []);

  const handleFieldChange = (fieldName, newValue, options) => {
    formDataRef.current = {
      ...formDataRef.current,
      [fieldName]: newValue
    };
    if (!options || options.isBlur !== false) {
      setFormData({ ...formDataRef.current });
    }
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();

    // 1. Force blur on active element to trigger final input/blur listeners
    if (document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }

    setIsSaving(true);

    // Get absolute latest data from ref
    const payload = { ...formDataRef.current };

    try {
      localStorage.setItem('cbi_landing_content', JSON.stringify(payload));
    } catch (e) { }

    try {
      const res = await axios.put('/api/admin/landing-page', payload);
      toast.success('Public landing page updated successfully!');
      if (res.data?.content) {
        const updated = { ...defaultLandingContent, ...res.data.content };
        formDataRef.current = updated;
        setFormData(updated);
        try {
          localStorage.setItem('cbi_landing_content', JSON.stringify(updated));
        } catch (e) { }
      }
    } catch (err) {
      console.error('Save landing content error:', err);
      toast.error(err.response?.data?.error || 'Saved locally! (Backend sync failed)');
    } finally {
      setIsSaving(false);
    }
  };

  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);

  const handleResetDefaults = () => {
    setShowResetConfirmModal(true);
  };

  const handleLogout = () => {
    logoutUser('superadmin', navigate);
  };

  const { RefreshButton, RefreshOverlay } = useSupsRefresh();

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-indigo-100 via-purple-50 to-fuchsia-100 font-sans text-gray-900 flex flex-col select-none">
      {RefreshOverlay}

      {/* ── Top Navigation & Controls Header ── */}
      <header className="w-full bg-white/90 backdrop-blur-xl border-b border-gray-200/80 px-3 md:px-6 py-3 flex items-center justify-between gap-2 sticky top-0 z-[100] shadow-sm">

        {/* Left: Brand & Page Title */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={() => navigate('/super-admin/dashboard')}
            className="flex items-center justify-center p-1.5 sm:p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-all cursor-pointer border border-gray-300 shadow-xs active:scale-95 shrink-0"
            title="Back to Super Admin Dashboard"
          >
            <ArrowLeft size={16} className="sm:w-4 sm:h-4 text-gray-700" />
          </button>
          <div className="flex items-center gap-1.5 sm:gap-2 cursor-pointer" onClick={() => navigate('/super-admin/dashboard')}>
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)] animate-pulse shrink-0"></span>
            <span className="text-xs sm:text-base font-black tracking-wider uppercase text-gray-900 whitespace-nowrap">Skill Sups</span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <button
            onClick={handleResetDefaults}
            className="text-[11px] sm:text-xs font-bold text-gray-600 hover:text-gray-900 transition-colors cursor-pointer px-2 sm:px-3 py-1.5 whitespace-nowrap"
          >
            <span className="hidden sm:inline">Reset Defaults</span>
            <span className="sm:hidden">Reset</span>
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-[11px] sm:text-xs font-black px-3 sm:px-5 py-2 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            {isSaving ? (
              <>
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <span className="text-xs">💾</span>
                <span className="hidden sm:inline">Save Changes</span>
                <span className="sm:hidden">Save</span>
              </>
            )}
          </button>
        </div>

      </header>

      {/* ── Main Visual Editor Canvas ── */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-2 sm:px-4 md:px-6 py-6 flex flex-col">

        {/* Container Device Frame */}
        <div
          style={{ transform: 'translate(0, 0)' }}
          className="w-full bg-white rounded-2xl sm:rounded-3xl border border-gray-200 shadow-xl overflow-x-hidden relative text-gray-900"
        >

          {/* Rendered Live Landing Page Components with Direct Inline Edit Handlers */}
          <div
            className="relative w-full max-w-full overflow-x-hidden"
            onClickCapture={(e) => {
              // Intercept normal link clicks inside visual editor to prevent unwanted page navigation,
              // while letting contenteditable elements, buttons, and social edit icons pass through!
              const target = e.target;
              if (
                target.getAttribute('contenteditable') === 'true' ||
                target.closest('button') ||
                target.closest('[data-editable-social]')
              ) {
                return; // Allow direct focus, button clicks, and social edit modals
              }
              const anchor = target.closest('a');
              if (anchor) {
                e.preventDefault();
                e.stopPropagation();
                const editableChild = anchor.querySelector('[contenteditable="true"]');
                if (editableChild) {
                  editableChild.focus();
                }
              }
            }}
          >
            <Navbar />

            {/* Live Hero with contentOverride, isEditing=true, and onFieldChange */}
            <Hero
              contentOverride={formData}
              isEditing={true}
              onFieldChange={handleFieldChange}
            />

            {/* Live Landing Sections (contains Bridge AI + Instagram + WhatsApp Floating Buttons) */}
            <LandingSections
              contentOverride={formData}
              isEditing={true}
              onFieldChange={handleFieldChange}
              isEditorPreview={true}
            />

            {/* Live Footer with inline copyright editing */}
            <Footer
              contentOverride={formData}
              isEditing={true}
              onFieldChange={handleFieldChange}
            />
          </div>

        </div>

      </main>

      {/* ── Custom Styled Confirmation Modal ── */}
      {showResetConfirmModal && (
        <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#111111] border border-gray-800 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl text-left relative space-y-5 animate-scale-in">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-2xl shadow-inner">
                ⚠️
              </div>
              <button
                onClick={() => setShowResetConfirmModal(false)}
                className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center transition-colors text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div>
              <h3 className="text-xl font-black text-white tracking-tight">Reset Landing Page Content?</h3>
              <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                Are you sure you want to reset all marketing copy and page text back to system defaults? Any unsaved edits will be replaced.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-800/60">
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(false)}
                className="px-5 py-2.5 rounded-xl border border-gray-700 hover:bg-gray-800 text-gray-300 text-xs font-extrabold transition-all cursor-pointer min-h-[40px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const resetCopy = { ...defaultLandingContent };
                  formDataRef.current = resetCopy;
                  setFormData(resetCopy);
                  try {
                    localStorage.setItem('cbi_landing_content', JSON.stringify(resetCopy));
                  } catch (e) { }
                  setShowResetConfirmModal(false);
                  toast.success('Text reset to system defaults. Click "Save Changes" to publish!');
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-extrabold uppercase tracking-wider shadow-lg transition-all active:scale-95 cursor-pointer min-h-[40px]"
              >
                Reset to Defaults
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SuperAdminLandingEditor;