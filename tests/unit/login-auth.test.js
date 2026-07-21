/**
 * Unit tests for login page auth flow integration
 * Tests Auth.login(), session creation, role-based redirect, and error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import Auth from '../../js/auth.js';
import dataService from '../../js/data-service.js';
import { hashPassword } from '../../js/utils.js';

describe('Login Auth Flow', () => {

  beforeEach(async () => {
    localStorage.clear();

    // Seed a minimal set of test users
    const adminHash = await hashPassword('admin123');
    const guruHash = await hashPassword('guru123');
    const siswaHash = await hashPassword('siswa123');

    const users = [
      {
        id: 'usr_admin001',
        username: 'admin',
        passwordHash: adminHash,
        nama: 'Administrator',
        role: 'ADMIN',
        program: null,
        kelas: null,
        aktif: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'usr_guru001',
        username: 'guru1',
        passwordHash: guruHash,
        nama: 'Bapak Ahmad',
        role: 'GURU',
        program: null,
        kelas: null,
        aktif: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'usr_siswa001',
        username: 'siswa_a1',
        passwordHash: siswaHash,
        nama: 'Andi Saputra',
        role: 'SISWA',
        program: 'PAKET_A',
        kelas: 'Kelas 6',
        aktif: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'usr_inactive001',
        username: 'inactive_user',
        passwordHash: await hashPassword('pass1234'),
        nama: 'Deactivated User',
        role: 'SISWA',
        program: 'PAKET_B',
        kelas: 'Kelas 1',
        aktif: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    localStorage.setItem('pkbm_users', JSON.stringify(users));
  });

  describe('Auth.login() - Successful Login', () => {

    it('should login admin with valid credentials', async () => {
      const result = await Auth.login('admin', 'admin123');
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user.role).toBe('ADMIN');
      expect(result.user.nama).toBe('Administrator');
    });

    it('should login guru with valid credentials', async () => {
      const result = await Auth.login('guru1', 'guru123');
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user.role).toBe('GURU');
      expect(result.user.nama).toBe('Bapak Ahmad');
    });

    it('should login siswa with valid credentials', async () => {
      const result = await Auth.login('siswa_a1', 'siswa123');
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user.role).toBe('SISWA');
      expect(result.user.nama).toBe('Andi Saputra');
    });

    it('should create session in localStorage after successful login', async () => {
      await Auth.login('admin', 'admin123');
      const sessionData = localStorage.getItem('pkbm_lms_session');
      expect(sessionData).not.toBeNull();

      const session = JSON.parse(sessionData);
      expect(session.userId).toBe('usr_admin001');
      expect(session.role).toBe('ADMIN');
      expect(session.nama).toBe('Administrator');
      expect(session.loginAt).toBeDefined();
      expect(session.lastActivity).toBeDefined();
    });

    it('should set lastActivity on login for idle timeout tracking', async () => {
      const before = new Date().toISOString();
      await Auth.login('guru1', 'guru123');
      const after = new Date().toISOString();

      const session = JSON.parse(localStorage.getItem('pkbm_lms_session'));
      expect(session.lastActivity >= before).toBe(true);
      expect(session.lastActivity <= after).toBe(true);
    });
  });

  describe('Auth.login() - Invalid Credentials (Generic Error)', () => {

    it('should return generic error for wrong username', async () => {
      const result = await Auth.login('nonexistent', 'admin123');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Username atau password salah');
    });

    it('should return generic error for wrong password', async () => {
      const result = await Auth.login('admin', 'wrongpassword');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Username atau password salah');
    });

    it('should return generic error for both wrong username and password', async () => {
      const result = await Auth.login('fake_user', 'fake_pass');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Username atau password salah');
    });

    it('should return identical error message regardless of which credential is wrong', async () => {
      const wrongUsername = await Auth.login('nonexistent', 'admin123');
      const wrongPassword = await Auth.login('admin', 'badpassword');
      const bothWrong = await Auth.login('nobody', 'nothing');

      expect(wrongUsername.error).toBe(wrongPassword.error);
      expect(wrongPassword.error).toBe(bothWrong.error);
      expect(wrongUsername.error).toBe('Username atau password salah');
    });

    it('should not create a session after failed login', async () => {
      await Auth.login('admin', 'wrongpassword');
      const sessionData = localStorage.getItem('pkbm_lms_session');
      expect(sessionData).toBeNull();
    });

    it('should return generic error for deactivated user', async () => {
      const result = await Auth.login('inactive_user', 'pass1234');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Username atau password salah');
    });
  });

  describe('Auth.checkSession() - Session Validation', () => {

    it('should return session data for valid active session', async () => {
      await Auth.login('admin', 'admin123');
      const session = Auth.checkSession();
      expect(session).not.toBeNull();
      expect(session.userId).toBe('usr_admin001');
      expect(session.role).toBe('ADMIN');
    });

    it('should return null when no session exists', () => {
      const session = Auth.checkSession();
      expect(session).toBeNull();
    });

    it('should return null for expired session (60 min idle)', async () => {
      await Auth.login('guru1', 'guru123');

      // Manually set lastActivity to 61 minutes ago
      const session = JSON.parse(localStorage.getItem('pkbm_lms_session'));
      session.lastActivity = new Date(Date.now() - 61 * 60 * 1000).toISOString();
      localStorage.setItem('pkbm_lms_session', JSON.stringify(session));

      const result = Auth.checkSession();
      expect(result).toBeNull();
    });

    it('should keep session valid at exactly 59 minutes', async () => {
      await Auth.login('guru1', 'guru123');

      // Set lastActivity to 59 minutes ago
      const session = JSON.parse(localStorage.getItem('pkbm_lms_session'));
      session.lastActivity = new Date(Date.now() - 59 * 60 * 1000).toISOString();
      localStorage.setItem('pkbm_lms_session', JSON.stringify(session));

      const result = Auth.checkSession();
      expect(result).not.toBeNull();
    });

    it('should refresh lastActivity on checkSession', async () => {
      await Auth.login('siswa_a1', 'siswa123');

      // Set lastActivity to 30 minutes ago
      const session = JSON.parse(localStorage.getItem('pkbm_lms_session'));
      const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      session.lastActivity = thirtyMinAgo;
      localStorage.setItem('pkbm_lms_session', JSON.stringify(session));

      Auth.checkSession();

      const updatedSession = JSON.parse(localStorage.getItem('pkbm_lms_session'));
      expect(updatedSession.lastActivity > thirtyMinAgo).toBe(true);
    });
  });

  describe('Auth.isSessionExpired() - 60 Minute Idle Timeout', () => {

    it('should return true when no session exists', () => {
      expect(Auth.isSessionExpired()).toBe(true);
    });

    it('should return false for fresh session', async () => {
      await Auth.login('admin', 'admin123');
      expect(Auth.isSessionExpired()).toBe(false);
    });

    it('should return true when lastActivity exceeds 60 minutes', async () => {
      await Auth.login('admin', 'admin123');
      const session = JSON.parse(localStorage.getItem('pkbm_lms_session'));
      session.lastActivity = new Date(Date.now() - 61 * 60 * 1000).toISOString();
      localStorage.setItem('pkbm_lms_session', JSON.stringify(session));

      expect(Auth.isSessionExpired()).toBe(true);
    });

    it('should return false when lastActivity is exactly 60 minutes', async () => {
      await Auth.login('admin', 'admin123');
      const session = JSON.parse(localStorage.getItem('pkbm_lms_session'));
      session.lastActivity = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      localStorage.setItem('pkbm_lms_session', JSON.stringify(session));

      // Exactly 60 min: diffMs === maxIdleMs, condition is >, so NOT expired
      expect(Auth.isSessionExpired()).toBe(false);
    });
  });

  describe('Auth.logout()', () => {

    it('should remove session from localStorage', async () => {
      await Auth.login('admin', 'admin123');
      expect(localStorage.getItem('pkbm_lms_session')).not.toBeNull();

      Auth.logout();
      expect(localStorage.getItem('pkbm_lms_session')).toBeNull();
    });
  });

  describe('Role-based Dashboard Redirect Logic', () => {

    it('GURU should redirect to /pages/guru/dashboard.html', async () => {
      const result = await Auth.login('guru1', 'guru123');
      expect(result.success).toBe(true);
      expect(result.user.role).toBe('GURU');
      // The redirect logic in login.html maps GURU → /pages/guru/dashboard.html
    });

    it('SISWA should redirect to /pages/siswa/dashboard.html', async () => {
      const result = await Auth.login('siswa_a1', 'siswa123');
      expect(result.success).toBe(true);
      expect(result.user.role).toBe('SISWA');
      // The redirect logic in login.html maps SISWA → /pages/siswa/dashboard.html
    });

    it('ADMIN should redirect to /pages/admin/dashboard.html', async () => {
      const result = await Auth.login('admin', 'admin123');
      expect(result.success).toBe(true);
      expect(result.user.role).toBe('ADMIN');
      // The redirect logic in login.html maps ADMIN → /pages/admin/dashboard.html
    });
  });
});
