/**
 * kursus-siswa.js — Siswa Course Page Controller
 * 
 * Handles two modes:
 * 1. Listing mode (no ?id param): Grid of enrolled courses with progress bars
 * 2. Detail mode (?id=xxx): Course detail with tabs (Materi, Tugas, Kuis, Forum)
 * 
 * Only active courses are shown (filter is in DataService.getCourses({siswaId}))
 * 
 * Requirements: 2.5, 6.1, 6.2
 */

import Auth from '../auth.js';
import dataService from '../data-service.js';
import { initLayout, renderCourseCard, renderProgressBar, showLoading, showToast } from '../components.js';

const KursusSiswaPage = {
  courseId: null,
  session: null,

  /**
   * Initialize the page — check auth, determine mode, load data
   */
  async init() {
    // Auth guard
    this.session = Auth.checkSession();
    if (!this.session) {
      window.location.href = '/login.html';
      return;
    }
    if (!Auth.enforceRole(['SISWA'])) {
      return;
    }

    // Determine mode from URL params
    const params = new URLSearchParams(window.location.search);
    this.courseId = params.get('id');

    // Init layout
    initLayout('SISWA', 'kursus', { pageTitle: 'Kursus Saya' });

    // Render based on mode
    if (this.courseId) {
      await this.initDetailMode();
    } else {
      await this.initListingMode();
    }
  },

  // ==================== LISTING MODE ====================

  /**
   * Listing mode: Show grid of enrolled courses with progress
   */
  async initListingMode() {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;

    showLoading(mainContent);

    try {
      // Get courses for this siswa (already filtered: active + enrolled)
      const courses = await dataService.getCourses({ siswaId: this.session.userId });

      // Get progress for each course
      const coursesWithProgress = await Promise.all(
        courses.map(async (course) => {
          const progress = await dataService.getCourseProgress(this.session.userId, course.id);
          return { course, progress: progress.percentage };
        })
      );

      this.renderListing(mainContent, coursesWithProgress);
    } catch (err) {
      console.error('Error loading courses:', err);
      mainContent.innerHTML = `<div class="empty-state">
        <i class="ri-error-warning-line"></i>
        <p>Terjadi kesalahan saat memuat data kursus.</p>
      </div>`;
    }
  },

  /**
   * Render the course listing grid
   */
  renderListing(container, coursesWithProgress) {
    if (coursesWithProgress.length === 0) {
      container.innerHTML = `
        <div class="page-header">
          <h2 class="page-title">Kursus Saya</h2>
          <p class="page-subtitle">Daftar kursus yang sedang kamu ikuti</p>
        </div>
        <div class="empty-state">
          <i class="ri-book-open-line"></i>
          <h3>Belum ada kursus yang diikuti</h3>
          <p>Hubungi guru untuk mendaftarkan kamu ke kursus.</p>
        </div>`;
      return;
    }

    const cardsHtml = coursesWithProgress.map(({ course, progress }) => {
      const card = renderCourseCard(course, 'SISWA', { progress });
      // Wrap card in a link
      return `<a href="/pages/siswa/kursus.html?id=${course.id}" class="course-card-link">
        ${card}
      </a>`;
    }).join('\n');

    container.innerHTML = `
      <div class="page-header">
        <h2 class="page-title">Kursus Saya</h2>
        <p class="page-subtitle">Daftar kursus yang sedang kamu ikuti</p>
      </div>
      <div class="courses-grid">
        ${cardsHtml}
      </div>`;
  },

  // ==================== DETAIL MODE ====================

  /**
   * Detail mode: Show course detail with tabs
   */
  async initDetailMode() {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;

    showLoading(mainContent);

    try {
      const course = await dataService.getCourseById(this.courseId);

      if (!course || !course.aktif) {
        mainContent.innerHTML = `<div class="empty-state">
          <i class="ri-error-warning-line"></i>
          <h3>Kursus tidak ditemukan</h3>
          <p>Kursus yang kamu cari tidak tersedia atau sudah dinonaktifkan.</p>
          <a href="/pages/siswa/kursus.html" class="btn btn-primary">Kembali ke Daftar Kursus</a>
        </div>`;
        return;
      }

      // Verify enrollment
      const enrollments = await dataService.getStudentEnrollments(this.session.userId);
      const isEnrolled = enrollments.some(e => e.courseId === this.courseId);

      if (!isEnrolled) {
        mainContent.innerHTML = `<div class="empty-state">
          <i class="ri-lock-line"></i>
          <h3>Akses Ditolak</h3>
          <p>Kamu tidak terdaftar pada kursus ini.</p>
          <a href="/pages/siswa/kursus.html" class="btn btn-primary">Kembali ke Daftar Kursus</a>
        </div>`;
        return;
      }

      // Get progress
      const progress = await dataService.getCourseProgress(this.session.userId, this.courseId);

      this.renderDetail(mainContent, course, progress);
      this.bindDetailEvents();

      // Load initial tab content (Materi)
      await this.loadTabContent('materi');
    } catch (err) {
      console.error('Error loading course detail:', err);
      mainContent.innerHTML = `<div class="empty-state">
        <i class="ri-error-warning-line"></i>
        <p>Terjadi kesalahan saat memuat detail kursus.</p>
        <a href="/pages/siswa/kursus.html" class="btn btn-primary">Kembali ke Daftar Kursus</a>
      </div>`;
    }
  },

  /**
   * Render course detail view with header and tabs
   */
  renderDetail(container, course, progress) {
    const programLabels = {
      PAKET_A: 'Paket A (SD)',
      PAKET_B: 'Paket B (SMP)',
      PAKET_C: 'Paket C (SMA)'
    };
    const programLabel = programLabels[course.program] || course.program;

    container.innerHTML = `
      <div class="page-header">
        <a href="/pages/siswa/kursus.html" class="btn-back">
          <i class="ri-arrow-left-line"></i> Kembali ke Daftar Kursus
        </a>
      </div>

      <div class="course-detail-header">
        <div class="course-detail-badges">
          <span class="badge badge-primary">${this.escapeHtml(programLabel)}</span>
          <span class="badge badge-gray">${this.escapeHtml(course.kelas)}</span>
        </div>
        <h2 class="course-detail-title">${this.escapeHtml(course.nama)}</h2>
        <p class="course-detail-meta">
          <span><i class="ri-book-2-line"></i> ${this.escapeHtml(course.mataPelajaran)}</span>
        </p>
        ${course.deskripsi ? `<p class="course-detail-desc">${this.escapeHtml(course.deskripsi)}</p>` : ''}
        <div class="course-detail-progress">
          <span class="progress-label-text">Progress Belajar</span>
          ${renderProgressBar(progress.percentage, { showLabel: true })}
          <span class="progress-detail-text">${progress.accessedCount} dari ${progress.totalMaterials} materi diakses</span>
        </div>
      </div>

      <div class="course-tabs">
        <nav class="tabs-nav" role="tablist" aria-label="Konten kursus">
          <button class="tab-btn active" role="tab" aria-selected="true" data-tab="materi">
            <i class="ri-book-open-line"></i> Materi
          </button>
          <button class="tab-btn" role="tab" aria-selected="false" data-tab="tugas">
            <i class="ri-task-line"></i> Tugas
          </button>
          <button class="tab-btn" role="tab" aria-selected="false" data-tab="kuis">
            <i class="ri-questionnaire-line"></i> Kuis
          </button>
          <button class="tab-btn" role="tab" aria-selected="false" data-tab="forum">
            <i class="ri-discuss-line"></i> Forum
          </button>
        </nav>
        <div class="tab-content" id="tabContent" role="tabpanel">
          <div class="loading-spinner" role="status" aria-label="Memuat...">
            <div class="spinner"></div>
            <span class="loading-text">Memuat...</span>
          </div>
        </div>
      </div>`;
  },

  /**
   * Bind tab switching events
   */
  bindDetailEvents() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        // Update active tab
        tabButtons.forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');

        const tab = btn.dataset.tab;
        await this.loadTabContent(tab);
      });
    });
  },

  /**
   * Load content for a specific tab
   */
  async loadTabContent(tab) {
    const tabContent = document.getElementById('tabContent');
    if (!tabContent) return;

    tabContent.innerHTML = `<div class="loading-spinner" role="status" aria-label="Memuat...">
      <div class="spinner"></div>
      <span class="loading-text">Memuat...</span>
    </div>`;

    try {
      switch (tab) {
        case 'materi':
          await this.renderMateriTab(tabContent);
          break;
        case 'tugas':
          await this.renderTugasTab(tabContent);
          break;
        case 'kuis':
          await this.renderKuisTab(tabContent);
          break;
        case 'forum':
          await this.renderForumTab(tabContent);
          break;
        default:
          tabContent.innerHTML = '<p>Tab tidak ditemukan.</p>';
      }
    } catch (err) {
      console.error(`Error loading tab ${tab}:`, err);
      tabContent.innerHTML = `<p class="text-muted">Gagal memuat konten. Silakan coba lagi.</p>`;
    }
  },

  /**
   * Render Materi tab — list of published materials
   */
  async renderMateriTab(container) {
    const materials = await dataService.getMaterials(this.courseId, { publishedOnly: true });

    if (materials.length === 0) {
      container.innerHTML = `<div class="tab-empty-state">
        <i class="ri-book-open-line"></i>
        <p>Belum ada materi yang tersedia untuk kursus ini.</p>
      </div>`;
      return;
    }

    const iconMap = {
      TEKS: { icon: 'ri-file-text-line', class: 'teks' },
      FILE: { icon: 'ri-file-download-line', class: 'file' },
      LINK: { icon: 'ri-link', class: 'link' }
    };

    const itemsHtml = materials.map(mat => {
      const typeInfo = iconMap[mat.tipe] || iconMap.TEKS;
      return `<div class="material-item" data-material-id="${mat.id}">
        <div class="material-icon ${typeInfo.class}">
          <i class="${typeInfo.icon}"></i>
        </div>
        <div class="material-info">
          <div class="material-title">${this.escapeHtml(mat.judul)}</div>
          ${mat.deskripsi ? `<div class="material-desc">${this.escapeHtml(mat.deskripsi)}</div>` : ''}
        </div>
        <div class="material-status">
          <i class="ri-arrow-right-s-line"></i>
        </div>
      </div>`;
    }).join('\n');

    container.innerHTML = `<div class="material-list">
      ${itemsHtml}
    </div>`;

    // Bind material click events (record access)
    container.querySelectorAll('.material-item').forEach(item => {
      item.addEventListener('click', async () => {
        const materialId = item.dataset.materialId;
        await dataService.recordMaterialAccess(materialId, this.session.userId);
        showToast('Materi dibuka', 'success');
        // In future: navigate to material detail view
      });
    });
  },

  /**
   * Render Tugas tab — list of assignments
   */
  async renderTugasTab(container) {
    const assignments = await dataService.getAssignments(this.courseId);
    const now = new Date();

    // Filter: only show assignments where tanggalMulai <= now
    const visibleAssignments = assignments.filter(a => new Date(a.tanggalMulai) <= now);

    if (visibleAssignments.length === 0) {
      container.innerHTML = `<div class="tab-empty-state">
        <i class="ri-task-line"></i>
        <p>Belum ada tugas yang tersedia untuk kursus ini.</p>
      </div>`;
      return;
    }

    const itemsHtml = await Promise.all(visibleAssignments.map(async (asg) => {
      const submission = await dataService.getStudentSubmission(asg.id, this.session.userId);
      const deadline = new Date(asg.batasWaktu);
      const isOverdue = now > deadline;

      let statusHtml = '';
      if (submission) {
        const submittedLate = new Date(submission.submittedAt) > deadline;
        statusHtml = submittedLate
          ? '<span class="badge badge-warning">Terlambat</span>'
          : '<span class="badge badge-success">Sudah Dikumpulkan</span>';
      } else if (isOverdue) {
        statusHtml = '<span class="badge badge-danger">Melewati Batas Waktu</span>';
      } else {
        statusHtml = '<span class="badge badge-gray">Belum Dikumpulkan</span>';
      }

      const deadlineStr = this.formatDate(asg.batasWaktu);

      return `<div class="deadline-item${isOverdue && !submission ? ' urgent' : ''}">
        <div class="deadline-info">
          <div class="deadline-title">${this.escapeHtml(asg.judul)}</div>
          <div class="deadline-course">Batas waktu: ${deadlineStr}</div>
        </div>
        <div class="deadline-status">
          ${statusHtml}
        </div>
      </div>`;
    }));

    container.innerHTML = `<div class="assignment-list">
      ${itemsHtml.join('\n')}
    </div>`;
  },

  /**
   * Render Kuis tab — list of quizzes
   */
  async renderKuisTab(container) {
    const quizzes = await dataService.getQuizzes(this.courseId);
    const now = new Date();

    if (quizzes.length === 0) {
      container.innerHTML = `<div class="tab-empty-state">
        <i class="ri-questionnaire-line"></i>
        <p>Belum ada kuis yang tersedia untuk kursus ini.</p>
      </div>`;
      return;
    }

    const itemsHtml = quizzes.map(quiz => {
      const start = new Date(quiz.tanggalMulai);
      const end = new Date(quiz.tanggalBerakhir);
      const isAvailable = now >= start && now <= end;
      const isUpcoming = now < start;
      const isExpired = now > end;

      let statusHtml = '';
      if (isAvailable) {
        statusHtml = '<span class="badge badge-success">Tersedia</span>';
      } else if (isUpcoming) {
        statusHtml = '<span class="badge badge-info">Belum Dibuka</span>';
      } else {
        statusHtml = '<span class="badge badge-gray">Berakhir</span>';
      }

      return `<div class="deadline-item">
        <div class="deadline-info">
          <div class="deadline-title">${this.escapeHtml(quiz.judul)}</div>
          <div class="deadline-course">Durasi: ${quiz.durasi} menit · ${this.formatDate(quiz.tanggalMulai)} — ${this.formatDate(quiz.tanggalBerakhir)}</div>
        </div>
        <div class="deadline-status">
          ${statusHtml}
        </div>
      </div>`;
    });

    container.innerHTML = `<div class="quiz-list">
      ${itemsHtml.join('\n')}
    </div>`;
  },

  /**
   * Render Forum tab — list of forum topics for this course
   */
  async renderForumTab(container) {
    const topics = await dataService.getForumTopics(this.courseId);

    if (topics.length === 0) {
      container.innerHTML = `<div class="tab-empty-state">
        <i class="ri-discuss-line"></i>
        <p>Belum ada diskusi di forum kursus ini.</p>
      </div>`;
      return;
    }

    const itemsHtml = topics.map(topic => {
      return `<div class="forum-topic-item">
        <div class="forum-topic-content">
          <div class="forum-topic-title">${this.escapeHtml(topic.judul)}</div>
          <div class="forum-topic-meta">
            <span><i class="ri-time-line"></i> ${this.formatDate(topic.createdAt)}</span>
          </div>
        </div>
        <div class="forum-topic-stats">
          <div class="reply-count">${topic.replyCount || 0}</div>
          <div class="last-activity">balasan</div>
        </div>
      </div>`;
    });

    container.innerHTML = `<div class="forum-topic-list">
      ${itemsHtml.join('\n')}
    </div>`;
  },

  // ==================== UTILITIES ====================

  /**
   * Escape HTML for safe rendering
   */
  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  /**
   * Format ISO date string to readable format
   */
  formatDate(isoStr) {
    if (!isoStr) return '-';
    try {
      const date = new Date(isoStr);
      return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoStr;
    }
  }
};

export default KursusSiswaPage;
