import React from 'react';
import { Link } from 'react-router-dom';
import EditableText from './EditableText';

function Footer({ contentOverride, isEditing, onFieldChange }) {
  const footerText = contentOverride?.footerText || `© ${new Date().getFullYear()} Skill Bridge India. All rights reserved.`;
  const footerBrand = contentOverride?.footerBrand || "Skill Bridge India";
  const footerLinkAbout = contentOverride?.footerLinkAbout || "About";
  const footerLinkPrivacy = contentOverride?.footerLinkPrivacy || "Privacy";
  const footerLinkTerms = contentOverride?.footerLinkTerms || "Terms";
  const footerLinkContact = contentOverride?.footerLinkContact || "Contact";

  const handleChange = (field, val, options) => {
    if (onFieldChange) onFieldChange(field, val, options);
  };

  return (
    <footer
      className="relative w-full mt-auto py-12 px-6 select-none"
      style={{
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.2)',
      }}
    >
      <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center space-y-6 text-center">

        {/* Brand */}
        <span className="inline-block text-2xl font-extrabold text-gray-900 tracking-tight pb-1">
          <EditableText
            as="span"
            isEditing={isEditing}
            value={footerBrand}
            onSave={(val) => handleChange('footerBrand', val)}
            title="Click to edit Footer Brand text"
          />
        </span>

        {/* Links */}
        <div className="flex flex-wrap justify-center gap-6 md:gap-10 text-sm font-semibold text-gray-600">
          <Link to="/about" className="hover:text-teal-500 transition-colors" onClick={(e) => isEditing && e.preventDefault()}>
            <EditableText
              as="span"
              isEditing={isEditing}
              value={footerLinkAbout}
              onSave={(val) => handleChange('footerLinkAbout', val)}
              title="Click to edit About link label"
            />
          </Link>
          <Link to="/privacy" className="hover:text-yellow-500 transition-colors" onClick={(e) => isEditing && e.preventDefault()}>
            <EditableText
              as="span"
              isEditing={isEditing}
              value={footerLinkPrivacy}
              onSave={(val) => handleChange('footerLinkPrivacy', val)}
              title="Click to edit Privacy link label"
            />
          </Link>
          <Link to="/terms" className="hover:text-purple-500 transition-colors" onClick={(e) => isEditing && e.preventDefault()}>
            <EditableText
              as="span"
              isEditing={isEditing}
              value={footerLinkTerms}
              onSave={(val) => handleChange('footerLinkTerms', val)}
              title="Click to edit Terms link label"
            />
          </Link>
          <Link to="/contact" className="hover:text-orange-500 transition-colors" onClick={(e) => isEditing && e.preventDefault()}>
            <EditableText
              as="span"
              isEditing={isEditing}
              value={footerLinkContact}
              onSave={(val) => handleChange('footerLinkContact', val)}
              title="Click to edit Contact link label"
            />
          </Link>
        </div>

        {/* Copyright */}
        <p className="text-xs text-gray-500 pt-4 font-medium">
          <EditableText
            as="span"
            isEditing={isEditing}
            value={footerText}
            onSave={(val) => handleChange('footerText', val)}
            title="Click to edit Footer Copyright Text directly"
          />
        </p>

      </div>
    </footer>
  );
}

export default Footer;
