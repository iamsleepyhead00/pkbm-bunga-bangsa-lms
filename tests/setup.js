/**
 * Vitest setup file
 * Configures jsdom environment, localStorage mock, and crypto.subtle mock for tests
 */

import { beforeEach, afterEach, vi } from 'vitest';

// ==================== crypto.subtle Mock ====================
// jsdom does not implement crypto.subtle, so we provide a polyfill
// Uses Node.js built-in crypto module for SHA-256

import { webcrypto } from 'node:crypto';

if (!globalThis.crypto || !globalThis.crypto.subtle) {
  globalThis.crypto = webcrypto;
}

// Ensure crypto.getRandomValues is available
if (!globalThis.crypto.getRandomValues) {
  globalThis.crypto.getRandomValues = webcrypto.getRandomValues.bind(webcrypto);
}

// ==================== localStorage Setup ====================
// jsdom provides localStorage, but we ensure it's clean between tests

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});
