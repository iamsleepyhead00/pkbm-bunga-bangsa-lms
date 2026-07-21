/**
 * dashboard-admin.js - Admin dashboard page controller
 * Shows: System stats, user counts, quick actions
 */

import Auth from '../auth.js';
import dataService from '../data-service.js';
import { initLayout, showToast } from '../components.js';

const DashboardAdminPage = {
  session: null,

  async init() {
    this.session = Auth.checkSession();
    if (!this.session) {
      window.location.href = '/login.html';
      return;
    }
    if (!Auth.enforceRole(['ADMIN'])) return;

    initLayout('ADMIN', 'dashboard', { pageTitle: 'Dashboard Admin' });
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
              <h2 class="page-title">Dashboard Admin</h2>
              <p class="page-subtitle">Manajemen sistem PKBM Bunga Bangsa LMS</p>
            </div>
          </div>
          <div id="adminStats" class="stats-grid"></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-top:1.5rem;">
            <div>
              <h3 style="margin-bottom:1rem;">Aksi Cepat</h3>
              <div id="quickActions"></div>
            </div>
            <div>
              <h3 style="margin-bottom:1rem;">Pengguna Terbaru</h3>
              <div id="recentUsers"></div>
            </div>
          </div>
        </main>
      </div>`;
    initLayout('ADMIN', 'dashboard', { pageTitle: 'Dashboard Admin' });
  },

  async loadData() {
    try {
      const allUsers = await dataService.getUsers();
      const courses = JSON.parse(localStorage.getItem('pkbm_courses') || '[]');
      const enrollments = JSON.parse(localStorage.getItem('pkbm_enrollments') || '[]');

      const guruCount = allUsers.filter(u => u.role === 'GURU' && u.aktif).length;
      const siswaCount = allUsers.filter(u => u.role === 'SISWA' && u.aktif).length;
      const activeCourses = courses.filter(c => c.aktif).length;
      const activeEnrollments = enrollments.filter(e => e.aktif).length;

      // Stats
      const statsContainer = document.getElementById('adminStats');
      statsContainer.innerHTML = `
        <div class="stat-card">
          <div class="stat-icon"><i class="ri-user-star-line"></i></div>
          <div class="stat-info">
            <div class="stat-value">${guruCount}</div>
            <div class="stat-label">Guru Aktif</div>
          </div>
        </div>
        <div class="stat-card stat-card-info">
          <div class="stat-icon"><i class="ri-group-line"></i></div>
          <div class="stat-info">
            <div class="stat-value">${siswaCount}</div>
            <div class="stat-label">Siswa Aktif</div>
          </div>
        </div>
        <div class="stat-card stat-card-success">
          <div class="stat-icon"><i class="ri-book-open-line"></i></div>
          <div class="stat-info">
            <div class="stat-value">${activeCourses}</div>
            <div class="stat-label">Kursus Aktif</div>
          </div>
        </div>
        <div class="stat-card stat-card-warning">
          <div class="stat-icon"><i class="ri-links-line"></i></div>
          <div class="stat-info">
            <div class="stat-value">${activeEnrollments}</div>
            <div class="stat-label">Enrollment Aktif</div>
          </div>
        </div>`;

      // Quick actions
      document.getElementById('quickActions').innerHTML = `
        <div style="display:flex;flex-direction:column;gap:0.75rem;">
          <a href="/pages/admin/kelola-user.html" class="btn btn-primary" style="justify-content:flex-start;">
            <i class="ri-user-add-line"></i> Kelola Pengguna
          </a>
          <a href="/pages/admin/kelola-user.html?action=tambah&role=GURU" class="btn btn-secondary" style="justify-content:flex-start;">
            <i class="ri-user-star-line"></i> Tambah Guru Baru
          </a>
          <a href="/pages/admin/kelola-user.html?action=tambah&role=SISWA" class="btn btn-secondary" style="justify-content:flex-start;">
            <i class="ri-user-add-line"></i> Tambah Siswa Baru
          </a>
        </div>`;

      // Recent users
      const recentUsers = [...allUsers]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);

      document.getElementById('recentUsers').innerHTML = recentUsers.map(u => `
        <div class="card" style="padding:0.75rem;margin-bottom:0.5rem;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div>
              <strong>${this.escapeHtml(u.nama)}</strong>
              <p class="text-muted" style="margin:0;font-size:0.8rem;">@${this.escapeHtml(u.username)}</p>
            </div>
            <span class="badge badge-${u.role === 'GURU' ? 'primary' : u.role === 'ADMIN' ? 'danger' : 'info'}">${u.role}</span>
          </div>
        </div>`).join('');
    } catch (err) {
      console.error('Error loading admin dashboard:', err);
    }
  },

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};

export default DashboardAdminPage;
