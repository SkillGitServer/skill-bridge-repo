import React, { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import RandomBlobs from '../shared/RandomBlobs';
import EditableText from '../shared/EditableText';
import logo from '../../assets/logo.png';
import axios from 'axios';

function Hero({ contentOverride, isEditing, onFieldChange }) {
  useDocumentTitle("Skill Bridge India");

  const [content, setContent] = useState({
    heroTitle: "Don't make assessments stressful.",
    heroSubtitle: "Skill Bridge India makes it easy to take secure, timed exams and get instant, automated results right from your phone.",
    ctaText: "Get Started Free",
    heroDeviceText: "Exam Verified Successfully",
    heroDeviceBrand: "SKILL BRIDGE INDIA"
  });

  useEffect(() => {
    if (contentOverride) {
      setContent(prev => ({ ...prev, ...contentOverride }));
      return;
    }
    const fetchContent = async () => {
      try {
        const res = await axios.get('/api/landing-content');
        if (res.data) setContent(prev => ({ ...prev, ...res.data }));
      } catch (err) {
        console.log('Using default hero content');
      }
    };
    fetchContent();
  }, [contentOverride]);

  const handleChange = (field, val, options) => {
    if (!options || options.isBlur !== false) {
      setContent(prev => ({ ...prev, [field]: val }));
    }
    if (onFieldChange) onFieldChange(field, val, options);
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-center items-center pt-28 overflow-hidden bg-white text-gray-900 select-none">
      
      {/* Dynamic random blobs — new layout on every page load */}
      <RandomBlobs count={5} zIndex="z-0" />

      {/* Main Content Wrapper */}
      <div className="relative z-10 max-w-3xl mx-auto px-6 flex flex-col items-center text-center space-y-6">
        
        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-black max-w-2xl leading-none py-1 overflow-visible">
          <EditableText
            as="span"
            isEditing={isEditing}
            value={content.heroTitle}
            onSave={(val) => handleChange('heroTitle', val)}
            placeholder="Don't make assessments stressful."
            title="Click to edit Hero Title directly"
          />
        </h1>

        {/* Subheadline */}
        <p className="text-lg md:text-xl text-gray-600 max-w-2xl leading-relaxed">
          <EditableText
            as="span"
            isEditing={isEditing}
            value={content.heroSubtitle}
            onSave={(val) => handleChange('heroSubtitle', val)}
            placeholder="Skill Bridge India makes it easy to take secure, timed exams and get instant, automated results right from your phone."
            title="Click to edit Hero Subtitle directly"
          />
        </p>

        {/* CTA Button */}
        <div className="pt-4">
          <Link
            to={isEditing ? '#' : '/register'}
            onClick={(e) => {
              if (isEditing) {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
            className="inline-flex items-center space-x-2 bg-gray-900 text-white rounded-full px-8 py-3.5 font-bold hover:bg-black transition-all shadow-md hover:shadow-lg"
          >
            <EditableText
              as="span"
              isEditing={isEditing}
              value={content.ctaText}
              onSave={(val) => handleChange('ctaText', val)}
              placeholder="Get Started Free"
              title="Click to edit CTA Button Text directly"
            />
            <ArrowRight size={20} />
          </Link>
        </div>

        {/* Center Visual: Overlapping Mobile Phone Mockup Placeholder */}
        <div className="w-full max-w-md h-80 bg-gray-100 rounded-3xl border-4 border-gray-900 shadow-xl relative z-10 mx-auto mt-12 overflow-hidden flex flex-col justify-between p-6">
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-1.5">
              <img src={logo} alt="Logo" className="w-4 h-4 object-contain" />
              <EditableText
                as="span"
                isEditing={isEditing}
                value={content.heroDeviceBrand || "SKILL BRIDGE INDIA"}
                onSave={(val) => handleChange('heroDeviceBrand', val)}
                className="text-[10px] font-mono tracking-widest text-gray-700 font-bold"
                title="Click to edit Device Mockup Brand text"
              />
            </div>
            <div className="w-12 h-3 bg-gray-900 rounded-full"></div>
          </div>
          <div className="space-y-3 text-left">
            <div className="h-6 w-2/3 bg-gray-900 rounded"></div>
            <div className="h-4 w-5/6 bg-gray-300 rounded"></div>
            <div className="h-4 w-4/6 bg-gray-300 rounded"></div>
          </div>
          <div className="w-full py-2 bg-successGreen text-white text-center font-bold rounded-xl text-xs shadow-md">
            <EditableText
              as="span"
              isEditing={isEditing}
              value={content.heroDeviceText || "Exam Verified Successfully"}
              onSave={(val) => handleChange('heroDeviceText', val)}
              title="Click to edit Device Status Banner text"
            />
          </div>
        </div>

      </div>
    </div>
  );
}

export default Hero;
