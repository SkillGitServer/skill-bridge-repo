import React, { useState, useEffect } from 'react';

function LanguageSwitcher() {
  const [language, setLanguage] = useState('en');

  useEffect(() => {
    const match = document.cookie.match(/(^|;) ?googtrans=([^;]*)(;|$)/);
    if (match) {
      const val = match[2];
      if (val.includes('/mr')) {
        setLanguage('mr');
      }
    }
  }, []);

  const toggleLanguage = () => {
    const newLang = language === 'en' ? 'mr' : 'en';
    
    // Set google translate cookie for both current domain and host
    const domain = window.location.hostname;
    document.cookie = `googtrans=/en/${newLang}; path=/`;
    document.cookie = `googtrans=/en/${newLang}; path=/; domain=${domain}`;
    
    window.location.reload();
  };

  return (
    <button
      onClick={toggleLanguage}
      className="bg-white/50 backdrop-blur-md border border-white/70 rounded-full px-3 py-1 text-sm font-bold text-gray-800 cursor-pointer hover:bg-white/70 transition-all shadow-sm active:scale-95 flex items-center gap-1.5 z-50"
      title={language === 'en' ? "Switch to Marathi" : "Switch to English"}
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="2" y1="12" x2="22" y2="12"></line>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
      </svg>
      {language === 'en' ? 'EN' : 'MR'}
    </button>
  );
}

export default LanguageSwitcher;
