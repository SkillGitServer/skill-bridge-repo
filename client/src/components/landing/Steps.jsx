import React from 'react';
import { Link } from 'react-router-dom';

function Steps() {
  return (
    <section className="relative bg-white text-gray-900 pt-24 pb-12 px-6 overflow-hidden select-none">
      
      {/* Background Wiggles */}
      {/* Teal squiggly shape on the left */}
      <div className="absolute top-1/4 -left-20 w-72 h-72 bg-teal-400 opacity-40 rounded-[30%_70%_50%_50%/50%_30%_70%_50%] z-0 animate-float-slow"></div>
      
      {/* Light Blue squiggly shape on the right */}
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-sky-300 opacity-40 rounded-[50%_50%_30%_75%/30%_75%_50%_50%] z-0 animate-float-fast"></div>

      <div className="relative z-10 max-w-3xl mx-auto text-center space-y-12">
        
        {/* Header */}
        <div className="space-y-4">
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900">
            Here's how it works
          </h2>
          <p className="text-lg text-gray-500 font-semibold">
            More testing, less stressing.
          </p>
        </div>

        {/* Steps Column */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 pt-8">
          
          {/* Step 1 */}
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 bg-yellow-400 font-extrabold text-2xl flex items-center justify-center rounded-[40%_60%_70%_30%/40%_50%_60%_50%] text-black animate-float-slow shadow-md">
              1
            </div>
            <h3 className="text-xl font-bold text-gray-900">Verify Identity</h3>
            <p className="text-sm text-gray-600 leading-relaxed max-w-xs">
              Log in securely using your mobile number and an instant OTP.
            </p>
          </div>

          {/* Step 2 */}
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 bg-teal-300 font-extrabold text-2xl flex items-center justify-center rounded-[60%_40%_30%_70%/60%_30%_70%_40%] text-black animate-float-fast shadow-md">
              2
            </div>
            <h3 className="text-xl font-bold text-gray-900">Take the Exam</h3>
            <p className="text-sm text-gray-600 leading-relaxed max-w-xs">
              Answer randomized questions in a secure, timer-based mobile environment.
            </p>
          </div>

          {/* Step 3 */}
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 bg-purple-400 font-extrabold text-2xl flex items-center justify-center rounded-[50%_50%_20%_80%/25%_25%_75%_75%] text-black animate-float-slow shadow-md">
              3
            </div>
            <h3 className="text-xl font-bold text-gray-900">Instant Results</h3>
            <p className="text-sm text-gray-600 leading-relaxed max-w-xs">
              Submit your test and instantly download your automated performance PDF.
            </p>
          </div>

        </div>

        {/* Bottom CTA */}
        <div>
          <Link to="/register" className="inline-block bg-gray-900 text-white rounded-full px-8 py-3.5 font-bold hover:bg-black transition-all shadow-md hover:shadow-lg">
            Register now
          </Link>
        </div>

      </div>
    </section>
  );
}

export default Steps;
