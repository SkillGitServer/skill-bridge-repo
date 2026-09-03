import React, { useState, useEffect } from 'react';
import Navbar from '../components/shared/Navbar';
import Hero from '../components/landing/Hero';
import LandingSections from '../components/landing/LandingSections';
import Footer from '../components/shared/Footer';
import { defaultLandingContent } from '../constants/landingDefaults';
import axios from 'axios';

export default function LandingPage() {
  const [landingData, setLandingData] = useState(() => {
    // Try restoring from localStorage first for instant rendering
    try {
      const saved = localStorage.getItem('cbi_landing_content');
      if (saved) return { ...defaultLandingContent, ...JSON.parse(saved) };
    } catch (e) {}
    return { ...defaultLandingContent };
  });

  const [isLoading, setIsLoading] = useState(true);

  const fetchLandingContent = async () => {
    try {
      const res = await axios.get(`/api/landing-page?_t=${Date.now()}`);
      if (res.data && Object.keys(res.data).length > 0) {
        const merged = { ...defaultLandingContent, ...res.data };
        setLandingData(merged);
        try {
          localStorage.setItem('cbi_landing_content', JSON.stringify(res.data));
        } catch (e) {}
      }
    } catch (err) {
      console.warn('Could not fetch landing content from server, using fallbacks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLandingContent();

    // Refetch when returning to tab
    const onVisibilityChange = () => {
      if (!document.hidden) fetchLandingContent();
    };

    // Refetch when editor updates localStorage cross-tab
    const onStorage = (e) => {
      if (e.key === 'cbi_landing_content' && e.newValue) {
        try {
          setLandingData({ ...defaultLandingContent, ...JSON.parse(e.newValue) });
        } catch (err) {}
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('storage', onStorage);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return (
    <div className="min-h-screen w-full flex flex-col justify-between relative bg-transparent text-gray-900 font-sans select-none overflow-x-hidden">
      <Navbar />
      <Hero contentOverride={landingData} />
      <LandingSections contentOverride={landingData} />
      <Footer contentOverride={landingData} />
    </div>
  );
}
