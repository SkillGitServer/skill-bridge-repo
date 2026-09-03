import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import RandomBlobs from '../shared/RandomBlobs';

function RegistrationSuccess() {
  const navigate = useNavigate();
  useDocumentTitle("SignUp Complete | Skill Bridge India");

  return (
    <div className="min-h-screen w-full bg-transparent relative overflow-hidden flex flex-col items-center justify-center font-sans text-gray-900 select-none">
      {/* Dynamic random blobs — repositioned on every page load */}
      <RandomBlobs count={6} zIndex="z-0" />

      {/* Main Content Card — Glassmorphism */}
      <div className="relative z-10 w-full max-w-md px-6">
        <div
          className="rounded-3xl p-8 text-center"
          style={{
            background: 'rgba(255, 255, 255, 0.75)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.5)',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.1)',
          }}
        >
          {/* Logo */}
          <h1 className="text-4xl font-extrabold tracking-tighter mb-4 text-black pb-3 overflow-visible">
            Skill Bridge India
          </h1>
          
          {/* Heading */}
          <h2 className="text-2xl font-extrabold text-gray-800 mb-6">
            You're all signed up!
          </h2>

          {/* Body Text */}
          <p className="text-sm text-gray-500 leading-relaxed mb-4">
            Welcome to Skill Bridge India! You have successfully created your student account, linked to your institution via the provided referral code. Please proceed to log in with your mobile number to access your student portal.
          </p>

          {/* Secondary parenthetical instruction */}
          <p className="text-xs text-gray-400 italic mb-8">
            (You can now use your verified details to log in below to access your student portal.)
          </p>

          {/* Action Button */}
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-[#111111] text-white py-4 rounded-full font-bold text-lg hover:bg-black transition-colors shadow-md hover:shadow-lg"
          >
            Log In to Student Portal
          </button>
        </div>
      </div>
    </div>
  );
}

export default RegistrationSuccess;
