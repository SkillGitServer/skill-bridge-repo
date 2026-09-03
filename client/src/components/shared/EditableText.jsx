import React, { useRef, useEffect } from 'react';

/**
 * Reusable EditableText component for direct inline WYSIWYG editing.
 * Renders as contentEditable when isEditing is true, with subtle hover/focus borders.
 * Uses a ref to ensure native cursor management during typing so text doesn't type backwards.
 */
export default function EditableText({
  value,
  onSave,
  isEditing = false,
  as: Component = 'span',
  className = '',
  placeholder = 'Click to edit text...',
  title = 'Click to edit text directly',
  children
}) {
  const elementRef = useRef(null);
  const displayValue = value !== undefined && value !== null && value !== '' ? value : (children || placeholder);

  // Sync value from props ONLY when the element is NOT currently focused by the user
  useEffect(() => {
    if (isEditing && elementRef.current && document.activeElement !== elementRef.current) {
      if (elementRef.current.innerText !== displayValue) {
        elementRef.current.innerText = displayValue;
      }
    }
  }, [displayValue, isEditing]);

  if (!isEditing) {
    return <Component className={className}>{displayValue}</Component>;
  }

  const handleSaveText = (el, isBlur = false) => {
    if (!el || !onSave) return;
    const rawText = el.innerText || el.textContent || '';
    // Normalize string: replace non-breaking spaces & convert single-line newlines
    const normalized = rawText.replace(/\xa0/g, ' ').replace(/[\r\n]+/g, ' ');
    const cleanedText = isBlur ? normalized.trim() : normalized;
    onSave(cleanedText, { isBlur });
  };

  return (
    <Component
      ref={elementRef}
      contentEditable={true}
      suppressContentEditableWarning={true}
      data-editable-text="true"
      onInput={(e) => {
        handleSaveText(e.currentTarget, false);
      }}
      onBlur={(e) => {
        handleSaveText(e.currentTarget, true);
      }}
      className={`outline-none transition-all duration-200 cursor-text select-text ${
        isEditing
          ? 'hover:ring-2 hover:ring-orange-500/80 focus:ring-2 focus:ring-orange-500 focus:bg-orange-50/30 rounded-xl px-1.5 py-0.5 border border-dashed border-orange-400/80 bg-orange-50/10 shadow-sm'
          : ''
      } ${className}`}
      title={title}
    />
  );
}
