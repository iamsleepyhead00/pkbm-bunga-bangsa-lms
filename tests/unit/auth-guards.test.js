/**
 * Unit tests for Auth.enforceRole() authorization guards
 * Tests role-based access control, session-expired redirect, and unauthorized logging
 *
 * Validates: Requirements 1.3, 1.4, 1.5, 1.6
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import Auth from '../../js/auth.js';
import { hashPassword } from '../../js/utils.js';

describe('Auth.enforceRole() — Authorization Guards', () => {

  beforeEach(async () => {
    localStorage.clear();
    // Reset window.location mock
    delete window.location;
    window.location = { href: '' };
  });

  /**
   * Helper: create a valid session in localStorage
   */
  function createSession(role, opts = {}) {
    const session = {
      userId: `usr_test_${role.toLowerCase()}`,
      role,
      nama: `Test ${role}`,
      loginAt: new Date().toISOString(),
      lastActivity: opts.lastActivity || new Date().toISOString()
    };
    localStorage.setItem('pkbm_lms_session', JSON.stringify(session));
    return session;
  }

  describe('No session — redirect to login', () => {

    it('should redirect to /login.html when no session exists', () => {
      const result = Auth.enforceRole(['GURU']);
      expect(result).toBe(false);
      expect(window.location.href).toBe('/login.html');
    });

    it('should redirect to /login.html for any role check without session', () => {
      const result = Auth.enforceRole(['ADMIN', 'GURU', 'SISWA']);
      expect(result).toBe(false);
      expect(window.location.href).toBe('/login.html');
    });

    it('should return false when no session exists', () => {
      expect(Auth.enforceRole(['GURU'])).toBe(false);
    });
  });

  describe('Session expired — redirect to login', () => {

    it('should redirect to /login.html when session is expired (61 min idle)', () => {
      createSession('GURU', {
        lastActivity: new Date(Date.now() - 61 * 60 * 1000).toISOString()
      });

      const result = Auth.enforceRole(['GURU']);
      expect(result).toBe(false);
      expect(window.location.href).toBe('/login.html');
    });

    it('should clear session from localStorage when expired', () => {
      createSession('SISWA', {
        lastActivity: new Date(Date.now() - 65 * 60 * 1000).toISOString()
      });

      Auth.enforceRole(['SISWA']);
      expect(localStorage.getItem('pkbm_lms_session')).toBeNull();
    });
  });

  describe('Wrong role — redirect to 403', () => {

    it('should redirect SISWA to /403.html when trying to access GURU page', () => {
      createSession('SISWA');

      const result = Auth.enforceRole(['GURU']);
      expect(result).toBe(false);
      expect(window.location.href).toBe('/403.html');
    });

    it('should redirect GURU to /403.html when trying to access ADMIN page', () => {
      createSession('GURU');

      const result = Auth.enforceRole(['ADMIN']);
      expect(result).toBe(false);
      expect(window.location.href).toBe('/403.html');
    });

    it('should redirect SISWA to /403.html when trying to access ADMIN page', () => {
      createSession('SISWA');

      const result = Auth.enforceRole(['ADMIN']);
      expect(result).toBe(false);
      expect(window.location.href).toBe('/403.html');
    });

    it('should redirect ADMIN to /403.html when trying to access GURU-only page', () => {
      createSession('ADMIN');

      const result = Auth.enforceRole(['GURU']);
      expect(result).toBe(false);
      expect(window.location.href).toBe('/403.html');
    });

    it('should log unauthorized access attempt to console', () => {
      createSession('SISWA');
      const warnSpy = vi.spyOn(console, 'warn');

      Auth.enforceRole(['GURU']);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unauthorized access attempt')
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('SISWA')
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('GURU')
      );

      warnSpy.mockRestore();
    });
  });

  describe('Correct role — grant access', () => {

    it('should grant access for GURU on GURU-restricted page', () => {
      createSession('GURU');

      const result = Auth.enforceRole(['GURU']);
      expect(result).toBe(true);
      expect(window.location.href).toBe('');
    });

    it('should grant access for SISWA on SISWA-restricted page', () => {
      createSession('SISWA');

      const result = Auth.enforceRole(['SISWA']);
      expect(result).toBe(true);
      expect(window.location.href).toBe('');
    });

    it('should grant access for ADMIN on ADMIN-restricted page', () => {
      createSession('ADMIN');

      const result = Auth.enforceRole(['ADMIN']);
      expect(result).toBe(true);
      expect(window.location.href).toBe('');
    });

    it('should grant access when role is in a multi-role allowedRoles list', () => {
      createSession('GURU');

      const result = Auth.enforceRole(['GURU', 'ADMIN']);
      expect(result).toBe(true);
      expect(window.location.href).toBe('');
    });

    it('should not redirect on successful access', () => {
      createSession('ADMIN');

      Auth.enforceRole(['ADMIN']);
      expect(window.location.href).toBe('');
    });

    it('should refresh session lastActivity on successful access', () => {
      // Set lastActivity to 30 minutes ago
      const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      createSession('GURU', { lastActivity: thirtyMinAgo });

      Auth.enforceRole(['GURU']);

      const session = JSON.parse(localStorage.getItem('pkbm_lms_session'));
      expect(new Date(session.lastActivity).getTime()).toBeGreaterThan(
        new Date(thirtyMinAgo).getTime()
      );
    });
  });

  describe('Edge cases', () => {

    it('should redirect to login if session data is corrupted', () => {
      localStorage.setItem('pkbm_lms_session', 'invalid-json{{{');

      const result = Auth.enforceRole(['GURU']);
      expect(result).toBe(false);
      expect(window.location.href).toBe('/login.html');
    });

    it('should redirect to login if session has no userId', () => {
      localStorage.setItem('pkbm_lms_session', JSON.stringify({
        role: 'GURU',
        nama: 'Test',
        lastActivity: new Date().toISOString()
      }));

      const result = Auth.enforceRole(['GURU']);
      expect(result).toBe(false);
      expect(window.location.href).toBe('/login.html');
    });
  });
});
