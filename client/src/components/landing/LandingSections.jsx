import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import RandomBlobs from '../shared/RandomBlobs';
import EditableText from '../shared/EditableText';
import { defaultLandingContent } from '../../constants/landingDefaults';
import {
  ClipboardList,
  BarChart2,
  Compass,
  Briefcase,
  ShieldCheck,
  ChevronDown,
  Award,
  FileText,
  Star,
  Target,
  Eye,
  Heart,
  Bot,
  MessageSquare,
  Send,
  X,
  Mail,
  Phone,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../../utils/api';
import StudentReviewCarousel from './StudentReviewCarousel';

// ─── Section Wrapper ─────────────────────────────────────────────────────────
function Section({ id, children, className = '' }) {
  return (
    <section
      id={id}
      className={`relative py-24 px-6 overflow-hidden ${className}`}
    >
      {children}
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. WHY CHOOSE US
// ══════════════════════════════════════════════════════════════════════════════
const whyCardsMeta = [
  { icon: ClipboardList, color: 'bg-orange-100 text-orange-600' },
  { icon: BarChart2, color: 'bg-teal-100 text-teal-600' },
  { icon: Compass, color: 'bg-purple-100 text-purple-600' },
  { icon: Briefcase, color: 'bg-sky-100 text-sky-600' },
  { icon: ShieldCheck, color: 'bg-green-100 text-green-600' },
];

function WhyChooseUs({ contentOverride, isEditing, onFieldChange }) {
  const badge = contentOverride?.whyBadge || defaultLandingContent.whyBadge;
  const title = contentOverride?.whyTitle || defaultLandingContent.whyTitle;
  const subtitle = contentOverride?.whySubtitle || defaultLandingContent.whySubtitle;
  const cards = contentOverride?.whyCards?.length ? contentOverride.whyCards : defaultLandingContent.whyCards;

  const handleCardChange = (idx, field, val, options) => {
    const newCards = cards.map((c, i) => i === idx ? { ...c, [field]: val } : c);
    if (onFieldChange) onFieldChange('whyCards', newCards, options);
  };

  return (
    <Section id="why-choose-us" className="bg-transparent">
      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Heading */}
        <div className="text-center mb-16 space-y-3">
          <span className="inline-block bg-gray-900 text-white text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full">
            <EditableText
              isEditing={isEditing}
              value={badge}
              onSave={(val) => onFieldChange && onFieldChange('whyBadge', val)}
              title="Click to edit section badge"
            />
          </span>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900">
            <EditableText
              isEditing={isEditing}
              value={title}
              onSave={(val) => onFieldChange && onFieldChange('whyTitle', val)}
              title="Click to edit section heading"
            />
          </h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            <EditableText
              isEditing={isEditing}
              value={subtitle}
              onSave={(val) => onFieldChange && onFieldChange('whySubtitle', val)}
              title="Click to edit section subtitle"
            />
          </p>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-5">
          {whyCardsMeta.map(({ icon: Icon, color }, i) => {
            const cardData = cards[i] || defaultLandingContent.whyCards[i] || {};
            return (
              <div
                key={i}
                className="group flex flex-col items-start gap-4 bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl p-6 shadow-sm hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 cursor-default"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color} group-hover:scale-110 transition-transform duration-500`}>
                  <Icon size={22} strokeWidth={2} />
                </div>
                <div className="w-full">
                  <h3 className="font-bold text-gray-900 text-sm mb-1">
                    <EditableText
                      isEditing={isEditing}
                      value={cardData.title}
                      onSave={(val) => handleCardChange(i, 'title', val)}
                      title="Click to edit card title"
                    />
                  </h3>
                  <p className="text-gray-500 text-xs leading-relaxed">
                    <EditableText
                      isEditing={isEditing}
                      value={cardData.desc}
                      onSave={(val) => handleCardChange(i, 'desc', val)}
                      title="Click to edit card description"
                    />
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Section>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. HOW IT WORKS
// ══════════════════════════════════════════════════════════════════════════════
function HowItWorks({ contentOverride, isEditing, onFieldChange }) {
  const badge = contentOverride?.howBadge || defaultLandingContent.howBadge;
  const title = contentOverride?.howTitle || defaultLandingContent.howTitle;
  const subtitle = contentOverride?.howSubtitle || defaultLandingContent.howSubtitle;
  const steps = contentOverride?.howSteps?.length ? contentOverride.howSteps : defaultLandingContent.howSteps;

  const handleStepChange = (idx, field, val, options) => {
    const newSteps = steps.map((s, i) => i === idx ? { ...s, [field]: val } : s);
    if (onFieldChange) onFieldChange('howSteps', newSteps, options);
  };

  return (
    <Section id="how-it-works" className="bg-transparent">
      <div className="relative z-10 max-w-5xl mx-auto">
        <div className="text-center mb-16 space-y-3">
          <span className="inline-block bg-gray-900 text-white text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full">
            <EditableText
              isEditing={isEditing}
              value={badge}
              onSave={(val) => onFieldChange && onFieldChange('howBadge', val)}
              title="Click to edit section badge"
            />
          </span>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900">
            <EditableText
              isEditing={isEditing}
              value={title}
              onSave={(val) => onFieldChange && onFieldChange('howTitle', val)}
              title="Click to edit section heading"
            />
          </h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            <EditableText
              isEditing={isEditing}
              value={subtitle}
              onSave={(val) => onFieldChange && onFieldChange('howSubtitle', val)}
              title="Click to edit section subtitle"
            />
          </p>
        </div>

        {/* Timeline */}
        <div className="relative">
          <div className="hidden md:block absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-[2px] bg-gray-300" />

          <div className="space-y-10">
            {steps.map((_, i) => {
              const stepData = steps[i] || defaultLandingContent.howSteps[i] || {};
              const isLeft = i % 2 === 0;
              return (
                <div
                  key={i}
                  className={`relative flex flex-col md:flex-row items-center gap-6 ${isLeft ? 'md:flex-row' : 'md:flex-row-reverse'}`}
                >
                  <div className={`w-full md:w-5/12 bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl p-6 shadow-sm hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 ${isLeft ? 'md:text-right' : 'md:text-left'}`}>
                    <h3 className="font-bold text-gray-900 text-lg mb-1">
                      <EditableText
                        isEditing={isEditing}
                        value={stepData.label}
                        onSave={(val) => handleStepChange(i, 'label', val)}
                        title="Click to edit step label"
                      />
                    </h3>
                    <p className="text-gray-500 text-sm leading-relaxed">
                      <EditableText
                        isEditing={isEditing}
                        value={stepData.desc}
                        onSave={(val) => handleStepChange(i, 'desc', val)}
                        title="Click to edit step description"
                      />
                    </p>
                  </div>

                  <div className="relative md:absolute md:left-1/2 md:-translate-x-1/2 flex-shrink-0 z-10">
                    <div className="w-14 h-14 bg-white/60 backdrop-blur-xl border border-white/50 rounded-full flex items-center justify-center text-gray-900 font-extrabold text-xl shadow-sm animate-pulse-ring">
                      <EditableText
                        isEditing={isEditing}
                        value={stepData.num || (i + 1).toString()}
                        onSave={(val) => handleStepChange(i, 'num', val)}
                        title="Click to edit step number"
                      />
                    </div>
                  </div>

                  <div className="hidden md:block w-5/12" />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Section>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. CANDIDATE BENEFITS
// ══════════════════════════════════════════════════════════════════════════════
const benefitsMeta = [
  { icon: BarChart2, color: 'from-orange-400 to-orange-500' },
  { icon: Compass, color: 'from-teal-400 to-teal-500' },
  { icon: Award, color: 'from-purple-400 to-purple-500' },
  { icon: Briefcase, color: 'from-sky-400 to-sky-500' },
];

function CandidateBenefits({ contentOverride, isEditing, onFieldChange }) {
  const badge = contentOverride?.benefitsBadge || defaultLandingContent.benefitsBadge;
  const title = contentOverride?.benefitsTitle || defaultLandingContent.benefitsTitle;
  const subtitle = contentOverride?.benefitsSubtitle || defaultLandingContent.benefitsSubtitle;
  const benefits = contentOverride?.benefitCards?.length ? contentOverride.benefitCards : defaultLandingContent.benefitCards;

  const handleBenefitChange = (idx, field, val, options) => {
    const newBenefits = benefits.map((b, i) => i === idx ? { ...b, [field]: val } : b);
    if (onFieldChange) onFieldChange('benefitCards', newBenefits, options);
  };

  return (
    <Section id="candidate-benefits" className="bg-transparent">
      <div className="relative z-10 max-w-5xl mx-auto">
        <div className="text-center mb-16 space-y-3">
          <span className="inline-block bg-gray-900 text-white text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full">
            <EditableText
              isEditing={isEditing}
              value={badge}
              onSave={(val) => onFieldChange && onFieldChange('benefitsBadge', val)}
              title="Click to edit section badge"
            />
          </span>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900">
            <EditableText
              isEditing={isEditing}
              value={title}
              onSave={(val) => onFieldChange && onFieldChange('benefitsTitle', val)}
              title="Click to edit section heading"
            />
          </h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            <EditableText
              isEditing={isEditing}
              value={subtitle}
              onSave={(val) => onFieldChange && onFieldChange('benefitsSubtitle', val)}
              title="Click to edit section subtitle"
            />
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefitsMeta.map(({ icon: Icon, color }, i) => {
            const cardData = benefits[i] || defaultLandingContent.benefitCards[i] || {};
            return (
              <div
                key={i}
                className="group relative bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl p-6 shadow-sm hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 overflow-hidden"
              >
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${color} rounded-t-3xl`} />
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center mb-5 shadow-md group-hover:scale-110 transition-transform duration-500`}>
                  <Icon size={22} strokeWidth={2} className="text-white" />
                </div>
                <h3 className="font-bold text-gray-900 text-base mb-2">
                  <EditableText
                    isEditing={isEditing}
                    value={cardData.title}
                    onSave={(val) => handleBenefitChange(i, 'title', val)}
                    title="Click to edit benefit title"
                  />
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  <EditableText
                    isEditing={isEditing}
                    value={cardData.desc}
                    onSave={(val) => handleBenefitChange(i, 'desc', val)}
                    title="Click to edit benefit description"
                  />
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </Section>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 4. ABOUT US
// ══════════════════════════════════════════════════════════════════════════════
const pillarsMeta = [
  { icon: Target, color: 'bg-orange-100 text-orange-600' },
  { icon: Eye, color: 'bg-teal-100 text-teal-600' },
  { icon: Heart, color: 'bg-purple-100 text-purple-600' },
];

function AboutUs({ contentOverride, isEditing, onFieldChange }) {
  const badge = contentOverride?.aboutBadge || defaultLandingContent.aboutBadge;
  const title = contentOverride?.aboutTitle || defaultLandingContent.aboutTitle;
  const subtitle = contentOverride?.aboutSubtitle || defaultLandingContent.aboutSubtitle;
  const pillars = contentOverride?.aboutPillars?.length ? contentOverride.aboutPillars : defaultLandingContent.aboutPillars;

  const handlePillarChange = (idx, field, val, options) => {
    const newPillars = pillars.map((p, i) => i === idx ? { ...p, [field]: val } : p);
    if (onFieldChange) onFieldChange('aboutPillars', newPillars, options);
  };

  return (
    <Section id="about-us" className="bg-transparent">
      <div className="relative z-10 max-w-5xl mx-auto">
        <div className="text-center mb-16 space-y-3">
          <span className="inline-block bg-gray-900 text-white text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full">
            <EditableText
              isEditing={isEditing}
              value={badge}
              onSave={(val) => onFieldChange && onFieldChange('aboutBadge', val)}
              title="Click to edit section badge"
            />
          </span>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900">
            <EditableText
              isEditing={isEditing}
              value={title}
              onSave={(val) => onFieldChange && onFieldChange('aboutTitle', val)}
              title="Click to edit section heading"
            />
          </h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            <EditableText
              isEditing={isEditing}
              value={subtitle}
              onSave={(val) => onFieldChange && onFieldChange('aboutSubtitle', val)}
              title="Click to edit section subtitle"
            />
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {pillarsMeta.map(({ icon: Icon, color }, i) => {
            const pillarData = pillars[i] || defaultLandingContent.aboutPillars[i] || {};
            return (
              <div
                key={i}
                className="group bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl p-8 shadow-sm hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 ${color} group-hover:scale-110 transition-transform duration-500`}>
                  <Icon size={22} strokeWidth={2} />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 block">
                  <EditableText
                    isEditing={isEditing}
                    value={pillarData.label}
                    onSave={(val) => handlePillarChange(i, 'label', val)}
                    title="Click to edit pillar label"
                  />
                </span>
                <h3 className="font-extrabold text-gray-900 text-xl mb-3">
                  <EditableText
                    isEditing={isEditing}
                    value={pillarData.heading}
                    onSave={(val) => handlePillarChange(i, 'heading', val)}
                    title="Click to edit pillar heading"
                  />
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  <EditableText
                    isEditing={isEditing}
                    value={pillarData.body}
                    onSave={(val) => handlePillarChange(i, 'body', val)}
                    title="Click to edit pillar body text"
                  />
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </Section>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 5. FAQ
// ══════════════════════════════════════════════════════════════════════════════
function FAQ({ contentOverride, isEditing, onFieldChange }) {
  const badge = contentOverride?.faqBadge || defaultLandingContent.faqBadge;
  const title = contentOverride?.faqTitle || defaultLandingContent.faqTitle;
  const subtitle = contentOverride?.faqSubtitle || defaultLandingContent.faqSubtitle;
  const faqsList = contentOverride?.faqs?.length ? contentOverride.faqs : defaultLandingContent.faqs;
  const [openIndex, setOpenIndex] = useState(null);

  const toggle = (i) => setOpenIndex(openIndex === i ? null : i);

  const handleFaqChange = (idx, field, val, options) => {
    const newFaqs = faqsList.map((f, i) => i === idx ? { ...f, [field]: val } : f);
    if (onFieldChange) onFieldChange('faqs', newFaqs, options);
  };

  return (
    <Section id="faq" className="bg-transparent">
      <div className="relative z-10 max-w-3xl mx-auto">
        <div className="text-center mb-14 space-y-3">
          <span className="inline-block bg-gray-900 text-white text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full">
            <EditableText
              isEditing={isEditing}
              value={badge}
              onSave={(val) => onFieldChange && onFieldChange('faqBadge', val)}
              title="Click to edit section badge"
            />
          </span>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900">
            <EditableText
              isEditing={isEditing}
              value={title}
              onSave={(val) => onFieldChange && onFieldChange('faqTitle', val)}
              title="Click to edit section heading"
            />
          </h2>
          <p className="text-gray-500 text-lg">
            <EditableText
              isEditing={isEditing}
              value={subtitle}
              onSave={(val) => onFieldChange && onFieldChange('faqSubtitle', val)}
              title="Click to edit section subtitle"
            />
          </p>
        </div>

        <div className="space-y-3">
          {faqsList.map((faq, i) => (
            <div key={i} className="border border-white/50 rounded-2xl bg-white/60 backdrop-blur-xl shadow-sm overflow-hidden">
              <button
                onClick={() => toggle(i)}
                className="w-full flex items-center justify-between px-7 py-5 text-left hover:bg-gray-50 transition-all duration-300 ease-in-out focus:outline-none group"
              >
                <span className="font-semibold text-gray-900 text-base pr-4">
                  <EditableText
                    isEditing={isEditing}
                    value={faq.q}
                    onSave={(val) => handleFaqChange(i, 'q', val)}
                    title="Click to edit FAQ question"
                  />
                </span>
                <span
                  className={`flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center transition-all duration-500 ease-in-out group-hover:bg-gray-900 group-hover:text-white ${
                    openIndex === i ? 'rotate-180 bg-gray-900 text-white' : 'text-gray-500'
                  }`}
                >
                  <ChevronDown size={16} strokeWidth={2.5} />
                </span>
              </button>

              <div className={`overflow-hidden transition-all duration-500 ease-in-out ${openIndex === i || isEditing ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                <p className="px-7 pb-6 text-gray-500 text-sm leading-relaxed">
                  <EditableText
                    isEditing={isEditing}
                    value={faq.a}
                    onSave={(val) => handleFaqChange(i, 'a', val)}
                    title="Click to edit FAQ answer"
                  />
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

const SYSTEM_PROMPT = `You are the Skill Bridge India (SBI) AI Assistant. You are helpful, professional, and concise. 
Key facts: 
- Initial skill assessments are entirely free for candidates. 
- We do NOT guarantee jobs. We provide objective skill reports and merit-based shortlisting to connect talent with verified employers.
- The process: Register, take a secure online assessment, get a personalized Skill Report, and top performers are shortlisted for employer interviews.
Always keep answers short (1-2 sentences) and encourage users to click "Register" or "Sign Up".`;

// ══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT — Composed Landing Sections
// ══════════════════════════════════════════════════════════════════════════════
export default function LandingSections({ contentOverride, isEditing, onFieldChange, isEditorPreview }) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  
  const DEFAULT_INSTA = "https://www.instagram.com/skill_bridge.2026?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==";
  const DEFAULT_WA = "https://api.whatsapp.com/message/347Q34LPY7JBP1?autoload=1&app_absent=0&utm_source=ig";
  const DEFAULT_EMAIL = "mailto:support@skillbridgeindia.com";
  const DEFAULT_PHONE = "tel:+919876543210";

  const [socialData, setSocialData] = useState({
    instagramUrl: DEFAULT_INSTA,
    showInstagram: true,
    whatsAppUrl: DEFAULT_WA,
    showWhatsApp: true,
    emailUrl: DEFAULT_EMAIL,
    showEmail: true,
    phoneUrl: DEFAULT_PHONE,
    showPhone: true,
  });

  const [isActionsOpen, setIsActionsOpen] = useState(false);

  const [activeModal, setActiveModal] = useState(null); // 'instagram' | 'whatsapp' | 'email' | 'phone' | null
  const [modalForm, setModalForm] = useState({
    instagramUrl: '',
    showInstagram: true,
    whatsAppUrl: '',
    showWhatsApp: true,
    emailUrl: '',
    showEmail: true,
    phoneUrl: '',
    showPhone: true,
  });
  const modalRef = useRef(null);

  const applySocialData = (data) => {
    if (!data) return;
    setSocialData({
      instagramUrl: (data.instagramUrl && !data.instagramUrl.includes('careerbridgeindia')) ? data.instagramUrl : DEFAULT_INSTA,
      showInstagram: data.showInstagram === false ? false : true,
      whatsAppUrl: (data.whatsAppUrl && !data.whatsAppUrl.includes('919876543210')) ? data.whatsAppUrl : DEFAULT_WA,
      showWhatsApp: data.showWhatsApp === false ? false : true,
      emailUrl: data.emailUrl || DEFAULT_EMAIL,
      showEmail: data.showEmail === false ? false : true,
      phoneUrl: data.phoneUrl || DEFAULT_PHONE,
      showPhone: data.showPhone === false ? false : true,
    });
  };

  useEffect(() => {
    if (contentOverride) {
      applySocialData(contentOverride);
      return;
    }

    const fetchFromAPI = async () => {
      try {
        const res = await axios.get(`/api/landing-content?_t=${Date.now()}`);
        if (res.data) {
          applySocialData(res.data);
          try { localStorage.setItem('cbi_landing_content', JSON.stringify(res.data)); } catch (e) {}
        }
      } catch (err) {
        try {
          const saved = localStorage.getItem('cbi_landing_content');
          if (saved) applySocialData(JSON.parse(saved));
        } catch (e2) {}
      }
    };

    fetchFromAPI();

    const onVisible = () => { if (!document.hidden) fetchFromAPI(); };
    document.addEventListener('visibilitychange', onVisible);

    const onStorage = (e) => {
      if (e.key === 'cbi_landing_content' && e.newValue) {
        try { applySocialData(JSON.parse(e.newValue)); } catch (e3) {}
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('storage', onStorage);
    };
  }, [contentOverride]);

  const activeInstagramUrl = socialData.instagramUrl;
  const activeShowInstagram = socialData.showInstagram !== false;
  const activeWhatsAppUrl = socialData.whatsAppUrl;
  const activeShowWhatsApp = socialData.showWhatsApp !== false;
  const activeEmailUrl = socialData.emailUrl;
  const activeShowEmail = socialData.showEmail !== false;
  const activePhoneUrl = socialData.phoneUrl;
  const activeShowPhone = socialData.showPhone !== false;

  const openEditModal = (type, e) => {
    if (isEditing) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      setModalForm({
        instagramUrl: activeInstagramUrl,
        showInstagram: activeShowInstagram,
        whatsAppUrl: activeWhatsAppUrl,
        showWhatsApp: activeShowWhatsApp,
        emailUrl: activeEmailUrl,
        showEmail: activeShowEmail,
        phoneUrl: activePhoneUrl,
        showPhone: activeShowPhone,
      });
      setActiveModal(type);
    }
  };

  const handleModalSave = async () => {
    const updatedSocial = {
      instagramUrl: modalForm.instagramUrl,
      showInstagram: Boolean(modalForm.showInstagram),
      whatsAppUrl: modalForm.whatsAppUrl,
      showWhatsApp: Boolean(modalForm.showWhatsApp),
      emailUrl: modalForm.emailUrl,
      showEmail: Boolean(modalForm.showEmail),
      phoneUrl: modalForm.phoneUrl,
      showPhone: Boolean(modalForm.showPhone),
    };

    setSocialData(prev => ({
      ...prev,
      ...updatedSocial
    }));

    if (onFieldChange) {
      onFieldChange('instagramUrl', updatedSocial.instagramUrl);
      onFieldChange('showInstagram', updatedSocial.showInstagram);
      onFieldChange('whatsAppUrl', updatedSocial.whatsAppUrl);
      onFieldChange('showWhatsApp', updatedSocial.showWhatsApp);
      onFieldChange('emailUrl', updatedSocial.emailUrl);
      onFieldChange('showEmail', updatedSocial.showEmail);
      onFieldChange('phoneUrl', updatedSocial.phoneUrl);
      onFieldChange('showPhone', updatedSocial.showPhone);
    }

    try {
      await axios.post('/api/landing-content', updatedSocial);
      try {
        const existing = JSON.parse(localStorage.getItem('cbi_landing_content') || '{}');
        localStorage.setItem('cbi_landing_content', JSON.stringify({ ...existing, ...updatedSocial }));
      } catch (e) {}
    } catch (e) {
      console.warn('Social settings save failed', e);
    }

    const modalLabels = {
      instagram: 'Instagram',
      whatsapp: 'WhatsApp',
      email: 'Email',
      phone: 'Phone'
    };
    const showKey = activeModal === 'instagram' ? updatedSocial.showInstagram
                  : activeModal === 'whatsapp' ? updatedSocial.showWhatsApp
                  : activeModal === 'email' ? updatedSocial.showEmail
                  : updatedSocial.showPhone;

    const stateText = showKey ? 'enabled' : 'hidden';
    toast.success(`${modalLabels[activeModal] || 'Contact'} icon ${stateText} & published live!`);
    setActiveModal(null);
  };

  // Close icon settings popover when user clicks outside it
  useEffect(() => {
    if (!activeModal) return;
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        setActiveModal(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeModal]);

  const isLoggedIn = !!localStorage.getItem('auth_token');
  
  const [messages, setMessages] = useState(() => {
    const logged = !!localStorage.getItem('auth_token');
    const msgText = logged
      ? "Welcome back! I'm your Skill Bridge Assistant. How can I help you with your assessments or dashboard today?"
      : "Hi there! I'm your Skill Bridge Assistant. How can I help you today?";
    return [{ sender: 'ai', text: msgText, isWelcome: true }];
  });
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => Math.random().toString(36).substring(2, 15));
  const messagesEndRef = useRef(null);
  const chatRef = useRef(null);
  const toggleBtnRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isChatOpen) {
      scrollToBottom();
    }
  }, [messages, isLoading, isChatOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        chatRef.current &&
        !chatRef.current.contains(event.target) &&
        toggleBtnRef.current &&
        !toggleBtnRef.current.contains(event.target)
      ) {
        setIsChatOpen(false);
      }
    };

    if (isChatOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isChatOpen]);

  const getMessageButtons = (msg) => {
    if (msg.sender !== 'ai') return null;
    const lowerText = msg.text.toLowerCase();
    const token = localStorage.getItem('auth_token');
    const role = localStorage.getItem('auth_role') || 'student';
    
    if (token) {
      let dashboardPath = '/student/dashboard';
      if (role === 'admin') dashboardPath = '/admin/dashboard';
      if (role === 'superadmin') dashboardPath = '/super-admin/dashboard';

      const buttons = [];
      if (lowerText.includes('exam') || lowerText.includes('assessment')) {
        buttons.push({ label: 'Go to Assessments', path: dashboardPath, type: 'primary' });
      } else if (lowerText.includes('profile')) {
        buttons.push({ label: 'View Profile', path: `/${role}/profile`, type: 'primary' });
      } else if (msg.isWelcome) {
        buttons.push({ label: 'Go to Dashboard', path: dashboardPath, type: 'primary' });
      }
      return buttons.length > 0 ? buttons : null;
    }

    const buttons = [];
    if (msg.isWelcome || lowerText.includes('register') || lowerText.includes('sign up') || lowerText.includes('assessment')) {
      buttons.push({ label: 'Register Free', path: '/register', type: 'primary' });
    }
    if (msg.isWelcome || lowerText.includes('login') || lowerText.includes('sign in')) {
      buttons.push({ label: 'Login', path: '/login', type: 'secondary' });
    }
    return buttons.length > 0 ? buttons : null;
  };

  const suggestions = [
    "Are assessment exams free?",
    "How does merit shortlisting work?",
    "What is in the Skill Report?",
    "Do you guarantee a job?"
  ];

  const sendMessage = async (textToSend) => {
    if (!textToSend.trim() || isLoading) return;

    const userMessageText = textToSend;
    setInputText('');
    setMessages((prev) => [...prev, { sender: 'user', text: userMessageText }]);
    setIsLoading(true);

    try {
      const baseUrl = (API_BASE_URL || '').replace(/\/+$/, '');
      const response = await fetch(`${baseUrl}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...messages.map((m) => ({
              role: m.sender === 'user' ? 'user' : 'assistant',
              content: m.text,
            })),
            { role: 'user', content: userMessageText },
          ],
          sessionId: sessionId
        }),
      });

      if (!response.ok) {
        throw new Error(`Chat API request failed: ${response.status}`);
      }

      const data = await response.json();
      const aiReply = data.reply || "I'm having trouble connecting right now, please try again.";
      setMessages((prev) => [...prev, { sender: 'ai', text: aiReply }]);
    } catch (error) {
      console.error('Error communicating with backend chat endpoint:', error);
      setMessages((prev) => [
        ...prev,
        { sender: 'ai', text: "I'm having trouble connecting to the AI assistant right now. Please try again shortly." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    sendMessage(inputText);
  };

  return (
    <>
      {/* Main content — z-10 floats above the background lights */}
      <div className="relative z-10 w-full bg-transparent">
        {/* Dynamic floating blobs — randomised on every page load */}
        <RandomBlobs count={8} zIndex="z-0" />

        <WhyChooseUs contentOverride={contentOverride} isEditing={isEditing} onFieldChange={onFieldChange} />
        <HowItWorks contentOverride={contentOverride} isEditing={isEditing} onFieldChange={onFieldChange} />
        <CandidateBenefits contentOverride={contentOverride} isEditing={isEditing} onFieldChange={onFieldChange} />
        <StudentReviewCarousel
          contentOverride={contentOverride}
          isEditing={isEditing}
          onFieldChange={onFieldChange}
          isEditorPreview={isEditorPreview}
        />
        <AboutUs contentOverride={contentOverride} isEditing={isEditing} onFieldChange={onFieldChange} />
        <FAQ contentOverride={contentOverride} isEditing={isEditing} onFieldChange={onFieldChange} />
      </div>

      {/* Floating Chat Window */}
      <div
        ref={chatRef}
        className={`fixed bottom-24 right-6 w-80 md:w-96 h-[32rem] flex flex-col overflow-hidden z-50 rounded-3xl transition-all duration-300 transform origin-bottom-right ${
          isChatOpen
            ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
            : 'opacity-0 translate-y-8 scale-75 pointer-events-none'
        }`}
        style={{
          background: 'rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255, 255, 255, 0.35)',
          boxShadow: '0 8px 40px rgba(99, 102, 241, 0.18), 0 2px 12px rgba(0,0,0,0.08)',
        }}
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent pointer-events-none" />

        <div className="px-5 py-4 flex items-center justify-between"
          style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.55) 0%, rgba(168,85,247,0.55) 100%)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(255,255,255,0.2)',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)' }}
            >
              <Bot size={18} className="text-white" />
            </div>
            <div>
              <h4 className="font-bold text-sm tracking-wide text-white">Bridge AI</h4>
              <p className="text-[10px] text-white/70 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
                Online · Llama 3.1
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 p-4 space-y-3 overflow-y-auto flex flex-col"
          style={{ background: 'rgba(255,255,255,0.04)' }}
        >
          {messages.map((msg, index) => {
            const buttons = getMessageButtons(msg);
            return (
              <div
                key={index}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] px-4 py-3 text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'rounded-2xl rounded-tr-none text-white shadow-md'
                      : 'rounded-2xl rounded-tl-none text-gray-800 border border-white/40 shadow-sm'
                  }`}
                  style={{
                    background:
                      msg.sender === 'user'
                        ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.9), rgba(168, 85, 247, 0.9))'
                        : 'rgba(255, 255, 255, 0.65)',
                    backdropFilter: 'blur(12px)',
                  }}
                >
                  {msg.text}
                </div>

                {buttons && buttons.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2 mb-1">
                    {buttons.map((btn, bIdx) => (
                      <Link
                        key={bIdx}
                        to={btn.path}
                        className={`px-4 py-2 text-xs font-bold rounded-xl shadow-sm hover:scale-105 hover:shadow-md transition-all duration-200 text-center ${
                          btn.type === 'primary' ? 'text-white' : 'text-gray-800 border border-black/10'
                        }`}
                        style={{
                          background: btn.type === 'primary'
                            ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.95), rgba(168, 85, 247, 0.95))'
                            : 'rgba(255, 255, 255, 0.65)',
                        }}
                      >
                        {btn.label}
                      </Link>
                    ))}
                  </div>
                )}

                {msg.isWelcome && messages.length === 1 && (
                  <div className="flex flex-col gap-1.5 mt-3 self-start w-full">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-gray-400 mb-0.5">Frequently Asked:</p>
                    <div className="flex flex-col gap-1.5">
                      {suggestions.map((suggestion, sIdx) => (
                        <button
                          key={sIdx}
                          type="button"
                          onClick={() => sendMessage(suggestion)}
                          className="text-left w-full px-3 py-2 text-xs font-semibold rounded-xl border border-white/40 hover:border-indigo-400 hover:bg-white/50 transition-all text-gray-700 shadow-sm cursor-pointer"
                          style={{
                            background: 'rgba(255, 255, 255, 0.45)',
                          }}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-start">
              <div
                className="rounded-2xl rounded-tl-none px-4 py-3 text-xs text-gray-700 border border-white/40 shadow-sm flex items-center space-x-1.5"
                style={{ background: 'rgba(255, 255, 255, 0.65)' }}
              >
                <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} className="p-3 border-t border-white/20 flex gap-2"
          style={{ background: 'rgba(255, 255, 255, 0.1)' }}
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask about assessments, shortlisting..."
            className="flex-1 px-4 py-2.5 text-xs rounded-2xl bg-white/50 border border-white/40 text-gray-800 placeholder-gray-500 focus:outline-none focus:bg-white/70 transition-all shadow-inner font-medium"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="px-3.5 py-2.5 rounded-2xl text-white disabled:opacity-40 transition-all cursor-pointer shadow-md flex items-center justify-center hover:scale-105 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, rgba(99,102,241,1) 0%, rgba(168,85,247,1) 100%)',
            }}
          >
            <Send size={15} />
          </button>
        </form>
      </div>

      {/* Floating Action Bar / Inline Editor Section — Instagram + WhatsApp + Mail + Phone + Bridge AI */}
      {!isEditorPreview ? (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end md:flex-row md:items-center gap-2.5 select-none">
          
          {/* Collapsible Action Buttons Container */}
          <div className={`flex flex-col items-end md:flex-row md:items-center gap-2.5 transition-all duration-500 ease-out origin-bottom-right md:origin-right ${
            isActionsOpen || isEditing
              ? 'opacity-100 scale-100 max-h-[500px] md:max-h-none max-w-full md:max-w-3xl pointer-events-auto translate-y-0 md:translate-x-0'
              : 'opacity-0 scale-90 max-h-0 md:max-h-none max-w-0 overflow-hidden pointer-events-none translate-y-4 md:translate-y-0 md:translate-x-4'
          }`}>

            {/* Instagram Button */}
            {(isEditing || activeShowInstagram) && (
              <a
                data-editable-social="true"
                href={isEditing ? '#' : (activeInstagramUrl || DEFAULT_INSTA)}
                target={isEditing ? undefined : "_blank"}
                rel={isEditing ? undefined : "noopener noreferrer"}
                onClick={(e) => isEditing && openEditModal('instagram', e)}
                className={`group flex items-center gap-2 bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 hover:scale-110 active:scale-95 text-white p-3.5 rounded-full shadow-2xl transition-all duration-300 border border-white/40 cursor-pointer relative ${
                  !activeShowInstagram ? 'opacity-30 grayscale' : ''
                }`}
                title={isEditing ? "Click to configure Instagram link & visibility" : "Follow Skill Bridge India on Instagram"}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
                <span className="max-w-xs md:max-w-0 md:group-hover:max-w-xs transition-all duration-500 overflow-hidden whitespace-nowrap text-xs font-black tracking-wide pr-1">
                  Instagram
                </span>
              </a>
            )}

            {/* WhatsApp Button */}
            {(isEditing || activeShowWhatsApp) && (
              <a
                data-editable-social="true"
                href={isEditing ? '#' : (activeWhatsAppUrl || DEFAULT_WA)}
                target={isEditing ? undefined : "_blank"}
                rel={isEditing ? undefined : "noopener noreferrer"}
                onClick={(e) => isEditing && openEditModal('whatsapp', e)}
                className={`group flex items-center gap-2 bg-gradient-to-tr from-emerald-500 to-teal-600 hover:scale-110 active:scale-95 text-white p-3.5 rounded-full shadow-2xl transition-all duration-300 border border-white/40 cursor-pointer relative ${
                  !activeShowWhatsApp ? 'opacity-30 grayscale' : ''
                }`}
                title={isEditing ? "Click to configure WhatsApp link & visibility" : "Chat on WhatsApp"}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                </svg>
                <span className="max-w-xs md:max-w-0 md:group-hover:max-w-xs transition-all duration-500 overflow-hidden whitespace-nowrap text-xs font-black tracking-wide pr-1">
                  WhatsApp
                </span>
              </a>
            )}

            {/* Mail / Email Button */}
            {(isEditing || activeShowEmail) && (
              <a
                data-editable-social="true"
                href={isEditing ? '#' : (activeEmailUrl || DEFAULT_EMAIL)}
                onClick={(e) => isEditing && openEditModal('email', e)}
                className={`group flex items-center gap-2 bg-gradient-to-tr from-sky-500 to-indigo-600 hover:scale-110 active:scale-95 text-white p-3.5 rounded-full shadow-2xl transition-all duration-300 border border-white/40 cursor-pointer relative ${
                  !activeShowEmail ? 'opacity-30 grayscale' : ''
                }`}
                title={isEditing ? "Click to configure Email link & visibility" : "Send us an Email"}
              >
                <Mail className="w-5 h-5 stroke-[2.5]" />
                <span className="max-w-xs md:max-w-0 md:group-hover:max-w-xs transition-all duration-500 overflow-hidden whitespace-nowrap text-xs font-black tracking-wide pr-1">
                  Email Us
                </span>
              </a>
            )}

            {/* Phone / Call Button */}
            {(isEditing || activeShowPhone) && (
              <a
                data-editable-social="true"
                href={isEditing ? '#' : (activePhoneUrl || DEFAULT_PHONE)}
                onClick={(e) => isEditing && openEditModal('phone', e)}
                className={`group flex items-center gap-2 bg-gradient-to-tr from-blue-600 to-cyan-500 hover:scale-110 active:scale-95 text-white p-3.5 rounded-full shadow-2xl transition-all duration-300 border border-white/40 cursor-pointer relative ${
                  !activeShowPhone ? 'opacity-30 grayscale' : ''
                }`}
                title={isEditing ? "Click to configure Phone link & visibility" : "Call Skill Bridge India"}
              >
                <Phone className="w-5 h-5 stroke-[2.5]" />
                <span className="max-w-xs md:max-w-0 md:group-hover:max-w-xs transition-all duration-500 overflow-hidden whitespace-nowrap text-xs font-black tracking-wide pr-1">
                  Call Us
                </span>
              </a>
            )}

          </div>

          {/* Unified Capsule: Arrow Collapse Toggle + Bridge AI */}
          <div className="flex items-center bg-gradient-to-r from-indigo-600/95 to-purple-600/95 backdrop-blur-xl border border-white/40 rounded-full shadow-2xl p-1 gap-0.5">
            
            {/* Arrow Collapse / Expand Button next to Bridge AI */}
            <button
              type="button"
              onClick={() => {
                setIsActionsOpen(prev => {
                  const nextState = !prev;
                  if (nextState) setIsChatOpen(false);
                  return nextState;
                });
              }}
              className="flex items-center justify-center p-2.5 text-white/90 hover:text-white hover:bg-white/20 rounded-full transition-all duration-300 cursor-pointer"
              title={isActionsOpen ? "Collapse contact buttons" : "Expand contact buttons (Instagram, WhatsApp, Email, Phone)"}
            >
              <ChevronRight size={18} className={`transform transition-transform duration-300 ${isActionsOpen ? 'rotate-90 md:rotate-180' : '-rotate-90 md:rotate-0'}`} />
            </button>

            {/* Bridge AI Chat Button */}
            <button
              ref={toggleBtnRef}
              onClick={() => {
                setIsChatOpen(prev => {
                  const nextState = !prev;
                  if (nextState) setIsActionsOpen(false);
                  return nextState;
                });
              }}
              className="flex items-center gap-2 text-white hover:opacity-95 active:scale-95 px-3.5 py-2.5 rounded-full transition-all duration-300 cursor-pointer font-bold"
              title="Ask Bridge AI"
            >
              <div className={`transition-transform duration-300 ${isChatOpen ? 'rotate-90 scale-90' : 'rotate-0 scale-100'}`}>
                {isChatOpen ? <X size={20} /> : <MessageSquare size={20} />}
              </div>
              <span className="text-xs font-black tracking-wide pr-1">
                Bridge AI
              </span>
            </button>
          </div>

        </div>
      ) : (
        /* Dedicated Section: Bridge AI Assistant & Official Channels (Inside Super Admin Visual Editor Preview) */
        <section className="w-full py-10 px-4 sm:px-6 bg-gradient-to-b from-gray-900 via-slate-900 to-black text-white border-t border-gray-800 relative z-10 my-4 sm:my-6 rounded-2xl sm:rounded-3xl shadow-xl">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-left">
            
            <div className="space-y-1.5 max-w-lg">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] font-extrabold uppercase tracking-wider">
                <span>🤖</span> AI Assistant & Contact Channels
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">Ask Bridge AI & Connect Directly</h3>
              <p className="text-xs text-gray-400 leading-relaxed font-medium">
                Instant AI career guidance and direct access to official WhatsApp, Instagram, Email, and Phone channels.
              </p>
            </div>

            {/* Action Buttons Container */}
            <div className="flex flex-wrap items-center justify-center md:justify-end gap-2.5 select-none">

              {/* Instagram Button */}
              {(isEditing || activeShowInstagram) && (
                <a
                  data-editable-social="true"
                  href={isEditing ? '#' : (activeInstagramUrl || DEFAULT_INSTA)}
                  target={isEditing ? undefined : "_blank"}
                  rel={isEditing ? undefined : "noopener noreferrer"}
                  onClick={(e) => isEditing && openEditModal('instagram', e)}
                  className={`group flex items-center gap-2 bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 hover:scale-105 active:scale-95 text-white px-4 py-2.5 rounded-full shadow-lg transition-all duration-300 border border-white/30 cursor-pointer relative ${
                    !activeShowInstagram ? 'opacity-30 grayscale' : ''
                  }`}
                  title={isEditing ? "Click to configure Instagram link & visibility" : "Follow Skill Bridge India on Instagram"}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                  <span className="text-xs font-extrabold tracking-wide">
                    Instagram
                  </span>
                  {isEditing && !activeShowInstagram && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow">Hidden</span>
                  )}
                </a>
              )}

              {/* WhatsApp Button */}
              {(isEditing || activeShowWhatsApp) && (
                <a
                  data-editable-social="true"
                  href={isEditing ? '#' : (activeWhatsAppUrl || DEFAULT_WA)}
                  target={isEditing ? undefined : "_blank"}
                  rel={isEditing ? undefined : "noopener noreferrer"}
                  onClick={(e) => isEditing && openEditModal('whatsapp', e)}
                  className={`group flex items-center gap-2 bg-gradient-to-tr from-emerald-500 to-teal-600 hover:scale-105 active:scale-95 text-white px-4 py-2.5 rounded-full shadow-lg transition-all duration-300 border border-white/30 cursor-pointer relative ${
                    !activeShowWhatsApp ? 'opacity-30 grayscale' : ''
                  }`}
                  title={isEditing ? "Click to configure WhatsApp link & visibility" : "Chat on WhatsApp"}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                  </svg>
                  <span className="text-xs font-extrabold tracking-wide">
                    WhatsApp
                  </span>
                  {isEditing && !activeShowWhatsApp && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow">Hidden</span>
                  )}
                </a>
              )}

              {/* Mail / Email Button */}
              {(isEditing || activeShowEmail) && (
                <a
                  data-editable-social="true"
                  href={isEditing ? '#' : (activeEmailUrl || DEFAULT_EMAIL)}
                  onClick={(e) => isEditing && openEditModal('email', e)}
                  className={`group flex items-center gap-2 bg-gradient-to-tr from-sky-500 to-indigo-600 hover:scale-105 active:scale-95 text-white px-4 py-2.5 rounded-full shadow-lg transition-all duration-300 border border-white/30 cursor-pointer relative ${
                    !activeShowEmail ? 'opacity-30 grayscale' : ''
                  }`}
                  title={isEditing ? "Click to configure Email link & visibility" : "Send us an Email"}
                >
                  <Mail className="w-4 h-4 stroke-[2.5]" />
                  <span className="text-xs font-extrabold tracking-wide">
                    Email
                  </span>
                  {isEditing && !activeShowEmail && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow">Hidden</span>
                  )}
                </a>
              )}

              {/* Phone / Call Button */}
              {(isEditing || activeShowPhone) && (
                <a
                  data-editable-social="true"
                  href={isEditing ? '#' : (activePhoneUrl || DEFAULT_PHONE)}
                  onClick={(e) => isEditing && openEditModal('phone', e)}
                  className={`group flex items-center gap-2 bg-gradient-to-tr from-blue-600 to-cyan-500 hover:scale-105 active:scale-95 text-white px-4 py-2.5 rounded-full shadow-lg transition-all duration-300 border border-white/30 cursor-pointer relative ${
                    !activeShowPhone ? 'opacity-30 grayscale' : ''
                  }`}
                  title={isEditing ? "Click to configure Phone link & visibility" : "Call Skill Bridge India"}
                >
                  <Phone className="w-4 h-4 stroke-[2.5]" />
                  <span className="text-xs font-extrabold tracking-wide">
                    Call Us
                  </span>
                  {isEditing && !activeShowPhone && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow">Hidden</span>
                  )}
                </a>
              )}

              {/* Bridge AI Chat Button */}
              <button
                ref={toggleBtnRef}
                onClick={() => {
                  setIsChatOpen(prev => !prev);
                }}
                className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white hover:opacity-95 active:scale-95 px-5 py-2.5 rounded-full transition-all duration-300 cursor-pointer font-bold shadow-lg border border-white/30"
                title="Ask Bridge AI"
              >
                <div className={`transition-transform duration-300 ${isChatOpen ? 'rotate-90 scale-90' : 'rotate-0 scale-100'}`}>
                  {isChatOpen ? <X size={18} /> : <MessageSquare size={18} />}
                </div>
                <span className="text-xs font-black tracking-wide">
                  Bridge AI
                </span>
              </button>

            </div>
          </div>
        </section>
      )}

      {isEditing && activeModal && (
        <div 
          ref={modalRef}
          className="fixed bottom-24 right-6 z-[100] w-80 md:w-96 bg-gray-900/95 backdrop-blur-2xl border border-gray-700/80 rounded-3xl p-5 shadow-2xl text-white space-y-4 animate-fade-in select-none"
          style={{
            boxShadow: '0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)'
          }}
        >
          <div className="flex items-center justify-between border-b border-gray-800 pb-3">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              {activeModal === 'instagram' && (
                <>
                  <span className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white text-xs shadow">📸</span>
                  Instagram Settings
                </>
              )}
              {activeModal === 'whatsapp' && (
                <>
                  <span className="w-7 h-7 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs shadow">💬</span>
                  WhatsApp Settings
                </>
              )}
              {activeModal === 'email' && (
                <>
                  <span className="w-7 h-7 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white text-xs shadow">✉️</span>
                  Email Settings
                </>
              )}
              {activeModal === 'phone' && (
                <>
                  <span className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white text-xs shadow">📞</span>
                  Phone / Call Settings
                </>
              )}
            </h3>
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="text-left space-y-3">
            <div>
              <label className="block text-[10px] font-extrabold text-gray-300 uppercase tracking-wider mb-1">
                {activeModal === 'instagram' && 'Instagram Profile Link'}
                {activeModal === 'whatsapp' && 'WhatsApp Link / Number'}
                {activeModal === 'email' && 'Email Address / Mailto Link'}
                {activeModal === 'phone' && 'Phone Number / Tel Link'}
              </label>
              <input
                type="text"
                value={
                  activeModal === 'instagram' ? modalForm.instagramUrl
                  : activeModal === 'whatsapp' ? modalForm.whatsAppUrl
                  : activeModal === 'email' ? modalForm.emailUrl
                  : modalForm.phoneUrl
                }
                onChange={(e) => {
                  const key = activeModal === 'instagram' ? 'instagramUrl'
                            : activeModal === 'whatsapp' ? 'whatsAppUrl'
                            : activeModal === 'email' ? 'emailUrl'
                            : 'phoneUrl';
                  setModalForm(prev => ({ ...prev, [key]: e.target.value }));
                }}
                placeholder={
                  activeModal === 'instagram' ? 'https://instagram.com/your_handle'
                  : activeModal === 'whatsapp' ? 'https://wa.me/919876543210'
                  : activeModal === 'email' ? 'mailto:support@skillbridgeindia.com'
                  : 'tel:+919876543210'
                }
                className="w-full bg-black/80 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 font-mono"
              />
              <p className="text-[9px] text-gray-400 mt-1">
                {activeModal === 'instagram' && 'Opens when visitors click the Instagram icon.'}
                {activeModal === 'whatsapp' && 'Format: https://wa.me/PHONE_NUMBER'}
                {activeModal === 'email' && 'Format: mailto:support@skillbridgeindia.com'}
                {activeModal === 'phone' && 'Format: tel:+919876543210'}
              </p>
            </div>

            {/* Visibility Toggle */}
            <div className="flex items-center justify-between bg-black/50 p-2.5 rounded-xl border border-gray-800">
              <span className="text-xs font-bold text-gray-300">Show button on landing page?</span>
              <button
                type="button"
                onClick={() => {
                  const showKey = activeModal === 'instagram' ? 'showInstagram' 
                                : activeModal === 'whatsapp' ? 'showWhatsApp' 
                                : activeModal === 'email' ? 'showEmail' 
                                : 'showPhone';
                  setModalForm(prev => ({ ...prev, [showKey]: !prev[showKey] }));
                }}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  (activeModal === 'instagram' ? modalForm.showInstagram
                   : activeModal === 'whatsapp' ? modalForm.showWhatsApp
                   : activeModal === 'email' ? modalForm.showEmail
                   : modalForm.showPhone)
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                    : 'bg-red-500/20 text-red-400 border border-red-500/40'
                }`}
              >
                {(activeModal === 'instagram' ? modalForm.showInstagram
                 : activeModal === 'whatsapp' ? modalForm.showWhatsApp
                 : activeModal === 'email' ? modalForm.showEmail
                 : modalForm.showPhone) ? '✓ Visible' : '✕ Hidden'}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-800/80">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleModalSave}
              className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-extrabold px-4 py-1.5 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
            >
              Done & Apply
            </button>
          </div>

        </div>
      )}
    </>
  );
}
