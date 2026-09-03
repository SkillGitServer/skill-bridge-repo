import React, { useState, useEffect, useRef } from 'react';

function OtpInput({ value = '', onChange, autoFocus = true, disabled = false }) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef([]);

  // Sync internal digits array whenever external `value` prop changes
  useEffect(() => {
    const str = String(value || '').slice(0, 6);
    const newDigits = ['', '', '', '', '', ''];
    for (let i = 0; i < str.length; i++) {
      newDigits[i] = str[i];
    }
    setDigits(newDigits);
  }, [value]);

  // Auto-focus first box immediately on mount
  useEffect(() => {
    if (autoFocus) {
      const timer = setTimeout(() => {
        if (inputRefs.current[0]) {
          inputRefs.current[0].focus();
          inputRefs.current[0].select();
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [autoFocus]);

  const updateDigits = (newDigits) => {
    setDigits(newDigits);
    if (onChange) {
      onChange(newDigits.join(''));
    }
  };

  const handleChange = (index, e) => {
    const rawVal = e.target.value;
    const cleaned = rawVal.replace(/\D/g, '');

    if (!cleaned) {
      const newDigits = [...digits];
      newDigits[index] = '';
      updateDigits(newDigits);
      return;
    }

    if (cleaned.length > 1) {
      // Paste / multi-digit entry
      const pasted = cleaned.slice(0, 6).split('');
      const newDigits = ['', '', '', '', '', ''];
      pasted.forEach((d, i) => {
        newDigits[i] = d;
      });
      updateDigits(newDigits);
      const focusIndex = Math.min(pasted.length, 5);
      if (inputRefs.current[focusIndex]) {
        inputRefs.current[focusIndex].focus();
      }
      return;
    }

    const newDigits = [...digits];
    newDigits[index] = cleaned;
    updateDigits(newDigits);

    // Auto-advance focus to next input box
    if (index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0 && inputRefs.current[index - 1]) {
        inputRefs.current[index - 1].focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1].focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData) {
      const newDigits = ['', '', '', '', '', ''];
      pastedData.split('').forEach((char, idx) => {
        newDigits[idx] = char;
      });
      updateDigits(newDigits);
      const focusIndex = Math.min(pastedData.length, 5);
      if (inputRefs.current[focusIndex]) {
        inputRefs.current[focusIndex].focus();
      }
    }
  };

  return (
    <div className="flex items-center justify-between gap-1.5 sm:gap-2.5 w-full my-3 select-none">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          disabled={disabled}
          autoComplete={index === 0 ? "one-time-code" : "off"}
          value={digit}
          onChange={(e) => handleChange(index, e)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onClick={() => {
            if (inputRefs.current[index]) {
              inputRefs.current[index].select();
            }
          }}
          className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-black rounded-2xl border transition-all duration-200 shadow-sm focus:outline-none ${
            digit
              ? 'border-black bg-black/5 text-black shadow-md scale-[1.02]'
              : 'border-gray-300 bg-white text-gray-900 focus:border-black focus:ring-2 focus:ring-black/20'
          }`}
        />
      ))}
    </div>
  );
}

export default OtpInput;
