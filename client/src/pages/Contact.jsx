import React, { useState } from 'react';
import Navbar from '../components/shared/Navbar';
import Footer from '../components/shared/Footer';
import RandomBlobs from '../components/shared/RandomBlobs';
import { Mail, MapPin, Send } from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

function Contact() {
  useDocumentTitle("Contact Us | Skill Bridge India");
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [status, setStatus] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setStatus('sending');
    setTimeout(() => {
      setStatus('success');
      setFormData({ name: '', email: '', message: '' });
    }, 1000);
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
                  <a href="mailto:hello@skillhub.in" className="text-gray-600 hover:text-black transition-colors font-medium">
                    hello@skillhub.in
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

                <button
                  type="submit"
                  disabled={status === 'sending'}
                  className="w-full py-3.5 bg-gray-900 hover:bg-black text-white font-bold rounded-full transition-all shadow-md flex items-center justify-center space-x-2 text-sm"
                >
                  {status === 'sending' ? (
                    <span>Sending...</span>
                  ) : status === 'success' ? (
                    <span>Message Sent Successfully!</span>
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
