/**
 * Unit tests for js/components.js
 * Tests layout components: renderSidebar, renderHeader, renderMobileNav
 * Tests utility UI: showToast, showLoading, hideLoading, initLayout
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  renderSidebar,
  renderHeader,
  renderMobileNav,
  showToast,
  showLoading,
  hideLoading,
  initLayout,
  openSidebar,
  closeSidebar,
  NAV_ITEMS
} from '../../js/components.js';

describe('NAV_ITEMS configuration', () => {
  it('should have navigation items for GURU role', () => {
    expect(NAV_ITEMS.GURU).toBeDefined();
    expect(NAV_ITEMS.GURU.length).toBe(5);
    const ids = NAV_ITEMS.GURU.map(i => i.id);
    expect(ids).toContain('dashboard');
    expect(ids).toContain('kursus');
    expect(ids).toContain('nilai');
    expect(ids).toContain('forum');
    expect(ids).toContain('profil');
  });

  it('should have navigation items for SISWA role', () => {
    expect(NAV_ITEMS.SISWA).toBeDefined();
    expect(NAV_ITEMS.SISWA.length).toBe(5);
    const ids = NAV_ITEMS.SISWA.map(i => i.id);
    expect(ids).toContain('dashboard');
    expect(ids).toContain('kursus');
    expect(ids).toContain('nilai');
    expect(ids).toContain('forum');
    expect(ids).toContain('profil');
  });

  it('should have navigation items for ADMIN role', () => {
    expect(NAV_ITEMS.ADMIN).toBeDefined();
    expect(NAV_ITEMS.ADMIN.length).toBe(3);
    const ids = NAV_ITEMS.ADMIN.map(i => i.id);
    expect(ids).toContain('dashboard');
    expect(ids).toContain('kelola-user');
    expect(ids).toContain('profil');
  });
});

describe('renderSidebar', () => {
  beforeEach(() => {
    localStorage.setItem('pkbm_lms_session', JSON.stringify({
      userId: 'usr_001',
      role: 'GURU',
      nama: 'Budi Santoso',
      loginAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    }));
  });

  it('should return an HTML string containing sidebar element', () => {
    const html = renderSidebar('GURU', 'dashboard');
    expect(html).toContain('class="sidebar"');
    expect(html).toContain('id="sidebar"');
  });

  it('should show brand name PKBM Bunga Bangsa', () => {
    const html = renderSidebar('GURU', 'dashboard');
    expect(html).toContain('PKBM Bunga Bangsa');
    expect(html).toContain('LMS');
  });

  it('should render navigation items for GURU role', () => {
    const html = renderSidebar('GURU', 'dashboard');
    expect(html).toContain('Dashboard');
    expect(html).toContain('Kursus');
    expect(html).toContain('Nilai');
    expect(html).toContain('Forum');
    expect(html).toContain('Profil');
    // Should not contain admin items
    expect(html).not.toContain('Kelola User');
  });

  it('should render navigation items for ADMIN role', () => {
    const html = renderSidebar('ADMIN', 'dashboard');
    expect(html).toContain('Dashboard');
    expect(html).toContain('Kelola User');
    expect(html).toContain('Profil');
    // Should not contain guru-specific items
    expect(html).not.toContain('Kursus');
    expect(html).not.toContain('Nilai');
  });

  it('should mark the active page with active class', () => {
    const html = renderSidebar('GURU', 'kursus');
    expect(html).toContain('nav-item active');
    // The active item should be kursus
    expect(html).toMatch(/data-page="kursus"[^>]*class="nav-item active"|class="nav-item active"[^>]*data-page="kursus"/);
  });

  it('should show user info in sidebar footer', () => {
    const html = renderSidebar('GURU', 'dashboard');
    expect(html).toContain('Budi Santoso');
    expect(html).toContain('GURU');
    // Initial should be B
    expect(html).toContain('>B<');
  });

  it('should include a close button for mobile', () => {
    const html = renderSidebar('GURU', 'dashboard');
    expect(html).toContain('sidebarCloseBtn');
    expect(html).toContain('ri-close-line');
  });

  it('should have correct href links for SISWA role', () => {
    const html = renderSidebar('SISWA', 'dashboard');
    expect(html).toContain('/pages/siswa/dashboard.html');
    expect(html).toContain('/pages/siswa/kursus.html');
  });
});

describe('renderHeader', () => {
  it('should return an HTML string containing header element', () => {
    const html = renderHeader({ nama: 'Andi', role: 'GURU' });
    expect(html).toContain('class="app-header"');
    expect(html).toContain('hamburgerBtn');
  });

  it('should display the page title', () => {
    const html = renderHeader({ nama: 'Andi' }, { pageTitle: 'Dashboard Guru' });
    expect(html).toContain('Dashboard Guru');
  });

  it('should show notification badge when count > 0', () => {
    const html = renderHeader({ nama: 'Andi' }, { notificationCount: 5 });
    expect(html).toContain('notification-badge');
    expect(html).toContain('>5<');
  });

  it('should not show badge when count is 0', () => {
    const html = renderHeader({ nama: 'Andi' }, { notificationCount: 0 });
    expect(html).not.toContain('notification-badge');
  });

  it('should cap badge display at 99+', () => {
    const html = renderHeader({ nama: 'Andi' }, { notificationCount: 150 });
    expect(html).toContain('99+');
  });

  it('should show user initial in avatar', () => {
    const html = renderHeader({ nama: 'Siti Rahayu', role: 'SISWA' });
    // Avatar button contains the initial character (with possible surrounding whitespace)
    expect(html).toMatch(/header-avatar-btn[^>]*>\s*S\s*<\/button>/);
  });

  it('should include logout button', () => {
    const html = renderHeader({ nama: 'Andi' });
    expect(html).toContain('logoutBtn');
    expect(html).toContain('Keluar');
  });

  it('should have accessible aria-labels', () => {
    const html = renderHeader({ nama: 'Andi' }, { notificationCount: 3 });
    expect(html).toContain('aria-label');
    expect(html).toContain('Buka menu navigasi');
  });
});

describe('renderMobileNav', () => {
  it('should return overlay element', () => {
    const html = renderMobileNav();
    expect(html).toContain('sidebar-overlay');
    expect(html).toContain('sidebarOverlay');
  });
});

describe('showToast', () => {
  afterEach(() => {
    const container = document.getElementById('toastContainer');
    if (container) container.remove();
  });

  it('should create a toast container if not exists', () => {
    showToast('Hello', 'info');
    const container = document.getElementById('toastContainer');
    expect(container).not.toBeNull();
    expect(container.className).toContain('toast-container');
  });

  it('should add a toast message to the container', () => {
    showToast('Test message', 'success');
    const container = document.getElementById('toastContainer');
    expect(container.querySelector('.toast')).not.toBeNull();
    expect(container.textContent).toContain('Test message');
  });

  it('should apply the correct type class', () => {
    showToast('Error!', 'error');
    const toast = document.querySelector('.toast');
    expect(toast.className).toContain('toast-error');
  });

  it('should include a close button', () => {
    showToast('Closeable', 'warning');
    const closeBtn = document.querySelector('.toast-close');
    expect(closeBtn).not.toBeNull();
  });

  it('should remove toast when close button clicked', () => {
    vi.useFakeTimers();
    showToast('Remove me', 'info');
    const closeBtn = document.querySelector('.toast-close');
    closeBtn.click();
    vi.advanceTimersByTime(400);
    const toasts = document.querySelectorAll('.toast');
    expect(toasts.length).toBe(0);
    vi.useRealTimers();
  });
});

describe('showLoading / hideLoading', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'testContainer';
    container.innerHTML = '<p>Original content</p>';
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('should replace container content with spinner', () => {
    showLoading(container);
    expect(container.querySelector('.loading-spinner')).not.toBeNull();
    expect(container.querySelector('.spinner')).not.toBeNull();
    expect(container.textContent).toContain('Memuat...');
  });

  it('should accept a string selector', () => {
    showLoading('#testContainer');
    expect(container.querySelector('.loading-spinner')).not.toBeNull();
  });

  it('should restore original content on hideLoading', () => {
    showLoading(container);
    hideLoading(container);
    expect(container.innerHTML).toContain('Original content');
    expect(container.querySelector('.loading-spinner')).toBeNull();
  });

  it('should work with string selector for hideLoading', () => {
    showLoading('#testContainer');
    hideLoading('#testContainer');
    expect(container.innerHTML).toContain('Original content');
  });
});

describe('initLayout', () => {
  beforeEach(() => {
    localStorage.setItem('pkbm_lms_session', JSON.stringify({
      userId: 'usr_002',
      role: 'SISWA',
      nama: 'Dewi Putri',
      loginAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    }));

    document.body.innerHTML = '<div class="app-layout"><div class="main-content"></div></div>';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should render sidebar into app-layout', () => {
    initLayout('SISWA', 'dashboard', { pageTitle: 'Dashboard' });
    expect(document.getElementById('sidebar')).not.toBeNull();
  });

  it('should render header after sidebar', () => {
    initLayout('SISWA', 'dashboard', { pageTitle: 'Dashboard' });
    expect(document.querySelector('.app-header')).not.toBeNull();
  });

  it('should render overlay', () => {
    initLayout('SISWA', 'dashboard');
    expect(document.getElementById('sidebarOverlay')).not.toBeNull();
  });

  it('should bind hamburger click to open sidebar', () => {
    initLayout('SISWA', 'dashboard');
    const hamburger = document.getElementById('hamburgerBtn');
    const sidebar = document.getElementById('sidebar');
    hamburger.click();
    expect(sidebar.classList.contains('open')).toBe(true);
  });

  it('should close sidebar on overlay click', () => {
    initLayout('SISWA', 'dashboard');
    const hamburger = document.getElementById('hamburgerBtn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    // Open first
    hamburger.click();
    expect(sidebar.classList.contains('open')).toBe(true);

    // Close via overlay
    overlay.click();
    expect(sidebar.classList.contains('open')).toBe(false);
  });

  it('should close sidebar on close button click', () => {
    initLayout('SISWA', 'dashboard');
    const hamburger = document.getElementById('hamburgerBtn');
    const sidebar = document.getElementById('sidebar');
    const closeBtn = document.getElementById('sidebarCloseBtn');

    hamburger.click();
    expect(sidebar.classList.contains('open')).toBe(true);

    closeBtn.click();
    expect(sidebar.classList.contains('open')).toBe(false);
  });
});

describe('openSidebar / closeSidebar', () => {
  beforeEach(() => {
    localStorage.setItem('pkbm_lms_session', JSON.stringify({
      userId: 'usr_003',
      role: 'ADMIN',
      nama: 'Admin User',
      loginAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    }));
    document.body.innerHTML = '<div class="app-layout"><div class="main-content"></div></div>';
    initLayout('ADMIN', 'dashboard');
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('openSidebar adds open class and activates overlay', () => {
    openSidebar();
    expect(document.getElementById('sidebar').classList.contains('open')).toBe(true);
    expect(document.getElementById('sidebarOverlay').classList.contains('active')).toBe(true);
  });

  it('closeSidebar removes open class and deactivates overlay', () => {
    openSidebar();
    closeSidebar();
    expect(document.getElementById('sidebar').classList.contains('open')).toBe(false);
    expect(document.getElementById('sidebarOverlay').classList.contains('active')).toBe(false);
  });
});
