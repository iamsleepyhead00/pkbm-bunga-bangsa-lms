/**
 * dashboard-siswa.js - Siswa dashboard page controller
 * Shows: Course progress bars, upcoming deadlines (3 days), available quizzes, latest grade
 */

import Auth from '../auth.js';
import dataService from '../data-service.js';
import { initLayout, renderProgressBar, showToast } from '../components.js';

const DashboardSiswaPage = {
  session: null,

  async init() {
    this.session = Auth.checkSession();
    if (!this.session) {
      window.location.href = '/login.html';
      return;
    }
    if (!Auth.enforceRole(['SISWA'])) return;

    initLayout('SISWA', 'dashboard', { pageTitle: 'Dashboard' });
    this.renderStructure();
    await this.loadData();
  },

  renderStructure() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="app-layout">
        <div id="sidebarContainer"></div>
        <main class="main-content" id="mainContent">
          <div class="page-header">
            <div class="page-header-info">
              <h2 class="page-title">Dashboard Siswa</h2>
              <p class="page-subtitle">Selamat datang, ${this.escapeHtml(this.session.nama)}</p>
            </div>
          </div>
          <div id="dashboardStats" class="stats-grid"></div>
          <div class="dashboard-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-top:1.5rem;">
            <div>
              <h3 style="margin-bottom:1rem;"><i class="ri-time-line"></i> Deadline Mendekati</h3>
              <div id="upcomingDeadlines"></div>
            </div>
            <div>
              <h3 style="margin-bottom:1rem;"><i class="ri-questionnaire-line"></i> Kuis Tersedia</h3>
              <div id="availableQuizzes"></div>
            </div>
          </div>
          <h3 style="margin:1.5rem 0 1rem;"><i class="ri-book-open-line"></i> Progres Kursus</h3>
          <div id="courseProgress"></div>
          <h3 style="margin:1.5rem 0 1rem;"><i class="ri-star-line"></i> Nilai Terakhir</h3>
          <div id="recentGrades"></div>
        </main>
      </div>`;
    initLayout('SISWA', 'dashboard', { pageTitle: 'Dashboard' });
  },

  async loadData() {
    try {
      const data = await dataService.getStudentDashboardData(this.session.userId);

      // Stats
      const totalCourses = data.courses.length;
      const avgProgress = totalCourses > 0
        ? Math.round(data.courses.reduce((sum, c) => sum + (c.progress ? c.progress.percentage : 0), 0) / totalCourses)
        : 0;

      const statsContainer = document.getElementById('dashboardStats');
      statsContainer.innerHTML = `
        <div class="stat-card">
          <div class="stat-icon"><i class="ri-book-open-line"></i></div>
          <div class="stat-info">
            <div class="stat-value">${totalCourses}</div>
            <div class="stat-label">Kursus Diikuti</div>
          </div>
        </div>
        <div class="stat-card stat-card-warning">
          <div class="stat-icon"><i class="ri-alarm-warning-line"></i></div>
          <div class="stat-info">
            <div class="stat-value">${data.upcomingDeadlines.length}</div>
            <div class="stat-label">Deadline 3 Hari</div>
          </div>
        </div>
        <div class="stat-card stat-card-info">
          <div class="stat-icon"><i class="ri-questionnaire-line"></i></div>
          <div class="stat-info">
            <div class="stat-value">${data.availableQuizzes.length}</div>
            <div class="stat-label">Kuis Tersedia</div>
          </div>
        </div>
        <div class="stat-card stat-card-success">
          <div class="stat-icon"><i class="ri-bar-chart-box-line"></i></div>
          <div class="stat-info">
            <div class="stat-value">${avgProgress}%</div>
            <div class="stat-label">Progres Rata-rata</div>
          </div>
        </div>`;

      // Upcoming deadlines
      const deadlinesContainer = document.getElementById('upcomingDeadlines');
      if (data.upcomingDeadlines.length === 0) {
        deadlinesContainer.innerHTML = '<p class="text-muted">Tidak ada deadline mendekati</p>';
      } else {
        deadlinesContainer.innerHTML = data.upcomingDeadlines.map(d => {
          const deadline = new Date(d.batasWaktu);
          const diff = Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24));
          const urgency = diff <= 1 ? 'danger' : 'warning';
          return `<div class="card" style="padding:0.75rem;margin-bottom:0.5rem;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div>
                <strong>${this.escapeHtml(d.judul)}</strong>
                <p class="text-muted" style="margin:0;font-size:0.8rem;">${this.escapeHtml(d.courseName)}</p>
              </div>
              <span class="badge badge-${urgency}">${diff} hari lagi</span>
            </div>
          </div>`;
        }).join('');
      }

      // Available quizzes
      const quizzesContainer = document.getElementById('availableQuizzes');
      if (data.availableQuizzes.length === 0) {
        quizzesContainer.innerHTML = '<p class="text-muted">Tidak ada kuis tersedia</p>';
      } else {
        quizzesContainer.innerHTML = data.availableQuizzes.map(q => `
          <div class="card" style="padding:0.75rem;margin-bottom:0.5rem;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div>
                <strong>${this.escapeHtml(q.judul)}</strong>
                <p class="text-muted" style="margin:0;font-size:0.8rem;">${this.escapeHtml(q.courseName)} · ${q.durasi} menit</p>
              </div>
              <a href="/pages/siswa/kuis.html?id=${q.id}" class="btn btn-sm btn-primary">Kerjakan</a>
            </div>
          </div>`).join('');
      }

      // Course progress
      const progressContainer = document.getElementById('courseProgress');
      if (data.courses.length === 0) {
        progressContainer.innerHTML = '<p class="text-muted">Belum terdaftar di kursus manapun</p>';
      } else {
        progressContainer.innerHTML = data.courses.map(c => {
          const pct = c.progress ? c.progress.percentage : 0;
          return `<div class="card" style="padding:0.75rem;margin-bottom:0.5rem;">
            <div style="display:flex;justify-content:space-between;margin-bottom:0.5rem;">
              <strong>${this.escapeHtml(c.nama)}</strong>
              <span class="text-muted">${pct}%</span>
            </div>
            ${renderProgressBar(pct, { size: 'sm' })}
          </div>`;
        }).join('');
      }

      // Recent grades
      const gradesContainer = document.getElementById('recentGrades');
      if (!data.recentGrades || data.recentGrades.length === 0) {
        gradesContainer.innerHTML = '<p class="text-muted">Belum ada nilai</p>';
      } else {
        gradesContainer.innerHTML = `<div class="table-responsive"><table class="table">
          <thead><tr><th>Judul</th><th>Tipe</th><th>Nilai</th><th>Tanggal</th></tr></thead>
          <tbody>
            ${data.recentGrades.map(g => `<tr>
              <td>${this.escapeHtml(g.judul || '-')}</td>
              <td><span class="badge badge-${g.tipe === 'TUGAS' ? 'primary' : 'info'}">${g.tipe}</span></td>
              <td><strong>${g.nilai}</strong></td>
              <td>${g.createdAt ? new Date(g.createdAt).toLocaleDateString('id-ID') : '-'}</td>
            </tr>`).join('')}
          </tbody>
        </table></div>`;
      }
    } catch (err) {
      console.error('Error loading dashboard:', err);
      document.getElementById('dashboardStats').innerHTML = '<p>Gagal memuat dashboard</p>';
    }
  },

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};

export default DashboardSiswaPage;
