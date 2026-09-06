import React, { useState, useEffect } from 'react';

/**
 * Thoroughly removes googtrans cookies from all host levels, parent domains, and paths.
 */
export const clearGoogleTranslateCookies = () => {
  const host = window.location.hostname;
  const hostParts = host.split('.');

  // Collect host and all parent domain levels (e.g., skill-bridge-india.bot.cd, .bot.cd, etc.)
  const domains = ['', host, `.${host}`];
  for (let i = 0; i < hostParts.length - 1; i++) {
    const parent = hostParts.slice(i).join('.');
    domains.push(parent);
    domains.push(`.${parent}`);
  }

  const paths = ['/', window.location.pathname, window.location.pathname.replace(/\/$/, '')];

  domains.forEach((d) => {
    paths.forEach((p) => {
      const dAttr = d ? `; domain=${d}` : '';
      document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${p}${dAttr}`;
      document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; Max-Age=0; path=${p}${dAttr}`;
    });
  });

  // Explicit host-only fallback
  document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC;';

  try {
    localStorage.removeItem('googtrans');
    sessionStorage.removeItem('googtrans');
  } catch (e) {}
};

/**
 * Sets googtrans cookie for Marathi translation across supported domains.
 */
export const setGoogleTranslateCookie = (lang) => {
  clearGoogleTranslateCookies();

  const host = window.location.hostname;
  const hostParts = host.split('.');

  const domains = ['', host, `.${host}`];
  if (hostParts.length >= 2) {
    const root = hostParts.slice(-2).join('.');
    domains.push(`.${root}`);
    domains.push(root);
  }

  domains.forEach((d) => {
    const dAttr = d ? `; domain=${d}` : '';
    document.cookie = `googtrans=/en/${lang}; path=/${dAttr}`;
  });
};

function LanguageSwitcher() {
  const [language, setLanguage] = useState(() => {
    const preferred = localStorage.getItem('preferred_language');
    if (preferred === 'mr' || preferred === 'en') return preferred;
    const match = typeof document !== 'undefined' ? document.cookie.match(/(^|;) ?googtrans=([^;]*)(;|$)/) : null;
    return match && match[2] && match[2].includes('/mr') ? 'mr' : 'en';
  });

  useEffect(() => {
    const preferred = localStorage.getItem('preferred_language');

    if (preferred === 'en') {
      // If user explicitly prefers English, eliminate any leftover /mr cookie
      const match = document.cookie.match(/(^|;) ?googtrans=([^;]*)(;|$)/);
      if (match && match[2] && match[2].includes('/mr')) {
        clearGoogleTranslateCookies();
        window.location.reload();
        return;
      }
      setLanguage('en');
    } else if (preferred === 'mr') {
      setLanguage('mr');
    } else {
      const match = document.cookie.match(/(^|;) ?googtrans=([^;]*)(;|$)/);
      if (match && match[2] && match[2].includes('/mr')) {
        setLanguage('mr');
      } else {
        setLanguage('en');
      }
    }
  }, []);

  const toggleLanguage = () => {
    const currentIsMarathi = language === 'mr';
    const nextLang = currentIsMarathi ? 'en' : 'mr';

    // 1. Store explicit choice in localStorage
    try {
      localStorage.setItem('preferred_language', nextLang);
    } catch (e) {}

    // 2. Dispatch change to Google Translate combo dropdown if mounted
    const combo = document.querySelector('.goog-te-combo');
    if (combo) {
      combo.value = nextLang === 'en' ? '' : 'mr';
      combo.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // 3. Update cookies accordingly
    if (nextLang === 'en') {
      clearGoogleTranslateCookies();
    } else {
      setGoogleTranslateCookie('mr');
    }

    setLanguage(nextLang);

    // 4. Reload page cleanly so Google Translate applies the new language state
    setTimeout(() => {
      window.location.reload();
    }, 80);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="bg-white/50 backdrop-blur-md border border-white/70 rounded-full px-3 py-1 text-sm font-bold text-gray-800 cursor-pointer hover:bg-white/70 transition-all shadow-sm active:scale-95 flex items-center gap-1.5 z-50"
      title={language === 'en' ? "Switch to Marathi (मराठी)" : "Switch to English"}
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

