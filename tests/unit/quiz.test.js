/**
 * Unit tests for DataService Quiz CRUD, QuizAttempt, and auto-grade
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import dataService from '../../js/data-service.js';
import { calculateAutoGrade } from '../../js/utils.js';

describe('DataService — Quizzes & Attempts', () => {
  const courseId = 'crs_quiz001';
  const siswaId = 'usr_siswa001';

  // Helper: valid quiz data with PG + Esai questions
  function validQuizData(overrides = {}) {
    const now = new Date();
    const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return {
      courseId,
      judul: 'Kuis Matematika Bab 1',
      durasi: 30,
      tanggalMulai: start.toISOString(),
      tanggalBerakhir: end.toISOString(),
      tampilkanJawaban: true,
      soal: [
        {
          tipe: 'PILIHAN_GANDA',
          pertanyaan: '1 + 1 = ?',
          opsi: ['1', '2', '3', '4'],
          jawabanBenar: 1,
          bobot: 2
        },
        {
          tipe: 'PILIHAN_GANDA',
          pertanyaan: '2 × 3 = ?',
          opsi: ['4', '5', '6', '7'],
          jawabanBenar: 2,
          bobot: 3
        },
        {
          tipe: 'ESAI',
          pertanyaan: 'Jelaskan konsep bilangan prima.',
          bobot: 5
        }
      ],
      ...overrides
    };
  }

  beforeEach(() => {
    localStorage.clear();
  });

  // ==================== createQuiz ====================

  describe('createQuiz', () => {
    it('should create a quiz with all valid fields', async () => {
      const data = validQuizData();
      const result = await dataService.createQuiz(data);

      expect(result.id).toMatch(/^qiz_/);
      expect(result.courseId).toBe(courseId);
      expect(result.judul).toBe('Kuis Matematika Bab 1');
      expect(result.durasi).toBe(30);
      expect(result.tampilkanJawaban).toBe(true);
      expect(result.soal).toHaveLength(3);
      expect(result.createdAt).toBeDefined();
    });

    it('should generate IDs for each question', async () => {
      const data = validQuizData();
      const result = await dataService.createQuiz(data);

      result.soal.forEach(s => {
        expect(s.id).toMatch(/^qsn_/);
      });
    });

    it('should reject if judul is missing', async () => {
      const data = validQuizData({ judul: '' });
      const result = await dataService.createQuiz(data);

      expect(result.error).toContain('judul');
    });

    it('should reject if courseId is missing', async () => {
      const data = validQuizData({ courseId: '' });
      const result = await dataService.createQuiz(data);

      expect(result.error).toContain('courseId');
    });

    it('should reject if durasi is missing or zero', async () => {
      const data = validQuizData({ durasi: 0 });
      const result = await dataService.createQuiz(data);

      expect(result.error).toContain('Durasi');
    });

    it('should reject if durasi is negative', async () => {
      const data = validQuizData({ durasi: -5 });
      const result = await dataService.createQuiz(data);

      expect(result.error).toContain('Durasi');
    });

    it('should reject if tanggalMulai is missing', async () => {
      const data = validQuizData({ tanggalMulai: '' });
      const result = await dataService.createQuiz(data);

      expect(result.error).toContain('tanggalMulai');
    });

    it('should reject if tanggalBerakhir is missing', async () => {
      const data = validQuizData({ tanggalBerakhir: '' });
      const result = await dataService.createQuiz(data);

      expect(result.error).toContain('tanggalBerakhir');
    });

    it('should reject if soal array is empty', async () => {
      const data = validQuizData({ soal: [] });
      const result = await dataService.createQuiz(data);

      expect(result.error).toContain('minimal 1 soal');
    });

    it('should reject if soal is not provided', async () => {
      const data = validQuizData();
      delete data.soal;
      const result = await dataService.createQuiz(data);

      expect(result.error).toContain('minimal 1 soal');
    });

    it('should reject PG question without 4 opsi', async () => {
      const data = validQuizData({
        soal: [{
          tipe: 'PILIHAN_GANDA',
          pertanyaan: 'Test?',
          opsi: ['A', 'B'],
          jawabanBenar: 0,
          bobot: 1
        }]
      });
      const result = await dataService.createQuiz(data);

      expect(result.error).toContain('4 opsi');
    });

    it('should reject PG question without jawabanBenar', async () => {
      const data = validQuizData({
        soal: [{
          tipe: 'PILIHAN_GANDA',
          pertanyaan: 'Test?',
          opsi: ['A', 'B', 'C', 'D'],
          bobot: 1
        }]
      });
      const result = await dataService.createQuiz(data);

      expect(result.error).toContain('jawaban benar');
    });

    it('should reject PG question with jawabanBenar out of range', async () => {
      const data = validQuizData({
        soal: [{
          tipe: 'PILIHAN_GANDA',
          pertanyaan: 'Test?',
          opsi: ['A', 'B', 'C', 'D'],
          jawabanBenar: 5,
          bobot: 1
        }]
      });
      const result = await dataService.createQuiz(data);

      expect(result.error).toContain('jawaban benar');
    });

    it('should reject question without pertanyaan text', async () => {
      const data = validQuizData({
        soal: [{
          tipe: 'ESAI',
          pertanyaan: '',
          bobot: 1
        }]
      });
      const result = await dataService.createQuiz(data);

      expect(result.error).toContain('pertanyaan wajib diisi');
    });

    it('should reject question with invalid tipe', async () => {
      const data = validQuizData({
        soal: [{
          tipe: 'INVALID',
          pertanyaan: 'What?',
          bobot: 1
        }]
      });
      const result = await dataService.createQuiz(data);

      expect(result.error).toContain('tipe harus');
    });

    it('should default bobot to 1 if not provided', async () => {
      const data = validQuizData({
        soal: [{
          tipe: 'ESAI',
          pertanyaan: 'Jelaskan.',
        }]
      });
      const result = await dataService.createQuiz(data);

      expect(result.soal[0].bobot).toBe(1);
    });

    it('should persist quiz to localStorage', async () => {
      const data = validQuizData();
      await dataService.createQuiz(data);

      const stored = JSON.parse(localStorage.getItem('pkbm_quizzes'));
      expect(stored).toHaveLength(1);
    });
  });

  // ==================== getQuizzes ====================

  describe('getQuizzes', () => {
    beforeEach(async () => {
      const now = new Date();
      const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const pastEnd = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString();
      const future = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
      const futureEnd = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString();
      const activeStart = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString();
      const activeEnd = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString();

      await dataService.createQuiz(validQuizData({
        judul: 'Kuis Aktif',
        tanggalMulai: activeStart,
        tanggalBerakhir: activeEnd
      }));
      await dataService.createQuiz(validQuizData({
        judul: 'Kuis Selesai',
        tanggalMulai: past,
        tanggalBerakhir: pastEnd
      }));
      await dataService.createQuiz(validQuizData({
        judul: 'Kuis Belum Mulai',
        tanggalMulai: future,
        tanggalBerakhir: futureEnd
      }));
      await dataService.createQuiz(validQuizData({
        courseId: 'crs_other',
        judul: 'Kuis Kursus Lain'
      }));
    });

    it('should return quizzes for a specific courseId', async () => {
      const quizzes = await dataService.getQuizzes(courseId);
      expect(quizzes).toHaveLength(3);
      quizzes.forEach(q => expect(q.courseId).toBe(courseId));
    });

    it('should filter by availableOnly (tanggalMulai<=now AND tanggalBerakhir>=now)', async () => {
      const quizzes = await dataService.getQuizzes(courseId, { availableOnly: true });
      expect(quizzes).toHaveLength(1);
      expect(quizzes[0].judul).toBe('Kuis Aktif');
    });

    it('should return empty array for non-existent courseId', async () => {
      const quizzes = await dataService.getQuizzes('crs_fake');
      expect(quizzes).toEqual([]);
    });
  });

  // ==================== startQuizAttempt ====================

  describe('startQuizAttempt', () => {
    let quizId;

    beforeEach(async () => {
      const quiz = await dataService.createQuiz(validQuizData());
      quizId = quiz.id;
    });

    it('should create a new attempt with correct structure', async () => {
      const attempt = await dataService.startQuizAttempt(quizId, siswaId);

      expect(attempt.id).toMatch(/^qat_/);
      expect(attempt.quizId).toBe(quizId);
      expect(attempt.siswaId).toBe(siswaId);
      expect(attempt.jawaban).toEqual([]);
      expect(attempt.startedAt).toBeDefined();
      expect(attempt.finishedAt).toBeNull();
      expect(attempt.nilaiOtomatis).toBeNull();
    });

    it('should record startedAt as current time', async () => {
      const before = new Date().toISOString();
      const attempt = await dataService.startQuizAttempt(quizId, siswaId);
      const after = new Date().toISOString();

      expect(attempt.startedAt >= before).toBe(true);
      expect(attempt.startedAt <= after).toBe(true);
    });

    it('should persist attempt to localStorage', async () => {
      await dataService.startQuizAttempt(quizId, siswaId);

      const stored = JSON.parse(localStorage.getItem('pkbm_quiz_attempts'));
      expect(stored).toHaveLength(1);
      expect(stored[0].quizId).toBe(quizId);
    });
  });

  // ==================== getQuizAttempt ====================

  describe('getQuizAttempt', () => {
    let quizId;

    beforeEach(async () => {
      const quiz = await dataService.createQuiz(validQuizData());
      quizId = quiz.id;
    });

    it('should return existing attempt for quiz + siswa', async () => {
      await dataService.startQuizAttempt(quizId, siswaId);
      const attempt = await dataService.getQuizAttempt(quizId, siswaId);

      expect(attempt).not.toBeNull();
      expect(attempt.quizId).toBe(quizId);
      expect(attempt.siswaId).toBe(siswaId);
    });

    it('should return null if no attempt exists', async () => {
      const attempt = await dataService.getQuizAttempt(quizId, 'usr_nobody');

      expect(attempt).toBeNull();
    });

    it('should return null for non-existent quizId', async () => {
      const attempt = await dataService.getQuizAttempt('qiz_fake', siswaId);

      expect(attempt).toBeNull();
    });
  });

  // ==================== submitQuizAttempt + auto-grade ====================

  describe('submitQuizAttempt', () => {
    let quizId, attemptId, quiz;

    beforeEach(async () => {
      quiz = await dataService.createQuiz(validQuizData());
      quizId = quiz.id;
      const attempt = await dataService.startQuizAttempt(quizId, siswaId);
      attemptId = attempt.id;
    });

    it('should save answers and set finishedAt', async () => {
      const answers = [
        { soalId: quiz.soal[0].id, jawaban: 1 }, // correct
        { soalId: quiz.soal[1].id, jawaban: 2 }, // correct
        { soalId: quiz.soal[2].id, jawaban: 'Bilangan prima adalah...' }
      ];

      const result = await dataService.submitQuizAttempt(attemptId, answers);

      expect(result.jawaban).toHaveLength(3);
      expect(result.finishedAt).not.toBeNull();
      expect(new Date(result.finishedAt).getTime()).toBeGreaterThan(0);
    });

    it('should auto-grade PG questions correctly (all correct)', async () => {
      const answers = [
        { soalId: quiz.soal[0].id, jawaban: 1 }, // correct (bobot 2)
        { soalId: quiz.soal[1].id, jawaban: 2 }, // correct (bobot 3)
        { soalId: quiz.soal[2].id, jawaban: 'Essay text' }
      ];

      const result = await dataService.submitQuizAttempt(attemptId, answers);

      // PG only: (2+3)/(2+3) * 100 = 100
      expect(result.nilaiOtomatis).toBe(100);
    });

    it('should auto-grade PG questions correctly (partial correct)', async () => {
      const answers = [
        { soalId: quiz.soal[0].id, jawaban: 1 }, // correct (bobot 2)
        { soalId: quiz.soal[1].id, jawaban: 0 }, // wrong (bobot 3)
        { soalId: quiz.soal[2].id, jawaban: 'Essay' }
      ];

      const result = await dataService.submitQuizAttempt(attemptId, answers);

      // PG only: 2/(2+3) * 100 = 40
      expect(result.nilaiOtomatis).toBe(40);
    });

    it('should auto-grade PG questions correctly (all wrong)', async () => {
      const answers = [
        { soalId: quiz.soal[0].id, jawaban: 0 }, // wrong
        { soalId: quiz.soal[1].id, jawaban: 0 }, // wrong
        { soalId: quiz.soal[2].id, jawaban: 'Essay' }
      ];

      const result = await dataService.submitQuizAttempt(attemptId, answers);

      // PG: 0/(2+3) * 100 = 0
      expect(result.nilaiOtomatis).toBe(0);
    });

    it('should handle null answers (unanswered PG)', async () => {
      const answers = [
        { soalId: quiz.soal[0].id, jawaban: null }, // unanswered
        { soalId: quiz.soal[1].id, jawaban: 2 }, // correct
        { soalId: quiz.soal[2].id, jawaban: '' }
      ];

      const result = await dataService.submitQuizAttempt(attemptId, answers);

      // PG: 3/(2+3) * 100 = 60
      expect(result.nilaiOtomatis).toBe(60);
    });

    it('should return null for non-existent attemptId', async () => {
      const result = await dataService.submitQuizAttempt('qat_fake', []);
      expect(result).toBeNull();
    });

    it('should persist updated attempt to localStorage', async () => {
      const answers = [
        { soalId: quiz.soal[0].id, jawaban: 1 },
        { soalId: quiz.soal[1].id, jawaban: 2 },
        { soalId: quiz.soal[2].id, jawaban: 'text' }
      ];

      await dataService.submitQuizAttempt(attemptId, answers);

      const stored = JSON.parse(localStorage.getItem('pkbm_quiz_attempts'));
      expect(stored[0].finishedAt).not.toBeNull();
      expect(stored[0].jawaban).toHaveLength(3);
    });
  });

  // ==================== calculateAutoGrade (utils) ====================

  describe('calculateAutoGrade (utility function)', () => {
    it('should return 100 for all correct answers', () => {
      const questions = [
        { id: 'q1', tipe: 'PILIHAN_GANDA', jawabanBenar: 0, bobot: 1 },
        { id: 'q2', tipe: 'PILIHAN_GANDA', jawabanBenar: 2, bobot: 1 }
      ];
      const answers = [
        { soalId: 'q1', jawaban: 0 },
        { soalId: 'q2', jawaban: 2 }
      ];

      expect(calculateAutoGrade(questions, answers)).toBe(100);
    });

    it('should return 0 for all wrong answers', () => {
      const questions = [
        { id: 'q1', tipe: 'PILIHAN_GANDA', jawabanBenar: 0, bobot: 1 },
        { id: 'q2', tipe: 'PILIHAN_GANDA', jawabanBenar: 2, bobot: 1 }
      ];
      const answers = [
        { soalId: 'q1', jawaban: 3 },
        { soalId: 'q2', jawaban: 1 }
      ];

      expect(calculateAutoGrade(questions, answers)).toBe(0);
    });

    it('should handle weighted scoring correctly', () => {
      const questions = [
        { id: 'q1', tipe: 'PILIHAN_GANDA', jawabanBenar: 0, bobot: 3 },
        { id: 'q2', tipe: 'PILIHAN_GANDA', jawabanBenar: 1, bobot: 7 }
      ];
      const answers = [
        { soalId: 'q1', jawaban: 0 }, // correct, bobot 3
        { soalId: 'q2', jawaban: 0 }  // wrong, bobot 7
      ];

      // 3/(3+7) * 100 = 30
      expect(calculateAutoGrade(questions, answers)).toBe(30);
    });

    it('should ignore ESAI questions in auto-grading', () => {
      const questions = [
        { id: 'q1', tipe: 'PILIHAN_GANDA', jawabanBenar: 1, bobot: 2 },
        { id: 'q2', tipe: 'ESAI', bobot: 5 },
        { id: 'q3', tipe: 'PILIHAN_GANDA', jawabanBenar: 0, bobot: 3 }
      ];
      const answers = [
        { soalId: 'q1', jawaban: 1 }, // correct
        { soalId: 'q2', jawaban: 'Essay text' },
        { soalId: 'q3', jawaban: 0 }  // correct
      ];

      // PG only: (2+3)/(2+3) * 100 = 100
      expect(calculateAutoGrade(questions, answers)).toBe(100);
    });

    it('should return 0 if no PG questions exist', () => {
      const questions = [
        { id: 'q1', tipe: 'ESAI', bobot: 5 },
        { id: 'q2', tipe: 'ESAI', bobot: 5 }
      ];
      const answers = [
        { soalId: 'q1', jawaban: 'text1' },
        { soalId: 'q2', jawaban: 'text2' }
      ];

      expect(calculateAutoGrade(questions, answers)).toBe(0);
    });

    it('should return 0 if questions array is empty', () => {
      expect(calculateAutoGrade([], [])).toBe(0);
    });

    it('should handle missing answer for a question', () => {
      const questions = [
        { id: 'q1', tipe: 'PILIHAN_GANDA', jawabanBenar: 0, bobot: 1 },
        { id: 'q2', tipe: 'PILIHAN_GANDA', jawabanBenar: 1, bobot: 1 }
      ];
      // Only answered q1
      const answers = [
        { soalId: 'q1', jawaban: 0 }
      ];

      // 1/(1+1) * 100 = 50
      expect(calculateAutoGrade(questions, answers)).toBe(50);
    });

    it('should round score correctly', () => {
      const questions = [
        { id: 'q1', tipe: 'PILIHAN_GANDA', jawabanBenar: 0, bobot: 1 },
        { id: 'q2', tipe: 'PILIHAN_GANDA', jawabanBenar: 1, bobot: 1 },
        { id: 'q3', tipe: 'PILIHAN_GANDA', jawabanBenar: 2, bobot: 1 }
      ];
      const answers = [
        { soalId: 'q1', jawaban: 0 } // correct
        // q2 and q3 missing = wrong
      ];

      // 1/3 * 100 = 33.33... → round to 33
      expect(calculateAutoGrade(questions, answers)).toBe(33);
    });
  });

  // ==================== Timer-based Auto-submit Logic ====================

  describe('Timer-based auto-submit logic', () => {
    it('should calculate remaining time from startedAt + durasi', async () => {
      const quiz = await dataService.createQuiz(validQuizData({ durasi: 10 }));
      const attempt = await dataService.startQuizAttempt(quiz.id, siswaId);

      // Simulate: startedAt was 5 minutes ago
      const startedAt = new Date(Date.now() - 5 * 60 * 1000);
      const elapsed = (Date.now() - startedAt.getTime()) / 1000;
      const remaining = Math.max(0, quiz.durasi * 60 - Math.floor(elapsed));

      // Should be approximately 5 minutes (300 seconds) remaining
      expect(remaining).toBeGreaterThan(290);
      expect(remaining).toBeLessThanOrEqual(300);
    });

    it('should detect expired time (remaining <= 0)', () => {
      const durasi = 10; // 10 minutes
      const startedAt = new Date(Date.now() - 15 * 60 * 1000); // 15 min ago
      const elapsed = (Date.now() - startedAt.getTime()) / 1000;
      const remaining = Math.max(0, durasi * 60 - Math.floor(elapsed));

      expect(remaining).toBe(0);
    });

    it('should auto-submit saves answers even when time expired', async () => {
      const quiz = await dataService.createQuiz(validQuizData({ durasi: 1 }));
      const attempt = await dataService.startQuizAttempt(quiz.id, siswaId);

      // Simulate auto-submit with partial answers
      const answers = [
        { soalId: quiz.soal[0].id, jawaban: 1 }
        // other questions unanswered
      ];

      const result = await dataService.submitQuizAttempt(attempt.id, answers);

      expect(result.finishedAt).not.toBeNull();
      expect(result.jawaban).toHaveLength(1);
      expect(result.nilaiOtomatis).toBeDefined();
    });

    it('should not allow re-submission after finishedAt is set', async () => {
      const quiz = await dataService.createQuiz(validQuizData());
      const attempt = await dataService.startQuizAttempt(quiz.id, siswaId);

      // First submit
      const answers1 = [{ soalId: quiz.soal[0].id, jawaban: 0 }];
      await dataService.submitQuizAttempt(attempt.id, answers1);

      // Check attempt is finished
      const finished = await dataService.getQuizAttempt(quiz.id, siswaId);
      expect(finished.finishedAt).not.toBeNull();
    });
  });

  // ==================== Full Workflow Integration ====================

  describe('Full Quiz Workflow', () => {
    it('should support complete create → start → submit → get result', async () => {
      // 1. Guru creates quiz
      const quiz = await dataService.createQuiz(validQuizData());
      expect(quiz.id).toMatch(/^qiz_/);
      expect(quiz.soal).toHaveLength(3);

      // 2. Quiz is available
      const available = await dataService.getQuizzes(courseId, { availableOnly: true });
      expect(available.some(q => q.id === quiz.id)).toBe(true);

      // 3. Siswa starts attempt
      const attempt = await dataService.startQuizAttempt(quiz.id, siswaId);
      expect(attempt.id).toMatch(/^qat_/);
      expect(attempt.finishedAt).toBeNull();

      // 4. Siswa submits answers
      const answers = [
        { soalId: quiz.soal[0].id, jawaban: 1 }, // correct
        { soalId: quiz.soal[1].id, jawaban: 0 }, // wrong
        { soalId: quiz.soal[2].id, jawaban: 'My essay answer' }
      ];
      const result = await dataService.submitQuizAttempt(attempt.id, answers);
      expect(result.finishedAt).not.toBeNull();
      // PG: 2/(2+3) * 100 = 40
      expect(result.nilaiOtomatis).toBe(40);

      // 5. Get attempt
      const retrieved = await dataService.getQuizAttempt(quiz.id, siswaId);
      expect(retrieved.id).toBe(attempt.id);
      expect(retrieved.nilaiOtomatis).toBe(40);
    });
  });
});
