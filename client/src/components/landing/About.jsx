import React from 'react';
import { Landmark, GraduationCap } from 'lucide-react';

function About() {
  return (
    <section id="about" className="bg-surfaceDark text-cleanWhite py-20 px-4 select-none border-y border-white/5">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* Left Column: Text Content */}
          <div className="space-y-6 animate-fade-in-up">
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-successGreen bg-successGreen/10 px-3 py-1 rounded-full border border-successGreen/25">
                Overview
              </span>
              <h2 className="text-3xl md:text-4xl font-extrabold text-cleanWhite tracking-tight">
                Who We Are & What We Do
              </h2>
            </div>
            
            <p className="text-gray-300 leading-relaxed text-base md:text-lg">
              Skill Bridge India is at the forefront of digital learning and skill evaluation systems. We build scalable, premium digital assessment infrastructures that bridge the gap between candidate qualifications and verified talent recognition.
            </p>

            <div className="space-y-4">
              {/* Feature Item 1 */}
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 p-2.5 bg-white/5 rounded-lg border border-white/10 text-successGreen">
                  <Landmark size={24} />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-cleanWhite">For Institutions & Test Centers</h4>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    Access robust management tools to formulate dynamic question banks, set strict timing patterns, and customize security features.
                  </p>
                </div>
              </div>

              {/* Feature Item 2 */}
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 p-2.5 bg-successGreen/10 rounded-lg border border-successGreen/20 text-successGreen">
                  <GraduationCap size={24} />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-cleanWhite">For Students & Candidates</h4>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    Take tests anywhere on a fast, mobile-friendly interface. Receive instant evaluations and shareable career-boosting credentials.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Platform Mockup */}
          <div className="relative animate-fade-in-up">
            {/* Ambient background decoration */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-successGreen/5 rounded-2xl filter blur-xl -z-10 transform scale-95" />
            
            {/* Visual representation / mockup container */}
            <div className="border border-white/10 bg-white/5 backdrop-blur-lg shadow-2xl rounded-2xl p-6 md:p-8 space-y-4 transform hover:scale-[1.01] transition-transform duration-300">
              <div className="flex items-center space-x-2 pb-4 border-b border-white/10">
                <div className="w-3 h-3 rounded-full bg-red-400/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
                <div className="w-3 h-3 rounded-full bg-green-400/80" />
                <span className="text-xs font-semibold text-gray-400 pl-2">skill-hub-portal-demo</span>
              </div>
              <div className="space-y-3">
                <div className="h-4 bg-white/10 rounded w-2/3" />
                <div className="h-28 bg-white/5 border border-dashed border-white/10 rounded-lg flex items-center justify-center text-xs font-bold text-gray-400">
                  Platform Interface Mockup
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="h-8 bg-white/5 border border-white/10 rounded flex items-center justify-center text-[10px] font-bold text-gray-300">Dynamic Banks</div>
                  <div className="h-8 bg-successGreen/10 border border-successGreen/25 rounded flex items-center justify-center text-[10px] font-bold text-successGreen">Timed Workspaces</div>
                  <div className="h-8 bg-white/5 border border-white/10 rounded flex items-center justify-center text-[10px] font-bold text-gray-300">Auto Evaluation</div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

export default About;
