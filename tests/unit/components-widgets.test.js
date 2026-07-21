/**
 * Unit tests for js/components.js — Widget & Form Components
 * Tests: renderProgressBar, renderCourseCard, renderNotificationBadge,
 *        renderStatusBadge, renderSelect, renderFileUpload, renderQuizQuestion,
 *        showModal, showConfirm
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
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
} from '../../js/components.js';

// ============================================================
// renderProgressBar
// ============================================================

describe('renderProgressBar', () => {
  it('should return HTML with progress and progress-bar classes', () => {
    const html = renderProgressBar(50);
    expect(html).toContain('class="progress"');
    expect(html).toContain('class="progress-bar"');
  });

  it('should set width style to the given percentage', () => {
    const html = renderProgressBar(75);
    expect(html).toContain('width: 75%');
  });

  it('should clamp percentage to 0 minimum', () => {
    const html = renderProgressBar(-10);
    expect(html).toContain('width: 0%');
  });

  it('should clamp percentage to 100 maximum', () => {
    const html = renderProgressBar(150);
    expect(html).toContain('width: 100%');
  });

  it('should round percentage to integer', () => {
    const html = renderProgressBar(33.7);
    expect(html).toContain('width: 34%');
  });

  it('should apply sm size class when size option is sm', () => {
    const html = renderProgressBar(50, { size: 'sm' });
    expect(html).toContain('progress-sm');
  });

  it('should apply lg size class when size option is lg', () => {
    const html = renderProgressBar(50, { size: 'lg' });
    expect(html).toContain('progress-lg');
  });

  it('should apply color class to progress-bar', () => {
    const html = renderProgressBar(80, { color: 'success' });
    expect(html).toContain('progress-bar success');
  });

  it('should show label when showLabel is true', () => {
    const html = renderProgressBar(65, { showLabel: true });
    expect(html).toContain('progress-wrapper');
    expect(html).toContain('progress-label');
    expect(html).toContain('65%');
  });

  it('should not show label by default', () => {
    const html = renderProgressBar(65);
    expect(html).not.toContain('progress-wrapper');
    expect(html).not.toContain('progress-label');
  });

  it('should include aria attributes for accessibility', () => {
    const html = renderProgressBar(42);
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-valuenow="42"');
    expect(html).toContain('aria-valuemin="0"');
    expect(html).toContain('aria-valuemax="100"');
  });
});

// ============================================================
// renderCourseCard
// ============================================================

describe('renderCourseCard', () => {
  const mockCourse = {
    id: 'crs_001',
    nama: 'Matematika Dasar',
    program: 'PAKET_B',
    kelas: 'Kelas 1',
    mataPelajaran: 'Matematika',
    aktif: true
  };

  it('should return HTML with card and course-card classes', () => {
    const html = renderCourseCard(mockCourse, 'GURU');
    expect(html).toContain('card course-card');
  });

  it('should display the program badge', () => {
    const html = renderCourseCard(mockCourse, 'GURU');
    expect(html).toContain('Paket B');
    expect(html).toContain('badge-primary');
  });

  it('should display course name', () => {
    const html = renderCourseCard(mockCourse, 'GURU');
    expect(html).toContain('Matematika Dasar');
  });

  it('should display mata pelajaran and kelas', () => {
    const html = renderCourseCard(mockCourse, 'GURU');
    expect(html).toContain('Matematika');
    expect(html).toContain('Kelas 1');
  });

  it('should show student count for GURU role', () => {
    const html = renderCourseCard(mockCourse, 'GURU', { studentCount: 25 });
    expect(html).toContain('25 siswa');
  });

  it('should show active status badge for GURU role', () => {
    const html = renderCourseCard(mockCourse, 'GURU');
    expect(html).toContain('badge-success');
    expect(html).toContain('Aktif');
  });

  it('should show Nonaktif badge when course is not aktif for GURU', () => {
    const inactiveCourse = { ...mockCourse, aktif: false };
    const html = renderCourseCard(inactiveCourse, 'GURU');
    expect(html).toContain('Nonaktif');
    expect(html).toContain('badge-gray');
  });

  it('should show progress bar for SISWA role', () => {
    const html = renderCourseCard(mockCourse, 'SISWA', { progress: 60 });
    expect(html).toContain('progress');
    expect(html).toContain('60%');
  });

  it('should show latest grade for SISWA when provided', () => {
    const html = renderCourseCard(mockCourse, 'SISWA', { progress: 50, latestGrade: 85 });
    expect(html).toContain('Nilai: 85');
  });

  it('should include data-course-id attribute', () => {
    const html = renderCourseCard(mockCourse, 'GURU');
    expect(html).toContain('data-course-id="crs_001"');
  });

  it('should handle PAKET_A program label', () => {
    const courseA = { ...mockCourse, program: 'PAKET_A' };
    const html = renderCourseCard(courseA, 'GURU');
    expect(html).toContain('Paket A');
  });

  it('should handle PAKET_C program label', () => {
    const courseC = { ...mockCourse, program: 'PAKET_C' };
    const html = renderCourseCard(courseC, 'GURU');
    expect(html).toContain('Paket C');
  });
});

// ============================================================
// renderNotificationBadge
// ============================================================

describe('renderNotificationBadge', () => {
  it('should return empty string when count is 0', () => {
    expect(renderNotificationBadge(0)).toBe('');
  });

  it('should return empty string when count is negative', () => {
    expect(renderNotificationBadge(-1)).toBe('');
  });

  it('should return empty string when count is null', () => {
    expect(renderNotificationBadge(null)).toBe('');
  });

  it('should return empty string when count is undefined', () => {
    expect(renderNotificationBadge(undefined)).toBe('');
  });

  it('should display the count as-is for values <= 99', () => {
    const html = renderNotificationBadge(5);
    expect(html).toContain('>5<');
    expect(html).toContain('notification-badge');
  });

  it('should cap display at 99+ for values > 99', () => {
    const html = renderNotificationBadge(100);
    expect(html).toContain('99+');
  });

  it('should cap display at 99+ for large values', () => {
    const html = renderNotificationBadge(500);
    expect(html).toContain('99+');
  });

  it('should show exactly 99 without plus sign', () => {
    const html = renderNotificationBadge(99);
    expect(html).toContain('>99<');
    expect(html).not.toContain('99+');
  });
});

// ============================================================
// renderStatusBadge
// ============================================================

describe('renderStatusBadge', () => {
  it('should render badge with given status text', () => {
    const html = renderStatusBadge('Aktif', 'success');
    expect(html).toContain('Aktif');
    expect(html).toContain('badge badge-success');
  });

  it('should default to gray color when no color provided', () => {
    const html = renderStatusBadge('Draft');
    expect(html).toContain('badge-gray');
  });

  it('should support warning color', () => {
    const html = renderStatusBadge('Menunggu', 'warning');
    expect(html).toContain('badge-warning');
  });

  it('should support danger color', () => {
    const html = renderStatusBadge('Terlambat', 'danger');
    expect(html).toContain('badge-danger');
  });

  it('should support info color', () => {
    const html = renderStatusBadge('Info', 'info');
    expect(html).toContain('badge-info');
  });

  it('should fallback to gray for invalid color', () => {
    const html = renderStatusBadge('Unknown', 'invalid-color');
    expect(html).toContain('badge-gray');
  });

  it('should escape HTML in status text', () => {
    const html = renderStatusBadge('<script>alert("xss")</script>', 'success');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});

// ============================================================
// renderSelect
// ============================================================

describe('renderSelect', () => {
  const options = [
    { value: 'a', label: 'Option A' },
    { value: 'b', label: 'Option B' },
    { value: 'c', label: 'Option C' }
  ];

  it('should return a <select> element with form-select class', () => {
    const html = renderSelect(options);
    expect(html).toContain('<select');
    expect(html).toContain('form-select');
  });

  it('should render all options', () => {
    const html = renderSelect(options);
    expect(html).toContain('value="a"');
    expect(html).toContain('Option A');
    expect(html).toContain('value="b"');
    expect(html).toContain('Option B');
    expect(html).toContain('value="c"');
    expect(html).toContain('Option C');
  });

  it('should mark the selected value', () => {
    const html = renderSelect(options, 'b');
    expect(html).toContain('value="b" selected');
  });

  it('should apply name attribute', () => {
    const html = renderSelect(options, null, { name: 'program' });
    expect(html).toContain('name="program"');
  });

  it('should apply id attribute', () => {
    const html = renderSelect(options, null, { id: 'selectProgram' });
    expect(html).toContain('id="selectProgram"');
  });

  it('should apply required attribute', () => {
    const html = renderSelect(options, null, { required: true });
    expect(html).toContain('required');
  });

  it('should apply custom class in addition to form-select', () => {
    const html = renderSelect(options, null, { class: 'custom-class' });
    expect(html).toContain('form-select custom-class');
  });

  it('should handle empty options array', () => {
    const html = renderSelect([]);
    expect(html).toContain('<select');
    expect(html).toContain('</select>');
  });

  it('should handle null options gracefully', () => {
    const html = renderSelect(null);
    expect(html).toContain('<select');
  });
});

// ============================================================
// renderFileUpload
// ============================================================

describe('renderFileUpload', () => {
  it('should return HTML with file-upload class', () => {
    const html = renderFileUpload();
    expect(html).toContain('file-upload');
  });

  it('should include drag and drop instruction text', () => {
    const html = renderFileUpload();
    expect(html).toContain('Klik untuk memilih file');
    expect(html).toContain('seret file ke sini');
  });

  it('should show accepted file types', () => {
    const html = renderFileUpload({ accept: '.pdf,.doc,.docx' });
    expect(html).toContain('.pdf,.doc,.docx');
  });

  it('should show max file size hint', () => {
    const html = renderFileUpload({ maxSize: 10 });
    expect(html).toContain('Maks. 10MB');
  });

  it('should use custom id for input and zone', () => {
    const html = renderFileUpload({ id: 'materiFile' });
    expect(html).toContain('id="materiFile"');
    expect(html).toContain('id="materiFileZone"');
  });

  it('should use default id when none provided', () => {
    const html = renderFileUpload();
    expect(html).toContain('id="fileUpload"');
  });

  it('should include hidden file input', () => {
    const html = renderFileUpload();
    expect(html).toContain('type="file"');
    expect(html).toContain('hidden');
  });

  it('should set accept attribute on file input when provided', () => {
    const html = renderFileUpload({ accept: '.pdf' });
    expect(html).toContain('accept=".pdf"');
  });

  it('should have upload cloud icon', () => {
    const html = renderFileUpload();
    expect(html).toContain('ri-upload-cloud-line');
  });
});

// ============================================================
// renderQuizQuestion
// ============================================================

describe('renderQuizQuestion', () => {
  const pgQuestion = {
    id: 'qsn_001',
    tipe: 'PILIHAN_GANDA',
    pertanyaan: 'Berapa 2 + 2?',
    opsi: ['3', '4', '5', '6'],
    jawabanBenar: 1,
    bobot: 10,
    urutan: 1
  };

  const esaiQuestion = {
    id: 'qsn_002',
    tipe: 'ESAI',
    pertanyaan: 'Jelaskan fotosintesis!',
    opsi: null,
    jawabanBenar: null,
    bobot: 20,
    urutan: 2
  };

  describe('mode: edit', () => {
    it('should render editable question with textarea for pertanyaan', () => {
      const html = renderQuizQuestion(pgQuestion, 0, 'edit');
      expect(html).toContain('form-textarea');
      expect(html).toContain('Berapa 2 + 2?');
    });

    it('should show question number', () => {
      const html = renderQuizQuestion(pgQuestion, 0, 'edit');
      expect(html).toContain('Soal 1');
    });

    it('should render PG options with radio buttons and text inputs', () => {
      const html = renderQuizQuestion(pgQuestion, 0, 'edit');
      expect(html).toContain('type="radio"');
      expect(html).toContain('type="text"');
      expect(html).toContain('value="3"');
    });

    it('should mark correct answer radio as checked', () => {
      const html = renderQuizQuestion(pgQuestion, 0, 'edit');
      expect(html).toContain('value="1" checked');
    });

    it('should show bobot input', () => {
      const html = renderQuizQuestion(pgQuestion, 0, 'edit');
      expect(html).toContain('name="bobot"');
      expect(html).toContain('value="10"');
    });

    it('should show tipe badge (Pilihan Ganda)', () => {
      const html = renderQuizQuestion(pgQuestion, 0, 'edit');
      expect(html).toContain('Pilihan Ganda');
    });

    it('should show tipe badge (Esai) for essay questions', () => {
      const html = renderQuizQuestion(esaiQuestion, 1, 'edit');
      expect(html).toContain('Esai');
    });

    it('should not show PG options for essay questions', () => {
      const html = renderQuizQuestion(esaiQuestion, 1, 'edit');
      expect(html).not.toContain('quiz-options-edit');
    });
  });

  describe('mode: play', () => {
    it('should render question text (not editable)', () => {
      const html = renderQuizQuestion(pgQuestion, 0, 'play');
      expect(html).toContain('Berapa 2 + 2?');
      expect(html).toContain('quiz-question-text');
    });

    it('should render radio buttons for PG questions', () => {
      const html = renderQuizQuestion(pgQuestion, 0, 'play');
      expect(html).toContain('type="radio"');
      expect(html).toContain('A. 3');
      expect(html).toContain('B. 4');
      expect(html).toContain('C. 5');
      expect(html).toContain('D. 6');
    });

    it('should render textarea for esai questions', () => {
      const html = renderQuizQuestion(esaiQuestion, 1, 'play');
      expect(html).toContain('form-textarea');
      expect(html).toContain('Tulis jawaban Anda');
    });

    it('should show bobot in badge', () => {
      const html = renderQuizQuestion(pgQuestion, 0, 'play');
      expect(html).toContain('Bobot: 10');
    });
  });

  describe('mode: review', () => {
    it('should show correct indicator for correct answer', () => {
      const html = renderQuizQuestion(pgQuestion, 0, 'review', { jawaban: 1, isCorrect: true });
      expect(html).toContain('Benar');
      expect(html).toContain('badge-success');
    });

    it('should show incorrect indicator for wrong answer', () => {
      const html = renderQuizQuestion(pgQuestion, 0, 'review', { jawaban: 0, isCorrect: false });
      expect(html).toContain('Salah');
      expect(html).toContain('badge-danger');
    });

    it('should mark the correct answer option', () => {
      const html = renderQuizQuestion(pgQuestion, 0, 'review', { jawaban: 0, isCorrect: false });
      expect(html).toContain('quiz-option-correct');
    });

    it('should mark the wrong selected option', () => {
      const html = renderQuizQuestion(pgQuestion, 0, 'review', { jawaban: 0, isCorrect: false });
      expect(html).toContain('quiz-option-wrong');
    });

    it('should show essay answer text in review mode', () => {
      const html = renderQuizQuestion(esaiQuestion, 1, 'review', { jawaban: 'Fotosintesis adalah...', isCorrect: true });
      expect(html).toContain('Fotosintesis adalah...');
      expect(html).toContain('Jawaban Anda');
    });

    it('should show "(Tidak dijawab)" when no answer given for essay', () => {
      const html = renderQuizQuestion(esaiQuestion, 1, 'review', { jawaban: '', isCorrect: false });
      expect(html).toContain('(Tidak dijawab)');
    });
  });

  it('should return empty string for unknown mode', () => {
    const html = renderQuizQuestion(pgQuestion, 0, 'unknown');
    expect(html).toBe('');
  });
});

// ============================================================
// showModal
// ============================================================

describe('showModal', () => {
  afterEach(() => {
    const modal = document.getElementById('appModal');
    if (modal) modal.remove();
  });

  it('should create a modal overlay in the DOM', () => {
    showModal('Test Title', '<p>Content here</p>');
    const modal = document.getElementById('appModal');
    expect(modal).not.toBeNull();
    expect(modal.classList.contains('modal-overlay')).toBe(true);
    expect(modal.classList.contains('active')).toBe(true);
  });

  it('should display the title', () => {
    showModal('My Modal', '<p>Body</p>');
    expect(document.getElementById('modalTitle').textContent).toBe('My Modal');
  });

  it('should display the content as HTML', () => {
    showModal('Title', '<p class="test-content">Hello</p>');
    expect(document.querySelector('.modal-body .test-content')).not.toBeNull();
  });

  it('should render action buttons', () => {
    showModal('Title', '<p>Content</p>', [
      { label: 'Simpan', type: 'primary' },
      { label: 'Batal', type: 'secondary' }
    ]);
    const footer = document.querySelector('.modal-footer');
    expect(footer).not.toBeNull();
    expect(footer.textContent).toContain('Simpan');
    expect(footer.textContent).toContain('Batal');
  });

  it('should close modal when close button clicked', () => {
    vi.useFakeTimers();
    showModal('Title', '<p>Content</p>');
    document.getElementById('modalCloseBtn').click();
    vi.advanceTimersByTime(400);
    expect(document.getElementById('appModal')).toBeNull();
    vi.useRealTimers();
  });

  it('should close modal when overlay is clicked', () => {
    vi.useFakeTimers();
    showModal('Title', '<p>Content</p>');
    const overlay = document.getElementById('appModal');
    // Simulate click directly on overlay (not on modal content)
    const event = new MouseEvent('click', { bubbles: true });
    Object.defineProperty(event, 'target', { value: overlay });
    overlay.dispatchEvent(event);
    vi.advanceTimersByTime(400);
    expect(document.getElementById('appModal')).toBeNull();
    vi.useRealTimers();
  });

  it('should call action handler when button is clicked', () => {
    vi.useFakeTimers();
    const handler = vi.fn();
    showModal('Title', '<p>Content</p>', [
      { label: 'OK', type: 'primary', handler }
    ]);
    const btn = document.querySelector('[data-action="OK"]');
    btn.click();
    expect(handler).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(400);
    vi.useRealTimers();
  });

  it('should remove existing modal before creating new one', () => {
    showModal('First', '<p>1</p>');
    showModal('Second', '<p>2</p>');
    const modals = document.querySelectorAll('#appModal');
    expect(modals.length).toBe(1);
    expect(document.getElementById('modalTitle').textContent).toBe('Second');
  });
});

// ============================================================
// showConfirm
// ============================================================

describe('showConfirm', () => {
  afterEach(() => {
    vi.useRealTimers();
    const confirm = document.getElementById('appConfirm');
    if (confirm) confirm.remove();
  });

  it('should create a confirm dialog in the DOM', () => {
    showConfirm('Yakin ingin menghapus?');
    const confirm = document.getElementById('appConfirm');
    expect(confirm).not.toBeNull();
    expect(confirm.classList.contains('confirm-dialog')).toBe(true);
  });

  it('should display the message', () => {
    showConfirm('Hapus data ini?');
    const body = document.querySelector('#appConfirm .modal-body');
    expect(body.textContent).toContain('Hapus data ini?');
  });

  it('should have Ya and Batal buttons', () => {
    showConfirm('Konfirmasi?');
    expect(document.getElementById('confirmYaBtn')).not.toBeNull();
    expect(document.getElementById('confirmBatalBtn')).not.toBeNull();
    expect(document.getElementById('confirmYaBtn').textContent).toBe('Ya');
    expect(document.getElementById('confirmBatalBtn').textContent).toBe('Batal');
  });

  it('should resolve true when Ya is clicked', async () => {
    vi.useFakeTimers();
    const promise = showConfirm('Proceed?');
    document.getElementById('confirmYaBtn').click();
    vi.advanceTimersByTime(400);
    const result = await promise;
    expect(result).toBe(true);
  });

  it('should resolve false when Batal is clicked', async () => {
    vi.useFakeTimers();
    const promise = showConfirm('Cancel?');
    document.getElementById('confirmBatalBtn').click();
    vi.advanceTimersByTime(400);
    const result = await promise;
    expect(result).toBe(false);
  });

  it('should resolve false when close button is clicked', async () => {
    vi.useFakeTimers();
    const promise = showConfirm('Close?');
    document.getElementById('confirmCloseBtn').click();
    vi.advanceTimersByTime(400);
    const result = await promise;
    expect(result).toBe(false);
  });

  it('should remove dialog from DOM after resolution', async () => {
    vi.useFakeTimers();
    const promise = showConfirm('Remove?');
    document.getElementById('confirmYaBtn').click();
    vi.advanceTimersByTime(400);
    await promise;
    expect(document.getElementById('appConfirm')).toBeNull();
  });
});
