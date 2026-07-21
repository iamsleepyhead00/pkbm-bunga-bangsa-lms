/**
 * Unit tests for DataService Material CRUD methods
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7
 */

import { describe, it, expect, beforeEach } from 'vitest';
import dataService from '../../js/data-service.js';

describe('DataService — Materials', () => {
  const courseId = 'crs_test001';

  beforeEach(() => {
    localStorage.clear();
  });

  describe('createMaterial', () => {
    it('should create a material with all fields', async () => {
      const data = {
        courseId,
        judul: 'Pengenalan Matematika',
        deskripsi: 'Materi dasar matematika',
        tipe: 'TEKS',
        konten: 'Isi materi teks...',
        published: true
      };

      const result = await dataService.createMaterial(data);

      expect(result.id).toMatch(/^mat_/);
      expect(result.courseId).toBe(courseId);
      expect(result.judul).toBe('Pengenalan Matematika');
      expect(result.deskripsi).toBe('Materi dasar matematika');
      expect(result.tipe).toBe('TEKS');
      expect(result.konten).toBe('Isi materi teks...');
      expect(result.published).toBe(true);
      expect(result.urutan).toBe(1);
      expect(result.createdAt).toBeDefined();
    });

    it('should auto-assign urutan incrementally', async () => {
      await dataService.createMaterial({ courseId, judul: 'Materi 1', tipe: 'TEKS' });
      await dataService.createMaterial({ courseId, judul: 'Materi 2', tipe: 'TEKS' });
      const mat3 = await dataService.createMaterial({ courseId, judul: 'Materi 3', tipe: 'TEKS' });

      expect(mat3.urutan).toBe(3);
    });

    it('should store file data as base64', async () => {
      const data = {
        courseId,
        judul: 'Dokumen PDF',
        tipe: 'FILE',
        fileData: 'data:application/pdf;base64,JVBERi0xLjQK...',
        fileName: 'materi.pdf',
        fileSize: 1024 * 500 // 500KB
      };

      const result = await dataService.createMaterial(data);

      expect(result.fileData).toBe(data.fileData);
      expect(result.fileName).toBe('materi.pdf');
      expect(result.fileSize).toBe(1024 * 500);
    });

    it('should reject file size > 10MB with correct error message', async () => {
      const data = {
        courseId,
        judul: 'File Besar',
        tipe: 'FILE',
        fileData: 'base64data...',
        fileName: 'large.pdf',
        fileSize: 11 * 1024 * 1024 // 11MB
      };

      const result = await dataService.createMaterial(data);

      expect(result.error).toBe('Ukuran file melebihi batas maksimal 10 MB');
    });

    it('should accept file size exactly 10MB', async () => {
      const data = {
        courseId,
        judul: 'File Pas',
        tipe: 'FILE',
        fileData: 'base64data...',
        fileName: 'exact10.pdf',
        fileSize: 10 * 1024 * 1024 // Exactly 10MB
      };

      const result = await dataService.createMaterial(data);

      expect(result.error).toBeUndefined();
      expect(result.id).toMatch(/^mat_/);
    });

    it('should set default values for optional fields', async () => {
      const data = { courseId, judul: 'Minimal', tipe: 'LINK' };

      const result = await dataService.createMaterial(data);

      expect(result.deskripsi).toBe('');
      expect(result.konten).toBe('');
      expect(result.fileData).toBeNull();
      expect(result.fileName).toBeNull();
      expect(result.fileSize).toBeNull();
      expect(result.published).toBe(false);
    });
  });

  describe('getMaterials', () => {
    beforeEach(async () => {
      await dataService.createMaterial({ courseId, judul: 'Materi C', tipe: 'TEKS', urutan: 3 });
      await dataService.createMaterial({ courseId, judul: 'Materi A', tipe: 'TEKS', urutan: 1 });
      await dataService.createMaterial({ courseId, judul: 'Materi B', tipe: 'TEKS', urutan: 2, published: true });
      await dataService.createMaterial({ courseId: 'crs_other', judul: 'Other Course', tipe: 'TEKS', urutan: 1 });
    });

    it('should return materials for specific courseId only', async () => {
      const materials = await dataService.getMaterials(courseId);

      expect(materials.length).toBe(3);
      materials.forEach(m => expect(m.courseId).toBe(courseId));
    });

    it('should return materials sorted by urutan ascending', async () => {
      const materials = await dataService.getMaterials(courseId);

      expect(materials[0].judul).toBe('Materi A');
      expect(materials[1].judul).toBe('Materi B');
      expect(materials[2].judul).toBe('Materi C');
    });

    it('should filter published only when option is set', async () => {
      const materials = await dataService.getMaterials(courseId, { publishedOnly: true });

      expect(materials.length).toBe(1);
      expect(materials[0].judul).toBe('Materi B');
      expect(materials[0].published).toBe(true);
    });

    it('should return empty array for non-existent courseId', async () => {
      const materials = await dataService.getMaterials('crs_nonexistent');

      expect(materials).toEqual([]);
    });
  });

  describe('updateMaterial', () => {
    it('should update material fields', async () => {
      const created = await dataService.createMaterial({ courseId, judul: 'Original', tipe: 'TEKS' });

      const updated = await dataService.updateMaterial(created.id, { judul: 'Updated', published: true });

      expect(updated.judul).toBe('Updated');
      expect(updated.published).toBe(true);
      expect(updated.tipe).toBe('TEKS'); // unchanged field preserved
    });

    it('should return null for non-existent id', async () => {
      const result = await dataService.updateMaterial('mat_nonexistent', { judul: 'x' });

      expect(result).toBeNull();
    });

    it('should reject file size > 10MB on update', async () => {
      const created = await dataService.createMaterial({ courseId, judul: 'Test', tipe: 'FILE', fileSize: 1024 });

      const result = await dataService.updateMaterial(created.id, {
        fileData: 'newbase64...',
        fileName: 'big.pdf',
        fileSize: 11 * 1024 * 1024
      });

      expect(result.error).toBe('Ukuran file melebihi batas maksimal 10 MB');
    });

    it('should preserve id even if data contains different id', async () => {
      const created = await dataService.createMaterial({ courseId, judul: 'Test', tipe: 'TEKS' });

      const updated = await dataService.updateMaterial(created.id, { id: 'mat_fake', judul: 'Changed' });

      expect(updated.id).toBe(created.id);
    });
  });

  describe('deleteMaterial', () => {
    it('should remove material from storage', async () => {
      const mat = await dataService.createMaterial({ courseId, judul: 'ToDelete', tipe: 'TEKS' });

      await dataService.deleteMaterial(mat.id);

      const materials = await dataService.getMaterials(courseId);
      expect(materials.length).toBe(0);
    });

    it('should not affect other materials', async () => {
      const mat1 = await dataService.createMaterial({ courseId, judul: 'Keep', tipe: 'TEKS' });
      const mat2 = await dataService.createMaterial({ courseId, judul: 'Delete', tipe: 'TEKS' });

      await dataService.deleteMaterial(mat2.id);

      const materials = await dataService.getMaterials(courseId);
      expect(materials.length).toBe(1);
      expect(materials[0].id).toBe(mat1.id);
    });
  });

  describe('reorderMaterials', () => {
    it('should update urutan based on array position', async () => {
      const mat1 = await dataService.createMaterial({ courseId, judul: 'First', tipe: 'TEKS' });
      const mat2 = await dataService.createMaterial({ courseId, judul: 'Second', tipe: 'TEKS' });
      const mat3 = await dataService.createMaterial({ courseId, judul: 'Third', tipe: 'TEKS' });

      // Reverse order
      await dataService.reorderMaterials(courseId, [mat3.id, mat2.id, mat1.id]);

      const materials = await dataService.getMaterials(courseId);
      expect(materials[0].id).toBe(mat3.id);
      expect(materials[0].urutan).toBe(1);
      expect(materials[1].id).toBe(mat2.id);
      expect(materials[1].urutan).toBe(2);
      expect(materials[2].id).toBe(mat1.id);
      expect(materials[2].urutan).toBe(3);
    });

    it('should only reorder materials within the specified course', async () => {
      const mat1 = await dataService.createMaterial({ courseId, judul: 'A', tipe: 'TEKS' });
      const otherMat = await dataService.createMaterial({ courseId: 'crs_other', judul: 'Other', tipe: 'TEKS' });

      await dataService.reorderMaterials(courseId, [mat1.id]);

      const otherMaterials = await dataService.getMaterials('crs_other');
      expect(otherMaterials[0].urutan).toBe(1); // unchanged
    });
  });

  describe('recordMaterialAccess', () => {
    it('should create access record', async () => {
      const mat = await dataService.createMaterial({ courseId, judul: 'Test', tipe: 'TEKS', published: true });

      await dataService.recordMaterialAccess(mat.id, 'usr_siswa001');

      const stored = JSON.parse(localStorage.getItem('pkbm_material_access'));
      expect(stored.length).toBe(1);
      expect(stored[0].materialId).toBe(mat.id);
      expect(stored[0].siswaId).toBe('usr_siswa001');
      expect(stored[0].id).toMatch(/^mta_/);
      expect(stored[0].accessedAt).toBeDefined();
    });

    it('should not create duplicate access records', async () => {
      const mat = await dataService.createMaterial({ courseId, judul: 'Test', tipe: 'TEKS', published: true });

      await dataService.recordMaterialAccess(mat.id, 'usr_siswa001');
      await dataService.recordMaterialAccess(mat.id, 'usr_siswa001');

      const stored = JSON.parse(localStorage.getItem('pkbm_material_access'));
      expect(stored.length).toBe(1);
    });

    it('should allow different siswa to access same material', async () => {
      const mat = await dataService.createMaterial({ courseId, judul: 'Test', tipe: 'TEKS', published: true });

      await dataService.recordMaterialAccess(mat.id, 'usr_siswa001');
      await dataService.recordMaterialAccess(mat.id, 'usr_siswa002');

      const stored = JSON.parse(localStorage.getItem('pkbm_material_access'));
      expect(stored.length).toBe(2);
    });
  });
});
