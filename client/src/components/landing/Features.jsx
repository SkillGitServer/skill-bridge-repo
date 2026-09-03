import React from 'react';
import { ShieldCheck, Clock, BookOpen } from 'lucide-react';

function Features() {
  const featuresList = [
    {
      icon: <ShieldCheck size={36} className="text-successGreen" />,
      title: "Secure Testing Environment",
      description: "State-of-the-art integrity protection and automated fraud detection systems to ensure credible, high-stakes assessments."
    },
    {
      icon: <Clock size={36} className="text-successGreen" />,
      title: "Real-time Analytics",
      description: "Get comprehensive, itemized performance insights, percentile comparisons, and learning gap analyses instantly."
    },
    {
      icon: <BookOpen size={36} className="text-successGreen" />,
      title: "Vast Question Bank",
      description: "Access curated question repositories tailored to standard school syllabi, vocational standards, and competitive exams."
    }
  ];

  return (
    <section className="bg-carbonBlack text-cleanWhite py-20 px-4 select-none">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center space-y-4 animate-fade-in-up">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            Why Choose Us
          </h2>
          <div className="h-1 w-12 bg-successGreen mx-auto rounded-full" />
          <p className="text-gray-300 max-w-lg mx-auto text-sm md:text-base">
            Skill Bridge India delivers exceptional performance, high credibility, and seamless academic assessment infrastructure.
          </p>
        </div>

        {/* Responsive Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {featuresList.map((feature, idx) => (
            <div 
              key={idx} 
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 hover:border-white/20 transition-all duration-300 shadow-xl space-y-4 flex flex-col items-center text-center transform hover:-translate-y-1 animate-fade-in-up"
            >
              <div className="p-3 bg-successGreen/10 rounded-xl border border-successGreen/20">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold tracking-tight">{feature.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Features;
