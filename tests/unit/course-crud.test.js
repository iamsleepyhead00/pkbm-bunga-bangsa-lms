/**
 * Unit tests for Course CRUD operations in DataService
 * Validates: Requirements 2.1, 2.3, 2.4, 2.5
 */

import { describe, it, expect, beforeEach } from 'vitest';
import dataService from '../../js/data-service.js';
import { KEYS } from '../../js/data-service.js';

// Helper to seed data directly into localStorage
function seedCourse(courseData) {
  const courses = JSON.parse(localStorage.getItem(KEYS.COURSES) || '[]');
  courses.push(courseData);
  localStorage.setItem(KEYS.COURSES, JSON.stringify(courses));
}

function seedEnrollment(enrollmentData) {
  const enrollments = JSON.parse(localStorage.getItem(KEYS.ENROLLMENTS) || '[]');
  enrollments.push(enrollmentData);
  localStorage.setItem(KEYS.ENROLLMENTS, JSON.stringify(enrollments));
}

function seedUser(userData) {
  const users = JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
  users.push(userData);
  localStorage.setItem(KEYS.USERS, JSON.stringify(users));
}

describe('Course CRUD - DataService', () => {

  describe('createCourse', () => {

    it('should create course with all valid fields', async () => {
      const data = {
        nama: 'Matematika Kelas 1',
        program: 'PAKET_B',
        kelas: 'Kelas 1',
        mataPelajaran: 'Matematika',
        guruId: 'usr_guru001',
        deskripsi: 'Kursus matematika dasar'
      };

      const result = await dataService.createCourse(data);

      expect(result.error).toBeUndefined();
      expect(result.id).toBeDefined();
      expect(result.id).toMatch(/^crs_/);
      expect(result.nama).toBe('Matematika Kelas 1');
      expect(result.program).toBe('PAKET_B');
      expect(result.kelas).toBe('Kelas 1');
      expect(result.mataPelajaran).toBe('Matematika');
      expect(result.guruId).toBe('usr_guru001');
      expect(result.aktif).toBe(true);
      expect(result.createdAt).toBeDefined();
    });

    it('should return error when nama is missing', async () => {
      const data = {
        program: 'PAKET_B',
        kelas: 'Kelas 1',
        mataPelajaran: 'Matematika',
        guruId: 'usr_guru001'
      };

      const result = await dataService.createCourse(data);

      expect(result.error).toBeDefined();
      expect(result.error).toContain('nama');
    });

    it('should return error when nama is empty string', async () => {
      const data = {
        nama: '   ',
        program: 'PAKET_B',
        kelas: 'Kelas 1',
        mataPelajaran: 'Matematika',
        guruId: 'usr_guru001'
      };

      const result = await dataService.createCourse(data);

      expect(result.error).toBeDefined();
      expect(result.error).toContain('nama');
    });

    it('should return error when program is missing', async () => {
      const data = {
        nama: 'Matematika Kelas 1',
        kelas: 'Kelas 1',
        mataPelajaran: 'Matematika',
        guruId: 'usr_guru001'
      };

      const result = await dataService.createCourse(data);

      expect(result.error).toBeDefined();
      expect(result.error).toContain('program');
    });

    it('should return error when kelas is missing', async () => {
      const data = {
        nama: 'Matematika Kelas 1',
        program: 'PAKET_B',
        mataPelajaran: 'Matematika',
        guruId: 'usr_guru001'
      };

      const result = await dataService.createCourse(data);

      expect(result.error).toBeDefined();
      expect(result.error).toContain('kelas');
    });

    it('should return error when mataPelajaran is missing', async () => {
      const data = {
        nama: 'Matematika Kelas 1',
        program: 'PAKET_B',
        kelas: 'Kelas 1',
        guruId: 'usr_guru001'
      };

      const result = await dataService.createCourse(data);

      expect(result.error).toBeDefined();
      expect(result.error).toContain('mataPelajaran');
    });

    it('should return error when mataPelajaran is invalid for program', async () => {
      const data = {
        nama: 'Fisika Kelas 1',
        program: 'PAKET_B',
        kelas: 'Kelas 1',
        mataPelajaran: 'Fisika', // Fisika is PAKET_C only
        guruId: 'usr_guru001'
      };

      const result = await dataService.createCourse(data);

      expect(result.error).toBeDefined();
      expect(result.error).toContain('tidak valid');
    });

    it('should return error when program is invalid', async () => {
      const data = {
        nama: 'Matematika',
        program: 'PAKET_D', // does not exist
        kelas: 'Kelas 1',
        mataPelajaran: 'Matematika',
        guruId: 'usr_guru001'
      };

      const result = await dataService.createCourse(data);

      expect(result.error).toBeDefined();
      expect(result.error).toContain('tidak valid');
    });

    it('should accept valid mataPelajaran for PAKET_C', async () => {
      const data = {
        nama: 'Fisika Kelas 1',
        program: 'PAKET_C',
        kelas: 'Kelas 1',
        mataPelajaran: 'Fisika',
        guruId: 'usr_guru001'
      };

      const result = await dataService.createCourse(data);

      expect(result.error).toBeUndefined();
      expect(result.mataPelajaran).toBe('Fisika');
    });

    it('should persist created course in storage', async () => {
      const data = {
        nama: 'B. Indonesia Kelas 6',
        program: 'PAKET_A',
        kelas: 'Kelas 6',
        mataPelajaran: 'B. Indonesia',
        guruId: 'usr_guru001'
      };

      const created = await dataService.createCourse(data);
      const retrieved = await dataService.getCourseById(created.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved.nama).toBe('B. Indonesia Kelas 6');
      expect(retrieved.program).toBe('PAKET_A');
    });
  });

  describe('getCourses with filters', () => {

    beforeEach(() => {
      // Seed some courses
      seedCourse({
        id: 'crs_001', nama: 'Math B1', program: 'PAKET_B',
        kelas: 'Kelas 1', mataPelajaran: 'Matematika',
        guruId: 'usr_guru001', aktif: true, createdAt: '2024-01-01T00:00:00Z'
      });
      seedCourse({
        id: 'crs_002', nama: 'IPA B1', program: 'PAKET_B',
        kelas: 'Kelas 1', mataPelajaran: 'IPA',
        guruId: 'usr_guru001', aktif: true, createdAt: '2024-01-02T00:00:00Z'
      });
      seedCourse({
        id: 'crs_003', nama: 'Fisika C1', program: 'PAKET_C',
        kelas: 'Kelas 1', mataPelajaran: 'Fisika',
        guruId: 'usr_guru002', aktif: true, createdAt: '2024-01-03T00:00:00Z'
      });
      seedCourse({
        id: 'crs_004', nama: 'Inactive Course', program: 'PAKET_B',
        kelas: 'Kelas 1', mataPelajaran: 'B. Indonesia',
        guruId: 'usr_guru001', aktif: false, createdAt: '2024-01-04T00:00:00Z'
      });
    });

    it('should filter courses by guruId', async () => {
      const courses = await dataService.getCourses({ guruId: 'usr_guru001' });

      expect(courses.length).toBe(3); // crs_001, crs_002, crs_004
      expect(courses.every(c => c.guruId === 'usr_guru001')).toBe(true);
    });

    it('should filter courses by guruId and aktif', async () => {
      const courses = await dataService.getCourses({ guruId: 'usr_guru001', aktif: true });

      expect(courses.length).toBe(2); // crs_001, crs_002
      expect(courses.every(c => c.guruId === 'usr_guru001' && c.aktif === true)).toBe(true);
    });

    it('should filter courses by siswaId (via enrollments)', async () => {
      // Enroll siswa in crs_001 and crs_003
      seedEnrollment({ id: 'enr_001', courseId: 'crs_001', siswaId: 'usr_siswa001', aktif: true, enrolledAt: '2024-01-01T00:00:00Z' });
      seedEnrollment({ id: 'enr_002', courseId: 'crs_003', siswaId: 'usr_siswa001', aktif: true, enrolledAt: '2024-01-01T00:00:00Z' });
      // Inactive enrollment should be excluded
      seedEnrollment({ id: 'enr_003', courseId: 'crs_002', siswaId: 'usr_siswa001', aktif: false, enrolledAt: '2024-01-01T00:00:00Z' });

      const courses = await dataService.getCourses({ siswaId: 'usr_siswa001' });

      expect(courses.length).toBe(2);
      const ids = courses.map(c => c.id);
      expect(ids).toContain('crs_001');
      expect(ids).toContain('crs_003');
      // Should NOT include crs_002 (inactive enrollment) or crs_004 (inactive course)
      expect(ids).not.toContain('crs_002');
      expect(ids).not.toContain('crs_004');
    });

    it('siswaId filter should only return aktif courses', async () => {
      // Enroll siswa in inactive course
      seedEnrollment({ id: 'enr_004', courseId: 'crs_004', siswaId: 'usr_siswa002', aktif: true, enrolledAt: '2024-01-01T00:00:00Z' });

      const courses = await dataService.getCourses({ siswaId: 'usr_siswa002' });

      expect(courses.length).toBe(0);
    });

    it('should return all courses when no filter is provided', async () => {
      const courses = await dataService.getCourses();

      expect(courses.length).toBe(4);
    });
  });

  describe('deactivateCourse', () => {

    beforeEach(() => {
      seedCourse({
        id: 'crs_active', nama: 'Active Course', program: 'PAKET_B',
        kelas: 'Kelas 1', mataPelajaran: 'Matematika',
        guruId: 'usr_guru001', aktif: true, createdAt: '2024-01-01T00:00:00Z'
      });
    });

    it('should set aktif to false', async () => {
      const result = await dataService.deactivateCourse('crs_active');

      expect(result).not.toBeNull();
      expect(result.aktif).toBe(false);

      // Verify persisted
      const course = await dataService.getCourseById('crs_active');
      expect(course.aktif).toBe(false);
    });

    it('deactivated course should not be visible to siswa via getCourses', async () => {
      // Enroll siswa
      seedEnrollment({ id: 'enr_005', courseId: 'crs_active', siswaId: 'usr_siswa001', aktif: true, enrolledAt: '2024-01-01T00:00:00Z' });

      // Before deactivation
      let courses = await dataService.getCourses({ siswaId: 'usr_siswa001' });
      expect(courses.length).toBe(1);

      // Deactivate
      await dataService.deactivateCourse('crs_active');

      // After deactivation - siswa should not see it
      courses = await dataService.getCourses({ siswaId: 'usr_siswa001' });
      expect(courses.length).toBe(0);
    });

    it('deactivated course should still be visible to guru via getCourses', async () => {
      await dataService.deactivateCourse('crs_active');

      // Guru can still see their deactivated courses (no aktif filter)
      const courses = await dataService.getCourses({ guruId: 'usr_guru001' });
      expect(courses.length).toBe(1);
      expect(courses[0].aktif).toBe(false);
    });

    it('deactivated course should preserve all data', async () => {
      await dataService.deactivateCourse('crs_active');

      const course = await dataService.getCourseById('crs_active');
      expect(course).not.toBeNull();
      expect(course.nama).toBe('Active Course');
      expect(course.program).toBe('PAKET_B');
      expect(course.kelas).toBe('Kelas 1');
      expect(course.mataPelajaran).toBe('Matematika');
    });
  });

  describe('getCourseStudents', () => {

    beforeEach(() => {
      seedCourse({
        id: 'crs_test', nama: 'Test Course', program: 'PAKET_B',
        kelas: 'Kelas 1', mataPelajaran: 'IPA',
        guruId: 'usr_guru001', aktif: true, createdAt: '2024-01-01T00:00:00Z'
      });
      seedUser({ id: 'usr_s1', username: 'siswa1', nama: 'Siswa Satu', role: 'SISWA', program: 'PAKET_B', kelas: 'Kelas 1', aktif: true });
      seedUser({ id: 'usr_s2', username: 'siswa2', nama: 'Siswa Dua', role: 'SISWA', program: 'PAKET_B', kelas: 'Kelas 1', aktif: true });
      seedUser({ id: 'usr_s3', username: 'siswa3', nama: 'Siswa Tiga', role: 'SISWA', program: 'PAKET_B', kelas: 'Kelas 1', aktif: true });

      seedEnrollment({ id: 'enr_a', courseId: 'crs_test', siswaId: 'usr_s1', aktif: true, enrolledAt: '2024-01-01T00:00:00Z' });
      seedEnrollment({ id: 'enr_b', courseId: 'crs_test', siswaId: 'usr_s2', aktif: true, enrolledAt: '2024-01-02T00:00:00Z' });
      // Inactive enrollment
      seedEnrollment({ id: 'enr_c', courseId: 'crs_test', siswaId: 'usr_s3', aktif: false, enrolledAt: '2024-01-03T00:00:00Z' });
    });

    it('should return only actively enrolled students', async () => {
      const students = await dataService.getCourseStudents('crs_test');

      expect(students.length).toBe(2);
      const ids = students.map(s => s.id);
      expect(ids).toContain('usr_s1');
      expect(ids).toContain('usr_s2');
      expect(ids).not.toContain('usr_s3');
    });

    it('should return empty array for course with no enrollments', async () => {
      const students = await dataService.getCourseStudents('crs_nonexistent');

      expect(students).toEqual([]);
    });
  });

  describe('updateCourse', () => {

    beforeEach(() => {
      seedCourse({
        id: 'crs_upd', nama: 'Original Name', program: 'PAKET_B',
        kelas: 'Kelas 1', mataPelajaran: 'Matematika',
        guruId: 'usr_guru001', aktif: true, deskripsi: 'Original desc',
        createdAt: '2024-01-01T00:00:00Z'
      });
    });

    it('should update course fields', async () => {
      const result = await dataService.updateCourse('crs_upd', {
        nama: 'Updated Name',
        deskripsi: 'Updated desc'
      });

      expect(result.nama).toBe('Updated Name');
      expect(result.deskripsi).toBe('Updated desc');
      // Unchanged fields should persist
      expect(result.program).toBe('PAKET_B');
      expect(result.mataPelajaran).toBe('Matematika');
    });

    it('should return null for non-existent course', async () => {
      const result = await dataService.updateCourse('crs_nonexistent', { nama: 'X' });

      expect(result).toBeNull();
    });

    it('should not change the course id', async () => {
      const result = await dataService.updateCourse('crs_upd', { id: 'crs_hacked' });

      expect(result.id).toBe('crs_upd');
    });
  });

  describe('getCourseById', () => {

    it('should return course by id', async () => {
      seedCourse({
        id: 'crs_find', nama: 'Find Me', program: 'PAKET_C',
        kelas: 'Kelas 2', mataPelajaran: 'Biologi',
        guruId: 'usr_guru002', aktif: true, createdAt: '2024-01-01T00:00:00Z'
      });

      const course = await dataService.getCourseById('crs_find');

      expect(course).not.toBeNull();
      expect(course.nama).toBe('Find Me');
      expect(course.program).toBe('PAKET_C');
    });

    it('should return null for non-existent id', async () => {
      const course = await dataService.getCourseById('crs_doesnotexist');

      expect(course).toBeNull();
    });
  });
});
