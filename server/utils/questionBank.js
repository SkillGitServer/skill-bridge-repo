const path = require('path');
const fs = require('fs');

/**
 * Question Bank Utility for Exam Report PDF Generation
 *
 * Solves:
 * 1. Question Mismatch: Strictly retrieves and maps questions by their explicit
 *    question_id or question references from the student's actual exam attempt.
 *    Never pulls random, arbitrary, or unattempted questions from the bank.
 * 2. Option Duplication: Strictly iterates across unique array indices (options[0],
 *    options[1], etc.) or specific option keys (A, B, C, D) so each choice displays
 *    its distinct text.
 */

// Cache containers
let idMap = null;
let textMap = null;
let isLoaded = false;

// Candidate data directories for both local dev and production
function resolveDataDir() {
  const candidates = [
    path.resolve(__dirname, '../../client/src/data'),
    path.resolve(process.cwd(), 'client/src/data'),
    path.resolve(process.cwd(), '../client/src/data'),
    path.resolve(__dirname, '../data')
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, 'aptitude.json'))) {
      return candidate;
    }
  }
  return path.resolve(__dirname, '../../client/src/data');
}

// Normalize question text for reliable whitespace/case-insensitive matching
function normalizeText(str) {
  if (!str || typeof str !== 'string') return '';
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Lazy-load and index all 6 subject question banks into O(1) lookup maps
function loadQuestionBanks() {
  if (isLoaded && idMap && textMap) {
    return;
  }

  idMap = new Map();
  textMap = new Map();

  const dataDir = resolveDataDir();
  const bankFiles = [
    { subject: 'aptitude', file: 'aptitude.json' },
    { subject: 'behaviour', file: 'behaviour_and_personality.json' },
    { subject: 'communication', file: 'communication.json' },
    { subject: 'problem_solving', file: 'problem_solving.json' },
    { subject: 'situational', file: 'situational.json' },
    { subject: 'workplace_skills', file: 'workplace_skills.json' }
  ];

  bankFiles.forEach(({ subject, file }) => {
    const filePath = path.join(dataDir, file);
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf8');
        const questions = JSON.parse(raw);
        if (Array.isArray(questions)) {
          questions.forEach((q) => {
            if (!q) return;
            const enrichedQ = { ...q, subjectCategory: subject };

            // 1. Index by explicit Question ID (both lowercase and original)
            if (q.id) {
              const cleanId = String(q.id).toLowerCase().trim();
              idMap.set(cleanId, enrichedQ);
            }
            if (q.question_id) {
              const cleanQId = String(q.question_id).toLowerCase().trim();
              idMap.set(cleanQId, enrichedQ);
            }

            // 2. Index by normalized question text
            const qText = q.question || q.questionText;
            if (qText) {
              const normKey = normalizeText(qText);
              if (normKey) {
                textMap.set(normKey, enrichedQ);
              }
            }
          });
        }
      }
    } catch (err) {
      console.error(`[QuestionBank] Error loading bank file ${file}:`, err.message);
    }
  });

  isLoaded = true;
}

/**
 * Strictly finds the specific question in the question bank using explicit
 * question_id, questionId, id, or normalized questionText.
 * NEVER returns random or unlinked questions.
 */
function findBankQuestion(qRef) {
  if (!qRef) return null;
  loadQuestionBanks();

  // 1. Priority: Direct question_id / questionId / id lookup
  const targetId = qRef.question_id || qRef.questionId || qRef.id || qRef._id;
  if (targetId) {
    const cleanId = String(targetId).toLowerCase().trim();
    if (idMap.has(cleanId)) {
      return idMap.get(cleanId);
    }
  }

  // 2. Secondary: Match by exact question text reference
  const targetText = qRef.questionText || qRef.question || (typeof qRef === 'string' ? qRef : '');
  if (targetText && typeof targetText === 'string') {
    const normKey = normalizeText(targetText);
    if (normKey && textMap.has(normKey)) {
      return textMap.get(normKey);
    }
  }

  return null;
}

/**
 * Extracts and returns an array of unique, distinct option strings for a question.
 * Correctly accesses each index (options[0], options[1], options[2], options[3])
 * or specific option keys (A, B, C, D) to prevent option duplication bugs.
 */
function getDistinctOptions(q, bankQ) {
  let raw = (bankQ && bankQ.options) || (q && q.options) || (q && q.choices);

  // Check if options are stored in key-value format (optionA, optionB, etc.)
  if (!raw && (q || bankQ)) {
    const src = bankQ || q;
    if (src.optionA || src.optionB || src.optA || src.optB || src.A || src.B) {
      raw = [
        src.optionA || src.optA || src.A,
        src.optionB || src.optB || src.B,
        src.optionC || src.optC || src.C,
        src.optionD || src.optD || src.D,
        src.optionE || src.optE || src.E,
        src.optionF || src.optF || src.F
      ].filter(v => v !== undefined && v !== null && String(v).trim() !== '');
    }
  }

  // If raw is an Object (e.g. { A: '...', B: '...' } or { '0': '...', '1': '...' })
  if (raw && !Array.isArray(raw) && typeof raw === 'object') {
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    const hasLetterKeys = letters.some(k => k in raw || k.toLowerCase() in raw || `option${k}` in raw || `opt${k}` in raw);
    if (hasLetterKeys) {
      raw = letters
        .map(k => raw[k] || raw[k.toLowerCase()] || raw[`option${k}`] || raw[`opt${k}`])
        .filter(v => v !== undefined && v !== null && String(v).trim() !== '');
    } else {
      raw = Object.values(raw).filter(v => v !== undefined && v !== null && String(v).trim() !== '');
    }
  }

  if (!Array.isArray(raw) || raw.length === 0) {
    return [];
  }

  // Ensure each unique index of the options array is accessed distinctly
  return raw.map((opt) => {
    if (opt === null || opt === undefined) return '';
    if (typeof opt === 'object') {
      return (opt.text || opt.label || opt.value || opt.option || JSON.stringify(opt)).trim();
    }
    return String(opt).trim();
  }).filter(str => str.length > 0);
}

/**
 * Maps answer values (numeric index, single letter A-F, or matching text)
 * to formatted letter-prefixed distinct option strings: "A. [Option text]"
 */
function formatAnswerText(ansVal, optionsArray) {
  if (ansVal === null || ansVal === undefined || ansVal === '') {
    return 'Not Answered / Skipped';
  }

  const strVal = String(ansVal).trim();
  const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F'];

  // 1. If single letter A-F
  if (/^[A-F]$/i.test(strVal)) {
    const letterIdx = optionLetters.indexOf(strVal.toUpperCase());
    if (letterIdx !== -1 && Array.isArray(optionsArray) && optionsArray[letterIdx]) {
      const optStr = String(optionsArray[letterIdx]).trim();
      const cleanOpt = optStr.replace(new RegExp(`^(?:Option\\s+)?${strVal}[\\.\\)\\:\\s]+`, 'i'), '').trim();
      return `${strVal.toUpperCase()}. ${cleanOpt}`;
    }
    return `Option ${strVal.toUpperCase()}`;
  }

  // 2. If ansVal is numeric index 0-9
  const idxNum = Number(strVal);
  if (!isNaN(idxNum) && Number.isInteger(idxNum) && idxNum >= 0 && idxNum <= 9) {
    const letter = optionLetters[idxNum] || `${idxNum + 1}`;
    if (Array.isArray(optionsArray) && optionsArray[idxNum]) {
      const optStr = String(optionsArray[idxNum]).trim();
      const cleanOpt = optStr.replace(new RegExp(`^(?:Option\\s+)?${letter}[\\.\\)\\:\\s]+`, 'i'), '').trim();
      return `${letter}. ${cleanOpt}`;
    }
    return `Option ${letter}`;
  }

  // 3. If strVal is already formatted with letter prefix (e.g. "D. 35%" or "Option A: ...")
  const prefixMatch = strVal.match(/^(?:Option\s+)?([A-F])[\\.\\)\\:\\s]+(.*)$/i);
  if (prefixMatch) {
    const matchedLetter = prefixMatch[1].toUpperCase();
    const restText = prefixMatch[2].trim();
    return `${matchedLetter}. ${restText}`;
  }

  // 4. If strVal matches one of the distinct options in optionsArray
  if (Array.isArray(optionsArray) && optionsArray.length > 0) {
    const cleanTarget = strVal.toLowerCase().replace(/^(?:option\s+)?[a-f][\\.\\)\\:\\s]+/i, '').trim();
    const matchIdx = optionsArray.findIndex(opt => {
      const optStr = String(opt).toLowerCase().replace(/^(?:option\s+)?[a-f][\\.\\)\\:\\s]+/i, '').trim();
      return optStr === cleanTarget;
    });
    if (matchIdx !== -1) {
      const letter = optionLetters[matchIdx] || `${matchIdx + 1}`;
      const cleanOpt = String(optionsArray[matchIdx]).replace(new RegExp(`^(?:Option\\s+)?${letter}[\\.\\)\\:\\s]+`, 'i'), '').trim();
      return `${letter}. ${cleanOpt}`;
    }
  }

  if (typeof ansVal === 'object') {
    return ansVal.text || ansVal.answer || ansVal.label || JSON.stringify(ansVal);
  }

  return strVal;
}

module.exports = {
  findBankQuestion,
  getDistinctOptions,
  formatAnswerText,
  loadQuestionBanks
};
