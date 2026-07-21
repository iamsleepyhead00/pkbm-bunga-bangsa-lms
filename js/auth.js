/**
 * auth.js - Authentication & session management
 * Handles login, logout, session checking, role enforcement,
 * and password management.
 */

import dataService, { KEYS } from './data-service.js';
import { hashPassword, isSessionExpired as checkExpiry } from './utils.js';

const Auth = {
  SESSION_KEY: 'pkbm_lms_session',
  SESSION_DURATION: 60 * 60 * 1000, // 60 menit idle timeout

  /**
   * Login user with username and password
   * @param {string} username
   * @param {string} password
   * @returns {Promise<{success: boolean, user?: object, error?: string}>}
   */
  async login(username, password) {
    try {
      const user = await dataService.authenticate(username, password);
      if (!user) {
        return { success: false, error: 'Username atau password salah' };
      }
      if (!user.aktif) {
        return { success: false, error: 'Username atau password salah' };
      }

      // Create session
      const session = {
        userId: user.id,
        role: user.role,
        nama: user.nama,
        loginAt: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      };
      localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));

      return { success: true, user };
    } catch (err) {
      console.error('Login error:', err);
      return { success: false, error: 'Username atau password salah' };
    }
  },

  /**
   * Check current session validity
   * @returns {object|null} User session data or null if no valid session
   */
  checkSession() {
    try {
      const data = localStorage.getItem(this.SESSION_KEY);
      if (!data) return null;

      const session = JSON.parse(data);
      if (!session || !session.userId) return null;

      // Check if session expired
      if (this.isSessionExpired()) {
        this.logout();
        return null;
      }

      // Refresh lastActivity
      this.refreshSession();
      return session;
    } catch {
      return null;
    }
  },

  /**
   * Enforce role-based access. Redirect to 403 if role doesn't match.
   * @param {string[]} allowedRoles - Array of allowed roles
   * @returns {boolean} True if access is granted
   */
  enforceRole(allowedRoles) {
    const session = this.checkSession();
    if (!session) {
      window.location.href = '/login.html';
      return false;
    }
    if (!allowedRoles.includes(session.role)) {
      console.warn(`Unauthorized access attempt: role ${session.role} tried to access page restricted to ${allowedRoles.join(', ')}`);
      window.location.href = '/403.html';
      return false;
    }
    return true;
  },

  /**
   * Logout current user — clear session
   */
  logout() {
    localStorage.removeItem(this.SESSION_KEY);
  },

  /**
   * Check if the current session has expired (60 min idle)
   * @returns {boolean} True if expired
   */
  isSessionExpired() {
    try {
      const data = localStorage.getItem(this.SESSION_KEY);
      if (!data) return true;

      const session = JSON.parse(data);
      if (!session || !session.lastActivity) return true;

      return checkExpiry(session.lastActivity, new Date(), 60);
    } catch {
      return true;
    }
  },

  /**
   * Refresh session lastActivity timestamp
   */
  refreshSession() {
    try {
      const data = localStorage.getItem(this.SESSION_KEY);
      if (!data) return;

      const session = JSON.parse(data);
      session.lastActivity = new Date().toISOString();
      localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
    } catch {
      // Silent fail
    }
  },

  /**
   * Change user password
   * @param {string} userId - User ID
   * @param {string} oldPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async changePassword(userId, oldPassword, newPassword) {
    if (!newPassword || newPassword.length < 8) {
      return { success: false, error: 'Password minimal 8 karakter' };
    }

    const user = await dataService.getUserById(userId);
    if (!user) {
      return { success: false, error: 'User tidak ditemukan' };
    }

    const oldHash = await hashPassword(oldPassword);
    if (oldHash !== user.passwordHash) {
      return { success: false, error: 'Password lama salah' };
    }

    const newHash = await hashPassword(newPassword);
    await dataService.updateUser(userId, { passwordHash: newHash });

    return { success: true };
  }
};

export default Auth;
