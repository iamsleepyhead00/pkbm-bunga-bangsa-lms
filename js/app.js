/**
 * app.js - Main app initialization & routing
 * Handles session check on page load and role-based redirects.
 */

import Auth from './auth.js';

/**
 * Initialize the application
 * - Check session on page load
 * - Redirect to login if no session
 * - Redirect to appropriate dashboard based on role
 */
function initApp() {
  const session = Auth.checkSession();
  const currentPath = window.location.pathname;

  // Pages that don't require authentication
  const publicPages = ['/login.html', '/403.html'];
  const isPublicPage = publicPages.some(page => currentPath.endsWith(page));

  if (!session && !isPublicPage) {
    window.location.href = '/login.html';
    return;
  }

  // If on login page but already authenticated, redirect to dashboard
  if (session && currentPath.endsWith('/login.html')) {
    redirectToDashboard(session.role);
    return;
  }

  // If on index page, redirect to appropriate dashboard
  if (session && (currentPath === '/' || currentPath.endsWith('/index.html'))) {
    redirectToDashboard(session.role);
    return;
  }
}

/**
 * Redirect user to their role-specific dashboard
 * @param {string} role - User role (ADMIN, GURU, SISWA)
 */
function redirectToDashboard(role) {
  switch (role) {
    case 'ADMIN':
      window.location.href = '/pages/admin/dashboard.html';
      break;
    case 'GURU':
      window.location.href = '/pages/guru/dashboard.html';
      break;
    case 'SISWA':
      window.location.href = '/pages/siswa/dashboard.html';
      break;
    default:
      window.location.href = '/login.html';
  }
}

/**
 * Setup periodic session check (every 5 minutes)
 * Auto-logout if session expired
 */
function setupSessionMonitor() {
  setInterval(() => {
    if (Auth.isSessionExpired()) {
      Auth.logout();
      window.location.href = '/login.html';
    }
  }, 5 * 60 * 1000); // Check every 5 minutes
}

/**
 * Refresh session on user activity
 */
function setupActivityListener() {
  const events = ['click', 'keydown', 'scroll', 'mousemove', 'touchstart'];
  let lastRefresh = Date.now();

  const refreshHandler = () => {
    // Only refresh every 60 seconds to avoid excessive writes
    if (Date.now() - lastRefresh > 60000) {
      Auth.refreshSession();
      lastRefresh = Date.now();
    }
  };

  events.forEach(event => {
    document.addEventListener(event, refreshHandler, { passive: true });
  });
}

// Initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  initApp();
  setupSessionMonitor();
  setupActivityListener();
});

export { initApp, redirectToDashboard, setupSessionMonitor, setupActivityListener };
export default { initApp, redirectToDashboard };
