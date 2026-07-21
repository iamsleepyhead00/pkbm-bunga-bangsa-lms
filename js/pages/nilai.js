/**
 * nilai.js - Grade page controller (Guru & Siswa)
 * Guru: View/grade submissions and quiz essays
 * Siswa: View their grades per course
 */

import Auth from '../auth.js';
import dataService from '../data-service.js';
import { initLayout, showModal, closeModal, showToast, showLoading, hideLoading } from '../components.js';

const NilaiPage = {
  session: null,
  role: null,

  async init() {
    this.session = Auth.checkSession();
    if (!this.session) {
      window.location.href = '/login.html';
      return;
    }
    this.role = this.session.role;

    if (this.role === 'GURU') {
      await this.initGuru();
    } else if (this.role === 'SISWA') {
      await this.initSiswa();
    }
  },

  // ==================== GURU VIEW ====================

  async initGuru() {
    if (!Auth.enforceRole(['GURU'])) return;
    initLayout('GURU', 'nilai', { pageTitle: 'Penilaian' });
    this.renderGuruStructure();
    await this.loadGuruData();
  },

  renderGuruStructure() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="app-layout">
        <div id="sidebarContainer"></div>
        <main class="main-content" id="mainContent">
          <div class="page-header">
            <div class="page-header-info">
              <h2 class="page-title">Penilaian</h2>
              <p class="page-subtitle">Nilai tugas dan kuis esai siswa</p>
            </div>
          </div>
          <div class="tabs" id="nilaiTabs">
            <button class="tab-btn active" data-tab="tugas">Tugas Belum Dinilai</button>
            <button class="tab-btn" data-tab="esai">Esai Belum Dinilai</button>
          </div>
          <div id="nilaiContent" class="section-content"></div>
        </main>
      </div>`;
    initLayout('GURU', 'nilai', { pageTitle: 'Penilaian' });
    this.bindGuruTabs();
  },

  bindGuruTabs() {
    const tabs = document.querySelectorAll('#nilaiTabs .tab-btn');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const tabName = tab.dataset.tab;
        if (tabName === 'tugas') this.renderUngradedSubmissions();
        else this.renderUngradedEssays();
      });
    });
  },

  async loadGuruData() {
    const container = document.getElementById('nilaiContent');
    showLoading(container);

    try {
      const courses = await dataService.getCourses({ guruId: this.session.userId });
      this.guruCourses = courses;
      this.ungradedSubmissions = [];
      this.ungradedEssays = [];

      const allGrades = JSON.parse(localStorage.getItem('pkbm_grades') || '[]');
      const allSubmissions = JSON.parse(localStorage.getItem('pkbm_submissions') || '[]');
      const allAssignments = JSON.parse(localStorage.getItem('pkbm_assignments') || '[]');
      const allQuizzes = JSON.parse(localStorage.getItem('pkbm_quizzes') || '[]');
      const allAttempts = JSON.parse(localStorage.getItem('pkbm_quiz_attempts') || '[]');
      const allUsers = JSON.parse(localStorage.getItem('pkbm_users') || '[]');

      for (const course of courses) {
        // Ungraded submissions
        const courseAssignments = allAssignments.filter(a => a.courseId === course.id);
        for (const asg of courseAssignments) {
          const subs = allSubmissions.filter(s => s.assignmentId === asg.id);
          for (const sub of subs) {
            const hasGrade = allGrades.some(g => g.submissionId === sub.id);
            if (!hasGrade) {
              const student = allUsers.find(u => u.id === sub.siswaId);
              this.ungradedSubmissions.push({
                ...sub,
                assignmentTitle: asg.judul,
                courseName: course.nama,
                studentName: student ? student.nama : 'Unknown'
              });
            }
          }
        }

        // Ungraded essay attempts
        const courseQuizzes = allQuizzes.filter(q => q.courseId === course.id);
        for (const quiz of courseQuizzes) {
          const hasEssay = quiz.soal && quiz.soal.some(s => s.tipe === 'ESAI');
          if (hasEssay) {
            const attempts = allAttempts.filter(a => a.quizId === quiz.id && a.finishedAt);
            for (const attempt of attempts) {
              const hasGrade = allGrades.some(g => g.quizAttemptId === attempt.id);
              if (!hasGrade) {
                const student = allUsers.find(u => u.id === attempt.siswaId);
                this.ungradedEssays.push({
                  ...attempt,
                  quizTitle: quiz.judul,
                  courseName: course.nama,
                  studentName: student ? student.nama : 'Unknown',
                  soal: quiz.soal
                });
              }
            }
          }
        }
      }

      this.renderUngradedSubmissions();
    } catch (err) {
      console.error('Error loading grading data:', err);
      container.innerHTML = '<div class="empty-state"><p>Gagal memuat data penilaian</p></div>';
    }
  },

  renderUngradedSubmissions() {
    const container = document.getElementById('nilaiContent');
    if (!this.ungradedSubmissions || this.ungradedSubmissions.length === 0) {
      container.innerHTML = `<div class="empty-state">
        <i class="ri-check-double-line empty-state-icon"></i>
        <h3>Semua tugas sudah dinilai</h3>
        <p>Tidak ada tugas yang menunggu penilaian</p>
      </div>`;
      return;
    }

    const rows = this.ungradedSubmissions.map(sub => `
      <tr>
        <td>${this.escapeHtml(sub.studentName)}</td>
        <td>${this.escapeHtml(sub.assignmentTitle)}</td>
        <td>${this.escapeHtml(sub.courseName)}</td>
        <td>${new Date(sub.submittedAt).toLocaleDateString('id-ID')}</td>
        <td>
          <button class="btn btn-sm btn-primary" data-grade-sub="${sub.id}">
            <i class="ri-edit-line"></i> Nilai
          </button>
        </td>
      </tr>`).join('');

    container.innerHTML = `
      <div class="table-responsive">
        <table class="table">
          <thead>
            <tr>
              <th>Siswa</th>
              <th>Tugas</th>
              <th>Kursus</th>
              <th>Dikumpulkan</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;

    container.querySelectorAll('[data-grade-sub]').forEach(btn => {
      btn.addEventListener('click', () => {
        const subId = btn.dataset.gradeSub;
        const sub = this.ungradedSubmissions.find(s => s.id === subId);
        this.showGradeModal(sub, 'submission');
      });
    });
  },

  renderUngradedEssays() {
    const container = document.getElementById('nilaiContent');
    if (!this.ungradedEssays || this.ungradedEssays.length === 0) {
      container.innerHTML = `<div class="empty-state">
        <i class="ri-check-double-line empty-state-icon"></i>
        <h3>Semua esai sudah dinilai</h3>
        <p>Tidak ada jawaban esai yang menunggu penilaian</p>
      </div>`;
      return;
    }

    const rows = this.ungradedEssays.map(att => `
      <tr>
        <td>${this.escapeHtml(att.studentName)}</td>
        <td>${this.escapeHtml(att.quizTitle)}</td>
        <td>${this.escapeHtml(att.courseName)}</td>
        <td>${new Date(att.finishedAt).toLocaleDateString('id-ID')}</td>
        <td>
          <button class="btn btn-sm btn-primary" data-grade-essay="${att.id}">
            <i class="ri-edit-line"></i> Nilai
          </button>
        </td>
      </tr>`).join('');

    container.innerHTML = `
      <div class="table-responsive">
        <table class="table">
          <thead>
            <tr>
              <th>Siswa</th>
              <th>Kuis</th>
              <th>Kursus</th>
              <th>Selesai</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;

    container.querySelectorAll('[data-grade-essay]').forEach(btn => {
      btn.addEventListener('click', () => {
        const attId = btn.dataset.gradeEssay;
        const att = this.ungradedEssays.find(a => a.id === attId);
        this.showGradeModal(att, 'essay');
      });
    });
  },

  showGradeModal(item, type) {
    let contentHtml = '';
    if (type === 'submission') {
      contentHtml = `
        <div class="form-group">
          <label class="form-label">Jawaban Siswa</label>
          <div class="card" style="padding:1rem;background:#f7fafc;">
            ${item.konten ? `<p>${this.escapeHtml(item.konten)}</p>` : ''}
            ${item.fileName ? `<p><i class="ri-file-line"></i> ${this.escapeHtml(item.fileName)}</p>` : ''}
            ${!item.konten && !item.fileName ? '<p class="text-muted">Tidak ada jawaban</p>' : ''}
          </div>
        </div>`;
    } else {
      // Show essay answers
      const essayQuestions = item.soal.filter(s => s.tipe === 'ESAI');
      const answersHtml = essayQuestions.map(q => {
        const answer = item.jawaban ? item.jawaban.find(j => j.soalId === q.id) : null;
        return `<div class="form-group">
          <label class="form-label"><strong>${this.escapeHtml(q.pertanyaan)}</strong></label>
          <div class="card" style="padding:0.75rem;background:#f7fafc;">
            <p>${answer && answer.jawaban ? this.escapeHtml(answer.jawaban) : '<em>Tidak dijawab</em>'}</p>
          </div>
        </div>`;
      }).join('');
      contentHtml = answersHtml;
    }

    const formHtml = `
      ${contentHtml}
      <hr>
      <div class="form-group">
        <label class="form-label" for="gradeNilai">Nilai (0-100) <span class="required">*</span></label>
        <input type="number" class="form-input" id="gradeNilai" min="0" max="100" required placeholder="0-100">
      </div>
      <div class="form-group">
        <label class="form-label" for="gradeKomentar">Komentar (opsional)</label>
        <textarea class="form-textarea" id="gradeKomentar" rows="2" placeholder="Komentar untuk siswa"></textarea>
      </div>
      <div id="gradeError" class="form-error" hidden></div>
    `;

    showModal(type === 'submission' ? 'Nilai Tugas' : 'Nilai Esai', formHtml, [
      { label: 'Batal', type: 'secondary', handler: () => {} }
    ]);

    // Add submit button
    const modalFooter = document.querySelector('#appModal .modal-footer');
    if (modalFooter) {
      const btn = document.createElement('button');
      btn.className = 'btn btn-primary';
      btn.textContent = 'Simpan Nilai';
      btn.addEventListener('click', () => this.handleGradeSubmit(item, type));
      modalFooter.appendChild(btn);
    }
  },

  async handleGradeSubmit(item, type) {
    const nilaiInput = document.getElementById('gradeNilai');
    const komentarInput = document.getElementById('gradeKomentar');
    const errorEl = document.getElementById('gradeError');
    const nilai = parseInt(nilaiInput.value, 10);

    if (isNaN(nilai) || nilai < 0 || nilai > 100) {
      errorEl.textContent = 'Nilai harus antara 0-100';
      errorEl.hidden = false;
      return;
    }

    const komentar = komentarInput.value.trim() || null;

    try {
      let result;
      if (type === 'submission') {
        result = await dataService.gradeSubmission(item.id, nilai, komentar);
      } else {
        result = await dataService.gradeQuizEssay(item.id, nilai, komentar);
      }

      if (result && result.error) {
        errorEl.textContent = result.error;
        errorEl.hidden = false;
        return;
      }

      showToast('Nilai berhasil disimpan!', 'success');
      closeModal();
      await this.loadGuruData();
    } catch (err) {
      console.error('Error grading:', err);
      showToast('Gagal menyimpan nilai', 'error');
    }
  },

  // ==================== SISWA VIEW ====================

  async initSiswa() {
    if (!Auth.enforceRole(['SISWA'])) return;
    initLayout('SISWA', 'nilai', { pageTitle: 'Nilai Saya' });
    this.renderSiswaStructure();
    await this.loadSiswaData();
  },

  renderSiswaStructure() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="app-layout">
        <div id="sidebarContainer"></div>
        <main class="main-content" id="mainContent">
          <div class="page-header">
            <div class="page-header-info">
              <h2 class="page-title">Nilai Saya</h2>
              <p class="page-subtitle">Lihat nilai tugas dan kuis</p>
            </div>
          </div>
          <div id="nilaiSiswaContent" class="section-content"></div>
        </main>
      </div>`;
    initLayout('SISWA', 'nilai', { pageTitle: 'Nilai Saya' });
  },

  async loadSiswaData() {
    const container = document.getElementById('nilaiSiswaContent');
    showLoading(container);

    try {
      const grades = await dataService.getStudentGrades(this.session.userId);
      
      if (!grades || grades.length === 0) {
        container.innerHTML = `<div class="empty-state">
          <i class="ri-file-list-3-line empty-state-icon"></i>
          <h3>Belum ada nilai</h3>
          <p>Nilai Anda akan muncul setelah tugas/kuis dinilai oleh guru</p>
        </div>`;
        return;
      }

      // Group by course
      const courseMap = {};
      const courses = JSON.parse(localStorage.getItem('pkbm_courses') || '[]');
      for (const grade of grades) {
        const cId = grade.courseId || 'unknown';
        if (!courseMap[cId]) {
          const course = courses.find(c => c.id === cId);
          courseMap[cId] = { course, grades: [] };
        }
        courseMap[cId].grades.push(grade);
      }

      let html = '';
      for (const [cId, data] of Object.entries(courseMap)) {
        const courseName = data.course ? data.course.nama : 'Kursus tidak diketahui';
        const gradeValues = data.grades.map(g => g.nilai);
        const avg = gradeValues.length > 0 
          ? Math.round((gradeValues.reduce((a, b) => a + b, 0) / gradeValues.length) * 10) / 10 
          : 0;

        const rows = data.grades.map(g => `
          <tr>
            <td>${this.escapeHtml(g.judul || '-')}</td>
            <td><span class="badge badge-${g.tipe === 'TUGAS' ? 'primary' : 'info'}">${g.tipe}</span></td>
            <td><strong>${g.nilai}</strong></td>
            <td>${g.createdAt ? new Date(g.createdAt).toLocaleDateString('id-ID') : '-'}</td>
          </tr>`).join('');

        html += `
          <div class="card" style="margin-bottom:1.5rem;">
            <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;">
              <h3>${this.escapeHtml(courseName)}</h3>
              <span class="badge badge-success">Rata-rata: ${avg}</span>
            </div>
            <div class="card-body">
              <div class="table-responsive">
                <table class="table">
                  <thead><tr><th>Judul</th><th>Tipe</th><th>Nilai</th><th>Tanggal</th></tr></thead>
                  <tbody>${rows}</tbody>
                </table>
              </div>
            </div>
          </div>`;
      }

      container.innerHTML = html;
    } catch (err) {
      console.error('Error loading grades:', err);
      container.innerHTML = '<div class="empty-state"><p>Gagal memuat data nilai</p></div>';
    }
  },

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};

export default NilaiPage;
