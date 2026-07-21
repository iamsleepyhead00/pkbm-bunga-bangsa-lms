/**
 * kursus.js - Course management page controller (Guru)
 * Handles: list courses, create course, deactivate course
 */

import Auth from '../auth.js';
import dataService from '../data-service.js';
import { KURIKULUM, getMapelByProgram, getKelasByProgram, getProgramLabel, getAllPrograms } from '../curriculum.js';
import { initLayout, renderCourseCard, showModal, closeModal, showConfirm, showToast, showLoading, hideLoading } from '../components.js';

const KursusPage = {
  courses: [],
  session: null,

  /**
   * Initialize kursus page — auth guard, load data, render
   */
  async init() {
    this.session = Auth.checkSession();
    if (!this.session) {
      window.location.href = '/login.html';
      return;
    }
    if (!Auth.enforceRole(['GURU'])) {
      return;
    }

    // Init layout
    initLayout('GURU', 'kursus', { pageTitle: 'Kursus Saya' });

    // Render page structure
    this.renderPageStructure();

    // Load and render courses
    await this.loadCourses();
  },

  /**
   * Render the main page structure into app-content
   */
  renderPageStructure() {
    const mainContent = document.getElementById('mainContent');
    if (!mainContent) return;

    mainContent.innerHTML = `
      <div class="page-header">
        <div class="page-header-info">
          <h2 class="page-title">Kursus Saya</h2>
          <p class="page-subtitle">Kelola kursus yang Anda ampu</p>
        </div>
        <button class="btn btn-primary" id="btnTambahKursus">
          <i class="ri-add-line"></i>
          <span>Tambah Kursus</span>
        </button>
      </div>
      <div id="courseListContainer" class="course-grid">
        <div class="loading-spinner" role="status" aria-label="Memuat...">
          <div class="spinner"></div>
          <span class="loading-text">Memuat kursus...</span>
        </div>
      </div>
    `;

    this.bindEvents();
  },

  /**
   * Load courses for current guru
   */
  async loadCourses() {
    const container = document.getElementById('courseListContainer');
    if (!container) return;

    try {
      this.courses = await dataService.getCourses({ guruId: this.session.userId });

      // Get student count for each course
      const coursesWithCount = [];
      for (const course of this.courses) {
        const students = await dataService.getCourseStudents(course.id);
        coursesWithCount.push({ ...course, studentCount: students.length });
      }

      this.renderCourseList(coursesWithCount);
    } catch (err) {
      console.error('Error loading courses:', err);
      container.innerHTML = `<div class="empty-state">
        <i class="ri-error-warning-line"></i>
        <p>Gagal memuat data kursus</p>
      </div>`;
    }
  },

  /**
   * Render grid of course cards
   * @param {Array} courses - Courses with studentCount
   */
  renderCourseList(courses) {
    const container = document.getElementById('courseListContainer');
    if (!container) return;

    if (!courses || courses.length === 0) {
      container.innerHTML = `<div class="empty-state">
        <i class="ri-book-open-line empty-state-icon"></i>
        <h3>Belum ada kursus</h3>
        <p>Klik tombol "Tambah Kursus" untuk membuat kursus baru</p>
      </div>`;
      return;
    }

    const cardsHtml = courses.map(course => {
      return `<a href="/pages/guru/kursus-detail.html?id=${course.id}" class="course-card-link">
        ${renderCourseCard(course, 'GURU', { studentCount: course.studentCount })}
      </a>`;
    }).join('');

    container.innerHTML = cardsHtml;
  },

  /**
   * Bind page event listeners
   */
  bindEvents() {
    const btnTambah = document.getElementById('btnTambahKursus');
    if (btnTambah) {
      btnTambah.addEventListener('click', () => this.showCreateModal());
    }
  },

  /**
   * Show modal form for creating a new course
   */
  showCreateModal() {
    const programs = getAllPrograms();
    const programOptions = programs.map(p => {
      const label = getProgramLabel(p);
      return `<option value="${p}">${label}</option>`;
    }).join('');

    const formHtml = `
      <form id="createCourseForm" class="form">
        <div class="form-group">
          <label class="form-label" for="courseName">Nama Kursus <span class="required">*</span></label>
          <input type="text" class="form-input" id="courseName" name="nama" required placeholder="Contoh: Matematika Kelas 1 Paket B">
        </div>
        <div class="form-group">
          <label class="form-label" for="courseProgram">Program <span class="required">*</span></label>
          <select class="form-select" id="courseProgram" name="program" required>
            <option value="">-- Pilih Program --</option>
            ${programOptions}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="courseKelas">Kelas <span class="required">*</span></label>
          <select class="form-select" id="courseKelas" name="kelas" required disabled>
            <option value="">-- Pilih Kelas --</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="courseMapel">Mata Pelajaran <span class="required">*</span></label>
          <select class="form-select" id="courseMapel" name="mataPelajaran" required disabled>
            <option value="">-- Pilih Mata Pelajaran --</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="courseDesc">Deskripsi</label>
          <textarea class="form-textarea" id="courseDesc" name="deskripsi" rows="3" placeholder="Deskripsi singkat kursus (opsional)"></textarea>
        </div>
        <div id="createCourseError" class="form-error" hidden></div>
      </form>
    `;

    showModal('Tambah Kursus Baru', formHtml, [
      { label: 'Batal', type: 'secondary', handler: () => {} }
    ]);

    // Add Simpan button manually (async handler needs manual control of modal close)
    const modalFooter = document.querySelector('#appModal .modal-footer');
    if (modalFooter) {
      const simpanBtn = document.createElement('button');
      simpanBtn.className = 'btn btn-primary';
      simpanBtn.textContent = 'Simpan';
      simpanBtn.addEventListener('click', async () => {
        await this.handleCreateSubmit();
      });
      modalFooter.appendChild(simpanBtn);
    }

    // Bind dynamic dropdown behavior
    this.bindCreateFormEvents();
  },

  /**
   * Bind dynamic dropdown change events inside the create modal
   */
  bindCreateFormEvents() {
    const programSelect = document.getElementById('courseProgram');
    const kelasSelect = document.getElementById('courseKelas');
    const mapelSelect = document.getElementById('courseMapel');

    if (programSelect) {
      programSelect.addEventListener('change', () => {
        const program = programSelect.value;

        // Reset kelas and mapel
        kelasSelect.innerHTML = '<option value="">-- Pilih Kelas --</option>';
        mapelSelect.innerHTML = '<option value="">-- Pilih Mata Pelajaran --</option>';

        if (program) {
          // Populate kelas
          const kelasList = getKelasByProgram(program);
          kelasList.forEach(k => {
            const opt = document.createElement('option');
            opt.value = k;
            opt.textContent = k;
            kelasSelect.appendChild(opt);
          });
          kelasSelect.disabled = false;

          // Populate mapel
          const mapelList = getMapelByProgram(program);
          mapelList.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m;
            opt.textContent = m;
            mapelSelect.appendChild(opt);
          });
          mapelSelect.disabled = false;
        } else {
          kelasSelect.disabled = true;
          mapelSelect.disabled = true;
        }
      });
    }
  },

  /**
   * Handle create course form submission
   */
  async handleCreateSubmit() {
    const form = document.getElementById('createCourseForm');
    const errorEl = document.getElementById('createCourseError');
    if (!form) return;

    const formData = {
      nama: form.querySelector('#courseName').value.trim(),
      program: form.querySelector('#courseProgram').value,
      kelas: form.querySelector('#courseKelas').value,
      mataPelajaran: form.querySelector('#courseMapel').value,
      deskripsi: form.querySelector('#courseDesc').value.trim(),
      guruId: this.session.userId
    };

    // Client-side validation
    if (!formData.nama) {
      this.showFormError(errorEl, 'Nama kursus wajib diisi');
      return;
    }
    if (!formData.program) {
      this.showFormError(errorEl, 'Program wajib dipilih');
      return;
    }
    if (!formData.kelas) {
      this.showFormError(errorEl, 'Kelas wajib dipilih');
      return;
    }
    if (!formData.mataPelajaran) {
      this.showFormError(errorEl, 'Mata pelajaran wajib dipilih');
      return;
    }

    await this.handleCreate(formData);
  },

  /**
   * Create a new course via DataService
   * @param {object} formData - Course data from form
   */
  async handleCreate(formData) {
    try {
      const result = await dataService.createCourse(formData);

      if (result.error) {
        showToast(result.error, 'error');
        return;
      }

      showToast('Kursus berhasil dibuat!', 'success');
      closeModal();

      // Reload course list
      await this.loadCourses();
    } catch (err) {
      console.error('Error creating course:', err);
      showToast('Gagal membuat kursus', 'error');
    }
  },

  /**
   * Deactivate a course after confirmation
   * @param {string} courseId - Course ID to deactivate
   */
  async handleDeactivate(courseId) {
    const confirmed = await showConfirm('Apakah Anda yakin ingin menonaktifkan kursus ini? Siswa tidak akan bisa mengakses kursus ini lagi.');
    if (!confirmed) return;

    try {
      await dataService.deactivateCourse(courseId);
      showToast('Kursus berhasil dinonaktifkan', 'success');
      await this.loadCourses();
    } catch (err) {
      console.error('Error deactivating course:', err);
      showToast('Gagal menonaktifkan kursus', 'error');
    }
  },

  /**
   * Activate a course (set aktif = true)
   * @param {string} courseId - Course ID to activate
   */
  async handleActivate(courseId) {
    try {
      await dataService.updateCourse(courseId, { aktif: true });
      showToast('Kursus berhasil diaktifkan', 'success');
      await this.loadCourses();
    } catch (err) {
      console.error('Error activating course:', err);
      showToast('Gagal mengaktifkan kursus', 'error');
    }
  },

  /**
   * Show inline form error
   */
  showFormError(errorEl, message) {
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.hidden = false;
    }
  }
};

export default KursusPage;
