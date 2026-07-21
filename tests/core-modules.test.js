/**
 * Core modules unit tests
 * Tests for utils.js, curriculum.js, data-service.js, auth.js
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateId,
  formatDate,
  hashPassword,
  escapeHtml,
  calculateProgress,
  calculateAutoGrade,
  calculateAverage,
  deriveSubmissionStatus,
  isSessionExpired
} from '../js/utils.js';
import { KURIKULUM, getMapelByProgram, getKelasByProgram, getProgramLabel, getAllPrograms } from '../js/curriculum.js';
import dataService, { KEYS } from '../js/data-service.js';
import Auth from '../js/auth.js';

// ==================== Utils Tests ====================

describe('Utils - generateId', () => {
  it('should generate ID with correct prefix', () => {
    const id = generateId('usr');
    expect(id).toMatch(/^usr_[a-z0-9]{12}$/);
  });

  it('should generate unique IDs', () => {
    const ids = new Set();
    for (let i = 0; i < 100; i++) {
      ids.add(generateId('test'));
    }
    expect(ids.size).toBe(100);
  });
});

describe('Utils - formatDate', () => {
  it('should format valid ISO date', () => {
    const result = formatDate('2024-01-15T10:30:00.000Z');
    expect(result).not.toBe('-');
    expect(result).toContain('2024');
  });

  it('should return dash for invalid date', () => {
    expect(formatDate(null)).toBe('-');
    expect(formatDate('')).toBe('-');
    expect(formatDate('not-a-date')).toBe('-');
  });
});

describe('Utils - hashPassword', () => {
  it('should produce SHA-256 hex hash', async () => {
    const hash = await hashPassword('test123');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('should produce same hash for same input', async () => {
    const hash1 = await hashPassword('password');
    const hash2 = await hashPassword('password');
    expect(hash1).toBe(hash2);
  });

  it('should produce different hash for different input', async () => {
    const hash1 = await hashPassword('abc');
    const hash2 = await hashPassword('def');
    expect(hash1).not.toBe(hash2);
  });
});

describe('Utils - escapeHtml', () => {
  it('should escape HTML characters', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
  });

  it('should handle null/undefined', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  it('should return plain text unchanged', () => {
    expect(escapeHtml('Hello World')).toBe('Hello World');
  });
});

describe('Utils - calculateProgress', () => {
  it('should return 0 for no total', () => {
    expect(calculateProgress(0, 0)).toBe(0);
    expect(calculateProgress(5, 0)).toBe(0);
  });

  it('should return correct percentage', () => {
    expect(calculateProgress(5, 10)).toBe(50);
    expect(calculateProgress(3, 4)).toBe(75);
    expect(calculateProgress(10, 10)).toBe(100);
  });

  it('should not exceed 100', () => {
    expect(calculateProgress(15, 10)).toBe(100);
  });
});

describe('Utils - calculateAutoGrade', () => {
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
      { soalId: 'q1', jawaban: 1 },
      { soalId: 'q2', jawaban: 3 }
    ];
    expect(calculateAutoGrade(questions, answers)).toBe(0);
  });

  it('should respect bobot weighting', () => {
    const questions = [
      { id: 'q1', tipe: 'PILIHAN_GANDA', jawabanBenar: 0, bobot: 3 },
      { id: 'q2', tipe: 'PILIHAN_GANDA', jawabanBenar: 1, bobot: 1 }
    ];
    const answers = [
      { soalId: 'q1', jawaban: 0 },
      { soalId: 'q2', jawaban: 3 }
    ];
    // 3 / 4 * 100 = 75
    expect(calculateAutoGrade(questions, answers)).toBe(75);
  });

  it('should ignore essay questions', () => {
    const questions = [
      { id: 'q1', tipe: 'PILIHAN_GANDA', jawabanBenar: 0, bobot: 1 },
      { id: 'q2', tipe: 'ESAI', bobot: 1 }
    ];
    const answers = [{ soalId: 'q1', jawaban: 0 }];
    expect(calculateAutoGrade(questions, answers)).toBe(100);
  });
});

describe('Utils - calculateAverage', () => {
  it('should return 0 for empty array', () => {
    expect(calculateAverage([])).toBe(0);
  });

  it('should return average rounded to 1 decimal', () => {
    expect(calculateAverage([80, 90, 85])).toBe(85);
    expect(calculateAverage([70, 80, 75])).toBe(75);
    expect(calculateAverage([33, 33, 34])).toBe(33.3);
  });
});

describe('Utils - deriveSubmissionStatus', () => {
  it('should return Belum Dikumpulkan if no submission', () => {
    expect(deriveSubmissionStatus(null, '2024-12-31T23:59:59Z')).toBe('Belum Dikumpulkan');
  });

  it('should return Sudah Dikumpulkan if on time', () => {
    const submission = { submittedAt: '2024-06-15T10:00:00Z' };
    expect(deriveSubmissionStatus(submission, '2024-06-30T23:59:59Z')).toBe('Sudah Dikumpulkan');
  });

  it('should return Terlambat if past deadline', () => {
    const submission = { submittedAt: '2024-07-01T10:00:00Z' };
    expect(deriveSubmissionStatus(submission, '2024-06-30T23:59:59Z')).toBe('Terlambat');
  });
});

describe('Utils - isSessionExpired', () => {
  it('should return true if no lastActivity', () => {
    expect(isSessionExpired(null)).toBe(true);
  });

  it('should return false for recent activity', () => {
    const now = new Date();
    const recent = new Date(now.getTime() - 30 * 60 * 1000); // 30 min ago
    expect(isSessionExpired(recent.toISOString(), now, 60)).toBe(false);
  });

  it('should return true after 60 minutes', () => {
    const now = new Date();
    const old = new Date(now.getTime() - 61 * 60 * 1000); // 61 min ago
    expect(isSessionExpired(old.toISOString(), now, 60)).toBe(true);
  });
});

// ==================== Curriculum Tests ====================

describe('Curriculum - KURIKULUM constant', () => {
  it('should have PAKET_A with 8 mapel', () => {
    expect(KURIKULUM.PAKET_A.mapel).toHaveLength(8);
    expect(KURIKULUM.PAKET_A.kelas).toEqual(['Kelas 6']);
  });

  it('should have PAKET_B with 10 mapel', () => {
    expect(KURIKULUM.PAKET_B.mapel).toHaveLength(10);
    expect(KURIKULUM.PAKET_B.kelas).toHaveLength(3);
  });

  it('should have PAKET_C with 12 mapel', () => {
    expect(KURIKULUM.PAKET_C.mapel).toHaveLength(12);
    expect(KURIKULUM.PAKET_C.kelas).toHaveLength(3);
  });
});

describe('Curriculum - helper functions', () => {
  it('getMapelByProgram should return correct list', () => {
    expect(getMapelByProgram('PAKET_A')).toHaveLength(8);
    expect(getMapelByProgram('INVALID')).toEqual([]);
  });

  it('getKelasByProgram should return correct list', () => {
    expect(getKelasByProgram('PAKET_B')).toEqual(['Kelas 1', 'Kelas 2', 'Kelas 3']);
  });

  it('getProgramLabel should return label', () => {
    expect(getProgramLabel('PAKET_C')).toBe('Paket C (Setara SMA)');
  });

  it('getAllPrograms should return all keys', () => {
    expect(getAllPrograms()).toEqual(['PAKET_A', 'PAKET_B', 'PAKET_C']);
  });
});

// ==================== DataService Tests ====================

describe('DataService - Users', () => {
  it('should create and retrieve user', async () => {
    const user = await dataService.createUser({
      username: 'testuser',
      password: 'test1234',
      nama: 'Test User',
      role: 'GURU'
    });
    expect(user.id).toMatch(/^usr_/);
    expect(user.nama).toBe('Test User');

    const found = await dataService.getUserById(user.id);
    expect(found.username).toBe('testuser');
  });

  it('should filter users by role', async () => {
    await dataService.createUser({ username: 'guru1', password: 'pass1234', nama: 'Guru', role: 'GURU' });
    await dataService.createUser({ username: 'siswa1', password: 'pass1234', nama: 'Siswa', role: 'SISWA', program: 'PAKET_B', kelas: 'Kelas 1' });

    const gurus = await dataService.getUsers({ role: 'GURU' });
    expect(gurus.length).toBe(1);
    expect(gurus[0].role).toBe('GURU');
  });

  it('should deactivate user', async () => {
    const user = await dataService.createUser({ username: 'todeactivate', password: 'pass1234', nama: 'Deact', role: 'SISWA' });
    await dataService.deactivateUser(user.id);
    const found = await dataService.getUserById(user.id);
    expect(found.aktif).toBe(false);
  });
});

describe('DataService - Courses', () => {
  it('should create and retrieve course', async () => {
    const course = await dataService.createCourse({
      nama: 'Matematika Kelas 1',
      program: 'PAKET_B',
      kelas: 'Kelas 1',
      mataPelajaran: 'Matematika',
      guruId: 'usr_guru1'
    });
    expect(course.id).toMatch(/^crs_/);
    expect(course.aktif).toBe(true);

    const found = await dataService.getCourseById(course.id);
    expect(found.nama).toBe('Matematika Kelas 1');
  });

  it('should deactivate course', async () => {
    const course = await dataService.createCourse({
      nama: 'To Deactivate',
      program: 'PAKET_A',
      kelas: 'Kelas 6',
      mataPelajaran: 'IPA',
      guruId: 'usr_guru1'
    });
    await dataService.deactivateCourse(course.id);
    const found = await dataService.getCourseById(course.id);
    expect(found.aktif).toBe(false);
  });
});

describe('DataService - Enrollments', () => {
  it('should enroll and validate student', async () => {
    const guru = await dataService.createUser({ username: 'g1', password: 'pass1234', nama: 'Guru 1', role: 'GURU' });
    const siswa = await dataService.createUser({ username: 's1', password: 'pass1234', nama: 'Siswa 1', role: 'SISWA', program: 'PAKET_B', kelas: 'Kelas 1' });
    const course = await dataService.createCourse({ nama: 'Math', program: 'PAKET_B', kelas: 'Kelas 1', mataPelajaran: 'Matematika', guruId: guru.id });

    const validation = await dataService.validateEnrollment(siswa.id, course.id);
    expect(validation.valid).toBe(true);

    await dataService.enrollStudents(course.id, [siswa.id]);
    const enrollments = await dataService.getStudentEnrollments(siswa.id);
    expect(enrollments).toHaveLength(1);
  });

  it('should reject enrollment with mismatched program', async () => {
    const siswa = await dataService.createUser({ username: 's2', password: 'pass1234', nama: 'Siswa 2', role: 'SISWA', program: 'PAKET_A', kelas: 'Kelas 6' });
    const course = await dataService.createCourse({ nama: 'Fisika', program: 'PAKET_C', kelas: 'Kelas 1', mataPelajaran: 'Fisika', guruId: 'usr_g' });

    const validation = await dataService.validateEnrollment(siswa.id, course.id);
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('program Paket tidak sesuai');
  });
});

// ==================== Auth Tests ====================

describe('Auth - login', () => {
  beforeEach(async () => {
    await dataService.createUser({
      username: 'guru_auth',
      password: 'password123',
      nama: 'Guru Test',
      role: 'GURU'
    });
  });

  it('should login with correct credentials', async () => {
    const result = await Auth.login('guru_auth', 'password123');
    expect(result.success).toBe(true);
    expect(result.user.nama).toBe('Guru Test');
  });

  it('should fail with wrong password', async () => {
    const result = await Auth.login('guru_auth', 'wrongpassword');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Username atau password salah');
  });

  it('should fail with wrong username', async () => {
    const result = await Auth.login('nonexistent', 'password123');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Username atau password salah');
  });
});

describe('Auth - session management', () => {
  it('should create session on login', async () => {
    await dataService.createUser({ username: 'sesuser', password: 'pass1234', nama: 'Ses', role: 'SISWA' });
    await Auth.login('sesuser', 'pass1234');
    const session = Auth.checkSession();
    expect(session).not.toBeNull();
    expect(session.nama).toBe('Ses');
  });

  it('should clear session on logout', async () => {
    await dataService.createUser({ username: 'logoutuser', password: 'pass1234', nama: 'Out', role: 'GURU' });
    await Auth.login('logoutuser', 'pass1234');
    Auth.logout();
    const session = Auth.checkSession();
    expect(session).toBeNull();
  });
});
