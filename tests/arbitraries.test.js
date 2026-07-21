/**
 * Sanity tests for custom arbitraries
 * Verifies that all generators produce valid domain objects
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  arbRole,
  arbProgram,
  arbKelas,
  arbUser,
  arbSiswa,
  arbCourse,
  arbGrade,
  arbInvalidGrade,
  arbPassword,
  arbValidPassword,
  arbShortPassword,
  arbFileSize,
  arbValidFileSize,
  arbOverLimitFileSize,
  arbQuizQuestionPG,
  arbQuizQuestionEsai,
  arbQuizQuestion,
  arbForumTopic,
  arbForumReply,
  arbProgramKelasPair,
  arbMaterial
} from './arbitraries.js';

describe('Arbitraries - Enum generators', () => {
  it('arbRole produces valid roles', () => {
    fc.assert(fc.property(arbRole, (role) => {
      return ['ADMIN', 'GURU', 'SISWA'].includes(role);
    }));
  });

  it('arbProgram produces valid programs', () => {
    fc.assert(fc.property(arbProgram, (program) => {
      return ['PAKET_A', 'PAKET_B', 'PAKET_C'].includes(program);
    }));
  });

  it('arbKelas produces valid kelas', () => {
    fc.assert(fc.property(arbKelas, (kelas) => {
      return ['Kelas 1', 'Kelas 2', 'Kelas 3', 'Kelas 6'].includes(kelas);
    }));
  });
});

describe('Arbitraries - User generators', () => {
  it('arbUser produces objects with required fields', () => {
    fc.assert(fc.property(arbUser, (user) => {
      return (
        typeof user.id === 'string' &&
        user.id.startsWith('usr_') &&
        typeof user.username === 'string' &&
        typeof user.nama === 'string' &&
        ['ADMIN', 'GURU', 'SISWA'].includes(user.role) &&
        typeof user.aktif === 'boolean'
      );
    }));
  });

  it('arbSiswa always has role SISWA and required fields', () => {
    fc.assert(fc.property(arbSiswa, (siswa) => {
      return (
        siswa.role === 'SISWA' &&
        ['PAKET_A', 'PAKET_B', 'PAKET_C'].includes(siswa.program) &&
        ['Kelas 1', 'Kelas 2', 'Kelas 3', 'Kelas 6'].includes(siswa.kelas)
      );
    }));
  });
});

describe('Arbitraries - Course generator', () => {
  it('arbCourse produces valid course objects', () => {
    fc.assert(fc.property(arbCourse, (course) => {
      return (
        course.id.startsWith('crs_') &&
        typeof course.nama === 'string' &&
        ['PAKET_A', 'PAKET_B', 'PAKET_C'].includes(course.program) &&
        typeof course.mataPelajaran === 'string' &&
        course.guruId.startsWith('usr_') &&
        typeof course.aktif === 'boolean'
      );
    }));
  });
});

describe('Arbitraries - Grade generators', () => {
  it('arbGrade produces nilai in range 0-100', () => {
    fc.assert(fc.property(arbGrade, (grade) => {
      return grade.nilai >= 0 && grade.nilai <= 100;
    }));
  });

  it('arbInvalidGrade produces nilai outside 0-100', () => {
    fc.assert(fc.property(arbInvalidGrade, (nilai) => {
      return nilai < 0 || nilai > 100;
    }));
  });
});

describe('Arbitraries - Password generators', () => {
  it('arbPassword produces strings 0-30 chars', () => {
    fc.assert(fc.property(arbPassword, (pw) => {
      return typeof pw === 'string' && pw.length <= 30;
    }));
  });

  it('arbValidPassword produces strings >= 8 chars', () => {
    fc.assert(fc.property(arbValidPassword, (pw) => {
      return pw.length >= 8 && pw.length <= 30;
    }));
  });

  it('arbShortPassword produces strings < 8 chars', () => {
    fc.assert(fc.property(arbShortPassword, (pw) => {
      return pw.length < 8;
    }));
  });
});

describe('Arbitraries - File size generators', () => {
  it('arbFileSize produces values 0-20MB', () => {
    fc.assert(fc.property(arbFileSize, (size) => {
      return size >= 0 && size <= 20 * 1024 * 1024;
    }));
  });

  it('arbValidFileSize produces values <= 10MB', () => {
    fc.assert(fc.property(arbValidFileSize, (size) => {
      return size >= 0 && size <= 10 * 1024 * 1024;
    }));
  });

  it('arbOverLimitFileSize produces values > 10MB', () => {
    fc.assert(fc.property(arbOverLimitFileSize, (size) => {
      return size > 10 * 1024 * 1024;
    }));
  });
});

describe('Arbitraries - Quiz Question generators', () => {
  it('arbQuizQuestionPG produces valid PG questions', () => {
    fc.assert(fc.property(arbQuizQuestionPG, (q) => {
      return (
        q.id.startsWith('qsn_') &&
        q.tipe === 'PILIHAN_GANDA' &&
        Array.isArray(q.opsi) &&
        q.opsi.length === 4 &&
        q.jawabanBenar >= 0 &&
        q.jawabanBenar <= 3 &&
        q.bobot >= 1 &&
        typeof q.pertanyaan === 'string'
      );
    }));
  });

  it('arbQuizQuestionEsai produces valid essay questions', () => {
    fc.assert(fc.property(arbQuizQuestionEsai, (q) => {
      return (
        q.id.startsWith('qsn_') &&
        q.tipe === 'ESAI' &&
        q.opsi === null &&
        q.jawabanBenar === null &&
        q.bobot >= 1
      );
    }));
  });
});

describe('Arbitraries - Forum generators', () => {
  it('arbForumTopic produces valid topics', () => {
    fc.assert(fc.property(arbForumTopic, (topic) => {
      return (
        topic.id.startsWith('ftp_') &&
        topic.courseId.startsWith('crs_') &&
        topic.userId.startsWith('usr_') &&
        typeof topic.judul === 'string' &&
        typeof topic.isi === 'string' &&
        typeof topic.createdAt === 'string'
      );
    }));
  });

  it('arbForumReply produces valid replies', () => {
    fc.assert(fc.property(arbForumReply, (reply) => {
      return (
        reply.id.startsWith('frp_') &&
        reply.topicId.startsWith('ftp_') &&
        reply.userId.startsWith('usr_') &&
        typeof reply.isi === 'string'
      );
    }));
  });
});

describe('Arbitraries - ProgramKelasPair', () => {
  it('arbProgramKelasPair produces valid pairs', () => {
    fc.assert(fc.property(arbProgramKelasPair, (pair) => {
      if (pair.program === 'PAKET_A') {
        return pair.kelas === 'Kelas 6';
      }
      if (pair.program === 'PAKET_B' || pair.program === 'PAKET_C') {
        return ['Kelas 1', 'Kelas 2', 'Kelas 3'].includes(pair.kelas);
      }
      return false;
    }));
  });
});

describe('Arbitraries - Material generator', () => {
  it('arbMaterial produces valid materials', () => {
    fc.assert(fc.property(arbMaterial, (mat) => {
      return (
        mat.id.startsWith('mat_') &&
        mat.courseId.startsWith('crs_') &&
        ['TEKS', 'FILE', 'LINK'].includes(mat.tipe) &&
        typeof mat.judul === 'string' &&
        mat.urutan >= 1 &&
        typeof mat.published === 'boolean'
      );
    }));
  });
});
