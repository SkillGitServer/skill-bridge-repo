import React from 'react';
import Navbar from '../components/shared/Navbar';
import Footer from '../components/shared/Footer';
import RandomBlobs from '../components/shared/RandomBlobs';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

function Privacy() {
  useDocumentTitle("Privacy Policy | Skill Bridge India");
  return (
    <div className="min-h-screen bg-transparent text-gray-900 flex flex-col justify-between relative overflow-hidden">
      <RandomBlobs count={4} zIndex="z-0" />
      <Navbar />

      <main className="flex-grow pt-32 pb-20 px-6 max-w-3xl mx-auto relative w-full z-10">
        <div
          className="rounded-3xl p-8"
          style={{
            background: 'rgba(255, 255, 255, 0.6)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.4)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
          }}
        >
          <h1 className="text-4xl font-extrabold tracking-tight text-black text-center mb-10 py-1 overflow-visible">
            Privacy Policy
          </h1>

          <p className="text-gray-600 text-sm mb-6">Last updated: July 14, 2026</p>

          <div className="text-gray-700 leading-relaxed space-y-6">
            <p>
              At Skill Bridge India, we value and respect your privacy. This Privacy Policy explains how we collect, use, disclose, and protect your information when you use our web application and services.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4 text-black">1. Information We Collect</h2>
            <p>
              We collect information that you directly provide to us, including:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Authentication Data:</strong> Your mobile phone number used for generating instant OTP authentication.</li>
              <li><strong>Profile Information:</strong> Optional user profile details such as name and profile preferences.</li>
              <li><strong>Test Data:</strong> Responses, completion time, score, and generated automated PDF result reports.</li>
            </ul>

            <h2 className="text-2xl font-bold mt-8 mb-4 text-black">2. How We Use Your Information</h2>
            <p>
              We use the collected information for various purposes:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>To provide, maintain, and improve our secure examination portal.</li>
              <li>To authenticate your session securely via SMS OTP services.</li>
              <li>To compile your test scores and instantly generate downloadable performance PDFs.</li>
              <li>To monitor and protect against cheating, fraud, or abuse.</li>
            </ul>

            <h2 className="text-2xl font-bold mt-8 mb-4 text-black">3. Information Sharing and Disclosure</h2>
            <p>
              We do not sell, rent, or trade your personal information. We may share details only under limited circumstances:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>With your explicit consent.</li>
              <li>With trusted service providers assisting us with OTP delivery or cloud hosting.</li>
              <li>To comply with legal obligations, enforce policies, or protect safety and rights.</li>
            </ul>

            <h2 className="text-2xl font-bold mt-8 mb-4 text-black">4. Data Security</h2>
            <p>
              We use industry-standard administrative, technical, and physical security measures to safeguard your personal data. However, no database or transmission over the Internet can be guaranteed 100% secure.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4 text-black">5. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Any changes will be posted on this page with an updated "Last updated" date.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default Privacy;
