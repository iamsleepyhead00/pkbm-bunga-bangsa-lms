/**
 * dashboard-guru.js - Guru dashboard page controller
 * Shows: Active courses, pending grades count, class stats
 */

import Auth from '../auth.js';
import dataService from '../data-service.js';
import { initLayout, renderCourseCard, renderProgressBar, showToast } from '../components.js';

const DashboardGuruPage = {
  session: null,

  async init() {
    this.session = Auth.checkSession();
    if (!this.session) {
      window.location.href = '/login.html';
      return;
    }
    if (!Auth.enforceRole(['GURU'])) return;

    initLayout('GURU', 'dashboard', { pageTitle: 'Dashboard' });
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
              <h2 class="page-title">Dashboard Guru</h2>
              <p class="page-subtitle">Selamat datang, ${this.escapeHtml(this.session.nama)}</p>
            </div>
          </div>
          <div id="dashboardStats" class="stats-grid"></div>
          <h3 style="margin:1.5rem 0 1rem;">Kursus Aktif</h3>
          <div id="dashboardCourses" class="course-grid"></div>
          <h3 style="margin:1.5rem 0 1rem;">Notifikasi Terbaru</h3>
          <div id="dashboardNotifications"></div>
        </main>
      </div>`;
    initLayout('GURU', 'dashboard', { pageTitle: 'Dashboard' });
  },

  async loadData() {
    try {
      const data = await dataService.getGuruDashboardData(this.session.userId);

      // Stats cards
      const statsContainer = document.getElementById('dashboardStats');
      statsContainer.innerHTML = `
        <div class="stat-card">
          <div class="stat-icon"><i class="ri-book-open-line"></i></div>
          <div class="stat-info">
            <div class="stat-value">${data.courses.length}</div>
            <div class="stat-label">Kursus Aktif</div>
          </div>
        </div>
        <div class="stat-card stat-card-warning">
          <div class="stat-icon"><i class="ri-file-edit-line"></i></div>
          <div class="stat-info">
            <div class="stat-value">${data.ungradedSubmissions}</div>
            <div class="stat-label">Tugas Belum Dinilai</div>
          </div>
        </div>
        <div class="stat-card stat-card-info">
          <div class="stat-icon"><i class="ri-draft-line"></i></div>
          <div class="stat-info">
            <div class="stat-value">${data.ungradedEssays}</div>
            <div class="stat-label">Esai Menunggu Penilaian</div>
          </div>
        </div>
        <div class="stat-card stat-card-success">
          <div class="stat-icon"><i class="ri-group-line"></i></div>
          <div class="stat-info">
            <div class="stat-value">${data.courses.reduce((sum, c) => sum + (c.studentCount || 0), 0)}</div>
            <div class="stat-label">Total Siswa</div>
          </div>
        </div>`;

      // Course cards
      const coursesContainer = document.getElementById('dashboardCourses');
      if (data.courses.length === 0) {
        coursesContainer.innerHTML = `<div class="empty-state">
          <p>Belum ada kursus aktif. <a href="/pages/guru/kursus.html">Buat kursus baru</a></p>
        </div>`;
      } else {
        coursesContainer.innerHTML = data.courses.map(course => `
          <a href="/pages/guru/kursus-detail.html?id=${course.id}" class="course-card-link">
            ${renderCourseCard(course, 'GURU', { studentCount: course.studentCount })}
          </a>`).join('');
      }

      // Notifications
      const notifContainer = document.getElementById('dashboardNotifications');
      if (data.notifications.length === 0) {
        notifContainer.innerHTML = '<p class="text-muted">Tidak ada notifikasi baru</p>';
      } else {
        notifContainer.innerHTML = `<div class="notification-list">
          ${data.notifications.map(n => `
            <div class="notification-item ${n.dibaca ? '' : 'unread'}" data-notif-id="${n.id}" data-link="${n.link || ''}">
              <i class="ri-notification-3-line"></i>
              <div class="notification-content">
                <p>${this.escapeHtml(n.pesan)}</p>
                <span class="text-muted" style="font-size:0.75rem;">${new Date(n.createdAt).toLocaleString('id-ID')}</span>
              </div>
            </div>`).join('')}
        </div>`;

        notifContainer.querySelectorAll('.notification-item').forEach(item => {
          item.addEventListener('click', async () => {
            const id = item.dataset.notifId;
            const link = item.dataset.link;
            await dataService.markAsRead(id);
            if (link) window.location.href = link;
          });
        });
      }
    } catch (err) {
      console.error('Error loading dashboard:', err);
      document.getElementById('dashboardStats').innerHTML = '<p>Gagal memuat data dashboard</p>';
    }
  },

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};

export default DashboardGuruPage;
