/**
 * tugas.js — Page controller for Assignment management
 * Handles: init, render, CRUD actions, file upload, deadline countdown, status badges
 * Used by: pages/guru/tugas-form.html, pages/siswa/tugas.html, kursus-detail.html (tab)
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7
 */

import Auth from '../auth.js';
import dataService from '../data-service.js';
import { showToast, showConfirm, showLoading, hideLoading, showModal, closeModal } from '../components.js';
import { escapeHtml, formatDate, deriveSubmissionStatus } from '../utils.js';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const TugasPage = {
  courseId: null,
  assignments: [],
  currentAssignment: null,
  selectedFiles: [],

  // ==================== Guru: Assignment Tab in kursus-detail ====================

  /**
   * Render assignment list for Guru inside kursus-detail tab
   */
  async renderGuruTab(courseId, container) {
    this.courseId = courseId;
    this.assignments = await dataService.getAssignments(courseId);

    let html = `
      <div class="assignment-tab-header flex justify-between items-center mb-lg">
        <h4>Daftar Tugas</h4>
        <a href="/pages/guru/tugas-form.html?courseId=${escapeHtml(courseId)}" class="btn btn-primary">
          <i class="ri-add-line"></i> Buat Tugas
        </a>
      </div>`;

    if (this.assignments.length === 0) {
      html += `<div class="empty-state text-center" style="padding:2rem">
        <i class="ri-task-line" style="font-size:3rem;color:var(--gray-300)"></i>
        <p style="margin-top:1rem;color:var(--text-muted)">Belum ada tugas. Klik "Buat Tugas" untuk memulai.</p>
      </div>`;
    } else {
      html += `<div class="assignment-list">`;
      for (const asg of this.assignments) {
        html += this.renderAssignmentItemGuru(asg);
      }
      html += `</div>`;
    }

    container.innerHTML = html;
    this.bindGuruTabEvents(container);
  },

  /**
   * Render a single assignment item for Guru view
   */
  renderAssignmentItemGuru(asg) {
    const now = new Date();
    const deadline = new Date(asg.batasWaktu);
    const isExpired = now > deadline;
    const statusBadge = isExpired
      ? '<span class="badge badge-gray">Selesai</span>'
      : '<span class="badge badge-success">Aktif</span>';

    return `<div class="card assignment-item" data-id="${escapeHtml(asg.id)}" style="margin-bottom:var(--space-base)">
      <div class="card-body" style="display:flex;align-items:center;gap:var(--space-base);flex-wrap:wrap">
        <div class="assignment-icon" style="width:40px;height:40px;border-radius:8px;background:var(--primary-light);display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <i class="ri-task-line" style="font-size:1.25rem;color:var(--primary)"></i>
        </div>
        <div class="assignment-info" style="flex:1;min-width:200px">
          <div class="assignment-title" style="font-weight:600">${escapeHtml(asg.judul)}</div>
          <div class="assignment-meta" style="font-size:var(--text-xs);color:var(--text-muted);margin-top:2px">
            <span><i class="ri-calendar-line"></i> Deadline: ${formatDate(asg.batasWaktu)}</span>
          </div>
        </div>
        <div class="assignment-status">${statusBadge}</div>
        <div class="assignment-actions" style="display:flex;gap:0.5rem">
          <button class="btn btn-sm btn-secondary btn-view-submissions" data-id="${escapeHtml(asg.id)}" title="Lihat Pengumpulan">
            <i class="ri-file-list-3-line"></i>
          </button>
        </div>
      </div>
    </div>`;
  },

  /**
   * Bind events for Guru assignment tab
   */
  bindGuruTabEvents(container) {
    container.querySelectorAll('.btn-view-submissions').forEach(btn => {
      btn.addEventListener('click', async () => {
        const asgId = btn.dataset.id;
        await this.showSubmissionsModal(asgId);
      });
    });
  },

  /**
   * Show modal with list of submissions for an assignment
   */
  async showSubmissionsModal(assignmentId) {
    const assignment = this.assignments.find(a => a.id === assignmentId);
    if (!assignment) return;

    const submissions = await dataService.getSubmissions(assignmentId);
    const students = await dataService.getCourseStudents(this.courseId);

    let tableHtml = '';
    if (students.length === 0) {
      tableHtml = '<p class="text-muted">Belum ada siswa terdaftar di kursus ini.</p>';
    } else {
      tableHtml = `<div class="table-responsive"><table class="table">
        <thead><tr>
          <th>Nama Siswa</th><th>Status</th><th>Waktu Submit</th><th>Nilai</th>
        </tr></thead><tbody>`;

      for (const student of students) {
        const sub = submissions.find(s => s.siswaId === student.id);
        const status = deriveSubmissionStatus(sub, assignment.batasWaktu);
        const statusColor = status === 'Sudah Dikumpulkan' ? 'success'
          : status === 'Terlambat' ? 'danger' : 'warning';
        const submitTime = sub ? formatDate(sub.submittedAt) : '-';

        tableHtml += `<tr>
          <td>${escapeHtml(student.nama)}</td>
          <td><span class="badge badge-${statusColor}">${status}</span></td>
          <td>${submitTime}</td>
          <td>-</td>
        </tr>`;
      }
      tableHtml += `</tbody></table></div>`;
    }

    showModal(`Pengumpulan: ${assignment.judul}`, tableHtml, [
      { label: 'Tutup', type: 'secondary', handler: () => {} }
    ]);
  },

  // ==================== Guru: Form Page ====================

  /**
   * Initialize the tugas-form page (create mode)
   */
  async initForm() {
    const params = new URLSearchParams(window.location.search);
    this.courseId = params.get('courseId');

    if (!this.courseId) {
      window.location.href = '/pages/guru/kursus.html';
      return;
    }

    this.renderForm();
    this.bindFormEvents();
  },

  /**
   * Render the assignment creation form
   */
  renderForm() {
    const mainContent = document.getElementById('mainContent');
    const now = new Date();
    const defaultStart = now.toISOString().slice(0, 16);
    const defaultEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);

    mainContent.innerHTML = `
      <div class="form-page">
        <div class="page-header">
          <a href="/pages/guru/kursus-detail.html?id=${escapeHtml(this.courseId)}" class="btn-back">
            <i class="ri-arrow-left-line"></i> Kembali ke Kursus
          </a>
        </div>
        <div class="card">
          <div class="card-header"><h3>Buat Tugas Baru</h3></div>
          <div class="card-body">
            <form id="tugasForm" novalidate>
              <div class="form-group">
                <label class="form-label" for="tugasJudul">Judul Tugas <span class="required">*</span></label>
                <input type="text" class="form-input" id="tugasJudul" name="judul" required placeholder="Masukkan judul tugas">
              </div>
              <div class="form-group">
                <label class="form-label" for="tugasDeskripsi">Deskripsi / Instruksi</label>
                <textarea class="form-textarea" id="tugasDeskripsi" name="deskripsi" rows="5" placeholder="Tuliskan instruksi tugas untuk siswa..."></textarea>
              </div>
              <div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-base)">
                <div class="form-group">
                  <label class="form-label" for="tugasMulai">Tanggal Mulai <span class="required">*</span></label>
                  <input type="datetime-local" class="form-input" id="tugasMulai" name="tanggalMulai" value="${defaultStart}" required>
                </div>
                <div class="form-group">
                  <label class="form-label" for="tugasDeadline">Batas Waktu <span class="required">*</span></label>
                  <input type="datetime-local" class="form-input" id="tugasDeadline" name="batasWaktu" value="${defaultEnd}" required>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Lampiran File (opsional)</label>
                <div class="file-upload-zone" id="fileUploadZone" role="button" tabindex="0" aria-label="Area upload lampiran">
                  <i class="ri-upload-cloud-line"></i>
                  <div class="file-upload-text"><strong>Klik atau seret file ke sini</strong></div>
                  <div class="file-upload-hint">PDF, DOC, PPT, Gambar · Maks. 10MB per file</div>
                  <input type="file" id="tugasFile" hidden accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.gif" multiple>
                </div>
                <div id="fileList" class="file-list" style="margin-top:var(--space-sm)"></div>
                <div id="fileError" class="form-error hidden"></div>
              </div>
              <div class="form-actions" style="display:flex;gap:0.5rem;margin-top:1.5rem">
                <button type="submit" class="btn btn-primary">
                  <i class="ri-save-line"></i> Simpan Tugas
                </button>
                <a href="/pages/guru/kursus-detail.html?id=${escapeHtml(this.courseId)}" class="btn btn-secondary">Batal</a>
              </div>
            </form>
          </div>
        </div>
      </div>`;
  },

  /**
   * Bind form events for tugas-form page
   */
  bindFormEvents() {
    const zone = document.getElementById('fileUploadZone');
    const fileInput = document.getElementById('tugasFile');
    const form = document.getElementById('tugasForm');

    if (zone && fileInput) {
      zone.addEventListener('click', () => fileInput.click());
      zone.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
      });

      fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
          for (const file of e.target.files) {
            this.addAttachment(file);
          }
          fileInput.value = '';
        }
      });

      // Drag and drop
      zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag-active'); });
      zone.addEventListener('dragleave', () => zone.classList.remove('drag-active'));
      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('drag-active');
        if (e.dataTransfer.files.length > 0) {
          for (const file of e.dataTransfer.files) {
            this.addAttachment(file);
          }
        }
      });
    }

    if (form) {
      form.addEventListener('submit', (e) => { e.preventDefault(); this.handleSaveAssignment(); });
    }
  },

  /**
   * Add an attachment file to the list
   */
  addAttachment(file) {
    const errorEl = document.getElementById('fileError');
    errorEl.classList.add('hidden');

    if (file.size > MAX_FILE_SIZE) {
      errorEl.textContent = 'Ukuran file melebihi batas maksimal 10 MB';
      errorEl.classList.remove('hidden');
      return;
    }

    this.selectedFiles.push(file);
    this.renderFileList();
  },

  /**
   * Render the list of attached files
   */
  renderFileList() {
    const container = document.getElementById('fileList');
    if (!container) return;

    if (this.selectedFiles.length === 0) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = this.selectedFiles.map((file, idx) => `
      <div class="file-info-card" style="display:flex;align-items:center;gap:var(--space-sm);padding:var(--space-sm);background:var(--gray-50);border-radius:8px;margin-bottom:var(--space-xs)">
        <i class="ri-file-line" style="color:var(--primary)"></i>
        <span style="flex:1;font-size:var(--text-sm)">${escapeHtml(file.name)}</span>
        <span class="text-muted" style="font-size:var(--text-xs)">${formatFileSize(file.size)}</span>
        <button type="button" class="btn btn-sm btn-danger-outline btn-remove-file" data-index="${idx}" style="padding:2px 6px"><i class="ri-close-line"></i></button>
      </div>
    `).join('');

    container.querySelectorAll('.btn-remove-file').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.index);
        this.selectedFiles.splice(idx, 1);
        this.renderFileList();
      });
    });
  },

  /**
   * Handle save assignment form submission
   */
  async handleSaveAssignment() {
    const judul = document.getElementById('tugasJudul').value.trim();
    const deskripsi = document.getElementById('tugasDeskripsi').value.trim();
    const tanggalMulai = document.getElementById('tugasMulai').value;
    const batasWaktu = document.getElementById('tugasDeadline').value;

    // Validation
    if (!judul) {
      showToast('Judul tugas wajib diisi', 'error');
      document.getElementById('tugasJudul').focus();
      return;
    }
    if (!tanggalMulai) {
      showToast('Tanggal mulai wajib diisi', 'error');
      return;
    }
    if (!batasWaktu) {
      showToast('Batas waktu wajib diisi', 'error');
      return;
    }
    if (new Date(batasWaktu) <= new Date(tanggalMulai)) {
      showToast('Batas waktu harus setelah tanggal mulai', 'error');
      return;
    }

    // Read attachment files as base64
    const attachments = [];
    for (const file of this.selectedFiles) {
      const fileData = await readFileAsBase64(file);
      attachments.push({ fileName: file.name, fileData, fileSize: file.size });
    }

    const data = {
      courseId: this.courseId,
      judul,
      deskripsi,
      tanggalMulai: new Date(tanggalMulai).toISOString(),
      batasWaktu: new Date(batasWaktu).toISOString(),
      attachments
    };

    try {
      const result = await dataService.createAssignment(data);
      if (result && result.error) {
        showToast(result.error, 'error');
        return;
      }

      showToast('Tugas berhasil dibuat', 'success');

      // Notify enrolled students
      await this.notifyStudentsNewAssignment(result);

      setTimeout(() => {
        window.location.href = `/pages/guru/kursus-detail.html?id=${this.courseId}`;
      }, 500);
    } catch (err) {
      console.error('Error saving assignment:', err);
      showToast('Gagal menyimpan tugas', 'error');
    }
  },

  /**
   * Notify enrolled students about new assignment
   */
  async notifyStudentsNewAssignment(assignment) {
    try {
      const students = await dataService.getCourseStudents(this.courseId);
      const course = await dataService.getCourseById(this.courseId);
      for (const student of students) {
        await dataService.createNotification({
          userId: student.id,
          tipe: 'TUGAS_BARU',
          pesan: `Tugas baru "${assignment.judul}" di kursus ${course.nama}`,
          link: `/pages/siswa/tugas.html?courseId=${this.courseId}`
        });
      }
    } catch (err) {
      console.error('Error notifying students:', err);
    }
  },

  // ==================== Siswa: Assignment List Page ====================

  /**
   * Initialize the siswa tugas page
   */
  async initSiswa() {
    const params = new URLSearchParams(window.location.search);
    this.courseId = params.get('courseId');

    if (!this.courseId) {
      window.location.href = '/pages/siswa/kursus.html';
      return;
    }

    const session = Auth.checkSession();
    const course = await dataService.getCourseById(this.courseId);

    if (!course) {
      document.getElementById('mainContent').innerHTML = `<div class="empty-state text-center" style="padding:3rem">
        <i class="ri-error-warning-line empty-state-icon"></i>
        <h3>Kursus tidak ditemukan</h3>
        <a href="/pages/siswa/kursus.html" class="btn btn-primary">Kembali</a>
      </div>`;
      return;
    }

    // Load visible assignments only (tanggalMulai <= now)
    this.assignments = await dataService.getAssignments(this.courseId, { visibleOnly: true });
    await this.renderSiswaPage(course, session);
    this.bindSiswaEvents(session);
  },

  /**
   * Render the siswa assignments page
   */
  async renderSiswaPage(course, session) {
    const mainContent = document.getElementById('mainContent');
    let html = `
      <div class="page-header">
        <a href="/pages/siswa/kursus.html" class="btn-back"><i class="ri-arrow-left-line"></i> Kembali</a>
        <h2 class="page-title">${escapeHtml(course.nama)}</h2>
        <p class="page-subtitle">Daftar Tugas</p>
      </div>`;

    if (this.assignments.length === 0) {
      html += `<div class="empty-state text-center" style="padding:3rem">
        <i class="ri-task-line" style="font-size:3rem;color:var(--gray-300)"></i>
        <p style="margin-top:1rem;color:var(--text-muted)">Belum ada tugas tersedia untuk kursus ini.</p>
      </div>`;
    } else {
      html += `<div class="assignment-list">`;
      for (const asg of this.assignments) {
        const submission = await dataService.getStudentSubmission(asg.id, session.userId);
        html += this.renderAssignmentItemSiswa(asg, submission);
      }
      html += `</div>`;
      html += `<div id="assignmentDetail" class="assignment-detail-panel hidden"></div>`;
    }

    mainContent.innerHTML = html;
  },

  /**
   * Render a single assignment card for Siswa
   */
  renderAssignmentItemSiswa(asg, submission) {
    const status = deriveSubmissionStatus(submission, asg.batasWaktu);
    const statusColor = status === 'Sudah Dikumpulkan' ? 'success'
      : status === 'Terlambat' ? 'danger' : 'warning';

    const now = new Date();
    const deadline = new Date(asg.batasWaktu);
    const isExpired = now > deadline;
    const countdown = this.getCountdownText(deadline);

    return `<div class="card assignment-item" data-id="${escapeHtml(asg.id)}" style="margin-bottom:var(--space-base);cursor:pointer">
      <div class="card-body" style="display:flex;align-items:center;gap:var(--space-base);flex-wrap:wrap">
        <div class="assignment-icon" style="width:40px;height:40px;border-radius:8px;background:var(--primary-light);display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <i class="ri-task-line" style="font-size:1.25rem;color:var(--primary)"></i>
        </div>
        <div class="assignment-info" style="flex:1;min-width:200px">
          <div class="assignment-title" style="font-weight:600">${escapeHtml(asg.judul)}</div>
          <div class="assignment-meta" style="font-size:var(--text-xs);color:var(--text-muted);margin-top:2px">
            <span><i class="ri-calendar-line"></i> Deadline: ${formatDate(asg.batasWaktu)}</span>
            ${!isExpired ? `<span style="margin-left:var(--space-sm);color:var(--warning-dark)"><i class="ri-time-line"></i> ${countdown}</span>` : ''}
          </div>
        </div>
        <div class="assignment-status">
          <span class="badge badge-${statusColor}">${status}</span>
        </div>
        <div class="assignment-arrow">
          <i class="ri-arrow-right-s-line" style="font-size:1.25rem;color:var(--text-light)"></i>
        </div>
      </div>
    </div>`;
  },

  /**
   * Get human-readable countdown text
   */
  getCountdownText(deadline) {
    const now = new Date();
    const diff = deadline.getTime() - now.getTime();
    if (diff <= 0) return 'Waktu habis';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days} hari ${hours} jam lagi`;
    if (hours > 0) return `${hours} jam ${minutes} menit lagi`;
    return `${minutes} menit lagi`;
  },

  /**
   * Bind siswa page events — click to view detail + submit form
   */
  bindSiswaEvents(session) {
    document.querySelectorAll('.assignment-item').forEach(item => {
      item.addEventListener('click', async () => {
        const asgId = item.dataset.id;
        const asg = this.assignments.find(a => a.id === asgId);
        if (!asg) return;

        const submission = await dataService.getStudentSubmission(asgId, session.userId);
        this.showAssignmentDetail(asg, submission, session);
      });
    });
  },

  /**
   * Show assignment detail panel with submit form for Siswa
   */
  showAssignmentDetail(asg, submission, session) {
    const detailPanel = document.getElementById('assignmentDetail');
    if (!detailPanel) return;

    const now = new Date();
    const deadline = new Date(asg.batasWaktu);
    const isExpired = now > deadline;
    const status = deriveSubmissionStatus(submission, asg.batasWaktu);
    const statusColor = status === 'Sudah Dikumpulkan' ? 'success'
      : status === 'Terlambat' ? 'danger' : 'warning';

    // Attachments section
    let attachmentsHtml = '';
    if (asg.attachments && asg.attachments.length > 0) {
      attachmentsHtml = `<div class="mb-base">
        <strong>Lampiran dari Guru:</strong>
        <div style="margin-top:var(--space-xs)">
          ${asg.attachments.map(att => `
            <div class="file-info-card" style="display:flex;align-items:center;gap:var(--space-sm);padding:var(--space-sm);background:var(--gray-50);border-radius:8px;margin-bottom:var(--space-xs)">
              <i class="ri-file-download-line" style="color:var(--primary)"></i>
              <span style="flex:1;font-size:var(--text-sm)">${escapeHtml(att.fileName)}</span>
              <button class="btn btn-sm btn-primary btn-download-att" data-filename="${escapeHtml(att.fileName)}" data-filedata="${att.fileData ? 'yes' : 'no'}">
                <i class="ri-download-line"></i>
              </button>
            </div>
          `).join('')}
        </div>
      </div>`;
    }

    // Submit form or submitted info
    let submitHtml = '';
    if (submission) {
      submitHtml = `<div class="card" style="background:var(--gray-50);border:1px solid var(--gray-200)">
        <div class="card-body">
          <h5 style="margin-bottom:var(--space-sm)"><i class="ri-checkbox-circle-line" style="color:var(--success)"></i> Jawaban Anda</h5>
          <p><strong>Status:</strong> <span class="badge badge-${statusColor}">${status}</span></p>
          <p><strong>Dikumpulkan:</strong> ${formatDate(submission.submittedAt)}</p>
          ${submission.tipe === 'TEKS' ? `<p><strong>Jawaban:</strong></p><div style="background:white;padding:var(--space-sm);border-radius:4px;border:1px solid var(--gray-200);margin-top:var(--space-xs)">${escapeHtml(submission.konten || '').replace(/\n/g, '<br>')}</div>` : ''}
          ${submission.tipe === 'FILE' ? `<p><strong>File:</strong> ${escapeHtml(submission.fileName || 'File terlampir')}</p>` : ''}
        </div>
      </div>`;
    } else if (isExpired) {
      submitHtml = `<div class="card" style="background:var(--danger-light);border:1px solid var(--danger)">
        <div class="card-body text-center">
          <i class="ri-time-line" style="font-size:2rem;color:var(--danger)"></i>
          <p style="color:var(--danger);font-weight:600;margin-top:var(--space-sm)">Batas waktu pengumpulan telah lewat</p>
        </div>
      </div>`;
    } else {
      submitHtml = this.renderSubmitForm(asg.id);
    }

    detailPanel.innerHTML = `
      <div class="card" style="margin-top:var(--space-lg)">
        <div class="card-header" style="display:flex;justify-content:space-between;align-items:center">
          <h4>${escapeHtml(asg.judul)}</h4>
          <button class="btn btn-sm btn-secondary" id="btnCloseDetail"><i class="ri-close-line"></i> Tutup</button>
        </div>
        <div class="card-body">
          ${asg.deskripsi ? `<div class="mb-base" style="white-space:pre-wrap">${escapeHtml(asg.deskripsi)}</div>` : ''}
          <div class="assignment-deadline-info mb-base" style="display:flex;gap:var(--space-base);flex-wrap:wrap;font-size:var(--text-sm)">
            <span><strong>Mulai:</strong> ${formatDate(asg.tanggalMulai)}</span>
            <span><strong>Deadline:</strong> ${formatDate(asg.batasWaktu)}</span>
            ${!isExpired ? `<span style="color:var(--warning-dark)"><i class="ri-time-line"></i> ${this.getCountdownText(deadline)}</span>` : ''}
          </div>
          ${attachmentsHtml}
          <hr style="margin:var(--space-base) 0">
          ${submitHtml}
        </div>
      </div>`;
    detailPanel.classList.remove('hidden');
    detailPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Close button
    document.getElementById('btnCloseDetail').addEventListener('click', () => {
      detailPanel.classList.add('hidden');
    });

    // Bind submit form events if present
    if (!submission && !isExpired) {
      this.bindSubmitFormEvents(asg.id, session);
    }

    // Bind download attachment buttons
    this.bindDownloadAttachments(asg);
  },

  /**
   * Render submit form for student
   */
  renderSubmitForm(assignmentId) {
    return `<div class="submit-section">
      <h5 style="margin-bottom:var(--space-sm)">Kumpulkan Jawaban</h5>
      <form id="submitForm" novalidate>
        <div class="form-group">
          <label class="form-label">Tipe Jawaban</label>
          <select class="form-select" id="submitTipe">
            <option value="TEKS">Teks Jawaban</option>
            <option value="FILE">Upload File</option>
          </select>
        </div>
        <div id="submitDynamic"></div>
        <div class="form-actions" style="margin-top:var(--space-base)">
          <button type="submit" class="btn btn-primary">
            <i class="ri-send-plane-line"></i> Kumpulkan
          </button>
        </div>
      </form>
    </div>`;
  },

  /**
   * Bind submit form events
   */
  bindSubmitFormEvents(assignmentId, session) {
    const tipeSelect = document.getElementById('submitTipe');
    const form = document.getElementById('submitForm');

    if (tipeSelect) {
      tipeSelect.addEventListener('change', () => {
        this.renderSubmitDynamic(tipeSelect.value);
      });
      // Render initial dynamic content
      this.renderSubmitDynamic(tipeSelect.value);
    }

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSubmitAnswer(assignmentId, session);
      });
    }
  },

  /**
   * Render dynamic submit fields based on type
   */
  renderSubmitDynamic(tipe) {
    const container = document.getElementById('submitDynamic');
    if (!container) return;

    if (tipe === 'TEKS') {
      container.innerHTML = `<div class="form-group">
        <label class="form-label" for="submitKonten">Jawaban <span class="required">*</span></label>
        <textarea class="form-textarea" id="submitKonten" rows="6" placeholder="Tulis jawaban Anda di sini..."></textarea>
      </div>`;
    } else {
      container.innerHTML = `<div class="form-group">
        <label class="form-label">Upload File Jawaban <span class="required">*</span></label>
        <div class="file-upload-zone" id="submitFileZone" role="button" tabindex="0">
          <i class="ri-upload-cloud-line"></i>
          <div class="file-upload-text"><strong>Klik atau seret file ke sini</strong></div>
          <div class="file-upload-hint">PDF, DOC, Gambar · Maks. 10MB</div>
          <input type="file" id="submitFileInput" hidden accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif">
        </div>
        <div id="submitFilePreview" class="hidden" style="margin-top:var(--space-sm)"></div>
        <div id="submitFileError" class="form-error hidden"></div>
      </div>`;

      // Bind file upload events
      const zone = document.getElementById('submitFileZone');
      const fileInput = document.getElementById('submitFileInput');
      if (zone && fileInput) {
        zone.addEventListener('click', () => fileInput.click());
        zone.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
        });
        fileInput.addEventListener('change', (e) => {
          if (e.target.files.length > 0) this.handleSubmitFileSelect(e.target.files[0]);
        });
        zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag-active'); });
        zone.addEventListener('dragleave', () => zone.classList.remove('drag-active'));
        zone.addEventListener('drop', (e) => {
          e.preventDefault();
          zone.classList.remove('drag-active');
          if (e.dataTransfer.files.length > 0) this.handleSubmitFileSelect(e.dataTransfer.files[0]);
        });
      }
    }
  },

  submitFile: null,

  /**
   * Handle file selection for student submission
   */
  handleSubmitFileSelect(file) {
    const errorEl = document.getElementById('submitFileError');
    errorEl.classList.add('hidden');

    if (file.size > MAX_FILE_SIZE) {
      errorEl.textContent = 'Ukuran file melebihi batas maksimal 10 MB';
      errorEl.classList.remove('hidden');
      return;
    }

    this.submitFile = file;
    const preview = document.getElementById('submitFilePreview');
    preview.innerHTML = `<div class="file-info-card" style="display:flex;align-items:center;gap:var(--space-sm);padding:var(--space-sm);background:var(--gray-50);border-radius:8px">
      <i class="ri-file-line" style="color:var(--primary)"></i>
      <span style="flex:1">${escapeHtml(file.name)}</span>
      <span class="text-muted" style="font-size:var(--text-xs)">${formatFileSize(file.size)}</span>
      <button type="button" class="btn btn-sm btn-danger-outline" id="btnRemoveSubmitFile" style="padding:2px 6px"><i class="ri-close-line"></i></button>
    </div>`;
    preview.classList.remove('hidden');

    document.getElementById('btnRemoveSubmitFile').addEventListener('click', () => {
      this.submitFile = null;
      preview.classList.add('hidden');
      preview.innerHTML = '';
    });
  },

  /**
   * Handle student answer submission
   */
  async handleSubmitAnswer(assignmentId, session) {
    const tipe = document.getElementById('submitTipe').value;

    let konten = null;
    let fileData = null;
    let fileName = null;
    let fileSize = null;

    if (tipe === 'TEKS') {
      konten = document.getElementById('submitKonten').value.trim();
      if (!konten) {
        showToast('Jawaban teks wajib diisi', 'error');
        return;
      }
    } else {
      if (!this.submitFile) {
        showToast('File jawaban wajib diupload', 'error');
        return;
      }
      fileData = await readFileAsBase64(this.submitFile);
      fileName = this.submitFile.name;
      fileSize = this.submitFile.size;
    }

    const data = { tipe, konten, fileData, fileName, fileSize };

    try {
      const result = await dataService.submitAssignment(assignmentId, session.userId, data);
      if (result && result.error) {
        showToast(result.error, 'error');
        return;
      }

      showToast('Tugas berhasil dikumpulkan!', 'success');
      this.submitFile = null;

      // Reload the page
      setTimeout(() => window.location.reload(), 800);
    } catch (err) {
      console.error('Error submitting assignment:', err);
      showToast('Gagal mengumpulkan tugas', 'error');
    }
  },

  /**
   * Bind download attachment buttons
   */
  bindDownloadAttachments(asg) {
    document.querySelectorAll('.btn-download-att').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const filename = btn.dataset.filename;
        const att = asg.attachments.find(a => a.fileName === filename);
        if (att && att.fileData) {
          const link = document.createElement('a');
          link.href = att.fileData;
          link.download = att.fileName || 'file';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else {
          showToast('File tidak tersedia', 'error');
        }
      });
    });
  }
};

// ==================== Helper Functions ====================

/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * Read a File object as base64 data URL
 * @param {File} file
 * @returns {Promise<string>} base64 data URL
 */
function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default TugasPage;
export { formatFileSize, readFileAsBase64 };
