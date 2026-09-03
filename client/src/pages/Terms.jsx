import React from 'react';
import Navbar from '../components/shared/Navbar';
import Footer from '../components/shared/Footer';
import RandomBlobs from '../components/shared/RandomBlobs';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

function Terms() {
  useDocumentTitle("Terms of Service | Skill Bridge India");
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
            Terms of Service
          </h1>

          <p className="text-gray-600 text-sm mb-6">Last updated: July 14, 2026</p>

          <div className="text-gray-700 leading-relaxed space-y-6">
            <p>
              Please read these Terms of Service ("Terms") carefully before using the Skill Bridge India examination portal. By accessing or using our platform, you agree to be bound by these Terms.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4 text-black">1. Acceptance of Terms</h2>
            <p>
              By creating an account, logging in, or taking a test, you confirm that you accept these Terms and agree to comply with them. If you do not agree, you must not access or use the platform.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4 text-black">2. User Account and Verification</h2>
            <p>
              To access exams, you must log in using your valid mobile number. You will receive an OTP via SMS to verify your session. You are responsible for ensuring that the phone number is yours and active. Any activity under your verified number is your responsibility.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4 text-black">3. Testing Rules and Acceptable Use</h2>
            <p>
              When taking an exam on Skill Bridge India, you agree to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Complete the exam independently without external assistance.</li>
              <li>Not copy, screenshot, record, or distribute any exam questions or materials.</li>
              <li>Complete the test within the allocated countdown timer limits.</li>
              <li>Not use automated scripts, bots, or browser manipulation tools.</li>
            </ul>

            <h2 className="text-2xl font-bold mt-8 mb-4 text-black">4. Intellectual Property</h2>
            <p>
              The platform design, brand name, logo, wobbly graphics, question templates, and backend infrastructure are the exclusive property of Skill Bridge India. You may not copy, reverse-engineer, or distribute any part of the site without written authorization.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4 text-black">5. Limitation of Liability</h2>
            <p>
              Skill Bridge India is provided "as is" and "as available". We do not guarantee uninterrupted or error-free operation. To the maximum extent permitted by law, we disclaim all liability for any direct, indirect, incidental, or consequential damages resulting from your use of the platform.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4 text-black">6. Termination of Access</h2>
            <p>
              We reserve the right to suspend or terminate your access to the platform at our sole discretion, without notice, if we suspect a violation of these Terms, cheating during exams, or fraud.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default Terms;
