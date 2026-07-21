/**
 * kuis.js — Page controller for Quiz management (Builder & Player)
 * Handles: Guru quiz builder, Siswa quiz player, auto-grading, timer
 * Used by: pages/guru/kuis-form.html, pages/siswa/kuis.html, kursus-detail.html (tab)
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8
 */

import Auth from '../auth.js';
import dataService from '../data-service.js';
import { showToast, showConfirm, showLoading, hideLoading, showModal, closeModal } from '../components.js';
import { escapeHtml, formatDate } from '../utils.js';

const KuisPage = {
  courseId: null,
  quizzes: [],
  currentQuiz: null,
  currentAttempt: null,
  questions: [],
  timerInterval: null,
  remainingSeconds: 0,
  currentQuestionIndex: 0,
  playerAnswers: [],

  // ==================== Guru: Quiz Tab in kursus-detail ====================

  /**
   * Render quiz list for Guru inside kursus-detail tab
   */
  async renderGuruTab(courseId, container) {
    this.courseId = courseId;
    this.quizzes = await dataService.getQuizzes(courseId);

    let html = `
      <div class="quiz-tab-header flex justify-between items-center mb-lg">
        <h4>Daftar Kuis</h4>
        <a href="/pages/guru/kuis-form.html?courseId=${escapeHtml(courseId)}" class="btn btn-primary">
          <i class="ri-add-line"></i> Buat Kuis
        </a>
      </div>`;

    if (this.quizzes.length === 0) {
      html += `<div class="empty-state text-center" style="padding:2rem">
        <i class="ri-questionnaire-line" style="font-size:3rem;color:var(--gray-300)"></i>
        <p style="margin-top:1rem;color:var(--text-muted)">Belum ada kuis. Klik "Buat Kuis" untuk memulai.</p>
      </div>`;
    } else {
      html += `<div class="quiz-list">`;
      for (const quiz of this.quizzes) {
        html += this._renderQuizItemGuru(quiz);
      }
      html += `</div>`;
    }

    container.innerHTML = html;
    this._bindGuruTabEvents(container);
  },

  /**
   * Render a single quiz item for Guru view
   */
  _renderQuizItemGuru(quiz) {
    const now = new Date();
    const start = new Date(quiz.tanggalMulai);
    const end = new Date(quiz.tanggalBerakhir);
    let statusBadge;
    if (now < start) {
      statusBadge = '<span class="badge badge-warning">Belum Mulai</span>';
    } else if (now > end) {
      statusBadge = '<span class="badge badge-gray">Selesai</span>';
    } else {
      statusBadge = '<span class="badge badge-success">Aktif</span>';
    }

    const soalCount = quiz.soal ? quiz.soal.length : 0;

    return `<div class="card quiz-item" data-id="${escapeHtml(quiz.id)}" style="margin-bottom:var(--space-base)">
      <div class="card-body" style="display:flex;align-items:center;gap:var(--space-base);flex-wrap:wrap">
        <div class="quiz-icon" style="width:40px;height:40px;border-radius:8px;background:var(--primary-light);display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <i class="ri-questionnaire-line" style="font-size:1.25rem;color:var(--primary)"></i>
        </div>
        <div class="quiz-info" style="flex:1;min-width:200px">
          <div class="quiz-title" style="font-weight:600">${escapeHtml(quiz.judul)}</div>
          <div class="quiz-meta" style="font-size:var(--text-xs);color:var(--text-muted);margin-top:2px">
            <span><i class="ri-time-line"></i> ${quiz.durasi} menit</span>
            <span style="margin-left:var(--space-sm)"><i class="ri-file-list-line"></i> ${soalCount} soal</span>
            <span style="margin-left:var(--space-sm)"><i class="ri-calendar-line"></i> ${formatDate(quiz.tanggalMulai, {hour:undefined,minute:undefined})} - ${formatDate(quiz.tanggalBerakhir, {hour:undefined,minute:undefined})}</span>
          </div>
        </div>
        <div class="quiz-status">${statusBadge}</div>
        <div class="quiz-actions" style="display:flex;gap:0.5rem">
          <button class="btn btn-sm btn-secondary btn-view-attempts" data-id="${escapeHtml(quiz.id)}" title="Lihat Hasil">
            <i class="ri-bar-chart-line"></i>
          </button>
        </div>
      </div>
    </div>`;
  },

  /**
   * Bind events for Guru quiz tab
   */
  _bindGuruTabEvents(container) {
    container.querySelectorAll('.btn-view-attempts').forEach(btn => {
      btn.addEventListener('click', async () => {
        const quizId = btn.dataset.id;
        await this._showAttemptsModal(quizId);
      });
    });
  },

  /**
   * Show modal with quiz attempt results
   */
  async _showAttemptsModal(quizId) {
    const quiz = this.quizzes.find(q => q.id === quizId);
    if (!quiz) return;

    const students = await dataService.getCourseStudents(this.courseId);
    let tableHtml = '';

    if (students.length === 0) {
      tableHtml = '<p class="text-muted">Belum ada siswa terdaftar di kursus ini.</p>';
    } else {
      tableHtml = `<div class="table-responsive"><table class="table">
        <thead><tr>
          <th>Nama Siswa</th><th>Status</th><th>Nilai PG</th><th>Waktu Selesai</th>
        </tr></thead><tbody>`;

      for (const student of students) {
        const attempt = await dataService.getQuizAttempt(quizId, student.id);
        let status, statusColor, nilai, waktu;
        if (!attempt) {
          status = 'Belum Dikerjakan';
          statusColor = 'warning';
          nilai = '-';
          waktu = '-';
        } else if (!attempt.finishedAt) {
          status = 'Sedang Mengerjakan';
          statusColor = 'primary';
          nilai = '-';
          waktu = '-';
        } else {
          status = 'Selesai';
          statusColor = 'success';
          nilai = attempt.nilaiOtomatis !== null ? attempt.nilaiOtomatis : '-';
          waktu = formatDate(attempt.finishedAt);
        }

        tableHtml += `<tr>
          <td>${escapeHtml(student.nama)}</td>
          <td><span class="badge badge-${statusColor}">${status}</span></td>
          <td>${nilai}</td>
          <td>${waktu}</td>
        </tr>`;
      }
      tableHtml += `</tbody></table></div>`;
    }

    showModal(`Hasil Kuis: ${quiz.judul}`, tableHtml, [
      { label: 'Tutup', type: 'secondary', handler: () => {} }
    ]);
  },

  // ==================== Guru: Quiz Builder Page ====================

  /**
   * Initialize the kuis-form page (builder)
   */
  async initBuilder() {
    const params = new URLSearchParams(window.location.search);
    this.courseId = params.get('courseId');

    if (!this.courseId) {
      window.location.href = '/pages/guru/kursus.html';
      return;
    }

    this.questions = [];
    this._renderBuilderForm();
    this._bindBuilderEvents();
  },

  /**
   * Render the quiz builder form
   */
  _renderBuilderForm() {
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
          <div class="card-header"><h3>Buat Kuis Baru</h3></div>
          <div class="card-body">
            <form id="kuisForm" novalidate>
              <div class="form-group">
                <label class="form-label" for="kuisJudul">Judul Kuis <span class="required">*</span></label>
                <input type="text" class="form-input" id="kuisJudul" name="judul" required placeholder="Masukkan judul kuis">
              </div>
              <div class="form-row" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--space-base)">
                <div class="form-group">
                  <label class="form-label" for="kuisDurasi">Durasi (menit) <span class="required">*</span></label>
                  <input type="number" class="form-input" id="kuisDurasi" name="durasi" min="1" value="30" required>
                </div>
                <div class="form-group">
                  <label class="form-label" for="kuisMulai">Tanggal Mulai <span class="required">*</span></label>
                  <input type="datetime-local" class="form-input" id="kuisMulai" name="tanggalMulai" value="${defaultStart}" required>
                </div>
                <div class="form-group">
                  <label class="form-label" for="kuisBerakhir">Tanggal Berakhir <span class="required">*</span></label>
                  <input type="datetime-local" class="form-input" id="kuisBerakhir" name="tanggalBerakhir" value="${defaultEnd}" required>
                </div>
              </div>
              <div class="form-group">
                <label class="form-check">
                  <input type="checkbox" id="kuisTampilkanJawaban" name="tampilkanJawaban">
                  <span>Tampilkan jawaban benar setelah kuis selesai</span>
                </label>
              </div>

              <hr style="margin:var(--space-lg) 0">
              <h4 style="margin-bottom:var(--space-base)">Soal-Soal</h4>

              <div id="questionList" class="question-list"></div>

              <div class="add-question-actions" style="display:flex;gap:0.5rem;margin-top:var(--space-base)">
                <button type="button" class="btn btn-secondary" id="btnAddPG">
                  <i class="ri-checkbox-circle-line"></i> Tambah Pilihan Ganda
                </button>
                <button type="button" class="btn btn-secondary" id="btnAddEsai">
                  <i class="ri-edit-line"></i> Tambah Esai
                </button>
              </div>

              <hr style="margin:var(--space-lg) 0">

              <div class="form-actions" style="display:flex;gap:0.5rem">
                <button type="button" class="btn btn-info" id="btnPreview">
                  <i class="ri-eye-line"></i> Preview
                </button>
                <button type="submit" class="btn btn-primary">
                  <i class="ri-save-line"></i> Simpan Kuis
                </button>
                <a href="/pages/guru/kursus-detail.html?id=${escapeHtml(this.courseId)}" class="btn btn-secondary">Batal</a>
              </div>
            </form>
          </div>
        </div>
      </div>`;
  },

  /**
   * Bind builder form events
   */
  _bindBuilderEvents() {
    const form = document.getElementById('kuisForm');
    const btnAddPG = document.getElementById('btnAddPG');
    const btnAddEsai = document.getElementById('btnAddEsai');
    const btnPreview = document.getElementById('btnPreview');

    if (btnAddPG) {
      btnAddPG.addEventListener('click', () => this._addQuestion('PILIHAN_GANDA'));
    }
    if (btnAddEsai) {
      btnAddEsai.addEventListener('click', () => this._addQuestion('ESAI'));
    }
    if (btnPreview) {
      btnPreview.addEventListener('click', () => this._showPreview());
    }
    if (form) {
      form.addEventListener('submit', (e) => { e.preventDefault(); this._handleSaveQuiz(); });
    }
  },

  /**
   * Add a question to the builder
   */
  _addQuestion(tipe) {
    const idx = this.questions.length;
    this.questions.push({
      tipe,
      pertanyaan: '',
      opsi: tipe === 'PILIHAN_GANDA' ? ['', '', '', ''] : null,
      jawabanBenar: tipe === 'PILIHAN_GANDA' ? 0 : null,
      bobot: 1
    });
    this._renderQuestionList();
  },

  /**
   * Render all questions in the builder
   */
  _renderQuestionList() {
    const container = document.getElementById('questionList');
    if (!container) return;

    if (this.questions.length === 0) {
      container.innerHTML = `<div class="empty-state text-center" style="padding:1.5rem;background:var(--gray-50);border-radius:8px">
        <p style="color:var(--text-muted)">Belum ada soal. Tambahkan soal menggunakan tombol di bawah.</p>
      </div>`;
      return;
    }

    container.innerHTML = this.questions.map((q, idx) => this._renderQuestionCard(q, idx)).join('');
    this._bindQuestionEvents();
  },

  /**
   * Render a single question card in the builder
   */
  _renderQuestionCard(q, idx) {
    const tipeLabel = q.tipe === 'PILIHAN_GANDA' ? 'Pilihan Ganda' : 'Esai';
    const tipeIcon = q.tipe === 'PILIHAN_GANDA' ? 'ri-checkbox-circle-line' : 'ri-edit-line';

    let opsiHtml = '';
    if (q.tipe === 'PILIHAN_GANDA') {
      opsiHtml = `<div class="question-options" style="margin-top:var(--space-sm)">
        ${q.opsi.map((opt, oi) => `
          <div class="form-group" style="display:flex;align-items:center;gap:var(--space-sm);margin-bottom:var(--space-xs)">
            <input type="radio" name="correctAnswer_${idx}" value="${oi}" ${q.jawabanBenar === oi ? 'checked' : ''} class="radio-correct" data-qidx="${idx}" data-oidx="${oi}">
            <label style="font-size:var(--text-sm);min-width:20px">${String.fromCharCode(65 + oi)}.</label>
            <input type="text" class="form-input form-input-sm option-input" data-qidx="${idx}" data-oidx="${oi}" value="${escapeHtml(opt)}" placeholder="Opsi ${String.fromCharCode(65 + oi)}">
          </div>
        `).join('')}
        <p class="form-hint" style="font-size:var(--text-xs);color:var(--text-muted)"><i class="ri-information-line"></i> Pilih radio untuk menandai jawaban benar</p>
      </div>`;
    }

    return `<div class="card question-card" data-idx="${idx}" style="margin-bottom:var(--space-base);border-left:3px solid ${q.tipe === 'PILIHAN_GANDA' ? 'var(--primary)' : 'var(--info)'}">
      <div class="card-body">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-sm)">
          <span class="badge badge-${q.tipe === 'PILIHAN_GANDA' ? 'primary' : 'info'}">
            <i class="${tipeIcon}"></i> Soal ${idx + 1} — ${tipeLabel}
          </span>
          <div style="display:flex;gap:0.5rem;align-items:center">
            <label style="font-size:var(--text-xs)">Bobot:</label>
            <input type="number" class="form-input form-input-sm bobot-input" data-qidx="${idx}" value="${q.bobot}" min="1" style="width:60px">
            <button type="button" class="btn btn-sm btn-danger-outline btn-remove-q" data-qidx="${idx}" title="Hapus soal">
              <i class="ri-delete-bin-line"></i>
            </button>
          </div>
        </div>
        <div class="form-group">
          <textarea class="form-textarea question-text" data-qidx="${idx}" rows="2" placeholder="Tulis pertanyaan...">${escapeHtml(q.pertanyaan)}</textarea>
        </div>
        ${opsiHtml}
      </div>
    </div>`;
  },

  /**
   * Bind events for question editing
   */
  _bindQuestionEvents() {
    // Question text change
    document.querySelectorAll('.question-text').forEach(el => {
      el.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.qidx);
        this.questions[idx].pertanyaan = e.target.value;
      });
    });

    // Option text change
    document.querySelectorAll('.option-input').forEach(el => {
      el.addEventListener('input', (e) => {
        const qidx = parseInt(e.target.dataset.qidx);
        const oidx = parseInt(e.target.dataset.oidx);
        this.questions[qidx].opsi[oidx] = e.target.value;
      });
    });

    // Correct answer radio
    document.querySelectorAll('.radio-correct').forEach(el => {
      el.addEventListener('change', (e) => {
        const qidx = parseInt(e.target.dataset.qidx);
        const oidx = parseInt(e.target.dataset.oidx);
        this.questions[qidx].jawabanBenar = oidx;
      });
    });

    // Bobot change
    document.querySelectorAll('.bobot-input').forEach(el => {
      el.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.qidx);
        this.questions[idx].bobot = parseInt(e.target.value) || 1;
      });
    });

    // Remove question
    document.querySelectorAll('.btn-remove-q').forEach(el => {
      el.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.qidx);
        this.questions.splice(idx, 1);
        this._renderQuestionList();
      });
    });
  },

  /**
   * Show preview modal of questions
   */
  _showPreview() {
    if (this.questions.length === 0) {
      showToast('Belum ada soal untuk di-preview', 'error');
      return;
    }

    let html = '<div class="quiz-preview">';
    this.questions.forEach((q, idx) => {
      html += `<div style="margin-bottom:var(--space-base);padding:var(--space-base);background:var(--gray-50);border-radius:8px">
        <p style="font-weight:600;margin-bottom:var(--space-xs)">Soal ${idx + 1} (${q.tipe === 'PILIHAN_GANDA' ? 'PG' : 'Esai'}, bobot: ${q.bobot})</p>
        <p>${escapeHtml(q.pertanyaan) || '<em>Pertanyaan kosong</em>'}</p>`;

      if (q.tipe === 'PILIHAN_GANDA' && q.opsi) {
        html += '<div style="margin-top:var(--space-xs);padding-left:1rem">';
        q.opsi.forEach((opt, oi) => {
          const isCorrect = q.jawabanBenar === oi;
          html += `<p style="${isCorrect ? 'font-weight:600;color:var(--success)' : ''}">${String.fromCharCode(65 + oi)}. ${escapeHtml(opt) || '<em>kosong</em>'} ${isCorrect ? '✓' : ''}</p>`;
        });
        html += '</div>';
      }
      html += '</div>';
    });
    html += '</div>';

    showModal('Preview Kuis', html, [
      { label: 'Tutup', type: 'secondary', handler: () => {} }
    ]);
  },

  /**
   * Handle save quiz form submission
   */
  async _handleSaveQuiz() {
    const judul = document.getElementById('kuisJudul').value.trim();
    const durasi = parseInt(document.getElementById('kuisDurasi').value);
    const tanggalMulai = document.getElementById('kuisMulai').value;
    const tanggalBerakhir = document.getElementById('kuisBerakhir').value;
    const tampilkanJawaban = document.getElementById('kuisTampilkanJawaban').checked;

    // Validation
    if (!judul) { showToast('Judul kuis wajib diisi', 'error'); return; }
    if (!durasi || durasi <= 0) { showToast('Durasi harus positif', 'error'); return; }
    if (!tanggalMulai) { showToast('Tanggal mulai wajib diisi', 'error'); return; }
    if (!tanggalBerakhir) { showToast('Tanggal berakhir wajib diisi', 'error'); return; }
    if (new Date(tanggalBerakhir) <= new Date(tanggalMulai)) {
      showToast('Tanggal berakhir harus setelah tanggal mulai', 'error'); return;
    }
    if (this.questions.length === 0) {
      showToast('Kuis harus memiliki minimal 1 soal', 'error'); return;
    }

    // Validate questions
    for (let i = 0; i < this.questions.length; i++) {
      const q = this.questions[i];
      if (!q.pertanyaan.trim()) {
        showToast(`Soal #${i + 1}: pertanyaan wajib diisi`, 'error'); return;
      }
      if (q.tipe === 'PILIHAN_GANDA') {
        for (let j = 0; j < q.opsi.length; j++) {
          if (!q.opsi[j].trim()) {
            showToast(`Soal #${i + 1}: opsi ${String.fromCharCode(65 + j)} wajib diisi`, 'error'); return;
          }
        }
      }
    }

    const data = {
      courseId: this.courseId,
      judul,
      durasi,
      tanggalMulai: new Date(tanggalMulai).toISOString(),
      tanggalBerakhir: new Date(tanggalBerakhir).toISOString(),
      tampilkanJawaban,
      soal: this.questions.map((q, idx) => ({
        tipe: q.tipe,
        pertanyaan: q.pertanyaan,
        opsi: q.opsi,
        jawabanBenar: q.jawabanBenar,
        bobot: q.bobot || 1,
        urutan: idx + 1
      }))
    };

    try {
      const result = await dataService.createQuiz(data);
      if (result && result.error) {
        showToast(result.error, 'error');
        return;
      }

      showToast('Kuis berhasil dibuat', 'success');

      // Notify enrolled students
      await this._notifyStudentsNewQuiz(result);

      setTimeout(() => {
        window.location.href = `/pages/guru/kursus-detail.html?id=${this.courseId}`;
      }, 500);
    } catch (err) {
      console.error('Error saving quiz:', err);
      showToast('Gagal menyimpan kuis', 'error');
    }
  },

  /**
   * Notify enrolled students about new quiz
   */
  async _notifyStudentsNewQuiz(quiz) {
    try {
      const students = await dataService.getCourseStudents(this.courseId);
      const course = await dataService.getCourseById(this.courseId);
      for (const student of students) {
        await dataService.createNotification({
          userId: student.id,
          tipe: 'KUIS_BARU',
          pesan: `Kuis baru "${quiz.judul}" di kursus ${course.nama}`,
          link: `/pages/siswa/kuis.html?courseId=${this.courseId}&quizId=${quiz.id}`
        });
      }
    } catch (err) {
      console.error('Error notifying students:', err);
    }
  },

  // ==================== Siswa: Quiz Player Page ====================

  /**
   * Initialize the siswa kuis page (player)
   */
  async initPlayer() {
    const params = new URLSearchParams(window.location.search);
    this.courseId = params.get('courseId');
    const quizId = params.get('quizId');

    const session = Auth.checkSession();
    if (!session) return;

    if (!this.courseId) {
      window.location.href = '/pages/siswa/kursus.html';
      return;
    }

    const mainContent = document.getElementById('mainContent');
    const course = await dataService.getCourseById(this.courseId);

    if (!course) {
      mainContent.innerHTML = `<div class="empty-state text-center" style="padding:3rem">
        <i class="ri-error-warning-line empty-state-icon"></i>
        <h3>Kursus tidak ditemukan</h3>
        <a href="/pages/siswa/kursus.html" class="btn btn-primary">Kembali</a>
      </div>`;
      return;
    }

    // If quizId is provided, go directly to that quiz
    if (quizId) {
      const quiz = await dataService.getQuizById(quizId);
      if (quiz) {
        const attempt = await dataService.getQuizAttempt(quizId, session.userId);
        if (attempt && attempt.finishedAt) {
          // Already completed, show result
          this._showResult(quiz, attempt, mainContent);
          return;
        } else if (attempt && !attempt.finishedAt) {
          // Resume attempt
          this._startPlaying(quiz, attempt, mainContent);
          return;
        } else {
          // Show quiz info before starting
          this._showQuizInfo(quiz, course, session, mainContent);
          return;
        }
      }
    }

    // Show list of available quizzes for this course
    await this._renderSiswaQuizList(course, session, mainContent);
  },

  /**
   * Render list of quizzes for Siswa
   */
  async _renderSiswaQuizList(course, session, mainContent) {
    const quizzes = await dataService.getQuizzes(this.courseId);
    const now = new Date();

    let html = `
      <div class="page-header">
        <a href="/pages/siswa/kursus.html" class="btn-back"><i class="ri-arrow-left-line"></i> Kembali</a>
        <h2 class="page-title">${escapeHtml(course.nama)}</h2>
        <p class="page-subtitle">Daftar Kuis</p>
      </div>`;

    const visibleQuizzes = quizzes.filter(q => now >= new Date(q.tanggalMulai));

    if (visibleQuizzes.length === 0) {
      html += `<div class="empty-state text-center" style="padding:3rem">
        <i class="ri-questionnaire-line" style="font-size:3rem;color:var(--gray-300)"></i>
        <p style="margin-top:1rem;color:var(--text-muted)">Belum ada kuis tersedia untuk kursus ini.</p>
      </div>`;
    } else {
      html += `<div class="quiz-list">`;
      for (const quiz of visibleQuizzes) {
        const attempt = await dataService.getQuizAttempt(quiz.id, session.userId);
        html += this._renderQuizItemSiswa(quiz, attempt);
      }
      html += `</div>`;
    }

    mainContent.innerHTML = html;
    this._bindSiswaQuizListEvents(course, session, mainContent);
  },

  /**
   * Render a quiz item for Siswa
   */
  _renderQuizItemSiswa(quiz, attempt) {
    const now = new Date();
    const end = new Date(quiz.tanggalBerakhir);
    const isExpired = now > end;

    let statusBadge, actionText;
    if (attempt && attempt.finishedAt) {
      statusBadge = '<span class="badge badge-success">Selesai</span>';
      actionText = 'Lihat Hasil';
    } else if (attempt && !attempt.finishedAt) {
      statusBadge = '<span class="badge badge-warning">Sedang Dikerjakan</span>';
      actionText = 'Lanjutkan';
    } else if (isExpired) {
      statusBadge = '<span class="badge badge-gray">Kedaluwarsa</span>';
      actionText = '';
    } else {
      statusBadge = '<span class="badge badge-primary">Tersedia</span>';
      actionText = 'Kerjakan';
    }

    return `<div class="card quiz-item-siswa" data-quiz-id="${escapeHtml(quiz.id)}" style="margin-bottom:var(--space-base);cursor:pointer">
      <div class="card-body" style="display:flex;align-items:center;gap:var(--space-base);flex-wrap:wrap">
        <div style="width:40px;height:40px;border-radius:8px;background:var(--primary-light);display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <i class="ri-questionnaire-line" style="font-size:1.25rem;color:var(--primary)"></i>
        </div>
        <div style="flex:1;min-width:200px">
          <div style="font-weight:600">${escapeHtml(quiz.judul)}</div>
          <div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:2px">
            <span><i class="ri-time-line"></i> ${quiz.durasi} menit</span>
            <span style="margin-left:var(--space-sm)"><i class="ri-file-list-line"></i> ${quiz.soal ? quiz.soal.length : 0} soal</span>
            <span style="margin-left:var(--space-sm)"><i class="ri-calendar-line"></i> s.d. ${formatDate(quiz.tanggalBerakhir, {hour:undefined,minute:undefined})}</span>
          </div>
        </div>
        <div>${statusBadge}</div>
        ${actionText ? `<div><span class="btn btn-sm btn-primary">${actionText} <i class="ri-arrow-right-s-line"></i></span></div>` : ''}
      </div>
    </div>`;
  },

  /**
   * Bind click events on siswa quiz list
   */
  _bindSiswaQuizListEvents(course, session, mainContent) {
    document.querySelectorAll('.quiz-item-siswa').forEach(item => {
      item.addEventListener('click', async () => {
        const quizId = item.dataset.quizId;
        const quiz = (await dataService.getQuizzes(this.courseId)).find(q => q.id === quizId);
        if (!quiz) return;

        const attempt = await dataService.getQuizAttempt(quizId, session.userId);
        if (attempt && attempt.finishedAt) {
          this._showResult(quiz, attempt, mainContent);
        } else if (attempt && !attempt.finishedAt) {
          this._startPlaying(quiz, attempt, mainContent);
        } else {
          const now = new Date();
          const end = new Date(quiz.tanggalBerakhir);
          if (now > end) {
            showToast('Kuis sudah melewati tanggal berakhir', 'error');
            return;
          }
          this._showQuizInfo(quiz, course, session, mainContent);
        }
      });
    });
  },

  /**
   * Show quiz info before starting
   */
  _showQuizInfo(quiz, course, session, mainContent) {
    const soalCount = quiz.soal ? quiz.soal.length : 0;
    mainContent.innerHTML = `
      <div class="page-header">
        <button class="btn-back btn-back-quiz-list"><i class="ri-arrow-left-line"></i> Kembali ke Daftar Kuis</button>
      </div>
      <div class="card" style="max-width:600px;margin:0 auto">
        <div class="card-body text-center" style="padding:var(--space-xl)">
          <i class="ri-questionnaire-line" style="font-size:3rem;color:var(--primary)"></i>
          <h3 style="margin-top:var(--space-base)">${escapeHtml(quiz.judul)}</h3>
          <div style="margin-top:var(--space-base);font-size:var(--text-sm);color:var(--text-muted)">
            <p><i class="ri-time-line"></i> Durasi: <strong>${quiz.durasi} menit</strong></p>
            <p><i class="ri-file-list-line"></i> Jumlah Soal: <strong>${soalCount}</strong></p>
            <p><i class="ri-calendar-line"></i> Berlaku s.d. ${formatDate(quiz.tanggalBerakhir)}</p>
          </div>
          <div style="margin-top:var(--space-lg);padding:var(--space-base);background:var(--warning-light);border-radius:8px;text-align:left">
            <p style="font-weight:600;color:var(--warning-dark)"><i class="ri-alert-line"></i> Perhatian:</p>
            <ul style="margin-top:var(--space-xs);font-size:var(--text-sm);padding-left:1.5rem">
              <li>Setelah dimulai, timer akan berjalan dan tidak dapat dihentikan</li>
              <li>Jika waktu habis, jawaban akan otomatis dikumpulkan</li>
              <li>Kuis hanya bisa dikerjakan <strong>1 kali</strong></li>
            </ul>
          </div>
          <button class="btn btn-primary btn-lg" id="btnStartQuiz" style="margin-top:var(--space-lg)">
            <i class="ri-play-line"></i> Mulai Kuis
          </button>
        </div>
      </div>`;

    document.querySelector('.btn-back-quiz-list').addEventListener('click', async () => {
      await this._renderSiswaQuizList(course, session, mainContent);
    });

    document.getElementById('btnStartQuiz').addEventListener('click', async () => {
      const attempt = await dataService.startQuizAttempt(quiz.id, session.userId);
      this._startPlaying(quiz, attempt, mainContent);
    });
  },

  /**
   * Start playing the quiz — render player UI with timer
   */
  _startPlaying(quiz, attempt, mainContent) {
    this.currentQuiz = quiz;
    this.currentAttempt = attempt;
    this.currentQuestionIndex = 0;

    // Initialize answers from existing attempt data or empty
    this.playerAnswers = quiz.soal.map(q => {
      const existing = attempt.jawaban ? attempt.jawaban.find(a => a.soalId === q.id) : null;
      return {
        soalId: q.id,
        jawaban: existing ? existing.jawaban : null
      };
    });

    // Calculate remaining time
    const startedAt = new Date(attempt.startedAt);
    const elapsed = (Date.now() - startedAt.getTime()) / 1000;
    this.remainingSeconds = Math.max(0, (quiz.durasi * 60) - Math.floor(elapsed));

    // If time already expired, auto-submit
    if (this.remainingSeconds <= 0) {
      this._autoSubmit(mainContent);
      return;
    }

    this._renderPlayer(mainContent);
    this._startTimer(mainContent);
  },

  /**
   * Render the quiz player UI
   */
  _renderPlayer(mainContent) {
    const quiz = this.currentQuiz;
    const soalCount = quiz.soal.length;

    // Navigation pills
    let navPills = '<div class="quiz-nav-pills" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:var(--space-base)">';
    quiz.soal.forEach((q, idx) => {
      const isActive = idx === this.currentQuestionIndex;
      const isAnswered = this.playerAnswers[idx] && this.playerAnswers[idx].jawaban !== null;
      let pillClass = 'btn btn-sm';
      if (isActive) pillClass += ' btn-primary';
      else if (isAnswered) pillClass += ' btn-success';
      else pillClass += ' btn-secondary';
      navPills += `<button class="${pillClass} quiz-nav-pill" data-idx="${idx}" style="min-width:36px">${idx + 1}</button>`;
    });
    navPills += '</div>';

    // Current question
    const currentQ = quiz.soal[this.currentQuestionIndex];
    const currentAnswer = this.playerAnswers[this.currentQuestionIndex];
    let questionHtml = this._renderPlayerQuestion(currentQ, this.currentQuestionIndex, currentAnswer);

    mainContent.innerHTML = `
      <div class="quiz-player">
        <div class="quiz-player-header card" style="position:sticky;top:0;z-index:10;margin-bottom:var(--space-base)">
          <div class="card-body" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:var(--space-sm)">
            <h4 style="margin:0">${escapeHtml(quiz.judul)}</h4>
            <div class="quiz-timer" id="quizTimer" style="font-size:var(--text-lg);font-weight:700;color:var(--danger);display:flex;align-items:center;gap:var(--space-xs)">
              <i class="ri-time-line"></i>
              <span id="timerDisplay">${this._formatTime(this.remainingSeconds)}</span>
            </div>
          </div>
        </div>

        ${navPills}

        <div class="quiz-question-area" id="questionArea">
          ${questionHtml}
        </div>

        <div class="quiz-player-footer" style="display:flex;justify-content:space-between;margin-top:var(--space-lg)">
          <button class="btn btn-secondary" id="btnPrevQ" ${this.currentQuestionIndex === 0 ? 'disabled' : ''}>
            <i class="ri-arrow-left-line"></i> Sebelumnya
          </button>
          <button class="btn btn-danger" id="btnSubmitQuiz">
            <i class="ri-check-double-line"></i> Selesai & Kumpulkan
          </button>
          <button class="btn btn-secondary" id="btnNextQ" ${this.currentQuestionIndex === soalCount - 1 ? 'disabled' : ''}>
            Selanjutnya <i class="ri-arrow-right-line"></i>
          </button>
        </div>
      </div>`;

    this._bindPlayerEvents(mainContent);
  },

  /**
   * Render a single question in player mode
   */
  _renderPlayerQuestion(question, idx, answer) {
    let html = `<div class="card">
      <div class="card-body">
        <div style="display:flex;justify-content:space-between;margin-bottom:var(--space-sm)">
          <span class="badge badge-${question.tipe === 'PILIHAN_GANDA' ? 'primary' : 'info'}">
            Soal ${idx + 1} / ${this.currentQuiz.soal.length}
          </span>
          <span style="font-size:var(--text-xs);color:var(--text-muted)">Bobot: ${question.bobot}</span>
        </div>
        <p style="font-size:var(--text-base);margin-bottom:var(--space-base);white-space:pre-wrap">${escapeHtml(question.pertanyaan)}</p>`;

    if (question.tipe === 'PILIHAN_GANDA') {
      html += '<div class="quiz-options">';
      question.opsi.forEach((opt, oi) => {
        const isSelected = answer && answer.jawaban === oi;
        const selectedClass = isSelected ? 'quiz-option-selected' : '';
        html += `<div class="quiz-option ${selectedClass}" data-oidx="${oi}" style="padding:var(--space-sm) var(--space-base);border:2px solid ${isSelected ? 'var(--primary)' : 'var(--gray-200)'};border-radius:8px;margin-bottom:var(--space-xs);cursor:pointer;transition:all 0.2s;background:${isSelected ? 'var(--primary-light)' : 'white'}">
          <label style="display:flex;align-items:center;gap:var(--space-sm);cursor:pointer">
            <input type="radio" name="playerAnswer" value="${oi}" ${isSelected ? 'checked' : ''} style="accent-color:var(--primary)">
            <span><strong>${String.fromCharCode(65 + oi)}.</strong> ${escapeHtml(opt)}</span>
          </label>
        </div>`;
      });
      html += '</div>';
    } else {
      // Esai
      const existingText = answer && answer.jawaban !== null ? answer.jawaban : '';
      html += `<div class="form-group">
        <textarea class="form-textarea" id="esaiAnswer" rows="6" placeholder="Tulis jawaban Anda di sini...">${escapeHtml(existingText)}</textarea>
      </div>`;
    }

    html += '</div></div>';
    return html;
  },

  /**
   * Bind player UI events
   */
  _bindPlayerEvents(mainContent) {
    // Nav pills
    document.querySelectorAll('.quiz-nav-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        this._saveCurrentAnswer();
        this.currentQuestionIndex = parseInt(pill.dataset.idx);
        this._renderPlayer(mainContent);
      });
    });

    // Prev/Next
    const btnPrev = document.getElementById('btnPrevQ');
    const btnNext = document.getElementById('btnNextQ');

    if (btnPrev) {
      btnPrev.addEventListener('click', () => {
        this._saveCurrentAnswer();
        this.currentQuestionIndex = Math.max(0, this.currentQuestionIndex - 1);
        this._renderPlayer(mainContent);
      });
    }
    if (btnNext) {
      btnNext.addEventListener('click', () => {
        this._saveCurrentAnswer();
        this.currentQuestionIndex = Math.min(this.currentQuiz.soal.length - 1, this.currentQuestionIndex + 1);
        this._renderPlayer(mainContent);
      });
    }

    // Option click (PG)
    document.querySelectorAll('.quiz-option').forEach(opt => {
      opt.addEventListener('click', () => {
        const oidx = parseInt(opt.dataset.oidx);
        this.playerAnswers[this.currentQuestionIndex].jawaban = oidx;
        // Update radio
        const radio = opt.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
        // Update visual
        document.querySelectorAll('.quiz-option').forEach(o => {
          o.classList.remove('quiz-option-selected');
          o.style.borderColor = 'var(--gray-200)';
          o.style.background = 'white';
        });
        opt.classList.add('quiz-option-selected');
        opt.style.borderColor = 'var(--primary)';
        opt.style.background = 'var(--primary-light)';
      });
    });

    // Submit quiz
    const btnSubmit = document.getElementById('btnSubmitQuiz');
    if (btnSubmit) {
      btnSubmit.addEventListener('click', async () => {
        const unanswered = this.playerAnswers.filter(a => a.jawaban === null).length;
        let msg = 'Yakin ingin mengumpulkan kuis?';
        if (unanswered > 0) {
          msg = `Masih ada ${unanswered} soal belum dijawab. Yakin ingin mengumpulkan?`;
        }
        const confirmed = await showConfirm(msg);
        if (confirmed) {
          this._saveCurrentAnswer();
          await this._submitQuiz(mainContent);
        }
      });
    }
  },

  /**
   * Save current question answer to playerAnswers
   */
  _saveCurrentAnswer() {
    const currentQ = this.currentQuiz.soal[this.currentQuestionIndex];
    if (currentQ.tipe === 'ESAI') {
      const textarea = document.getElementById('esaiAnswer');
      if (textarea) {
        const val = textarea.value.trim();
        this.playerAnswers[this.currentQuestionIndex].jawaban = val || null;
      }
    }
    // PG is already saved on click
  },

  /**
   * Start the countdown timer
   */
  _startTimer(mainContent) {
    if (this.timerInterval) clearInterval(this.timerInterval);

    this.timerInterval = setInterval(() => {
      this.remainingSeconds--;
      const timerDisplay = document.getElementById('timerDisplay');
      if (timerDisplay) {
        timerDisplay.textContent = this._formatTime(this.remainingSeconds);
        // Flash red when < 60 seconds
        if (this.remainingSeconds <= 60) {
          timerDisplay.parentElement.style.animation = 'pulse 1s infinite';
        }
      }

      if (this.remainingSeconds <= 0) {
        this._autoSubmit(mainContent);
      }
    }, 1000);
  },

  /**
   * Auto-submit when timer expires
   */
  async _autoSubmit(mainContent) {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    this._saveCurrentAnswer();
    showToast('Waktu habis! Jawaban dikumpulkan secara otomatis.', 'warning');
    await this._submitQuiz(mainContent);
  },

  /**
   * Submit quiz answers
   */
  async _submitQuiz(mainContent) {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    try {
      const result = await dataService.submitQuizAttempt(
        this.currentAttempt.id,
        this.playerAnswers
      );

      if (!result) {
        showToast('Gagal mengumpulkan kuis', 'error');
        return;
      }

      this.currentAttempt = result;
      this._showResult(this.currentQuiz, result, mainContent);
    } catch (err) {
      console.error('Error submitting quiz:', err);
      showToast('Gagal mengumpulkan kuis', 'error');
    }
  },

  /**
   * Show quiz result after submission
   */
  _showResult(quiz, attempt, mainContent) {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    const soal = quiz.soal || [];
    const answers = attempt.jawaban || [];
    const pgQuestions = soal.filter(s => s.tipe === 'PILIHAN_GANDA');
    const esaiQuestions = soal.filter(s => s.tipe === 'ESAI');

    // Count correct PG
    let correctCount = 0;
    for (const q of pgQuestions) {
      const a = answers.find(ans => ans.soalId === q.id);
      if (a && a.jawaban === q.jawabanBenar) correctCount++;
    }

    let html = `
      <div class="quiz-result" style="max-width:700px;margin:0 auto">
        <div class="card text-center" style="margin-bottom:var(--space-lg)">
          <div class="card-body" style="padding:var(--space-xl)">
            <i class="ri-checkbox-circle-line" style="font-size:3rem;color:var(--success)"></i>
            <h3 style="margin-top:var(--space-base)">Kuis Selesai!</h3>
            <p style="color:var(--text-muted)">${escapeHtml(quiz.judul)}</p>

            <div style="margin-top:var(--space-lg);display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:var(--space-base)">
              ${pgQuestions.length > 0 ? `
              <div style="padding:var(--space-base);background:var(--gray-50);border-radius:8px">
                <div style="font-size:var(--text-xs);color:var(--text-muted)">Nilai Pilihan Ganda</div>
                <div style="font-size:1.5rem;font-weight:700;color:var(--primary)">${attempt.nilaiOtomatis !== null ? attempt.nilaiOtomatis : '-'}</div>
              </div>
              <div style="padding:var(--space-base);background:var(--gray-50);border-radius:8px">
                <div style="font-size:var(--text-xs);color:var(--text-muted)">Benar / Total PG</div>
                <div style="font-size:1.5rem;font-weight:700">${correctCount} / ${pgQuestions.length}</div>
              </div>` : ''}
              ${esaiQuestions.length > 0 ? `
              <div style="padding:var(--space-base);background:var(--warning-light);border-radius:8px">
                <div style="font-size:var(--text-xs);color:var(--text-muted)">Soal Esai</div>
                <div style="font-size:var(--text-sm);font-weight:600;color:var(--warning-dark)">Menunggu penilaian Guru</div>
              </div>` : ''}
            </div>
          </div>
        </div>`;

    // Show answers if quiz allows
    if (quiz.tampilkanJawaban) {
      html += `<div class="card"><div class="card-header"><h4>Pembahasan Jawaban</h4></div><div class="card-body">`;
      soal.forEach((q, idx) => {
        const a = answers.find(ans => ans.soalId === q.id);
        html += `<div style="margin-bottom:var(--space-base);padding-bottom:var(--space-base);border-bottom:1px solid var(--gray-100)">
          <p style="font-weight:600">Soal ${idx + 1}: ${escapeHtml(q.pertanyaan)}</p>`;

        if (q.tipe === 'PILIHAN_GANDA') {
          const isCorrect = a && a.jawaban === q.jawabanBenar;
          html += '<div style="margin-top:var(--space-xs);padding-left:1rem">';
          q.opsi.forEach((opt, oi) => {
            let style = '';
            if (oi === q.jawabanBenar) style = 'color:var(--success);font-weight:600';
            else if (a && a.jawaban === oi && oi !== q.jawabanBenar) style = 'color:var(--danger);text-decoration:line-through';
            html += `<p style="${style}">${String.fromCharCode(65 + oi)}. ${escapeHtml(opt)} ${oi === q.jawabanBenar ? '✓' : ''}</p>`;
          });
          html += `<p style="margin-top:4px;font-size:var(--text-xs);color:${isCorrect ? 'var(--success)' : 'var(--danger)'}"><strong>${isCorrect ? '✓ Benar' : '✗ Salah'}</strong></p>`;
          html += '</div>';
        } else {
          const jawabanSiswa = a ? a.jawaban : null;
          html += `<p style="margin-top:var(--space-xs);font-style:italic;color:var(--text-muted)">Jawaban Anda: ${jawabanSiswa ? escapeHtml(jawabanSiswa) : '<em>Tidak dijawab</em>'}</p>`;
        }
        html += '</div>';
      });
      html += '</div></div>';
    }

    html += `<div style="text-align:center;margin-top:var(--space-lg)">
      <a href="/pages/siswa/kursus.html" class="btn btn-primary">
        <i class="ri-arrow-left-line"></i> Kembali ke Kursus
      </a>
    </div></div>`;

    mainContent.innerHTML = html;
  },

  // ==================== Helper Methods ====================

  /**
   * Format seconds into MM:SS display
   */
  _formatTime(seconds) {
    if (seconds <= 0) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
};

export default KuisPage;
