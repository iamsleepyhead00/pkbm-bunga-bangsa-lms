/**
 * tests/arbitraries.js — fast-check custom arbitraries for PKBM LMS
 * Domain-specific generators for property-based testing
 */

import fc from 'fast-check';

// ==================== Enums / Constants ====================

export const arbRole = fc.constantFrom('ADMIN', 'GURU', 'SISWA');

export const arbProgram = fc.constantFrom('PAKET_A', 'PAKET_B', 'PAKET_C');

export const arbKelas = fc.constantFrom('Kelas 1', 'Kelas 2', 'Kelas 3', 'Kelas 6');

export const arbMapelPaketA = fc.constantFrom(
  'Matematika', 'B. Indonesia', 'IPA', 'IPS', 'PKN', 'Agama', 'SBK', 'PJOK'
);

export const arbMapelPaketB = fc.constantFrom(
  'Matematika', 'B. Indonesia', 'B. Inggris', 'IPA', 'IPS',
  'PKN', 'Agama', 'Seni Budaya', 'PJOK', 'Prakarya'
);

export const arbMapelPaketC = fc.constantFrom(
  'Matematika', 'B. Indonesia', 'B. Inggris', 'Fisika', 'Biologi',
  'Kimia', 'Ekonomi', 'Sosiologi', 'Geografi', 'Sejarah', 'PKN', 'Agama'
);

export const arbQuizTipeSoal = fc.constantFrom('PILIHAN_GANDA', 'ESAI');

export const arbMaterialTipe = fc.constantFrom('TEKS', 'FILE', 'LINK');

export const arbNotifTipe = fc.constantFrom(
  'MATERI_BARU', 'TUGAS_BARU', 'KUIS_BARU', 'NILAI', 'FORUM', 'DEADLINE'
);

// ==================== ID Generators ====================

export const arbUserId = fc.string({ minLength: 12, maxLength: 12, unit: fc.constantFrom(
  ...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')
) }).map(s => `usr_${s}`);

export const arbCourseId = fc.string({ minLength: 12, maxLength: 12, unit: fc.constantFrom(
  ...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')
) }).map(s => `crs_${s}`);

// ==================== Domain Objects ====================

/**
 * Arbitrary User object
 */
export const arbUser = fc.record({
  id: arbUserId,
  username: fc.string({ minLength: 3, maxLength: 20, unit: fc.constantFrom(
    ...'abcdefghijklmnopqrstuvwxyz0123456789_'.split('')
  ) }),
  nama: fc.string({ minLength: 2, maxLength: 50, unit: fc.constantFrom(
    ...'abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
  ) }),
  role: arbRole,
  program: fc.option(arbProgram, { nil: null }),
  kelas: fc.option(arbKelas, { nil: null }),
  aktif: fc.boolean()
});

/**
 * Arbitrary User that is a valid Siswa (has program and kelas)
 */
export const arbSiswa = fc.record({
  id: arbUserId,
  username: fc.string({ minLength: 3, maxLength: 20, unit: fc.constantFrom(
    ...'abcdefghijklmnopqrstuvwxyz0123456789_'.split('')
  ) }),
  nama: fc.string({ minLength: 2, maxLength: 50, unit: fc.constantFrom(
    ...'abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
  ) }),
  role: fc.constant('SISWA'),
  program: arbProgram,
  kelas: arbKelas,
  aktif: fc.boolean()
});

/**
 * Arbitrary Course object
 */
export const arbCourse = fc.record({
  id: arbCourseId,
  nama: fc.string({ minLength: 3, maxLength: 100, unit: fc.constantFrom(
    ...'abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('')
  ) }),
  program: arbProgram,
  kelas: arbKelas,
  mataPelajaran: fc.string({ minLength: 2, maxLength: 30, unit: fc.constantFrom(
    ...'abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ.'.split('')
  ) }),
  guruId: arbUserId,
  aktif: fc.boolean()
});

/**
 * Arbitrary Grade (nilai 0-100 + optional komentar)
 */
export const arbGrade = fc.record({
  nilai: fc.integer({ min: 0, max: 100 }),
  komentar: fc.option(
    fc.string({ minLength: 1, maxLength: 200 }),
    { nil: null }
  )
});

/**
 * Arbitrary invalid grade (outside 0-100 range)
 */
export const arbInvalidGrade = fc.oneof(
  fc.integer({ min: -1000, max: -1 }),
  fc.integer({ min: 101, max: 1000 })
);

/**
 * Arbitrary password (variable length 0-30)
 */
export const arbPassword = fc.string({ minLength: 0, maxLength: 30 });

/**
 * Arbitrary valid password (min 8 chars)
 */
export const arbValidPassword = fc.string({ minLength: 8, maxLength: 30 });

/**
 * Arbitrary short/invalid password (< 8 chars)
 */
export const arbShortPassword = fc.string({ minLength: 0, maxLength: 7 });

/**
 * Arbitrary file size in bytes (0 to 20MB)
 */
export const arbFileSize = fc.integer({ min: 0, max: 20 * 1024 * 1024 });

/**
 * Arbitrary file size within limit (<= 10MB)
 */
export const arbValidFileSize = fc.integer({ min: 0, max: 10 * 1024 * 1024 });

/**
 * Arbitrary file size over limit (> 10MB)
 */
export const arbOverLimitFileSize = fc.integer({ min: 10 * 1024 * 1024 + 1, max: 20 * 1024 * 1024 });

/**
 * Arbitrary Quiz Question (pilihan ganda)
 */
export const arbQuizQuestionPG = fc.record({
  id: fc.string({ minLength: 12, maxLength: 12, unit: fc.constantFrom(
    ...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')
  ) }).map(s => `qsn_${s}`),
  tipe: fc.constant('PILIHAN_GANDA'),
  pertanyaan: fc.string({ minLength: 5, maxLength: 200 }),
  opsi: fc.tuple(
    fc.string({ minLength: 1, maxLength: 100 }),
    fc.string({ minLength: 1, maxLength: 100 }),
    fc.string({ minLength: 1, maxLength: 100 }),
    fc.string({ minLength: 1, maxLength: 100 })
  ).map(([a, b, c, d]) => [a, b, c, d]),
  jawabanBenar: fc.integer({ min: 0, max: 3 }),
  bobot: fc.integer({ min: 1, max: 10 }),
  urutan: fc.integer({ min: 1, max: 50 })
});

/**
 * Arbitrary Quiz Question (esai)
 */
export const arbQuizQuestionEsai = fc.record({
  id: fc.string({ minLength: 12, maxLength: 12, unit: fc.constantFrom(
    ...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')
  ) }).map(s => `qsn_${s}`),
  tipe: fc.constant('ESAI'),
  pertanyaan: fc.string({ minLength: 5, maxLength: 200 }),
  opsi: fc.constant(null),
  jawabanBenar: fc.constant(null),
  bobot: fc.integer({ min: 1, max: 10 }),
  urutan: fc.integer({ min: 1, max: 50 })
});

/**
 * Arbitrary Quiz Question (mixed types)
 */
export const arbQuizQuestion = fc.oneof(arbQuizQuestionPG, arbQuizQuestionEsai);

/**
 * Arbitrary Forum Topic
 */
export const arbForumTopic = fc.record({
  id: fc.string({ minLength: 12, maxLength: 12, unit: fc.constantFrom(
    ...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')
  ) }).map(s => `ftp_${s}`),
  courseId: arbCourseId,
  userId: arbUserId,
  judul: fc.string({ minLength: 3, maxLength: 100 }),
  isi: fc.string({ minLength: 5, maxLength: 500 }),
  createdAt: fc.integer({ min: new Date('2024-01-01').getTime(), max: new Date('2025-12-31').getTime() })
    .map(ts => new Date(ts).toISOString())
});

/**
 * Arbitrary Forum Reply
 */
export const arbForumReply = fc.record({
  id: fc.string({ minLength: 12, maxLength: 12, unit: fc.constantFrom(
    ...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')
  ) }).map(s => `frp_${s}`),
  topicId: fc.string({ minLength: 12, maxLength: 12, unit: fc.constantFrom(
    ...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')
  ) }).map(s => `ftp_${s}`),
  userId: arbUserId,
  isi: fc.string({ minLength: 1, maxLength: 500 }),
  createdAt: fc.integer({ min: new Date('2024-01-01').getTime(), max: new Date('2025-12-31').getTime() })
    .map(ts => new Date(ts).toISOString())
});

/**
 * Arbitrary ISO date string
 */
export const arbISODate = fc.integer({
  min: new Date('2024-01-01').getTime(),
  max: new Date('2025-12-31').getTime()
}).map(ts => new Date(ts).toISOString());

/**
 * Arbitrary material order number
 */
export const arbUrutan = fc.integer({ min: 1, max: 100 });

/**
 * Arbitrary material (simplified for testing)
 */
export const arbMaterial = fc.record({
  id: fc.string({ minLength: 12, maxLength: 12, unit: fc.constantFrom(
    ...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')
  ) }).map(s => `mat_${s}`),
  courseId: arbCourseId,
  judul: fc.string({ minLength: 3, maxLength: 100 }),
  deskripsi: fc.string({ minLength: 0, maxLength: 200 }),
  tipe: arbMaterialTipe,
  konten: fc.string({ minLength: 0, maxLength: 500 }),
  fileData: fc.constant(null),
  fileName: fc.constant(null),
  fileSize: fc.constant(null),
  urutan: arbUrutan,
  published: fc.boolean(),
  createdAt: arbISODate
});

/**
 * Helper: generate a valid program-kelas pair
 * Ensures kelas is valid for the selected program
 */
export const arbProgramKelasPair = fc.oneof(
  fc.constant({ program: 'PAKET_A', kelas: 'Kelas 6' }),
  fc.tuple(fc.constant('PAKET_B'), fc.constantFrom('Kelas 1', 'Kelas 2', 'Kelas 3'))
    .map(([program, kelas]) => ({ program, kelas })),
  fc.tuple(fc.constant('PAKET_C'), fc.constantFrom('Kelas 1', 'Kelas 2', 'Kelas 3'))
    .map(([program, kelas]) => ({ program, kelas }))
);
