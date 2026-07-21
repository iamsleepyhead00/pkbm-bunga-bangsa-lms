/**
 * utils.js - Helper functions
 * Utility functions for ID generation, date formatting, password hashing,
 * XSS prevention, progress calculation, and grading.
 */

/**
 * Generate a unique ID with a given prefix
 * @param {string} prefix - Prefix for the ID (e.g., 'usr', 'crs', 'mat')
 * @returns {string} Generated ID like "usr_abc123def456"
 */
export function generateId(prefix = 'id') {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const array = new Uint8Array(12);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
    for (let i = 0; i < 12; i++) {
      result += chars[array[i] % chars.length];
    }
  } else {
    for (let i = 0; i < 12; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
  }
  return `${prefix}_${result}`;
}

/**
 * Format an ISO date string to localized Indonesian date
 * @param {string} isoString - ISO date string
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export function formatDate(isoString, options = {}) {
  if (!isoString) return '-';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '-';
    const defaultOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      ...options
    };
    return date.toLocaleDateString('id-ID', defaultOptions);
  } catch {
    return '-';
  }
}

/**
 * Hash a password using SHA-256
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hex-encoded SHA-256 hash
 */
export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Escape HTML to prevent XSS attacks
 * @param {string} str - Raw string that may contain HTML
 * @returns {string} Escaped string safe for innerHTML
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  const text = String(str);
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * Calculate progress percentage
 * @param {number} accessedCount - Number of items accessed
 * @param {number} totalCount - Total number of items
 * @returns {number} Percentage 0-100
 */
export function calculateProgress(accessedCount, totalCount) {
  if (!totalCount || totalCount <= 0) return 0;
  const progress = Math.round((accessedCount / totalCount) * 100);
  return Math.min(100, Math.max(0, progress));
}

/**
 * Calculate auto-grade for quiz (pilihan ganda only)
 * Score = round((sum of bobot for correct answers / sum of all bobot) × 100)
 * @param {Array} questions - Array of quiz questions with jawabanBenar and bobot
 * @param {Array} answers - Array of student answers [{soalId, jawaban}]
 * @returns {number} Score 0-100
 */
export function calculateAutoGrade(questions, answers) {
  if (!questions || questions.length === 0) return 0;

  let totalBobot = 0;
  let correctBobot = 0;

  for (const question of questions) {
    if (question.tipe !== 'PILIHAN_GANDA') continue;

    const bobot = question.bobot || 1;
    totalBobot += bobot;

    const studentAnswer = answers.find(a => a.soalId === question.id);
    if (studentAnswer && studentAnswer.jawaban === question.jawabanBenar) {
      correctBobot += bobot;
    }
  }

  if (totalBobot === 0) return 0;
  return Math.round((correctBobot / totalBobot) * 100);
}

/**
 * Calculate average of an array of grades
 * @param {number[]} grades - Array of numeric grades
 * @returns {number} Average rounded to 1 decimal place
 */
export function calculateAverage(grades) {
  if (!grades || grades.length === 0) return 0;
  const sum = grades.reduce((acc, val) => acc + val, 0);
  return Math.round((sum / grades.length) * 10) / 10;
}

/**
 * Derive submission status based on submission data and deadline
 * @param {object|null} submission - Submission object with submittedAt
 * @param {string} batasWaktu - ISO date string of the deadline
 * @returns {string} Status: "Belum Dikumpulkan", "Sudah Dikumpulkan", or "Terlambat"
 */
export function deriveSubmissionStatus(submission, batasWaktu) {
  if (!submission) return 'Belum Dikumpulkan';

  const submittedAt = new Date(submission.submittedAt);
  const deadline = new Date(batasWaktu);

  if (submittedAt > deadline) {
    return 'Terlambat';
  }
  return 'Sudah Dikumpulkan';
}

/**
 * Check if a session has expired based on inactivity
 * @param {string} lastActivity - ISO date string of last activity
 * @param {Date|string} now - Current time
 * @param {number} maxIdleMinutes - Maximum idle time in minutes (default: 60)
 * @returns {boolean} True if session is expired
 */
export function isSessionExpired(lastActivity, now = new Date(), maxIdleMinutes = 60) {
  if (!lastActivity) return true;
  const lastTime = new Date(lastActivity).getTime();
  const currentTime = new Date(now).getTime();
  const diffMs = currentTime - lastTime;
  const maxIdleMs = maxIdleMinutes * 60 * 1000;
  return diffMs > maxIdleMs;
}
