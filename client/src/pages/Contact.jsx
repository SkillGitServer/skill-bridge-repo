import React, { useState } from 'react';
import axios from 'axios';
import Navbar from '../components/shared/Navbar';
import Footer from '../components/shared/Footer';
import RandomBlobs from '../components/shared/RandomBlobs';
import { Mail, MapPin, Send, Phone, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { API_BASE_URL } from '../utils/api';

function Contact() {
  useDocumentTitle("Contact Us | Skill Bridge India");
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [status, setStatus] = useState(''); // '', 'sending', 'success', 'error'
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      return;
    }

    setStatus('sending');
    setErrorMessage('');

    try {
      const baseUrl = (API_BASE_URL || '').replace(/\/+$/, '');
      const response = await axios.post(`${baseUrl}/api/contact`, {
        name: formData.name.trim(),
        email: formData.email.trim(),
        message: formData.message.trim()
      });

      if (response.status === 200 && response.data?.success) {
        setStatus('success');
        setFormData({ name: '', email: '', message: '' });
        setTimeout(() => {
          setStatus('');
        }, 6000);
      } else {
        setStatus('error');
        setErrorMessage(response.data?.error || 'Failed to send message. Please try again.');
      }
    } catch (err) {
      console.error('[CONTACT SUBMIT ERROR]', err);
      setStatus('error');
      setErrorMessage(
        err.response?.data?.error || 'Unable to deliver message right now. Please try again or email us directly at mail.skillbridgeindia@gmail.com'
      );
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-gray-900 flex flex-col justify-between relative overflow-hidden">
      <RandomBlobs count={4} zIndex="z-0" />
      <Navbar />

      <main className="flex-grow pt-32 pb-20 px-6 max-w-5xl mx-auto relative w-full z-10 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Info Section */}
          <div className="lg:col-span-5 space-y-8 text-left">
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-black leading-tight py-1 overflow-visible">
                Get in touch
              </h1>
              <p className="text-gray-500 font-semibold mt-3 text-lg">
                Have questions or need assistance? We're here to help.
              </p>
            </div>

            <div className="space-y-6">
              {/* Email Block */}
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-500 flex-shrink-0">
                  <Mail size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Email us</h3>
                  <a
                    href="mailto:mail.skillbridgeindia@gmail.com"
                    className="text-gray-600 hover:text-black transition-colors font-medium break-all"
                  >
                    mail.skillbridgeindia@gmail.com
                  </a>
                </div>
              </div>

              {/* Phone Block */}
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 flex-shrink-0">
                  <Phone size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Call us</h3>
                  <a
                    href="tel:+919371717215"
                    className="text-gray-600 hover:text-black transition-colors font-medium"
                  >
                    +919371717215
                  </a>
                </div>
              </div>

              {/* Location Block */}
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-teal-100 rounded-2xl flex items-center justify-center text-teal-500 flex-shrink-0">
                  <MapPin size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Our HQ Location</h3>
                  <p className="text-gray-600 font-medium">
                    Chhatrapati Sambhajinagar, Maharashtra, India
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Form Card — Glassmorphism */}
          <div className="lg:col-span-7 relative">
            <div
              className="rounded-3xl p-8 relative z-10"
              style={{
                background: 'rgba(255, 255, 255, 0.75)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.5)',
                boxShadow: '0 8px 30px rgba(0, 0, 0, 0.1)',
              }}
            >
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="name" className="block text-sm font-bold text-gray-700 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all text-sm"
                    placeholder="Your Name"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-bold text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all text-sm"
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-bold text-gray-700 mb-2">
                    Message
                  </label>
                  <textarea
                    id="message"
                    required
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all text-sm resize-none"
                    placeholder="How can we help you?"
                  />
                </div>

                {status === 'success' && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-2 text-emerald-800 text-sm font-semibold">
                    <CheckCircle size={18} className="text-emerald-600 flex-shrink-0" />
                    <span>Thank you! Your message has been sent to our team.</span>
                  </div>
                )}

                {status === 'error' && errorMessage && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-2 text-red-800 text-sm font-semibold">
                    <AlertCircle size={18} className="text-red-600 flex-shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === 'sending'}
                  className={`w-full py-3.5 font-bold rounded-full transition-all shadow-md flex items-center justify-center space-x-2 text-sm disabled:opacity-60 ${
                    status === 'success'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-gray-900 hover:bg-black text-white'
                  }`}
                >
                  {status === 'sending' ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : status === 'success' ? (
                    <>
                      <CheckCircle size={16} />
                      <span>Message Sent Successfully!</span>
                    </>
                  ) : (
                    <>
                      <span>Send Message</span>
                      <Send size={16} />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default Contact;
