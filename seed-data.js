/**
 * seed-data.js — Script untuk populate localStorage dengan demo data
 * Dapat dijalankan standalone di browser (via script tag atau console)
 *
 * Membuat:
 * - 1 Admin (admin/admin123)
 * - 2 Guru (guru1/guru123, guru2/guru123)
 * - 5 Siswa per program (15 total)
 * - 4 Sample courses
 * - Enrollments siswa ke courses yang sesuai
 *
 * Penggunaan di browser:
 *   <script type="module" src="seed-data.js"></script>
 *   atau dari console: import('./seed-data.js')
 */

// ==================== Helpers ====================

async function hashSHA256(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateId(prefix) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const array = new Uint8Array(12);
  crypto.getRandomValues(array);
  for (let i = 0; i < 12; i++) {
    result += chars[array[i] % chars.length];
  }
  return `${prefix}_${result}`;
}

// ==================== localStorage Keys ====================

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

// ==================== Seed Data ====================

async function seedData() {
  console.log('🌱 Memulai seed data PKBM LMS...');
  const now = new Date().toISOString();

  // --- Users ---
  const adminHash = await hashSHA256('admin123');
  const guruHash = await hashSHA256('guru123');
  const siswaHash = await hashSHA256('siswa123');

  const admin = {
    id: 'usr_admin000001',
    username: 'admin',
    passwordHash: adminHash,
    nama: 'Administrator',
    role: 'ADMIN',
    program: null,
    kelas: null,
    aktif: true,
    createdAt: now,
    updatedAt: now
  };

  const guru1 = {
    id: 'usr_guru0000001',
    username: 'guru1',
    passwordHash: guruHash,
    nama: 'Bapak Ahmad Fauzi',
    role: 'GURU',
    program: null,
    kelas: null,
    aktif: true,
    createdAt: now,
    updatedAt: now
  };

  const guru2 = {
    id: 'usr_guru0000002',
    username: 'guru2',
    passwordHash: guruHash,
    nama: 'Ibu Siti Rahmawati',
    role: 'GURU',
    program: null,
    kelas: null,
    aktif: true,
    createdAt: now,
    updatedAt: now
  };

  // Siswa Paket A (Kelas 6) - 5 siswa
  const siswaA = [];
  const namaA = ['Andi Saputra', 'Budi Hartono', 'Citra Dewi', 'Dina Marlina', 'Eko Prasetyo'];
  for (let i = 0; i < 5; i++) {
    siswaA.push({
      id: `usr_siswaa00${String(i + 1).padStart(3, '0')}`,
      username: `siswa_a${i + 1}`,
      passwordHash: siswaHash,
      nama: namaA[i],
      role: 'SISWA',
      program: 'PAKET_A',
      kelas: 'Kelas 6',
      aktif: true,
      createdAt: now,
      updatedAt: now
    });
  }

  // Siswa Paket B (Kelas 1-3) - 5 siswa
  const siswaB = [];
  const namaB = ['Fatimah Zahra', 'Gilang Ramadhan', 'Hana Permata', 'Irfan Maulana', 'Jasmine Putri'];
  const kelasB = ['Kelas 1', 'Kelas 1', 'Kelas 2', 'Kelas 2', 'Kelas 3'];
  for (let i = 0; i < 5; i++) {
    siswaB.push({
      id: `usr_siswab00${String(i + 1).padStart(3, '0')}`,
      username: `siswa_b${i + 1}`,
      passwordHash: siswaHash,
      nama: namaB[i],
      role: 'SISWA',
      program: 'PAKET_B',
      kelas: kelasB[i],
      aktif: true,
      createdAt: now,
      updatedAt: now
    });
  }

  // Siswa Paket C (Kelas 1-3) - 5 siswa
  const siswaC = [];
  const namaC = ['Kevin Wijaya', 'Lestari Ningrum', 'Muhammad Rizki', 'Nadia Safitri', 'Oscar Pangestu'];
  const kelasC = ['Kelas 1', 'Kelas 1', 'Kelas 2', 'Kelas 3', 'Kelas 3'];
  for (let i = 0; i < 5; i++) {
    siswaC.push({
      id: `usr_siswac00${String(i + 1).padStart(3, '0')}`,
      username: `siswa_c${i + 1}`,
      passwordHash: siswaHash,
      nama: namaC[i],
      role: 'SISWA',
      program: 'PAKET_C',
      kelas: kelasC[i],
      aktif: true,
      createdAt: now,
      updatedAt: now
    });
  }

  const allUsers = [admin, guru1, guru2, ...siswaA, ...siswaB, ...siswaC];

  // --- Courses ---
  const courses = [
    {
      id: 'crs_math_a_kls6',
      nama: 'Matematika Paket A Kelas 6',
      deskripsi: 'Pembelajaran matematika dasar untuk program Paket A kelas 6',
      program: 'PAKET_A',
      kelas: 'Kelas 6',
      mataPelajaran: 'Matematika',
      guruId: guru1.id,
      aktif: true,
      createdAt: now
    },
    {
      id: 'crs_indo_b_kls1',
      nama: 'Bahasa Indonesia Paket B Kelas 1',
      deskripsi: 'Pembelajaran bahasa Indonesia untuk program Paket B kelas 1',
      program: 'PAKET_B',
      kelas: 'Kelas 1',
      mataPelajaran: 'B. Indonesia',
      guruId: guru1.id,
      aktif: true,
      createdAt: now
    },
    {
      id: 'crs_fis_c_kls1',
      nama: 'Fisika Paket C Kelas 1',
      deskripsi: 'Pembelajaran fisika dasar untuk program Paket C kelas 1',
      program: 'PAKET_C',
      kelas: 'Kelas 1',
      mataPelajaran: 'Fisika',
      guruId: guru2.id,
      aktif: true,
      createdAt: now
    },
    {
      id: 'crs_bio_c_kls2',
      nama: 'Biologi Paket C Kelas 2',
      deskripsi: 'Pembelajaran biologi untuk program Paket C kelas 2',
      program: 'PAKET_C',
      kelas: 'Kelas 2',
      mataPelajaran: 'Biologi',
      guruId: guru2.id,
      aktif: true,
      createdAt: now
    }
  ];

  // --- Enrollments ---
  const enrollments = [];

  // Enroll semua siswa Paket A ke Matematika Paket A Kelas 6
  for (const s of siswaA) {
    enrollments.push({
      id: generateId('enr'),
      courseId: 'crs_math_a_kls6',
      siswaId: s.id,
      enrolledAt: now,
      aktif: true
    });
  }

  // Enroll siswa Paket B Kelas 1 ke B. Indonesia Paket B Kelas 1
  for (const s of siswaB.filter(st => st.kelas === 'Kelas 1')) {
    enrollments.push({
      id: generateId('enr'),
      courseId: 'crs_indo_b_kls1',
      siswaId: s.id,
      enrolledAt: now,
      aktif: true
    });
  }

  // Enroll siswa Paket C Kelas 1 ke Fisika Paket C Kelas 1
  for (const s of siswaC.filter(st => st.kelas === 'Kelas 1')) {
    enrollments.push({
      id: generateId('enr'),
      courseId: 'crs_fis_c_kls1',
      siswaId: s.id,
      enrolledAt: now,
      aktif: true
    });
  }

  // Enroll siswa Paket C Kelas 2 ke Biologi Paket C Kelas 2
  for (const s of siswaC.filter(st => st.kelas === 'Kelas 2')) {
    enrollments.push({
      id: generateId('enr'),
      courseId: 'crs_bio_c_kls2',
      siswaId: s.id,
      enrolledAt: now,
      aktif: true
    });
  }

  // --- Save to localStorage ---
  localStorage.setItem(KEYS.USERS, JSON.stringify(allUsers));
  localStorage.setItem(KEYS.COURSES, JSON.stringify(courses));
  localStorage.setItem(KEYS.ENROLLMENTS, JSON.stringify(enrollments));
  localStorage.setItem(KEYS.MATERIALS, JSON.stringify([]));
  localStorage.setItem(KEYS.MATERIAL_ACCESS, JSON.stringify([]));
  localStorage.setItem(KEYS.ASSIGNMENTS, JSON.stringify([]));
  localStorage.setItem(KEYS.SUBMISSIONS, JSON.stringify([]));
  localStorage.setItem(KEYS.QUIZZES, JSON.stringify([]));
  localStorage.setItem(KEYS.QUIZ_ATTEMPTS, JSON.stringify([]));
  localStorage.setItem(KEYS.GRADES, JSON.stringify([]));
  localStorage.setItem(KEYS.FORUM_TOPICS, JSON.stringify([]));
  localStorage.setItem(KEYS.FORUM_REPLIES, JSON.stringify([]));
  localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify([]));

  console.log('✅ Seed data berhasil dibuat!');
  console.log(`   - ${allUsers.length} users (1 admin, 2 guru, ${siswaA.length + siswaB.length + siswaC.length} siswa)`);
  console.log(`   - ${courses.length} courses`);
  console.log(`   - ${enrollments.length} enrollments`);
  console.log('');
  console.log('📋 Akun demo:');
  console.log('   Admin: admin / admin123');
  console.log('   Guru:  guru1 / guru123, guru2 / guru123');
  console.log('   Siswa: siswa_a1~a5, siswa_b1~b5, siswa_c1~c5 / siswa123');

  return { users: allUsers, courses, enrollments };
}

// Auto-run when loaded as a module
seedData().catch(err => console.error('❌ Seed data gagal:', err));

export { seedData, hashSHA256, KEYS };
