/**
 * kelola-user.js - User management page controller (Admin)
 * CRUD operations for Guru and Siswa users
 */

import Auth from '../auth.js';
import dataService from '../data-service.js';
import { KURIKULUM } from '../curriculum.js';
import { initLayout, showModal, closeModal, showConfirm, showToast, showLoading, hideLoading } from '../components.js';
import { hashPassword } from '../utils.js';

const KelolaUserPage = {
  session: null,
  users: [],
  filterRole: '',

  async init() {
    this.session = Auth.checkSession();
    if (!this.session) {
      window.location.href = '/login.html';
      return;
    }
    if (!Auth.enforceRole(['ADMIN'])) return;

    initLayout('ADMIN', 'kelola-user', { pageTitle: 'Kelola Pengguna' });
    this.renderStructure();
    await this.loadUsers();

    // Check URL for auto-open
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'tambah') {
      const role = params.get('role') || '';
      this.showCreateModal(role);
    }
  },

  renderStructure() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="app-layout">
        <div id="sidebarContainer"></div>
        <main class="main-content" id="mainContent">
          <div class="page-header">
            <div class="page-header-info">
              <h2 class="page-title">Kelola Pengguna</h2>
              <p class="page-subtitle">Buat dan kelola akun Guru dan Siswa</p>
            </div>
            <button class="btn btn-primary" id="btnTambahUser">
              <i class="ri-user-add-line"></i> Tambah User
            </button>
          </div>
          <div class="filter-bar" style="margin-bottom:1rem;display:flex;gap:1rem;align-items:center;">
            <select class="form-select" id="filterRole" style="width:auto;">
              <option value="">Semua Peran</option>
              <option value="GURU">Guru</option>
              <option value="SISWA">Siswa</option>
              <option value="ADMIN">Admin</option>
            </select>
            <input type="text" class="form-input" id="searchUser" placeholder="Cari nama/username..." style="max-width:250px;">
          </div>
          <div id="userListContainer"></div>
        </main>
      </div>`;
    initLayout('ADMIN', 'kelola-user', { pageTitle: 'Kelola Pengguna' });
    this.bindEvents();
  },

  bindEvents() {
    document.getElementById('btnTambahUser').addEventListener('click', () => this.showCreateModal());
    document.getElementById('filterRole').addEventListener('change', (e) => {
      this.filterRole = e.target.value;
      this.renderUserList();
    });
    document.getElementById('searchUser').addEventListener('input', () => this.renderUserList());
  },

  async loadUsers() {
    const container = document.getElementById('userListContainer');
    showLoading(container);
    try {
      this.users = await dataService.getUsers();
      this.renderUserList();
    } catch (err) {
      console.error('Error loading users:', err);
      container.innerHTML = '<p>Gagal memuat data pengguna</p>';
    }
  },

  renderUserList() {
    const container = document.getElementById('userListContainer');
    const search = (document.getElementById('searchUser').value || '').toLowerCase();

    let filtered = this.users;
    if (this.filterRole) {
      filtered = filtered.filter(u => u.role === this.filterRole);
    }
    if (search) {
      filtered = filtered.filter(u =>
        (u.nama && u.nama.toLowerCase().includes(search)) ||
        (u.username && u.username.toLowerCase().includes(search))
      );
    }

    if (filtered.length === 0) {
      container.innerHTML = `<div class="empty-state">
        <i class="ri-user-line empty-state-icon"></i>
        <h3>Tidak ada pengguna</h3>
      </div>`;
      return;
    }

    const rows = filtered.map(u => {
      const statusBadge = u.aktif
        ? '<span class="badge badge-success">Aktif</span>'
        : '<span class="badge badge-gray">Nonaktif</span>';
      const roleBadge = u.role === 'GURU' ? 'badge-primary' : u.role === 'ADMIN' ? 'badge-danger' : 'badge-info';

      return `<tr>
        <td>${this.escapeHtml(u.nama)}</td>
        <td><code>${this.escapeHtml(u.username)}</code></td>
        <td><span class="badge ${roleBadge}">${u.role}</span></td>
        <td>${u.program || '-'}</td>
        <td>${u.kelas || '-'}</td>
        <td>${statusBadge}</td>
        <td>
          <button class="btn btn-sm btn-secondary" data-edit="${u.id}"><i class="ri-edit-line"></i></button>
          ${u.aktif
            ? `<button class="btn btn-sm btn-danger" data-deactivate="${u.id}"><i class="ri-close-line"></i></button>`
            : `<button class="btn btn-sm btn-success" data-activate="${u.id}"><i class="ri-check-line"></i></button>`}
        </td>
      </tr>`;
    }).join('');

    container.innerHTML = `
      <div class="table-responsive">
        <table class="table">
          <thead>
            <tr>
              <th>Nama</th>
              <th>Username</th>
              <th>Peran</th>
              <th>Program</th>
              <th>Kelas</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <p class="text-muted" style="margin-top:0.5rem;">Total: ${filtered.length} pengguna</p>`;

    // Bind action buttons
    container.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => this.showEditModal(btn.dataset.edit));
    });
    container.querySelectorAll('[data-deactivate]').forEach(btn => {
      btn.addEventListener('click', () => this.handleDeactivate(btn.dataset.deactivate));
    });
    container.querySelectorAll('[data-activate]').forEach(btn => {
      btn.addEventListener('click', () => this.handleActivate(btn.dataset.activate));
    });
  },

  showCreateModal(defaultRole = '') {
    const programOptions = Object.entries(KURIKULUM).map(([key, val]) =>
      `<option value="${key}">${val.label}</option>`
    ).join('');

    const formHtml = `
      <form id="createUserForm">
        <div class="form-group">
          <label class="form-label">Nama Lengkap <span class="required">*</span></label>
          <input type="text" class="form-input" id="userNama" required placeholder="Nama lengkap">
        </div>
        <div class="form-group">
          <label class="form-label">Username <span class="required">*</span></label>
          <input type="text" class="form-input" id="userUsername" required placeholder="Username unik">
        </div>
        <div class="form-group">
          <label class="form-label">Password <span class="required">*</span></label>
          <input type="password" class="form-input" id="userPassword" required placeholder="Minimal 8 karakter" minlength="8">
        </div>
        <div class="form-group">
          <label class="form-label">Peran <span class="required">*</span></label>
          <select class="form-select" id="userRole" required>
            <option value="">-- Pilih Peran --</option>
            <option value="GURU" ${defaultRole === 'GURU' ? 'selected' : ''}>Guru</option>
            <option value="SISWA" ${defaultRole === 'SISWA' ? 'selected' : ''}>Siswa</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
        <div id="siswaFields" style="display:${defaultRole === 'SISWA' ? 'block' : 'none'};">
          <div class="form-group">
            <label class="form-label">Program <span class="required">*</span></label>
            <select class="form-select" id="userProgram">
              <option value="">-- Pilih Program --</option>
              ${programOptions}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Kelas <span class="required">*</span></label>
            <select class="form-select" id="userKelas" disabled>
              <option value="">-- Pilih Kelas --</option>
            </select>
          </div>
        </div>
        <div id="createUserError" class="form-error" hidden></div>
      </form>`;

    showModal('Tambah Pengguna Baru', formHtml, [
      { label: 'Batal', type: 'secondary', handler: () => {} }
    ]);

    const modalFooter = document.querySelector('#appModal .modal-footer');
    if (modalFooter) {
      const btn = document.createElement('button');
      btn.className = 'btn btn-primary';
      btn.textContent = 'Simpan';
      btn.addEventListener('click', () => this.handleCreate());
      modalFooter.appendChild(btn);
    }

    // Show/hide siswa fields based on role
    document.getElementById('userRole').addEventListener('change', (e) => {
      const siswaFields = document.getElementById('siswaFields');
      siswaFields.style.display = e.target.value === 'SISWA' ? 'block' : 'none';
    });

    // Program → Kelas cascade
    document.getElementById('userProgram').addEventListener('change', (e) => {
      const kelasSelect = document.getElementById('userKelas');
      kelasSelect.innerHTML = '<option value="">-- Pilih Kelas --</option>';
      const program = e.target.value;
      if (program && KURIKULUM[program]) {
        KURIKULUM[program].kelas.forEach(k => {
          const opt = document.createElement('option');
          opt.value = k;
          opt.textContent = k;
          kelasSelect.appendChild(opt);
        });
        kelasSelect.disabled = false;
      } else {
        kelasSelect.disabled = true;
      }
    });
  },

  async handleCreate() {
    const errorEl = document.getElementById('createUserError');
    const nama = document.getElementById('userNama').value.trim();
    const username = document.getElementById('userUsername').value.trim();
    const password = document.getElementById('userPassword').value;
    const role = document.getElementById('userRole').value;
    const program = document.getElementById('userProgram').value;
    const kelas = document.getElementById('userKelas').value;

    if (!nama || !username || !password || !role) {
      errorEl.textContent = 'Semua field wajib diisi';
      errorEl.hidden = false;
      return;
    }

    if (password.length < 8) {
      errorEl.textContent = 'Password minimal 8 karakter';
      errorEl.hidden = false;
      return;
    }

    if (role === 'SISWA' && (!program || !kelas)) {
      errorEl.textContent = 'Program dan Kelas wajib diisi untuk Siswa';
      errorEl.hidden = false;
      return;
    }

    // Check username uniqueness
    const existing = this.users.find(u => u.username === username);
    if (existing) {
      errorEl.textContent = 'Username sudah digunakan';
      errorEl.hidden = false;
      return;
    }

    try {
      const passwordHash = await hashPassword(password);
      await dataService.createUser({
        nama,
        username,
        passwordHash,
        role,
        program: role === 'SISWA' ? program : null,
        kelas: role === 'SISWA' ? kelas : null
      });

      showToast('Pengguna berhasil dibuat!', 'success');
      closeModal();
      await this.loadUsers();
    } catch (err) {
      console.error('Error creating user:', err);
      showToast('Gagal membuat pengguna', 'error');
    }
  },

  showEditModal(userId) {
    const user = this.users.find(u => u.id === userId);
    if (!user) return;

    const programOptions = Object.entries(KURIKULUM).map(([key, val]) =>
      `<option value="${key}" ${user.program === key ? 'selected' : ''}>${val.label}</option>`
    ).join('');

    const kelasOptions = user.program && KURIKULUM[user.program]
      ? KURIKULUM[user.program].kelas.map(k => `<option value="${k}" ${user.kelas === k ? 'selected' : ''}>${k}</option>`).join('')
      : '';

    const formHtml = `
      <form id="editUserForm">
        <div class="form-group">
          <label class="form-label">Nama Lengkap</label>
          <input type="text" class="form-input" id="editNama" value="${this.escapeHtml(user.nama)}">
        </div>
        <div class="form-group">
          <label class="form-label">Username</label>
          <input type="text" class="form-input" value="${this.escapeHtml(user.username)}" disabled>
        </div>
        ${user.role === 'SISWA' ? `
        <div class="form-group">
          <label class="form-label">Program</label>
          <select class="form-select" id="editProgram">
            <option value="">-- Pilih --</option>
            ${programOptions}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Kelas</label>
          <select class="form-select" id="editKelas">
            <option value="">-- Pilih --</option>
            ${kelasOptions}
          </select>
        </div>` : ''}
        <div id="editUserError" class="form-error" hidden></div>
      </form>`;

    showModal('Edit Pengguna', formHtml, [
      { label: 'Batal', type: 'secondary', handler: () => {} }
    ]);

    const modalFooter = document.querySelector('#appModal .modal-footer');
    if (modalFooter) {
      const btn = document.createElement('button');
      btn.className = 'btn btn-primary';
      btn.textContent = 'Simpan Perubahan';
      btn.addEventListener('click', () => this.handleEdit(userId));
      modalFooter.appendChild(btn);
    }

    // Program → Kelas cascade for edit
    const editProgram = document.getElementById('editProgram');
    if (editProgram) {
      editProgram.addEventListener('change', (e) => {
        const kelasSelect = document.getElementById('editKelas');
        kelasSelect.innerHTML = '<option value="">-- Pilih --</option>';
        const program = e.target.value;
        if (program && KURIKULUM[program]) {
          KURIKULUM[program].kelas.forEach(k => {
            const opt = document.createElement('option');
            opt.value = k;
            opt.textContent = k;
            kelasSelect.appendChild(opt);
          });
        }
      });
    }
  },

  async handleEdit(userId) {
    const nama = document.getElementById('editNama').value.trim();
    const updateData = { nama };

    const editProgram = document.getElementById('editProgram');
    const editKelas = document.getElementById('editKelas');
    if (editProgram) updateData.program = editProgram.value || null;
    if (editKelas) updateData.kelas = editKelas.value || null;

    try {
      await dataService.updateUser(userId, updateData);
      showToast('Pengguna berhasil diperbarui!', 'success');
      closeModal();
      await this.loadUsers();
    } catch (err) {
      console.error('Error updating user:', err);
      showToast('Gagal memperbarui pengguna', 'error');
    }
  },

  async handleDeactivate(userId) {
    const confirmed = await showConfirm('Nonaktifkan pengguna ini? Pengguna tidak akan bisa login.');
    if (!confirmed) return;
    try {
      await dataService.deactivateUser(userId);
      showToast('Pengguna dinonaktifkan', 'success');
      await this.loadUsers();
    } catch (err) {
      showToast('Gagal menonaktifkan pengguna', 'error');
    }
  },

  async handleActivate(userId) {
    try {
      await dataService.updateUser(userId, { aktif: true });
      showToast('Pengguna diaktifkan kembali', 'success');
      await this.loadUsers();
    } catch (err) {
      showToast('Gagal mengaktifkan pengguna', 'error');
    }
  },

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};

export default KelolaUserPage;
