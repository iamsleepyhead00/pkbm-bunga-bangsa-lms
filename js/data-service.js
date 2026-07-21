/**
 * data-service.js - Data abstraction layer (localStorage)
 * Full CRUD operations for all entities.
 * All methods are async for future Supabase migration.
 */

import { generateId, hashPassword, calculateAutoGrade as calcAutoGrade } from './utils.js';
import { KURIKULUM } from './curriculum.js';

// localStorage keys
const KEYS = {
  USERS: 'pkbm_users',
  COURSES: 'pkbm_courses',
  ENROLLMENTS: 'pkbm_enrollments',
  MATERIALS: 'pkbm_materials',
  MATERIAL_ACCESS: 'pkbm_material_access',
  ASSIGNMENTS: 'pkbm_assignments',
  SUBMISSIONS: 'pkbm_submissions',
  QUIZZES: 'pkbm_quizzes',
  QUIZ_ATTEMPTS: 'pkbm_quiz_attempts',
  GRADES: 'pkbm_grades',
  FORUM_TOPICS: 'pkbm_forum_topics',
  FORUM_REPLIES: 'pkbm_forum_replies',
  NOTIFICATIONS: 'pkbm_notifications',
  SESSION: 'pkbm_lms_session'
};

export { KEYS };

// === Internal helpers ===

function getStore(key) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function setStore(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function getSession() {
  try {
    const data = localStorage.getItem(KEYS.SESSION);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

function setSession(session) {
  if (session) {
    localStorage.setItem(KEYS.SESSION, JSON.stringify(session));
  } else {
    localStorage.removeItem(KEYS.SESSION);
  }
}

// === DataService Class ===

class DataService {

  // ==================== Authentication ====================

  async authenticate(username, password) {
    const users = getStore(KEYS.USERS);
    const passHash = await hashPassword(password);
    const user = users.find(
      u => u.username === username && u.passwordHash === passHash && u.aktif === true
    );
    return user || null;
  }

  async getCurrentSession() {
    return getSession();
  }

  async logout() {
    setSession(null);
  }

  // ==================== Users ====================

  async getUsers(filter = {}) {
    let users = getStore(KEYS.USERS);
    if (filter.role) {
      users = users.filter(u => u.role === filter.role);
    }
    if (filter.program) {
      users = users.filter(u => u.program === filter.program);
    }
    if (filter.kelas) {
      users = users.filter(u => u.kelas === filter.kelas);
    }
    if (filter.aktif !== undefined) {
      users = users.filter(u => u.aktif === filter.aktif);
    }
    return users;
  }

  async getUserById(id) {
    const users = getStore(KEYS.USERS);
    return users.find(u => u.id === id) || null;
  }

  async createUser(data) {
    const users = getStore(KEYS.USERS);
    const now = new Date().toISOString();
    const newUser = {
      id: generateId('usr'),
      username: data.username,
      passwordHash: data.passwordHash || await hashPassword(data.password || 'password123'),
      nama: data.nama,
      role: data.role,
      program: data.program || null,
      kelas: data.kelas || null,
      aktif: true,
      createdAt: now,
      updatedAt: now
    };
    users.push(newUser);
    setStore(KEYS.USERS, users);
    return newUser;
  }

  async updateUser(id, data) {
    const users = getStore(KEYS.USERS);
    const index = users.findIndex(u => u.id === id);
    if (index === -1) return null;
    users[index] = {
      ...users[index],
      ...data,
      id,
      updatedAt: new Date().toISOString()
    };
    setStore(KEYS.USERS, users);
    return users[index];
  }

  async deactivateUser(id) {
    return this.updateUser(id, { aktif: false });
  }

  // ==================== Courses ====================

  async getCourses(filter = {}) {
    let courses = getStore(KEYS.COURSES);
    if (filter.guruId) {
      courses = courses.filter(c => c.guruId === filter.guruId);
    }
    if (filter.siswaId) {
      const enrollments = getStore(KEYS.ENROLLMENTS);
      const enrolledCourseIds = enrollments
        .filter(e => e.siswaId === filter.siswaId && e.aktif === true)
        .map(e => e.courseId);
      courses = courses.filter(c => enrolledCourseIds.includes(c.id) && c.aktif === true);
    }
    if (filter.program) {
      courses = courses.filter(c => c.program === filter.program);
    }
    if (filter.kelas) {
      courses = courses.filter(c => c.kelas === filter.kelas);
    }
    if (filter.aktif !== undefined) {
      courses = courses.filter(c => c.aktif === filter.aktif);
    }
    return courses;
  }

  async getCourseById(id) {
    const courses = getStore(KEYS.COURSES);
    return courses.find(c => c.id === id) || null;
  }

  async createCourse(data) {
    // Validate required fields
    const requiredFields = ['nama', 'program', 'kelas', 'mataPelajaran'];
    for (const field of requiredFields) {
      if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
        return { error: `Field "${field}" wajib diisi` };
      }
    }

    // Validate program is valid
    if (!KURIKULUM[data.program]) {
      return { error: `Program "${data.program}" tidak valid` };
    }

    // Validate mataPelajaran against curriculum for the selected program
    const validMapel = KURIKULUM[data.program].mapel;
    if (!validMapel.includes(data.mataPelajaran)) {
      return { error: `Mata pelajaran "${data.mataPelajaran}" tidak valid untuk program ${data.program}` };
    }

    const courses = getStore(KEYS.COURSES);
    const now = new Date().toISOString();
    const newCourse = {
      id: generateId('crs'),
      nama: data.nama,
      deskripsi: data.deskripsi || '',
      program: data.program,
      kelas: data.kelas,
      mataPelajaran: data.mataPelajaran,
      guruId: data.guruId,
      aktif: true,
      createdAt: now
    };
    courses.push(newCourse);
    setStore(KEYS.COURSES, courses);
    return newCourse;
  }

  async updateCourse(id, data) {
    const courses = getStore(KEYS.COURSES);
    const index = courses.findIndex(c => c.id === id);
    if (index === -1) return null;
    courses[index] = { ...courses[index], ...data, id };
    setStore(KEYS.COURSES, courses);
    return courses[index];
  }

  async deactivateCourse(id) {
    return this.updateCourse(id, { aktif: false });
  }

  async getCourseStudents(courseId) {
    const enrollments = getStore(KEYS.ENROLLMENTS);
    const activeEnrollments = enrollments.filter(
      e => e.courseId === courseId && e.aktif === true
    );
    const users = getStore(KEYS.USERS);
    return activeEnrollments.map(e => users.find(u => u.id === e.siswaId)).filter(Boolean);
  }

  // ==================== Enrollments ====================

  async enrollStudents(courseId, siswaIds) {
    const enrollments = getStore(KEYS.ENROLLMENTS);
    const now = new Date().toISOString();
    for (const siswaId of siswaIds) {
      const existing = enrollments.find(
        e => e.courseId === courseId && e.siswaId === siswaId
      );
      if (existing) {
        existing.aktif = true;
        existing.enrolledAt = now;
      } else {
        enrollments.push({
          id: generateId('enr'),
          courseId,
          siswaId,
          enrolledAt: now,
          aktif: true
        });
      }
    }
    setStore(KEYS.ENROLLMENTS, enrollments);
  }

  async unenrollStudent(courseId, siswaId) {
    const enrollments = getStore(KEYS.ENROLLMENTS);
    const enrollment = enrollments.find(
      e => e.courseId === courseId && e.siswaId === siswaId
    );
    if (enrollment) {
      enrollment.aktif = false;
      setStore(KEYS.ENROLLMENTS, enrollments);
    }
  }

  async getStudentEnrollments(siswaId) {
    const enrollments = getStore(KEYS.ENROLLMENTS);
    return enrollments.filter(e => e.siswaId === siswaId && e.aktif === true);
  }

  async validateEnrollment(siswaId, courseId) {
    const users = getStore(KEYS.USERS);
    const courses = getStore(KEYS.COURSES);
    const siswa = users.find(u => u.id === siswaId);
    const course = courses.find(c => c.id === courseId);

    if (!siswa || !course) {
      return { valid: false, error: 'Data tidak ditemukan' };
    }
    if (siswa.program !== course.program || siswa.kelas !== course.kelas) {
      return {
        valid: false,
        error: 'Siswa tidak dapat didaftarkan karena program Paket tidak sesuai'
      };
    }
    return { valid: true };
  }

  // ==================== Materials ====================

  async getMaterials(courseId, options = {}) {
    let materials = getStore(KEYS.MATERIALS);
    materials = materials.filter(m => m.courseId === courseId);
    if (options.publishedOnly) {
      materials = materials.filter(m => m.published === true);
    }
    return materials.sort((a, b) => a.urutan - b.urutan);
  }

  async createMaterial(data) {
    // File size validation: max 10MB
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
    if (data.fileSize && data.fileSize > MAX_FILE_SIZE) {
      return { error: 'Ukuran file melebihi batas maksimal 10 MB' };
    }

    const materials = getStore(KEYS.MATERIALS);
    const now = new Date().toISOString();
    const courseMaterials = materials.filter(m => m.courseId === data.courseId);
    const maxUrutan = courseMaterials.length > 0
      ? Math.max(...courseMaterials.map(m => m.urutan))
      : 0;

    const newMaterial = {
      id: generateId('mat'),
      courseId: data.courseId,
      judul: data.judul,
      deskripsi: data.deskripsi || '',
      tipe: data.tipe, // TEKS, FILE, LINK
      konten: data.konten || '',
      fileData: data.fileData || null,
      fileName: data.fileName || null,
      fileSize: data.fileSize || null,
      urutan: data.urutan || (maxUrutan + 1),
      published: data.published !== undefined ? data.published : false,
      createdAt: now
    };
    materials.push(newMaterial);
    setStore(KEYS.MATERIALS, materials);
    return newMaterial;
  }

  async updateMaterial(id, data) {
    // File size validation on update: max 10MB
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
    if (data.fileSize && data.fileSize > MAX_FILE_SIZE) {
      return { error: 'Ukuran file melebihi batas maksimal 10 MB' };
    }

    const materials = getStore(KEYS.MATERIALS);
    const index = materials.findIndex(m => m.id === id);
    if (index === -1) return null;
    materials[index] = { ...materials[index], ...data, id };
    setStore(KEYS.MATERIALS, materials);
    return materials[index];
  }

  async deleteMaterial(id) {
    let materials = getStore(KEYS.MATERIALS);
    materials = materials.filter(m => m.id !== id);
    setStore(KEYS.MATERIALS, materials);
  }

  async reorderMaterials(courseId, orderedIds) {
    const materials = getStore(KEYS.MATERIALS);
    for (let i = 0; i < orderedIds.length; i++) {
      const mat = materials.find(m => m.id === orderedIds[i] && m.courseId === courseId);
      if (mat) {
        mat.urutan = i + 1;
      }
    }
    setStore(KEYS.MATERIALS, materials);
  }

  async recordMaterialAccess(materialId, siswaId) {
    const accesses = getStore(KEYS.MATERIAL_ACCESS);
    const existing = accesses.find(
      a => a.materialId === materialId && a.siswaId === siswaId
    );
    if (!existing) {
      accesses.push({
        id: generateId('mta'),
        materialId,
        siswaId,
        accessedAt: new Date().toISOString()
      });
      setStore(KEYS.MATERIAL_ACCESS, accesses);
    }
  }

  // ==================== Assignments ====================

  async getAssignments(courseId, options = {}) {
    let assignments = getStore(KEYS.ASSIGNMENTS);
    assignments = assignments.filter(a => a.courseId === courseId);
    if (options.visibleOnly) {
      const now = new Date();
      assignments = assignments.filter(a => now >= new Date(a.tanggalMulai));
    }
    return assignments;
  }

  async createAssignment(data) {
    // Validate required fields
    const requiredFields = ['judul', 'courseId', 'tanggalMulai', 'batasWaktu'];
    for (const field of requiredFields) {
      if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
        return { error: `Field "${field}" wajib diisi` };
      }
    }

    // Validate attachment file sizes (max 10MB per file)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
    if (data.attachments && Array.isArray(data.attachments)) {
      for (const att of data.attachments) {
        if (att.fileData) {
          // Estimate base64 size: base64 string length * 0.75 gives approximate byte size
          const estimatedSize = att.fileSize || Math.ceil(att.fileData.length * 0.75);
          if (estimatedSize > MAX_FILE_SIZE) {
            return { error: 'Ukuran file melebihi batas maksimal 10 MB' };
          }
        }
      }
    }

    const assignments = getStore(KEYS.ASSIGNMENTS);
    const now = new Date().toISOString();
    const newAssignment = {
      id: generateId('asg'),
      courseId: data.courseId,
      judul: data.judul,
      deskripsi: data.deskripsi || '',
      tanggalMulai: data.tanggalMulai,
      batasWaktu: data.batasWaktu,
      attachments: data.attachments || [],
      createdAt: now
    };
    assignments.push(newAssignment);
    setStore(KEYS.ASSIGNMENTS, assignments);
    return newAssignment;
  }

  async submitAssignment(assignmentId, siswaId, data) {
    const assignments = getStore(KEYS.ASSIGNMENTS);
    const assignment = assignments.find(a => a.id === assignmentId);
    if (!assignment) return { error: 'Tugas tidak ditemukan' };

    const now = new Date();
    if (now > new Date(assignment.batasWaktu)) {
      return { error: 'Batas waktu pengumpulan telah lewat' };
    }

    // File size validation (max 10MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
    if (data.fileData) {
      const estimatedSize = data.fileSize || Math.ceil(data.fileData.length * 0.75);
      if (estimatedSize > MAX_FILE_SIZE) {
        return { error: 'Ukuran file melebihi batas maksimal 10 MB' };
      }
    }

    const submissions = getStore(KEYS.SUBMISSIONS);
    const newSubmission = {
      id: generateId('sub'),
      assignmentId,
      siswaId,
      tipe: data.tipe || 'TEKS',
      konten: data.konten || null,
      fileData: data.fileData || null,
      fileName: data.fileName || null,
      submittedAt: now.toISOString()
    };
    submissions.push(newSubmission);
    setStore(KEYS.SUBMISSIONS, submissions);
    return newSubmission;
  }

  async getSubmissions(assignmentId) {
    const submissions = getStore(KEYS.SUBMISSIONS);
    return submissions.filter(s => s.assignmentId === assignmentId);
  }

  async getStudentSubmission(assignmentId, siswaId) {
    const submissions = getStore(KEYS.SUBMISSIONS);
    return submissions.find(
      s => s.assignmentId === assignmentId && s.siswaId === siswaId
    ) || null;
  }

  // ==================== Quizzes ====================

  async getQuizzes(courseId, options = {}) {
    let quizzes = getStore(KEYS.QUIZZES);
    quizzes = quizzes.filter(q => q.courseId === courseId);
    if (options.availableOnly) {
      const now = new Date();
      quizzes = quizzes.filter(q => {
        const start = new Date(q.tanggalMulai);
        const end = new Date(q.tanggalBerakhir);
        return now >= start && now <= end;
      });
    }
    return quizzes;
  }

  async createQuiz(data) {
    // Validate required fields
    const requiredFields = ['judul', 'courseId', 'durasi', 'tanggalMulai', 'tanggalBerakhir'];
    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === null || data[field] === '') {
        return { error: `Field "${field}" wajib diisi` };
      }
    }

    // Validate durasi is positive number
    if (typeof data.durasi !== 'number' || data.durasi <= 0) {
      return { error: 'Durasi harus berupa angka positif (dalam menit)' };
    }

    // Validate soal is non-empty array
    if (!data.soal || !Array.isArray(data.soal) || data.soal.length === 0) {
      return { error: 'Kuis harus memiliki minimal 1 soal' };
    }

    // Validate each question
    for (let i = 0; i < data.soal.length; i++) {
      const s = data.soal[i];
      if (!s.pertanyaan || s.pertanyaan.trim() === '') {
        return { error: `Soal #${i + 1}: pertanyaan wajib diisi` };
      }
      if (!s.tipe || !['PILIHAN_GANDA', 'ESAI'].includes(s.tipe)) {
        return { error: `Soal #${i + 1}: tipe harus PILIHAN_GANDA atau ESAI` };
      }
      if (s.tipe === 'PILIHAN_GANDA') {
        if (!s.opsi || !Array.isArray(s.opsi) || s.opsi.length !== 4) {
          return { error: `Soal #${i + 1}: pilihan ganda harus memiliki 4 opsi` };
        }
        if (s.jawabanBenar === undefined || s.jawabanBenar === null || s.jawabanBenar < 0 || s.jawabanBenar > 3) {
          return { error: `Soal #${i + 1}: jawaban benar harus berupa index 0-3` };
        }
      }
    }

    const quizzes = getStore(KEYS.QUIZZES);
    const now = new Date().toISOString();
    const newQuiz = {
      id: generateId('qiz'),
      courseId: data.courseId,
      judul: data.judul,
      durasi: data.durasi,
      tanggalMulai: data.tanggalMulai,
      tanggalBerakhir: data.tanggalBerakhir,
      tampilkanJawaban: data.tampilkanJawaban || false,
      soal: data.soal.map((s, idx) => ({
        id: s.id || generateId('qsn'),
        tipe: s.tipe,
        pertanyaan: s.pertanyaan,
        opsi: s.opsi || null,
        jawabanBenar: s.jawabanBenar !== undefined ? s.jawabanBenar : null,
        bobot: s.bobot || 1,
        urutan: s.urutan !== undefined ? s.urutan : idx + 1
      })),
      createdAt: now
    };
    quizzes.push(newQuiz);
    setStore(KEYS.QUIZZES, quizzes);
    return newQuiz;
  }

  async getQuizById(quizId) {
    const quizzes = getStore(KEYS.QUIZZES);
    return quizzes.find(q => q.id === quizId) || null;
  }

  async startQuizAttempt(quizId, siswaId) {
    const attempts = getStore(KEYS.QUIZ_ATTEMPTS);
    const now = new Date().toISOString();
    const newAttempt = {
      id: generateId('qat'),
      quizId,
      siswaId,
      jawaban: [],
      startedAt: now,
      finishedAt: null,
      nilaiOtomatis: null
    };
    attempts.push(newAttempt);
    setStore(KEYS.QUIZ_ATTEMPTS, attempts);
    return newAttempt;
  }

  async submitQuizAttempt(attemptId, answers) {
    const attempts = getStore(KEYS.QUIZ_ATTEMPTS);
    const index = attempts.findIndex(a => a.id === attemptId);
    if (index === -1) return null;

    attempts[index].jawaban = answers;
    attempts[index].finishedAt = new Date().toISOString();

    // Auto-grade pilihan ganda
    const quizzes = getStore(KEYS.QUIZZES);
    const quiz = quizzes.find(q => q.id === attempts[index].quizId);
    if (quiz) {
      attempts[index].nilaiOtomatis = calcAutoGrade(quiz.soal, answers);
    }

    setStore(KEYS.QUIZ_ATTEMPTS, attempts);
    return attempts[index];
  }

  async getQuizAttempt(quizId, siswaId) {
    const attempts = getStore(KEYS.QUIZ_ATTEMPTS);
    return attempts.find(a => a.quizId === quizId && a.siswaId === siswaId) || null;
  }

  async getQuizAttemptById(attemptId) {
    const attempts = getStore(KEYS.QUIZ_ATTEMPTS);
    return attempts.find(a => a.id === attemptId) || null;
  }

  async getStudentQuizAttempts(quizId, siswaId) {
    const attempts = getStore(KEYS.QUIZ_ATTEMPTS);
    return attempts.filter(a => a.quizId === quizId && a.siswaId === siswaId);
  }

  async calculateAutoGrade(attempt) {
    const quizzes = getStore(KEYS.QUIZZES);
    const quiz = quizzes.find(q => q.id === attempt.quizId);
    if (!quiz) return 0;
    return calcAutoGrade(quiz.soal, attempt.jawaban);
  }

  // ==================== Grades ====================

  async gradeSubmission(submissionId, nilai, komentar = null) {
    if (nilai < 0 || nilai > 100) {
      return { error: 'Nilai harus antara 0-100' };
    }
    const grades = getStore(KEYS.GRADES);
    const session = getSession();
    const newGrade = {
      id: generateId('grd'),
      submissionId,
      quizAttemptId: null,
      guruId: session ? session.userId : null,
      nilai,
      komentar,
      createdAt: new Date().toISOString()
    };
    grades.push(newGrade);
    setStore(KEYS.GRADES, grades);
    return newGrade;
  }

  async gradeQuizEssay(attemptId, nilai, komentar = null) {
    if (nilai < 0 || nilai > 100) {
      return { error: 'Nilai harus antara 0-100' };
    }
    const grades = getStore(KEYS.GRADES);
    const session = getSession();
    const newGrade = {
      id: generateId('grd'),
      submissionId: null,
      quizAttemptId: attemptId,
      guruId: session ? session.userId : null,
      nilai,
      komentar,
      createdAt: new Date().toISOString()
    };
    grades.push(newGrade);
    setStore(KEYS.GRADES, grades);
    return newGrade;
  }

  async getStudentGrades(siswaId, courseId = null) {
    const grades = getStore(KEYS.GRADES);
    const submissions = getStore(KEYS.SUBMISSIONS);
    const attempts = getStore(KEYS.QUIZ_ATTEMPTS);
    const assignments = getStore(KEYS.ASSIGNMENTS);
    const quizzes = getStore(KEYS.QUIZZES);

    let result = [];

    // Grades from submissions (tugas)
    const studentSubs = submissions.filter(s => s.siswaId === siswaId);
    for (const sub of studentSubs) {
      const grade = grades.find(g => g.submissionId === sub.id);
      if (grade) {
        const assignment = assignments.find(a => a.id === sub.assignmentId);
        if (!courseId || (assignment && assignment.courseId === courseId)) {
          result.push({
            ...grade,
            tipe: 'TUGAS',
            judul: assignment ? assignment.judul : '',
            courseId: assignment ? assignment.courseId : null
          });
        }
      }
    }

    // Grades from quiz attempts
    const studentAttempts = attempts.filter(a => a.siswaId === siswaId);
    for (const attempt of studentAttempts) {
      const grade = grades.find(g => g.quizAttemptId === attempt.id);
      const quiz = quizzes.find(q => q.id === attempt.quizId);
      if (!courseId || (quiz && quiz.courseId === courseId)) {
        if (grade) {
          result.push({
            ...grade,
            tipe: 'KUIS',
            judul: quiz ? quiz.judul : '',
            courseId: quiz ? quiz.courseId : null
          });
        } else if (attempt.nilaiOtomatis !== null) {
          result.push({
            id: null,
            nilai: attempt.nilaiOtomatis,
            tipe: 'KUIS',
            judul: quiz ? quiz.judul : '',
            courseId: quiz ? quiz.courseId : null,
            createdAt: attempt.finishedAt
          });
        }
      }
    }

    return result;
  }

  async getCourseGradesSummary(courseId) {
    const enrollments = getStore(KEYS.ENROLLMENTS);
    const activeStudents = enrollments.filter(
      e => e.courseId === courseId && e.aktif === true
    );
    const users = getStore(KEYS.USERS);
    const summary = [];

    for (const enrollment of activeStudents) {
      const student = users.find(u => u.id === enrollment.siswaId);
      if (!student) continue;
      const grades = await this.getStudentGrades(enrollment.siswaId, courseId);
      const nilaiArr = grades.map(g => g.nilai);
      const avg = nilaiArr.length > 0
        ? Math.round((nilaiArr.reduce((a, b) => a + b, 0) / nilaiArr.length) * 10) / 10
        : null;
      summary.push({
        siswaId: enrollment.siswaId,
        nama: student.nama,
        totalGrades: nilaiArr.length,
        average: avg,
        grades
      });
    }
    return summary;
  }

  // ==================== Forum ====================

  async getForumTopics(courseId) {
    const topics = getStore(KEYS.FORUM_TOPICS);
    const replies = getStore(KEYS.FORUM_REPLIES);
    return topics
      .filter(t => t.courseId === courseId)
      .map(topic => {
        const topicReplies = replies.filter(r => r.topicId === topic.id);
        const lastActivity = topicReplies.length > 0
          ? topicReplies[topicReplies.length - 1].createdAt
          : topic.createdAt;
        return {
          ...topic,
          replyCount: topicReplies.length,
          lastActivity
        };
      });
  }

  async createForumTopic(courseId, data) {
    const topics = getStore(KEYS.FORUM_TOPICS);
    const now = new Date().toISOString();
    const newTopic = {
      id: generateId('ftp'),
      courseId,
      userId: data.userId,
      judul: data.judul,
      isi: data.isi,
      createdAt: now
    };
    topics.push(newTopic);
    setStore(KEYS.FORUM_TOPICS, topics);
    return newTopic;
  }

  async getTopicReplies(topicId) {
    const replies = getStore(KEYS.FORUM_REPLIES);
    return replies
      .filter(r => r.topicId === topicId)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }

  async createReply(topicId, data) {
    const replies = getStore(KEYS.FORUM_REPLIES);
    const now = new Date().toISOString();
    const newReply = {
      id: generateId('frp'),
      topicId,
      userId: data.userId,
      isi: data.isi,
      createdAt: now
    };
    replies.push(newReply);
    setStore(KEYS.FORUM_REPLIES, replies);
    return newReply;
  }

  // ==================== Notifications ====================

  async getNotifications(userId) {
    const notifications = getStore(KEYS.NOTIFICATIONS);
    return notifications
      .filter(n => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  async markAsRead(notificationId) {
    const notifications = getStore(KEYS.NOTIFICATIONS);
    const index = notifications.findIndex(n => n.id === notificationId);
    if (index !== -1) {
      notifications[index].dibaca = true;
      setStore(KEYS.NOTIFICATIONS, notifications);
    }
  }

  async createNotification(data) {
    const notifications = getStore(KEYS.NOTIFICATIONS);
    const newNotif = {
      id: generateId('ntf'),
      userId: data.userId,
      tipe: data.tipe,
      pesan: data.pesan,
      link: data.link || '',
      dibaca: false,
      createdAt: new Date().toISOString()
    };
    notifications.push(newNotif);
    setStore(KEYS.NOTIFICATIONS, notifications);
    return newNotif;
  }

  // ==================== Progress ====================

  async getCourseProgress(siswaId, courseId) {
    const materials = getStore(KEYS.MATERIALS);
    const accesses = getStore(KEYS.MATERIAL_ACCESS);

    const publishedMaterials = materials.filter(
      m => m.courseId === courseId && m.published === true
    );
    const totalMaterials = publishedMaterials.length;

    const accessedMaterials = publishedMaterials.filter(m =>
      accesses.some(a => a.materialId === m.id && a.siswaId === siswaId)
    );
    const accessedCount = accessedMaterials.length;

    const percentage = totalMaterials > 0
      ? Math.round((accessedCount / totalMaterials) * 100)
      : 0;

    return {
      siswaId,
      courseId,
      totalMaterials,
      accessedCount,
      percentage
    };
  }

  async getStudentDashboardData(siswaId) {
    const enrollments = await this.getStudentEnrollments(siswaId);
    const courses = getStore(KEYS.COURSES);
    const now = new Date();
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const courseData = [];
    const upcomingDeadlines = [];
    const availableQuizzes = [];

    for (const enrollment of enrollments) {
      const course = courses.find(c => c.id === enrollment.courseId && c.aktif === true);
      if (!course) continue;

      const progress = await this.getCourseProgress(siswaId, course.id);
      courseData.push({ ...course, progress });

      // Upcoming deadlines (3 days)
      const assignments = getStore(KEYS.ASSIGNMENTS);
      const submissions = getStore(KEYS.SUBMISSIONS);
      const courseAssignments = assignments.filter(a => a.courseId === course.id);
      for (const asg of courseAssignments) {
        const deadline = new Date(asg.batasWaktu);
        const hasSub = submissions.some(
          s => s.assignmentId === asg.id && s.siswaId === siswaId
        );
        if (!hasSub && deadline >= now && deadline <= threeDaysLater) {
          upcomingDeadlines.push({ ...asg, courseName: course.nama });
        }
      }

      // Available quizzes
      const quizzes = getStore(KEYS.QUIZZES);
      const attempts = getStore(KEYS.QUIZ_ATTEMPTS);
      const courseQuizzes = quizzes.filter(q => q.courseId === course.id);
      for (const quiz of courseQuizzes) {
        const hasAttempt = attempts.some(
          a => a.quizId === quiz.id && a.siswaId === siswaId
        );
        const quizStart = new Date(quiz.tanggalMulai);
        const quizEnd = new Date(quiz.tanggalBerakhir);
        if (!hasAttempt && now >= quizStart && now <= quizEnd) {
          availableQuizzes.push({ ...quiz, courseName: course.nama });
        }
      }
    }

    const recentGrades = await this.getStudentGrades(siswaId);
    const notifications = await this.getNotifications(siswaId);

    return {
      courses: courseData,
      upcomingDeadlines,
      availableQuizzes,
      recentGrades: recentGrades.slice(0, 5),
      notifications: notifications.filter(n => !n.dibaca).slice(0, 10)
    };
  }

  async getGuruDashboardData(guruId) {
    const courses = getStore(KEYS.COURSES);
    const guruCourses = courses.filter(c => c.guruId === guruId && c.aktif === true);

    let ungradedSubmissions = 0;
    let ungradedEssays = 0;

    const grades = getStore(KEYS.GRADES);
    const submissions = getStore(KEYS.SUBMISSIONS);
    const assignments = getStore(KEYS.ASSIGNMENTS);
    const quizzes = getStore(KEYS.QUIZZES);
    const attempts = getStore(KEYS.QUIZ_ATTEMPTS);
    const enrollments = getStore(KEYS.ENROLLMENTS);

    const courseDetails = [];

    for (const course of guruCourses) {
      const studentCount = enrollments.filter(
        e => e.courseId === course.id && e.aktif === true
      ).length;

      // Count ungraded submissions
      const courseAssignments = assignments.filter(a => a.courseId === course.id);
      for (const asg of courseAssignments) {
        const subs = submissions.filter(s => s.assignmentId === asg.id);
        for (const sub of subs) {
          const hasGrade = grades.some(g => g.submissionId === sub.id);
          if (!hasGrade) ungradedSubmissions++;
        }
      }

      // Count ungraded essay attempts
      const courseQuizzes = quizzes.filter(q => q.courseId === course.id);
      for (const quiz of courseQuizzes) {
        const hasEssay = quiz.soal && quiz.soal.some(s => s.tipe === 'ESAI');
        if (hasEssay) {
          const quizAttempts = attempts.filter(
            a => a.quizId === quiz.id && a.finishedAt !== null
          );
          for (const attempt of quizAttempts) {
            const hasGrade = grades.some(g => g.quizAttemptId === attempt.id);
            if (!hasGrade) ungradedEssays++;
          }
        }
      }

      courseDetails.push({ ...course, studentCount });
    }

    const notifications = await this.getNotifications(guruId);

    return {
      courses: courseDetails,
      ungradedSubmissions,
      ungradedEssays,
      notifications: notifications.filter(n => !n.dibaca).slice(0, 10)
    };
  }
}

// Singleton instance
const dataService = new DataService();
export default dataService;
export { DataService };
