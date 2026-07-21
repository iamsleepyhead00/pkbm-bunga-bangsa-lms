/**
 * materi.js — Page controller for Material management
 * Handles: init, render, CRUD actions, file upload, drag-drop reorder, access tracking
 * Used by: pages/guru/materi-form.html, pages/siswa/materi.html, kursus-detail.html (tab)
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7
 */

import Auth from '../auth.js';
import dataService from '../data-service.js';
import { showToast, showConfirm, showLoading, hideLoading } from '../components.js';
import { escapeHtml, formatDate } from '../utils.js';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const MateriPage = {
  courseId: null,
  materials: [],
  currentMaterial: null,
  draggedItem: null,

  // ==================== Guru: Material Tab in kursus-detail ====================

  /**
   * Render material list for Guru inside kursus-detail tab
   */
  async renderGuruTab(courseId, container) {
    this.courseId = courseId;
    this.materials = await dataService.getMaterials(courseId);

    let html = `
      <div class="material-tab-header flex justify-between items-center mb-lg">
        <h4>Materi Pembelajaran</h4>
        <a href="/pages/guru/materi-form.html?courseId=${escapeHtml(courseId)}" class="btn btn-primary">
          <i class="ri-add-line"></i> Tambah Materi
        </a>
      </div>`;

    if (this.materials.length === 0) {
      html += `<div class="empty-state text-center" style="padding:2rem">
        <i class="ri-file-text-line" style="font-size:3rem;color:var(--gray-300)"></i>
        <p style="margin-top:1rem;color:var(--text-muted)">Belum ada materi. Klik "Tambah Materi" untuk memulai.</p>
      </div>`;
    } else {
      html += `<div class="material-list" id="materialList">`;
      for (const mat of this.materials) {
        html += this.renderMaterialItem(mat, 'guru');
      }
      html += `</div>`;
    }

    container.innerHTML = html;
    this.bindGuruTabEvents(container);
  },

  /**
   * Render a single material item row
   */
  renderMaterialItem(mat, role) {
    const iconMap = { TEKS: 'ri-file-text-line', FILE: 'ri-file-download-line', LINK: 'ri-link' };
    const iconClass = mat.tipe === 'FILE' ? 'file' : mat.tipe === 'LINK' ? 'link' : 'teks';
    const icon = iconMap[mat.tipe] || 'ri-file-text-line';
    const statusBadge = mat.published
      ? '<span class="badge badge-success">Published</span>'
      : '<span class="badge badge-gray">Draft</span>';

    if (role === 'guru') {
      return `<div class="material-item" data-id="${escapeHtml(mat.id)}" draggable="true">
        <div class="material-drag" title="Seret untuk mengatur urutan"><i class="ri-draggable"></i></div>
        <div class="material-icon ${iconClass}"><i class="${icon}"></i></div>
        <div class="material-info">
          <div class="material-title">${escapeHtml(mat.judul)}</div>
          <div class="material-desc">${escapeHtml(mat.deskripsi || '-')}</div>
        </div>
        <div class="material-status">${statusBadge}</div>
        <div class="material-actions">
          <a href="/pages/guru/materi-form.html?courseId=${escapeHtml(mat.courseId)}&id=${escapeHtml(mat.id)}" class="btn btn-sm btn-secondary" title="Edit">
            <i class="ri-edit-line"></i>
          </a>
          <button class="btn btn-sm btn-danger-outline btn-delete-material" data-id="${escapeHtml(mat.id)}" title="Hapus">
            <i class="ri-delete-bin-line"></i>
          </button>
        </div>
      </div>`;
    }

    // Siswa view
    return `<div class="material-item" data-id="${escapeHtml(mat.id)}">
      <div class="material-icon ${iconClass}"><i class="${icon}"></i></div>
      <div class="material-info">
        <div class="material-title">${escapeHtml(mat.judul)}</div>
        <div class="material-desc">${escapeHtml(mat.deskripsi || '-')}</div>
      </div>
      <div class="material-status">
        <i class="ri-arrow-right-s-line" style="font-size:1.25rem;color:var(--text-light)"></i>
      </div>
    </div>`;
  },

  /**
   * Bind events for Guru material tab (delete, drag-drop reorder)
   */
  bindGuruTabEvents(container) {
    // Delete buttons
    container.querySelectorAll('.btn-delete-material').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const id = btn.dataset.id;
        const confirmed = await showConfirm('Hapus materi ini? Tindakan ini tidak bisa dibatalkan.');
        if (confirmed) {
          await dataService.deleteMaterial(id);
          showToast('Materi berhasil dihapus', 'success');
          this.renderGuruTab(this.courseId, container);
        }
      });
    });

    // Drag and drop reordering
    this.initDragDrop(container);
  },

  /**
   * Initialize drag-and-drop reordering
   */
  initDragDrop(container) {
    const list = container.querySelector('#materialList');
    if (!list) return;

    const items = list.querySelectorAll('.material-item');
    items.forEach(item => {
      item.addEventListener('dragstart', (e) => {
        this.draggedItem = item;
        item.style.opacity = '0.5';
        e.dataTransfer.effectAllowed = 'move';
      });

      item.addEventListener('dragend', () => {
        item.style.opacity = '1';
        this.draggedItem = null;
        list.querySelectorAll('.material-item').forEach(el => el.classList.remove('drag-over'));
      });

      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        item.classList.add('drag-over');
      });

      item.addEventListener('dragleave', () => {
        item.classList.remove('drag-over');
      });

      item.addEventListener('drop', async (e) => {
        e.preventDefault();
        item.classList.remove('drag-over');
        if (this.draggedItem && this.draggedItem !== item) {
          // Reorder in DOM
          const allItems = [...list.querySelectorAll('.material-item')];
          const fromIndex = allItems.indexOf(this.draggedItem);
          const toIndex = allItems.indexOf(item);

          if (fromIndex < toIndex) {
            list.insertBefore(this.draggedItem, item.nextSibling);
          } else {
            list.insertBefore(this.draggedItem, item);
          }

          // Save new order
          const newOrder = [...list.querySelectorAll('.material-item')].map(el => el.dataset.id);
          await dataService.reorderMaterials(this.courseId, newOrder);
          showToast('Urutan materi diperbarui', 'success');
        }
      });
    });
  },

  // ==================== Guru: Form Page ====================

  /**
   * Initialize the materi-form page (create or edit mode)
   */
  async initForm() {
    const params = new URLSearchParams(window.location.search);
    this.courseId = params.get('courseId');
    const materialId = params.get('id');

    if (!this.courseId) {
      window.location.href = '/pages/guru/kursus.html';
      return;
    }

    if (materialId) {
      // Edit mode
      const materials = await dataService.getMaterials(this.courseId);
      this.currentMaterial = materials.find(m => m.id === materialId);
      if (!this.currentMaterial) {
        showToast('Materi tidak ditemukan', 'error');
        window.location.href = `/pages/guru/kursus-detail.html?id=${this.courseId}`;
        return;
      }
    }

    this.renderForm();
    this.bindFormEvents();
  },

  /**
   * Render the material form
   */
  renderForm() {
    const isEdit = !!this.currentMaterial;
    const mat = this.currentMaterial || {};
    const title = isEdit ? 'Edit Materi' : 'Tambah Materi Baru';
    const selectedTipe = mat.tipe || 'TEKS';
    const isPublished = mat.published === true;

    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = `
      <div class="form-page">
        <div class="page-header">
          <a href="/pages/guru/kursus-detail.html?id=${escapeHtml(this.courseId)}" class="btn-back">
            <i class="ri-arrow-left-line"></i> Kembali ke Kursus
          </a>
        </div>
        <div class="card">
          <div class="card-header"><h3>${title}</h3></div>
          <div class="card-body">
            <form id="materiForm" novalidate>
              <div class="form-group">
                <label class="form-label" for="materiJudul">Judul Materi <span class="required">*</span></label>
                <input type="text" class="form-input" id="materiJudul" name="judul" value="${escapeHtml(mat.judul || '')}" required placeholder="Masukkan judul materi">
              </div>
              <div class="form-group">
                <label class="form-label" for="materiDeskripsi">Deskripsi</label>
                <textarea class="form-textarea" id="materiDeskripsi" name="deskripsi" rows="3" placeholder="Deskripsi singkat tentang materi">${escapeHtml(mat.deskripsi || '')}</textarea>
              </div>

              <div class="form-group">
                <label class="form-label" for="materiTipe">Tipe Materi <span class="required">*</span></label>
                <select class="form-select" id="materiTipe" name="tipe">
                  <option value="TEKS" ${selectedTipe === 'TEKS' ? 'selected' : ''}>Teks</option>
                  <option value="FILE" ${selectedTipe === 'FILE' ? 'selected' : ''}>File Upload</option>
                  <option value="LINK" ${selectedTipe === 'LINK' ? 'selected' : ''}>Link URL</option>
                </select>
              </div>

              <!-- Dynamic content area based on tipe -->
              <div id="dynamicContent"></div>

              <div class="form-group">
                <label class="form-label">Status Publikasi</label>
                <div class="toggle-container">
                  <label class="toggle-switch">
                    <input type="checkbox" id="materiPublished" name="published" ${isPublished ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                  </label>
                  <span class="toggle-label" id="publishLabel">${isPublished ? 'Published — Siswa dapat melihat' : 'Draft — Belum terlihat siswa'}</span>
                </div>
              </div>

              <div class="form-actions" style="display:flex;gap:0.5rem;margin-top:1.5rem">
                <button type="submit" class="btn btn-primary">
                  <i class="ri-save-line"></i> ${isEdit ? 'Simpan Perubahan' : 'Simpan Materi'}
                </button>
                <a href="/pages/guru/kursus-detail.html?id=${escapeHtml(this.courseId)}" class="btn btn-secondary">Batal</a>
              </div>
            </form>
          </div>
        </div>
      </div>`;

    // Render dynamic content for selected tipe
    this.renderDynamicContent(selectedTipe);
  },

  /**
   * Render dynamic content fields based on material type
   */
  renderDynamicContent(tipe) {
    const container = document.getElementById('dynamicContent');
    if (!container) return;
    const mat = this.currentMaterial || {};

    if (tipe === 'TEKS') {
      container.innerHTML = `
        <div class="form-group">
          <label class="form-label" for="materiKonten">Konten Materi <span class="required">*</span></label>
          <textarea class="form-textarea" id="materiKonten" name="konten" rows="10" placeholder="Tulis konten materi di sini...">${escapeHtml(mat.konten || '')}</textarea>
        </div>`;
    } else if (tipe === 'FILE') {
      const hasFile = mat.fileName;
      container.innerHTML = `
        <div class="form-group">
          <label class="form-label">Upload File <span class="required">*</span></label>
          <div class="file-upload-zone" id="fileUploadZone" role="button" tabindex="0" aria-label="Area upload file">
            <i class="ri-upload-cloud-line"></i>
            <div class="file-upload-text">
              <strong>Klik atau seret file ke sini</strong>
            </div>
            <div class="file-upload-hint">PDF, DOC, PPT, Gambar · Maks. 10MB</div>
            <input type="file" id="materiFile" hidden accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.gif">
          </div>
          <div id="filePreview" class="${hasFile ? '' : 'hidden'}">
            <div class="file-info-card">
              <i class="ri-file-line"></i>
              <span id="fileNameDisplay">${escapeHtml(mat.fileName || '')}</span>
              <span id="fileSizeDisplay" class="text-muted">${mat.fileSize ? formatFileSize(mat.fileSize) : ''}</span>
              <button type="button" class="btn btn-sm btn-danger-outline" id="btnRemoveFile"><i class="ri-close-line"></i></button>
            </div>
          </div>
          <div id="fileError" class="form-error hidden"></div>
        </div>`;

      this.bindFileUploadEvents();
    } else if (tipe === 'LINK') {
      container.innerHTML = `
        <div class="form-group">
          <label class="form-label" for="materiLink">URL Link <span class="required">*</span></label>
          <input type="url" class="form-input" id="materiLink" name="konten" value="${escapeHtml(mat.konten || '')}" placeholder="https://contoh.com/materi">
          <small class="form-hint"><i class="ri-information-line"></i> Masukkan URL lengkap termasuk https://</small>
        </div>`;
    }
  },

  /**
   * Bind file upload events (click, drag-drop)
   */
  bindFileUploadEvents() {
    const zone = document.getElementById('fileUploadZone');
    const fileInput = document.getElementById('materiFile');
    const removeBtn = document.getElementById('btnRemoveFile');

    if (!zone || !fileInput) return;

    // Click to upload
    zone.addEventListener('click', () => fileInput.click());
    zone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
    });

    // File input change
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) this.handleFileSelect(e.target.files[0]);
    });

    // Drag and drop
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag-active'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-active'));
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('drag-active');
      if (e.dataTransfer.files.length > 0) this.handleFileSelect(e.dataTransfer.files[0]);
    });

    // Remove file
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        this.selectedFile = null;
        document.getElementById('filePreview').classList.add('hidden');
        document.getElementById('fileUploadZone').classList.remove('hidden');
      });
    }
  },

  selectedFile: null,

  /**
   * Handle file selection — validate size and show preview
   */
  handleFileSelect(file) {
    const errorEl = document.getElementById('fileError');
    errorEl.classList.add('hidden');

    if (file.size > MAX_FILE_SIZE) {
      errorEl.textContent = 'Ukuran file melebihi batas maksimal 10 MB';
      errorEl.classList.remove('hidden');
      return;
    }

    this.selectedFile = file;
    document.getElementById('fileNameDisplay').textContent = file.name;
    document.getElementById('fileSizeDisplay').textContent = formatFileSize(file.size);
    document.getElementById('filePreview').classList.remove('hidden');
  },

  /**
   * Bind all form events
   */
  bindFormEvents() {
    // Tipe change → update dynamic content
    const tipeSelect = document.getElementById('materiTipe');
    if (tipeSelect) {
      tipeSelect.addEventListener('change', (e) => {
        this.renderDynamicContent(e.target.value);
      });
    }

    // Published toggle label update
    const publishCheck = document.getElementById('materiPublished');
    if (publishCheck) {
      publishCheck.addEventListener('change', () => {
        const label = document.getElementById('publishLabel');
        label.textContent = publishCheck.checked
          ? 'Published — Siswa dapat melihat'
          : 'Draft — Belum terlihat siswa';
      });
    }

    // Form submit
    const form = document.getElementById('materiForm');
    if (form) {
      form.addEventListener('submit', (e) => { e.preventDefault(); this.handleSave(); });
    }
  },

  /**
   * Handle form save (create or update material)
   */
  async handleSave() {
    const judul = document.getElementById('materiJudul').value.trim();
    const deskripsi = document.getElementById('materiDeskripsi').value.trim();
    const tipe = document.getElementById('materiTipe').value;
    const published = document.getElementById('materiPublished').checked;

    // Validation
    if (!judul) {
      showToast('Judul materi wajib diisi', 'error');
      document.getElementById('materiJudul').focus();
      return;
    }

    let konten = '';
    let fileData = null;
    let fileName = null;
    let fileSize = null;

    if (tipe === 'TEKS') {
      konten = document.getElementById('materiKonten').value.trim();
      if (!konten) { showToast('Konten materi wajib diisi', 'error'); return; }
    } else if (tipe === 'FILE') {
      if (this.selectedFile) {
        // Read file as base64
        fileData = await readFileAsBase64(this.selectedFile);
        fileName = this.selectedFile.name;
        fileSize = this.selectedFile.size;
      } else if (this.currentMaterial && this.currentMaterial.fileData) {
        // Keep existing file
        fileData = this.currentMaterial.fileData;
        fileName = this.currentMaterial.fileName;
        fileSize = this.currentMaterial.fileSize;
      } else {
        showToast('File wajib diupload', 'error');
        return;
      }
    } else if (tipe === 'LINK') {
      konten = document.getElementById('materiLink').value.trim();
      if (!konten) { showToast('URL link wajib diisi', 'error'); return; }
      if (!konten.startsWith('http://') && !konten.startsWith('https://')) {
        showToast('URL harus dimulai dengan http:// atau https://', 'error');
        return;
      }
    }

    const data = { courseId: this.courseId, judul, deskripsi, tipe, konten, fileData, fileName, fileSize, published };

    try {
      let result;
      if (this.currentMaterial) {
        result = await dataService.updateMaterial(this.currentMaterial.id, data);
      } else {
        result = await dataService.createMaterial(data);
      }

      if (result && result.error) {
        showToast(result.error, 'error');
        return;
      }

      showToast(this.currentMaterial ? 'Materi berhasil diperbarui' : 'Materi berhasil ditambahkan', 'success');

      // Notify enrolled students if publishing new material
      if (published && !this.currentMaterial) {
        await this.notifyStudents(result);
      }

      setTimeout(() => {
        window.location.href = `/pages/guru/kursus-detail.html?id=${this.courseId}`;
      }, 500);
    } catch (err) {
      console.error('Error saving material:', err);
      showToast('Gagal menyimpan materi', 'error');
    }
  },

  /**
   * Notify enrolled students about new material
   */
  async notifyStudents(material) {
    try {
      const students = await dataService.getCourseStudents(this.courseId);
      const course = await dataService.getCourseById(this.courseId);
      for (const student of students) {
        await dataService.createNotification({
          userId: student.id,
          tipe: 'MATERI_BARU',
          pesan: `Materi baru "${material.judul}" di kursus ${course.nama}`,
          link: `/pages/siswa/materi.html?courseId=${this.courseId}`
        });
      }
    } catch (err) {
      console.error('Error notifying students:', err);
    }
  },

  // ==================== Siswa: Material List Page ====================

  /**
   * Initialize the siswa materi page
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

    // Load published materials only
    this.materials = await dataService.getMaterials(this.courseId, { publishedOnly: true });
    this.renderSiswaPage(course);
    this.bindSiswaEvents(session);
  },

  /**
   * Render the siswa materials page
   */
  renderSiswaPage(course) {
    const mainContent = document.getElementById('mainContent');
    let html = `
      <div class="page-header">
        <a href="/pages/siswa/kursus.html" class="btn-back"><i class="ri-arrow-left-line"></i> Kembali</a>
        <h2 class="page-title">${escapeHtml(course.nama)}</h2>
        <p class="page-subtitle">Materi Pembelajaran</p>
      </div>`;

    if (this.materials.length === 0) {
      html += `<div class="empty-state text-center" style="padding:3rem">
        <i class="ri-file-text-line" style="font-size:3rem;color:var(--gray-300)"></i>
        <p style="margin-top:1rem;color:var(--text-muted)">Belum ada materi tersedia untuk kursus ini.</p>
      </div>`;
    } else {
      html += `<div class="material-list">`;
      for (const mat of this.materials) {
        html += this.renderMaterialItem(mat, 'siswa');
      }
      html += `</div>`;
      html += `<div id="materialDetail" class="material-detail-panel hidden"></div>`;
    }

    mainContent.innerHTML = html;
  },

  /**
   * Bind siswa page events — click to view material + record access
   */
  bindSiswaEvents(session) {
    document.querySelectorAll('.material-item').forEach(item => {
      item.addEventListener('click', async () => {
        const matId = item.dataset.id;
        const mat = this.materials.find(m => m.id === matId);
        if (!mat) return;

        // Record access (Requirement 3.7)
        await dataService.recordMaterialAccess(matId, session.userId);

        // Show material content
        this.showMaterialDetail(mat);
      });
    });
  },

  /**
   * Show expanded material detail for siswa
   */
  showMaterialDetail(mat) {
    const detailPanel = document.getElementById('materialDetail');
    if (!detailPanel) return;

    let contentHtml = '';
    if (mat.tipe === 'TEKS') {
      contentHtml = `<div class="material-content-text">${escapeHtml(mat.konten).replace(/\n/g, '<br>')}</div>`;
    } else if (mat.tipe === 'FILE') {
      contentHtml = `
        <div class="material-content-file">
          <div class="file-info-card">
            <i class="ri-file-download-line" style="font-size:1.5rem;color:var(--primary)"></i>
            <div>
              <strong>${escapeHtml(mat.fileName)}</strong>
              <small class="text-muted">${mat.fileSize ? formatFileSize(mat.fileSize) : ''}</small>
            </div>
            <button class="btn btn-primary btn-sm" id="btnDownloadFile" data-id="${escapeHtml(mat.id)}">
              <i class="ri-download-line"></i> Download
            </button>
          </div>
        </div>`;
    } else if (mat.tipe === 'LINK') {
      contentHtml = `
        <div class="material-content-link">
          <a href="${escapeHtml(mat.konten)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary">
            <i class="ri-external-link-line"></i> Buka Link Materi
          </a>
          <p class="text-muted mt-sm" style="font-size:var(--text-xs);word-break:break-all">${escapeHtml(mat.konten)}</p>
        </div>`;
    }

    detailPanel.innerHTML = `
      <div class="card" style="margin-top:var(--space-lg)">
        <div class="card-header" style="display:flex;justify-content:space-between;align-items:center">
          <h4>${escapeHtml(mat.judul)}</h4>
          <button class="btn btn-sm btn-secondary" id="btnCloseDetail"><i class="ri-close-line"></i> Tutup</button>
        </div>
        <div class="card-body">
          ${mat.deskripsi ? `<p class="text-muted mb-base">${escapeHtml(mat.deskripsi)}</p>` : ''}
          ${contentHtml}
        </div>
      </div>`;
    detailPanel.classList.remove('hidden');

    // Scroll to detail
    detailPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Close button
    document.getElementById('btnCloseDetail').addEventListener('click', () => {
      detailPanel.classList.add('hidden');
    });

    // Download button for file type
    const downloadBtn = document.getElementById('btnDownloadFile');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        this.downloadFile(mat);
      });
    }
  },

  /**
   * Trigger file download from base64 data
   */
  downloadFile(mat) {
    if (!mat.fileData) { showToast('File tidak tersedia', 'error'); return; }
    try {
      const link = document.createElement('a');
      link.href = mat.fileData;
      link.download = mat.fileName || 'file';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      showToast('Gagal mendownload file', 'error');
    }
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

export default MateriPage;
export { formatFileSize, readFileAsBase64 };
