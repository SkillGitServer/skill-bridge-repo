const mongoose = require('mongoose');

const landingContentSchema = new mongoose.Schema({
  heroBadge: { type: String, default: "Skill Bridge India" },
  heroTitle: { type: String, default: "Don't make assessments stressful." },
  heroSubtitle: { type: String, default: "Skill Bridge India makes it easy to take secure, timed exams and get instant, automated results right from your phone." },
  ctaText: { type: String, default: "Get Started Free" },
  heroDeviceText: { type: String, default: "Exam Verified Successfully" },
  heroDeviceBrand: { type: String, default: "SKILL BRIDGE INDIA" },

  whyBadge: { type: String, default: "Why Choose Us" },
  whyTitle: { type: String, default: "Built for real careers." },
  whySubtitle: { type: String, default: "Everything you need to assess, improve, and advance — in one seamless platform." },
  whyCards: { type: Array, default: [] },

  howBadge: { type: String, default: "How It Works" },
  howTitle: { type: String, default: "Six steps to your next opportunity." },
  howSubtitle: { type: String, default: "A transparent, merit-driven process from registration to career support." },
  howSteps: { type: Array, default: [] },

  benefitsBadge: { type: String, default: "Candidate Benefits" },
  benefitsTitle: { type: String, default: "Everything in your corner." },
  benefitsSubtitle: { type: String, default: "From your first assessment to your career milestone, we've built tools that work for you." },
  benefitCards: { type: Array, default: [] },

  aboutBadge: { type: String, default: "About Us" },
  aboutTitle: { type: String, default: "Our foundation." },
  aboutSubtitle: { type: String, default: "Skill Bridge India is built on a commitment to fairness, transparency, and meaningful career development." },
  aboutPillars: { type: Array, default: [] },

  faqBadge: { type: String, default: "FAQ" },
  faqTitle: { type: String, default: "Your questions, answered." },
  faqSubtitle: { type: String, default: "Honest answers about how Skill Bridge India works." },
  faqs: { type: Array, default: [] },

  footerBrand: { type: String, default: "Skill Bridge India" },
  footerText: { type: String, default: "© 2026 Skill Bridge India. All rights reserved." },
  footerLinkAbout: { type: String, default: "About" },
  footerLinkPrivacy: { type: String, default: "Privacy" },
  footerLinkTerms: { type: String, default: "Terms" },
  footerLinkContact: { type: String, default: "Contact" },

  instagramUrl: { type: String, default: "https://www.instagram.com/skill_bridge.2026?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==" },
  showInstagram: { type: Boolean, default: true },
  whatsAppUrl: { type: String, default: "https://api.whatsapp.com/message/347Q34LPY7JBP1?autoload=1&app_absent=0&utm_source=ig" },
  showWhatsApp: { type: Boolean, default: true },
  emailUrl: { type: String, default: "mailto:support@skillbridgeindia.com" },
  showEmail: { type: Boolean, default: true },
  phoneUrl: { type: String, default: "tel:+919876543210" },
  showPhone: { type: Boolean, default: true },
  updatedAt: { type: Date, default: Date.now }
}, { strict: false });

module.exports = mongoose.model('LandingContent', landingContentSchema);
