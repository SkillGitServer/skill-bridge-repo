import React from 'react';
import Navbar from '../components/shared/Navbar';
import Footer from '../components/shared/Footer';
import RandomBlobs from '../components/shared/RandomBlobs';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

function About() {
  useDocumentTitle("About | Skill Bridge India");
  return (
    <div className="min-h-screen bg-transparent text-gray-900 flex flex-col justify-between relative overflow-hidden">
      <RandomBlobs count={4} zIndex="z-0" />
      <Navbar />

      <main className="flex-grow pt-32 pb-20 px-6 max-w-4xl mx-auto relative w-full z-10">
        <div
          className="rounded-3xl p-8 space-y-8"
          style={{
            background: 'rgba(255, 255, 255, 0.6)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.4)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
          }}
        >
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-black text-center py-1 overflow-visible">
            About Skill Bridge India
          </h1>

          <div className="prose prose-lg text-gray-700 space-y-6 leading-relaxed">
            <p>
              Welcome to <strong>Skill Bridge India</strong>, a modern, secure examination platform designed to make academic and professional assessments simple, transparent, and stress-free.
            </p>
            <p>
              Our mission is to empower educational institutions, coaching centers, and businesses with a highly reliable mobile-first testing ecosystem. By shifting from traditional paper-based formats to smart, randomized digital exams, we ensure absolute integrity while saving time.
            </p>
            <p>
              With features like instant OTP authentication, smart timer enforcement, randomized question banks, and automatic PDF performance reports generated right after completion, Skill Bridge India removes the operational overhead of exams. Candidates can focus on what matters most: proving their skills.
            </p>
            <p>
              Whether you are an administrator creating a quiz or a student taking a critical certification exam, Skill Bridge India provides a seamless experience tailored to modern smartphones.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default About;
