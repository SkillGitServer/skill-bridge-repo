import React, { useState } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';

function JobUploadCard({ role = 'admin', onJobPosted }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    company: '',
    location: '',
    jobType: 'Full-Time',
    salary: '',
    applyLink: '',
    description: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.company.trim() || !formData.description.trim()) {
      toast.error('Please fill out all required fields (Title, Company, and Description).');
      return;
    }

    setIsSubmitting(true);
    try {
      const userEmail = localStorage.getItem('auth_email') || localStorage.getItem('admin_email') || localStorage.getItem('superadmin_email') || 'system';
      const token = localStorage.getItem('auth_token');

      const payload = {
        title: formData.title.trim(),
        company: formData.company.trim(),
        location: formData.location.trim() || 'Remote',
        jobType: formData.jobType,
        salary: formData.salary.trim() || 'Not Disclosed',
        applyLink: formData.applyLink.trim(),
        description: formData.description.trim(),
        uploaderRole: role,
        uploadedBy: userEmail
      };

      await axios.post('/api/jobs', payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (role === 'super-admin') {
        toast.success('Job posted successfully and live on Student Portal!');
      } else {
        toast.success('Job submitted and is pending Super Admin approval.');
      }

      setFormData({
        title: '',
        company: '',
        location: '',
        jobType: 'Full-Time',
        salary: '',
        applyLink: '',
        description: ''
      });

      setIsOpen(false);
      if (onJobPosted) onJobPosted();
    } catch (err) {
      console.error('Failed to submit job posting:', err);
      toast.error(err.response?.data?.error || 'Failed to submit job posting.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white/90 backdrop-blur-xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-3xl p-6 md:p-8 text-left transition-all duration-300 w-full">
      
      {/* Header section */}
      <div className="pb-5 border-b border-gray-150 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full inline-block mb-2">
            {role === 'super-admin' ? '⚡ Direct Live Post Mode' : '⏳ Requires Super Admin Approval'}
          </span>
          <h3 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">
            Create Corporate Job Opening
          </h3>
          <p className="text-xs text-gray-500 font-semibold mt-1">
            {role === 'super-admin'
              ? 'Fill in the job details below to publish immediately to the Student Job Board.'
              : 'Fill in the job details below to submit for Super Admin review & approval.'}
          </p>
        </div>
      </div>

      {/* Direct Full-Page Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-1.5">
              Job Title / Post <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              placeholder="e.g. Assistant Section Officer, Executive Trainee, Data Analyst"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none text-xs font-semibold text-gray-900 bg-gray-50/50 focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-1.5">
              Company / Department Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="company"
              value={formData.company}
              onChange={handleChange}
              required
              placeholder="e.g. Staff Selection Commission, ONGC, State Bank of India, TCS"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none text-xs font-semibold text-gray-900 bg-gray-50/50 focus:bg-white transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className="block text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-1.5">
              Location
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="e.g. New Delhi, Mumbai, All India / Remote"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none text-xs font-semibold text-gray-900 bg-gray-50/50 focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-1.5">
              Job Type
            </label>
            <select
              name="jobType"
              value={formData.jobType}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none text-xs font-bold bg-white text-gray-900 transition-all cursor-pointer"
            >
              <option value="Full-Time">Full-Time</option>
              <option value="Part-Time">Part-Time</option>
              <option value="Internship">Internship</option>
              <option value="Contract">Contract</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-1.5">
              Salary / Pay Scale
            </label>
            <input
              type="text"
              name="salary"
              value={formData.salary}
              onChange={handleChange}
              placeholder="e.g. ₹35,400 - ₹1,12,400 / month (Level-6)"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none text-xs font-semibold text-gray-900 bg-gray-50/50 focus:bg-white transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-1.5">
            Application Link / Official Portal URL
          </label>
          <input
            type="url"
            name="applyLink"
            value={formData.applyLink}
            onChange={handleChange}
            placeholder="https://recruitment.gov.in/apply-online/2026"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none text-xs font-semibold text-gray-900 bg-gray-50/50 focus:bg-white transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-1.5">
            Job Description & Eligibility Requirements <span className="text-red-500">*</span>
          </label>
          <textarea
            name="description"
            rows={5}
            value={formData.description}
            onChange={handleChange}
            required
            placeholder="Enter job responsibilities, educational qualification criteria (Graduate/Diploma), age limit, selection process, and application instructions..."
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none text-xs font-semibold text-gray-900 bg-gray-50/50 focus:bg-white transition-all leading-relaxed"
          ></textarea>
        </div>

        <div className="flex items-center justify-end pt-4 border-t border-gray-150">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-700 hover:to-purple-800 text-white text-xs font-extrabold uppercase tracking-wider shadow-lg transition-all active:scale-95 cursor-pointer disabled:opacity-50 min-h-[44px]"
          >
            {isSubmitting
              ? 'Submitting Opening...'
              : role === 'super-admin'
              ? 'Publish Job Posting Immediately 🚀'
              : 'Submit Job Opening for Review 📤'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default JobUploadCard;
