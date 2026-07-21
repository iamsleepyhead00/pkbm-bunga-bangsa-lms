/**
 * components.js — Reusable UI Components
 * Layout: Sidebar, Header, Mobile Nav
 * Utility: Toast, Loading
 * 
 * All render functions return HTML strings for innerHTML injection.
 * initLayout() renders sidebar + header and binds mobile nav events.
 */

import Auth from './auth.js';

// ============================================================
// Navigation Configuration per Role
// ============================================================

const NAV_ITEMS = {
  GURU: [
    { id: 'dashboard', label: 'Dashboard', icon: 'ri-dashboard-line', href: '/pages/guru/dashboard.html' },
    { id: 'kursus', label: 'Kursus', icon: 'ri-book-open-line', href: '/pages/guru/kursus.html' },
    { id: 'nilai', label: 'Nilai', icon: 'ri-file-list-3-line', href: '/pages/guru/nilai.html' },
    { id: 'forum', label: 'Forum', icon: 'ri-discuss-line', href: '/pages/guru/forum.html' },
    { id: 'profil', label: 'Profil', icon: 'ri-user-settings-line', href: '/pages/guru/profil.html' }
  ],
  SISWA: [
    { id: 'dashboard', label: 'Dashboard', icon: 'ri-dashboard-line', href: '/pages/siswa/dashboard.html' },
    { id: 'kursus', label: 'Kursus', icon: 'ri-book-open-line', href: '/pages/siswa/kursus.html' },
    { id: 'nilai', label: 'Nilai', icon: 'ri-file-list-3-line', href: '/pages/siswa/nilai.html' },
    { id: 'forum', label: 'Forum', icon: 'ri-discuss-line', href: '/pages/siswa/forum.html' },
    { id: 'profil', label: 'Profil', icon: 'ri-user-settings-line', href: '/pages/siswa/profil.html' }
  ],
  ADMIN: [
    { id: 'dashboard', label: 'Dashboard', icon: 'ri-dashboard-line', href: '/pages/admin/dashboard.html' },
    { id: 'kelola-user', label: 'Kelola User', icon: 'ri-group-line', href: '/pages/admin/kelola-user.html' },
    { id: 'profil', label: 'Profil', icon: 'ri-user-settings-line', href: '/pages/admin/profil.html' }
  ]
};

// ============================================================
// Layout Components
// ============================================================

/**
 * Render sidebar navigation
 * @param {string} role - User role (GURU, SISWA, ADMIN)
 * @param {string} activePage - Current active page id (e.g. 'dashboard', 'kursus')
 * @returns {string} HTML string
 */
function renderSidebar(role, activePage) {
  const items = NAV_ITEMS[role] || [];
  const session = JSON.parse(localStorage.getItem('pkbm_lms_session') || '{}');
  const userName = session.nama || 'User';
  const userRole = role || 'USER';
  const initial = userName.charAt(0).toUpperCase();

  const navItemsHtml = items.map(item => {
    const activeClass = item.id === activePage ? ' active' : '';
    return `<a href="${item.href}" class="nav-item${activeClass}" data-page="${item.id}">
      <i class="${item.icon}"></i>
      <span>${item.label}</span>
    </a>`;
  }).join('\n');

  return `<aside class="sidebar" id="sidebar">
  <div class="sidebar-header">
    <img src="/assets/logo.png" alt="Logo PKBM" class="sidebar-logo" onerror="this.style.display='none'">
    <div class="sidebar-brand">
      PKBM Bunga Bangsa
      <small>LMS</small>
    </div>
    <button class="sidebar-close-btn hamburger-btn" id="sidebarCloseBtn" aria-label="Tutup menu">
      <i class="ri-close-line"></i>
    </button>
  </div>
  <nav class="sidebar-nav" aria-label="Menu navigasi utama">
    ${navItemsHtml}
  </nav>
  <div class="sidebar-footer">
    <div class="sidebar-user">
      <div class="avatar avatar-sm" aria-hidden="true">${initial}</div>
      <div class="sidebar-user-info">
        <div class="sidebar-user-name">${escapeHtml(userName)}</div>
        <div class="sidebar-user-role">${userRole}</div>
      </div>
    </div>
  </div>
</aside>`;
}

/**
 * Render app header with hamburger, page title, notification, and user actions
 * @param {object} user - User session object { nama, role, userId }
 * @param {object} [options] - Optional config { pageTitle, notificationCount }
 * @returns {string} HTML string
 */
function renderHeader(user, options = {}) {
  const { pageTitle = '', notificationCount = 0 } = options;
  const userName = (user && user.nama) || 'User';
  const initial = userName.charAt(0).toUpperCase();

  const badgeHtml = notificationCount > 0
    ? `<span class="notification-badge">${notificationCount > 99 ? '99+' : notificationCount}</span>`
    : '';

  return `<header class="app-header" role="banner">
  <button class="hamburger-btn" id="hamburgerBtn" aria-label="Buka menu navigasi" aria-expanded="false">
    <i class="ri-menu-line"></i>
  </button>
  <h1 class="header-title">${escapeHtml(pageTitle)}</h1>
  <div class="header-actions">
    <button class="header-notification" id="notificationBtn" aria-label="Notifikasi${notificationCount > 0 ? ` (${notificationCount} baru)` : ''}">
      <i class="ri-notification-3-line"></i>
      ${badgeHtml}
    </button>
    <div class="header-user-menu" id="headerUserMenu">
      <button class="avatar avatar-sm header-avatar-btn" id="headerAvatarBtn" aria-label="Menu pengguna" aria-expanded="false">
        ${initial}
      </button>
      <div class="header-dropdown" id="headerDropdown" hidden>
        <div class="header-dropdown-info">
          <strong>${escapeHtml(userName)}</strong>
        </div>
        <hr>
        <button class="header-dropdown-item" id="logoutBtn">
          <i class="ri-logout-box-r-line"></i>
          <span>Keluar</span>
        </button>
      </div>
    </div>
  </div>
</header>`;
}

/**
 * Render mobile overlay for sidebar
 * @returns {string} HTML string
 */
function renderMobileNav() {
  return `<div class="sidebar-overlay" id="sidebarOverlay" aria-hidden="true"></div>`;
}

// ============================================================
// Toast Notification
// ============================================================

/**
 * Show a toast notification
 * @param {string} message - Toast message
 * @param {string} [type='info'] - Type: 'success', 'error', 'warning', 'info'
 */
function showToast(message, type = 'info') {
  // Get or create toast container
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'true');
    document.body.appendChild(container);
  }

  const iconMap = {
    success: 'ri-checkbox-circle-line',
    error: 'ri-error-warning-line',
    warning: 'ri-alert-line',
    info: 'ri-information-line'
  };

  const icon = iconMap[type] || iconMap.info;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `
    <i class="${icon}"></i>
    <span class="toast-message">${escapeHtml(message)}</span>
    <button class="toast-close" aria-label="Tutup notifikasi">&times;</button>
  `;

  container.appendChild(toast);

  // Auto-dismiss after 4 seconds
  const timer = setTimeout(() => {
    removeToast(toast);
  }, 4000);

  // Close button
  toast.querySelector('.toast-close').addEventListener('click', () => {
    clearTimeout(timer);
    removeToast(toast);
  });
}

function removeToast(toast) {
  toast.classList.add('toast-exit');
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 300);
}

// ============================================================
// Loading Indicator
// ============================================================

/**
 * Show loading spinner inside a container
 * @param {HTMLElement|string} container - DOM element or selector
 */
function showLoading(container) {
  const el = typeof container === 'string' ? document.querySelector(container) : container;
  if (!el) return;

  // Store original content
  if (!el.dataset.originalContent) {
    el.dataset.originalContent = el.innerHTML;
  }

  el.innerHTML = `<div class="loading-spinner" role="status" aria-label="Memuat...">
    <div class="spinner"></div>
    <span class="loading-text">Memuat...</span>
  </div>`;
}

/**
 * Hide loading spinner and restore original content
 * @param {HTMLElement|string} container - DOM element or selector
 */
function hideLoading(container) {
  const el = typeof container === 'string' ? document.querySelector(container) : container;
  if (!el) return;

  if (el.dataset.originalContent) {
    el.innerHTML = el.dataset.originalContent;
    delete el.dataset.originalContent;
  } else {
    // Just remove the spinner
    const spinner = el.querySelector('.loading-spinner');
    if (spinner) {
      spinner.remove();
    }
  }
}

// ============================================================
// Layout Initialization
// ============================================================

/**
 * Initialize the page layout: render sidebar, header, overlay, and bind mobile nav events
 * @param {string} role - User role (GURU, SISWA, ADMIN)
 * @param {string} activePage - Current active page id
 * @param {object} [options] - { pageTitle, notificationCount }
 */
function initLayout(role, activePage, options = {}) {
  const session = JSON.parse(localStorage.getItem('pkbm_lms_session') || '{}');
  const user = { nama: session.nama, role: session.role, userId: session.userId };

  // Render sidebar
  const sidebarTarget = document.getElementById('sidebarContainer');
  if (sidebarTarget) {
    sidebarTarget.innerHTML = renderSidebar(role, activePage);
  } else {
    // Insert sidebar at the beginning of body or .app-layout
    const appLayout = document.querySelector('.app-layout');
    if (appLayout) {
      appLayout.insertAdjacentHTML('afterbegin', renderMobileNav() + renderSidebar(role, activePage));
    }
  }

  // Render header
  const headerTarget = document.getElementById('headerContainer');
  if (headerTarget) {
    headerTarget.innerHTML = renderHeader(user, options);
  } else {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
      sidebar.insertAdjacentHTML('afterend', renderHeader(user, options));
    }
  }

  // Render overlay if not already present
  if (!document.getElementById('sidebarOverlay')) {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
      sidebar.insertAdjacentHTML('beforebegin', renderMobileNav());
    }
  }

  // Bind mobile nav events
  bindMobileNavEvents();

  // Bind header events
  bindHeaderEvents();
}

/**
 * Bind hamburger toggle, sidebar close, and overlay close events
 */
function bindMobileNavEvents() {
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const closeBtn = document.getElementById('sidebarCloseBtn');

  if (hamburgerBtn && sidebar) {
    hamburgerBtn.addEventListener('click', () => {
      openSidebar();
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      closeSidebar();
    });
  }

  if (overlay) {
    overlay.addEventListener('click', () => {
      closeSidebar();
    });
  }

  // Close sidebar on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebar && sidebar.classList.contains('open')) {
      closeSidebar();
    }
  });
}

/**
 * Open sidebar (mobile)
 */
function openSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const hamburgerBtn = document.getElementById('hamburgerBtn');

  if (sidebar) {
    sidebar.classList.add('open');
  }
  if (overlay) {
    overlay.classList.add('active');
  }
  if (hamburgerBtn) {
    hamburgerBtn.setAttribute('aria-expanded', 'true');
  }
}

/**
 * Close sidebar (mobile)
 */
function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const hamburgerBtn = document.getElementById('hamburgerBtn');

  if (sidebar) {
    sidebar.classList.remove('open');
  }
  if (overlay) {
    overlay.classList.remove('active');
  }
  if (hamburgerBtn) {
    hamburgerBtn.setAttribute('aria-expanded', 'false');
  }
}

/**
 * Bind header actions: user dropdown toggle, logout
 */
function bindHeaderEvents() {
  const avatarBtn = document.getElementById('headerAvatarBtn');
  const dropdown = document.getElementById('headerDropdown');
  const logoutBtn = document.getElementById('logoutBtn');

  // Toggle user dropdown
  if (avatarBtn && dropdown) {
    avatarBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = !dropdown.hidden;
      dropdown.hidden = isOpen;
      avatarBtn.setAttribute('aria-expanded', String(!isOpen));
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!dropdown.hidden && !dropdown.contains(e.target) && e.target !== avatarBtn) {
        dropdown.hidden = true;
        avatarBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      Auth.logout();
      window.location.href = '/login.html';
    });
  }
}

// ============================================================
// Utilities (internal)
// ============================================================

/**
 * Escape HTML to prevent XSS
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ============================================================
// Widget Components
// ============================================================

/**
 * Render a progress bar
 * @param {number} percentage - Progress percentage (0-100)
 * @param {object} [options] - { size: 'sm'|'lg', color: 'success'|'warning'|'danger', showLabel: boolean }
 * @returns {string} HTML string
 */
function renderProgressBar(percentage, options = {}) {
  const { size, color, showLabel = false } = options;
  const pct = Math.max(0, Math.min(100, Math.round(percentage)));
  const sizeClass = size === 'sm' ? ' progress-sm' : size === 'lg' ? ' progress-lg' : '';
  const colorClass = color ? ` ${color}` : '';

  if (showLabel) {
    return `<div class="progress-wrapper">
  <div class="progress${sizeClass}">
    <div class="progress-bar${colorClass}" style="width: ${pct}%" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"></div>
  </div>
  <span class="progress-label">${pct}%</span>
</div>`;
  }

  return `<div class="progress${sizeClass}">
  <div class="progress-bar${colorClass}" style="width: ${pct}%" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"></div>
</div>`;
}

/**
 * Render a course card
 * @param {object} course - Course object { id, nama, program, kelas, mataPelajaran, aktif }
 * @param {string} role - User role (GURU or SISWA)
 * @param {object} [extra] - Extra data { studentCount, progress, latestGrade }
 * @returns {string} HTML string
 */
function renderCourseCard(course, role, extra = {}) {
  const programLabels = {
    PAKET_A: 'Paket A',
    PAKET_B: 'Paket B',
    PAKET_C: 'Paket C'
  };
  const programLabel = programLabels[course.program] || course.program;

  const statusHtml = course.aktif === false
    ? `<span class="badge badge-gray">Nonaktif</span>`
    : '';

  let footerHtml = '';
  if (role === 'GURU') {
    const count = extra.studentCount != null ? extra.studentCount : 0;
    const statusText = course.aktif !== false ? 'Aktif' : 'Nonaktif';
    const statusColor = course.aktif !== false ? 'success' : 'gray';
    footerHtml = `<span class="course-students"><i class="ri-group-line"></i> ${count} siswa</span>
    <span class="badge badge-${statusColor}">${statusText}</span>`;
  } else {
    // SISWA: show progress + latest grade
    const progress = extra.progress != null ? extra.progress : 0;
    const gradeHtml = extra.latestGrade != null
      ? `<span class="course-grade">Nilai: ${extra.latestGrade}</span>`
      : '';
    footerHtml = `<div class="course-progress-info">
      ${renderProgressBar(progress, { size: 'sm', showLabel: true })}
    </div>
    ${gradeHtml}`;
  }

  return `<div class="card course-card" data-course-id="${escapeHtml(course.id)}">
  <div class="course-card-body">
    <div class="course-card-badges">
      <span class="badge badge-primary">${escapeHtml(programLabel)}</span>
      ${statusHtml}
    </div>
    <h4 class="course-card-title">${escapeHtml(course.nama)}</h4>
    <p class="course-card-meta">${escapeHtml(course.mataPelajaran)} — ${escapeHtml(course.kelas)}</p>
  </div>
  <div class="course-card-footer">
    ${footerHtml}
  </div>
</div>`;
}

/**
 * Render notification badge with count (capped at 99+)
 * @param {number} count - Notification count
 * @returns {string} HTML string (empty string if count <= 0)
 */
function renderNotificationBadge(count) {
  if (!count || count <= 0) return '';
  const display = count > 99 ? '99+' : String(count);
  return `<span class="notification-badge">${display}</span>`;
}

/**
 * Render an inline status badge
 * @param {string} status - Status text
 * @param {string} [color='gray'] - Color variant: success, warning, danger, info, gray, primary
 * @returns {string} HTML string
 */
function renderStatusBadge(status, color = 'gray') {
  const validColors = ['success', 'warning', 'danger', 'info', 'gray', 'primary'];
  const safeColor = validColors.includes(color) ? color : 'gray';
  return `<span class="badge badge-${safeColor}">${escapeHtml(status)}</span>`;
}

// ============================================================
// Form Components
// ============================================================

/**
 * Render a <select> element
 * @param {Array<{value: string, label: string}>} options - Options array
 * @param {string} [selected] - Currently selected value
 * @param {object} [attrs] - Attributes { name, id, required, class, disabled }
 * @returns {string} HTML string
 */
function renderSelect(options, selected, attrs = {}) {
  const { name, id, required, class: className, disabled } = attrs;

  const attrParts = [];
  if (name) attrParts.push(`name="${escapeHtml(name)}"`);
  if (id) attrParts.push(`id="${escapeHtml(id)}"`);
  if (required) attrParts.push('required');
  if (disabled) attrParts.push('disabled');

  const classStr = className ? `form-select ${escapeHtml(className)}` : 'form-select';
  attrParts.unshift(`class="${classStr}"`);

  const optionsHtml = (options || []).map(opt => {
    const selectedAttr = opt.value === selected ? ' selected' : '';
    return `  <option value="${escapeHtml(opt.value)}"${selectedAttr}>${escapeHtml(opt.label)}</option>`;
  }).join('\n');

  return `<select ${attrParts.join(' ')}>
${optionsHtml}
</select>`;
}

/**
 * Render a file upload zone with drag-and-drop area
 * @param {object} [config] - { accept, maxSize, id }
 * @returns {string} HTML string
 */
function renderFileUpload(config = {}) {
  const { accept, maxSize, id } = config;
  const inputId = id || 'fileUpload';

  const acceptAttr = accept ? ` accept="${escapeHtml(accept)}"` : '';
  const typeHint = accept ? escapeHtml(accept) : 'Semua tipe file';
  const sizeHint = maxSize ? `Maks. ${maxSize}MB` : '';

  return `<div class="file-upload" id="${escapeHtml(inputId)}Zone" role="button" tabindex="0" aria-label="Area upload file">
  <i class="ri-upload-cloud-line"></i>
  <div class="file-upload-text">
    <strong>Klik untuk memilih file</strong> atau seret file ke sini
  </div>
  <div class="file-upload-hint">
    <span>${typeHint}</span>${sizeHint ? ` · <span>${sizeHint}</span>` : ''}
  </div>
  <input type="file" id="${escapeHtml(inputId)}" class="file-upload-input" hidden${acceptAttr}>
</div>`;
}

/**
 * Render a quiz question card
 * @param {object} question - Question object { id, tipe, pertanyaan, opsi, jawabanBenar, bobot, urutan }
 * @param {number} index - Question number (0-based)
 * @param {string} mode - 'edit' | 'play' | 'review'
 * @param {object} [state] - Optional state { jawaban, isCorrect } for review mode
 * @returns {string} HTML string
 */
function renderQuizQuestion(question, index, mode, state = {}) {
  const qNum = index + 1;
  const tipe = question.tipe || 'PILIHAN_GANDA';

  if (mode === 'edit') {
    return renderQuizQuestionEdit(question, qNum);
  } else if (mode === 'play') {
    return renderQuizQuestionPlay(question, qNum, tipe);
  } else if (mode === 'review') {
    return renderQuizQuestionReview(question, qNum, tipe, state);
  }

  return '';
}

function renderQuizQuestionEdit(question, qNum) {
  const tipe = question.tipe || 'PILIHAN_GANDA';
  const opsiHtml = tipe === 'PILIHAN_GANDA'
    ? (question.opsi || ['', '', '', '']).map((opsi, i) => {
        const checked = question.jawabanBenar === i ? ' checked' : '';
        return `<div class="quiz-option-edit">
      <input type="radio" name="jawaban_${escapeHtml(question.id)}" value="${i}"${checked}>
      <input type="text" class="form-input" value="${escapeHtml(opsi)}" placeholder="Opsi ${String.fromCharCode(65 + i)}" data-option-index="${i}">
    </div>`;
      }).join('\n')
    : '';

  return `<div class="card quiz-question-card" data-question-id="${escapeHtml(question.id)}">
  <div class="card-header">
    <span class="quiz-question-number">Soal ${qNum}</span>
    <span class="badge badge-${tipe === 'PILIHAN_GANDA' ? 'primary' : 'info'}">${tipe === 'PILIHAN_GANDA' ? 'Pilihan Ganda' : 'Esai'}</span>
  </div>
  <div class="card-body">
    <div class="form-group">
      <label class="form-label">Pertanyaan</label>
      <textarea class="form-textarea" name="pertanyaan" rows="3">${escapeHtml(question.pertanyaan || '')}</textarea>
    </div>
    ${tipe === 'PILIHAN_GANDA' ? `<div class="form-group">
      <label class="form-label">Opsi Jawaban (pilih yang benar)</label>
      <div class="quiz-options-edit">
        ${opsiHtml}
      </div>
    </div>` : ''}
    <div class="form-group">
      <label class="form-label">Bobot Nilai</label>
      <input type="number" class="form-input" name="bobot" value="${question.bobot || 1}" min="1">
    </div>
  </div>
</div>`;
}

function renderQuizQuestionPlay(question, qNum, tipe) {
  let answerHtml = '';
  if (tipe === 'PILIHAN_GANDA') {
    const opsiItems = (question.opsi || []).map((opsi, i) => {
      const label = String.fromCharCode(65 + i);
      return `<label class="form-check quiz-option">
      <input type="radio" name="jawaban_${escapeHtml(question.id)}" value="${i}">
      <span class="quiz-option-label">${label}. ${escapeHtml(opsi)}</span>
    </label>`;
    }).join('\n');
    answerHtml = `<div class="quiz-options">${opsiItems}</div>`;
  } else {
    answerHtml = `<textarea class="form-textarea" name="jawaban_${escapeHtml(question.id)}" placeholder="Tulis jawaban Anda..." rows="4"></textarea>`;
  }

  return `<div class="card quiz-question-card" data-question-id="${escapeHtml(question.id)}">
  <div class="card-header">
    <span class="quiz-question-number">Soal ${qNum}</span>
    <span class="badge badge-gray">Bobot: ${question.bobot || 1}</span>
  </div>
  <div class="card-body">
    <p class="quiz-question-text">${escapeHtml(question.pertanyaan || '')}</p>
    ${answerHtml}
  </div>
</div>`;
}

function renderQuizQuestionReview(question, qNum, tipe, state) {
  const { jawaban, isCorrect } = state;
  const indicatorClass = isCorrect ? 'success' : 'danger';
  const indicatorIcon = isCorrect ? 'ri-checkbox-circle-line' : 'ri-close-circle-line';
  const indicatorText = isCorrect ? 'Benar' : 'Salah';

  let answerHtml = '';
  if (tipe === 'PILIHAN_GANDA') {
    const opsiItems = (question.opsi || []).map((opsi, i) => {
      const label = String.fromCharCode(65 + i);
      const isSelected = jawaban === i || jawaban === String(i);
      const isCorrectAnswer = question.jawabanBenar === i;
      let optionClass = '';
      if (isCorrectAnswer) optionClass = ' quiz-option-correct';
      else if (isSelected && !isCorrectAnswer) optionClass = ' quiz-option-wrong';
      const indicator = isSelected ? ' ●' : '';
      return `<div class="quiz-option-review${optionClass}">
      <span>${label}. ${escapeHtml(opsi)}${indicator}</span>
      ${isCorrectAnswer ? '<i class="ri-check-line"></i>' : ''}
    </div>`;
    }).join('\n');
    answerHtml = `<div class="quiz-options-review">${opsiItems}</div>`;
  } else {
    answerHtml = `<div class="quiz-answer-review">
      <label class="form-label">Jawaban Anda:</label>
      <p>${escapeHtml(jawaban || '(Tidak dijawab)')}</p>
    </div>`;
  }

  return `<div class="card quiz-question-card" data-question-id="${escapeHtml(question.id)}">
  <div class="card-header">
    <span class="quiz-question-number">Soal ${qNum}</span>
    <span class="badge badge-${indicatorClass}"><i class="${indicatorIcon}"></i> ${indicatorText}</span>
  </div>
  <div class="card-body">
    <p class="quiz-question-text">${escapeHtml(question.pertanyaan || '')}</p>
    ${answerHtml}
  </div>
</div>`;
}

// ============================================================
// Modal & Confirm Dialogs
// ============================================================

/**
 * Show a modal dialog
 * @param {string} title - Modal title
 * @param {string} content - Modal body HTML content
 * @param {Array<{label: string, type?: string, handler?: Function}>} [actions] - Footer action buttons
 */
function showModal(title, content, actions = []) {
  // Remove existing modal if any
  const existing = document.getElementById('appModal');
  if (existing) existing.remove();

  const actionsHtml = actions.map(action => {
    const btnClass = action.type === 'primary' ? 'btn btn-primary'
      : action.type === 'danger' ? 'btn btn-danger'
      : action.type === 'success' ? 'btn btn-success'
      : 'btn btn-secondary';
    return `<button class="${btnClass}" data-action="${escapeHtml(action.label)}">${escapeHtml(action.label)}</button>`;
  }).join('\n      ');

  const modalHtml = `<div class="modal-overlay active" id="appModal">
  <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
    <div class="modal-header">
      <h3 id="modalTitle">${escapeHtml(title)}</h3>
      <button class="modal-close" id="modalCloseBtn" aria-label="Tutup">
        <i class="ri-close-line"></i>
      </button>
    </div>
    <div class="modal-body">
      ${content}
    </div>
    ${actions.length > 0 ? `<div class="modal-footer">
      ${actionsHtml}
    </div>` : ''}
  </div>
</div>`;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const overlay = document.getElementById('appModal');
  const closeBtn = document.getElementById('modalCloseBtn');

  // Close on X button
  closeBtn.addEventListener('click', () => closeModal());

  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  // Close on Escape
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);

  // Bind action buttons
  actions.forEach(action => {
    if (action.handler) {
      const btn = overlay.querySelector(`[data-action="${action.label}"]`);
      if (btn) {
        btn.addEventListener('click', () => {
          action.handler();
          closeModal();
        });
      }
    }
  });
}

/**
 * Close and remove the active modal
 */
function closeModal() {
  const modal = document.getElementById('appModal');
  if (modal) {
    modal.classList.remove('active');
    setTimeout(() => {
      if (modal.parentNode) modal.parentNode.removeChild(modal);
    }, 300);
  }
}

/**
 * Show a confirmation dialog
 * @param {string} message - Confirmation message
 * @returns {Promise<boolean>} Resolves true on "Ya", false on "Batal"
 */
function showConfirm(message) {
  return new Promise((resolve) => {
    // Remove existing confirm
    const existing = document.getElementById('appConfirm');
    if (existing) existing.remove();

    const confirmHtml = `<div class="modal-overlay active confirm-dialog" id="appConfirm">
  <div class="modal" role="alertdialog" aria-modal="true" aria-labelledby="confirmTitle">
    <div class="modal-header">
      <h3 id="confirmTitle">Konfirmasi</h3>
      <button class="modal-close" id="confirmCloseBtn" aria-label="Tutup">
        <i class="ri-close-line"></i>
      </button>
    </div>
    <div class="modal-body">
      <p>${escapeHtml(message)}</p>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" id="confirmBatalBtn">Batal</button>
      <button class="btn btn-primary" id="confirmYaBtn">Ya</button>
    </div>
  </div>
</div>`;

    document.body.insertAdjacentHTML('beforeend', confirmHtml);

    const overlay = document.getElementById('appConfirm');
    const closeBtn = document.getElementById('confirmCloseBtn');
    const batalBtn = document.getElementById('confirmBatalBtn');
    const yaBtn = document.getElementById('confirmYaBtn');

    function cleanup(result) {
      overlay.classList.remove('active');
      setTimeout(() => {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      }, 300);
      document.removeEventListener('keydown', escHandler);
      resolve(result);
    }

    closeBtn.addEventListener('click', () => cleanup(false));
    batalBtn.addEventListener('click', () => cleanup(false));
    yaBtn.addEventListener('click', () => cleanup(true));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) cleanup(false);
    });

    const escHandler = (e) => {
      if (e.key === 'Escape') cleanup(false);
    };
    document.addEventListener('keydown', escHandler);
  });
}

// ============================================================
// Components Export
// ============================================================

const Components = {
  renderSidebar,
  renderHeader,
  renderMobileNav,
  showToast,
  showLoading,
  hideLoading,
  initLayout,
  openSidebar,
  closeSidebar,
  NAV_ITEMS,
  // Widget components
  renderProgressBar,
  renderCourseCard,
  renderNotificationBadge,
  renderStatusBadge,
  // Form components
  renderSelect,
  renderFileUpload,
  renderQuizQuestion,
  // Modal & Confirm
  showModal,
  closeModal,
  showConfirm
};

export {
  renderSidebar,
  renderHeader,
  renderMobileNav,
  showToast,
  showLoading,
  hideLoading,
  initLayout,
  openSidebar,
  closeSidebar,
  NAV_ITEMS,
  renderProgressBar,
  renderCourseCard,
  renderNotificationBadge,
  renderStatusBadge,
  renderSelect,
  renderFileUpload,
  renderQuizQuestion,
  showModal,
  closeModal,
  showConfirm
};

export default Components;
