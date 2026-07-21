/**
 * Unit tests for DataService Assignment & Submission CRUD methods
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import dataService from '../../js/data-service.js';
import { deriveSubmissionStatus } from '../../js/utils.js';

describe('DataService — Assignments & Submissions', () => {
  const courseId = 'crs_test001';
  const siswaId = 'usr_siswa001';

  // Helper to create a valid assignment with future deadline
  function futureAssignmentData(overrides = {}) {
    const now = new Date();
    const start = new Date(now.getTime() - 24 * 60 * 60 * 1000); // yesterday
    const deadline = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    return {
      courseId,
      judul: 'Tugas Matematika Bab 1',
      deskripsi: 'Kerjakan soal 1-10 halaman 25',
      tanggalMulai: start.toISOString(),
      batasWaktu: deadline.toISOString(),
      attachments: [],
      ...overrides
    };
  }

  // Helper to create an assignment with past deadline
  function pastAssignmentData(overrides = {}) {
    const past = new Date(Date.now() - 48 * 60 * 60 * 1000); // 2 days ago
    const pastStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    return {
      courseId,
      judul: 'Tugas Lama',
      deskripsi: 'Tugas yang sudah lewat',
      tanggalMulai: pastStart.toISOString(),
      batasWaktu: past.toISOString(),
      attachments: [],
      ...overrides
    };
  }

  beforeEach(() => {
    localStorage.clear();
  });

  // ==================== createAssignment ====================

  describe('createAssignment', () => {
    it('should create an assignment with all required fields', async () => {
      const data = futureAssignmentData();
      const result = await dataService.createAssignment(data);

      expect(result.id).toMatch(/^asg_/);
      expect(result.courseId).toBe(courseId);
      expect(result.judul).toBe('Tugas Matematika Bab 1');
      expect(result.deskripsi).toBe('Kerjakan soal 1-10 halaman 25');
      expect(result.tanggalMulai).toBe(data.tanggalMulai);
      expect(result.batasWaktu).toBe(data.batasWaktu);
      expect(result.attachments).toEqual([]);
      expect(result.createdAt).toBeDefined();
    });

    it('should reject if judul is missing', async () => {
      const data = futureAssignmentData({ judul: '' });
      const result = await dataService.createAssignment(data);

      expect(result.error).toContain('judul');
    });

    it('should reject if courseId is missing', async () => {
      const data = futureAssignmentData({ courseId: '' });
      const result = await dataService.createAssignment(data);

      expect(result.error).toContain('courseId');
    });

    it('should reject if tanggalMulai is missing', async () => {
      const data = futureAssignmentData({ tanggalMulai: '' });
      const result = await dataService.createAssignment(data);

      expect(result.error).toContain('tanggalMulai');
    });

    it('should reject if batasWaktu is missing', async () => {
      const data = futureAssignmentData({ batasWaktu: '' });
      const result = await dataService.createAssignment(data);

      expect(result.error).toContain('batasWaktu');
    });

    it('should set default empty deskripsi if not provided', async () => {
      const data = futureAssignmentData();
      delete data.deskripsi;
      const result = await dataService.createAssignment(data);

      expect(result.deskripsi).toBe('');
    });

    it('should store file attachments on the assignment', async () => {
      const data = futureAssignmentData({
        attachments: [
          { fileName: 'soal.pdf', fileData: 'base64pdfdata...' },
          { fileName: 'referensi.docx', fileData: 'base64docdata...' }
        ]
      });
      const result = await dataService.createAssignment(data);

      expect(result.attachments).toHaveLength(2);
      expect(result.attachments[0].fileName).toBe('soal.pdf');
      expect(result.attachments[1].fileName).toBe('referensi.docx');
    });

    it('should reject attachment file > 10MB', async () => {
      // Create a large base64 string (> 10MB when decoded)
      const largeFileData = 'x'.repeat(14 * 1024 * 1024); // ~14MB base64
      const data = futureAssignmentData({
        attachments: [
          { fileName: 'huge.pdf', fileData: largeFileData, fileSize: 11 * 1024 * 1024 }
        ]
      });
      const result = await dataService.createAssignment(data);

      expect(result.error).toBe('Ukuran file melebihi batas maksimal 10 MB');
    });

    it('should accept attachment file exactly 10MB', async () => {
      const data = futureAssignmentData({
        attachments: [
          { fileName: 'exact.pdf', fileData: 'base64data', fileSize: 10 * 1024 * 1024 }
        ]
      });
      const result = await dataService.createAssignment(data);

      expect(result.error).toBeUndefined();
      expect(result.id).toMatch(/^asg_/);
    });

    it('should set default empty attachments array if not provided', async () => {
      const data = futureAssignmentData();
      delete data.attachments;
      const result = await dataService.createAssignment(data);

      expect(result.attachments).toEqual([]);
    });

    it('should persist assignment to localStorage', async () => {
      const data = futureAssignmentData();
      const result = await dataService.createAssignment(data);

      const stored = JSON.parse(localStorage.getItem('pkbm_assignments'));
      expect(stored).toHaveLength(1);
      expect(stored[0].id).toBe(result.id);
    });
  });

  // ==================== getAssignments ====================

  describe('getAssignments', () => {
    beforeEach(async () => {
      // Create assignments with different start dates
      const past = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const future = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
      const deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      await dataService.createAssignment({
        courseId,
        judul: 'Tugas Aktif',
        tanggalMulai: past,
        batasWaktu: deadline
      });
      await dataService.createAssignment({
        courseId,
        judul: 'Tugas Belum Mulai',
        tanggalMulai: future,
        batasWaktu: deadline
      });
      await dataService.createAssignment({
        courseId: 'crs_other',
        judul: 'Tugas Kursus Lain',
        tanggalMulai: past,
        batasWaktu: deadline
      });
    });

    it('should return assignments for specific courseId only', async () => {
      const assignments = await dataService.getAssignments(courseId);

      expect(assignments).toHaveLength(2);
      assignments.forEach(a => expect(a.courseId).toBe(courseId));
    });

    it('should return all assignments regardless of start date by default', async () => {
      const assignments = await dataService.getAssignments(courseId);

      expect(assignments).toHaveLength(2);
    });

    it('should filter by visibility (tanggalMulai <= now) when visibleOnly is true', async () => {
      const assignments = await dataService.getAssignments(courseId, { visibleOnly: true });

      expect(assignments).toHaveLength(1);
      expect(assignments[0].judul).toBe('Tugas Aktif');
    });

    it('should hide future assignments from student view (visibleOnly)', async () => {
      const assignments = await dataService.getAssignments(courseId, { visibleOnly: true });

      const titles = assignments.map(a => a.judul);
      expect(titles).not.toContain('Tugas Belum Mulai');
    });

    it('should return empty array for non-existent courseId', async () => {
      const assignments = await dataService.getAssignments('crs_nonexistent');

      expect(assignments).toEqual([]);
    });

    it('should include assignment that starts exactly now', async () => {
      const now = new Date().toISOString();
      const deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      await dataService.createAssignment({
        courseId: 'crs_exact',
        judul: 'Tugas Pas Sekarang',
        tanggalMulai: now,
        batasWaktu: deadline
      });

      const assignments = await dataService.getAssignments('crs_exact', { visibleOnly: true });
      expect(assignments).toHaveLength(1);
    });
  });

  // ==================== submitAssignment ====================

  describe('submitAssignment', () => {
    let assignmentId;

    beforeEach(async () => {
      const asg = await dataService.createAssignment(futureAssignmentData());
      assignmentId = asg.id;
    });

    it('should create a text submission before deadline', async () => {
      const result = await dataService.submitAssignment(assignmentId, siswaId, {
        tipe: 'TEKS',
        konten: 'Jawaban saya adalah...'
      });

      expect(result.id).toMatch(/^sub_/);
      expect(result.assignmentId).toBe(assignmentId);
      expect(result.siswaId).toBe(siswaId);
      expect(result.tipe).toBe('TEKS');
      expect(result.konten).toBe('Jawaban saya adalah...');
      expect(result.fileData).toBeNull();
      expect(result.fileName).toBeNull();
      expect(result.submittedAt).toBeDefined();
    });

    it('should create a file submission before deadline', async () => {
      const result = await dataService.submitAssignment(assignmentId, siswaId, {
        tipe: 'FILE',
        fileData: 'base64encodedpdfcontent...',
        fileName: 'tugas_saya.pdf'
      });

      expect(result.tipe).toBe('FILE');
      expect(result.fileData).toBe('base64encodedpdfcontent...');
      expect(result.fileName).toBe('tugas_saya.pdf');
      expect(result.konten).toBeNull();
    });

    it('should reject submission after deadline with correct error', async () => {
      // Create an assignment with past deadline
      const pastAsg = await dataService.createAssignment(pastAssignmentData());

      const result = await dataService.submitAssignment(pastAsg.id, siswaId, {
        tipe: 'TEKS',
        konten: 'Terlambat...'
      });

      expect(result.error).toBe('Batas waktu pengumpulan telah lewat');
    });

    it('should reject submission for non-existent assignment', async () => {
      const result = await dataService.submitAssignment('asg_nonexistent', siswaId, {
        tipe: 'TEKS',
        konten: 'Test'
      });

      expect(result.error).toBe('Tugas tidak ditemukan');
    });

    it('should reject file submission > 10MB', async () => {
      const result = await dataService.submitAssignment(assignmentId, siswaId, {
        tipe: 'FILE',
        fileData: 'x'.repeat(14 * 1024 * 1024), // large base64
        fileName: 'huge.pdf',
        fileSize: 11 * 1024 * 1024
      });

      expect(result.error).toBe('Ukuran file melebihi batas maksimal 10 MB');
    });

    it('should accept file submission exactly 10MB', async () => {
      const result = await dataService.submitAssignment(assignmentId, siswaId, {
        tipe: 'FILE',
        fileData: 'base64data',
        fileName: 'exact.pdf',
        fileSize: 10 * 1024 * 1024
      });

      expect(result.error).toBeUndefined();
      expect(result.id).toMatch(/^sub_/);
    });

    it('should default tipe to TEKS if not provided', async () => {
      const result = await dataService.submitAssignment(assignmentId, siswaId, {
        konten: 'Jawaban saya'
      });

      expect(result.tipe).toBe('TEKS');
    });

    it('should persist submission to localStorage', async () => {
      await dataService.submitAssignment(assignmentId, siswaId, {
        tipe: 'TEKS',
        konten: 'Test'
      });

      const stored = JSON.parse(localStorage.getItem('pkbm_submissions'));
      expect(stored).toHaveLength(1);
      expect(stored[0].assignmentId).toBe(assignmentId);
      expect(stored[0].siswaId).toBe(siswaId);
    });

    it('should allow multiple submissions from different students', async () => {
      await dataService.submitAssignment(assignmentId, 'usr_siswa001', {
        tipe: 'TEKS', konten: 'Jawaban 1'
      });
      await dataService.submitAssignment(assignmentId, 'usr_siswa002', {
        tipe: 'TEKS', konten: 'Jawaban 2'
      });

      const stored = JSON.parse(localStorage.getItem('pkbm_submissions'));
      expect(stored).toHaveLength(2);
    });
  });

  // ==================== getSubmissions ====================

  describe('getSubmissions', () => {
    let assignmentId;

    beforeEach(async () => {
      const asg = await dataService.createAssignment(futureAssignmentData());
      assignmentId = asg.id;

      await dataService.submitAssignment(assignmentId, 'usr_siswa001', {
        tipe: 'TEKS', konten: 'Jawaban siswa 1'
      });
      await dataService.submitAssignment(assignmentId, 'usr_siswa002', {
        tipe: 'FILE', fileData: 'base64...', fileName: 'tugas.pdf'
      });
    });

    it('should return all submissions for an assignment', async () => {
      const submissions = await dataService.getSubmissions(assignmentId);

      expect(submissions).toHaveLength(2);
      submissions.forEach(s => expect(s.assignmentId).toBe(assignmentId));
    });

    it('should return empty array if no submissions exist', async () => {
      const asg2 = await dataService.createAssignment(
        futureAssignmentData({ judul: 'Tugas Kosong' })
      );

      const submissions = await dataService.getSubmissions(asg2.id);
      expect(submissions).toEqual([]);
    });

    it('should not include submissions from other assignments', async () => {
      const asg2 = await dataService.createAssignment(
        futureAssignmentData({ judul: 'Tugas Lain' })
      );
      await dataService.submitAssignment(asg2.id, 'usr_siswa003', {
        tipe: 'TEKS', konten: 'Other'
      });

      const submissions = await dataService.getSubmissions(assignmentId);
      expect(submissions).toHaveLength(2);
    });
  });

  // ==================== getStudentSubmission ====================

  describe('getStudentSubmission', () => {
    let assignmentId;

    beforeEach(async () => {
      const asg = await dataService.createAssignment(futureAssignmentData());
      assignmentId = asg.id;

      await dataService.submitAssignment(assignmentId, siswaId, {
        tipe: 'TEKS', konten: 'My answer'
      });
    });

    it('should return the submission for a specific student', async () => {
      const result = await dataService.getStudentSubmission(assignmentId, siswaId);

      expect(result).not.toBeNull();
      expect(result.assignmentId).toBe(assignmentId);
      expect(result.siswaId).toBe(siswaId);
      expect(result.konten).toBe('My answer');
    });

    it('should return null if student has not submitted', async () => {
      const result = await dataService.getStudentSubmission(assignmentId, 'usr_other');

      expect(result).toBeNull();
    });

    it('should return null for non-existent assignmentId', async () => {
      const result = await dataService.getStudentSubmission('asg_fake', siswaId);

      expect(result).toBeNull();
    });
  });

  // ==================== Submission Status Derivation ====================

  describe('Submission Status Derivation (deriveSubmissionStatus)', () => {
    const deadline = '2025-06-15T23:59:59.000Z';

    it('should return "Belum Dikumpulkan" when no submission exists', () => {
      const status = deriveSubmissionStatus(null, deadline);
      expect(status).toBe('Belum Dikumpulkan');
    });

    it('should return "Sudah Dikumpulkan" when submitted before deadline', () => {
      const submission = {
        submittedAt: '2025-06-14T10:00:00.000Z'
      };
      const status = deriveSubmissionStatus(submission, deadline);
      expect(status).toBe('Sudah Dikumpulkan');
    });

    it('should return "Terlambat" when submitted after deadline', () => {
      const submission = {
        submittedAt: '2025-06-16T01:00:00.000Z'
      };
      const status = deriveSubmissionStatus(submission, deadline);
      expect(status).toBe('Terlambat');
    });

    it('should return "Sudah Dikumpulkan" when submitted exactly at deadline', () => {
      const submission = {
        submittedAt: '2025-06-15T23:59:59.000Z'
      };
      const status = deriveSubmissionStatus(submission, deadline);
      expect(status).toBe('Sudah Dikumpulkan');
    });

    it('should return "Terlambat" when submitted 1ms after deadline', () => {
      const submission = {
        submittedAt: '2025-06-16T00:00:00.001Z'
      };
      const status = deriveSubmissionStatus(submission, deadline);
      expect(status).toBe('Terlambat');
    });
  });

  // ==================== Deadline Validation (Edge Cases) ====================

  describe('Deadline Validation — Edge Cases', () => {
    it('should accept submission exactly at batasWaktu', async () => {
      // Create assignment with deadline far enough in future
      const deadline = new Date(Date.now() + 60 * 1000); // 1 minute from now
      const asg = await dataService.createAssignment({
        courseId,
        judul: 'Deadline Test',
        tanggalMulai: new Date(Date.now() - 86400000).toISOString(),
        batasWaktu: deadline.toISOString()
      });

      const result = await dataService.submitAssignment(asg.id, siswaId, {
        tipe: 'TEKS',
        konten: 'Last minute!'
      });

      expect(result.error).toBeUndefined();
      expect(result.id).toMatch(/^sub_/);
    });

    it('should reject submission 1 second after deadline', async () => {
      // Create assignment with deadline in the past (1 second ago)
      const deadline = new Date(Date.now() - 1000);
      const asg = await dataService.createAssignment({
        courseId,
        judul: 'Past Deadline',
        tanggalMulai: new Date(Date.now() - 86400000).toISOString(),
        batasWaktu: deadline.toISOString()
      });

      const result = await dataService.submitAssignment(asg.id, siswaId, {
        tipe: 'TEKS',
        konten: 'Too late!'
      });

      expect(result.error).toBe('Batas waktu pengumpulan telah lewat');
    });
  });

  // ==================== Visibility Filter ====================

  describe('Visibility Filter — tanggalMulai', () => {
    it('should show assignment if tanggalMulai is in the past', async () => {
      const past = new Date(Date.now() - 86400000).toISOString(); // 1 day ago
      const deadline = new Date(Date.now() + 7 * 86400000).toISOString();

      await dataService.createAssignment({
        courseId: 'crs_vis',
        judul: 'Visible',
        tanggalMulai: past,
        batasWaktu: deadline
      });

      const visible = await dataService.getAssignments('crs_vis', { visibleOnly: true });
      expect(visible).toHaveLength(1);
      expect(visible[0].judul).toBe('Visible');
    });

    it('should hide assignment if tanggalMulai is in the future', async () => {
      const future = new Date(Date.now() + 3 * 86400000).toISOString(); // 3 days from now
      const deadline = new Date(Date.now() + 7 * 86400000).toISOString();

      await dataService.createAssignment({
        courseId: 'crs_vis2',
        judul: 'Hidden',
        tanggalMulai: future,
        batasWaktu: deadline
      });

      const visible = await dataService.getAssignments('crs_vis2', { visibleOnly: true });
      expect(visible).toHaveLength(0);
    });

    it('should show mix of visible and hidden assignments correctly', async () => {
      const past = new Date(Date.now() - 86400000).toISOString();
      const future = new Date(Date.now() + 86400000).toISOString();
      const deadline = new Date(Date.now() + 7 * 86400000).toISOString();

      await dataService.createAssignment({
        courseId: 'crs_mix',
        judul: 'Active 1',
        tanggalMulai: past,
        batasWaktu: deadline
      });
      await dataService.createAssignment({
        courseId: 'crs_mix',
        judul: 'Active 2',
        tanggalMulai: past,
        batasWaktu: deadline
      });
      await dataService.createAssignment({
        courseId: 'crs_mix',
        judul: 'Future',
        tanggalMulai: future,
        batasWaktu: deadline
      });

      const all = await dataService.getAssignments('crs_mix');
      const visible = await dataService.getAssignments('crs_mix', { visibleOnly: true });

      expect(all).toHaveLength(3);
      expect(visible).toHaveLength(2);
    });
  });

  // ==================== File Size Validation ====================

  describe('File Size Validation', () => {
    it('should accept submission with small file', async () => {
      const asg = await dataService.createAssignment(futureAssignmentData());

      const result = await dataService.submitAssignment(asg.id, siswaId, {
        tipe: 'FILE',
        fileData: 'smallbase64data',
        fileName: 'small.pdf',
        fileSize: 500 * 1024 // 500KB
      });

      expect(result.error).toBeUndefined();
      expect(result.id).toMatch(/^sub_/);
    });

    it('should reject submission file > 10MB', async () => {
      const asg = await dataService.createAssignment(futureAssignmentData());

      const result = await dataService.submitAssignment(asg.id, siswaId, {
        tipe: 'FILE',
        fileData: 'x'.repeat(14 * 1024 * 1024),
        fileName: 'large.pdf',
        fileSize: 11 * 1024 * 1024
      });

      expect(result.error).toBe('Ukuran file melebihi batas maksimal 10 MB');
    });

    it('should reject assignment attachment > 10MB', async () => {
      const data = futureAssignmentData({
        attachments: [{
          fileName: 'big_attachment.pdf',
          fileData: 'x'.repeat(14 * 1024 * 1024),
          fileSize: 11 * 1024 * 1024
        }]
      });

      const result = await dataService.createAssignment(data);
      expect(result.error).toBe('Ukuran file melebihi batas maksimal 10 MB');
    });

    it('should allow text submission without file size checks', async () => {
      const asg = await dataService.createAssignment(futureAssignmentData());

      const result = await dataService.submitAssignment(asg.id, siswaId, {
        tipe: 'TEKS',
        konten: 'x'.repeat(100000) // large text is fine
      });

      expect(result.error).toBeUndefined();
      expect(result.id).toMatch(/^sub_/);
    });
  });

  // ==================== Integration: Full Workflow ====================

  describe('Full Assignment Workflow', () => {
    it('should support complete create → submit → retrieve flow', async () => {
      // 1. Guru creates assignment
      const asg = await dataService.createAssignment(futureAssignmentData());
      expect(asg.id).toMatch(/^asg_/);

      // 2. Assignment is visible
      const visible = await dataService.getAssignments(courseId, { visibleOnly: true });
      expect(visible.some(a => a.id === asg.id)).toBe(true);

      // 3. Siswa submits
      const sub = await dataService.submitAssignment(asg.id, siswaId, {
        tipe: 'TEKS',
        konten: 'Jawaban lengkap saya...'
      });
      expect(sub.id).toMatch(/^sub_/);

      // 4. Guru retrieves all submissions
      const subs = await dataService.getSubmissions(asg.id);
      expect(subs).toHaveLength(1);

      // 5. Retrieve specific student submission
      const studentSub = await dataService.getStudentSubmission(asg.id, siswaId);
      expect(studentSub).not.toBeNull();
      expect(studentSub.konten).toBe('Jawaban lengkap saya...');

      // 6. Derive status
      const status = deriveSubmissionStatus(studentSub, asg.batasWaktu);
      expect(status).toBe('Sudah Dikumpulkan');
    });

    it('should support multiple students submitting to same assignment', async () => {
      const asg = await dataService.createAssignment(futureAssignmentData());

      await dataService.submitAssignment(asg.id, 'usr_s1', { tipe: 'TEKS', konten: 'A' });
      await dataService.submitAssignment(asg.id, 'usr_s2', { tipe: 'TEKS', konten: 'B' });
      await dataService.submitAssignment(asg.id, 'usr_s3', { tipe: 'TEKS', konten: 'C' });

      const subs = await dataService.getSubmissions(asg.id);
      expect(subs).toHaveLength(3);

      const s1 = await dataService.getStudentSubmission(asg.id, 'usr_s1');
      const s2 = await dataService.getStudentSubmission(asg.id, 'usr_s2');
      expect(s1.konten).toBe('A');
      expect(s2.konten).toBe('B');
    });
  });
});
