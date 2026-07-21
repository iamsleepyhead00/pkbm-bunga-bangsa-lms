/**
 * profil.js - Profile page controller
 * Change password, view profile info, notification list
 */

import Auth from '../auth.js';
import dataService from '../data-service.js';
import { initLayout, showToast } from '../components.js';

const ProfilPage = {
  session: null,

  async init() {
    this.session = Auth.checkSession();
    if (!this.session) {
      window.location.href = '/login.html';
      return;
    }

    const role = this.session.role;
    initLayout(role, 'profil', { pageTitle: 'Profil' });
    this.renderStructure(role);
    await this.loadData();
  },

  renderStructure(role) {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="app-layout">
        <div id="sidebarContainer"></div>
        <main class="main-content" id="mainContent">
          <div class="page-header">
            <div class="page-header-info">
              <h2 class="page-title">Profil Saya</h2>
              <p class="page-subtitle">Kelola informasi akun Anda</p>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;">
            <div class="card" style="padding:1.5rem;" id="profileInfo">
              <h3 style="margin:0 0 1rem;"><i class="ri-user-line"></i> Informasi Akun</h3>
              <div id="profileDetails"></div>
            </div>
            <div class="card" style="padding:1.5rem;" id="changePasswordCard">
              <h3 style="margin:0 0 1rem;"><i class="ri-lock-line"></i> Ubah Password</h3>
              <form id="changePasswordForm">
                <div class="form-group">
                  <label class="form-label" for="oldPassword">Password Lama</label>
                  <input type="password" class="form-input" id="oldPassword" required placeholder="Password saat ini">
                </div>
                <div class="form-group">
                  <label class="form-label" for="newPassword">Password Baru</label>
                  <input type="password" class="form-input" id="newPassword" required placeholder="Minimal 8 karakter" minlength="8">
                </div>
                <div class="form-group">
                  <label class="form-label" for="confirmPassword">Konfirmasi Password Baru</label>
                  <input type="password" class="form-input" id="confirmPassword" required placeholder="Ulangi password baru">
                </div>
                <div id="passwordError" class="form-error" hidden></div>
                <button type="submit" class="btn btn-primary">
                  <i class="ri-save-line"></i> Simpan Password
                </button>
              </form>
            </div>
          </div>
          <div style="margin-top:1.5rem;">
            <h3 style="margin-bottom:1rem;"><i class="ri-notification-3-line"></i> Notifikasi</h3>
            <div id="notificationsList"></div>
          </div>
        </main>
      </div>`;
    initLayout(role, 'profil', { pageTitle: 'Profil' });
    this.bindEvents();
  },

  bindEvents() {
    document.getElementById('changePasswordForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleChangePassword();
    });
  },

  async loadData() {
    try {
      const user = await dataService.getUserById(this.session.userId);
      const profileEl = document.getElementById('profileDetails');

      if (user) {
        profileEl.innerHTML = `
          <div class="profile-field">
            <label>Nama Lengkap</label>
            <p><strong>${this.escapeHtml(user.nama)}</strong></p>
          </div>
          <div class="profile-field">
            <label>Username</label>
            <p><code>${this.escapeHtml(user.username)}</code></p>
          </div>
          <div class="profile-field">
            <label>Peran</label>
            <p><span class="badge badge-primary">${user.role}</span></p>
          </div>
          ${user.program ? `<div class="profile-field">
            <label>Program</label>
            <p>${this.escapeHtml(user.program)}</p>
          </div>` : ''}
          ${user.kelas ? `<div class="profile-field">
            <label>Kelas</label>
            <p>${this.escapeHtml(user.kelas)}</p>
          </div>` : ''}
          <div class="profile-field">
            <label>Terdaftar Sejak</label>
            <p>${user.createdAt ? new Date(user.createdAt).toLocaleDateString('id-ID') : '-'}</p>
          </div>`;
      }

      // Load notifications
      await this.loadNotifications();
    } catch (err) {
      console.error('Error loading profile:', err);
    }
  },

  async loadNotifications() {
    const container = document.getElementById('notificationsList');
    try {
      const notifications = await dataService.getNotifications(this.session.userId);

      if (!notifications || notifications.length === 0) {
        container.innerHTML = '<p class="text-muted">Tidak ada notifikasi</p>';
        return;
      }

      container.innerHTML = notifications.slice(0, 20).map(n => `
        <div class="card notification-item ${n.dibaca ? '' : 'unread'}" style="padding:0.75rem;margin-bottom:0.5rem;cursor:pointer;" data-notif-id="${n.id}" data-link="${n.link || ''}">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;">
            <div style="display:flex;gap:0.5rem;align-items:flex-start;">
              <i class="ri-notification-3-line" style="margin-top:0.2rem;"></i>
              <div>
                <p style="margin:0;">${this.escapeHtml(n.pesan)}</p>
                <span class="text-muted" style="font-size:0.75rem;">${new Date(n.createdAt).toLocaleString('id-ID')}</span>
              </div>
            </div>
            ${!n.dibaca ? '<span class="badge badge-primary" style="font-size:0.65rem;">Baru</span>' : ''}
          </div>
        </div>`).join('');

      container.querySelectorAll('.notification-item').forEach(item => {
        item.addEventListener('click', async () => {
          const id = item.dataset.notifId;
          const link = item.dataset.link;
          await dataService.markAsRead(id);
          item.classList.remove('unread');
          item.querySelector('.badge')?.remove();
          if (link) window.location.href = link;
        });
      });
    } catch (err) {
      console.error('Error loading notifications:', err);
      container.innerHTML = '<p>Gagal memuat notifikasi</p>';
    }
  },

  async handleChangePassword() {
    const errorEl = document.getElementById('passwordError');
    const oldPassword = document.getElementById('oldPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    errorEl.hidden = true;

    if (!oldPassword || !newPassword || !confirmPassword) {
      errorEl.textContent = 'Semua field wajib diisi';
      errorEl.hidden = false;
      return;
    }

    if (newPassword.length < 8) {
      errorEl.textContent = 'Password minimal 8 karakter';
      errorEl.hidden = false;
      return;
    }

    if (newPassword !== confirmPassword) {
      errorEl.textContent = 'Konfirmasi password tidak cocok';
      errorEl.hidden = false;
      return;
    }

    try {
      const result = await Auth.changePassword(this.session.userId, oldPassword, newPassword);
      if (result.success) {
        showToast('Password berhasil diubah!', 'success');
        document.getElementById('changePasswordForm').reset();
      } else {
        errorEl.textContent = result.error || 'Gagal mengubah password';
        errorEl.hidden = false;
      }
    } catch (err) {
      console.error('Error changing password:', err);
      showToast('Gagal mengubah password', 'error');
    }
  },

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};

export default ProfilPage;
