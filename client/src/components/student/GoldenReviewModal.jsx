import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Sparkles, Building, Briefcase, Calendar, Upload, Crown, Send, CheckCircle2 } from 'lucide-react';
import { getAuthToken } from '../../utils/auth';
import { API_BASE_URL } from '../../utils/api';

export default function GoldenReviewModal({
  isOpen,
  studentName: initialName = '',
  studentEmail = '',
  onSuccess
}) {
  const [name, setName] = useState(initialName || '');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [joiningDate, setJoiningDate] = useState('');
  const [photo, setPhoto] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (!name) {
      const storedName = localStorage.getItem('auth_name') || localStorage.getItem('student_name');
      if (storedName) setName(storedName);
    }
  }, [name]);

  const compressDataUrl = async (dataUrl) => {
    return new Promise((resolve) => {
      try {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            let width = img.width || 500;
            let height = img.height || 500;
            const maxDim = 500;
            if (width > height && width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.82));
          } catch {
            resolve(dataUrl);
          }
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
      } catch {
        resolve(dataUrl);
      }
    });
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const rawUrl = event.target.result;
      const compressed = await compressDataUrl(rawUrl);
      setPhoto(compressed);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter your name.');
      return;
    }
    if (!company.trim()) {
      toast.error('Please enter where you got the job (Company / Organization).');
      return;
    }
    if (!role.trim()) {
      toast.error('Please enter your job role/designation.');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = getAuthToken('spark');
      const url = '/api/reviews';

      let photoToSend = photo;
      if (photo && photo.length > 100000 && photo.startsWith('data:image/')) {
        photoToSend = await compressDataUrl(photo);
      }

      const payload = {
        name: name.trim(),
        email: studentEmail || localStorage.getItem('auth_email') || localStorage.getItem('student_email') || '',
        company: company.trim(),
        role: role.trim(),
        joiningDate: joiningDate.trim(),
        photo: photoToSend || ''
      };

      const res = await axios.post(url, payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (res.data?.success) {
        toast.success('Congratulations! Your placement review is submitted and featured on the national showcase.');
        localStorage.setItem('sbi_placement_review_submitted', 'true');
        setIsDismissed(true);
        if (onSuccess) onSuccess();
      } else {
        throw new Error(res.data?.error || 'Submission failed');
      }
    } catch (err) {
      console.error('Failed to submit placement review:', err);
      toast.error(err.response?.data?.error || err.message || 'Failed to submit review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || isDismissed) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div
        className="relative max-w-lg w-full rounded-3xl overflow-hidden shadow-[0_0_60px_rgba(245,158,11,0.45)] border-2 border-amber-400 bg-gradient-to-br from-[#1a1400] via-[#241a02] to-black text-left animate-scale-in"
      >
        {/* Metallic Golden Decorative Ambient Glows */}
        <div className="absolute top-0 right-0 w-44 h-44 bg-gradient-to-bl from-yellow-400/30 to-amber-500/0 rounded-full blur-[45px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-500/20 rounded-full blur-[35px] pointer-events-none" />

        {/* Top Golden Header Bar */}
        <div className="relative z-10 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 px-6 py-4 flex items-center justify-between text-black">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-black/10 flex items-center justify-center font-black">
              <Crown size={20} className="text-black" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-black/80 block">
                Super Admin Verification
              </span>
              <h3 className="text-base font-black tracking-tight leading-none text-black">
                Placement Success Review
              </h3>
            </div>
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-black text-amber-300 border border-amber-400">
            Mandatory
          </span>
        </div>

        {/* Modal Body */}
        <div className="relative z-10 p-6 space-y-4">
          <div className="space-y-1">
            <h4 className="text-lg font-black text-white flex items-center gap-2">
              <span>🎉 Congratulations on Getting Hired!</span>
            </h4>
            <p className="text-xs text-amber-100/80 font-medium leading-relaxed">
              Super Admin has requested your placement details to feature your verified success on our national Landing Page. Please provide your job details below (no rating or essay required).
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
            {/* Photo Without Background Upload */}
            <div className="bg-black/50 border border-amber-400/40 rounded-2xl p-4 flex items-center gap-4 backdrop-blur-xs">
              {photo ? (
                <div className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-amber-400 shadow-md bg-white/10 shrink-0">
                  <img
                    src={photo}
                    alt="Candidate Preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-transparent flex items-center justify-center pointer-events-none">
                    <CheckCircle2 size={16} className="text-amber-400 absolute top-1 right-1 drop-shadow" />
                  </div>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-amber-400/10 border-2 border-dashed border-amber-400/50 flex flex-col items-center justify-center text-amber-300 shrink-0">
                  <Upload size={18} />
                  <span className="text-[8px] font-black uppercase mt-1">Photo</span>
                </div>
              )}

              <div className="flex-1 min-w-0">
                <label className="block text-xs font-black text-amber-300 mb-0.5">
                  Your Photo (Without Background)
                </label>
                <p className="text-[10px] text-gray-400 mb-2">
                  Upload a clean portrait or cutout photo for the national showcase.
                </p>
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:brightness-110 text-black text-xs font-black cursor-pointer shadow-sm active:scale-95 transition-all">
                  <Upload size={12} />
                  <span>{photo ? 'Change Photo' : 'Upload Photo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-amber-300 mb-1">
                Your Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Aarav Sharma"
                required
                className="w-full text-xs font-bold bg-black/60 border border-amber-400/40 rounded-xl px-3.5 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
              />
            </div>

            {/* Where they got the job (Company) */}
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-amber-300 mb-1 flex items-center gap-1.5">
                <Building size={13} className="text-amber-400" />
                <span>Where you got the job (Company / Organization)</span>
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Tata Consultancy Services, ICICI Bank, Infosys, Google"
                required
                className="w-full text-xs font-bold bg-black/60 border border-amber-400/40 rounded-xl px-3.5 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
              />
            </div>

            {/* Role in the job */}
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-amber-300 mb-1 flex items-center gap-1.5">
                <Briefcase size={13} className="text-amber-400" />
                <span>Your Role in the Job</span>
              </label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Full Stack Engineer, Financial Analyst, Cloud Trainee"
                required
                className="w-full text-xs font-bold bg-black/60 border border-amber-400/40 rounded-xl px-3.5 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
              />
            </div>

            {/* Date joined */}
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-amber-300 mb-1 flex items-center gap-1.5">
                <Calendar size={13} className="text-amber-400" />
                <span>Date when you joined the job</span>
              </label>
              <input
                type="text"
                value={joiningDate}
                onChange={(e) => setJoiningDate(e.target.value)}
                placeholder="e.g. September 2026 or 15/09/2026"
                className="w-full text-xs font-bold bg-black/60 border border-amber-400/40 rounded-xl px-3.5 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
              />
            </div>

            {/* Submit Button (Strictly NO Deny Button as requested) */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:brightness-110 text-black font-black text-xs uppercase tracking-wider py-3 px-6 rounded-xl shadow-[0_4px_25px_rgba(245,158,11,0.5)] transition-all active:scale-95 cursor-pointer border border-amber-300 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Send size={14} className={isSubmitting ? 'animate-spin' : ''} />
                <span>{isSubmitting ? 'Submitting Details...' : '🚀 Submit Placement Review'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
